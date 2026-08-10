import { supabase } from "@/lib/supabaseAdmin";
import { insertOutboxEvent } from "./eventOutbox";

/**
 * WELLNESS SERVICE
 * Handles telemetry data ingestion and risk signaling.
 */

/**
 * Submits wellness data and triggers async processing.
 * @param {object} params - { patient_id, care_episode_id, data_type, value, unit, metadata }
 * @returns {object} { success, data, error }
 */
export async function submitWellnessData({ patient_id, care_episode_id, data_type, value, unit, metadata = {} }) {
    try {
        if (!patient_id || !care_episode_id || !data_type || value === undefined) {
            throw new Error("Missing required fields for wellness submission");
        }

        // 1. Log to wellness_logs
        const { data: logEntry, error: logErr } = await supabase
            .from("wellness_logs")
            .insert([{
                patient_id,
                care_episode_id,
                data_type,
                value: String(value),
                unit: unit || "",
                metadata
            }])
            .select("id")
            .single();

        if (logErr) {
            // Note: If table doesn't exist, we log but don't fail the outbox flow
            console.warn("[WellnessService] DB log failed:", logErr.message);
        }

        // 2. Emit Outbox Event for async risk scoring and engagement adjustment
        await insertOutboxEvent({
            event_type: "WELLNESS_DATA_SUBMITTED",
            consultation_id: logEntry?.id || null, 
            care_episode_id,
            consultation_type: "WELLNESS",
            payload: { data_type, value, unit, patient_id }
        });

        return {
            success: true,
            data: {
                log_id: logEntry?.id || null,
                status: "ACCEPTED_ASYNC"
            }
        };

    } catch (err) {
        console.error("submitWellnessData error:", err);
        return { success: false, error: err.message };
    }
}
