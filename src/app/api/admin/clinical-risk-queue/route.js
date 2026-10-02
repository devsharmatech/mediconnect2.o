/**
 * API: Clinical Risk Queue (Admin Panel — PDF Part 2A)
 * 
 * GET  /api/admin/clinical-risk-queue — List all risk flags (with filters)
 * PUT  /api/admin/clinical-risk-queue — Resolve/escalate a risk flag
 * 
 * Admin must review HIGH severity clinical risks and mark them as:
 * - RESOLVED_SAFE
 * - REQUIRES_FOLLOWUP
 * - ESCALATED
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
 * GET — List clinical risk flags with filters
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const severity = searchParams.get("severity");
        const resolved = searchParams.get("resolved");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        const conditions = [];

        if (severity) conditions.push(sql`severity = ${severity}`);
        if (resolved === "true") conditions.push(sql`resolved = true`);
        if (resolved === "false") conditions.push(sql`resolved = false`);

        const whereClause = conditions.length > 0
            ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
            : sql``;

        const [countRes, flags] = await Promise.all([
            sql`SELECT count(*)::int as count FROM clinical_risk_flags ${whereClause}`,
            sql`
                SELECT * 
                FROM clinical_risk_flags 
                ${whereClause} 
                ORDER BY created_at DESC 
                LIMIT ${limit} OFFSET ${offset}
            `
        ]);

        const count = countRes[0]?.count || 0;
        const flagList = flags || [];

        // Fetch related consultations separately
        if (flagList.length > 0) {
            const consultationIds = [...new Set(flagList.map(f => f.consultation_id).filter(Boolean))];
            if (consultationIds.length > 0) {
                const consultations = await sql`
                    SELECT id, patient_id, doctor_id, case_status, created_at
                    FROM consultations
                    WHERE id = ANY(${consultationIds})
                `;
                
                const cMap = {};
                (consultations || []).forEach(c => { cMap[c.id] = c; });
                flagList.forEach(f => { f.consultation = cMap[f.consultation_id] || null; });
            }
        }

        const summary = {
            total: count,
            unresolved: flagList.filter(f => !f.resolved).length,
            high: flagList.filter(f => f.severity === "HIGH").length,
        };

        return success("Clinical risk queue retrieved", {
            flags: flagList,
            summary,
            pagination: { page, limit, total: count },
        });

    } catch (err) {
        console.error("GET /api/admin/clinical-risk-queue error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * PUT — Resolve or escalate a clinical risk flag
 * Body: { flag_id, resolution_status, reviewed_by, notes? }
 */
export async function PUT(req) {
    try {
        const body = await req.json();
        const { flag_id, resolution_status, reviewed_by, notes } = body;

        if (!flag_id || !resolution_status || !reviewed_by) {
            return failure("flag_id, resolution_status, and reviewed_by are required");
        }

        const VALID_STATUSES = ["RESOLVED_SAFE", "REQUIRES_FOLLOWUP", "ESCALATED"];
        if (!VALID_STATUSES.includes(resolution_status)) {
            return failure(`resolution_status must be one of: ${VALID_STATUSES.join(", ")}`);
        }

        const validReviewerId = safeUuid(reviewed_by);

        const updatedRows = await sql`
            UPDATE clinical_risk_flags
            SET
                resolved = ${resolution_status === "RESOLVED_SAFE"},
                resolution_status = ${resolution_status},
                reviewed_by = ${validReviewerId},
                reviewed_at = NOW(),
                notes = ${notes || null}
            WHERE id = ${flag_id}
            RETURNING *
        `;

        if (!updatedRows || updatedRows.length === 0) {
            return failure("Risk flag not found", null, 404);
        }

        const data = updatedRows[0];

        // If ESCALATED, notify the doctor
        if (resolution_status === "ESCALATED" && data?.consultation_id) {
            const consultation = await sql`
                SELECT doctor_id FROM consultations WHERE id = ${data.consultation_id} LIMIT 1
            `;

            if (consultation && consultation.length > 0 && consultation[0].doctor_id) {
                try {
                    await sql`
                        INSERT INTO notifications (
                            user_id, title, message, type, metadata, created_at
                        ) VALUES (
                            ${consultation[0].doctor_id},
                            'Clinical risk identified — please review',
                            ${`A clinical risk flag (${data.risk_type}) on your consultation has been escalated for review.`},
                            'clinical_risk_escalation',
                            ${JSON.stringify({ consultation_id: data.consultation_id, flag_id })},
                            NOW()
                        )
                    `;
                } catch (notifErr) {
                    console.warn("Failed to insert escalation notification:", notifErr.message);
                }
            }
        }

        return success("Risk flag updated", data);

    } catch (err) {
        console.error("PUT /api/admin/clinical-risk-queue error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
