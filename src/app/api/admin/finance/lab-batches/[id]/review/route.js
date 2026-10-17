import { NextResponse } from 'next/server';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';
import { reviewLabPayoutBatch } from '@/lib/labFinancialEngine';

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
    const reviewer = caller?.name || caller?.email || body.reviewer_name || "Finance Admin";
    const notes = body.notes || "Reconciled and reviewed by Finance Admin";

    const updated = await reviewLabPayoutBatch({
      batchId: id,
      reviewerName: reviewer,
      reviewNotes: notes,
    });

    return NextResponse.json({
      success: true,
      message: "Batch reviewed successfully (Maker step completed)",
      data: updated,
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/admin/finance/lab-batches/[id]/review error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
