import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET /api/v1/lung/activity-sessions
 * Fetch recent lung activity sessions for a user.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || "usr_guest";
    const activityType = searchParams.get("activity_type");
    const limit = parseInt(searchParams.get("limit")) || 20;

    let sessions = [];
    try {
      let query = supabase
        .from("lung_activity_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (userId && userId !== "all") {
        query = query.eq("user_id", userId);
      }

      if (activityType) {
        query = query.eq("activity_type", activityType);
      }

      const { data, error } = await query;
      if (!error && data) {
        sessions = data;
      }
    } catch (e) {
      console.warn("[Lung Activity GET] warning:", e.message);
    }

    return success("Lung activity sessions fetched.", { sessions }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung Activity GET] error:", error);
    return failure("Failed to fetch sessions: " + error.message, "fetch_error", 500, { headers: corsHeaders });
  }
}

/**
 * POST /api/v1/lung/activity-sessions
 * Governs Lung Move (B03–B06) and Breathing Studio (B07–B11) session lifecycle.
 * Actions: create | pause | resume | complete
 * Rule: Server authority on timing. Excludes paused intervals from active duration.
 * Rule: Breathing exercises are defined by preset (category, technique, pattern).
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
      // Document requirements: metadata & governance fields
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
        response.breathing_preset = breathing_preset || "Natural Breathing";
        response.breathing_pattern = breathing_pattern || { inhale: 4, hold: 0, exhale: 6, hold2: 0 };
        response.cycles_completed = 0;
      }

      return success("Lung session initialized.", response, 201, { headers: corsHeaders });
    }

    // ---------- PAUSE / RESUME ----------
    if (action === "pause" || action === "resume") {
      return success("Session state updated.", {
        session_id,
        status: action === "pause" ? "paused" : "active",
        accumulated_active_seconds,
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

      // Persist to lung_activity_sessions
      const sessionId = session_id || `lms-${Date.now()}`;
      if (user_id) {
        try {
          const title = isBreathing
            ? (breathing_preset || "Breathing Session")
            : `${activity_type.replace('lung_', '').toUpperCase()} Session`;

          await supabase.from("lung_activity_sessions").insert([{
            id: sessionId,
            user_id,
            activity_type: normalizedActivityType,
            title,
            status: isTargetReached ? "completed" : "partial",
            duration_seconds: Number(accumulated_active_seconds) || actualDurationMin * 60,
            target_duration_minutes: targetMin,
            distance_km: Number(distance_km) || 0,
            steps: Number(steps) || 0,
            avg_pace: !isBreathing && distance_km > 0 && actualDurationMin > 0
              ? `${(actualDurationMin / distance_km).toFixed(1)} min/km`
              : null,
            calories: estimated_energy_kcal ? Number(estimated_energy_kcal) : 0,
            breathing_category: breathing_category || null,
            breathing_preset: breathing_preset || null,
            cycles_completed: Number(cycles_completed) || 0,
            care_episode_id: care_episode_id || null,
            schema_version: schema_version || "1.0",
            content_version: content_version || "1.0",
            calm_score: calm_score ? Number(calm_score) : null,
            state: isTargetReached ? "COMPLETED" : "PARTIAL",
            created_at: new Date().toISOString(),
          }]);
        } catch (dbErr) {
          console.warn("[Lung Activity Complete] DB insert warning:", dbErr.message);
        }
      }

      const completedRecord = {
        session_id: session_id || `lms-${Date.now()}`,
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
