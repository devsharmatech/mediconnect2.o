import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { prescription_id, patient_id, chemist_id, medicines, patient_notes, delivery_address, delivery_type } = body;

    if (!prescription_id || !patient_id) {
      return failure("prescription_id & patient_id required", null, 400, { headers: corsHeaders });
    }

    const caller = await resolveCallerFromRequest(req);
    if (!caller) {
      return failure("Unauthorized - missing or invalid token.", null, 401, { headers: corsHeaders });
    }
    if (caller.id !== patient_id && caller.role !== "admin") {
      return failure("Forbidden - you do not have permission to place this order.", null, 403, { headers: corsHeaders });
    }

    /* ── Insert medicine order ── */
    const orderRows = await sql`
      INSERT INTO medicine_orders (
        prescription_id,
        patient_id,
        chemist_id,
        status,
        patient_notes,
        delivery_address,
        delivery_type,
        created_at,
        updated_at
      ) VALUES (
        ${prescription_id},
        ${patient_id},
        ${chemist_id || null},
        ${chemist_id ? "sent_to_chemist" : "pending"},
        ${patient_notes || null},
        ${delivery_address || null},
        ${delivery_type || "home_delivery"},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    const order = orderRows[0];
    if (!order) throw new Error("Failed to insert medicine order");

    /* ── Insert order items ── */
    if (Array.isArray(medicines) && medicines.length > 0) {
      for (const m of medicines) {
        await sql`
          INSERT INTO medicine_order_items (
            order_id,
            medicine_name,
            dosage,
            frequency,
            duration,
            quantity,
            created_at
          ) VALUES (
            ${order.id},
            ${m.name || m.medicine_name || ""},
            ${m.dosage || null},
            ${m.frequency || null},
            ${m.duration || null},
            ${m.quantity || 1},
            NOW()
          )
        `.catch((e) => console.warn("Item insert warn:", e.message));
      }
    }

    /* ── Notifications (non-fatal) ── */
    try {
      const [chemistRows, patientRows] = await Promise.all([
        chemist_id
          ? sql`SELECT pharmacy_name FROM chemist_details WHERE id = ${chemist_id} LIMIT 1`
          : Promise.resolve([]),
        sql`SELECT full_name FROM patient_details WHERE id = ${patient_id} LIMIT 1`,
      ]);

      const chemistName = chemistRows[0]?.pharmacy_name || "the Pharmacy";
      const patientName = patientRows[0]?.full_name || "Patient";

      const notifPromises = [
        sendPushAndInAppNotification({
          userId: patient_id,
          title: "Medicine Order Placed",
          message: `Your medicine order has been successfully placed with ${chemistName}.`,
          type: "medicine_order",
          metadata: { order_id: order.id, chemist_id },
        }),
      ];

      if (chemist_id) {
        notifPromises.push(
          sendPushAndInAppNotification({
            userId: chemist_id,
            title: "New Medicine Order",
            message: `You have received a new medicine order from ${patientName}.`,
            type: "medicine_order",
            metadata: { order_id: order.id, patient_id },
          })
        );
      }

      Promise.all(notifPromises).catch((e) =>
        console.warn("Notification send failed (non-fatal):", e.message)
      );
    } catch (notifErr) {
      console.warn("Notification block failed (non-fatal):", notifErr.message);
    }

    return success("Medicine order created", order, 201, { headers: corsHeaders });
  } catch (err) {
    console.error("Create medicine order error:", err);
    return failure("Failed to create order", err.message, 500, { headers: corsHeaders });
  }
}
