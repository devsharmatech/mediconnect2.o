import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET /api/v1/lung/home
 * LC-18 / B-Hub: LungConnect Home - Authoritative state contract.
 * Returns consolidated state for all 4 Hub tabs without requiring assessment completion.
 * Rule: Passive browsing does NOT create a Care Episode.
 * Rule: All activities are accessible immediately; assessment is optional.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    // Hub state scaffold — always returns a valid response
    const hubState = {
      state: "no-data",
      care_episode: null,
      my_health: {
        latest_assessment: null,
        total_assessments: 0,
        latest_score: null,
        latest_risk: null,
        latest_lung_age: null,
        assessment_date: null,
      },
      my_activities: {
        total_move_sessions: 0,
        total_breathing_sessions: 0,
        total_6mwt_sessions: 0,
        current_streak_days: 0,
        weekly_move_minutes: 0,
        latest_6mwt_distance_m: null,
        latest_6mwt_date: null,
      },
      my_environment: {
        aqi: null,
        aqi_category: null,
        aqi_location: null,
        aqi_last_updated: null,
        aqi_source: null,
        weather: null,
        contextual_suggestion: null,
      },
      launch_entitlements: {
        assessments: true,
        move_sessions: true,
        breathing_studio: true,
        walking_test_6mwt: true,
        aqi_monitoring: true,
        vitals_logging: true,
        care_navigation: true,
        devices_wearables: false,
        governed_ai: false,
        future_subscription: false,
      },
    };

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isRegisteredUuid = typeof userId === "string" && UUID_REGEX.test(userId);

    if (!userId) {
      return success("LungConnect Hub — guest state.", hubState, 200, { headers: corsHeaders });
    }

    // Resolve Care Episode (only for registered UUID users)
    if (isRegisteredUuid) {
      try {
        const { data: episode } = await supabase
          .from("care_episodes")
          .select("id, episode_id, status, created_at, service_type")
          .eq("patient_id", userId)
          .eq("service_type", "lungconnect")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (episode) {
          hubState.care_episode = {
            id: episode.id,
            episode_id: episode.episode_id || `LCE-${episode.id}`,
            status: episode.status,
            created_at: episode.created_at,
          };
        }
      } catch (e) {
        console.warn("[Lung Home] Could not resolve care episode:", e.message);
      }

      // My Health — latest lung assessment (only for registered UUID users)
      try {
        const { data: assessments, count } = await supabase
          .from("health_assessments")
          .select("id, created_at, lung_health_inputs(*)", { count: "exact" })
          .eq("user_id", userId)
          .eq("assessment_type", "lung")
          .order("created_at", { ascending: false })
          .limit(1);

        if (assessments && assessments.length > 0) {
          const latest = assessments[0];
          const inputs = latest.lung_health_inputs?.[0] || {};
          hubState.my_health = {
            latest_assessment: latest.id,
            total_assessments: count || 1,
            latest_score: inputs.score ?? null,
            latest_risk: inputs.risk_level ?? null,
            latest_lung_age: inputs.lung_age ?? null,
            assessment_date: latest.created_at,
          };
          hubState.state = "partial";
        }
      } catch (e) {
        console.warn("[Lung Home] Could not query assessments:", e.message);
      }
    }

    // My Activities — Move & Breathing sessions (last 30 days) from lung_activity_sessions
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: sessions }, { data: wTests }] = await Promise.all([
        supabase
          .from("lung_activity_sessions")
          .select("activity_type, duration_seconds, created_at, distance_km")
          .eq("user_id", userId)
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("lung_walking_tests")
          .select("distance_m, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const allSessions = sessions || [];
      const walkingTests = wTests || [];

      if (allSessions.length > 0 || walkingTests.length > 0) {
        const moveSessions = allSessions.filter(s => s.activity_type === "lung_move" || s.activity_type === "walk" || s.activity_type === "jog" || s.activity_type === "run");
        const breathingSessions = allSessions.filter(s => s.activity_type === "lung_breathing" || s.activity_type === "breathing");

        const weeklyMove = moveSessions
          .filter(s => new Date(s.created_at) >= new Date(sevenDaysAgo))
          .reduce((acc, s) => acc + Math.round((Number(s.duration_seconds) || 0) / 60), 0);

        const latest6mwt = walkingTests[0];

        // Combine timestamps for streak calculation
        const allActivityDates = [...allSessions, ...walkingTests];

        hubState.my_activities = {
          total_move_sessions: moveSessions.length,
          total_breathing_sessions: breathingSessions.length,
          total_6mwt_sessions: walkingTests.length,
          current_streak_days: computeStreak(allActivityDates),
          weekly_move_minutes: Math.round(weeklyMove),
          latest_6mwt_distance_m: latest6mwt?.distance_m ? Math.round(Number(latest6mwt.distance_m)) : null,
          latest_6mwt_date: latest6mwt?.created_at ?? null,
        };

        hubState.state = "populated";
      }
    } catch (e) {
      console.warn("[Lung Home] Could not query activity sessions:", e.message);
    }

    // AQI — attempt to get last cached value from DB
    try {
      const { data: aqiRow } = await supabase
        .from("aqi_cache")
        .select("*")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (aqiRow) {
        const staleThresholdMs = 60 * 60 * 1000; // 1 hour
        const isStale = Date.now() - new Date(aqiRow.fetched_at).getTime() > staleThresholdMs;
        hubState.my_environment = {
          aqi: aqiRow.aqi_value,
          aqi_category: aqiRow.category,
          aqi_location: aqiRow.location,
          aqi_last_updated: aqiRow.fetched_at,
          aqi_source: aqiRow.source || "CPCB / OpenAQ",
          aqi_stale: isStale,
          weather: null,
          contextual_suggestion: getContextualSuggestion(aqiRow.aqi_value),
        };
      }
    } catch (e) {
      // AQI unavailable — non-blocking
      hubState.my_environment.contextual_suggestion = null;
    }

    return success("LungConnect Hub state resolved.", hubState, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung Home] GET error:", error);
    return failure("Failed to load LungConnect Hub: " + error.message, "hub_error", 500, {
      headers: corsHeaders,
    });
  }
}

function computeStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;
  const uniqueDays = [...new Set(
    sessions.map(s => new Date(s.created_at).toISOString().split("T")[0])
  )].sort((a, b) => new Date(b) - new Date(a));

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const day of uniqueDays) {
    const d = new Date(day);
    const diff = Math.round((cursor - d) / (1000 * 60 * 60 * 24));
    if (diff === 0 || diff === 1) {
      streak++;
      cursor = d;
    } else {
      break;
    }
  }
  return streak;
}

function getContextualSuggestion(aqi) {
  if (!aqi) return null;
  if (aqi <= 50) return "Air quality is Good today. Great conditions for outdoor walking and Move sessions.";
  if (aqi <= 100) return "Air quality is Satisfactory. Outdoor activity is generally suitable. Light precautions for sensitive individuals.";
  if (aqi <= 200) return "Air quality is Moderate. Consider indoor breathing exercises or limit prolonged outdoor exertion today.";
  if (aqi <= 300) return "Air quality is Poor. Indoor wellness sessions such as Breathing Studio are recommended today.";
  return "Air quality is Very Poor or Severe. Please keep windows closed and choose indoor breathing wellness sessions today.";
}
