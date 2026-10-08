import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const payload = await req.json();

        const rows = await sql`
            UPDATE prescription_templates
            SET 
                specialization = ${payload.specialization !== undefined ? payload.specialization : sql`specialization`},
                name = ${payload.name !== undefined ? payload.name : sql`name`},
                appointment_type = ${payload.appointment_type !== undefined ? payload.appointment_type : sql`appointment_type`},
                description = ${payload.description !== undefined ? payload.description : sql`description`},
                template_structure = ${payload.template_structure !== undefined ? JSON.stringify(payload.template_structure) : sql`template_structure`},
                default_values = ${payload.default_values !== undefined ? JSON.stringify(payload.default_values) : sql`default_values`},
                is_active = ${payload.is_active !== undefined ? payload.is_active : sql`is_active`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        if (rows.length === 0) {
            return NextResponse.json({ success: false, error: "Template not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/prescription-templates/[id] error:", err);
        if (err.code === '23505') {
            return NextResponse.json({ success: false, error: "A template for this specialization, appointment type, and name already exists." }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;

        await sql`DELETE FROM prescription_templates WHERE id = ${id}`;

        return NextResponse.json({ success: true, message: "Template deleted successfully" }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/prescription-templates/[id] error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
