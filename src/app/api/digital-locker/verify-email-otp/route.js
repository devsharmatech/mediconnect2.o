import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { verification_id, otp_code } = await req.json();

    if (!verification_id || !otp_code) {
      return failure("Verification ID and OTP code are required.", null, 400);
    }

    // Get the verification record
    const { data: verification, error: verificationError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("id", verification_id)
      .single();

    if (verificationError || !verification) {
      return failure("Verification record not found.", null, 404);
    }

    // Check if OTP has expired
    if (new Date() > new Date(verification.otp_expires_at)) {
      return failure("OTP has expired.", null, 400);
    }

    // Check if max attempts exceeded
    if (verification.attempts >= verification.max_attempts) {
      return failure("Maximum OTP attempts exceeded.", null, 400);
    }

    // Verify OTP
    if (verification.otp_code !== otp_code) {
      const { error: updateError } = await supabase
        .from("email_verifications")
        .update({ attempts: verification.attempts + 1 })
        .eq("id", verification_id);

      return failure("Invalid OTP code.", null, 400);
    }

    // Mark as verified
    const { error: verifyError } = await supabase
      .from("email_verifications")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq("id", verification_id);

    if (verifyError) throw verifyError;

    return success("Email verified successfully.", {
      user_id: verification.user_id,
      email: verification.email,
      verified: true,
    });
  } catch (error) {
    console.error("Verify Email OTP Error:", error);
    return failure("Failed to verify OTP.", error.message, 500);
  }
}
