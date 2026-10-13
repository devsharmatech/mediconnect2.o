import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id } = body;

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    // 1. Fetch appointments for this doctor from AWS RDS PostgreSQL
    const appointments = await sql`
      SELECT id, patient_id, appointment_date, appointment_time, status, created_at
      FROM appointments
      WHERE doctor_id = ${doctor_id}::uuid
        AND status NOT IN ('cancelled', 'rejected')
      ORDER BY appointment_date DESC
    `;

    if (!appointments || appointments.length === 0) {
      return success("No patients found", [], 200);
    }

    // 2. Extract unique patient IDs
    const patientIds = [...new Set(appointments.map(a => a.patient_id).filter(Boolean))];
    if (patientIds.length === 0) {
      return success("No patients found", [], 200);
    }

    // 3. Fetch Patient Details and user phone numbers from AWS RDS
    const [patientRows, userRows] = await Promise.all([
      sql`
        SELECT id, full_name, email, gender, date_of_birth, blood_group
        FROM patient_details
        WHERE id = ANY(${patientIds}::uuid[])
      `,
      sql`
        SELECT id, phone_number
        FROM users
        WHERE id = ANY(${patientIds}::uuid[])
      `
    ]);

    const patientLookup = new Map();
    patientRows.forEach(p => patientLookup.set(p.id, p));

    const userLookup = new Map();
    userRows.forEach(u => userLookup.set(u.id, u));

    // 4. Group by patient
    const patientMap = {};
    
    appointments.forEach(apt => {
      const patId = apt.patient_id;
      if (!patId) return;

      if (!patientMap[patId]) {
        const pInfo = patientLookup.get(patId) || {};
        const uInfo = userLookup.get(patId) || {};

        let calculatedAge = null;
        if (pInfo.date_of_birth) {
          const birthDate = new Date(pInfo.date_of_birth);
          if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            if (age >= 0) calculatedAge = age;
          }
        }

        patientMap[patId] = {
          id: patId,
          full_name: pInfo.full_name || "Unknown Patient",
          email: pInfo.email || "",
          phone: uInfo.phone_number || "",
          gender: pInfo.gender || "Unknown",
          date_of_birth: pInfo.date_of_birth || "",
          age: calculatedAge,
          blood_group: pInfo.blood_group || "",
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
