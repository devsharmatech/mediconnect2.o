import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/admin/chemists/payments
// Returns chemist payments, transaction logs, and payout settlement batches
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "transactions"; // "transactions" | "payouts"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "15", 10)));
    const offset = (page - 1) * limit;

    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "all";
    const chemistId = searchParams.get("chemist_id") || "all";

    // KPI Summary
    const [summaryResult] = await sql`
      SELECT 
        (
          SELECT COALESCE(SUM(total_amount), 0)::numeric
          FROM medicine_orders
          WHERE payment_status = 'paid' OR status IN ('delivered', 'completed')
        ) as total_collected,
        (
          SELECT COALESCE(SUM(net_payout), 0)::numeric
          FROM chemist_payout_batches
          WHERE status = 'settled' OR status = 'completed'
        ) as total_settled,
        (
          SELECT COALESCE(SUM(net_payout), 0)::numeric
          FROM chemist_payout_batches
          WHERE status != 'settled' AND status != 'completed'
        ) as pending_payout,
        (
          SELECT COALESCE(SUM(total_platform_commission), 0)::numeric
          FROM chemist_payout_batches
        ) as platform_commission;
    `;

    // Dropdown list of chemists
    const chemists = await sql`
      SELECT id, pharmacy_name, owner_name, bank_name, bank_account_number, upi_id 
      FROM chemist_details 
      ORDER BY pharmacy_name ASC;
    `;

    if (tab === "payouts") {
      // Payout batches
      const conditions = [];

      if (search) {
        conditions.push(sql`(
          cpb.batch_period ILIKE ${`%${search}%`} OR
          cpb.utr_number ILIKE ${`%${search}%`} OR
          cd.pharmacy_name ILIKE ${`%${search}%`} OR
          cd.owner_name ILIKE ${`%${search}%`} OR
          cd.upi_id ILIKE ${`%${search}%`}
        )`);
      }

      if (status !== "all") {
        conditions.push(sql`cpb.status = ${status}`);
      }

      if (chemistId !== "all") {
        conditions.push(sql`cpb.chemist_id = ${chemistId}`);
      }

      const whereClause = conditions.length > 0 ? sql`WHERE ${conditions.reduce((prev, curr) => sql`${prev} AND ${curr}`)}` : sql``;

      const [countResult] = await sql`
        SELECT COUNT(*)::int as total
        FROM chemist_payout_batches cpb
        LEFT JOIN chemist_details cd ON cd.id = cpb.chemist_id
        ${whereClause};
      `;
      const total = countResult?.total || 0;

      const payouts = await sql`
        SELECT 
          cpb.id,
          cpb.batch_period,
          cpb.period_start,
          cpb.period_end,
          cpb.chemist_id,
          cpb.total_orders,
          cpb.gross_orders_amount,
          cpb.total_platform_commission,
          cpb.total_gst,
          cpb.total_tds,
          cpb.net_payout,
          cpb.status,
          cpb.payout_reference,
          cpb.payout_notes,
          cpb.utr_number,
          cpb.proof_url,
          cpb.payment_mode,
          cpb.completed_at,
          cpb.created_at,
          cd.pharmacy_name,
          cd.owner_name,
          cd.mobile as chemist_mobile,
          cd.email as chemist_email,
          cd.bank_name,
          cd.bank_account_number,
          cd.bank_ifsc_code,
          cd.upi_id
        FROM chemist_payout_batches cpb
        LEFT JOIN chemist_details cd ON cd.id = cpb.chemist_id
        ${whereClause}
        ORDER BY cpb.created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `;

      return NextResponse.json({
        success: true,
        data: {
          summary: summaryResult || {
            total_collected: 0,
            total_settled: 0,
            pending_payout: 0,
            platform_commission: 0,
          },
          payouts,
          chemists,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      });
    }

    // Default: Order Payment Transactions
    const conditions = [];

    if (search) {
      conditions.push(sql`(
        mo.unid::text ILIKE ${`%${search}%`} OR
        mo.id::text ILIKE ${`%${search}%`} OR
        mo.utr_number ILIKE ${`%${search}%`} OR
        mo.payu_txnid ILIKE ${`%${search}%`} OR
        mo.payu_mihpayid ILIKE ${`%${search}%`} OR
        mo.razorpay_payment_id ILIKE ${`%${search}%`} OR
        cd.pharmacy_name ILIKE ${`%${search}%`} OR
        pd.full_name ILIKE ${`%${search}%`}
      )`);
    }

    if (status !== "all") {
      conditions.push(sql`mo.payment_status = ${status}`);
    }

    if (chemistId !== "all") {
      conditions.push(sql`mo.chemist_id = ${chemistId}`);
    }

    const whereClause = conditions.length > 0 ? sql`WHERE ${conditions.reduce((prev, curr) => sql`${prev} AND ${curr}`)}` : sql``;

    const [countResult] = await sql`
      SELECT COUNT(*)::int as total
      FROM medicine_orders mo
      LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
      LEFT JOIN users u ON u.id = mo.patient_id
      LEFT JOIN patient_details pd ON pd.id = u.id
      ${whereClause};
    `;
    const total = countResult?.total || 0;

    const transactions = await sql`
      SELECT 
        mo.id as order_id,
        mo.unid,
        mo.chemist_id,
        mo.total_amount,
        mo.medicine_subtotal,
        mo.delivery_charge,
        mo.discount,
        mo.chemist_payout_amount,
        mo.platform_commission_amount,
        mo.payment_method,
        mo.payment_status,
        mo.status as order_status,
        mo.settlement_status,
        mo.utr_number,
        mo.payment_proof_url,
        mo.payu_txnid,
        mo.payu_mihpayid,
        mo.payu_bank_ref_num,
        mo.razorpay_payment_id,
        mo.created_at,
        cd.pharmacy_name,
        cd.owner_name as chemist_owner,
        cd.mobile as chemist_mobile,
        cd.upi_id as chemist_upi,
        cd.bank_name as chemist_bank_name,
        cd.bank_account_number as chemist_account_no,
        cd.bank_ifsc_code as chemist_ifsc,
        pd.full_name as patient_name,
        u.phone_number as patient_phone
      FROM medicine_orders mo
      LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
      LEFT JOIN users u ON u.id = mo.patient_id
      LEFT JOIN patient_details pd ON pd.id = u.id
      ${whereClause}
      ORDER BY mo.created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    return NextResponse.json({
      success: true,
      data: {
        summary: summaryResult || {
          total_collected: 0,
          total_settled: 0,
          pending_payout: 0,
          platform_commission: 0,
        },
        transactions,
        chemists,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Admin chemist payments GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chemist payments" },
      { status: 500 }
    );
  }
}

// POST /api/admin/chemists/payments
// Mark payout batch or order as settled with UTR and payment mode
export async function POST(request) {
  try {
    const body = await request.json();
    const { batchId, orderId, utrNumber, paymentMode, notes, proofUrl } = body;

    if (!batchId && !orderId) {
      return NextResponse.json(
        { success: false, error: "Either batchId or orderId is required" },
        { status: 400 }
      );
    }

    if (!utrNumber) {
      return NextResponse.json(
        { success: false, error: "UTR / Transaction Reference number is required" },
        { status: 400 }
      );
    }

    if (batchId) {
      await sql`
        UPDATE chemist_payout_batches
        SET 
          status = 'settled',
          utr_number = ${utrNumber},
          payment_mode = ${paymentMode || "NEFT"},
          payout_notes = ${notes || null},
          proof_url = ${proofUrl || null},
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${batchId};
      `;
    }

    if (orderId) {
      await sql`
        UPDATE medicine_orders
        SET 
          settlement_status = 'settled',
          utr_number = ${utrNumber},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${orderId};
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Settlement recorded successfully",
    });
  } catch (error) {
    console.error("Admin chemist settlement POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record payout settlement" },
      { status: 500 }
    );
  }
}

