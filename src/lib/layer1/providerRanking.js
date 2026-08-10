/**
 * LAYER-111: Provider Ranking Service
 *
 * Handles:
 *  - Fetching ranked providers for a given service_type
 *  - Recording ranking events (orders, reviews, response times)
 *  - Recomputing rank_score after events
 *
 * Ranking formula (0–100):
 *   40% — rating
 *   30% — fulfillment rate
 *   15% — response speed (inverted)
 *   10% — review volume credibility
 *    5% — low cancellation rate
 */

import { supabase } from "@/lib/supabaseAdmin";

// ─────────────────────────────────────────────────────────
// 1. GET RANKED PROVIDERS
// ─────────────────────────────────────────────────────────

/**
 * Returns ranked providers for a service type, enriched with
 * display name and address from the source provider table.
 *
 * @param {string} service_type — "pharmacy" | "lab" | "nursing"
 * @param {object} options
 * @param {string} [options.city]         — filter by city
 * @param {string} [options.pincode]      — filter by pincode
 * @param {number} [options.limit=5]      — max providers to return
 * @param {number} [options.min_rating=0] — minimum rating filter
 * @returns {Array} ranked providers ordered by rank_score DESC
 */
export async function getRankedProviders(service_type, options = {}) {
    const { city, pincode, limit = 5, min_rating = 0 } = options;

    // Validate service type
    const VALID_TYPES = ["pharmacy", "lab", "nursing"];
    if (!VALID_TYPES.includes(service_type)) {
        throw new Error(`Invalid service_type '${service_type}'. Must be one of: ${VALID_TYPES.join(", ")}`);
    }

    // ── Query ranking table ──
    let query = supabase
        .from("provider_ranking")
        .select("*")
        .eq("service_type", service_type)
        .eq("is_active", true)
        .gte("rating", min_rating)
        .order("rank_score", { ascending: false })
        .limit(limit);

    if (city)    query = query.ilike("city", `%${city}%`);
    if (pincode) query = query.eq("pincode", pincode);

    const { data: ranked, error } = await query;
    if (error) throw error;
    if (!ranked || ranked.length === 0) return [];

    // ── Enrich with display info from source tables ──
    const enriched = await enrichProviderDetails(ranked, service_type);
    return enriched;
}

/**
 * Fetch display name + address from source provider tables
 * based on service_type.
 */
async function enrichProviderDetails(ranked, service_type) {
    const providerIds = ranked.map((r) => r.provider_id);

    let sourceData = {};

    if (service_type === "pharmacy") {
        // Try chemist_details first, then pharmacist_details
        const { data: chemists } = await supabase
            .from("chemist_details")
            .select("id, store_name, owner_name, address, opening_hours, rating")
            .in("id", providerIds);

        const { data: pharmacists } = await supabase
            .from("pharmacist_details")
            .select("id, pharmacy_name, full_name, address, rating")
            .in("id", providerIds);

        (chemists || []).forEach((c) => {
            sourceData[c.id] = {
                name: c.store_name || c.owner_name,
                address: c.address,
                opening_hours: c.opening_hours || null,
                source_table: "chemist",
            };
        });
        (pharmacists || []).forEach((p) => {
            if (!sourceData[p.id]) {
                sourceData[p.id] = {
                    name: p.pharmacy_name || p.full_name,
                    address: p.address,
                    source_table: "pharmacist",
                };
            }
        });
    }

    if (service_type === "lab") {
        const { data: labs } = await supabase
            .from("lab_details")
            .select("id, lab_name, owner_name, address, opening_hours, rating")
            .in("id", providerIds);

        (labs || []).forEach((l) => {
            sourceData[l.id] = {
                name: l.lab_name || l.owner_name,
                address: l.address,
                opening_hours: l.opening_hours || null,
                source_table: "lab",
            };
        });
    }

    if (service_type === "nursing") {
        // Nursing providers do not have a dedicated profile table yet
        // Return placeholders — will be enriched when nursing_provider_details is added
        providerIds.forEach((id) => {
            sourceData[id] = { name: "Nursing Provider", address: null, source_table: "nursing" };
        });
    }

    // Merge ranking signals with display info
    return ranked.map((r, idx) => ({
        rank_position: idx + 1,
        provider_id: r.provider_id,
        service_type: r.service_type,
        rank_score: r.rank_score,
        rating: r.rating,
        total_reviews: r.total_reviews,
        fulfillment_rate: r.fulfillment_rate,
        avg_response_time_minutes: r.avg_response_time,
        cancellation_rate: r.cancellation_rate,
        city: r.city,
        pincode: r.pincode,
        // Display fields from source table
        name: sourceData[r.provider_id]?.name || "Provider",
        address: sourceData[r.provider_id]?.address || null,
        opening_hours: sourceData[r.provider_id]?.opening_hours || null,
        // Social proof display
        display_badge: buildRankBadge(r),
    }));
}

/**
 * Build human-readable badge for the provider card
 */
function buildRankBadge(provider) {
    if (provider.rank_score >= 85) return "⭐ Top Rated";
    if (provider.rank_score >= 70) return "✅ Highly Reliable";
    if (provider.rank_score >= 50) return "👍 Good";
    return null;
}

// ─────────────────────────────────────────────────────────
// 2. RECORD RANKING EVENT
// ─────────────────────────────────────────────────────────

