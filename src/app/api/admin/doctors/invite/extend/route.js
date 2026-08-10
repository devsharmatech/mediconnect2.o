import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

// Extend an existing invitation token's expiry without resending email
export async function POST(request) {
  try {
    const { token, expiry_days = 30 } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const newExpiry = new Date(
      Date.now() + expiry_days * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from("doctor_onboarding_status")
      .update({
        token_expires_at: newExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq("invitation_token", token)
      .select("doctor_id, token_expires_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "Token not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Token extended by ${expiry_days} days`,
      new_expiry: newExpiry,
      doctor_id: data.doctor_id,
    });
  } catch (error) {
    console.error("Error extending token:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
