import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, notification_ids = [] } = await req.json();

    if (!user_id)
      return failure("user_id is required.", null, 400, { headers: corsHeaders });

    if (Array.isArray(notification_ids) && notification_ids.length > 0) {
      // Mark specific notifications
      await sql`
        UPDATE notifications
        SET read = true
        WHERE user_id = ${user_id} AND id = ANY(${notification_ids})
      `;
    } else {
      // Mark all unread for this user
      await sql`
        UPDATE notifications
        SET read = true
        WHERE user_id = ${user_id} AND read = false
      `;
    }

    return success(
      notification_ids.length > 0
        ? "Selected notifications marked as read."
        : "All unread notifications marked as read.",
      null,
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Notification read error:", error);
    return failure("Failed to mark notifications as read.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
