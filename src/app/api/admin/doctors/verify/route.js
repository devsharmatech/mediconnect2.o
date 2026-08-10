import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

// Spec: after 2 rejections → REVIEW_REQUIRED (mandatory admin review)
const MAX_REJECTIONS_BEFORE_REVIEW = 2;

export async function POST(request) {
  try {
    const { doctor_id, action, notes, admin_id } = await request.json();

    if (!doctor_id || !["APPROVE", "REJECT", "REQUEST_INFO"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid parameters. action must be APPROVE, REJECT, or REQUEST_INFO.",
        },
        { status: 400 }
      );
    }

    // 1. Fetch current onboarding status
    const { data: statusData, error: statusError } = await supabase
      .from("doctor_onboarding_status")
      .select("*")
      .eq("doctor_id", doctor_id)
      .single();

    if (statusError || !statusData) {
      return NextResponse.json(
        { success: false, error: "Doctor onboarding record not found." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // ── APPROVE ───────────────────────────────────────────────────────────────
    if (action === "APPROVE") {
      if (!statusData.otp_verified) {
        return NextResponse.json(
          { success: false, error: "Cannot approve: OTP is not verified." },
          { status: 400 }
        );
      }
      if (!statusData.agreement_accepted) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot approve: Agreement not accepted.",
          },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from("doctor_onboarding_status")
        .update({
          registration_verified: true,
          allowed_to_consult: true,
          status: "APPROVED",
          updated_at: now,
        })
        .eq("doctor_id", doctor_id);

      if (updateError) throw updateError;

      // Activate in users table
      await supabase
        .from("users")
        .update({ status: 1, is_verified: true })
        .eq("id", doctor_id);

      // Update doctor_details
      await supabase
        .from("doctor_details")
        .update({ onboarding_status: "approved", updated_at: now })
        .eq("id", doctor_id);

    }
    // ── REJECT ────────────────────────────────────────────────────────────────
    else if (action === "REJECT") {
      // Count prior rejections to determine if REVIEW_REQUIRED
      const { data: priorRejections } = await supabase
        .from("doctor_verification_logs")
        .select("id")
        .eq("doctor_id", doctor_id)
        .eq("action", "REJECTED");

      const rejectionCount = priorRejections?.length || 0;
      const newStatus =
        rejectionCount + 1 >= MAX_REJECTIONS_BEFORE_REVIEW
          ? "REVIEW_REQUIRED"
          : "REJECTED";

      const { error: updateError } = await supabase
        .from("doctor_onboarding_status")
        .update({
          registration_verified: false,
          allowed_to_consult: false,
          status: newStatus,
          updated_at: now,
        })
        .eq("doctor_id", doctor_id);

      if (updateError) throw updateError;

      await supabase
        .from("users")
        .update({ status: 0, is_verified: false })
        .eq("id", doctor_id);

      await supabase
        .from("doctor_details")
        .update({
          onboarding_status: newStatus === "REVIEW_REQUIRED" ? "review_required" : "rejected",
          updated_at: now,
        })
        .eq("id", doctor_id);

    }
    // ── REQUEST_INFO ──────────────────────────────────────────────────────────
    else if (action === "REQUEST_INFO") {
      if (!notes) {
        return NextResponse.json(
          {
            success: false,
            error: "notes/reason is required when requesting more information.",
          },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from("doctor_onboarding_status")
        .update({
          status: "INFO_REQUESTED",
          updated_at: now,
        })
        .eq("doctor_id", doctor_id);

      if (updateError) throw updateError;

      await supabase
        .from("doctor_details")
        .update({ onboarding_status: "info_requested", updated_at: now })
        .eq("id", doctor_id);
    }

    // ── AUDIT LOG (all actions) ───────────────────────────────────────────────
    try {
      await supabase.from("doctor_verification_logs").insert([
        {
          doctor_id: doctor_id,
          action: action === "REQUEST_INFO" ? "INFO_REQUESTED" : action === "APPROVE" ? "APPROVED" : "REJECTED",
          reason: notes || null,
          verified_by: admin_id || null,   // spec: log who performed the action
          created_at: now,
        },
      ]);
    } catch (logErr) {
      console.warn("Could not log verification action:", logErr);
    }

    const messages = {
      APPROVE: "Doctor successfully approved and activated.",
      REJECT: "Doctor rejected.",
      REQUEST_INFO: "Information requested from doctor.",
    };

    return NextResponse.json({
      success: true,
      message: messages[action],
      status: action,
    });
  } catch (error) {
    console.error("Error verifying doctor:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
