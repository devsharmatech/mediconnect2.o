import { NextResponse } from "next/server";
import sql from "@/lib/db";
import crypto from "crypto";

const MAX_ATTEMPTS = 3;

export async function POST(request) {
  try {
    const { email, phone, otp, doctor_id } = await request.json();

    if (!otp) {
      return NextResponse.json(
        { success: false, error: "OTP is required" },
        { status: 400 }
      );
    }

    if (!email && !phone && !doctor_id) {
      return NextResponse.json(
        { success: false, error: "Email, Phone or doctor_id is required" },
        { status: 400 }
      );
    }

    let resolvedDoctorId = doctor_id;

    if (!resolvedDoctorId && phone) {
      const users = await sql`
        SELECT id
        FROM users
        WHERE phone_number = ${phone}
          AND role = 'doctor'
        LIMIT 1
      `;
      if (users && users.length > 0) {
        resolvedDoctorId = users[0].id;
      }
    }

    if (!resolvedDoctorId && email) {
      const details = await sql`
        SELECT id
        FROM doctor_details
        WHERE email = ${email}
        LIMIT 1
      `;
      if (details && details.length > 0) {
        resolvedDoctorId = details[0].id;
      }
    }

    if (!resolvedDoctorId) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }

    const otpLogs = await sql`
      SELECT *
      FROM doctor_otp_logs
      WHERE doctor_id = ${resolvedDoctorId}
        AND is_used = false
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!otpLogs || otpLogs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No active OTP found. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const latestLog = otpLogs[0];

    if (new Date() > new Date(latestLog.expires_at)) {
      return NextResponse.json(
        {
          success: false,
          error: "OTP has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const currentAttempts = latestLog.attempt_count || 0;

    if (currentAttempts >= MAX_ATTEMPTS) {
      await sql`
        UPDATE doctor_onboarding_status
        SET otp_failure_flagged = true,
            updated_at = NOW()
        WHERE doctor_id = ${resolvedDoctorId}
      `;

      await sql`
        UPDATE doctor_otp_logs
        SET is_used = true
        WHERE id = ${latestLog.id}
      `;

      return NextResponse.json(
        {
          success: false,
          error: "Maximum OTP attempts exceeded. Please request a new OTP.",
          require_resend: true,
        },
        { status: 429 }
      );
    }

    const inputHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (inputHash !== latestLog.otp_hash) {
      await sql`
        UPDATE doctor_otp_logs
        SET attempt_count = ${currentAttempts + 1}
        WHERE id = ${latestLog.id}
      `;

      const attemptsLeft = MAX_ATTEMPTS - (currentAttempts + 1);

      return NextResponse.json(
        {
          success: false,
          error: `Invalid OTP. ${
            attemptsLeft > 0
              ? `${attemptsLeft} attempt(s) remaining.`
              : "No attempts remaining. Please request a new OTP."
          }`,
          attempts_left: attemptsLeft,
        },
        { status: 400 }
      );
    }

    await sql`
      UPDATE doctor_otp_logs
      SET is_used = true,
          attempt_count = ${currentAttempts + 1}
      WHERE id = ${latestLog.id}
    `;

    await sql`
      INSERT INTO doctor_onboarding_status (doctor_id, otp_verified, status, otp_failure_flagged, updated_at)
      VALUES (${resolvedDoctorId}, true, 'OTP_COMPLETED', false, NOW())
      ON CONFLICT (doctor_id)
      DO UPDATE SET
        otp_verified = true,
        status = 'OTP_COMPLETED',
        otp_failure_flagged = false,
        updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
