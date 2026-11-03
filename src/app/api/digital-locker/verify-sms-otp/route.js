import sql from "@/lib/db";
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

    const rows = await sql`
      SELECT *
      FROM email_verifications
      WHERE id = ${verification_id}
      LIMIT 1
    `;
    const verification = rows[0];

    if (!verification) {
      return failure("Verification record not found.", null, 404);
    }

    if (new Date() > new Date(verification.otp_expires_at)) {
      return failure("OTP has expired.", null, 400);
    }

    if (
      verification.max_attempts &&
      verification.attempts >= verification.max_attempts
    ) {
      return failure("Maximum OTP attempts exceeded.", null, 400);
    }

    if (String(verification.otp_code) !== String(otp_code)) {
      await sql`
        UPDATE email_verifications
        SET attempts = COALESCE(attempts, 0) + 1
        WHERE id = ${verification_id}
      `;
      return failure("Invalid OTP code.", null, 400);
    }

    await sql`
      UPDATE email_verifications
      SET is_verified = true, verified_at = NOW()
      WHERE id = ${verification_id}
    `;

    return success("Mobile number verified successfully.", {
      user_id: verification.user_id,
      phone_number: verification.email,
      verified: true,
    });
  } catch (error) {
    console.error("Verify SMS OTP Error:", error);
    return failure("Failed to verify OTP.", error.message, 500);
  }
}
