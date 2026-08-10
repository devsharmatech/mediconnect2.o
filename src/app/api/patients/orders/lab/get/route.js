import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const patient_id = searchParams.get("patient_id");

    if (!patient_id) {
      return failure("patient_id required", null, 400, { headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from("lab_test_orders")
      .select("*, lab_test_order_items(*)")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return success("Orders fetched", data, 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Error fetching orders", err.message, 500, { headers: corsHeaders });
  }
}
