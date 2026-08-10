import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const doctor_id = searchParams.get("doctor_id");
    const patient_id = searchParams.get("patient_id");
    const appointment_id = searchParams.get("appointment_id");

    /* -------------------------------------------------
       BASIC VALIDATION
    -------------------------------------------------- */
    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, {
        headers: corsHeaders
      });
    }

    /* -------------------------------------------------
       VALIDATE DOCTOR
    -------------------------------------------------- */
    const { data: doctor } = await supabase
      .from("doctor_details")
      .select("id, onboarding_status")
      .eq("id", doctor_id)
      .maybeSingle();

    if (!doctor) {
      return failure("Invalid doctor_id", null, 404, {
        headers: corsHeaders
      });
    }

    if (["pending", "rejected"].includes(doctor.onboarding_status)) {
      return failure("Doctor account is inactive", null, 403, {
        headers: corsHeaders
      });
    }

    /* -------------------------------------------------
       BUILD QUERY (FIXED JOINS)
    -------------------------------------------------- */
    let query = supabase
      .from("prescriptions")
      .select(`
        *,
        doctor:doctor_id (
          id,
          full_name,
          specialization,
          clinic_name,
          signature_url
        ),
        patient:patient_id (
          id,
          full_name,
          gender,
          date_of_birth,
          user:users (
            phone_number
          )
        ),
        appointment:appointment_id (
          id,
          appointment_date,
          appointment_time,
          appointment_type,
          status
        )
      `)
      .eq("doctor_id", doctor_id)
      .order("created_at", { ascending: false });

    if (patient_id) {
      query = query.eq("patient_id", patient_id);
    }

    if (appointment_id) {
      query = query.eq("appointment_id", appointment_id);
    }

    /* -------------------------------------------------
       EXECUTE QUERY
    -------------------------------------------------- */
    const { data: prescriptions, error } = await query;

    if (error) throw error;

    // Normalize patient phone_number (optional but clean)
    const normalized = (prescriptions || []).map(p => ({
      ...p,
      patient: p.patient
        ? {
            ...p.patient,
            phone_number: p.patient.user?.phone_number || null,
            user: undefined
          }
        : null
    }));

    return success(
      "Prescriptions fetched successfully",
      { prescriptions: normalized },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Get prescriptions error:", err);
    return failure(
      "Failed to fetch prescriptions",
      err.message,
      500,
      { headers: corsHeaders }
    );
  }
}
