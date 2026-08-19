import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, patient_id, reason } = await req.json();

    if (!order_id || !patient_id) {
      return failure("order_id & patient_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase
      .from("medicine_orders")
      .update({
        status: "payment_declined",
        patient_reject_reason: reason,
        payment_qr_url: null,
        payment_qr_payload: null,
      })
      .eq("id", order_id)
      .eq("patient_id", patient_id)
      .select()
      .single();

    if (error) throw error;

    return success("Payment declined", data, 200, {
      headers: corsHeaders,
    });

  } catch (err) {
    return failure("Failed to decline payment", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
