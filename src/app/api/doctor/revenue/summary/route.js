import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getDoctorRevenueSummary } from '@/lib/doctorFinancialEngine';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorIdParam = searchParams.get('doctor_id');
    const caller = await resolveCallerFromRequest(req, doctorIdParam);

    let doctorId = null;

    if (caller?.role === 'admin') {
      doctorId = doctorIdParam || caller.id;
    } else if (caller?.role === 'doctor') {
      doctorId = caller.id;
    } else if (doctorIdParam) {
      const docRows = await sql`
        SELECT id FROM doctor_details WHERE id = ${doctorIdParam} LIMIT 1
      `;
      if (docRows.length > 0) {
        doctorId = doctorIdParam;
      }
    }

    if (!doctorId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const result = await getDoctorRevenueSummary(doctorId, { startDate, endDate });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("GET /api/doctor/revenue/summary error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
