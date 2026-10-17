import { NextResponse } from 'next/server';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';
import { approveLabPayoutBatch } from '@/lib/labFinancialEngine';

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
    const approver = caller?.name || caller?.email || body.approver_name || "Super Admin";
    const notes = body.notes || "Authorized and approved for bank disbursement";

    const updated = await approveLabPayoutBatch({
      batchId: id,
      approverName: approver,
      approvalNotes: notes,
    });

    return NextResponse.json({
      success: true,
      message: "Batch approved successfully (Checker step completed)",
      data: updated,
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/admin/finance/lab-batches/[id]/approve error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
