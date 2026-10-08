import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
    try {
        const data = await sql`
            SELECT * FROM about_sections 
            ORDER BY display_order ASC
        `;
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/about error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const payload = await req.json();
        const rows = await sql`
            INSERT INTO about_sections (
                section_key, title, content, image, display_order, created_at, updated_at
            ) VALUES (
                ${payload.section_key || null},
                ${payload.title || null},
                ${payload.content || null},
                ${payload.image || null},
                ${payload.display_order !== undefined ? payload.display_order : 0},
                NOW(),
                NOW()
            )
            RETURNING *
        `;
        return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
    } catch (err) {
        console.error("POST /api/cms/about error:", err);
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
            UPDATE about_sections
            SET 
                section_key = ${updateData.section_key !== undefined ? updateData.section_key : sql`section_key`},
                title = ${updateData.title !== undefined ? updateData.title : sql`title`},
                content = ${updateData.content !== undefined ? updateData.content : sql`content`},
                image = ${updateData.image !== undefined ? updateData.image : sql`image`},
                display_order = ${updateData.display_order !== undefined ? updateData.display_order : sql`display_order`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;
        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/about error:", err);
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

        await sql`DELETE FROM about_sections WHERE id = ${id}`;
        return NextResponse.json({ success: true, message: "Deleted successfully" }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/about error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
