import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/readiness
 * Calculates a production readiness score based on system health, compliance, and backlog via AWS RDS.
 */
export async function GET(req) {
    try {
        const stats = {
            outbox_backlog: 0,
            p1_incidents: 0,
            compliance_logs: 0,
            idempotency_coverage: 0,
            score: 100
        };

        const [
            [{ count: pendingOutbox }],
            [{ count: openP1 }],
            [{ count: consents }],
            [{ count: activeLocks }]
        ] = await Promise.all([
            sql`SELECT count(*)::int as count FROM l1_event_outbox WHERE status = 'PENDING'`,
            sql`SELECT count(*)::int as count FROM ops_incident_log WHERE priority = 'P1' AND status != 'RESOLVED'`,
            sql`SELECT count(*)::int as count FROM consent_logs`,
            sql`SELECT count(*)::int as count FROM idempotency_locks WHERE status = 'PROCESSING'`
        ]);

        stats.outbox_backlog = Number(pendingOutbox) || 0;
        if (stats.outbox_backlog > 50) stats.score -= 20;

        stats.p1_incidents = Number(openP1) || 0;
        if (stats.p1_incidents > 0) stats.score -= 40;

        stats.compliance_logs = Number(consents) || 0;
        if (stats.compliance_logs === 0) stats.score -= 10;

        stats.idempotency_coverage = Number(activeLocks) || 0;
        if (stats.idempotency_coverage > 10) stats.score -= 10;

        // Final Assessment
        let readiness = "RED";
        if (stats.score >= 90) readiness = "GREEN";
        else if (stats.score >= 70) readiness = "AMBER";

        return success("Production readiness report generated", {
            score: stats.score,
            readiness_level: readiness,
            metrics: stats,
            recommendation: readiness === "GREEN" ? "Safe to deploy" : "Resolve P1 incidents and outbox backlogs before launch."
        });

    } catch (err) {
        console.error("GET /api/admin/readiness error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
