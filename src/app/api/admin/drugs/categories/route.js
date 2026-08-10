import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { logAudit } from "@/lib/layer1/auditLogger";

export async function GET(req) {
    try {
        const { data, error } = await supabase
            .from("drug_categories")
            .select("*")
            .order("name");
        if (error) throw error;
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, description, admin_id } = body;

        const { data, error } = await supabase
            .from("drug_categories")
            .insert({ name, description })
            .select()
            .single();

        if (error) throw error;

        await logAudit({
            entity_type: "drug_categories",
            entity_id: data.id,
            previous_state: null,
            new_state: data,
            changed_by: admin_id,
            change_description: `Added category: ${name}`
        });

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, name, description, admin_id } = body;

        const { data: old } = await supabase.from("drug_categories").select("*").eq("id", id).single();

        const { data, error } = await supabase
            .from("drug_categories")
            .update({ name, description, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        await logAudit({
            entity_type: "drug_categories",
            entity_id: id,
            previous_state: old,
            new_state: data,
            changed_by: admin_id,
            change_description: `Updated category: ${name || old.name}`
        });

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const admin_id = searchParams.get("admin_id");

        const { data: old } = await supabase.from("drug_categories").select("*").eq("id", id).single();

        const { error } = await supabase.from("drug_categories").delete().eq("id", id);
        if (error) throw error;

        await logAudit({
            entity_type: "drug_categories",
            entity_id: id,
            previous_state: old,
            new_state: null,
            changed_by: admin_id,
            change_description: `Deleted category: ${old?.name}`
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
