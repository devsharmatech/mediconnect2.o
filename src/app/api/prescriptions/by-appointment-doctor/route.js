import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// POST: fetch latest prescription for a doctor by appointment
export async function POST(req) {
  try {
    const body = await req.json();
    const { appointment_id, doctor_id } = body || {};

    if (!appointment_id || !doctor_id) {
      return failure("appointment_id and doctor_id are required", null, 400, {
        headers: corsHeaders,
      });
    }

    const { data: prescription, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("appointment_id", appointment_id)
      .eq("doctor_id", doctor_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Get prescription by appointment error:", error);
      return failure("Failed to fetch prescription", error.message, 500, {
        headers: corsHeaders,
      });
    }

    if (!prescription) {
      return success("No prescription found", { prescription: null }, 200, {
        headers: corsHeaders,
      });
    }

    return success("Prescription fetched successfully", { prescription }, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Get prescription by appointment error:", err);
    return failure("Failed to fetch prescription", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
