/**
 * Admin → Staff Activity Logs
 * GET /api/admin/staff-logs — list activity logs (immutable, read-only)
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staff_id") || "";
    const action = searchParams.get("action") || "";
    const module = searchParams.get("module") || "";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const conditions = [];

    if (staffId) conditions.push(sql`staff_id = ${staffId}`);
    if (action) conditions.push(sql`action ILIKE ${'%' + action + '%'}`);
    if (module) conditions.push(sql`module = ${module}`);

    const whereClause = conditions.length > 0
      ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
      : sql``;

    const [countRes, logs] = await Promise.all([
      sql`SELECT count(*)::int as count FROM staff_activity_logs ${whereClause}`,
      sql`
        SELECT * 
        FROM staff_activity_logs 
        ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `
    ]);

    const total = countRes[0]?.count || 0;

    return success("Activity logs", { logs: logs || [], total });
  } catch (err) {
    console.error("[admin/staff-logs] Error:", err);
    return failure("Failed to fetch logs", err.message, 500);
  }
}
