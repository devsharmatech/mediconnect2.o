import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET single row of contact information
export async function GET() {
    try {
        const rows = await sql`
            SELECT * FROM contact_information 
            ORDER BY created_at ASC 
            LIMIT 1
        `;
        return NextResponse.json({ success: true, data: rows[0] || {} }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/contact error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST/PUT to update contact information
export async function POST(req) {
    try {
        const payload = await req.json();
        const existing = await sql`SELECT id FROM contact_information LIMIT 1`;

        if (existing.length > 0) {
            const rows = await sql`
                UPDATE contact_information
                SET 
                    support_email = ${payload.support_email !== undefined ? payload.support_email : sql`support_email`},
                    support_phone = ${payload.support_phone !== undefined ? payload.support_phone : sql`support_phone`},
                    support_hours = ${payload.support_hours !== undefined ? payload.support_hours : sql`support_hours`},
                    consultation_support_text = ${payload.consultation_support_text !== undefined ? payload.consultation_support_text : sql`consultation_support_text`},
                    grievance_name = ${payload.grievance_name !== undefined ? payload.grievance_name : sql`grievance_name`},
                    grievance_email = ${payload.grievance_email !== undefined ? payload.grievance_email : sql`grievance_email`},
                    grievance_response_time = ${payload.grievance_response_time !== undefined ? payload.grievance_response_time : sql`grievance_response_time`},
                    medical_notice = ${payload.medical_notice !== undefined ? payload.medical_notice : sql`medical_notice`},
                    updated_at = NOW()
                WHERE id = ${existing[0].id}
                RETURNING *
            `;
            return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
        } else {
            const rows = await sql`
                INSERT INTO contact_information (
                    support_email, support_phone, support_hours, consultation_support_text,
                    grievance_name, grievance_email, grievance_response_time, medical_notice,
                    created_at, updated_at
                ) VALUES (
                    ${payload.support_email || null},
                    ${payload.support_phone || null},
                    ${payload.support_hours || null},
                    ${payload.consultation_support_text || null},
                    ${payload.grievance_name || null},
                    ${payload.grievance_email || null},
                    ${payload.grievance_response_time || null},
                    ${payload.medical_notice || null},
                    NOW(),
                    NOW()
                )
                RETURNING *
            `;
            return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
        }
    } catch (err) {
        console.error("POST /api/cms/contact error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
