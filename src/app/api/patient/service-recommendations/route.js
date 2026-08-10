/**
 * API: Post-Consultation Service Recommendations (PDF Part 8-3A)
 *
 * GET /api/patient/service-recommendations?consultation_id=xxx
 *
 * Returns recommended services after consultation completion.
 * Recommendations are derived from prescription_service_map (pre-computed by
 * the service dispatcher), NOT from consultation_clinical directly.
 *
 * LAYER-111 FIX (Phase 2D):
 *  - Removed direct read of consultation_clinical (clinical layer bleed).
 *  - Now reads from prescription_service_map / service_recommendation tables.
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { getRankedProviders } from "@/lib/layer1/providerRanking";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const consultation_id = searchParams.get("consultation_id");

        if (!consultation_id) return failure("consultation_id is required");

        // ── Get service context from prescription_service_map (service layer DTO) ──
        // This is the correct abstraction: clinical data was already processed and
        // mapped to a service payload by the service dispatcher at completion time.
        const { data: serviceMapRows } = await supabase
            .from("prescription_service_map")
            .select("service_type, payload")
            .eq("consultation_id", consultation_id);

        // Extract diagnosis/problem from the DTO payload (not from clinical table directly)
        const serviceContext = (serviceMapRows || []).reduce((acc, row) => ({
            ...acc,
            diagnosis_id: row.payload?.diagnosis_id || acc.diagnosis_id,
            problem_id: row.payload?.problem_id || acc.problem_id,
        }), { diagnosis_id: null, problem_id: null });

        // Get service recommendations based on diagnosis/problem
        let recommendations = [];

        if (serviceContext.diagnosis_id) {
            const { data } = await supabase
                .from("service_recommendation")
                .select("*")
                .eq("diagnosis_id", serviceContext.diagnosis_id)
                .order("priority", { ascending: true })
                .limit(3);

            if (data) recommendations = [...data];
        }

        // Fallback to problem_id if no diagnosis-based recommendations
        if (recommendations.length === 0 && serviceContext.problem_id) {
            const { data } = await supabase
                .from("service_recommendation")
                .select("*")
                .eq("problem_id", serviceContext.problem_id)
                .order("priority", { ascending: true })
                .limit(3);

            if (data) recommendations = [...data];
        }

        // Fallback: if no service map exists yet (e.g., consultation just completed),
        // return an empty list gracefully rather than reading clinical data.
        if (recommendations.length === 0 && serviceMapRows?.length === 0) {
            return success("No service recommendations available yet", { recommendations: [] });
        }

        // Enrich with conversion stats + top-ranked provider
        const enriched = [];
        for (const rec of recommendations.slice(0, 2)) {
            let conversion_rate = null;

            if (serviceContext.diagnosis_id) {
                const { data: stats } = await supabase
                    .from("service_conversion_stats")
                    .select("conversion_rate")
                    .eq("diagnosis_id", serviceContext.diagnosis_id)
                    .eq("service_type", rec.service_type)
                    .single();

                conversion_rate = stats?.conversion_rate || null;
            }

            // Fetch top 3 ranked providers for this service type
            // Uses Layer-111 provider_ranking table (rank_score DESC)
            let top_providers = [];
            try {
                top_providers = await getRankedProviders(rec.service_type, { limit: 3 });
            } catch (_) {
                // Non-fatal — recommendations still work without ranking
            }

            enriched.push({
                service_type: rec.service_type,
                priority: rec.priority,
                conversion_rate,
                display_text: buildDisplayText(rec.service_type, conversion_rate),
                top_providers,   // ← ranked provider list for this service
            });
        }

        // Track that services were suggested
        if (enriched.length > 0) {
            await supabase
                .from("conversion_tracking")
                .upsert({
                    consultation_id,
                    service_suggested: true,
                    service_clicked: false,
                    service_completed: false,
                }, { onConflict: "consultation_id" });
        }

        return success("Service recommendations", {
            recommendations: enriched,
            urgency_message: "Start treatment within 2–4 hours for better recovery",
        });

    } catch (err) {
        console.error("GET /api/patient/service-recommendations error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * Build display text with social proof
 */
function buildDisplayText(service_type, conversion_rate) {
    const labels = {
        pharmacy: "Order Medicines",
        lab: "Book Lab Test",
        nursing: "Nursing Care Services",
    };

    const label = labels[service_type] || service_type;

    if (conversion_rate && conversion_rate > 0) {
        return `${label} — ${Math.round(conversion_rate * 100)}% patients chose this`;
    }

    return label;
}
