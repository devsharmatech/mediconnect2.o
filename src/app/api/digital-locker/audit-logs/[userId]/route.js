import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

async function requireEmailVerified(userId) {
  const { data: latestVerified, error } = await supabase
    .from("email_verifications")
    .select("id, is_verified")
    .eq("user_id", userId)
    .eq("is_verified", true)
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!latestVerified?.is_verified) {
    return failure(
      "Email verification required to access Digital Locker.",
      { verified: false },
      403
    );
  }

  return null;
}

// GET - Retrieve audit logs for a user's documents
export async function GET(req, { params }) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("document_id");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit")) || 50;
    const offset = parseInt(searchParams.get("offset")) || 0;

    if (!userId) {
      return failure("User ID is required.", null, 400);
    }

    const verificationFailure = await requireEmailVerified(userId);
    if (verificationFailure) return verificationFailure;

    let query = supabase
      .from("digital_locker_audit_logs")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (documentId) {
      query = query.eq("document_id", documentId);
    }

    if (action) {
      query = query.eq("action", action);
    }

    const { data: logs, error, count } = await query;

    if (error) throw error;

    return success("Audit logs retrieved successfully.", {
      logs,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get Audit Logs Error:", error);
    return failure("Failed to retrieve audit logs.", error.message, 500);
  }
}
