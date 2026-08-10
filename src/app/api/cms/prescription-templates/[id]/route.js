import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const payload = await req.json();

        // Prevent updating the ID
        delete payload.id;
        delete payload.created_at;
        delete payload.updated_at;
        delete payload.created_by;

        const { data, error } = await supabase
            .from("prescription_templates")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ success: false, error: "A template for this specialization, appointment type, and name already exists." }, { status: 409 });
            }
            throw error;
        }

        if (!data) {
            return NextResponse.json({ success: false, error: "Template not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;

        const { error } = await supabase
            .from("prescription_templates")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Template deleted successfully" }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
