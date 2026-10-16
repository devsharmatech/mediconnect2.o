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

    // 2. Metrics across all chemists or specific chemist
    const [stats] = await sql`
      SELECT
        COUNT(*)::int AS total_orders,
        COUNT(*) FILTER (WHERE status = 'delivered' OR status = 'approved' OR payment_status = 'paid')::int AS completed_orders,
        COALESCE(SUM(CASE WHEN (status = 'delivered' OR status = 'approved' OR payment_status = 'paid') THEN total_amount ELSE 0 END), 0)::numeric AS gross_volume,
        COALESCE(SUM(CASE WHEN (status = 'delivered' OR status = 'approved' OR payment_status = 'paid') THEN COALESCE(platform_commission_amount, total_amount * 0.10) ELSE 0 END), 0)::numeric AS platform_commission,
        COALESCE(SUM(CASE WHEN (status = 'delivered' OR status = 'approved' OR payment_status = 'paid') THEN COALESCE(chemist_payout_amount, total_amount * 0.90) ELSE 0 END), 0)::numeric AS chemist_payable,
        COUNT(*) FILTER (WHERE settlement_status = 'settled')::int AS settled_orders_count
      FROM medicine_orders
      WHERE (${chemistId ? sql`chemist_id = ${chemistId}` : sql`1=1`});
    `;

    const grossVolume = Number(stats?.gross_volume || 0);
    const platformCommission = Number(stats?.platform_commission || 0);
    const chemistPayable = Number(stats?.chemist_payable || 0);

    // 3. Batches statistics
    const [batchStats] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN net_payout ELSE 0 END), 0)::numeric AS total_paid,
        COALESCE(SUM(CASE WHEN status = 'reconciled' THEN net_payout ELSE 0 END), 0)::numeric AS pending_payout
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
          chemist_payable: toFixed2(chemistPayable),
          total_settled_paid: toFixed2(totalPaid),
          pending_payout_balance: toFixed2(pendingPayout > 0 ? pendingPayout : (chemistPayable - totalPaid)),
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
 * Generate 10-day settlement batches for Chemists.
 */
export async function generate10DayChemistPayoutBatches({ periodBounds = null, chemistId = null } = {}) {
  const bounds = periodBounds || get10DayPeriodBounds();
  const { batchPeriod, periodStart, periodEnd } = bounds;

  console.log(`Generating chemist settlement batch for ${batchPeriod} (${periodStart} to ${periodEnd})${chemistId ? ` chemist ${chemistId}` : ''}`);

  // Fetch orders eligible for settlement
  const orders = await sql`
    SELECT id, chemist_id, status, payment_status, total_amount, chemist_payout_amount, platform_commission_amount, settlement_status, created_at
    FROM medicine_orders
    WHERE (${chemistId ? sql`chemist_id = ${chemistId}` : sql`1=1`})
      AND (status = 'delivered' OR status = 'approved' OR payment_status = 'paid')
      AND (settlement_status IS NULL OR settlement_status IN ('unsettled', 'queued'))
      AND (created_at::date >= ${periodStart}::date AND created_at::date <= ${periodEnd}::date);
  `;

  if (orders.length === 0) {
    return {
      success: true,
      batchPeriod,
      batchesCreated: 0,
      message: `No eligible completed medicine orders found for period ${batchPeriod}`,
    };
  }

  // Group by chemist_id
  const chemistGroups = {};
  for (const o of orders) {
    if (!chemistGroups[o.chemist_id]) chemistGroups[o.chemist_id] = [];
    chemistGroups[o.chemist_id].push(o);
  }

  const createdBatches = [];

  for (const [cId, groupOrders] of Object.entries(chemistGroups)) {
    let gross = 0;
    let totalComm = 0;
    let netPayout = 0;

    for (const o of groupOrders) {
      const orderTotal = Number(o.total_amount || 0);
      const comm = Number(o.platform_commission_amount || (orderTotal * 0.10));
      const pay = Number(o.chemist_payout_amount || (orderTotal - comm));
      gross += orderTotal;
      totalComm += comm;
      netPayout += pay;
    }

    const totalOrders = groupOrders.length;
    gross = toFixed2(gross);
    totalComm = toFixed2(totalComm);
    const totalGst = toFixed2(totalComm * 0.18);
    const totalTds = toFixed2(gross * 0.01); // 1% section 194O e-commerce TDS
    netPayout = toFixed2(netPayout - totalTds);

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

    // Insert batch
    const [batch] = await sql`
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

    // Mark orders as queued
    const orderIds = groupOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      await sql`
        UPDATE medicine_orders
        SET settlement_status = 'queued', updated_at = NOW()
        WHERE id = ANY(${orderIds});
      `;
    }

    // Ledger posting
    await sql`
      INSERT INTO chemist_financial_ledger (
        order_id, chemist_id, entry_type, account_code, debit, credit, description, idempotency_key
      ) VALUES (
        NULL, ${cId}, 'settlement_batch_accrual', 'CHEMIST_PAYABLE',
        0.00, ${netPayout},
        ${`Settlement batch accrual for ${batchPeriod} (${totalOrders} orders)`},
        ${`chemist_batch_${batch.id}_accrual`}
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    `;

    createdBatches.push(batch);
  }

  return {
    success: true,
    batchPeriod,
    batchesCreated: createdBatches.length,
    batches: createdBatches,
    message: `Generated ${createdBatches.length} chemist settlement batches for period ${batchPeriod}`,
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
        ${`Disbursed payout for ${batch.batch_period} (Ref: ${ref})`},
        ${`chemist_payout_exec_${batch.id}`}
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    `;
  }

  return updated;
}
