/**
 * API: Admin Manual Intervention
 * 
 * POST /api/admin/intervention
 * Body: { consultation_id, action: "trigger_nudge" | "force_resolve" }
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { updateConsultationStatus } from "@/lib/layer1/consultationStateMachine";

export async function POST(req) {
    try {
        const body = await req.json();
        const { consultation_id, action, admin_id } = body;

        if (!consultation_id || !action || !admin_id) {
            return failure("consultation_id, action, and admin_id are required");
        }

        // Fetch consultation
        let { data: consultation, error: fetchErr } = await supabase
            .from("consultations")
            .select("*")
            .eq("id", consultation_id)
            .single();

        // If no consultation row, check if it's an appointment that hasn't started yet
        if (fetchErr || !consultation) {
            const { data: apt, error: aptErr } = await supabase
                .from("appointments")
                .select("*")
                .eq("id", consultation_id)
                .single();

            if (aptErr || !apt) {
                return failure("Consultation/Appointment not found", null, 404);
            }

            if (action === "trigger_nudge") {
                await supabase.from("follow_up_reminders").insert({
                    consultation_id,
                    reminder_type: "MANUAL_NUDGE",
                    status: "sent",
                    sent_at: new Date().toISOString()
                });
                return success("Manual follow-up nudge triggered for appointment");
            }

            if (action === "force_resolve") {
                // Initialize consultation row directly as resolved
                await supabase.from("consultations").insert({
                    id: apt.id,
                    appointment_id: apt.id,
                    patient_id: apt.patient_id,
                    doctor_id: apt.doctor_id,
                    case_status: "CLOSED_RESOLVED",
                    created_at: new Date().toISOString()
                });
                // Update appointment status to completed
                await supabase.from("appointments").update({ status: "completed" }).eq("id", apt.id);
                
                return success("Consultation manually resolved (initialized from appointment)");
            }
            
            return failure("Invalid intervention action");
        }

        if (action === "trigger_nudge") {
            // Log manual nudge activity
            await supabase.from("follow_up_reminders").insert({
                consultation_id,
                reminder_type: "MANUAL_NUDGE",
                status: "sent",
                sent_at: new Date().toISOString()
            });

            return success("Manual follow-up nudge triggered");
        }

        if (action === "force_resolve") {
            const stateResult = await updateConsultationStatus(
                consultation_id,
                "CLOSED_RESOLVED",
                admin_id,
                "Manual admin intervention force resolve"
            );
            
            // Also update appointment status
            await supabase.from("appointments").update({ status: "completed" }).eq("id", consultation_id);

            return success("Consultation manually resolved", stateResult);
        }

        return failure("Invalid intervention action");

    } catch (err) {
        console.error("POST /api/admin/intervention error:", err);
        return failure("Intervention failed", err.message, 500);
    }
}
