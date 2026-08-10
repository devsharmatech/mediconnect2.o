/**
 * Admin → Staff Activity Logs
 * GET /api/admin/staff-logs — list activity logs (immutable, read-only)
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staff_id") || "";
    const action = searchParams.get("action") || "";
    const module = searchParams.get("module") || "";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("staff_activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (staffId) query = query.eq("staff_id", staffId);
    if (action) query = query.ilike("action", `%${action}%`);
    if (module) query = query.eq("module", module);

    const { data, count, error } = await query;

    if (error) {
      return failure("Failed to fetch logs", error.message, 500);
    }

    return success("Activity logs", { logs: data || [], total: count });
  } catch (err) {
    console.error("[admin/staff-logs] Error:", err);
    return failure("Failed to fetch logs", err.message, 500);
  }
}
