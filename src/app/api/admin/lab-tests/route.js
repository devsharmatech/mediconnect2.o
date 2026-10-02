import sql from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";

    const offset = (page - 1) * limit;

    const conditions = [];

    if (q) {
      conditions.push(sql`test_name ILIKE ${'%' + q + '%'}`);
    }

    if (category) {
      conditions.push(sql`category = ${category}`);
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
      : sql``;

    const [countRes, data] = await Promise.all([
      sql`SELECT count(*)::int as count FROM lab_master ${whereClause}`,
      limit < 10000
        ? sql`
            SELECT * 
            FROM lab_master 
            ${whereClause} 
            ORDER BY created_at DESC 
            LIMIT ${limit} OFFSET ${offset}
          `
        : sql`
            SELECT * 
            FROM lab_master 
            ${whereClause} 
            ORDER BY created_at DESC 
            LIMIT 10000
          `
    ]);

    const count = countRes[0]?.count || 0;
    
    return NextResponse.json({ 
      success: true, 
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Handle Bulk Import (Array)
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ success: true, data: [], message: "No tests provided." });
      }

      const rowsToInsert = body.map(b => ({
        test_name: b.test_name,
        category: b.category || "General",
        instructions: b.instructions || null,
        is_active: b.is_active !== false,
        test_code: b.test_code || null,
        sample_type: b.sample_type || null,
        container: b.container || null,
        temp: b.temp || null,
        remarks: b.remarks || null,
        schedule: b.schedule || null,
        reporting_schedule: b.reporting_schedule || null,
      }));

      const data = await sql`
        INSERT INTO lab_master ${sql(rowsToInsert)}
        RETURNING *
      `;

      return NextResponse.json({ success: true, data, message: `${data.length} lab tests imported successfully.` });
    }

    // Handle Single Insert
    const rows = await sql`
      INSERT INTO lab_master (
        test_name, category, instructions, is_active, test_code,
        sample_type, container, temp, remarks, schedule, reporting_schedule
      ) VALUES (
        ${body.test_name},
        ${body.category || "General"},
        ${body.instructions || null},
        ${body.is_active !== false},
        ${body.test_code || null},
        ${body.sample_type || null},
        ${body.container || null},
        ${body.temp || null},
        ${body.remarks || null},
        ${body.schedule || null},
        ${body.reporting_schedule || null}
      )
      RETURNING *
    `;
    
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const updates = { ...updateData, updated_at: new Date().toISOString() };
    const rows = await sql`
      UPDATE lab_master
      SET ${sql(updates)}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Lab test not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) throw new Error("ID is required");

    await sql`
      DELETE FROM lab_master
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
