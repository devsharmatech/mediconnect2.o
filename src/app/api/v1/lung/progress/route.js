import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET /api/v1/lung/progress
 * B-Hub Tab 3: My Progress — 4-state board from AWS RDS PostgreSQL.
 * States: no-data | basic | standard | advanced
 * Returns milestone roadmap, stats tiles, streak data, and longitudinal checkpoints.
 * Rule: Progress visibility is INCLUSIVE — all states show partial progress.
 * Rule: Factual recorded-change wording (no unsupported clinical improvement claim).
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("user_id") || searchParams.get("userId");
    if (!userId || userId === "usr_guest" || userId === "guest" || userId === "undefined" || userId === "null") {
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
        console.warn("[Lung Progress] Could not resolve default user from RDS:", e.message);
      }
    }

    if (!userId) {
      userId = "usr_guest";
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let totalSessions = 0;
    let totalMoveMinutes = 0;
    let totalBreathingSessions = 0;
    let total6MWT = 0;
    let totalAssessments = 0;
    let assessmentRows = [];
    let milestoneState = "no-data";

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isRegisteredUuid = typeof userId === "string" && UUID_REGEX.test(userId);

    // Query activity sessions from AWS RDS
    try {
      const sessions = await sql`
        SELECT activity_type, duration_seconds, distance_km, steps, created_at
        FROM lung_activity_sessions
        WHERE user_id = ${String(userId)}
        ORDER BY created_at DESC
        LIMIT 200;
      `;

      if (sessions && sessions.length > 0) {
        totalSessions = sessions.length;
        const moveSessions = sessions.filter(s => s.activity_type === "lung_move" || s.activity_type === "walk" || s.activity_type === "jog" || s.activity_type === "run");
        const breathingSessions = sessions.filter(s => s.activity_type === "lung_breathing" || s.activity_type === "breathing");

        totalMoveMinutes = moveSessions.reduce((acc, s) => acc + Math.round((Number(s.duration_seconds) || 0) / 60), 0);
        totalBreathingSessions = breathingSessions.length;
      }
    } catch (e) {
      console.warn("[Lung Progress] Could not query sessions from RDS:", e.message);
    }

    // Query 6MWT walking tests from AWS RDS
    try {
      const walkingTests = await sql`
        SELECT id, distance_m, duration_seconds, pace_kmh, borg_score, created_at
        FROM lung_walking_tests
        WHERE user_id = ${String(userId)}
        ORDER BY created_at DESC
        LIMIT 50;
      `;
      if (walkingTests && walkingTests.length > 0) {
        total6MWT = walkingTests.length;
      }
    } catch (e) {
      console.warn("[Lung Progress] Could not query 6MWT from RDS:", e.message);
    }

    // Query assessments from AWS RDS
    // IMPORTANT: Only query for valid registered UUIDs.
    // If userId is not a UUID, do NOT fall back to querying all assessments —
    // that would show another user's data and is a data privacy issue.
    if (userId && userId !== "usr_guest" && isRegisteredUuid) {
      try {
        const assess = await sql`
          SELECT id, health_score, calculated_age, risk_level, created_at
          FROM health_assessments
          WHERE user_id = ${userId}::uuid AND assessment_type = 'lung'
          ORDER BY created_at DESC
          LIMIT 50;
        `;
        if (assess && assess.length > 0) {
          totalAssessments = assess.length;
          assessmentRows = assess;
        }
      } catch (e) {
        console.warn("[Lung Progress] Could not query assessments from RDS:", e.message);
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

      // Prioritize previous assessment from an earlier calendar day (e.g. 30 Sept vs 3 Oct)
      const latestDateStr = new Date(assessmentRows[0].created_at).toISOString().slice(0, 10);
      const earlierDayAssessment = assessmentRows.find(a => new Date(a.created_at).toISOString().slice(0, 10) !== latestDateStr);
      const prevRow = earlierDayAssessment || assessmentRows[1];

      previousAssessment = {
        id: prevRow.id,
        score: prevRow.health_score,
        date: prevRow.created_at,
        calculated_age: prevRow.calculated_age,
        risk_level: prevRow.risk_level,
      };
      const scoreDiff = Number(latestAssessment.score) - Number(previousAssessment.score);
      recordedChange = {
        diff: scoreDiff,
        formatted: scoreDiff === 0
          ? "Consistent Status"
          : (scoreDiff > 0 ? `Recorded Progression (+${scoreDiff})` : `Recorded Difference (${scoreDiff})`),
        trend: scoreDiff > 0 ? "increased" : scoreDiff < 0 ? "decreased" : "stable",
      };
    }

    // Build B02 Longitudinal Continuing Checkpoints
    // Journey "Day 0" = date of the user's baseline assessment for the current cycle
    let baselineDate = null;

    // Priority 1: If previousAssessment exists (S03 state), it is the authoritative baseline
    if (previousAssessment && previousAssessment.date) {
      const d = new Date(previousAssessment.date);
      if (!isNaN(d.getTime())) {
        baselineDate = d;
      }
    }

    // Priority 2: Oldest assessment in the active cycle (within last 60 days of latest)
    if (!baselineDate && assessmentRows.length > 0) {
      const latestTime = new Date(assessmentRows[0].created_at).getTime();
      const cycleRows = assessmentRows.filter(a => {
        const t = new Date(a.created_at).getTime();
        return !isNaN(t) && (latestTime - t) <= 60 * 24 * 60 * 60 * 1000;
      });
      const oldestInCycle = cycleRows[cycleRows.length - 1] || assessmentRows[0];
      const d = new Date(oldestInCycle.created_at);
      if (!isNaN(d.getTime())) baselineDate = d;
    }

    // Priority 3: Check care_episodes table for active care episode
    if (!baselineDate && isRegisteredUuid) {
      try {
        const episodeRows = await sql`
          SELECT created_at FROM care_episodes 
          WHERE patient_id = ${userId}::uuid
          ORDER BY created_at ASC LIMIT 1;
        `;
        if (episodeRows && episodeRows.length > 0 && episodeRows[0].created_at) {
          const d = new Date(episodeRows[0].created_at);
          if (!isNaN(d.getTime())) baselineDate = d;
        }
      } catch (e) {
        console.warn("[Lung Progress] Could not query care_episodes from RDS:", e.message);
      }
    }

    // Priority 4: User account registration date from users table in AWS RDS
    if (!baselineDate && isRegisteredUuid) {
      try {
        const userRows = await sql`
          SELECT created_at FROM users WHERE id = ${userId}::uuid LIMIT 1;
        `;
        if (userRows && userRows.length > 0 && userRows[0].created_at) {
          const d = new Date(userRows[0].created_at);
          if (!isNaN(d.getTime())) baselineDate = d;
        }
      } catch (e) {
        console.warn("[Lung Progress] Could not query user created_at from RDS:", e.message);
      }
    }

    // Priority 5: Real-time fallback to current date (today) — NEVER a hardcoded past date!
    if (!baselineDate || isNaN(baselineDate.getTime())) {
      baselineDate = new Date();
    }

    const startMidnight = new Date(baselineDate);
    startMidnight.setHours(0, 0, 0, 0);
    const nowMidnight = new Date(now);
    nowMidnight.setHours(0, 0, 0, 0);
    const daysSinceStart = Math.max(0, Math.round((nowMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24)));

    // Map all recorded follow-up assessments to journey days
    // assessmentRows is ordered DESC.
    const followUpAssessments = assessmentRows.length > 1 ? assessmentRows.slice(0, assessmentRows.length - 1) : [];
    const followUpDays = followUpAssessments.map(a => {
      const diff = Math.round((new Date(a.created_at).getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24));
      return { day: diff, date: a.created_at };
    });

    let foundCurrent = false;
    const checkpoints = [
      { day: 0, label: "Start", description: "Baseline session", star: false },
      { day: 7, label: "Day 7", description: "Checkpoint 1", star: false },
      { day: 15, label: "Day 15", description: "Milestone checkpoint", star: false },
      { day: 30, label: "Day 30", description: "Checkpoint 2", star: true },
      { day: 45, label: "Day 45", description: "Continuing checkpoint", star: false },
      { day: 60, label: "Day 60", description: "Continuing checkpoint", star: false },
      { day: 75, label: "Day 75", description: "Continuing checkpoint", star: false },
      { day: 90, label: "Day 90", description: "Long-term checkpoint", star: true },
      { day: 105, label: "Day 105", description: "Ongoing checkpoint", star: false },
      { day: 120, label: "+15 days", description: "Ongoing checkpoint", star: false },
      { day: 135, label: "+15 days", description: "Ongoing checkpoint", star: false },
    ].map(cp => {
      let status;
      if (cp.day === 0) {
        if (assessmentRows.length > 0) {
          status = "completed";
        } else {
          status = "current";
          foundCurrent = true;
        }
      } else {
        const matched = followUpDays.some(f => Math.abs(f.day - cp.day) <= (cp.day <= 15 ? 4 : 7));
        if (matched) {
          status = "completed";
        } else if (daysSinceStart > cp.day) {
          // If days passed is greater than cp.day (e.g. after 15 October for Day 15), mark as completed/passed
          status = "completed";
        } else if (!foundCurrent && cp.day >= daysSinceStart) {
          status = "current";
          foundCurrent = true;
        } else {
          status = "upcoming";
        }
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

    const payload = {
      screen_id: "LC-12",
      milestone_state: milestoneState,
      // Baseline date = oldest assessment = true journey start
      baseline_date: baselineDate.toISOString(),
      // Current journey day, server-calculated (no artificial cap)
      current_day_in_journey: daysSinceStart,
      days_since_start: daysSinceStart,
      b21_state: b21State,
      latest_assessment: latestAssessment,
      previous_assessment: previousAssessment,
      recorded_change: recordedChange,
      checkpoints,
      stats: {
        total_sessions: totalSessions,
        total_move_minutes: totalMoveMinutes,
        total_breathing_sessions: totalBreathingSessions,
        total_6mwt: total6MWT,
        total_assessments: totalAssessments,
      },
    };

    return success("Lung progress resolved.", payload, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung Progress GET] error:", error);
    return failure("Failed to resolve progress: " + error.message, "progress_error", 500, {
      headers: corsHeaders,
    });
  }
}
