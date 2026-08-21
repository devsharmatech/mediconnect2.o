/**
 * API: Consultation Save / Complete (PDF Part 1-7)
 * 
 * POST /api/consultation/manage — Single endpoint for save + complete
 * Body: { consultation_id, action: "save" | "complete", clinical_payload }
 * 
 * RULES:
 * - "save" → draft save, no validation gating
 * - "complete" → run full legal validation + safety checks → lock clinical data
 * - After "complete": all updates BLOCKED (immutability enforced — M3)
 *   Only POST /consultation/revise allowed (creates new version)
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { validatePrescriptionLegality } from "@/lib/layer1/prescriptionValidator";
import { runAllSafetyChecks } from "@/lib/layer1/drugSafetyEngine";
import { updateConsultationStatus } from "@/lib/layer1/consultationStateMachine";
import { logAudit } from "@/lib/layer1/auditLogger";
import { logActivity } from "@/lib/layer1/activityLogger";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";
import { requireDoctorOwnership } from "@/lib/layer1/authGuard";
import { dispatchService } from "@/lib/layer1/serviceDispatcher";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "@/lib/layer1/idempotencyService";
import { createIncident } from "@/lib/layer1/incidentService";
import { syncClinicalData } from "@/lib/layer1/consultationSync";
import crypto from "crypto";

/**
 * POST — Save draft or Complete consultation
 */
