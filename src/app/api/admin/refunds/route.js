import { success, failure } from "@/lib/response";
import { initiateRefund, processRefund } from "@/lib/layer1/refundEngine";
import { createLedgerEntry } from "@/lib/layer1/financialLedger";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/refunds
 * Returns paginated refund_requests with rich patient details & summary counts from AWS RDS PostgreSQL.
 * Query params: page, limit, status, patient_id, search, date_filter
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page       = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit      = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const status     = searchParams.get("status")?.trim();
    const patientId  = searchParams.get("patient_id")?.trim();
    const search     = searchParams.get("search")?.trim();
    const dateFilter = searchParams.get("date_filter")?.trim();
    const offset     = (page - 1) * limit;

    let items = [];
    let total = 0;

    try {
      // Build dynamic query
      let whereClauses = [];

      if (status) {
        whereClauses.push(sql`r.status = ${status}`);
      }

      if (patientId) {
        whereClauses.push(sql`r.patient_id = ${patientId}`);
      }

      if (search) {
        const pattern = `%${search}%`;
        whereClauses.push(sql`(
          r.original_payment_id ILIKE ${pattern}
          OR r.razorpay_refund_id ILIKE ${pattern}
          OR r.reason ILIKE ${pattern}
          OR pd.full_name ILIKE ${pattern}
          OR u.un_id::text ILIKE ${pattern}
          OR u.phone_number ILIKE ${pattern}
        )`);
      }

      if (dateFilter) {
        const now = new Date();
        let fromDate = new Date();
        if (dateFilter === "today") {
          fromDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === "7days") {
          fromDate.setDate(now.getDate() - 7);
        } else if (dateFilter === "30days") {
          fromDate.setDate(now.getDate() - 30);
        }
        if (dateFilter !== "all") {
          whereClauses.push(sql`r.created_at >= ${fromDate.toISOString()}`);
        }
      }

      const whereSql = whereClauses.length > 0 
        ? sql`WHERE ${whereClauses.reduce((acc, clause) => sql`${acc} AND ${clause}`)}`
        : sql``;

      items = await sql`
        SELECT 
          r.*,
          u.un_id as patient_un_id,
          u.role as patient_role,
          COALESCE(pd.full_name, 'Patient #' || u.un_id) as patient_name,
          u.phone_number as patient_phone
        FROM refund_requests r
        LEFT JOIN users u ON u.id::text = r.patient_id::text
        LEFT JOIN patient_details pd ON pd.id::text = r.patient_id::text
        ${whereSql}
        ORDER BY r.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countRes = await sql`
        SELECT COUNT(*)::int as count 
        FROM refund_requests r
        LEFT JOIN users u ON u.id::text = r.patient_id::text
        LEFT JOIN patient_details pd ON pd.id::text = r.patient_id::text
        ${whereSql}
      `;
      total = countRes[0]?.count || 0;

    } catch (e) {
      console.warn("Could not query refund_requests from RDS:", e.message);
    }

    // Summary directly from AWS RDS
    let pendingCount = 0;
    let processingCount = 0;
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
        if (row.status === 'PROCESSING') processingCount = parseInt(row.count, 10);
        if (row.status === 'COMPLETED') {
          completedCount = parseInt(row.count, 10);
          totalRefunded = parseFloat(row.total_amount) || 0;
        }
        if (row.status === 'FAILED') failedCount = parseInt(row.count, 10);
      }
    } catch {}

    const summary = {
      pending:        pendingCount,
      processing:     processingCount,
      completed:      completedCount,
      failed:         failedCount,
      total_refunded: totalRefunded,
    };

    return success("Refund requests fetched (AWS RDS)", {
      items: Array.isArray(items) ? items : [],
      summary,
      pagination: { 
        page, 
        limit, 
        total, 
        totalPages: Math.ceil(total / limit) 
      },
      database: "AWS RDS PostgreSQL"
    });
  } catch (err) {
    console.error("GET /api/admin/refunds error:", err);
    return failure("Failed to fetch refunds", err.message, 500);
  }
}

/**
 * POST /api/admin/refunds
 * Body: { 
 *   patient_id, 
 *   care_episode_id, 
 *   consultation_id, 
 *   original_payment_id, 
 *   amount, 
 *   reason, 
 *   admin_id,
 *   channel: 'GATEWAY' | 'OFFLINE_BANK',
 *   offline_reference,
 *   notes
 * }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      patient_id, 
      care_episode_id, 
      consultation_id, 
      original_payment_id, 
      amount, 
      reason, 
      admin_id = "admin",
      channel = "GATEWAY",
      offline_reference = "",
      notes = ""
    } = body;

    if (!patient_id || !original_payment_id || !amount || !reason) {
      return failure("patient_id, original_payment_id, amount, and reason are required", null, 400);
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return failure("Invalid refund amount", null, 400);
    }

    // 1. OFFLINE / DIRECT BANK TRANSFER MODE
    if (channel === "OFFLINE_BANK" || channel === "MANUAL") {
      const utrRef = offline_reference || `MANUAL-${Date.now().toString().slice(-6)}`;
      
      const rows = await sql`
        INSERT INTO refund_requests (
          patient_id, care_episode_id, consultation_id, original_payment_id,
          amount, reason, status, initiated_by, processed_at, gateway_response
        ) VALUES (
          ${patient_id}, 
          ${care_episode_id || null}, 
          ${consultation_id || null},
          ${original_payment_id}, 
          ${numericAmount},
          ${reason}, 
          'COMPLETED', 
          ${`admin:${admin_id}`},
          NOW(), 
          ${JSON.stringify({
            mode: "OFFLINE_BANK",
            utr_reference: utrRef,
            notes: notes || "Direct bank transfer / manual reconciliation",
            reconciled_by: admin_id
          })}
        )
        RETURNING *
      `;

      const newRecord = rows[0];

      // Record in financial ledger
      try {
        await createLedgerEntry({
          patient_id,
          care_episode_id: care_episode_id || null,
          service_type: 'refund',
          reference_id: consultation_id || newRecord.id,
          debit_credit: 'debit',
          amount: numericAmount,
          payment_mode: 'manual_neft',
          payment_gateway_id: utrRef,
          status: 'success',
          description: `Refund processed (Ref: ${utrRef}) - Reason: ${reason}`
        });
      } catch (ledgerErr) {
        console.warn("Could not write financial ledger entry for refund:", ledgerErr.message);
      }

      // Record in admin action log
      try {
        await sql`
          INSERT INTO admin_action_log (
            admin_id, action_type, target_table, reason, input_payload, result_payload, status
          ) VALUES (
            ${admin_id}, 'MANUAL_REFUND_OFFLINE', 'refund_requests', ${reason},
            ${JSON.stringify({ patient_id, amount: numericAmount, original_payment_id, utr: utrRef })},
            ${JSON.stringify({ refund_id: newRecord.id, status: 'COMPLETED' })},
            'SUCCESS'
          )
        `;
      } catch {}

      // Notify patient
      try {
        await sql`
          INSERT INTO notifications (
            user_id, title, message, type, metadata
          ) VALUES (
            ${patient_id}, 'Refund Processed',
            ${`Your refund of ₹${numericAmount} has been processed via bank transfer (Ref: ${utrRef}).`},
            'refund_success',
            ${JSON.stringify({ refund_id: newRecord.id, amount: numericAmount, reason, utr: utrRef })}
          )
        `;
      } catch {}

      return success("Refund processed and recorded successfully", {
        refund_id: newRecord.id,
        amount: numericAmount,
        status: "COMPLETED",
        reference: utrRef
      });
    }

    // 2. PAYMENT GATEWAY AUTOMATED REVERSAL MODE
    try {
      const result = await initiateRefund({
        patient_id,
        care_episode_id,
        consultation_id,
        original_payment_id,
        amount: numericAmount,
        reason: `${reason}${notes ? ` | Notes: ${notes}` : ''}`,
        initiated_by: `admin:${admin_id}`,
      });

      // Log admin action directly to AWS RDS PostgreSQL
      try {
        await sql`
          INSERT INTO admin_action_log (
            admin_id, action_type, target_table, reason, input_payload, result_payload, status
          ) VALUES (
            ${admin_id}, 'MANUAL_REFUND_GATEWAY', 'refund_requests', ${reason},
            ${JSON.stringify({ patient_id, amount: numericAmount, original_payment_id })},
            ${JSON.stringify(result)},
            ${result.success ? 'SUCCESS' : 'FAILED'}
          )
        `;
      } catch {}

      if (!result.success) {
        return failure(result.error || "Gateway refund initiation failed", result.error, 400);
      }

      return success("Gateway refund initiated successfully", { 
        refund_id: result.refund_id, 
        amount: result.amount,
        status: "COMPLETED"
      });
    } catch (gwErr) {
      return failure(`Gateway refund error: ${gwErr.message}`, gwErr.message, 400);
    }
  } catch (err) {
    console.error("POST /api/admin/refunds error:", err);
    return failure("Failed to initiate refund", err.message, 500);
  }
}

/**
 * PATCH /api/admin/refunds
 * Allows admin to resolve/mark a failed or pending refund as completed (e.g. offline settlement)
 */
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { refund_id, status = "COMPLETED", utr_reference, notes, admin_id = "admin" } = body;

    if (!refund_id) {
      return failure("refund_id is required", null, 400);
    }

    const updated = await sql`
      UPDATE refund_requests
      SET 
        status = ${status},
        processed_at = NOW(),
        gateway_response = jsonb_set(
          COALESCE(gateway_response, '{}'::jsonb),
          '{manual_resolution}',
          ${JSON.stringify({
            resolved_by: admin_id,
            resolved_at: new Date().toISOString(),
            utr_reference: utr_reference || null,
            notes: notes || "Resolved manually by administrator"
          })}::jsonb
        )
      WHERE id = ${refund_id}
      RETURNING *
    `;

    if (!updated || updated.length === 0) {
      return failure("Refund record not found", null, 404);
    }

    return success("Refund status updated successfully", updated[0]);
  } catch (err) {
    console.error("PATCH /api/admin/refunds error:", err);
    return failure("Failed to update refund", err.message, 500);
  }
}
