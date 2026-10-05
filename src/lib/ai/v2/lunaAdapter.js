import OpenAI from "openai";
import { LUNA_CONFIG } from "./config";
import {
    SYSTEM_PROMPT,
    buildRouteBlock,
    buildDataBlock,
    OUTPUT_BLOCK,
    RESPONSE_JSON_SCHEMA,
} from "./prompts";
import { GENERAL_NAVIGATION } from "./serviceKnowledge";

/**
 * Single backend AI gateway for Luna (V2.6). Uses the Responses API with strict
 * structured output, reasoning.effort=medium, 20s provider timeout, max 1 retry
 * for transient errors only. No temperature-based control.
 */

let _client = null;
function client() {
    if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return _client;
}

// ~4 chars/token estimate to enforce MAX_AI_CONTEXT_TOKENS before the provider call
export function estimateTokens(text) {
    return Math.ceil(String(text || "").length / 4);
}

function isTransient(err) {
    const s = err?.status;
    return err?.name === "AbortError" || err?.code === "ETIMEDOUT" || s === 429 || (s >= 500 && s < 600) || err?.name === "APIConnectionError" || err?.name === "APIConnectionTimeoutError";
}

/**
 * Shared execution core: context bound, timeout, one transient retry, strict schema,
 * empty/incomplete/malformed rejection.
 * @returns {{ ok: boolean, parsed?: object, error?: string, retried: boolean, usage?: object }}
 */
export async function executeStructured({ blocks, jsonSchema, maxOutputTokens, deadlineAt }) {
    const contextTokens = estimateTokens(blocks.map((b) => b.content).join("\n"));
    if (contextTokens > LUNA_CONFIG.MAX_AI_CONTEXT_TOKENS) {
        return { ok: false, error: "CONTEXT_TOO_LARGE", retried: false };
    }

    let retried = false;
    for (let attempt = 0; attempt <= LUNA_CONFIG.MAX_RETRIES; attempt++) {
        const remaining = deadlineAt - Date.now();
        if (remaining <= 0) return { ok: false, error: "ROUTE_TIMEOUT", retried };
        const timeout = Math.min(LUNA_CONFIG.PROVIDER_TIMEOUT_MS, remaining);

        try {
            const res = await client().responses.create(
                {
                    model: LUNA_CONFIG.MODEL_NAME,
                    input: blocks,
                    reasoning: { effort: LUNA_CONFIG.REASONING_EFFORT },
                    max_output_tokens: maxOutputTokens,
                    text: { format: { type: "json_schema", ...jsonSchema } },
                    store: false,
                },
                { timeout }
            );

            const raw = res.output_text;
            if (!raw || !raw.trim()) return { ok: false, error: "EMPTY_OUTPUT", retried };
            if (res.status === "incomplete") return { ok: false, error: "INCOMPLETE_OUTPUT", retried };

            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch {
                return { ok: false, error: "MALFORMED_JSON", retried };
            }
            return { ok: true, parsed, retried, usage: res.usage };
        } catch (err) {
            if (attempt < LUNA_CONFIG.MAX_RETRIES && isTransient(err)) {
                retried = true;
                await new Promise((r) => setTimeout(r, err?.status === 429 ? 1500 : 500));
                continue;
            }
            return { ok: false, error: `PROVIDER_ERROR:${err?.status || err?.name || "unknown"}`, retried };
        }
    }
    return { ok: false, error: "PROVIDER_ERROR", retried };
}

/** Chat/navigation call: SYSTEM + ROUTE + DATA + OUTPUT blocks, canonical response schema. */
export async function callLuna({ routeObj, userMessage, history = [], maxOutputTokens, deadlineAt }) {
    const blocks = [
        { role: "developer", content: SYSTEM_PROMPT },
        { role: "developer", content: buildRouteBlock(routeObj, GENERAL_NAVIGATION) },
        { role: "developer", content: buildDataBlock(userMessage, history) },
        { role: "developer", content: OUTPUT_BLOCK },
    ];
    return executeStructured({ blocks, jsonSchema: RESPONSE_JSON_SCHEMA, maxOutputTokens, deadlineAt });
}

/**
 * Task-specific structured call (screening etc.): SYSTEM + task block + untrusted DATA block.
 * `dataText` is always wrapped as untrusted user content.
 */
export async function callLunaTask({ taskBlock, dataText, jsonSchema, maxOutputTokens }) {
    const blocks = [
        { role: "developer", content: SYSTEM_PROMPT },
        { role: "developer", content: taskBlock },
        { role: "developer", content: buildDataBlock(dataText, []) },
    ];
    return executeStructured({
        blocks,
        jsonSchema,
        maxOutputTokens,
        deadlineAt: Date.now() + LUNA_CONFIG.TOTAL_ROUTE_TIMEOUT_MS,
    });
}
