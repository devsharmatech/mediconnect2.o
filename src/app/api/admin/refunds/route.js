import { success, failure } from "@/lib/response";
import { initiateRefund } from "@/lib/layer1/refundEngine";
import sql from "@/lib/db";

/**
 * GET /api/admin/refunds
 * Returns paginated refund_requests with summary counts from AWS RDS PostgreSQL.
 * Query params: page, limit, status (PENDING|PROCESSING|COMPLETED|FAILED), patient_id
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page      = parseInt(searchParams.get("page") || "1");
    const limit     = parseInt(searchParams.get("limit") || "20");
    const status    = searchParams.get("status");
    const patientId = searchParams.get("patient_id");
    const offset    = (page - 1) * limit;

    let items = [];
    let total = 0;

    try {
      if (status && patientId) {
        items = await sql`
          SELECT r.*, u.un_id as patient_un_id, u.role as patient_role
          FROM refund_requests r
          LEFT JOIN users u ON u.id::text = r.patient_id::text
          WHERE r.status = ${status} AND r.patient_id = ${patientId}
          ORDER BY r.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM refund_requests
          WHERE status = ${status} AND patient_id = ${patientId}
        `;
        total = countRes[0]?.count || 0;
      } else if (status) {
        items = await sql`
          SELECT r.*, u.un_id as patient_un_id, u.role as patient_role
          FROM refund_requests r
          LEFT JOIN users u ON u.id::text = r.patient_id::text
          WHERE r.status = ${status}
          ORDER BY r.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM refund_requests
          WHERE status = ${status}
        `;
        total = countRes[0]?.count || 0;
      } else if (patientId) {
        items = await sql`
          SELECT r.*, u.un_id as patient_un_id, u.role as patient_role
          FROM refund_requests r
          LEFT JOIN users u ON u.id::text = r.patient_id::text
          WHERE r.patient_id = ${patientId}
          ORDER BY r.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM refund_requests
          WHERE patient_id = ${patientId}
        `;
        total = countRes[0]?.count || 0;
      } else {
        items = await sql`
          SELECT r.*, u.un_id as patient_un_id, u.role as patient_role
          FROM refund_requests r
          LEFT JOIN users u ON u.id::text = r.patient_id::text
          ORDER BY r.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM refund_requests
        `;
        total = countRes[0]?.count || 0;
      }
    } catch (e) {
      console.warn("Could not query refund_requests from RDS:", e.message);
    }

    // Summary directly from AWS RDS
    let pendingCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let totalRefunded = 0;

    try {
      const summaryRows = await sql`
        SELECT 
          status,
          COUNT(*)::int as count,
          COALESCE(SUM(amount::numeric), 0) as total_amount
        FROM refund_requests
        GROUP BY status
      `;
      for (const row of summaryRows) {
        if (row.status === 'PENDING') pendingCount = parseInt(row.count, 10);
        if (row.status === 'COMPLETED') {
          completedCount = parseInt(row.count, 10);
          totalRefunded = parseFloat(row.total_amount) || 0;
        }
        if (row.status === 'FAILED') failedCount = parseInt(row.count, 10);
      }
    } catch {}

    const summary = {
      pending:        pendingCount,
      completed:      completedCount,
      failed:         failedCount,
      total_refunded: totalRefunded,
    };

    return success("Refund requests fetched (AWS RDS)", {
      items: Array.isArray(items) ? items : [],
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      database: "AWS RDS PostgreSQL"
    });
  } catch (err) {
    console.error("GET /api/admin/refunds error:", err);
    return failure("Failed to fetch refunds", err.message, 500);
  }
}

/**
 * POST /api/admin/refunds
 * Body: { patient_id, care_episode_id, consultation_id, original_payment_id, amount, reason, admin_id }
 * Manually triggers a refund via RefundEngine and logs to admin_action_log in AWS RDS.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { patient_id, care_episode_id, consultation_id, original_payment_id, amount, reason, admin_id } = body;

    if (!patient_id || !original_payment_id || !amount || !reason || !admin_id) {
      return failure("patient_id, original_payment_id, amount, reason, and admin_id are required", null, 400);
    }

    const result = await initiateRefund({
      patient_id,
      care_episode_id,
      consultation_id,
      original_payment_id,
      amount: parseFloat(amount),
      reason,
      initiated_by: `admin:${admin_id}`,
    });

    // Log admin action directly to AWS RDS PostgreSQL
    try {
      await sql`
        INSERT INTO admin_action_log (
          admin_id, action_type, target_table, reason, input_payload, result_payload, status
        ) VALUES (
          ${admin_id}, 'MANUAL_REFUND', 'refund_requests', ${reason},
          ${JSON.stringify({ patient_id, amount, original_payment_id })},
          ${JSON.stringify(result)},
          ${result.success ? 'SUCCESS' : 'FAILED'}
        )
      `;
    } catch (e) {
      console.warn("Could not insert admin_action_log in RDS:", e.message);
    }

    if (!result.success) return failure("Refund initiation failed", result.error, 500);

    return success("Refund initiated successfully", { refund_id: result.refund_id, amount: result.amount });
  } catch (err) {
    console.error("POST /api/admin/refunds error:", err);
    return failure("Failed to initiate refund", err.message, 500);
  }
}
