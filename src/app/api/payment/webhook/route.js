import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import crypto from "crypto";
import { createLedgerEntry } from "@/lib/layer1/financialLedger";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "@/lib/layer1/idempotencyService";
import { createIncident } from "@/lib/layer1/incidentService";
import { sendPaymentUpdate } from "@/lib/sms";


/**
 * POST /api/payment/webhook — Dedicated Server-to-Server Razorpay Webhook Backbone
 * 
 * Enforces Layer-111 financial integrity by listening directly to gateway network assertions,
 * bypassing insecure client-side status tracking completely.
 */
export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !secret) {
      return failure("Missing signature or webhook config", null, 401);
    }

    // ── 1. CRYPTOGRAPHIC INTEGRITY CHECK ──
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("CRITICAL: Razorpay webhook signature verification failed (Spoof attempt logged)");
      return failure("Invalid signature", null, 403);
    }

    const eventPayload = JSON.parse(rawBody);
    const eventType = eventPayload.event;
    const webhookEventId = eventPayload.account_id ? `${eventPayload.account_id}_${eventType}_${eventPayload.created_at}` : `webhook_${Date.now()}`; // Fallback if no clean ID exists
    const paymentEntity = eventPayload.payload?.payment?.entity;
    const orderEntity = eventPayload.payload?.order?.entity;

    if (!paymentEntity) {
      return success("Webhook received without actionable entity payload", { status: "ignored" });
    }

    const orderId = paymentEntity.order_id || orderEntity?.id;
    const paymentId = paymentEntity.id;
    const amount = paymentEntity.amount ? paymentEntity.amount / 100 : 0; // Convert from paise

    // ── 1.5. WEBHOOK IDEMPOTENCY GUARD ──
    const idempotencyKey = `webhook_${paymentId}_${eventType}`;
    const { isLocked, isDuplicate, responseBody, responseStatus, error } = await acquireIdempotencyLock(
      idempotencyKey,
      "/api/payment/webhook"
    );

    if (error) return failure("Webhook lock error", error, 500);
    if (isDuplicate) return success(responseBody?.message || "Already processed", responseBody?.data, responseStatus);

    // ── 2. RESOLVE ENTITY REFERENCE via order_id ──
    let targetType = null;
    let referenceId = null;
    let patientId = null;
    let careEpisodeId = null;
    let currentDbStatus = null;

    // Search appointments
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, patient_id, care_episode_id, payment_status")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    if (appointment) {
      targetType = "consultation";
      referenceId = appointment.id;
      patientId = appointment.patient_id;
      careEpisodeId = appointment.care_episode_id;
      currentDbStatus = appointment.payment_status;
    } else {
      // Search lab orders
      const { data: labOrder } = await supabase
        .from("lab_test_orders")
        .select("id, patient_id, care_episode_id, payment_status")
        .eq("razorpay_order_id", orderId)
        .maybeSingle();

      if (labOrder) {
        targetType = "lab";
        referenceId = labOrder.id;
        patientId = labOrder.patient_id;
        careEpisodeId = labOrder.care_episode_id;
        currentDbStatus = labOrder.payment_status;
      }
    }

    if (!targetType || !referenceId) {
      console.warn(`Webhook tracking orphan order: ${orderId}. Entity records will map upon post-checkout hook resolution.`);
      await releaseIdempotencyLock(idempotencyKey, { message: "Orphaned", data: { order_id: orderId } });
      return success("Webhook unlinked but processed safely", { order_id: orderId });
    }

    // ── 3. STATE MACHINE ASSERTIONS & RECONCILIATION ──
    let isMismatch = false;

    if (eventType === "payment.captured" || eventType === "order.paid") {
      // If gateway says paid, but DB says failed/pending, it's a mismatch if it's already "paid" 
      // Wait, if it's not paid yet, we will mark it paid. If it's already failed, we might have a race condition mismatch.
      if (currentDbStatus === "failed") {
        isMismatch = true;
        await createIncident("PAYMENT_WEBHOOK", "P1", `Reconciliation Mismatch: Gateway says CAPTURED but DB says FAILED for order ${orderId}`, {
          reference_id: orderId,
          care_episode_id: careEpisodeId
        });
      }

      if (targetType === "consultation") {
        await supabase
          .from("appointments")
          .update({ payment_status: "paid", razorpay_payment_id: paymentId, status: "booked" })
          .eq("id", referenceId);
      } else if (targetType === "lab") {
        await supabase
          .from("lab_test_orders")
          .update({ payment_status: "paid", razorpay_payment_id: paymentId, status: "booked" })
          .eq("id", referenceId);
      }

      // Record success in ledger durably
      if (patientId && careEpisodeId) {
        await createLedgerEntry({
          patient_id: patientId,
          care_episode_id: careEpisodeId,
          service_type: targetType,
          reference_id: referenceId,
          debit_credit: "credit",
          amount,
          status: "success",
          payment_mode: "razorpay_webhook",
          payment_gateway_id: paymentId,
          description: `Server Webhook capture check for order ${orderId}`,
          metadata: { webhook_event: eventType }
        });

        // Broadcast outbox alert to activate background chains
        await insertOutboxEvent({
          event_type: "PAYMENT_CAPTURED_WEBHOOK",
          consultation_id: referenceId,
          care_episode_id: careEpisodeId,
          consultation_type: "WEBHOOK_EVENT",
          payload: { payment_id: paymentId, order_id: orderId, amount }
        });

        // Trigger WhatsApp Payment Update asynchronously for success
        (async () => {
            try {
                const { data: patientUser } = await supabase
                    .from("users")
                    .select("phone_number")
                    .eq("id", patientId)
                    .single();

                const { data: patientDetails } = await supabase
                    .from("patient_details")
                    .select("full_name")
                    .eq("id", patientId)
                    .single();

                const phoneNumber = patientUser?.phone_number;
                const patientName = patientDetails?.full_name || "Customer";

                // Mapped display name for service
                const displayServiceName = targetType === "consultation" 
                    ? "Doctor Consultation" 
                    : targetType === "lab" 
                        ? "Lab Diagnostics Order" 
                        : "Chemist Orders/Services";

                if (phoneNumber) {
                    await sendPaymentUpdate({
                        phone_number: phoneNumber,
                        recipient_name: patientName,
                        payment_status: "success",
                        payment_reference_id: paymentId,
                        paid_amount: amount.toString(),
                        service_name: displayServiceName,
                        patient_id: patientId
                    });
                }
            } catch (err) {
                console.error("[WHATSAPP] Failed to send webhook payment success notification:", err.message);
            }
        })();
      }

    } else if (eventType === "payment.failed") {
      if (currentDbStatus === "paid") {
        isMismatch = true;
        await createIncident("PAYMENT_WEBHOOK", "P1", `Reconciliation Mismatch: Gateway says FAILED but DB says PAID for order ${orderId}`, {
          reference_id: orderId,
          care_episode_id: careEpisodeId
        });
      }

      const errorReason = paymentEntity.error_description || "Webhook payment capture failed";
      
      if (targetType === "consultation") {
        await supabase
          .from("appointments")
          .update({ payment_status: "failed" })
          .eq("id", referenceId);
      }

      if (patientId && careEpisodeId) {
        await createLedgerEntry({
          patient_id: patientId,
          care_episode_id: careEpisodeId,
          service_type: targetType,
          reference_id: referenceId,
          debit_credit: "credit",
          amount,
          status: "failed",
          payment_mode: "razorpay_webhook",
          payment_gateway_id: paymentId,
          description: `Webhook failed event payload: ${errorReason}`
        });

        await insertOutboxEvent({
          event_type: "PAYMENT_FAILED_WEBHOOK",
          consultation_id: referenceId,
          care_episode_id: careEpisodeId,
          consultation_type: "WEBHOOK_EVENT",
          payload: { error_reason: errorReason, order_id: orderId }
        });

        // Trigger WhatsApp Payment Update asynchronously for failure
        (async () => {
            try {
                const { data: patientUser } = await supabase
                    .from("users")
                    .select("phone_number")
                    .eq("id", patientId)
                    .single();

                const { data: patientDetails } = await supabase
                    .from("patient_details")
                    .select("full_name")
                    .eq("id", patientId)
                    .single();

                const phoneNumber = patientUser?.phone_number;
                const patientName = patientDetails?.full_name || "Customer";

                // Mapped display name for service
                const displayServiceName = targetType === "consultation" 
                    ? "Doctor Consultation" 
                    : targetType === "lab" 
                        ? "Lab Diagnostics Order" 
                        : "Chemist Orders/Services";

                if (phoneNumber) {
                    await sendPaymentUpdate({
                        phone_number: phoneNumber,
                        recipient_name: patientName,
                        payment_status: "failed",
                        payment_reference_id: paymentId || `ORDER_${orderId}`,
                        paid_amount: amount.toString(),
                        service_name: displayServiceName,
                        patient_id: patientId
                    });
                }
            } catch (err) {
                console.error("[WHATSAPP] Failed to send webhook payment failure notification:", err.message);
            }
        })();
      }

    }

    // ── 4. WRITE TO RECONCILIATION LOG ──
    await supabase.from("payment_reconciliation_log").insert([{
      payment_id: orderId,
      care_episode_id: careEpisodeId,
      gateway_status: eventType,
      db_status: currentDbStatus || 'unknown',
      mismatch: isMismatch
    }]);

    const successData = { processed: true, event: eventType };
    await releaseIdempotencyLock(idempotencyKey, { message: "Webhook verification block completed perfectly", data: successData }, 200);
    
    return success("Webhook verification block completed perfectly", successData);
  } catch (err) {
    console.error("Webhook route unhandled error exception:", err);
    return failure("Internal webhook processing error", err.message, 500);
  }
}
