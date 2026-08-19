import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Helper to retry transient fetch errors
async function withRetry(operation, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (err) {
      if (i === retries - 1 || !err.message?.includes('fetch failed')) throw err;
      await new Promise(res => setTimeout(res, 500 * (i + 1))); // exponential backoff
    }
  }
}

export async function POST(req) {
  try {
    const { patient_id, date_filter = "all", page = 1 } = await req.json();

    if (!patient_id) {
      return failure("patient_id is required.", null, 400, { headers: corsHeaders });
    }

    let caller = await resolveCallerFromRequest(req);
    if (!caller && patient_id) {
      const { data: fallbackUser } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", patient_id)
        .maybeSingle();
      if (fallbackUser) caller = fallbackUser;
    }

    if (!caller) {
      return failure("Unauthorized - missing or invalid token.", null, 401, { headers: corsHeaders });
    }
    if (caller.id !== patient_id && caller.role !== "admin") {
      return failure("Forbidden - you do not have permission to view these appointments.", null, 403, { headers: corsHeaders });
    }

    // Verify user role
    const { data: patientUser, error: userErr } = await withRetry(() => 
      supabase.from("users").select("id, role").eq("id", patient_id).single()
    );

    if (userErr || !patientUser) {
      return failure("Invalid patient_id. User not found.", null, 400, { headers: corsHeaders });
    }

    if (patientUser.role !== "patient") {
      return failure("Invalid patient_id or user is not a patient.", null, 400, { headers: corsHeaders });
    }

    const perPage = 50;
    const offset = (page - 1) * perPage;
    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("appointments")
      .select("*", { count: "exact" })
      .eq("patient_id", patient_id)
      .order("appointment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (date_filter === "today") query = query.eq("appointment_date", today);
    else if (date_filter !== "all") query = query.eq("appointment_date", date_filter);

    query = query.range(offset, offset + perPage - 1);

    const { data: appointments, error, count } = await withRetry(() => query);
    if (error) {
      console.error("[PATIENT-APPOINTMENT] DB error querying appointments:", error);
      throw error;
    }

    if (!appointments.length) {
      return success("No appointments found.", { appointments: [], pagination: {} }, 200, { headers: corsHeaders });
    }

    // Fetch doctor details
    const doctorIds = appointments.map((a) => a.doctor_id);

    const { data: doctors, error: dErr } = await supabase
      .from("doctor_details")
      .select("id, full_name, email, specialization, clinic_name, clinic_address, license_number, qualification, consultation_fee, meta")
      .in("id", doctorIds);

    if (dErr) {
      console.error("[PATIENT-APPOINTMENT] DB error fetching doctor details:", dErr);
      throw dErr;
    }

    // Fetch patient details
    const { data: patientDetails, error: pErr } = await supabase
      .from("patient_details")
      .select("id, full_name, gender, date_of_birth, address")
      .eq("id", patient_id)
      .single();

    if (pErr && pErr.code !== 'PGRST116') {
      console.error("[PATIENT-APPOINTMENT] DB error fetching patient details:", pErr);
      // Don't throw, we can still return appointments without patient details if they failed
    }

    // Merge
    const merged = appointments.map((a) => ({
      ...a,
      doctor: doctors.find((d) => d.id === a.doctor_id) || null,
      patient: patientDetails || null,
    }));

    return success(
      "Patient appointments fetched successfully.",
      {
        appointments: merged,
        pagination: {
          total: count,
          perPage,
          currentPage: page,
          totalPages: Math.ceil((count || 0) / perPage),
        },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[PATIENT-APPOINTMENT] Catch block error:", error);
    return failure("Failed to fetch patient appointments.", error.message, 500, { headers: corsHeaders });
  }
}
