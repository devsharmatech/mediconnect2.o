import { NextResponse } from 'next/server';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';
import { executeChemistPayoutBatch } from '@/lib/chemistFinancialEngine';

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
    const proofUrl = body.proof_url || null;
    const notes = body.notes || `Chemist settlement payout disbursed via ${paymentMode}. UTR: ${utrNumber}`;
    const settledBy = caller?.name || caller?.email || "Admin";

    const updated = await executeChemistPayoutBatch({
      batchId: id,
      utr_number: utrNumber,
      payout_reference: utrNumber,
      payment_mode: paymentMode,
      proof_url: proofUrl,
      settled_by: settledBy,
      payout_notes: notes,
    });

    return NextResponse.json({
      success: true,
      message: "Chemist settlement batch marked as executed and paid",
      data: updated,
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/admin/finance/chemist-batches/[id]/execute error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
