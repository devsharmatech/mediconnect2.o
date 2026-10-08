import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET header for a specific page
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page');

        if (!page) {
            const rows = await sql`
                SELECT * FROM section_headers 
                ORDER BY id ASC
            `;
            return NextResponse.json({ success: true, data: rows }, { status: 200 });
        }

        const rows = await sql`
            SELECT * FROM section_headers 
            WHERE page_identifier = ${page}
            LIMIT 1
        `;

        return NextResponse.json({ success: true, data: rows[0] || {} }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/section-headers error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST/PUT to update section header
export async function POST(req) {
    try {
        const payload = await req.json();

        if (!payload.page_identifier) {
            return NextResponse.json({ success: false, error: "Missing 'page_identifier'" }, { status: 400 });
        }

        const existing = await sql`
            SELECT id FROM section_headers 
            WHERE page_identifier = ${payload.page_identifier}
            LIMIT 1
        `;

        if (existing.length > 0) {
            const rows = await sql`
                UPDATE section_headers
                SET 
                    title = ${payload.title !== undefined ? payload.title : sql`title`},
                    heading = ${payload.heading !== undefined ? payload.heading : sql`heading`},
                    subheading = ${payload.subheading !== undefined ? payload.subheading : sql`subheading`},
                    updated_at = NOW()
                WHERE id = ${existing[0].id}
                RETURNING *
            `;
            return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
        } else {
            const rows = await sql`
                INSERT INTO section_headers (
                    page_identifier, title, heading, subheading, created_at, updated_at
                ) VALUES (
                    ${payload.page_identifier},
                    ${payload.title || null},
                    ${payload.heading || null},
                    ${payload.subheading || null},
                    NOW(),
                    NOW()
                )
                RETURNING *
            `;
            return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
        }
    } catch (err) {
        console.error("POST /api/cms/section-headers error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
