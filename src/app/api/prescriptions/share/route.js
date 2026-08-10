import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/layer1/activityLogger";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/prescriptions/share
 * Share a prescription with a chemist or lab.
 *
 * Body: {
 *   prescription_id: uuid,       — the prescription to share
 *   shared_with_type: "chemist" | "lab",
 *   shared_with_id: uuid,        — chemist_details.id or lab_details.id
 *   shared_by: uuid,             — patient user id (who is sharing)
 * }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { prescription_id, shared_with_type, shared_with_id, shared_by } = body || {};

    // Validate required fields
    if (!prescription_id || !shared_with_type || !shared_with_id || !shared_by) {
      return failure(
        "prescription_id, shared_with_type, shared_with_id, and shared_by are required.",
        null,
        400,
        { headers: corsHeaders }
      );
    }

    if (!["chemist", "lab"].includes(shared_with_type)) {
      return failure(
        "shared_with_type must be 'chemist' or 'lab'.",
        null,
        400,
        { headers: corsHeaders }
      );
    }

    // Verify the prescription exists and belongs to this patient
    const { data: prescription, error: rxErr } = await supabase
      .from("prescriptions")
      .select("id, patient_id, doctor_id, status")
      .eq("id", prescription_id)
      .maybeSingle();

    if (rxErr) throw rxErr;
    if (!prescription) {
      return failure("Prescription not found.", null, 404, { headers: corsHeaders });
    }
    if (prescription.patient_id !== shared_by) {
      return failure("You can only share your own prescriptions.", null, 403, { headers: corsHeaders });
    }

    // Check for duplicate share
    const { data: existing } = await supabase
      .from("prescription_shares")
      .select("id")
      .eq("prescription_id", prescription_id)
      .eq("shared_with_type", shared_with_type)
      .eq("shared_with_id", shared_with_id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return failure(
        `This prescription has already been shared with this ${shared_with_type}.`,
        null,
        409,
        { headers: corsHeaders }
      );
    }

    // Insert the share record
    const { data: share, error: insertErr } = await supabase
      .from("prescription_shares")
      .insert({
        prescription_id,
        shared_by,
        shared_with_type,
        shared_with_id,
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
        status: "active",
      })
      .select("*")
      .single();

    if (insertErr) throw insertErr;

    // ✅ LAYER-1: Activity log for prescription sharing (fire-and-forget)
    logActivity({
      patient_id: shared_by,
      actor_id: shared_by,
      module_type: "pharmacy",
      action_type: `prescription_shared_to_${shared_with_type}`,
      reference_id: share.id,
      description: `Patient shared prescription with a ${shared_with_type}`,
      metadata: { prescription_id, shared_with_id, shared_with_type },
    }).then(null, () => {});

    // Send notification to the recipient
    try {
      const { data: recipientUser } = await supabase
        .from("users")
        .select("id, fcm_token")
        .eq("id", shared_with_id)
        .maybeSingle();

      if (recipientUser) {
        // Insert notification
        await supabase.from("notifications").insert({
          user_id: shared_with_id,
          title: "New Prescription Shared",
          message: `A patient has shared a prescription with you for review.`,
          type: "prescription_share",
          metadata: {
            prescription_id,
            share_id: share.id,
            shared_by,
          },
        });
      }
    } catch (notifErr) {
      // Non-critical — don't fail the share if notification fails
      console.error("Notification error (non-critical):", notifErr);
    }

    return success("Prescription shared successfully.", share, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Share prescription error:", error);
    return failure("Failed to share prescription.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
