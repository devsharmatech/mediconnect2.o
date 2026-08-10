import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/prescriptions/exists-bulk
 * Body: { appointment_ids: string[] }
 * Returns: { data: { [appointmentId]: true } }
 *
 * An appointment ID maps to `true` if:
 *   - It directly has a prescription, OR
 *   - It belongs to a care_episode that has at least one prescription in any appointment
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { appointment_ids } = body || {};

    if (!appointment_ids || !Array.isArray(appointment_ids) || appointment_ids.length === 0) {
      return failure("appointment_ids array is required", null, 400, { headers: corsHeaders });
    }

    // 1. Get prescriptions that directly match the given appointment IDs
    const { data: directRx, error: rxError } = await supabase
      .from("prescriptions")
      .select("appointment_id")
      .in("appointment_id", appointment_ids);

    if (rxError) throw rxError;

    const existsMap = {};

    // Mark appointments that directly have a prescription
    for (const row of directRx || []) {
      existsMap[row.appointment_id] = true;
    }

    // 2. Handle care episodes: fetch care_episode_id for all input appointments
    const { data: apptRows, error: apptError } = await supabase
      .from("appointments")
      .select("id, care_episode_id")
      .in("id", appointment_ids);

    if (apptError) throw apptError;

    // Collect unique non-null care_episode_ids
    const episodeIds = [...new Set(
      (apptRows || [])
        .map(a => a.care_episode_id)
        .filter(Boolean)
    )];

    if (episodeIds.length > 0) {
      // Find all appointments that belong to those episodes
      const { data: episodeAppts } = await supabase
        .from("appointments")
        .select("id, care_episode_id")
        .in("care_episode_id", episodeIds);

      if (episodeAppts && episodeAppts.length > 0) {
        const episodeApptIds = episodeAppts.map(a => a.id);

        // Check which of those episode appointments have prescriptions
        const { data: episodeRx } = await supabase
          .from("prescriptions")
          .select("appointment_id")
          .in("appointment_id", episodeApptIds);

        // Build a map: care_episode_id -> bool (has any prescription)
        const episodeHasRx = new Set((episodeRx || []).map(r => r.appointment_id));
        const episodeApptMap = {};
        for (const a of episodeAppts) {
          if (!episodeApptMap[a.care_episode_id]) episodeApptMap[a.care_episode_id] = [];
          episodeApptMap[a.care_episode_id].push(a.id);
        }

        // Mark original appointment IDs as true if their episode has a prescription
        for (const appt of apptRows || []) {
          if (!appt.care_episode_id) continue;
          const sibling_ids = episodeApptMap[appt.care_episode_id] || [];
          const episodeHasPrescription = sibling_ids.some(sid => episodeHasRx.has(sid));
          if (episodeHasPrescription) {
            existsMap[appt.id] = true;
          }
        }
      }
    }

    return success("Prescription existence check complete", existsMap, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("exists-bulk error:", err);
    return failure("Failed to check prescription existence", err.message, 500, { headers: corsHeaders });
  }
}
