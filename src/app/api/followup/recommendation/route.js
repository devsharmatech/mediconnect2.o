import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/followup/recommendation
 * Fetches follow-up recommendations for a given care episode or patient
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const care_episode_id = searchParams.get("care_episode_id");

        if (!care_episode_id) {
            return failure("care_episode_id is required", null, 400);
        }

        // Fetch the consultation that required a follow-up
        const { data: consultation, error: fetchErr } = await supabase
            .from("consultations")
            .select("id, doctor_id, follow_up_required, completed_at, final_clinical_version_id")
            .eq("care_episode_id", care_episode_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (fetchErr || !consultation || !consultation.follow_up_required) {
            return success("No follow-up recommended", { recommended: false });
        }

        // Fetch follow-up days from clinical snapshot
        let followupDays = 7; // Default
        if (consultation.final_clinical_version_id) {
            const { data: clinicalVersion } = await supabase
                .from("consultation_clinical_version")
                .select("snapshot_json")
                .eq("id", consultation.final_clinical_version_id)
                .single();

            if (clinicalVersion?.snapshot_json?.follow_up_days) {
                followupDays = clinicalVersion.snapshot_json.follow_up_days;
            }
        }

        const recommendedDate = new Date(new Date(consultation.completed_at).getTime() + followupDays * 24 * 60 * 60 * 1000);

        return success("Follow-up recommendation fetched", {
            recommended: true,
            care_episode_id,
            consultation_id: consultation.id,
            doctor_id: consultation.doctor_id,
            recommended_date: recommendedDate.toISOString(),
            follow_up_days: followupDays
        });

    } catch (err) {
        console.error("GET /api/followup/recommendation error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
