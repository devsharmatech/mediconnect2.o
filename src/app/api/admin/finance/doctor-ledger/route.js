import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';
import { getAdminFinancialReport, get10DayPeriodBounds } from '@/lib/doctorFinancialEngine';

export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctor_id') || null;
    const status = searchParams.get('status') || null;
    const period = searchParams.get('batch_period') || null;
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const modeParam = searchParams.get('mode') || null;
    const excludeFree = searchParams.get('exclude_free') !== 'false'; // default true

    // Mode filter condition
    let modeCondition = sql`1=1`;
    if (modeParam === 'clinic') {
      modeCondition = sql`(a.appointment_type ILIKE '%clinic%' OR a.appointment_type ILIKE '%person%' OR a.appointment_type ILIKE '%offline%')`;
    } else if (modeParam === 'video') {
      modeCondition = sql`(a.appointment_type ILIKE '%video%' OR a.appointment_type ILIKE '%instant%' OR a.appointment_type = 'consultation')`;
    } else if (modeParam === 'home') {
      modeCondition = sql`a.appointment_type ILIKE '%home%'`;
    }

    // 1. Doctors list for filter dropdown
    const doctors = await sql`
      SELECT id, full_name, email, specialization, clinic_name
      FROM doctor_details
      ORDER BY full_name ASC;
    `;

    // 2. Platform Report / Metrics
    const report = await getAdminFinancialReport({ doctorId });

    // 3. Batches (including settlement proof columns)
    const batches = await sql`
      SELECT 
        b.*, 
        d.full_name as doctor_name, 
        d.email as doctor_email
      FROM doctor_payout_batches b
      LEFT JOIN doctor_details d ON d.id = b.doctor_id
      WHERE (${doctorId ? sql`b.doctor_id = ${doctorId}` : sql`1=1`})
        AND (${status ? sql`b.status = ${status}` : sql`1=1`})
        AND (${period ? sql`b.batch_period = ${period}` : sql`1=1`})
      ORDER BY b.period_start DESC, b.created_at DESC
      LIMIT 50;
    `;

    // 4. Ledger entries count & list
    const searchPattern = search ? `%${search}%` : null;

    const [countRow] = await sql`
      SELECT COUNT(*)::int AS total
      FROM appointments a
      LEFT JOIN doctor_details d ON d.id = a.doctor_id
      WHERE (a.status = 'completed' OR a.payment_status = 'paid')
        AND (${excludeFree ? sql`(COALESCE(a.final_fee, 0) > 0 OR COALESCE(a.original_fee, 0) > 0 OR COALESCE(a.doctor_net_payable, 0) > 0)` : sql`1=1`})
        AND (${doctorId ? sql`a.doctor_id = ${doctorId}` : sql`1=1`})
        AND ${modeCondition}
        AND (${searchPattern ? sql`(a.id::text ILIKE ${searchPattern} OR d.full_name ILIKE ${searchPattern})` : sql`1=1`});
    `;

    const total = countRow?.total || 0;

    const consultations = await sql`
      SELECT
        a.id, a.doctor_id, a.patient_id, a.appointment_date, a.appointment_time,
        a.appointment_type, a.status, a.payment_status, a.final_fee, a.original_fee,
        a.commission_rate, a.commission_amount, a.commission_gst_amount, a.doctor_tds_amount,
        a.doctor_net_payable, a.financial_snapshot, a.settlement_status, a.created_at,
        d.full_name as doctor_name, d.specialization as doctor_specialization,
        p.full_name as patient_name
      FROM appointments a
      LEFT JOIN doctor_details d ON d.id = a.doctor_id
      LEFT JOIN patient_details p ON p.id = a.patient_id
      WHERE (a.status = 'completed' OR a.payment_status = 'paid')
        AND (${excludeFree ? sql`(COALESCE(a.final_fee, 0) > 0 OR COALESCE(a.original_fee, 0) > 0 OR COALESCE(a.doctor_net_payable, 0) > 0)` : sql`1=1`})
        AND (${doctorId ? sql`a.doctor_id = ${doctorId}` : sql`1=1`})
        AND ${modeCondition}
        AND (${searchPattern ? sql`(a.id::text ILIKE ${searchPattern} OR d.full_name ILIKE ${searchPattern} OR p.full_name ILIKE ${searchPattern})` : sql`1=1`})
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    return NextResponse.json({
      success: true,
      data: {
        metrics: report?.data?.platform_summary || report?.platform_summary || null,
        mode_audit: report?.data?.mode_audit || null,
        audit_reconciliation: report?.data?.audit_reconciliation || null,
        doctors,
        batches,
        consultations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + consultations.length < total,
        },
        currentCycle: get10DayPeriodBounds(),
      },
    }, { status: 200 });

  } catch (error) {
    console.error("GET /api/admin/finance/doctor-ledger error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
