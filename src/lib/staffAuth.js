/**
 * Staff Authentication & Permission Helpers (Server-side)
 * Medical-grade RBAC system for MediConnect
 */
import { supabase } from "@/lib/supabaseAdmin";
import { failure } from "@/lib/response";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "mediconnect-staff-secret-key-change-in-production";
const JWT_EXPIRY = "24h";

// ─── Password Hashing ──────────────────────────────────────────
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ─── JWT Token ────────────────────────────────────────────────
export function generateStaffToken(staff) {
  return jwt.sign(
    {
      id: staff.id,
      email: staff.email,
      role_id: staff.role_id,
      type: "staff",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyStaffToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── Extract Staff from Request ───────────────────────────────
export async function getAuthenticatedStaff(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyStaffToken(token);
  if (!payload || payload.type !== "staff") return null;

  const { data: staff } = await supabase
    .from("staffs")
    .select("*, staff_roles(id, name)")
    .eq("id", payload.id)
    .is("deleted_at", null)
    .single();

  if (!staff || !staff.is_active) return null;

  return staff;
}

// ─── Permission Check ──────────────────────────────────────────
/**
 * Checks if a staff member has a specific permission.
 * Priority: staff_permission_overrides > staff_role_permissions
 *
 * @param {string} staffId - UUID of the staff
 * @param {string} permissionKey - e.g. "manage_patients"
 * @param {string} action - "view" | "create" | "update" | "delete"
 * @returns {boolean}
 */
export async function staffHasPermission(staffId, permissionKey, action = "view") {
  // 1. Get permission ID
  const { data: perm } = await supabase
    .from("staff_permissions_master")
    .select("id")
    .eq("key", permissionKey)
    .single();

  if (!perm) return false;

  // 2. Check direct override first (highest priority)
  const { data: override } = await supabase
    .from("staff_permission_overrides")
    .select("*")
    .eq("staff_id", staffId)
    .eq("permission_id", perm.id)
    .single();

  if (override) {
    const actionMap = {
      view: override.can_view,
      create: override.can_create,
      update: override.can_update,
      delete: override.can_delete,
    };
    return actionMap[action] ?? false;
  }

  // 3. Fall back to role-based permission
  const { data: staff } = await supabase
    .from("staffs")
    .select("role_id")
    .eq("id", staffId)
    .single();

  if (!staff?.role_id) return false;

  const { data: rolePerm } = await supabase
    .from("staff_role_permissions")
    .select("id")
    .eq("role_id", staff.role_id)
    .eq("permission_id", perm.id)
    .single();

  return !!rolePerm;
}

// ─── Get All Permissions for a Staff (merged) ──────────────────
export async function getStaffPermissions(staffId) {
  // Get staff with role
  const { data: staff } = await supabase
    .from("staffs")
    .select("role_id")
    .eq("id", staffId)
    .single();

  if (!staff) return [];

  // Get all master permissions
  const { data: allPerms } = await supabase
    .from("staff_permissions_master")
    .select("*")
    .order("module", { ascending: true });

  if (!allPerms) return [];

  // Get role permissions
  let rolePermIds = new Set();
  if (staff.role_id) {
    const { data: rolePerms } = await supabase
      .from("staff_role_permissions")
      .select("permission_id")
      .eq("role_id", staff.role_id);

    if (rolePerms) {
      rolePermIds = new Set(rolePerms.map((rp) => rp.permission_id));
    }
  }

  // Get direct overrides
  const { data: overrides } = await supabase
    .from("staff_permission_overrides")
    .select("*")
    .eq("staff_id", staffId);

  const overrideMap = {};
  if (overrides) {
    overrides.forEach((o) => {
      overrideMap[o.permission_id] = o;
    });
  }

  // Merge
  return allPerms.map((p) => {
    const override = overrideMap[p.id];
    const hasRolePerm = rolePermIds.has(p.id);

    return {
      ...p,
      has_role_permission: hasRolePerm,
      override: override
        ? {
            can_view: override.can_view,
            can_create: override.can_create,
            can_update: override.can_update,
            can_delete: override.can_delete,
          }
        : null,
      // Effective access
      effective: override
        ? {
            can_view: override.can_view,
            can_create: override.can_create,
            can_update: override.can_update,
            can_delete: override.can_delete,
          }
        : {
            can_view: hasRolePerm,
            can_create: hasRolePerm,
            can_update: hasRolePerm,
            can_delete: hasRolePerm,
          },
    };
  });
}

// ─── Permission Middleware (for API routes) ─────────────────────
export function requireStaffPermission(permissionKey, action = "view") {
  return async (req) => {
    const staff = await getAuthenticatedStaff(req);
    if (!staff) {
      return failure("Unauthorized – please login", null, 401);
    }

    const allowed = await staffHasPermission(staff.id, permissionKey, action);
    if (!allowed) {
      return failure("Access denied – insufficient permissions", null, 403);
    }

    return { staff, allowed: true };
  };
}

// ─── Activity Logger ────────────────────────────────────────────
export async function logStaffActivity(staffId, staffName, action, module, details = null, req = null) {
  const logEntry = {
    staff_id: staffId,
    staff_name: staffName,
    action,
    module,
    details: details ? JSON.stringify(details) : null,
    ip_address: req?.headers?.get("x-forwarded-for") || req?.headers?.get("x-real-ip") || null,
    user_agent: req?.headers?.get("user-agent") || null,
  };

  await supabase.from("staff_activity_logs").insert(logEntry);
}

// ─── Generate Employee Code ────────────────────────────────────
export async function generateEmployeeCode() {
  const prefix = "MC";
  const { count } = await supabase
    .from("staffs")
    .select("*", { count: "exact", head: true });

  const num = (count || 0) + 1;
  return `${prefix}${String(num).padStart(5, "0")}`;
}
