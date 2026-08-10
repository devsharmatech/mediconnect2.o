import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { user_id } = await req.json();

        if (!user_id) {
            return NextResponse.json({ success: false, message: "user_id required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("lab_details")
            .select("lab_name, owner_name")
            .eq("id", user_id)
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            lab_name: data?.lab_name || data?.owner_name || null,
        });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
