import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req, { params }) {
    try {
        const { id } = await params;

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        let rows;
        if (isUUID) {
            rows = await sql`SELECT * FROM services WHERE id = ${id} LIMIT 1`;
        } else {
            rows = await sql`SELECT * FROM services WHERE slug = ${id} LIMIT 1`;
        }

        if (rows.length === 0) {
            return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/services/[id] error:", err);
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
            UPDATE services
            SET 
                title = ${payload.title !== undefined ? payload.title : sql`title`},
                slug = ${slug !== undefined ? slug : sql`slug`},
                description = ${payload.description !== undefined ? payload.description : sql`description`},
                detailed_content = ${payload.detailed_content !== undefined ? payload.detailed_content : sql`detailed_content`},
                icon = ${payload.icon !== undefined ? payload.icon : sql`icon`},
                icon_name = ${payload.icon_name !== undefined ? payload.icon_name : sql`icon_name`},
                image = ${payload.image !== undefined ? payload.image : sql`image`},
                link = ${payload.link !== undefined ? payload.link : sql`link`},
                display_order = ${payload.display_order !== undefined ? payload.display_order : sql`display_order`},
                status = ${payload.status !== undefined ? payload.status : sql`status`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/services/[id] error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;

        await sql`DELETE FROM services WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/services/[id] error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
