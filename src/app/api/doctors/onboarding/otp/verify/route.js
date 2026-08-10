import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import crypto from "crypto";

const MAX_ATTEMPTS = 3; // spec: max 3 attempts per session

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

    // Resolve doctor_id from phone or email
    if (!resolvedDoctorId && phone) {
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("phone_number", phone)
        .eq("role", "doctor");

      if (!userError && users && users.length > 0) {
        resolvedDoctorId = users[0].id;
      }
    }

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

    // Fetch the latest unused OTP for this doctor
    const { data: otpLogs, error: logError } = await supabase
      .from("doctor_otp_logs")
      .select("*")
      .eq("doctor_id", resolvedDoctorId)
      .eq("is_used", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (logError || !otpLogs || otpLogs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No active OTP found. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const latestLog = otpLogs[0];

    // Check expiry
    if (new Date() > new Date(latestLog.expires_at)) {
      return NextResponse.json(
        {
          success: false,
          error: "OTP has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // ── ATTEMPT LIMIT ─────────────────────────────────────────────────────────
    const currentAttempts = latestLog.attempt_count || 0;

    if (currentAttempts >= MAX_ATTEMPTS) {
      // Flag for admin review after max attempts exceeded
      await supabase
        .from("doctor_onboarding_status")
        .update({
          otp_failure_flagged: true,
          updated_at: new Date().toISOString(),
        })
        .eq("doctor_id", resolvedDoctorId);

      // Invalidate the OTP
      await supabase
        .from("doctor_otp_logs")
        .update({ is_used: true })
        .eq("id", latestLog.id);

      return NextResponse.json(
        {
          success: false,
          error: "Maximum OTP attempts exceeded. Please request a new OTP.",
          require_resend: true,
        },
        { status: 429 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Hash and verify
    const inputHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (inputHash !== latestLog.otp_hash) {
      // Increment attempt count
      await supabase
        .from("doctor_otp_logs")
        .update({ attempt_count: currentAttempts + 1 })
        .eq("id", latestLog.id);

      const attemptsLeft = MAX_ATTEMPTS - (currentAttempts + 1);

      return NextResponse.json(
        {
          success: false,
          error: `Invalid OTP. ${attemptsLeft > 0 ? `${attemptsLeft} attempt(s) remaining.` : "No attempts remaining. Please request a new OTP."}`,
          attempts_left: attemptsLeft,
        },
        { status: 400 }
      );
    }

    // ── OTP VALID ─────────────────────────────────────────────────────────────
    // Mark as used (single-use enforcement)
    await supabase
      .from("doctor_otp_logs")
      .update({ is_used: true, attempt_count: currentAttempts + 1 })
      .eq("id", latestLog.id);

    // Update onboarding status to OTP_COMPLETED
    const { error: statusError } = await supabase
      .from("doctor_onboarding_status")
      .update({
        otp_verified: true,
        status: "OTP_COMPLETED",
        otp_failure_flagged: false, // clear any prior flag
        updated_at: new Date().toISOString(),
      })
      .eq("doctor_id", resolvedDoctorId);

    if (statusError) {
      console.warn("Could not update onboarding status:", statusError);
      // Fallback: update just the verified flag
      await supabase
        .from("doctor_onboarding_status")
        .update({
          otp_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("doctor_id", resolvedDoctorId);
    }

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
