import { NextResponse } from 'next/server';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';
import { getTallyMapping, saveTallyMapping } from '@/lib/tallyExporter';

export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const mapping = await getTallyMapping();
    return NextResponse.json({ success: true, data: mapping }, { status: 200 });

  } catch (error) {
    console.error("GET /api/admin/finance/tally/config error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const updated = await saveTallyMapping(body);

    return NextResponse.json({
      success: true,
      message: "Tally configuration updated successfully",
      data: updated,
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/admin/finance/tally/config error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
