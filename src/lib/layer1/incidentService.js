/**
 * LAYER-111: Incident Service — Phase 5 Hardened
 *
 * Creates and manages operational incident logs.
 * Uses direct HTTP fetch (schema cache bypass).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function dbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        options.prefer || 'return=representation',
    },
    ...options
  });
  return res;
}

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

    await dbFetch('ops_incident_log', {
      method:  'POST',
      prefer:  'return=minimal',
      body: JSON.stringify([{
        source,
        priority,
        description,
        reference_id,
        care_episode_id,
        status:   'OPEN',
        metadata
      }])
    });
  } catch (err) {
    // Incident service must never throw — log to stderr only
    console.error('[IncidentService] Failed to create incident:', err.message);
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
    const updatePayload = { status };
    if (status === 'RESOLVED') {
      updatePayload.resolved_at = new Date().toISOString();
      if (resolvedBy) updatePayload.resolved_by = resolvedBy;
    }

    await dbFetch(`ops_incident_log?id=eq.${incidentId}`, {
      method:  'PATCH',
      prefer:  'return=minimal',
      body: JSON.stringify(updatePayload)
    });
  } catch (err) {
    console.error('[IncidentService] Failed to update incident:', err.message);
  }
}

/**
 * Query open incidents by priority.
 * @param {string} priority — P1 | P2 | P3 (optional)
 * @returns {Array}
 */
export async function getOpenIncidents(priority = null) {
  try {
    let path = 'ops_incident_log?status=eq.OPEN&order=created_at.desc';
    if (priority) path += `&priority=eq.${priority}`;
    const res = await dbFetch(path, { method: 'GET', prefer: '' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
