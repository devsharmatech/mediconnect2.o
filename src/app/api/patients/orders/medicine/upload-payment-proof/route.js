import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const order_id = formData.get("order_id");
    const file = formData.get("payment_proof");

    if (!order_id || !file) {
      return failure("order_id and payment_proof required", null, 400, {
        headers: corsHeaders,
      });
    }

    const { data: order, error: orderErr } = await supabase
      .from("medicine_orders")
      .select("id, patient_id, chemist_id, status, total_amount")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return failure("Order not found", null, 404, { headers: corsHeaders });
    }

    if (!['payment_pending', 'waiting_for_payment'].includes(order.status)) {
      return failure(
        "Payment upload allowed only when order is in payment pending state",
        null,
        409,
        { headers: corsHeaders }
      );
    }

    const utr = formData.get("utr_number") || formData.get("utr") || "";
    const path = `payments/${order.id}/${Date.now()}-${file.name}`;

    const { url } = await uploadToS3(file, `payment_proofs/${path}`, "application/octet-stream");
    const publicUrl = url;

    await supabase.from("medicine_order_payments").insert({
      order_id: order.id,
      patient_id: order.patient_id,
      amount: order.total_amount,
      payment_method: "upi",
      payment_proof_url: publicUrl,
      utr_number: utr || null,
      status: "submitted",
    });

    await supabase
      .from("medicine_orders")
      .update({
        status: "payment_submitted",
        utr_number: utr || null,
        payment_declaration_by_patient: true,
        updated_at: new Date(),
      })
      .eq("id", order.id);

    // Notify the Chemist with the UTR detail
    try {
      const { data: patientDetails } = await supabase
        .from("patient_details")
        .select("full_name")
        .eq("id", order.patient_id)
        .maybeSingle();

      const patientName = patientDetails?.full_name || "Patient";
      const utrText = utr ? `(UTR: ${utr})` : "with receipt screenshot";

      await supabase.from("notifications").insert({
        user_id: order.chemist_id,
        title: "Payment Proof Submitted 💳",
        message: `${patientName} paid ₹${order.total_amount} via UPI ${utrText}. Please verify in your dashboard!`,
        type: "medicine_payment",
        metadata: { order_id: order.id, utr },
      });
    } catch (notifErr) {
      console.warn("Chemist notification error:", notifErr?.message);
    }

    return success(
      "Payment proof and UTR uploaded successfully",
      {
        order_id: order.id,
        chemist_id: order.chemist_id, 
        amount: order.total_amount,
        utr_number: utr || null,
        payment_proof_url: publicUrl
      },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    return failure("Failed to upload payment proof", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
