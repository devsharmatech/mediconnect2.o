/**
 * LAYER-111: Follow-Up Engine
 * 
 * Background job system for follow-up automation (PDF Part 2-6, Part 4-4):
 * 1. Day 3 reminder — "How are you feeling?"
 * 2. Day 7 reminder — "Your follow-up is overdue"
 * 3. Pre-close nudge — "Final reminder before closing"
 * 4. Auto-close — Close unresponsive follow-ups after threshold
 * 
 * Called by: /api/cron/followup (daily cron job)
 */

import { supabase } from "@/lib/supabaseAdmin";
import { logActivity } from "./activityLogger";
import { insertOutboxEvent } from "./eventOutbox";
import { updateConsultationStatus } from "./consultationStateMachine";

const AUTO_CLOSE_DAYS = 14; // Close after 14 days of no response
const NUDGE_DAYS_BEFORE_CLOSE = 2; // Send nudge 2 days before auto-close

// ─────────────────────────────────────────────────────────
// 1. SEND DAY 3/7 REMINDERS
// ─────────────────────────────────────────────────────────

/**
 * Find and send follow-up reminders for Day 3 and Day 7
 * @returns {object} { day3_sent, day7_sent, errors }
 */
export async function sendFollowUpReminders() {
    const results = { day3_sent: 0, day7_sent: 0, errors: [] };

    try {
        const now = new Date();

        // Fetch all PENDING follow-up commitments
        const { data: commitments, error } = await supabase
            .from("care_followup_commitment")
            .select("*")
            .eq("status", "PENDING");

        if (error) throw error;
        if (!commitments || commitments.length === 0) return results;

        for (const commitment of commitments) {
            try {
                const createdAt = new Date(commitment.created_at);
                const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

                // Day 3 reminder
                if (daysSinceCreation >= 3 && !commitment.reminder_sent_day3) {
                    await supabase
                        .from("notifications")
                        .insert({
                            user_id: commitment.patient_id,
                            title: "How are you feeling?",
                            message: "Your doctor would like to know how you're doing. Please share your follow-up feedback.",
                            type: "followup_reminder",
                            metadata: { consultation_id: commitment.consultation_id, reminder_day: 3 },
                        });

                    await supabase
                        .from("care_followup_commitment")
                        .update({ reminder_sent_day3: true, updated_at: now.toISOString() })
                        .eq("id", commitment.id);

                    await insertOutboxEvent({
                        event_type: "FOLLOW_UP_DUE",
                        consultation_id: commitment.consultation_id,
                        care_episode_id: commitment.care_episode_id,
                        consultation_type: commitment.consultation_type || "STANDARD_MODE",
                        payload: { patient_id: commitment.patient_id, reminder_day: 3 },
                    });

                    results.day3_sent++;
                }

                // Overdue reminder (1 day after follow_up_date)
                const followUpDate = commitment.follow_up_date ? new Date(commitment.follow_up_date) : new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
                const daysSinceFollowUp = Math.floor((now - followUpDate) / (1000 * 60 * 60 * 24));

                if (daysSinceFollowUp >= 1 && !commitment.reminder_sent_day7) {
                    await supabase
                        .from("notifications")
                        .insert({
                            user_id: commitment.patient_id,
                            title: "Follow-up overdue",
                            message: "Your follow-up appointment is overdue. Please schedule or share your health update.",
                            type: "followup_reminder",
                            metadata: { consultation_id: commitment.consultation_id, reminder_day: 7 },
                        });

                    await supabase
                        .from("care_followup_commitment")
                        .update({ reminder_sent_day7: true, updated_at: now.toISOString() })
                        .eq("id", commitment.id);

                    await insertOutboxEvent({
                        event_type: "FOLLOW_UP_DUE",
                        consultation_id: commitment.consultation_id,
                        care_episode_id: commitment.care_episode_id,
                        consultation_type: commitment.consultation_type || "STANDARD_MODE",
                        payload: { patient_id: commitment.patient_id, overdue_days: daysSinceFollowUp },
                    });

                    results.day7_sent++;
                }
            } catch (err) {
                results.errors.push({ commitment_id: commitment.id, error: err.message });
            }
        }
    } catch (err) {
        results.errors.push({ global: err.message });
    }

    return results;
}

// ─────────────────────────────────────────────────────────
// 2. SEND PRE-CLOSE RE-ENGAGEMENT NUDGE
// ─────────────────────────────────────────────────────────

/**
 * Send nudge to patients before auto-closing their follow-up
 * @returns {object} { nudges_sent, errors }
 */
