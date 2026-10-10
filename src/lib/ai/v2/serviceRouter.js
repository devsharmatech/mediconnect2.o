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
    { route: "CONSULT", re: /\b(doctor|consult(ation)?|specialist|appointment|follow[- ]?up|physician|dr\.?|dentist(s)?|dentistry|dental|teeth|tooth|toothache|dermatolog(ist|y)|cardiolog(ist|y)|pediatric(ian|s)?|gynecolog(ist|y)|gynaecolog(ist|y)|orthopedic(s)?|orthopaedist|urolog(ist|y)|neurolog(ist|y)|psychiatr(ist|y)|ent|pulmonolog(ist|y)|gastroenterolog(ist|y)|ophthalmolog(ist|y))\b/i },
];

/**
 * @param {string} userMessage
 * @returns {{ route_id: string, route: object|null, decision: string }}
 */
export function selectPrimaryRoute(userMessage) {
    const text = String(userMessage || "");

    // Clinical Safety Rule: If the user has symptoms or asks for medication/prescription advice,
    // this MUST route to CONSULT (Doctor Consultation), NEVER to medicine ordering.
    const hasSymptoms = /\b(bukhar|fever|pain|dard|cough|khasi|khansi|cold|sardi|zukham|jukham|headache|sir dard|sar dard|vomit|rash|sick|bimar|ill|swelling|throat|pet dard|infection|allergy)\b/i.test(text);
    const isAskingMedAdvice = /\b(which medicine|what medicine|suggest (a )?medicine|prescribe|kya.*(medicine|dawa|dawai)|(medicine|dawa|dawai).*(bata|bta|suggest|le sakte|lu|du|lenge))\b/i.test(text);

    if (hasSymptoms || isAskingMedAdvice) {
        const consultRoute = getRoute("CONSULT");
        if (consultRoute) {
            return { route_id: consultRoute.route_id, route: consultRoute, decision: "matched:CONSULT (clinical safety: symptom/medication inquiry)" };
        }
    }

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
