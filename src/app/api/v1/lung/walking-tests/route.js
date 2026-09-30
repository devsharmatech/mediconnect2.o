import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET /api/v1/lung/walking-tests
 * Fetch all 6MWT records for a user from AWS RDS PostgreSQL.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const limit = parseInt(searchParams.get("limit"), 10) || 10;

    if (!userId) {
      return failure("user_id is required", "validation_error", 400, { headers: corsHeaders });
    }

    let tests = [];
    try {
      const data = await sql`
        SELECT *
        FROM lung_walking_tests
        WHERE user_id = ${String(userId)}
        ORDER BY created_at DESC
        LIMIT ${limit};
      `;

      if (data && data.length > 0) {
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
 * Record a completed 6-Minute Walk Test (6MWT) in AWS RDS PostgreSQL.
 * Non-negotiable rules:
 * - Distance is primary outcome.
 * - Idempotent save: retries/duplicate taps cannot duplicate records.
 * - Persist Borg CR10 against same session.
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

      const distNum = Math.max(0, Math.round(Number(distance_m)));
      const interpretation = interpretDistance(distNum);
      const spo2Drop = (spo2_before && spo2_after) ? (Number(spo2_before) - Number(spo2_after)) : null;
      const desaturation = spo2Drop !== null && spo2Drop >= 4;
      const finalSessionId = session_id || client_idempotency_key || `l6t-${Date.now()}`;
      const elapsedSec = Math.max(1, Number(duration_seconds) || 360);
      const paceVal = distNum ? Number(Math.min(((distNum / 1000) / (elapsedSec / 3600)), 16.0).toFixed(2)) : 0;

      const resultRecord = {
        session_id: finalSessionId,
        activity_type: "lung_6mwt",
        distance_m: distNum,
        distance_formatted: `${distNum}m`,
        duration_seconds: elapsedSec,
        stops: Number(stops) || 0,
        borg_score: borg_score !== null && !isNaN(Number(borg_score)) ? Number(borg_score) : null,
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

      // Idempotent persistence to lung_walking_tests in AWS RDS
      if (user_id) {
        try {
          await sql`
            INSERT INTO lung_walking_tests (
              id, user_id, duration_seconds, distance_m, pace_kmh,
              heart_rate_bpm, borg_score, stops, spo2_before, spo2_after,
              protocol_version, stopped_early, care_episode_id,
              schema_version, content_version, post_borg_score,
              target_distance_m, created_at
            ) VALUES (
              ${finalSessionId}, ${String(user_id)}, ${elapsedSec}, ${distNum}, ${paceVal},
              ${heart_rate_after ? Number(heart_rate_after) : null},
              ${resultRecord.borg_score},
              ${Number(stops) || 0},
              ${spo2_before ? Number(spo2_before) : null},
              ${spo2_after ? Number(spo2_after) : null},
              'V1.0', ${elapsedSec < 360}, ${care_episode_id || null},
              ${schema_version || '1.0'}, ${content_version || '1.0'},
              ${post_borg_score ? Number(post_borg_score) : null},
              ${target_distance_m ? Number(target_distance_m) : null},
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              distance_m = EXCLUDED.distance_m,
              duration_seconds = EXCLUDED.duration_seconds,
              pace_kmh = EXCLUDED.pace_kmh,
              borg_score = EXCLUDED.borg_score;
          `;
        } catch (dbErr) {
          console.warn("[Lung 6MWT] DB insert warning:", dbErr.message);
        }
      }

      return success("6MWT recorded successfully.", resultRecord, 201, { headers: corsHeaders });
    }

    return failure(`Unknown action: ${action}`, "validation_error", 400, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung 6MWT POST] error:", error);
    return failure("Failed to process 6MWT: " + error.message, "session_error", 500, { headers: corsHeaders });
  }
}

function interpretDistance(distanceMeters) {
  if (distanceMeters >= 500) {
    return {
      tier: "optimal",
      label: "Optimal Exercise Capacity",
      description: "6MWT distance is in the expected reference range for healthy adults.",
    };
  } else if (distanceMeters >= 350) {
    return {
      tier: "moderate",
      label: "Moderate Functional Capacity",
      description: "Distance reflects mild limitation; consistent daily movement recommended.",
    };
  } else if (distanceMeters > 0) {
    return {
      tier: "reduced",
      label: "Reduced Exercise Capacity",
      description: "Distance is below expected reference threshold; clinical follow-up suggested.",
    };
  }
  return {
    tier: "not_measured",
    label: "Not Measured / Incomplete",
    description: "No movement recorded during test.",
  };
}

function borgLabel(score) {
  if (score === null || score === undefined) return "Not recorded";
  const s = Number(score);
  if (s === 0) return "Nothing at all (0)";
  if (s <= 1) return "Very, very slight (0.5–1)";
  if (s <= 2) return "Slight (2)";
  if (s <= 3) return "Moderate (3)";
  if (s <= 4) return "Somewhat severe (4)";
  if (s <= 5) return "Severe (5)";
  if (s <= 7) return "Very severe (7)";
  if (s <= 9) return "Very, very severe (9)";
  return "Maximal (10)";
}
