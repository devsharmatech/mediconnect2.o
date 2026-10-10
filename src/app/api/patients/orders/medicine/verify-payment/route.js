import crypto from "crypto";
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const {
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (!order_id || !razorpay_payment_id) {
      return failure(
        "Missing required payment verification parameters: order_id, razorpay_payment_id",
        null,
        400,
        { headers: corsHeaders }
      );
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

    // Check if already verified
    if (order.payment_status === "paid" || order.status === "approved" || order.status === "packing") {
      return success(
        "Payment already verified for this order",
        { order_id: order.id, status: order.status },
        200,
        { headers: corsHeaders }
      );
    }

    // 2. Cryptographic signature verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret && razorpay_order_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        // Log failed audit entry
        try {
          await sql`
            INSERT INTO medicine_payment_logs (
              order_id,
              patient_id,
              chemist_id,
              razorpay_order_id,
              razorpay_payment_id,
              razorpay_signature,
              amount,
              currency,
              status,
              source,
              audit_details,
              created_at
            ) VALUES (
              ${order.id},
              ${order.patient_id},
              ${order.chemist_id},
              ${razorpay_order_id},
              ${razorpay_payment_id},
              ${razorpay_signature},
              ${order.total_amount || 0},
              'INR',
              'signature_mismatch',
              'web_razorpay',
              ${JSON.stringify({ error: "Cryptographic signature mismatch" })}::jsonb,
              NOW()
            )
          `;
        } catch (logErr) {
          console.warn("Could not log failed audit:", logErr.message);
        }

        return failure(
          "Payment verification failed: Signature mismatch",
          null,
          400,
          { headers: corsHeaders }
        );
      }
    }

    // 3. Update order in AWS RDS to approved/paid
    const updatedOrderRows = await sql`
      UPDATE medicine_orders 
      SET 
        status = 'approved',
        payment_status = 'paid',
        payment_verified_at = NOW(),
        razorpay_payment_id = ${razorpay_payment_id},
        razorpay_order_id = ${razorpay_order_id || order.razorpay_order_id || null},
        razorpay_signature = ${razorpay_signature || null},
        payment_method = 'razorpay',
        updated_at = NOW()
      WHERE id = ${order.id}
      RETURNING *
    `;
    const updatedOrder = updatedOrderRows[0] || order;

    // 4. Record Immutable Audit Log
    try {
      await sql`
        INSERT INTO medicine_payment_logs (
          order_id,
          patient_id,
          chemist_id,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          amount,
          currency,
          status,
          source,
          audit_details,
          created_at
        ) VALUES (
          ${order.id},
          ${order.patient_id},
          ${order.chemist_id},
          ${razorpay_order_id || order.razorpay_order_id || null},
          ${razorpay_payment_id},
          ${razorpay_signature || null},
          ${order.total_amount || 0},
          'INR',
          'verified',
          'web_razorpay',
          ${JSON.stringify({
            verified_at: new Date().toISOString(),
            channel: "razorpay_checkout",
            unid: order.unid,
          })}::jsonb,
          NOW()
        )
      `;
    } catch (auditErr) {
      console.warn("Could not log successful payment audit:", auditErr.message);
    }

    // 5. Real-time Notifications & Alerts
    try {
      if (order.chemist_id) {
        await sendPushAndInAppNotification({
          userId: order.chemist_id,
          title: "Payment Received 💳",
          message: `₹${order.total_amount} received for Order #${order.unid || ""}. Please begin packing medicines!`,
          type: "medicine_payment_confirmed",
          metadata: {
            order_id: order.id,
            unid: order.unid,
            payment_id: razorpay_payment_id,
            amount: order.total_amount,
          },
        });
      }

      if (order.patient_id) {
        await sendPushAndInAppNotification({
          userId: order.patient_id,
          title: "Payment Confirmed 💊",
          message: `Your payment of ₹${order.total_amount} was received successfully. ${order.pharmacy_name || "Pharmacy"} is packing your order.`,
          type: "medicine_order_paid",
          metadata: {
            order_id: order.id,
            unid: order.unid,
            payment_id: razorpay_payment_id,
          },
        });
      }
    } catch (notifErr) {
      console.warn("Notification dispatch warning:", notifErr.message);
    }

    return success(
      "Payment successfully verified and order confirmed",
      {
        order: updatedOrder,
        order_id: order.id,
        unid: order.unid,
        status: "approved",
        payment_status: "paid",
      },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Medicine verify payment error:", err);
    return failure("Failed to verify payment", err.message, 500, { headers: corsHeaders });
  }
}
