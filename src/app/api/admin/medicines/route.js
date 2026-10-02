import sql from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await sql`
      SELECT *
      FROM drug_master
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ success: true, data });
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
        return NextResponse.json({ success: true, data: [], message: "No medicines provided." });
      }

      const rowsToInsert = body.map(b => ({
        name: b.name,
        salt: b.salt || null,
        power: b.power || null,
        category: b.category || "General",
        is_active: b.is_active !== false,
      }));

      const data = await sql`
        INSERT INTO drug_master ${sql(rowsToInsert)}
        ON CONFLICT (name) DO UPDATE SET
          salt = EXCLUDED.salt,
          power = EXCLUDED.power,
          category = EXCLUDED.category,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
        RETURNING *
      `;

      return NextResponse.json({ success: true, data, message: `${data.length} medicines imported successfully.` });
    }

    // Handle Single Insert
    const rows = await sql`
      INSERT INTO drug_master (name, salt, power, category, is_active)
      VALUES (
        ${body.name},
        ${body.salt || null},
        ${body.power || null},
        ${body.category || "General"},
        ${body.is_active !== false}
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
      UPDATE drug_master
      SET ${sql(updates)}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Medicine not found" }, { status: 404 });
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
      DELETE FROM drug_master
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
