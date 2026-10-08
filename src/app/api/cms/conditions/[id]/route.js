import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        let rows;
        if (isUUID) {
            rows = await sql`SELECT * FROM cms_conditions WHERE id = ${id} LIMIT 1`;
        } else {
            rows = await sql`SELECT * FROM cms_conditions WHERE slug = ${id} LIMIT 1`;
        }

        if (rows.length === 0) {
            return NextResponse.json({ success: false, error: "Condition not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/conditions/[id] error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const payload = await req.json();

        let slug = payload.slug;
        if (payload.title && !slug) {
            slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }
        
        const rows = await sql`
            UPDATE cms_conditions
            SET 
                title = ${payload.title !== undefined ? payload.title : sql`title`},
                seo_title = ${payload.seo_title !== undefined ? payload.seo_title : sql`seo_title`},
                slug = ${slug !== undefined ? slug : sql`slug`},
                short_description = ${payload.short_description !== undefined ? payload.short_description : sql`short_description`},
                icon_name = ${payload.icon_name !== undefined ? payload.icon_name : sql`icon_name`},
                detailed_content = ${payload.detailed_content !== undefined ? payload.detailed_content : sql`detailed_content`},
                recommended_specialty = ${payload.recommended_specialty !== undefined ? payload.recommended_specialty : sql`recommended_specialty`},
                status = ${payload.status !== undefined ? payload.status : sql`status`},
                display_order = ${payload.display_order !== undefined ? payload.display_order : sql`display_order`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/conditions/[id] error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        
        await sql`DELETE FROM cms_conditions WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/conditions/[id] error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
