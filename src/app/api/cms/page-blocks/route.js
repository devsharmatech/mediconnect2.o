import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

// GET /api/cms/page-blocks?page=home
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = searchParams.get("page");

        let query = supabase.from("page_blocks").select("*").order("created_at", { ascending: true });
        
        if (page) {
            query = query.eq("page_identifier", page);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// PUT /api/cms/page-blocks
export async function PUT(req) {
    try {
        const payload = await req.json();
        const { id, eyebrow, title, content, image } = payload;

        if (!id) {
            return NextResponse.json({ success: false, error: "Missing block ID" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("page_blocks")
            .update({
                eyebrow,
                title,
                content,
                image,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
