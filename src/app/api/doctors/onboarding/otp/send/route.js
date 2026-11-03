import { NextResponse } from "next/server";
import sql from "@/lib/db";
import crypto from "crypto";
import { sendGenericOTPViaSMS } from "@/lib/sms";

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_PER_HOUR = 5;

export async function POST(request) {
  try {
    const { email, phone, doctor_id } = await request.json();

    if (!email && !phone && !doctor_id) {
      return NextResponse.json(
        { success: false, error: "Email, Phone or doctor_id is required" },
        { status: 400 }
      );
    }

    let resolvedDoctorId = doctor_id;
    let resolvedPhone = phone;
    let resolvedEmail = email;

    if (!resolvedDoctorId && resolvedPhone) {
      const users = await sql`
        SELECT id, phone_number
        FROM users
        WHERE phone_number = ${resolvedPhone}
          AND role = 'doctor'
        LIMIT 1
      `;
      if (users && users.length > 0) {
        resolvedDoctorId = users[0].id;
      }
    }

    if (!resolvedDoctorId && resolvedEmail) {
      const details = await sql`
        SELECT id
        FROM doctor_details
        WHERE email = ${resolvedEmail}
        LIMIT 1
      `;
      if (details && details.length > 0) {
        resolvedDoctorId = details[0].id;
      }
    }

    if (resolvedDoctorId) {
      const userRows = await sql`
        SELECT phone_number
        FROM users
        WHERE id = ${resolvedDoctorId}
        LIMIT 1
      `;
      if (!resolvedPhone && userRows[0]?.phone_number) {
        resolvedPhone = userRows[0].phone_number;
      }

      if (!resolvedEmail || !resolvedPhone) {
        const detailRows = await sql`
          SELECT email
          FROM doctor_details
          WHERE id = ${resolvedDoctorId}
          LIMIT 1
        `;
        if (!resolvedEmail && detailRows[0]?.email) {
          resolvedEmail = detailRows[0].email;
        }
      }
    }

    if (!resolvedPhone) {
      return NextResponse.json(
        { success: false, error: "Phone number not found" },
        { status: 400 }
      );
    }

    if (!resolvedDoctorId) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const recentOtps = await sql`
      SELECT created_at
      FROM doctor_otp_logs
      WHERE doctor_id = ${resolvedDoctorId}
        AND created_at >= ${oneHourAgo}
      ORDER BY created_at DESC
    `;

    if (recentOtps && recentOtps.length > 0) {
      if (recentOtps.length >= OTP_MAX_PER_HOUR) {
        return NextResponse.json(
          {
            success: false,
            error: "Too many OTP requests. Maximum 5 per hour. Please try again later.",
          },
          { status: 429 }
        );
      }

      const lastSentAt = new Date(recentOtps[0].created_at).getTime();
      const msSinceLast = Date.now() - lastSentAt;
      if (msSinceLast < OTP_COOLDOWN_MS) {
        const waitSecs = Math.ceil((OTP_COOLDOWN_MS - msSinceLast) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${waitSecs} second(s) before requesting a new OTP.`,
          },
          { status: 429 }
        );
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();

    await sql`
      INSERT INTO doctor_otp_logs (doctor_id, otp_hash, is_used, attempt_count, expires_at)
      VALUES (${resolvedDoctorId}, ${otpHash}, false, 0, ${expiresAt})
    `;

    let smsSuccess = false;
    let smsError = null;
    if (resolvedPhone) {
      const smsRes = await sendGenericOTPViaSMS(resolvedPhone, otp);
      smsSuccess = smsRes.success;
      smsError = smsRes.error;
    }

    if (!smsSuccess) {
      console.warn(`[SMS GATEWAY] Onboarding SMS send failed: ${smsError || "Unknown error"}.`);
      return NextResponse.json(
        { success: false, error: smsError || "Failed to send SMS OTP. Please check your phone number." },
        { status: 500 }
      );
    }

    console.log(`[DEV] SMS OTP sent to ${resolvedPhone}: ${otp}`);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully to phone number",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
