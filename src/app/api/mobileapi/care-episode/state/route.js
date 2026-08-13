import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * Mobile Authoritative Care Episode State Endpoint (J03 - J30)
 * Returns authoritative backend state for a given CareEpisode to allow mobile app to resume cleanly.
 */
export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (!caller) {
      return Response.json(
        { success: false, message: "Unauthorized token." },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(req.url);
    const careEpisodeId = searchParams.get("care_episode_id");

    if (!careEpisodeId) {
      return Response.json(
        { success: false, message: "care_episode_id is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Query CareEpisode from AWS RDS PostgreSQL
    const episodes = await sql`
      SELECT id, patient_id, status, current_stage, created_at, updated_at
      FROM care_episodes
      WHERE id = ${careEpisodeId} AND patient_id = ${caller.id}
      LIMIT 1
    `;

    if (episodes.length === 0) {
      return Response.json(
        { success: false, message: "CareEpisode not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    const episode = episodes[0];

    // Fetch related records linked to this CareEpisode
    const appointments = await sql`
      SELECT id, doctor_id, appointment_date, appointment_time, status, appointment_type
      FROM appointments WHERE care_episode_id = ${careEpisodeId} ORDER BY created_at DESC
    `;

    const prescriptions = await sql`
      SELECT id, doctor_id, digital_signature, version, created_at
      FROM prescriptions WHERE care_episode_id = ${careEpisodeId} ORDER BY version DESC
    `;

    const labOrders = await sql`
      SELECT id, lab_id, status, report_url, created_at
      FROM lab_orders WHERE care_episode_id = ${careEpisodeId} ORDER BY created_at DESC
    `;

    return Response.json(
      {
        success: true,
        message: "Authoritative CareEpisode state fetched successfully.",
        data: {
          care_episode: episode,
          appointments: appointments,
          prescriptions: prescriptions,
          lab_orders: labOrders,
          authoritative_stage: episode.current_stage || "HOME"
        }
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[MOBILE API CARE EPISODE STATE] Error:", error);
    return Response.json(
      { success: false, message: "Failed to fetch CareEpisode state.", error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
