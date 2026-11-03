import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function POST(request) {
  try {
    const { phone, email, doctor_id, consent_version, ip_address, device_info } =
      await request.json();

    if (!consent_version) {
      return NextResponse.json(
        { success: false, error: "consent_version is required" },
        { status: 400 }
      );
    }

    if (!phone && !doctor_id) {
      return NextResponse.json(
        { success: false, error: "Phone or doctor_id is required" },
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
      if (!users || users.length === 0) {
        return NextResponse.json(
          { success: false, error: "Doctor not found" },
          { status: 404 }
        );
      }
      resolvedDoctorId = users[0].id;
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

    const statusRows = await sql`
      SELECT otp_verified, status
      FROM doctor_onboarding_status
      WHERE doctor_id = ${resolvedDoctorId}
      LIMIT 1
    `;
    const statusData = statusRows[0] || null;

    if (!statusData?.otp_verified) {
      return NextResponse.json(
        {
          success: false,
          error: "OTP verification required before accepting agreement.",
        },
        { status: 403 }
      );
    }

    const capturedAt = new Date().toISOString();
    const capturedIp =
      ip_address || request.headers.get("x-forwarded-for") || "unknown";
    const capturedDevice =
      device_info || request.headers.get("user-agent") || "unknown";

    try {
      await sql`
        INSERT INTO doctor_consents (
          doctor_id,
          consent_version,
          agreement_accepted,
          accepted_at,
          ip_address,
          device_info
        )
        VALUES (
          ${resolvedDoctorId},
          ${consent_version},
          true,
          ${capturedAt},
          ${capturedIp},
          ${capturedDevice}
        )
      `;
    } catch (consentError) {
      console.warn("Could not insert consent record:", consentError.message);
    }

    await sql`
      UPDATE doctor_onboarding_status
      SET agreement_accepted = true,
          status = 'READY_FOR_VERIFICATION',
          updated_at = NOW()
      WHERE doctor_id = ${resolvedDoctorId}
    `;

    await sql`
      UPDATE doctor_details
      SET onboarding_status = 'pending',
          digital_consent = true,
          updated_at = NOW()
      WHERE id = ${resolvedDoctorId}
    `;

    return NextResponse.json({
      success: true,
      message: "Agreement accepted. Status updated to READY_FOR_VERIFICATION.",
      flow: ["OTP_COMPLETED", "CONSENT_COMPLETED", "READY_FOR_VERIFICATION"],
    });
  } catch (error) {
    console.error("Error accepting agreement:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
