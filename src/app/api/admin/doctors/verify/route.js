import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

// Spec: after 2 rejections → REVIEW_REQUIRED (mandatory admin review)
const MAX_REJECTIONS_BEFORE_REVIEW = 2;

export async function POST(request) {
  try {
    const { doctor_id, action, notes, admin_id } = await request.json();

    if (!doctor_id || !["APPROVE", "REJECT", "REQUEST_INFO"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid parameters. action must be APPROVE, REJECT, or REQUEST_INFO.",
        },
        { status: 400 }
      );
    }

    // 1. Fetch current onboarding status
    const statusRows = await sql`
      SELECT *
      FROM doctor_onboarding_status
      WHERE doctor_id = ${doctor_id}
      LIMIT 1
    `;

    if (!statusRows || statusRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Doctor onboarding record not found." },
        { status: 404 }
      );
    }

    const statusData = statusRows[0];

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

      await sql`
        UPDATE doctor_onboarding_status
        SET 
          registration_verified = true,
          allowed_to_consult = true,
          status = 'APPROVED',
          updated_at = NOW()
        WHERE doctor_id = ${doctor_id}
      `;

      // Activate in users table
      await sql`
        UPDATE users
        SET status = 1, is_verified = true
        WHERE id = ${doctor_id}
      `;

      // Update doctor_details
      await sql`
        UPDATE doctor_details
        SET onboarding_status = 'approved', updated_at = NOW()
        WHERE id = ${doctor_id}
      `;

    }
    // ── REJECT ────────────────────────────────────────────────────────────────
    else if (action === "REJECT") {
      // Count prior rejections to determine if REVIEW_REQUIRED
      const priorRejections = await sql`
        SELECT id
        FROM doctor_verification_logs
        WHERE doctor_id = ${doctor_id} AND action = 'REJECTED'
      `;

      const rejectionCount = priorRejections?.length || 0;
      const newStatus =
        rejectionCount + 1 >= MAX_REJECTIONS_BEFORE_REVIEW
          ? "REVIEW_REQUIRED"
          : "REJECTED";

      await sql`
        UPDATE doctor_onboarding_status
        SET 
          registration_verified = false,
          allowed_to_consult = false,
          status = ${newStatus},
          updated_at = NOW()
        WHERE doctor_id = ${doctor_id}
      `;

      await sql`
        UPDATE users
        SET status = 0, is_verified = false
        WHERE id = ${doctor_id}
      `;

      await sql`
        UPDATE doctor_details
        SET 
          onboarding_status = ${newStatus === "REVIEW_REQUIRED" ? "review_required" : "rejected"},
          updated_at = NOW()
        WHERE id = ${doctor_id}
      `;

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

      await sql`
        UPDATE doctor_onboarding_status
        SET 
          status = 'INFO_REQUESTED',
          updated_at = NOW()
        WHERE doctor_id = ${doctor_id}
      `;

      await sql`
        UPDATE doctor_details
        SET onboarding_status = 'info_requested', updated_at = NOW()
        WHERE id = ${doctor_id}
      `;
    }

    // ── AUDIT LOG (all actions) ───────────────────────────────────────────────
    try {
      const rawAdminId = admin_id || null;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const verifiedBy = rawAdminId && uuidRegex.test(rawAdminId) ? rawAdminId : null;

      await sql`
        INSERT INTO doctor_verification_logs (
          doctor_id, action, reason, verified_by, created_at
        ) VALUES (
          ${doctor_id},
          ${action === "REQUEST_INFO" ? "INFO_REQUESTED" : action === "APPROVE" ? "APPROVED" : "REJECTED"},
          ${notes || null},
          ${verifiedBy},
          NOW()
        )
      `;
    } catch (logErr) {
      console.warn("Could not log verification action:", logErr.message);
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
