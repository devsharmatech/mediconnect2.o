import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET /api/v1/lung/home
 * LungConnect (LC-18) Hub State API from AWS RDS PostgreSQL.
 * Aggregates state across 4 Hub groups:
 * Group 1: My Health (Assessment, latest score, lung age, report)
 * Group 2: My Activities (Breathing Studio, Lung Move, 6MWT summary)
 * Group 3: My Environment (AQI sidecar, contextual suggestion)
 * Group 4: My Care & Services (Care Episode, downstream care handoffs)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("user_id") || searchParams.get("userId");
    if (userId === "usr_guest" || userId === "guest" || userId === "undefined" || userId === "null") {
      userId = null;
    }

    // Resolve top user with lung records if not provided
    if (!userId) {
      try {
        const topUser = await sql`
          SELECT user_id, count(*) as count
          FROM health_assessments
          WHERE assessment_type = 'lung'
          GROUP BY user_id
          ORDER BY count DESC
          LIMIT 1;
        `;
        if (topUser && topUser.length > 0 && topUser[0].user_id) {
          userId = topUser[0].user_id;
        }
      } catch (e) {
        console.warn("[Lung Home] Could not resolve top user from RDS:", e.message);
      }
    }

    // Base Hub state structure
    const hubState = {
      screen_id: "LC-18",
      version: "3.0",
      user_id: userId || "usr_guest",
      state: "empty", // 'empty' | 'partial' | 'populated'
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
        aqi_location: "New Delhi",
        aqi_last_updated: null,
        aqi_source: "CPCB / OpenAQ",
        aqi_stale: false,
        weather: null,
        contextual_suggestion: null,
      },
      my_care_services: {
        has_active_episode: false,
        care_episode_id: null,
        telemedicine_eligible: true,
        prescriptions_available: false,
        nursing_eligible: true,
        devices_connected: 0,
        governed_ai: false,
        future_subscription: false,
      },
    };

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isRegisteredUuid = typeof userId === "string" && UUID_REGEX.test(userId);

    // Resolve Care Episode from AWS RDS
    if (userId) {
      try {
        let episodes = [];
        if (isRegisteredUuid) {
          episodes = await sql`
            SELECT id, episode_id, status, created_at, service_type
            FROM care_episodes
            WHERE patient_id = ${userId}::uuid
            ORDER BY (CASE WHEN service_type = 'lungconnect' THEN 1 ELSE 2 END), created_at DESC
            LIMIT 1;
          `;
        } else {
          episodes = await sql`
            SELECT id, episode_id, status, created_at, service_type
            FROM care_episodes
            WHERE (patient_id = ${String(userId)} OR episode_id = ${String(userId)})
            ORDER BY (CASE WHEN service_type = 'lungconnect' THEN 1 ELSE 2 END), created_at DESC
            LIMIT 1;
          `;
        }

        if (episodes && episodes.length > 0) {
          const episode = episodes[0];
          hubState.care_episode = {
            id: episode.id,
            episode_id: episode.episode_id || `LCE-${episode.id}`,
            status: episode.status,
            created_at: episode.created_at,
          };
          hubState.my_care_services.has_active_episode = episode.status === "ACTIVE" || episode.status === "active";
          hubState.my_care_services.care_episode_id = episode.episode_id || String(episode.id);
        }
      } catch (e) {
        console.warn("[Lung Home] Could not resolve care episode from RDS:", e.message);
      }

      // My Health — latest lung assessment from AWS RDS
      // Only query if valid UUID to prevent data leakage
      try {
        let assessments = [];
        let totalAssessments = 0;

        if (isRegisteredUuid) {
          assessments = await sql`
            SELECT ha.id, ha.created_at, ha.health_score, ha.calculated_age, ha.risk_level,
                   lhi.lung_age
            FROM health_assessments ha
            LEFT JOIN lung_health_inputs lhi ON ha.id = lhi.assessment_id
            WHERE ha.user_id = ${userId}::uuid AND ha.assessment_type = 'lung'
            ORDER BY ha.created_at DESC
            LIMIT 1;
          `;
          const countRes = await sql`
            SELECT count(*)::int as cnt
            FROM health_assessments
            WHERE user_id = ${userId}::uuid AND assessment_type = 'lung';
          `;
          totalAssessments = countRes[0]?.cnt || (assessments.length > 0 ? 1 : 0);
        }

        if (assessments && assessments.length > 0) {
          const latest = assessments[0];
          hubState.my_health = {
            latest_assessment: latest.id,
            total_assessments: totalAssessments,
            latest_score: latest.health_score ?? null,
            latest_risk: latest.risk_level ?? null,
            latest_lung_age: latest.calculated_age ?? latest.lung_age ?? null,
            assessment_date: latest.created_at,
          };
          hubState.state = "partial";
        }
      } catch (e) {
        console.warn("[Lung Home] Could not query assessments from RDS:", e.message);
      }
    }

    // My Activities — Move & Breathing sessions from lung_activity_sessions & lung_walking_tests in AWS RDS
    if (userId) {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [allSessions, walkingTests] = await Promise.all([
          sql`
            SELECT activity_type, duration_seconds, created_at, distance_km
            FROM lung_activity_sessions
            WHERE user_id = ${String(userId)} AND created_at >= ${thirtyDaysAgo}::timestamptz
            ORDER BY created_at DESC
            LIMIT 100;
          `,
          sql`
            SELECT distance_m, created_at
            FROM lung_walking_tests
            WHERE user_id = ${String(userId)}
            ORDER BY created_at DESC
            LIMIT 50;
          `
        ]);

        if ((allSessions && allSessions.length > 0) || (walkingTests && walkingTests.length > 0)) {
          const moveSessions = allSessions.filter(s => s.activity_type === "lung_move" || s.activity_type === "walk" || s.activity_type === "jog" || s.activity_type === "run");
          const breathingSessions = allSessions.filter(s => s.activity_type === "lung_breathing" || s.activity_type === "breathing");

          const weeklyMove = moveSessions
            .filter(s => new Date(s.created_at) >= new Date(sevenDaysAgo))
            .reduce((acc, s) => acc + Math.round((Number(s.duration_seconds) || 0) / 60), 0);

          const latest6mwt = walkingTests[0];

          // Combine timestamps for streak calculation
          const allActivityDates = [...(allSessions || []), ...(walkingTests || [])];

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
        console.warn("[Lung Home] Could not query activity sessions from RDS:", e.message);
      }
    }

    // AQI — query from aqi_cache table in AWS RDS
    try {
      const aqiRows = await sql`
        SELECT * FROM aqi_cache
        ORDER BY fetched_at DESC
        LIMIT 1;
      `;

      if (aqiRows && aqiRows.length > 0) {
        const aqiRow = aqiRows[0];
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
