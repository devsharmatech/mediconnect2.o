import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET /api/v1/lung/activity-sessions
 * Fetch recent lung activity sessions for a user from AWS RDS PostgreSQL.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || "usr_guest";
    const activityType = searchParams.get("activity_type");
    const limit = parseInt(searchParams.get("limit"), 10) || 20;

    let sessions = [];
    try {
      if (userId && userId !== "all") {
        if (activityType) {
          sessions = await sql`
            SELECT * FROM lung_activity_sessions
            WHERE user_id = ${String(userId)} AND activity_type = ${activityType}
            ORDER BY created_at DESC
            LIMIT ${limit};
          `;
        } else {
          sessions = await sql`
            SELECT * FROM lung_activity_sessions
            WHERE user_id = ${String(userId)}
            ORDER BY created_at DESC
            LIMIT ${limit};
          `;
        }
      } else {
        if (activityType) {
          sessions = await sql`
            SELECT * FROM lung_activity_sessions
            WHERE activity_type = ${activityType}
            ORDER BY created_at DESC
            LIMIT ${limit};
          `;
        } else {
          sessions = await sql`
            SELECT * FROM lung_activity_sessions
            ORDER BY created_at DESC
            LIMIT ${limit};
          `;
        }
      }
    } catch (e) {
      console.warn("[Lung Activity GET] warning:", e.message);
    }

    return success("Lung activity sessions fetched.", { sessions: sessions || [] }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung Activity GET] error:", error);
    return failure("Failed to fetch sessions: " + error.message, "fetch_error", 500, { headers: corsHeaders });
  }
}

