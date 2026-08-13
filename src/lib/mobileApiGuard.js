import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

/**
 * Mobile API Helper & Guard:
 * Enforces PDF rules for mobileapi routes:
 * 1. Resolves caller from JWT
 * 2. Parses X-Care-Episode-ID, X-State-Version, X-Idempotency-Key
 * 3. Provides 409 Conflict helper for stale state
 */
export async function authenticateMobileClient(req) {
  let caller = await resolveCallerFromRequest(req);
  return caller;
}

export function extractMobileHeaders(req) {
  const careEpisodeId = req.headers.get("x-care-episode-id") || null;
  const stateVersion = req.headers.get("x-state-version") || null;
  const idempotencyKey = req.headers.get("x-idempotency-key") || null;
  const eventSequence = req.headers.get("x-event-sequence") || null;

  return {
    careEpisodeId,
    stateVersion,
    idempotencyKey,
    eventSequence,
  };
}

export function respond409Conflict(message, latestData = null) {
  return failure(
    message || "Stale state conflict. Newer state is available.",
    latestData,
    409,
    { headers: corsHeaders }
  );
}

export function respondMobileSuccess(message, data = null, statusCode = 200) {
  return success(message, data, statusCode, { headers: corsHeaders });
}

export function respondMobileFailure(message, error = null, statusCode = 400) {
  return failure(message, error, statusCode, { headers: corsHeaders });
}
