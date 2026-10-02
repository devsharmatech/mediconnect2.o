/**
 * Staff Authentication & Permission Helpers (Server-side)
 * Medical-grade RBAC system for MediConnect using AWS RDS PostgreSQL
 */
import sql from "@/lib/db";
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

  const rows = await sql`
    SELECT s.*, r.name as role_name
    FROM staffs s
    LEFT JOIN staff_roles r ON s.role_id = r.id
    WHERE s.id = ${payload.id} AND s.deleted_at IS NULL
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  const staff = rows[0];
  if (!staff.is_active) return null;

  if (staff.role_id) {
    staff.staff_roles = { id: staff.role_id, name: staff.role_name };
  }

  return staff;
}

// ─── Permission Check ──────────────────────────────────────────
/**
 * Checks if a staff member has a specific permission.
 * Priority: staff_permission_overrides > staff_role_permissions
 */
export async function staffHasPermission(staffId, permissionKey, action = "view") {
  // 1. Get permission ID
  const perm = await sql`
    SELECT id FROM staff_permissions_master WHERE key = ${permissionKey} LIMIT 1
  `;

  if (!perm || perm.length === 0) return false;
  const permId = perm[0].id;

  // 2. Check direct override first (highest priority)
  const override = await sql`
    SELECT * FROM staff_permission_overrides
    WHERE staff_id = ${staffId} AND permission_id = ${permId}
    LIMIT 1
  `;

  if (override && override.length > 0) {
    const o = override[0];
    const actionMap = {
      view: o.can_view,
      create: o.can_create,
      update: o.can_update,
      delete: o.can_delete,
    };
    return actionMap[action] ?? false;
  }

  // 3. Fall back to role-based permission
  const staff = await sql`
    SELECT role_id FROM staffs WHERE id = ${staffId} LIMIT 1
  `;

  if (!staff || staff.length === 0 || !staff[0].role_id) return false;

  const rolePerm = await sql`
    SELECT id FROM staff_role_permissions
    WHERE role_id = ${staff[0].role_id} AND permission_id = ${permId}
    LIMIT 1
  `;

  return rolePerm.length > 0;
}

// ─── Get All Permissions for a Staff (merged) ──────────────────
export async function getStaffPermissions(staffId) {
  const staffRes = await sql`
    SELECT role_id FROM staffs WHERE id = ${staffId} LIMIT 1
  `;

  if (!staffRes || staffRes.length === 0) return [];

  const allPerms = await sql`
    SELECT * FROM staff_permissions_master ORDER BY module ASC, key ASC
  `;

  if (!allPerms || allPerms.length === 0) return [];

  let rolePermIds = new Set();
  if (staffRes[0].role_id) {
    const rolePerms = await sql`
      SELECT permission_id FROM staff_role_permissions WHERE role_id = ${staffRes[0].role_id}
    `;
    if (rolePerms) {
      rolePermIds = new Set(rolePerms.map((rp) => rp.permission_id));
    }
  }

  const overrides = await sql`
    SELECT * FROM staff_permission_overrides WHERE staff_id = ${staffId}
  `;

  const overrideMap = {};
  if (overrides) {
    overrides.forEach((o) => {
      overrideMap[o.permission_id] = o;
    });
  }

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
  try {
    const ip = req?.headers?.get("x-forwarded-for") || req?.headers?.get("x-real-ip") || null;
    const ua = req?.headers?.get("user-agent") || null;
    await sql`
      INSERT INTO staff_activity_logs (
        staff_id, staff_name, action, module, details, ip_address, user_agent
      ) VALUES (
        ${staffId}, ${staffName}, ${action}, ${module},
        ${details ? JSON.stringify(details) : null},
        ${ip}, ${ua}
      )
    `;
  } catch (e) {
    console.warn("Failed to write to staff_activity_logs:", e.message);
  }
}

// ─── Generate Employee Code ────────────────────────────────────
export async function generateEmployeeCode() {
  const prefix = "MC";
  const [{ count }] = await sql`
    SELECT count(*)::int as count FROM staffs
  `;
  const num = (count || 0) + 1;
  return `${prefix}${String(num).padStart(5, "0")}`;
}
