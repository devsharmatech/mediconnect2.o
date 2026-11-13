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
    const { phone_number, email } = await req.json();
    
    if (!phone_number && !email) {
      return failure("Phone number or email is required.", null, 400, { headers: corsHeaders });
    }

    const rateLimitKey = phone_number || (email ? String(email).trim().toLowerCase() : "unknown");
    const isDummyNumber = Boolean(
      phone_number && (
        String(phone_number).endsWith("9999999991") ||
        String(phone_number).endsWith("9999999992") ||
        String(phone_number).endsWith("9999999993")
      )
    );

    if (!isDummyNumber) {
      const limitResult = rateLimit(`otp-send:${rateLimitKey}`, 3, 120000); // 3 requests per 2 minutes
      if (!limitResult.allowed) {
        return failure("Too many OTP requests. Please wait 2 minutes before requesting a new OTP.", null, 429, { headers: corsHeaders });
      }
    }

    let user = null;
    let recipientName = "User";

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
        SELECT id, role, phone_number, is_verified 
        FROM users 
        WHERE RIGHT(REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g'), 10) = ${cleanPhone}
          AND role IN ('patient', 'chemist', 'lab', 'doctor')
          AND (status IS NULL OR status != 'deleted')
          AND phone_number NOT LIKE 'ANONYMIZED_%'
        ORDER BY 
          CASE 
            WHEN role = 'patient' THEN 1 
            WHEN role = 'doctor' THEN 2 
            WHEN role = 'chemist' THEN 3 
            ELSE 4 
          END ASC, 
          created_at DESC
        LIMIT 1
      `;
      user = users[0];
    } else if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return failure("Please enter a valid email address.", null, 400, { headers: corsHeaders });
      }
      
      // 1. Check patient_details
      const pts = await sql`
        SELECT pd.id, pd.full_name, pd.email, u.role, u.phone_number, u.is_verified
        FROM patient_details pd
        JOIN users u ON u.id = pd.id
        WHERE LOWER(pd.email) = ${cleanEmail}
          AND (u.status IS NULL OR u.status != 'deleted')
          AND u.phone_number NOT LIKE 'ANONYMIZED_%'
          AND pd.full_name != 'DE-IDENTIFIED PATIENT'
        LIMIT 1
      `;

      if (pts.length > 0) {
        user = pts[0];
        recipientName = pts[0].full_name || "Patient";
      } else {
        // 2. Check doctor_details
        const docs = await sql`
          SELECT dd.id, dd.full_name, dd.email, u.role, u.phone_number, u.is_verified
          FROM doctor_details dd
          JOIN users u ON u.id = dd.id
          WHERE LOWER(dd.email) = ${cleanEmail}
          LIMIT 1
        `;
        if (docs.length > 0) {
          user = docs[0];
          recipientName = docs[0].full_name || "Doctor";
        } else {
          // 3. Check chemist_details or lab_details
          const chemists = await sql`
            SELECT cd.id, cd.pharmacy_name as full_name, cd.email, u.role, u.phone_number, u.is_verified
            FROM chemist_details cd
            JOIN users u ON u.id = cd.id
            WHERE LOWER(cd.email) = ${cleanEmail}
            LIMIT 1
          `;
          if (chemists.length > 0) {
            user = chemists[0];
            recipientName = chemists[0].full_name || "Chemist";
          } else {
            const labs = await sql`
              SELECT ld.id, ld.lab_name as full_name, ld.email, u.role, u.phone_number, u.is_verified
              FROM lab_details ld
              JOIN users u ON u.id = ld.id
              WHERE LOWER(ld.email) = ${cleanEmail}
              LIMIT 1
            `;
            if (labs.length > 0) {
              user = labs[0];
              recipientName = labs[0].full_name || "Lab";
            }
          }
        }
      }
    }

    if (!user) {
      return failure(
        email 
          ? "No account found with this email address. Please register first." 
          : "No patient account found with this phone number. Please register first.",
        null, 
        404, 
        { headers: corsHeaders }
      );
    }

    // Auto-provision patient_details record for chemist or lab to enable doctor consultation
    if (user.role === "chemist" || user.role === "lab") {
      const existingPt = await sql`
        SELECT id FROM patient_details WHERE id = ${user.id} LIMIT 1
      `;

      if (existingPt.length === 0) {
        let defaultName = user.role === "chemist" ? "Chemist User" : "Lab User";
        if (user.role === "chemist") {
          const ch = await sql`SELECT pharmacy_name FROM chemist_details WHERE id = ${user.id} LIMIT 1`;
          if (ch[0]?.pharmacy_name) defaultName = `${ch[0].pharmacy_name} (Chemist)`;
        } else if (user.role === "lab") {
          const lb = await sql`SELECT lab_name FROM lab_details WHERE id = ${user.id} LIMIT 1`;
          if (lb[0]?.lab_name) defaultName = `${lb[0].lab_name} (Lab)`;
        }

        await sql`
          INSERT INTO patient_details (id, full_name, gender, created_at, updated_at)
          VALUES (${user.id}, ${defaultName}, 'other', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }

    const isPermanentTestUser = Boolean(
      (user.phone_number && (
        user.phone_number.includes("9999999991") ||
        user.phone_number.includes("9999999992") ||
        user.phone_number.includes("9999999993") ||
        user.phone_number.includes("8744412521") ||
        user.phone_number.includes("9027924662") ||
        user.phone_number.includes("7289043777") ||
        user.phone_number.includes("8082253151")
      )) ||
      user.id === "31272986-c9c3-41ac-a0ff-50381575d1be" ||
      user.id === "81345239-6939-4670-ad30-a7a06de46395" ||
      user.id === "4c2e8cb1-df50-438d-a46b-96e673f0341a"
    );

    if (isPermanentTestUser) {
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
        is_verified: user.is_verified !== false,
        message: "Test account OTP is 123456"
      }, 200, { headers: corsHeaders });
    }

    // Send real OTP
    if (phone_number) {
      await sendOTPViaGateway(user.id, phone_number);
    } else {
      const otp = generateNumericOTP(6);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store in AWS RDS PostgreSQL
      await sql`
        UPDATE users
        SET otp_code = ${otp},
            otp_expires_at = ${expiresAt},
            updated_at = NOW()
        WHERE id = ${user.id}
      `;

      // Send OTP via nodemailer
      try {
        await sendEmailOTP({
          toEmail: email.trim().toLowerCase(),
          otpCode: otp,
          recipientName,
          purpose: "MediConnect Login",
        });
        console.log(`[EmailOTP] Successfully sent OTP to ${email}`);
      } catch (mailErr) {
        console.error("[EmailOTP] Failed to send email via SMTP:", mailErr);
        return failure("Failed to deliver OTP email. Please try again or use phone login.", mailErr.message, 500, { headers: corsHeaders });
      }
    }

    const isVerified = user.is_verified !== false;

    return success("OTP sent successfully.", {
      role: user.role,
      user_id: user.id,
      is_verified: isVerified,
      message: !isVerified
        ? "Account pending registration verification. An OTP has been sent to complete your verification and log in."
        : phone_number 
          ? `OTP sent to phone number ending in ${phone_number.slice(-4)}`
          : `OTP sent to email ${email}`
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Website Patient Login Error:", error);
    return failure("Login failed.", error.message, 500, { headers: corsHeaders });
  }
}
