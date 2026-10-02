/**
 * API: Weekly Board Audit Report (PDF Part 5-11)
 * 
 * GET /api/admin/reports/board-audit
 * 
 * Returns a high-level clinical audit summary for the medical board via AWS RDS PostgreSQL.
 * Includes: High-severity overrides, Quality trends, and Outcome metrics.
 */

import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoISO = sevenDaysAgo.toISOString();

        // 1. Fetch consultations with override_reason in past 7 days joined with doctor_details
        let overrides = [];
        try {
            const overrideData = await sql`
                SELECT 
                    c.id, c.doctor_id, c.patient_id, c.override_reason, c.completed_at,
                    d.full_name as doctor_name
                FROM consultations c
                LEFT JOIN doctor_details d ON c.doctor_id = d.id
                WHERE c.override_reason IS NOT NULL
                  AND c.completed_at >= ${sevenDaysAgoISO}
                ORDER BY c.completed_at DESC
            `;

            overrides = (overrideData || []).map(o => ({
                consultation_id: o.id,
                doctor: o.doctor_name || "Unknown",
                reason: o.override_reason,
                timestamp: o.completed_at
            }));
        } catch (e) {
            console.warn("Override query failed:", e.message);
        }

        // 2. Fetch quality flag summary
        let totalSessions = 0;
        let lowQualityCount = 0;
        try {
            const qualityData = await sql`
                SELECT id, quality_level, created_at
                FROM consultation_quality_flag
                WHERE created_at >= ${sevenDaysAgoISO}
            `;

            if (qualityData) {
                totalSessions = qualityData.length;
                lowQualityCount = qualityData.filter(q => q.quality_level === 'LOW').length;
            }
        } catch (e) {
            console.warn("Quality flag query failed:", e.message);
        }

        // 3. Fetch Outcomes for past 7 days
        let totalOutcomes = 0;
        let improvedOutcomes = 0;
        try {
            const [
                [{ count: tCount }],
                [{ count: iCount }]
            ] = await Promise.all([
                sql`SELECT count(*)::int as count FROM consultation_outcome WHERE reported_at >= ${sevenDaysAgoISO}`,
                sql`SELECT count(*)::int as count FROM consultation_outcome WHERE improvement_status = 'better' AND reported_at >= ${sevenDaysAgoISO}`
            ]);

            totalOutcomes = Number(tCount) || 0;
            improvedOutcomes = Number(iCount) || 0;
        } catch (e) {
            console.warn("Outcome query failed:", e.message);
        }

        // 4. Aggregate Results
        const report = {
            period: {
                start: sevenDaysAgoISO,
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
