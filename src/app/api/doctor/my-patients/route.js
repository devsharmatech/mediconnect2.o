import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id } = body;

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    // 1. Fetch appointments for this doctor
    const { data: appointments, error: aptError } = await supabase
      .from("appointments")
      .select("id, patient_id, appointment_date, appointment_time, status, created_at")
      .eq("doctor_id", doctor_id)
      .neq("status", "cancelled")
      .neq("status", "rejected")
      .order("appointment_date", { ascending: false });

    if (aptError) {
      console.error("[Doctor Patients API] DB Error:", aptError);
      return failure("Failed to fetch appointments", aptError.message, 500);
    }

    if (!appointments || appointments.length === 0) {
      return success("No patients found", [], 200);
    }

    // 2. Extract unique patient IDs
    const patientIds = [...new Set(appointments.map(a => a.patient_id).filter(Boolean))];

    // 3. Fetch Patient Details
    const [patientsRes, usersRes] = await Promise.all([
      supabase.from("patient_details").select("id, full_name, email, gender, date_of_birth, blood_group").in("id", patientIds),
      supabase.from("users").select("id, phone_number").in("id", patientIds)
    ]);

    const patients = patientsRes.data || [];
    const users = usersRes.data || [];

    // 4. Group by patient
    const patientMap = {};
    
    appointments.forEach(apt => {
      const patId = apt.patient_id;
      if (!patId) return;

      if (!patientMap[patId]) {
        const pInfo = patients.find(p => p.id === patId);
        const uInfo = users.find(u => u.id === patId);
        patientMap[patId] = {
          id: patId,
          full_name: pInfo?.full_name || "Unknown Patient",
          email: pInfo?.email || "",
          phone: uInfo?.phone_number || "",
          gender: pInfo?.gender || "Unknown",
          date_of_birth: pInfo?.date_of_birth || "",
          blood_group: pInfo?.blood_group || "",
          visit_count: 0,
          last_visit_date: apt.appointment_date,
          last_visit_time: apt.appointment_time,
          status: apt.status
        };
      }
      patientMap[patId].visit_count++;
    });

    // 5. Convert to array and sort by most visits
    const result = Object.values(patientMap).sort((a, b) => b.visit_count - a.visit_count);

    return success("Patients fetched successfully", result, 200);
  } catch (err) {
    console.error("[Doctor Patients API] Exception:", err);
    return failure("Internal Server Error", err.message, 500);
  }
}
