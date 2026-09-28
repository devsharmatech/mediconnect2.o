import sql from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/* --------------------------------
   DELETE → Delete Notifications
-------------------------------- */
export async function DELETE(req) {
  try {
    const { notification_id, user_id, clear_all } = await req.json();

    if (!user_id)
      return Response.json(
        { success: false, message: "user_id required" },
        { status: 400, headers: corsHeaders }
      );

    // CLEAR ALL
    if (clear_all === true) {
      await sql`
        DELETE FROM notifications
        WHERE user_id = ${user_id}
      `;

      return Response.json(
        { success: true, message: "All notifications cleared" },
        { headers: corsHeaders }
      );
    }

    // DELETE SINGLE
    if (!notification_id)
      return Response.json(
        { success: false, message: "notification_id required" },
        { status: 400, headers: corsHeaders }
      );

    await sql`
      DELETE FROM notifications
      WHERE id = ${notification_id} AND user_id = ${user_id}
    `;

    return Response.json(
      { success: true, message: "Notification deleted" },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("[Notifications DELETE] Error:", err);
    return Response.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
