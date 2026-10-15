import { NextResponse } from 'next/server';
import sql from '@/lib/db';
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
      if (docRows.length > 0) doctorId = doctorIdParam;
    }

    if (!doctorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
    const offset = (page - 1) * limit;
    const filter = searchParams.get('filter') || 'all'; // 'all' | 'paid'
    const search = (searchParams.get('search') || '').trim();
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const searchPattern = search ? `%${search}%` : null;

    // Count total matching rows
    const [countRow] = await sql`
      SELECT COUNT(*)::int AS total
      FROM appointments
      WHERE doctor_id = ${doctorId}
        AND (status = 'completed' OR payment_status = 'paid')
        AND (${startDate ? sql`appointment_date >= ${startDate}::date` : sql`1=1`})
        AND (${endDate ? sql`appointment_date <= ${endDate}::date` : sql`1=1`})
        AND (${filter === 'paid' ? sql`(COALESCE(final_fee, 0) > 0 OR COALESCE(original_fee, 0) > 0)` : sql`1=1`})
        AND (${searchPattern ? sql`(id::text ILIKE ${searchPattern} OR appointment_date::text ILIKE ${searchPattern})` : sql`1=1`})
    `;
    const total = countRow?.total || 0;

    // Fetch paginated rows
    const bookings = await sql`
      SELECT
        id, appointment_date, appointment_time, appointment_type, status,
        payment_status, final_fee, original_fee, commission_rate, commission_amount,
        commission_gst_amount, doctor_tds_amount, doctor_net_payable,
        financial_snapshot, settlement_status, completed_at, created_at
      FROM appointments
      WHERE doctor_id = ${doctorId}
        AND (status = 'completed' OR payment_status = 'paid')
        AND (${startDate ? sql`appointment_date >= ${startDate}::date` : sql`1=1`})
        AND (${endDate ? sql`appointment_date <= ${endDate}::date` : sql`1=1`})
        AND (${filter === 'paid' ? sql`(COALESCE(final_fee, 0) > 0 OR COALESCE(original_fee, 0) > 0)` : sql`1=1`})
        AND (${searchPattern ? sql`(id::text ILIKE ${searchPattern} OR appointment_date::text ILIKE ${searchPattern})` : sql`1=1`})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + bookings.length < total,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/doctor/revenue/bookings error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
