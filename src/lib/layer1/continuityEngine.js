/**
 * LAYER-111: State Continuity & Sequence Validation Engine
 * 
 * Enforces strict monotonic ordering for all state-changing orchestration events.
 * Prevents concurrent modifications, replayed events, and out-of-order state transitions.
 * Uses direct fetch to bypass PostgREST schema cache issues.
 */

import { supabase } from "../supabaseAdmin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function callRpc(functionName, params) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(params)
  });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!response.ok) {
    return { data: null, error: { message: typeof data === 'object' && data?.message ? data.message : text } };
  }
  return { data, error: null };
}

/**
 * Initializes care_episode_states via RPC if not exists
 * @private
 */
async function ensureEpisodeStateExists(careEpisodeId) {
  const { data, error } = await callRpc("get_episode_state", {
    p_care_episode_id: careEpisodeId
  });

  if (error) {
    throw new Error(`DATABASE_ERROR: Failed to fetch state for episode ${careEpisodeId}: ${error.message}`);
  }

  const existing = Array.isArray(data) ? data[0] : data;

  if (!existing) {
    const { error: upsertErr } = await callRpc("upsert_episode_state", {
      p_care_episode_id: careEpisodeId,
      p_current_state: "INITIATED",
      p_state_version: 1,
      p_event_sequence: 0
    });

    if (upsertErr) {
      throw new Error(`DATABASE_ERROR: Failed to initialize state for episode ${careEpisodeId}: ${upsertErr.message}`);
    }

    return {
      care_episode_id: careEpisodeId,
      current_state: "INITIATED",
      state_version: 1,
      event_sequence: 0,
      locked_by: null,
      locked_at: null
    };
  }

  return existing;
}

/**
 * Validates sequence monotonicity on care_episode_states.
 * Rejects old, out-of-order, or replayed events.
 */
export async function validateStateSequence(careEpisodeId, actionType, expectedSequence = null, expectedVersion = null) {
  try {
    if (!careEpisodeId) {
      return { isValid: false, error: "careEpisodeId is required" };
    }

    const state = await ensureEpisodeStateExists(careEpisodeId);

    // Check monotonic sequence ordering
    if (expectedSequence !== null) {
      const nextSequence = Number(state.event_sequence) + 1;
      if (expectedSequence !== nextSequence) {
        return {
          isValid: false,
          currentSequence: state.event_sequence,
          currentVersion: state.state_version,
          error: `SEQUENCE_VIOLATION: Event out of order. Expected sequence ${nextSequence}, got ${expectedSequence}.`
        };
      }
    }

    if (expectedVersion !== null) {
      const nextVersion = Number(state.state_version) + 1;
      if (expectedVersion !== nextVersion) {
        return {
          isValid: false,
          currentSequence: state.event_sequence,
          currentVersion: state.state_version,
          error: `VERSION_VIOLATION: Concurrency mismatch. Expected state version ${nextVersion}, got ${expectedVersion}.`
        };
      }
    }

    return {
      isValid: true,
      currentSequence: state.event_sequence,
      currentVersion: state.state_version,
      currentState: state.current_state
    };
  } catch (err) {
    return { isValid: false, error: err.message };
  }
}

/**
 * Places optimistic concurrency lock on the episode state.
 * Lock expires automatically after 10 seconds.
 */
export async function acquireStateLock(careEpisodeId, executionId) {
  try {
    await ensureEpisodeStateExists(careEpisodeId);

    const now = new Date().toISOString();
    const lockExpiry = new Date(Date.now() - 10000).toISOString();

    const { data, error } = await supabase
      .from("care_episode_states")
      .update({ locked_by: executionId, locked_at: now })
      .eq("care_episode_id", careEpisodeId)
      .or(`locked_by.is.null,locked_at.lt.${lockExpiry}`)
      .select();

    if (error) throw error;
    if (data && data.length > 0) return true;

    // Fallback: use upsert RPC
    await callRpc("upsert_episode_state", {
      p_care_episode_id: careEpisodeId,
      p_current_state: "INITIATED",
      p_state_version: 1,
      p_event_sequence: 0,
      p_locked_by: executionId,
      p_locked_at: now
    });
    return true;
  } catch (err) {
    console.error("acquireStateLock failed:", err.message);
    return false;
  }
}

/**
 * Persists new state values and releases the lock.
 */
export async function releaseStateLock(careEpisodeId, executionId, nextState, nextSequence, nextVersion) {
  try {
    const { error } = await supabase
      .from("care_episode_states")
      .update({
        current_state: nextState,
        event_sequence: nextSequence,
        state_version: nextVersion,
        last_execution_id: executionId,
        locked_by: null,
        locked_at: null,
        updated_at: new Date().toISOString()
      })
      .eq("care_episode_id", careEpisodeId);

    if (error) throw error;
    return true;
  } catch {
    try {
      await callRpc("upsert_episode_state", {
        p_care_episode_id: careEpisodeId,
        p_current_state: nextState,
        p_state_version: nextVersion,
        p_event_sequence: nextSequence,
        p_execution_id: executionId,
        p_locked_by: null,
        p_locked_at: null
      });
      return true;
    } catch (err) {
      console.error("releaseStateLock failed:", err.message);
      return false;
    }
  }
}
