import sql from "@/lib/db";
import { uploadToS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const order_id = formData.get("order_id");
    const file = formData.get("payment_proof");
    const utr = (formData.get("utr_number") || formData.get("utr") || "").trim();

    if (!order_id) {
      return failure("order_id is required", null, 400, {
        headers: corsHeaders,
      });
    }

    if (!utr) {
      return failure("UTR / UPI Transaction Reference Number is required", null, 400, {
        headers: corsHeaders,
      });
    }

    // 1. Fetch order from AWS RDS
    const orderRows = await sql`
      SELECT id, unid, patient_id, chemist_id, status, total_amount
      FROM medicine_orders
      WHERE id = ${order_id}
      LIMIT 1
    `;
    const order = orderRows[0];

    if (!order) {
      return failure("Order not found", null, 404, { headers: corsHeaders });
    }

    // Allow upload in payment pending or rejected states
    const allowedStatuses = [
      "payment_pending",
      "waiting_for_payment",
      "awaiting_payment",
      "payment_submitted",
      "payment_verification_pending",
      "payment_verification_failed",
      "payment_declined",
      "payment_rejected"
    ];

    if (!allowedStatuses.includes(order.status)) {
      return failure(
        `Payment upload not allowed for order with status '${order.status}'`,
        null,
        409,
        { headers: corsHeaders }
      );
    }

    // 2. Upload screenshot to AWS S3 if provided (Optional)
    let publicUrl = null;
    if (file && typeof file === "object" && file.size && file.size > 0) {
      try {
        const ext = file.name ? file.name.split(".").pop().toLowerCase() : "jpg";
        const key = `payment_proofs/${order.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const contentType = file.type || "image/jpeg";
        const uploadRes = await uploadToS3(file, key, contentType);
        publicUrl = uploadRes?.url || null;
      } catch (uploadErr) {
        console.warn("Screenshot upload warning (continuing with UTR):", uploadErr.message);
      }
    }

    // 3. Update medicine_orders in AWS RDS
    await sql`
      UPDATE medicine_orders
      SET 
        status = 'payment_submitted',
        utr_number = ${utr},
        payment_proof_url = COALESCE(${publicUrl}, payment_proof_url),
        payment_declaration_by_patient = true,
        payment_failed_reason = NULL,
        payment_method = 'upi_qr',
        updated_at = NOW()
      WHERE id = ${order.id}
    `;

    // 4. Record entry in medicine_order_payments if table exists
    try {
      await sql`
        INSERT INTO medicine_order_payments (
          order_id,
          patient_id,
          amount,
          payment_method,
          payment_proof_url,
          utr_number,
          status,
          created_at
        ) VALUES (
          ${order.id},
          ${order.patient_id},
          ${order.total_amount || 0},
          'upi_qr',
          ${publicUrl},
          ${utr},
          'submitted',
          NOW()
        )
      `;
    } catch (e) {
      console.warn("Could not insert payment record (non-fatal):", e.message);
    }

    // 5. Notify the Chemist immediately to verify and proceed
    try {
      const patientRows = await sql`
        SELECT full_name FROM patient_details WHERE id = ${order.patient_id} LIMIT 1
      `;
      const patientName = patientRows[0]?.full_name || "Patient";

      await sendPushAndInAppNotification({
        userId: order.chemist_id,
        title: "Payment Received! 💰",
        message: `${patientName} paid ₹${order.total_amount} via UPI (UTR: ${utr}) for Order #${order.unid || order.id.slice(0, 8)}. Please verify and proceed to packing!`,
        type: "medicine_payment",
        metadata: {
          order_id: order.id,
          unid: order.unid,
          utr,
          payment_proof_url: publicUrl,
          amount: order.total_amount,
        },
      });

      // Audit log
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
          ${order.patient_id},
          ${order.id},
          'pharmacy',
          'PAYMENT_SUBMITTED',
          ${`Payment of ₹${order.total_amount} submitted by patient with UTR: ${utr}. Waiting for chemist verification.`},
          ${JSON.stringify({ order_id: order.id, utr, payment_proof_url: publicUrl })},
          NOW()
        )
      `;
    } catch (notifErr) {
      console.warn("Chemist notification error:", notifErr?.message);
    }

    return success(
      "Payment details submitted successfully! The chemist has been notified to verify your payment and start packing.",
      {
        order_id: order.id,
        unid: order.unid,
        chemist_id: order.chemist_id,
        amount: order.total_amount,
        utr_number: utr,
        payment_proof_url: publicUrl,
        status: "payment_submitted"
      },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Error uploading payment proof:", err);
    return failure("Failed to upload payment proof", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
