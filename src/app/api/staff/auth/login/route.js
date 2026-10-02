/**
 * Staff Login API
 * POST /api/staff/auth/login
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { verifyPassword, generateStaffToken, logStaffActivity, getStaffPermissions } from "@/lib/staffAuth";

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return failure("Email and password are required", null, 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Find staff by email in AWS RDS PostgreSQL
    const rows = await sql`
      SELECT 
        s.*,
        r.id as role_rel_id, r.name as role_rel_name
      FROM staffs s
      LEFT JOIN staff_roles r ON s.role_id = r.id
      WHERE s.email = ${cleanEmail} AND s.deleted_at IS NULL
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return failure("Invalid email or password", null, 401);
    }

    const staff = rows[0];

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
    await sql`
      UPDATE staffs
      SET last_login_at = NOW()
      WHERE id = ${staff.id}
    `;

    if (staff.role_rel_id) {
      staff.staff_roles = { id: staff.role_rel_id, name: staff.role_rel_name };
    } else {
      staff.staff_roles = null;
    }
    delete staff.role_rel_id;
    delete staff.role_rel_name;

    // Generate token
    const token = generateStaffToken(staff);

    // Get permissions
    const permissions = await getStaffPermissions(staff.id);
    const permissionKeys = permissions
      .filter((p) => p.effective.can_view)
      .map((p) => p.key);

    // Log activity
    await logStaffActivity(staff.id, staff.full_name, "login", "auth", { method: "email" }, req);

    // Sanitize response
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
