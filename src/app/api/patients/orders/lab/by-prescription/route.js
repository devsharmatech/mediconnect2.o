import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { prescription_id, patient_id } = await req.json();

    if (!prescription_id || !patient_id) {
      return failure("prescription_id & patient_id are required", null, 400, {
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase
      .from("lab_test_orders")
      .select("*, lab_test_order_items(*)")
      .eq("prescription_id", prescription_id)
      .eq("patient_id", patient_id);

    if (error) throw error;

    return success("Lab orders fetched successfully", data, 200, {
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("Fetch lab orders error:", err);
    return failure("Failed to fetch lab orders.", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
