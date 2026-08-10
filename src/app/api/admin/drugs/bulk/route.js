import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { logAudit } from "@/lib/layer1/auditLogger";

/**
 * GET /api/admin/drugs/bulk
 * Export all drugs as a flat array
 */
export async function GET(req) {
    try {
        const { data, error } = await supabase
            .from("drug_master")
            .select("name, salt, power, category, is_active")
            .order("name");
        
        if (error) throw error;
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

        // Prepare data for upsert
        const upsertData = drugs.map(d => ({
            name: d.name,
            salt: d.salt || null,
            power: d.power || null,
            category: d.category,
            is_active: d.is_active !== false,
            updated_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from("drug_master")
            .upsert(upsertData, { onConflict: "name" }) // Assuming name is unique or we want to overwrite
            .select();

        if (error) throw error;

        await logAudit({
            entity_type: "drug_master",
            entity_id: "00000000-0000-0000-0000-000000000000",
            previous_state: "BULK",
            new_state: { count: data.length },
            changed_by: admin_id,
            change_description: `Bulk imported ${data.length} drugs`
        });

        return NextResponse.json({ success: true, count: data.length }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
