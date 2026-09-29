import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, chemist_id, reason = "Payment verification failed" } = await req.json();

    if (!order_id || !chemist_id) {
      return failure("order_id & chemist_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    // 1. Update order status in AWS RDS
    const updatedOrderRows = await sql`
      UPDATE medicine_orders
      SET 
        status = 'payment_declined',
        payment_declaration_by_patient = false,
        payment_failed_reason = ${reason},
        updated_at = NOW()
      WHERE id = ${order_id} AND chemist_id = ${chemist_id}
      RETURNING id, unid, patient_id, chemist_id, total_amount, status
    `;
    const order = updatedOrderRows[0];

    if (!order) {
      return failure("Order not found or unauthorized for this chemist", null, 404, {
        headers: corsHeaders,
      });
    }

    // 2. Fetch chemist name
    const chemistRows = await sql`
      SELECT pharmacy_name FROM chemist_details WHERE id = ${chemist_id} LIMIT 1
    `;
    const chemistName = chemistRows[0]?.pharmacy_name || "The pharmacy";

    // 3. Notify patient of the rejection and reason
    try {
      await sendPushAndInAppNotification({
        userId: order.patient_id,
        title: "Payment Verification Issue ⚠️",
        message: `${chemistName} could not verify your payment. Reason: "${reason}". Please check your UTR number or upload a clearer screenshot.`,
        type: "payment_declined",
        metadata: {
          order_id: order.id,
          reason,
          amount: order.total_amount,
        },
      });
    } catch (notifErr) {
      console.warn("Patient rejection notification warning:", notifErr?.message);
    }

    return success("Payment verification declined", {
      order_id: order.id,
      status: "payment_declined",
      reason
    }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Decline payment error:", err);
    return failure("Failed to decline payment", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
