import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";
import { cookies } from "next/headers";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const { lab_id, otp } = await request.json();

    if (!lab_id || !otp) {
      return NextResponse.json(
        { success: false, error: "lab_id and otp are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Fetch user to verify OTP
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, otp_code, otp_expires_at")
      .eq("id", lab_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Lab user not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // 2. Validate OTP
    if (user.otp_code !== otp) {
      return NextResponse.json(
        { success: false, error: "Invalid OTP" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (user.otp_expires_at && new Date(user.otp_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "OTP has expired. Please request a new one." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Clear OTP
    await supabase
      .from("users")
      .update({
        otp_code: null,
        otp_expires_at: null,
      })
      .eq("id", user.id);

    // 4. Log the consent
    await supabase.from("lab_activity_logs").insert({
      lab_id,
      action: "CATALOG_CONSENT_VERIFIED",
      details: { timestamp: new Date().toISOString() },
    });

    // 5. Set the consent cookie (valid for 15 minutes)
    // We use next/headers cookies() to set an HttpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set("lab_catalog_consent", lab_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60, // 15 minutes in seconds
      path: "/",
    });

    return NextResponse.json(
      { success: true, message: "Consent verified successfully. You can now manage your tests." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in lab/otp/verify:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
