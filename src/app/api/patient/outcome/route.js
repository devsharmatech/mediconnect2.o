/**
 * API: Patient Outcome Submission (PDF Part 4-3)
 * 
 * POST /api/patient/outcome — Submit follow-up outcome
 * GET  /api/patient/outcome?consultation_id=xxx — Get existing outcomes
 * 
 * Captures at Day 3/7/14:
 * - improvement_status (better/same/worse)
 * - adherence (full/partial/none)
 * - symptom_change (reduced/same/increased)
 * - severity_change (mild/moderate/severe)
 * 
 * Auto-calculates reliability score after submission.
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { scoreAndSaveOutcome } from "@/lib/layer1/outcomeScorer";
import { logActivity } from "@/lib/layer1/activityLogger";
import { requirePatientOwnership } from "@/lib/layer1/authGuard";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";
import { updateConsultationStatus } from "@/lib/layer1/consultationStateMachine";

/**
 * POST — Submit patient outcome
 */
export async function POST(req) {
    try {
        const body = await req.json();
        // NOTE: patient_id is NOT taken from body — it is resolved from the
        // verified consultation record (line ~62) to prevent identity spoofing.
        const {
            consultation_id,
            improvement_status,
            adherence,
            symptom_change,
            severity_change,
            followup_completed,
            notes,
        } = body;

        if (!consultation_id || !improvement_status) {
            return failure("consultation_id and improvement_status are required");
        }

        // ── Fetch consultation to resolve patient_id + care_episode_id ──
        const { data: consultation, error: fetchErr } = await supabase
            .from("consultations")
            .select("id, patient_id, care_episode_id, case_status, consultation_mode")
            .eq("id", consultation_id)
            .single();

        if (fetchErr || !consultation) {
            return failure("Consultation not found", null, 404);
        }

        // ── AUTHORIZATION: Only the owning patient can submit ──
        const authCheck = await requirePatientOwnership(req, consultation.patient_id);
        if (!authCheck.ok) {
            return failure(authCheck.error, null, authCheck.status);
        }

        const patient_id = consultation.patient_id;

        // Validate enums
        const VALID_IMPROVEMENT = ["better", "same", "worse"];
        const VALID_ADHERENCE = ["full", "partial", "none"];
        const VALID_SYMPTOM = ["reduced", "same", "increased"];

        if (!VALID_IMPROVEMENT.includes(improvement_status)) {
            return failure(`improvement_status must be: ${VALID_IMPROVEMENT.join(", ")}`);
        }

        // Check for duplicate outcome same day
        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
            .from("consultation_outcome")
            .select("id")
            .eq("consultation_id", consultation_id)
            .gte("reported_at", `${today}T00:00:00`)
            .lte("reported_at", `${today}T23:59:59`);

        if (existing && existing.length > 0) {
            return failure("Outcome already submitted today. Try again tomorrow.", null, 409);
        }

        // Insert outcome
        const { data: outcome, error } = await supabase
            .from("consultation_outcome")
            .insert({
                consultation_id,
                patient_id,
                improvement_status,
                adherence: adherence || null,
                symptom_change: symptom_change || null,
                severity_change: severity_change || null,
                followup_completed: followup_completed || false,
            })
            .select()
            .single();

        if (error) throw error;

        // Auto-calculate reliability score
        const scoreResult = await scoreAndSaveOutcome(outcome.id);

        // Log activity
        await logActivity({
            patient_id,
            actor_id: patient_id,
            module_type: "outcome",
            action_type: "submitted",
            reference_id: consultation_id,
            description: `Patient reported: ${improvement_status}`,
        });

        // If patient reports "worse" → trigger re-consult suggestion
        if (improvement_status === "worse") {
            await supabase
                .from("notifications")
                .insert({
                    user_id: patient_id,
                    title: "Your doctor recommends a follow-up",
                    message: "Since your symptoms haven't improved, we recommend booking a follow-up consultation.",
                    type: "reconsult_suggestion",
                    metadata: { consultation_id },
                });
        }

        // If patient reports "better" and followup is done → transition via state machine
        if (improvement_status === "better" && followup_completed) {
            await updateConsultationStatus(
                consultation_id,
                "CLOSED_RESOLVED",
                patient_id
            );
        }

        // ── Write outcome event to outbox (Layer-111 Rule) ──
        await insertOutboxEvent({
            event_type: "PATIENT_OUTCOME_SUBMITTED",
            consultation_id,
            care_episode_id: consultation.care_episode_id,
            consultation_type: consultation.consultation_mode || "STANDARD_MODE",
            payload: {
                improvement_status,
                followup_completed: followup_completed || false,
                adherence: adherence || null,
            },
        });

        return success("Outcome submitted", {
            outcome,
            reliability: scoreResult,
            care_episode_id: consultation.care_episode_id,
        });

    } catch (err) {
        console.error("POST /api/patient/outcome error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * GET — Get outcomes for a consultation
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const consultation_id = searchParams.get("consultation_id");
        const patient_id = searchParams.get("patient_id");

        if (!consultation_id && !patient_id) {
            return failure("consultation_id or patient_id is required");
        }

        let query = supabase
            .from("consultation_outcome")
            .select("*")
            .order("reported_at", { ascending: false });

        if (consultation_id) query = query.eq("consultation_id", consultation_id);
        if (patient_id) query = query.eq("patient_id", patient_id);

        const { data, error } = await query;

        if (error) throw error;

        return success("Outcomes retrieved", { outcomes: data || [] });

    } catch (err) {
        console.error("GET /api/patient/outcome error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
