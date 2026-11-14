import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { parseFamilyMember } from "@/lib/familyMemberHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// POST: fetch latest prescription for a doctor by appointment
export async function POST(req) {
  try {
    const body = await req.json();
    const { appointment_id, doctor_id } = body || {};

    if (!appointment_id) {
      return failure("appointment_id is required", null, 400, {
        headers: corsHeaders,
      });
    }

    let docCondition = sql``;
    if (doctor_id) {
      docCondition = sql`AND p.doctor_id = ${doctor_id}`;
    }

    let rows = await sql`
      SELECT 
        p.*,
        a.care_episode_id,
        ce.episode_id AS care_episode_code,
        ce.status AS care_episode_status
      FROM prescriptions p
      LEFT JOIN appointments a ON a.id = p.appointment_id
      LEFT JOIN care_episodes ce ON ce.id = a.care_episode_id
      WHERE p.appointment_id = ${appointment_id}
        ${docCondition}
      ORDER BY p.created_at DESC
      LIMIT 1
    `;

    // Fallback: If not found with doctor_id filter, find by appointment_id directly
    if ((!rows || rows.length === 0) && doctor_id) {
      rows = await sql`
        SELECT 
          p.*,
          a.care_episode_id,
          ce.episode_id AS care_episode_code,
          ce.status AS care_episode_status
        FROM prescriptions p
        LEFT JOIN appointments a ON a.id = p.appointment_id
        LEFT JOIN care_episodes ce ON ce.id = a.care_episode_id
        WHERE p.appointment_id = ${appointment_id}
        ORDER BY p.created_at DESC
        LIMIT 1
      `;
    }

    if (!rows || rows.length === 0) {
      return success("No prescription found", { prescription: null }, 200, {
        headers: corsHeaders,
      });
    }

    const prescription = rows[0];

    // Fetch related details for official A4 medical prescription letterhead
    const [docRows, patRows, fullApptRows, docUserRows, patUserRows] = await Promise.all([
      prescription.doctor_id ? sql`SELECT * FROM doctor_details WHERE id = ${prescription.doctor_id} LIMIT 1` : Promise.resolve([]),
      prescription.patient_id ? sql`SELECT * FROM patient_details WHERE id = ${prescription.patient_id} LIMIT 1` : Promise.resolve([]),
      sql`SELECT * FROM appointments WHERE id = ${prescription.appointment_id} LIMIT 1`,
      prescription.doctor_id ? sql`SELECT un_id FROM users WHERE id = ${prescription.doctor_id} LIMIT 1` : Promise.resolve([]),
      prescription.patient_id ? sql`SELECT un_id FROM users WHERE id = ${prescription.patient_id} LIMIT 1` : Promise.resolve([]),
    ]);

    const patDetails = patRows[0] || {};
    const apptDetails = fullApptRows[0] || {};
    const fam = parseFamilyMember(apptDetails.family_member_details, apptDetails.disease_info) || 
      parseFamilyMember(prescription.template_data?.family_member, null);
    const isFamily = (apptDetails.booked_for === "family_member") || Boolean(fam);

    const generatedEpisodeCode = prescription.care_episode_code || 
      (prescription.care_episode_id ? `EP-${String(prescription.care_episode_id).slice(0, 8).toUpperCase()}` : null);

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

    const fullPrescription = {
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
      episode_id: generatedEpisodeCode,
    };

    return success("Prescription fetched successfully", { prescription: fullPrescription }, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Get prescription by appointment error:", err);
    return failure("Failed to fetch prescription", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
