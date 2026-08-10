/**
 * LAYER-1: Care Episode Service
 *
 * All patient interactions must attach to a care_episode.
 * This service handles creation, closure, and retrieval of care episodes.
 */

import { supabase } from "../supabaseAdmin";
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

    const { data, error } = await supabase
      .from("care_episodes")
      .insert({
        patient_id,
        episode_type,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    // Automatically initialize care_episode_summary
    await supabase.from("care_episode_summary").insert({
      care_episode_id: data.id,
      latest_status: "CREATED",
    });

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
    const { data: current, error: fetchErr } = await supabase
      .from("care_episodes")
      .select("*")
      .eq("id", episode_id)
      .single();

    if (fetchErr) throw fetchErr;
    if (!current) return { success: false, error: "Care episode not found" };
    if (current.status === "closed")
      return { success: false, error: "Care episode already closed" };

    const { data, error } = await supabase
      .from("care_episodes")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", episode_id)
      .select()
      .single();

    if (error) throw error;

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
 * Get a care episode by ID with all linked entities
 * @param {string} episode_id
 * @returns {object} { success, data, error }
 */
export async function getCareEpisode(episode_id) {
  try {
    const { data, error } = await supabase
      .from("care_episodes")
      .select(
        `
                *,
                consultations (*),
                patient:users!care_episodes_patient_id_fkey (id, phone_number, details)
            `,
      )
      .eq("id", episode_id)
      .single();

    if (error) throw error;
    return { success: true, data };
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

    let query = supabase
      .from("care_episodes")
      .select("*", { count: "exact" })
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (episode_type) query = query.eq("episode_type", episode_type);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  } catch (err) {
    console.error("listCareEpisodes error:", err);
    return { success: false, error: err.message };
  }
}
