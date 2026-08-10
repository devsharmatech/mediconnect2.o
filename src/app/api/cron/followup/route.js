import { runAllFollowUpJobs } from "@/lib/layer1/followUpEngine";
import { success, failure } from "@/lib/response";

/**
 * GET/POST /api/cron/followup
 * Layer-111 Follow-Up Cron Job — driven by external cron scheduler (e.g. Vercel Cron)
 *
 * Runs three follow-up jobs in sequence:
 * 1. Day-3 / Day-7 reminders for pending follow-up commitments
 * 2. Pre-close re-engagement nudges (2 days before auto-close)
 * 3. Auto-close commitments exceeding the 14-day threshold
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized invocations.
 */
export async function GET(req) {
  return await executeFollowUp(req);
}

export async function POST(req) {
  return await executeFollowUp(req);
}

async function executeFollowUp(req) {
  // Secure cron — reject unauthorised callers
  const cronSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return failure("Unauthorized", "Invalid cron secret", 401);
  }

  console.log("[FollowUp Cron] Starting follow-up job batch...");
  const startedAt = Date.now();

  try {
    const results = await runAllFollowUpJobs();
    const duration = Date.now() - startedAt;

    console.log(`[FollowUp Cron] Completed in ${duration}ms:`, JSON.stringify(results));

    return success("Follow-up jobs executed successfully", {
      duration_ms: duration,
      reminders: results.reminders,
      nudges: results.nudges,
      auto_close: results.auto_close,
      total_errors: [
        ...(results.reminders?.errors || []),
        ...(results.nudges?.errors || []),
        ...(results.auto_close?.errors || [])
      ].length
    });
  } catch (err) {
    console.error("[FollowUp Cron] Fatal error:", err.message);
    return failure("Follow-up cron failed", err.message, 500);
  }
}
