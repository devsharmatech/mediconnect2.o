import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id } = body;

    if (!doctor_id) {
      return failure("Doctor ID is required", null, 400, { headers: corsHeaders });
    }

    // Try fetching with patient relation, fallback to simple fetch if it fails
    let { data, error } = await supabase
      .from("booking_attempts")
      .select(`
        *,
        patient:patient_id (
          id,
          full_name,
          phone,
          email
        )
      `)
      .eq("doctor_id", doctor_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[Doctor Attempts API] DB Error with relation, falling back:", error);
      const fallback = await supabase
        .from("booking_attempts")
        .select("*")
        .eq("doctor_id", doctor_id)
        .order("created_at", { ascending: false });
        
      if (fallback.error) {
        console.error("[Doctor Attempts API] Fallback DB Error:", fallback.error);
        return success("Booking attempts empty due to DB error", [], 200, { headers: corsHeaders });
      }
      data = fallback.data;
    }

    return success("Booking attempts fetched successfully", data || [], 200, { headers: corsHeaders });
  } catch (err) {
    console.error("[Doctor Attempts API] Exception:", err);
    return failure("Internal Server Error", err.message, 500, { headers: corsHeaders });
  }
}
