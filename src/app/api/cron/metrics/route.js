/**
 * API: Daily Metrics Cron Job
 *
 * POST /api/cron/metrics
 *
 * Runs the daily metrics aggregation to populate system_metrics_daily.
 * Calculates total consultations, completed consultations, and dropoff rate.
 *
 * Trigger: Vercel Cron / external scheduler
 * Recommended schedule: Once daily at 00:05 IST (just after midnight)
 */

import { success, failure } from "@/lib/response";
import { buildDailyMetrics } from "@/lib/layer1/metricsWorker";

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

        // Optionally allow specifying a date for backfill
        let forDate;
        try {
            const body = await req.json();
            forDate = body?.date || undefined;
        } catch {
            forDate = undefined; // no body or invalid JSON — default to today
        }

        const startTime = Date.now();
        const result = await buildDailyMetrics(forDate);
        const duration = Date.now() - startTime;

        return success("Daily metrics aggregation completed", {
            success: result,
            date: forDate || new Date().toISOString().split("T")[0],
            execution_time_ms: duration,
            executed_at: new Date().toISOString(),
        });

    } catch (err) {
        console.error("POST /api/cron/metrics error:", err);
        return failure("Metrics cron failed", err.message, 500);
    }
}
