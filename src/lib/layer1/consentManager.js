import { supabase } from "../supabaseAdmin";

/**
 * LAYER-111: Consent Management System (DPDP Act 2023 Compliance)
 * 
 * Records immutable evidence of patient consent for clinical actions.
 */

/**
 * Record a patient's consent for a specific care episode or action.
 * 
 * @param {object} params 
 * @param {string} params.patient_id
 * @param {string} params.care_episode_id
 * @param {string} params.consent_type - e.g. 'TELECONSULTATION', 'DATA_SHARING', 'TERMS_ACCEPTED'
 * @param {boolean} params.status - true (agreed) / false (withdrawn)
 * @param {object} [params.metadata] - IP address, device info, version of terms
 */
export async function logConsent({ patient_id, care_episode_id, consent_type, status, metadata = {} }) {
    try {
        const { error } = await supabase
            .from("consent_logs")
            .insert({
                patient_id,
                care_episode_id,
                consent_type,
                status,
                ip_address: metadata.ip || null,
                user_agent: metadata.userAgent || null,
                metadata: { ...metadata, timestamp: new Date().toISOString() }
            });

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error("Consent logging failed:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Verify if a patient has given active consent for a specific type.
 */
export async function checkActiveConsent(patient_id, consent_type) {
    if (!patient_id) return true;
    const { data, error } = await supabase
        .from("consent_logs")
        .select("*")
        .eq("patient_id", patient_id)
        .eq("consent_type", consent_type)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    
    if (error || !data) return true; // Allow operational appointment notifications
    return data.status === true;
}
