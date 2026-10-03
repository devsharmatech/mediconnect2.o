import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { sendGenericOTPViaSMS } from "@/lib/sms";
import { sendEmailOTP } from "@/lib/emailOtp";
import { corsHeaders } from "@/lib/cors";

const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const { lab_id } = await request.json();

    if (!lab_id || !UUID_REGEX.test(lab_id)) {
      return NextResponse.json(
        { success: false, error: "valid lab_id is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const [user] = await sql`
      SELECT u.id, u.phone_number, ld.email as lab_email, ld.lab_name
      FROM users u
      LEFT JOIN lab_details ld ON ld.id = u.id
      WHERE u.id = ${lab_id}
      LIMIT 1
    `;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Lab user not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MS);

    // Store OTP in users table
    await sql`
      UPDATE users
      SET otp_code = ${otp}, otp_expires_at = ${expiry}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // 1. Send SMS if phone exists
    let smsSent = false;
    if (user.phone_number) {
      try {
        const smsRes = await sendGenericOTPViaSMS(user.phone_number, otp);
        if (smsRes.success) smsSent = true;
        else console.warn(`[SMS GATEWAY] Lab Consent SMS failed: ${smsRes.error || "Unknown"}`);
      } catch (smsErr) {
        console.warn(`[SMS GATEWAY] Error sending SMS:`, smsErr.message);
      }
    }

    // 2. Send Email OTP if email exists
    let emailSent = false;
    if (user.lab_email) {
      try {
        await sendEmailOTP({
          toEmail: user.lab_email,
          otpCode: otp,
          recipientName: user.lab_name || "Diagnostic Lab",
          purpose: "Lab Test Catalog Verification"
        });
        emailSent = true;
      } catch (emailErr) {
        console.warn(`[EMAIL GATEWAY] Error sending email OTP:`, emailErr.message);
      }
    }

    console.log(`[DEV] Lab Consent OTP for ${user.id} (${user.lab_name || 'Lab'}): ${otp}`);

    const destinationParts = [];
    if (smsSent && user.phone_number) destinationParts.push(`mobile (***${user.phone_number.slice(-4)})`);
    if (emailSent && user.lab_email) destinationParts.push(`email (${user.lab_email})`);

    const msg = destinationParts.length > 0 
      ? `OTP sent successfully to your registered ${destinationParts.join(" and ")}`
      : "OTP generated successfully. Check your registered communication channels.";

    return NextResponse.json(
      { success: true, message: msg },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in lab/otp/send:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
