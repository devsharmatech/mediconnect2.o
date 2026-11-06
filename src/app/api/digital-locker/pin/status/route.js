import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { maskPhoneNumber, ensurePinTable } from "@/lib/digilockerPin";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    await ensurePinTable();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || searchParams.get("user_id");

    if (!userId) {
      return failure("User ID is required.", null, 400);
    }

    const [user] = await sql`
      SELECT id, phone_number, role
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (!user) {
      return failure("User not found.", null, 404);
    }

    const [pinRecord] = await sql`
      SELECT id, pin_hash, failed_attempts, locked_until, updated_at
      FROM user_digilocker_pins
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const isPinSet = Boolean(pinRecord && pinRecord.pin_hash);
    let isLocked = false;
    let remainingMinutes = 0;

    if (pinRecord && pinRecord.locked_until && new Date() < new Date(pinRecord.locked_until)) {
      isLocked = true;
      const ms = new Date(pinRecord.locked_until).getTime() - Date.now();
      remainingMinutes = Math.max(1, Math.ceil(ms / (60 * 1000)));
    }

    return success("PIN status retrieved successfully.", {
      user_id: userId,
      is_pin_set: isPinSet,
      is_locked: isLocked,
      remaining_lock_minutes: remainingMinutes,
      masked_phone: maskPhoneNumber(user.phone_number),
      has_phone: Boolean(user.phone_number),
    });
  } catch (error) {
    console.error("DigiLocker PIN Status Error:", error);
    return failure("Failed to get PIN status.", error.message, 500);
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.user_id || body.userId;
    if (!userId) {
      return failure("User ID is required.", null, 400);
    }
    const url = new URL(req.url);
    url.searchParams.set("userId", userId);
    const getReq = new Request(url, { method: "GET", headers: req.headers });
    return GET(getReq);
  } catch (error) {
    return failure("Failed to get PIN status.", error.message, 500);
  }
}
