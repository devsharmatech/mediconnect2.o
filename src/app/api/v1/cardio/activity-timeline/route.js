import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * CC-06: Activity Timeline API
 * Method: GET /api/v1/cardio/activity-timeline?date=YYYY-MM-DD&user_id=UUID
 * Returns chronological sessions for the selected date and daily aggregate.
 * Adheres to CC-06 & CC-15 contracts.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const userId = searchParams.get("user_id");

    let sessions = [];
    let dailyTotal = {
      steps: 0,
      distance_km: 0,
      energy_kcal: 0,
      total_duration_minutes: 0,
    };

    if (userId) {
      try {
        const startOfDay = `${dateParam}T00:00:00.000Z`;
        const endOfDay = `${dateParam}T23:59:59.999Z`;

        const { data: dbSessions, error } = await supabase
          .from("activity_log")
          .select("*")
          .eq("user_id", userId)
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay)
          .order("created_at", { ascending: true });

        if (!error && dbSessions && dbSessions.length > 0) {
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
