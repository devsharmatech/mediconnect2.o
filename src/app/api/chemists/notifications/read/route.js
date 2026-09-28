import sql from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/* --------------------------------
   PATCH → Mark Read
-------------------------------- */
export async function PATCH(req) {
  try {
    const { notification_id, user_id, mark_all } = await req.json();

    if (!user_id)
      return Response.json(
        { success: false, message: "user_id required" },
        { status: 400, headers: corsHeaders }
      );

    // MARK ALL AS READ
    if (mark_all === true) {
      await sql`
        UPDATE notifications
        SET read = true
        WHERE user_id = ${user_id} AND read = false
      `;

      return Response.json(
        { success: true, message: "All notifications marked as read" },
        { headers: corsHeaders }
      );
    }

    // MARK SINGLE AS READ
    if (!notification_id)
      return Response.json(
        { success: false, message: "notification_id required" },
        { status: 400, headers: corsHeaders }
      );

    await sql`
      UPDATE notifications
      SET read = true
      WHERE id = ${notification_id} AND user_id = ${user_id}
    `;

    return Response.json(
      { success: true, message: "Notification marked as read" },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("[Notifications PATCH] Error:", err);
    return Response.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
