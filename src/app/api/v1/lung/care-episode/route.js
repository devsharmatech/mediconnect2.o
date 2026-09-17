import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET /api/v1/lung/care-episode
 * Retrieve current or most recent LungConnect care episode for a user.
 * Rule: Care Episodes are only created on deliberate clinical action (e.g. assessment submission).
 *       Browsing the Hub or activities does NOT trigger episode creation.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return failure("user_id is required", "validation_error", 400, { headers: corsHeaders });
    }

    let episode = null;
    try {
      const { data } = await supabase
        .from("care_episodes")
        .select("id, episode_id, status, created_at, updated_at, service_type, notes")
        .eq("patient_id", userId)
        .eq("service_type", "lungconnect")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
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
 * Create a new LungConnect care episode upon first clinical action (e.g. assessment submission).
 * Rule: Check for existing open episode first — do not duplicate.
 * Rule: Actions: open | close | update_status
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

    // --- OPEN ---
    if (action === "open") {
      // Check for existing open episode
      try {
        const { data: existing } = await supabase
          .from("care_episodes")
          .select("id, episode_id, status, created_at")
          .eq("patient_id", user_id)
          .eq("service_type", "lungconnect")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          return success("Existing care episode found. No duplicate created.", {
            episode: {
              id: existing.id,
              episode_id: existing.episode_id || `LCE-${existing.id}`,
              status: existing.status,
              created_at: existing.created_at,
              is_existing: true,
            }
          }, 200, { headers: corsHeaders });
        }
      } catch (e) {
        console.warn("[Lung CareEpisode] Existence check warning:", e.message);
      }

      const newEpisodeId = `LCE-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      let createdId = null;

      try {
        const { data, error } = await supabase
          .from("care_episodes")
          .insert([{
            patient_id: user_id,
            episode_id: newEpisodeId,
            service_type: "lungconnect",
            status: "active",
            notes: notes ? JSON.stringify({ assessment_id, raw: notes }) : JSON.stringify({ assessment_id }),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select("id")
          .single();

        if (!error) createdId = data?.id;
        else console.warn("[Lung CareEpisode] Insert warning:", error.message);
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
        await supabase
          .from("care_episodes")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("patient_id", user_id)
          .eq("service_type", "lungconnect")
          .eq("status", "active");
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
