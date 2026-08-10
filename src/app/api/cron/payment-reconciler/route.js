import { success, failure } from "@/lib/response";
import { createIncident } from "@/lib/layer1/incidentService";
import { retryFailedRefunds } from "@/lib/layer1/refundEngine";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RZP_KEY_ID   = process.env.RAZORPAY_KEY_ID;
const RZP_KEY_SEC  = process.env.RAZORPAY_KEY_SECRET;

/**
 * GET/POST /api/cron/payment-reconciler
 *
 * Layer-111 Financial Reconciliation Backbone — Phase 5
 *
 * Tasks:
 * 1. Detect "pending" payments stuck > 1 hour → query Razorpay API for truth
 * 2. Reconcile DB status based on gateway response
 * 3. Detect mismatch states → raise P1 incidents
 * 4. Retry failed refunds from dead-letter queue
 * 5. Log all reconciliation events to payment_reconciliation_log
 *
 * Security: Requires CRON_SECRET header
 */
export async function GET(req) {
  return await executeReconciliation(req);
}

export async function POST(req) {
  return await executeReconciliation(req);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: direct fetch wrappers
// ─────────────────────────────────────────────────────────────────────────────
async function dbSelect(table, filters, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}${options.limit ? '&limit=' + options.limit : ''}`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : [];
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

async function dbInsert(table, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(Array.isArray(payload) ? payload : [payload])
  });
  return res.ok;
}

// Query Razorpay for the real payment/order status
async function fetchRazorpayOrderStatus(orderId) {
  try {
    const credentials = Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SEC}`).toString('base64');
    const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
      headers: { 'Authorization': `Basic ${credentials}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const payments = data?.items || [];
    if (payments.length === 0) return 'unpaid';
    // Get the most recent payment
    const latest = payments.sort((a, b) => b.created_at - a.created_at)[0];
    return latest.status; // captured | failed | created | authorized
  } catch {
    return null; // Network failure — do not reconcile blindly
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main reconciliation function
// ─────────────────────────────────────────────────────────────────────────────
async function executeReconciliation(req) {
  // Security check
  const cronSecret    = req.headers.get("x-cron-secret") || req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && cronSecret !== expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return failure("Unauthorized", "Invalid cron secret", 401);
  }

  const startedAt = Date.now();
  const stats = {
    appointments_checked:  0,
    reconciled_to_paid:    0,
    reconciled_to_failed:  0,
    mismatches:            0,
    refund_retries:        0,
    errors:               []
  };

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60000).toISOString();

    // ── 1. Find stuck pending appointments ─────────────────────────────────
    const stuckAppointments = await dbSelect(
      'appointments',
      `payment_status=eq.pending&created_at=lt.${oneHourAgo}&select=id,patient_id,care_episode_id,razorpay_order_id,payment_status`,
      { limit: 30 }
    );

    stats.appointments_checked = stuckAppointments.length;

    for (const appt of stuckAppointments) {
      try {
        let gatewayStatus = 'unknown';
        let isMismatch    = false;
        let reconcileNote = '';

        // Query Razorpay if we have an order ID
        if (appt.razorpay_order_id && RZP_KEY_ID && RZP_KEY_SEC) {
          gatewayStatus = await fetchRazorpayOrderStatus(appt.razorpay_order_id) || 'unknown';
        }

        if (gatewayStatus === 'captured' || gatewayStatus === 'authorized') {
          // Gateway says paid — update DB
          await dbPatch('appointments', `id=eq.${appt.id}`, { payment_status: 'paid', status: 'booked' });
          stats.reconciled_to_paid++;
          reconcileNote = 'Reconciled to PAID from gateway';

        } else if (gatewayStatus === 'failed') {
          // Gateway says failed — update DB
          await dbPatch('appointments', `id=eq.${appt.id}`, { payment_status: 'failed' });
          stats.reconciled_to_failed++;
          reconcileNote = 'Reconciled to FAILED from gateway';

        } else if (gatewayStatus === 'unknown') {
          // Cannot determine — raise incident
          isMismatch = true;
          await createIncident(
            'PAYMENT_RECONCILER',
            'P2',
            `Cannot determine payment status for appointment ${appt.id} (order: ${appt.razorpay_order_id}). Manual review required.`,
            { reference_id: appt.id, care_episode_id: appt.care_episode_id }
          );
          stats.mismatches++;
          reconcileNote = 'Cannot determine — P2 incident raised';
        }

        // Log reconciliation attempt
        await dbInsert('payment_reconciliation_log', {
          payment_id:      appt.razorpay_order_id || appt.id,
          care_episode_id: appt.care_episode_id,
          gateway_status:  gatewayStatus,
          db_status:       appt.payment_status,
          mismatch:        isMismatch,
          notes:           reconcileNote
        });

      } catch (err) {
        stats.errors.push({ appointment_id: appt.id, error: err.message });
      }
    }

    // ── 2. Retry failed refunds from dead-letter queue ─────────────────────
    try {
      const retryResults = await retryFailedRefunds();
      stats.refund_retries = retryResults.retried;
      stats.refund_retry_succeeded = retryResults.succeeded;
      stats.refund_retry_failed    = retryResults.failed;
    } catch (err) {
      stats.errors.push({ task: 'refund_retry', error: err.message });
    }

    const duration = Date.now() - startedAt;
    console.log(`[PaymentReconciler] Completed in ${duration}ms:`, JSON.stringify(stats));

    return success("Payment reconciliation completed", { duration_ms: duration, ...stats });

  } catch (err) {
    console.error("[PaymentReconciler] Fatal error:", err.message);
    return failure("Payment reconciliation failed", err.message, 500);
  }
}
