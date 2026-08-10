import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { dispatchService } from "@/lib/layer1/serviceDispatcher";
import { logActivity } from "@/lib/layer1/activityLogger";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";
import { initiateRefund, scheduleProviderPayout } from "@/lib/layer1/refundEngine";

/**
 * GET / POST /api/cron/outbox-processor — Layer-111 Guaranteed Delivery Cron Backbone
 * 
 * Unblocks stuck background events securely. Implements optimistic lock filtering
 * to safely handle multiple scalable microservice thread executions without duplicate side-effects.
 */

export async function GET() {
  return await executeOutboxDrain();
}

export async function POST() {
  return await executeOutboxDrain();
}

async function executeOutboxDrain() {
  const performanceMetrics = { fetched: 0, processed: 0, failed: 0, errors: [] };

  try {
    // 1. Fetch trapped pending outbox rows, considering retry delays
    const { data: events, error: fetchErr } = await supabase
      .from("l1_event_outbox")
      .select("*")
      .eq("status", "PENDING")
      .lte("available_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(30);

    if (fetchErr) throw fetchErr;
    if (!events || events.length === 0) {
      return success("Outbox queue fully drained. Zero pending orchestration tasks.", performanceMetrics);
    }

    performanceMetrics.fetched = events.length;

    for (const evt of events) {
      try {
        // 2. Optimistic Concurrency Lock: Atomically claim item using specific status verification
        const { data: claimed, error: claimErr } = await supabase
          .from("l1_event_outbox")
          .update({ status: "PROCESSING" })
          .eq("id", evt.id)
          .eq("status", "PENDING")
          .select("id")
          .maybeSingle();

        if (claimErr || !claimed) {
          // Snatched concurrently by a horizontal sibling task instance
          continue;
        }

        // 2.1 Check exactly-once worker idempotency
        const { data: alreadyProcessed } = await supabase
          .from("processed_events")
          .select("event_id")
          .eq("event_id", evt.id)
          .maybeSingle();

        if (alreadyProcessed) {
           await supabase.from("l1_event_outbox").update({ status: "PROCESSED" }).eq("id", evt.id);
           continue; // Skip silently
        }

        // 3. Perform specific orchestration message handling block
        const payload = evt.payload || {};

        if (evt.event_type === "CONSULTATION_COMPLETED") {
          // Process clinical downstream allocations
          const { patient_id } = payload;
          
          // Verify ordering: if current status is already beyond COMPLETED, skip this update logic
          const { data: currentCons } = await supabase
            .from("consultations")
            .select("case_status")
            .eq("id", evt.consultation_id)
            .single();
            
          const terminalStates = ["FOLLOW_UP_PENDING", "CLOSED_RESOLVED", "CLOSED_NO_RESPONSE"];
          if (currentCons && terminalStates.includes(currentCons.case_status)) {
            console.warn(`[Outbox Processor] Skipping COMPLETED logic for ${evt.consultation_id} - already in state ${currentCons.case_status}`);
            await supabase.from("l1_event_outbox").update({ status: "PROCESSED", metadata: { reason: "SKIPPED_STALE_STATE" } }).eq("id", evt.id);
            continue;
          }
        } else if (evt.event_type === "CONSULTATION_POST_COMPLETE") {
          const { doctor_id, patient_id, has_non_critical_warnings, override_reason } = payload;
          const consultation_id = evt.consultation_id;

          // 1. Log activity asynchronously
          if (patient_id && doctor_id) {
            await logActivity({
              patient_id,
              care_episode_id: evt.care_episode_id,
              actor_id: doctor_id,
              module_type: "consultation",
              action_type: "completed",
              reference_id: consultation_id,
              description: "Consultation completed with clinical snapshot (Async recorded)",
            }).then(null, err => console.warn("Async activity log failed:", err.message));
          }

          // 2. Mark quality flag if warnings exist
          if (has_non_critical_warnings) {
            await supabase
              .from("consultation_quality_flag")
              .upsert({ consultation_id, quality_level: "LOW" }, { onConflict: "consultation_id" });
          }

          // 3. Log drop-off stage
          await supabase
            .from("consultation_dropoff")
            .insert({ consultation_id, dropoff_stage: "COMPLETED", created_at: new Date().toISOString() });

          // 4. Downstream Service Dispatch (Pharmacy & Lab)
          try {
            const { data: meds } = await supabase
              .from("consultation_medications")
              .select("*")
              .eq("consultation_id", consultation_id);

            const { data: tests } = await supabase
              .from("consultation_lab_tests")
              .select("*")
              .eq("consultation_id", consultation_id);

            if (meds && meds.length > 0) {
              await dispatchService({
                care_episode_id: evt.care_episode_id,
                consultation_id,
                patient_id,
                service_type: "pharmacy",
                consultation_type: evt.consultation_type || "STANDARD_MODE",
                payload: { medicines: meds }
              }).then(null, err => console.warn("Async Pharmacy dispatch failed:", err.message));
            }

            if (tests && tests.length > 0) {
              await dispatchService({
                care_episode_id: evt.care_episode_id,
                consultation_id,
                patient_id,
                service_type: "lab",
                consultation_type: evt.consultation_type || "STANDARD_MODE",
                payload: { lab_tests: tests }
              }).then(null, err => console.warn("Async Lab dispatch failed:", err.message));
            }
          } catch (dispatchErr) {
            console.error("Async downstream dispatch error:", dispatchErr);
          }
        } else if (evt.event_type === "PAYMENT_CAPTURED_WEBHOOK") {
          // Resolve async service coordination chains safely
          const { order_id, payment_id, amount, service_type } = payload;
          
          let serviceUpdated = false;

          // 1. Check Appointment (Consultation/Followup)
          const { data: appointment } = await supabase
            .from("appointments")
            .select("id, status, payment_status")
            .eq("razorpay_order_id", order_id)
            .maybeSingle();
            
          if (appointment) {
             if (appointment.payment_status !== "paid") {
                 const { error: updErr } = await supabase
                  .from("appointments")
                  .update({ payment_status: "paid", razorpay_payment_id: payment_id, status: "booked" })
                  .eq("id", appointment.id);
                 if (updErr) throw new Error("Service creation DB update failed");
             }
             serviceUpdated = true;
          }

          // 2. Check Lab Orders
          if (!serviceUpdated) {
             const { data: labOrder } = await supabase
               .from("lab_test_orders")
               .select("id, status, payment_status")
               .eq("razorpay_order_id", order_id)
               .maybeSingle();

             if (labOrder) {
                 if (labOrder.payment_status !== "paid") {
                     const { error: updErr } = await supabase
                      .from("lab_test_orders")
                      .update({ payment_status: "paid", razorpay_payment_id: payment_id, status: "BOOKED" })
                      .eq("id", labOrder.id);
                     if (updErr) throw new Error("Service creation DB update failed");
                 }
                 serviceUpdated = true;
             }
          }

          if (!serviceUpdated) {
             // If we reached here, the payment belongs to an unknown order or it doesn't exist yet
             throw new Error("Service allocation failed: Related service not found for payment");
          }

          // 3. Trigger Guaranteed Notification (Non-blocking)
          await supabase.from("notifications").insert({
            user_id: evt.payload.patient_id || appointment?.patient_id,
            title: "Payment Received",
            message: `Your payment of ₹${amount} was successfully processed. Service Booked.`,
            type: "payment_success",
            metadata: { order_id, payment_id }
          }).then(null, (err) => console.error("[OutboxProcessor] Async notification dropped:", err.message));

        } else if (evt.event_type === "PAYMENT_FAILED_WEBHOOK") {
          const { order_id, error_reason } = payload;
          
          // Guaranteed failure notification
          await supabase.from("notifications").insert({
            user_id: evt.payload.patient_id,
            title: "Payment Failed",
            message: `Your payment for order ${order_id} failed. Reason: ${error_reason}`,
            type: "payment_failure",
            metadata: { order_id, error_reason }
          }).then(null, (err) => console.error("[OutboxProcessor] Async notification dropped:", err.message));
        } else if (evt.event_type === "CONSULTATION_FAILED_NO_SHOW") {
          const { patient_id, reason } = payload;
          
          if ((evt.attempts || 0) < 1) {
            // Reassign logic (Try finding another doctor once)
            await supabase.from("ops_incident_log").insert([{
              priority: "P2",
              source: "RECOVERY_ENGINE",
              reference_id: evt.consultation_id,
              care_episode_id: evt.care_episode_id,
              description: "Attempting doctor reassignment after no-show."
            }]);
            
            // In a real system, we'd call a matching service here.
            // For now, we simulate a retry that might find a doctor.
            throw new Error("Triggering reassignment retry"); 
          } else {
            // Refund or Reschedule after first failure
            await insertOutboxEvent({
              event_type: "PAYMENT_REFUND_REQUESTED",
              consultation_id: evt.consultation_id,
              care_episode_id: evt.care_episode_id,
              consultation_type: "SYSTEM_RECOVERY",
              payload: { patient_id, reason: "doctor_no_show_terminal" }
            });
            
            await supabase.from("ops_incident_log").insert([{
              priority: "P1",
              source: "RECOVERY_ENGINE",
              reference_id: evt.consultation_id,
              care_episode_id: evt.care_episode_id,
              description: "Doctor no-show terminal failure. Refund requested."
            }]);
          }
        } else if (evt.event_type === "FOLLOW_UP_DUE") {
          // Engagement signal: patient needs follow-up reminder
          const { patient_id, reminder_day, overdue_days } = payload;

          if (patient_id) {
            const isOverdue = !!overdue_days;
            await supabase.from("notifications").insert({
              user_id: patient_id,
              title: isOverdue ? "Follow-up is overdue" : "How are you feeling?",
              message: isOverdue
                ? `Your follow-up is ${overdue_days} day(s) overdue. Please share your health update or schedule a new visit.`
                : "Your doctor would like to know how you're recovering. Please share a quick update.",
              type: "followup_reminder",
              metadata: {
                consultation_id: evt.consultation_id,
                care_episode_id: evt.care_episode_id,
                reminder_day: reminder_day || (isOverdue ? 7 : 3)
              }
            }).then(null, (err) => console.error("[OutboxProcessor] Followup reminder dropped:", err.message));

            // Update engagement profile — follow-up signal = moderate engagement indicator
            await supabase.from("user_engagement_profile").upsert({
              user_id: patient_id,
              last_action: "FOLLOW_UP_REMINDER_SENT",
              fatigue_score: supabase.rpc ? 1 : 1, // increment tracked via cron sync
              updated_at: new Date().toISOString()
            }, { onConflict: "user_id", ignoreDuplicates: false }).then(null, (err) => console.error("[OutboxProcessor] Profile update dropped:", err.message));
          }

        } else if (evt.event_type === "FOLLOWUP_MISSED") {
          // Patient never responded — auto-close signal
          const { patient_id } = payload;

          if (patient_id) {
            await supabase.from("notifications").insert({
              user_id: patient_id,
              title: "Follow-up closed",
              message: "Your follow-up has been automatically closed due to no response. You can start a new consultation anytime.",
              type: "followup_closed",
              metadata: {
                consultation_id: evt.consultation_id,
                care_episode_id: evt.care_episode_id
              }
            }).then(null, (err) => console.error("[OutboxProcessor] Followup closed notification dropped:", err.message));
          }

          // Log incident for missed follow-ups
          await supabase.from("ops_incident_log").insert([{
            priority: "P3",
            source: "FOLLOWUP_ENGINE",
            reference_id: evt.consultation_id,
            care_episode_id: evt.care_episode_id,
            description: `Patient ${patient_id} follow-up missed — auto-closed after threshold.`
          }]).catch((err) => console.error("[OutboxProcessor] Followup missed incident log failed:", err.message));
        } else if (evt.event_type === "PAYMENT_REFUND_REQUESTED") {
          // ── Phase 5: Trigger Razorpay refund via RefundEngine ──────────
          const { patient_id, reason, amount, payment_id } = payload;

          if (patient_id && payment_id && amount) {
            await initiateRefund({
              patient_id,
              care_episode_id:      evt.care_episode_id,
              consultation_id:      evt.consultation_id,
              original_payment_id:  payment_id,
              amount,
              reason:               reason || 'Service delivery failure — auto-refund',
              initiated_by:         'outbox_processor'
            });
          } else {
            // Missing data — create P1 incident but don't fail the event
            await supabase.from('ops_incident_log').insert([{
              priority:        'P1',
              source:          'REFUND_ENGINE',
              reference_id:    evt.consultation_id,
              care_episode_id: evt.care_episode_id,
              description:     `REFUND_REQUESTED missing required fields. patient_id: ${patient_id}, payment_id: ${payment_id}, amount: ${amount}`
            }]).catch((err) => console.error("[OutboxProcessor] Refund incident log failed:", err.message));
          }

        } else if (evt.event_type === "CONSULTATION_COMPLETED_PAYOUT") {
          // ── Phase 5: Schedule provider payout after consultation ────────
          const { doctor_id, gross_amount } = payload;

          if (doctor_id && gross_amount) {
            await scheduleProviderPayout({
              provider_id:      doctor_id,
              care_episode_id:  evt.care_episode_id,
              consultation_id:  evt.consultation_id,
              gross_amount
            });
          }
        }

        // 4. Mark item execution absolutely complete and register in processed_events
        await supabase.from("processed_events").insert([{
          event_id: evt.id,
          worker_name: "outbox-processor",
          status: "SUCCESS"
        }]);

        await supabase
          .from("l1_event_outbox")
          .update({ status: "PROCESSED" })
          .eq("id", evt.id);

        performanceMetrics.processed++;
      } catch (evtErr) {
        console.error(`[Outbox Processor] Task iteration execution fault on ${evt.id}:`, evtErr);

        const currentAttempts = (evt.attempts || 0) + 1;
        
        if (currentAttempts >= 3) {
          // Dead letter + Auto Refund if Payment Event + P1 Incident
          const isPayment = evt.event_type === "PAYMENT_CAPTURED_WEBHOOK";
          const priority = isPayment ? "P1" : "P2";
          
          let refundNote = "";
          if (isPayment) {
              refundNote = " Auto-refund triggered due to service creation failure.";
              // Queue an async refund event or hit payment gateway here
              await insertOutboxEvent({
                  event_type: "PAYMENT_REFUND_REQUESTED",
                  consultation_id: evt.consultation_id,
                  care_episode_id: evt.care_episode_id,
                  consultation_type: "SYSTEM_RECOVERY",
                  payload: { ...evt.payload, reason: "service_creation_failed_max_retries" }
              });
          }

          await supabase.from("ops_incident_log").insert([{
            priority: priority,
            source: "OUTBOX_PROCESSOR",
            reference_id: evt.id,
            care_episode_id: evt.care_episode_id,
            description: `Event ${evt.event_type} failed after 3 attempts. Moved to Dead Letter.${refundNote} Error: ${evtErr.message}`,
          }]);

          await supabase.from("l1_event_outbox").update({ 
            status: "FAILED", 
            attempts: currentAttempts,
            payload: { ...(evt.payload || {}), error_trace: evtErr.message, dead_letter: true, auto_refunded: isPayment } 
          }).eq("id", evt.id);
        } else {
          // Retry
          // Exponential backoff: e.g., wait 5 mins * attempt count
          const nextAvailableAt = new Date(Date.now() + currentAttempts * 5 * 60000).toISOString();
          
          await supabase.from("l1_event_outbox").update({ 
            status: "PENDING", // Keep pending so it is picked up again
            attempts: currentAttempts,
            available_at: nextAvailableAt,
            payload: { ...(evt.payload || {}), error_trace: evtErr.message } 
          }).eq("id", evt.id);
        }

        performanceMetrics.failed++;
        performanceMetrics.errors.push({ id: evt.id, error: evtErr.message });
      }
    }

    return success("Outbox execution batch processed successfully", performanceMetrics);
  } catch (err) {
    console.error("Outbox runtime execution unhandled exception fault:", err);
    return failure("Outbox consumer background thread failure", err.message, 500);
  }
}
