import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, status, lab_notes } = await req.json();

    if (!order_id || !status) {
      return failure("order_id & status required", null, 400, {
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase
      .from("lab_test_orders")
      .update({ status, lab_notes })
      .eq("id", order_id)
      .select()
      .single();

    if (error) throw error;

    return success("Lab order status updated", data, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Update lab order status error:", err);
    return failure("Failed to update status", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
