import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendGenericOTPViaSMS } from "@/lib/sms";
import { maskPhoneNumber, isTestAccountPhone, ensurePinTable } from "@/lib/digilockerPin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

function generateOTP(phone) {
  if (isTestAccountPhone(phone)) {
    return "123456";
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  try {
    await ensurePinTable();

    const body = await req.json().catch(() => ({}));
    const { user_id, phone_number } = body;

    if (!user_id && !phone_number) {
      return failure("User ID or registered phone number is required.", null, 400);
    }

    let user = null;

    if (user_id) {
      const rows = await sql`
        SELECT id, phone_number, role
        FROM users
        WHERE id = ${user_id}
        LIMIT 1
      `;
      user = rows[0];
    } else if (phone_number) {
      const cleanPhone = String(phone_number).replace(/\D/g, "").slice(-10);
      const rows = await sql`
        SELECT id, phone_number, role
        FROM users
        WHERE RIGHT(REGEXP_REPLACE(phone_number, '[^0-9]', 'g', 'g'), 10) = ${cleanPhone}
        LIMIT 1
      `;
      user = rows[0];
    }

    if (!user) {
      return failure("User account not found with the provided details.", null, 404);
    }

    // Verify phone number match if both were supplied
    if (phone_number && user.phone_number) {
      const cleanInput = String(phone_number).replace(/\D/g, "").slice(-10);
      const cleanDb = String(user.phone_number).replace(/\D/g, "").slice(-10);
      if (cleanInput && cleanDb && cleanInput !== cleanDb) {
        return failure("Provided phone number does not match registered account.", null, 400);
      }
    }

    const targetPhone = user.phone_number || phone_number;
    if (!targetPhone) {
      return failure("No registered phone number found on this user profile.", null, 400);
    }

    // Check if user has an existing PIN set
    const pinRows = await sql`
      SELECT id, pin_hash
      FROM user_digilocker_pins
      WHERE user_id = ${user.id}
      LIMIT 1
    `;
    const pinRecord = pinRows[0];
    if (!pinRecord || !pinRecord.pin_hash) {
      return failure("No DigiLocker PIN has been set for this account. Please set a new PIN directly.", null, 400);
    }

    const otp = generateOTP(targetPhone);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const inserted = await sql`
      INSERT INTO email_verifications (
        user_id,
        email,
        otp_code,
        otp_expires_at,
        attempts
      )
      VALUES (
        ${user.id},
        ${targetPhone},
        ${otp},
        ${expiresAt},
        0
      )
      RETURNING id, otp_expires_at
    `;
    const verification = inserted[0];

    let smsSent = false;
    try {
      const smsResult = await sendGenericOTPViaSMS(targetPhone, otp);
      smsSent = Boolean(smsResult?.success);
    } catch (smsError) {
      console.error("[PIN Forgot OTP] SMS Gateway error:", smsError);
    }

    return success("OTP sent successfully to your registered mobile number.", {
      verification_id: verification.id,
      phone_number: maskPhoneNumber(targetPhone),
      raw_phone_suffix: String(targetPhone).replace(/\D/g, "").slice(-4),
      user_id: user.id,
      expires_in_minutes: 10,
      sms_sent: smsSent,
    });
  } catch (error) {
    console.error("Forgot DigiLocker PIN OTP Error:", error);
    return failure("Failed to send OTP for PIN reset.", error.message, 500);
  }
}
