/**
 * LAYER-111: Consultation State Machine (UPGRADED)
 * 
 * Manages consultation lifecycle with the NEW state definitions from Layer-111.
 * Direct database updates to case_status are NOT allowed — all changes
 * must go through updateConsultationStatus().
 * 
 * NEW States: STARTED → ACTIVE → COMPLETED → FOLLOW_UP_PENDING → CLOSED_RESOLVED | CLOSED_NO_RESPONSE
 * 
 * STRICT RULES:
 * - ACTIVE → CLOSED ❌ (forbidden)
 * - STARTED → COMPLETED ❌ (forbidden)
 * - COMPLETED → ACTIVE ❌ (forbidden)
 * - On COMPLETED + follow_up_required=TRUE → auto-set FOLLOW_UP_PENDING
 */

import { supabase } from "../supabaseAdmin";
import { logAudit } from "./auditLogger";
import { logActivity } from "./activityLogger";
import { emit } from "./eventEmitter";

// ─────────────────────────────────────────────────────────
// STATE DEFINITIONS (from PDF Part 2)
// ─────────────────────────────────────────────────────────

const STATES = {
    STARTED: "STARTED",
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    FOLLOW_UP_PENDING: "FOLLOW_UP_PENDING",
    CLOSED_RESOLVED: "CLOSED_RESOLVED",
    CLOSED_NO_RESPONSE: "CLOSED_NO_RESPONSE",
};

// STRICT transition rules — only these are allowed
const ALLOWED_TRANSITIONS = {
    [STATES.STARTED]:            [STATES.ACTIVE],
    [STATES.ACTIVE]:             [STATES.COMPLETED],
    [STATES.COMPLETED]:          [STATES.FOLLOW_UP_PENDING],
    [STATES.FOLLOW_UP_PENDING]:  [STATES.CLOSED_RESOLVED, STATES.CLOSED_NO_RESPONSE],
    [STATES.CLOSED_RESOLVED]:    [],   // terminal
    [STATES.CLOSED_NO_RESPONSE]: [],   // terminal
};

// Event mapping per state change (PDF Part 2-5)
const EVENT_MAP = {
    [STATES.STARTED]:            "CONSULTATION_CREATED",
    [STATES.ACTIVE]:             "CONSULTATION_ACTIVE",
    [STATES.COMPLETED]:          "CONSULTATION_COMPLETED",
    [STATES.FOLLOW_UP_PENDING]:  "FOLLOWUP_SCHEDULED",
    [STATES.CLOSED_RESOLVED]:    "FOLLOWUP_COMPLETED",
    [STATES.CLOSED_NO_RESPONSE]: "FOLLOWUP_MISSED",
};

const ALL_STATES = Object.values(STATES);

// ─────────────────────────────────────────────────────────
// MAIN FUNCTION: updateConsultationStatus
// ─────────────────────────────────────────────────────────

/**
 * Update consultation status with validation, audit, activity log, and event emission.
 * This is the ONLY way to change consultation status.
 * 
 * @param {string} consultation_id - consultation UUID
 * @param {string} new_status - target state
 * @param {string} user_id - who is making the change
 * @param {string} [reason] - optional reason for transition
 * @returns {object} { success, data, error }
 */
export async function updateConsultationStatus(consultation_id, new_status, user_id, reason = null) {
    try {
        // ── Validate inputs ──
        if (!consultation_id || !new_status || !user_id) {
            return { success: false, error: "consultation_id, new_status, and user_id are required" };
        }

        if (!ALL_STATES.includes(new_status)) {
            return { success: false, error: `Invalid status '${new_status}'. Must be one of: ${ALL_STATES.join(", ")}` };
        }

        // ── Fetch current consultation ──
        const { data: consultation, error: fetchErr } = await supabase
            .from("consultations")
            .select("*")
            .eq("id", consultation_id)
            .single();

        if (fetchErr) throw fetchErr;
        if (!consultation) return { success: false, error: "Consultation not found" };

        const current_status = consultation.case_status;

        // ── Validate transition ──
        const allowed = ALLOWED_TRANSITIONS[current_status] || [];
        if (!allowed.includes(new_status)) {
            return {
                success: false,
                error: `Forbidden transition: ${current_status} → ${new_status}. Allowed: ${allowed.join(", ") || "none (terminal state)"}`,
            };
        }

        // ── HARD BLOCK: Prevent ACTIVE → COMPLETED if unresolved HIGH risk flags exist ──
        // Layer-111 Rule: clinical risk gates must live in the state machine itself,
        // not just in manage/route.js, to prevent bypass via the status endpoint.
        if (new_status === STATES.COMPLETED) {
            const { count: unresolvedHighFlags } = await supabase
                .from("clinical_risk_flags")
                .select("id", { count: "exact", head: true })
                .eq("consultation_id", consultation_id)
                .eq("severity", "HIGH")
                .eq("resolved", false);

            if (unresolvedHighFlags > 0) {
                return {
                    success: false,
                    error: `BLOCKED: ${unresolvedHighFlags} unresolved HIGH-severity clinical risk flag(s) exist. Resolve all flags or provide an override_reason before completing this consultation.`,
                };
            }
        }

        // ── Build update payload ──
        const updatePayload = {
            case_status: new_status,
            updated_at: new Date().toISOString(),
        };

        // ── COMPLETED logic: check follow_up_required ──
        let autoFollowUp = false;
        if (new_status === STATES.COMPLETED && consultation.follow_up_required === true) {
            // PDF Rule: on COMPLETED + follow_up_required=TRUE → status MUST become FOLLOW_UP_PENDING
            updatePayload.case_status = STATES.FOLLOW_UP_PENDING;
            autoFollowUp = true;

            // Auto-calculate follow_up_date if not set
            if (consultation.follow_up_days && !consultation.follow_up_date) {
                const followUpDate = new Date();
                followUpDate.setDate(followUpDate.getDate() + consultation.follow_up_days);
                updatePayload.follow_up_date = followUpDate.toISOString().split("T")[0];
            }
        }

        // ── Update consultation ──
        const { data, error } = await supabase
            .from("consultations")
            .update(updatePayload)
            .eq("id", consultation_id)
            .select()
            .single();

        if (error) throw error;

        const final_status = updatePayload.case_status;

        // ── Create care_followup_commitment if auto follow-up ──
        if (autoFollowUp) {
            await createFollowUpCommitment(consultation);
        }

        // ── Write audit log ──
        await logAudit({
            entity_type: "consultation",
            entity_id: consultation_id,
            previous_state: { case_status: current_status },
            new_state: { case_status: final_status },
            change_description: reason || `Status: ${current_status} → ${final_status}${autoFollowUp ? " (auto follow-up)" : ""}`,
            changed_by: user_id,
        });

        // ── Write activity log ──
        await logActivity({
            patient_id: consultation.patient_id,
            care_episode_id: consultation.care_episode_id,
            actor_id: user_id,
            module_type: "consultation",
            action_type: "status_changed",
            reference_id: consultation_id,
            description: `Consultation status: ${current_status} → ${final_status}`,
        });

        // ── Emit event ──
        const event = EVENT_MAP[final_status];
        if (event) {
            emit(event, {
                consultation_id,
                patient_id: consultation.patient_id,
                doctor_id: consultation.doctor_id,
                care_episode_id: consultation.care_episode_id,
                previous_status: current_status,
                new_status: final_status,
            });
        }

        // ── Update care_episode_summary on COMPLETED ──
        if (final_status === STATES.COMPLETED || final_status === STATES.FOLLOW_UP_PENDING) {
            await updateCareEpisodeSummary(consultation);
        }

        // ── MC-4: Capture baseline at STARTED → ACTIVE transition ──
        // The baseline is the patient's clinical context when the doctor
        // first activates the consultation. Outcome analytics compare
        // post-consultation outcomes against this baseline.
        if (current_status === STATES.STARTED && final_status === STATES.ACTIVE) {
            await captureBaseline(consultation_id);
        }

        return { success: true, data, auto_follow_up: autoFollowUp };
    } catch (err) {
        console.error("updateConsultationStatus error:", err);
        return { success: false, error: err.message };
    }
}

