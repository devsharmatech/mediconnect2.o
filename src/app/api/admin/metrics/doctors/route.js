import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/metrics/doctors
 * Analyzes doctor performance and failure rates via AWS RDS PostgreSQL
 */
export async function GET() {
    try {
        const [logs, incidentRes] = await Promise.all([
            sql`
                SELECT provider_id, completion_rate, failure_count
                FROM provider_performance_log
                ORDER BY failure_count DESC
                LIMIT 50
            `,
            sql`
                SELECT count(*)::int as count
                FROM ops_incident_log
                WHERE description ILIKE '%Doctor failed to join%'
            `
        ]);

        let totalDoctors = 0;
        let warningDoctors = 0;
        let avgCompletion = "0";

        if (logs && logs.length > 0) {
            totalDoctors = logs.length;
            const sumCompletion = logs.reduce((acc, l) => acc + Number(l.completion_rate || 0), 0);
            avgCompletion = (sumCompletion / totalDoctors).toFixed(2);
            
            warningDoctors = logs.filter(l => Number(l.completion_rate) < 80 || Number(l.failure_count) > 3).length;
        }

        const noShows = incidentRes[0]?.count || 0;

        return success("Doctor metrics fetched", {
            avg_completion_rate: `${avgCompletion}%`,
            doctors_with_warnings: warningDoctors,
            total_no_shows_recorded: noShows,
            top_failing_providers: logs ? logs.slice(0, 5) : []
        });

    } catch (err) {
        console.error("GET /api/admin/metrics/doctors error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
