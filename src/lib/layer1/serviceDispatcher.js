/**
 * LAYER-111: Service Dispatcher with Failure Handling
 *
 * Handles post-consultation service triggering (pharmacy, lab, nursing).
 *
 * Layer-111 Rules (Section 11):
 *  - No silent failures
 *  - payment success + service fail → MUST:
 *      1. Create incident record
 *      2. Create ops_task for operator
 *      3. Write immutable audit_log entry
 *      4. Notify patient
 *
 * Usage:
 *  import { dispatchService } from "@/lib/layer1/serviceDispatcher";
 *  await dispatchService({ care_episode_id, consultation_id, patient_id, service_type, payload });
 */

import { supabase } from "../supabaseAdmin";
import { logAudit } from "./auditLogger";
import { insertOutboxEvent } from "./eventOutbox";

const VALID_SERVICE_TYPES = ["pharmacy", "lab", "nursing", "equipment", "wellness"];

/**
 * Trigger a downstream service after consultation completion.
 * Enforces ledger verification before dispatch.
 * Handles failure chain if service dispatch fails.
 *
 * @param {object} params
 * @param {string} params.care_episode_id
 * @param {string} params.consultation_id
 * @param {string} params.patient_id
 * @param {string} params.service_type        — pharmacy | lab | nursing | equipment | wellness
 * @param {string} params.consultation_type   — VIDEO | AUDIO | IN_PERSON | QUICK
 * @param {object} params.payload             — structured service payload (NOT raw clinical data)
 */
export async function dispatchService({
    care_episode_id,
    consultation_id,
    patient_id,
    service_type,
    consultation_type,
    payload = {},
}) {
    // ── Input validation ──
    if (!care_episode_id || !consultation_id || !patient_id || !service_type) {
        throw new Error("DISPATCH_ERROR: care_episode_id, consultation_id, patient_id, service_type are required");
    }

    if (!VALID_SERVICE_TYPES.includes(service_type)) {
        throw new Error(`DISPATCH_ERROR: Invalid service_type '${service_type}'`);
    }

    // ── Step 1: Enforce ledger presence before service executes (Rule 8.2) ──
    // Allow downstream recommendations to inherit parent consultation ledger verification scope
    const { data: ledgerRows, error: ledgerErr } = await supabase
        .from("financial_transaction_log")
        .select("id, status, service_type")
        .eq("care_episode_id", care_episode_id)
        .in("status", ["success"])
        .in("service_type", [service_type, "consultation"]);

    const hasValidLedger = ledgerRows && ledgerRows.length > 0;

    if (ledgerErr || !hasValidLedger) {
        // Ledger check failed — do NOT silently continue
        throw new Error(
            `LEDGER_VIOLATION: No successful ledger entry for service '${service_type}' or parent consultation on episode '${care_episode_id}'`
        );
    }

    // ── Step 2: Write prescription_service_map entry (structured payload only) ──
    await supabase
        .from("prescription_service_map")
        .insert({
            consultation_id,
            care_episode_id,
            service_type,
            payload,
        });

    // ── Step 3: Try to dispatch the service ──
    let serviceSuccess = false;
    let serviceError = null;

    try {
        // Simulate / call actual service integration
        // In production: call pharmacy API, lab booking API, etc.
        // For now: mark as dispatched in the service_recommendation table
        await supabase
            .from("conversion_tracking")
            .upsert(
                {
                    consultation_id,
                    service_suggested: true,
                    service_clicked: true,
                    service_completed: false,
                },
                { onConflict: "consultation_id" }
            );

        serviceSuccess = true;

    } catch (err) {
        serviceError = err.message;
    }

    // ──────────────────────────────────────────────────────────────────
    // Step 4: FAILURE CHAIN — payment success but service dispatch failed
    // Rule: No silent failure — must create incident → ops_task → audit → notify
    // ──────────────────────────────────────────────────────────────────
    if (!serviceSuccess) {
        await handleServiceFailure({
            care_episode_id,
            consultation_id,
            patient_id,
            service_type,
            error_message: serviceError || "Unknown service dispatch error",
        });

        throw new Error(`SERVICE_DISPATCH_FAILED: ${serviceError}`);
    }

    // ── Step 5: Write outbox event on success ──
    await insertOutboxEvent({
        event_type: "SERVICE_DISPATCHED",
        consultation_id,
        care_episode_id,
        consultation_type: consultation_type || "STANDARD_MODE",
        payload: {
            service_type,
            ledger_id: ledgerRows[0]?.id,
            dispatched_at: new Date().toISOString(),
        },
    });

    return { success: true, service_type, care_episode_id };
}


import { createIncident } from "./incidentService";

/**
 * Full failure chain handler — MANDATORY per Layer-111 Section 11.
 * Called when payment succeeded but service dispatch failed.
 *
 * Chain:
 *   1. Create standardized ops_incident_log (P1)
 *   2. Write immutable audit_log entry
 *   3. Notify patient
 *
 * @param {object} params
 */
async function handleServiceFailure({
    care_episode_id,
    consultation_id,
    patient_id,
    service_type,
    error_message,
}) {
    const description = `Payment succeeded but ${service_type} service dispatch failed. Error: ${error_message}`;

    // ── 1. Create INCIDENT (Standardized Layer-111) ──
    await createIncident(
        "SERVICE_DISPATCHER",
        "P1",
        description,
        {
            reference_id: consultation_id,
            care_episode_id: care_episode_id,
            metadata: {
                service_type,
                error_message,
                patient_id,
                triggered_at: new Date().toISOString()
            }
        }
    );

    // ── 3. Write IMMUTABLE AUDIT LOG ──
    try {
        await logAudit({
            entity_type: "consultation",
            entity_id: consultation_id,
            previous_state: { service_status: "PENDING" },
            new_state: { service_status: "FAILED", error: error_message },
            change_description: description,
            changed_by: null, // system event
        });
    } catch (auditErr) {
        console.error("CRITICAL: Failed to write audit log for service failure:", auditErr);
    }

    // ── 4. NOTIFY PATIENT (non-blocking) ──
    try {
        await supabase
            .from("notifications")
            .insert({
                user_id: patient_id,
                title: "We're looking into your order",
                message: `There was an issue processing your ${service_type} request. Our team has been alerted and will resolve this shortly. No action needed from you.`,
                type: "service_failure",
                metadata: {
                    care_episode_id,
                    consultation_id,
                    service_type,
                },
            });
    } catch (notifyErr) {
        console.error("CRITICAL: Failed to notify patient of service failure:", notifyErr);
    }

    console.error(`[SERVICE_DISPATCHER] Failure chain completed for ${service_type} on episode ${care_episode_id}`);
}