/**
 * POST /api/v1/lung/activity-sessions
 * Governs Lung Move (B03–B06) and Breathing Studio (B07–B11) session lifecycle in AWS RDS.
 * Actions: create | pause | resume | complete
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      action = "create",
      user_id,
      session_id,
      activity_type = "lung_move",  // lung_move | lung_breathing
      target_duration_minutes = 20,
      accumulated_active_seconds = 0,
      // Breathing-specific
      breathing_category,   // calm | energise | sleep | focus
      breathing_preset,     // e.g. "Box Breathing", "4-7-8"
      breathing_pattern,    // { inhale, hold, exhale, hold2 }
      cycles_completed = 0,
      // Move-specific
      steps = 0,
      distance_km = 0,
      estimated_energy_kcal = null,
      // Metadata & governance
      care_episode_id = null,
      schema_version = "1.0",
      content_version = "1.0",
      calm_score = null,
      client_idempotency_key,
    } = body;

    // ---------- CREATE ----------
    if (action === "create") {
      const isBreathing = activity_type === "lung_breathing" || activity_type === "breathing";
      const newId = `${isBreathing ? "lbs" : "lms"}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const response = {
        session_id: newId,
        activity_type: isBreathing ? "lung_breathing" : activity_type,
        status: "active",
        started_at: new Date().toISOString(),
        target_duration_minutes: Number(target_duration_minutes),
        accumulated_active_seconds: 0,
      };

      if (isBreathing) {
        response.breathing_category = breathing_category || "calm";
        response.breathing_preset = breathing_preset || "Box Breathing";
      }

      return success("Session initialized.", response, 201, { headers: corsHeaders });
    }

    // ---------- PAUSE / RESUME ----------
    if (action === "pause" || action === "resume") {
      return success(`Session ${action}d.`, {
        session_id,
        status: action === "pause" ? "paused" : "active",
        accumulated_active_seconds: Number(accumulated_active_seconds) || 0,
      }, 200, { headers: corsHeaders });
    }

    // ---------- COMPLETE ----------
    if (action === "complete") {
      const isBreathing = activity_type === "lung_breathing" || activity_type === "breathing";
      const normalizedActivityType = isBreathing ? "lung_breathing" : activity_type;
      const actualDurationMin = Math.round((Number(accumulated_active_seconds) || 0) / 60);
      const targetMin = Number(target_duration_minutes) || 20;
      const isTargetReached = actualDurationMin >= targetMin;

      const durationFormatted = `${Math.floor(accumulated_active_seconds / 60)}:${(accumulated_active_seconds % 60).toString().padStart(2, "0")}`;
      const finalSessionId = session_id || client_idempotency_key || `lms-${Date.now()}`;

      // Persist to lung_activity_sessions and activity_log in AWS RDS
      if (user_id) {
        try {
          const title = isBreathing
            ? (breathing_preset || "Breathing Session")
            : `${activity_type.replace('lung_', '').toUpperCase()} Session`;

          await sql`
            INSERT INTO lung_activity_sessions (
              id, user_id, activity_type, title, status, duration_seconds,
              target_duration_minutes, distance_km, steps, avg_pace,
              calories, breathing_category, breathing_preset,
              cycles_completed, care_episode_id, schema_version,
              content_version, calm_score, state, created_at
            ) VALUES (
              ${finalSessionId}, ${String(user_id)}, ${normalizedActivityType},
              ${title}, ${isTargetReached ? "completed" : "partial"},
              ${Number(accumulated_active_seconds) || actualDurationMin * 60},
              ${targetMin}, ${Number(distance_km) || 0}, ${Number(steps) || 0},
              ${!isBreathing && distance_km > 0 && actualDurationMin > 0 ? `${(actualDurationMin / distance_km).toFixed(1)} min/km` : null},
              ${estimated_energy_kcal ? Number(estimated_energy_kcal) : 0},
              ${breathing_category || null}, ${breathing_preset || null},
              ${Number(cycles_completed) || 0}, ${care_episode_id || null},
              ${schema_version || "1.0"}, ${content_version || "1.0"},
              ${calm_score ? Number(calm_score) : null},
              ${isTargetReached ? "COMPLETED" : "PARTIAL"},
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              duration_seconds = EXCLUDED.duration_seconds,
              status = EXCLUDED.status,
              cycles_completed = EXCLUDED.cycles_completed;
          `;

          // Also log to unified activity_log
          const meta = {
            duration_minutes: actualDurationMin,
            duration_seconds: Number(accumulated_active_seconds) || 0,
            preset: breathing_preset || null,
            cycles: Number(cycles_completed) || 0,
            steps: Number(steps) || 0,
            distance_km: Number(distance_km) || 0,
            calories: estimated_energy_kcal ? Number(estimated_energy_kcal) : 0,
          };

          await sql`
            INSERT INTO activity_log (
              patient_id, module_type, action_type, description, metadata, created_at
            ) VALUES (
              ${user_id}, 'lung', ${normalizedActivityType},
              ${`${title} (${actualDurationMin} min${cycles_completed ? `, ${cycles_completed} cycles` : ''})`},
              ${JSON.stringify(meta)},
              NOW()
            );
          `;
        } catch (dbErr) {
          console.warn("[Lung Activity Complete] DB insert warning:", dbErr.message);
        }
      }

      const completedRecord = {
        session_id: finalSessionId,
        activity_type,
        status: isTargetReached ? "completed" : "partial",
        actual_duration_minutes: actualDurationMin,
        actual_duration_formatted: durationFormatted,
        target_duration_minutes: targetMin,
        target_status: isTargetReached ? "Goal reached" : "Partial session recorded",
        milestone: isTargetReached ? "Session Goal Reached" : null,
        completed_at: new Date().toISOString(),
      };

      if (isBreathing) {
        completedRecord.breathing_category = breathing_category;
        completedRecord.breathing_preset = breathing_preset;
        completedRecord.cycles_completed = Number(cycles_completed) || 0;
      } else {
        completedRecord.steps = Number(steps) || 0;
        completedRecord.distance_km = Number(distance_km) || 0;
        completedRecord.estimated_energy_kcal = estimated_energy_kcal ? `${estimated_energy_kcal} kcal` : null;
      }

      return success("Lung session recorded successfully.", completedRecord, 200, { headers: corsHeaders });
    }

    return failure(`Unknown action: ${action}`, "validation_error", 400, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung Activity POST] error:", error);
    return failure("Failed to process session: " + error.message, "session_error", 500, { headers: corsHeaders });
  }
}
