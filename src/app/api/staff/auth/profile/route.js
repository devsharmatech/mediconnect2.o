/**
 * Staff Profile Update API
 * PUT /api/staff/auth/profile — update own profile fields
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { getAuthenticatedStaff } from "@/lib/staffAuth";

export async function PUT(req) {
  try {
    const staff = await getAuthenticatedStaff(req);
    if (!staff) {
      return failure("Unauthorized", null, 401);
    }

    const body = await req.json();
    const { full_name, email, phone, address } = body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;

    if (Object.keys(updates).length === 0) {
      return failure("No fields to update", null, 400);
    }

    const { data, error } = await supabase
      .from("staffs")
      .update(updates)
      .eq("id", staff.id)
      .select()
      .single();

    if (error) throw error;

    const { password_hash, ...safeData } = data;
    return success("Profile updated", safeData);
  } catch (err) {
    console.error("[staff/auth/profile] Error:", err);
    return failure("Failed to update profile", err.message, 500);
  }
}
