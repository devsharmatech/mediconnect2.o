/**
 * Admin → Permissions Master List
 * GET /api/admin/permissions — list all available permissions (grouped by module)
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await sql`
      SELECT * 
      FROM staff_permissions_master 
      ORDER BY module ASC, key ASC
    `;

    // Group by module
    const grouped = {};
    (data || []).forEach((p) => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });

    return success("Permissions list", { permissions: data, grouped });
  } catch (err) {
    console.error("[admin/permissions] Error:", err);
    return failure("Failed to fetch permissions", err.message, 500);
  }
}
