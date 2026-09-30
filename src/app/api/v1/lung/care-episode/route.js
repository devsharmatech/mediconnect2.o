import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/lung/care-episode
 * Retrieve current or most recent LungConnect care episode for a user from AWS RDS.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return failure("user_id is required", "validation_error", 400, { headers: corsHeaders });
    }

    let episode = null;
    const isUuid = UUID_REGEX.test(userId);

    try {
      let rows = [];
      if (isUuid) {
        rows = await sql`
          SELECT id, episode_id, status, created_at, updated_at, service_type, notes
          FROM care_episodes
          WHERE patient_id = ${userId}::uuid
          ORDER BY (CASE WHEN service_type = 'lungconnect' THEN 1 ELSE 2 END), created_at DESC
          LIMIT 1;
        `;
      } else {
        rows = await sql`
          SELECT id, episode_id, status, created_at, updated_at, service_type, notes
          FROM care_episodes
          WHERE (patient_id::text = ${String(userId)} OR episode_id = ${String(userId)})
          ORDER BY (CASE WHEN service_type = 'lungconnect' THEN 1 ELSE 2 END), created_at DESC
          LIMIT 1;
        `;
      }

      if (rows && rows.length > 0) {
        const data = rows[0];
        let parsedNotes = {};
        try { parsedNotes = data.notes ? JSON.parse(data.notes) : {}; } catch (_) {}
        episode = {
          id: data.id,
          episode_id: data.episode_id || `LCE-${data.id}`,
          status: data.status,
          created_at: data.created_at,
          updated_at: data.updated_at,
          service_type: data.service_type,
          meta: parsedNotes,
        };
      }
    } catch (e) {
      console.warn("[Lung CareEpisode GET] DB warning:", e.message);
    }

    return success(
      episode ? "Care episode found." : "No active care episode.",
      { episode },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[Lung CareEpisode GET] error:", error);
    return failure("Failed to fetch care episode: " + error.message, "episode_error", 500, { headers: corsHeaders });
  }
}

/**
 * POST /api/v1/lung/care-episode
 * Create a new LungConnect care episode in AWS RDS.
 * Rule: Single continuity model — check for existing open episode first to prevent duplicates.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      action = "open",
      user_id,
      episode_id,
      status = "active",
      assessment_id = null,
      notes = null,
    } = body;

    if (!user_id) {
      return failure("user_id is required", "validation_error", 400, { headers: corsHeaders });
    }

    const isUuid = UUID_REGEX.test(user_id);

    // --- OPEN ---
    if (action === "open") {
      try {
        let existing = [];
        if (isUuid) {
          existing = await sql`
            SELECT id, episode_id, status, created_at
            FROM care_episodes
            WHERE patient_id = ${user_id}::uuid AND service_type = 'lungconnect' AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 1;
          `;
        } else {
          existing = await sql`
            SELECT id, episode_id, status, created_at
            FROM care_episodes
            WHERE patient_id::text = ${String(user_id)} AND service_type = 'lungconnect' AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 1;
          `;
        }

        if (existing && existing.length > 0) {
          const ex = existing[0];
          return success("Existing care episode found. No duplicate created.", {
            episode: {
              id: ex.id,
              episode_id: ex.episode_id || `LCE-${ex.id}`,
              status: ex.status,
              created_at: ex.created_at,
              is_existing: true,
            }
          }, 200, { headers: corsHeaders });
        }
      } catch (e) {
        console.warn("[Lung CareEpisode] Existence check warning:", e.message);
      }

      const newEpisodeId = episode_id || `LCE-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      let createdId = null;
      const notesJson = notes ? JSON.stringify({ assessment_id, raw: notes }) : JSON.stringify({ assessment_id });

      try {
        if (isUuid) {
          const inserted = await sql`
            INSERT INTO care_episodes (
              patient_id, episode_id, service_type, status, notes, created_at, updated_at
            ) VALUES (
              ${user_id}::uuid, ${newEpisodeId}, 'lungconnect', 'active', ${notesJson}, NOW(), NOW()
            )
            RETURNING id;
          `;
          createdId = inserted[0]?.id;
        }
      } catch (e) {
        console.warn("[Lung CareEpisode] DB insert warning:", e.message);
      }

      return success("LungConnect care episode opened.", {
        episode: {
          id: createdId,
          episode_id: newEpisodeId,
          status: "active",
          created_at: new Date().toISOString(),
          is_existing: false,
        }
      }, 201, { headers: corsHeaders });
    }

    // --- CLOSE / UPDATE STATUS ---
    if (action === "close" || action === "update_status") {
      const newStatus = action === "close" ? "closed" : status;

      try {
        if (isUuid) {
          await sql`
            UPDATE care_episodes
            SET status = ${newStatus}, updated_at = NOW(),
                closed_at = ${action === "close" ? sql`NOW()` : sql`closed_at`}
            WHERE patient_id = ${user_id}::uuid AND service_type = 'lungconnect' AND status = 'active';
          `;
        }
      } catch (e) {
        console.warn("[Lung CareEpisode] Update warning:", e.message);
      }

      return success(`Care episode ${newStatus}.`, { status: newStatus }, 200, { headers: corsHeaders });
    }

    return failure(`Unknown action: ${action}`, "validation_error", 400, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung CareEpisode POST] error:", error);
    return failure("Failed to process care episode: " + error.message, "episode_error", 500, { headers: corsHeaders });
  }
}
