import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req) {
  try {
    // 1. Fetch all non-cancelled appointments
    const { data: appointments, error: aptError } = await supabase
      .from("appointments")
      .select("id, patient_id, doctor_id, appointment_date, appointment_time, status, created_at")
      .neq("status", "cancelled")
      .neq("status", "rejected")
      .order("appointment_date", { ascending: false });

    if (aptError) {
      console.error("[Admin Visits API] DB Error:", aptError);
      return failure("Failed to fetch appointments", aptError.message, 500);
    }

    if (!appointments || appointments.length === 0) {
      return success("No visits found", [], 200);
    }

    // 2. Extract unique doctor IDs and patient IDs
    const doctorIds = [...new Set(appointments.map(a => a.doctor_id).filter(Boolean))];
    const patientIds = [...new Set(appointments.map(a => a.patient_id).filter(Boolean))];

    // 3. Fetch Doctor & Patient Details
    const [doctorsRes, patientsRes, usersRes] = await Promise.all([
      supabase.from("doctor_details").select("id, full_name, specialization").in("id", doctorIds),
      supabase.from("patient_details").select("id, full_name, email, gender").in("id", patientIds),
      supabase.from("users").select("id, phone_number").in("id", patientIds)
    ]);

    const doctors = doctorsRes.data || [];
    const patients = patientsRes.data || [];
    const users = usersRes.data || [];

    // 4. Group data by Doctor
    const doctorMap = {};
    doctors.forEach(d => {
      doctorMap[d.id] = {
        doctor: { id: d.id, name: d.full_name, specialization: d.specialization },
        total_visits: 0,
        unique_patients_count: 0,
        patients: {} // patient_id -> { info, visit_count, last_visit }
      };
    });

    appointments.forEach(apt => {
      const docId = apt.doctor_id;
      const patId = apt.patient_id;
      
      if (!docId || !patId || !doctorMap[docId]) return;

      const docGroup = doctorMap[docId];
      docGroup.total_visits++;

      if (!docGroup.patients[patId]) {
        const pInfo = patients.find(p => p.id === patId);
        const uInfo = users.find(u => u.id === patId);
        docGroup.patients[patId] = {
          patient: {
            id: patId,
            full_name: pInfo?.full_name || "Unknown Patient",
            email: pInfo?.email || "",
            phone: uInfo?.phone_number || "",
            gender: pInfo?.gender || "Unknown"
          },
          visit_count: 0,
          last_visit_date: apt.appointment_date,
          last_visit_time: apt.appointment_time,
          status: apt.status
        };
        docGroup.unique_patients_count++;
      }

      docGroup.patients[patId].visit_count++;
      // Since it's ordered by descending date, the first one encountered is the latest
    });

    // 5. Convert to array and format
    const result = Object.values(doctorMap).map(d => ({
      ...d,
      patients: Object.values(d.patients).sort((a, b) => b.visit_count - a.visit_count)
    })).sort((a, b) => b.total_visits - a.total_visits);

    return success("Patient visits aggregated successfully", result, 200);
  } catch (err) {
    console.error("[Admin Visits API] Exception:", err);
    return failure("Internal Server Error", err.message, 500);
  }
}
