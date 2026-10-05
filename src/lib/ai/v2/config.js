// SECTION 7 — AI VERSION GOVERNANCE
// Any change to prompts, rules, or config MUST increment these versions.

export const AI_CONFIG = {
    // System Prompt Governance
    SYSTEM_PROMPT_VERSION: "1.0.0",

    // Rule Engines Governance
    EMERGENCY_RULES_VERSION: "1.0.0",
    MODERATION_RULES_VERSION: "1.0.0",

    // Model Governance
    MODEL_NAME: process.env.AI_LUNA_MODEL || "gpt-6-luna",
    MODEL_VERSION: "2026-09-28", // Specific snapshot for traceability

    // Session Control
    MAX_MESSAGES_PER_SESSION: 20,
    SESSION_TIMEOUT_MINUTES: 30,
    MAX_SESSIONS_PER_DAY: 10,
};

export const CHATBOT_CONFIG = {
    SYSTEM_PROMPT_VERSION: "1.0.0",
    MODEL_NAME: process.env.AI_LUNA_MODEL || "gpt-6-luna",
    MAX_MESSAGES_PER_SESSION: 30,
    SESSION_TIMEOUT_MINUTES: 60,
    MAX_SESSIONS_PER_DAY: 20,
};

// V2.6 — LUNA GOVERNANCE (MediConnect_AI_GPT5.6_Luna_Developer_Implementation_V2.6)
// Backend feature flag: Luna is active by default (can be disabled via AI_LUNA_ENABLED=false).
export const LUNA_CONFIG = {
    ENABLED: process.env.AI_LUNA_ENABLED !== "false",
    // Doc baseline targets "gpt-5.6-luna"; owner requested "gpt-6-luna". Pinned via env.
    MODEL_NAME: process.env.AI_LUNA_MODEL || "gpt-6-luna",
    API: "responses",
    REASONING_EFFORT: "medium",
    CONFIG_VERSION: "LUNA-CFG-2.6.0",

    PROMPT_VERSIONS: {
        SYSTEM: "MC-AI-LUNA-SYSTEM-1.3-FINAL",
        ROUTE: "MC-AI-LUNA-ROUTE-1.2",
        DATA: "MC-AI-LUNA-DATA-1.2",
        OUTPUT: "MC-AI-LUNA-OUTPUT-1.2",
    },

    // V2.6 exact runtime limits
    MAX_AI_CONTEXT_TOKENS: 12000,
    MAX_USER_MESSAGE_CHARS: 6000,
    PROVIDER_TIMEOUT_MS: 20000,
    TOTAL_ROUTE_TIMEOUT_MS: 25000,
    MAX_RETRIES: 1,

    // Route-specific max output tokens (doc §15)
    OUTPUT_CEILINGS: {
        GENERAL_NAVIGATION: 600,
        SERVICE_NAVIGATION: 400,
        HEALTH_EDUCATION: 600,
        SYMPTOM_SCREENING: 500,
        LUNG: 600,
        CARDIO: 600,
        EMERGENCY: 300,
        STRUCTURED_ASSESSMENT: 800,
    },
    // Patient-facing hard length ceiling (chars) — reject, never blind-truncate
    MAX_MESSAGE_CHARS: 1800,
};
