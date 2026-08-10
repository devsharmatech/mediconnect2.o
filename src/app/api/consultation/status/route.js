/**
 * API: Consultation Status Management
 * 
 * PUT  /api/consultation/status — Update consultation status (state machine)
 * POST /api/consultation/status — Validate prescription before completion
 */

import { success, failure } from "@/lib/response";
import { updateConsultationStatus, getAllowedTransitions, STATES } from "@/lib/layer1/consultationStateMachine";
import { validatePrescriptionLegality, logValidationOverride } from "@/lib/layer1/prescriptionValidator";
import { executeOrchestration } from "@/lib/layer1/controlLayer";
import { randomUUID } from "crypto";

/**
 * PUT — Update consultation status via state machine or orchestration
 * Body: { consultation_id, new_status, user_id, reason? }
 */
export async function PUT(req) {
    try {
        const body = await req.json();
        const { consultation_id, new_status, user_id, reason, force_override, override_reason, care_episode_id } = body;

        if (!consultation_id || !new_status || !user_id) {
            return failure("consultation_id, new_status, and user_id are required");
        }

        // If transitioning to COMPLETED, run prescription validation and Orchestration
        if (new_status === STATES.COMPLETED) {
            const validation = await validatePrescriptionLegality(consultation_id);

            if (!validation.valid) {
                if (force_override && override_reason) {
                    await logValidationOverride(consultation_id, user_id, override_reason);
                } else {
                    return failure("Prescription validation failed", {
                        critical_violations: validation.critical_violations,
                        non_critical_warnings: validation.non_critical_warnings,
                        details: validation.details,
                    }, 422);
                }
            }

            // Route through orchestration engine for transactional integrity
            const orchestrationResult = await executeOrchestration({
                idempotencyKey: `complete-${consultation_id}-${randomUUID()}`,
                actionType: "COMPLETE_CONSULTATION",
                actorId: user_id,
                actorType: "doctor",
                careEpisodeId: care_episode_id || null,
                payload: { consultation_id, reason }
            });

            if (!orchestrationResult.success) {
                return failure(orchestrationResult.error || "Failed to complete consultation", null, orchestrationResult.status || 500);
            }

            return success("Consultation completed securely via Orchestration", {
                consultation: orchestrationResult.data?.data,
                auto_follow_up: orchestrationResult.data?.auto_follow_up || false,
            });
        }

        // For non-completed state transitions, fallback to state machine direct method
        const result = await updateConsultationStatus(consultation_id, new_status, user_id, reason);

        if (!result.success) {
            return failure(result.error, null, 400);
        }

        return success("Status updated successfully", {
            consultation: result.data,
            auto_follow_up: result.auto_follow_up || false,
        });

    } catch (err) {
        console.error("PUT /api/consultation/status error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * POST — Validate prescription legality (dry-run, does not change status)
 * Body: { consultation_id }
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { consultation_id } = body;

        if (!consultation_id) {
            return failure("consultation_id is required");
        }

        const validation = await validatePrescriptionLegality(consultation_id);

        return success("Validation complete", validation);

    } catch (err) {
        console.error("POST /api/consultation/status error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * GET — Get allowed transitions for a consultation
 * Query: ?consultation_id=xxx or ?current_status=xxx
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const current_status = searchParams.get("current_status");

        if (!current_status) {
            return failure("current_status query parameter is required");
        }

        const allowed = getAllowedTransitions(current_status);

        return success("Allowed transitions", {
            current_status,
            allowed_transitions: allowed,
            is_terminal: allowed.length === 0,
        });

    } catch (err) {
        console.error("GET /api/consultation/status error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
