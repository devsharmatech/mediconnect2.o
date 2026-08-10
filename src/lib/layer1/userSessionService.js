import { supabase } from "@/lib/supabaseAdmin";

/**
 * USER SESSION SERVICE
 * Manages active user sessions and screen state tracking.
 * Enforces a singleton active session per user.
 */

/**
 * Retrieves the currently active session for a user.
 * @param {string} user_id
 * @returns {object} { success, data, error }
 */
export async function getActiveSession(user_id) {
    try {
        if (!user_id) throw new Error("user_id is required");

        const { data, error } = await supabase
            .from("user_session_state")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error("getActiveSession error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Updates or creates an active session.
 * Automatically deactivates old sessions for the same user.
 * @param {object} params - { user_id, care_episode_id, consultation_id, last_screen }
 * @returns {object} { success, data, error }
 */
export async function updateSessionState({ user_id, care_episode_id, consultation_id, last_screen, channel = "WEB" }) {
    try {
        if (!user_id || !last_screen) throw new Error("user_id and last_screen are required");

        // Resolve a valid consultation_id from the DB to avoid foreign key constraint violations
        let validConsultationId = null;
        if (consultation_id) {
            // 1. Check if the value is directly a valid consultation_id
            const { data: consultById } = await supabase
                .from("consultations")
                .select("id")
                .eq("id", consultation_id)
                .maybeSingle();

            if (consultById?.id) {
                validConsultationId = consultById.id;
            } else {
                // 2. Check if the value is actually an appointment_id mapping to a consultation
                const { data: consultByApt } = await supabase
                    .from("consultations")
                    .select("id")
                    .eq("appointment_id", consultation_id)
                    .maybeSingle();

                if (consultByApt?.id) {
                    validConsultationId = consultByApt.id;
                }
            }
        }

        let resultData;
        try {
            // Check if active session already exists for this user and channel
            const { data: existingSession } = await supabase
                .from("user_session_state")
                .select("id")
                .eq("user_id", user_id)
                .eq("channel", channel)
                .eq("is_active", true)
                .maybeSingle();

            if (existingSession?.id) {
                // Update active session in-place
                const { data, error } = await supabase
                    .from("user_session_state")
                    .update({
                        care_episode_id: care_episode_id || null,
                        consultation_id: validConsultationId,
                        last_screen,
                        last_active_at: new Date().toISOString()
                    })
                    .eq("id", existingSession.id)
                    .select("id")
                    .single();

                if (error) throw error;
                resultData = data;
            } else {
                // Insert new active session
                const { data, error } = await supabase
                    .from("user_session_state")
                    .insert([{
                        user_id,
                        care_episode_id: care_episode_id || null,
                        consultation_id: validConsultationId,
                        channel,
                        last_screen,
                        last_active_at: new Date().toISOString(),
                        is_active: true
                    }])
                    .select("id")
                    .single();

                if (error) throw error;
                resultData = data;
            }
        } catch (dbErr) {
            // Catch unique constraint violation (code 23505) and retry by updating the concurrent session
            if (dbErr.code === "23505" || dbErr.message?.includes("unique constraint")) {
                const { data: existingSession } = await supabase
                    .from("user_session_state")
                    .select("id")
                    .eq("user_id", user_id)
                    .eq("channel", channel)
                    .eq("is_active", true)
                    .maybeSingle();

                if (existingSession?.id) {
                    const { data, error } = await supabase
                        .from("user_session_state")
                        .update({
                            care_episode_id: care_episode_id || null,
                            consultation_id: validConsultationId,
                            last_screen,
                            last_active_at: new Date().toISOString()
                        })
                        .eq("id", existingSession.id)
                        .select("id")
                        .single();

                    if (error) throw error;
                    resultData = data;
                } else {
                    throw dbErr;
                }
            } else {
                throw dbErr;
            }
        }

        return { success: true, data: resultData };

    } catch (err) {
        console.error("updateSessionState error:", err);
        return { success: false, error: err.message };
    }
}

