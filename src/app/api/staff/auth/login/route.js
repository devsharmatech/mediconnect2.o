/**
 * Staff Login API
 * POST /api/staff/auth/login
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { verifyPassword, generateStaffToken, logStaffActivity, getStaffPermissions } from "@/lib/staffAuth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return failure("Email and password are required", null, 400);
    }

    // Find staff by email (not soft-deleted)
    const { data: staff, error } = await supabase
      .from("staffs")
      .select("*, staff_roles(id, name)")
      .eq("email", email.toLowerCase().trim())
      .is("deleted_at", null)
      .single();

    if (error || !staff) {
      return failure("Invalid email or password", null, 401);
    }

    // Check if active
    if (!staff.is_active) {
      return failure("Your account has been disabled. Contact admin.", null, 403);
    }

    // Verify password
    const valid = await verifyPassword(password, staff.password_hash);
    if (!valid) {
      return failure("Invalid email or password", null, 401);
    }

    // Update last login
    await supabase
      .from("staffs")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", staff.id);

    // Generate token
    const token = generateStaffToken(staff);

    // Get permissions
    const permissions = await getStaffPermissions(staff.id);
    const permissionKeys = permissions
      .filter((p) => p.effective.can_view)
      .map((p) => p.key);

    // Log activity
    await logStaffActivity(staff.id, staff.full_name, "login", "auth", { method: "email" }, req);

    // Sanitize response (remove password_hash)
    const { password_hash, ...safeStaff } = staff;

    return success("Login successful", {
      staff: safeStaff,
      token,
      permissions: permissionKeys,
    });
  } catch (err) {
    console.error("[staff/auth/login] Error:", err);
    return failure("Login failed", err.message, 500);
  }
}
