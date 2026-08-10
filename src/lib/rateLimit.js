const memoryStore = new Map();

/**
 * Basic memory-based sliding window rate-limiter.
 * Since Node.js processes are persistent in deployment (non-Edge),
 * this provides self-contained rate limiting without requiring database changes.
 * 
 * @param {string} key - Rate limit key (e.g. action + phone/IP)
 * @param {number} limit - Maximum operations allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetTime: number }}
 */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const state = memoryStore.get(key) || { count: 0, resetTime: now + windowMs };

  // Cleanup expired entries in background occasionally
  if (memoryStore.size > 1000) {
    for (const [k, v] of memoryStore.entries()) {
      if (now > v.resetTime) memoryStore.delete(k);
    }
  }

  if (now > state.resetTime) {
    state.count = 0;
    state.resetTime = now + windowMs;
  }

  if (state.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: state.resetTime
    };
  }

  state.count += 1;
  memoryStore.set(key, state);

  return {
    allowed: true,
    remaining: limit - state.count,
    resetTime: state.resetTime
  };
}

export function clearRateLimit(key) {
  memoryStore.delete(key);
}
