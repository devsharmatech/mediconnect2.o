import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const isActiveOnly = searchParams.get('active_only') === 'true';

        let data;
        if (isActiveOnly) {
            data = await sql`
                SELECT * FROM cms_conditions 
                WHERE status = 'active'
                ORDER BY display_order ASC
            `;
        } else {
            data = await sql`
                SELECT * FROM cms_conditions 
                ORDER BY display_order ASC
            `;
        }
        
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/conditions error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { title, seo_title, short_description, icon_name, detailed_content, recommended_specialty, status, display_order } = body;

        let slug = body.slug;
        if (title && !slug) {
            slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }

        const rows = await sql`
            INSERT INTO cms_conditions (
                title, seo_title, slug, short_description, icon_name,
                detailed_content, recommended_specialty, status, display_order,
                created_at, updated_at
            ) VALUES (
                ${title || null},
                ${seo_title || null},
                ${slug || null},
                ${short_description || null},
                ${icon_name || null},
                ${detailed_content || null},
                ${recommended_specialty || null},
                ${status || 'active'},
                ${display_order !== undefined ? display_order : 0},
                NOW(),
                NOW()
            )
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
    } catch (err) {
        console.error("POST /api/cms/conditions error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
