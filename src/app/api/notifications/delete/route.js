import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { notification_ids, user_id } = await req.json();

    if (!notification_ids || !Array.isArray(notification_ids) || !user_id)
      return failure("notification_ids (array) and user_id required.", null, 400, { headers: corsHeaders });

    const { error } = await supabase
      .from("notifications")
      .delete()
      .in("id", notification_ids)
      .eq("user_id", user_id);

    if (error) throw error;

    return success("Notifications deleted successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return failure("Failed to delete notifications.", error.message, 500, { headers: corsHeaders });
  }
}
