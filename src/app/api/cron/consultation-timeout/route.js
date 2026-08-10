import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";
import { createIncident } from "@/lib/layer1/incidentService";

/**
 * GET /api/cron/consultation-timeout
 * Scheduled checks for Doctor No-show and Consultation Timeout.
 * Run every 1-2 minutes.
 */
export async function GET(req) {
    // Basic auth check if needed for cron execution
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Warning: Add your proper cron secret verification
        // return failure("Unauthorized", null, 401);
    }

    try {
        const metrics = { no_shows: 0, timeouts: 0 };
        const now = new Date();
        const fiveMinsAgo = new Date(now.getTime() - 5 * 60000).toISOString();
        const fifteenMinsAgo = new Date(now.getTime() - 15 * 60000).toISOString();

        // ─────────────────────────────────────────────────────────
        // 1. DOCTOR NO-SHOW (5 minutes)
        // ─────────────────────────────────────────────────────────
        // Status STARTED, created_at < 5 mins ago, doctor_id is still null OR status never moved to ACTIVE
        const { data: noShows } = await supabase
            .from("consultations")
            .select("id, patient_id, care_episode_id, doctor_id, created_at")
            .eq("case_status", "STARTED")
            .lt("created_at", fiveMinsAgo)
            // Safety limit to avoid unbounded processing
            .limit(50);

        if (noShows && noShows.length > 0) {
            for (const cons of noShows) {
                // Mark FAILED
                await supabase
                    .from("consultations")
                    .update({ case_status: "FAILED" })
                    .eq("id", cons.id);

                // Create incident
                await createIncident("DOCTOR_NO_SHOW", "P2", `Doctor failed to join consultation ${cons.id} within 5 minutes.`, {
                    care_episode_id: cons.care_episode_id,
                    consultation_id: cons.id,
                    doctor_id: cons.doctor_id
                });

                // Trigger reassignment or auto-refund via outbox
                await insertOutboxEvent({
                    event_type: "CONSULTATION_FAILED_NO_SHOW",
                    consultation_id: cons.id,
                    care_episode_id: cons.care_episode_id,
                    consultation_type: "SYSTEM_CRON",
                    payload: { patient_id: cons.patient_id, reason: "doctor_no_show" }
                });

                metrics.no_shows++;
            }
        }

        // ─────────────────────────────────────────────────────────
        // 2. CONSULTATION TIMEOUT (15 minutes of inactivity)
        // ─────────────────────────────────────────────────────────
        // Check session table or just rely on status stuck in ACTIVE for > 15 mins
        const { data: timeouts } = await supabase
            .from("consultations")
            .select("id, patient_id, care_episode_id, doctor_id, updated_at")
            .eq("case_status", "ACTIVE")
            .lt("updated_at", fifteenMinsAgo)
            .limit(50);

        if (timeouts && timeouts.length > 0) {
            for (const cons of timeouts) {
                // Mark EXPIRED
                await supabase
                    .from("consultations")
                    .update({ case_status: "EXPIRED" })
                    .eq("id", cons.id);

                // Create incident
                await createIncident("CONSULTATION_TIMEOUT", "P3", `Consultation ${cons.id} timed out after 15 minutes of inactivity.`, {
                    care_episode_id: cons.care_episode_id,
                    consultation_id: cons.id,
                    doctor_id: cons.doctor_id
                });

                // Notify via outbox (release doctor is implicit by status changing from ACTIVE)
                await insertOutboxEvent({
                    event_type: "CONSULTATION_EXPIRED",
                    consultation_id: cons.id,
                    care_episode_id: cons.care_episode_id,
                    consultation_type: "SYSTEM_CRON",
                    payload: { patient_id: cons.patient_id, doctor_id: cons.doctor_id }
                });

                metrics.timeouts++;
            }
        }

        return success("Timeout cron executed successfully", metrics);

    } catch (err) {
        console.error("GET /api/cron/consultation-timeout error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
