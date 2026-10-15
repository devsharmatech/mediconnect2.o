import { NextResponse } from 'next/server';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';
import { executeLabPayoutBatch } from '@/lib/labFinancialEngine';

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
    const payoutRef = body.payout_reference || `LAB-PAY-${Date.now()}`;
    const notes = body.notes || "Lab settlement payout approved and executed by admin";

    const updated = await executeLabPayoutBatch({
      batchId: id,
      payout_reference: payoutRef,
      payout_notes: notes,
    });

    return NextResponse.json({
      success: true,
      message: "Lab settlement batch marked as executed and paid",
      data: updated,
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/admin/finance/lab-batches/[id]/execute error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
