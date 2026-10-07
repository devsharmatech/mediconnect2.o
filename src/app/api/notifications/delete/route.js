import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { notification_ids, user_id, all = false } = await req.json();

    if (!user_id)
      return failure("user_id required.", null, 400, { headers: corsHeaders });

    if (all) {
      await sql`
        DELETE FROM notifications
        WHERE user_id = ${user_id}
      `;

      return success("All notifications deleted successfully.", null, 200, { headers: corsHeaders });
    }

    if (!notification_ids || !Array.isArray(notification_ids))
      return failure("notification_ids (array) and user_id required.", null, 400, { headers: corsHeaders });

    await sql`
      DELETE FROM notifications
      WHERE user_id = ${user_id} AND id = ANY(${notification_ids})
    `;

    return success("Notifications deleted successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Notification delete error:", error);
    return failure("Failed to delete notifications.", error.message, 500, { headers: corsHeaders });
  }
}
