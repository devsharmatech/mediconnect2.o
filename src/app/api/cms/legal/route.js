import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const pageType = searchParams.get('type');
        
        let query = supabase.from("legal_pages").select("*");
        if (pageType) {
            query = query.eq('page_type', pageType);
            const { data, error } = await query.single();
            if (error && error.code !== "PGRST116") throw error;
            return NextResponse.json({ success: true, data }, { status: 200 });
        } else {
            const { data, error } = await query.order("created_at", { ascending: false });
            if (error) throw error;
            return NextResponse.json({ success: true, data }, { status: 200 });
        }
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// Upsert by page_type
export async function POST(req) {
    try {
        const payload = await req.json(); // { page_type, title, content }
        
        // Find existing
        const { data: existing } = await supabase.from("legal_pages").select("id").eq("page_type", payload.page_type).single();

        if (existing) {
            const { data, error } = await supabase
                .from("legal_pages")
                .update({ ...payload, updated_at: new Date().toISOString() })
                .eq("id", existing.id)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ success: true, data }, { status: 200 });
        } else {
            const { data, error } = await supabase
                .from("legal_pages")
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ success: true, data }, { status: 201 });
        }

    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
