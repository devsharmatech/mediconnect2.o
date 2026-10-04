import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendGenericOTPViaSMS } from "@/lib/sms";
import { sendEmailOTP, generateNumericOTP } from "@/lib/emailOtp";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone_number, full_name, email, gender, date_of_birth, address } = body;

    if (!phone_number || !full_name) {
      return failure("Phone number and full name are required.", null, 400, { headers: corsHeaders });
    }

    const digitsOnly = String(phone_number).replace(/\D/g, "");
    let cleanPhone = digitsOnly;
    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      cleanPhone = digitsOnly.slice(2);
    }
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return failure("Please enter a valid 10-digit mobile number.", null, 400, { headers: corsHeaders });
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : null;
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return failure("Invalid email format.", null, 400, { headers: corsHeaders });
    }

    // 1. Check if phone is already registered and verified
    const verifiedUsers = await sql`
      SELECT id, role, phone_number, is_verified
      FROM users
      WHERE phone_number LIKE ${'%' + cleanPhone + '%'} AND is_verified = true
      LIMIT 1
    `;

    if (verifiedUsers.length > 0) {
      return failure("This phone number is already registered. Please log in using OTP.", null, 409, { headers: corsHeaders });
    }

    // 2. Check if email is already registered by an already verified patient
    if (cleanEmail) {
      const verifiedEmails = await sql`
        SELECT pd.id 
        FROM patient_details pd
        JOIN users u ON u.id = pd.id
        WHERE LOWER(pd.email) = ${cleanEmail} AND u.is_verified = true
        LIMIT 1
      `;
      if (verifiedEmails.length > 0) {
        return failure("This email address is already registered. Please log in using OTP.", null, 409, { headers: corsHeaders });
      }
    }

    // 3. Clean up any leftover unverified records for this phone number from old attempts
    try {
      await sql`
        DELETE FROM consent_logs 
        WHERE patient_id IN (SELECT id FROM users WHERE phone_number LIKE ${'%' + cleanPhone + '%'} AND is_verified = false)
      `.catch(() => {});
      await sql`
        DELETE FROM patient_details 
        WHERE id IN (SELECT id FROM users WHERE phone_number LIKE ${'%' + cleanPhone + '%'} AND is_verified = false)
      `.catch(() => {});
      await sql`
        DELETE FROM users 
        WHERE phone_number LIKE ${'%' + cleanPhone + '%'} AND is_verified = false
      `.catch(() => {});
    } catch (cleanupErr) {
      console.warn("Cleanup unverified user note:", cleanupErr?.message);
    }

    // 4. Generate 6-digit OTP
    const isPermanentTestUser = Boolean(
      cleanPhone.endsWith("9999999991") ||
      cleanPhone.endsWith("9999999992") ||
      cleanPhone.endsWith("9999999993") ||
      cleanPhone.endsWith("8744412521")
    );
    const otpCode = isPermanentTestUser ? "123456" : generateNumericOTP(6);
    const otpExpiresAt = isPermanentTestUser
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 5. Save pending registration data with OTP in pending_registrations table
    // IMPORTANT: User and patient_details tables are NOT mutated before OTP verification!
    await sql`
      INSERT INTO pending_registrations 
        (phone_number, full_name, email, gender, date_of_birth, address, otp_code, otp_expires_at, updated_at)
      VALUES 
        (
          ${cleanPhone}, 
          ${full_name}, 
          ${cleanEmail || null}, 
          ${gender || null}, 
          ${date_of_birth || null}, 
          ${address || null}, 
          ${otpCode}, 
          ${otpExpiresAt}, 
          NOW()
        )
      ON CONFLICT (phone_number) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        gender = EXCLUDED.gender,
        date_of_birth = EXCLUDED.date_of_birth,
        address = EXCLUDED.address,
        otp_code = EXCLUDED.otp_code,
        otp_expires_at = EXCLUDED.otp_expires_at,
        updated_at = NOW();
    `;

    // 6. Send OTP to phone via SMS gateway
    if (!isPermanentTestUser) {
      const smsRes = await sendGenericOTPViaSMS(cleanPhone, otpCode, "patient");
      if (!smsRes.success) {
        console.warn("[Registration SMS Gateway] SMS delivery notice:", smsRes.error);
      }
    }

    // 7. If email provided, also send email OTP
    if (cleanEmail && !isPermanentTestUser) {
      try {
        await sendEmailOTP({
          toEmail: cleanEmail,
          otpCode,
          recipientName: full_name,
          purpose: "Registration Verification",
        });
      } catch (e) {
        console.warn("Registration email OTP error:", e.message);
      }
    }

    return success(
      "OTP sent to your phone number. Please enter the OTP to complete registration.",
      {
        phone_number: cleanPhone,
        pending: true,
        role: "patient",
      },
      200,
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Website Registration Error:", error);
    return failure("Registration request failed.", error.message, 500, { headers: corsHeaders });
  }
}
