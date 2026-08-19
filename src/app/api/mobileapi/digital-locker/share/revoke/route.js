import { supabase } from "@/lib/supabaseAdmin";
import { respondMobileSuccess, respondMobileFailure } from "@/lib/mobileApiGuard";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, share_id } = await req.json();

    if (!user_id || !share_id) {
      return respondMobileFailure("user_id and share_id are required.", null, 400);
    }

    // Verify the share belongs to this patient
    const { data: share, error: fetchErr } = await supabase
      .from("document_shares")
      .select("id, patient_id, status")
      .eq("id", share_id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!share) return respondMobileFailure("Share record not found.", null, 404);
    if (share.patient_id !== user_id) {
      return respondMobileFailure("Forbidden — you do not own this share.", null, 403);
    }
    if (share.status === "REVOKED") {
      return respondMobileFailure("Share is already revoked.", null, 409);
    }

    // Revoke the share
    const { error: updateErr } = await supabase
      .from("document_shares")
      .update({ status: "REVOKED", updated_at: new Date() })
      .eq("id", share_id);

    if (updateErr) throw updateErr;

    return respondMobileSuccess("Share access revoked successfully.", { share_id });
  } catch (error) {
    console.error("Revoke Share Error:", error);
    return respondMobileFailure("Failed to revoke share.", error.message, 500);
  }
}
