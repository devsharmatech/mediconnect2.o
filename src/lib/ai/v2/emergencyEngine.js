import { AI_CONFIG } from "./config";

/**
 * SECTION 3 — EMERGENCY DETECTION LAYER (PRE-LLM)
 * Deterministic rules to detect critical medical emergencies.
 * Never uses an LLM.
 */

// List of high-priority emergency phrases and patterns
const EMERGENCY_KEYWORDS = [
    "chest pain",
    "heart attack",
    "severe breathlessness",
    "can't breathe",
    "cannot breathe",
    "gasping for air",
    "stroke",
    "paralyzed",
    "numbness in face",
    "faint",
    "fainting",
    "passed out",
    "loss of consciousness",
    "seizure",
    "convulsion",
    "severe bleeding",
    "uncontrollable bleeding",
    "suicide",
    "kill myself",
    "end my life",
    "overdose",
    "poison",
    "crushing pain in chest",
];

// Compile regex for faster matching (case-insensitive)
const EMERGENCY_REGEX = new RegExp(
    `\\b(${EMERGENCY_KEYWORDS.join("|")})\\b`,
    "i"
);

/**
 * Checks if the user's message contains any emergency indicators.
 * @param {string} userMessage - The raw message from the user.
 * @returns {object} - { isEmergency: boolean, response: string | null }
 */
export function detectEmergency(userMessage) {
    if (!userMessage) return { isEmergency: false, response: null };

    const match = userMessage.match(EMERGENCY_REGEX);

    if (match) {
        return {
            isEmergency: true,
            triggerMessage: match[0],
            response: "⚠️ Your symptoms may require urgent medical attention. Please seek immediate medical care, visit the nearest emergency room, or contact emergency services (Dial 112 or 108).",
            versionPlayed: AI_CONFIG.EMERGENCY_RULES_VERSION,
        };
    }

    return { isEmergency: false, response: null };
}
