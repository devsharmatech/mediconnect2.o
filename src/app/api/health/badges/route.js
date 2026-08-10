import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const badgeType = searchParams.get("type");

    if (!userId) {
      return failure("User ID is required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    let query = supabase
      .from("user_badges")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("earned_at", { ascending: false });

    if (badgeType) {
      query = query.eq("badge_type", badgeType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return success("User badges fetched successfully.", { badges: data }, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("GET User Badges Error:", error);
    return failure("Failed to fetch user badges. " + error.message, "fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}