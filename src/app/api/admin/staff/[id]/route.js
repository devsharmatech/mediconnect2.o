/**
 * Admin → Single Staff Operations
 * GET    /api/admin/staff/[id]   — get staff details
 * PUT    /api/admin/staff/[id]   — update staff
 * DELETE /api/admin/staff/[id]   — soft delete staff
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { hashPassword, getStaffPermissions } from "@/lib/staffAuth";

// GET — Single staff detail with permissions
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const { data: staff, error } = await supabase
      .from("staffs")
      .select("*, staff_roles(id, name)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !staff) {
      return failure("Staff not found", null, 404);
    }

    // Get merged permissions
    const permissions = await getStaffPermissions(id);

    const { password_hash, ...safeStaff } = staff;

    return success("Staff details", { staff: safeStaff, permissions });
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

    // Build update object (only include provided fields)
    const updateData = { updated_at: new Date().toISOString() };

    if (full_name !== undefined) updateData.full_name = full_name.trim();
    if (email !== undefined) {
      // Check duplicate
      const { data: existing } = await supabase
        .from("staffs")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .neq("id", id)
        .is("deleted_at", null)
        .single();

      if (existing) {
        return failure("Another staff member already uses this email", null, 409);
      }
      updateData.email = email.toLowerCase().trim();
    }
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (address !== undefined) updateData.address = address;
    if (designation !== undefined) updateData.designation = designation;
    if (department !== undefined) updateData.department = department;
    if (role_id !== undefined) updateData.role_id = role_id || null;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_verified !== undefined) updateData.is_verified = is_verified;
    if (profile_picture !== undefined) updateData.profile_picture = profile_picture;

    if (password && password.length >= 6) {
      updateData.password_hash = await hashPassword(password);
    }

    const { data: updated, error } = await supabase
      .from("staffs")
      .update(updateData)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*, staff_roles(id, name)")
      .single();

    if (error || !updated) {
      console.error("[admin/staff/[id]] PUT error:", error);
      return failure("Failed to update staff", error?.message, 500);
    }

    const { password_hash, ...safeStaff } = updated;

    return success("Staff updated", safeStaff);
  } catch (err) {
    console.error("[admin/staff/[id]] PUT error:", err);
    return failure("Failed to update staff", err.message, 500);
  }
}

// DELETE — Soft delete staff
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from("staffs")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      console.error("[admin/staff/[id]] DELETE error:", error);
      return failure("Failed to delete staff", error.message, 500);
    }

    return success("Staff member deleted (soft delete)");
  } catch (err) {
    console.error("[admin/staff/[id]] DELETE error:", err);
    return failure("Failed to delete staff", err.message, 500);
  }
}
