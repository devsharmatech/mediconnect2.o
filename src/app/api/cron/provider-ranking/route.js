/**
 * API: Provider Ranking Batch Recompute (Cron)
 *
 * POST /api/cron/provider-ranking
 *
 * Recomputes rank_score for all active providers by aggregating
 * their event log. Should run nightly or weekly.
 *
 * Trigger: Vercel Cron / external scheduler
 * Recommended schedule: Every night at 2:00 AM
 */

import { success, failure } from "@/lib/response";
import { batchRecomputeAllRankings } from "@/lib/layer1/providerRanking";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req) {
    try {
        // Verify cron secret if configured
        if (CRON_SECRET) {
            const authHeader = req.headers.get("authorization");
            if (authHeader !== `Bearer ${CRON_SECRET}`) {
                return failure("Unauthorized", null, 401);
            }
        }

        const startTime = Date.now();
        const results   = await batchRecomputeAllRankings();
        const duration  = Date.now() - startTime;

        return success("Provider ranking recompute completed", {
            processed: results.processed,
            errors: results.errors,
            execution_time_ms: duration,
            executed_at: new Date().toISOString(),
        });

    } catch (err) {
        console.error("POST /api/cron/provider-ranking error:", err);
        return failure("Provider ranking cron failed", err.message, 500);
    }
}
