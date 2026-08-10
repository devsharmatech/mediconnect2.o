import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/home-visit/status/[id]
 * Fetch the status of a home visit request
 */
export async function GET(req, { params }) {
    try {
        const { id: request_id } = await params;

        if (!request_id) {
            return failure("request_id is required", null, 400);
        }

        const { data: request, error: fetchErr } = await supabase
            .from("home_visit_request")
            .select("id, patient_id, doctor_id, care_episode_id, scheduled_time, status")
            .eq("id", request_id)
            .single();

        if (fetchErr || !request) {
            return failure("Home visit request not found", null, 404);
        }

        return success("Home visit status fetched", {
            request_id: request.id,
            care_episode_id: request.care_episode_id,
            status: request.status,
            doctor_id: request.doctor_id,
            scheduled_time: request.scheduled_time
        });

    } catch (err) {
        console.error("GET /api/home-visit/status/[id] error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
