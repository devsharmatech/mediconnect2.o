import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const limit = parseInt(searchParams.get("limit")) || 20;
    const page = parseInt(searchParams.get("page")) || 1;
    const offset = (page - 1) * limit;

    if (!userId) {
      return failure("User ID is required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const { data, count, error } = await supabase
      .from("breathing_sessions")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Calculate stats
    const stats = await calculateBreathingStats(userId);

    return success("Breathing sessions fetched successfully.", {
      sessions: data,
      stats,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    }, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("GET Breathing Sessions Error:", error);
    return failure("Failed to fetch breathing sessions. " + error.message, "fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}

export async function POST(req) {
  try {
    const {
      user_id,
      session_type,
      duration_seconds,
      breaths_count,
      calm_score,
    } = await req.json();

    if (!user_id || !session_type || !duration_seconds || !breaths_count) {
      return failure("Missing required fields", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase
      .from("breathing_sessions")
      .insert([
        {
          user_id,
          session_type,
          duration_seconds,
          breaths_count,
          calm_score,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Check for badges
    await checkBreathingBadges(user_id);

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

async function calculateBreathingStats(userId) {
  const { data: sessions } = await supabase
    .from("breathing_sessions")
    .select("created_at, duration_seconds, calm_score")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const totalSessions = sessions?.length || 0;
  const totalDuration = sessions?.reduce((sum, session) => sum + session.duration_seconds, 0) || 0;
  const avgCalmScore = sessions?.reduce((sum, session) => sum + (session.calm_score || 0), 0) / totalSessions || 0;
  const streak = calculateStreak(sessions);

  return {
    total_sessions: totalSessions,
    total_duration_minutes: Math.round(totalDuration / 60),
    average_calm_score: Math.round(avgCalmScore),
    current_streak: streak,
  };
}

function calculateStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;

  let streak = 0;
  const today = new Date().toDateString();
  const sessionDates = new Set(sessions.map(s => new Date(s.created_at).toDateString()));

  let currentDate = new Date();
  while (sessionDates.has(currentDate.toDateString())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

async function checkBreathingBadges(userId) {
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
      .single();

    if (!existing) {
      await supabase
        .from("user_badges")
        .insert([{ 
          user_id: userId, 
          ...badge,
          earned_at: new Date().toISOString() 
        }]);
    }
  }
}