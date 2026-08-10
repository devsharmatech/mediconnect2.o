/**
 * API: Grant Patient DPDP Consents (Layer-111)
 *
 * POST /api/user/consent/grant
 * Body: { consent_types: ["CONSULTATION_CONSENT", "TELEMEDICINE_CONSENT", ...] }
 *
 * Writes all 4 typed consents to patient_consent_log.
 * Must be called before a patient can book a consultation.
 *
 * DPDP Consent Types (from layer111_audit_fixes.sql):
 *   CONSULTATION_CONSENT   — required for any consultation
 *   TELEMEDICINE_CONSENT   — required for video consultations
 *   DATA_PROCESSING_CONSENT — required for AI + analytics
 *   PRESCRIPTION_CONSENT   — required for e-prescriptions
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";
import { logAudit } from "@/lib/layer1/auditLogger";

const VALID_CONSENT_TYPES = [
    "CONSULTATION_CONSENT",
    "TELEMEDICINE_CONSENT",
    "DATA_PROCESSING_CONSENT",
    "PRESCRIPTION_CONSENT",
];

export async function POST(req) {
    try {
        // Resolve patient identity from token (NOT body)
        const caller = await resolveCallerFromRequest(req);
        if (!caller) return failure("Unauthorized", null, 401);
        if (caller.role !== "patient") {
            return failure("Only patient accounts can grant consent", null, 403);
        }

        const patient_id = caller.id;
        const body = await req.json();
        const { consent_types } = body;

        if (!Array.isArray(consent_types) || consent_types.length === 0) {
            return failure("consent_types must be a non-empty array");
        }

        // Validate all consent types
        const invalid = consent_types.filter(t => !VALID_CONSENT_TYPES.includes(t));
        if (invalid.length > 0) {
            return failure(
                `Invalid consent types: ${invalid.join(", ")}. Valid types: ${VALID_CONSENT_TYPES.join(", ")}`
            );
        }

        const now = new Date().toISOString();

        // Upsert each consent type
        const rows = consent_types.map(consent_type => ({
            patient_id,
            consent_type,
            is_active: true,
            granted_at: now,
            revoked_at: null,
            consent_snapshot: `Patient granted ${consent_type} consent at ${now}`,
        }));

        const { data, error } = await supabase
            .from("patient_consent_log")
            .upsert(rows, { onConflict: "patient_id,consent_type" })
            .select();

        if (error) throw error;

        // Audit log
        await logAudit({
            entity_type: "user",
            entity_id: patient_id,
            previous_state: { consent_status: "not_granted" },
            new_state: { consent_status: "granted", consent_types },
            change_description: `Patient granted ${consent_types.length} DPDP consent(s): ${consent_types.join(", ")}`,
            changed_by: patient_id,
        });

        return success("Consents granted successfully", {
            granted: consent_types,
            records: data,
        });

    } catch (err) {
        console.error("POST /api/user/consent/grant error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * GET — Check current consent status for the authenticated patient
 */
export async function GET(req) {
    try {
        const caller = await resolveCallerFromRequest(req);
        if (!caller) return failure("Unauthorized", null, 401);
        if (caller.role !== "patient") {
            return failure("Only patient accounts can query consent status", null, 403);
        }

        const patient_id = caller.id;

        const { data: consentLogs, error } = await supabase
            .from("patient_consent_log")
            .select("consent_type, is_active, granted_at, revoked_at")
            .eq("patient_id", patient_id);

        if (error) throw error;

        const granted = (consentLogs || [])
            .filter(c => c.is_active)
            .map(c => c.consent_type);

        const missing = VALID_CONSENT_TYPES.filter(t => !granted.includes(t));

        return success("Consent status", {
            granted,
            missing,
            all_required_consented: missing.length === 0,
            records: consentLogs || [],
        });

    } catch (err) {
        console.error("GET /api/user/consent/grant error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
