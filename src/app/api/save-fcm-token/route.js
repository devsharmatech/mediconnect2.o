import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, fcm_token } = await req.json();

    if (!user_id || !fcm_token) {
      return failure("user_id & fcm_token required", null, 400, {
        headers: corsHeaders,
      });
    }

    // Save token in users table
    const { data, error } = await supabase
      .from("users")
      .update({ fcm_token })
      .select()
      .eq("id", user_id);

    if (error) throw error;

    return success("FCM token saved successfully", data, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    return failure("Failed to save FCM token", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
