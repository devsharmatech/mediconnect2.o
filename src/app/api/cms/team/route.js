import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
    try {
        const data = await sql`
            SELECT * FROM team_members 
            ORDER BY display_order ASC
        `;
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/team error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const payload = await req.json();
        const rows = await sql`
            INSERT INTO team_members (
                name, role, expertise, image, category, display_order, status, created_at, updated_at
            ) VALUES (
                ${payload.name || null},
                ${payload.role || null},
                ${payload.expertise || null},
                ${payload.image || null},
                ${payload.category || null},
                ${payload.display_order !== undefined ? payload.display_order : 0},
                ${payload.status || 'active'},
                NOW(),
                NOW()
            )
            RETURNING *
        `;
        return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
    } catch (err) {
        console.error("POST /api/cms/team error:", err);
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
            UPDATE team_members
            SET 
                name = ${updateData.name !== undefined ? updateData.name : sql`name`},
                role = ${updateData.role !== undefined ? updateData.role : sql`role`},
                expertise = ${updateData.expertise !== undefined ? updateData.expertise : sql`expertise`},
                image = ${updateData.image !== undefined ? updateData.image : sql`image`},
                category = ${updateData.category !== undefined ? updateData.category : sql`category`},
                display_order = ${updateData.display_order !== undefined ? updateData.display_order : sql`display_order`},
                status = ${updateData.status !== undefined ? updateData.status : sql`status`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/team error:", err);
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

        await sql`DELETE FROM team_members WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/team error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
