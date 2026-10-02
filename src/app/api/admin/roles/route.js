/**
 * Admin → Roles CRUD
 * GET  /api/admin/roles — list all roles with permission count
 * POST /api/admin/roles — create role
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export const dynamic = 'force-dynamic';

// GET — List all roles
export async function GET() {
  try {
    const roles = await sql`
      SELECT 
        r.id, r.name, r.description, r.is_active, r.created_at, r.updated_at,
        COUNT(rp.permission_id)::int as permission_count
      FROM staff_roles r
      LEFT JOIN staff_role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id
      ORDER BY r.name ASC
    `;

    return success("Roles list", roles);
  } catch (err) {
    console.error("[admin/roles] Error:", err);
    return failure("Failed to fetch roles", err.message, 500);
  }
}

// POST — Create role
export async function POST(req) {
  try {
    const { name, description, permission_ids } = await req.json();

    if (!name || !name.trim()) {
      return failure("Role name is required", null, 400);
    }

    const cleanName = name.trim();

    // Check duplicate
    const existing = await sql`
      SELECT id FROM staff_roles WHERE name = ${cleanName} LIMIT 1
    `;

    if (existing.length > 0) {
      return failure("A role with this name already exists", null, 409);
    }

    // Create role
    const newRoles = await sql`
      INSERT INTO staff_roles (name, description)
      VALUES (${cleanName}, ${description || null})
      RETURNING *
    `;

    const role = newRoles[0];

    // Assign permissions if provided
    if (Array.isArray(permission_ids) && permission_ids.length > 0) {
      const inserts = permission_ids.map((pid) => ({
        role_id: role.id,
        permission_id: pid,
      }));

      await sql`
        INSERT INTO staff_role_permissions ${sql(inserts)}
      `;
    }

    return success("Role created", role, 201);
  } catch (err) {
    console.error("[admin/roles] Error:", err);
    return failure("Failed to create role", err.message, 500);
  }
}
