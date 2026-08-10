import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * POST /api/user/consent/withdraw
 * DPDP Compliant Consent Withdrawal. Blocks future consultations.
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { user_id, consent_types } = body; // e.g., ["MARKETING", "DATA_PROCESSING"]

        if (!user_id || !consent_types || !Array.isArray(consent_types)) {
            return failure("user_id and consent_types array are required", null, 400);
        }

        // 1. Log Withdrawal
        await supabase.from("consent_logs").insert(consent_types.map(type => ({
            patient_id: user_id,
            consent_type: type,
            status: "WITHDRAWN",
            action_date: new Date().toISOString()
        })));

        // 2. Mark User Profile as Consent Withdrawn
        // If DATA_PROCESSING is withdrawn, we must block future consultations
        if (consent_types.includes("DATA_PROCESSING")) {
            await supabase
                .from("users")
                .update({ status: "CONSENT_WITHDRAWN" })
                .eq("id", user_id);
        }

        return success("Consent withdrawn successfully. Future data processing halted for selected types.", {
            user_id,
            withdrawn_types: consent_types
        });

    } catch (err) {
        console.error("POST /api/user/consent/withdraw error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