// ─────────────────────────────────────────────────────────
// HELPER: Create follow-up commitment
// ─────────────────────────────────────────────────────────

async function createFollowUpCommitment(consultation) {
    try {
        const { error } = await supabase
            .from("care_followup_commitment")
            .insert({
                consultation_id: consultation.id,
                care_episode_id: consultation.care_episode_id,
                patient_id: consultation.patient_id,
                doctor_id: consultation.doctor_id,
                follow_up_days: consultation.follow_up_days || 7,
                follow_up_date: consultation.follow_up_date,
                status: "PENDING",
            });

        if (error) console.error("Failed to create follow-up commitment:", error);
    } catch (err) {
        console.error("createFollowUpCommitment error:", err);
    }
}

// ─────────────────────────────────────────────────────────
// HELPER: Update care episode summary
// ─────────────────────────────────────────────────────────

async function updateCareEpisodeSummary(consultation) {
    try {
        const { error } = await supabase
            .from("care_episode_summary")
            .upsert({
                care_episode_id: consultation.care_episode_id,
                latest_status: consultation.case_status,
                last_consultation_id: consultation.id,
                updated_at: new Date().toISOString(),
            }, { onConflict: "care_episode_id" });

        if (error) console.error("Failed to update care_episode_summary:", error);
    } catch (err) {
        console.error("updateCareEpisodeSummary error:", err);
    }
}

// ─────────────────────────────────────────────────────────
// HELPER: Capture clinical baseline at ACTIVE
// ─────────────────────────────────────────────────────────

/**
 * MC-4: Capture baseline at STARTED → ACTIVE.
 * Reads current consultation_clinical state and stores it in
 * consultation_baseline for outcome efficacy comparison.
 * Idempotent — only writes if no baseline exists.
 */
async function captureBaseline(consultation_id) {
    try {
        // Skip if baseline already exists
        const { data: existing } = await supabase
            .from("consultation_baseline")
            .select("id")
            .eq("consultation_id", consultation_id)
            .single();

        if (existing) return;

        // Read current clinical state at activation time
        const { data: clinical } = await supabase
            .from("consultation_clinical")
            .select("severity, duration, complaint_id")
            .eq("consultation_id", consultation_id)
            .single();

        const { data: symptoms } = await supabase
            .from("consultation_symptoms")
            .select("symptom_id")
            .eq("consultation_id", consultation_id);

        await supabase
            .from("consultation_baseline")
            .insert({
                consultation_id,
                symptom_ids: (symptoms || []).map(s => s.symptom_id),
                severity: clinical?.severity || null,
                duration: clinical?.duration || null,
            });

    } catch (err) {
        // Non-fatal — log but never block the state transition
        console.warn("[MC-4] captureBaseline failed (non-fatal):", err.message);
    }
}

// ─────────────────────────────────────────────────────────
// UTILITY EXPORTS
// ─────────────────────────────────────────────────────────

/**
 * Get allowed transitions for a given status
 */
export function getAllowedTransitions(current_status) {
    return ALLOWED_TRANSITIONS[current_status] || [];
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(from_status, to_status) {
    const allowed = ALLOWED_TRANSITIONS[from_status] || [];
    return allowed.includes(to_status);
}

export { STATES, ALL_STATES, EVENT_MAP };
