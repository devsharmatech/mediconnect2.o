import { success, failure } from "@/lib/response";
import { replayDeadLetterItem } from "@/lib/layer1/retryWorker";

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
    ...restOpts,
  });
  return res;
}

/**
 * GET /api/admin/dlq
 * Returns paginated dead_letter_queue items with filter support.
 * Query params: page, limit, replayed, is_payment_event, event_type
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page          = parseInt(searchParams.get("page") || "1");
    const limit         = parseInt(searchParams.get("limit") || "20");
    const replayed      = searchParams.get("replayed");        // "true" | "false" | null
    const isPayment     = searchParams.get("is_payment_event"); // "true" | "false" | null
    const eventType     = searchParams.get("event_type");
    const offset        = (page - 1) * limit;

    let filters = `order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (replayed !== null && replayed !== "")       filters += `&replayed=eq.${replayed}`;
    if (isPayment !== null && isPayment !== "")     filters += `&is_payment_event=eq.${isPayment}`;
    if (eventType)                                  filters += `&event_type=eq.${eventType}`;

    // Fetch items
    const res = await dbFetch(`dead_letter_queue?${filters}`, {
      headers: { Prefer: "count=exact" },
    });
    const items = await res.json();
    const total = parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);

    // Summary counts
    const [pendingRes, paymentRes, replayedRes] = await Promise.all([
      dbFetch("dead_letter_queue?replayed=eq.false&select=id", { headers: { Prefer: "count=exact" } }),
      dbFetch("dead_letter_queue?is_payment_event=eq.true&replayed=eq.false&select=id", { headers: { Prefer: "count=exact" } }),
      dbFetch("dead_letter_queue?replayed=eq.true&select=id", { headers: { Prefer: "count=exact" } }),
    ]);
    const pendingTotal   = parseInt(pendingRes.headers.get("content-range")?.split("/")[1] || "0", 10);
    const paymentTotal   = parseInt(paymentRes.headers.get("content-range")?.split("/")[1] || "0", 10);
    const replayedTotal  = parseInt(replayedRes.headers.get("content-range")?.split("/")[1] || "0", 10);

    return success("Dead letter queue fetched", {
      items: Array.isArray(items) ? items : [],
      summary: { pending: pendingTotal, payment_events: paymentTotal, replayed: replayedTotal },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /api/admin/dlq error:", err);
    return failure("Failed to fetch DLQ", err.message, 500);
  }
}

/**
 * POST /api/admin/dlq
 * Body: { dlq_id, admin_id, reason }
 * Replays a dead letter item by re-enqueuing it to retry_queue.
 */
export async function POST(req) {
  try {
    const { dlq_id, admin_id, reason } = await req.json();

    if (!dlq_id || !admin_id || !reason) {
      return failure("dlq_id, admin_id, and reason are required", null, 400);
    }

    const result = await replayDeadLetterItem(dlq_id, admin_id);

    // Log admin action
    await dbFetch("admin_action_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        admin_id,
        action_type:     "REPLAY_DLQ",
        target_table:    "dead_letter_queue",
        reason,
        input_payload:   { dlq_id },
        result_payload:  result,
        status:          result.success ? "SUCCESS" : "FAILED",
      }]),
    });

    if (!result.success) return failure("Replay failed", result.error, 500);

    return success("DLQ item replayed successfully", { dlq_id, re_queued_action: result.re_queued_action });
  } catch (err) {
    console.error("POST /api/admin/dlq error:", err);
    return failure("Failed to replay DLQ item", err.message, 500);
  }
}
