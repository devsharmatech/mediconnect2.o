import { supabase } from "@/lib/supabaseAdmin";
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
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user_id)
        .eq("read", false);

      if (error) throw error;

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

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification_id)
      .eq("user_id", user_id);

    if (error) throw error;

    return Response.json(
      { success: true, message: "Notification marked as read" },
      { headers: corsHeaders }
    );
  } catch (err) {
    return Response.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
