/**
 * API: Consultation Revise (Post-Completion Version)
 * 
 * POST /api/consultation/revise
 * Body: { consultation_id, clinical_payload, decision_reason }
 * 
 * PDF Part 1-5: After COMPLETED, only revision allowed (not direct edit)
 * Creates a new consultation_clinical_version with CORRECTION reason.
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { logAudit } from "@/lib/layer1/auditLogger";

export async function POST(req) {
    try {
        const body = await req.json();
        const { consultation_id, clinical_payload, decision_reason } = body;

        if (!consultation_id || !clinical_payload) {
            return failure("consultation_id and clinical_payload are required");
        }

        // Verify consultation is completed
        const { data: consultation } = await supabase
            .from("consultations")
            .select("*")
            .eq("id", consultation_id)
            .single();

        if (!consultation) {
            return failure("Consultation not found", null, 404);
        }

        const COMPLETED_STATES = ["COMPLETED", "FOLLOW_UP_PENDING", "CLOSED_RESOLVED"];
        if (!COMPLETED_STATES.includes(consultation.case_status)) {
            return failure(
                "Revision only allowed after completion. Use POST /api/consultation/manage with action='save' for drafts.",
                null,
                403
            );
        }

        // Update clinical data
        await supabase
            .from("consultation_clinical")
            .update({
                ...clinical_payload,
                doctor_modified: true,
                updated_at: new Date().toISOString(),
            })
            .eq("consultation_id", consultation_id);

        // Fetch updated clinical for snapshot
        const { data: updatedClinical } = await supabase
            .from("consultation_clinical")
            .select("*")
            .eq("consultation_id", consultation_id)
            .single();

        // Create new version with CORRECTION reason
        const { data: version } = await supabase
            .from("consultation_clinical_version")
            .insert({
                consultation_id,
                version_reason: "CORRECTION",
                created_by: consultation.doctor_id,
                snapshot_json: updatedClinical || {},
                decision_reason: decision_reason || null,
            })
            .select()
            .single();

        // Update final version pointer
        await supabase
            .from("consultations")
            .update({
                final_clinical_version_id: version.id,
                updated_at: new Date().toISOString(),
            })
            .eq("id", consultation_id);

        // Audit log
        await logAudit({
            entity_type: "consultation",
            entity_id: consultation_id,
            previous_state: { version: consultation.final_clinical_version_id },
            new_state: { version: version.id, reason: "CORRECTION" },
            change_description: `Post-completion revision. Reason: ${decision_reason || "Correction"}`,
            changed_by: consultation.doctor_id,
        });

        return success("Revision created", {
            new_version_id: version.id,
            version_reason: "CORRECTION",
        });

    } catch (err) {
        console.error("POST /api/consultation/revise error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
