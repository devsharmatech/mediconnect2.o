import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const includeHidden = searchParams.get("includeHidden") === "true";

        let query = supabase.from("compliance_logos").select("*").order("display_order", { ascending: true });
        
        if (!includeHidden) {
            query = query.eq("status", "published");
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const payload = await req.json();
        const { data, error } = await supabase
            .from("compliance_logos")
            .insert([{ ...payload }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const payload = await req.json();
        const { id, ...updates } = payload;
        
        if (!id) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

        const { data, error } = await supabase
            .from("compliance_logos")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

        const { error } = await supabase.from("compliance_logos").delete().eq("id", id);
        if (error) throw error;

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
