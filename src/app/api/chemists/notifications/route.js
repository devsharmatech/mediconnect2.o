import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const user_id = searchParams.get("user_id");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const read = searchParams.get("read");
    const type = searchParams.get("type");

    if (!user_id)
      return Response.json(
        { success: false, message: "user_id required" },
        { status: 400, headers: corsHeaders }
      );

    const offset = (page - 1) * limit;

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (read === "true") query = query.eq("read", true);
    if (read === "false") query = query.eq("read", false);
    if (type) query = query.eq("type", type);

    const { data, count, error } = await query;
    if (error) throw error;

    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("read", false);

    return Response.json(
      {
        success: true,
        notifications: data,
        total: count,
        unread_count: unreadCount || 0,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    return Response.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
