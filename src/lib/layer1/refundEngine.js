/**
 * LAYER-111: Refund Orchestration Engine — Phase 5
 *
 * Handles the complete refund lifecycle:
 * 1. Request initiation (via outbox PAYMENT_REFUND_REQUESTED events)
 * 2. Razorpay gateway call
 * 3. Status tracking and dead-letter handling
 * 4. Ledger credit entry creation
 * 5. Patient notification dispatch
 *
 * Called by: outbox-processor (PAYMENT_REFUND_REQUESTED events)
 *            and /api/cron/payment-reconciler (stuck refunds)
 */

import { recordRefundEntry } from './financialLedger.js';
import { insertOutboxEvent } from './eventOutbox.js';
import { sendPaymentUpdate } from '../sms.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RZP_KEY_ID   = process.env.RAZORPAY_KEY_ID;
const RZP_KEY_SEC  = process.env.RAZORPAY_KEY_SECRET;

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────
async function dbInsert(table, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    body: JSON.stringify(Array.isArray(payload) ? payload : [payload])
  });
  if (!res.ok) throw new Error(`dbInsert ${table} [${res.status}]: ${(await res.text()).substring(0, 150)}`);
  const d = await res.json();
  return Array.isArray(d) ? d[0] : d;
}

async function dbPatch(table, filters, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
    method:  'PATCH',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(payload)
  });
  return res.ok;
}

async function dbSelect(table, filters, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}${options.limit ? '&limit=' + options.limit : ''}`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Initiate Refund Request
//    Creates a tracked refund_request record before hitting Razorpay
// ─────────────────────────────────────────────────────────────────────────────
export async function initiateRefund({
  patient_id,
  care_episode_id,
  consultation_id,
  original_payment_id,  // Razorpay payment_id (pay_xxx)
  razorpay_order_id,
  amount,
  reason,
  initiated_by = 'system'
}) {
  if (!original_payment_id || !amount) {
    throw new Error('original_payment_id and amount are required for refund');
  }

  // 1a. Create refund request record
  const refundRequest = await dbInsert('refund_requests', {
    patient_id,
    care_episode_id,
    consultation_id,
    original_payment_id,
    razorpay_order_id,
    amount,
    reason,
    status:       'PENDING',
    initiated_by
  });

  console.log(`[RefundEngine] Created refund request ${refundRequest.id} for payment ${original_payment_id} (₹${amount})`);

  // 1b. Process immediately
  return processRefund(refundRequest.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Process Refund (hit Razorpay API)
// ─────────────────────────────────────────────────────────────────────────────
export async function processRefund(refundRequestId) {
  const requests = await dbSelect('refund_requests', `id=eq.${refundRequestId}`, { limit: 1 });
  const req      = requests[0];

  if (!req) throw new Error(`Refund request ${refundRequestId} not found`);
  if (req.status === 'COMPLETED') return { success: true, already_processed: true };

  try {
    // Mark as processing
    await dbPatch('refund_requests', `id=eq.${refundRequestId}`, { status: 'PROCESSING' });

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

    // Success — mark completed and log to ledger
    await dbPatch('refund_requests', `id=eq.${refundRequestId}`, {
      status:            'COMPLETED',
      razorpay_refund_id: rzpData.id,
      gateway_response:  rzpData,
      processed_at:      new Date().toISOString()
    });

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

    // Notify patient via database notifications
    await dbInsert('notifications', {
      user_id: req.patient_id,
      title:   'Refund Initiated',
      message: `Your refund of ₹${req.amount} has been initiated. It will reflect in 5-7 business days.`,
      type:    'refund_success',
      metadata: { refund_id: rzpData.id, amount: req.amount, reason: req.reason }
    }).catch(() => {});

    // Notify patient via WhatsApp template
    (async () => {
      try {
        const patientUsers = await dbSelect('users', `id=eq.${req.patient_id}`, { limit: 1 });
        const patientUser = patientUsers[0];

        const patientDetailsList = await dbSelect('patient_details', `id=eq.${req.patient_id}`, { limit: 1 });
        const patientDetails = patientDetailsList[0];

        const phoneNumber = patientUser?.phone_number;
        const patientName = patientDetails?.full_name || "Customer";

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

    console.log(`[RefundEngine] Refund ${rzpData.id} processed successfully for ₹${req.amount}`);
    return { success: true, refund_id: rzpData.id, amount: req.amount };

  } catch (err) {
    console.error(`[RefundEngine] Refund ${refundRequestId} failed:`, err.message);

    // Mark failed + add to dead-letter
    await dbPatch('refund_requests', `id=eq.${refundRequestId}`, {
      status: 'FAILED',
      gateway_response: { error: err.message }
    });

    await dbInsert('refund_dead_letter', {
      refund_request_id: refundRequestId,
      failure_reason:    err.message,
      attempt_count:     1
    }).catch(() => {});

    // P1 Incident for finance team
    await dbInsert('ops_incident_log', {
      priority:    'P1',
      source:      'REFUND_ENGINE',
      reference_id: refundRequestId,
      care_episode_id: req?.care_episode_id || null,
      description: `REFUND FAILED: ${err.message} | Payment: ${req?.original_payment_id} | ₹${req?.amount}`
    }).catch(() => {});

    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Retry Failed Refunds (called by reconciler cron)
// ─────────────────────────────────────────────────────────────────────────────
export async function retryFailedRefunds() {
  const deadLetters = await dbSelect('refund_dead_letter', `attempt_count=lt.3`, { limit: 10 });
  const results     = { retried: 0, succeeded: 0, failed: 0 };

  for (const dl of deadLetters) {
    try {
      await dbPatch('refund_dead_letter', `id=eq.${dl.id}`, {
        attempt_count:     dl.attempt_count + 1,
        last_attempted_at: new Date().toISOString()
      });

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
//    Called after consultation completion to schedule doctor payout
// ─────────────────────────────────────────────────────────────────────────────
const PLATFORM_FEE_RATE = 0.10; // 10% platform fee

export async function scheduleProviderPayout({ provider_id, care_episode_id, consultation_id, gross_amount }) {
  try {
    const platform_fee = Math.round(gross_amount * PLATFORM_FEE_RATE * 100) / 100;
    const net_payout   = Math.round((gross_amount - platform_fee) * 100) / 100;

    const payout = await dbInsert('provider_payout_ledger', {
      provider_id,
      care_episode_id,
      consultation_id,
      gross_amount,
      platform_fee,
      net_payout,
      status: 'PENDING'
    });

    console.log(`[RefundEngine] Payout scheduled for provider ${provider_id}: net ₹${net_payout}`);
    return { success: true, payout_id: payout.id, net_payout };
  } catch (err) {
    console.error('[RefundEngine] scheduleProviderPayout error:', err.message);
    return { success: false, error: err.message };
  }
}
