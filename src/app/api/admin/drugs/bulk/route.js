import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { logAudit } from "@/lib/layer1/auditLogger";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/drugs/bulk
 * Export all drugs as a flat array
 */
export async function GET(req) {
    try {
        const data = await sql`
            SELECT name, salt, power, category, is_active
            FROM drug_master
            ORDER BY name ASC
        `;
        
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/drugs/bulk
 * Import drugs from a list.
 * Body: { drugs: [{ name, category, is_active }], admin_id }
 */
export async function POST(req) {
    try {
        const { drugs, admin_id } = await req.json();

        if (!Array.isArray(drugs) || drugs.length === 0 || !admin_id) {
            return NextResponse.json({ success: false, error: "Valid drugs array and admin_id are required" }, { status: 400 });
        }

        // Deduplicate incoming drugs array by name to prevent cardinal violations
        const uniqueDrugsMap = new Map();
        for (const d of drugs) {
            if (!d.name || !d.name.trim()) continue;
            uniqueDrugsMap.set(d.name.trim(), {
                name: d.name.trim(),
                salt: d.salt || null,
                power: d.power || null,
                category: d.category || "General",
                is_active: d.is_active !== false,
            });
        }

        const upsertData = Array.from(uniqueDrugsMap.values());

        if (upsertData.length === 0) {
            return NextResponse.json({ success: false, error: "No valid drug rows provided" }, { status: 400 });
        }

        // Batch insert in chunks of 500
        const chunkSize = 500;
        let totalCount = 0;

        for (let i = 0; i < upsertData.length; i += chunkSize) {
            const chunk = upsertData.slice(i, i + chunkSize);
            const res = await sql`
                INSERT INTO drug_master (name, salt, power, category, is_active, updated_at)
                VALUES ${sql(chunk.map(c => [c.name, c.salt, c.power, c.category, c.is_active, sql`NOW()`]))}
                ON CONFLICT (name) DO UPDATE SET
                    salt = EXCLUDED.salt,
                    power = EXCLUDED.power,
                    category = EXCLUDED.category,
                    is_active = EXCLUDED.is_active,
                    updated_at = NOW()
                RETURNING id
            `;
            totalCount += res.length;
        }

        await logAudit({
            entity_type: "drug_master",
            entity_id: "00000000-0000-0000-0000-000000000000",
            previous_state: "BULK",
            new_state: { count: totalCount },
            changed_by: admin_id,
            change_description: `Bulk imported ${totalCount} drugs`
        });

        return NextResponse.json({ success: true, count: totalCount }, { status: 200 });
    } catch (err) {
        console.error("Bulk drug import error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
