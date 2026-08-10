/**
 * API: Doctor Analytics — Light (PDF Part 5-13)
 * 
 * GET /api/doctors/analytics?doctor_id=xxx
 * 
 * Returns ONLY essential signals (not dashboards):
 * - consultations today
 * - follow-ups pending
 * - completion rate (last 7 days)
 * - total patients seen (lifetime)
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const doctor_id = searchParams.get("doctor_id");

        if (!doctor_id) return failure("doctor_id is required");

        const today = new Date().toISOString().split("T")[0];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Consultations today
        const { count: todayCount } = await supabase
            .from("consultations")
            .select("id", { count: "exact", head: true })
            .eq("doctor_id", doctor_id)
            .gte("created_at", `${today}T00:00:00`);

        // 2. Follow-ups pending
        const { count: pendingFollowups } = await supabase
            .from("consultations")
            .select("id", { count: "exact", head: true })
            .eq("doctor_id", doctor_id)
            .eq("case_status", "FOLLOW_UP_PENDING");

        // 3. Completion rate (last 7 days)
        const { count: totalLast7 } = await supabase
            .from("consultations")
            .select("id", { count: "exact", head: true })
            .eq("doctor_id", doctor_id)
            .gte("created_at", sevenDaysAgo.toISOString());

        const { count: completedLast7 } = await supabase
            .from("consultations")
            .select("id", { count: "exact", head: true })
            .eq("doctor_id", doctor_id)
            .in("case_status", ["COMPLETED", "FOLLOW_UP_PENDING", "CLOSED_RESOLVED", "CLOSED_NO_RESPONSE"])
            .gte("created_at", sevenDaysAgo.toISOString());

        const completionRate = totalLast7 > 0
            ? Math.round((completedLast7 / totalLast7) * 100)
            : 0;

        // 4. Total patients (lifetime)
        const { count: totalPatients } = await supabase
            .from("consultations")
            .select("patient_id", { count: "exact", head: true })
            .eq("doctor_id", doctor_id);

        return success("Doctor analytics", {
            consultations_today: todayCount || 0,
            followups_pending: pendingFollowups || 0,
            completion_rate_7d: `${completionRate}%`,
            total_patients: totalPatients || 0,
        });

    } catch (err) {
        console.error("GET /api/doctors/analytics error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
