import { LUNA_CONFIG } from "./config";
import { selectPrimaryRoute } from "./serviceRouter";
import { GENERAL_NAVIGATION, KNOWLEDGE_VERSION } from "./serviceKnowledge";
import { callLuna } from "./lunaAdapter";
import { validateLunaOutput } from "./firewallV2";
import { getPromptVersions } from "./prompts";

/**
 * V2.6 pipeline (Layers 2-5). Layer 1 (input/safety/emergency/session) runs in the route
 * BEFORE this. Raw model output NEVER leaves this function — only a validated canonical
 * response or an application-owned fallback.
 */

function ceilingFor(routeId) {
    if (routeId === "LUNG") return LUNA_CONFIG.OUTPUT_CEILINGS.LUNG;
    if (routeId === "CARDIO") return LUNA_CONFIG.OUTPUT_CEILINGS.CARDIO;
    if (routeId === "NONE") return LUNA_CONFIG.OUTPUT_CEILINGS.GENERAL_NAVIGATION;
    return LUNA_CONFIG.OUTPUT_CEILINGS.SERVICE_NAVIGATION;
}

function fallbackResponse(routeId, routeObj, reason) {
    const label = routeObj?.label;
    return {
        status: "fallback",
        route_id: routeId,
        message: label
            ? `I can't answer that reliably right now. You can continue with ${label} in MediConnect, or consult a doctor for medical concerns.`
            : "I can't answer that reliably right now. Please use the MediConnect services menu, or consult a doctor for medical concerns.",
        next_step: routeObj ? "USE_APPROVED_CTA" : "GENERAL_NAVIGATION",
        cta_id: routeObj?.cta_id ?? null,
        safety_note: "For any medical concern, please consult a qualified doctor.",
        reason_code: reason,
    };
}

export async function runLunaPipeline({ userMessage, history = [], requestId }) {
    const startedAt = Date.now();
    const deadlineAt = startedAt + LUNA_CONFIG.TOTAL_ROUTE_TIMEOUT_MS;

    // Layer 2: deterministic route — selected BEFORE Luna, read-only to it
    const routing = selectPrimaryRoute(userMessage);
    const routeId = routing.route_id;
    const routeObj = routing.route;
    const liveState = (routeObj || GENERAL_NAVIGATION).live_state;
    const approvedCta = routeObj ? routeObj.cta_id : null;

    const lineage = {
        request_id: requestId,
        route_id: routeId,
        route_decision: routing.decision,
        model: LUNA_CONFIG.MODEL_NAME,
        api: LUNA_CONFIG.API,
        config_version: LUNA_CONFIG.CONFIG_VERSION,
        prompt_versions: getPromptVersions(),
        knowledge_version: KNOWLEDGE_VERSION,
    };

    // Layer 3/4: knowledge + prompt stack -> Luna
    const result = await callLuna({
        routeObj,
        userMessage,
        history,
        maxOutputTokens: ceilingFor(routeId),
        deadlineAt,
    });

    if (!result.ok) {
        return {
            response: fallbackResponse(routeId, routeObj, result.error),
            lineage: { ...lineage, outcome: "fallback", failure: result.error, retried: result.retried, latency_ms: Date.now() - startedAt },
        };
    }

    // Layer 5: validate (schema + route + CTA + facts + clinical + leakage + length)
    const verdict = validateLunaOutput(result.parsed, { primaryRoute: routeId, approvedCta, liveState });
    if (!verdict.ok) {
        return {
            response: fallbackResponse(routeId, routeObj, verdict.reason_code),
            blocked: result.parsed,
            lineage: { ...lineage, outcome: "firewall_reject", failed_checks: verdict.checks, retried: result.retried, latency_ms: Date.now() - startedAt },
        };
    }

    return {
        response: result.parsed,
        lineage: { ...lineage, outcome: result.parsed.status, retried: result.retried, usage: result.usage, latency_ms: Date.now() - startedAt },
    };
}
