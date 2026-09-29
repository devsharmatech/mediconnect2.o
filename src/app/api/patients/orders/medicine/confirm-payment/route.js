import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return failure("order_id required", null, 400, { headers: corsHeaders });
    }

    const orderRows = await sql`
      SELECT id, patient_id, chemist_id, status, total_amount
      FROM medicine_orders
      WHERE id = ${order_id}
      LIMIT 1
    `;
    const order = orderRows[0];

    if (!order) {
      return failure("Order not found", null, 404, { headers: corsHeaders });
    }

    if (!["payment_pending", "awaiting_payment"].includes(order.status)) {
      return failure(
        "Payment confirmation allowed only when payment is pending",
        null,
        409,
        { headers: corsHeaders }
      );
    }

    // Record payment entry (non-fatal)
    sql`
      INSERT INTO medicine_order_payments (
        order_id, patient_id, amount, payment_method, status, created_at
      ) VALUES (
        ${order.id}, ${order.patient_id}, ${order.total_amount || 0}, 'upi', 'submitted', NOW()
      )
    `.catch((e) => console.warn("Payment record insert (non-fatal):", e.message));

    // Update order status
    await sql`
      UPDATE medicine_orders
      SET status = 'payment_submitted', updated_at = NOW()
      WHERE id = ${order.id}
    `;

    return success(
      "Payment confirmed successfully",
      {
        order_id: order.id,
        chemist_id: order.chemist_id,
        amount: order.total_amount,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Confirm payment error:", err);
    return failure("Failed to confirm payment", err.message, 500, { headers: corsHeaders });
  }
}
