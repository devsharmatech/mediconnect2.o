import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req) {
    try {
        const { user_id } = await req.json();

        if (!user_id) {
            return NextResponse.json(
                { success: false, message: "User ID required." },
                { status: 400, headers: corsHeaders }
            );
        }

        // Capture IP safely if available, else null
        const ip = req.headers.get("x-forwarded-for") || req.ip || null;
        const userAgent = req.headers.get("user-agent") || null;

        // Log the agreement
        const { error } = await supabase.from("user_ai_agreements").insert([
            {
                user_id,
                ip_address: ip,
                user_agent: userAgent,
            },
        ]);

        // Ignore unique constraint errors if they already agreed
        if (error && error.code !== "23505") {
            console.error("[CRITICAL] Failed to log AI agreement:", error);
        }

        return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
    } catch (error) {
        console.error("AI Disclaimer Error:", error);
        return NextResponse.json(
            { success: false, message: "Server error." },
            { status: 500, headers: corsHeaders }
        );
    }
}
