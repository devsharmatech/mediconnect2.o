/**
 * Admin → Staff Permission Overrides
 * PUT /api/admin/staff/[id]/permissions — set per-staff permission overrides
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { permissions } = await req.json();

    // permissions = [{ permission_id, can_view, can_create, can_update, can_delete }, ...]
    if (!Array.isArray(permissions)) {
      return failure("permissions must be an array", null, 400);
    }

    // Verify staff exists
    const staff = await sql`
      SELECT id FROM staffs WHERE id = ${id} AND deleted_at IS NULL LIMIT 1
    `;

    if (!staff || staff.length === 0) {
      return failure("Staff not found", null, 404);
    }

    // Delete existing overrides for this staff
    await sql`
      DELETE FROM staff_permission_overrides WHERE staff_id = ${id}
    `;

    // Filter and prepare inserts
    const validOverrides = permissions
      .filter((p) => p.can_view || p.can_create || p.can_update || p.can_delete)
      .map((p) => ({
        staff_id: id,
        permission_id: p.permission_id,
        can_view: !!p.can_view,
        can_create: !!p.can_create,
        can_update: !!p.can_update,
        can_delete: !!p.can_delete,
      }));

    if (validOverrides.length > 0) {
      await sql`
        INSERT INTO staff_permission_overrides ${sql(validOverrides)}
      `;
    }

    return success("Staff permissions updated", { count: validOverrides.length });
  } catch (err) {
    console.error("[admin/staff/permissions] Error:", err);
    return failure("Failed to update permissions", err.message, 500);
  }
}
