/**
 * Admin → Staff Dashboard Stats
 * GET /api/admin/staff-stats — counts for dashboard cards
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      [{ count: totalStaff }],
      [{ count: activeStaff }],
      [{ count: disabledStaff }],
      [{ count: totalRoles }],
      recentLogs
    ] = await Promise.all([
      sql`SELECT count(*)::int as count FROM staffs WHERE deleted_at IS NULL`,
      sql`SELECT count(*)::int as count FROM staffs WHERE deleted_at IS NULL AND is_active = true`,
      sql`SELECT count(*)::int as count FROM staffs WHERE deleted_at IS NULL AND is_active = false`,
      sql`SELECT count(*)::int as count FROM staff_roles`,
      sql`SELECT * FROM staff_activity_logs ORDER BY created_at DESC LIMIT 10`,
    ]);

    return success("Staff stats", {
      total_staff: totalStaff || 0,
      active_staff: activeStaff || 0,
      disabled_staff: disabledStaff || 0,
      total_roles: totalRoles || 0,
      recent_activity: recentLogs || [],
    });
  } catch (err) {
    console.error("[admin/staff-stats] Error:", err);
    return failure("Failed to fetch stats", err.message, 500);
  }
}
