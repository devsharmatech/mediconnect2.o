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
    const { user_id, pin, confirm_pin } = body;

    if (!user_id) {
      return failure("User ID is required.", null, 400);
    }

    if (!isValidPin(pin)) {
      return failure("PIN must be exactly 4 numeric digits.", null, 400);
    }

    if (confirm_pin !== undefined && confirm_pin !== null && String(pin).trim() !== String(confirm_pin).trim()) {
      return failure("PIN and Confirm PIN do not match.", null, 400);
    }

    // Verify user exists in AWS RDS users table
    const [user] = await sql`
      SELECT id, role, phone_number
      FROM users
      WHERE id = ${user_id}
      LIMIT 1
    `;

    if (!user) {
      return failure("User account not found.", null, 404);
    }

    const { hash, salt } = hashPin(pin);

    const [savedRecord] = await sql`
      INSERT INTO user_digilocker_pins (
        user_id,
        pin_hash,
        pin_salt,
        failed_attempts,
        locked_until,
        reset_token,
        reset_token_expires_at,
        last_verified_at,
        created_at,
        updated_at
      )
      VALUES (
        ${user_id},
        ${hash},
        ${salt},
        0,
        NULL,
        NULL,
        NULL,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        pin_hash = EXCLUDED.pin_hash,
        pin_salt = EXCLUDED.pin_salt,
        failed_attempts = 0,
        locked_until = NULL,
        reset_token = NULL,
        reset_token_expires_at = NULL,
        last_verified_at = NOW(),
        updated_at = NOW()
      RETURNING id, user_id, updated_at
    `;

    return success("4-digit security PIN set successfully.", {
      is_pin_set: true,
      user_id: savedRecord.user_id,
      updated_at: savedRecord.updated_at,
    });
  } catch (error) {
    console.error("Set DigiLocker PIN Error:", error);
    return failure("Failed to set security PIN.", error.message, 500);
  }
}
