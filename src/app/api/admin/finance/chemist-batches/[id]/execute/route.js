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
    const payoutRef = body.payout_reference || `CHEM-PAY-${Date.now()}`;
    const notes = body.notes || "Chemist settlement payout approved and executed by admin";

    const updated = await executeChemistPayoutBatch({
      batchId: id,
      payout_reference: payoutRef,
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
