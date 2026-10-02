/**
 * LAYER-1: Audit Logger
 * 
 * Immutable state change tracker for compliance and traceability using AWS RDS PostgreSQL.
 * Used for: status changes, overrides, financial actions, admin actions.
 * Insert-only — no updates, no deletes.
 */

import sql from "@/lib/db";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeUuid(val) {
  if (!val) return null;
  return UUID_REGEX.test(val) ? val : null;
}

/**
 * Log an audit entry
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
        const cleanEntityId = safeUuid(entity_id);
        const cleanChangedBy = safeUuid(changed_by);

        await sql`
            INSERT INTO audit_log (
                entity_type,
                entity_id,
                previous_state,
                new_state,
                change_description,
                changed_by,
                changed_at
            ) VALUES (
                ${entity_type || 'unknown'},
                ${cleanEntityId},
                ${previous_state ? JSON.stringify(previous_state) : null},
                ${new_state ? JSON.stringify(new_state) : null},
                ${change_description || null},
                ${cleanChangedBy},
                NOW()
            )
        `;
    } catch (err) {
        // Audit logging should never block the main flow
        console.warn("logAudit error:", err.message);
    }
}

/**
 * Query audit logs for a specific entity
 */
export async function queryAuditLogs(filters = {}) {
    try {
        const { entity_type, entity_id, changed_by, page = 1, limit = 50 } = filters;
        const offset = (page - 1) * limit;

        const conditions = [];

        if (entity_type) conditions.push(sql`entity_type = ${entity_type}`);
        if (entity_id && safeUuid(entity_id)) conditions.push(sql`entity_id = ${entity_id}`);
        if (changed_by && safeUuid(changed_by)) conditions.push(sql`changed_by = ${changed_by}`);

        const whereClause = conditions.length > 0
            ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
            : sql``;

        const [countRes, data] = await Promise.all([
            sql`SELECT count(*)::int as count FROM audit_log ${whereClause}`,
            sql`
                SELECT * 
                FROM audit_log 
                ${whereClause} 
                ORDER BY changed_at DESC 
                LIMIT ${limit} OFFSET ${offset}
            `
        ]);

        const count = countRes[0]?.count || 0;

        return {
            success: true,
            data: data || [],
            pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
        };
    } catch (err) {
        console.error("queryAuditLogs error:", err);
        return { success: false, error: err.message };
    }
}
