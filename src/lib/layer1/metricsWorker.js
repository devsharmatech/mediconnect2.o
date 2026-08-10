import { supabase } from "@/lib/supabaseAdmin";

/**
 * Daily Metrics Worker (Rule 8.3)
 * Calculates aggregations and stores them in system_metrics_daily.
 * Built to be invoked via Vercel Cron.
 */
export async function buildDailyMetrics(forDate = new Date().toISOString().split('T')[0]) {
    try {
        console.log(`Starting system_metrics_daily aggregation for ${forDate}`);

        // Extract completed consultations for the day
        // Layer-111: count ALL terminal/completed states (not just CLOSED_RESOLVED)
        const { count: completedConsults } = await supabase
            .from("consultations")
            .select("id", { count: "exact", head: true })
            .in("case_status", ["COMPLETED", "FOLLOW_UP_PENDING", "CLOSED_RESOLVED", "CLOSED_NO_RESPONSE"])
            .gte("completed_at", `${forDate}T00:00:00Z`)
            .lte("completed_at", `${forDate}T23:59:59Z`);

        // Extract total started consultations for the day
        const { count: totalConsults } = await supabase
            .from("consultations")
            .select("id", { count: "exact", head: true })
            .gte("created_at", `${forDate}T00:00:00Z`)
            .lte("created_at", `${forDate}T23:59:59Z`);

        // Dropoff calculation
        const safeTotal = totalConsults || 0;
        const safeCompleted = completedConsults || 0;
        
        let dropoffRate = 0.0;
        if (safeTotal > 0) {
            dropoffRate = ((safeTotal - safeCompleted) / safeTotal) * 100;
        }

        // Upsert daily metrics 
        await supabase
            .from("system_metrics_daily")
            .upsert({
                date: forDate,
                total_consultations: safeTotal,
                completed_consultations: safeCompleted,
                dropoff_rate: Math.round(dropoffRate * 100) / 100,
            }, { onConflict: "date" });

        console.log(`Finished system_metrics_daily logic successfully.`);
        return true;
    } catch (err) {
        console.error("Metrics Worker Error:", err);
        return false;
    }
}
