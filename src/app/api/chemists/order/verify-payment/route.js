import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, chemist_id } = await req.json();

    if (!order_id || !chemist_id) {
      return failure("order_id & chemist_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    // 1. Verify order belongs to this chemist and update status
    const updatedOrderRows = await sql`
      UPDATE medicine_orders
      SET 
        status = 'approved',
        payment_verified_at = NOW(),
        updated_at = NOW()
      WHERE id = ${order_id} AND chemist_id = ${chemist_id}
      RETURNING id, unid, patient_id, chemist_id, total_amount, status, utr_number, delivery_type
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
    const chemistName = chemistRows[0]?.pharmacy_name || "Your pharmacy";

    // 3. Notify patient that payment has been verified
    try {
      await sendPushAndInAppNotification({
        userId: order.patient_id,
        title: "Payment Verified! 💊",
        message: `${chemistName} has verified your payment of ₹${order.total_amount}. Order #${order.unid || order.id.slice(0, 8)} is now confirmed and preparation has started.`,
        type: "payment_verified",
        metadata: {
          order_id: order.id,
          amount: order.total_amount,
          status: "approved"
        },
      });
    } catch (notifErr) {
      console.warn("Patient notification warning:", notifErr?.message);
    }

    // 4. Log activity
    try {
      await sql`
        INSERT INTO activity_log (
          patient_id,
          actor_id,
          reference_id,
          module_type,
          action_type,
          description,
          metadata,
          created_at
        ) VALUES (
          ${order.patient_id},
          ${chemist_id},
          ${order.id},
          'pharmacy',
          'PAYMENT_VERIFIED',
          ${`Payment of ₹${order.total_amount} verified by ${chemistName}. Order confirmed.`},
          ${JSON.stringify({ order_id: order.id, utr_number: order.utr_number })},
          NOW()
        )
      `;
    } catch (e) {
      console.warn("Activity log insert failed (non-fatal):", e.message);
    }

    return success(
      "Payment verified successfully. Order confirmed and preparation released.",
      { order },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Payment verification error:", err);
    return failure("Failed to verify payment", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
