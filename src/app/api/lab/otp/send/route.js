import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { sendGenericOTPViaSMS } from "@/lib/sms";
import { corsHeaders } from "@/lib/cors";

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
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
      SELECT id, phone_number
      FROM users
      WHERE id = ${lab_id}
      LIMIT 1
    `;

    if (!user || !user.phone_number) {
      return NextResponse.json(
        { success: false, error: "Lab user or phone number not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MS);

    // 3. Store OTP in users table
    await sql`
      UPDATE users
      SET otp_code = ${otp}, otp_expires_at = ${expiry}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // 4. Send SMS
    const smsRes = await sendGenericOTPViaSMS(user.phone_number, otp);
    
    if (!smsRes.success) {
      console.warn(`[SMS GATEWAY] Lab Consent SMS send failed: ${smsRes.error || "Unknown error"}.`);
    }

    console.log(`[DEV] Lab Consent OTP sent to ${user.phone_number}: ${otp}`);

    return NextResponse.json(
      { success: true, message: "OTP sent successfully" },
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
