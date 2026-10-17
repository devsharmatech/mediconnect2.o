import sql from './db.js';
import { get10DayPeriodBounds, toFixed2 } from './doctorFinancialEngine.js';

export { get10DayPeriodBounds, toFixed2 };

/**
 * Fetch lab revenue metrics, labs list, batches, and recent ledger entries.
 */
export async function getLabRevenueSummary({ labId = null, periodBounds = null } = {}) {
  try {
    const bounds = periodBounds || get10DayPeriodBounds();

    // 1. Labs list for dropdown
    const labs = await sql`
      SELECT id, lab_name, email, phone_number, approved_at
      FROM lab_details
      ORDER BY lab_name ASC;
    `;

    // 2. Metrics across all labs or specific lab
    const [stats] = await sql`
      SELECT
        COUNT(*)::int AS total_orders,
        COUNT(*) FILTER (WHERE status = 'delivered' OR status = 'completed' OR payment_status = 'paid')::int AS completed_orders,
        COALESCE(SUM(CASE WHEN (status = 'delivered' OR status = 'completed' OR payment_status = 'paid') THEN total_amount ELSE 0 END), 0)::numeric AS gross_volume,
        COUNT(*) FILTER (WHERE settlement_status = 'settled')::int AS settled_orders_count
      FROM lab_test_orders
      WHERE (${labId ? sql`lab_id = ${labId}` : sql`1=1`});
    `;

    const grossVolume = Number(stats?.gross_volume || 0);
    // Platform standard commission for labs: 20% on gross volume, 80% lab payable
    const platformRevenue = toFixed2(grossVolume * 0.20);
    const labNetShare = toFixed2(grossVolume * 0.80);

    // 3. Batches statistics
    const [batchStats] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN net_payout ELSE 0 END), 0)::numeric AS total_paid,
        COALESCE(SUM(CASE WHEN status = 'reconciled' THEN net_payout ELSE 0 END), 0)::numeric AS pending_payout
      FROM lab_payout_batches
      WHERE (${labId ? sql`lab_id = ${labId}` : sql`1=1`});
    `;

    const totalPaid = Number(batchStats?.total_paid || 0);
    const pendingPayout = Number(batchStats?.pending_payout || 0);

    // 4. Fetch recent payout batches
    const batches = await sql`
      SELECT b.*, l.lab_name, l.email as lab_email, l.phone_number as lab_phone
      FROM lab_payout_batches b
      LEFT JOIN lab_details l ON l.id = b.lab_id
      WHERE (${labId ? sql`b.lab_id = ${labId}` : sql`1=1`})
      ORDER BY b.period_start DESC, b.created_at DESC
      LIMIT 50;
    `;

    // 5. Fetch recent ledger entries
    const ledgerEntries = await sql`
      SELECT f.*, l.lab_name
      FROM lab_financial_ledger f
      LEFT JOIN lab_details l ON l.id = f.lab_id
      WHERE (${labId ? sql`f.lab_id = ${labId}` : sql`1=1`})
      ORDER BY f.created_at DESC
      LIMIT 100;
    `;

    return {
      success: true,
      data: {
        metrics: {
          gross_volume: toFixed2(grossVolume),
          platform_revenue: platformRevenue,
          lab_payable: labNetShare,
          total_settled_paid: toFixed2(totalPaid),
          pending_payout_balance: toFixed2(pendingPayout > 0 ? pendingPayout : (labNetShare - totalPaid)),
          total_orders: stats?.total_orders || 0,
          completed_orders: stats?.completed_orders || 0,
        },
        labs,
        batches,
        ledgerEntries,
        currentCycle: bounds,
      },
    };
  } catch (err) {
    console.error("getLabRevenueSummary error:", err);
    throw err;
  }
}

/**
 * Generate 10-day settlement batches for Labs.
 */
export async function generate10DayLabPayoutBatches({ periodBounds = null, labId = null } = {}) {
  const bounds = periodBounds || get10DayPeriodBounds();
  const { batchPeriod, periodStart, periodEnd } = bounds;

  console.log(`Generating lab settlement batch for ${batchPeriod} (${periodStart} to ${periodEnd})${labId ? ` lab ${labId}` : ''}`);

  // Fetch orders eligible for settlement
  const orders = await sql`
    SELECT id, lab_id, status, payment_status, total_amount, settlement_status, created_at, scheduled_at
    FROM lab_test_orders
    WHERE (${labId ? sql`lab_id = ${labId}` : sql`1=1`})
      AND (status = 'delivered' OR status = 'completed' OR payment_status = 'paid')
      AND (settlement_status IS NULL OR settlement_status IN ('unsettled', 'queued'))
      AND (created_at::date >= ${periodStart}::date AND created_at::date <= ${periodEnd}::date);
  `;

  if (orders.length === 0) {
    return {
      success: true,
      batchPeriod,
      batchesCreated: 0,
      message: `No eligible completed lab orders found for period ${batchPeriod}`,
    };
  }

  // Group by lab_id
  const labGroups = {};
  for (const o of orders) {
    if (!labGroups[o.lab_id]) labGroups[o.lab_id] = [];
    labGroups[o.lab_id].push(o);
  }

  const createdBatches = [];

  for (const [lId, groupOrders] of Object.entries(labGroups)) {
    let gross = 0;
    for (const o of groupOrders) {
      gross += Number(o.total_amount || 0);
    }
    const totalOrders = groupOrders.length;
    gross = toFixed2(gross);
    // Check if lab has a custom commercial policy in lab_commercial_policies
    const activePolicies = await sql`
      SELECT commission_percentage 
      FROM lab_commercial_policies
      WHERE lab_id = ${lId} AND is_active = true
        AND (effective_from <= ${periodEnd}::date)
        AND (effective_to IS NULL OR effective_to >= ${periodStart}::date)
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    let totalCommission = 0;
    if (activePolicies.length > 0) {
      // Contractual partner override applies
      const commPct = Number(activePolicies[0].commission_percentage);
      totalCommission = toFixed2(gross * (commPct / 100));
    } else {
      // Calculate true itemized commission from each test's category (all 11 categories: 50%, 40%, 30%, 5%, etc.)
      const orderIds = groupOrders.map(o => o.id);
      const items = await sql`
        SELECT oi.price, COALESCE(cat.commission_percentage, 20.00) as commission_percentage
        FROM lab_test_order_items oi
        JOIN lab_tests lt ON lt.id = oi.test_id
        LEFT JOIN lab_test_categories cat ON cat.id = lt.category_id
        WHERE oi.order_id = ANY(${orderIds});
      `;
      if (items.length > 0) {
        let calcComm = 0;
        for (const it of items) {
          const itemPrice = Number(it.price || 0);
          const catRate = Number(it.commission_percentage || 20.00);
          calcComm += Math.round((itemPrice * (catRate / 100)) * 100) / 100;
        }
        totalCommission = toFixed2(calcComm);
      } else {
        totalCommission = toFixed2(gross * 0.20);
      }
    }

    const totalTds = toFixed2(gross * 0.02);
    const netPayout = toFixed2(gross - totalCommission - totalTds);

    // Fetch lab bank/kyc info
    const [labRow] = await sql`
      SELECT id, lab_name, email, phone_number, gst_number, pan_number, kyc_data
      FROM lab_details
      WHERE id = ${lId};
    `;

    // Check if lab has verified bank proof in lab_partner_documents
    const bankProofRows = await sql`
      SELECT id, document_url, verification_status
      FROM lab_partner_documents
      WHERE lab_id = ${lId} AND document_type = 'bank_proof' AND verification_status = 'VERIFIED'
      LIMIT 1;
    `;
    const isBankVerified = bankProofRows.length > 0;

    const bankSnapshot = {
      lab_name: labRow?.lab_name || "Unknown Lab",
      gst_number: labRow?.gst_number || null,
      pan_number: labRow?.pan_number || null,
      phone: labRow?.phone_number || null,
      bank_verified: isBankVerified,
      bank_proof_id: bankProofRows[0]?.id || null,
    };

    // Insert or update batch
    const [batch] = await sql`
      INSERT INTO lab_payout_batches (
        batch_period, period_start, period_end, lab_id,
        total_orders, gross_orders_amount, total_platform_commission,
        total_gst, total_tds, net_payout, status, bank_snapshot
      ) VALUES (
        ${batchPeriod}, ${periodStart}, ${periodEnd}, ${lId},
        ${totalOrders}, ${gross}, ${totalCommission},
        ${totalGst}, ${totalTds}, ${netPayout}, 'reconciled', ${JSON.stringify(bankSnapshot)}
      )
      RETURNING *;
    `;

    // Mark orders as queued
    const orderIds = groupOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      await sql`
        UPDATE lab_test_orders
        SET settlement_status = 'queued', updated_at = NOW()
        WHERE id = ANY(${orderIds});
      `;
    }

    // Ledger posting
    await sql`
      INSERT INTO lab_financial_ledger (
        order_id, lab_id, entry_type, account_code, debit, credit, description, idempotency_key
      ) VALUES (
        NULL, ${lId}, 'settlement_batch_accrual', 'LAB_PAYABLE',
        0.00, ${netPayout},
        ${`Settlement batch accrual for ${batchPeriod} (${totalOrders} orders)`},
        ${`lab_batch_${batch.id}_accrual`}
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
    message: `Generated ${createdBatches.length} lab settlement batches for period ${batchPeriod}`,
  };
}

/**
 * Maker step: Review a Lab Payout Batch.
 */
export async function reviewLabPayoutBatch({ batchId, reviewerName = 'Finance Admin', reviewNotes = null } = {}) {
  const [batch] = await sql`SELECT * FROM lab_payout_batches WHERE id = ${batchId} LIMIT 1;`;
  if (!batch) throw new Error("Lab payout batch not found");
  if (batch.status === 'paid') throw new Error("Paid batch cannot be reviewed");

  const [updated] = await sql`
    UPDATE lab_payout_batches
    SET
      status = 'reviewed',
      reviewed_by = ${reviewerName},
      reviewed_at = NOW(),
      review_notes = ${reviewNotes || 'Reconciled and reviewed by Finance Admin'},
      updated_at = NOW()
    WHERE id = ${batchId}
    RETURNING *;
  `;
  return updated;
}

/**
 * Checker step: Authorize / Approve a Lab Payout Batch before disbursement.
 */
export async function approveLabPayoutBatch({ batchId, approverName = 'Super Admin', approvalNotes = null } = {}) {
  const [batch] = await sql`SELECT * FROM lab_payout_batches WHERE id = ${batchId} LIMIT 1;`;
  if (!batch) throw new Error("Lab payout batch not found");
  if (batch.status === 'paid') throw new Error("Paid batch cannot be modified");

  const [updated] = await sql`
    UPDATE lab_payout_batches
    SET
      status = 'approved',
      approved_by = ${approverName},
      approved_at = NOW(),
      approval_notes = ${approvalNotes || 'Authorized and approved for bank disbursement'},
      updated_at = NOW()
    WHERE id = ${batchId}
    RETURNING *;
  `;
  return updated;
}

/**
 * Execute a Lab Payout Batch (with mandatory UTR, proof, and bank proof verification).
 */
export async function executeLabPayoutBatch({
  batchId,
  payout_reference,
  utr_number,
  payment_mode = 'NEFT',
  proof_url = null,
  settled_by = 'Admin',
  payout_notes,
  skip_bank_check = false,
} = {}) {
  const [batch] = await sql`
    SELECT * FROM lab_payout_batches WHERE id = ${batchId} LIMIT 1;
  `;
  if (!batch) throw new Error("Lab payout batch not found");
  if (batch.status === 'paid') throw new Error("Batch is already marked as paid");

  const utr = (utr_number || payout_reference || '').trim();
  if (!utr) throw new Error("Mandatory settlement proof required: Valid Bank UTR / Transaction ID is required.");

  // Section 7, Rule 7: Settlement must be blocked while bank proof is unverified
  if (!skip_bank_check) {
    const bankProofRows = await sql`
      SELECT id, verification_status
      FROM lab_partner_documents
      WHERE lab_id = ${batch.lab_id} AND document_type = 'bank_proof' AND verification_status = 'VERIFIED'
      LIMIT 1;
    `;
    if (bankProofRows.length === 0) {
      // Check if bank_snapshot has verified flag or legacy bank account
      const snapshot = typeof batch.bank_snapshot === 'object' ? batch.bank_snapshot : {};
      if (!snapshot.bank_verified) {
        throw new Error("Settlement blocked: Partner bank proof has not been verified in the Compliance Registry. Please verify bank proof before disbursing payout.");
      }
    }
  }

  const notes = payout_notes || `Disbursed via ${payment_mode}. UTR: ${utr}`;

  const [updated] = await sql`
    UPDATE lab_payout_batches
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

  // Update linked lab orders to settled
  await sql`
    UPDATE lab_test_orders
    SET settlement_status = 'settled', updated_at = NOW()
    WHERE lab_id = ${batch.lab_id}
      AND (created_at::date >= ${batch.period_start}::date AND created_at::date <= ${batch.period_end}::date)
      AND settlement_status = 'queued';
  `;

  // Ledger settlement entry
  const netPayout = Number(batch.net_payout) || 0;
  if (netPayout > 0) {
    await sql`
      INSERT INTO lab_financial_ledger (
        lab_id, entry_type, account_code, debit, credit, description, idempotency_key
      ) VALUES (
        ${batch.lab_id},
        'payout',
        'LAB_PAYABLE',
        ${netPayout},
        0.00,
        ${`Disbursed payout for ${batch.batch_period} (Ref: ${utr})`},
        ${`lab_payout_exec_${batch.id}`}
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    `;
  }

  return updated;
}

