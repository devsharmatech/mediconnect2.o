/**
 * Staff Profile API
 * GET /api/staff/auth/me — get current staff profile + permissions
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { getAuthenticatedStaff, getStaffPermissions } from "@/lib/staffAuth";

export async function GET(req) {
  try {
    const staff = await getAuthenticatedStaff(req);
    if (!staff) {
      return failure("Unauthorized", null, 401);
    }

    const permissions = await getStaffPermissions(staff.id);
    const permissionKeys = permissions
      .filter((p) => p.effective.can_view)
      .map((p) => p.key);

    const { password_hash, ...safeStaff } = staff;

    return success("Staff profile", {
      staff: safeStaff,
      permissions: permissionKeys,
    });
  } catch (err) {
    console.error("[staff/auth/me] Error:", err);
    return failure("Failed to get profile", err.message, 500);
  }
}
