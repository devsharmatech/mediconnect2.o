import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * CC-02 -> CC-05: CardioConnect Heart Training Sessions API
 * Governs session creation, pause, resume, and completion.
 * Connects directly to AWS RDS PostgreSQL.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      action = "create", // 'create' | 'pause' | 'resume' | 'complete'
      user_id,
      session_id,
      activity_type = "heart_training",
      target_duration_minutes = 30,
      accumulated_active_seconds = 0,
      steps = 0,
      distance_km = 0,
      estimated_energy_kcal = null,
      client_idempotency_key
    } = body;

    if (action === "create") {
      const newSessionId = `hts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const sessionRecord = {
        session_id: newSessionId,
        user_id: user_id || null,
        activity_type: activity_type,
        target_duration_minutes: Number(target_duration_minutes) || 30,
        status: "active",
        accumulated_active_seconds: 0,
        created_at: new Date().toISOString(),
        idempotency_key: client_idempotency_key || null
      };

      return success("Heart Training session initialized.", {
        session_id: newSessionId,
        status: "active",
        target_duration_minutes: sessionRecord.target_duration_minutes,
        accumulated_active_seconds: 0
      }, 201, { headers: corsHeaders });
    }

    if (action === "complete") {
      const actualDurationMin = Math.round((Number(accumulated_active_seconds) || 0) / 60);
      const isTargetReached = actualDurationMin >= Number(target_duration_minutes);

      // Persist to activity_log and lung_activity_sessions in AWS RDS
      if (user_id) {
        try {
          const cal = typeof estimated_energy_kcal === 'number' ? estimated_energy_kcal : (Number(estimated_energy_kcal) || 0);
          const meta = {
            duration_minutes: actualDurationMin,
            duration_seconds: Number(accumulated_active_seconds) || 0,
            steps: Number(steps) || 0,
            distance_km: Number(distance_km) || 0,
            calories: cal,
            session_id: session_id || `hts-${Date.now()}`
          };

          await sql`
            INSERT INTO activity_log (
              patient_id, module_type, action_type, description, metadata, created_at
            ) VALUES (
              ${user_id}, 'cardio', 'heart_training',
              ${`Heart Training Session (${actualDurationMin} min, ${Number(steps) || 0} steps, ${Number(distance_km) || 0} km, ${cal} kcal)`},
              ${JSON.stringify(meta)},
              NOW()
            );
          `;

          const actId = `hts-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await sql`
            INSERT INTO lung_activity_sessions (
              id, user_id, activity_type, title, status, duration_seconds,
              steps, distance_km, calories, created_at
            ) VALUES (
              ${actId}, ${String(user_id)}, 'heart_training', 'Heart Training',
              ${isTargetReached ? 'completed' : 'partial'},
              ${Number(accumulated_active_seconds) || 0},
              ${Number(steps) || 0},
              ${Number(distance_km) || 0},
              ${cal},
              NOW()
            );
          `;
        } catch (dbErr) {
          console.warn("Could not insert session into RDS:", dbErr.message);
        }
      }

      const completedRecord = {
        session_id: session_id || `hts-${Date.now()}`,
        status: isTargetReached ? "completed" : "partial",
        actual_duration_minutes: actualDurationMin,
        actual_duration_formatted: `${Math.floor(accumulated_active_seconds / 60)}:${(accumulated_active_seconds % 60).toString().padStart(2, '0')}`,
        target_duration_minutes: Number(target_duration_minutes),
        target_status: isTargetReached ? "Target achieved" : "Partial session recorded",
        steps: Number(steps) || 0,
        distance_km: Number(distance_km) || 0,
        estimated_energy_kcal: `${Number(estimated_energy_kcal) || 0} kcal`,
        weekly_reference_update: "Activity logged toward 150-300 min/week reference band",
        milestone: isTargetReached ? "Session Goal Reached" : null,
        completed_at: new Date().toISOString()
      };

      return success("Session recorded successfully.", completedRecord, 200, {
        headers: corsHeaders
      });
    }

    // Default pause/resume state handler
    return success("Session updated.", {
      session_id,
      status: action === "pause" ? "paused" : "active",
      accumulated_active_seconds
    }, 200, { headers: corsHeaders });

  } catch (error) {
    console.error("POST /api/v1/cardio/activity-sessions error:", error);
    return failure("Failed to process activity session: " + error.message, "session_error", 500, {
      headers: corsHeaders,
    });
  }
}
