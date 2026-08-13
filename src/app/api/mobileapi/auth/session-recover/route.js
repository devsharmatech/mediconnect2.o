import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * NEW Mobile Session Recovery Endpoint (AUTH-04 / J01)
 * Recovers active session and returns authoritative CareEpisode & journey state after crash or restart.
 */
export async function POST(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (!caller) {
      return Response.json(
        { success: false, message: "Session expired or invalid token." },
        { status: 401, headers: corsHeaders }
      );
    }

    // Query active CareEpisode from AWS RDS PostgreSQL
    const activeEpisodes = await sql`
      SELECT id, status, current_stage, created_at, updated_at 
      FROM care_episodes 
      WHERE patient_id = ${caller.id} AND status NOT IN ('completed', 'cancelled')
      ORDER BY updated_at DESC LIMIT 1
    `;

    const activeEpisode = activeEpisodes.length > 0 ? activeEpisodes[0] : null;

    // Fetch active appointments or pending actions for the CareEpisode
    let activeAppointment = null;
    if (activeEpisode) {
      const appointments = await sql`
        SELECT id, doctor_id, appointment_date, appointment_time, status, appointment_type
        FROM appointments
        WHERE care_episode_id = ${activeEpisode.id} AND status IN ('confirmed', 'booked', 'in_progress')
        ORDER BY appointment_date ASC, appointment_time ASC LIMIT 1
      `;
      if (appointments.length > 0) {
        activeAppointment = appointments[0];
      }
    }

    return Response.json(
      {
        success: true,
        message: "Session recovered successfully.",
        data: {
          user: {
            id: caller.id,
            role: caller.role,
          },
          care_episode: activeEpisode,
          active_appointment: activeAppointment,
          resume_stage: activeEpisode ? activeEpisode.current_stage : "HOME",
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[MOBILE API SESSION RECOVERY] Error:", error);
    return Response.json(
      { success: false, message: "Failed to recover session.", error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
