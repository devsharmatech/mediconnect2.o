import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * CC-06: Activity Timeline API
 * Method: GET /api/v1/cardio/activity-timeline?date=YYYY-MM-DD&user_id=UUID
 * Connects directly to AWS RDS PostgreSQL.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];
    let userId = searchParams.get("user_id");

    let sessions = [];
    let dailyTotal = {
      steps: 0,
      distance_km: 0,
      energy_kcal: 0,
      total_duration_minutes: 0,
    };

    if (!userId) {
      try {
        const topUser = await sql`
          SELECT user_id, count(*) as count
          FROM health_assessments
          WHERE assessment_type = 'heart'
          GROUP BY user_id
          ORDER BY count DESC
          LIMIT 1;
        `;
        userId = topUser[0]?.user_id || null;
      } catch (_) {}
    }

    if (userId) {
      try {
        const startOfDay = `${dateParam} 00:00:00`;
        const endOfDay = `${dateParam} 23:59:59`;

        const dbSessions = await sql`
          SELECT * FROM activity_log
          WHERE (patient_id = ${userId})
            AND created_at >= ${startOfDay}::timestamp
            AND created_at <= ${endOfDay}::timestamp
          ORDER BY created_at ASC;
        `;

        if (dbSessions && dbSessions.length > 0) {
          sessions = dbSessions.map((s, idx) => {
            const dur = Number(s.duration_minutes || 0);
            const stp = Number(s.steps || 0);
            const dst = Number(s.distance_km || 0);
            const nrg = Number(s.calories || 0);

            dailyTotal.total_duration_minutes += dur;
            dailyTotal.steps += stp;
            dailyTotal.distance_km += dst;
            dailyTotal.energy_kcal += nrg;

            return {
              id: s.id || `session-${idx + 1}`,
              session_number: idx + 1,
              title: `Session ${idx + 1}`,
              activity_type: s.activity_type || "Heart Training",
              duration_minutes: dur,
              steps: stp > 0 ? stp : null,
              distance_km: dst > 0 ? Number(dst.toFixed(2)) : null,
              energy_kcal: nrg > 0 ? nrg : null,
              is_long_session: dur >= 45,
              started_at: s.created_at,
              status: "completed",
            };
          });
          dailyTotal.distance_km = Number(dailyTotal.distance_km.toFixed(2));
        }
      } catch (dbErr) {
        console.warn("[CC-06 activity-timeline] DB query fallback:", dbErr.message);
      }
    }

    // Determine state
    let state = "no_sessions";
    if (sessions.length > 0) {
      const hasLong = sessions.some((s) => s.is_long_session);
      state = hasLong ? "long_session" : "multiple_sessions";
    }

    const payload = {
      screen_id: "CC-06",
      date: dateParam,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
      state: state,
      daily_total: {
        steps: dailyTotal.steps,
        distance_km: dailyTotal.distance_km,
        energy_kcal: dailyTotal.energy_kcal,
        total_duration_minutes: dailyTotal.total_duration_minutes,
      },
      session_records: sessions,
      weekly_summary_route: "CC-09",
    };

    return success("CardioConnect CC-06 Activity Timeline loaded.", payload, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("GET /api/v1/cardio/activity-timeline error:", err);
    return failure("Failed to fetch Activity Timeline: " + err.message, "timeline_fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}
