import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const token = searchParams.get("token");
    let doctorId = null;

    if (token) {
      const statusRows = await sql`
        SELECT doctor_id, token_expires_at
        FROM doctor_onboarding_status
        WHERE invitation_token = ${token}
        LIMIT 1
      `;
      const statusData = statusRows[0] || null;

      if (!statusData) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This invitation link is no longer valid. A newer link may have been sent to your email — please use the latest one, or contact admin to resend.",
          },
          { status: 401 }
        );
      }

      if (statusData.token_expires_at && new Date() > new Date(statusData.token_expires_at)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invitation link has expired. Please contact admin for a new link.",
          },
          { status: 401 }
        );
      }

      doctorId = statusData.doctor_id;
    } else if (phone) {
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
      doctorId = users[0].id;
    }

    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: "Identification required" },
        { status: 400 }
      );
    }

    const detailsRows = await sql`
      SELECT *
      FROM doctor_details
      WHERE id = ${doctorId}
      LIMIT 1
    `;
    const details = detailsRows[0] || null;

    if (!details) {
      return NextResponse.json(
        { success: false, error: "Details not found" },
        { status: 404 }
      );
    }

    const onboardingRows = await sql`
      SELECT *
      FROM doctor_onboarding_status
      WHERE doctor_id = ${doctorId}
      LIMIT 1
    `;
    const onboardingStatus = onboardingRows[0] || null;

    const userRows = await sql`
      SELECT phone_number
      FROM users
      WHERE id = ${doctorId}
      LIMIT 1
    `;
    const userData = userRows[0] || null;

    return NextResponse.json({
      success: true,
      data: details,
      onboarding_status: onboardingStatus,
      phone: userData?.phone_number || null,
      doctor_id: doctorId,
    });
  } catch (error) {
    console.error("Error getting pre-filled data:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
