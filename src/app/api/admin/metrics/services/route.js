import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/metrics/services
 * Provides conversion and success metrics for Lab and Pharmacy services.
 */
export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // 1. Lab Metrics
        const [
            { count: labRequested },
            { count: labCompleted },
            { count: labFailed }
        ] = await Promise.all([
            supabase.from("lab_test_orders").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
            supabase.from("lab_test_orders").select("*", { count: "exact", head: true }).eq("status", "COMPLETED").gte("created_at", todayISO),
            supabase.from("lab_test_orders").select("*", { count: "exact", head: true }).eq("status", "FAILED").gte("created_at", todayISO)
        ]);

        // 2. Pharmacy Metrics
        const [
            { count: pharmRequested },
            { count: pharmCompleted },
            { count: pharmFailed }
        ] = await Promise.all([
            supabase.from("medicine_orders").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
            supabase.from("medicine_orders").select("*", { count: "exact", head: true }).eq("status", "completed").gte("created_at", todayISO),
            supabase.from("medicine_orders").select("*", { count: "exact", head: true }).eq("status", "cancelled").gte("created_at", todayISO)
        ]);

        // 3. Home Visit Metrics
        const { count: homeVisits } = await supabase.from("home_visit_request").select("*", { count: "exact", head: true }).gte("created_at", todayISO);

        return success("Service metrics fetched successfully", {
            lab: {
                total_orders: labRequested || 0,
                completed: labCompleted || 0,
                failed: labFailed || 0,
                success_rate: labRequested ? ((labCompleted || 0) / labRequested * 100).toFixed(2) + "%" : "0%"
            },
            pharmacy: {
                total_orders: pharmRequested || 0,
                delivered: pharmCompleted || 0,
                failed: pharmFailed || 0,
                success_rate: pharmRequested ? ((pharmCompleted || 0) / pharmRequested * 100).toFixed(2) + "%" : "0%"
            },
            home_visits: {
                total: homeVisits || 0
            }
        });

    } catch (err) {
        console.error("GET /api/admin/metrics/services error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
