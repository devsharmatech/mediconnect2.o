import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id } = body || {};

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    // Fetch all active prescriptions for this doctor (excluding archived/deleted)
    const { data: prescriptions, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("doctor_id", doctor_id)
      .neq("status", "archived")
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!prescriptions?.length) {
      return success("No prescriptions found for this doctor.", [], 200, {
        headers: corsHeaders,
      });
    }

    // Fetch doctor info
    const { data: doctor, error: doctorErr } = await supabase
      .from("doctor_details")
      .select("id, full_name, email, specialization, qualification, clinic_name, clinic_address")
      .eq("id", doctor_id)
      .maybeSingle();

    if (doctorErr) throw doctorErr;

    // Attach patient & appointment details for each
    const response = await Promise.all(
      prescriptions.map(async (p) => {
        const { data: patient } = await supabase
          .from("patient_details")
          .select("id, full_name, email, gender, blood_group, date_of_birth")
          .eq("id", p.patient_id)
          .maybeSingle();

        const { data: appointment } = await supabase
          .from("appointments")
          .select("id, appointment_date, appointment_time, status, disease_info, appointment_type")
          .eq("id", p.appointment_id)
          .maybeSingle();

        return {
          ...p,
          doctor_details: doctor || {},
          patient_details: patient || {},
          appointments: appointment || {},
        };
      })
    );

    return success("Prescriptions fetched successfully.", response, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Get prescriptions by doctor error:", error);
    return failure("Failed to fetch prescriptions.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
