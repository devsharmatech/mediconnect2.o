import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
    try {
        const data = await sql`
            SELECT * FROM testimonials 
            ORDER BY display_order ASC
        `;
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/testimonials error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const payload = await req.json();
        const rows = await sql`
            INSERT INTO testimonials (
                patient_name, city, consultation_type, testimonial_text,
                photo, display_order, status, created_at, updated_at
            ) VALUES (
                ${payload.patient_name || null},
                ${payload.city || null},
                ${payload.consultation_type || null},
                ${payload.testimonial_text || null},
                ${payload.photo || null},
                ${payload.display_order !== undefined ? payload.display_order : 0},
                ${payload.status || 'active'},
                NOW(),
                NOW()
            )
            RETURNING *
        `;
        return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
    } catch (err) {
        console.error("POST /api/cms/testimonials error:", err);
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
            UPDATE testimonials
            SET 
                patient_name = ${updateData.patient_name !== undefined ? updateData.patient_name : sql`patient_name`},
                city = ${updateData.city !== undefined ? updateData.city : sql`city`},
                consultation_type = ${updateData.consultation_type !== undefined ? updateData.consultation_type : sql`consultation_type`},
                testimonial_text = ${updateData.testimonial_text !== undefined ? updateData.testimonial_text : sql`testimonial_text`},
                photo = ${updateData.photo !== undefined ? updateData.photo : sql`photo`},
                display_order = ${updateData.display_order !== undefined ? updateData.display_order : sql`display_order`},
                status = ${updateData.status !== undefined ? updateData.status : sql`status`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/testimonials error:", err);
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

        await sql`DELETE FROM testimonials WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/testimonials error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
