/**
 * LAYER-111: Outcome Reliability Scorer
 * 
 * Calculates a 0-1 reliability score for consultation outcomes (PDF Part 4-5).
 * 
 * Scoring:
 * - followup_completed = TRUE  → +0.40
 * - adherence = "full"         → +0.30 (partial → +0.15, none → 0)
 * - consistency check          → +0.30 (symptom_change aligns with improvement_status)
 * 
 * Confidence Levels:
 * - Score >= 0.7 → HIGH
 * - Score >= 0.4 → MEDIUM
 * - Score < 0.4  → LOW
 */

import { supabase } from "@/lib/supabaseAdmin";

// ─────────────────────────────────────────────────────────
// MAIN SCORER
// ─────────────────────────────────────────────────────────

/**
 * Calculate reliability score for a consultation outcome
 * @param {object} outcome - consultation_outcome record
 * @returns {object} { score, confidence_level, breakdown }
 */
export function calculateReliabilityScore(outcome) {
    let score = 0;
    const breakdown = {};

    // ── Factor 1: Follow-up completed (+0.40) ──
    if (outcome.followup_completed === true) {
        score += 0.40;
        breakdown.followup_completed = 0.40;
    } else {
        breakdown.followup_completed = 0;
    }

    // ── Factor 2: Adherence (+0.30) ──
    switch (outcome.adherence) {
        case "full":
            score += 0.30;
            breakdown.adherence = 0.30;
            break;
        case "partial":
            score += 0.15;
            breakdown.adherence = 0.15;
            break;
        default:
            breakdown.adherence = 0;
    }

    // ── Factor 3: Consistency check (+0.30) ──
    // Check if symptom_change aligns with improvement_status
    const isConsistent = checkConsistency(outcome);
    if (isConsistent) {
        score += 0.30;
        breakdown.consistency = 0.30;
    } else {
        breakdown.consistency = 0;
    }

    // Round to 2 decimal places
    score = Math.round(score * 100) / 100;

    // Determine confidence level
    let confidence_level;
    if (score >= 0.7) {
        confidence_level = "HIGH";
    } else if (score >= 0.4) {
        confidence_level = "MEDIUM";
    } else {
        confidence_level = "LOW";
    }

    return { score, confidence_level, breakdown };
}

/**
 * Check consistency between symptom_change and improvement_status
 */
function checkConsistency(outcome) {
    const { symptom_change, improvement_status } = outcome;

    if (!symptom_change || !improvement_status) return false;

    // Consistent combinations
    const consistentPairs = {
        better: ["reduced"],
        same: ["same"],
        worse: ["increased"],
    };

    const expected = consistentPairs[improvement_status];
    if (!expected) return false;

    return expected.includes(symptom_change);
}

// ─────────────────────────────────────────────────────────
// PROCESS AND SAVE SCORE
// ─────────────────────────────────────────────────────────

/**
 * Calculate and save reliability score for an outcome
 * @param {string} outcome_id - consultation_outcome UUID
 * @returns {object} { success, score, confidence_level }
 */
export async function scoreAndSaveOutcome(outcome_id) {
    try {
        // Fetch outcome
        const { data: outcome, error } = await supabase
            .from("consultation_outcome")
            .select("*")
            .eq("id", outcome_id)
            .single();

        if (error || !outcome) {
            return { success: false, error: "Outcome not found" };
        }

        // Calculate score
        const { score, confidence_level, breakdown } = calculateReliabilityScore(outcome);

        // Update outcome record
        const { error: updateErr } = await supabase
            .from("consultation_outcome")
            .update({
                reliability_score: score,
                confidence_level,
            })
            .eq("id", outcome_id);

        if (updateErr) throw updateErr;

        return { success: true, score, confidence_level, breakdown };

    } catch (err) {
        console.error("scoreAndSaveOutcome error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Batch score all unscored outcomes
 * @returns {object} { scored_count, errors }
 */
export async function batchScoreOutcomes() {
    const results = { scored_count: 0, errors: [] };

    try {
        // Fetch outcomes without a confidence_level
        const { data: outcomes, error } = await supabase
            .from("consultation_outcome")
            .select("*")
            .is("confidence_level", null)
            .limit(100);

        if (error) throw error;
        if (!outcomes || outcomes.length === 0) return results;

        for (const outcome of outcomes) {
            const result = await scoreAndSaveOutcome(outcome.id);
            if (result.success) {
                results.scored_count++;
            } else {
                results.errors.push({ outcome_id: outcome.id, error: result.error });
            }
        }
    } catch (err) {
        results.errors.push({ global: err.message });
    }

    return results;
}
