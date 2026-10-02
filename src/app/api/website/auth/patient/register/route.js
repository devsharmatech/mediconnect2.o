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
    const body = await req.json();
    const { phone_number, full_name, email, gender, date_of_birth, address } = body;

    if (!phone_number || !full_name) {
      return failure("Phone number and full name are required.", null, 400, { headers: corsHeaders });
    }

    const cleanPhone = phone_number.replace(/\D/g, "").slice(-10);
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      return failure("Invalid phone number format. Please enter a 10-digit mobile number.", null, 400, { headers: corsHeaders });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return failure("Invalid email format.", null, 400, { headers: corsHeaders });
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id, is_verified, phone_number, role
      FROM users
      WHERE phone_number LIKE ${'%' + cleanPhone + '%'}
      LIMIT 1
    `;

    if (existingUsers.length > 0) {
      const phoneExists = existingUsers[0];
      if (phoneExists.is_verified) {
        return failure("This phone number is already registered and verified. Please log in using OTP.", null, 409, { headers: corsHeaders });
      }

      // User exists but is UNVERIFIED — update details & send new OTP to complete verification
      await sql`
        INSERT INTO patient_details (id, full_name, email, gender, date_of_birth, address, updated_at)
        VALUES (${phoneExists.id}, ${full_name}, ${email || null}, ${gender || null}, ${date_of_birth || null}, ${address || null}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          gender = EXCLUDED.gender,
          date_of_birth = EXCLUDED.date_of_birth,
          address = EXCLUDED.address,
          updated_at = NOW()
      `;

      // Send fresh OTP
      await sendOTPViaGateway(phoneExists.id, phoneExists.phone_number);

      if (email) {
        const emailOtp = generateNumericOTP(6);
        await sql`
          UPDATE users
          SET otp_code = ${emailOtp},
              otp_expires_at = NOW() + INTERVAL '10 minutes',
              updated_at = NOW()
          WHERE id = ${phoneExists.id}
        `;
        try {
          await sendEmailOTP({
            toEmail: email,
            otpCode: emailOtp,
            recipientName: full_name,
            purpose: "Registration Verification",
          });
        } catch (e) {
          console.warn("Registration email OTP error:", e.message);
        }
      }

      return success(
        "Account pending verification. OTP sent to your registered phone number.",
        {
          user_id: phoneExists.id,
          phone_number: phoneExists.phone_number,
          role: phoneExists.role || "patient",
        },
        200,
        { headers: corsHeaders }
      );
    }

    // Email duplicate check for new user
    if (email) {
      const emailExists = await sql`
        SELECT id FROM patient_details WHERE LOWER(email) = ${email.trim().toLowerCase()} LIMIT 1
      `;
      if (emailExists.length > 0) {
        return failure("Email address already registered.", null, 409, { headers: corsHeaders });
      }
    }

    // Create new unverified user in users table
    const createdUsers = await sql`
      INSERT INTO users (phone_number, role, is_verified, created_at, updated_at)
      VALUES (${cleanPhone}, 'patient', false, NOW(), NOW())
      RETURNING *
    `;

    const user = createdUsers[0];

    await sql`
      INSERT INTO patient_details (id, full_name, email, gender, date_of_birth, address, created_at, updated_at)
      VALUES (
        ${user.id},
        ${full_name},
        ${email || null},
        ${gender || null},
        ${date_of_birth || null},
        ${address || null},
        NOW(),
        NOW()
      )
    `;

    // Log explicit DPDP registration consent (J01 / J16)
    try {
      const { logConsent } = await import("@/lib/layer1/consentManager");
      await logConsent({
        patient_id: user.id,
        consent_type: "TERMS_AND_DATA_PROCESSING",
        status: true,
        purpose: "Patient Registration & Teleconsultation Services (DPDP Act 2023)",
        metadata: {
          ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
          userAgent: req.headers.get("user-agent") || "unknown",
          registered_at: new Date().toISOString()
        }
      });
    } catch (consentErr) {
      console.warn("Registration consent log note:", consentErr?.message);
    }

    // Send real OTP via SMS gateway
    await sendOTPViaGateway(user.id, user.phone_number);

    // If email provided, also send email OTP
    if (email) {
      const emailOtp = generateNumericOTP(6);
      await sql`
        UPDATE users
        SET otp_code = ${emailOtp},
            otp_expires_at = NOW() + INTERVAL '10 minutes',
            updated_at = NOW()
        WHERE id = ${user.id}
      `;
      try {
        await sendEmailOTP({
          toEmail: email,
          otpCode: emailOtp,
          recipientName: full_name,
          purpose: "Registration Verification",
        });
      } catch (e) {
        console.warn("Registration email OTP note:", e.message);
      }
    }

    return success(
      "Registration successful. Please enter the OTP sent to complete verification.",
      {
        user_id: user.id,
        phone_number: user.phone_number,
        role: user.role,
      },
      201,
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Website Registration Error:", error);
    return failure("Registration failed.", error.message, 500, { headers: corsHeaders });
  }
}
