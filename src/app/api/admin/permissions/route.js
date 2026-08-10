/**
 * Admin → Permissions Master List
 * GET /api/admin/permissions — list all available permissions (grouped by module)
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("staff_permissions_master")
      .select("*")
      .order("module", { ascending: true })
      .order("key", { ascending: true });

    if (error) {
      return failure("Failed to fetch permissions", error.message, 500);
    }

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
