import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const doctorId = url.searchParams.get("doctor_id") || null;
    const startDate = url.searchParams.get("start_date") || null;
    const endDate = url.searchParams.get("end_date") || null;
    const search = url.searchParams.get("search") || null;
    const id = url.searchParams.get("id") || null;

    if (id) {
      const { data: prescription, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!prescription)
        return failure("Prescription not found", null, 404, {
          headers: corsHeaders,
        });

      const [doctorRes, patientRes, appointmentRes, userRes] = await Promise.all([
        supabase
          .from("doctor_details")
          .select("id, full_name, email, specialization")
          .eq("id", prescription.doctor_id)
          .maybeSingle(),
        supabase
          .from("patient_details")
          .select("id, full_name, gender, date_of_birth, blood_group, email, address, emergency_contact")
          .eq("id", prescription.patient_id)
          .maybeSingle(),
        supabase
          .from("appointments")
          .select("id, appointment_date, appointment_time, status")
          .eq("id", prescription.appointment_id)
          .maybeSingle(),
        prescription.patient_id
          ? supabase
              .from("users")
              .select("phone_number")
              .eq("id", prescription.patient_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      // Compute age from date_of_birth
      let patientData = patientRes.data ? { ...patientRes.data } : null;
      if (patientData?.date_of_birth) {
        const dob = new Date(patientData.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        patientData.age = age;
      }
      if (userRes.data?.phone_number) {
        if (patientData) patientData.phone = userRes.data.phone_number;
      }

      const result = {
        ...prescription,
        doctor: doctorRes.data || null,
        patient: patientData,
        appointment: appointmentRes.data || null,
      };

      return success("Prescription details fetched successfully", result, 200, {
        headers: corsHeaders,
      });
    }

    let query = supabase.from("prescriptions").select("*", { count: "exact" });

    if (doctorId) query = query.eq("doctor_id", doctorId);
    if (search)
      query = query.or(
        `notes.ilike.%${search}%,diagnosis.ilike.%${search}%,id.ilike.%${search}%`
      );

    if (startDate && endDate) {
      const start = new Date(startDate).toISOString();
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.gte("created_at", start).lte("created_at", end.toISOString());
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Enrich list items with patient and doctor names
    const enriched = await Promise.all(
      (data || []).map(async (rx) => {
        const [patientRes, doctorRes, userPhoneRes] = await Promise.all([
          rx.patient_id
            ? supabase
                .from("patient_details")
                .select("full_name, gender, date_of_birth")
                .eq("id", rx.patient_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          rx.doctor_id
            ? supabase
                .from("doctor_details")
                .select("full_name, specialization")
                .eq("id", rx.doctor_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          rx.patient_id
            ? supabase
                .from("users")
                .select("phone_number")
                .eq("id", rx.patient_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        const patientInfo = patientRes.data ? { ...patientRes.data } : null;
        if (patientInfo && userPhoneRes.data?.phone_number) {
          patientInfo.phone = userPhoneRes.data.phone_number;
        }
        return {
          ...rx,
          patient: patientInfo,
          doctor: doctorRes.data || null,
        };
      })
    );

    const response = {
      items: enriched,
      page,
      limit,
      total: count || 0,
    };

    return success("Prescriptions fetched successfully", response, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("GET /prescriptions error:", error);
    return failure("Failed to fetch prescriptions.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
