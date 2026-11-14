import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";
import { parseFamilyMember } from "@/lib/familyMemberHelper";

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

    const caller = await resolveCallerFromRequest(req, patient_id);
    if (!caller) {
      return failure("Unauthorized - missing or invalid token.", null, 401, { headers: corsHeaders });
    }
    if (caller.id !== patient_id && caller.role !== "admin") {
      return failure("Forbidden - you do not have permission to view these prescriptions.", null, 403, { headers: corsHeaders });
    }

    // 1. Fetch appointment to get its care_episode_id
    const apptRows = await sql`
      SELECT id, care_episode_id FROM appointments WHERE id = ${appointment_id} LIMIT 1
    `;

    if (!apptRows || apptRows.length === 0) {
      return failure("Appointment not found", null, 404, { headers: corsHeaders });
    }
    const appt = apptRows[0];

    // 2. Fetch all appointments in the care episode
    let allApptIds = [appt.id];
    if (appt.care_episode_id) {
      const epAppts = await sql`
        SELECT id FROM appointments WHERE care_episode_id = ${appt.care_episode_id}
      `;
      if (epAppts && epAppts.length > 0) {
        allApptIds = epAppts.map((a) => a.id);
      }
    }

    // 3. Fetch prescription matching any of those appointment IDs
    const prescRows = await sql`
      SELECT 
        p.*,
        a.care_episode_id,
        ce.episode_id AS care_episode_code
      FROM prescriptions p
      LEFT JOIN appointments a ON a.id = p.appointment_id
      LEFT JOIN care_episodes ce ON ce.id = a.care_episode_id
      WHERE p.patient_id = ${patient_id}
        AND p.appointment_id = ANY(${allApptIds})
      ORDER BY p.created_at DESC
      LIMIT 1
    `;

    if (!prescRows || prescRows.length === 0) {
      return failure("No prescription found for this episode of care.", null, 404, {
        headers: corsHeaders,
      });
    }

    const prescription = prescRows[0];

    // Fetch related info
    const [docRows, patRows, fullApptRows, docUserRows, patUserRows] = await Promise.all([
      sql`SELECT * FROM doctor_details WHERE id = ${prescription.doctor_id} LIMIT 1`,
      sql`SELECT * FROM patient_details WHERE id = ${prescription.patient_id} LIMIT 1`,
      sql`SELECT * FROM appointments WHERE id = ${prescription.appointment_id} LIMIT 1`,
      sql`SELECT un_id FROM users WHERE id = ${prescription.doctor_id} LIMIT 1`,
      sql`SELECT un_id FROM users WHERE id = ${prescription.patient_id} LIMIT 1`,
    ]);

    const patDetails = patRows[0] || {};
    const apptDetails = fullApptRows[0] || {};
    const fam = parseFamilyMember(apptDetails.family_member_details, apptDetails.disease_info) || 
      parseFamilyMember(prescription.template_data?.family_member, null);
    const isFamily = (apptDetails.booked_for === "family_member") || Boolean(fam);

    const careEpisodeCode = prescription.care_episode_code || 
      (prescription.care_episode_id ? `EP-${String(prescription.care_episode_id).slice(0, 8).toUpperCase()}` : (appt.care_episode_id ? `EP-${String(appt.care_episode_id).slice(0, 8).toUpperCase()}` : null));

    const enrichedPatient = {
      ...patDetails,
      full_name: (isFamily && (fam?.name || fam?.full_name)) ? (fam.name || fam.full_name) : patDetails.full_name,
      gender: isFamily && fam?.gender ? fam.gender : patDetails.gender,
      date_of_birth: isFamily && fam?.dob ? fam.dob : patDetails.date_of_birth,
      blood_group: isFamily && fam?.blood_group ? fam.blood_group : patDetails.blood_group,
      age: isFamily && fam?.age_str ? fam.age_str : (isFamily && fam?.age ? `${fam.age} yrs` : patDetails.age),
      relation: isFamily && fam?.relation ? fam.relation : null,
      profile_picture: isFamily && fam?.profile_picture ? fam.profile_picture : null,
      primary_patient_name: patDetails.full_name,
      un_id: patUserRows[0]?.un_id || null,
      family_member: isFamily ? fam : null,
    };

    const response = {
      ...prescription,
      booked_for: isFamily ? "family_member" : "self",
      family_member: fam,
      doctor_details: { ...(docRows[0] || {}), un_id: docUserRows[0]?.un_id || null },
      patient_details: enrichedPatient,
      appointments: {
        ...apptDetails,
        booked_for: isFamily ? "family_member" : "self",
        family_member: fam,
      },
      care_episode_id: prescription.care_episode_id || appt.care_episode_id,
      episode_id: careEpisodeCode,
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
