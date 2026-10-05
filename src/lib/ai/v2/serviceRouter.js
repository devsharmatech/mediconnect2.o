import { getRoute } from "./serviceKnowledge";

/**
 * Deterministic service router (V2.6 §7).
 * PRIMARY_ROUTE is selected BEFORE Luna. Luna receives it read-only.
 * Unknown route = NONE. Rules are ordered; first match wins (most specific first).
 * Includes common Hindi/Hinglish phrases.
 */
const ROUTE_RULES = [
    { route: "ABHA_ABDM", re: /\b(abha|abdm|ayushman bharat digital|health id)\b/i },
    { route: "DIGILOCKER", re: /\b(digi\s?locker|health (records?|documents?)|my (records|reports|documents)|store (my )?(records|reports|documents)|upload (my )?(report|record|document)s?)\b/i },
    { route: "CARDIO", re: /\b(cardio\s?connect|heart[- ]?health|heart (assessment|risk|check)|cardiac (assessment|risk)|blood pressure assessment)\b/i },
    { route: "LUNG", re: /\b(lung\s?connect|lung (assessment|health|age|check)|respiratory (assessment|wellness|check)|breathing (assessment|check))\b/i },
    { route: "NURSING", re: /\b(nurs(e|ing)|home ?care|elder care|caregiver|attendant|post[- ]?surgical care)\b/i },
    { route: "EQUIPMENT", re: /\b(equipment|wheelchair|oxygen concentrator|bp (monitor|machine)|glucometer|nebuli[sz]er|hospital bed|home medical device|medical device)\b/i },
    { route: "MEDICINE", re: /\b(medicines?|pharmacy|medication delivery|prescribed (medicines?|drugs?)|dawai|dawa)\b/i },
    { route: "LAB", re: /\b(lab(oratory)?|blood test|sample collection|diagnostic|pathology|test report|jaanch|jaach)\b/i },
    { route: "CONSULT", re: /\b(doctor|consult(ation)?|specialist|appointment|follow[- ]?up|physician|dr\.?)\b/i },
];

/**
 * @param {string} userMessage
 * @returns {{ route_id: string, route: object|null, decision: string }}
 */
export function selectPrimaryRoute(userMessage) {
    const text = String(userMessage || "");
    for (const rule of ROUTE_RULES) {
        if (rule.re.test(text)) {
            const route = getRoute(rule.route);
            if (route) {
                return { route_id: route.route_id, route, decision: `matched:${rule.route}` };
            }
        }
    }
    return { route_id: "NONE", route: null, decision: "no_match" };
}
