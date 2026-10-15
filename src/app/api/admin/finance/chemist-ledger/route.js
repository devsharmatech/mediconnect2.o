import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';
import {
  getChemistRevenueSummary,
  generate10DayChemistPayoutBatches,
  get10DayPeriodBounds,
} from '@/lib/chemistFinancialEngine';

export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const chemistId = searchParams.get('chemist_id') || null;
    const status = searchParams.get('status') || null;
    const period = searchParams.get('batch_period') || null;
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const summary = await getChemistRevenueSummary({ chemistId });

    // Orders query
    const searchPattern = search ? `%${search}%` : null;

    const [countRow] = await sql`
      SELECT COUNT(*)::int AS total
      FROM medicine_orders o
      LEFT JOIN chemist_details c ON c.id = o.chemist_id
      WHERE (${chemistId ? sql`o.chemist_id = ${chemistId}` : sql`1=1`})
        AND (${status ? sql`o.status = ${status}` : sql`1=1`})
        AND (${searchPattern ? sql`(o.id::text ILIKE ${searchPattern} OR c.pharmacy_name ILIKE ${searchPattern})` : sql`1=1`});
    `;

    const total = countRow?.total || 0;

    const orders = await sql`
      SELECT
        o.id, o.chemist_id, o.patient_id, o.status, o.payment_status, o.total_amount,
        o.chemist_payout_amount, o.platform_commission_amount, o.settlement_status,
        o.created_at, o.delivery_type, o.actual_delivery_at,
        c.pharmacy_name, c.mobile as chemist_phone
      FROM medicine_orders o
      LEFT JOIN chemist_details c ON c.id = o.chemist_id
      WHERE (${chemistId ? sql`o.chemist_id = ${chemistId}` : sql`1=1`})
        AND (${status ? sql`o.status = ${status}` : sql`1=1`})
        AND (${searchPattern ? sql`(o.id::text ILIKE ${searchPattern} OR c.pharmacy_name ILIKE ${searchPattern})` : sql`1=1`})
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    return NextResponse.json({
      success: true,
      data: {
        ...summary.data,
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + orders.length < total,
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error("GET /api/admin/finance/chemist-ledger error:", error);
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

    const result = await generate10DayChemistPayoutBatches({
      periodBounds,
      chemistId: body.chemist_id || null,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("POST /api/admin/finance/chemist-ledger error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
