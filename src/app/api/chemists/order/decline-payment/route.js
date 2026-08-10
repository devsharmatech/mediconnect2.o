import { supabase } from "@/lib/supabaseAdmin";
import admin from "@/lib/firebaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, chemist_id, reason } = await req.json();

    if (!order_id || !chemist_id) {
      return failure("order_id & chemist_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    // 1. Update order status to payment_verification_failed
    const { data: order, error } = await supabase
      .from("medicine_orders")
      .update({
        status: "payment_verification_failed",
        payment_declaration_by_patient: false,
        payment_failed_reason: reason || "Payment verification failed",
        updated_at: new Date(),
      })
      .eq("id", order_id)
      .eq("chemist_id", chemist_id)
      .select("id, patient_id, total_amount")
      .single();

    if (error || !order) {
      return failure("Order not found or not authorized", null, 404, {
        headers: corsHeaders,
      });
    }

    // 2. Fetch patient FCM token
    const { data: patient } = await supabase
      .from("users")
      .select("fcm_token")
      .eq("id", order.patient_id)
      .single();

    // 3. Send notification to patient
    if (patient?.fcm_token) {
      await admin.messaging().send({
        token: patient.fcm_token,
        notification: {
          title: "Payment Verification Failed ❌",
          body: `The pharmacy could not verify your payment. Reason: ${reason || "Verification failed"}. Please retry or contact the pharmacy.`,
        },
        data: {
          type: "payment_verification_failed",
          order_id: order.id,
          amount: String(order.total_amount),
        },
      });
    }

    return success("Payment verification declined", {
      order_id: order.id,
      status: "payment_verification_failed",
    }, 200, { headers: corsHeaders });

  } catch (err) {
    console.error("Decline payment error:", err);
    return failure("Failed to decline payment", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
