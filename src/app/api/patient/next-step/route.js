/**
 * API: Patient Next Step Orchestrator
 *
 * GET /api/patient/next-step?consultation_id=xxx
 *
 * Layer-111 Rules:
 *  - Returns ACTION | MONITOR | NONE — strictly from DB state
 *  - UI must NOT decide logic — this endpoint IS the logic
 *  - All actions must include care_episode_id
 *
 * Response schema:
 * {
 *   type: "ACTION" | "MONITOR" | "NONE",
 *   actions: []   — empty if MONITOR or NONE
 * }
 *
 * State → Next Step mapping:
 *   STARTED              → ACTION  (complete consultation setup)
 *   ACTIVE               → ACTION  (complete the consultation)
 *   COMPLETED            → ACTION  (submit outcome / book follow-up / order services)
 *   FOLLOW_UP_PENDING    → ACTION  (book follow-up appointment)
 *   CLOSED_RESOLVED      → NONE
 *   CLOSED_NO_RESPONSE   → MONITOR (re-engagement prompt)
 *   anything else        → MONITOR
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const consultation_id = searchParams.get("consultation_id");

        if (!consultation_id) {
            return failure("consultation_id is required", null, 400);
        }

        // ── Fetch consultation + care episode ──
        const { data: consultation, error: fetchErr } = await supabase
            .from("consultations")
            .select("id, patient_id, doctor_id, care_episode_id, case_status, consultation_mode, follow_up_required, completed_at")
            .eq("id", consultation_id)
            .single();

        if (fetchErr || !consultation) {
            return failure("Consultation not found", null, 404);
        }

        const { care_episode_id, case_status, patient_id } = consultation;

        // ── Check for existing patient outcome ──
        const { data: existingOutcome } = await supabase
            .from("consultation_outcome")
            .select("id, improvement_status")
            .eq("consultation_id", consultation_id)
            .maybeSingle();

        // ── Check for pending service recommendations ──
        const { data: recommendations } = await supabase
            .from("service_recommendation")
            .select("service_type, priority")
            .or(`diagnosis_id.eq.${consultation.care_episode_id},problem_id.eq.${consultation.care_episode_id}`)
            .limit(2);

        // ── Check for pending follow-up appointment ──
        const { data: followupAppointment } = await supabase
            .from("appointments")
            .select("id, status")
            .eq("care_episode_id", care_episode_id)
            .eq("appointment_type", "follow_up")
            .maybeSingle();

        // ─────────────────────────────────────────────────────────
        // STATE → NEXT STEP RESOLUTION (pure DB logic, no UI)
        // ─────────────────────────────────────────────────────────

        let type = "NONE";
        let actions = [];

        if (!consultation.completed_at && (case_status === "STARTED" || case_status === "ACTIVE")) {
            // Doctor hasn't completed yet — patient should wait
            type = "MONITOR";
            actions = [];

        } else if (case_status === "COMPLETED") {
            type = "ACTION";
            actions = [];

            // Action 1: Submit outcome if not yet done
            if (!existingOutcome) {
                actions.push({
                    action_id: "SUBMIT_OUTCOME",
                    label: "How are you feeling?",
                    description: "Share how you're doing after your consultation",
                    endpoint: "POST /api/patient/outcome",
                    priority: 1,
                    care_episode_id,
                    consultation_id,
                });
            }

            // Action 2: Order medicines / lab tests if recommended
            if (recommendations && recommendations.length > 0) {
                for (const rec of recommendations) {
                    actions.push({
                        action_id: `ORDER_${rec.service_type.toUpperCase()}`,
                        label: rec.service_type === "pharmacy" ? "Order Medicines" : "Book Lab Test",
                        description: "Recommended by your doctor",
                        endpoint: rec.service_type === "pharmacy"
                            ? "POST /api/patients/orders/medicine"
                            : "POST /api/patient/lab/orders",
                        priority: rec.priority === "HIGH" ? 2 : 3,
                        care_episode_id,
                        consultation_id,
                    });
                }
            }

            // Action 3: Book follow-up if required and not booked
            if (consultation.follow_up_required && !followupAppointment) {
                actions.push({
                    action_id: "BOOK_FOLLOWUP",
                    label: "Book Follow-Up",
                    description: "Your doctor recommends a follow-up visit",
                    endpoint: "POST /api/appointments/book",
                    priority: 2,
                    care_episode_id,
                    consultation_id,
                });
            }

            // Sort by priority ascending
            actions.sort((a, b) => a.priority - b.priority);

        } else if (case_status === "FOLLOW_UP_PENDING") {
            type = "ACTION";
            actions = [];

            // Primary action: Book the follow-up
            if (!followupAppointment) {
                actions.push({
                    action_id: "BOOK_FOLLOWUP",
                    label: "Book Your Follow-Up",
                    description: "Your doctor is waiting to review your progress",
                    endpoint: "POST /api/appointments/book",
                    priority: 1,
                    care_episode_id,
                    consultation_id,
                });
            } else if (followupAppointment.status === "PENDING") {
                actions.push({
                    action_id: "CONFIRM_FOLLOWUP",
                    label: "Confirm Your Appointment",
                    description: "Your follow-up appointment is scheduled — tap to confirm",
                    endpoint: `PATCH /api/appointments/${followupAppointment.id}/confirm`,
                    priority: 1,
                    care_episode_id,
                    consultation_id,
                });
            }

        } else if (case_status === "CLOSED_NO_RESPONSE") {
            // No response from patient — monitor only, soft re-engagement
            type = "MONITOR";
            actions = [];

        } else if (case_status === "CLOSED_RESOLVED") {
            // Fully resolved — nothing left to do
            type = "NONE";
            actions = [];

        } else {
            // Unknown / transitional state
            type = "MONITOR";
            actions = [];
        }

        // ─────────────────────────────────────────────────────────
        // STRICT RULE: ACTION must have actions, MONITOR/NONE must not
        // ─────────────────────────────────────────────────────────
        if (type === "ACTION" && actions.length === 0) {
            // Nothing actionable found — downgrade to MONITOR
            type = "MONITOR";
        }

        if ((type === "MONITOR" || type === "NONE") && actions.length > 0) {
            // Safety: force-clear actions for non-ACTION types
            actions = [];
        }

        return success("Next step resolved", {
            type,
            actions,
            consultation_id,
            care_episode_id,
            current_state: case_status,
        });

    } catch (err) {
        console.error("GET /api/patient/next-step error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
