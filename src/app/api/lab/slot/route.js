import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "@/lib/layer1/idempotencyService";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";

/**
 * POST /api/lab/slot
 * Lab booking flow
 */
export async function POST(req) {
    let idempotencyKey = null;

    try {
        const body = await req.json();
        const { care_episode_id, patient_id, lab_tests, scheduled_time, address, idempotency_key } = body;

        if (!care_episode_id || !patient_id || !lab_tests || lab_tests.length === 0 || !idempotency_key) {
            return failure("Missing required fields for lab booking", null, 400);
        }

        idempotencyKey = idempotency_key;

        // Idempotency lock
        const { isLocked, isDuplicate, responseBody, responseStatus, error } = await acquireIdempotencyLock(
            idempotencyKey,
            "/api/lab/slot",
            care_episode_id
        );

        if (error) return failure("Lab booking orchestration locked or failed", error, 500);
        if (isDuplicate) return success(responseBody?.message || "Lab already booked", responseBody?.data, responseStatus);

        // Calculate amount or fetch from DB
        const amount = 500; // Mock fixed amount for now

        // Create Lab Order
        const { data: labOrder, error: labErr } = await supabase
            .from("lab_test_orders")
            .insert([{
                patient_id,
                care_episode_id,
                status: "REQUESTED",
                payment_status: "pending",
                address: address || "",
                scheduled_time: scheduled_time || new Date().toISOString()
            }])
            .select("id")
            .single();

        if (labErr) {
            await releaseIdempotencyLock(idempotencyKey, { message: "Failed to create lab order" }, 500, "FAILED");
            throw new Error("Failed to create lab test order");
        }

        // Insert individual tests
        const testsToInsert = lab_tests.map(test => ({
            order_id: labOrder.id,
            test_name: test.name,
            test_id: test.id || null
        }));
        await supabase.from("lab_test_items").insert(testsToInsert);

        // Dispatch outbox event for state machine
        await insertOutboxEvent({
            event_type: "LAB_STATUS_UPDATE",
            consultation_id: labOrder.id, // Using order ID as reference
            care_episode_id,
            consultation_type: "LAB_ORDER",
            payload: { status: "REQUESTED", order_id: labOrder.id }
        });

        const successData = {
            order_id: labOrder.id,
            status: "REQUESTED",
            payment_amount: amount
        };

        await releaseIdempotencyLock(idempotencyKey, { message: "Lab slot requested", data: successData }, 200);
        return success("Lab slot requested", successData);

    } catch (err) {
        console.error("POST /api/lab/slot error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
