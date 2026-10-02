import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { rateLimit, clearRateLimit } from "@/lib/rateLimit";

export async function POST(req) {
  try {
    const { partner_id, otp } = await req.json();

    if (!partner_id || !otp) {
      return failure("partner_id and otp are required.", null, 400);
    }

    const limitResult = rateLimit(`partner-otp-validate:${partner_id}`, 5, 60000);
    if (!limitResult.allowed) {
      return failure("Too many attempts. Please try again in 1 minute.", null, 429);
    }

    const partners = await sql`
      SELECT id, name, phone, email, city, services, is_active, otp_code, otp_expires_at
      FROM nursing_partners
      WHERE id = ${partner_id}
      LIMIT 1
    `;

    if (partners.length === 0) {
      return failure("Partner not found.", null, 404);
    }

    const partner = partners[0];

    if (!partner.is_active) {
      return failure("Your account has been deactivated.", null, 403);
    }

    // Permanent test numbers — always accept OTP 123456
    const isPermanentTestPartner = Boolean(
      partner.phone?.includes("9999999995") ||
      partner.phone?.includes("9999999996")
    );
    const isTestOtp = otp === "123456" && isPermanentTestPartner;

    if (!isTestOtp) {

      if (partner.otp_code !== otp) {
        return failure("Invalid OTP.", null, 400);
      }
      if (!partner.otp_expires_at || new Date(partner.otp_expires_at) < new Date()) {
        return failure("OTP has expired. Please request a new one.", null, 400);
      }
    }

    // Clear OTP after successful verify (keep for permanent test numbers)
    if (!isPermanentTestPartner) {
      await sql`
        UPDATE nursing_partners
        SET otp_code = NULL, otp_expires_at = NULL, updated_at = NOW()
        WHERE id = ${partner_id}
      `;
    }

    clearRateLimit(`partner-otp-validate:${partner_id}`);

    return success("OTP verified successfully.", {
      partner: {
        id: partner.id,
        name: partner.name,
        phone: partner.phone,
        email: partner.email,
        city: partner.city,
        services: partner.services || [],
      },
    });
  } catch (err) {
    console.error("[Partner Auth] Validate OTP error:", err);
    return failure("Failed to verify OTP.", err.message, 500);
  }
}
