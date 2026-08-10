import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function POST(req) {
  const { order_id, user_id } = await req.json();

  const { data, error } = await supabase
    .from("medicine_order_invoices")
    .select("*")
    .eq("order_id", order_id)
    .single();

  if (error) {
    return failure("Invoice not found", null, 404, { headers: corsHeaders });
  }

  return success("Invoice fetched", data, 200, { headers: corsHeaders });
}
