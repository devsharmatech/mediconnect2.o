/**
 * LAYER-111: Orchestration State Machine — AWS RDS PostgreSQL Direct
 *
 * Manages care episode state transitions with:
 * 1. Optimistic concurrency (state_version locking)
 * 2. Out-of-order event rejection
 * 3. Full timeline audit trail
 * 4. Execution tracking
 *
 * Direct AWS RDS PostgreSQL queries (no Supabase REST).
 */

import sql from "@/lib/db";

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
// 1. Initialize Episode State
// ─────────────────────────────────────────────────────────────────────────────
export async function initEpisodeState(care_episode_id) {
  try {
    const existing = await sql`
      SELECT * FROM care_episode_states WHERE care_episode_id = ${care_episode_id} LIMIT 1
    `;
    if (existing.length > 0) return { success: true, state: existing[0], already_initialized: true };

    const rows = await sql`
      INSERT INTO care_episode_states (
        care_episode_id, current_state, state_version, event_sequence, updated_at
      ) VALUES (
        ${care_episode_id}, 'INITIATED', 1, 0, NOW()
      )
      ON CONFLICT (care_episode_id) DO UPDATE SET updated_at = NOW()
      RETURNING *
    `;

    console.log(`[StateMachine] Episode ${care_episode_id} initialized: INITIATED (AWS RDS)`);
    return { success: true, state: rows[0] };
  } catch (err) {
    console.error('[StateMachine] initEpisodeState error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Transition State (core state machine function)
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
    const states = await sql`
      SELECT * FROM care_episode_states WHERE care_episode_id = ${care_episode_id} LIMIT 1
    `;
    const current = states[0];

    if (!current) {
      await initEpisodeState(care_episode_id);
      return transitionEpisodeState({ care_episode_id, to_state, event_type, actor_id, actor_type, execution_id, payload });
    }

    const from_state = current.current_state;

    const allowed = VALID_TRANSITIONS[from_state] || [];
    if (!allowed.includes(to_state)) {
      const msg = `Invalid transition: ${from_state} → ${to_state} for episode ${care_episode_id}`;
      console.warn(`[StateMachine] ${msg}`);
      return { success: false, error: msg, from_state, to_state };
    }

    const new_version  = current.state_version + 1;
    const new_sequence = current.event_sequence + 1;

    // Optimistic concurrency update in AWS RDS
    const updated = await sql`
      UPDATE care_episode_states
      SET current_state = ${to_state},
          state_version = ${new_version},
          event_sequence = ${new_sequence},
          last_execution_id = ${execution_id},
          locked_by = NULL,
          locked_at = NULL,
          updated_at = NOW()
      WHERE care_episode_id = ${care_episode_id} AND state_version = ${current.state_version}
      RETURNING *
    `;

    if (!updated || updated.length === 0) {
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

    console.log(`[StateMachine] Episode ${care_episode_id}: ${from_state} → ${to_state} (v${new_version}) in AWS RDS`);
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
    await sql`
      INSERT INTO care_episode_timeline (
        care_episode_id, event_sequence, event_type, actor_id, actor_type,
        from_state, to_state, payload, execution_id
      ) VALUES (
        ${care_episode_id}, ${event_sequence}, ${event_type}, ${actor_id}, ${actor_type},
        ${from_state}, ${to_state}, ${JSON.stringify(payload)}, ${execution_id}
      )
    `;
  } catch (err) {
    console.error('[StateMachine] appendTimeline error in RDS:', err.message);
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
    const rows = await sql`
      INSERT INTO orchestration_executions (
        care_episode_id, action_type, actor_id, actor_type,
        idempotency_key, status, input_payload, started_at
      ) VALUES (
        ${care_episode_id}, ${action_type}, ${actor_id}, ${actor_type},
        ${idempotency_key}, 'PROCESSING', ${JSON.stringify(input_payload)}, NOW()
      )
      RETURNING *
    `;
    return { success: true, execution_id: rows[0]?.id };
  } catch (err) {
    if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
      const existing = await sql`
        SELECT id FROM orchestration_executions WHERE idempotency_key = ${idempotency_key} LIMIT 1
      `;
      if (existing.length) return { success: true, execution_id: existing[0].id, is_duplicate: true };
    }
    console.error('[StateMachine] createExecution error in RDS:', err.message);
    return { success: false, error: err.message };
  }
}

export async function completeExecution(execution_id, output_payload = {}) {
  try {
    const started = await sql`
      SELECT started_at FROM orchestration_executions WHERE id = ${execution_id} LIMIT 1
    `;
    const startedAt = started[0]?.started_at ? new Date(started[0].started_at).getTime() : Date.now();

    await sql`
      UPDATE orchestration_executions
      SET status = 'COMPLETED',
          output_payload = ${JSON.stringify(output_payload)},
          completed_at = NOW(),
          duration_ms = ${Date.now() - startedAt}
      WHERE id = ${execution_id}
    `;
  } catch (err) {
    console.warn('[StateMachine] completeExecution error in RDS:', err.message);
  }
}

export async function failExecution(execution_id, error_message) {
  try {
    const started = await sql`
      SELECT started_at FROM orchestration_executions WHERE id = ${execution_id} LIMIT 1
    `;
    const startedAt = started[0]?.started_at ? new Date(started[0].started_at).getTime() : Date.now();

    await sql`
      UPDATE orchestration_executions
      SET status = 'FAILED',
          error_message = ${error_message},
          completed_at = NOW(),
          duration_ms = ${Date.now() - startedAt}
      WHERE id = ${execution_id}
    `;
  } catch (err) {
    console.warn('[StateMachine] failExecution error in RDS:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Get Episode State + Timeline
// ─────────────────────────────────────────────────────────────────────────────
export async function getEpisodeState(care_episode_id) {
  try {
    const states = await sql`
      SELECT * FROM care_episode_states WHERE care_episode_id = ${care_episode_id} LIMIT 1
    `;
    return states[0] || null;
  } catch {
    return null;
  }
}

export async function getEpisodeTimeline(care_episode_id) {
  try {
    return await sql`
      SELECT * FROM care_episode_timeline
      WHERE care_episode_id = ${care_episode_id}
      ORDER BY event_sequence ASC
    `;
  } catch {
    return [];
  }
}
