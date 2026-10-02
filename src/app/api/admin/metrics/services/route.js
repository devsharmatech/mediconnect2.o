import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/metrics/services
 * Provides conversion and success metrics for Lab and Pharmacy services via AWS RDS PostgreSQL.
 */
export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // 1. Lab, Pharmacy, and Home Visit metrics executed concurrently
        const [
            [{ count: labRequested }],
            [{ count: labCompleted }],
            [{ count: labFailed }],
            [{ count: pharmRequested }],
            [{ count: pharmCompleted }],
            [{ count: pharmFailed }],
            [{ count: homeVisits }]
        ] = await Promise.all([
            sql`SELECT count(*)::int as count FROM lab_test_orders WHERE created_at >= ${todayISO}`,
            sql`SELECT count(*)::int as count FROM lab_test_orders WHERE status = 'COMPLETED' AND created_at >= ${todayISO}`,
            sql`SELECT count(*)::int as count FROM lab_test_orders WHERE status = 'FAILED' AND created_at >= ${todayISO}`,

            sql`SELECT count(*)::int as count FROM medicine_orders WHERE created_at >= ${todayISO}`,
            sql`SELECT count(*)::int as count FROM medicine_orders WHERE status = 'completed' AND created_at >= ${todayISO}`,
            sql`SELECT count(*)::int as count FROM medicine_orders WHERE status = 'cancelled' AND created_at >= ${todayISO}`,

            sql`SELECT count(*)::int as count FROM home_visit_request WHERE created_at >= ${todayISO}`
        ]);

        const lReq = Number(labRequested) || 0;
        const lComp = Number(labCompleted) || 0;
        const pReq = Number(pharmRequested) || 0;
        const pComp = Number(pharmCompleted) || 0;

        return success("Service metrics fetched successfully", {
            lab: {
                total_orders: lReq,
                completed: lComp,
                failed: Number(labFailed) || 0,
                success_rate: lReq > 0 ? ((lComp / lReq) * 100).toFixed(2) + "%" : "0%"
            },
            pharmacy: {
                total_orders: pReq,
                delivered: pComp,
                failed: Number(pharmFailed) || 0,
                success_rate: pReq > 0 ? ((pComp / pReq) * 100).toFixed(2) + "%" : "0%"
            },
            home_visits: {
                total: Number(homeVisits) || 0
            }
        });

    } catch (err) {
        console.error("GET /api/admin/metrics/services error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
