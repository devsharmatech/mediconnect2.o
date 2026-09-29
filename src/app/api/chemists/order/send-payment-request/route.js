import sql from "@/lib/db";
import { uploadToS3, getPresignedDownloadUrl } from "@/lib/s3";
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
    const chemist_id = formData.get("chemist_id");
    const use_saved_qr = formData.get("use_saved_qr") === "true";
    const save_qr = formData.get("save_qr") === "true";
    const qr_file = formData.get("qr_image");
    const payment_qr_payload = formData.get("payment_qr_payload");
    const qr_label = formData.get("qr_label") || "UPI";
    const chemist_notes = formData.get("chemist_notes") || null;

    if (!order_id || !chemist_id) {
      return failure("order_id and chemist_id required", null, 400, { headers: corsHeaders });
    }

    /* --------------------------------------------------
       1️⃣ FETCH ORDER (VALIDATION)
    -------------------------------------------------- */
    const orderRows = await sql`
      SELECT id, status, total_amount, patient_id
      FROM medicine_orders
      WHERE id = ${order_id} AND chemist_id = ${chemist_id}
      LIMIT 1
    `;
    const order = orderRows[0];

    if (!order) {
      return failure("Order not found", null, 404, { headers: corsHeaders });
    }

    if (!order.total_amount || parseFloat(order.total_amount) <= 0) {
      return failure("Order amount must be greater than 0", null, 422, { headers: corsHeaders });
    }

    if (!["approved", "partially_approved", "payment_declined", "payment_pending"].includes(order.status)) {
      return failure(
        `Cannot send payment request in '${order.status}' state`,
        null,
        409,
        { headers: corsHeaders }
      );
    }

    /* --------------------------------------------------
       2️⃣ RESOLVE QR (SAVED OR UPLOADED)
    -------------------------------------------------- */
    let qr_url = null;
    let qr_payload = payment_qr_payload;

    if (use_saved_qr) {
      const chemistRows = await sql`
        SELECT payment_qr_url, payment_qr_payload
        FROM chemist_details
        WHERE id = ${chemist_id}
        LIMIT 1
      `;
      const chemist = chemistRows[0];

      if (!chemist?.payment_qr_payload) {
        return failure("No saved QR found", null, 400, { headers: corsHeaders });
      }

      qr_url = chemist.payment_qr_url;
      qr_payload = chemist.payment_qr_payload;
    } else if (qr_file) {
      const ext = qr_file.name ? qr_file.name.split(".").pop() : "png";
      const path = `qr_image/chemist/${chemist_id}_qr-${Date.now()}.${ext}`;

      try {
        await uploadToS3(qr_file, path, "application/octet-stream");
        qr_url = await getPresignedDownloadUrl(path, 60 * 60 * 24 * 365).catch(() => null);
      } catch (err) {
        console.error("QR upload error:", err);
        return failure("Failed to upload QR code", err.message, 500, { headers: corsHeaders });
      }
    }

    if (!qr_payload) {
      return failure("QR payload (UPI ID or UPI link) is required", null, 400, { headers: corsHeaders });
    }

    /* --------------------------------------------------
       3️⃣ UPDATE ORDER → PAYMENT PENDING
    -------------------------------------------------- */
    const updatedRows = await sql`
      UPDATE medicine_orders
      SET
        payment_qr_url      = ${qr_url},
        payment_qr_payload  = ${qr_payload},
        payment_requested_at = NOW(),
        status              = 'payment_pending',
        chemist_notes       = ${chemist_notes},
        updated_at          = NOW()
      WHERE id = ${order_id}
      RETURNING id, status, total_amount, patient_id
    `;
    const updatedOrder = updatedRows[0];
    if (!updatedOrder) throw new Error("Order update failed");

    /* --------------------------------------------------
       4️⃣ SAVE QR TO CHEMIST PROFILE (OPTIONAL)
    -------------------------------------------------- */
    if (save_qr && !use_saved_qr) {
      await sql`
        UPDATE chemist_details
        SET
          payment_qr_url    = ${qr_url},
          payment_qr_payload = ${qr_payload},
          payment_qr_label  = ${qr_label}
        WHERE id = ${chemist_id}
      `.catch((e) => console.warn("QR save failed (non-fatal):", e.message));
    }

    /* --------------------------------------------------
       5️⃣ NOTIFY PATIENT
    -------------------------------------------------- */
    try {
      const chemistNameRows = await sql`
        SELECT pharmacy_name FROM chemist_details WHERE id = ${chemist_id} LIMIT 1
      `;
      const pharmacyName = chemistNameRows[0]?.pharmacy_name || "Your Pharmacy";

      await sendPushAndInAppNotification({
        userId: updatedOrder.patient_id,
        title: "Payment Request 💳",
        message: `${pharmacyName} has sent a payment request of ₹${updatedOrder.total_amount}. Please complete payment to proceed.`,
        type: "payment_request",
        metadata: {
          order_id: updatedOrder.id,
          amount: updatedOrder.total_amount,
          qr_url,
          qr_payload,
        },
      });
    } catch (notifErr) {
      console.warn("Patient notification error (non-fatal):", notifErr?.message);
    }

    return success(
      "Payment request sent to patient successfully",
      {
        order_id: updatedOrder.id,
        status: updatedOrder.status,
        total_amount: updatedOrder.total_amount,
        payment_qr_url: qr_url,
        payment_qr_payload: qr_payload,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Send payment request error:", err);
    return failure("Failed to send payment request", err.message, 500, { headers: corsHeaders });
  }
}
