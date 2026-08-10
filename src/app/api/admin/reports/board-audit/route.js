/**
 * API: Weekly Board Audit Report (PDF Part 5-11)
 * 
 * GET /api/admin/reports/board-audit
 * 
 * Returns a high-level clinical audit summary for the medical board.
 * Includes: High-severity overrides, Quality trends, and Outcome metrics.
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Fetch consultations with override_reason in past 7 days
        let overrides = [];
        try {
            const { data: overrideData, error: oErr } = await supabase
                .from("consultations")
                .select("id, doctor_id, patient_id, override_reason, completed_at")
                .not("override_reason", "is", null)
                .gte("completed_at", sevenDaysAgo.toISOString())
                .order("completed_at", { ascending: false });

            if (!oErr && overrideData) {
                // Fetch doctor names separately
                const doctorIds = [...new Set(overrideData.map(o => o.doctor_id).filter(Boolean))];
                let doctorMap = {};
                if (doctorIds.length > 0) {
                    const { data: doctors } = await supabase
                        .from("doctor_details")
                        .select("id, full_name")
                        .in("id", doctorIds);
                    if (doctors) {
                        doctors.forEach(d => { doctorMap[d.id] = d.full_name; });
                    }
                }
                overrides = overrideData.map(o => ({
                    consultation_id: o.id,
                    doctor: doctorMap[o.doctor_id] || "Unknown",
                    reason: o.override_reason,
                    timestamp: o.completed_at
                }));
            }
        } catch (e) {
            console.warn("Override query failed (column may not exist yet):", e.message);
        }

        // 2. Fetch quality flag summary (graceful if table missing)
        let totalSessions = 0;
        let lowQualityCount = 0;
        try {
            const { data: qualityData, error: qErr } = await supabase
                .from("consultation_quality_flag")
                .select("id, quality_level, created_at")
                .gte("created_at", sevenDaysAgo.toISOString());

            if (!qErr && qualityData) {
                totalSessions = qualityData.length;
                lowQualityCount = qualityData.filter(q => q.quality_level === 'LOW').length;
            }
        } catch (e) {
            console.warn("Quality flag query failed (table may not exist yet):", e.message);
        }

        // 3. Fetch Outcomes for past 7 days
        let totalOutcomes = 0;
        let improvedOutcomes = 0;
        try {
            const { count: tCount } = await supabase
                .from("consultation_outcome")
                .select("id", { count: "exact", head: true })
                .gte("reported_at", sevenDaysAgo.toISOString());
            totalOutcomes = tCount || 0;

            const { count: iCount } = await supabase
                .from("consultation_outcome")
                .select("id", { count: "exact", head: true })
                .eq("improvement_status", "better")  // lowercase — matches DB enum values
                .gte("reported_at", sevenDaysAgo.toISOString());
            improvedOutcomes = iCount || 0;
        } catch (e) {
            console.warn("Outcome query failed (table may not exist yet):", e.message);
        }

        // 4. Aggregate Results
        const report = {
            period: {
                start: sevenDaysAgo.toISOString(),
                end: new Date().toISOString()
            },
            safety_audit: {
                total_high_risk_overrides: overrides.length,
                override_list: overrides
            },
            quality_audit: {
                total_sessions: totalSessions,
                low_quality_count: lowQualityCount,
                compliance_rate: totalSessions > 0 
                  ? `${Math.round(((totalSessions - lowQualityCount) / totalSessions) * 100)}%`
                  : "100%"
            },
            efficacy_audit: {
                outcomes_received: totalOutcomes,
                improvement_rate: totalOutcomes > 0 
                  ? `${Math.round((improvedOutcomes / totalOutcomes) * 100)}%`
                  : "0%"
            }
        };

        return success("Weekly Board Audit Report generated", report);

    } catch (err) {
        console.error("GET /api/admin/reports/board-audit error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

