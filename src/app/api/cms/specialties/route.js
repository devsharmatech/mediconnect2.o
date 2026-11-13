import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req?.url || "http://localhost/api/cms/specialties");
        const activeOnly = searchParams.get("active_only") === "true";

        let data;
        try {
            if (activeOnly) {
                data = await sql`
                    SELECT * FROM specialty 
                    WHERE is_active = true
                    ORDER BY display_order ASC, name ASC
                `;
            } else {
                data = await sql`
                    SELECT * FROM specialty 
                    ORDER BY display_order ASC, name ASC
                `;
            }
        } catch (firstErr) {
            if (firstErr?.code === 'CONNECT_TIMEOUT' || firstErr?.message?.includes('CONNECT_TIMEOUT')) {
                console.warn("[specialties] Retrying query after initial connect timeout...");
                if (activeOnly) {
                    data = await sql`
                        SELECT * FROM specialty 
                        WHERE is_active = true
                        ORDER BY display_order ASC, name ASC
                    `;
                } else {
                    data = await sql`
                        SELECT * FROM specialty 
                        ORDER BY display_order ASC, name ASC
                    `;
                }
            } else {
                throw firstErr;
            }
        }
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/specialties error:", err);
        return NextResponse.json({ 
            success: false, 
            error: err.message,
            data: [
                { id: "gp", name: "General Physician", is_active: true, display_order: 1 },
                { id: "derma", name: "Dermatology", is_active: true, display_order: 2 },
                { id: "gynae", name: "Gynecology", is_active: true, display_order: 3 },
                { id: "ped", name: "Pediatrics", is_active: true, display_order: 4 },
                { id: "gynae_obs", name: "Gynecology & Obstetrics", is_active: true, display_order: 5 },
                { id: "ortho", name: "Orthopedics", is_active: true, display_order: 5 },
                { id: "eye", name: "Ophthalmology", is_active: true, display_order: 6 },
                { id: "cardio", name: "Cardiology", is_active: true, display_order: 7 },
                { id: "neuro", name: "Neurology", is_active: true, display_order: 7 },
                { id: "endo", name: "Endocrinology", is_active: true, display_order: 8 },
                { id: "nephro_doc", name: "Nephrologist", is_active: true, display_order: 9 },
                { id: "psych", name: "Psychiatry", is_active: true, display_order: 10 },
                { id: "dent", name: "Dentistry", is_active: true, display_order: 11 },
                { id: "pulm", name: "Pulmonology", is_active: true, display_order: 11 },
                { id: "gastro", name: "Gastroenterology", is_active: true, display_order: 12 },
                { id: "surg", name: "Surgery", is_active: true, display_order: 12 },
                { id: "ent", name: "ENT", is_active: true, display_order: 13 },
                { id: "uro", name: "Urology", is_active: true, display_order: 13 },
                { id: "nephro", name: "Nephrology", is_active: true, display_order: 15 },
                { id: "onco", name: "Oncology", is_active: true, display_order: 16 },
                { id: "rheuma", name: "Rheumatology", is_active: true, display_order: 17 },
                { id: "dental", name: "Dental", is_active: true, display_order: 18 },
                { id: "physio", name: "Physiotherapy", is_active: true, display_order: 19 },
                { id: "gen_surg", name: "General Surgery", is_active: true, display_order: 20 },
            ]
        }, { status: 200 });
    }
}

export async function POST(req) {
    try {
        const payload = await req.json();
        const rows = await sql`
            INSERT INTO specialty (
                name, description, icon_name, is_active, display_order, created_at, updated_at
            ) VALUES (
                ${payload.name || null},
                ${payload.description || null},
                ${payload.icon_name || null},
                ${payload.is_active !== undefined ? payload.is_active : true},
                ${payload.display_order !== undefined ? payload.display_order : 0},
                NOW(),
                NOW()
            )
            RETURNING *
        `;
        return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
    } catch (err) {
        console.error("POST /api/cms/specialties error:", err);
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
            UPDATE specialty
            SET 
                name = ${updateData.name !== undefined ? updateData.name : sql`name`},
                description = ${updateData.description !== undefined ? updateData.description : sql`description`},
                icon_name = ${updateData.icon_name !== undefined ? updateData.icon_name : sql`icon_name`},
                is_active = ${updateData.is_active !== undefined ? updateData.is_active : sql`is_active`},
                display_order = ${updateData.display_order !== undefined ? updateData.display_order : sql`display_order`},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/cms/specialties error:", err);
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

        await sql`DELETE FROM specialty WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/cms/specialties error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
