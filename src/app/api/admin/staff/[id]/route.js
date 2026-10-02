/**
 * Admin → Single Staff Operations
 * GET    /api/admin/staff/[id]   — get staff details
 * PUT    /api/admin/staff/[id]   — update staff
 * DELETE /api/admin/staff/[id]   — soft delete staff
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { hashPassword, getStaffPermissions } from "@/lib/staffAuth";

export const dynamic = 'force-dynamic';

// GET — Single staff detail with permissions
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const rows = await sql`
      SELECT 
        s.id, s.admin_id, s.full_name, s.email, s.phone, s.gender,
        s.date_of_birth, s.address, s.designation, s.department,
        s.employee_code, s.profile_picture, s.is_active, s.is_verified,
        s.last_login_at, s.created_at, s.updated_at, s.deleted_at, s.role_id,
        r.id as role_rel_id, r.name as role_rel_name
      FROM staffs s
      LEFT JOIN staff_roles r ON s.role_id = r.id
      WHERE s.id = ${id} AND s.deleted_at IS NULL
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return failure("Staff not found", null, 404);
    }

    const { role_rel_id, role_rel_name, ...staffObj } = rows[0];
    staffObj.staff_roles = role_rel_id ? { id: role_rel_id, name: role_rel_name } : null;

    // Get merged permissions
    const permissions = await getStaffPermissions(id);

    return success("Staff details", { staff: staffObj, permissions });
  } catch (err) {
    console.error("[admin/staff/[id]] GET error:", err);
    return failure("Failed to fetch staff", err.message, 500);
  }
}

// PUT — Update staff
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      full_name, email, phone, gender, date_of_birth,
      address, designation, department, role_id, is_active,
      is_verified, password, profile_picture,
    } = body;

    // Check staff exists
    const existingStaff = await sql`
      SELECT id FROM staffs WHERE id = ${id} AND deleted_at IS NULL LIMIT 1
    `;
    if (existingStaff.length === 0) {
      return failure("Staff not found", null, 404);
    }

    // Check duplicate email if email provided
    let cleanEmail = undefined;
    if (email !== undefined) {
      cleanEmail = email.toLowerCase().trim();
      const dup = await sql`
        SELECT id FROM staffs 
        WHERE email = ${cleanEmail} AND id != ${id} AND deleted_at IS NULL 
        LIMIT 1
      `;
      if (dup.length > 0) {
        return failure("Another staff member already uses this email", null, 409);
      }
    }

    let password_hash = undefined;
    if (password && password.length >= 6) {
      password_hash = await hashPassword(password);
    }

    // Build dynamic update columns
    const updates = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (cleanEmail !== undefined) updates.email = cleanEmail;
    if (phone !== undefined) updates.phone = phone;
    if (gender !== undefined) updates.gender = gender;
    if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth;
    if (address !== undefined) updates.address = address;
    if (designation !== undefined) updates.designation = designation;
    if (department !== undefined) updates.department = department;
    if (role_id !== undefined) updates.role_id = role_id || null;
    if (is_active !== undefined) updates.is_active = is_active;
    if (is_verified !== undefined) updates.is_verified = is_verified;
    if (profile_picture !== undefined) updates.profile_picture = profile_picture;
    if (password_hash !== undefined) updates.password_hash = password_hash;

    const updatedRows = await sql`
      UPDATE staffs
      SET ${sql(updates)}
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `;

    if (!updatedRows || updatedRows.length === 0) {
      return failure("Failed to update staff", null, 500);
    }

    const updated = updatedRows[0];
    delete updated.password_hash;

    if (updated.role_id) {
      const roleRow = await sql`SELECT id, name FROM staff_roles WHERE id = ${updated.role_id} LIMIT 1`;
      updated.staff_roles = roleRow[0] || null;
    } else {
      updated.staff_roles = null;
    }

    return success("Staff updated", updated);
  } catch (err) {
    console.error("[admin/staff/[id]] PUT error:", err);
    return failure("Failed to update staff", err.message, 500);
  }
}

// DELETE — Soft delete staff
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    const res = await sql`
      UPDATE staffs
      SET 
        deleted_at = NOW(),
        is_active = false,
        updated_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    `;

    if (res.length === 0) {
      return failure("Staff not found or already deleted", null, 404);
    }

    return success("Staff member deleted (soft delete)");
  } catch (err) {
    console.error("[admin/staff/[id]] DELETE error:", err);
    return failure("Failed to delete staff", err.message, 500);
  }
}
