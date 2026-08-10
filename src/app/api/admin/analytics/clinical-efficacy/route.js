/**
 * API: Clinical Efficacy Dashboard (PDF Part 5-4)
 * 
 * GET /api/admin/analytics/clinical-efficacy
 * 
 * Correlates initial symptoms (Baseline) with patient feedback (Outcome)
 * to demonstrate platform medical impact.
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "1000");

        // 1. Fetch outcomes (simple query, no broken joins)
        const { data: outcomes, error: outErr } = await supabase
            .from("consultation_outcome")
            .select("*")
            .order("reported_at", { ascending: false })
            .limit(limit);

        // Graceful fallback if table doesn't exist yet
        const data = outErr ? [] : (outcomes || []);

        // 2. Fetch baselines separately for severity correlation
        let baselineMap = {};
        if (data.length > 0) {
            const consultationIds = [...new Set(data.map(d => d.consultation_id).filter(Boolean))];
            if (consultationIds.length > 0) {
                const { data: baselines } = await supabase
                    .from("consultation_baseline")
                    .select("consultation_id, severity, duration")
                    .in("consultation_id", consultationIds);
                
                if (baselines) {
                    baselines.forEach(b => { baselineMap[b.consultation_id] = b; });
                }
            }
        }

        // 3. Aggregate Results
        const stats = {
            total_outcomes: data.length,
            improvement_rates: {
                better: 0,
                same: 0,
                worse: 0
            },
            by_initial_severity: {
                SEVERE: { better: 0, total: 0 },
                MODERATE: { better: 0, total: 0 },
                MILD: { better: 0, total: 0 },
                NORMAL: { better: 0, total: 0 }
            },
            compliance_adherence: {
                full: 0,
                partial: 0,
                none: 0
            }
        };

        data.forEach(item => {
            const status = item.improvement_status?.toLowerCase();
            if (stats.improvement_rates[status] !== undefined) {
                stats.improvement_rates[status]++;
            }

            const baseline = baselineMap[item.consultation_id];
            const severity = baseline?.severity || "NORMAL";
            if (stats.by_initial_severity[severity]) {
                stats.by_initial_severity[severity].total++;
                if (status === "better") {
                    stats.by_initial_severity[severity].better++;
                }
            }

            const adherence = item.adherence?.toLowerCase();
            if (stats.compliance_adherence[adherence] !== undefined) {
                stats.compliance_adherence[adherence]++;
            }
        });

        // 4. Calculate Percentages
        const efficacy_index = stats.total_outcomes > 0 
            ? Math.round((stats.improvement_rates.better / stats.total_outcomes) * 100) 
            : 0;

        return success("Clinical efficacy analytics retrieved", {
            efficacy_index: `${efficacy_index}%`,
            raw_stats: stats,
            last_updated: new Date().toISOString()
        });

    } catch (err) {
        console.error("GET /api/admin/analytics/clinical-efficacy error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

