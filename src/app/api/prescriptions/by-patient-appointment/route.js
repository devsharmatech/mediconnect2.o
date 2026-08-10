import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { patient_id, appointment_id } = body || {};

    if (!patient_id || !appointment_id) {
      return failure("patient_id and appointment_id are required", null, 400, {
        headers: corsHeaders,
      });
    }

    const caller = await resolveCallerFromRequest(req);
    if (!caller) {
      return failure("Unauthorized - missing or invalid token.", null, 401, { headers: corsHeaders });
    }
    if (caller.id !== patient_id && caller.role !== "admin") {
      return failure("Forbidden - you do not have permission to view these prescriptions.", null, 403, { headers: corsHeaders });
    }

    // 1. Fetch the appointment to get its care_episode_id
    const { data: appt, error: apptError } = await supabase
      .from("appointments")
      .select("id, care_episode_id")
      .eq("id", appointment_id)
      .maybeSingle();

    if (apptError) throw apptError;
    if (!appt) {
      return failure("Appointment not found", null, 404, { headers: corsHeaders });
    }

    // 2. Fetch all appointments in the care episode
    let allApptIds = [appt.id];
    if (appt.care_episode_id) {
      const { data: episodeAppts } = await supabase
        .from("appointments")
        .select("id")
        .eq("care_episode_id", appt.care_episode_id);
      if (episodeAppts && episodeAppts.length > 0) {
        allApptIds = episodeAppts.map(a => a.id);
      }
    }

    // 3. Fetch prescription matching any of those appointment IDs
    const { data: prescription, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patient_id)
      .in("appointment_id", allApptIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!prescription) {
      return failure("No prescription found for this episode of care.", null, 404, {
        headers: corsHeaders,
      });
    }

    // Fetch related info
    const [doctorRes, patientRes, appointmentRes, doctorUserRes, patientUserRes] = await Promise.all([
      supabase.from("doctor_details").select("*").eq("id", prescription.doctor_id).maybeSingle(),
      supabase.from("patient_details").select("*").eq("id", prescription.patient_id).maybeSingle(),
      supabase.from("appointments").select("*").eq("id", prescription.appointment_id).maybeSingle(),
      supabase.from("users").select("un_id").eq("id", prescription.doctor_id).maybeSingle(),
      supabase.from("users").select("un_id").eq("id", prescription.patient_id).maybeSingle(),
    ]);

    if (doctorRes.error) throw doctorRes.error;
    if (patientRes.error) throw patientRes.error;
    if (appointmentRes.error) throw appointmentRes.error;

    const response = {
      ...prescription,
      doctor_details: { ...(doctorRes.data || {}), un_id: doctorUserRes.data?.un_id || null },
      patient_details: { ...(patientRes.data || {}), un_id: patientUserRes.data?.un_id || null },
      appointments: appointmentRes.data || {},
    };

    return success("Prescription fetched successfully.", response, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Get prescription by patient+appointment error:", error);
    return failure("Failed to fetch prescription.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
