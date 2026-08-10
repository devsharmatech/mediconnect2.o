import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      appointment_id,
      doctor_id,
      patient_id,
      medicines,
      lab_tests,
      special_message,
      investigations,
      ai_analysis,
    } = body || {};

    if (!doctor_id || !patient_id || !appointment_id) {
      return failure("appointment_id, doctor_id, and patient_id are required", null, 400, {
        headers: corsHeaders,
      });
    }

    const { data: existing, error: existingError } = await supabase
      .from("prescriptions")
      .select("id")
      .eq("appointment_id", appointment_id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return failure(
        "A prescription already exists for this appointment.",
        null,
        400,
        { headers: corsHeaders }
      );
    }

    // ✅ Insert new prescription
    const { data, error } = await supabase
      .from("prescriptions")
      .insert([
        {
          appointment_id,
          doctor_id,
          patient_id,
          medicines,
          lab_tests,
          special_message,
          investigations,
          ai_analysis,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return success("Prescription created successfully.", data, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Create prescription error:", error);
    return failure("Failed to create prescription.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
