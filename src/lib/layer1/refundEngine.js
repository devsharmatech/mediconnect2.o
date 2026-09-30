/**
 * LAYER-111: Refund Orchestration Engine — AWS RDS PostgreSQL Direct
 *
 * Handles the complete refund lifecycle:
 * 1. Request initiation (via outbox PAYMENT_REFUND_REQUESTED events)
 * 2. Razorpay gateway call
 * 3. Status tracking and dead-letter handling in AWS RDS
 * 4. Ledger credit entry creation
 * 5. Patient notification dispatch
 *
 * Direct AWS RDS PostgreSQL queries (no Supabase REST).
 */

import sql from "@/lib/db";
import { recordRefundEntry } from './financialLedger.js';
import { sendPaymentUpdate } from '../sms.js';

const RZP_KEY_ID   = process.env.RAZORPAY_KEY_ID;
const RZP_KEY_SEC  = process.env.RAZORPAY_KEY_SECRET;
const PLATFORM_FEE_RATE = 0.10; // 10% platform fee

// ─────────────────────────────────────────────────────────────────────────────
// 1. Initiate Refund Request
// ─────────────────────────────────────────────────────────────────────────────
export async function initiateRefund({
  patient_id,
  care_episode_id,
  consultation_id,
  original_payment_id,
  razorpay_order_id,
  amount,
  reason,
  initiated_by = 'system'
}) {
  if (!original_payment_id || !amount) {
    throw new Error('original_payment_id and amount are required for refund');
  }

  // Create refund request record in AWS RDS
  const rows = await sql`
    INSERT INTO refund_requests (
      patient_id, care_episode_id, consultation_id, original_payment_id,
      razorpay_order_id, amount, reason, status, initiated_by
    ) VALUES (
      ${patient_id}, ${care_episode_id || null}, ${consultation_id || null},
      ${original_payment_id}, ${razorpay_order_id || null}, ${amount},
      ${reason}, 'PENDING', ${initiated_by}
    )
    RETURNING *
  `;

  const refundRequest = rows[0];
  console.log(`[RefundEngine] Created refund request ${refundRequest?.id} for payment ${original_payment_id} (₹${amount}) in AWS RDS`);

  // Process immediately
  return processRefund(refundRequest.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Process Refund (hit Razorpay API & update AWS RDS)
// ─────────────────────────────────────────────────────────────────────────────
export async function processRefund(refundRequestId) {
  const requests = await sql`
    SELECT * FROM refund_requests WHERE id = ${refundRequestId} LIMIT 1
  `;
  const req = requests[0];

  if (!req) throw new Error(`Refund request ${refundRequestId} not found in RDS`);
  if (req.status === 'COMPLETED') return { success: true, already_processed: true };

  try {
    // Mark as processing in AWS RDS
    await sql`
      UPDATE refund_requests SET status = 'PROCESSING' WHERE id = ${refundRequestId}
    `;

    // Call Razorpay Refund API
    const credentials = Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SEC}`).toString('base64');
    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${req.original_payment_id}/refund`, {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(req.amount * 100), // Convert to paise
        speed:  'normal',
        notes:  { reason: req.reason, care_episode_id: req.care_episode_id || 'N/A' }
      })
    });

    const rzpData = await rzpRes.json();

    if (!rzpRes.ok || rzpData.error) {
      const errorMsg = rzpData.error?.description || `Razorpay API error: ${rzpRes.status}`;
      throw new Error(errorMsg);
    }

    // Success — mark completed in AWS RDS
    await sql`
      UPDATE refund_requests
      SET status = 'COMPLETED',
          razorpay_refund_id = ${rzpData.id},
          gateway_response = ${JSON.stringify(rzpData)},
          processed_at = NOW()
      WHERE id = ${refundRequestId}
    `;

    // Record refund in financial ledger
    await recordRefundEntry({
      patient_id:        req.patient_id,
      care_episode_id:   req.care_episode_id,
      service_type:      'refund',
      reference_id:      req.consultation_id,
      amount:            req.amount,
      razorpay_refund_id: rzpData.id,
      reason:            req.reason
    });

    // Notify patient in AWS RDS
    try {
      await sql`
        INSERT INTO notifications (
          user_id, title, message, type, metadata
        ) VALUES (
          ${req.patient_id}, 'Refund Initiated',
          ${`Your refund of ₹${req.amount} has been initiated. It will reflect in 5-7 business days.`},
          'refund_success',
          ${JSON.stringify({ refund_id: rzpData.id, amount: req.amount, reason: req.reason })}
        )
      `;
    } catch {}

    // Notify patient via WhatsApp template
    (async () => {
      try {
        const patientUsers = await sql`
          SELECT u.phone_number, pd.full_name
          FROM users u
          LEFT JOIN patient_details pd ON pd.id::text = u.id::text
          WHERE u.id = ${req.patient_id}
          LIMIT 1
        `;
        const patientUser = patientUsers[0];
        const phoneNumber = patientUser?.phone_number;
        const patientName = patientUser?.full_name || "Customer";

        if (phoneNumber) {
          await sendPaymentUpdate({
            phone_number: phoneNumber,
            recipient_name: patientName,
            payment_status: "refund_initiated",
            payment_reference_id: rzpData.id,
            paid_amount: req.amount.toString(),
            service_name: "Refund for Appointment",
            patient_id: req.patient_id
          });
        }
      } catch (whatsappErr) {
        console.error("[WHATSAPP] Failed to send refund payment update notification:", whatsappErr.message);
      }
    })();

    console.log(`[RefundEngine] Refund ${rzpData.id} processed successfully for ₹${req.amount} (AWS RDS)`);
    return { success: true, refund_id: rzpData.id, amount: req.amount };

  } catch (err) {
    console.error(`[RefundEngine] Refund ${refundRequestId} failed:`, err.message);

    // Mark failed in AWS RDS
    try {
      await sql`
        UPDATE refund_requests
        SET status = 'FAILED',
            gateway_response = ${JSON.stringify({ error: err.message })}
        WHERE id = ${refundRequestId}
      `;
    } catch {}

    // Add to refund_dead_letter in AWS RDS
    try {
      await sql`
        INSERT INTO refund_dead_letter (
          refund_request_id, failure_reason, attempt_count
        ) VALUES (
          ${refundRequestId}, ${err.message}, 1
        )
      `;
    } catch {}

    // P1 Incident in AWS RDS
    try {
      await sql`
        INSERT INTO ops_incident_log (
          priority, source, reference_id, care_episode_id, description
        ) VALUES (
          'P1', 'REFUND_ENGINE', ${refundRequestId}, ${req?.care_episode_id || null},
          ${`REFUND FAILED: ${err.message} | Payment: ${req?.original_payment_id} | ₹${req?.amount}`}
        )
      `;
    } catch {}

    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Retry Failed Refunds
// ─────────────────────────────────────────────────────────────────────────────
export async function retryFailedRefunds() {
  let deadLetters = [];
  try {
    deadLetters = await sql`
      SELECT * FROM refund_dead_letter
      WHERE attempt_count < 3
      LIMIT 10
    `;
  } catch {
    return { retried: 0, succeeded: 0, failed: 0 };
  }

  const results = { retried: 0, succeeded: 0, failed: 0 };

  for (const dl of deadLetters) {
    try {
      await sql`
        UPDATE refund_dead_letter
        SET attempt_count = attempt_count + 1,
            last_attempted_at = NOW()
        WHERE id = ${dl.id}
      `;

      const result = await processRefund(dl.refund_request_id);
      results.retried++;
      if (result.success) results.succeeded++;
      else                results.failed++;
    } catch (err) {
      results.failed++;
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Provider Payout Calculation
// ─────────────────────────────────────────────────────────────────────────────
export async function scheduleProviderPayout({ provider_id, care_episode_id, consultation_id, gross_amount }) {
  try {
    const platform_fee = Math.round(gross_amount * PLATFORM_FEE_RATE * 100) / 100;
    const net_payout   = Math.round((gross_amount - platform_fee) * 100) / 100;

    const rows = await sql`
      INSERT INTO provider_payout_ledger (
        provider_id, care_episode_id, consultation_id, gross_amount, platform_fee, net_payout, status
      ) VALUES (
        ${provider_id}, ${care_episode_id || null}, ${consultation_id || null},
        ${gross_amount}, ${platform_fee}, ${net_payout}, 'PENDING'
      )
      RETURNING *
    `;

    const payout = rows[0];
    console.log(`[RefundEngine] Payout scheduled in AWS RDS for provider ${provider_id}: net ₹${net_payout}`);
    return { success: true, payout_id: payout?.id, net_payout };
  } catch (err) {
    console.error('[RefundEngine] scheduleProviderPayout error:', err.message);
    return { success: false, error: err.message };
  }
}
