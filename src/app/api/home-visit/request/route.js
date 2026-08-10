import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "@/lib/layer1/idempotencyService";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";

/**
 * POST /api/home-visit/request
 * Initiates a home visit request
 */
export async function POST(req) {
    let idempotencyKey = null;

    try {
        const body = await req.json();
        const { care_episode_id, patient_id, address, scheduled_time, idempotency_key } = body;

        if (!care_episode_id || !patient_id || !address || !scheduled_time || !idempotency_key) {
            return failure("Missing required fields for home visit request", null, 400);
        }

        idempotencyKey = idempotency_key;

        // Idempotency lock
        const { isLocked, isDuplicate, responseBody, responseStatus, error } = await acquireIdempotencyLock(
            idempotencyKey,
            "/api/home-visit/request",
            care_episode_id
        );

        if (error) return failure("Home visit orchestration locked or failed", error, 500);
        if (isDuplicate) return success(responseBody?.message || "Home visit already requested", responseBody?.data, responseStatus);

        // Create Home Visit Request
        const { data: requestRecord, error: reqErr } = await supabase
            .from("home_visit_request")
            .insert([{
                patient_id,
                care_episode_id,
                address,
                scheduled_time,
                status: "REQUESTED"
            }])
            .select("id")
            .single();

        if (reqErr) {
            await releaseIdempotencyLock(idempotencyKey, { message: "Failed to create home visit request" }, 500, "FAILED");
            throw new Error("Failed to create home visit request");
        }

        // Emit outbox event
        await insertOutboxEvent({
            event_type: "HOME_VISIT_REQUESTED",
            consultation_id: requestRecord.id, // Reference ID
            care_episode_id,
            consultation_type: "HOME_VISIT",
            payload: { status: "REQUESTED", request_id: requestRecord.id, scheduled_time }
        });

        const successData = {
            request_id: requestRecord.id,
            status: "REQUESTED"
        };

        await releaseIdempotencyLock(idempotencyKey, { message: "Home visit requested successfully", data: successData }, 200);
        return success("Home visit requested successfully", successData);

    } catch (err) {
        console.error("POST /api/home-visit/request error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
