import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';
import {
  getLabRevenueSummary,
  generate10DayLabPayoutBatches,
  get10DayPeriodBounds,
} from '@/lib/labFinancialEngine';

export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const labId = searchParams.get('lab_id') || null;
    const status = searchParams.get('status') || null;
    const period = searchParams.get('batch_period') || null;
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const summary = await getLabRevenueSummary({ labId });

    // Fetch active test categories with their commission rates
    const categories = await sql`
      SELECT id, name, slug, description, commission_percentage
      FROM lab_test_categories
      ORDER BY name ASC;
    `;

    // Orders query with items, category, and commission % breakdown
    const searchPattern = search ? `%${search}%` : null;

    const [countRow] = await sql`
      SELECT COUNT(*)::int AS total
      FROM lab_test_orders o
      LEFT JOIN lab_details l ON l.id = o.lab_id
      WHERE (${labId ? sql`o.lab_id = ${labId}` : sql`1=1`})
        AND (${status ? sql`o.status = ${status}` : sql`1=1`})
        AND (${searchPattern ? sql`(o.id::text ILIKE ${searchPattern} OR l.lab_name ILIKE ${searchPattern})` : sql`1=1`});
    `;

    const total = countRow?.total || 0;

    const rawOrders = await sql`
      SELECT
        o.id, o.lab_id, o.patient_id, o.status, o.payment_status, o.total_amount,
        o.settlement_status, o.created_at, o.scheduled_at, o.visit_type,
        l.lab_name, l.phone_number as lab_phone,
        p.full_name as patient_name,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', oi.id,
            'test_id', oi.test_id,
            'test_name', COALESCE(oi.test_name, lt.test_name, 'Diagnostic Investigation'),
            'price', COALESCE(oi.price::numeric, lt.price::numeric, 0),
            'category_id', lt.category_id,
            'category_name', COALESCE(cat.name, lt.commission_category, 'General Pathology'),
            'commission_percentage', COALESCE(cat.commission_percentage::numeric, 20.00)
          )), '[]'::json)
          FROM lab_test_order_items oi
          LEFT JOIN lab_tests lt ON lt.id = oi.test_id
          LEFT JOIN lab_test_categories cat ON cat.id = lt.category_id
          WHERE oi.order_id = o.id
        ) as items
      FROM lab_test_orders o
      LEFT JOIN lab_details l ON l.id = o.lab_id
      LEFT JOIN patient_details p ON p.id = o.patient_id
      WHERE (${labId ? sql`o.lab_id = ${labId}` : sql`1=1`})
        AND (${status ? sql`o.status = ${status}` : sql`1=1`})
        AND (${searchPattern ? sql`(o.id::text ILIKE ${searchPattern} OR l.lab_name ILIKE ${searchPattern} OR p.full_name ILIKE ${searchPattern})` : sql`1=1`})
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    // Calculate audit breakdown per order down to exact paisa
    const orders = rawOrders.map(o => {
      const grossAmount = Number(o.total_amount || 0);
      let items = o.items || [];
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
      }

      let orderComm = 0;
      let orderLabShare = 0;

      if (items.length > 0) {
        items = items.map(it => {
          const itemPrice = Number(it.price || 0);
          const commPct = Number(it.commission_percentage || 20.00);
          const itemComm = Math.round((itemPrice * (commPct / 100)) * 100) / 100;
          const itemLab = Math.round((itemPrice - itemComm) * 100) / 100;
          orderComm += itemComm;
          orderLabShare += itemLab;
          return {
            ...it,
            price: itemPrice,
            commission_percentage: commPct,
            commission_amount: itemComm,
            lab_share: itemLab,
          };
        });
        orderComm = Math.round(orderComm * 100) / 100;
        orderLabShare = Math.round(orderLabShare * 100) / 100;
      } else {
        // Fallback standard rate (20%)
        orderComm = Math.round((grossAmount * 0.20) * 100) / 100;
        orderLabShare = Math.round((grossAmount - orderComm) * 100) / 100;
      }

      const effectiveCommRate = grossAmount > 0 ? Math.round((orderComm / grossAmount) * 1000) / 10 : 20.00;

      return {
        ...o,
        items,
        calculated_gross: grossAmount,
        calculated_commission: orderComm,
        calculated_lab_share: orderLabShare,
        effective_commission_rate: effectiveCommRate,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...summary.data,
        categories,
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
    console.error("GET /api/admin/finance/lab-ledger error:", error);
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

    const result = await generate10DayLabPayoutBatches({
      periodBounds,
      labId: body.lab_id || null,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("POST /api/admin/finance/lab-ledger error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
