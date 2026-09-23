import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET /api/v1/lung/progress
 * B-Hub Tab 3: My Progress — 4-state board.
 * States: no-data | basic | standard | advanced
 * Returns milestone roadmap, stats tiles, and streak data.
 * Rule: Progress visibility is INCLUSIVE — all states show partial progress.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("user_id") || searchParams.get("userId");
    if (!userId || userId === "usr_guest" || userId === "guest" || userId === "undefined" || userId === "null") {
      try {
        const { data: topLungSession } = await supabase
          .from("lung_activity_sessions")
          .select("user_id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (topLungSession?.user_id) {
          userId = topLungSession.user_id;
        } else {
          const { data: topAssessment } = await supabase
            .from("health_assessments")
            .select("user_id")
            .eq("assessment_type", "lung")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (topAssessment?.user_id) {
            userId = topAssessment.user_id;
          }
        }
      } catch (e) {
        console.warn("[Lung Progress] Could not resolve default user:", e.message);
      }
    }

    if (!userId) {
      userId = "usr_guest";
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    let totalSessions = 0;
    let totalMoveMinutes = 0;
    let totalBreathingSessions = 0;
    let total6MWT = 0;
    let totalAssessments = 0;
    let best6MWTDistance = null;
    let streak = 0;
    let milestoneState = "no-data";
    let weeklyMoveMins = 0;
    let allSessions = [];

    // Query activity logs from lung_activity_sessions
    try {
      const { data: sessions, error: sessErr } = await supabase
        .from("lung_activity_sessions")
        .select("activity_type, duration_seconds, target_duration_minutes, distance_km, created_at")
        .eq("user_id", userId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false });

      if (!sessErr && sessions) {
        allSessions = sessions;
        totalSessions = sessions.length;

        const moveSessions = sessions.filter(s => s.activity_type === "walk" || s.activity_type === "jog" || s.activity_type === "run" || s.activity_type === "lung_move");
        const breathing = sessions.filter(s => s.activity_type === "lung_breathing" || s.activity_type === "breathing");

        totalMoveMinutes = moveSessions.reduce((acc, s) => acc + Math.round((Number(s.duration_seconds) || 0) / 60), 0);
        totalBreathingSessions = breathing.length;

        weeklyMoveMins = moveSessions
          .filter(s => new Date(s.created_at) >= new Date(sevenDaysAgo))
          .reduce((acc, s) => acc + Math.round((Number(s.duration_seconds) || 0) / 60), 0);

        streak = computeStreak(sessions);
      }
    } catch (e) {
      console.warn("[Lung Progress] Could not query lung_activity_sessions:", e.message);
    }

    // Query 6MWT walking tests
    try {
      const { data: walkingTests, error: wtErr } = await supabase
        .from("lung_walking_tests")
        .select("distance_m, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!wtErr && walkingTests) {
        total6MWT = walkingTests.length;
        const distances = walkingTests.map(s => Number(s.distance_m)).filter(Boolean);
        if (distances.length > 0) best6MWTDistance = Math.max(...distances);
      }
    } catch (e) {
      console.warn("[Lung Progress] Could not query lung_walking_tests:", e.message);
    }

    // Query assessments for B21 State Machine (only for valid UUID users)
    let assessmentRows = [];
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isRegisteredUuid = typeof userId === "string" && UUID_REGEX.test(userId);

    if (isRegisteredUuid) {
      try {
        const { data: assess, error: assessErr } = await supabase
          .from("health_assessments")
          .select("id, health_score, calculated_age, risk_level, created_at, recommendations")
          .eq("user_id", userId)
          .eq("assessment_type", "lung")
          .order("created_at", { ascending: false });

        if (!assessErr && assess) {
          assessmentRows = assess;
          totalAssessments = assess.length;
        }
      } catch (e) {
        console.warn("[Lung Progress] Could not query assessments:", e.message);
      }
    }

    // Authoritative B21 / B01 State Resolution
    // S01: 0 valid assessments
    // S02: 1 valid assessment (baseline)
    // S03: 2+ valid assessments (with recorded change)
    // S04: unavailable / invalidated
    let b21State = "S01";
    let latestAssessment = null;
    let previousAssessment = null;
    let recordedChange = null;

    if (totalAssessments === 0) {
      b21State = "S01";
    } else if (totalAssessments === 1) {
      b21State = "S02";
      latestAssessment = {
        id: assessmentRows[0].id,
        score: assessmentRows[0].health_score,
        date: assessmentRows[0].created_at,
        calculated_age: assessmentRows[0].calculated_age,
        risk_level: assessmentRows[0].risk_level,
        is_baseline: true,
      };
    } else if (totalAssessments >= 2) {
      b21State = "S03";
      latestAssessment = {
        id: assessmentRows[0].id,
        score: assessmentRows[0].health_score,
        date: assessmentRows[0].created_at,
        calculated_age: assessmentRows[0].calculated_age,
        risk_level: assessmentRows[0].risk_level,
      };
      previousAssessment = {
        id: assessmentRows[1].id,
        score: assessmentRows[1].health_score,
        date: assessmentRows[1].created_at,
        calculated_age: assessmentRows[1].calculated_age,
        risk_level: assessmentRows[1].risk_level,
      };
      const scoreDiff = Number(latestAssessment.score) - Number(previousAssessment.score);
      recordedChange = {
        diff: scoreDiff,
        formatted: `${scoreDiff >= 0 ? "+" : ""}${scoreDiff} points`,
        trend: scoreDiff > 0 ? "improved" : scoreDiff < 0 ? "declined" : "stable",
      };
    }

    // Build B02 Longitudinal Continuing Checkpoints
    let firstActivityDate = assessmentRows.length > 0
      ? new Date(assessmentRows[assessmentRows.length - 1].created_at)
      : (allSessions.length > 0 ? new Date(allSessions[allSessions.length - 1].created_at) : new Date("2026-09-04T00:00:00Z"));
    
    if (isNaN(firstActivityDate.getTime()) || firstActivityDate.getFullYear() < 2026) {
      firstActivityDate = new Date("2026-09-04T00:00:00Z");
    }
    
    const daysSinceStart = Math.max(0, Math.floor((new Date() - firstActivityDate) / (1000 * 60 * 60 * 24)));

    let foundCurrent = false;
    const checkpoints = [
      { day: 0, label: "Start", description: "Start your journey", star: false },
      { day: 7, label: "Day 7", description: "Checkpoint 1", star: false },
      { day: 15, label: "Day 15", description: "Next milestone", star: false },
      { day: 30, label: "Day 30", description: "Checkpoint 2", star: true },
      { day: 45, label: "Day 45", description: "Upcoming checkpoint", star: false },
      { day: 60, label: "Day 60", description: "Upcoming checkpoint", star: false },
      { day: 75, label: "Day 75", description: "Upcoming checkpoint", star: false },
      { day: 90, label: "Day 90", description: "Long-term milestone", star: true },
      { day: 105, label: "+15 days", description: "Continuing your journey", star: false },
      { day: 120, label: "+15 days", description: "Continuing your journey", star: false },
      { day: 135, label: "+15 days", description: "Continuing your journey", star: false },
    ].map(cp => {
      let status = "upcoming";
      if (daysSinceStart >= cp.day) {
        status = "completed";
      } else if (!foundCurrent && daysSinceStart < cp.day) {
        status = "current";
        foundCurrent = true;
      }
      return { ...cp, status };
    });

    // Determine milestone state
    if (totalSessions === 0 && totalAssessments === 0) {
      milestoneState = "no-data";
    } else if (totalSessions < 5 || totalAssessments === 0) {
      milestoneState = "basic";
    } else if (totalSessions < 20 || total6MWT === 0) {
      milestoneState = "standard";
    } else {
      milestoneState = "advanced";
    }

    // Build milestone roadmap
    const milestones = buildMilestoneRoadmap(totalSessions, totalAssessments, total6MWT, totalBreathingSessions, streak, best6MWTDistance);

    // Tiles
    const tiles = [
      { id: "move_minutes", label: "Move Minutes (30d)", value: Math.round(totalMoveMinutes), unit: "min", icon: "move", trend: weeklyMoveMins >= 150 ? "on_track" : "below_target", target: 150, target_period: "week" },
      { id: "breathing_sessions", label: "Breathing Sessions (30d)", value: totalBreathingSessions, unit: "sessions", icon: "breathing", trend: totalBreathingSessions >= 10 ? "on_track" : "building" },
      { id: "streak", label: "Current Streak", value: streak, unit: "days", icon: "streak" },
      { id: "best_6mwt", label: "Best 6MWT Distance", value: best6MWTDistance ? `${best6MWTDistance}m` : "—", unit: null, icon: "6mwt" },
      { id: "assessments", label: "Assessments Completed", value: totalAssessments, unit: null, icon: "assessment" },
    ];

    return success("Lung progress data loaded.", {
      b21_state: b21State,
      state: milestoneState,
      latest_assessment: latestAssessment,
      previous_assessment: previousAssessment,
      recorded_change: recordedChange,
      checkpoints,
      current_day_in_journey: daysSinceStart,
      stats: {
        total_sessions_30d: totalSessions,
        total_move_minutes_30d: Math.round(totalMoveMinutes),
        total_breathing_sessions_30d: totalBreathingSessions,
        total_6mwt_30d: total6MWT,
        total_assessments: totalAssessments,
        best_6mwt_distance_m: best6MWTDistance,
        streak_days: streak,
        weekly_move_minutes: Math.round(weeklyMoveMins),
        weekly_target_minutes: 150,
      },
      tiles,
      milestones,
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung Progress] GET error:", error);
    return failure("Failed to load progress: " + error.message, "progress_error", 500, { headers: corsHeaders });
  }
}

function computeStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;
  const uniqueDays = [...new Set(sessions.map(s => new Date(s.created_at).toISOString().split("T")[0]))]
    .sort((a, b) => new Date(b) - new Date(a));

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const day of uniqueDays) {
    const d = new Date(day);
    const diff = Math.round((cursor - d) / (1000 * 60 * 60 * 24));
    if (diff === 0 || diff === 1) {
      streak++;
      cursor = d;
    } else break;
  }
  return streak;
}

function buildMilestoneRoadmap(totalSessions, totalAssessments, total6MWT, totalBreathingSessions, streak, best6MWT) {
  return [
    { id: "m1", label: "First Steps", description: "Complete your first Lung Assessment", achieved: totalAssessments >= 1, progress: Math.min(totalAssessments, 1), target: 1, icon: "assessment" },
    { id: "m2", label: "Breath Starter", description: "Complete 3 Breathing Studio sessions", achieved: totalBreathingSessions >= 3, progress: Math.min(totalBreathingSessions, 3), target: 3, icon: "breathing" },
    { id: "m3", label: "Mover", description: "Log 5 Lung Move sessions", achieved: totalSessions >= 5, progress: Math.min(totalSessions, 5), target: 5, icon: "move" },
    { id: "m4", label: "Walker", description: "Complete your first 6-Minute Walk Test", achieved: total6MWT >= 1, progress: Math.min(total6MWT, 1), target: 1, icon: "6mwt" },
    { id: "m5", label: "Consistent Breather", description: "Reach a 7-day wellness streak", achieved: streak >= 7, progress: Math.min(streak, 7), target: 7, icon: "streak" },
    { id: "m6", label: "Lung Champion", description: "Log 500m+ in a 6MWT session", achieved: (best6MWT || 0) >= 500, progress: best6MWT ? Math.min(best6MWT, 500) : 0, target: 500, icon: "trophy" },
    { id: "m7", label: "Wellness Regular", description: "Complete 20 total lung wellness sessions", achieved: totalSessions >= 20, progress: Math.min(totalSessions, 20), target: 20, icon: "star" },
    { id: "m8", label: "All-Round Lung Warrior", description: "Complete assessments, all activity types, and a 7-day streak", achieved: totalAssessments >= 1 && total6MWT >= 1 && totalBreathingSessions >= 5 && totalSessions >= 10 && streak >= 7, progress: [totalAssessments >= 1, total6MWT >= 1, totalBreathingSessions >= 5, totalSessions >= 10, streak >= 7].filter(Boolean).length, target: 5, icon: "warrior" },
  ];
}
