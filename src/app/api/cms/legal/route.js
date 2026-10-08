import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const pageType = searchParams.get('type');
        
        if (pageType) {
            const rows = await sql`
                SELECT * FROM legal_pages 
                WHERE page_type = ${pageType} 
                LIMIT 1
            `;
            return NextResponse.json({ success: true, data: rows[0] || null }, { status: 200 });
        } else {
            const data = await sql`
                SELECT * FROM legal_pages 
                ORDER BY created_at DESC
            `;
            return NextResponse.json({ success: true, data }, { status: 200 });
        }
    } catch (err) {
        console.error("GET /api/cms/legal error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// Upsert by page_type
export async function POST(req) {
    try {
        const payload = await req.json(); // { page_type, title, content }
        
        if (!payload.page_type) {
            return NextResponse.json({ success: false, error: "Missing 'page_type'" }, { status: 400 });
        }

        const existing = await sql`
            SELECT id FROM legal_pages 
            WHERE page_type = ${payload.page_type} 
            LIMIT 1
        `;

        if (existing.length > 0) {
            const rows = await sql`
                UPDATE legal_pages
                SET 
                    title = ${payload.title !== undefined ? payload.title : sql`title`},
                    content = ${payload.content !== undefined ? payload.content : sql`content`},
                    updated_at = NOW()
                WHERE id = ${existing[0].id}
                RETURNING *
            `;
            return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
        } else {
            const rows = await sql`
                INSERT INTO legal_pages (
                    page_type, title, content, created_at, updated_at
                ) VALUES (
                    ${payload.page_type},
                    ${payload.title || null},
                    ${payload.content || null},
                    NOW(),
                    NOW()
                )
                RETURNING *
            `;
            return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
        }
    } catch (err) {
        console.error("POST /api/cms/legal error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