/**
 * Fetch full itemized settlement statement / voucher for a batch.
 */
export async function getLabBatchStatement({ batchId }) {
  const [batch] = await sql`
    SELECT b.*, l.lab_name, l.owner_name, l.email as lab_email, l.phone_number as lab_phone,
           l.address, l.operating_address, l.cin, l.pan_number, l.license_number, l.partner_agreement_id
    FROM lab_payout_batches b
    LEFT JOIN lab_details l ON l.id = b.lab_id
    WHERE b.id = ${batchId}
    LIMIT 1;
  `;
  if (!batch) throw new Error("Settlement batch not found");

  // Fetch orders included in this batch period
  const orders = await sql`
    SELECT
      o.id, o.created_at, o.total_amount, o.status, o.payment_status, o.settlement_status,
      p.full_name as patient_name,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'test_name', COALESCE(oi.test_name, lt.test_name, 'Diagnostic Investigation'),
          'price', COALESCE(oi.price::numeric, lt.price::numeric, 0)
        )), '[]'::json)
        FROM lab_test_order_items oi
        LEFT JOIN lab_tests lt ON lt.id = oi.test_id
        WHERE oi.order_id = o.id
      ) as items
    FROM lab_test_orders o
    LEFT JOIN patient_details p ON p.id = o.patient_id
    WHERE o.lab_id = ${batch.lab_id}
      AND (o.created_at::date >= ${batch.period_start}::date AND o.created_at::date <= ${batch.period_end}::date)
    ORDER BY o.created_at ASC;
  `;

  return { batch, orders };
}

