import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, status } = await req.json();

    if (!order_id || !status) {
      return failure("order_id & status required", null, 400, { headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from("medicine_orders")
      .update({ status })
      .eq("id", order_id)
      .select()
      .single();

    if (error) throw error;

    return success("Order status updated", data, 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Failed updating status", err.message, 500, { headers: corsHeaders });
  }
}
