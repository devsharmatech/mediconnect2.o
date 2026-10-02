/**
 * API: Diagnosis Suggestions (PDF Part 5-3B)
 * 
 * GET /api/doctors/diagnosis-suggestions?complaint_id=xxx&doctor_id=xxx
 * 
 * Returns suggested diagnoses based on:
 * 1. cr_complaint_diagnosis_map / cr_diagnosis_master (AWS RDS Clinical Repository)
 * 2. doctor_preferences / previous prescriptions in AWS RDS
 * 3. Merged and ranked by priority + usage_count
 */

import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const complaint_id = searchParams.get("complaint_id") || "general-illness";
        const doctor_id = searchParams.get("doctor_id");

        const cleanDocId = safeUuid(doctor_id);
        const suggestions = [];

        // 1. Doctor-specific preferences from doctor_preferences (if table has rows)
        if (cleanDocId) {
            try {
                const docPrefs = await sql`
                    SELECT problem_id, diagnosis_id, usage_count
                    FROM doctor_preferences
                    WHERE doctor_id = ${cleanDocId}
                    ORDER BY usage_count DESC
                    LIMIT 5
                `;
                for (const p of docPrefs) {
                    suggestions.push({
                        diagnosis_id: p.diagnosis_id,
                        diagnosis_name: p.diagnosis_id.charAt(0).toUpperCase() + p.diagnosis_id.slice(1).replace(/-/g, " "),
                        source: "doctor",
                        priority: 1,
                        usage_count: Number(p.usage_count) || 0,
                    });
                }
            } catch (prefErr) {
                console.warn("doctor_preferences note:", prefErr.message);
            }
        }

        // 2. Complaint-specific mapping from cr_complaint_diagnosis_map
        if (complaint_id && complaint_id !== "general-illness") {
            const mapped = await sql`
                SELECT 
                    diagnosis_id,
                    diagnosis_name,
                    match_strength,
                    priority_rank
                FROM cr_complaint_diagnosis_map
                WHERE canonical_complaint ILIKE ${'%' + complaint_id + '%'}
                   OR diagnosis_name ILIKE ${'%' + complaint_id + '%'}
                ORDER BY priority_rank ASC NULLS LAST
                LIMIT 6
            `;

            for (const m of mapped) {
                if (!suggestions.find(s => s.diagnosis_id === m.diagnosis_id || s.diagnosis_name === m.diagnosis_name)) {
                    suggestions.push({
                        diagnosis_id: m.diagnosis_id,
                        diagnosis_name: m.diagnosis_name,
                        source: "dataset-complaint-map",
                        priority: Number(m.priority_rank) || 2,
                        usage_count: Number(m.match_strength) || 90,
                    });
                }
            }
        }

        // 3. Fallback / Common Diagnoses from cr_diagnosis_master (630 items)
        if (suggestions.length < 5) {
            const commonDiags = await sql`
                SELECT diagnosis_id, diagnosis_name, priority_score
                FROM cr_diagnosis_master
                WHERE common_condition = 'true' AND active_status = 'true'
                ORDER BY priority_score ASC NULLS LAST, diagnosis_name ASC
                LIMIT 8
            `;

            for (const c of commonDiags) {
                if (!suggestions.find(s => s.diagnosis_id === c.diagnosis_id || s.diagnosis_name === c.diagnosis_name)) {
                    suggestions.push({
                        diagnosis_id: c.diagnosis_id,
                        diagnosis_name: c.diagnosis_name,
                        source: "clinical-repository",
                        priority: Number(c.priority_score) || 3,
                        usage_count: 50,
                    });
                }
                if (suggestions.length >= 6) break;
            }
        }

        // Sort: doctor preference first, then by priority, then by usage_count
        suggestions.sort((a, b) => {
            if (a.source === "doctor" && b.source !== "doctor") return -1;
            if (a.source !== "doctor" && b.source === "doctor") return 1;
            if (a.priority !== b.priority) return a.priority - b.priority;
            return (b.usage_count || 0) - (a.usage_count || 0);
        });

        return success("Diagnosis suggestions retrieved", {
            suggestions: suggestions.slice(0, 6),
            total_available: suggestions.length,
        });

    } catch (err) {
        console.error("GET /api/doctors/diagnosis-suggestions error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
