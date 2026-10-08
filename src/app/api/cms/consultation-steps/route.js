import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
    try {
        const data = await sql`
            SELECT * FROM consultation_steps 
            ORDER BY display_order ASC
        `;
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/consultation-steps error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const payload = await req.json();
        const rows = await sql`
            INSERT INTO consultation_steps (
                step_title, step_description, icon, display_order, is_active, created_at, updated_at
            ) VALUES (
                ${payload.step_title || null},
                ${payload.step_description || null},
                ${payload.icon || null},
                ${payload.display_order !== undefined ? payload.display_order : 0},
                ${payload.is_active !== undefined ? payload.is_active : true},
                NOW(),
                NOW()
            )
            RETURNING *
        `;
        return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
    } catch (err) {
        console.error("POST /api/cms/consultation-steps error:", err);
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
            UPDATE consultation_steps
            SET 
                step_title = ${updateData.step_title !== undefined ? updateData.step_title : sql`step_title`},
                step_description = ${updateData.step_description !== undefined ? updateData.step_description : sql`step_description`},
                icon = ${updateData.icon !== undefined ? updateData.icon : sql`icon`},
                display_order = ${updateData.display_order !== undefined ? updateData.display_order : sql`display_order`},
                is_active = ${updateData.is_active !== undefined ? updateData.is_active : sql`is_active`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/consultation-steps error:", err);
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

        await sql`DELETE FROM consultation_steps WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/consultation-steps error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
