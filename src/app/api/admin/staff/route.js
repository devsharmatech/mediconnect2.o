/**
 * Admin → Staff CRUD APIs
 * GET  /api/admin/staff         — list all staff
 * POST /api/admin/staff         — create new staff
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { hashPassword, generateEmployeeCode, logStaffActivity } from "@/lib/staffAuth";

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

    let query = supabase
      .from("staffs")
      .select("*, staff_roles(id, name)", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    if (status === "active") query = query.eq("is_active", true);
    if (status === "disabled") query = query.eq("is_active", false);
    if (designation) query = query.eq("designation", designation);
    if (department) query = query.ilike("department", `%${department}%`);

    const { data, count, error } = await query;

    if (error) {
      console.error("[admin/staff] list error:", error);
      return failure("Failed to fetch staff", error.message, 500);
    }

    // Remove password_hash from response
    const safeData = (data || []).map(({ password_hash, ...rest }) => rest);

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

    // Check duplicate email
    const { data: existing } = await supabase
      .from("staffs")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .is("deleted_at", null)
      .single();

    if (existing) {
      return failure("A staff member with this email already exists", null, 409);
    }

    // Generate employee code & hash password
    const employee_code = await generateEmployeeCode();
    const password_hash = await hashPassword(password);

    const insertData = {
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      gender: gender || null,
      date_of_birth: date_of_birth || null,
      address: address || null,
      designation: designation || "general",
      department: department || null,
      employee_code,
      password_hash,
      role_id: role_id || null,
      profile_picture: profile_picture || null,
      is_active: true,
      is_verified: false,
    };

    const { data: newStaff, error } = await supabase
      .from("staffs")
      .insert(insertData)
      .select("*, staff_roles(id, name)")
      .single();

    if (error) {
      console.error("[admin/staff] create error:", error);
      return failure("Failed to create staff", error.message, 500);
    }

    const { password_hash: _, ...safeStaff } = newStaff;

    return success("Staff member created", safeStaff, 201);
  } catch (err) {
    console.error("[admin/staff] Error:", err);
    return failure("Failed to create staff", err.message, 500);
  }
}
