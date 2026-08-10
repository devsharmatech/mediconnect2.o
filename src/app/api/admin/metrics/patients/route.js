import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/metrics/patients
 * Analyzes patient engagement and drop-off metrics
 */
export async function GET() {
    try {
        // Engagement Overview
        const { data: profiles } = await supabase
            .from("user_engagement_profile")
            .select("engagement_score, fatigue_score");

        let highlyEngaged = 0, moderate = 0, low = 0, atRisk = 0;
        let highFatigue = 0;

        if (profiles) {
            profiles.forEach(p => {
                if (p.engagement_score >= 80) highlyEngaged++;
                else if (p.engagement_score >= 50) moderate++;
                else if (p.engagement_score >= 20) low++;
                else atRisk++;

                if (p.fatigue_score >= 5) highFatigue++;
            });
        }

        // Drop-off rate (mock calculated for read-only view)
        const { count: totalSignals } = await supabase.from("service_signal_log").select("*", { count: "exact", head: true });
        const { count: dropoffSignals } = await supabase.from("service_signal_log").select("*", { count: "exact", head: true }).eq("type", "DROPOFF");

        return success("Patient metrics fetched", {
            engagement_distribution: {
                highly_engaged: highlyEngaged,
                moderate: moderate,
                low: low,
                at_risk: atRisk
            },
            fatigue: {
                high_fatigue_users: highFatigue
            },
            drop_off_rate: totalSignals ? ((dropoffSignals || 0) / totalSignals * 100).toFixed(2) + "%" : "0%"
        });

    } catch (err) {
        console.error("GET /api/admin/metrics/patients error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
