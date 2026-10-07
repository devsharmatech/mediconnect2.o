import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

// RFC-4122 UUID pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, unread = false, page = 1 } = await req.json();

    if (!user_id)
      return failure("user_id is required.", null, 400, { headers: corsHeaders });

    // Guard: reject non-UUID values before they hit Postgres (prevents 22P02 errors)
    if (!UUID_REGEX.test(user_id)) {
      return success("Notifications fetched successfully.", [], 200, { headers: corsHeaders });
    }

    const limit = 15;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const offset = (pageNum - 1) * limit;

    let data;
    if (unread) {
      data = await sql`
        SELECT * FROM notifications
        WHERE user_id = ${user_id} AND read = false
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      data = await sql`
        SELECT * FROM notifications
        WHERE user_id = ${user_id}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return success("Notifications fetched successfully.", data, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Notifications get error:", error);
    return failure("Failed to fetch notifications.", error.message, 500, { headers: corsHeaders });
  }
}
