import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(_req, { params }) {
  try {
    const { userId } = await params;

    if (!userId) {
      return failure("User ID is required.", null, 400);
    }

    const { data: latestVerified, error } = await supabase
      .from("email_verifications")
      .select("id, email, is_verified, verified_at")
      .eq("user_id", userId)
      .eq("is_verified", true)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return success("Email verification status retrieved.", {
      user_id: userId,
      verified: Boolean(latestVerified?.is_verified),
      email: latestVerified?.email || null,
      verified_at: latestVerified?.verified_at || null,
    });
  } catch (error) {
    console.error("Email Status Error:", error);
    return failure("Failed to retrieve email verification status.", error.message, 500);
  }
}