/**
 * Record a provider ranking event and recompute rank_score.
 *
 * @param {object} event
 * @param {string} event.provider_id
 * @param {string} event.service_type
 * @param {string} event.event_type — ORDER_PLACED | ORDER_FULFILLED | ORDER_CANCELLED | REVIEW_SUBMITTED | RESPONSE_LOGGED
 * @param {number} [event.review_rating]         — 1–5, required for REVIEW_SUBMITTED
 * @param {number} [event.response_time_minutes] — required for RESPONSE_LOGGED
 * @param {string} [event.consultation_id]
 * @param {string} [event.care_episode_id]
 */
export async function recordRankingEvent(event) {
    const {
        provider_id,
        service_type,
        event_type,
        review_rating,
        response_time_minutes,
        consultation_id,
        care_episode_id,
    } = event;

    if (!provider_id || !service_type || !event_type) {
        throw new Error("provider_id, service_type, and event_type are required");
    }

    // ── Insert event ──
    const { error: eventErr } = await supabase
        .from("provider_ranking_event")
        .insert({
            provider_id,
            service_type,
            event_type,
            review_rating: review_rating || null,
            response_time_minutes: response_time_minutes || null,
            consultation_id: consultation_id || null,
            care_episode_id: care_episode_id || null,
        });

    if (eventErr) throw eventErr;

    // ── Recompute rank signals from event log ──
    await recomputeRankScore(provider_id, service_type);
}

// ─────────────────────────────────────────────────────────
// 3. RECOMPUTE RANK SCORE
// ─────────────────────────────────────────────────────────

/**
 * Recomputes rank_score for a provider by aggregating their event log.
 * Called after every ORDER_FULFILLED, REVIEW_SUBMITTED, RESPONSE_LOGGED.
 */
async function recomputeRankScore(provider_id, service_type) {
    // Aggregate from event log
    const { data: events } = await supabase
        .from("provider_ranking_event")
        .select("event_type, review_rating, response_time_minutes")
        .eq("provider_id", provider_id)
        .eq("service_type", service_type);

    if (!events || events.length === 0) return;

    const placed     = events.filter((e) => e.event_type === "ORDER_PLACED").length;
    const fulfilled  = events.filter((e) => e.event_type === "ORDER_FULFILLED").length;
    const cancelled  = events.filter((e) => e.event_type === "ORDER_CANCELLED").length;
    const reviews    = events.filter((e) => e.event_type === "REVIEW_SUBMITTED" && e.review_rating);
    const responses  = events.filter((e) => e.event_type === "RESPONSE_LOGGED" && e.response_time_minutes != null);

    // Derived signals
    const total_orders      = placed;
    const successful_orders = fulfilled;
    const fulfillment_rate  = placed > 0 ? (fulfilled / placed) * 100 : 0;
    const cancellation_rate = placed > 0 ? (cancelled / placed) * 100 : 0;
    const avg_review        = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.review_rating, 0) / reviews.length
        : null;
    const avg_response_time = responses.length > 0
        ? responses.reduce((sum, r) => sum + r.response_time_minutes, 0) / responses.length
        : 120; // default 2 hours if no data

    // Fetch current rating (review-based rating takes precedence over platform rating if available)
    const { data: current } = await supabase
        .from("provider_ranking")
        .select("rating, total_reviews")
        .eq("provider_id", provider_id)
        .eq("service_type", service_type)
        .single();

    const final_rating = avg_review !== null
        ? parseFloat(avg_review.toFixed(2))
        : (current?.rating || 0);

    const final_review_count = Math.max(reviews.length, current?.total_reviews || 0);

    // Compute rank score using same formula as SQL function
    const rating_score       = (final_rating / 5.0) * 40.0;
    const fulfillment_score  = (Math.min(fulfillment_rate, 100) / 100.0) * 30.0;
    const speed_score        = Math.max((1.0 - Math.min(avg_response_time, 240) / 240.0) * 15.0, 0);
    const volume_score       = (Math.min(final_review_count, 200) / 200.0) * 10.0;
    const cancel_score       = Math.max((1.0 - Math.min(cancellation_rate, 100) / 100.0) * 5.0, 0);

    const rank_score = parseFloat(
        (rating_score + fulfillment_score + speed_score + volume_score + cancel_score).toFixed(2)
    );

    // ── Update provider_ranking row ──
    await supabase
        .from("provider_ranking")
        .upsert(
            {
                provider_id,
                service_type,
                rating: final_rating,
                total_reviews: final_review_count,
                fulfillment_rate: parseFloat(fulfillment_rate.toFixed(2)),
                avg_response_time: parseFloat(avg_response_time.toFixed(2)),
                cancellation_rate: parseFloat(cancellation_rate.toFixed(2)),
                total_orders,
                successful_orders,
                rank_score,
                last_computed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            { onConflict: "provider_id,service_type" }
        );
}

// ─────────────────────────────────────────────────────────
// 4. BATCH RECOMPUTE (Cron)
// ─────────────────────────────────────────────────────────

/**
 * Recompute rank scores for all active providers.
 * Called by /api/cron/provider-ranking (nightly or weekly).
 * @returns {{ processed: number, errors: Array }}
 */
export async function batchRecomputeAllRankings() {
    const results = { processed: 0, errors: [] };

    const { data: providers } = await supabase
        .from("provider_ranking")
        .select("provider_id, service_type")
        .eq("is_active", true);

    if (!providers) return results;

    for (const p of providers) {
        try {
            await recomputeRankScore(p.provider_id, p.service_type);
            results.processed++;
        } catch (err) {
            results.errors.push({ provider_id: p.provider_id, error: err.message });
        }
    }

    return results;
}
