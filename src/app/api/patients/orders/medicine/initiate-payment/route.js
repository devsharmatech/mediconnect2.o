import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import Razorpay from "razorpay";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return failure("order_id is required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch order from AWS RDS
    const orderRows = await sql`
      SELECT mo.*, cd.pharmacy_name
      FROM medicine_orders mo
      LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
      WHERE mo.id = ${order_id}
      LIMIT 1
    `;
    const order = orderRows[0];

    if (!order) {
      return failure("Medicine order not found", null, 404, { headers: corsHeaders });
    }

    if (order.payment_status === "paid" || order.status === "approved" || order.status === "delivered") {
      return failure("Order is already paid and confirmed", null, 400, { headers: corsHeaders });
    }

    const finalAmount = parseFloat(order.total_amount || 0);
    if (finalAmount <= 0) {
      return failure("Invalid payable amount for order", null, 400, { headers: corsHeaders });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpaySecret) {
      return failure("Payment gateway credentials not configured", null, 500, { headers: corsHeaders });
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpaySecret,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100), // in paise
      currency: "INR",
      receipt: `med_ord_${order.unid || order.id.slice(0, 8)}`,
      notes: {
        order_id: String(order.id),
        unid: String(order.unid || ""),
        patient_id: String(order.patient_id),
        chemist_id: String(order.chemist_id),
        pharmacy_name: order.pharmacy_name || "Partner Pharmacy",
      },
    });

    if (razorpayOrder?.id) {
      await sql`
        UPDATE medicine_orders
        SET razorpay_order_id = ${razorpayOrder.id},
            updated_at = NOW()
        WHERE id = ${order.id}
      `;
    }

    return success("Razorpay payment checkout initiated", {
      order_id: order.id,
      unid: order.unid,
      razorpay_order_id: razorpayOrder.id,
      razorpay_key: razorpayKeyId,
      amount: finalAmount,
      pharmacy_name: order.pharmacy_name || "Partner Pharmacy",
    }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error initiating medicine order payment:", err);
    return failure("Failed to initiate payment gateway", err.message, 500, { headers: corsHeaders });
  }
}
