import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// POST: fetch latest prescription for a doctor by appointment
export async function POST(req) {
  try {
    const body = await req.json();
    const { appointment_id, doctor_id } = body || {};

    if (!appointment_id || !doctor_id) {
      return failure("appointment_id and doctor_id are required", null, 400, {
        headers: corsHeaders,
      });
    }

    const rows = await sql`
      SELECT 
        p.*,
        a.care_episode_id,
        ce.episode_id AS care_episode_code,
        ce.status AS care_episode_status
      FROM prescriptions p
      LEFT JOIN appointments a ON a.id = p.appointment_id
      LEFT JOIN care_episodes ce ON ce.id = a.care_episode_id
      WHERE p.appointment_id = ${appointment_id}
        AND p.doctor_id = ${doctor_id}
      ORDER BY p.created_at DESC
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return success("No prescription found", { prescription: null }, 200, {
        headers: corsHeaders,
      });
    }

    const prescription = rows[0];
    const generatedEpisodeCode = prescription.care_episode_code || (prescription.care_episode_id ? `EP-${String(prescription.care_episode_id).slice(0, 8).toUpperCase()}` : null);
    prescription.episode_id = generatedEpisodeCode;

    return success("Prescription fetched successfully", { prescription }, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Get prescription by appointment error:", err);
    return failure("Failed to fetch prescription", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
