import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/readiness
 * Calculates a production readiness score based on system health, compliance, and backlog.
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

        // 1. Check Outbox Backlog
        const { count: pendingOutbox } = await supabase
            .from("l1_event_outbox")
            .select("id", { count: "exact", head: true })
            .eq("status", "PENDING");
        stats.outbox_backlog = pendingOutbox || 0;
        if (stats.outbox_backlog > 50) stats.score -= 20;

        // 2. Check Unresolved P1 Incidents
        // Schema: ops_incident_log.status is TEXT ('OPEN', 'IN_PROGRESS', 'RESOLVED') — no boolean column
        const { count: openP1 } = await supabase
            .from("ops_incident_log")
            .select("id", { count: "exact", head: true })
            .eq("priority", "P1")
            .neq("status", "RESOLVED");
        stats.p1_incidents = openP1 || 0;
        if (stats.p1_incidents > 0) stats.score -= 40;

        // 3. Check Compliance Coverage (Consent Logs)
        const { count: consents } = await supabase
            .from("consent_logs")
            .select("id", { count: "exact", head: true });
        stats.compliance_logs = consents || 0;
        if (stats.compliance_logs === 0) stats.score -= 10;

        // 4. Check Idempotency Health (table is idempotency_locks per phase1 schema)
        const { count: activeLocks } = await supabase
            .from("idempotency_locks")
            .select("id", { count: "exact", head: true })
            .eq("status", "PROCESSING");
        stats.idempotency_coverage = activeLocks || 0;
        // Flag stale locks as a health concern
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
