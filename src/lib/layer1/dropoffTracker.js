/**
 * LAYER-111: Drop-Off Tracker (PDF Part 4-6)
 * 
 * Tracks consultation funnel drop-offs:
 * - STARTED → not COMPLETED (abandoned)
 * - COMPLETED → no follow-up response (lost patient)
 * - FOLLOW_UP_PENDING → no response (unresolved)
 * 
 * Called by: /api/cron/followup (can be added to daily job)
 */

import { supabase } from "@/lib/supabaseAdmin";

/**
 * Scan and record drop-offs
 * @returns {object} { tracked_count, errors }
 */
export async function trackDropoffs() {
    const results = { tracked_count: 0, errors: [] };
    const now = new Date();

    try {
        // ── 1. STARTED but never COMPLETED (>24 hours old) ──
        const staleThreshold = new Date(now);
        staleThreshold.setDate(staleThreshold.getDate() - 1);

        const { data: abandoned } = await supabase
            .from("consultations")
            .select("id")
            .eq("case_status", "STARTED")
            .lte("created_at", staleThreshold.toISOString());

        if (abandoned && abandoned.length > 0) {
            // Check which aren't already tracked
            const { data: existing } = await supabase
                .from("consultation_dropoff")
                .select("consultation_id")
                .in("consultation_id", abandoned.map(a => a.id))
                .eq("dropoff_stage", "ABANDONED_STARTED");

            const existingIds = new Set((existing || []).map(e => e.consultation_id));
            const newDropoffs = abandoned.filter(a => !existingIds.has(a.id));

            if (newDropoffs.length > 0) {
                await supabase
                    .from("consultation_dropoff")
                    .insert(newDropoffs.map(d => ({
                        consultation_id: d.id,
                        dropoff_stage: "ABANDONED_STARTED",
                    })));
                results.tracked_count += newDropoffs.length;
            }
        }

        // ── 2. COMPLETED but no follow-up (follow_up_required=true, >3 days) ──
        const followUpThreshold = new Date(now);
        followUpThreshold.setDate(followUpThreshold.getDate() - 3);

        const { data: noFollowup } = await supabase
            .from("consultations")
            .select("id")
            .eq("case_status", "COMPLETED")
            .eq("follow_up_required", true)
            .lte("updated_at", followUpThreshold.toISOString());

        if (noFollowup && noFollowup.length > 0) {
            const { data: existing } = await supabase
                .from("consultation_dropoff")
                .select("consultation_id")
                .in("consultation_id", noFollowup.map(n => n.id))
                .eq("dropoff_stage", "NO_FOLLOWUP");

            const existingIds = new Set((existing || []).map(e => e.consultation_id));
            const newDropoffs = noFollowup.filter(n => !existingIds.has(n.id));

            if (newDropoffs.length > 0) {
                await supabase
                    .from("consultation_dropoff")
                    .insert(newDropoffs.map(d => ({
                        consultation_id: d.id,
                        dropoff_stage: "NO_FOLLOWUP",
                    })));
                results.tracked_count += newDropoffs.length;
            }
        }

        // ── 3. FOLLOW_UP_PENDING with no patient response (>7 days) ──
        const pendingThreshold = new Date(now);
        pendingThreshold.setDate(pendingThreshold.getDate() - 7);

        const { data: noResponse } = await supabase
            .from("consultations")
            .select("id")
            .eq("case_status", "FOLLOW_UP_PENDING")
            .lte("updated_at", pendingThreshold.toISOString());

        if (noResponse && noResponse.length > 0) {
            const { data: existing } = await supabase
                .from("consultation_dropoff")
                .select("consultation_id")
                .in("consultation_id", noResponse.map(n => n.id))
                .eq("dropoff_stage", "FOLLOWUP_NO_RESPONSE");

            const existingIds = new Set((existing || []).map(e => e.consultation_id));
            const newDropoffs = noResponse.filter(n => !existingIds.has(n.id));

            if (newDropoffs.length > 0) {
                await supabase
                    .from("consultation_dropoff")
                    .insert(newDropoffs.map(d => ({
                        consultation_id: d.id,
                        dropoff_stage: "FOLLOWUP_NO_RESPONSE",
                    })));
                results.tracked_count += newDropoffs.length;
            }
        }
    } catch (err) {
        results.errors.push({ global: err.message });
    }

    return results;
}
