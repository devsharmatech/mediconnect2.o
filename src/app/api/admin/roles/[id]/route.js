/**
 * Admin → Single Role Operations
 * GET    /api/admin/roles/[id]  — get role with permissions
 * PUT    /api/admin/roles/[id]  — update role + permissions
 * DELETE /api/admin/roles/[id]  — delete role
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export const dynamic = 'force-dynamic';

// GET — Role detail with assigned permissions
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const roleRows = await sql`
      SELECT * FROM staff_roles WHERE id = ${id} LIMIT 1
    `;

    if (!roleRows || roleRows.length === 0) {
      return failure("Role not found", null, 404);
    }

    const role = roleRows[0];

    const rolePerms = await sql`
      SELECT 
        rp.permission_id,
        p.id as perm_id, p.key, p.label, p.module, p.description, p.created_at
      FROM staff_role_permissions rp
      JOIN staff_permissions_master p ON rp.permission_id = p.id
      WHERE rp.role_id = ${id}
    `;

    role.staff_role_permissions = rolePerms.map((rp) => ({
      permission_id: rp.permission_id,
      staff_permissions_master: {
        id: rp.perm_id,
        key: rp.key,
        label: rp.label,
        module: rp.module,
        description: rp.description,
        created_at: rp.created_at
      }
    }));

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

    const roleExists = await sql`SELECT id FROM staff_roles WHERE id = ${id} LIMIT 1`;
    if (roleExists.length === 0) {
      return failure("Role not found", null, 404);
    }

    // Update name/description
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;

    await sql`
      UPDATE staff_roles
      SET ${sql(updates)}
      WHERE id = ${id}
    `;

    // Re-assign permissions if provided
    if (Array.isArray(permission_ids)) {
      // Delete old mappings
      await sql`
        DELETE FROM staff_role_permissions WHERE role_id = ${id}
      `;

      // Insert new ones
      if (permission_ids.length > 0) {
        const inserts = permission_ids.map((pid) => ({
          role_id: id,
          permission_id: pid,
        }));

        await sql`
          INSERT INTO staff_role_permissions ${sql(inserts)}
        `;
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
    await sql`
      UPDATE staffs SET role_id = NULL WHERE role_id = ${id}
    `;

    // Delete role-permission mappings
    await sql`
      DELETE FROM staff_role_permissions WHERE role_id = ${id}
    `;

    // Delete role
    const deleted = await sql`
      DELETE FROM staff_roles WHERE id = ${id} RETURNING id
    `;

    if (deleted.length === 0) {
      return failure("Failed to delete role (role not found)", null, 404);
    }

    return success("Role deleted");
  } catch (err) {
    console.error("[admin/roles/[id]] DELETE error:", err);
    return failure("Failed to delete role", err.message, 500);
  }
}
