/**
 * API: Offline Sync Cron Job
 *
 * POST /api/cron/offline-sync
 *
 * Processes the offline_queue table — replays any operations that were
 * captured while the client was offline or the network was degraded.
 *
 * Trigger: Vercel Cron / external scheduler
 * Recommended schedule: Every 5 minutes
 */

import { success, failure } from "@/lib/response";
import { processOfflineQueue } from "@/lib/layer1/offlineWorker";

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
        const results = await processOfflineQueue();
        const duration = Date.now() - startTime;

        return success("Offline sync completed", {
            results,
            execution_time_ms: duration,
            executed_at: new Date().toISOString(),
        });

    } catch (err) {
        console.error("POST /api/cron/offline-sync error:", err);
        return failure("Offline sync cron failed", err.message, 500);
    }
}
