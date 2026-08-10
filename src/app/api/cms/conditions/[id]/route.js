import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        
        // Allow querying by ID or by SLUG
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const matchColumn = isUUID ? "id" : "slug";

        const { data, error } = await supabase
            .from("cms_conditions")
            .select("*")
            .eq(matchColumn, id)
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const payload = await req.json();

        if (payload.title && !payload.slug) {
            payload.slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }
        
        const { data, error } = await supabase
            .from("cms_conditions")
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        
        const { error } = await supabase
            .from("cms_conditions")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
