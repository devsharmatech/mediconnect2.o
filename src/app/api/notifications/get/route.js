import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, unread = false, page = 1 } = await req.json();

    if (!user_id)
      return failure("user_id is required.", null, 400, { headers: corsHeaders });

    const limit = 15;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (unread) query = query.eq("read", false);

    const { data, error } = await query;

    if (error) throw error;

    return success("Notifications fetched successfully.", data, 200, { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return failure("Failed to fetch notifications.", error.message, 500, { headers: corsHeaders });
  }
}
