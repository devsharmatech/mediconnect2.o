/**
 * API: Doctor Performance Scorecard (PDF Part 5-8)
 * 
 * GET /api/doctors/analytics/scorecard?doctor_id=xxx
 * 
 * Returns personalized performance metrics for the doctor.
 * Accessible by: Doctor (self), Admin
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const doctor_id = searchParams.get("doctor_id");

        if (!doctor_id) return failure("doctor_id is required");

        // 1. Fetch total consultations for this doctor
        const { data: consultations, error: cErr } = await supabase
            .from("consultations")
            .select("id, case_status, override_reason, created_at")
            .eq("doctor_id", doctor_id);

        if (cErr) throw cErr;

        const total = consultations.length;
        if (total === 0) {
            return success("No data for this doctor", {
                total_consultations: 0,
                safety_score: "0%",
                quality_score: "0%",
                patient_impact: "0%"
            });
        }

        // 2. Safety Score (Consultations WITHOUT overrides / Total)
        const overridesCount = consultations.filter(c => c.override_reason).length;
        const safety_score = Math.round(((total - overridesCount) / total) * 100);

        // 3. Documentation Quality Score
        const { data: qualityFlags, error: qErr } = await supabase
            .from("consultation_quality_flag")
            .select("quality_level")
            .in("consultation_id", consultations.map(c => c.id));

        if (qErr) throw qErr;

        const lowQualityCount = qualityFlags?.filter(f => f.quality_level === 'LOW').length || 0;
        const quality_score = Math.round(((total - lowQualityCount) / total) * 100);

        // 4. Patient Care Index (Average improvement from Outcomes)
        const { data: outcomes, error: oErr } = await supabase
            .from("consultation_outcome")
            .select("improvement_status")
            .in("consultation_id", consultations.map(c => c.id));

        if (oErr) throw oErr;

        const improvedCount = outcomes?.filter(o => o.improvement_status?.toLowerCase() === 'better').length || 0;
        const patient_impact = outcomes?.length > 0
            ? `${Math.round((improvedCount / outcomes.length) * 100)}%`
            : "0%";

        return success("Doctor scorecard retrieved", {
            total_consultations: total,
            safety_score: `${safety_score}%`,
            quality_score: `${quality_score}%`,
            patient_impact,
            details: {
                total_overrides: overridesCount,
                total_outcomes_reported: outcomes?.length || 0,
                low_quality_sessions: lowQualityCount
            },
            last_updated: new Date().toISOString()
        });

    } catch (err) {
        console.error("GET /api/doctors/analytics/scorecard error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
