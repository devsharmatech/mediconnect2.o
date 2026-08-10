import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

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

    // Resolve doctor_id from phone
    if (!resolvedDoctorId && phone) {
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("phone_number", phone)
        .eq("role", "doctor");

      if (userError || !users || users.length === 0) {
        return NextResponse.json(
          { success: false, error: "Doctor not found" },
          { status: 404 }
        );
      }
      resolvedDoctorId = users[0].id;
    }

    // Resolve doctor_id from email
    if (!resolvedDoctorId && email) {
      const { data: details, error: detailsError } = await supabase
        .from("doctor_details")
        .select("id")
        .eq("email", email);

      if (!detailsError && details && details.length > 0) {
        resolvedDoctorId = details[0].id;
      }
    }

    if (!resolvedDoctorId) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }


    // STRICT STATE MACHINE: OTP must be verified first
    const { data: statusData, error: statusFetchError } = await supabase
      .from("doctor_onboarding_status")
      .select("otp_verified, status")
      .eq("doctor_id", resolvedDoctorId)
      .single();

    if (statusFetchError || !statusData?.otp_verified) {
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
      ip_address ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    const capturedDevice =
      device_info || request.headers.get("user-agent") || "unknown";

    // Insert consent record
    const { error: consentError } = await supabase
      .from("doctor_consents")
      .insert([
        {
          doctor_id: resolvedDoctorId,
          consent_version,
          agreement_accepted: true,
          accepted_at: capturedAt,
          ip_address: capturedIp,
          device_info: capturedDevice,
        },
      ]);

    if (consentError) {
      console.warn("Could not insert consent record:", consentError.message);
    }

    // ── STATE MACHINE: CONSENT_COMPLETED → READY_FOR_VERIFICATION ────────────
    // Step 1: Mark CONSENT_COMPLETED
    await supabase
      .from("doctor_onboarding_status")
      .update({
        agreement_accepted: true,
        status: "CONSENT_COMPLETED",
        updated_at: capturedAt,
      })
      .eq("doctor_id", resolvedDoctorId);

    // Step 2: Immediately transition to READY_FOR_VERIFICATION (both conditions met)
    const { error: updateError } = await supabase
      .from("doctor_onboarding_status")
      .update({
        status: "READY_FOR_VERIFICATION",
        updated_at: new Date().toISOString(),
      })
      .eq("doctor_id", resolvedDoctorId);

    if (updateError) throw updateError;
    // ─────────────────────────────────────────────────────────────────────────

    // Also update doctor_details
    await supabase
      .from("doctor_details")
      .update({
        onboarding_status: "pending",
        digital_consent: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolvedDoctorId);

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
