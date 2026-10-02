import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { logAudit } from "@/lib/layer1/auditLogger";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/drugs
 * List all drugs with pagination and search
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const query_str = searchParams.get("q");
        const category = searchParams.get("category");
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 50;
        const offset = (page - 1) * limit;

        const conditions = [];

        if (query_str) {
            const pattern = `%${query_str}%`;
            conditions.push(sql`(name ILIKE ${pattern} OR salt ILIKE ${pattern})`);
        }
        if (category) {
            conditions.push(sql`category = ${category}`);
        }

        const whereClause = conditions.length > 0
            ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
            : sql``;

        const [countRes, data] = await Promise.all([
            sql`SELECT count(*)::int as count FROM drug_master ${whereClause}`,
            sql`
                SELECT * 
                FROM drug_master 
                ${whereClause} 
                ORDER BY name ASC 
                LIMIT ${limit} OFFSET ${offset}
            `
        ]);

        const count = countRes[0]?.count || 0;

        return NextResponse.json({
            success: true,
            data,
            pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
        }, { status: 200 });
    } catch (err) {
        console.error("GET /api/admin/drugs error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/drugs
 * Create a new drug
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { name, salt, power, category, is_active, admin_id } = body;

        if (!name || !category || !admin_id) {
            return NextResponse.json({ success: false, error: "name, category, and admin_id are required" }, { status: 400 });
        }

        const rows = await sql`
            INSERT INTO drug_master (
                name, salt, power, category, is_active
            ) VALUES (
                ${name}, 
                ${salt || null}, 
                ${power || null}, 
                ${category}, 
                ${is_active !== false}
            )
            RETURNING *
        `;

        const data = rows[0];

        await logAudit({
            entity_type: "drug_master",
            entity_id: data.id,
            previous_state: null,
            new_state: data,
            changed_by: admin_id,
            change_description: `Added drug: ${name}`
        });

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/drugs
 * Update a drug
 */
export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, name, salt, power, category, is_active, admin_id } = body;

        if (!id || !admin_id) {
            return NextResponse.json({ success: false, error: "id and admin_id are required" }, { status: 400 });
        }

        // Fetch old state
        const oldRows = await sql`SELECT * FROM drug_master WHERE id = ${id} LIMIT 1`;
        if (oldRows.length === 0) {
            return NextResponse.json({ success: false, error: "Drug not found" }, { status: 404 });
        }
        const oldData = oldRows[0];

        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (salt !== undefined) updates.salt = salt;
        if (power !== undefined) updates.power = power;
        if (category !== undefined) updates.category = category;
        if (is_active !== undefined) updates.is_active = is_active;

        const updatedRows = await sql`
            UPDATE drug_master
            SET ${sql(updates)}
            WHERE id = ${id}
            RETURNING *
        `;

        const data = updatedRows[0];

        await logAudit({
            entity_type: "drug_master",
            entity_id: id,
            previous_state: oldData,
            new_state: data,
            changed_by: admin_id,
            change_description: `Updated drug: ${name || oldData.name}`
        });

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/drugs
 * Remove a drug
 */
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const admin_id = searchParams.get("admin_id");

        if (!id || !admin_id) {
            return NextResponse.json({ success: false, error: "id and admin_id are required" }, { status: 400 });
        }

        const oldRows = await sql`SELECT * FROM drug_master WHERE id = ${id} LIMIT 1`;
        if (oldRows.length === 0) {
            return NextResponse.json({ success: false, error: "Drug not found" }, { status: 404 });
        }
        const oldData = oldRows[0];

        await sql`DELETE FROM drug_master WHERE id = ${id}`;

        await logAudit({
            entity_type: "drug_master",
            entity_id: id,
            previous_state: oldData,
            new_state: null,
            changed_by: admin_id,
            change_description: `Deleted drug: ${oldData?.name}`
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
