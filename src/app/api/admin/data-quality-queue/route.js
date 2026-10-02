/**
 * API: Data Quality Queue (Admin Panel — PDF Part 4-11)
 * 
 * GET  /api/admin/data-quality-queue — List LOW quality consultations + unstructured meds
 * PUT  /api/admin/data-quality-queue — Resolve/clean a data quality issue
 */

import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeUuid(val) {
  if (!val) return null;
  return UUID_REGEX.test(val) ? val : null;
}

/**
 * GET — List data quality issues
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "all";
        const status = searchParams.get("status") || "pending";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        let qualityFlags = [];
        let unstructuredMeds = [];
        let totalCount = 0;

        // Fetch LOW quality consultations
        if (type === "all" || type === "quality_flag") {
            try {
                const [countRes, flags] = await Promise.all([
                    sql`SELECT count(*)::int as count FROM consultation_quality_flag WHERE quality_level = 'LOW'`,
                    sql`
                        SELECT * 
                        FROM consultation_quality_flag 
                        WHERE quality_level = 'LOW' 
                        ORDER BY created_at DESC 
                        LIMIT ${limit} OFFSET ${offset}
                    `
                ]);

                qualityFlags = flags || [];
                totalCount += countRes[0]?.count || 0;

                // Fetch related consultations separately
                if (qualityFlags.length > 0) {
                    const cIds = [...new Set(qualityFlags.map(f => f.consultation_id).filter(Boolean))];
                    if (cIds.length > 0) {
                        const consultations = await sql`
                            SELECT id, patient_id, doctor_id, case_status, created_at
                            FROM consultations
                            WHERE id = ANY(${cIds})
                        `;
                        const cMap = {};
                        (consultations || []).forEach(c => { cMap[c.id] = c; });
                        qualityFlags.forEach(f => { f.consultation = cMap[f.consultation_id] || null; });
                    }
                }
            } catch (e) {
                console.warn("Quality flag query failed:", e.message);
            }
        }

        // Fetch unstructured medication issues
        if (type === "all" || type === "unstructured_med") {
            const conditions = [];
            if (status === "pending") conditions.push(sql`status = 'pending'`);
            if (status === "resolved") conditions.push(sql`status = 'resolved'`);

            const whereClause = conditions.length > 0
                ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
                : sql``;

            const [countRes, meds] = await Promise.all([
                sql`SELECT count(*)::int as count FROM data_quality_queue ${whereClause}`,
                sql`
                    SELECT * 
                    FROM data_quality_queue 
                    ${whereClause} 
                    ORDER BY created_at DESC 
                    LIMIT ${limit} OFFSET ${offset}
                `
            ]);

            unstructuredMeds = meds || [];
            totalCount += countRes[0]?.count || 0;
        }

        return success("Data quality queue retrieved", {
            quality_flags: qualityFlags,
            unstructured_meds: unstructuredMeds,
            pagination: { page, limit, total: totalCount },
        });

    } catch (err) {
        console.error("GET /api/admin/data-quality-queue error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * PUT — Resolve a data quality issue
 * Body: { item_id, table: "data_quality_queue"|"consultation_quality_flag", action, resolved_by }
 */
export async function PUT(req) {
    try {
        const body = await req.json();
        const { item_id, table, action, resolved_by } = body;

        if (!item_id || !table || !resolved_by) {
            return failure("item_id, table, and resolved_by are required");
        }

        const validResolvedBy = safeUuid(resolved_by);

        if (table === "data_quality_queue") {
            const updatedRows = await sql`
                UPDATE data_quality_queue
                SET
                    status = 'resolved',
                    resolved_by = ${validResolvedBy},
                    resolved_at = NOW()
                WHERE id = ${item_id}
                RETURNING *
            `;

            if (!updatedRows || updatedRows.length === 0) {
                return failure("Queue item not found", null, 404);
            }

            return success("Issue resolved", updatedRows[0]);
        }

        if (table === "consultation_quality_flag") {
            const newQuality = action === "upgrade" ? "MEDIUM" : "LOW";
            const updatedRows = await sql`
                UPDATE consultation_quality_flag
                SET quality_level = ${newQuality}
                WHERE consultation_id = ${item_id} OR id = ${item_id}
                RETURNING *
            `;

            if (!updatedRows || updatedRows.length === 0) {
                return failure("Quality flag not found", null, 404);
            }

            return success("Quality flag updated", updatedRows[0]);
        }

        return failure("Invalid table. Use 'data_quality_queue' or 'consultation_quality_flag'.");

    } catch (err) {
        console.error("PUT /api/admin/data-quality-queue error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
