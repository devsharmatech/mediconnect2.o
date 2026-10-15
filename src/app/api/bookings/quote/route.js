import { NextResponse } from 'next/server';
import { calculateBookingFinancialQuote } from '@/lib/doctorFinancialEngine';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      doctor_id,
      patient_id,
      appointment_type = 'clinic_visit',
      professional_fee = 0,
      doctor_migration_code = null,
    } = body || {};

    if (!doctor_id) {
      return NextResponse.json({ success: false, error: "doctor_id is required" }, { status: 400 });
    }

    const quoteRes = await calculateBookingFinancialQuote({
      doctor_id,
      patient_id,
      appointment_type,
      professional_fee: Number(professional_fee) || 0,
      doctor_migration_code,
    });

    return NextResponse.json(quoteRes, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/quote error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
