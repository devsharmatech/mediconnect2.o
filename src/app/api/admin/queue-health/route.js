export const dynamic = 'force-dynamic';
import { success, failure } from "@/lib/response";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function dbFetch(path, opts = {}) {
  const { headers, ...restOpts } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 
      apikey: SERVICE_KEY, 
      Authorization: `Bearer ${SERVICE_KEY}`, 
      "Content-Type": "application/json", 
      ...headers 
    },
    ...restOpts, cache: 'no-store',
  });
  return res;
}

async function getCount(path) {
  const res = await dbFetch(path, { headers: { Prefer: "count=exact" } });
  return parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);
}

/**
 * GET /api/admin/queue-health
 * Comprehensive health report for all Layer-111 queues.
 */
export async function GET() {
  try {
    const tenMinsAgo = new Date(Date.now() - 10 * 60000).toISOString();
    const oneDayAgo  = new Date(Date.now() - 24 * 60 * 60000).toISOString();

const [
      outboxPending, outboxDelayed, outboxFailed,
      retryPending, retryProcessing, retryFailed,
      dlqTotal, dlqPayment, dlqUnreplayed,
      notifPending, notifFailed,
      p1Open, p2Open
    ] = await Promise.all([
      getCount("l1_event_outbox?status=eq.PENDING&select=id"),
      getCount(`l1_event_outbox?status=eq.PENDING&available_at=lt.${tenMinsAgo}&select=id`),
      getCount("l1_event_outbox?status=eq.FAILED&select=id"),
      getCount("retry_queue?status=eq.pending&select=id"),
      getCount("retry_queue?status=eq.processing&select=id"),
      getCount("retry_queue?status=eq.failed&select=id"),
      getCount("dead_letter_queue?select=id"),
      getCount("dead_letter_queue?is_payment_event=eq.true&replayed=eq.false&select=id"),
      getCount("dead_letter_queue?replayed=eq.false&select=id"),
      getCount("notification_queue?status=eq.PENDING&select=id"),
      getCount("notification_queue?status=eq.FAILED&select=id"),
      getCount("ops_incident_log?priority=eq.P1&status=eq.OPEN&select=id"),
      getCount("ops_incident_log?priority=eq.P2&status=eq.OPEN&select=id")
    ]);

    // Last 5 worker execution runs
    const workerRes  = await dbFetch("worker_execution_log?order=run_at.desc&limit=5");
    const workerLogs = await workerRes.json().catch(() => []);

    // Signal phase config
    const signalRes   = await dbFetch("signal_phase_config?order=phase.asc");
    const signalPhases = await signalRes.json().catch(() => []);

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

      // Auto-create P1 incident for critical queue state
      if (outboxFailed > 20 || outboxDelayed > 50) {
        await dbFetch("ops_incident_log", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify([{
            priority:    "P1",
            source:      "QUEUE_MONITOR",
            description: `CRITICAL QUEUE FAILURE: ${outboxDelayed} delayed, ${outboxFailed} failed outbox events.`,
            status:      "OPEN",
          }]),
        }).then(null, () => {});
      }
    }

    return success("Queue health report", {
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
      last_check:    new Date().toISOString(), debug_url: SUPABASE_URL,
    });
  } catch (err) {
    console.error("GET /api/admin/queue-health error:", err);
    return failure("Queue health check failed", err.message, 500);
  }
}
