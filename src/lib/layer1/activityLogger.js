/**
 * LAYER-1: Activity Logger
 * 
 * Logs cross-module events for patient activity tracking.
 * Examples: consultation created, service updates, payments, follow-ups.
 */

import { supabase } from "../supabaseAdmin";

/**
 * Log an activity event
 * @param {object} params
 * @param {string} params.patient_id
 * @param {string} [params.care_episode_id]
 * @param {string} [params.actor_id] - who performed the action
 * @param {string} params.module_type - consultation | lab | pharmacy | nursing | payment | auth | system
 * @param {string} params.action_type - created | updated | status_changed | payment_received | etc.
 * @param {string} [params.reference_id] - FK to specific entity
 * @param {string} [params.description] - human-readable summary
 * @param {object} [params.metadata] - additional context
 */
export async function logActivity({
    patient_id,
    care_episode_id = null,
    actor_id = null,
    module_type,
    action_type,
    reference_id = null,
    description = null,
    metadata = null,
}) {
    try {
        const { error } = await supabase
            .from("activity_log")
            .insert({
                patient_id,
                care_episode_id,
                actor_id,
                module_type,
                action_type,
                reference_id,
                description,
                metadata,
            });

        if (error) {
            console.error("Activity log insert error:", error);
        }
    } catch (err) {
        // Activity logging should never block the main flow
        console.error("logActivity error:", err);
    }
}

/**
 * Query activity logs
 * @param {object} filters - { patient_id, care_episode_id, module_type, action_type, page, limit }
 * @returns {object} { success, data, pagination, error }
 */
export async function queryActivityLogs(filters = {}) {
    try {
        const { patient_id, care_episode_id, module_type, action_type, page = 1, limit = 50 } = filters;
        const offset = (page - 1) * limit;

        let query = supabase
            .from("activity_log")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (patient_id) query = query.eq("patient_id", patient_id);
        if (care_episode_id) query = query.eq("care_episode_id", care_episode_id);
        if (module_type) query = query.eq("module_type", module_type);
        if (action_type) query = query.eq("action_type", action_type);

        const { data, count, error } = await query;
        if (error) throw error;

        return {
            success: true,
            data,
            pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
        };
    } catch (err) {
        console.error("queryActivityLogs error:", err);
        return { success: false, error: err.message };
    }
}
