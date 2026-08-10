/**
 * API: Provider Ranking (Layer-111)
 *
 * GET  /api/layer1/provider-ranking?service_type=pharmacy&city=Mumbai&limit=5
 *   Returns ranked providers for a service type.
 *
 * POST /api/layer1/provider-ranking
 *   Records a ranking event (order fulfilled, review submitted, etc.)
 *   Body: { provider_id, service_type, event_type, review_rating?, response_time_minutes?, consultation_id?, care_episode_id? }
 */

import { success, failure } from "@/lib/response";
import { getRankedProviders, recordRankingEvent } from "@/lib/layer1/providerRanking";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

const VALID_SERVICE_TYPES = ["pharmacy", "lab", "nursing"];
const VALID_EVENT_TYPES   = [
    "ORDER_PLACED",
    "ORDER_FULFILLED",
    "ORDER_CANCELLED",
    "REVIEW_SUBMITTED",
    "RESPONSE_LOGGED",
];

// ─────────────────────────────────────────────────────────
// GET — Fetch ranked providers for a service type
// ─────────────────────────────────────────────────────────

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const service_type = searchParams.get("service_type");
        const city         = searchParams.get("city") || null;
        const pincode      = searchParams.get("pincode") || null;
        const limit        = Math.min(parseInt(searchParams.get("limit") || "5"), 20);
        const min_rating   = parseFloat(searchParams.get("min_rating") || "0");

        if (!service_type) {
            return failure("service_type query parameter is required (pharmacy | lab | nursing)");
        }

        if (!VALID_SERVICE_TYPES.includes(service_type)) {
            return failure(`Invalid service_type. Must be one of: ${VALID_SERVICE_TYPES.join(", ")}`);
        }

        const providers = await getRankedProviders(service_type, {
            city,
            pincode,
            limit,
            min_rating,
        });

        return success(`Ranked ${service_type} providers`, {
            service_type,
            total: providers.length,
            providers,
        });

    } catch (err) {
        console.error("GET /api/layer1/provider-ranking error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

// ─────────────────────────────────────────────────────────
// POST — Record a ranking event
// ─────────────────────────────────────────────────────────

export async function POST(req) {
    try {
        // Only authenticated users can submit ranking events
        const caller = await resolveCallerFromRequest(req);
        if (!caller) return failure("Unauthorized", null, 401);

        const body = await req.json();
        const {
            provider_id,
            service_type,
            event_type,
            review_rating,
            response_time_minutes,
            consultation_id,
            care_episode_id,
        } = body;

        // Validate required fields
        if (!provider_id || !service_type || !event_type) {
            return failure("provider_id, service_type, and event_type are required");
        }

        if (!VALID_SERVICE_TYPES.includes(service_type)) {
            return failure(`Invalid service_type. Must be one of: ${VALID_SERVICE_TYPES.join(", ")}`);
        }

        if (!VALID_EVENT_TYPES.includes(event_type)) {
            return failure(`Invalid event_type. Must be one of: ${VALID_EVENT_TYPES.join(", ")}`);
        }

        // Validate review_rating range
        if (event_type === "REVIEW_SUBMITTED") {
            if (!review_rating || review_rating < 1 || review_rating > 5) {
                return failure("review_rating must be between 1 and 5 for REVIEW_SUBMITTED events");
            }
        }

        await recordRankingEvent({
            provider_id,
            service_type,
            event_type,
            review_rating: review_rating || null,
            response_time_minutes: response_time_minutes || null,
            consultation_id: consultation_id || null,
            care_episode_id: care_episode_id || null,
        });

        return success("Ranking event recorded and score updated", {
            provider_id,
            service_type,
            event_type,
        });

    } catch (err) {
        console.error("POST /api/layer1/provider-ranking error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
