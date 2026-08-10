/**
 * API: Data Quality Queue (Admin Panel — PDF Part 4-11)
 * 
 * GET  /api/admin/data-quality-queue — List LOW quality consultations + unstructured meds
 * PUT  /api/admin/data-quality-queue — Resolve/clean a data quality issue
 * 
 * Shows:
 * - LOW quality consultations (from consultation_quality_flag)
 * - Unstructured medication entries (from data_quality_queue)
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET — List data quality issues
 * Query: ?type=all|quality_flag|unstructured_med&status=pending|resolved&page=1&limit=20
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
                const { data, count } = await supabase
                    .from("consultation_quality_flag")
                    .select("*", { count: "exact" })
                    .eq("quality_level", "LOW")
                    .order("created_at", { ascending: false })
                    .range(offset, offset + limit - 1);

                qualityFlags = data || [];
                totalCount += count || 0;

                // Fetch related consultations separately
                if (qualityFlags.length > 0) {
                    const cIds = [...new Set(qualityFlags.map(f => f.consultation_id).filter(Boolean))];
                    if (cIds.length > 0) {
                        const { data: consultations } = await supabase
                            .from("consultations")
                            .select("id, patient_id, doctor_id, case_status, created_at")
                            .in("id", cIds);
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
            let query = supabase
                .from("data_quality_queue")
                .select("*", { count: "exact" })
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (status === "pending") query = query.eq("status", "pending");
            if (status === "resolved") query = query.eq("status", "resolved");

            const { data, count } = await query;
            unstructuredMeds = data || [];
            totalCount += count || 0;
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

        if (table === "data_quality_queue") {
            const { data, error } = await supabase
                .from("data_quality_queue")
                .update({
                    status: "resolved",
                    resolved_by,
                    resolved_at: new Date().toISOString(),
                })
                .eq("id", item_id)
                .select()
                .single();

            if (error) throw error;
            return success("Issue resolved", data);
        }

        if (table === "consultation_quality_flag") {
            const { data, error } = await supabase
                .from("consultation_quality_flag")
                .update({
                    quality_level: action === "upgrade" ? "MEDIUM" : "LOW",
                    reviewed_by: resolved_by,
                    reviewed_at: new Date().toISOString(),
                })
                .eq("consultation_id", item_id)
                .select()
                .single();

            if (error) throw error;
            return success("Quality flag updated", data);
        }

        return failure("Invalid table. Use 'data_quality_queue' or 'consultation_quality_flag'.");

    } catch (err) {
        console.error("PUT /api/admin/data-quality-queue error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
