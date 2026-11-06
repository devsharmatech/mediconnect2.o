import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { isValidPin, verifyPin, ensurePinTable } from "@/lib/digilockerPin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    await ensurePinTable();

    const body = await req.json().catch(() => ({}));
    const { user_id, pin } = body;

    if (!user_id) {
      return failure("User ID is required.", null, 400);
    }

    if (!isValidPin(pin)) {
      return failure("PIN must be exactly 4 numeric digits.", null, 400);
    }

    const rows = await sql`
      SELECT *
      FROM user_digilocker_pins
      WHERE user_id = ${user_id}
      LIMIT 1
    `;
    const pinRecord = rows[0];

    if (!pinRecord || !pinRecord.pin_hash) {
      return failure("No DigiLocker PIN has been set for this account.", { is_pin_set: false }, 404);
    }

    // Check if account is temporarily locked
    if (pinRecord.locked_until && new Date() < new Date(pinRecord.locked_until)) {
      const remainingMs = new Date(pinRecord.locked_until).getTime() - Date.now();
      const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
      return failure(
        `DigiLocker is temporarily locked due to multiple incorrect attempts. Try again in ${remainingMinutes} minute(s) or reset your PIN.`,
        { is_locked: true, remaining_minutes: remainingMinutes },
        429
      );
    }

    const isMatch = verifyPin(pin, pinRecord.pin_hash, pinRecord.pin_salt);

    if (isMatch) {
      // Clear failed attempts and update last_verified_at
      await sql`
        UPDATE user_digilocker_pins
        SET failed_attempts = 0,
            locked_until = NULL,
            last_verified_at = NOW(),
            updated_at = NOW()
        WHERE user_id = ${user_id}
      `;

      return success("DigiLocker PIN verified successfully.", {
        verified: true,
        is_pin_set: true,
        user_id,
      });
    }

    // Handle incorrect PIN
    const nextFailedAttempts = (pinRecord.failed_attempts || 0) + 1;
    const maxAttempts = 5;

    if (nextFailedAttempts >= maxAttempts) {
      const lockDurationMinutes = 15;
      const lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000).toISOString();

      await sql`
        UPDATE user_digilocker_pins
        SET failed_attempts = ${nextFailedAttempts},
            locked_until = ${lockedUntil},
            updated_at = NOW()
        WHERE user_id = ${user_id}
      `;

      return failure(
        `Incorrect PIN. Maximum attempts exceeded. DigiLocker is locked for ${lockDurationMinutes} minutes. You can reset your PIN with OTP.`,
        { is_locked: true, attempts_remaining: 0, remaining_minutes: lockDurationMinutes },
        400
      );
    }

    await sql`
      UPDATE user_digilocker_pins
      SET failed_attempts = ${nextFailedAttempts},
          updated_at = NOW()
      WHERE user_id = ${user_id}
    `;

    const remaining = maxAttempts - nextFailedAttempts;
    return failure(
      `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      { attempts_remaining: remaining },
      400
    );
  } catch (error) {
    console.error("Verify DigiLocker PIN Error:", error);
    return failure("Failed to verify PIN.", error.message, 500);
  }
}

