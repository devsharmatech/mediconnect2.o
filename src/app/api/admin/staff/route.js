/**
 * Admin → Staff CRUD APIs
 * GET  /api/admin/staff         — list all staff
 * POST /api/admin/staff         — create new staff
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { hashPassword, generateEmployeeCode } from "@/lib/staffAuth";

export const dynamic = 'force-dynamic';

// GET — List all staff (with filters)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status"); // "active" | "disabled" | "all"
    const designation = searchParams.get("designation") || "";
    const department = searchParams.get("department") || "";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const conditions = [sql`s.deleted_at IS NULL`];

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(sql`(
        s.full_name ILIKE ${pattern} OR 
        s.email ILIKE ${pattern} OR 
        s.employee_code ILIKE ${pattern} OR 
        s.phone ILIKE ${pattern}
      )`);
    }

    if (status === "active") conditions.push(sql`s.is_active = true`);
    if (status === "disabled") conditions.push(sql`s.is_active = false`);
    if (designation) conditions.push(sql`s.designation = ${designation}`);
    if (department) conditions.push(sql`s.department ILIKE ${'%' + department + '%'}`);

    const whereClause = sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`;

    const [countRes, staffRows] = await Promise.all([
      sql`SELECT count(*)::int as count FROM staffs s ${whereClause}`,
      sql`
        SELECT 
          s.id, s.admin_id, s.full_name, s.email, s.phone, s.gender,
          s.date_of_birth, s.address, s.designation, s.department,
          s.employee_code, s.profile_picture, s.is_active, s.is_verified,
          s.last_login_at, s.created_at, s.updated_at, s.deleted_at, s.role_id,
          r.id as role_rel_id, r.name as role_rel_name
        FROM staffs s
        LEFT JOIN staff_roles r ON s.role_id = r.id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    ]);

    const count = countRes[0]?.count || 0;
    const safeData = staffRows.map(row => {
      const { role_rel_id, role_rel_name, ...staffObj } = row;
      staffObj.staff_roles = role_rel_id ? { id: role_rel_id, name: role_rel_name } : null;
      return staffObj;
    });

    return success("Staff list", { staff: safeData, total: count });
  } catch (err) {
    console.error("[admin/staff] Error:", err);
    return failure("Failed to fetch staff", err.message, 500);
  }
}

// POST — Create staff
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      full_name, email, phone, gender, date_of_birth,
      address, designation, department, password, role_id,
      profile_picture,
    } = body;

    // Validation
    if (!full_name || !email || !password) {
      return failure("Full name, email, and password are required", null, 400);
    }

    if (password.length < 6) {
      return failure("Password must be at least 6 characters", null, 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existing = await sql`
      SELECT id FROM staffs WHERE email = ${cleanEmail} AND deleted_at IS NULL LIMIT 1
    `;

    if (existing.length > 0) {
      return failure("A staff member with this email already exists", null, 409);
    }

    // Generate employee code & hash password
    const employee_code = await generateEmployeeCode();
    const password_hash = await hashPassword(password);

    const newRows = await sql`
      INSERT INTO staffs (
        full_name, email, phone, gender, date_of_birth,
        address, designation, department, employee_code,
        password_hash, role_id, profile_picture, is_active, is_verified
      ) VALUES (
        ${full_name.trim()},
        ${cleanEmail},
        ${phone || null},
        ${gender || null},
        ${date_of_birth || null},
        ${address || null},
        ${designation || "general"},
        ${department || null},
        ${employee_code},
        ${password_hash},
        ${role_id || null},
        ${profile_picture || null},
        true,
        false
      )
      RETURNING *
    `;

    if (!newRows || newRows.length === 0) {
      return failure("Failed to create staff", null, 500);
    }

    const createdStaff = newRows[0];
    delete createdStaff.password_hash;

    // Attach role if exists
    if (createdStaff.role_id) {
      const roleRow = await sql`SELECT id, name FROM staff_roles WHERE id = ${createdStaff.role_id} LIMIT 1`;
      createdStaff.staff_roles = roleRow[0] || null;
    } else {
      createdStaff.staff_roles = null;
    }

    return success("Staff member created", createdStaff, 201);
  } catch (err) {
    console.error("[admin/staff] Error:", err);
    return failure("Failed to create staff", err.message, 500);
  }
}
