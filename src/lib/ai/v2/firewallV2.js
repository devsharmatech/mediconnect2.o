import { LUNA_CONFIG } from "./config";
import { APPROVED_CTA_IDS } from "./serviceKnowledge";

/**
 * FIREWALL V2 (V2.6 §17/§18) — context-aware validation of Luna output.
 * Rejection depends on the prohibited CLAIM/ACTION, not on a disease or drug name alone.
 * Returns { ok, checks: [...failed], reason_code }.
 */

const STATUS_ENUM = new Set(["ok", "fallback", "refusal", "escalate"]);
const REQUIRED = ["status", "route_id", "message", "next_step", "cta_id", "safety_note", "reason_code"];

// Claim-level patterns (assertions/instructions), not bare terms.
const DIAGNOSIS_CLAIM = /\b(you (are suffering from|definitely have|likely have|probably have)|your diagnosis is|this confirms|diagnosed with|it is certain you have|my diagnosis is)\b|(^|[.!?,;]\s+)you have (?!(been|had|to|any|reported|mentioned|noted|taken|not|no|told|said|answered|entered|provided|shared)\b|((an?|the)\s+)?(headache|fever|cough|pain|symptoms?|sore throat|cold)\b)/i;
const PRESCRIBE_CLAIM = /\b(i (am )?prescrib(e|ing)|i recommend (you )?(take|taking|start|use)|you should (take|start taking|stop taking|increase)|start taking|stop taking your|increase your dose|take \d+\s*(mg|ml|mcg|g|tablets?|pills?|capsules?|drops?))\b/i;
const DOSAGE_INSTRUCTION = /\b\d+(\.\d+)?\s*(mg|mcg|ml|iu)\b[^.]{0,40}\b(once|twice|thrice|daily|every|per day|times)\b|\b(once|twice|thrice) daily\b|\bevery \d+ hours\b/i;
const PROBABILITY_CLAIM = /\b\d{1,3}\s?%\s*(chance|likely|probability|risk of having)|\b(almost certainly|guaranteed|100% safe|error-free|clinically guaranteed|regulator approved|legally compliant)\b/i;
const PROMPT_LEAK = /\b(system prompt|MC-AI-LUNA|authority order|constitutional rule|hidden rules?|api[_ -]?key|sk-[a-z0-9]{10,}|bearer\s+[a-z0-9._-]{10,})\b/i;
const INVENTED_PRICE = /(?:₹|rs\.?\s?|inr\s?)\s?\d[\d,]*/i;
const INVENTED_SLOT = /\b(slot|appointment) (is )?(confirmed|booked)\b|\bbooked (for|at)\b|\byour (order|booking|appointment) (is|has been) (placed|confirmed|booked|scheduled)\b/i;
const URL_PATTERN = /https?:\/\/|www\./i;

/**
 * @param {object} parsed - parsed model JSON
 * @param {object} ctx - { primaryRoute, approvedCta, liveState, rawLength }
 */
export function validateLunaOutput(parsed, ctx) {
    const failed = [];

    // 1. Schema
    if (!parsed || typeof parsed !== "object") {
        return { ok: false, checks: ["schema"], reason_code: "SCHEMA_MALFORMED" };
    }
    for (const k of REQUIRED) {
        if (!(k in parsed)) failed.push(`schema:missing:${k}`);
    }
    if (!STATUS_ENUM.has(parsed.status)) failed.push("schema:status_enum");
    if (typeof parsed.message !== "string" || !parsed.message.trim()) failed.push("schema:empty_message");
    if (failed.length) return { ok: false, checks: failed, reason_code: "SCHEMA_INVALID" };

    const msg = parsed.message;
    const all = `${msg} ${parsed.next_step || ""} ${parsed.safety_note || ""}`;

    // 2. Route integrity
    if (parsed.route_id !== ctx.primaryRoute) failed.push("route_integrity");

    // 3. CTA integrity — application-approved only
    if (parsed.cta_id !== null && parsed.cta_id !== undefined) {
        if (!APPROVED_CTA_IDS.has(parsed.cta_id) || parsed.cta_id !== ctx.approvedCta) failed.push("cta_not_approved");
    }

    // 4. Service factuality (no invented prices / links / completion claims)
    if (INVENTED_PRICE.test(all)) failed.push("invented_price");
    if (URL_PATTERN.test(all)) failed.push("model_created_url");
    if (INVENTED_SLOT.test(all)) failed.push("invented_booking_or_slot");
    if (ctx.liveState === "COMING_SOON" && /\b(is (now )?(live|available)|you can (now )?(book|use|create|link))\b/i.test(msg)) {
        failed.push("coming_soon_claimed_live");
    }

    // 5. Clinical boundary (claims, not words)
    if (DIAGNOSIS_CLAIM.test(all)) failed.push("diagnosis_claim");
    if (PRESCRIBE_CLAIM.test(all)) failed.push("prescription_instruction");
    if (DOSAGE_INSTRUCTION.test(all)) failed.push("dosage_instruction");

    // 6. Unsupported certainty
    if (PROBABILITY_CLAIM.test(all)) failed.push("unsupported_certainty");

    // 7. Prompt leakage
    if (PROMPT_LEAK.test(all)) failed.push("prompt_leakage");

    // 8. Length — reject, never blind-truncate
    if (msg.length > LUNA_CONFIG.MAX_MESSAGE_CHARS) failed.push("length_exceeded");

    return failed.length
        ? { ok: false, checks: failed, reason_code: "FIREWALL_REJECT" }
        : { ok: true, checks: [], reason_code: null };
}

/**
 * Text-level check for non-chat structured outputs (screening questions/analysis fields).
 * Same claim-based rules: diagnosis, prescribing, dosage, certainty, leakage, URLs, prices.
 * @param {string|string[]} texts
 */
export function screenTextCheck(texts) {
    const all = (Array.isArray(texts) ? texts : [texts]).filter(Boolean).join(" \n ");
    const failed = [];
    if (DIAGNOSIS_CLAIM.test(all)) failed.push("diagnosis_claim");
    if (PRESCRIBE_CLAIM.test(all)) failed.push("prescription_instruction");
    if (DOSAGE_INSTRUCTION.test(all)) failed.push("dosage_instruction");
    if (PROBABILITY_CLAIM.test(all)) failed.push("unsupported_certainty");
    if (PROMPT_LEAK.test(all)) failed.push("prompt_leakage");
    if (URL_PATTERN.test(all)) failed.push("model_created_url");
    if (INVENTED_PRICE.test(all)) failed.push("invented_price");
    return failed.length ? { ok: false, checks: failed } : { ok: true, checks: [] };
}