export async function sendReEngagementNudge() {
    const results = { nudges_sent: 0, errors: [] };

    try {
        const now = new Date();
        const nudgeThreshold = new Date(now);
        nudgeThreshold.setDate(nudgeThreshold.getDate() - (AUTO_CLOSE_DAYS - NUDGE_DAYS_BEFORE_CLOSE));

        // Fetch commitments approaching auto-close
        const { data: commitments, error } = await supabase
            .from("care_followup_commitment")
            .select("*")
            .eq("status", "PENDING")
            .eq("nudge_sent", false)
            .lte("follow_up_date", nudgeThreshold.toISOString().split('T')[0]);

        if (error) throw error;
        if (!commitments || commitments.length === 0) return results;

        for (const commitment of commitments) {
            try {
                await supabase
                    .from("notifications")
                    .insert({
                        user_id: commitment.patient_id,
                        title: "Final reminder — follow-up closing soon",
                        message: "Your follow-up will be automatically closed in 2 days. Tap to respond or schedule a visit.",
                        type: "followup_nudge",
                        metadata: { consultation_id: commitment.consultation_id },
                    });

                await supabase
                    .from("care_followup_commitment")
                    .update({ nudge_sent: true, updated_at: now.toISOString() })
                    .eq("id", commitment.id);

                results.nudges_sent++;
            } catch (err) {
                results.errors.push({ commitment_id: commitment.id, error: err.message });
            }
        }
    } catch (err) {
        results.errors.push({ global: err.message });
    }

    return results;
}

// ─────────────────────────────────────────────────────────
// 3. AUTO-CLOSE UNRESPONSIVE FOLLOW-UPS
// ─────────────────────────────────────────────────────────

/**
 * Auto-close follow-ups that have exceeded the threshold
 * @returns {object} { closed_count, errors }
 */
export async function processAutoClose() {
    const results = { closed_count: 0, errors: [] };

    try {
        const now = new Date();
        const closeThreshold = new Date(now);
        closeThreshold.setDate(closeThreshold.getDate() - AUTO_CLOSE_DAYS);

        // Fetch commitments past the auto-close threshold
        const { data: commitments, error } = await supabase
            .from("care_followup_commitment")
            .select("*")
            .eq("status", "PENDING")
            .lte("follow_up_date", closeThreshold.toISOString().split('T')[0]);

        if (error) throw error;
        if (!commitments || commitments.length === 0) return results;

        for (const commitment of commitments) {
            try {
                // Close the follow-up commitment
                await supabase
                    .from("care_followup_commitment")
                    .update({
                        status: "CLOSED_NO_RESPONSE",
                        auto_closed_at: now.toISOString(),
                        updated_at: now.toISOString(),
                    })
                    .eq("id", commitment.id);

                // Update consultation status via state machine
                await updateConsultationStatus(
                    commitment.consultation_id,
                    "CLOSED_NO_RESPONSE",
                    null // system actor
                );

                // Log activity
                await logActivity({
                    patient_id: commitment.patient_id,
                    care_episode_id: commitment.care_episode_id,
                    actor_id: null, // system action
                    module_type: "consultation",
                    action_type: "auto_closed",
                    reference_id: commitment.consultation_id,
                    description: `Follow-up auto-closed after ${AUTO_CLOSE_DAYS} days of no response`,
                });

                // Write outbox event
                await insertOutboxEvent({
                    event_type: "FOLLOWUP_MISSED",
                    consultation_id: commitment.consultation_id,
                    care_episode_id: commitment.care_episode_id,
                    consultation_type: commitment.consultation_type || "STANDARD_MODE",
                    payload: { patient_id: commitment.patient_id },
                });

                // Notify patient
                await supabase
                    .from("notifications")
                    .insert({
                        user_id: commitment.patient_id,
                        title: "Follow-up closed",
                        message: "Your follow-up has been closed due to no response. You can start a new consultation anytime.",
                        type: "followup_closed",
                        metadata: { consultation_id: commitment.consultation_id },
                    });

                results.closed_count++;
            } catch (err) {
                results.errors.push({ commitment_id: commitment.id, error: err.message });
            }
        }
    } catch (err) {
        results.errors.push({ global: err.message });
    }

    return results;
}

// ─────────────────────────────────────────────────────────
// MASTER: Run all follow-up jobs
// ─────────────────────────────────────────────────────────

/**
 * Run all follow-up jobs in sequence
 * @returns {object} { reminders, nudges, auto_close }
 */
export async function runAllFollowUpJobs() {
    const reminders = await sendFollowUpReminders();
    const nudges = await sendReEngagementNudge();
    const auto_close = await processAutoClose();

    return { reminders, nudges, auto_close };
}
