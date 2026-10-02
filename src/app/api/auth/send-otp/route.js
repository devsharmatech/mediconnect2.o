import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendOTPViaGateway } from "@/lib/sms";
import { sendEmailOTP, generateNumericOTP } from "@/lib/emailOtp";
import { rateLimit } from "@/lib/rateLimit";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { phone_number, email, role } = await req.json();
    if (!phone_number && !email) {
      return failure("Phone number or email is required.", null, 400, { headers: corsHeaders });
    }

    const rateLimitKey = phone_number || email || "unknown";
    const limitResult = rateLimit(`otp-send:${rateLimitKey}`, 3, 120000); // 3 requests per 2 minutes
    if (!limitResult.allowed) {
      return failure("Too many OTP requests. Please wait 2 minutes before requesting a new OTP.", null, 429, { headers: corsHeaders });
    }

    let user = null;
    let recipientName = "User";

    if (phone_number) {
      const digitsOnly = String(phone_number).replace(/\D/g, "");
      let cleaned_phone = digitsOnly;
      if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
        cleaned_phone = digitsOnly.slice(2);
      }
      if (cleaned_phone.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned_phone)) {
        return failure("Please enter a valid 10-digit mobile number.", null, 400, { headers: corsHeaders });
      }

      // Query users in RDS
      let users = [];
      if (role) {
        users = await sql`
          SELECT id, role, phone_number FROM users
          WHERE role = ${role} AND phone_number LIKE ${'%' + cleaned_phone + '%'}
          LIMIT 1
        `;
      } else {
        users = await sql`
          SELECT id, role, phone_number FROM users
          WHERE phone_number LIKE ${'%' + cleaned_phone + '%'}
          LIMIT 1
        `;
      }

      if (users.length > 0) {
        user = users[0];
      } else {
        // Fallback search in details tables
        if (role === "chemist") {
          const ch = await sql`SELECT id, pharmacy_name FROM chemist_details WHERE mobile LIKE ${'%' + cleaned_phone + '%'} OR whatsapp LIKE ${'%' + cleaned_phone + '%'} LIMIT 1`;
          if (ch.length > 0) {
            const u = await sql`SELECT id, role, phone_number FROM users WHERE id = ${ch[0].id} LIMIT 1`;
            if (u.length > 0) user = u[0];
          }
        } else if (role === "lab") {
          const lb = await sql`SELECT id, lab_name FROM lab_details WHERE phone_number LIKE ${'%' + cleaned_phone + '%'} LIMIT 1`;
          if (lb.length > 0) {
            const u = await sql`SELECT id, role, phone_number FROM users WHERE id = ${lb[0].id} LIMIT 1`;
            if (u.length > 0) user = u[0];
          }
        } else if (role === "doctor") {
          const doc = await sql`SELECT id, full_name FROM doctor_details WHERE phone_number LIKE ${'%' + cleaned_phone + '%'} OR mobile LIKE ${'%' + cleaned_phone + '%'} LIMIT 1`;
          if (doc.length > 0) {
            const u = await sql`SELECT id, role, phone_number FROM users WHERE id = ${doc[0].id} LIMIT 1`;
            if (u.length > 0) user = u[0];
          }
        }
      }
    } else if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      // Check details tables
      const docs = await sql`SELECT id, full_name FROM doctor_details WHERE LOWER(email) = ${cleanEmail} LIMIT 1`;
      if (docs.length > 0) {
        const u = await sql`SELECT id, role, phone_number FROM users WHERE id = ${docs[0].id} LIMIT 1`;
        if (u.length > 0) {
          user = u[0];
          recipientName = docs[0].full_name || "Doctor";
        }
      } else {
        const pts = await sql`SELECT id, full_name FROM patient_details WHERE LOWER(email) = ${cleanEmail} LIMIT 1`;
        if (pts.length > 0) {
          const u = await sql`SELECT id, role, phone_number FROM users WHERE id = ${pts[0].id} LIMIT 1`;
          if (u.length > 0) {
            user = u[0];
            recipientName = pts[0].full_name || "Patient";
          }
        }
      }
    }

    if (!user) return failure(`${role || "User"} not found.`, null, 404, { headers: corsHeaders });

    if (phone_number) {
      await sendOTPViaGateway(user.id, phone_number, user.role);
    } else {
      const otp = generateNumericOTP(6);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await sql`
        UPDATE users
        SET otp_code = ${otp},
            otp_expires_at = ${expiresAt},
            updated_at = NOW()
        WHERE id = ${user.id}
      `;
      await sendEmailOTP({
        toEmail: email,
        otpCode: otp,
        recipientName,
        purpose: "Authentication Verification",
      });
    }

    return success("OTP sent successfully.", {
      role: user.role,
      user_id: user.id,
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return failure("Failed to send OTP.", error.message, 500, { headers: corsHeaders });
  }
}
