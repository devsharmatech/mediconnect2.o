/**
 * Admin → Staff Dashboard Stats
 * GET /api/admin/staff-stats — counts for dashboard cards
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

export async function GET() {
  try {
    const [totalRes, activeRes, disabledRes, rolesRes, recentLogsRes] = await Promise.all([
      supabase.from("staffs").select("*", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("staffs").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("is_active", true),
      supabase.from("staffs").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("is_active", false),
      supabase.from("staff_roles").select("*", { count: "exact", head: true }),
      supabase.from("staff_activity_logs").select("*").order("created_at", { ascending: false }).limit(10),
    ]);

    return success("Staff stats", {
      total_staff: totalRes.count || 0,
      active_staff: activeRes.count || 0,
      disabled_staff: disabledRes.count || 0,
      total_roles: rolesRes.count || 0,
      recent_activity: recentLogsRes.data || [],
    });
  } catch (err) {
    console.error("[admin/staff-stats] Error:", err);
    return failure("Failed to fetch stats", err.message, 500);
  }
}
