import sql from "@/lib/db";
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
    const prescriptions = await sql`
      SELECT 
        p.*,
        a.care_episode_id,
        ce.episode_id AS care_episode_code
      FROM prescriptions p
      LEFT JOIN appointments a ON a.id = p.appointment_id
      LEFT JOIN care_episodes ce ON ce.id = a.care_episode_id
      WHERE p.doctor_id = ${doctor_id}::uuid
        AND (p.status IS NULL OR (p.status != 'archived' AND p.status != 'deleted'))
      ORDER BY p.created_at DESC
    `;

    if (!prescriptions || prescriptions.length === 0) {
      return success("No prescriptions found for this doctor.", [], 200, {
        headers: corsHeaders,
      });
    }

    // Fetch doctor info once with users un_id
    const docRows = await sql`
      SELECT d.*, u.un_id 
      FROM doctor_details d
      LEFT JOIN users u ON u.id = d.id
      WHERE d.id = ${doctor_id}::uuid
      LIMIT 1
    `;
    const doctorDetails = docRows[0] || {};

    // Collect patient IDs and appointment IDs
    const patientIds = [...new Set(prescriptions.map(p => p.patient_id).filter(Boolean))];
    const appointmentIds = [...new Set(prescriptions.map(p => p.appointment_id).filter(Boolean))];

    // Bulk fetch patients and appointments
    const [patientRows, apptRows] = await Promise.all([
      patientIds.length > 0 
        ? sql`
            SELECT p.*, u.un_id 
            FROM patient_details p 
            LEFT JOIN users u ON u.id = p.id 
            WHERE p.id = ANY(${patientIds}::uuid[])
          `
        : [],
      appointmentIds.length > 0
        ? sql`
            SELECT * FROM appointments 
            WHERE id = ANY(${appointmentIds}::uuid[])
          `
        : []
    ]);

    const patientMap = new Map();
    patientRows.forEach(p => patientMap.set(p.id, p));

    const apptMap = new Map();
    apptRows.forEach(a => apptMap.set(a.id, a));

    const response = prescriptions.map((p) => {
      const pat = patientMap.get(p.patient_id) || {};
      const appt = apptMap.get(p.appointment_id) || {};
      const careEpisodeCode = p.care_episode_code || 
        (p.care_episode_id ? `EP-${String(p.care_episode_id).slice(0, 8).toUpperCase()}` : (appt.care_episode_id ? `EP-${String(appt.care_episode_id).slice(0, 8).toUpperCase()}` : null));

      return {
        ...p,
        doctor_details: doctorDetails,
        patient_details: pat,
        appointments: appt,
        episode_id: careEpisodeCode,
      };
    });

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
