/**
 * LAYER-1: Audit Logger
 * 
 * Immutable state change tracker for compliance and traceability.
 * Used for: status changes, overrides, financial actions, admin actions.
 * Insert-only — no updates, no deletes (enforced by DB trigger).
 */

import { supabase } from "../supabaseAdmin";

/**
 * Log an audit entry
 * @param {object} params
 * @param {string} params.entity_type - consultation | appointment | lab_order | nursing_lead | financial | user
 * @param {string} params.entity_id - UUID of the entity
 * @param {object} [params.previous_state] - snapshot of state before change
 * @param {object} [params.new_state] - snapshot of state after change
 * @param {string} [params.change_description] - human-readable summary
 * @param {string} [params.changed_by] - UUID of user who made the change
 */
export async function logAudit({
    entity_type,
    entity_id,
    previous_state = null,
    new_state = null,
    change_description = null,
    changed_by = null,
}) {
    try {
        const { error } = await supabase
            .from("audit_log")
            .insert({
                entity_type,
                entity_id,
                previous_state,
                new_state,
                change_description,
                changed_by,
            });

        if (error) {
            console.error("Audit log insert error:", error);
        }
    } catch (err) {
        // Audit logging should never block the main flow
        console.error("logAudit error:", err);
    }
}

/**
 * Query audit logs for a specific entity
 * @param {object} filters - { entity_type, entity_id, changed_by, page, limit }
 * @returns {object} { success, data, pagination, error }
 */
export async function queryAuditLogs(filters = {}) {
    try {
        const { entity_type, entity_id, changed_by, page = 1, limit = 50 } = filters;
        const offset = (page - 1) * limit;

        let query = supabase
            .from("audit_log")
            .select("*", { count: "exact" })
            .order("changed_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (entity_type) query = query.eq("entity_type", entity_type);
        if (entity_id) query = query.eq("entity_id", entity_id);
        if (changed_by) query = query.eq("changed_by", changed_by);

        const { data, count, error } = await query;
        if (error) throw error;

        return {
            success: true,
            data,
            pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
        };
    } catch (err) {
        console.error("queryAuditLogs error:", err);
        return { success: false, error: err.message };
    }
}
