/**
 * LAYER-1 API: Specialties
 * GET  /api/layer1/specialties — List all active specialties
 * POST /api/layer1/specialties — Create a new specialty (admin)
 */

import { NextResponse } from "next/server";
import { getSpecialties } from "@/lib/layer1/diagnosisService";
import { supabase } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const result = await getSpecialties();
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { name, description, icon_name, display_order } = await req.json();

        if (!name) {
            return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("specialty")
            .insert({ name, description, icon_name, display_order: display_order || 0 })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ success: false, error: "Specialty already exists" }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
