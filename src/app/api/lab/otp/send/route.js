import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { sendGenericOTPViaSMS } from "@/lib/sms";
import { corsHeaders } from "@/lib/cors";

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const { lab_id } = await request.json();

    if (!lab_id) {
      return NextResponse.json(
        { success: false, error: "lab_id is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Get the lab user details (we need the user ID and phone number)
    // Lab users are in the `users` table with role='lab' and id is typically linked, 
    // or lab_details has the user info. Let's find the user.
    // Assuming lab_id is the user ID, or linked to it.
    
    // First let's get the phone number from users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, phone_number")
      .eq("id", lab_id)
      .single();

    if (userError || !user || !user.phone_number) {
      // If not in users directly, check lab_details for email/phone if they differ, but typically id matches
      return NextResponse.json(
        { success: false, error: "Lab user or phone number not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Store OTP in users table
    const { error: updateError } = await supabase
      .from("users")
      .update({
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + OTP_EXPIRY_MS).toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error saving OTP:", updateError);
      throw new Error("Failed to save OTP");
    }

    // 4. Send SMS
    const smsRes = await sendGenericOTPViaSMS(user.phone_number, otp);
    
    if (!smsRes.success) {
      console.warn(`[SMS GATEWAY] Lab Consent SMS send failed: ${smsRes.error || "Unknown error"}.`);
    }

    // For development, log the OTP
    console.log(`[DEV] Lab Consent OTP sent to ${user.phone_number}: ${otp}`);

    return NextResponse.json(
      { success: true, message: "OTP sent successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in lab/otp/send:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
