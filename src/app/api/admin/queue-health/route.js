export const dynamic = 'force-dynamic';
import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

async function safeCount(queryFn) {
  try {
    const res = await queryFn();
    return parseInt(res[0]?.count || 0, 10);
  } catch {
    return 0;
  }
}

/**
 * GET /api/admin/queue-health
 * Comprehensive health report for all Layer-111 queues powered directly by AWS RDS PostgreSQL.
 */
export async function GET() {
  try {
    const tenMinsAgo = new Date(Date.now() - 10 * 60000);

    const [
      outboxPending, outboxDelayed, outboxFailed,
      retryPending, retryProcessing, retryFailed,
      dlqTotal, dlqPayment, dlqUnreplayed,
      notifPending, notifFailed,
      p1Open, p2Open
    ] = await Promise.all([
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM l1_event_outbox WHERE status = 'PENDING'`),
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM l1_event_outbox WHERE status = 'PENDING' AND available_at < ${tenMinsAgo}`),
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM l1_event_outbox WHERE status = 'FAILED'`),
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM retry_queue WHERE status = 'pending'`),
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM retry_queue WHERE status = 'processing'`),
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM retry_queue WHERE status = 'failed'`),
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM dead_letter_queue`),
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM dead_letter_queue WHERE is_payment_event = true AND replayed = false`),
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM dead_letter_queue WHERE replayed = false`),
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM notification_queue WHERE status = 'PENDING'`),
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM (SELECT 1 FROM ops_incident_log WHERE priority = 'P1' AND status = 'OPEN' LIMIT 10) t`),
      safeCount(() => sql`SELECT COUNT(*)::int AS count FROM (SELECT 1 FROM ops_incident_log WHERE priority = 'P2' AND status = 'OPEN' LIMIT 10) t`)
    ]);

    // Last 5 worker execution runs from AWS RDS
    let workerLogs = [];
    try {
      workerLogs = await sql`
        SELECT * FROM worker_execution_log 
        ORDER BY run_at DESC 
        LIMIT 5
      `;
    } catch {}

    // Signal phase config from AWS RDS
    let signalPhases = [];
    try {
      signalPhases = await sql`
        SELECT * FROM signal_phase_config 
        ORDER BY phase ASC
      `;
    } catch {}

    // Determine overall system status
    let systemStatus = "HEALTHY";
    let statusMessage = "All systems operational.";

    if (outboxFailed > 0 || outboxDelayed > 5 || dlqPayment > 0 || p1Open > 0) {
      systemStatus = "DEGRADED";
      statusMessage = `Degraded: ${outboxDelayed} delayed outbox, ${outboxFailed} failed, ${p1Open} P1 incidents open.`;
    }

    if (outboxFailed > 20 || outboxDelayed > 50 || p1Open > 3) {
      systemStatus = "CRITICAL";
      statusMessage = "CRITICAL: Immediate intervention required.";

      // Auto-create P1 incident for critical queue state in AWS RDS
      if (outboxFailed > 20 || outboxDelayed > 50) {
        try {
          await sql`
            INSERT INTO ops_incident_log (priority, source, description, status)
            VALUES ('P1', 'QUEUE_MONITOR', ${`CRITICAL QUEUE FAILURE: ${outboxDelayed} delayed, ${outboxFailed} failed outbox events.`}, 'OPEN')
          `;
        } catch {}
      }
    }

    return success("Queue health report (AWS RDS)", {
      status:  systemStatus,
      message: statusMessage,
      outbox: {
        pending:  outboxPending,
        delayed:  outboxDelayed,
        failed:   outboxFailed,
      },
      retry_queue: {
        pending:    retryPending,
        processing: retryProcessing,
        failed:     retryFailed,
      },
      dead_letter_queue: {
        total:      dlqTotal,
        unreplayed: dlqUnreplayed,
        payment_critical: dlqPayment,
      },
      notifications: {
        pending: notifPending,
        failed:  notifFailed,
      },
      incidents: {
        p1_open: p1Open,
        p2_open: p2Open,
      },
      worker_logs:   Array.isArray(workerLogs) ? workerLogs : [],
      signal_phases: Array.isArray(signalPhases) ? signalPhases : [],
      last_check:    new Date().toISOString(),
      database:      "AWS RDS PostgreSQL"
    });
  } catch (err) {
    console.error("GET /api/admin/queue-health error:", err);
    return failure("Queue health check failed", err.message, 500);
  }
}
