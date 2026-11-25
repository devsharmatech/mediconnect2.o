import { getRoute } from "./serviceKnowledge.js";

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
    { route: "CONSULT", re: /\b(doctor|consult(ation)?|specialist|appointment|follow[- ]?up|physician|dr\.?|pediatric(ian|s)?|paediatric(ian|s)?|baby|newborn|infant|child|jaundice|yellowing|peeliya|dentist(s)?|dentistry|dental|teeth|tooth|toothache|dermatolog(ist|y)|cardiolog(ist|y)|cardiac|heart|gynecolog(ist|y)|gynaecolog(ist|y)|obstetric(s|ian)?|orthopedic(s)?|orthopaedist|urolog(ist|y)|neurolog(ist|y)|psychiatr(ist|y)|ent|pulmonolog(ist|y)|lungs?|respiratory|gastroenterolog(ist|y)|ophthalmolog(ist|y)|eye\s?doctor|endocrinolog(ist|y)|diabetolog(ist|y)|diabetes|sugar|insulin|thyroid|nephrolog(ist|y)|nephrology|creatinine|dialysis|kidney|oncolog(ist|y)|oncology|cancer|tumor|chemo(therapy)?|rheumatolog(ist|y)|rheumatology|arthritis|gout|gathiya|uric\s?acid|physiotherap(ist|y)|physical\s?therapy|surgeon|surgery|surgical|general\s?surgeon|general\s?surgery|hernia|appendix|appendicitis|gallstones?)\b/i },
];

/**
 * @param {string} userMessage
 * @returns {{ route_id: string, route: object|null, decision: string }}
 */
export function selectPrimaryRoute(userMessage) {
    const text = String(userMessage || "");

    // Veterinary / Animal Check: MediConnect is strictly for human healthcare.
    const isAnimalOrPet = (
        /\b(dog|dogs|puppy|puppies|cat|cats|kitten|kittens|pet|pets|animal|animals|kutta|kuta|kutti|kutte|billi|billian|jaanwar|janwar|pashu|pashuon|gay|gaay|bhains|bakri|bakra|veterinary|veterinarian|vet\s?doctor|vet\s?clinic|doggy)\b/i.test(text) ||
        /(कुत्ता|कुत्ते|बिल्ली|जानवर|पशु|गाय|भैंस|बकरी|वेटरनरी)/i.test(text)
    ) && !/\b(cataract|medication|certificate)\b/i.test(text);
    if (isAnimalOrPet) {
        return { route_id: "OUT_OF_SCOPE_ANIMAL", route: null, decision: "matched:OUT_OF_SCOPE_ANIMAL (animals/pets query out of scope for human health platform)" };
    }

    // Clinical Safety Rule: If the user has symptoms, baby/infant concerns, health questions, or asks for medication/prescription advice,
    // this MUST route to CONSULT (Doctor Consultation), NEVER to medicine ordering or generic NONE.
    const hasSymptoms = /\b(bukhar|fever|pain|dard|cough|khasi|khansi|cold|sardi|zukham|jukham|headache|sir dard|sar dard|vomit|rash|sick|bimar|ill|swelling|throat|pet dard|infection|allergy|baby|babies|newborn|newborns|neonate|infant|infants|toddler|child|children|kid|kids|bacha|bacche|bachon|shishu|yellow|yellowing|jaundice|peeliya|पीलिया|bilirubin|bleeding|blood|breathless|saans|chest|palpitations|stomach|acidity|gas|dast|loose motion|diarrhea|constipation|kabz|dizziness|chakkar|weakness|kamzori|fatigue|burn|injury|wound|urine|peshab|skin|itching|khujli|pimple|acne|hair|hairfall|period|periods|menstrual|pregnancy|pregnant|pcos|sugar|diabetes|bp|blood pressure|thyroid|eye|eyes|vision|ear|teeth|tooth|toothache|cancer|tumor|chemo|creatinine|dialysis|kidney|arthritis|gout|gathiya|uric acid|hernia|appendix|gallstone|stones|cataract|motiyabind|piles|fissure|fistula|migraine|nerve|nerves|neuropathy|tingling|numbness|tremor|paralysis|fits|seizure|asthma|wheezing|depress(ion|ed)?|anxiety|panic|stress|insomnia|tanav|ghabrahat|normal hai|is this normal|kya karu|kya kare|kya karna chahiye|treatment|symptoms?)\b/i.test(text);
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
