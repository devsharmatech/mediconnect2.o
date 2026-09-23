import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("user_id") || searchParams.get("userId");
    if (userId === "guest" || userId === "undefined" || userId === "null") {
      userId = null;
    }

    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit")) || 20));
    const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
    const offset = (page - 1) * limit;

    // 1. Fetch from breathing_sessions
    let bQuery = supabase
      .from("breathing_sessions")
      .select("*")
      .neq("status", "CANCELLED")
      .order("created_at", { ascending: false });

    if (userId) {
      bQuery = bQuery.eq("user_id", userId);
    }

    const { data: bData, error: bError } = await bQuery.limit(100);
    if (bError) {
      console.warn("[Breathing API] breathing_sessions query warning:", bError.message);
    }

    // 2. Fetch from lung_activity_sessions (LungConnect Breathing Studio sessions)
    let lQuery = supabase
      .from("lung_activity_sessions")
      .select("*")
      .in("activity_type", ["lung_breathing", "breathing"])
      .order("created_at", { ascending: false });

    if (userId) {
      lQuery = lQuery.eq("user_id", userId);
    }

    const { data: lData, error: lError } = await lQuery.limit(100);
    if (lError) {
      console.warn("[Breathing API] lung_activity_sessions query warning:", lError.message);
    }

    // 3. Normalize records
    const normalizedBSessions = (bData || []).map((s) => ({
      id: s.id,
      user_id: s.user_id,
      session_type: s.session_type || "Breathing Exercise",
      duration_seconds: Number(s.duration_seconds) || 120,
      breaths_count: Number(s.breaths_count) || 7,
      calm_score: Number(s.calm_score) || 8,
      status: (s.status || "COMPLETED").toUpperCase(),
      created_at: s.created_at,
      source: "breathing_sessions",
    }));

    const normalizedLSessions = (lData || []).map((s) => ({
      id: s.id,
      user_id: s.user_id,
      session_type: s.title || s.breathing_preset || "Breathing Studio",
      duration_seconds: Number(s.duration_seconds) || (s.target_duration_minutes ? s.target_duration_minutes * 60 : 300),
      breaths_count: Number(s.cycles_completed) || Math.round((Number(s.duration_seconds) || 300) / 15),
      calm_score: s.calm_score ? (s.calm_score > 10 ? Math.round(s.calm_score / 10) : s.calm_score) : 8,
      status: (s.status || s.state || "COMPLETED").toUpperCase(),
      created_at: s.created_at,
      source: "lung_activity_sessions",
    }));

    // Dedup and sort descending
    const sessionMap = new Map();
    [...normalizedBSessions, ...normalizedLSessions].forEach((s) => {
      if (!sessionMap.has(s.id)) {
        sessionMap.set(s.id, s);
      }
    });

    const allSessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const totalCount = allSessions.length;
    const paginated = allSessions.slice(offset, offset + limit);

    // 4. Calculate stats across sessions
    const totalSessions = allSessions.length;
    const totalDurationSeconds = allSessions.reduce(
      (sum, s) => sum + (Number(s.duration_seconds) || 0),
      0
    );
    const avgCalmScore = totalSessions > 0
      ? Math.round(
          allSessions.reduce((sum, s) => sum + (Number(s.calm_score) || 0), 0) / totalSessions
        )
      : 0;
    const streak = calculateStreak(allSessions);

    const stats = {
      total_sessions: totalSessions,
      totalSessions: totalSessions,
      total_duration_minutes: Math.round(totalDurationSeconds / 60),
      totalMinutes: Math.round(totalDurationSeconds / 60),
      average_calm_score: avgCalmScore,
      averageCalmScore: avgCalmScore,
      current_streak: streak,
      currentStreak: streak,
    };

    return success(
      "Breathing sessions fetched successfully.",
      {
        sessions: paginated,
        stats,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("GET Breathing Sessions Error:", error);
    return failure("Failed to fetch breathing sessions. " + error.message, "fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const userId = body.user_id || body.userId;
    const sessionType = body.session_type || body.sessionType || "Box Breathing";
    const durationSeconds = Number(body.duration_seconds || body.durationSeconds || 120);
    const breathsCount = Number(body.breaths_count || body.breathsCount || 7);
    const calmScore = Number(body.calm_score || body.calmScore || 8);
    const status = (body.status || "COMPLETED").toUpperCase();

    if (!userId || !sessionType || !durationSeconds) {
      return failure("Missing required fields (user_id, session_type, duration_seconds)", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase
      .from("breathing_sessions")
      .insert([
        {
          user_id: userId,
          session_type: sessionType,
          duration_seconds: durationSeconds,
          breaths_count: breathsCount,
          calm_score: calmScore,
          status,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Check for badges asynchronously
    if (userId && userId !== "guest") {
      checkBreathingBadges(userId).catch((bErr) =>
        console.warn("Error awarding breathing badge:", bErr.message)
      );
    }

    return success("Breathing session recorded successfully.", data, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("POST Breathing Session Error:", error);
    return failure("Failed to record breathing session. " + error.message, "creation_failed", 500, {
      headers: corsHeaders,
    });
  }
}

function calculateStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;

  let streak = 0;
  const sessionDates = new Set(
    sessions.map((s) => new Date(s.created_at).toDateString())
  );

  let currentDate = new Date();
  // If no session today yet, check yesterday to preserve ongoing streak
  if (!sessionDates.has(currentDate.toDateString())) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (sessionDates.has(currentDate.toDateString())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

async function checkBreathingBadges(userId) {
  if (!userId || userId === "guest") return;

  const { data: sessions } = await supabase
    .from("breathing_sessions")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const totalSessions = sessions?.length || 0;
  const streak = calculateStreak(sessions);

  const badgesToAward = [];

  if (totalSessions >= 10) {
    badgesToAward.push({
      badge_name: "Breathing Beginner",
      badge_type: "lung",
      description: "Completed 10 breathing sessions",
    });
  }

  if (streak >= 7) {
    badgesToAward.push({
      badge_name: "Breathing Streak",
      badge_type: "lung",
      description: "7-day breathing exercise streak",
    });
  }

  for (const badge of badgesToAward) {
    const { data: existing } = await supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_name", badge.badge_name)
      .maybeSingle();

    if (!existing) {
      await supabase.from("user_badges").insert([
        {
          user_id: userId,
          ...badge,
          earned_at: new Date().toISOString(),
        },
      ]);
    }
  }
}