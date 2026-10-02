import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/metrics/patients
 * Analyzes patient engagement and drop-off metrics via AWS RDS PostgreSQL
 */
export async function GET() {
    try {
        const [profiles, totalSigRes, dropoffSigRes] = await Promise.all([
            sql`SELECT engagement_score, fatigue_score FROM user_engagement_profile`,
            sql`SELECT count(*)::int as count FROM service_signal_log`,
            sql`SELECT count(*)::int as count FROM service_signal_log WHERE type = 'DROPOFF'`
        ]);

        let highlyEngaged = 0, moderate = 0, low = 0, atRisk = 0;
        let highFatigue = 0;

        if (profiles) {
            profiles.forEach(p => {
                const es = Number(p.engagement_score || 0);
                const fs = Number(p.fatigue_score || 0);
                if (es >= 80) highlyEngaged++;
                else if (es >= 50) moderate++;
                else if (es >= 20) low++;
                else atRisk++;

                if (fs >= 5) highFatigue++;
            });
        }

        const totalSignals = totalSigRes[0]?.count || 0;
        const dropoffSignals = dropoffSigRes[0]?.count || 0;

        return success("Patient metrics fetched", {
            engagement_distribution: {
                highly_engaged: highlyEngaged,
                moderate,
                low,
                at_risk: atRisk
            },
            fatigue: {
                high_fatigue_users: highFatigue
            },
            drop_off_rate: totalSignals > 0 ? ((dropoffSignals / totalSignals) * 100).toFixed(2) + "%" : "0%"
        });

    } catch (err) {
        console.error("GET /api/admin/metrics/patients error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
