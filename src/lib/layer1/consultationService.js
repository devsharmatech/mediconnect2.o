import { supabase } from "@/lib/supabaseAdmin";
import { logActivity } from "./activityLogger";
import { logAudit } from "./auditLogger";

/**
 * CONSULTATION SERVICE
 * Enforces architectural compliance for consultation lifecycle.
 */

/**
 * Initializes a new consultation with its parent Care Episode and Funnel Tracking.
 * @param {object} params - { patient_id, symptoms, consultation_mode }
 * @returns {object} { success, data, error }
 */
export async function initializeConsultation({ patient_id, symptoms, consultation_mode = "VIDEO" }) {
    try {
        if (!patient_id) throw new Error("patient_id is required");

        // 1. Create or resolve care_episode
        // Logic: For now, we always create a new episode for a new consultation start 
        // unless explicitly linking (simplified for launch).
        const { data: newEpisode, error: epErr } = await supabase
            .from("care_episodes")
            .insert([{
                patient_id,
                status: "active"
            }])
            .select("id")
            .single();
        
        if (epErr) throw new Error("Failed to create care episode: " + epErr.message);
        const care_episode_id = newEpisode.id;

        // 2. Create consultation
        const { data: newConsultation, error: consErr } = await supabase
            .from("consultations")
            .insert([{
                patient_id,
                care_episode_id,
                consultation_mode,
                case_status: "STARTED",
                payment_status: "pending"
            }])
            .select("id")
            .single();

        if (consErr) throw new Error("Failed to create consultation record: " + consErr.message);

        // 3. Store symptoms in baseline if provided
        if (symptoms) {
            await supabase.from("consultation_baseline").insert([{
                consultation_id: newConsultation.id,
                symptom_ids: Array.isArray(symptoms) ? symptoms : [symptoms]
            }]);
        }

        // 4. Log Funnel Tracking
        await supabase.from("funnel_tracking_log").insert([{
            care_episode_id,
            stage: "START"
        }]);

        // 5. Activity Log
        await logActivity({
            patient_id,
            care_episode_id,
            module_type: "consultation",
            action_type: "created",
            reference_id: newConsultation.id,
            description: "New consultation started"
        });

        return {
            success: true,
            data: {
                consultation_id: newConsultation.id,
                care_episode_id,
                status: "STARTED"
            }
        };

    } catch (err) {
        console.error("initializeConsultation error:", err);
        return { success: false, error: err.message };
    }
}
