import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { rateLimit, clearRateLimit } from "@/lib/rateLimit";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, phone_number, email, role, otp } = await req.json();

    const rateLimitKey = user_id || phone_number || email || "unknown";
    const limitResult = rateLimit(`otp-validate:${rateLimitKey}`, 5, 60000); // 5 attempts per minute
    if (!limitResult.allowed) {
      return failure("Too many verification attempts. Please try again in 1 minute.", null, 429, { headers: corsHeaders });
    }

    if (!otp) {
      return failure("OTP is required.", null, 400, { headers: corsHeaders });
    }

    const cleanPhone = phone_number ? String(phone_number).replace(/\D/g, "").slice(-10) : null;

    // ── Check Pending Registration (Register ONLY after OTP is verified) ──
    if (cleanPhone) {
      const pendingRows = await sql`
        SELECT * FROM pending_registrations 
        WHERE phone_number = ${cleanPhone} 
        LIMIT 1
      `;
      if (pendingRows.length > 0) {
        const pending = pendingRows[0];
        const isPermanentTestUser = Boolean(
          pending.phone_number?.endsWith("9999999991") ||
          pending.phone_number?.endsWith("9999999992") ||
          pending.phone_number?.endsWith("9999999993") ||
          pending.phone_number?.endsWith("8744412521") ||
          pending.phone_number?.endsWith("9027924662")
        );
        const isTestOTP = String(otp).trim() === "123456" && isPermanentTestUser;

        if (String(pending.otp_code).trim() !== String(otp).trim() && !isTestOTP) {
          return failure("Invalid OTP code. Please check and enter the correct 6-digit code.", null, 400, { headers: corsHeaders });
        }

        if (!isTestOTP && pending.otp_expires_at && new Date(pending.otp_expires_at) < new Date()) {
          return failure("OTP has expired. Please request a new one.", null, 400, { headers: corsHeaders });
        }

        // Clean any stale unverified rows
        try {
          await sql`DELETE FROM consent_logs WHERE patient_id IN (SELECT id FROM users WHERE phone_number LIKE ${'%' + cleanPhone + '%'} AND is_verified = false)`.catch(() => {});
          await sql`DELETE FROM patient_details WHERE id IN (SELECT id FROM users WHERE phone_number LIKE ${'%' + cleanPhone + '%'} AND is_verified = false)`.catch(() => {});
          await sql`DELETE FROM users WHERE phone_number LIKE ${'%' + cleanPhone + '%'} AND is_verified = false`.catch(() => {});
        } catch (cleanupErr) {
          console.warn("Cleanup prior unverified note:", cleanupErr?.message);
        }

        // 1. Create verified user with clean default profile picture
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent((pending.full_name || "Patient").trim())}&background=0067A1&color=fff&bold=true`;
        const createdUsers = await sql`
          INSERT INTO users (phone_number, role, is_verified, profile_picture, created_at, updated_at)
          VALUES (${cleanPhone}, 'patient', true, ${defaultAvatar}, NOW(), NOW())
          RETURNING *
        `;
        const newUser = createdUsers[0];

        // 2. Create patient_details
        const createdDetails = await sql`
          INSERT INTO patient_details (id, full_name, email, gender, date_of_birth, address, created_at, updated_at)
          VALUES (
            ${newUser.id},
            ${pending.full_name},
            ${pending.email || null},
            ${pending.gender || null},
            ${pending.date_of_birth || null},
            ${pending.address || null},
            NOW(),
            NOW()
          )
          RETURNING *
        `;

        // 3. Log DPDP registration consent
        try {
          const { logConsent } = await import("@/lib/layer1/consentManager");
          await logConsent({
            patient_id: newUser.id,
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

        // 4. Delete the pending registration row
        await sql`DELETE FROM pending_registrations WHERE phone_number = ${cleanPhone}`;

        clearRateLimit(`otp-validate:${rateLimitKey}`);

        return success(
          "OTP verified and registration completed successfully.",
          {
            user_id: newUser.id,
            role: newUser.role,
            token: newUser.id,
            user: { ...newUser, is_verified: true, details: createdDetails[0] },
          },
          200,
          { headers: corsHeaders }
        );
      }
    }

    const cleanUserId = safeUuid(user_id);
    let user = null;

    if (cleanUserId) {
      const rows = await sql`SELECT * FROM users WHERE id = ${cleanUserId} LIMIT 1`;
      user = rows[0];
    } else if (phone_number) {
      const cleanPhone = String(phone_number).replace(/\D/g, "").slice(-10);
      if (role) {
        const rows = await sql`
          SELECT * FROM users 
          WHERE phone_number LIKE ${'%' + cleanPhone + '%'} AND role = ${role}
          ORDER BY created_at DESC LIMIT 1
        `;
        user = rows[0];
      } else {
        const rows = await sql`
          SELECT * FROM users 
          WHERE phone_number LIKE ${'%' + cleanPhone + '%'}
          ORDER BY created_at DESC LIMIT 1
        `;
        user = rows[0];
      }
    } else if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      const docs = await sql`
        SELECT u.* FROM users u JOIN doctor_details dd ON dd.id = u.id WHERE LOWER(dd.email) = ${cleanEmail} LIMIT 1
      `;
      if (docs.length > 0) {
        user = docs[0];
      } else {
        const pts = await sql`
          SELECT u.* FROM users u JOIN patient_details pd ON pd.id = u.id WHERE LOWER(pd.email) = ${cleanEmail} LIMIT 1
        `;
        if (pts.length > 0) user = pts[0];
      }
    }

    if (!user) return failure("User not found.", null, 404, { headers: corsHeaders });

    const isPermanentTestUser = Boolean(
      user.phone_number?.includes("9999999991") ||
      user.phone_number?.includes("9999999992") ||
      user.phone_number?.includes("9999999993") ||
      user.phone_number?.includes("8744412521") ||
      user.phone_number?.includes("9027924662")
    );
    const isTestOTP = String(otp).trim() === "123456" && isPermanentTestUser;

    if (String(user.otp_code).trim() !== String(otp).trim() && !isTestOTP) {
      return failure("Invalid OTP.", null, 400, { headers: corsHeaders });
    }

    if (!isTestOTP && user.otp_expires_at && new Date(user.otp_expires_at) < new Date()) {
      return failure("OTP expired. Please request a new one.", null, 400, { headers: corsHeaders });
    }

    await sql`
      UPDATE users
      SET is_verified = true,
          otp_code = ${isPermanentTestUser ? "123456" : null},
          otp_expires_at = ${isPermanentTestUser ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null},
          updated_at = NOW()
      WHERE id = ${user.id}
    `;

    const roleData = await getUserDetailsByRole(user.id, user.role);

    clearRateLimit(`otp-validate:${rateLimitKey}`);

    return success(
      "OTP verified successfully.",
      {
        user_id: user.id,
        role: user.role,
        token: user.id,
        user: { ...user, is_verified: true, details: roleData },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("OTP Verify Error:", error);
    return failure("Failed to verify OTP.", error.message, 500, { headers: corsHeaders });
  }
}

async function getUserDetailsByRole(userId, role) {
  try {
    const roleTableMap = {
      admin: "admin_details",
      patient: "patient_details",
      doctor: "doctor_details",
      chemist: "chemist_details",
      pharmacist: "pharmacist_details",
      lab: "lab_details",
    };

    const targetRole = String(role || "").toLowerCase();
    const table = roleTableMap[targetRole];
    if (!table) return null;

    if (targetRole === "patient") {
      const rows = await sql`SELECT * FROM patient_details WHERE id = ${userId} LIMIT 1`;
      return rows[0] || null;
    } else if (targetRole === "doctor") {
      const rows = await sql`SELECT * FROM doctor_details WHERE id = ${userId} LIMIT 1`;
      return rows[0] || null;
    } else if (targetRole === "chemist") {
      const rows = await sql`SELECT * FROM chemist_details WHERE id = ${userId} LIMIT 1`;
      return rows[0] || null;
    } else if (targetRole === "lab") {
      const rows = await sql`SELECT * FROM lab_details WHERE id = ${userId} LIMIT 1`;
      return rows[0] || null;
    } else if (targetRole === "admin") {
      const rows = await sql`SELECT * FROM admin_details WHERE id = ${userId} LIMIT 1`;
      return rows[0] || null;
    }
    return null;
  } catch (err) {
    console.warn("getUserDetailsByRole error:", err.message);
    return null;
  }
}
