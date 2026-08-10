import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

/**
 * GET/POST /api/cron/engagement-sync
 * Nightly engagement score recalibration job.
 *
 * Adjusts engagement & fatigue scores based on:
 * - Recent appointment activity (boosts engagement)
 * - Inactivity decay (reduces engagement score over time)
 * - Fatigue reset (resets fatigue for users with no recent pushes)
 *
 * Security: Requires CRON_SECRET header.
 */
export async function GET(req) {
  return await executeEngagementSync(req);
}

export async function POST(req) {
  return await executeEngagementSync(req);
}

async function executeEngagementSync(req) {
  const cronSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return failure("Unauthorized", "Invalid cron secret", 401);
  }

  console.log("[EngagementSync Cron] Starting nightly engagement recalibration...");
  const startedAt = Date.now();
  const stats = { decayed: 0, fatigue_reset: 0, boosted: 0, errors: [] };

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo   = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Boost engagement for users who booked an appointment in last 7 days
    const { data: recentBookings } = await supabase
      .from("appointments")
      .select("patient_id")
      .gte("created_at", sevenDaysAgo)
      .eq("status", "booked");

    const recentPatients = [...new Set((recentBookings || []).map(r => r.patient_id))];

    for (const userId of recentPatients) {
      try {
        const { data: profile } = await supabase
          .from("user_engagement_profile")
          .select("engagement_score")
          .eq("user_id", userId)
          .maybeSingle();

        const current = profile?.engagement_score ?? 50;
        const newScore = Math.min(100, current + 10); // +10 for recent booking

        await supabase
          .from("user_engagement_profile")
          .upsert({
            user_id: userId,
            engagement_score: newScore,
            last_action: "APPOINTMENT_BOOKED",
            updated_at: now.toISOString()
          }, { onConflict: "user_id" });

        stats.boosted++;
      } catch (e) {
        stats.errors.push({ user_id: userId, error: e.message });
      }
    }

    // 2. Decay engagement for users inactive > 7 days (not in recentPatients)
    const { data: allProfiles } = await supabase
      .from("user_engagement_profile")
      .select("user_id, engagement_score, fatigue_score, updated_at")
      .lt("updated_at", sevenDaysAgo);

    for (const profile of (allProfiles || [])) {
      try {
        const newEngagement = Math.max(0, (profile.engagement_score ?? 50) - 5);
        await supabase
          .from("user_engagement_profile")
          .update({ engagement_score: newEngagement, updated_at: now.toISOString() })
          .eq("user_id", profile.user_id);
        stats.decayed++;
      } catch (e) {
        stats.errors.push({ user_id: profile.user_id, error: e.message });
      }
    }

    // 3. Reset fatigue for users with no engagement decisions in last 24h
    const { data: recentDecisions } = await supabase
      .from("engagement_decision_log")
      .select("user_id")
      .gte("created_at", oneDayAgo);

    const recentDecisionUsers = new Set((recentDecisions || []).map(d => d.user_id));

    const { data: fatiguedProfiles } = await supabase
      .from("user_engagement_profile")
      .select("user_id, fatigue_score")
      .gt("fatigue_score", 0);

    for (const profile of (fatiguedProfiles || [])) {
      if (!recentDecisionUsers.has(profile.user_id)) {
        try {
          await supabase
            .from("user_engagement_profile")
            .update({ fatigue_score: 0, updated_at: now.toISOString() })
            .eq("user_id", profile.user_id);
          stats.fatigue_reset++;
        } catch (e) {
          stats.errors.push({ user_id: profile.user_id, error: e.message });
        }
      }
    }

    const duration = Date.now() - startedAt;
    console.log(`[EngagementSync Cron] Done in ${duration}ms:`, JSON.stringify(stats));

    return success("Engagement sync completed", { duration_ms: duration, ...stats });
  } catch (err) {
    console.error("[EngagementSync Cron] Fatal error:", err.message);
    return failure("Engagement sync failed", err.message, 500);
  }
}
