import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { isValidPin, hashPin, ensurePinTable } from "@/lib/digilockerPin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    await ensurePinTable();

    const body = await req.json().catch(() => ({}));
    const { user_id, reset_token, new_pin, pin, confirm_pin } = body;
    const targetPin = new_pin !== undefined ? new_pin : pin;

    if (!user_id) {
      return failure("User ID is required.", null, 400);
    }

    if (!reset_token) {
      return failure("Reset token is required to reset PIN.", null, 400);
    }

    if (!isValidPin(targetPin)) {
      return failure("New PIN must be exactly 4 numeric digits.", null, 400);
    }

    if (confirm_pin !== undefined && confirm_pin !== null && String(targetPin).trim() !== String(confirm_pin).trim()) {
      return failure("PIN and Confirm PIN do not match.", null, 400);
    }

    const rows = await sql`
      SELECT *
      FROM user_digilocker_pins
      WHERE user_id = ${user_id}
      LIMIT 1
    `;
    const pinRecord = rows[0];

    if (!pinRecord) {
      return failure("PIN record not found for this user.", null, 404);
    }

    if (!pinRecord.reset_token || pinRecord.reset_token !== String(reset_token).trim()) {
      return failure("Invalid or expired reset token. Please request a new OTP.", null, 403);
    }

    if (pinRecord.reset_token_expires_at && new Date() > new Date(pinRecord.reset_token_expires_at)) {
      return failure("Reset token has expired. Please verify OTP again.", null, 403);
    }

    const { hash, salt } = hashPin(targetPin);

    await sql`
      UPDATE user_digilocker_pins
      SET pin_hash = ${hash},
          pin_salt = ${salt},
          failed_attempts = 0,
          locked_until = NULL,
          reset_token = NULL,
          reset_token_expires_at = NULL,
          last_verified_at = NOW(),
          updated_at = NOW()
      WHERE user_id = ${user_id}
    `;

    return success("4-digit security PIN reset successfully.", {
      is_pin_set: true,
      reset: true,
      user_id,
    });
  } catch (error) {
    console.error("Reset DigiLocker PIN Error:", error);
    return failure("Failed to reset security PIN.", error.message, 500);
  }
}
