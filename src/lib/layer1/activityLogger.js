/**
 * LAYER-1: Activity Logger
 * 
 * Logs cross-module events for patient activity tracking via AWS RDS PostgreSQL.
 */

import sql from "@/lib/db";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeUuid(val) {
  if (!val) return null;
  return UUID_REGEX.test(val) ? val : null;
}

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
        await sql`
            INSERT INTO activity_log (
                patient_id,
                care_episode_id,
                actor_id,
                module_type,
                action_type,
                reference_id,
                description,
                metadata,
                created_at
            ) VALUES (
                ${safeUuid(patient_id)},
                ${safeUuid(care_episode_id)},
                ${safeUuid(actor_id)},
                ${module_type},
                ${action_type},
                ${safeUuid(reference_id)},
                ${description},
                ${metadata ? JSON.stringify(metadata) : null},
                NOW()
            )
        `;
    } catch (err) {
        console.warn("logActivity error:", err.message);
    }
}

export async function queryActivityLogs(filters = {}) {
    try {
        const { patient_id, care_episode_id, module_type, action_type, page = 1, limit = 50 } = filters;
        const offset = (page - 1) * limit;

        const conditions = [];

        if (patient_id && safeUuid(patient_id)) conditions.push(sql`patient_id = ${patient_id}`);
        if (care_episode_id && safeUuid(care_episode_id)) conditions.push(sql`care_episode_id = ${care_episode_id}`);
        if (module_type) conditions.push(sql`module_type = ${module_type}`);
        if (action_type) conditions.push(sql`action_type = ${action_type}`);

        const whereClause = conditions.length > 0
            ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
            : sql``;

        const [countRes, data] = await Promise.all([
            sql`SELECT count(*)::int as count FROM activity_log ${whereClause}`,
            sql`
                SELECT * 
                FROM activity_log 
                ${whereClause} 
                ORDER BY created_at DESC 
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
        console.error("queryActivityLogs error:", err);
        return { success: false, error: err.message };
    }
}
