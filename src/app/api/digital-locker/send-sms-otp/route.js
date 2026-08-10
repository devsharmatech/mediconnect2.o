import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendGenericOTPViaSMS } from "@/lib/sms";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Generate a random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  try {
    const { user_id, phone_number } = await req.json();

    if (!user_id || !phone_number) {
      return failure("User ID and phone number are required.", null, 400);
    }

    // Verify user exists and get their phone number
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, phone_number")
      .eq("id", user_id)
      .single();
    
    if (userError || !user) {
      return failure("User not found.", null, 404);
    }

    // Standardize phone number formats for comparison
    const cleanDbPhone = String(user.phone_number || "").replace(/\D/g, "").slice(-10);
    const cleanInputPhone = String(phone_number).replace(/\D/g, "").slice(-10);

    if (!cleanDbPhone || cleanDbPhone !== cleanInputPhone) {
      return failure("Phone number does not match user account.", null, 400);
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Insert verification record (store phone number in email column for schema compatibility)
    const { data: verification, error: verificationError } = await supabase
      .from("email_verifications")
      .insert({
        user_id,
        email: phone_number,
        otp_code: otp,
        otp_expires_at: expiresAt,
      })
      .select()
      .single();

    if (verificationError) throw verificationError;

    // Log OTP in console for local development testing
    console.log(`[DEV] SMS OTP sent to ${phone_number}: ${otp}`);

    // Send OTP via SMS Gateway
    let smsSent = false;
    try {
      const smsResult = await sendGenericOTPViaSMS(phone_number, otp);
      smsSent = smsResult.success;
    } catch (smsError) {
      console.error("SMS Gateway error:", smsError);
    }

    return success("OTP sent successfully to your registered mobile number.", {
      verification_id: verification.id,
      phone_number,
      expires_in_minutes: 10,
      sms_sent: smsSent,
    });
  } catch (error) {
    console.error("Send SMS OTP Error:", error);
    return failure("Failed to send OTP.", error.message, 500);
  }
}
