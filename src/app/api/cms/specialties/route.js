import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const data = await sql`
            SELECT * FROM specialty 
            ORDER BY display_order ASC
        `;
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/specialties error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const payload = await req.json();
        const rows = await sql`
            INSERT INTO specialty (
                name, description, icon_name, is_active, display_order, created_at, updated_at
            ) VALUES (
                ${payload.name || null},
                ${payload.description || null},
                ${payload.icon_name || null},
                ${payload.is_active !== undefined ? payload.is_active : true},
                ${payload.display_order !== undefined ? payload.display_order : 0},
                NOW(),
                NOW()
            )
            RETURNING *
        `;
        return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
    } catch (err) {
        console.error("POST /api/cms/specialties error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const payload = await req.json();
        const { id, ...updateData } = payload;
        
        if (!id) {
            return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
        }

        const rows = await sql`
            UPDATE specialty
            SET 
                name = ${updateData.name !== undefined ? updateData.name : sql`name`},
                description = ${updateData.description !== undefined ? updateData.description : sql`description`},
                icon_name = ${updateData.icon_name !== undefined ? updateData.icon_name : sql`icon_name`},
                is_active = ${updateData.is_active !== undefined ? updateData.is_active : sql`is_active`},
                display_order = ${updateData.display_order !== undefined ? updateData.display_order : sql`display_order`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/specialties error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
        }

        await sql`DELETE FROM specialty WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/specialties error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
