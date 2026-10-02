/**
 * LAYER-111: Consultation State Machine
 * 
 * Manages consultation lifecycle with the NEW state definitions from Layer-111.
 * Direct database updates to case_status are NOT allowed — all changes
 * must go through updateConsultationStatus().
 * 
 * Uses AWS RDS PostgreSQL via sql client.
 */

import sql from "@/lib/db";
import { logAudit } from "./auditLogger";
import { logActivity } from "./activityLogger";
import { emit } from "./eventEmitter";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeUuid(val) {
  if (!val) return null;
  return UUID_REGEX.test(val) ? val : null;
}

// ─────────────────────────────────────────────────────────
// STATE DEFINITIONS
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

// Event mapping per state change
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

export async function updateConsultationStatus(consultation_id, new_status, user_id, reason = null) {
    try {
        if (!consultation_id || !new_status || !user_id) {
            return { success: false, error: "consultation_id, new_status, and user_id are required" };
        }

        if (!ALL_STATES.includes(new_status)) {
            return { success: false, error: `Invalid status '${new_status}'. Must be one of: ${ALL_STATES.join(", ")}` };
        }

        // Fetch current consultation
        const rows = await sql`
            SELECT * FROM consultations WHERE id = ${consultation_id} LIMIT 1
        `;

        if (!rows || rows.length === 0) {
            return { success: false, error: "Consultation not found" };
        }

        const consultation = rows[0];
        const current_status = consultation.case_status;

        // Validate transition
        const allowed = ALLOWED_TRANSITIONS[current_status] || [];
        if (!allowed.includes(new_status)) {
            return {
                success: false,
                error: `Forbidden transition: ${current_status} → ${new_status}. Allowed: ${allowed.join(", ") || "none (terminal state)"}`,
            };
        }

        // Prevent ACTIVE → COMPLETED if unresolved HIGH risk flags exist
        if (new_status === STATES.COMPLETED) {
            const [{ count: unresolvedHighFlags }] = await sql`
                SELECT count(*)::int as count 
                FROM clinical_risk_flags 
                WHERE consultation_id = ${consultation_id} 
                  AND severity = 'HIGH' 
                  AND resolved = false
            `;

            if (unresolvedHighFlags > 0) {
                return {
                    success: false,
                    error: `BLOCKED: ${unresolvedHighFlags} unresolved HIGH-severity clinical risk flag(s) exist. Resolve all flags or provide an override_reason before completing this consultation.`,
                };
            }
        }

        let targetStatus = new_status;
        let autoFollowUp = false;
        let followUpDateVal = consultation.follow_up_date;

        if (new_status === STATES.COMPLETED && consultation.follow_up_required === true) {
            targetStatus = STATES.FOLLOW_UP_PENDING;
            autoFollowUp = true;

            if (consultation.follow_up_days && !consultation.follow_up_date) {
                const fDate = new Date();
                fDate.setDate(fDate.getDate() + consultation.follow_up_days);
                followUpDateVal = fDate.toISOString().split("T")[0];
            }
        }

        // Update consultation
        const updatedRows = await sql`
            UPDATE consultations
            SET 
                case_status = ${targetStatus},
                follow_up_date = ${followUpDateVal || null},
                updated_at = NOW()
            WHERE id = ${consultation_id}
            RETURNING *
        `;

        const data = updatedRows[0];
        const final_status = targetStatus;

        // Create care_followup_commitment if auto follow-up
        if (autoFollowUp) {
            await createFollowUpCommitment(consultation);
        }

        // Write audit log
        await logAudit({
            entity_type: "consultation",
            entity_id: consultation_id,
            previous_state: { case_status: current_status },
            new_state: { case_status: final_status },
            change_description: reason || `Status: ${current_status} → ${final_status}${autoFollowUp ? " (auto follow-up)" : ""}`,
            changed_by: user_id,
        });

        // Write activity log
        await logActivity({
            patient_id: consultation.patient_id,
            care_episode_id: consultation.care_episode_id,
            actor_id: user_id,
            module_type: "consultation",
            action_type: "status_changed",
            reference_id: consultation_id,
            description: `Consultation status: ${current_status} → ${final_status}`,
        });

        // Emit event
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

        // Update care_episode_summary on COMPLETED
        if (final_status === STATES.COMPLETED || final_status === STATES.FOLLOW_UP_PENDING) {
            await updateCareEpisodeSummary(consultation);
        }

        // Capture baseline at STARTED → ACTIVE transition
        if (current_status === STATES.STARTED && final_status === STATES.ACTIVE) {
            await captureBaseline(consultation_id);
        }

        return { success: true, data, auto_follow_up: autoFollowUp };
    } catch (err) {
        console.error("updateConsultationStatus error:", err);
        return { success: false, error: err.message };
    }
}

async function createFollowUpCommitment(consultation) {
    try {
        await sql`
            INSERT INTO care_followup_commitment (
                consultation_id, care_episode_id, patient_id, doctor_id, follow_up_days, follow_up_date, status
            ) VALUES (
                ${consultation.id},
                ${safeUuid(consultation.care_episode_id)},
                ${safeUuid(consultation.patient_id)},
                ${safeUuid(consultation.doctor_id)},
                ${consultation.follow_up_days || 7},
                ${consultation.follow_up_date || null},
                'PENDING'
            )
        `;
    } catch (err) {
        console.warn("createFollowUpCommitment error:", err.message);
    }
}

async function updateCareEpisodeSummary(consultation) {
    if (!consultation.care_episode_id) return;
    try {
        await sql`
            INSERT INTO care_episode_summary (
                care_episode_id, latest_status, last_consultation_id, updated_at
            ) VALUES (
                ${consultation.care_episode_id},
                ${consultation.case_status},
                ${consultation.id},
                NOW()
            )
            ON CONFLICT (care_episode_id)
            DO UPDATE SET
                latest_status = EXCLUDED.latest_status,
                last_consultation_id = EXCLUDED.last_consultation_id,
                updated_at = NOW()
        `;
    } catch (err) {
        console.warn("updateCareEpisodeSummary error:", err.message);
    }
}

async function captureBaseline(consultation_id) {
    try {
        const existing = await sql`
            SELECT id FROM consultation_baseline WHERE consultation_id = ${consultation_id} LIMIT 1
        `;
        if (existing.length > 0) return;

        const clinical = await sql`
            SELECT severity, duration, complaint_id
            FROM consultation_clinical
            WHERE consultation_id = ${consultation_id}
            LIMIT 1
        `;

        const symptoms = await sql`
            SELECT symptom_id FROM consultation_symptoms WHERE consultation_id = ${consultation_id}
        `;

        await sql`
            INSERT INTO consultation_baseline (
                consultation_id, symptom_ids, severity, duration
            ) VALUES (
                ${consultation_id},
                ${(symptoms || []).map(s => s.symptom_id)},
                ${clinical[0]?.severity || null},
                ${clinical[0]?.duration || null}
            )
        `;
    } catch (err) {
        console.warn("[MC-4] captureBaseline failed:", err.message);
    }
}

export function getAllowedTransitions(current_status) {
    return ALLOWED_TRANSITIONS[current_status] || [];
}

export function isValidTransition(from_status, to_status) {
    const allowed = ALLOWED_TRANSITIONS[from_status] || [];
    return allowed.includes(to_status);
}

export { STATES, ALL_STATES, EVENT_MAP };
