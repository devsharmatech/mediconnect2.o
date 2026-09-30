/**
 * LAYER-111: Retry Worker — AWS RDS PostgreSQL Direct
 *
 * Processes the retry_queue for failed operations in AWS RDS:
 * - Failed API calls (with loopback auth)
 * - Failed service triggers (pharmacy, lab, nursing)
 * - Failed event emissions
 * - Failed sync operations
 * - Failed notifications
 *
 * On max-retry exhaustion: moves item to dead_letter_queue in AWS RDS
 * Logs every run to worker_execution_log for SLA monitoring.
 */

import sql from "@/lib/db";
import { insertOutboxEvent } from './eventOutbox.js';
import { sendSMS, sendWhatsAppMessage } from '../sms.js';

const BACKOFF_INTERVALS = [5, 30, 120, 600]; // seconds

// ─────────────────────────────────────────────────────────────────────────────
// Process Retry Queue
// ─────────────────────────────────────────────────────────────────────────────
export async function processRetryQueue() {
  const startedAt = Date.now();
  const results   = { processed: 0, succeeded: 0, failed: 0, permanently_failed: 0, dead_lettered: 0, errors: [] };

  try {
    const now = new Date();

    // Fetch items ready for retry directly from AWS RDS
    let items = [];
    try {
      items = await sql`
        SELECT * FROM retry_queue
        WHERE status = 'pending' AND next_retry_at <= ${now}
        ORDER BY next_retry_at ASC
        LIMIT 50
      `;
    } catch (e) {
      console.warn("[RetryWorker] Could not query retry_queue from RDS:", e.message);
      return results;
    }

    if (!items.length) {
      await logWorkerRun('RETRY_WORKER', Date.now() - startedAt, results, 'SUCCESS');
      return results;
    }

    for (const item of items) {
      results.processed++;

      // Optimistic concurrency — claim the row in AWS RDS
      let claimedRows = [];
      try {
        claimedRows = await sql`
          UPDATE retry_queue
          SET status = 'processing'
          WHERE id = ${item.id} AND status = 'pending'
          RETURNING id
        `;
      } catch {}

      if (!claimedRows || claimedRows.length === 0) {
        console.warn(`[RetryWorker] Concurrency loss on item ${item.id} — skipping`);
        continue;
      }

      try {
        const ok = await executeRetryAction(item);

        if (ok) {
          await sql`
            UPDATE retry_queue
            SET status = 'completed',
                completed_at = NOW(),
                last_error = NULL
            WHERE id = ${item.id}
          `;
          results.succeeded++;
        } else {
          throw new Error('Retry action returned false');
        }
      } catch (err) {
        const maxRetries   = item.max_retries || 4;
        const newCount     = (item.retry_count || 0) + 1;

        if (newCount >= maxRetries) {
          // Permanently failed — move to dead_letter_queue in AWS RDS
          await sql`
            UPDATE retry_queue
            SET status = 'failed',
                retry_count = ${newCount},
                last_error = ${err.message},
                completed_at = NOW()
            WHERE id = ${item.id}
          `;

          try {
            await sql`
              INSERT INTO dead_letter_queue (
                original_event_id, event_type, payload, failure_reason,
                total_attempts, is_payment_event, requires_manual_review, replayed
              ) VALUES (
                ${item.id}, ${item.action_type},
                ${typeof item.payload === 'object' ? JSON.stringify(item.payload) : item.payload},
                ${err.message}, ${newCount},
                ${item.action_type?.includes('PAYMENT') || false}, true, false
              )
            `;
          } catch {}

          // P2 incident for ops team
          try {
            await sql`
              INSERT INTO ops_incident_log (
                priority, source, description, metadata
              ) VALUES (
                'P2', 'RETRY_WORKER',
                ${`Retry permanently failed after ${newCount} attempts: ${item.action_type} — ${err.message}`},
                ${JSON.stringify({ retry_id: item.id, action_type: item.action_type })}
              )
            `;
          } catch {}

          results.permanently_failed++;
          results.dead_lettered++;
        } else {
          // Schedule next retry with exponential backoff
          const backoffSecs = BACKOFF_INTERVALS[Math.min(newCount - 1, BACKOFF_INTERVALS.length - 1)];
          const nextRetry   = new Date(Date.now() + backoffSecs * 1000);

          await sql`
            UPDATE retry_queue
            SET status = 'pending',
                retry_count = ${newCount},
                next_retry_at = ${nextRetry},
                last_error = ${err.message}
            WHERE id = ${item.id}
          `;

          results.failed++;
        }

        results.errors.push({ retry_id: item.id, action_type: item.action_type, error: err.message });
      }
    }
  } catch (err) {
    results.errors.push({ global: err.message });
  }

  const duration = Date.now() - startedAt;
  const status   = results.errors.length > 0 && results.succeeded < results.processed ? 'PARTIAL' : 'SUCCESS';
  await logWorkerRun('RETRY_WORKER', duration, results, status);

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Execute Retry Action
// ─────────────────────────────────────────────────────────────────────────────
async function executeRetryAction(item) {
  const { action_type, payload } = item;
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

  switch (action_type) {
    case 'api_call':
      return retryApiCall(data);

    case 'service_trigger':
      return retryServiceTrigger(data);

    case 'event_emission':
      await insertOutboxEvent(data.event_type, data.payload, {
        aggregateType: data.aggregate_type,
        aggregateId:   data.aggregate_id,
        careEpisodeId: data.care_episode_id
      });
      return true;

    case 'sms_notification':
      return sendSMS(data.to, data.body).then(() => true).catch(() => false);

    case 'whatsapp_notification':
      return sendWhatsAppMessage(data.to, data.templateName, data.parameters).then(() => true).catch(() => false);

    case 'sync_operation':
      return retrySyncOperation(data);

    default:
      console.warn(`[RetryWorker] Unknown action_type: ${action_type}`);
      return false;
  }
}

async function retryApiCall({ url, method = 'POST', headers = {}, body = null }) {
  const targetUrl = url.startsWith('/') ? `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${url}` : url;
  const res = await fetch(targetUrl, {
    method,
    headers: {
      'content-type':    'application/json',
      ...headers,
      'x-retry-loopback': 'true',
      'authorization':   `Bearer ${process.env.CRON_SECRET || ''}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.ok;
}

async function retryServiceTrigger({ service_type, consultation_id, payload: sp }) {
  try {
    await sql`
      INSERT INTO prescription_service_map (
        consultation_id, service_type, payload
      ) VALUES (
        ${consultation_id}, ${service_type}, ${JSON.stringify(sp)}
      )
    `;
    return true;
  } catch {
    return false;
  }
}

async function retrySyncOperation({ table, record }) {
  if (!table || !record) return false;

  const consId = record.consultation_id || record.id;
  if (consId) {
    try {
      await sql`
        UPDATE consultations
        SET sync_status = 'SYNCED'
        WHERE id = ${consId}
      `;
    } catch {}
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Add to Retry Queue
// ─────────────────────────────────────────────────────────────────────────────
export async function addToRetryQueue(action_type, payload, max_retries = 4) {
  try {
    const nextRetry = new Date(Date.now() + BACKOFF_INTERVALS[0] * 1000);
    await sql`
      INSERT INTO retry_queue (
        action_type, payload, status, max_retries, retry_count, next_retry_at
      ) VALUES (
        ${action_type}, ${typeof payload === 'object' ? JSON.stringify(payload) : payload},
        'pending', ${max_retries}, 0, ${nextRetry}
      )
    `;
  } catch (err) {
    console.error('[RetryWorker] addToRetryQueue error:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Worker Run
// ─────────────────────────────────────────────────────────────────────────────
async function logWorkerRun(worker_name, duration_ms, results, status) {
  try {
    await sql`
      INSERT INTO worker_execution_log (
        worker_name, duration_ms, items_processed, items_succeeded,
        items_failed, dead_lettered, status, error_summary
      ) VALUES (
        ${worker_name}, ${duration_ms},
        ${results.processed || 0}, ${results.succeeded || 0},
        ${results.failed || 0}, ${results.dead_lettered || 0},
        ${status},
        ${results.errors?.length ? results.errors.map(e => e.error || e.global).join('; ').substring(0, 500) : null}
      )
    `;
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Replay Dead Letter Item
// ─────────────────────────────────────────────────────────────────────────────
export async function replayDeadLetterItem(dlqId, replayed_by) {
  const rows = await sql`
    SELECT * FROM dead_letter_queue WHERE id = ${dlqId} LIMIT 1
  `;
  const item = rows[0];
  if (!item) throw new Error(`DLQ item ${dlqId} not found in RDS`);
  if (item.replayed) throw new Error(`DLQ item ${dlqId} already replayed`);

  // Re-enqueue in retry_queue
  await addToRetryQueue(item.event_type, item.payload, 3);

  // Mark as replayed in AWS RDS
  await sql`
    UPDATE dead_letter_queue
    SET replayed = true,
        replayed_at = NOW(),
        replayed_by = ${replayed_by}
    WHERE id = ${dlqId}
  `;

  return { success: true, re_queued_action: item.event_type };
}
