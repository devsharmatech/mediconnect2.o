import { NextResponse } from 'next/server';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';
import { getLabBatchStatement } from '@/lib/labFinancialEngine';

export async function GET(req, { params }) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Batch ID is required" }, { status: 400 });
    }

    const data = await getLabBatchStatement({ batchId: id });

    return NextResponse.json({
      success: true,
      message: "Settlement statement fetched successfully",
      data,
    }, { status: 200 });

  } catch (error) {
    console.error("GET /api/admin/finance/lab-batches/[id]/statement error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
