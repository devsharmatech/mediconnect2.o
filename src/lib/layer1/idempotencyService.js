/**
 * LAYER-111: Idempotency Service
 * 
 * Uses a direct REST call to the Supabase RPC endpoint to bypass PostgREST
 * schema cache issues that occur after new tables/functions are created.
 */

import { supabase } from '../supabaseAdmin';

/**
 * Calls a Supabase RPC function.
 * @private
 */
async function callRpc(functionName, params) {
  try {
    const { data, error } = await supabase.rpc(functionName, params);
    if (error) {
      return { data: null, error: { message: error.message || String(error) } };
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}


/**
 * Ensures exactly-once execution of critical write operations.
 */
export async function acquireIdempotencyLock(idempotencyKey, apiPath, careEpisodeId = null) {
  if (!idempotencyKey) {
    return { error: "idempotency_key is required" };
  }

  try {
    const { data, error } = await callRpc("acquire_idempotency_lock", {
      p_key: idempotencyKey,
      p_api_path: apiPath,
      p_care_episode_id: careEpisodeId
    });

    if (error) {
      return { error: "Failed to acquire lock. " + error.message };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { error: "Failed to acquire lock. No response from database." };
    }

    // is_new = false means duplicate
    if (!row.is_new) {
      if (row.status === "PROCESSING") {
        return { isLocked: true, isDuplicate: true, error: "Concurrent request processing." };
      }
      return {
        isLocked: false,
        isDuplicate: true,
        responseBody: row.response_body,
        responseStatus: row.response_status
      };
    }

    return { isLocked: true, isDuplicate: false };

  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Releases the lock and stores the final response payload.
 */
export async function releaseIdempotencyLock(idempotencyKey, responseBody, responseStatus = 200, status = "COMPLETED") {
  try {
    await callRpc("release_idempotency_lock", {
      p_key: idempotencyKey,
      p_response_body: responseBody,
      p_response_status: responseStatus,
      p_status: status
    });
  } catch (err) {
    console.error("[idempotencyService] releaseIdempotencyLock failed:", err.message);
  }
}
