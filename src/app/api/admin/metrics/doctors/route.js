import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/metrics/doctors
 * Analyzes doctor performance and failure rates
 */
export async function GET() {
    try {
        const { data: logs } = await supabase
            .from("provider_performance_log")
            .select("provider_id, completion_rate, failure_count")
            .order("failure_count", { ascending: false })
            .limit(50);

        let totalDoctors = 0;
        let warningDoctors = 0;
        let avgCompletion = 0;

        if (logs && logs.length > 0) {
            totalDoctors = logs.length;
            const sumCompletion = logs.reduce((acc, l) => acc + (l.completion_rate || 0), 0);
            avgCompletion = (sumCompletion / totalDoctors).toFixed(2);
            
            warningDoctors = logs.filter(l => l.completion_rate < 80 || l.failure_count > 3).length;
        }

        // Aggregate no-shows from incident logs
        const { count: noShows } = await supabase
            .from("ops_incident_log")
            .select("*", { count: "exact", head: true })
            .ilike("description", "%Doctor failed to join%");

        return success("Doctor metrics fetched", {
            avg_completion_rate: `${avgCompletion}%`,
            doctors_with_warnings: warningDoctors,
            total_no_shows_recorded: noShows || 0,
            top_failing_providers: logs ? logs.slice(0, 5) : []
        });

    } catch (err) {
        console.error("GET /api/admin/metrics/doctors error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
