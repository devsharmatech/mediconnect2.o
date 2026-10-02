import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { logAudit } from "@/lib/layer1/auditLogger";

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const data = await sql`
            SELECT * 
            FROM drug_categories 
            ORDER BY name ASC
        `;
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, description, admin_id } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ success: false, error: "Category name is required" }, { status: 400 });
        }

        const rows = await sql`
            INSERT INTO drug_categories (name, description, created_at, updated_at)
            VALUES (${name.trim()}, ${description || null}, NOW(), NOW())
            RETURNING *
        `;

        const data = rows[0];

        await logAudit({
            entity_type: "drug_categories",
            entity_id: data.id,
            previous_state: null,
            new_state: data,
            changed_by: admin_id,
            change_description: `Added category: ${name}`
        });

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, name, description, admin_id } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
        }

        const oldRows = await sql`SELECT * FROM drug_categories WHERE id = ${id} LIMIT 1`;
        if (oldRows.length === 0) {
            return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
        }
        const old = oldRows[0];

        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name.trim();
        if (description !== undefined) updates.description = description;

        const updatedRows = await sql`
            UPDATE drug_categories
            SET ${sql(updates)}
            WHERE id = ${id}
            RETURNING *
        `;

        const data = updatedRows[0];

        await logAudit({
            entity_type: "drug_categories",
            entity_id: id,
            previous_state: old,
            new_state: data,
            changed_by: admin_id,
            change_description: `Updated category: ${name || old.name}`
        });

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const admin_id = searchParams.get("admin_id");

        if (!id) {
            return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
        }

        const oldRows = await sql`SELECT * FROM drug_categories WHERE id = ${id} LIMIT 1`;
        if (oldRows.length === 0) {
            return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
        }
        const old = oldRows[0];

        await sql`DELETE FROM drug_categories WHERE id = ${id}`;

        await logAudit({
            entity_type: "drug_categories",
            entity_id: id,
            previous_state: old,
            new_state: null,
            changed_by: admin_id,
            change_description: `Deleted category: ${old?.name}`
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
