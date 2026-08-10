/**
 * LAYER-111: Orchestration State Machine — Phase 6
 *
 * Manages care episode state transitions with:
 * 1. Optimistic concurrency (state_version locking)
 * 2. Out-of-order event rejection
 * 3. Full timeline audit trail
 * 4. Execution tracking
 *
 * State machine: INITIATED → PAYMENT_PENDING → ACTIVE →
 *                CONSULTATION_SCHEDULED → CONSULTATION_COMPLETED →
 *                FOLLOW_UP_PENDING → CLOSED / ABANDONED
 *
 * Uses direct HTTP fetch (schema cache bypass).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// Valid state transitions
// ─────────────────────────────────────────────────────────────────────────────
const VALID_TRANSITIONS = {
  INITIATED:                ['PAYMENT_PENDING', 'ACTIVE', 'ABANDONED'],
  PAYMENT_PENDING:          ['ACTIVE', 'PAYMENT_FAILED', 'ABANDONED'],
  PAYMENT_FAILED:           ['PAYMENT_PENDING', 'ABANDONED'],
  ACTIVE:                   ['CONSULTATION_SCHEDULED', 'ABANDONED'],
  CONSULTATION_SCHEDULED:   ['CONSULTATION_COMPLETED', 'ABANDONED', 'ACTIVE'],
  CONSULTATION_COMPLETED:   ['FOLLOW_UP_PENDING', 'CLOSED'],
  FOLLOW_UP_PENDING:        ['CLOSED', 'CONSULTATION_SCHEDULED'],
  CLOSED:                   [],   // Terminal state
  ABANDONED:                [],   // Terminal state
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────
async function dbSelect(table, filters, limit = 1) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}&limit=${limit}`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : [];
}

async function dbInsert(table, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation'
    },
    body: JSON.stringify(Array.isArray(payload) ? payload : [payload])
  });
  const d = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`dbInsert ${table} [${res.status}]: ${JSON.stringify(d).substring(0, 150)}`);
  return Array.isArray(d) ? d[0] : d;
}

async function dbUpsert(table, payload, onConflict) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${onConflict ? '?on_conflict=' + onConflict : ''}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(Array.isArray(payload) ? payload : [payload])
  });
  const d = await res.json().catch(() => null);
  return Array.isArray(d) ? d[0] : d;
}

async function dbPatch(table, filters, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });
  const d = await res.json().catch(() => null);
  return Array.isArray(d) ? d[0] : d;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Initialize Episode State (called when care episode is created)
// ─────────────────────────────────────────────────────────────────────────────
export async function initEpisodeState(care_episode_id) {
  try {
    const existing = await dbSelect('care_episode_states', `care_episode_id=eq.${care_episode_id}`);
    if (existing.length > 0) return { success: true, state: existing[0], already_initialized: true };

    const state = await dbUpsert('care_episode_states', {
      care_episode_id,
      current_state:  'INITIATED',
      state_version:  1,
      event_sequence: 0,
      updated_at:     new Date().toISOString()
    }, 'care_episode_id');

    console.log(`[StateMachine] Episode ${care_episode_id} initialized: INITIATED`);
    return { success: true, state };
  } catch (err) {
    console.error('[StateMachine] initEpisodeState error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Transition State (the core state machine function)
// ─────────────────────────────────────────────────────────────────────────────
export async function transitionEpisodeState({
  care_episode_id,
  to_state,
  event_type,
  actor_id   = null,
  actor_type = 'system',
  execution_id = null,
  payload    = {}
}) {
  try {
    // Fetch current state with version
    const states = await dbSelect('care_episode_states', `care_episode_id=eq.${care_episode_id}`);
    const current = states[0];

    if (!current) {
      // Auto-initialize if missing
      await initEpisodeState(care_episode_id);
      return transitionEpisodeState({ care_episode_id, to_state, event_type, actor_id, actor_type, execution_id, payload });
    }

    const from_state = current.current_state;

    // Validate transition is allowed
    const allowed = VALID_TRANSITIONS[from_state] || [];
    if (!allowed.includes(to_state)) {
      const msg = `Invalid transition: ${from_state} → ${to_state} for episode ${care_episode_id}`;
      console.warn(`[StateMachine] ${msg}`);
      return { success: false, error: msg, from_state, to_state };
    }

    const new_version  = current.state_version + 1;
    const new_sequence = current.event_sequence + 1;

    // Optimistic concurrency update (only succeeds if version matches)
    const updated = await dbPatch(
      'care_episode_states',
      `care_episode_id=eq.${care_episode_id}&state_version=eq.${current.state_version}`,
      {
        current_state:     to_state,
        state_version:     new_version,
        event_sequence:    new_sequence,
        last_execution_id: execution_id,
        locked_by:         null,
        locked_at:         null,
        updated_at:        new Date().toISOString()
      }
    );

    if (!updated) {
      // Concurrency conflict — another worker updated simultaneously
      return { success: false, error: 'CONCURRENCY_CONFLICT', from_state, to_state };
    }

    // Write to timeline (append-only audit)
    await appendTimeline({
      care_episode_id,
      event_sequence: new_sequence,
      event_type,
      actor_id,
      actor_type,
      from_state,
      to_state,
      payload,
      execution_id
    });

    console.log(`[StateMachine] Episode ${care_episode_id}: ${from_state} → ${to_state} (v${new_version})`);
    return { success: true, from_state, to_state, state_version: new_version, event_sequence: new_sequence };

  } catch (err) {
    console.error('[StateMachine] transitionEpisodeState error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Append Timeline Entry
// ─────────────────────────────────────────────────────────────────────────────
export async function appendTimeline({
  care_episode_id,
  event_sequence,
  event_type,
  actor_id   = null,
  actor_type = 'system',
  from_state = null,
  to_state   = null,
  payload    = {},
  execution_id = null
}) {
  try {
    await dbInsert('care_episode_timeline', {
      care_episode_id,
      event_sequence,
      event_type,
      actor_id,
      actor_type,
      from_state,
      to_state,
      payload,
      execution_id
    });
  } catch (err) {
    // Timeline write failures are non-blocking — log but don't propagate
    console.error('[StateMachine] appendTimeline error:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Track Orchestration Execution
// ─────────────────────────────────────────────────────────────────────────────
export async function createExecution({
  care_episode_id,
  action_type,
  actor_id,
  actor_type    = 'patient',
  idempotency_key,
  input_payload = {}
}) {
  try {
    const execution = await dbInsert('orchestration_executions', {
      care_episode_id,
      action_type,
      actor_id,
      actor_type,
      idempotency_key,
      status:        'PROCESSING',
      input_payload,
      started_at:    new Date().toISOString()
    });
    return { success: true, execution_id: execution?.id };
  } catch (err) {
    // If idempotency_key conflict — return existing execution
    if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
      const existing = await dbSelect('orchestration_executions', `idempotency_key=eq.${idempotency_key}`);
      if (existing.length) return { success: true, execution_id: existing[0].id, is_duplicate: true };
    }
    console.error('[StateMachine] createExecution error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function completeExecution(execution_id, output_payload = {}) {
  const started = await dbSelect('orchestration_executions', `id=eq.${execution_id}`);
  const startedAt = started[0]?.started_at ? new Date(started[0].started_at).getTime() : Date.now();

  await dbPatch('orchestration_executions', `id=eq.${execution_id}`, {
    status:         'COMPLETED',
    output_payload,
    completed_at:   new Date().toISOString(),
    duration_ms:    Date.now() - startedAt
  }).catch(() => {});
}

export async function failExecution(execution_id, error_message) {
  const started = await dbSelect('orchestration_executions', `id=eq.${execution_id}`);
  const startedAt = started[0]?.started_at ? new Date(started[0].started_at).getTime() : Date.now();

  await dbPatch('orchestration_executions', `id=eq.${execution_id}`, {
    status:        'FAILED',
    error_message,
    completed_at:  new Date().toISOString(),
    duration_ms:   Date.now() - startedAt
  }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Get Episode State + Timeline
// ─────────────────────────────────────────────────────────────────────────────
export async function getEpisodeState(care_episode_id) {
  const states = await dbSelect('care_episode_states', `care_episode_id=eq.${care_episode_id}`);
  return states[0] || null;
}

export async function getEpisodeTimeline(care_episode_id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/care_episode_timeline?care_episode_id=eq.${care_episode_id}&order=event_sequence.asc`,
    { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) return [];
  return res.json();
}
