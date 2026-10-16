import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';
import { executeLabPayoutBatch } from '@/lib/labFinancialEngine';
import { executeChemistPayoutBatch } from '@/lib/chemistFinancialEngine';

export async function POST(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const moduleType = (body.module_type || body.type || 'doctor').toLowerCase(); // 'doctor' | 'lab' | 'chemist'
    const batchIds = Array.isArray(body.batch_ids) ? body.batch_ids : [];
    const utrNumber = (body.utr_number || body.transaction_id || body.payout_reference || '').trim();
    const paymentMode = body.payment_mode || 'NEFT';
    const proofUrl = body.proof_url || null;
    const notes = body.notes || `Bulk settlement executed via ${paymentMode}. Master UTR: ${utrNumber}`;
    const settledBy = caller?.name || caller?.email || "Admin";

    // Enforce mandatory settlement proof
    if (!utrNumber) {
      return NextResponse.json({
        success: false,
        error: "Mandatory settlement proof required: Please provide a valid Bank UTR / Transaction ID for the bulk disbursement.",
      }, { status: 400 });
    }

    let settledCount = 0;
    let totalDisbursed = 0;
    const settledBatches = [];

    if (moduleType === 'doctor') {
      // Find eligible batches
      let eligible = [];
      if (batchIds.length > 0) {
        eligible = await sql`
          SELECT * FROM doctor_payout_batches
          WHERE id = ANY(${batchIds}) AND status = 'reconciled';
        `;
      } else {
        eligible = await sql`
          SELECT * FROM doctor_payout_batches
          WHERE status = 'reconciled'
          ORDER BY period_start ASC
          LIMIT 50;
        `;
      }

      if (eligible.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No reconciled doctor settlement batches found to disburse.",
        }, { status: 400 });
      }

      for (const batch of eligible) {
        const [updated] = await sql`
          UPDATE doctor_payout_batches
          SET
            status = 'paid',
            payout_reference = ${utrNumber},
            utr_number = ${utrNumber},
            payment_mode = ${paymentMode},
            proof_url = ${proofUrl},
            settled_by = ${settledBy},
            payout_notes = ${`${notes} (Batch: ${batch.batch_period})`},
            completed_at = NOW(),
            updated_at = NOW()
          WHERE id = ${batch.id}
          RETURNING *;
        `;

        await sql`
          UPDATE appointments
          SET settlement_status = 'settled', updated_at = NOW()
          WHERE settlement_batch_id = ${batch.id};
        `;

        const net = Number(batch.net_payout) || 0;
        if (net > 0) {
          await sql`
            INSERT INTO doctor_financial_ledger (
              doctor_id, entry_type, account_code, debit, credit, description, idempotency_key
            ) VALUES (
              ${batch.doctor_id}, 'payout', 'DOCTOR_PAYABLE', ${net}, 0.00,
              ${`Bulk settlement transfer for ${batch.batch_period} (UTR: ${utrNumber})`},
              ${`bulk_payout_doc_${batch.id}`}
            )
            ON CONFLICT (idempotency_key) DO NOTHING;
          `;
          totalDisbursed += net;
        }

        settledCount++;
        settledBatches.push(updated);
      }

    } else if (moduleType === 'lab') {
      let eligible = [];
      if (batchIds.length > 0) {
        eligible = await sql`
          SELECT * FROM lab_payout_batches
          WHERE id = ANY(${batchIds}) AND status = 'reconciled';
        `;
      } else {
        eligible = await sql`
          SELECT * FROM lab_payout_batches
          WHERE status = 'reconciled'
          ORDER BY period_start ASC
          LIMIT 50;
        `;
      }

      if (eligible.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No reconciled lab settlement batches found to disburse.",
        }, { status: 400 });
      }

      for (const batch of eligible) {
        const updated = await executeLabPayoutBatch({
          batchId: batch.id,
          utr_number: utrNumber,
          payment_mode: paymentMode,
          proof_url: proofUrl,
          settled_by: settledBy,
          payout_notes: `${notes} (Batch: ${batch.batch_period})`,
        });
        settledCount++;
        totalDisbursed += Number(batch.net_payout || 0);
        settledBatches.push(updated);
      }

    } else if (moduleType === 'chemist') {
      let eligible = [];
      if (batchIds.length > 0) {
        eligible = await sql`
          SELECT * FROM chemist_payout_batches
          WHERE id = ANY(${batchIds}) AND status = 'reconciled';
        `;
      } else {
        eligible = await sql`
          SELECT * FROM chemist_payout_batches
          WHERE status = 'reconciled'
          ORDER BY period_start ASC
          LIMIT 50;
        `;
      }

      if (eligible.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No reconciled chemist settlement batches found to disburse.",
        }, { status: 400 });
      }

      for (const batch of eligible) {
        const updated = await executeChemistPayoutBatch({
          batchId: batch.id,
          utr_number: utrNumber,
          payment_mode: paymentMode,
          proof_url: proofUrl,
          settled_by: settledBy,
          payout_notes: `${notes} (Batch: ${batch.batch_period})`,
        });
        settledCount++;
        totalDisbursed += Number(batch.net_payout || 0);
        settledBatches.push(updated);
      }

    } else {
      return NextResponse.json({ success: false, error: "Invalid module_type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully disbursed ${settledCount} ${moduleType} settlement batches (Total: ₹${totalDisbursed.toLocaleString('en-IN')}) with verified proof.`,
      data: {
        module_type: moduleType,
        settled_count: settledCount,
        total_disbursed: Math.round(totalDisbursed * 100) / 100,
        utr_number: utrNumber,
        payment_mode: paymentMode,
        proof_url: proofUrl,
        settled_batches: settledBatches,
      },
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/admin/finance/bulk-settlement error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
