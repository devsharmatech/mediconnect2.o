/**
 * API: Retry Queue Cron Job
 * 
 * POST /api/cron/retry
 * 
 * Processes the retry queue for failed operations.
 * Uses exponential backoff: 5s → 30s → 2min → 10min
 * 
 * Trigger: Vercel Cron / external scheduler
 * Recommended schedule: Every 1-5 minutes
 */

import { success, failure } from "@/lib/response";
import { processRetryQueue } from "@/lib/layer1/retryWorker";

// Optional: Protect cron endpoint with a secret
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
        const results = await processRetryQueue();
        const duration = Date.now() - startTime;

        return success("Retry queue processed", {
            ...results,
            execution_time_ms: duration,
            executed_at: new Date().toISOString(),
        });

    } catch (err) {
        console.error("POST /api/cron/retry error:", err);
        return failure("Retry cron failed", err.message, 500);
    }
}
