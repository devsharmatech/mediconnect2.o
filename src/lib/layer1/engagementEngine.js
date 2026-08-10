/**
 * ENGAGEMENT ENGINE — Layer-111 Phase 3
 *
 * Non-blocking intelligence layer that:
 * 1. Evaluates CTA routing (SHOW / DELAY / SUPPRESS) per user
 * 2. Tracks engagement signals into service_signal_log
 * 3. Updates user engagement/fatigue profiles
 *
 * Uses direct HTTP fetch to bypass PostgREST schema cache issues.
 */

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

// In-memory config cache (60s TTL) to avoid DB hits on every CTA eval
let configCache = null;
let cacheTimestamp = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Utility: direct fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────
async function dbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        options.prefer || 'return=representation',
    },
    ...options
  });
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`DB fetch failed [${res.status}]: ${err.substring(0, 200)}`);
  }
  return res.status === 404 ? null : res.json();
}

async function callRpc(fnName, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method:  'POST',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error(`RPC ${fnName} failed [${res.status}]`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. System Config — cached for 60s
// ─────────────────────────────────────────────────────────────────────────────
async function getSystemConfig() {
  const now = Date.now();
  if (configCache && (now - cacheTimestamp) < 60000) return configCache;

  try {
    const data = await dbFetch('system_config?select=config_key,config_value', {
      method: 'GET',
      prefer: ''
    });
    const map = {};
    if (Array.isArray(data)) data.forEach(c => { map[c.config_key] = c.config_value; });

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

    if (!config.FEATURE_FLAGS.enable_decision_engine) {
      return { decision: 'SHOW', intensity: 'STRONG' };
    }

    // Fetch user engagement profile
    const profiles = await dbFetch(
      `user_engagement_profile?user_id=eq.${userId}&limit=1`,
      { method: 'GET', prefer: '' }
    );
    const profile    = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
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
  // Non-blocking — does not await
  dbFetch('service_signal_log', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      user_id:          userId,
      signal_code:      signalCode,
      type,             // EVENT | INTENT | DROPOFF | TIME
      confidence_score: confidence,
      metadata
    })
  }).catch(err => console.warn('[EngagementEngine] Signal log failed:', err.message));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Update Engagement Profile — boosts score after key actions
// ─────────────────────────────────────────────────────────────────────────────
export async function updateEngagementProfile(userId, action, scoreBoost = 5) {
  try {
    const profiles = await dbFetch(
      `user_engagement_profile?user_id=eq.${userId}&limit=1`,
      { method: 'GET', prefer: '' }
    );
    const current = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
    const newScore = Math.min(100, (current?.engagement_score ?? 50) + scoreBoost);
    const newFatigue = Math.min(20, (current?.fatigue_score ?? 0) + 1);

    await dbFetch('user_engagement_profile', {
      method:  current ? 'PATCH' : 'POST',
      prefer:  'return=minimal',
      ...(current ? {} : {}),
      body: JSON.stringify(
        current
          ? { engagement_score: newScore, fatigue_score: newFatigue, last_action: action, updated_at: new Date().toISOString() }
          : { user_id: userId, engagement_score: newScore, fatigue_score: newFatigue, last_action: action }
      )
    });

    if (current) {
      // PATCH needs eq filter — use separate fetch
      await fetch(`${SUPABASE_URL}/rest/v1/user_engagement_profile?user_id=eq.${userId}`, {
        method:  'PATCH',
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({
          engagement_score: newScore,
          fatigue_score:    newFatigue,
          last_action:      action,
          updated_at:       new Date().toISOString()
        })
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/user_engagement_profile`, {
        method:  'POST',
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({
          user_id:          userId,
          engagement_score: newScore,
          fatigue_score:    newFatigue,
          last_action:      action
        })
      });
    }
  } catch (err) {
    console.warn('[EngagementEngine] Profile update failed:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: fire-and-forget decision logging
// ─────────────────────────────────────────────────────────────────────────────
function logDecision(userId, state, engScore, fatigueScore, decision, ctaType, reason) {
  dbFetch('engagement_decision_log', {
    method:  'POST',
    prefer:  'return=minimal',
    body: JSON.stringify({ user_id: userId, state, engagement_score: engScore, fatigue_score: fatigueScore, decision, cta_type: ctaType, reason })
  }).catch(() => {}); // Never blocks
}
