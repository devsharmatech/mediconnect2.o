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
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET — List clinical risk flags with filters
 * Query: ?severity=HIGH&resolved=false&page=1&limit=20
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const severity = searchParams.get("severity");
        const resolved = searchParams.get("resolved");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        let query = supabase
            .from("clinical_risk_flags")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (severity) query = query.eq("severity", severity);
        if (resolved === "true") query = query.eq("resolved", true);
        if (resolved === "false") query = query.eq("resolved", false);

        const { data: flags, count, error } = await query;

        if (error) throw error;

        // Fetch related consultations separately
        const flagList = flags || [];
        if (flagList.length > 0) {
            const consultationIds = [...new Set(flagList.map(f => f.consultation_id).filter(Boolean))];
            if (consultationIds.length > 0) {
                const { data: consultations } = await supabase
                    .from("consultations")
                    .select("id, patient_id, doctor_id, case_status, created_at")
                    .in("id", consultationIds);
                
                const cMap = {};
                (consultations || []).forEach(c => { cMap[c.id] = c; });
                flagList.forEach(f => { f.consultation = cMap[f.consultation_id] || null; });
            }
        }

        const summary = {
            total: count || 0,
            unresolved: flagList.filter(f => !f.resolved).length || 0,
            high: flagList.filter(f => f.severity === "HIGH").length || 0,
        };

        return success("Clinical risk queue retrieved", {
            flags: flagList,
            summary,
            pagination: { page, limit, total: count || 0 },
        });

    } catch (err) {
        console.error("GET /api/admin/clinical-risk-queue error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * PUT — Resolve or escalate a clinical risk flag
 * Body: { flag_id, resolution_status, reviewed_by, notes? }
 * resolution_status: RESOLVED_SAFE | REQUIRES_FOLLOWUP | ESCALATED
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

        const { data, error } = await supabase
            .from("clinical_risk_flags")
            .update({
                resolved: resolution_status === "RESOLVED_SAFE",
                resolution_status,
                reviewed_by,
                reviewed_at: new Date().toISOString(),
                notes: notes || null,
            })
            .eq("id", flag_id)
            .select()
            .single();

        if (error) throw error;

        // If ESCALATED, notify the doctor
        if (resolution_status === "ESCALATED" && data?.consultation_id) {
            const { data: consultation } = await supabase
                .from("consultations")
                .select("doctor_id")
                .eq("id", data.consultation_id)
                .single();

            if (consultation?.doctor_id) {
                await supabase
                    .from("notifications")
                    .insert({
                        user_id: consultation.doctor_id,
                        title: "Clinical risk identified — please review",
                        message: `A clinical risk flag (${data.risk_type}) on your consultation has been escalated for review.`,
                        type: "clinical_risk_escalation",
                        metadata: { consultation_id: data.consultation_id, flag_id },
                    });
            }
        }

        return success("Risk flag updated", data);

    } catch (err) {
        console.error("PUT /api/admin/clinical-risk-queue error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
