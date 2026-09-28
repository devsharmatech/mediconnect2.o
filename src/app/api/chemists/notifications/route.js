import sql from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const user_id = searchParams.get("user_id");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const readParam = searchParams.get("read");
    const type = searchParams.get("type");

    if (!user_id)
      return Response.json(
        { success: false, message: "user_id required" },
        { status: 400, headers: corsHeaders }
      );

    const offset = (page - 1) * limit;

    // Build dynamic WHERE conditions
    const conditions = [sql`user_id = ${user_id}`];
    if (readParam === "true") conditions.push(sql`read = true`);
    if (readParam === "false") conditions.push(sql`read = false`);
    if (type) conditions.push(sql`type = ${type}`);

    const whereClause = sql`WHERE ${conditions.reduce((acc, cond, i) =>
      i === 0 ? cond : sql`${acc} AND ${cond}`
    )}`;

    const notifications = await sql`
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count FROM notifications
      ${whereClause}
    `;

    const [{ unread_count }] = await sql`
      SELECT COUNT(*)::int AS unread_count FROM notifications
      WHERE user_id = ${user_id} AND read = false
    `;

    return Response.json(
      {
        success: true,
        notifications,
        total: count,
        unread_count: unread_count || 0,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("[Notifications GET] Error:", err);
    return Response.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
