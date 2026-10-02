/**
 * API: Manual Intervention Panel (Admin Panel — PDF Part 8-11A)
 * 
 * GET  /api/admin/manual-intervention — List failed items needing manual action
 * POST /api/admin/manual-intervention — Trigger manual action on a failed item
 * 
 * Surfaces:
 * - Failed service orders (from retry_queue with status=failed)
 * - Failed payment transactions
 * - Unresolved HIGH clinical risks
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
 * GET — List items requiring manual intervention
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "all";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        const result = { failed_retries: [], unresolved_risks: [], failed_payments: [] };

        // 1. Permanently failed retry queue items
        if (type === "all" || type === "retry") {
            try {
                const retries = await sql`
                    SELECT *
                    FROM retry_queue
                    WHERE status = 'failed'
                    ORDER BY completed_at DESC NULLS LAST, created_at DESC
                    LIMIT ${limit} OFFSET ${offset}
                `;
                result.failed_retries = retries || [];
            } catch (rErr) {
                console.warn("retry_queue query failed:", rErr.message);
            }
        }

        // 2. Unresolved HIGH clinical risks (open > 24 hrs)
        if (type === "all" || type === "risk") {
            const slaThreshold = new Date();
            slaThreshold.setDate(slaThreshold.getDate() - 1);

            try {
                const risks = await sql`
                    SELECT *
                    FROM clinical_risk_flags
                    WHERE severity = 'HIGH'
                      AND resolved = false
                      AND created_at <= ${slaThreshold.toISOString()}
                    ORDER BY created_at ASC
                    LIMIT ${limit} OFFSET ${offset}
                `;

                const riskList = risks || [];

                // Fetch consultation details separately
                if (riskList.length > 0) {
                    const cIds = [...new Set(riskList.map(r => r.consultation_id).filter(Boolean))];
                    if (cIds.length > 0) {
                        const consultations = await sql`
                            SELECT id, doctor_id, patient_id
                            FROM consultations
                            WHERE id = ANY(${cIds})
                        `;
                        const cMap = {};
                        (consultations || []).forEach(c => { cMap[c.id] = c; });
                        riskList.forEach(r => { r.consultation = cMap[r.consultation_id] || null; });
                    }
                }

                result.unresolved_risks = riskList;
            } catch (e) {
                console.warn("Risk query failed:", e.message);
            }
        }

        // 3. Failed payment transactions
        if (type === "all" || type === "payment") {
            try {
                const payments = await sql`
                    SELECT *
                    FROM financial_transaction_log
                    WHERE status = 'failed'
                    ORDER BY created_at DESC
                    LIMIT ${limit} OFFSET ${offset}
                `;
                result.failed_payments = payments || [];
            } catch (pErr) {
                console.warn("financial_transaction_log query failed:", pErr.message);
            }
        }

        const totalItems =
            result.failed_retries.length +
            result.unresolved_risks.length +
            result.failed_payments.length;

        return success("Manual intervention items retrieved", {
            ...result,
            summary: {
                failed_retries: result.failed_retries.length,
                unresolved_risks: result.unresolved_risks.length,
                failed_payments: result.failed_payments.length,
                total: totalItems,
            },
        });

    } catch (err) {
        console.error("GET /api/admin/manual-intervention error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * POST — Trigger manual action
 * Body: { action_type, item_id, action, admin_id, notes? }
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { action_type, item_id, action, admin_id, notes } = body;

        if (!action_type || !item_id || !action || !admin_id) {
            return failure("action_type, item_id, action, and admin_id are required");
        }

        let result;

        switch (action_type) {
            case "retry": {
                const intId = parseInt(item_id, 10);
                if (action === "reset") {
                    const updated = await sql`
                        UPDATE retry_queue
                        SET 
                            status = 'pending',
                            retry_count = 0,
                            next_retry_at = NOW(),
                            last_error = ${`Manual reset by admin ${admin_id}. ${notes || ""}`}
                        WHERE id = ${intId}
                        RETURNING *
                    `;
                    result = updated[0] || null;
                } else if (action === "dismiss") {
                    const updated = await sql`
                        UPDATE retry_queue
                        SET 
                            status = 'dismissed',
                            last_error = ${`Dismissed by admin ${admin_id}. ${notes || ""}`}
                        WHERE id = ${intId}
                        RETURNING *
                    `;
                    result = updated[0] || null;
                }
                break;
            }

            case "risk": {
                const validAdminId = safeUuid(admin_id);
                const updated = await sql`
                    UPDATE clinical_risk_flags
                    SET 
                        resolved = true,
                        resolution_status = ${action},
                        reviewed_by = ${validAdminId},
                        reviewed_at = NOW(),
                        notes = ${notes || null}
                    WHERE id = ${item_id}
                    RETURNING *
                `;
                result = updated[0] || null;
                break;
            }

            case "followup": {
                const consultations = await sql`
                    SELECT patient_id, doctor_id
                    FROM consultations
                    WHERE id = ${item_id}
                    LIMIT 1
                `;

                if (consultations && consultations.length > 0) {
                    const consultation = consultations[0];
                    if (consultation.patient_id) {
                        try {
                            await sql`
                                INSERT INTO notifications (
                                    user_id, title, message, type, metadata, created_at
                                ) VALUES (
                                    ${consultation.patient_id},
                                    'Important: Follow-up required',
                                    ${notes || "Your care team has requested a follow-up. Please respond at your earliest convenience."},
                                    'manual_followup',
                                    ${JSON.stringify({ consultation_id: item_id, triggered_by: admin_id })},
                                    NOW()
                                )
                            `;
                        } catch (notifErr) {
                            console.warn("Failed to create notification:", notifErr.message);
                        }
                    }

                    result = { notification_sent: true, patient_id: consultation.patient_id };
                }
                break;
            }

            case "payment": {
                const updated = await sql`
                    UPDATE financial_transaction_log
                    SET 
                        status = ${action === "retry" ? "pending" : "cancelled"},
                        description = ${`Admin action: ${action}. ${notes || ""}`}
                    WHERE id = ${item_id}
                    RETURNING *
                `;
                result = updated[0] || null;
                break;
            }

            default:
                return failure("Invalid action_type. Use: retry, risk, followup, payment");
        }

        return success("Manual action completed", result);

    } catch (err) {
        console.error("POST /api/admin/manual-intervention error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
