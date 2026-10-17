import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const labId = safeUuid(searchParams.get('lab_id'));

    const policies = await sql`
      SELECT p.*, l.lab_name
      FROM lab_commercial_policies p
      LEFT JOIN lab_details l ON l.id = p.lab_id
      WHERE (${labId ? sql`p.lab_id = ${labId}` : sql`1=1`})
      ORDER BY p.effective_from DESC, p.created_at DESC;
    `;

    return NextResponse.json({
      success: true,
      data: policies,
    }, { status: 200 });

  } catch (error) {
    console.error("GET /api/admin/finance/lab-commercial-policies error:", error);
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
    const {
      lab_id,
      policy_name,
      category_key = 'all',
      commission_percentage,
      effective_from,
      effective_to,
      agreement_reference,
    } = body;

    const cleanLabId = safeUuid(lab_id);
    if (!cleanLabId || !policy_name || commission_percentage === undefined) {
      return NextResponse.json({
        success: false,
        error: "Valid lab_id, policy_name, and commission_percentage are required",
      }, { status: 400 });
    }

    const [inserted] = await sql`
      INSERT INTO lab_commercial_policies (
        lab_id,
        policy_name,
        category_key,
        commission_percentage,
        effective_from,
        effective_to,
        approved_by,
        agreement_reference,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${cleanLabId},
        ${policy_name},
        ${category_key},
        ${Number(commission_percentage)},
        ${effective_from || sql`CURRENT_DATE`},
        ${effective_to || null},
        ${caller?.name || caller?.email || 'Admin'},
        ${agreement_reference || null},
        true,
        NOW(),
        NOW()
      )
      RETURNING *;
    `;

    return NextResponse.json({
      success: true,
      message: "Commercial policy created successfully",
      data: inserted,
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/admin/finance/lab-commercial-policies error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = safeUuid(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ success: false, error: "Valid policy ID is required" }, { status: 400 });
    }

    await sql`
      UPDATE lab_commercial_policies
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id};
    `;

    return NextResponse.json({
      success: true,
      message: "Commercial policy deactivated",
    }, { status: 200 });

  } catch (error) {
    console.error("DELETE /api/admin/finance/lab-commercial-policies error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
