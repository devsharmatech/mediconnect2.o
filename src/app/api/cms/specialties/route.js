import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("specialty")
            .select("*")
            .order("display_order", { ascending: true });

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
            .from("specialty")
            .insert([{ ...payload, is_active: payload.is_active ?? true, display_order: payload.display_order ?? 0 }])
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
        const { id, ...updateData } = payload;
        
        const { data, error } = await supabase
            .from("specialty")
            .update({ ...updateData, updated_at: new Date().toISOString() })
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
        const id = searchParams.get('id');
        
        const { error } = await supabase
            .from("specialty")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
