/**
 * SERVICE_KNOWLEDGE_V2.6 — canonical, versioned, application-owned service facts.
 * Luna never creates or alters these. destination_key / cta_id are application
 * identifiers (NOT model-generated URLs). No provider/price/slot/URL claims here.
 */

export const KNOWLEDGE_VERSION = "V2.6";

export const SERVICE_KNOWLEDGE = {
    knowledge_version: KNOWLEDGE_VERSION,
    source: "application service registry",
    last_verified_at: "2026-09-28T00:00:00Z", // deployment-controlled timestamp
    state_source: "application runtime",
    conflict_policy: "UNKNOWN/CONFLICT -> fallback",
    routes: {
        CONSULT: { route_id: "CONSULT", label: "Doctor Consultations", live_state: "LIVE", destination_key: "consultation", cta_id: "CTA_CONSULT", capability_summary: "Doctor consultations on MediConnect. MediConnect has verified doctors across all clinical specialties configured in CMS: General Physician (fever, infections, cold, cough, weakness, adult primary care), Pediatrics / Pediatrician (newborn care, babies, infants, children, neonatal jaundice, vaccinations), Cardiology / Cardiologist (heart health, chest discomfort, palpitations, blood pressure, ECG), Pulmonology / Pulmonologist (lungs, asthma, wheezing, breathing difficulty, chest infections), Dermatology / Dermatologist (skin, rashes, acne, hair fall, fungal infections), Gynecology & Obstetrics / Gynecologist (women's health, pregnancy, periods, maternity, PCOS), Orthopedics / Orthopedic Specialist (bones, joints, fractures, knee/back pain, spine, arthritis), Ophthalmology / Eye Specialist (eye care, vision, cataract, red/watery eyes), Endocrinology / Endocrinologist (diabetes, high sugar, insulin, thyroid, hormonal disorders), Nephrology / Nephrologist (kidneys, creatinine, dialysis, renal health), Gastroenterology / Gastroenterologist (stomach pain, liver, acidity, digestion, constipation, diarrhea), Neurology / Neurologist (brain, nerves, migraines, seizures, tremors), Psychiatry / Psychiatrist (mental health, depression, anxiety, stress, sleep disorders), Dentistry / Dentist (teeth, oral care, toothache, gums, cavities), ENT / ENT Specialist (ear, nose, throat, sinusitis, tonsils), Urology / Urologist (urinary issues, kidney stones, prostate), Oncology / Oncologist (cancer care, tumors, chemotherapy, lumps), Rheumatology / Rheumatologist (rheumatoid arthritis, gout, uric acid, autoimmune joint pain), Physiotherapy / Physiotherapist (physical rehab, posture, mobility, muscle recovery), and General Surgery / General Surgeon (hernia, gallbladder stones, appendix, surgical consultation). Always name the matching medical specialty for the patient's concern and advise consulting on MediConnect via in-clinic or video consultation." },
        LAB: { route_id: "LAB", label: "Lab Tests", live_state: "LIVE", destination_key: "lab_booking", cta_id: "CTA_LAB", capability_summary: "Lab booking/navigation" },
        MEDICINE: { route_id: "MEDICINE", label: "Medicine Delivery", live_state: "LIVE", destination_key: "medicine_delivery", cta_id: "CTA_MEDICINE", capability_summary: "Ordering already-prescribed medicines from partner pharmacies with a valid doctor prescription. Never take medicines without consulting a doctor first." },
        DIGILOCKER: { route_id: "DIGILOCKER", label: "MediConnect DigiLocker", live_state: "LIVE", destination_key: "digilocker", cta_id: "CTA_DIGILOCKER", capability_summary: "Store/access approved health records" },
        NURSING: { route_id: "NURSING", label: "Nursing & Home Care", live_state: "LIVE", destination_key: "nursing_homecare", cta_id: "CTA_NURSING", capability_summary: "Service request/navigation to partner workflow (independent providers deliver the service)" },
        EQUIPMENT: { route_id: "EQUIPMENT", label: "Medical Equipment", live_state: "LIVE", destination_key: "medical_equipment", cta_id: "CTA_EQUIPMENT", capability_summary: "Equipment request/navigation" },
        CARDIO: { route_id: "CARDIO", label: "CardioConnect", live_state: "LIVE", destination_key: "cardioconnect", cta_id: "CTA_CARDIO", capability_summary: "Deterministic heart-health assessment/wellness" },
        LUNG: { route_id: "LUNG", label: "LungConnect", live_state: "LIVE", destination_key: "lungconnect", cta_id: "CTA_LUNG", capability_summary: "Deterministic respiratory/lung wellness assessment" },
        ABHA_ABDM: { route_id: "ABHA_ABDM", label: "ABHA / ABDM", live_state: "COMING_SOON", destination_key: "abha_abdm", cta_id: "CTA_ABHA_ABDM", capability_summary: "Coming Soon capability; no booking/action claim" },
    },
};

export const VALID_ROUTE_IDS = Object.keys(SERVICE_KNOWLEDGE.routes);

/** Returns the approved route object, or null for unknown route (route = NONE). */
export function getRoute(routeId) {
    return SERVICE_KNOWLEDGE.routes[routeId] || null;
}

/** Approved CTA IDs (application-owned). */
export const APPROVED_CTA_IDS = new Set(
    Object.values(SERVICE_KNOWLEDGE.routes).map((r) => r.cta_id)
);

/** Approved general-navigation fallback when route = NONE. */
export const GENERAL_NAVIGATION = {
    route_id: "NONE",
    label: "MediConnect Services",
    live_state: "LIVE",
    cta_id: null,
    capability_summary:
        "MediConnect offers: Doctor Consultations, Lab Tests, Medicine Delivery, MediConnect DigiLocker, Nursing & Home Care, Medical Equipment, CardioConnect, LungConnect, ABHA / ABDM (Coming Soon)",
};
