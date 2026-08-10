import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, status, payment_status } = await req.json();

    if (!order_id)
      return new Response(JSON.stringify({ status: false, message: "Missing order_id" }), {
        headers: corsHeaders,
      });

    const updateFields = {};
    if (status) updateFields.status = status;
    if (payment_status) updateFields.payment_status = payment_status;

    if (Object.keys(updateFields).length === 0) {
      return new Response(JSON.stringify({ status: false, message: "No fields provided to update" }), {
        headers: corsHeaders,
      });
    }

    const { error } = await supabase
      .from("lab_test_orders")
      .update(updateFields)
      .eq("id", order_id);

    if (error) throw error;

    return new Response(
      JSON.stringify({ status: true, message: "Order updated successfully" }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(JSON.stringify({ status: false, message: err.message }), {
      headers: corsHeaders,
    });
  }
}
