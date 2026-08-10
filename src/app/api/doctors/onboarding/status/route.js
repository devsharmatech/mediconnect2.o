import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/doctors/onboarding/status
 *
 * Returns the full onboarding status for a doctor.
 * Query params: ?doctor_id=<uuid>  OR  ?email=<email>  OR  ?phone=<phone>
 *
 * Response includes:
 *   - status (state machine value)
 *   - otp_verified
 *   - agreement_accepted
 *   - registration_verified
 *   - allowed_to_consult
 *   - otp_failure_flagged
 *   - last consent version accepted
 */
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

    // Resolve by phone
    if (!resolvedDoctorId && phone) {
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("phone_number", phone)
        .eq("role", "doctor")
        .limit(1);
      if (users && users.length > 0) resolvedDoctorId = users[0].id;
    }

    // Resolve by email
    if (!resolvedDoctorId && email) {
      const { data: details } = await supabase
        .from("doctor_details")
        .select("id")
        .eq("email", email)
        .limit(1);
      if (details && details.length > 0) resolvedDoctorId = details[0].id;
    }

    if (!resolvedDoctorId) {
      return NextResponse.json(
        { success: false, error: "Doctor not found." },
        { status: 404 }
      );
    }

    // Fetch onboarding status record
    const { data: statusData, error: statusError } = await supabase
      .from("doctor_onboarding_status")
      .select("*")
      .eq("doctor_id", resolvedDoctorId)
      .single();

    if (statusError || !statusData) {
      return NextResponse.json(
        { success: false, error: "Onboarding status record not found." },
        { status: 404 }
      );
    }

    // Fetch latest accepted consent version
    const { data: latestConsent } = await supabase
      .from("doctor_consents")
      .select("consent_version, accepted_at")
      .eq("doctor_id", resolvedDoctorId)
      .eq("agreement_accepted", true)
      .order("accepted_at", { ascending: false })
      .limit(1);

    // Determine if doctor can consult (all 3 flags must be true)
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
