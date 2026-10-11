/**
 * LAYER-1: Care Episode Service (AWS RDS PostgreSQL)
 *
 * All patient interactions must attach to a care_episode.
 * This service handles creation, closure, and retrieval of care episodes.
 * 100% Direct AWS RDS PostgreSQL.
 */

import sql from "@/lib/db";
import { logActivity } from "./activityLogger";
import { logAudit } from "./auditLogger";

/**
 * Create a new care episode
 * @param {string} patient_id - UUID of the patient
 * @param {string} episode_type - consultation | lab | pharmacy | nursing | wellness | equipment
 * @returns {object} { success, data, error }
 */
export async function createCareEpisode(
  patient_id,
  episode_type = "consultation",
) {
  try {
    if (!patient_id) {
      return { success: false, error: "patient_id is required" };
    }

    const validTypes = [
      "consultation",
      "lab",
      "pharmacy",
      "nursing",
      "wellness",
      "equipment",
    ];
    if (!validTypes.includes(episode_type)) {
      return {
        success: false,
        error: `Invalid episode_type. Must be one of: ${validTypes.join(", ")}`,
      };
    }

    const rows = await sql`
      INSERT INTO care_episodes (
        patient_id,
        episode_type,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${patient_id},
        ${episode_type},
        'active',
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    const data = rows[0];

    // Automatically initialize care_episode_summary
    try {
      await sql`
        INSERT INTO care_episode_summary (
          care_episode_id,
          latest_status,
          updated_at
        ) VALUES (
          ${data.id},
          'CREATED',
          NOW()
        )
        ON CONFLICT (care_episode_id) DO NOTHING
      `;
    } catch (e) {
      // Non-fatal summary note
    }

    // Log activity
    await logActivity({
      patient_id,
      care_episode_id: data.id,
      module_type: "care_episode",
      action_type: "created",
      reference_id: data.id,
      description: `Care episode created: ${episode_type}`,
    });

    return { success: true, data };
  } catch (err) {
    console.error("createCareEpisode error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Close a care episode
 * @param {string} episode_id - UUID of the care episode
 * @param {string} closed_by - UUID of the user closing it
 * @returns {object} { success, data, error }
 */
export async function closeCareEpisode(episode_id, closed_by = null) {
  try {
    if (!episode_id) {
      return { success: false, error: "episode_id is required" };
    }

    // Fetch current state
    const currentRows = await sql`
      SELECT * FROM care_episodes WHERE id = ${episode_id} LIMIT 1
    `;
    const current = currentRows[0];

    if (!current) return { success: false, error: "Care episode not found" };
    if (current.status === "closed")
      return { success: false, error: "Care episode already closed" };

    const updatedRows = await sql`
      UPDATE care_episodes
      SET status = 'closed',
          closed_at = NOW(),
          updated_at = NOW()
      WHERE id = ${episode_id}
      RETURNING *
    `;
    const data = updatedRows[0];

    // Audit log
    await logAudit({
      entity_type: "care_episode",
      entity_id: episode_id,
      previous_state: { status: current.status },
      new_state: { status: "closed" },
      changed_by: closed_by,
      change_description: "Care episode closed",
    });

    return { success: true, data };
  } catch (err) {
    console.error("closeCareEpisode error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get a care episode by ID with linked entities
 * @param {string} episode_id
 * @returns {object} { success, data, error }
 */
export async function getCareEpisode(episode_id) {
  try {
    const rows = await sql`
      SELECT ce.*,
             COALESCE(
               (SELECT json_agg(c.*) FROM consultations c WHERE c.care_episode_id = ce.id),
               '[]'::json
             ) as consultations,
             (SELECT json_build_object('id', u.id, 'phone_number', u.phone_number) FROM users u WHERE u.id = ce.patient_id) as patient
      FROM care_episodes ce
      WHERE ce.id = ${episode_id}
      LIMIT 1
    `;

    if (rows.length === 0) return { success: false, error: "Care episode not found" };
    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("getCareEpisode error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * List care episodes for a patient
 * @param {string} patient_id
 * @param {object} options - { status, episode_type, page, limit }
 * @returns {object} { success, data, pagination, error }
 */
export async function listCareEpisodes(patient_id, options = {}) {
  try {
    const { status, episode_type, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let query = sql`
      SELECT *, COUNT(*) OVER()::int as total_count
      FROM care_episodes
      WHERE patient_id = ${patient_id}
    `;

    if (status) {
      query = sql`${query} AND status = ${status}`;
    }
    if (episode_type) {
      query = sql`${query} AND episode_type = ${episode_type}`;
    }

    query = sql`${query} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const rows = await query;
    const total = rows.length > 0 ? rows[0].total_count : 0;

    return {
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    console.error("listCareEpisodes error:", err);
    return { success: false, error: err.message };
  }
}
