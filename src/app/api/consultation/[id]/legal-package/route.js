import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/consultation/[id]/legal-defense-package
 * Generates a complete, verifiable clinical and legal audit trail for a care episode.
 */
export async function GET(req, { params }) {
    try {
        const { id: consultation_id } = params;

        if (!consultation_id) {
            return failure("consultation_id is required", null, 400);
        }

        // 1. Fetch Consultation Core
        const { data: consultation } = await supabase
            .from("consultations")
            .select("*, patient:users!consultations_patient_id_fkey(*), doctor:users!consultations_doctor_id_fkey(*)")
            .eq("id", consultation_id)
            .single();

        if (!consultation) return failure("Consultation not found", null, 404);

        // 2. Fetch Legal Snapshots Index
        const { data: snapshots } = await supabase
            .from("legal_snapshot_index")
            .select(`
                *,
                prescription_snapshot:prescription_snapshot_id(*),
                clinical_decision_log:decision_log_id(*),
                consent_log:consent_log_id(*)
            `)
            .eq("consultation_id", consultation_id);

        // 3. Fetch Audit Logs
        const { data: auditLogs } = await supabase
            .from("audit_log")
            .select("*")
            .eq("entity_type", "consultation")
            .eq("entity_id", consultation_id)
            .order("changed_at", { ascending: true });

        // 4. Fetch Risk Flags
        const { data: riskFlags } = await supabase
            .from("clinical_risk_flags")
            .select("*")
            .eq("consultation_id", consultation_id);

        // 5. Package Everything
        const legalPackage = {
            metadata: {
                consultation_id,
                care_episode_id: consultation.care_episode_id,
                generated_at: new Date().toISOString(),
                schema_version: "LAYER-111-V2"
            },
            clinical_record: {
                consultation,
                snapshots: snapshots || []
            },
            audit_trail: {
                logs: auditLogs || [],
                risk_flags: riskFlags || []
            },
            compliance_signatures: {
                doctor_registration: consultation.doctor?.details?.registration_number || "NOT_PROVIDED",
                patient_consent_snapshot: snapshots?.[0]?.consent_log?.consent_text_snapshot || "LEGACY_CONSENT"
            }
        };

        return success("Legal defense package generated successfully", legalPackage);

    } catch (err) {
        console.error("GET Legal Package error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
