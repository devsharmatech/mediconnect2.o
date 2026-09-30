import { success, failure } from "@/lib/response";
import { createIncident } from "@/lib/layer1/incidentService";
import { retryFailedRefunds } from "@/lib/layer1/refundEngine";
import sql from "@/lib/db";

const RZP_KEY_ID   = process.env.RAZORPAY_KEY_ID;
const RZP_KEY_SEC  = process.env.RAZORPAY_KEY_SECRET;

/**
 * GET/POST /api/cron/payment-reconciler
 *
 * Layer-111 Financial Reconciliation Backbone — AWS RDS PostgreSQL Direct
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

// Main reconciliation function
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
    const oneHourAgo = new Date(Date.now() - 60 * 60000);

    // ── 1. Find stuck pending appointments directly in AWS RDS ──────────
    let stuckAppointments = [];
    try {
      stuckAppointments = await sql`
        SELECT id, patient_id, care_episode_id, razorpay_order_id, payment_status
        FROM appointments
        WHERE payment_status = 'pending' AND created_at < ${oneHourAgo}
        LIMIT 30
      `;
    } catch (e) {
      console.warn("Could not query stuck appointments from RDS:", e.message);
    }

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
          // Gateway says paid — update AWS RDS
          await sql`
            UPDATE appointments
            SET payment_status = 'paid', status = 'booked'
            WHERE id = ${appt.id}
          `;
          stats.reconciled_to_paid++;
          reconcileNote = 'Reconciled to PAID from gateway';

        } else if (gatewayStatus === 'failed') {
          // Gateway says failed — update AWS RDS
          await sql`
            UPDATE appointments
            SET payment_status = 'failed'
            WHERE id = ${appt.id}
          `;
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

        // Log reconciliation attempt in AWS RDS
        try {
          await sql`
            INSERT INTO payment_reconciliation_log (
              payment_id, care_episode_id, gateway_status, db_status, mismatch, notes
            ) VALUES (
              ${appt.razorpay_order_id || appt.id},
              ${appt.care_episode_id || null},
              ${gatewayStatus},
              ${appt.payment_status},
              ${isMismatch},
              ${reconcileNote}
            )
          `;
        } catch {}

      } catch (err) {
        stats.errors.push({ appointment_id: appt.id, error: err.message });
      }
    }

    // ── 2. Retry failed refunds from dead-letter queue ─────────────────────
    try {
      const retryResults = await retryFailedRefunds();
      stats.refund_retries = retryResults.retried || 0;
      stats.refund_retry_succeeded = retryResults.succeeded || 0;
      stats.refund_retry_failed    = retryResults.failed || 0;
    } catch (err) {
      stats.errors.push({ task: 'refund_retry', error: err.message });
    }

    const duration = Date.now() - startedAt;
    console.log(`[PaymentReconciler] Completed in ${duration}ms (AWS RDS):`, JSON.stringify(stats));

    return success("Payment reconciliation completed (AWS RDS)", { 
      duration_ms: duration, 
      database: "AWS RDS PostgreSQL",
      ...stats 
    });

  } catch (err) {
    console.error("[PaymentReconciler] Fatal error:", err.message);
    return failure("Payment reconciliation failed", err.message, 500);
  }
}
