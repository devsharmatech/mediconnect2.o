import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { executeOrchestration } from "@/lib/layer1/controlLayer";
import { randomUUID } from "crypto";

/**
 * POST /api/consultation/start
 * Secure initialization of an instant consultation via Orchestration Layer.
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { care_episode_id, symptoms, consultation_mode = "VIDEO", idempotency_key, patient_id } = body;

        if (!patient_id) {
            return failure("patient_id is required", null, 400);
        }

        const idempotencyKey = idempotency_key || `start-instant-${patient_id}-${randomUUID()}`;

        // Pre-check for existing active consultation (to avoid orchestration lock if not needed)
        const { data: activeConsultation } = await supabase
            .from("consultations")
            .select("id, care_episode_id, case_status")
            .eq("patient_id", patient_id)
            .in("case_status", ["STARTED", "ACTIVE"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (activeConsultation) {
            return success("Existing active consultation found", {
                consultation_id: activeConsultation.id,
                care_episode_id: activeConsultation.care_episode_id,
                status: activeConsultation.case_status,
                is_existing: true
            });
        }

        // Dispatch to Orchestration Engine
        const orchestrationResult = await executeOrchestration({
            idempotencyKey,
            actionType: "START_INSTANT_CONSULTATION",
            actorId: patient_id,
            actorType: "patient",
            careEpisodeId: care_episode_id || null,
            payload: {
                symptoms,
                consultation_mode
            }
        });

        if (!orchestrationResult.success) {
            const isDuplicate = orchestrationResult.cached || orchestrationResult.isDuplicate;
            if (isDuplicate) {
                return success("Consultation already started (Idempotent)", orchestrationResult.data, 200);
            }
            return failure(orchestrationResult.error || "Failed to start consultation", null, orchestrationResult.status || 500);
        }

        return success("Consultation started securely", orchestrationResult.data, 200);

    } catch (err) {
        console.error("POST /api/consultation/start error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
