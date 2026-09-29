import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, patient_id } = await req.json();

    if (!order_id || !patient_id) {
      return failure("order_id and patient_id are required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch order — validate ownership
    const orderRows = await sql`
      SELECT id, chemist_id, status
      FROM medicine_orders
      WHERE id = ${order_id} AND patient_id = ${patient_id}
      LIMIT 1
    `;
    const order = orderRows[0];

    if (!order) {
      return failure("Order not found or unauthorized", null, 404, { headers: corsHeaders });
    }

    // 2. Update order status to payment_submitted
    // Use a safe UPDATE that ignores missing payment_declaration_by_patient column
    let updatedOrder;
    try {
      const updated = await sql`
        UPDATE medicine_orders
        SET
          status = 'payment_submitted',
          payment_declaration_by_patient = true,
          updated_at = NOW()
        WHERE id = ${order_id}
        RETURNING *
      `;
      updatedOrder = updated[0];
    } catch (_) {
      // Column may not exist — retry without it
      const updated = await sql`
        UPDATE medicine_orders
        SET status = 'payment_submitted', updated_at = NOW()
        WHERE id = ${order_id}
        RETURNING *
      `;
      updatedOrder = updated[0];
    }

    if (!updatedOrder) throw new Error("Order update failed");

    // 3. Notify the chemist
    try {
      const patientRows = await sql`
        SELECT pd.full_name, u.phone_number
        FROM patient_details pd
        LEFT JOIN users u ON u.id = pd.id
        WHERE pd.id = ${patient_id}
        LIMIT 1
      `;
      const patientName = patientRows[0]?.full_name || patientRows[0]?.phone_number || "Patient";

      if (order.chemist_id) {
        await sendPushAndInAppNotification({
          userId: order.chemist_id,
          title: "Payment Declared 💸",
          message: `${patientName} has declared UPI payment. Please verify the receipt in your dashboard!`,
          type: "medicine_payment",
          metadata: { order_id },
        });
      }
    } catch (notifErr) {
      console.warn("Chemist notification failed (non-fatal):", notifErr?.message);
    }

    return success("Payment declared successfully", updatedOrder, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error declaring payment:", err);
    return failure("Failed to declare payment", err.message, 500, { headers: corsHeaders });
  }
}
