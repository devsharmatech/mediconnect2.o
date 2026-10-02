import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import { cookies } from "next/headers";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const { lab_id, otp } = await request.json();

    if (!lab_id || !otp || !UUID_REGEX.test(lab_id)) {
      return NextResponse.json(
        { success: false, error: "valid lab_id and otp are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Fetch user to verify OTP
    const [user] = await sql`
      SELECT id, phone_number, otp_code, otp_expires_at
      FROM users
      WHERE id = ${lab_id}
      LIMIT 1
    `;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Lab user not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const isPermanentTestUser = Boolean(
      user.phone_number?.includes("9999999991") ||
      user.phone_number?.includes("9999999992")
    );
    const isTestOTP = otp === "123456" && isPermanentTestUser;

    // 2. Validate OTP
    if (user.otp_code !== otp && !isTestOTP) {
      return NextResponse.json(
        { success: false, error: "Invalid OTP" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isTestOTP && user.otp_expires_at && new Date(user.otp_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "OTP has expired. Please request a new one." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Clear OTP (keep for permanent test users)
    const newOtp = isPermanentTestUser ? "123456" : null;
    const newExpiry = isPermanentTestUser ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null;

    await sql`
      UPDATE users
      SET otp_code = ${newOtp}, otp_expires_at = ${newExpiry}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // 4. Log the consent
    try {
      await sql`
        INSERT INTO lab_activity_logs (lab_id, action, details, created_at)
        VALUES (${lab_id}, 'CATALOG_CONSENT_VERIFIED', ${sql.json({ timestamp: new Date().toISOString() })}, NOW())
      `;
    } catch {}

    // 5. Set the consent cookie (valid for 15 minutes)
    const cookieStore = await cookies();
    cookieStore.set("lab_catalog_consent", lab_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60,
      path: "/",
    });

    return NextResponse.json(
      { success: true, message: "Consent verified successfully. You can now manage your tests." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in lab/otp/verify:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
