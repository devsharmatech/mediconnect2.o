import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

// GET header for a specific page
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page');

        if (!page) {
            return NextResponse.json({ success: false, error: "Missing 'page' parameter" }, { status: 400 });
        }

        let { data, error } = await supabase
            .from("section_headers")
            .select("*")
            .eq('page_identifier', page)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, data: data || {} }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST/PUT to update section header
export async function POST(req) {
    try {
        const payload = await req.json();

        if (!payload.page_identifier) {
            return NextResponse.json({ success: false, error: "Missing 'page_identifier'" }, { status: 400 });
        }

        // Check if a row exists
        const { data: existing } = await supabase
            .from("section_headers")
            .select("id")
            .eq("page_identifier", payload.page_identifier)
            .maybeSingle();

        if (existing) {
            // Update
            const { data, error } = await supabase
                .from("section_headers")
                .update({ 
                    title: payload.title,
                    heading: payload.heading, 
                    subheading: payload.subheading,
                    updated_at: new Date().toISOString() 
                })
                .eq("id", existing.id)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ success: true, data }, { status: 200 });
        } else {
            // Insert
            const { data, error } = await supabase
                .from("section_headers")
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
