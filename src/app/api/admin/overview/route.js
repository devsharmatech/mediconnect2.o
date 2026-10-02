import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/overview
 * High-level system overview for ops dashboard via AWS RDS PostgreSQL
 */
export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // Run aggregated count queries concurrently in RDS
        const [
            [{ count: startedCount }],
            [{ count: completedCount }],
            [{ count: failedCount }],
            [{ count: paymentSuccess }],
            [{ count: paymentFailed }],
            [{ count: openIncidents }],
            [{ count: p1Incidents }],
            [{ count: funnelStart }],
            [{ count: funnelPayment }],
            [{ count: mismatchCount }]
        ] = await Promise.all([
            sql`SELECT count(*)::int as count FROM consultations WHERE case_status = 'STARTED' AND created_at >= ${todayISO}`,
            sql`SELECT count(*)::int as count FROM consultations WHERE case_status = 'COMPLETED' AND created_at >= ${todayISO}`,
            sql`SELECT count(*)::int as count FROM consultations WHERE case_status = 'FAILED' AND created_at >= ${todayISO}`,
            
            sql`SELECT count(*)::int as count FROM financial_transaction_log WHERE status = 'success' AND created_at >= ${todayISO}`,
            sql`SELECT count(*)::int as count FROM financial_transaction_log WHERE status = 'failed' AND created_at >= ${todayISO}`,
            
            sql`SELECT count(*)::int as count FROM ops_incident_log WHERE status = 'OPEN'`,
            sql`SELECT count(*)::int as count FROM ops_incident_log WHERE status = 'OPEN' AND priority = 'P1'`,

            sql`SELECT count(*)::int as count FROM funnel_tracking_log WHERE stage = 'START' AND created_at >= ${todayISO}`,
            sql`SELECT count(*)::int as count FROM funnel_tracking_log WHERE stage = 'PAYMENT' AND created_at >= ${todayISO}`,

            sql`SELECT count(*)::int as count FROM payment_reconciliation_log WHERE mismatch = true AND created_at >= ${todayISO}`
        ]);

        const fStart = Number(funnelStart) || 0;
        const fPay = Number(funnelPayment) || 0;
        const cComp = Number(completedCount) || 0;

        return success("Admin overview fetched successfully", {
            consultations: {
                started: Number(startedCount) || 0,
                completed: cComp,
                failed: Number(failedCount) || 0
            },
            payments: {
                success: Number(paymentSuccess) || 0,
                failed: Number(paymentFailed) || 0,
                mismatch: Number(mismatchCount) || 0
            },
            funnel: {
                start_to_payment: fStart > 0 ? ((fPay / fStart) * 100).toFixed(2) + "%" : "0%",
                payment_to_complete: fPay > 0 ? ((cComp / fPay) * 100).toFixed(2) + "%" : "0%"
            },
            incidents: {
                open: Number(openIncidents) || 0,
                p1: Number(p1Incidents) || 0
            }
        });

    } catch (err) {
        console.error("GET /api/admin/overview error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
