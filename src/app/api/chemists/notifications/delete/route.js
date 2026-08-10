import { supabase } from "@/lib/supabaseAdmin";
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
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user_id);

      if (error) throw error;

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

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notification_id)
      .eq("user_id", user_id);

    if (error) throw error;

    return Response.json(
      { success: true, message: "Notification deleted" },
      { headers: corsHeaders }
    );
  } catch (err) {
    return Response.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
