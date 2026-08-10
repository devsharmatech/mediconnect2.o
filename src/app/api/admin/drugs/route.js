import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { logAudit } from "@/lib/layer1/auditLogger";

/**
 * GET /api/admin/drugs
 * List all drugs with pagination and search
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const query_str = searchParams.get("q");
        const category = searchParams.get("category");
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 50;
        const offset = (page - 1) * limit;

        let query = supabase.from("drug_master").select("*", { count: "exact" });

        if (query_str) {
            query = query.or(`name.ilike.%${query_str}%,salt.ilike.%${query_str}%`);
        }
        if (category) {
            query = query.eq("category", category);
        }

        const { data, count, error } = await query
            .order("name", { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data,
            pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
        }, { status: 200 });
    } catch (err) {
        console.error("GET /api/admin/drugs error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/drugs
 * Create a new drug
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { name, salt, power, category, is_active, admin_id } = body;

        if (!name || !category || !admin_id) {
            return NextResponse.json({ success: false, error: "name, category, and admin_id are required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("drug_master")
            .insert({ 
                name, 
                salt, 
                power, 
                category, 
                is_active: is_active !== false 
            })
            .select()
            .single();

        if (error) throw error;

        await logAudit({
            entity_type: "drug_master",
            entity_id: data.id,
            previous_state: null,
            new_state: data,
            changed_by: admin_id,
            change_description: `Added drug: ${name}`
        });

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/drugs
 * Update a drug
 */
export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, name, salt, power, category, is_active, admin_id } = body;

        if (!id || !admin_id) {
            return NextResponse.json({ success: false, error: "id and admin_id are required" }, { status: 400 });
        }

        // Fetch old state
        const { data: oldData } = await supabase.from("drug_master").select("*").eq("id", id).single();

        const { data, error } = await supabase
            .from("drug_master")
            .update({ 
                name, 
                salt, 
                power, 
                category, 
                is_active, 
                updated_at: new Date().toISOString() 
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        await logAudit({
            entity_type: "drug_master",
            entity_id: id,
            previous_state: oldData,
            new_state: data,
            changed_by: admin_id,
            change_description: `Updated drug: ${name || oldData.name}`
        });

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/drugs
 * Remove a drug
 */
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const admin_id = searchParams.get("admin_id");

        if (!id || !admin_id) {
            return NextResponse.json({ success: false, error: "id and admin_id are required" }, { status: 400 });
        }

        const { data: oldData } = await supabase.from("drug_master").select("*").eq("id", id).single();

        const { error } = await supabase.from("drug_master").delete().eq("id", id);
        if (error) throw error;

        await logAudit({
            entity_type: "drug_master",
            entity_id: id,
            previous_state: oldData,
            new_state: null,
            changed_by: admin_id,
            change_description: `Deleted drug: ${oldData?.name}`
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
