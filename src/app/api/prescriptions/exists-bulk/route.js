import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/prescriptions/exists-bulk
 * Body: { appointment_ids: string[] }
 * Returns: { data: { [appointmentId]: { exists: boolean, prescription_id?: string, is_signed?: boolean, status?: string } } }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { appointment_ids } = body || {};

    if (!appointment_ids || !Array.isArray(appointment_ids) || appointment_ids.length === 0) {
      return failure("appointment_ids array is required", null, 400, { headers: corsHeaders });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanIds = appointment_ids.filter((id) => uuidRegex.test(String(id)));

    if (cleanIds.length === 0) {
      return success("Prescription existence check complete", {}, 200, { headers: corsHeaders });
    }

    // 1. Get prescriptions that directly match the given appointment IDs from AWS RDS
    const directRx = await sql`
      SELECT id, appointment_id, status, is_draft, signed_at, created_at
      FROM prescriptions
      WHERE appointment_id = ANY(${cleanIds})
      ORDER BY created_at DESC
    `;

    const existsMap = {};

    for (const row of directRx || []) {
      const isSigned = !!(row.signed_at || (!row.is_draft && row.status === "completed"));
      existsMap[row.appointment_id] = {
        exists: true,
        prescription_id: row.id,
        is_signed: isSigned,
        status: row.status,
      };
    }

    // 2. Also check care_episodes: if any appointment in the same care_episode has a prescription
    const apptRows = await sql`
      SELECT id, care_episode_id
      FROM appointments
      WHERE id = ANY(${cleanIds})
    `;

    const episodeIds = [...new Set(
      (apptRows || [])
        .map((a) => a.care_episode_id)
        .filter((ep) => ep && uuidRegex.test(String(ep)))
    )];

    if (episodeIds.length > 0) {
      const episodeAppts = await sql`
        SELECT a.id, a.care_episode_id, p.id AS rx_id, p.status AS rx_status, p.signed_at AS rx_signed_at, p.is_draft AS rx_is_draft
        FROM appointments a
        INNER JOIN prescriptions p ON p.appointment_id = a.id
        WHERE a.care_episode_id = ANY(${episodeIds})
        ORDER BY p.created_at DESC
      `;

      for (const row of episodeAppts || []) {
        const matchingOriginals = (apptRows || []).filter(
          (orig) => orig.care_episode_id === row.care_episode_id
        );
        for (const orig of matchingOriginals) {
          if (!existsMap[orig.id]) {
            const isSigned = !!(row.rx_signed_at || (!row.rx_is_draft && row.rx_status === "completed"));
            existsMap[orig.id] = {
              exists: true,
              prescription_id: row.rx_id,
              is_signed: isSigned,
              status: row.rx_status,
            };
          }
        }
      }
    }

    // Also support backward compatibility where caller expects boolean `existsMap[id] = true`
    // We return both: the object map with details, and for boolean checks `!!existsMap[id]` is true.
    return success("Prescription existence check complete", existsMap, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("exists-bulk error:", err);
    return failure("Failed to check prescription existence", err.message, 500, { headers: corsHeaders });
  }
}
