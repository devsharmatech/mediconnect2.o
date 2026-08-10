import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/overview
 * High-level system overview for ops dashboard
 */
export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // Run aggregated count queries concurrently
        const [
            { count: startedCount },
            { count: completedCount },
            { count: failedCount },
            { count: paymentSuccess },
            { count: paymentFailed },
            { count: openIncidents },
            { count: p1Incidents }
        ] = await Promise.all([
            supabase.from("consultations").select("*", { count: "exact", head: true }).eq("case_status", "STARTED").gte("created_at", todayISO),
            supabase.from("consultations").select("*", { count: "exact", head: true }).eq("case_status", "COMPLETED").gte("created_at", todayISO),
            supabase.from("consultations").select("*", { count: "exact", head: true }).eq("case_status", "FAILED").gte("created_at", todayISO),
            
            supabase.from("financial_transaction_log").select("*", { count: "exact", head: true }).eq("status", "success").gte("created_at", todayISO),
            supabase.from("financial_transaction_log").select("*", { count: "exact", head: true }).eq("status", "failed").gte("created_at", todayISO),
            
            supabase.from("ops_incident_log").select("*", { count: "exact", head: true }).eq("status", "OPEN"),
            supabase.from("ops_incident_log").select("*", { count: "exact", head: true }).eq("status", "OPEN").eq("priority", "P1")
        ]);

        // Simple Funnel Metrics (Mocked efficient counts - a real system might use materialized views)
        const { count: funnelStart } = await supabase.from("funnel_tracking_log").select("*", { count: "exact", head: true }).eq("stage", "START").gte("created_at", todayISO);
        const { count: funnelPayment } = await supabase.from("funnel_tracking_log").select("*", { count: "exact", head: true }).eq("stage", "PAYMENT").gte("created_at", todayISO);
        
        // Mismatch is a manual calculation or derived from reconciliation logs
        const { count: mismatchCount } = await supabase.from("payment_reconciliation_log").select("*", { count: "exact", head: true }).eq("status", "MISMATCH").gte("created_at", todayISO);

        return success("Admin overview fetched successfully", {
            consultations: {
                started: startedCount || 0,
                completed: completedCount || 0,
                failed: failedCount || 0
            },
            payments: {
                success: paymentSuccess || 0,
                failed: paymentFailed || 0,
                mismatch: mismatchCount || 0
            },
            funnel: {
                start_to_payment: funnelStart ? ((funnelPayment || 0) / funnelStart * 100).toFixed(2) + "%" : "0%",
                payment_to_complete: funnelPayment ? ((completedCount || 0) / funnelPayment * 100).toFixed(2) + "%" : "0%"
            },
            incidents: {
                open: openIncidents || 0,
                p1: p1Incidents || 0
            }
        });

    } catch (err) {
        console.error("GET /api/admin/overview error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
