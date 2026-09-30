/**
 * ENGAGEMENT ENGINE — Layer-111 Phase 3 (Hardened for AWS RDS PostgreSQL)
 *
 * Non-blocking intelligence layer that:
 * 1. Evaluates CTA routing (SHOW / DELAY / SUPPRESS) per user
 * 2. Tracks engagement signals into service_signal_log
 * 3. Updates user engagement/fatigue profiles
 *
 * 100% Direct AWS RDS PostgreSQL - Zero Supabase HTTP REST dependencies.
 */

import sql from "@/lib/db";

// In-memory config cache (60s TTL) to avoid DB hits on every CTA eval
let configCache = null;
let cacheTimestamp = 0;

// ─────────────────────────────────────────────────────────────────────────────
// 1. System Config — cached for 60s
// ─────────────────────────────────────────────────────────────────────────────
async function getSystemConfig() {
  const now = Date.now();
  if (configCache && (now - cacheTimestamp) < 60000) return configCache;

  try {
    const rows = await sql`SELECT config_key, config_value FROM system_config`;
    const map = {};
    if (Array.isArray(rows)) {
      rows.forEach(c => { map[c.config_key] = c.config_value; });
    }

    configCache = {
      ENGAGEMENT_THRESHOLDS: map['ENGAGEMENT_THRESHOLDS'] || { highly_engaged: 80, moderate: 50, low: 20 },
      FATIGUE_THRESHOLDS:    map['FATIGUE_THRESHOLDS']    || { high: 5, very_high: 10 },
      FEATURE_FLAGS:         map['FEATURE_FLAGS']         || { enable_decision_engine: true, enable_signal_engine: true }
    };
  } catch {
    // Fallback defaults — engine never throws
    configCache = {
      ENGAGEMENT_THRESHOLDS: { highly_engaged: 80, moderate: 50, low: 20 },
      FATIGUE_THRESHOLDS:    { high: 5, very_high: 10 },
      FEATURE_FLAGS:         { enable_decision_engine: true, enable_signal_engine: true }
    };
  }

  cacheTimestamp = Date.now();
  return configCache;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Evaluate CTA — main export
// ─────────────────────────────────────────────────────────────────────────────
export async function evaluateCTA(userId, ctaType, ctaPriority = 3) {
  try {
    const config = await getSystemConfig();

    if (!config.FEATURE_FLAGS?.enable_decision_engine) {
      return { decision: 'SHOW', intensity: 'STRONG' };
    }

    // Fetch user engagement profile via AWS RDS
    let profile = null;
    try {
      const rows = await sql`
        SELECT engagement_score, fatigue_score, last_state
        FROM user_engagement_profile
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      profile = rows[0] || null;
    } catch {
      // ignore if table does not exist
    }

    const engScore   = profile?.engagement_score  ?? 50;
    const fatigue    = profile?.fatigue_score     ?? 0;
    const state      = profile?.last_state        ?? 'EXPLORING';

    // ── Critical overrides (never suppressed) ────────────────────────────────
    const CRITICAL_TYPES = ['COMPLETE_PAYMENT', 'START_CONSULTATION', 'RESUME_SESSION', 'WAIT_FOR_DOCTOR'];
    if (CRITICAL_TYPES.includes(ctaType)) {
      logDecision(userId, state, engScore, fatigue, 'SHOW', ctaType, 'CRITICAL_OVERRIDE');
      return { decision: 'SHOW', intensity: 'STRONG' };
    }

    // ── Fatigue gate ─────────────────────────────────────────────────────────
    const { high, very_high } = config.FATIGUE_THRESHOLDS;
    if (fatigue >= very_high) {
      logDecision(userId, state, engScore, fatigue, 'SUPPRESS', ctaType, 'FATIGUE_VERY_HIGH');
      return { decision: 'SUPPRESS', intensity: 'NONE' };
    }
    if (fatigue >= high && ctaPriority > 2) {
      logDecision(userId, state, engScore, fatigue, 'DELAY', ctaType, 'FATIGUE_HIGH_DELAY');
      return { decision: 'DELAY', intensity: 'NONE' };
    }

    // ── Intensity calculation ─────────────────────────────────────────────────
    const { highly_engaged, low } = config.ENGAGEMENT_THRESHOLDS;
    let intensity = 'MEDIUM';
    if (engScore >= highly_engaged) intensity = 'SOFT';
    else if (engScore < low)        intensity = 'STRONG';
    if (fatigue >= high)            intensity = 'SOFT';

    logDecision(userId, state, engScore, fatigue, 'SHOW', ctaType, 'NORMAL_EVALUATION');
    return { decision: 'SHOW', intensity };

  } catch (err) {
    console.error('[EngagementEngine] evaluateCTA error:', err.message);
    return { decision: 'SHOW', intensity: 'MEDIUM' }; // Fail-safe: always show
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Track Signal — fire-and-forget signal logging
// ─────────────────────────────────────────────────────────────────────────────
export function trackSignal({ userId, signalCode, type, confidence = 1.0, metadata = {} }) {
  // Non-blocking fire-and-forget directly into AWS RDS
  (async () => {
    try {
      const metaJson = typeof metadata === "string" ? metadata : JSON.stringify(metadata);
      await sql`
        INSERT INTO service_signal_log (user_id, signal_code, type, confidence_score, metadata)
        VALUES (${userId}, ${signalCode}, ${type}, ${confidence}, ${metaJson}::jsonb)
      `;
    } catch (err) {
      // Non-blocking warn
    }
  })();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Update Engagement Profile — boosts score after key actions
// ─────────────────────────────────────────────────────────────────────────────
export async function updateEngagementProfile(userId, action, scoreBoost = 5) {
  try {
    let current = null;
    try {
      const rows = await sql`
        SELECT engagement_score, fatigue_score
        FROM user_engagement_profile
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      current = rows[0] || null;
    } catch {
      return;
    }

    const newScore = Math.min(100, (current?.engagement_score ?? 50) + scoreBoost);
    const newFatigue = Math.min(20, (current?.fatigue_score ?? 0) + 1);

    if (current) {
      await sql`
        UPDATE user_engagement_profile
        SET engagement_score = ${newScore},
            fatigue_score = ${newFatigue},
            last_action = ${action},
            updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    } else {
      await sql`
        INSERT INTO user_engagement_profile (user_id, engagement_score, fatigue_score, last_action)
        VALUES (${userId}, ${newScore}, ${newFatigue}, ${action})
      `;
    }
  } catch (err) {
    console.warn('[EngagementEngine] Profile update failed:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: fire-and-forget decision logging
// ─────────────────────────────────────────────────────────────────────────────
function logDecision(userId, state, engScore, fatigueScore, decision, ctaType, reason) {
  (async () => {
    try {
      await sql`
        INSERT INTO engagement_decision_log (user_id, state, engagement_score, fatigue_score, decision, cta_type, reason)
        VALUES (${userId}, ${state}, ${engScore}, ${fatigueScore}, ${decision}, ${ctaType}, ${reason})
      `;
    } catch {
      // Non-blocking
    }
  })();
}
