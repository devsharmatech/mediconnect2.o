/**
 * API: Patient Follow-Up Actions (PDF Part 4B)
 * 
 * GET  /api/patient/followup-actions?patient_id=xxx — Get pending follow-up actions
 * POST /api/patient/followup-actions — Execute a follow-up action
 * 
 * Actions: update_symptoms, book_followup, dismiss
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { updateConsultationStatus } from "@/lib/layer1/consultationStateMachine";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";
import { logAudit } from "@/lib/layer1/auditLogger";

/**
 * GET — Get pending follow-up actions for patient
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const patient_id = searchParams.get("patient_id");

        if (!patient_id) return failure("patient_id is required");

        // Get consultations in FOLLOW_UP_PENDING (non-clinical fields only)
        // Layer-111: patient-facing service routes must NOT join consultation_clinical.
        // Urgency is time-based (days_pending) — no clinical data needed here.
        const { data: pendingConsultations } = await supabase
            .from("consultations")
            .select("id, doctor_id, case_status, created_at, updated_at")
            .eq("patient_id", patient_id)
            .eq("case_status", "FOLLOW_UP_PENDING")
            .order("updated_at", { ascending: false });

        if (!pendingConsultations || pendingConsultations.length === 0) {
            return success("No pending follow-ups", { actions: [] });
        }

        // Build action items — urgency driven by time elapsed, not clinical severity
        const actions = pendingConsultations.map(c => {
            const daysSinceUpdate = Math.floor(
                (Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                consultation_id: c.id,
                doctor_id: c.doctor_id,
                days_pending: daysSinceUpdate,
                urgency: daysSinceUpdate >= 7 ? "HIGH" : daysSinceUpdate >= 3 ? "MEDIUM" : "LOW",
                available_actions: [
                    { action: "update_symptoms", label: "Update Symptoms" },
                    { action: "book_followup", label: "Book Follow-up Consultation" },
                    { action: "mark_resolved", label: "I'm feeling better" },
                ],
                message: daysSinceUpdate >= 7
                    ? "Your follow-up is overdue. Please update your status."
                    : "Your doctor is checking your recovery",
            };
        });

        return success("Follow-up actions retrieved", {
            actions,
            total: actions.length,
        });

    } catch (err) {
        console.error("GET /api/patient/followup-actions error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { consultation_id, care_episode_id, action, payload } = body;

        if (!consultation_id || !care_episode_id || !action) {
            return failure("consultation_id, care_episode_id, and action are required");
        }

        // ── 1. Secure identity from request, NOT body ──
        const user = await resolveCallerFromRequest(req);

        if (!user || user.role !== "patient") {
            return failure("UNAUTHORIZED", null, 401);
        }

        const patient_id = user.id;

        // ── 2. Ownership & Care Episode Validation ──
        const { data: consultation, error: fetchErr } = await supabase
            .from("consultations")
            .select("id, patient_id, care_episode_id, case_status")
            .eq("id", consultation_id)
            .single();

        if (fetchErr || !consultation) {
            return failure("Consultation not found", null, 404);
        }

        if (consultation.patient_id !== patient_id) {
            return failure("FORBIDDEN", null, 403);
        }

        if (consultation.care_episode_id !== care_episode_id) {
            return failure("CARE_EPISODE_MISMATCH", null, 422);
        }

        if (consultation.case_status !== "FOLLOW_UP_PENDING") {
            return failure("INVALID_STATE - Consultation must be in FOLLOW_UP_PENDING state", null, 422);
        }

        switch (action) {
            case "update_symptoms": {
                // Patient updates current symptoms — create outcome entry
                const { data, error } = await supabase
                    .from("consultation_outcome")
                    .insert({
                        consultation_id,
                        patient_id,
                        improvement_status: payload?.improvement_status || "same",
                        symptom_change: payload?.symptom_change || "same",
                        adherence: payload?.adherence || "full",
                        followup_completed: false,
                    })
                    .select()
                    .single();

                if (error) throw error;
                
                await logAudit({
                    entity_type: "consultation",
                    entity_id: consultation_id,
                    previous_state: { action: "pending_symptoms" },
                    new_state: { action: "updated_symptoms" },
                    change_description: "Patient updated symptoms",
                    changed_by: patient_id,
                });

                return success("Symptoms updated", data);
            }

            case "book_followup": {
                // Redirect data — frontend handles actual booking
                return success("Follow-up booking initiated", {
                    consultation_id,
                    parent_consultation_id: consultation_id,
                    care_episode_id,
                    redirect: "/appointments/book",
                });
            }

            case "mark_resolved": {
                // Patient says they're better — close consultation via state machine
                await updateConsultationStatus(
                    consultation_id,
                    "CLOSED_RESOLVED",
                    patient_id,
                    "Patient marked as resolved"
                );

                // Insert outcome
                await supabase
                    .from("consultation_outcome")
                    .insert({
                        consultation_id,
                        patient_id,
                        improvement_status: "better",
                        followup_completed: true,
                    });

                // Update follow-up commitment
                await supabase
                    .from("care_followup_commitment")
                    .update({
                        status: "COMPLETED",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("consultation_id", consultation_id)
                    .eq("status", "PENDING");
                    
                await logAudit({
                    entity_type: "consultation",
                    entity_id: consultation_id,
                    previous_state: { case_status: "FOLLOW_UP_PENDING" },
                    new_state: { case_status: "CLOSED_RESOLVED" },
                    change_description: "Patient marked follow-up as resolved",
                    changed_by: patient_id,
                });

                return success("Consultation resolved", { new_status: "CLOSED_RESOLVED" });
            }

            default:
                return failure("Invalid action. Use: update_symptoms, book_followup, mark_resolved");
        }

    } catch (err) {
        console.error("POST /api/patient/followup-actions error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
