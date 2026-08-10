/**
 * LAYER-111: Control Layer Orchestration Engine
 * 
 * Secure entry gate for all state-changing API endpoints and Server Actions.
 * Handles idempotency locks, state continuity verification, optimistic locking,
 * router dispatching, and atomic rollbacks.
 */

import { supabase } from "../supabaseAdmin";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "./idempotencyService";
import { validateStateSequence, acquireStateLock, releaseStateLock } from "./continuityEngine";
import { routeExecution } from "./executionRouter";
import { createIncident } from "./incidentService";

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
 * Executes a state-changing transaction through the Control Layer orchestration gates.
 * 
 * @param {object} params
 * @param {string} params.idempotencyKey - Mandatory client-provided idempotency token
 * @param {string} params.actionType - BOOK_APPOINTMENT, START_CONSULTATION, COMPLETE_CONSULTATION, etc.
 * @param {object} params.payload - The arguments for the designated action
 * @param {string} params.actorId - UUID of the user triggering the transaction
 * @param {string} [params.actorType] - patient | doctor | admin | system | whatsapp
 * @param {string} [params.careEpisodeId] - Optional Care Episode target
 * @param {number} [params.expectedSequence] - Optional sequence check for continuity verification
 * @param {number} [params.expectedVersion] - Optional state version check for optimistic locking
 */
