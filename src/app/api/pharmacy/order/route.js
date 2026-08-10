import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "@/lib/layer1/idempotencyService";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";

/**
 * POST /api/pharmacy/order
 * Pharmacy booking flow
 */
export async function POST(req) {
    let idempotencyKey = null;

    try {
        const body = await req.json();
        const { care_episode_id, patient_id, consultation_id, address, medicines, idempotency_key } = body;

        if (!care_episode_id || !patient_id || !medicines || medicines.length === 0 || !idempotency_key) {
            return failure("Missing required fields for pharmacy order", null, 400);
        }

        idempotencyKey = idempotency_key;

        // Idempotency lock
        const { isLocked, isDuplicate, responseBody, responseStatus, error } = await acquireIdempotencyLock(
            idempotencyKey,
            "/api/pharmacy/order",
            care_episode_id
        );

        if (error) return failure("Pharmacy orchestration locked or failed", error, 500);
        if (isDuplicate) return success(responseBody?.message || "Order already exists", responseBody?.data, responseStatus);

        const amount = 300; // Mock fixed amount

        // Create Pharmacy Order
        const { data: pharmacyOrder, error: pharmErr } = await supabase
            .from("pharmacy_orders")
            .insert([{
                patient_id,
                care_episode_id,
                consultation_id: consultation_id || null,
                status: "CONFIRMED", // State machine start
                delivery_address: address || "",
            }])
            .select("id")
            .single();

        if (pharmErr) {
            await releaseIdempotencyLock(idempotencyKey, { message: "Failed to create pharmacy order" }, 500, "FAILED");
            throw new Error("Failed to create pharmacy order");
        }

        // Insert medicines into items
        const medsToInsert = medicines.map(med => ({
            order_id: pharmacyOrder.id,
            medicine_id: med.id || null,
            quantity: med.quantity || 1,
            dosage: med.dosage || ""
        }));
        await supabase.from("pharmacy_order_items").insert(medsToInsert);

        // Dispatch outbox event for state machine
        await insertOutboxEvent({
            event_type: "PHARMACY_UPDATE",
            consultation_id: pharmacyOrder.id, // Using order ID as reference
            care_episode_id,
            consultation_type: "PHARMACY_ORDER",
            payload: { status: "CONFIRMED", order_id: pharmacyOrder.id }
        });

        const successData = {
            order_id: pharmacyOrder.id,
            status: "CONFIRMED",
            payment_amount: amount
        };

        await releaseIdempotencyLock(idempotencyKey, { message: "Pharmacy order confirmed", data: successData }, 200);
        return success("Pharmacy order confirmed", successData);

    } catch (err) {
        console.error("POST /api/pharmacy/order error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
