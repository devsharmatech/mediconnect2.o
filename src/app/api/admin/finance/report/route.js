import { NextResponse } from 'next/server';
import { getAdminFinancialReport } from '@/lib/doctorFinancialEngine';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';

export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const doctorId = searchParams.get('doctor_id');
    const batchPeriod = searchParams.get('batch_period');

    const result = await getAdminFinancialReport({
      startDate,
      endDate,
      doctorId,
      batchPeriod,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/finance/report error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