export async function executeOrchestration({
  idempotencyKey,
  actionType,
  payload = {},
  actorId,
  actorType = "patient",
  careEpisodeId = null,
  expectedSequence = null,
  expectedVersion = null
}) {
  const startedAt = Date.now();
  let executionId = null;
  let hasStateLock = false;

  // 1. Mandatory Input validation
  if (!idempotencyKey) {
    return { success: false, status: 400, error: "IDEMPOTENCY_VIOLATION: idempotency_key is required." };
  }
  if (!actionType) {
    return { success: false, status: 400, error: "ORCHESTRATION_VIOLATION: action_type is required." };
  }
  if (!actorId) {
    return { success: false, status: 400, error: "ORCHESTRATION_VIOLATION: actor_id is required." };
  }

  // 2. Acquire Idempotency Lock
  const idemResult = await acquireIdempotencyLock(idempotencyKey, `orchestration/${actionType}`, careEpisodeId);
  if (idemResult.error) {
    return {
      success: false,
      status: 409,
      error: `IDEMPOTENCY_CONFLICT: ${idemResult.error}`,
      isDuplicate: true,
      data: idemResult.responseBody || {}
    };
  }

  // If duplicate request already completed successfully, return the cached result
  if (idemResult.isDuplicate && !idemResult.isLocked) {
    return {
      success: true,
      status: idemResult.responseStatus || 200,
      cached: true,
      data: idemResult.responseBody
    };
  }

  try {
    // 3. Resolve or Create Care Episode if not specified
    let targetCareEpisodeId = careEpisodeId;
    if (!targetCareEpisodeId) {
      if (payload?.appointment_id) {
        const { data: appointment } = await supabase
          .from("appointments")
          .select("care_episode_id")
          .eq("id", payload.appointment_id)
          .maybeSingle();
        targetCareEpisodeId = appointment?.care_episode_id || null;
      } else if (payload?.consultation_id) {
        const { data: consultation } = await supabase
          .from("consultations")
          .select("care_episode_id")
          .eq("id", payload.consultation_id)
          .maybeSingle();
        targetCareEpisodeId = consultation?.care_episode_id || null;
      }
    }

    if (!targetCareEpisodeId) {
      // If we have an existing appointment/consultation but it lacks a care_episode_id,
      // or if this is a BOOK_APPOINTMENT or START_INSTANT_CONSULTATION flow, we auto-provision one.
      if (payload?.appointment_id || payload?.consultation_id || actionType === "BOOK_APPOINTMENT" || actionType === "START_INSTANT_CONSULTATION") {
        let patientId = payload.patient_id || actorId;
        
        // Load the exact patient_id from the referenced record to guarantee accuracy
        if (payload?.appointment_id) {
          const { data: appt } = await supabase
            .from("appointments")
            .select("patient_id")
            .eq("id", payload.appointment_id)
            .maybeSingle();
          if (appt?.patient_id) {
            patientId = appt.patient_id;
          }
        } else if (payload?.consultation_id) {
          const { data: cons } = await supabase
            .from("consultations")
            .select("patient_id")
            .eq("id", payload.consultation_id)
            .maybeSingle();
          if (cons?.patient_id) {
            patientId = cons.patient_id;
          }
        }

        const { data: episode, error: epErr } = await supabase
          .from("care_episodes")
          .insert({
            patient_id: patientId,
            episode_type: "consultation",
            status: "active"
          })
          .select()
          .single();

        if (epErr) throw new Error(`EPISODE_CREATION_FAILED: ${epErr.message}`);
        targetCareEpisodeId = episode.id;

        // Auto-heal database linking
        if (payload?.appointment_id) {
          await supabase
            .from("appointments")
            .update({ care_episode_id: targetCareEpisodeId })
            .eq("id", payload.appointment_id);
        } else if (payload?.consultation_id) {
          await supabase
            .from("consultations")
            .update({ care_episode_id: targetCareEpisodeId })
            .eq("id", payload.consultation_id);
        }
      } else {
        throw new Error("ORCHESTRATION_VIOLATION: careEpisodeId is required for this action.");
      }
    }

    // 4. Validate Monotonic State Continuity Pre-check
    const continuity = await validateStateSequence(targetCareEpisodeId, actionType, expectedSequence, expectedVersion);
    if (!continuity.isValid) {
      throw new Error(`STATE_CONTINUITY_VIOLATION: ${continuity.error}`);
    }

    // 5. Insert Orchestration Execution record via direct RPC
    const { data: execId, error: execErr } = await callRpc("insert_orchestration_execution", {
      p_care_episode_id: targetCareEpisodeId,
      p_action_type: actionType,
      p_actor_id: actorId,
      p_actor_type: actorType,
      p_idempotency_key: idempotencyKey,
      p_event_sequence: Number(continuity.currentSequence) + 1,
      p_state_version: Number(continuity.currentVersion) + 1,
      p_input_payload: payload
    });

    if (execErr) {
      throw new Error(`EXECUTION_LOG_FAILED: ${execErr.message}`);
    }
    
    // Safely extract the UUID from the Supabase/PostgREST response
    let extractedId = execId;
    if (Array.isArray(extractedId)) extractedId = extractedId[0];
    if (typeof extractedId === 'object' && extractedId !== null) {
      extractedId = extractedId.insert_orchestration_execution || extractedId.id || Object.values(extractedId)[0];
    }
    executionId = extractedId;

    // 6. Acquire Optimistic State Lock
    const lockAcquired = await acquireStateLock(targetCareEpisodeId, executionId);
    if (!lockAcquired) {
      throw new Error("CONCURRENCY_VIOLATION: Target Care Episode is locked by another transaction. Try again.");
    }
    hasStateLock = true;

    // 7. Dispatch to Execution Router
    const actionResult = await routeExecution(actionType, payload, actorId, targetCareEpisodeId);

    // Calculate monotonic sequence numbers
    const nextSequence = Number(continuity.currentSequence) + 1;
    const nextVersion = Number(continuity.currentVersion) + 1;
    const nextState = actionResult.status || "STATE_CHANGED";

    // 8. Capture event timeline via direct RPC
    await callRpc("insert_episode_timeline", {
      p_care_episode_id: targetCareEpisodeId,
      p_event_sequence: nextSequence,
      p_event_type: `${actionType}_SUCCESS`,
      p_actor_id: actorId,
      p_actor_type: actorType,
      p_from_state: continuity.currentState || "INITIATED",
      p_to_state: nextState,
      p_payload: actionResult,
      p_execution_id: executionId
    });

    // 9. Update Orchestration status via direct RPC
    const durationMs = Date.now() - startedAt;
    await callRpc("update_orchestration_execution", {
      p_execution_id: executionId,
      p_status: "COMPLETED",
      p_output_payload: actionResult,
      p_duration_ms: durationMs
    });

    // 10. Update Care Episode state & Release lock
    await releaseStateLock(targetCareEpisodeId, executionId, nextState, nextSequence, nextVersion);

    // 11. Release Idempotency Lock
    const responsePayload = {
      success: true,
      execution_id: executionId,
      state_version: nextVersion,
      event_sequence: nextSequence,
      data: actionResult
    };

    await releaseIdempotencyLock(idempotencyKey, responsePayload, 200, "COMPLETED");

    return {
      success: true,
      status: 200,
      execution_id: executionId,
      care_episode_id: targetCareEpisodeId,
      state_version: nextVersion,
      event_sequence: nextSequence,
      data: actionResult
    };

  } catch (err) {
    console.error(`[CONTROL_LAYER] Transaction failed for ${actionType}:`, err.message);
    const durationMs = Date.now() - startedAt;

    // 12. Transaction Rollback & Incident Logging (Rule: No Silent Failures)
    if (executionId) {
      // Update execution status to FAILED via direct RPC
      await callRpc("update_orchestration_execution", {
        p_execution_id: executionId,
        p_status: "FAILED",
        p_output_payload: {},
        p_error_message: err.message,
        p_duration_ms: durationMs
      });

      // Dead-letter queue via direct RPC
      try {
        await callRpc("insert_dead_letter", {
          p_original_event_id: executionId,
          p_event_type: actionType,
          p_failure_reason: err.message,
          p_care_episode_id: careEpisodeId,
          p_payload: payload
        });
      } catch (dlqErr) {
        console.error("[CONTROL_LAYER] Failed to log to DLQ:", dlqErr.message);
      }

      // Log ops incident via direct RPC
      try {
        await callRpc("insert_ops_incident", {
          p_priority: "P1",
          p_source: "CONTROL_LAYER",
          p_description: `Execution error on action '${actionType}': ${err.message}`,
          p_reference_id: executionId,
          p_care_episode_id: careEpisodeId,
          p_metadata: { action_type: actionType, actor_id: actorId, error: err.message }
        });
      } catch (incErr) {
        console.error("[CONTROL_LAYER] Failed to create ops incident:", incErr.message);
      }
    }

    // Release Optimistic Locks on failure
    if (hasStateLock && careEpisodeId) {
      await releaseStateLock(careEpisodeId, executionId, "FAILED", 0, 0);
    }

    // Release Idempotency Lock with FAILED status
    const failurePayload = {
      success: false,
      error: err.message
    };
    await releaseIdempotencyLock(idempotencyKey, failurePayload, 500, "FAILED");

    return {
      success: false,
      status: 500,
      error: err.message
    };
  }
}
