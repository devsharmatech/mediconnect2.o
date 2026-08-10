/**
 * LAYER-111: Event Outbox Helper
 *
 * ALL system events MUST be written here.
 * No direct Kafka / queue emission allowed.
 *
 * Rule: Every event MUST include:
 *   - care_episode_id
 *   - consultation_id
 *   - consultation_type
 */

import { supabase } from "../supabaseAdmin";

/**
 * Insert an event into the l1_event_outbox table.
 *
 * @param {object} params
 * @param {string} params.event_type        — e.g. "CONSULTATION_COMPLETED"
 * @param {string} params.consultation_id
 * @param {string} params.care_episode_id
 * @param {string} params.consultation_type — VIDEO | AUDIO | IN_PERSON | QUICK
 * @param {object} params.payload           — additional event data
 */
export async function insertOutboxEvent({
    event_type,
    consultation_id,
    care_episode_id,
    consultation_type,
    payload = {},
}) {
    // Enforce mandatory fields — hard reject, not silent failure
    if (!event_type)       throw new Error("OUTBOX_ERROR: event_type is required");
    if (!care_episode_id)  throw new Error("OUTBOX_ERROR: care_episode_id is required");
    if (!consultation_id)  throw new Error("OUTBOX_ERROR: consultation_id is required");
    if (!consultation_type) throw new Error("OUTBOX_ERROR: consultation_type is required");

    const { error } = await supabase
        .from("l1_event_outbox")
        .insert({
            event_type,
            consultation_id,
            care_episode_id,
            consultation_type,
            payload,
            status: "PENDING",
        });

    if (error) {
        // Log but still throw — outbox failure is CRITICAL
        console.error("OUTBOX INSERT FAILED:", error);
        throw new Error("OUTBOX_ERROR: Failed to persist event — " + error.message);
    }
}
