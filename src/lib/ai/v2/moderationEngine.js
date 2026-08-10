import { AI_CONFIG } from "./config";

/**
 * SECTION 5 — POST-LLM OUTPUT MODERATION
 * Scans the LLM response for diagnostics, medicines, dosages, and commands.
 */

const DIAGNOSIS_PHRASES = [
    "this confirms",
    "you are suffering from",
    "your diagnosis is",
    "you likely have",
    "it is certain you have",
    "diagnosed with",
    "my diagnosis is",
    "you definitely have"
];

const PROBABILITY_PHRASES = [
    "\\d{1,3}% chance",
    "highly likely",
    "almost certainly",
];

const DOSAGE_PATTERNS = [
    "\\b\\d+\\s*(mg|ml|mcg|g|drops|tablets|pills|capsules)\\b",
    "once daily",
    "twice daily",
    "thrice daily",
    "every \\d+ hours",
];

const TREATMENT_COMMANDS = [
    "\\bprescribe\\b",
    "\\bprescription\\b",
    "i am prescribing",
    "start taking \\d+",
    "increase your dose",
    "stop taking your",
];

// For medications, ideally we'd have a massive dictionary, but to adhere to the prompt roughly,
// we will block common generic/brand names or just rely heavily on the dosage/command blockers.
const MEDICINE_KEYWORDS = [
    "paracetamol", "ibuprofen", "aspirin", "antibiotic", "amoxicillin",
    "azithromycin", "steroid", "inhaler", "metformin", "insulin", "crocin", "dolo"
];

const buildRegex = (patterns) => new RegExp(`(${patterns.join("|")})`, "i");

const MODERATION_RULES = [
    { name: "Diagnosis", regex: buildRegex(DIAGNOSIS_PHRASES) },
    { name: "Probability", regex: buildRegex(PROBABILITY_PHRASES) },
    { name: "Dosage", regex: buildRegex(DOSAGE_PATTERNS) },
    { name: "Command", regex: buildRegex(TREATMENT_COMMANDS) },
    { name: "Medicine", regex: buildRegex(MEDICINE_KEYWORDS) },
];

const FALLBACK_RESPONSE = "This response was flagged by our safety system. As an AI Assistant, I cannot provide medical diagnoses, prescribe medications, or suggest treatment plans. Please consult a qualified doctor for medical advice.";

/**
 * Scans the AI output against strict moderation rules.
 * @param {string} aiText - Output from OpenAI.
 * @returns {object} - { isSafe: boolean, cleanResponse: string, ruleTriggered: string | null }
 */
export function moderateAIOutput(aiText) {
    if (!aiText) return { isSafe: true, cleanResponse: "", ruleTriggered: null };

    for (const rule of MODERATION_RULES) {
        if (rule.regex.test(aiText)) {
            console.warn(`[AI SAFETY] Moderation triggered by rule: ${rule.name}`);
            return {
                isSafe: false,
                cleanResponse: FALLBACK_RESPONSE,
                ruleTriggered: rule.name,
            };
        }
    }

    // Safe
    return {
        isSafe: true,
        cleanResponse: aiText,
        ruleTriggered: null,
    };
}
