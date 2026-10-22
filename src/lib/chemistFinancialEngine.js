import sql from './db.js';
import { get10DayPeriodBounds, toFixed2 } from './doctorFinancialEngine.js';

export { get10DayPeriodBounds, toFixed2 };

/**
 * Fetch chemist revenue metrics, chemists list, batches, and recent ledger entries.
 */
export async function getChemistRevenueSummary({ chemistId = null, periodBounds = null } = {}) {
  try {
    const bounds = periodBounds || get10DayPeriodBounds();

    // 1. Chemists list for dropdown
    const chemists = await sql`
      SELECT id, pharmacy_name, pharmacist_name, mobile, address, bank_account_number, bank_ifsc_code, bank_name
      FROM chemist_details
      ORDER BY pharmacy_name ASC;
    `;

    // 2. Metrics across all chemists or specific chemist (including completed, delivered, approved, or paid)
    const [stats] = await sql`
      SELECT
        COUNT(*)::int AS total_orders,
        COUNT(*) FILTER (WHERE status = 'delivered' OR status = 'approved' OR status = 'completed' OR payment_status = 'paid')::int AS completed_orders,
        COALESCE(SUM(CASE WHEN (status = 'delivered' OR status = 'approved' OR status = 'completed' OR payment_status = 'paid') THEN total_amount ELSE 0 END), 0)::numeric AS gross_volume,
        COALESCE(SUM(CASE WHEN (status = 'delivered' OR status = 'approved' OR status = 'completed' OR payment_status = 'paid') THEN (CASE WHEN total_amount = 0 THEN 0 ELSE COALESCE(platform_commission_amount, total_amount * 0.10) END) ELSE 0 END), 0)::numeric AS platform_commission,
        COUNT(*) FILTER (WHERE settlement_status = 'settled')::int AS settled_orders_count
      FROM medicine_orders
      WHERE (${chemistId ? sql`chemist_id = ${chemistId}` : sql`1=1`});
    `;

    const grossVolume = Number(stats?.gross_volume || 0);
    const platformCommission = Number(stats?.platform_commission || 0);
    // Under Indian Tax laws, retail pharmacy sales have GST embedded in manufacturer MRP.
    // Platform disbursements to chemists are non-taxable retail fulfillment: GST = 0%, TDS = 0%
    const totalGst = 0.00;
    const totalTds = 0.00;
    const chemistPayable = toFixed2(grossVolume - platformCommission);

    // 3. Batches statistics
    const [batchStats] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN net_payout ELSE 0 END), 0)::numeric AS total_paid,
        COALESCE(SUM(CASE WHEN status = 'reconciled' THEN net_payout ELSE 0 END), 0)::numeric AS pending_payout,
        COALESCE(SUM(total_platform_commission), 0)::numeric AS total_batch_comm,
        COALESCE(SUM(total_gst), 0)::numeric AS total_batch_gst,
        COALESCE(SUM(total_tds), 0)::numeric AS total_batch_tds
      FROM chemist_payout_batches
      WHERE (${chemistId ? sql`chemist_id = ${chemistId}` : sql`1=1`});
    `;

    const totalPaid = Number(batchStats?.total_paid || 0);
    const pendingPayout = Number(batchStats?.pending_payout || 0);

    // 4. Fetch recent payout batches
    const batches = await sql`
      SELECT b.*, c.pharmacy_name, c.pharmacist_name, c.mobile as chemist_phone, c.bank_account_number, c.bank_ifsc_code, c.bank_name
      FROM chemist_payout_batches b
      LEFT JOIN chemist_details c ON c.id = b.chemist_id
      WHERE (${chemistId ? sql`b.chemist_id = ${chemistId}` : sql`1=1`})
      ORDER BY b.period_start DESC, b.created_at DESC
      LIMIT 50;
    `;

    // 5. Fetch recent ledger entries
    const ledgerEntries = await sql`
      SELECT f.*, c.pharmacy_name
      FROM chemist_financial_ledger f
      LEFT JOIN chemist_details c ON c.id = f.chemist_id
      WHERE (${chemistId ? sql`f.chemist_id = ${chemistId}` : sql`1=1`})
      ORDER BY f.created_at DESC
      LIMIT 100;
    `;

    return {
      success: true,
      data: {
        metrics: {
          gross_volume: toFixed2(grossVolume),
          platform_revenue: toFixed2(platformCommission),
          total_gst_on_platform_fee: totalGst,
          total_tds_withheld: totalTds,
          chemist_payable: chemistPayable,
          total_settled_paid: toFixed2(totalPaid),
          pending_payout_balance: toFixed2(pendingPayout > 0 ? pendingPayout : Math.max(0, chemistPayable - totalPaid)),
          total_orders: stats?.total_orders || 0,
          completed_orders: stats?.completed_orders || 0,
        },
        chemists,
        batches,
        ledgerEntries,
        currentCycle: bounds,
      },
    };
  } catch (err) {
    console.error("getChemistRevenueSummary error:", err);
    throw err;
  }
}

/**
 * Helper to compute 10-day cycle bounds for any date.
 */
function getCycleForDate(d) {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = date.getDate();
  const c = day <= 10 ? 1 : day <= 20 ? 2 : 3;
  const startDay = c === 1 ? '01' : c === 2 ? '11' : '21';
  const lastDay = new Date(y, date.getMonth() + 1, 0).getDate();
  const endDay = c === 1 ? '10' : c === 2 ? '20' : String(lastDay);
  return {
    cycle: c,
    batchPeriod: `${y}-${m}-CYCLE-${c}`,
    periodStart: `${y}-${m}-${startDay}`,
    periodEnd: `${y}-${m}-${endDay}`,
    year: y,
    month: date.getMonth() + 1,
  };
}

/**
 * Generate 10-day settlement batches for Chemists across cycles.
 */
export async function generate10DayChemistPayoutBatches({ periodBounds = null, chemistId = null } = {}) {
  // If periodBounds is specified, we filter strictly to that period.
  // Otherwise, we fetch ALL eligible completed medicine orders across all periods that are unsettled/queued.
  const orders = await sql`
    SELECT id, chemist_id, status, payment_status, total_amount, chemist_payout_amount, platform_commission_amount, settlement_status, created_at
    FROM medicine_orders
    WHERE (${chemistId ? sql`chemist_id = ${chemistId}` : sql`1=1`})
      AND (status = 'delivered' OR status = 'approved' OR status = 'completed' OR payment_status = 'paid')
      AND (settlement_status IS NULL OR settlement_status IN ('unsettled', 'queued'))
      ${periodBounds ? sql`AND (created_at::date >= ${periodBounds.periodStart}::date AND created_at::date <= ${periodBounds.periodEnd}::date)` : sql``}
    ORDER BY created_at ASC;
  `;

  if (orders.length === 0) {
    return {
      success: true,
      batchesCreated: 0,
      message: `No eligible completed medicine orders found to reconcile`,
    };
  }

  // Group by (batchPeriod, chemist_id)
  const batchGroups = {};
  for (const o of orders) {
    const cycle = periodBounds || getCycleForDate(o.created_at);
    const key = `${cycle.batchPeriod}__${o.chemist_id}`;
    if (!batchGroups[key]) {
      batchGroups[key] = {
        cycle,
        chemistId: o.chemist_id,
        orders: [],
      };
    }
    batchGroups[key].orders.push(o);
  }

  const createdBatches = [];

  for (const group of Object.values(batchGroups)) {
    const { cycle, chemistId: cId, orders: groupOrders } = group;
    const { batchPeriod, periodStart, periodEnd } = cycle;

    let gross = 0;
    let totalComm = 0;

    for (const o of groupOrders) {
      const orderTotal = Number(o.total_amount || 0);
      const comm = orderTotal === 0 ? 0 : Math.round(orderTotal * 0.10 * 100) / 100;
      gross += orderTotal;
      totalComm += comm;
    }

    const totalOrders = groupOrders.length;
    gross = toFixed2(gross);
    totalComm = toFixed2(totalComm);
    // Retail pharmacy medicine disbursements: 0% GST and 0% TDS under Indian Tax Law
    const totalGst = 0.00;
    const totalTds = 0.00;
    const netPayout = toFixed2(gross - totalComm);

    // Fetch chemist bank details
    const [chemRow] = await sql`
      SELECT id, pharmacy_name, pharmacist_name, mobile, bank_account_number, bank_ifsc_code, bank_name, bank_branch
      FROM chemist_details
      WHERE id = ${cId};
    `;

    const bankSnapshot = {
      pharmacy_name: chemRow?.pharmacy_name || "Unknown Pharmacy",
      pharmacist_name: chemRow?.pharmacist_name || null,
      mobile: chemRow?.mobile || null,
      account_number: chemRow?.bank_account_number || null,
      ifsc: chemRow?.bank_ifsc_code || null,
      bank_name: chemRow?.bank_name || null,
      branch: chemRow?.bank_branch || null,
    };

    // Check if batch already exists for this period and chemist
    const existing = await sql`
      SELECT id, status FROM chemist_payout_batches
      WHERE batch_period = ${batchPeriod} AND chemist_id = ${cId}
      LIMIT 1;
    `;

    let batch = null;
    if (existing.length > 0) {
      const [updated] = await sql`
        UPDATE chemist_payout_batches
        SET
          total_orders = ${totalOrders},
          gross_orders_amount = ${gross},
          total_platform_commission = ${totalComm},
          total_gst = ${totalGst},
          total_tds = ${totalTds},
          net_payout = ${netPayout},
          bank_snapshot = ${JSON.stringify(bankSnapshot)},
          updated_at = NOW()
        WHERE id = ${existing[0].id}
        RETURNING *;
      `;
      batch = updated;
    } else {
      const [inserted] = await sql`
        INSERT INTO chemist_payout_batches (
          batch_period, period_start, period_end, chemist_id,
          total_orders, gross_orders_amount, total_platform_commission,
          total_gst, total_tds, net_payout, status, bank_snapshot
        ) VALUES (
          ${batchPeriod}, ${periodStart}, ${periodEnd}, ${cId},
          ${totalOrders}, ${gross}, ${totalComm},
          ${totalGst}, ${totalTds}, ${netPayout}, 'reconciled', ${JSON.stringify(bankSnapshot)}
        )
        RETURNING *;
      `;
      batch = inserted;
    }

    // Mark orders as queued
    const orderIds = groupOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      await sql`
        UPDATE medicine_orders
        SET settlement_status = 'queued',
            platform_commission_amount = CASE WHEN total_amount = 0 THEN 0 ELSE ROUND(total_amount * 0.10, 2) END,
            chemist_payout_amount = CASE WHEN total_amount = 0 THEN 0 ELSE ROUND(total_amount * 0.90, 2) END,
            updated_at = NOW()
        WHERE id = ANY(${orderIds});
      `;
    }

    // Ledger posting: Accrue CHEMIST_PAYABLE, PLATFORM_REVENUE
    await sql`
      INSERT INTO chemist_financial_ledger (
        order_id, chemist_id, entry_type, account_code, debit, credit, description, idempotency_key
      ) VALUES (
        NULL, ${cId}, 'settlement_batch_accrual', 'CHEMIST_PAYABLE',
        0.00, ${netPayout},
        ${`Settlement batch accrual for ${batchPeriod} (${totalOrders} orders)`},
        ${`chemist_batch_${batch.id}_accrual`}
      )
      ON CONFLICT (idempotency_key) DO UPDATE
      SET credit = EXCLUDED.credit;
    `;

    if (totalComm > 0) {
      await sql`
        INSERT INTO chemist_financial_ledger (
          order_id, chemist_id, entry_type, account_code, debit, credit, description, idempotency_key
        ) VALUES (
          NULL, ${cId}, 'platform_commission_income', 'PLATFORM_REVENUE',
          0.00, ${totalComm},
          ${`Platform commission revenue for pharmacy batch ${batchPeriod}`},
          ${`chemist_batch_${batch.id}_comm`}
        )
        ON CONFLICT (idempotency_key) DO UPDATE
        SET credit = EXCLUDED.credit;
      `;
    }

    createdBatches.push(batch);
  }

  return {
    success: true,
    batchesCreated: createdBatches.length,
    batches: createdBatches,
    message: `Reconciled ${createdBatches.length} chemist settlement batch(es)`,
  };
}

/**
 * Execute a Chemist Payout Batch.
 */
export async function executeChemistPayoutBatch({
  batchId,
  payout_reference,
  utr_number,
  payment_mode = 'NEFT',
  proof_url = null,
  settled_by = 'Admin',
  payout_notes,
} = {}) {
  const [batch] = await sql`
    SELECT * FROM chemist_payout_batches WHERE id = ${batchId} LIMIT 1;
  `;
  if (!batch) throw new Error("Chemist payout batch not found");
  if (batch.status === 'paid') throw new Error("Batch is already marked as paid");

  const utr = (utr_number || payout_reference || '').trim();
  if (!utr) throw new Error("Mandatory settlement proof required: Valid Bank UTR / Transaction ID is required.");

  const notes = payout_notes || `Disbursed via ${payment_mode}. UTR: ${utr}`;

  const [updated] = await sql`
    UPDATE chemist_payout_batches
    SET
      status = 'paid',
      payout_reference = ${utr},
      utr_number = ${utr},
      payment_mode = ${payment_mode},
      proof_url = ${proof_url},
      settled_by = ${settled_by},
      payout_notes = ${notes},
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${batchId}
    RETURNING *;
  `;

  // Update linked medicine orders to settled
  await sql`
    UPDATE medicine_orders
    SET settlement_status = 'settled', updated_at = NOW()
    WHERE chemist_id = ${batch.chemist_id}
      AND (created_at::date >= ${batch.period_start}::date AND created_at::date <= ${batch.period_end}::date)
      AND settlement_status = 'queued';
  `;

  // Ledger settlement entry
  const netPayout = Number(batch.net_payout) || 0;
  if (netPayout > 0) {
    await sql`
      INSERT INTO chemist_financial_ledger (
        chemist_id, entry_type, account_code, debit, credit, description, idempotency_key
      ) VALUES (
        ${batch.chemist_id},
        'payout',
        'CHEMIST_PAYABLE',
        ${netPayout},
        0.00,
        ${`Disbursed payout for ${batch.batch_period} (Ref: ${utr})`},
        ${`chemist_payout_exec_${batch.id}`}
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    `;
  }

  return updated;
}
