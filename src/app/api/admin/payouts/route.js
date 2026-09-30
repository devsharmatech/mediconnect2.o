import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

/**
 * GET /api/admin/payouts
 * Returns paginated provider_payout_ledger with summary stats from AWS RDS PostgreSQL.
 * Query params: page, limit, status (PENDING|SETTLED), provider_id
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page       = parseInt(searchParams.get("page") || "1");
    const limit      = parseInt(searchParams.get("limit") || "20");
    const status     = searchParams.get("status");
    const providerId = searchParams.get("provider_id");
    const offset     = (page - 1) * limit;

    let items = [];
    let total = 0;

    try {
      if (status && providerId) {
        items = await sql`
          SELECT p.*, u.un_id as provider_un_id, u.role as provider_role
          FROM provider_payout_ledger p
          LEFT JOIN users u ON u.id::text = p.provider_id::text
          WHERE p.status = ${status} AND p.provider_id = ${providerId}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM provider_payout_ledger
          WHERE status = ${status} AND provider_id = ${providerId}
        `;
        total = countRes[0]?.count || 0;
      } else if (status) {
        items = await sql`
          SELECT p.*, u.un_id as provider_un_id, u.role as provider_role
          FROM provider_payout_ledger p
          LEFT JOIN users u ON u.id::text = p.provider_id::text
          WHERE p.status = ${status}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM provider_payout_ledger
          WHERE status = ${status}
        `;
        total = countRes[0]?.count || 0;
      } else if (providerId) {
        items = await sql`
          SELECT p.*, u.un_id as provider_un_id, u.role as provider_role
          FROM provider_payout_ledger p
          LEFT JOIN users u ON u.id::text = p.provider_id::text
          WHERE p.provider_id = ${providerId}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM provider_payout_ledger
          WHERE provider_id = ${providerId}
        `;
        total = countRes[0]?.count || 0;
      } else {
        items = await sql`
          SELECT p.*, u.un_id as provider_un_id, u.role as provider_role
          FROM provider_payout_ledger p
          LEFT JOIN users u ON u.id::text = p.provider_id::text
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM provider_payout_ledger
        `;
        total = countRes[0]?.count || 0;
      }
    } catch (e) {
      console.warn("Could not query provider_payout_ledger from RDS:", e.message);
    }

    // Summary aggregations directly from AWS RDS
    let pendingCount = 0;
    let settledCount = 0;
    let totalPending = 0;
    let totalSettled = 0;
    let totalFees = 0;

    try {
      const summaryRows = await sql`
        SELECT 
          status,
          COUNT(*)::int as count,
          COALESCE(SUM(net_payout::numeric), 0) as total_net,
          COALESCE(SUM(platform_fee::numeric), 0) as total_fee
        FROM provider_payout_ledger
        GROUP BY status
      `;
      for (const row of summaryRows) {
        if (row.status === 'PENDING') {
          pendingCount = parseInt(row.count, 10);
          totalPending = parseFloat(row.total_net) || 0;
        }
        if (row.status === 'SETTLED') {
          settledCount = parseInt(row.count, 10);
          totalSettled = parseFloat(row.total_net) || 0;
        }
        totalFees += parseFloat(row.total_fee) || 0;
      }
    } catch {}

    const summary = {
      pending_count:       pendingCount,
      settled_count:       settledCount,
      total_pending:       totalPending,
      total_settled:       totalSettled,
      total_platform_fees: totalFees,
    };

    return success("Provider payout ledger fetched (AWS RDS)", {
      items: Array.isArray(items) ? items : [],
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      database: "AWS RDS PostgreSQL"
    });
  } catch (err) {
    console.error("GET /api/admin/payouts error:", err);
    return failure("Failed to fetch payouts", err.message, 500);
  }
}

/**
 * PATCH /api/admin/payouts
 * Body: { payout_id, razorpay_payout_id, admin_id, reason }
 * Marks a payout as SETTLED in AWS RDS PostgreSQL.
 */
export async function PATCH(req) {
  try {
    const { payout_id, razorpay_payout_id, admin_id, reason } = await req.json();

    if (!payout_id || !admin_id || !reason) {
      return failure("payout_id, admin_id, and reason are required", null, 400);
    }

    const updated = await sql`
      UPDATE provider_payout_ledger
      SET status = 'SETTLED',
          razorpay_payout_id = ${razorpay_payout_id || null},
          settled_at = NOW()
      WHERE id = ${payout_id} AND status = 'PENDING'
      RETURNING *
    `;

    if (!updated || updated.length === 0) {
      return failure("Payout not found, already settled, or update failed", null, 400);
    }

    // Log admin action in AWS RDS
    try {
      await sql`
        INSERT INTO admin_action_log (
          admin_id, action_type, target_table, target_id, reason, input_payload, status
        ) VALUES (
          ${admin_id}, 'SETTLE_PAYOUT', 'provider_payout_ledger', ${payout_id},
          ${reason}, ${JSON.stringify({ payout_id, razorpay_payout_id })}, 'SUCCESS'
        )
      `;
    } catch (e) {
      console.warn("Could not insert admin_action_log in RDS:", e.message);
    }

    return success("Payout marked as settled (AWS RDS)", { payout_id, status: "SETTLED" });
  } catch (err) {
    console.error("PATCH /api/admin/payouts error:", err);
    return failure("Failed to settle payout", err.message, 500);
  }
}
