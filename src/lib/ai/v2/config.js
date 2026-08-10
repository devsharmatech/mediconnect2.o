// SECTION 7 — AI VERSION GOVERNANCE
// Any change to prompts, rules, or config MUST increment these versions.

export const AI_CONFIG = {
    // System Prompt Governance
    SYSTEM_PROMPT_VERSION: "1.0.0",

    // Rule Engines Governance
    EMERGENCY_RULES_VERSION: "1.0.0",
    MODERATION_RULES_VERSION: "1.0.0",

    // Model Governance
    MODEL_NAME: "gpt-4o-mini",
    MODEL_VERSION: "2024-07-18", // Specific snapshot for traceability

    // Session Control
    MAX_MESSAGES_PER_SESSION: 20,
    SESSION_TIMEOUT_MINUTES: 30,
    MAX_SESSIONS_PER_DAY: 10,
};

export const CHATBOT_CONFIG = {
    SYSTEM_PROMPT_VERSION: "1.0.0",
    MODEL_NAME: "gpt-4o-mini",
    MAX_MESSAGES_PER_SESSION: 30,
    SESSION_TIMEOUT_MINUTES: 60,
    MAX_SESSIONS_PER_DAY: 20,
};
