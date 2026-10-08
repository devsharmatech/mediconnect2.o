import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        let data;
        if (type) {
            data = await sql`
                SELECT * FROM resources 
                WHERE type = ${type}
                ORDER BY created_at DESC
            `;
        } else {
            data = await sql`
                SELECT * FROM resources 
                ORDER BY created_at DESC
            `;
        }

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/resources error:", err);
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
            INSERT INTO resources (
                title, slug, content, image, type, status, created_at, updated_at
            ) VALUES (
                ${payload.title || null},
                ${slug || null},
                ${payload.content || null},
                ${payload.image || null},
                ${payload.type || 'guide'},
                ${payload.status || 'active'},
                NOW(),
                NOW()
            )
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
    } catch (err) {
        console.error("POST /api/cms/resources error:", err);
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
            UPDATE resources
            SET 
                title = ${updateData.title !== undefined ? updateData.title : sql`title`},
                slug = ${slug !== undefined ? slug : sql`slug`},
                content = ${updateData.content !== undefined ? updateData.content : sql`content`},
                image = ${updateData.image !== undefined ? updateData.image : sql`image`},
                type = ${updateData.type !== undefined ? updateData.type : sql`type`},
                status = ${updateData.status !== undefined ? updateData.status : sql`status`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/resources error:", err);
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

        await sql`DELETE FROM resources WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/resources error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
