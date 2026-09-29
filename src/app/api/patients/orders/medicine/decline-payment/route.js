import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, patient_id, reason } = await req.json();

    if (!order_id || !patient_id) {
      return failure("order_id & patient_id required", null, 400, { headers: corsHeaders });
    }

    // Try with patient_reject_reason column first, fall back if it doesn't exist
    let updated;
    try {
      updated = await sql`
        UPDATE medicine_orders
        SET
          status = 'payment_declined',
          patient_reject_reason = ${reason || null},
          payment_qr_url = NULL,
          payment_qr_payload = NULL,
          updated_at = NOW()
        WHERE id = ${order_id} AND patient_id = ${patient_id}
        RETURNING id, chemist_id, status, total_amount
      `;
    } catch (_) {
      updated = await sql`
        UPDATE medicine_orders
        SET
          status = 'payment_declined',
          payment_qr_url = NULL,
          payment_qr_payload = NULL,
          updated_at = NOW()
        WHERE id = ${order_id} AND patient_id = ${patient_id}
        RETURNING id, chemist_id, status, total_amount
      `;
    }

    const data = updated[0];
    if (!data) {
      return failure("Order not found or unauthorized", null, 404, { headers: corsHeaders });
    }

    // Notify chemist (non-fatal)
    if (data.chemist_id) {
      sendPushAndInAppNotification({
        userId: data.chemist_id,
        title: "Payment Declined",
        message: `Patient declined the payment request${reason ? `: ${reason}` : ""}. Please review the order.`,
        type: "medicine_payment",
        metadata: { order_id },
      }).catch((e) => console.warn("Decline notification (non-fatal):", e?.message));
    }

    return success("Payment declined", data, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Decline payment error:", err);
    return failure("Failed to decline payment", err.message, 500, { headers: corsHeaders });
  }
}
