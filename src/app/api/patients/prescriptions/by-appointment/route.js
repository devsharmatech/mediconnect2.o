import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const appointment_id = searchParams.get("appointment_id");

    if (!appointment_id) {
      return failure("appointment_id is required", null, 400, { headers: corsHeaders });
    }

    const { data: prescription, error } = await supabase
      .from("prescriptions")
      .select("*, doctor_details(full_name)")
      .eq("appointment_id", appointment_id)
      .maybeSingle();

    if (error) throw error;

    if (!prescription) {
      return failure("Prescription not found", null, 404, { headers: corsHeaders });
    }

    return success("Prescription fetched", prescription, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error fetching prescription by appointment:", err);
    return failure("Failed to fetch prescription", err.message, 500, { headers: corsHeaders });
  }
}
