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
    const filter = searchParams.get('filter') || 'all'; // 'all' | 'paid' | 'clinic' | 'video' | 'home'
    const search = (searchParams.get('search') || '').trim();
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const searchPattern = search ? `%${search}%` : null;

    // Count total matching rows
    const [countRow] = await sql`
      SELECT COUNT(*)::int AS total
      FROM appointments a
      LEFT JOIN patient_details pd ON pd.id = a.patient_id
      WHERE a.doctor_id = ${doctorId}
        AND (a.status = 'completed' OR a.payment_status = 'paid' OR COALESCE(a.final_fee, 0) > 0 OR COALESCE(a.original_fee, 0) > 0)
        AND (${startDate ? sql`a.appointment_date >= ${startDate}::date` : sql`1=1`})
        AND (${endDate ? sql`a.appointment_date <= ${endDate}::date` : sql`1=1`})
        AND (${filter === 'paid' ? sql`(COALESCE(a.final_fee, 0) > 0 OR COALESCE(a.original_fee, 0) > 0)` : sql`1=1`})
        AND (${filter === 'clinic' ? sql`a.appointment_type ILIKE '%clinic%'` : filter === 'video' ? sql`a.appointment_type ILIKE '%video%'` : filter === 'home' ? sql`a.appointment_type ILIKE '%home%'` : sql`1=1`})
        AND (${searchPattern ? sql`(a.id::text ILIKE ${searchPattern} OR a.appointment_date::text ILIKE ${searchPattern} OR pd.full_name ILIKE ${searchPattern})` : sql`1=1`})
    `;
    const total = countRow?.total || 0;

    // Fetch paginated rows with patient details and payment info
    const bookings = await sql`
      SELECT
        a.id, a.patient_id, a.appointment_date, a.appointment_time, a.appointment_type, a.status,
        a.payment_status, a.final_fee, a.original_fee, a.commission_rate, a.commission_amount,
        a.commission_gst_amount, a.doctor_tds_amount, a.doctor_net_payable,
        a.financial_snapshot, a.settlement_status, a.completed_at, a.created_at,
        pd.full_name AS patient_name,
        pd.email AS patient_email,
        u.phone_number AS patient_phone
      FROM appointments a
      LEFT JOIN patient_details pd ON pd.id = a.patient_id
      LEFT JOIN users u ON u.id = a.patient_id
      WHERE a.doctor_id = ${doctorId}
        AND (a.status = 'completed' OR a.payment_status = 'paid' OR COALESCE(a.final_fee, 0) > 0 OR COALESCE(a.original_fee, 0) > 0)
        AND (${startDate ? sql`a.appointment_date >= ${startDate}::date` : sql`1=1`})
        AND (${endDate ? sql`a.appointment_date <= ${endDate}::date` : sql`1=1`})
        AND (${filter === 'paid' ? sql`(COALESCE(a.final_fee, 0) > 0 OR COALESCE(a.original_fee, 0) > 0)` : sql`1=1`})
        AND (${filter === 'clinic' ? sql`a.appointment_type ILIKE '%clinic%'` : filter === 'video' ? sql`a.appointment_type ILIKE '%video%'` : filter === 'home' ? sql`a.appointment_type ILIKE '%home%'` : sql`1=1`})
        AND (${searchPattern ? sql`(a.id::text ILIKE ${searchPattern} OR a.appointment_date::text ILIKE ${searchPattern} OR pd.full_name ILIKE ${searchPattern})` : sql`1=1`})
      ORDER BY a.appointment_date DESC, a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const sanitizedBookings = bookings.map((bk) => {
      let pName = String(bk.patient_name || '').trim();
      if (!pName || pName.toUpperCase().includes('DE-IDENTIFIED') || pName.toUpperCase().includes('ANONYMIZED')) {
        pName = 'Patient';
      }
      return {
        ...bk,
        patient_name: pName,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        bookings: sanitizedBookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + sanitizedBookings.length < total,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/doctor/revenue/bookings error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
