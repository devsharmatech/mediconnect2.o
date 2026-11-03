import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendGenericOTPViaSMS } from "@/lib/sms";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  try {
    const { user_id, phone_number } = await req.json();

    if (!user_id || !phone_number) {
      return failure("User ID and phone number are required.", null, 400);
    }

    const rows = await sql`
      SELECT id, phone_number
      FROM users
      WHERE id = ${user_id}
      LIMIT 1
    `;
    const user = rows[0];

    if (!user) {
      return failure("User not found.", null, 404);
    }

    const cleanDbPhone = String(user.phone_number || "")
      .replace(/\D/g, "")
      .slice(-10);
    const cleanInputPhone = String(phone_number).replace(/\D/g, "").slice(-10);

    if (cleanDbPhone && cleanInputPhone && cleanDbPhone !== cleanInputPhone) {
      return failure("Phone number does not match user account.", null, 400);
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const inserted = await sql`
      INSERT INTO email_verifications (
        user_id,
        email,
        otp_code,
        otp_expires_at
      )
      VALUES (
        ${user_id},
        ${phone_number},
        ${otp},
        ${expiresAt}
      )
      RETURNING *
    `;
    const verification = inserted[0];

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
