import { success, failure } from "@/lib/response";
import { replayDeadLetterItem } from "@/lib/layer1/retryWorker";
import sql from "@/lib/db";

/**
 * GET /api/admin/dlq
 * Returns paginated dead_letter_queue items from AWS RDS PostgreSQL.
 * Query params: page, limit, replayed, is_payment_event, event_type
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page          = parseInt(searchParams.get("page") || "1");
    const limit         = parseInt(searchParams.get("limit") || "20");
    const replayedParam = searchParams.get("replayed");
    const isPaymentParam = searchParams.get("is_payment_event");
    const eventType     = searchParams.get("event_type");
    const offset        = (page - 1) * limit;

    let items = [];
    let total = 0;

    try {
      if (replayedParam !== null && replayedParam !== "") {
        const isReplayed = replayedParam === 'true';
        items = await sql`
          SELECT * FROM dead_letter_queue
          WHERE replayed = ${isReplayed}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM dead_letter_queue
          WHERE replayed = ${isReplayed}
        `;
        total = countRes[0]?.count || 0;
      } else if (isPaymentParam !== null && isPaymentParam !== "") {
        const isPayment = isPaymentParam === 'true';
        items = await sql`
          SELECT * FROM dead_letter_queue
          WHERE is_payment_event = ${isPayment}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM dead_letter_queue
          WHERE is_payment_event = ${isPayment}
        `;
        total = countRes[0]?.count || 0;
      } else {
        items = await sql`
          SELECT * FROM dead_letter_queue
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM dead_letter_queue
        `;
        total = countRes[0]?.count || 0;
      }
    } catch (e) {
      console.warn("Could not query dead_letter_queue from RDS:", e.message);
    }

    // Summary counts directly from AWS RDS
    let pendingTotal = 0;
    let paymentTotal = 0;
    let replayedTotal = 0;

    try {
      const summaryRows = await sql`
        SELECT 
          replayed,
          is_payment_event,
          COUNT(*)::int as count
        FROM dead_letter_queue
        GROUP BY replayed, is_payment_event
      `;
      for (const row of summaryRows) {
        const c = parseInt(row.count, 10);
        if (row.replayed) {
          replayedTotal += c;
        } else {
          pendingTotal += c;
          if (row.is_payment_event) paymentTotal += c;
        }
      }
    } catch {}

    return success("Dead letter queue fetched (AWS RDS)", {
      items: Array.isArray(items) ? items : [],
      summary: { pending: pendingTotal, payment_events: paymentTotal, replayed: replayedTotal },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      database: "AWS RDS PostgreSQL"
    });
  } catch (err) {
    console.error("GET /api/admin/dlq error:", err);
    return failure("Failed to fetch DLQ", err.message, 500);
  }
}

/**
 * POST /api/admin/dlq
 * Body: { dlq_id, admin_id, reason }
 * Replays a dead letter item by re-enqueuing it in AWS RDS PostgreSQL.
 */
export async function POST(req) {
  try {
    const { dlq_id, admin_id, reason } = await req.json();

    if (!dlq_id || !admin_id || !reason) {
      return failure("dlq_id, admin_id, and reason are required", null, 400);
    }

    const result = await replayDeadLetterItem(dlq_id, admin_id);

    // Log admin action directly in AWS RDS
    try {
      await sql`
        INSERT INTO admin_action_log (
          admin_id, action_type, target_table, reason, input_payload, result_payload, status
        ) VALUES (
          ${admin_id}, 'REPLAY_DLQ', 'dead_letter_queue', ${reason},
          ${JSON.stringify({ dlq_id })},
          ${JSON.stringify(result)},
          ${result.success ? 'SUCCESS' : 'FAILED'}
        )
      `;
    } catch (e) {
      console.warn("Could not insert admin_action_log in RDS:", e.message);
    }

    if (!result.success) return failure("Replay failed", result.error, 500);

    return success("DLQ item replayed successfully (AWS RDS)", { dlq_id, re_queued_action: result.re_queued_action });
  } catch (err) {
    console.error("POST /api/admin/dlq error:", err);
    return failure("Failed to replay DLQ item", err.message, 500);
  }
}
