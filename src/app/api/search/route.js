import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const typeParam = searchParams.get('type') || 'doctor,lab,record';
    const types = typeParam.split(',').map(t => t.trim());

    if (!query) {
      return NextResponse.json({ success: true, data: [] });
    }

    const searchLower = query.toLowerCase();
    let results = [];

    // Search doctors if requested
    if (types.includes('doctor')) {
      const { data: doctors } = await supabase
        .from('doctor_details')
        .select('id, full_name, specialization, clinic_name')
        .ilike('full_name', `%${searchLower}%`)
        .limit(5);

      if (doctors) {
        results.push(...doctors.map(d => ({
          id: d.id,
          type: 'doctor',
          title: d.full_name,
          subtitle: d.specialization,
          extra: d.clinic_name
        })));
      }
    }

    // Search labs if requested
    if (types.includes('lab')) {
      const { data: labs } = await supabase
        .from('labs')
        .select('id, name, address, services')
        .ilike('name', `%${searchLower}%`)
        .limit(5);

      if (labs) {
        results.push(...labs.map(l => ({
          id: l.id,
          type: 'lab',
          title: l.name,
          subtitle: l.services?.[0] || 'Pathology',
          extra: l.address
        })));
      }
    }

    // Search records (mock or simple) if requested
    if (types.includes('record')) {
      // In a real app we'd search digital_locker_records or similar
      const { data: records } = await supabase
        .from('digital_locker_records')
        .select('id, document_type, document_name')
        .ilike('document_name', `%${searchLower}%`)
        .limit(5);

      if (records) {
        results.push(...records.map(r => ({
          id: r.id,
          type: 'record',
          title: r.document_name,
          subtitle: r.document_type,
        })));
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error in global search API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
