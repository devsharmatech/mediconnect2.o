import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/cron/dropoff-engine
 * Scheduled task to detect funnel abandonment and adjust engagement state.
 * Expected to run every 15-30 minutes.
 */
export async function GET(req) {
    try {
        const now = new Date();
        // Look for items older than 30 mins, but less than 1 hour to avoid unbounded rescans
        const thirtyMinsAgo = new Date(now.getTime() - 30 * 60000).toISOString();
        const oneHourAgo = new Date(now.getTime() - 60 * 60000).toISOString();

        // 1. Detect Funnel Stalls (e.g., stuck at START or PAYMENT for > 30 mins)
        // In a real query, we'd find the MAX(stage) per care_episode_id
        // For simplicity here, we assume dropping off at payment step
        const { data: stalledFunnels } = await supabase
            .from("funnel_tracking_log")
            .select("care_episode_id, stage, created_at, care_episodes(patient_id)")
            .lt("created_at", thirtyMinsAgo)
            .gte("created_at", oneHourAgo)
            .limit(100);

        let dropoffsLogged = 0;

        if (stalledFunnels && stalledFunnels.length > 0) {
            // Group by care episode to find the latest
            const episodes = {};
            stalledFunnels.forEach(f => {
                if (!episodes[f.care_episode_id] || new Date(f.created_at) > new Date(episodes[f.care_episode_id].created_at)) {
                    episodes[f.care_episode_id] = f;
                }
            });

            for (const epId in episodes) {
                const latestLog = episodes[epId];
                const patientId = latestLog.care_episodes?.patient_id;

                if (!patientId) continue;

                // Check if they actually proceeded (maybe a later log exists outside our 1-hour window)
                const { data: newerLogs } = await supabase
                    .from("funnel_tracking_log")
                    .select("id")
                    .eq("care_episode_id", epId)
                    .gt("created_at", latestLog.created_at)
                    .limit(1);

                if (!newerLogs || newerLogs.length === 0) {
                    // It's a genuine drop-off
                    const terminalStages = ["COMPLETE", "CONSULTATION"]; // Assuming consultation means they are good
                    if (!terminalStages.includes(latestLog.stage)) {
                        
                        // 1. Log Signal
                        await supabase.from("service_signal_log").insert([{
                            user_id: patientId,
                            signal_code: `DROPOFF_AT_${latestLog.stage}`,
                            type: "DROPOFF",
                            confidence_score: 0.9,
                            metadata: { care_episode_id: epId }
                        }]);

                        // 2. Adjust Engagement Profile
                        await supabase.rpc('decrement_engagement_score', { 
                            user_uuid: patientId, 
                            amount: 5 
                        }).catch(() => {
                            // Fallback if RPC doesn't exist
                            supabase.from("user_engagement_profile")
                                .update({ last_state: "DROPOFF" })
                                .eq("user_id", patientId)
                                .then(() => {});
                        });

                        dropoffsLogged++;
                    }
                }
            }
        }

        return success("Drop-off engine executed successfully", {
            processed_episodes: stalledFunnels?.length || 0,
            dropoffs_logged: dropoffsLogged
        });

    } catch (err) {
        console.error("GET /api/cron/dropoff-engine error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
