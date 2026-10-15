import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { generate10DayPayoutBatches, get10DayPeriodBounds } from '@/lib/doctorFinancialEngine';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';

export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const period = searchParams.get('batch_period');

    const batches = await sql`
      SELECT b.*, d.full_name as doctor_name, d.email as doctor_email
      FROM doctor_payout_batches b
      LEFT JOIN doctor_details d ON d.id = b.doctor_id
      WHERE (${status ? sql`b.status = ${status}` : sql`1=1`})
        AND (${period ? sql`b.batch_period = ${period}` : sql`1=1`})
      ORDER BY b.period_start DESC, b.created_at DESC;
    `;

    return NextResponse.json({ success: true, data: batches }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/payout-batches error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }
    let periodBounds = null;

    if (body.year && body.month && body.cycle) {
      const y = Number(body.year);
      const m = Number(body.month);
      const c = Number(body.cycle);
      const pad = (n) => String(n).padStart(2, '0');
      const startDay = c === 1 ? 1 : c === 2 ? 11 : 21;
      const endDay = c === 1 ? 10 : c === 2 ? 20 : new Date(y, m, 0).getDate();

      periodBounds = {
        cycle: c,
        batchPeriod: `${y}-${pad(m)}-CYCLE-${c}`,
        periodStart: `${y}-${pad(m)}-${pad(startDay)}`,
        periodEnd: `${y}-${pad(m)}-${pad(endDay)}`,
        year: y,
        month: m,
      };
    } else {
      periodBounds = get10DayPeriodBounds();
    }

    const result = await generate10DayPayoutBatches({ periodBounds });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("POST /api/admin/payout-batches error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
