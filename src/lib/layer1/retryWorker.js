/**
 * LAYER-111: Retry Worker — Phase 6 Hardened
 *
 * Processes the retry_queue for failed operations:
 * - Failed API calls (with loopback auth)
 * - Failed service triggers (pharmacy, lab, nursing)
 * - Failed event emissions
 * - Failed sync operations
 * - Failed notifications
 *
 * On max-retry exhaustion: moves item to dead_letter_queue
 * Logs every run to worker_execution_log for SLA monitoring.
 *
 * Exponential backoff: 5s → 30s → 2min → 10min
 * Max retries: 4 (configurable per item)
 *
 * Uses direct HTTP fetch throughout (schema cache bypass).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BACKOFF_INTERVALS = [5, 30, 120, 600]; // seconds

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────
async function dbSelect(table, filters, options = {}) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${filters}${options.limit ? '&limit=' + options.limit : ''}${options.order ? '&order=' + options.order : ''}`,
    { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : [];
}

async function dbPatch(table, filters, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
    method:  'PATCH',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body:    JSON.stringify(payload)
  });
  if (!res.ok) return null;
  const d = await res.json();
  return Array.isArray(d) ? d[0] : d;
}

async function dbInsert(table, payload) {
  const body = Array.isArray(payload) ? payload : [payload];
  const res  = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body:    JSON.stringify(body)
  });
  return res.ok;
}

// ─────────────────────────────────────────────────────────────────────────────
// Process Retry Queue
// ─────────────────────────────────────────────────────────────────────────────
export async function processRetryQueue() {
  const startedAt = Date.now();
  const results   = { processed: 0, succeeded: 0, failed: 0, permanently_failed: 0, dead_lettered: 0, errors: [] };

  try {
    const now = new Date().toISOString();

    // Fetch items ready for retry (next_retry_at <= now)
    const items = await dbSelect(
      'retry_queue',
      `status=eq.pending&next_retry_at=lte.${now}`,
      { limit: 50, order: 'next_retry_at.asc' }
    );

    if (!items.length) {
      await logWorkerRun('RETRY_WORKER', Date.now() - startedAt, results, 'SUCCESS');
      return results;
    }

    for (const item of items) {
      results.processed++;

      // Optimistic concurrency — claim the row
      const claimed = await dbPatch(
        'retry_queue',
        `id=eq.${item.id}&status=eq.pending`,
        { status: 'processing' }
      );

      if (!claimed) {
        console.warn(`[RetryWorker] Concurrency loss on item ${item.id} — skipping`);
        continue;
      }

      try {
        const ok = await executeRetryAction(item);

        if (ok) {
          await dbPatch('retry_queue', `id=eq.${item.id}`, { status: 'completed', completed_at: new Date().toISOString(), last_error: null });
          results.succeeded++;
        } else {
          throw new Error('Retry action returned false');
        }
      } catch (err) {
        const maxRetries   = item.max_retries || 4;
        const newCount     = (item.retry_count || 0) + 1;

        if (newCount >= maxRetries) {
          // Permanently failed — move to dead_letter_queue
          await dbPatch('retry_queue', `id=eq.${item.id}`, {
            status:       'failed',
            retry_count:  newCount,
            last_error:   err.message,
            completed_at: new Date().toISOString()
          });

          await dbInsert('dead_letter_queue', {
            original_event_id:     item.id,
            event_type:            item.action_type,
            payload:               item.payload,
            failure_reason:        err.message,
            total_attempts:        newCount,
            is_payment_event:      item.action_type?.includes('PAYMENT') || false,
            requires_manual_review: true,
            replayed:              false
          });

          // P2 incident for ops team
          await dbInsert('ops_incident_log', {
            priority:    'P2',
            source:      'RETRY_WORKER',
            description: `Retry permanently failed after ${newCount} attempts: ${item.action_type} — ${err.message}`,
            metadata:    { retry_id: item.id, action_type: item.action_type }
          }).catch(() => {});

          results.permanently_failed++;
          results.dead_lettered++;
        } else {
          // Schedule next retry with exponential backoff
          const backoffSecs = BACKOFF_INTERVALS[Math.min(newCount - 1, BACKOFF_INTERVALS.length - 1)];
          const nextRetry   = new Date(Date.now() + backoffSecs * 1000).toISOString();

          await dbPatch('retry_queue', `id=eq.${item.id}`, {
            status:        'pending',
            retry_count:   newCount,
            next_retry_at: nextRetry,
            last_error:    err.message
          });

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

    case 'event_emission': {
      // Re-insert into outbox for guaranteed delivery
      const ok = await dbInsert('l1_event_outbox', {
        event_type:       data.event_name || data.event_type,
        care_episode_id:  data.care_episode_id,
        consultation_id:  data.consultation_id,
        consultation_type: 'RETRY',
        payload:          data.event_payload || data
      });
      return ok;
    }

    case 'sync':
      return retrySyncOperation(data);

    case 'notification':
      return dbInsert('notification_queue', {
        user_id:  data.user_id || data.patient_id,
        title:    data.title || 'Notification',
        message:  data.message || '',
        channel:  data.channel || 'IN_APP',
        priority: data.priority || 'NORMAL',
        status:   'PENDING'
      });

    default:
      console.warn(`[RetryWorker] Unknown action_type: ${action_type}`);
      return false;
  }
}

async function retryApiCall({ url, method = 'POST', body, headers = {} }) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type':    'application/json',
      ...headers,
      'x-cron-secret':   process.env.CRON_SECRET || '',
      'authorization':   `Bearer ${process.env.CRON_SECRET || ''}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.ok;
}

async function retryServiceTrigger({ service_type, consultation_id, payload: sp }) {
  return dbInsert('prescription_service_map', {
    consultation_id,
    service_type,
    payload: sp
  });
}

async function retrySyncOperation({ table, record }) {
  if (!table || !record) return false;

  // Upsert the record
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify([record])
  });

  if (!res.ok) throw new Error(`Sync upsert failed: ${res.status}`);

  // Mark consultation as synced if reference exists
  const consId = record.consultation_id || record.id;
  if (consId) {
    await dbPatch('consultations', `id=eq.${consId}`, { sync_status: 'SYNCED' }).catch(() => {});
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Add to Retry Queue
// ─────────────────────────────────────────────────────────────────────────────
export async function addToRetryQueue(action_type, payload, max_retries = 4) {
  try {
    const nextRetry = new Date(Date.now() + BACKOFF_INTERVALS[0] * 1000).toISOString();
    await dbInsert('retry_queue', {
      action_type,
      payload,
      status:        'pending',
      max_retries,
      retry_count:   0,
      next_retry_at: nextRetry
    });
  } catch (err) {
    console.error('[RetryWorker] addToRetryQueue error:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Worker Run
// ─────────────────────────────────────────────────────────────────────────────
async function logWorkerRun(worker_name, duration_ms, results, status) {
  await dbInsert('worker_execution_log', {
    worker_name,
    duration_ms,
    items_processed:  results.processed  || 0,
    items_succeeded:  results.succeeded  || 0,
    items_failed:     results.failed     || 0,
    dead_lettered:    results.dead_lettered || 0,
    status,
    error_summary:    results.errors?.length ? results.errors.map(e => e.error || e.global).join('; ').substring(0, 500) : null
  }).catch(() => {}); // Never fail the worker because of logging
}

// ─────────────────────────────────────────────────────────────────────────────
// Replay Dead Letter Item
// ─────────────────────────────────────────────────────────────────────────────
export async function replayDeadLetterItem(dlqId, replayed_by) {
  const items = await dbSelect('dead_letter_queue', `id=eq.${dlqId}`, { limit: 1 });
  const item  = items[0];
  if (!item) throw new Error(`DLQ item ${dlqId} not found`);
  if (item.replayed) throw new Error(`DLQ item ${dlqId} already replayed`);

  // Re-enqueue in retry_queue
  await addToRetryQueue(item.event_type, item.payload, 3);

  // Mark as replayed
  await dbPatch('dead_letter_queue', `id=eq.${dlqId}`, {
    replayed:    true,
    replayed_at: new Date().toISOString(),
    replayed_by
  });

  return { success: true, re_queued_action: item.event_type };
}
