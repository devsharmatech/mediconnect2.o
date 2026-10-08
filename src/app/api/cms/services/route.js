import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
    try {
        const data = await sql`
            SELECT * FROM services 
            ORDER BY display_order ASC
        `;
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/services error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const payload = await req.json();

        let slug = payload.slug;
        if (payload.title && !slug) {
            slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }

        const rows = await sql`
            INSERT INTO services (
                title, slug, description, detailed_content, icon, icon_name,
                image, link, display_order, status, created_at, updated_at
            ) VALUES (
                ${payload.title || null},
                ${slug || null},
                ${payload.description || null},
                ${payload.detailed_content || null},
                ${payload.icon || null},
                ${payload.icon_name || null},
                ${payload.image || null},
                ${payload.link || null},
                ${payload.display_order !== undefined ? payload.display_order : 0},
                ${payload.status || 'active'},
                NOW(),
                NOW()
            )
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
    } catch (err) {
        console.error("POST /api/cms/services error:", err);
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

        let slug = updateData.slug;
        if (updateData.title && !slug) {
            slug = updateData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }

        const rows = await sql`
            UPDATE services
            SET 
                title = ${updateData.title !== undefined ? updateData.title : sql`title`},
                slug = ${slug !== undefined ? slug : sql`slug`},
                description = ${updateData.description !== undefined ? updateData.description : sql`description`},
                detailed_content = ${updateData.detailed_content !== undefined ? updateData.detailed_content : sql`detailed_content`},
                icon = ${updateData.icon !== undefined ? updateData.icon : sql`icon`},
                icon_name = ${updateData.icon_name !== undefined ? updateData.icon_name : sql`icon_name`},
                image = ${updateData.image !== undefined ? updateData.image : sql`image`},
                link = ${updateData.link !== undefined ? updateData.link : sql`link`},
                display_order = ${updateData.display_order !== undefined ? updateData.display_order : sql`display_order`},
                status = ${updateData.status !== undefined ? updateData.status : sql`status`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/services error:", err);
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

        await sql`DELETE FROM services WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/services error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