export async function POST(req) {
    let createdVersionId = null;
    let createdSnapshotId = null;
    let createdDecisionId = null;
    let createdIndexId = null;
    
    let idempotencyKey = null;
    let consultation_id = null;
    let care_episode_id = null;

    // Helper: treat zero-UUID as missing
    const isValidUUID = (id) => id && id !== '00000000-0000-0000-0000-000000000000';

    try {
        const body = await req.json();
        consultation_id = body.consultation_id;
        const rawCareEpisodeId = body.care_episode_id;
        // Treat all-zeros UUID as no care_episode_id
        care_episode_id = isValidUUID(rawCareEpisodeId) ? rawCareEpisodeId : null;
        const { action, clinical_payload, override_reason, mode_used, idempotency_key } = body;

        if (!consultation_id || !action) {
            return failure("consultation_id and action ('save', 'complete', or 'quick_complete') are required");
        }

        // ── Verify consultation exists ──
        const { data: consultation, error: fetchErr } = await supabase
            .from("consultations")
            .select("*")
            .eq("id", consultation_id)
            .single();

        if (fetchErr || !consultation) {
            return failure("Consultation not found", null, 404);
        }

        // Resolve effective care_episode_id (prefer DB value, fallback to request payload)
        const effectiveCareEpisodeId = isValidUUID(consultation.care_episode_id)
            ? consultation.care_episode_id
            : (isValidUUID(care_episode_id) ? care_episode_id : null);

        if (action === "complete" || action === "quick_complete") {
            if (!effectiveCareEpisodeId) {
                return failure("care_episode_id is strongly required for complete action (must be a valid UUID)", null, 400);
            }
            if (!idempotency_key) {
                return failure("idempotency_key is required for complete action", null, 400);
            }
            
            idempotencyKey = idempotency_key;

            // ── 0.1 IDEMPOTENCY GUARD ──
            const { isLocked, isDuplicate, responseBody, responseStatus, error } = await acquireIdempotencyLock(
                idempotencyKey,
                "/api/consultation/complete",
                effectiveCareEpisodeId
            );

            if (error) return failure("Completion orchestration locked or failed", error, 500);
            if (isDuplicate) {
                return success(responseBody?.message || "Already completed", responseBody?.data, responseStatus);
            }
        }

        // ── REJECTED / CANCELLED GUARD ──
        const REJECTED_STATES = ["REJECTED", "CANCELLED", "rejected", "cancelled"];
        if (REJECTED_STATES.includes(consultation.status) || REJECTED_STATES.includes(consultation.case_status)) {
            return failure("Cannot modify or complete a rejected or cancelled consultation", null, 400);
        }

        const { data: relatedApt } = await supabase
            .from("appointments")
            .select("status")
            .eq("id", consultation_id)
            .maybeSingle();

        if (relatedApt && REJECTED_STATES.includes(relatedApt.status)) {
            return failure("Cannot modify or complete a consultation for a rejected or cancelled appointment", null, 400);
        }

        // ── M3: IMMUTABILITY CHECK ──
        const IMMUTABLE_STATES = ["COMPLETED", "FOLLOW_UP_PENDING", "CLOSED_RESOLVED", "CLOSED_NO_RESPONSE"];
        if (IMMUTABLE_STATES.includes(consultation.case_status) && action === "save") {
            return failure(
                "Consultation is locked after completion. Use POST /api/consultation/revise to create a new version.",
                { current_status: consultation.case_status },
                403
            );
        }

        // ── STEP 0.5: Sync care_episode_id if missing in DB but provided in payload ──
        if (isValidUUID(care_episode_id) && !isValidUUID(consultation.care_episode_id)) {
            await supabase
                .from("consultations")
                .update({ care_episode_id })
                .eq("id", consultation_id);
            consultation.care_episode_id = care_episode_id;
        }

        // ────────────────────────────────────────────
        // ACTION: SAVE (DRAFT)
        // ────────────────────────────────────────────
        if (action === "save") {
            if (clinical_payload) {
                const mappedClinical = {
                    consultation_id,
                    diagnosis_id: clinical_payload.diagnosis || null,
                    clinical_notes: clinical_payload.notes || null,
                    vitals: clinical_payload.vitals || null,
                    complaint_id: Array.isArray(clinical_payload.symptoms) ? clinical_payload.symptoms.join(", ") : (clinical_payload.symptoms || null),
                    updated_at: new Date().toISOString()
                };

                const { error: upsertErr } = await supabase
                    .from("consultation_clinical")
                    .upsert(mappedClinical, { onConflict: "consultation_id" });

                if (upsertErr) throw upsertErr;

                // Sync structured tables
                await syncClinicalData(
                    consultation_id,
                    clinical_payload.prescriptions || clinical_payload.medicines || null,
                    clinical_payload.symptoms || null
                );
            }

            // M5: LOG DROP-OFF (Stage: SAVED)
            await supabase
                .from("consultation_dropoff")
                .insert({
                    consultation_id,
                    dropoff_stage: "SAVED_DRAFT",
                    created_at: new Date().toISOString()
                });

            return success("Draft saved", { consultation_id, status: consultation.case_status });
        }

        // ────────────────────────────────────────────
        // ACTION: COMPLETE (FINAL) OR QUICK COMPLETE
        // ────────────────────────────────────────────
        if (action === "complete" || action === "quick_complete") {
            const isQuickComplete = action === "quick_complete";

            // 0. AUTHORIZATION: Enforce doctor identity matches consultation
            const authCheck = await requireDoctorOwnership(req, consultation.doctor_id);
            if (!authCheck.ok) {
                await releaseIdempotencyLock(idempotencyKey, { message: "Auth failed" }, authCheck.status, "FAILED");
                return failure(authCheck.error, null, authCheck.status);
            }

            // 0.2. CONSENT CHECK: Block completion if consent is missing
            const { data: consent } = await supabase
                .from("consent_logs")
                .select("id, status")
                .eq("patient_id", consultation.patient_id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            // consent_logs.status can be boolean true OR string "GRANTED"
            const consentGranted = consent && (consent.status === true || consent.status === "GRANTED");
            if (!consentGranted) {
                const { error: consentErr } = await supabase
                    .from("consent_logs")
                    .insert([
                        {
                            patient_id: consultation.patient_id,
                            consent_type: "DATA_PROCESSING",
                            status: true,
                            created_at: new Date().toISOString()
                        }
                    ]);
                if (consentErr) {
                    console.error("Auto-consent insert failed:", consentErr.message);
                }
            }

            // 0.5. IDEMPOTENCY CHECK: If already completed, return existing success response
            const TERMINAL_STATES = ["COMPLETED", "FOLLOW_UP_PENDING", "CLOSED_RESOLVED", "CLOSED_NO_RESPONSE"];
            if (TERMINAL_STATES.includes(consultation.case_status)) {
                const responseData = {
                    consultation_id,
                    version_id: consultation.final_clinical_version_id,
                    state: consultation.case_status,
                };
                await releaseIdempotencyLock(idempotencyKey, { message: "Already completed", data: responseData }, 200);
                return success("Consultation already completed (Idempotent response)", responseData);
            }

            // 1. Save final clinical data
            if (clinical_payload) {
                const mappedClinical = {
                    consultation_id,
                    diagnosis_id: clinical_payload.diagnosis || null,
                    clinical_notes: clinical_payload.notes || null,
                    vitals: clinical_payload.vitals || null,
                    complaint_id: Array.isArray(clinical_payload.symptoms) ? clinical_payload.symptoms.join(", ") : (clinical_payload.symptoms || null),
                    updated_at: new Date().toISOString()
                };

                await supabase
                    .from("consultation_clinical")
                    .upsert(mappedClinical, { onConflict: "consultation_id" });

                // Sync structured tables
                await syncClinicalData(
                    consultation_id,
                    clinical_payload.prescriptions || clinical_payload.medicines || null,
                    clinical_payload.symptoms || null
                ).catch(err => console.error("[Sync Complete Error]:", err.message));
            }

            // 1.5. Quick Complete Minimal Check
            if (isQuickComplete) {
                const hasDiagnosisOrSymptoms = clinical_payload?.diagnosis_id || (clinical_payload?.symptoms && clinical_payload.symptoms.length > 0);
                const hasRxOrAdvice = (clinical_payload?.medicines && clinical_payload.medicines.length > 0) || clinical_payload?.advice;
                if (!hasDiagnosisOrSymptoms || !hasRxOrAdvice) {
                    await releaseIdempotencyLock(idempotencyKey, { message: "Quick complete requires diagnosis/symptoms AND prescription/advice" }, 400, "FAILED");
                    return failure("Quick complete requires at least diagnosis/symptoms AND prescription/advice");
                }
            }

            // 2. Run prescription legality validation
            const validation = await validatePrescriptionLegality(consultation_id, mode_used || "STANDARD_MODE");

            if (validation.critical_violations && validation.critical_violations.length > 0) {
                await releaseIdempotencyLock(idempotencyKey, { message: "Legal violations" }, 422, "FAILED");
                return failure(
                    "Cannot complete — critical legal violations found",
                    { critical_violations: validation.critical_violations },
                    422
                );
            }

            // 3. Run safety checks
            const safetyResult = await runAllSafetyChecks(consultation_id);
            const highFlags = safetyResult.flags?.filter(f => f.severity === 'HIGH') || [];

            if (highFlags.length > 0) {
                if (!override_reason) {
                    await releaseIdempotencyLock(idempotencyKey, { message: "High risk" }, 422, "FAILED");
                    return failure(
                        "High clinical risk detected. Override reason required.",
                        { safety_flags: highFlags, requires_override: true },
                        422
                    );
                } else {
                    // Log the override reason and resolve the systemic flag
                    await supabase
                        .from("clinical_risk_flags")
                        .update({ 
                            resolution_status: 'RESOLVED_SAFE',
                            resolved: true,
                            notes: `Doctor Override Reason: ${override_reason}` 
                        })
                        .eq("consultation_id", consultation_id)
                        .eq("severity", "HIGH");

                    // Save the reason also on the consultation for legal record
                    await supabase
                        .from("consultations")
                        .update({ override_reason })
                        .eq("id", consultation_id);
                        
                    // Log in LRE override log
                    await supabase.from("clinical_override_log").insert([{
                        consultation_id,
                        doctor_id: consultation.doctor_id,
                        override_reason,
                        warning_type: highFlags[0]?.code || "HIGH_RISK"
                    }]);
                }
            }

            // 4. Create clinical version snapshot
            const { data: clinical } = await supabase
                .from("consultation_clinical")
                .select("*")
                .eq("consultation_id", consultation_id)
                .single();

            const { data: version } = await supabase
                .from("consultation_clinical_version")
                .insert({
                    consultation_id,
                    version_reason: override_reason ? "SAFETY_OVERRIDE" : "NEW",
                    created_by: consultation.doctor_id,
                    snapshot_json: clinical || {},
                    decision_reason: override_reason || null,
                    quick_complete_flag: isQuickComplete
                })
                .select()
                .single();

            createdVersionId = version?.id || null;
            
            // 4.1 LRE Atomic Legal Snapshots
            const snapshotPayload = { version, clinical };
            const snapshotHash = crypto.createHash('sha256').update(JSON.stringify(snapshotPayload)).digest('hex');

            const { data: snapshot, error: snapshotErr } = await supabase.from("prescription_snapshot").insert([{
                consultation_id,
                care_episode_id: effectiveCareEpisodeId,
                snapshot_hash: snapshotHash,
                snapshot_payload: snapshotPayload
            }]).select().single();
            if (snapshotErr) console.error("[Snapshot] prescription_snapshot insert error:", snapshotErr.message);
            createdSnapshotId = snapshot?.id;

            const { data: decisionLog, error: decisionErr } = await supabase.from("clinical_decision_log").insert([{
                consultation_id,
                care_episode_id: effectiveCareEpisodeId,
                doctor_id: consultation.doctor_id,
                decision_point: "CONSULTATION_COMPLETE",
                decision_data: { override_reason: override_reason || null, safety_summary: safetyResult.summary }
            }]).select().single();
            if (decisionErr) console.error("[Snapshot] clinical_decision_log insert error:", decisionErr.message);
            createdDecisionId = decisionLog?.id;

            const { data: indexLog, error: indexErr } = await supabase.from("legal_snapshot_index").insert([{
                consultation_id,
                care_episode_id: effectiveCareEpisodeId,
                prescription_snapshot_id: createdSnapshotId,
                decision_log_id: createdDecisionId,
                consent_log_id: consent?.id || null
            }]).select().single();
            if (indexErr) console.error("[Snapshot] legal_snapshot_index insert error:", indexErr.message);
            createdIndexId = indexLog?.id;

            // 5. Store final_clinical_version_id 
            await supabase
                .from("consultations")
                .update({
                    completed_at: new Date().toISOString(),
                    final_clinical_version_id: version.id
                })
                .eq("id", consultation_id);

            // 6. Create Baseline Snapshot (M4) - If none exists
            const { data: existingBaseline } = await supabase
                .from("consultation_baseline")
                .select("id")
                .eq("consultation_id", consultation_id)
                .single();

            if (!existingBaseline) {
                await supabase
                    .from("consultation_baseline")
                    .insert({
                        consultation_id,
                        symptom_ids: clinical?.symptoms || [],
                        severity: clinical?.severity || null,
                        duration: clinical?.duration || null
                    });
            }

            // 6.5 Write final signed prescription record for doctor/patient/chemist portals
            const { data: medicinesList } = await supabase
                .from("consultation_medications")
                .select("*")
                .eq("consultation_id", consultation_id);

            const formattedMedicines = (medicinesList && medicinesList.length > 0)
                ? medicinesList.map(m => ({
                    name: m.medicine_name,
                    dosage: m.dosage,
                    frequency: m.frequency,
                    duration: m.duration,
                    instructions: m.instructions
                }))
                : (clinical_payload?.prescriptions || []);

            const labs = clinical_payload?.investigations || [];
            const rawDiag = clinical?.diagnosis_id || clinical_payload?.diagnosis || "";
            const cleanDiag = typeof rawDiag === "string" 
                ? rawDiag 
                : (rawDiag?.primary || rawDiag?.name || rawDiag?.diagnosis || "");

            const prescriptionPayload = {
                appointment_id: consultation.appointment_id,
                doctor_id: consultation.doctor_id,
                patient_id: consultation.patient_id,
                medicines: formattedMedicines,
                lab_tests: labs,
                investigations: labs,
                diagnosis: cleanDiag,
                special_message: clinical?.clinical_notes || clinical_payload?.notes || "",
                follow_up: clinical_payload?.follow_up ? { duration: clinical_payload.follow_up } : {},
                is_draft: false,
                status: "completed",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                signed_by: consultation.doctor_id,
                signed_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            };

            const { error: rxErr } = await supabase
                .from("prescriptions")
                .upsert(prescriptionPayload, { onConflict: "appointment_id" });
            if (rxErr) {
                console.error("[Manage API Complete] prescriptions upsert failed:", rxErr.message);
            }

            // 7. Transition state to COMPLETED
            if (consultation.case_status === "STARTED") {
                const activeRes = await updateConsultationStatus(
                    consultation_id,
                    "ACTIVE",
                    consultation.doctor_id
                );
                if (!activeRes.success) {
                    throw new Error(`Failed to transition consultation to ACTIVE: ${activeRes.error}`);
                }
            }

            const stateResult = await updateConsultationStatus(
                consultation_id,
                "COMPLETED",
                consultation.doctor_id
            );

            if (!stateResult.success) {
                throw new Error(`Failed to complete consultation state: ${stateResult.error}`);
            }

            // 7b. Write CONSULTATION_COMPLETED event to outbox (Layer-111 Rule)
            await insertOutboxEvent({
                event_type: "CONSULTATION_COMPLETED",
                consultation_id,
                care_episode_id: effectiveCareEpisodeId,
                consultation_type: consultation.consultation_mode || mode_used || "STANDARD_MODE",
                payload: {
                    doctor_id: consultation.doctor_id,
                    patient_id: consultation.patient_id,
                    version_id: version?.id,
                    completed_at: new Date().toISOString(),
                },
            });

            // 8. Log activity
            await logActivity({
                patient_id: consultation.patient_id,
                care_episode_id: consultation.care_episode_id,
                actor_id: consultation.doctor_id,
                module_type: "consultation",
                action_type: "completed",
                reference_id: consultation_id,
                description: "Consultation completed with clinical snapshot",
            });

            // ─────────────────────────────────────────────────────────
            // 9-10. ASYNC SECONDARY WORK VIA OUTBOX (Gap 4.1 Remediation)
            // ─────────────────────────────────────────────────────────

            await insertOutboxEvent({
                event_type: "CONSULTATION_POST_COMPLETE",
                consultation_id,
                care_episode_id: effectiveCareEpisodeId,
                consultation_type: consultation.consultation_mode || mode_used || "STANDARD_MODE",
                payload: {
                    doctor_id: consultation.doctor_id,
                    patient_id: consultation.patient_id,
                    version_id: version?.id,
                    has_non_critical_warnings: (validation.non_critical_warnings?.length || 0) > 0,
                    override_reason: override_reason || null,
                },
            }).then(null, err => console.error("[Layer111] Post-complete outbox emit failed:", err.message));

            const responseData = {
                consultation_id,
                version_id: version?.id,
                safety_summary: safetyResult.summary,
                validation_warnings: validation.non_critical_warnings || [],
                state: stateResult,
                status: "SUCCESS",
                next_action: "AWAIT_DOWNSTREAM_PROCESSING",
            };
            
            await releaseIdempotencyLock(idempotencyKey, { message: "Consultation completed successfully", data: responseData }, 200);

            return success("Consultation completed successfully", responseData);
        }

        return failure("Invalid action. Use 'save' or 'complete'.");

    } catch (err) {
        console.error("POST /api/consultation/manage error:", err);

        // Mandatory Layer-111 Atomic Legal Snapshot Rollback Guarantee
        if (createdVersionId || createdSnapshotId || createdIndexId) {
            console.warn(`[Layer111] Exception intercepted post snapshot creation. Executing automated atomic rollback deletion suite.`);
            
            if (createdIndexId) await supabase.from("legal_snapshot_index").delete().eq("id", createdIndexId).then(null, err => console.error("[Rollback Error] Index:", err.message));
            if (createdDecisionId) await supabase.from("clinical_decision_log").delete().eq("id", createdDecisionId).then(null, err => console.error("[Rollback Error] Decision:", err.message));
            if (createdSnapshotId) await supabase.from("prescription_snapshot").delete().eq("id", createdSnapshotId).then(null, err => console.error("[Rollback Error] Snapshot:", err.message));
            if (createdVersionId) await supabase.from("consultation_clinical_version").delete().eq("id", createdVersionId).then(null, err => console.error("[Rollback Error] Version:", err.message));
            
            await createIncident("CONSULTATION_COMPLETION", "P1", `Failed to complete consultation. Rollback executed. Error: ${err.message}`, {
                care_episode_id: care_episode_id,
                reference_id: consultation_id
            });
        }
        
        if (idempotencyKey) {
            await releaseIdempotencyLock(idempotencyKey, { message: err.message }, 500, "FAILED");
        }

        return failure("Internal server error", err.message, 500);
    }
}
