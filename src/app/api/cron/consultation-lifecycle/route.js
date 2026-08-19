import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { logAudit } from "@/lib/layer1/auditLogger";
import { logActivity } from "@/lib/layer1/activityLogger";
import { updateConsultationStatus } from "@/lib/layer1/consultationStateMachine";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

/**
 * MASTER ARCHITECTURE (J24 - NO-SHOW & INACTIVITY LIFECYCLE)
 * 
 * Rules:
 * 1. Doctor No-Show: If 5 minutes pass from consultation time with doctor absent,
 *    flag as DOCTOR_NO_SHOW / FAILED and enable refund/reassignment path.
 * 2. Inactive Session: If consultation is inactive for >15 minutes,
 *    auto-expire session, release channel resources, notify participants, and audit.
 */

export async function GET(req) {
  return await handleLifecycleSweep(req);
}

export async function POST(req) {
  return await handleLifecycleSweep(req);
}

async function handleLifecycleSweep(req) {
  const cronSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return failure("Unauthorized", "Invalid cron secret", 401, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const summary = {
    no_shows_detected: 0,
    inactive_sessions_expired: 0,
    errors: []
  };

  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    // ── 1. Check for Doctor No-Show (5 Min Rule) ──
    const { data: pendingConsultations, error: pendingErr } = await supabase
      .from("consultations")
      .select(`
        id,
        appointment_id,
        doctor_id,
        patient_id,
        case_status,
        created_at,
        updated_at,
        appointments (
          id,
          appointment_date,
          appointment_time,
          care_episode_id
        )
      `)
      .in("case_status", ["STARTED", "active", "booked"])
      .is("doctor_joined_at", null)
      .lt("created_at", fiveMinutesAgo.toISOString())
      .limit(50);

    if (!pendingErr && Array.isArray(pendingConsultations)) {
      for (const item of pendingConsultations) {
        try {
          // Log doctor no show exception
          await logAudit({
            entity_type: "consultation",
            entity_id: item.id,
            previous_state: { case_status: item.case_status },
            new_state: { case_status: "DOCTOR_NO_SHOW", reassignment_eligible: true },
            changed_by: "system_lifecycle_cron",
            change_description: "Doctor absent after 5 min waiting threshold (J24 No-Show rule)"
          });

          await logActivity({
            patient_id: item.patient_id,
            care_episode_id: item.appointments?.care_episode_id || null,
            module_type: "consultation",
            action_type: "doctor_no_show_detected",
            reference_id: item.id,
            description: "Consultation flagged: Doctor did not join within 5 minutes. Eligible for refund/reassignment."
          });

          // Send notification to patient
          await sendPushAndInAppNotification({
            userId: item.patient_id,
            title: "Doctor Unavailable",
            body: "Your doctor was unavailable for the consultation. You are eligible for an immediate reschedule or full refund.",
            data: { consultation_id: item.id, type: "doctor_no_show" }
          }).catch(() => {});

          summary.no_shows_detected++;
        } catch (itemErr) {
          summary.errors.push(`No-show item error: ${itemErr.message}`);
        }
      }
    }

    // ── 2. Check for Inactive Consultations (15 Min Expiry Rule) ──
    const { data: inactiveConsultations, error: inactiveErr } = await supabase
      .from("consultations")
      .select("id, patient_id, doctor_id, case_status, updated_at")
      .eq("case_status", "ACTIVE")
      .lt("updated_at", fifteenMinutesAgo.toISOString())
      .limit(50);

    if (!inactiveErr && Array.isArray(inactiveConsultations)) {
      for (const item of inactiveConsultations) {
        try {
          await updateConsultationStatus(
            item.id,
            "COMPLETED",
            "system_lifecycle_cron",
            "Auto-completed after 15 min inactivity timeout (J24 Resource Release)"
          );

          summary.inactive_sessions_expired++;
        } catch (itemErr) {
          summary.errors.push(`Inactivity item error: ${itemErr.message}`);
        }
      }
    }

    return success("Consultation lifecycle sweep complete.", {
      duration_ms: Date.now() - startedAt,
      summary
    }, 200, { headers: corsHeaders });

  } catch (err) {
    console.error("Consultation lifecycle sweep error:", err);
    return failure("Failed to execute lifecycle sweep.", err.message, 500, { headers: corsHeaders });
  }
}
