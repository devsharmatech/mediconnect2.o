/**
 * API: Diagnosis Suggestions (PDF Part 5-3B)
 * 
 * GET /api/doctors/diagnosis-suggestions?complaint_id=xxx&doctor_id=xxx
 * 
 * Returns top 3 suggested diagnoses based on:
 * 1. diagnosis_suggestions table (global mapping)
 * 2. doctor_preferences table (doctor-specific history)
 * 3. Merged and ranked by priority + usage_count
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const complaint_id = searchParams.get("complaint_id");
        const doctor_id = searchParams.get("doctor_id");

        if (!complaint_id) return failure("complaint_id is required");

        const suggestions = [];

        // 1. Global suggestions (from diagnosis_suggestions table)
        const { data: globalSuggestions } = await supabase
            .from("diagnosis_suggestions")
            .select("*")
            .eq("complaint_id", complaint_id)
            .order("priority", { ascending: true })
            .limit(5);

        if (globalSuggestions) {
            for (const s of globalSuggestions) {
                suggestions.push({
                    diagnosis_id: s.diagnosis_id,
                    source: "global",
                    priority: s.priority,
                    usage_count: 0,
                });
            }
        }

        // 2. Doctor-specific preferences (from doctor_preferences table)
        if (doctor_id) {
            const { data: doctorPrefs } = await supabase
                .from("doctor_preferences")
                .select("*")
                .eq("doctor_id", doctor_id)
                .eq("problem_id", complaint_id)
                .order("usage_count", { ascending: false })
                .limit(5);

            if (doctorPrefs) {
                for (const p of doctorPrefs) {
                    // Check if already in suggestions
                    const existing = suggestions.find(s => s.diagnosis_id === p.diagnosis_id);
                    if (existing) {
                        existing.usage_count = p.usage_count;
                        existing.source = "doctor+global";
                        // Boost priority for doctor-preferred
                        existing.priority = Math.max(0, (existing.priority || 5) - 2);
                    } else {
                        suggestions.push({
                            diagnosis_id: p.diagnosis_id,
                            source: "doctor",
                            priority: 1, // Doctor preference > system default
                            usage_count: p.usage_count || 0,
                        });
                    }
                }
            }
        }

        // Sort: doctor preference first, then by priority, then by usage_count
        suggestions.sort((a, b) => {
            if (a.source.includes("doctor") && !b.source.includes("doctor")) return -1;
            if (!a.source.includes("doctor") && b.source.includes("doctor")) return 1;
            if (a.priority !== b.priority) return a.priority - b.priority;
            return b.usage_count - a.usage_count;
        });

        return success("Diagnosis suggestions retrieved", {
            suggestions: suggestions.slice(0, 3),
            total_available: suggestions.length,
        });

    } catch (err) {
        console.error("GET /api/doctors/diagnosis-suggestions error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
