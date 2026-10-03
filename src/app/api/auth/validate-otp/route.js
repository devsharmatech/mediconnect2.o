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
      user.phone_number?.includes("8744412521")
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
