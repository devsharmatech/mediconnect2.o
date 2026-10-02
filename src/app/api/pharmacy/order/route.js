import { success, failure } from "@/lib/response";
import sql from "@/lib/db";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "@/lib/layer1/idempotencyService";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeUuid(val) {
  if (!val || typeof val !== "string") return null;
  return UUID_REGEX.test(val.trim()) ? val.trim() : null;
}

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
    const patientUuid = safeUuid(patient_id);
    const episodeUuid = safeUuid(care_episode_id);
    const consultUuid = safeUuid(consultation_id);

    const [pharmacyOrder] = await sql`
      INSERT INTO pharmacy_orders (
        patient_id, care_episode_id, consultation_id, status, delivery_address, created_at, updated_at
      )
      VALUES (
        ${patientUuid}, ${episodeUuid}, ${consultUuid}, 'CONFIRMED', ${address || ''}, NOW(), NOW()
      )
      RETURNING id
    `;

    if (!pharmacyOrder) {
      await releaseIdempotencyLock(idempotencyKey, { message: "Failed to create pharmacy order" }, 500, "FAILED");
      throw new Error("Failed to create pharmacy order");
    }

    // Insert medicines into items
    for (const med of medicines) {
      const medUuid = safeUuid(med.id);
      await sql`
        INSERT INTO pharmacy_order_items (order_id, medicine_id, quantity, dosage, created_at)
        VALUES (${pharmacyOrder.id}, ${medUuid}, ${med.quantity || 1}, ${med.dosage || ''}, NOW())
      `;
    }

    // Dispatch outbox event for state machine
    await insertOutboxEvent({
      event_type: "PHARMACY_UPDATE",
      consultation_id: pharmacyOrder.id,
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
