import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

// GET single row, or create if missing
export async function GET() {
    try {
        let { data, error } = await supabase
            .from("homepage_hero")
            .select("*")
            .limit(1)
            .single();

        if (error && error.code !== "PGRST116") {
            throw error;
        }

        return NextResponse.json({ success: true, data: data || {} }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST/PUT to update the single row
export async function POST(req) {
    try {
        const payload = await req.json();

        // Check if a row exists
        const { data: existing } = await supabase.from("homepage_hero").select("id").limit(1).single();

        if (existing) {
            // Update
            const { data, error } = await supabase
                .from("homepage_hero")
                .update({ ...payload, updated_at: new Date().toISOString() })
                .eq("id", existing.id)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ success: true, data }, { status: 200 });
        } else {
            // Insert
            const { data, error } = await supabase
                .from("homepage_hero")
                .insert([{ ...payload }])
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ success: true, data }, { status: 201 });
        }
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
