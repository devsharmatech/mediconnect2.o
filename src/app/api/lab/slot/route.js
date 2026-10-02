import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "@/lib/layer1/idempotencyService";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

/**
 * POST /api/lab/slot
 * Lab booking flow
 */
export async function POST(req) {
    let idempotencyKey = null;

    try {
        const body = await req.json();
        const { care_episode_id, patient_id, lab_tests, scheduled_time, address, idempotency_key } = body;

        const cleanPatientId = safeUuid(patient_id);
        const cleanEpisodeId = safeUuid(care_episode_id);

        if (!cleanPatientId || !lab_tests || !Array.isArray(lab_tests) || lab_tests.length === 0 || !idempotency_key) {
            return failure("Missing required fields for lab booking", null, 400);
        }

        idempotencyKey = idempotency_key;

        // Idempotency lock
        const { isLocked, isDuplicate, responseBody, responseStatus, error } = await acquireIdempotencyLock(
            idempotencyKey,
            "/api/lab/slot",
            cleanEpisodeId
        );

        if (error) return failure("Lab booking orchestration locked or failed", error, 500);
        if (isDuplicate) return success(responseBody?.message || "Lab already booked", responseBody?.data, responseStatus);

        // Calculate amount or fetch from DB
        const amount = 500; // Fixed standard amount

        // Create Lab Order in RDS
        const createdOrders = await sql`
            INSERT INTO lab_test_orders (
                patient_id,
                care_episode_id,
                status,
                payment_status,
                delivery_address,
                scheduled_at,
                total_amount,
                created_at,
                updated_at
            ) VALUES (
                ${cleanPatientId},
                ${cleanEpisodeId},
                'REQUESTED',
                'pending',
                ${JSON.stringify({ address: address || "" })}::jsonb,
                ${scheduled_time ? new Date(scheduled_time) : new Date()},
                ${amount},
                NOW(),
                NOW()
            )
            RETURNING id
        `;

        const labOrderId = createdOrders[0]?.id;
        if (!labOrderId) {
            await releaseIdempotencyLock(idempotencyKey, { message: "Failed to create lab order" }, 500, "FAILED");
            throw new Error("Failed to create lab test order");
        }

        // Insert individual tests into lab_test_order_items
        for (const test of lab_tests) {
            const cleanTestId = safeUuid(test.id);
            await sql`
                INSERT INTO lab_test_order_items (
                    order_id,
                    test_name,
                    test_id,
                    price,
                    status
                ) VALUES (
                    ${labOrderId},
                    ${test.name || "Lab Test"},
                    ${cleanTestId},
                    ${test.price ? Number(test.price) : 0},
                    'pending'
                )
            `;
        }

        // Dispatch outbox event for state machine
        await insertOutboxEvent({
            event_type: "LAB_STATUS_UPDATE",
            consultation_id: labOrderId,
            care_episode_id: cleanEpisodeId,
            consultation_type: "LAB_ORDER",
            payload: { status: "REQUESTED", order_id: labOrderId }
        });

        const successData = {
            order_id: labOrderId,
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
