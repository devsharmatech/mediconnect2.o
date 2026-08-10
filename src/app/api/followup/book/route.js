import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "@/lib/layer1/idempotencyService";

/**
 * POST /api/followup/book
 * Books a follow-up appointment
 */
export async function POST(req) {
    let idempotencyKey = null;

    try {
        const body = await req.json();
        const { care_episode_id, patient_id, doctor_id, scheduled_time, idempotency_key } = body;

        if (!care_episode_id || !patient_id || !doctor_id || !scheduled_time || !idempotency_key) {
            return failure("Missing required fields for follow-up booking", null, 400);
        }

        idempotencyKey = idempotency_key;

        // Idempotency lock
        const { isLocked, isDuplicate, responseBody, responseStatus, error } = await acquireIdempotencyLock(
            idempotencyKey,
            "/api/followup/book",
            care_episode_id
        );

        if (error) return failure("Follow-up booking locked or failed", error, 500);
        if (isDuplicate) return success(responseBody?.message || "Follow-up already booked", responseBody?.data, responseStatus);

        // Verify existing follow-up hasn't already been booked
        const { data: existingFollowup } = await supabase
            .from("appointments")
            .select("id")
            .eq("care_episode_id", care_episode_id)
            .eq("appointment_type", "follow_up")
            .maybeSingle();

        if (existingFollowup) {
            const responseData = { appointment_id: existingFollowup.id, status: "ALREADY_BOOKED" };
            await releaseIdempotencyLock(idempotencyKey, { message: "Follow-up already exists", data: responseData }, 200);
            return success("Follow-up already exists", responseData);
        }

        // Create follow-up appointment
        const { data: appointment, error: apptErr } = await supabase
            .from("appointments")
            .insert([{
                patient_id,
                doctor_id,
                care_episode_id,
                appointment_type: "follow_up",
                appointment_date: scheduled_time,
                status: "booked", // Automatically confirmed if prepaid or no charge
                payment_status: "paid" // Assuming follow-ups are free or pre-paid
            }])
            .select("id")
            .single();

        if (apptErr) {
            await releaseIdempotencyLock(idempotencyKey, { message: "Failed to book follow-up" }, 500, "FAILED");
            throw new Error("Failed to book follow-up");
        }

        const successData = {
            appointment_id: appointment.id,
            status: "BOOKED"
        };

        await releaseIdempotencyLock(idempotencyKey, { message: "Follow-up booked successfully", data: successData }, 200);
        return success("Follow-up booked successfully", successData);

    } catch (err) {
        console.error("POST /api/followup/book error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
