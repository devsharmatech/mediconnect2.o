import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const specialization = searchParams.get("specialization");

        let data;
        if (specialization) {
            data = await sql`
                SELECT * FROM prescription_templates 
                WHERE specialization = ${specialization}
                ORDER BY created_at DESC
            `;
        } else {
            data = await sql`
                SELECT * FROM prescription_templates 
                ORDER BY created_at DESC
            `;
        }

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/prescription-templates error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const payload = await req.json();
        const { 
            specialization, 
            name, 
            appointment_type, 
            description,
            template_structure, 
            default_values,
            is_active 
        } = payload;

        if (!specialization || !name) {
            return NextResponse.json(
                { success: false, error: "Missing required template fields (specialization, name)." },
                { status: 400 }
            );
        }

        const rows = await sql`
            INSERT INTO prescription_templates (
                specialization, name, appointment_type, description,
                template_structure, default_values, is_active, created_at, updated_at
            ) VALUES (
                ${specialization},
                ${name},
                ${appointment_type || 'clinic_visit'},
                ${description || null},
                ${template_structure ? JSON.stringify(template_structure) : '[]'},
                ${default_values ? JSON.stringify(default_values) : '{}'},
                ${is_active !== undefined ? is_active : true},
                NOW(),
                NOW()
            )
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
    } catch (err) {
        console.error("POST /api/cms/prescription-templates error:", err);
        if (err.code === '23505') {
            return NextResponse.json({ success: false, error: "A template for this specialization, appointment type, and name already exists." }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
