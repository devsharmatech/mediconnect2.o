/**
 * API: Admin Manual Intervention
 * 
 * POST /api/admin/intervention
 * Body: { consultation_id, action: "trigger_nudge" | "force_resolve" }
 */

import { success, failure } from "@/lib/response";
import sql from "@/lib/db";
import { updateConsultationStatus } from "@/lib/layer1/consultationStateMachine";

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const body = await req.json();
        const { consultation_id, action, admin_id } = body;

        if (!consultation_id || !action || !admin_id) {
            return failure("consultation_id, action, and admin_id are required");
        }

        // Fetch consultation
        const consultations = await sql`
            SELECT * FROM consultations WHERE id = ${consultation_id} LIMIT 1
        `;

        const consultation = consultations[0] || null;

        // If no consultation row, check if it's an appointment that hasn't started yet
        if (!consultation) {
            const appointments = await sql`
                SELECT * FROM appointments WHERE id = ${consultation_id} LIMIT 1
            `;

            const apt = appointments[0] || null;
            if (!apt) {
                return failure("Consultation/Appointment not found", null, 404);
            }

            if (action === "trigger_nudge") {
                await sql`
                    INSERT INTO follow_up_reminders (
                        consultation_id, reminder_type, status, sent_at
                    ) VALUES (
                        ${consultation_id}, 'MANUAL_NUDGE', 'sent', NOW()
                    )
                `;
                return success("Manual follow-up nudge triggered for appointment");
            }

            if (action === "force_resolve") {
                // Initialize consultation row directly as resolved
                await sql`
                    INSERT INTO consultations (
                        id, appointment_id, patient_id, doctor_id, case_status, created_at
                    ) VALUES (
                        ${apt.id}, ${apt.id}, ${apt.patient_id}, ${apt.doctor_id}, 'CLOSED_RESOLVED', NOW()
                    )
                    ON CONFLICT (id)
                    DO UPDATE SET case_status = 'CLOSED_RESOLVED', updated_at = NOW()
                `;

                // Update appointment status to completed
                await sql`
                    UPDATE appointments SET status = 'completed' WHERE id = ${apt.id}
                `;
                
                return success("Consultation manually resolved (initialized from appointment)");
            }
            
            return failure("Invalid intervention action");
        }

        if (action === "trigger_nudge") {
            // Log manual nudge activity
            await sql`
                INSERT INTO follow_up_reminders (
                    consultation_id, reminder_type, status, sent_at
                ) VALUES (
                    ${consultation_id}, 'MANUAL_NUDGE', 'sent', NOW()
                )
            `;

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
            await sql`
                UPDATE appointments SET status = 'completed' WHERE id = ${consultation_id}
            `;

            return success("Consultation manually resolved", stateResult);
        }

        return failure("Invalid intervention action");

    } catch (err) {
        console.error("POST /api/admin/intervention error:", err);
        return failure("Intervention failed", err.message, 500);
    }
}
