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
    const order_id = searchParams.get("order_id");

    if (!patient_id && !order_id) {
      return failure("patient_id or order_id required", null, 400, { headers: corsHeaders });
    }

    let query = supabase
      .from("medicine_orders")
      .select("*, medicine_order_items(*), chemist_details:chemist_id(pharmacy_name, address, upi_id:payment_qr_payload, payment_qr_url)");

    if (patient_id) {
      query = query.eq("patient_id", patient_id);
    }
    if (order_id) {
      query = query.eq("id", order_id);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return success("Orders fetched", data, 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Error fetching orders", err.message, 500, { headers: corsHeaders });
  }
}
