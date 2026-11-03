import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req, { params }) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("document_id");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit")) || 50;
    const offset = parseInt(searchParams.get("offset")) || 0;

    if (!userId) {
      return failure("User ID is required.", null, 400);
    }

    const conditions = [sql`user_id = ${userId}`];
    if (documentId) conditions.push(sql`document_id = ${documentId}`);
    if (action) conditions.push(sql`action = ${action}`);

    const whereClause = conditions.reduce((acc, curr, idx) =>
      idx === 0 ? curr : sql`${acc} AND ${curr}`
    );

    const logs = await sql`
      SELECT *
      FROM digital_locker_audit_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count
      FROM digital_locker_audit_logs
      WHERE ${whereClause}
    `;

    return success("Audit logs retrieved successfully.", {
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get Audit Logs Error:", error);
    return failure("Failed to retrieve audit logs.", error.message, 500);
  }
}
