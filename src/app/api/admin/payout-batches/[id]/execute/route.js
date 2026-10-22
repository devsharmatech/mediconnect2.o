import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';

export async function POST(req, { params }) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Batch ID is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const utrNumber = (body.utr_number || body.transaction_id || body.payout_reference || '').trim();
    if (!utrNumber) {
      return NextResponse.json({
        success: false,
        error: "Mandatory settlement proof required: Please enter a valid Bank UTR / Transaction ID.",
      }, { status: 400 });
    }

    const paymentMode = body.payment_mode || 'NEFT';
    const proofUrl = (body.proof_url || body.proofUrl || '').trim();
    if (!proofUrl) {
      return NextResponse.json({
        success: false,
        error: "Mandatory settlement proof required: Bank transfer slip / payment proof document must be uploaded.",
      }, { status: 400 });
    }
    const notes = body.notes || `10-day settlement disbursed via ${paymentMode}. UTR: ${utrNumber}`;
    const settledBy = caller?.name || caller?.email || "Admin";

    const batchRows = await sql`
      SELECT * FROM doctor_payout_batches WHERE id = ${id} LIMIT 1;
    `;
    if (batchRows.length === 0) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    const batch = batchRows[0];
    if (batch.status === 'paid') {
      return NextResponse.json({ success: false, error: "Batch is already marked as paid" }, { status: 400 });
    }

    // 1. Update batch to paid with verified proof audit
    const updatedRows = await sql`
      UPDATE doctor_payout_batches
      SET
        status = 'paid',
        payout_reference = ${utrNumber},
        utr_number = ${utrNumber},
        payment_mode = ${paymentMode},
        proof_url = ${proofUrl},
        settled_by = ${settledBy},
        payout_notes = ${notes},
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;

    // 2. Mark all linked appointments as settled
    await sql`
      UPDATE appointments
      SET
        settlement_status = 'settled',
        updated_at = NOW()
      WHERE settlement_batch_id = ${id};
    `;

    // 3. Post audit settlement ledger entry (DOCTOR_PAYABLE debit, BANK_CLEARING credit)
    const netPayout = Number(batch.net_payout) || 0;
    if (netPayout > 0) {
      await sql`
        INSERT INTO doctor_financial_ledger (
          doctor_id, entry_type, account_code, debit, credit, description, idempotency_key
        ) VALUES (
          ${batch.doctor_id},
          'payout',
          'DOCTOR_PAYABLE',
          ${netPayout},
          0.00,
          ${`Settlement transfer for ${batch.batch_period} (Ref: ${payoutRef})`},
          ${`payout_batch_${batch.id}`}
        )
        ON CONFLICT (idempotency_key) DO NOTHING;
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Batch settlement marked as executed and paid",
      data: updatedRows[0],
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/admin/payout-batches/[id]/execute error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
