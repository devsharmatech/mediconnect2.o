import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctor_id = searchParams.get("doctor_id");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");

    if (!doctor_id && !email && !phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Provide doctor_id, email, or phone as query parameter.",
        },
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
      if (users && users.length > 0) resolvedDoctorId = users[0].id;
    }

    if (!resolvedDoctorId && email) {
      const details = await sql`
        SELECT id
        FROM doctor_details
        WHERE email = ${email}
        LIMIT 1
      `;
      if (details && details.length > 0) resolvedDoctorId = details[0].id;
    }

    if (!resolvedDoctorId) {
      return NextResponse.json(
        { success: false, error: "Doctor not found." },
        { status: 404 }
      );
    }

    const statusRows = await sql`
      SELECT *
      FROM doctor_onboarding_status
      WHERE doctor_id = ${resolvedDoctorId}
      LIMIT 1
    `;
    const statusData = statusRows[0] || null;

    if (!statusData) {
      return NextResponse.json(
        { success: false, error: "Onboarding status record not found." },
        { status: 404 }
      );
    }

    const latestConsent = await sql`
      SELECT consent_version, accepted_at
      FROM doctor_consents
      WHERE doctor_id = ${resolvedDoctorId}
        AND agreement_accepted = true
      ORDER BY accepted_at DESC
      LIMIT 1
    `;

    const canConsult =
      statusData.registration_verified === true &&
      statusData.agreement_accepted === true &&
      statusData.otp_verified === true;

    return NextResponse.json({
      success: true,
      data: {
        doctor_id: resolvedDoctorId,
        status: statusData.status,
        otp_verified: statusData.otp_verified,
        agreement_accepted: statusData.agreement_accepted,
        registration_verified: statusData.registration_verified,
        allowed_to_consult: statusData.allowed_to_consult,
        otp_failure_flagged: statusData.otp_failure_flagged || false,
        can_consult: canConsult,
        last_consent_version: latestConsent?.[0]?.consent_version || null,
        consent_accepted_at: latestConsent?.[0]?.accepted_at || null,
        updated_at: statusData.updated_at,
      },
    });
  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
