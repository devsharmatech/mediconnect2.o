import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const isActiveOnly = searchParams.get('active_only') === 'true';

        let query = supabase.from("cms_conditions").select("*").order("display_order", { ascending: true });
        if (isActiveOnly) {
            query = query.eq("status", "active");
        }

        // Try cms_conditions first, fall back to conditions table
        let { data, error } = await query;
        
        if (error) {
            // Fallback to conditions table if cms_conditions fails
            let fallbackQuery = supabase.from("conditions").select("*").order("title", { ascending: true });
            if (isActiveOnly) {
                fallbackQuery = fallbackQuery.eq("status", "active");
            }
            const fallbackResult = await fallbackQuery;
            if (fallbackResult.error) throw fallbackResult.error;
            data = fallbackResult.data;
        }
        
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { title, seo_title, short_description, icon_name, detailed_content, recommended_specialty, status, display_order } = body;

        // Generate slug from title
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const { data, error } = await supabase
            .from('cms_conditions')
            .insert([
                { title, seo_title, slug, short_description, icon_name, detailed_content, recommended_specialty, status: status || 'active', display_order: display_order || 0 }
            ])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
