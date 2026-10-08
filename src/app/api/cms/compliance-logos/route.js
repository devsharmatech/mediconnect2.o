import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const includeHidden = searchParams.get("includeHidden") === "true";

        let data;
        if (!includeHidden) {
            data = await sql`
                SELECT * FROM compliance_logos 
                WHERE status = 'published'
                ORDER BY display_order ASC
            `;
        } else {
            data = await sql`
                SELECT * FROM compliance_logos 
                ORDER BY display_order ASC
            `;
        }

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/compliance-logos error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const payload = await req.json();
        const rows = await sql`
            INSERT INTO compliance_logos (
                name, title, link, image, display_order, status, created_at
            ) VALUES (
                ${payload.name || null},
                ${payload.title || null},
                ${payload.link || null},
                ${payload.image || null},
                ${payload.display_order !== undefined ? payload.display_order : 0},
                ${payload.status || 'published'},
                NOW()
            )
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
    } catch (err) {
        console.error("POST /api/cms/compliance-logos error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const payload = await req.json();
        const { id, ...updates } = payload;
        
        if (!id) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

        const rows = await sql`
            UPDATE compliance_logos
            SET 
                name = ${updates.name !== undefined ? updates.name : sql`name`},
                title = ${updates.title !== undefined ? updates.title : sql`title`},
                link = ${updates.link !== undefined ? updates.link : sql`link`},
                image = ${updates.image !== undefined ? updates.image : sql`image`},
                display_order = ${updates.display_order !== undefined ? updates.display_order : sql`display_order`},
                status = ${updates.status !== undefined ? updates.status : sql`status`}
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/compliance-logos error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

        await sql`DELETE FROM compliance_logos WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/compliance-logos error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
