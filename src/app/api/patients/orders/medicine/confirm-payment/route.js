import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return failure("order_id required", null, 400, {
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

    if (order.status !== "payment_pending") {
      return failure(
        "Payment confirmation allowed only after payment request",
        null,
        409,
        { headers: corsHeaders }
      );
    }

    await supabase.from("medicine_order_payments").insert({
      order_id: order.id,
      patient_id: order.patient_id,
      amount: order.total_amount,
      payment_method: "upi",
      status: "submitted",
    });

    await supabase
      .from("medicine_orders")
      .update({
        status: "payment_submitted",
        updated_at: new Date(),
      })
      .eq("id", order.id);

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
    return failure("Failed to confirm payment", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
