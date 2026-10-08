import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendOTPViaGateway } from "@/lib/sms";
import { sendEmailOTP, generateNumericOTP } from "@/lib/emailOtp";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { phone_number, email } = await req.json();
    
    if (!phone_number && !email) {
      return failure("Phone number or email is required.", null, 400, { headers: corsHeaders });
    }

    let user = null;
    let recipientName = "Doctor";

    if (phone_number) {
      const digitsOnly = String(phone_number).replace(/\D/g, "");
      let cleanPhone = digitsOnly;
      if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
        cleanPhone = digitsOnly.slice(2);
      }
      if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
        return failure("Please enter a valid 10-digit mobile number.", null, 400, { headers: corsHeaders });
      }

      const users = await sql`
        SELECT u.id, u.role, u.phone_number, dd.full_name
        FROM users u
        LEFT JOIN doctor_details dd ON dd.id = u.id
        WHERE u.phone_number LIKE ${'%' + cleanPhone + '%'}
          AND u.role = 'doctor'
        LIMIT 1
      `;
      user = users[0];
      if (users[0]?.full_name) recipientName = users[0].full_name;
    } else if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      const docs = await sql`
        SELECT u.id, u.role, u.phone_number, dd.full_name, dd.email
        FROM doctor_details dd
        JOIN users u ON u.id = dd.id
        WHERE LOWER(dd.email) = ${cleanEmail}
        LIMIT 1
      `;
      user = docs[0];
      if (docs[0]?.full_name) recipientName = docs[0].full_name;
    }

    if (!user) {
      return failure(
        email
          ? "No doctor account found with this email address. Please check your credentials or register as a doctor."
          : "No doctor account found with this phone number. Please check your credentials or register as a doctor.",
        null,
        404,
        { headers: corsHeaders }
      );
    }

    const isTestDoctor = user.id === "31272986-c9c3-41ac-a0ff-50381575d1be" || 
                         (user.phone_number && user.phone_number.includes("8082253151")) ||
                         (email && email.toLowerCase().includes("abhishekargosmob"));

    if (isTestDoctor) {
      await sql`
        UPDATE users
        SET otp_code = '123456',
            otp_expires_at = NOW() + INTERVAL '365 days',
            updated_at = NOW()
        WHERE id = ${user.id}
      `;
      return success("OTP sent successfully.", {
        role: user.role,
        user_id: user.id,
        message: "Test account OTP is 123456"
      }, 200, { headers: corsHeaders });
    }

    // Send real OTP via gateway if phone_number is provided
    if (phone_number) {
      await sendOTPViaGateway(user.id, phone_number);
    } else {
      const otp = generateNumericOTP(6);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await sql`
        UPDATE users
        SET otp_code = ${otp},
            otp_expires_at = ${expiresAt},
            updated_at = NOW()
        WHERE id = ${user.id}
      `;

      try {
        await sendEmailOTP({
          toEmail: email.trim().toLowerCase(),
          otpCode: otp,
          recipientName: recipientName.startsWith("Dr.") ? recipientName : `Dr. ${recipientName}`,
          purpose: "Doctor Portal Login",
        });
        console.log(`[EmailOTP] Doctor OTP sent to ${email}`);
      } catch (mailErr) {
        console.error("[EmailOTP] Failed to send doctor email OTP:", mailErr);
        return failure("Failed to deliver OTP email. Please try again or use phone login.", mailErr.message, 500, { headers: corsHeaders });
      }
    }

    return success("OTP sent successfully.", {
      role: user.role,
      user_id: user.id,
      message: phone_number 
        ? `OTP sent to phone number ending in ${phone_number.slice(-4)}`
        : `OTP sent to email ${email}`
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Website Doctor Login Error:", error);
    return failure("Login failed.", error.message, 500, { headers: corsHeaders });
  }
}
