/**
 * LAYER-111: Incident Service — AWS RDS PostgreSQL Direct
 *
 * Creates and manages operational incident logs in AWS RDS PostgreSQL.
 */

import sql from "@/lib/db";

/**
 * Creates an operational incident log.
 * @param {string} source — Where the failure originated (PAYMENT_WEBHOOK, OUTBOX, etc.)
 * @param {string} priority — P1 (critical), P2 (major), P3 (minor)
 * @param {string} description — Detailed reason
 * @param {object} params — { reference_id, care_episode_id, metadata }
 */
export async function createIncident(source, priority, description, params = {}) {
  try {
    const { reference_id = null, care_episode_id = null, metadata = {} } = params;

    await sql`
      INSERT INTO ops_incident_log (
        source, priority, description, reference_id, care_episode_id, status, metadata
      ) VALUES (
        ${source}, ${priority}, ${description}, ${reference_id}, ${care_episode_id}, 'OPEN', ${JSON.stringify(metadata)}
      )
    `;
  } catch (err) {
    // Incident service must never throw — log to stderr only
    console.error('[IncidentService] Failed to create incident in RDS:', err.message);
  }
}

/**
 * Updates the resolution status of an incident.
 * @param {string} incidentId
 * @param {string} status — RESOLVED | INVESTIGATING | SUPPRESSED
 * @param {string|null} resolvedBy
 */
export async function updateIncidentStatus(incidentId, status, resolvedBy = null) {
  try {
    if (status === 'RESOLVED') {
      await sql`
        UPDATE ops_incident_log
        SET status = ${status},
            resolved_at = NOW(),
            resolved_by = ${resolvedBy}
        WHERE id = ${incidentId}
      `;
    } else {
      await sql`
        UPDATE ops_incident_log
        SET status = ${status}
        WHERE id = ${incidentId}
      `;
    }
  } catch (err) {
    console.error('[IncidentService] Failed to update incident in RDS:', err.message);
  }
}

/**
 * Query open incidents by priority.
 * @param {string} priority — P1 | P2 | P3 (optional)
 * @returns {Array}
 */
export async function getOpenIncidents(priority = null, limit = 50) {
  try {
    const lim = Math.max(1, Math.min(Number(limit) || 50, 100));
    if (priority) {
      return await sql`
        SELECT * FROM ops_incident_log
        WHERE status = 'OPEN' AND priority = ${priority}
        ORDER BY created_at DESC
        LIMIT ${lim}
      `;
    }
    return await sql`
      SELECT * FROM ops_incident_log
      WHERE status = 'OPEN'
      ORDER BY created_at DESC
      LIMIT ${lim}
    `;
  } catch {
    return [];
  }
}
