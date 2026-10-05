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
        CONSULT: { route_id: "CONSULT", label: "Doctor Consultations", live_state: "LIVE", destination_key: "consultation", cta_id: "CTA_CONSULT", capability_summary: "Doctor consultation/navigation" },
        LAB: { route_id: "LAB", label: "Lab Tests", live_state: "LIVE", destination_key: "lab_booking", cta_id: "CTA_LAB", capability_summary: "Lab booking/navigation" },
        MEDICINE: { route_id: "MEDICINE", label: "Medicine Delivery", live_state: "LIVE", destination_key: "medicine_delivery", cta_id: "CTA_MEDICINE", capability_summary: "Medicine delivery/navigation" },
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
        "MediConnect offers: " +
        Object.values(SERVICE_KNOWLEDGE.routes)
            .map((r) => `${r.label}${r.live_state === "COMING_SOON" ? " (Coming Soon)" : ""}`)
            .join(", "),
};
