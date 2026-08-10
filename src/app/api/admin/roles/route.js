/**
 * Admin → Roles CRUD
 * GET  /api/admin/roles — list all roles with permission count
 * POST /api/admin/roles — create role
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

// GET — List all roles
export async function GET() {
  try {
    const { data: roles, error } = await supabase
      .from("staff_roles")
      .select("*, staff_role_permissions(permission_id)")
      .order("name", { ascending: true });

    if (error) {
      return failure("Failed to fetch roles", error.message, 500);
    }

    const formatted = (roles || []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      is_active: r.is_active,
      permission_count: r.staff_role_permissions?.length || 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return success("Roles list", formatted);
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

    // Check duplicate
    const { data: existing } = await supabase
      .from("staff_roles")
      .select("id")
      .eq("name", name.trim())
      .single();

    if (existing) {
      return failure("A role with this name already exists", null, 409);
    }

    // Create role
    const { data: role, error } = await supabase
      .from("staff_roles")
      .insert({ name: name.trim(), description: description || null })
      .select()
      .single();

    if (error) {
      return failure("Failed to create role", error.message, 500);
    }

    // Assign permissions if provided
    if (Array.isArray(permission_ids) && permission_ids.length > 0) {
      const inserts = permission_ids.map((pid) => ({
        role_id: role.id,
        permission_id: pid,
      }));

      await supabase.from("staff_role_permissions").insert(inserts);
    }

    return success("Role created", role, 201);
  } catch (err) {
    console.error("[admin/roles] Error:", err);
    return failure("Failed to create role", err.message, 500);
  }
}
