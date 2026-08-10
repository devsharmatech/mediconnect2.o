/**
 * Admin → Single Role Operations
 * GET    /api/admin/roles/[id]  — get role with permissions
 * PUT    /api/admin/roles/[id]  — update role + permissions
 * DELETE /api/admin/roles/[id]  — delete role
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

// GET — Role detail with assigned permissions
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const { data: role, error } = await supabase
      .from("staff_roles")
      .select("*, staff_role_permissions(permission_id, staff_permissions_master(*))")
      .eq("id", id)
      .single();

    if (error || !role) {
      return failure("Role not found", null, 404);
    }

    return success("Role details", role);
  } catch (err) {
    console.error("[admin/roles/[id]] GET error:", err);
    return failure("Failed to fetch role", err.message, 500);
  }
}

// PUT — Update role name/description + re-assign permissions
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { name, description, permission_ids } = await req.json();

    // Update name/description
    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;

    const { error: updateError } = await supabase
      .from("staff_roles")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      return failure("Failed to update role", updateError.message, 500);
    }

    // Re-assign permissions if provided
    if (Array.isArray(permission_ids)) {
      // Delete old mappings
      await supabase
        .from("staff_role_permissions")
        .delete()
        .eq("role_id", id);

      // Insert new ones
      if (permission_ids.length > 0) {
        const inserts = permission_ids.map((pid) => ({
          role_id: id,
          permission_id: pid,
        }));

        const { error: insertError } = await supabase
          .from("staff_role_permissions")
          .insert(inserts);

        if (insertError) {
          console.error("[admin/roles/[id]] permission insert error:", insertError);
        }
      }
    }

    return success("Role updated");
  } catch (err) {
    console.error("[admin/roles/[id]] PUT error:", err);
    return failure("Failed to update role", err.message, 500);
  }
}

// DELETE — Delete role
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    // Remove role assignment from staff
    await supabase
      .from("staffs")
      .update({ role_id: null })
      .eq("role_id", id);

    // Delete role-permission mappings
    await supabase
      .from("staff_role_permissions")
      .delete()
      .eq("role_id", id);

    // Delete role
    const { error } = await supabase
      .from("staff_roles")
      .delete()
      .eq("id", id);

    if (error) {
      return failure("Failed to delete role", error.message, 500);
    }

    return success("Role deleted");
  } catch (err) {
    console.error("[admin/roles/[id]] DELETE error:", err);
    return failure("Failed to delete role", err.message, 500);
  }
}
