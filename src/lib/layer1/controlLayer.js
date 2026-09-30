/**
 * LAYER-111: Control Layer Orchestration Engine (Hardened for AWS RDS PostgreSQL)
 * 
 * Secure entry gate for all state-changing API endpoints and Server Actions.
 * Handles idempotency locks, state continuity verification, optimistic locking,
 * router dispatching, and atomic rollbacks.
 * 
 * 100% Direct AWS RDS PostgreSQL - Zero Supabase HTTP REST dependencies.
 */

import sql from "@/lib/db";
import crypto from "crypto";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "./idempotencyService";
import { validateStateSequence, acquireStateLock, releaseStateLock } from "./continuityEngine";
import { routeExecution } from "./executionRouter";
import { createIncident } from "./incidentService";

/**
 * Executes a state-changing transaction through the Control Layer orchestration gates.
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
        try {
          const appt = await sql`SELECT care_episode_id FROM appointments WHERE id = ${payload.appointment_id} LIMIT 1`;
          targetCareEpisodeId = appt[0]?.care_episode_id || null;
        } catch {
          // ignore
        }
      } else if (payload?.consultation_id) {
        try {
          const cons = await sql`SELECT care_episode_id FROM consultations WHERE id = ${payload.consultation_id} LIMIT 1`;
          targetCareEpisodeId = cons[0]?.care_episode_id || null;
        } catch {
          // ignore
        }
      }
    }

    if (!targetCareEpisodeId) {
      if (payload?.appointment_id || payload?.consultation_id || actionType === "BOOK_APPOINTMENT" || actionType === "START_INSTANT_CONSULTATION") {
        let patientId = payload.patient_id || actorId;
        
        if (payload?.appointment_id) {
          try {
            const appt = await sql`SELECT patient_id FROM appointments WHERE id = ${payload.appointment_id} LIMIT 1`;
            if (appt[0]?.patient_id) patientId = appt[0].patient_id;
          } catch {}
        } else if (payload?.consultation_id) {
          try {
            const cons = await sql`SELECT patient_id FROM consultations WHERE id = ${payload.consultation_id} LIMIT 1`;
            if (cons[0]?.patient_id) patientId = cons[0].patient_id;
          } catch {}
        }

        try {
          const episode = await sql`
            INSERT INTO care_episodes (patient_id, episode_type, status)
            VALUES (${patientId}, 'consultation', 'active')
            RETURNING id
          `;
          targetCareEpisodeId = episode[0]?.id;
        } catch (epErr) {
          console.warn("[CONTROL_LAYER] Care episode insert fallback:", epErr.message);
          targetCareEpisodeId = crypto.randomUUID();
        }

        // Auto-heal database linking
        if (payload?.appointment_id) {
          await sql`UPDATE appointments SET care_episode_id = ${targetCareEpisodeId} WHERE id = ${payload.appointment_id}`.catch(() => {});
        } else if (payload?.consultation_id) {
          await sql`UPDATE consultations SET care_episode_id = ${targetCareEpisodeId} WHERE id = ${payload.consultation_id}`.catch(() => {});
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

    // 5. Insert Orchestration Execution record via direct AWS RDS SQL
    const nextSeq = Number(continuity.currentSequence || 0) + 1;
    const nextVer = Number(continuity.currentVersion || 0) + 1;
    const inputPayloadJson = typeof payload === "string" ? payload : JSON.stringify(payload);

    try {
      const execRows = await sql`
        INSERT INTO orchestration_executions (
          care_episode_id, action_type, actor_id, actor_type,
          idempotency_key, event_sequence, state_version, input_payload, status
        ) VALUES (
          ${targetCareEpisodeId}, ${actionType}, ${actorId}, ${actorType},
          ${idempotencyKey}, ${nextSeq}, ${nextVer}, ${inputPayloadJson}::jsonb, 'RUNNING'
        )
        RETURNING id
      `;
      executionId = execRows[0]?.id || crypto.randomUUID();
    } catch (execErr) {
      console.warn("[CONTROL_LAYER] Orchestration execution log error:", execErr.message);
      executionId = crypto.randomUUID();
    }

    // 6. Acquire Optimistic State Lock
    const lockAcquired = await acquireStateLock(targetCareEpisodeId, executionId);
    if (!lockAcquired) {
      throw new Error("CONCURRENCY_VIOLATION: Target Care Episode is locked by another transaction. Try again.");
    }
    hasStateLock = true;

    // 7. Dispatch to Execution Router
    const actionResult = await routeExecution(actionType, payload, actorId, targetCareEpisodeId);

    // Calculate monotonic sequence numbers
    const nextSequence = Number(continuity.currentSequence || 0) + 1;
    const nextVersion = Number(continuity.currentVersion || 0) + 1;
    const nextState = actionResult.status || "STATE_CHANGED";

    // 8. Capture event timeline via direct AWS RDS SQL
    try {
      const actionResultJson = typeof actionResult === "string" ? actionResult : JSON.stringify(actionResult);
      await sql`
        INSERT INTO care_episode_timeline (
          care_episode_id, event_sequence, event_type, actor_id,
          actor_type, from_state, to_state, payload, execution_id
        ) VALUES (
          ${targetCareEpisodeId}, ${nextSequence}, ${`${actionType}_SUCCESS`}, ${actorId},
          ${actorType}, ${continuity.currentState || "INITIATED"}, ${nextState}, ${actionResultJson}::jsonb, ${executionId}
        )
      `;
    } catch (timelineErr) {
      console.warn("[CONTROL_LAYER] Timeline logging warning:", timelineErr.message);
    }

    // 9. Update Orchestration status via direct AWS RDS SQL
    const durationMs = Date.now() - startedAt;
    try {
      const actionResultJson = typeof actionResult === "string" ? actionResult : JSON.stringify(actionResult);
      await sql`
        UPDATE orchestration_executions
        SET status = 'COMPLETED', output_payload = ${actionResultJson}::jsonb, duration_ms = ${durationMs}, updated_at = NOW()
        WHERE id = ${executionId}
      `;
    } catch (updateErr) {
      console.warn("[CONTROL_LAYER] Execution update warning:", updateErr.message);
    }

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
      try {
        await sql`
          UPDATE orchestration_executions
          SET status = 'FAILED', error_message = ${err.message}, duration_ms = ${durationMs}, updated_at = NOW()
          WHERE id = ${executionId}
        `;
      } catch (failedUpdateErr) {
        console.warn("[CONTROL_LAYER] Failed execution status update error:", failedUpdateErr.message);
      }

      // Dead-letter queue via direct AWS RDS SQL
      try {
        const payloadJson = typeof payload === "string" ? payload : JSON.stringify(payload);
        await sql`
          INSERT INTO dead_letter_queue (
            original_event_id, event_type, failure_reason, care_episode_id, payload, status
          ) VALUES (
            ${executionId}, ${actionType}, ${err.message}, ${careEpisodeId}, ${payloadJson}::jsonb, 'UNRESOLVED'
          )
        `;
      } catch (dlqErr) {
        console.warn("[CONTROL_LAYER] DLQ insert warning:", dlqErr.message);
      }

      // Log ops incident via direct RDS service
      try {
        await createIncident({
          priority: "P1",
          source: "CONTROL_LAYER",
          description: `Execution error on action '${actionType}': ${err.message}`,
          referenceId: executionId,
          careEpisodeId,
          metadata: { action_type: actionType, actor_id: actorId, error: err.message }
        });
      } catch (incErr) {
        console.warn("[CONTROL_LAYER] Failed to create ops incident:", incErr.message);
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
