import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET /api/v1/lung/walking-tests
 * Fetch all 6MWT records for a user.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const limit = parseInt(searchParams.get("limit")) || 10;

    if (!userId) {
      return failure("user_id is required", "validation_error", 400, { headers: corsHeaders });
    }

    let tests = [];
    try {
      const { data, error } = await supabase
        .from("lung_walking_tests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && data) {
        tests = data.map(row => ({
          id: row.id,
          date: row.created_at,
          distance_m: Number(row.distance_m) || 0,
          duration_seconds: row.duration_seconds || 360,
          duration_minutes: Math.round((row.duration_seconds || 360) / 60),
          speed_ms: row.distance_m ? (Number(row.distance_m) / (row.duration_seconds || 360)).toFixed(2) : null,
          pace_kmh: Number(row.pace_kmh) || (row.distance_m ? Number(((row.distance_m / 1000) / ((row.duration_seconds || 360) / 3600)).toFixed(2)) : 0),
          stops: row.stops ?? 0,
          borg_score: row.borg_score ?? null,
          spo2_before: row.spo2_before ?? null,
          spo2_after: row.spo2_after ?? null,
          heart_rate_bpm: row.heart_rate_bpm ?? null,
          protocol_version: row.protocol_version || "V1.0",
          clinical_interpretation: interpretDistance(Number(row.distance_m) || 0),
        }));
      }
    } catch (e) {
      console.warn("[Lung 6MWT GET] query warning:", e.message);
    }

    return success("6MWT records fetched.", { tests, total: tests.length }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung 6MWT GET] error:", error);
    return failure("Failed to fetch 6MWT records: " + error.message, "fetch_error", 500, { headers: corsHeaders });
  }
}

/**
 * POST /api/v1/lung/walking-tests
 * Record a completed 6-Minute Walk Test (6MWT) — B12–B15.
 * Rule: Server-side clinical interpretation. Distance is primary outcome.
 * Rule: Includes Borg Scale fatigue + SpO2 markers if provided.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      action = "complete",
      user_id,
      session_id,
      distance_m,
      duration_seconds = 360, // 6 minutes standard
      stops = 0,
      borg_score = null,
      spo2_before = null,
      spo2_after = null,
      heart_rate_before = null,
      heart_rate_after = null,
      test_environment = "indoor", // indoor | outdoor
      care_episode_id = null,
      schema_version = "1.0",
      content_version = "1.0",
      post_borg_score = null,
      target_distance_m = null,
      client_idempotency_key,
    } = body;

    if (action === "create") {
      const newId = `l6t-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      return success("6MWT session started.", {
        session_id: newId,
        activity_type: "lung_6mwt",
        status: "active",
        target_duration_seconds: 360,
        started_at: new Date().toISOString(),
      }, 201, { headers: corsHeaders });
    }

    if (action === "complete") {
      if (!distance_m && distance_m !== 0) {
        return failure("distance_m is required to complete a 6MWT.", "validation_error", 400, { headers: corsHeaders });
      }

      const distNum = Number(distance_m);
      const interpretation = interpretDistance(distNum);
      const spo2Drop = (spo2_before && spo2_after) ? (Number(spo2_before) - Number(spo2_after)) : null;
      const desaturation = spo2Drop !== null && spo2Drop >= 4;

      const resultRecord = {
        session_id: session_id || `l6t-${Date.now()}`,
        activity_type: "lung_6mwt",
        distance_m: distNum,
        distance_formatted: `${distNum}m`,
        duration_seconds: Number(duration_seconds),
        stops: Number(stops) || 0,
        borg_score: borg_score ? Number(borg_score) : null,
        borg_label: borgLabel(borg_score),
        spo2_before: spo2_before ? Number(spo2_before) : null,
        spo2_after: spo2_after ? Number(spo2_after) : null,
        spo2_drop: spo2Drop,
        significant_desaturation: desaturation,
        heart_rate_before: heart_rate_before ? Number(heart_rate_before) : null,
        heart_rate_after: heart_rate_after ? Number(heart_rate_after) : null,
        test_environment,
        clinical_interpretation: interpretation,
        completed_at: new Date().toISOString(),
      };

      // Persist to lung_walking_tests
      if (user_id) {
        try {
          const paceVal = distNum ? Number(((distNum / 1000) / ((Number(duration_seconds) || 360) / 3600)).toFixed(2)) : 0;
          await supabase.from("lung_walking_tests").insert([{
            id: resultRecord.session_id,
            user_id,
            duration_seconds: Number(duration_seconds) || 360,
            distance_m: distNum,
            pace_kmh: paceVal,
            heart_rate_bpm: heart_rate_after ? Number(heart_rate_after) : null,
            borg_score: borg_score ? Number(borg_score) : null,
            stops: Number(stops) || 0,
            spo2_before: spo2_before ? Number(spo2_before) : null,
            spo2_after: spo2_after ? Number(spo2_after) : null,
            protocol_version: "V1.0",
            stopped_early: (Number(duration_seconds) || 360) < 360,
            care_episode_id: care_episode_id || null,
            schema_version: schema_version || "1.0",
            content_version: content_version || "1.0",
            post_borg_score: post_borg_score ? Number(post_borg_score) : null,
            target_distance_m: target_distance_m ? Number(target_distance_m) : null,
            created_at: new Date().toISOString(),
          }]);
        } catch (dbErr) {
          console.warn("[Lung 6MWT] DB insert warning:", dbErr.message);
        }
      }

      return success("6MWT recorded successfully.", resultRecord, 200, { headers: corsHeaders });
    }

    return failure(`Unknown action: ${action}`, "validation_error", 400, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung 6MWT POST] error:", error);
    return failure("Failed to process 6MWT: " + error.message, "session_error", 500, { headers: corsHeaders });
  }
}

function interpretDistance(distM) {
  if (!distM || distM === 0) return { label: "No data", severity: "none", message: "Complete a test to see your result." };
  if (distM >= 550) return { label: "Excellent", severity: "excellent", message: "Outstanding functional capacity. Maintain with regular activity." };
  if (distM >= 450) return { label: "Good", severity: "good", message: "Good functional capacity. Continue your current activity level." };
  if (distM >= 350) return { label: "Moderate", severity: "moderate", message: "Moderate functional capacity. Gradual progression of activity is recommended." };
  if (distM >= 250) return { label: "Low", severity: "low", message: "Below average functional capacity. Structured rehabilitation may benefit you. Please consult your care team." };
  return { label: "Very Low", severity: "very-low", message: "Significantly limited functional capacity. Clinical review is strongly recommended." };
}

function borgLabel(score) {
  if (score === null || score === undefined) return null;
  const s = Number(score);
  if (s <= 0) return "Nothing at all";
  if (s <= 1) return "Very light";
  if (s <= 2) return "Light";
  if (s <= 3) return "Moderate";
  if (s <= 4) return "Somewhat hard";
  if (s <= 5) return "Hard";
  if (s <= 6) return "Hard+";
  if (s <= 7) return "Very hard";
  if (s <= 8) return "Very hard+";
  if (s <= 9) return "Extremely hard";
  return "Maximal exertion";
}
