/**
 * Admin → Staff Permission Overrides
 * PUT /api/admin/staff/[id]/permissions — set per-staff permission overrides
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { permissions } = await req.json();

    // permissions = [{ permission_id, can_view, can_create, can_update, can_delete }, ...]
    if (!Array.isArray(permissions)) {
      return failure("permissions must be an array", null, 400);
    }

    // Verify staff exists
    const { data: staff } = await supabase
      .from("staffs")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!staff) {
      return failure("Staff not found", null, 404);
    }

    // Delete existing overrides for this staff
    await supabase
      .from("staff_permission_overrides")
      .delete()
      .eq("staff_id", id);

    // Insert new overrides (only if any action is true)
    const inserts = permissions
      .filter((p) => p.can_view || p.can_create || p.can_update || p.can_delete)
      .map((p) => ({
        staff_id: id,
        permission_id: p.permission_id,
        can_view: !!p.can_view,
        can_create: !!p.can_create,
        can_update: !!p.can_update,
        can_delete: !!p.can_delete,
      }));

    if (inserts.length > 0) {
      const { error } = await supabase
        .from("staff_permission_overrides")
        .insert(inserts);

      if (error) {
        console.error("[admin/staff/permissions] insert error:", error);
        return failure("Failed to set permissions", error.message, 500);
      }
    }

    return success("Staff permissions updated", { count: inserts.length });
  } catch (err) {
    console.error("[admin/staff/permissions] Error:", err);
    return failure("Failed to update permissions", err.message, 500);
  }
}
