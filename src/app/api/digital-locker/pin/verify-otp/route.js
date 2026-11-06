import crypto from "crypto";
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { ensurePinTable } from "@/lib/digilockerPin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    await ensurePinTable();

    const body = await req.json().catch(() => ({}));
    const { verification_id, otp_code, user_id } = body;

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
      return failure("Invalid or expired verification session.", null, 404);
    }

    if (new Date() > new Date(verification.otp_expires_at)) {
      return failure("OTP has expired. Please request a new one.", null, 400);
    }

    if (verification.attempts && verification.attempts >= 5) {
      return failure("Maximum verification attempts exceeded. Please request a new OTP.", null, 400);
    }

    if (String(verification.otp_code).trim() !== String(otp_code).trim()) {
      await sql`
        UPDATE email_verifications
        SET attempts = COALESCE(attempts, 0) + 1
        WHERE id = ${verification_id}
      `;
      return failure("Invalid OTP code. Please try again.", null, 400);
    }

    const effectiveUserId = user_id || verification.user_id;

    // Mark verification as used
    await sql`
      UPDATE email_verifications
      SET is_verified = true,
          verified_at = NOW()
      WHERE id = ${verification_id}
    `;

    // Generate secure 15-minute reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    if (effectiveUserId) {
      await sql`
        UPDATE user_digilocker_pins
        SET reset_token = ${resetToken},
            reset_token_expires_at = ${resetExpiresAt},
            updated_at = NOW()
        WHERE user_id = ${effectiveUserId}
      `;
    }

    return success("OTP verified successfully. You may now set your new 4-digit PIN.", {
      reset_token: resetToken,
      user_id: effectiveUserId,
      verified: true,
      expires_in_minutes: 15,
    });
  } catch (error) {
    console.error("Verify DigiLocker PIN OTP Error:", error);
    return failure("Failed to verify OTP.", error.message, 500);
  }
}

