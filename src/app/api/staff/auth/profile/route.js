/**
 * Staff Profile Update API
 * PUT /api/staff/auth/profile — update own profile fields
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { getAuthenticatedStaff } from "@/lib/staffAuth";

export const dynamic = 'force-dynamic';

export async function PUT(req) {
  try {
    const staff = await getAuthenticatedStaff(req);
    if (!staff) {
      return failure("Unauthorized", null, 401);
    }

    const body = await req.json();
    const { full_name, email, phone, address } = body;

    const updates = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (email !== undefined) updates.email = email.toLowerCase().trim();
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;

    if (Object.keys(updates).length <= 1) {
      return failure("No fields to update", null, 400);
    }

    const rows = await sql`
      UPDATE staffs
      SET ${sql(updates)}
      WHERE id = ${staff.id}
      RETURNING *
    `;

    if (!rows || rows.length === 0) {
      return failure("Staff not found", null, 404);
    }

    const { password_hash, ...safeData } = rows[0];
    return success("Profile updated", safeData);
  } catch (err) {
    console.error("[staff/auth/profile] Error:", err);
    return failure("Failed to update profile", err.message, 500);
  }
}
