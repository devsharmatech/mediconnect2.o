import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const specialization = searchParams.get("specialization");

        let query = supabase
            .from("prescription_templates")
            .select("*")
            .order("created_at", { ascending: false });

        if (specialization) {
            query = query.eq("specialization", specialization);
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
        // Extract fields mapped to the user's existing table
        const { 
            specialization, 
            name, 
            appointment_type, 
            description,
            template_structure, 
            default_values,
            is_active 
        } = payload;

        // Validation
        if (!specialization || !name) {
            return NextResponse.json(
                { success: false, error: "Missing required template fields (specialization, name)." },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("prescription_templates")
            .insert([{ 
                specialization, 
                name, 
                appointment_type: appointment_type || 'clinic_visit', 
                description: description || null,
                template_structure: template_structure || [],
                default_values: default_values || {},
                is_active: is_active ?? true
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation code
                return NextResponse.json({ success: false, error: "A template for this specialization, appointment type, and name already exists." }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
