import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// POST – save a new subscriber email
export async function POST(req) {
    try {
        const { email } = await req.json();

        if (!email || !email.includes("@")) {
            return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
        }

        // Check if already subscribed
        const { data: existing } = await supabase
            .from("subscribers")
            .select("id")
            .eq("email", email.toLowerCase().trim())
            .single();

        if (existing) {
            return NextResponse.json({ message: "Already subscribed!" }, { status: 200 });
        }

        const { error } = await supabase.from("subscribers").insert({
            email: email.toLowerCase().trim(),
            subscribed_at: new Date().toISOString(),
        });

        if (error) throw error;

        return NextResponse.json({ message: "Subscribed successfully!" }, { status: 201 });
    } catch (err) {
        console.error("Subscribe error:", err);
        return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }
}

// GET – fetch all subscribers (for admin)
export async function GET() {
    try {
        const { data, error } = await supabase
            .from("subscribers")
            .select("*")
            .order("subscribed_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ subscribers: data || [] });
    } catch (err) {
        console.error("Fetch subscribers error:", err);
        return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
    }
}
