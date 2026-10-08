import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/cms/page-blocks?page=home
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = searchParams.get("page");

        let data;
        if (page) {
            data = await sql`
                SELECT * FROM page_blocks 
                WHERE page_identifier = ${page}
                ORDER BY created_at ASC
            `;
        } else {
            data = await sql`
                SELECT * FROM page_blocks 
                ORDER BY created_at ASC
            `;
        }

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/page-blocks error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// PUT /api/cms/page-blocks
export async function PUT(req) {
    try {
        const payload = await req.json();
        const { id, eyebrow, title, content, image } = payload;

        if (!id) {
            return NextResponse.json({ success: false, error: "Missing block ID" }, { status: 400 });
        }

        const rows = await sql`
            UPDATE page_blocks
            SET
                eyebrow = ${eyebrow !== undefined ? eyebrow : sql`eyebrow`},
                title = ${title !== undefined ? title : sql`title`},
                content = ${content !== undefined ? content : sql`content`},
                image = ${image !== undefined ? image : sql`image`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/page-blocks error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
