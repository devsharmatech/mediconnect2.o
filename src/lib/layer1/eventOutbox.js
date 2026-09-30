/**
 * LAYER-111: Event Outbox Helper (AWS RDS PostgreSQL)
 *
 * ALL system events MUST be written here.
 * No direct Kafka / queue emission allowed.
 *
 * Rule: Every event MUST include:
 *   - care_episode_id
 *   - consultation_id
 *   - consultation_type
 */

import sql from "@/lib/db.js";

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
    if (!event_type)        throw new Error("OUTBOX_ERROR: event_type is required");
    if (!care_episode_id)   throw new Error("OUTBOX_ERROR: care_episode_id is required");
    if (!consultation_id)   throw new Error("OUTBOX_ERROR: consultation_id is required");
    if (!consultation_type) throw new Error("OUTBOX_ERROR: consultation_type is required");

    try {
        const payloadJson = typeof payload === "string" ? payload : JSON.stringify(payload);
        await sql`
            INSERT INTO l1_event_outbox (
                event_type, consultation_id, care_episode_id, consultation_type, payload, status
            ) VALUES (
                ${event_type}, ${consultation_id}, ${care_episode_id}, ${consultation_type}, ${payloadJson}::jsonb, 'PENDING'
            )
        `;
    } catch (error) {
        console.error("OUTBOX INSERT FAILED:", error.message);
        throw new Error("OUTBOX_ERROR: Failed to persist event — " + error.message);
    }
}
