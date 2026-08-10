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
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET — List items requiring manual intervention
 * Query: ?type=all|retry|risk|payment&page=1&limit=20
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
            const { data } = await supabase
                .from("retry_queue")
                .select("*")
                .eq("status", "failed")
                .order("completed_at", { ascending: false })
                .range(offset, offset + limit - 1);

            result.failed_retries = data || [];
        }

        // 2. Unresolved HIGH clinical risks (open > 24 hrs)
        if (type === "all" || type === "risk") {
            const slaThreshold = new Date();
            slaThreshold.setDate(slaThreshold.getDate() - 1);

            try {
                const { data } = await supabase
                    .from("clinical_risk_flags")
                    .select("*")
                    .eq("severity", "HIGH")
                    .eq("resolved", false)
                    .lte("created_at", slaThreshold.toISOString())
                    .order("created_at", { ascending: true })
                    .range(offset, offset + limit - 1);

                const risks = data || [];

                // Fetch consultation details separately
                if (risks.length > 0) {
                    const cIds = [...new Set(risks.map(r => r.consultation_id).filter(Boolean))];
                    if (cIds.length > 0) {
                        const { data: consultations } = await supabase
                            .from("consultations")
                            .select("id, doctor_id, patient_id")
                            .in("id", cIds);
                        const cMap = {};
                        (consultations || []).forEach(c => { cMap[c.id] = c; });
                        risks.forEach(r => { r.consultation = cMap[r.consultation_id] || null; });
                    }
                }

                result.unresolved_risks = risks;
            } catch (e) {
                console.warn("Risk query failed:", e.message);
            }
        }

        // 3. Failed payment transactions
        if (type === "all" || type === "payment") {
            const { data } = await supabase
                .from("financial_transaction_log")
                .select("*")
                .eq("status", "failed")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            result.failed_payments = data || [];
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
 * 
 * action_type: "retry" | "risk" | "payment" | "followup"
 * action: depends on type
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
                // Reset failed retry item for re-processing
                if (action === "reset") {
                    const { data, error } = await supabase
                        .from("retry_queue")
                        .update({
                            status: "pending",
                            retry_count: 0,
                            next_retry_at: new Date().toISOString(),
                            last_error: `Manual reset by admin ${admin_id}. ${notes || ""}`,
                        })
                        .eq("id", item_id)
                        .select()
                        .single();

                    if (error) throw error;
                    result = data;
                } else if (action === "dismiss") {
                    const { data, error } = await supabase
                        .from("retry_queue")
                        .update({
                            status: "dismissed",
                            last_error: `Dismissed by admin ${admin_id}. ${notes || ""}`,
                        })
                        .eq("id", item_id)
                        .select()
                        .single();

                    if (error) throw error;
                    result = data;
                }
                break;
            }

            case "risk": {
                // Resolve clinical risk with admin action
                const { data, error } = await supabase
                    .from("clinical_risk_flags")
                    .update({
                        resolved: true,
                        resolution_status: action,
                        reviewed_by: admin_id,
                        reviewed_at: new Date().toISOString(),
                        notes: notes || null,
                    })
                    .eq("id", item_id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
                break;
            }

            case "followup": {
                // Trigger manual follow-up notification to patient
                const { data: consultation } = await supabase
                    .from("consultations")
                    .select("patient_id, doctor_id")
                    .eq("id", item_id)
                    .single();

                if (consultation) {
                    await supabase
                        .from("notifications")
                        .insert({
                            user_id: consultation.patient_id,
                            title: "Important: Follow-up required",
                            message: notes || "Your care team has requested a follow-up. Please respond at your earliest convenience.",
                            type: "manual_followup",
                            metadata: { consultation_id: item_id, triggered_by: admin_id },
                        });

                    result = { notification_sent: true, patient_id: consultation.patient_id };
                }
                break;
            }

            case "payment": {
                // Mark failed payment for re-processing
                const { data, error } = await supabase
                    .from("financial_transaction_log")
                    .update({
                        status: action === "retry" ? "pending" : "cancelled",
                        notes: `Admin action: ${action}. ${notes || ""}`,
                    })
                    .eq("id", item_id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
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
