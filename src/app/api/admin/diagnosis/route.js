import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { logAudit } from "@/lib/layer1/auditLogger";

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeUuid(val) {
  if (!val) return null;
  return UUID_REGEX.test(val) ? val : null;
}

/**
 * GET /api/admin/diagnosis
 * List all diagnoses with pagination and search via AWS RDS
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;
    const categoryFilter = searchParams.get("category") || "";

    const conditions = [];

    if (q) {
      const pattern = `%${q}%`;
      conditions.push(sql`(name ILIKE ${pattern} OR icd_code ILIKE ${pattern} OR category ILIKE ${pattern})`);
    }

    if (categoryFilter) {
      conditions.push(sql`category = ${categoryFilter}`);
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
      : sql``;

    const [countRes, data] = await Promise.all([
      sql`SELECT count(*)::int as count FROM diagnosis_master ${whereClause}`,
      limit < 10000
        ? sql`
            SELECT * 
            FROM diagnosis_master 
            ${whereClause} 
            ORDER BY name ASC 
            LIMIT ${limit} OFFSET ${offset}
          `
        : sql`
            SELECT * 
            FROM diagnosis_master 
            ${whereClause} 
            ORDER BY name ASC 
            LIMIT 10000
          `
    ]);

    const count = countRes[0]?.count || 0;
    
    return NextResponse.json({ 
      success: true, 
      data: data || [],
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error("GET /api/admin/diagnosis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/diagnosis
 * Create a new diagnosis or Bulk Import
 */
export async function POST(req) {
  try {
    const body = await req.json();

    // 1. Dynamic specialty_id fallback lookup
    let fallbackSpecialtyId = null;
    try {
      const existing = await sql`
        SELECT specialty_id FROM diagnosis_master WHERE specialty_id IS NOT NULL LIMIT 1
      `;
      if (existing && existing.length > 0) {
        fallbackSpecialtyId = existing[0].specialty_id;
      }
    } catch (e) {
      console.warn("Failed to look up fallback specialty ID:", e.message);
    }

    // Handle Bulk Import
    if (Array.isArray(body)) {
      const formattedRows = body.map(row => ({
        name: (row.name || "").trim(),
        icd_code: row.icd_code ? row.icd_code.trim() : null,
        description: row.description ? row.description.trim() : null,
        category: row.category ? row.category.trim() : null,
        is_active: row.is_active !== false,
        specialty_id: safeUuid(row.specialty_id) || fallbackSpecialtyId
      })).filter(r => r.name);

      if (formattedRows.length === 0) {
        return NextResponse.json({ success: true, data: [], message: "No valid diagnosis rows." });
      }

      const data = await sql`
        INSERT INTO diagnosis_master ${sql(formattedRows)}
        RETURNING *
      `;

      const admin_id = req.headers.get("x-admin-id") || null;

      // Write bulk import audit log
      await logAudit({
        entity_type: "diagnosis_master",
        entity_id: "00000000-0000-0000-0000-000000000000",
        previous_state: null,
        new_state: { count: formattedRows.length },
        changed_by: admin_id,
        change_description: `Bulk imported ${formattedRows.length} diagnoses`
      });

      return NextResponse.json({
        success: true,
        data,
        message: `${formattedRows.length} diagnoses imported successfully.`
      });
    }

    // Handle Single Insert
    const { name, icd_code, description, is_active, specialty_id, category, admin_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Diagnosis Name is required" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO diagnosis_master (
        name, icd_code, description, category, is_active, specialty_id
      ) VALUES (
        ${name.trim()},
        ${icd_code ? icd_code.trim() : null},
        ${description ? description.trim() : null},
        ${category ? category.trim() : null},
        ${is_active !== false},
        ${safeUuid(specialty_id) || fallbackSpecialtyId}
      )
      RETURNING *
    `;

    const data = rows[0];

    await logAudit({
      entity_type: "diagnosis_master",
      entity_id: data.id,
      previous_state: null,
      new_state: data,
      changed_by: admin_id || null,
      change_description: `Added diagnosis: ${name}`
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/diagnosis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/diagnosis
 * Update an existing diagnosis
 */
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, name, icd_code, description, is_active, specialty_id, category, admin_id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    // Fetch previous state for audit logging
    const oldRows = await sql`SELECT * FROM diagnosis_master WHERE id = ${id} LIMIT 1`;
    if (oldRows.length === 0) {
      return NextResponse.json({ success: false, error: "Diagnosis not found" }, { status: 404 });
    }
    const oldData = oldRows[0];

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (icd_code !== undefined) updates.icd_code = icd_code ? icd_code.trim() : null;
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (category !== undefined) updates.category = category ? category.trim() : null;
    if (is_active !== undefined) updates.is_active = is_active;
    if (specialty_id !== undefined && safeUuid(specialty_id)) updates.specialty_id = specialty_id;

    const updatedRows = await sql`
      UPDATE diagnosis_master
      SET ${sql(updates)}
      WHERE id = ${id}
      RETURNING *
    `;

    const data = updatedRows[0];

    await logAudit({
      entity_type: "diagnosis_master",
      entity_id: id,
      previous_state: oldData,
      new_state: data,
      changed_by: admin_id || null,
      change_description: `Updated diagnosis: ${name || oldData?.name}`
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("PATCH /api/admin/diagnosis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/diagnosis
 * Remove an existing diagnosis
 */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const admin_id = searchParams.get("admin_id") || null;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const oldRows = await sql`SELECT * FROM diagnosis_master WHERE id = ${id} LIMIT 1`;
    if (oldRows.length === 0) {
      return NextResponse.json({ success: false, error: "Diagnosis not found" }, { status: 404 });
    }
    const oldData = oldRows[0];

    await sql`DELETE FROM diagnosis_master WHERE id = ${id}`;

    await logAudit({
      entity_type: "diagnosis_master",
      entity_id: id,
      previous_state: oldData,
      new_state: null,
      changed_by: admin_id,
      change_description: `Deleted diagnosis: ${oldData?.name}`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/diagnosis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
