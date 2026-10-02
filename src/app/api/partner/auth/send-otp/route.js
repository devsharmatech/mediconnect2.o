import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { sendOTPViaGateway } from "@/lib/sms";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req) {
  try {
    const { phone } = await req.json();
    if (!phone) return failure("Phone number is required.", null, 400);

    const digitsOnly = String(phone).replace(/\D/g, "");
    let cleaned = digitsOnly;
    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      cleaned = digitsOnly.slice(2);
    }
    if (cleaned.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned)) {
      return failure("Please enter a valid 10-digit mobile number.", null, 400);
    }

    const limitResult = rateLimit(`partner-otp-send:${cleaned}`, 3, 120000);
    if (!limitResult.allowed) {
      return failure("Too many OTP requests. Please wait 2 minutes.", null, 429);
    }

    // Find partner by phone
    const partners = await sql`
      SELECT id, name, phone, is_active
      FROM nursing_partners
      WHERE phone LIKE ${'%' + cleaned + '%'}
      LIMIT 1
    `;

    if (partners.length === 0) {
      return failure("No partner account found with this phone number.", null, 404);
    }

    const partner = partners[0];

    if (!partner.is_active) {
      return failure("Your account has been deactivated. Please contact admin.", null, 403);
    }

    // Permanent test numbers — skip OTP generation & SMS, just return partner_id
    const isPermanentTest = cleaned.includes("9999999995") || cleaned.includes("9999999996");
    if (isPermanentTest) {
      console.log(`[Partner OTP] Permanent test number ${cleaned} — skip SMS, use OTP: 123456`);
      return success("OTP sent successfully.", { partner_id: partner.id });
    }

    // Generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await sql`
      UPDATE nursing_partners
      SET otp_code = ${otp}, otp_expires_at = ${expires}, updated_at = NOW()
      WHERE id = ${partner.id}
    `;

    // Send OTP via SMS gateway
    try {
      await sendOTPViaGateway(partner.id, cleaned, "partner");
    } catch (smsErr) {
      console.error("[Partner OTP] SMS send error:", smsErr.message);
    }

    console.log(`[Partner OTP] Sent to ${cleaned}: ${otp}`);

    return success("OTP sent successfully.", { partner_id: partner.id });

  } catch (err) {
    console.error("[Partner Auth] Send OTP error:", err);
    return failure("Failed to send OTP.", err.message, 500);
  }
}
