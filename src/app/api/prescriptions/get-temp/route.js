import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const SPECIALTY_MAP = {
  // Cardiology
  "cardio": "CARDIOLOGY",
  "cardiology": "CARDIOLOGY",
  "cardiologist": "CARDIOLOGY",
  "interventional cardiology": "CARDIOLOGY",
  "hypertension": "CARDIOLOGY",
  "heart": "CARDIOLOGY",

  // Dermatology
  "derma": "DERMATOLOGY",
  "dermatology": "DERMATOLOGY",
  "dermatologist": "DERMATOLOGY",
  "skin": "DERMATOLOGY",
  "teledermatology": "DERMATOLOGY",

  // ENT
  "ent": "ENT",
  "ear nose throat": "ENT",
  "rhinology": "ENT",
  "otolaryngology": "ENT",
  "otorhinolaryngology": "ENT",

  // Gastroenterology
  "gastroenterology": "GASTROENTEROLOGY",
  "gastroenterologist": "GASTROENTEROLOGY",
  "gi": "GASTROENTEROLOGY",
  "hepatology": "GASTROENTEROLOGY",
  "digestive": "GASTROENTEROLOGY",

  // Gynecology
  "gynaecology": "GYNECOLOGY & OBSTETRICS",
  "gynecology": "GYNECOLOGY & OBSTETRICS",
  "obstetrics": "GYNECOLOGY & OBSTETRICS",
  "gynae": "GYNECOLOGY & OBSTETRICS",
  "gynaecologist": "GYNECOLOGY & OBSTETRICS",
  "gynecologist": "GYNECOLOGY & OBSTETRICS",
  "fertility": "GYNECOLOGY & OBSTETRICS",

  // Nephrology
  "nephrology": "NEPHROLOGY",
  "nephrologist": "NEPHROLOGY",
  "kidney": "NEPHROLOGY",
  "dialysis": "NEPHROLOGY",
  "renal": "NEPHROLOGY",

  // Neurology
  "neurology": "NEUROLOGY",
  "neurologist": "NEUROLOGY",
  "neurosurgery": "NEUROLOGY",
  "neuro": "NEUROLOGY",
  "neuropathy": "NEUROLOGY",
  "epilepsy": "NEUROLOGY",

  // Orthopaedics
  "orthopaedics": "ORTHOPAEDICS",
  "orthopedics": "ORTHOPAEDICS",
  "orthopedic": "ORTHOPAEDICS",
  "ortho": "ORTHOPAEDICS",
  "spine": "ORTHOPAEDICS",
  "orthopaedic": "ORTHOPAEDICS",
  "musculoskeletal": "ORTHOPAEDICS",
  "joint": "ORTHOPAEDICS",

  // Pediatrics
  "pediatric": "PEDIATRICS",
  "pediatrics": "PEDIATRICS",
  "paediatric": "PEDIATRICS",
  "paediatrics": "PEDIATRICS",
  "pedia": "PEDIATRICS",
  "child": "PEDIATRICS",
  "neonatology": "PEDIATRICS",

  // Pulmonology
  "pulmonology": "PULMONOLOGY",
  "pulmonologist": "PULMONOLOGY",
  "pulmo": "PULMONOLOGY",
  "chest": "PULMONOLOGY",
  "respiratory": "PULMONOLOGY",
  "asthma": "PULMONOLOGY",
  "copd": "PULMONOLOGY",

  // General Surgery
  "surgery": "GENERAL SURGERY",
  "surgical": "GENERAL SURGERY",
  "general surgery": "GENERAL SURGERY",
  "surgeon": "GENERAL SURGERY",

  // General Physician
  "general physician": "GENERAL PHYSICIAN",
  "general medicine": "GENERAL PHYSICIAN",
  "family medicine": "GENERAL PHYSICIAN",
  "family physician": "GENERAL PHYSICIAN",
  "internal medicine": "GENERAL PHYSICIAN",
  "general practice": "GENERAL PHYSICIAN",
  "general practitioner": "GENERAL PHYSICIAN",
  "gp": "GENERAL PHYSICIAN",
  "physician": "GENERAL PHYSICIAN",
  "medicine": "GENERAL PHYSICIAN"
};

/**
 * Match a single specialization string to a canonical DB specialty key.
 * Returns the matched canonical key or null.
 */
function matchSingleSpecialization(specString) {
  if (!specString) return null;
  const clean = specString.trim().toLowerCase();

  // Direct full-string match first (most accurate)
  if (SPECIALTY_MAP[clean]) return SPECIALTY_MAP[clean];

  // Try each key as substring match (longest key wins for accuracy)
  const sortedKeys = Object.keys(SPECIALTY_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (key.length <= 3) {
      // Word boundary for short abbreviations to avoid false matches
      const boundaryRegex = new RegExp("\\b" + key + "\\b", "i");
      if (boundaryRegex.test(clean)) return SPECIALTY_MAP[key];
    } else {
      if (clean.includes(key)) return SPECIALTY_MAP[key];
    }
  }
  return null;
}

/**
 * For a comma-separated specialization string, return an array of all matched
 * canonical DB specialty keys (deduplicated).
 */
function matchAllSpecializations(doctorSpecString) {
  if (!doctorSpecString) return [];

  const specs = doctorSpecString.split(",").map(s => s.trim()).filter(Boolean);
  const matched = new Set();

  for (const spec of specs) {
    const key = matchSingleSpecialization(spec);
    if (key) matched.add(key);
  }

  return Array.from(matched);
}

// GET templates by specialization and appointment type
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get("specialization") || "";
    const req_appointment_type = searchParams.get("appointment_type") || "clinic_visit";

    // Normalize appointment type
    let appointment_type = "clinic_visit";
    if (["video", "video_call", "video_consultation"].includes(req_appointment_type)) {
      appointment_type = "video_consultation";
    }

    // Fetch all active templates for this appointment type
    const { data: allTemplates, error } = await supabase
      .from("prescription_templates")
      .select("*")
      .eq("is_active", true)
      .eq("appointment_type", appointment_type);

    if (error) throw error;

    const dbTemplates = allTemplates || [];

    // Get all matched canonical specialization keys from comma-separated doctor spec
    const matchedKeys = matchAllSpecializations(specialization);

    let resultTemplates = [];

    if (matchedKeys.length > 0) {
      // For each matched key, find the matching DB template
      for (const key of matchedKeys) {
        const found = dbTemplates.find(t =>
          t.specialization.trim().toUpperCase() === key.toUpperCase()
        );
        if (found) {
          resultTemplates.push(found);
        } else {
          // No DB template for this key — generate a dynamic fallback
          resultTemplates.push(getDefaultTemplate(key, appointment_type));
        }
      }
    } else if (specialization.trim()) {
      // No canonical match → try direct substring match as last resort
      const directMatch = dbTemplates.filter(t =>
        t.specialization.toLowerCase().includes(specialization.toLowerCase()) ||
        specialization.toLowerCase().includes(t.specialization.toLowerCase().trim())
      );

      if (directMatch.length > 0) {
        resultTemplates = directMatch;
      } else {
        // Fallback: return a generic default template
        resultTemplates = [getDefaultTemplate(specialization, appointment_type)];
      }
    } else {
      // No specialization provided — return all templates
      resultTemplates = dbTemplates;
    }

    const cleanedTemplates = resultTemplates.map(t => {
      if (!t) return t;
      return {
        ...t,
        default_values: cleanTemplateDefaultValues(t.default_values)
      };
    });

    return Response.json(
      {
        success: true,
        templates: cleanedTemplates,
        count: cleanedTemplates.length
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Template API Error:", err);
    return Response.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helper to remove case-specific clinical data from templates
function cleanTemplateDefaultValues(defaultValues) {
  if (!defaultValues || typeof defaultValues !== "object") return defaultValues;

  const cleaned = { ...defaultValues };

  const keysToRemove = [
    "diagnosis",
    "vital_signs",
    "vitals",
  ];

  const substringsToRemove = [
    "provisional diagnosis",
    "examination",
    "positive findings",
    "presenting complaints",
    "vitals",
  ];

  Object.keys(cleaned).forEach(key => {
    const lowerKey = key.toLowerCase();
    
    if (keysToRemove.includes(lowerKey)) {
      delete cleaned[key];
      return;
    }
    
    const shouldRemove = substringsToRemove.some(sub => lowerKey.includes(sub));
    if (shouldRemove) {
      delete cleaned[key];
    }
  });

  return cleaned;
}


// Helper function for dynamic default template structure
function getDefaultTemplate(specialization = "general", appointment_type = "clinic_visit") {
  const cleanSpec = specialization.toUpperCase();
  const baseStructure = {
    id: `default_${cleanSpec.toLowerCase().replace(/\s+/g, "_")}_${appointment_type}`,
    specialization: cleanSpec,
    appointment_type,
    name: `${cleanSpec} ${appointment_type === "video_consultation" ? "TELE" : "OPD"} TEMPLATE`,
    is_default: true,
    template_structure: [
      {
        section: "PROVISIONAL DIAGNOSIS",
        fields: [{ name: "diagnosis", type: "textarea", label: "PROVISIONAL DIAGNOSIS", required: false }]
      },
      {
        section: "VITALS",
        fields: [
          { name: "bp", type: "text", label: "BP:", required: false },
          { name: "pulse", type: "text", label: "Pulse:", required: false },
          { name: "respiratory_rate", type: "text", label: "Respiratory Rate:", required: false },
          { name: "temperature", type: "text", label: "Temperature:", required: false },
          { name: "spo", type: "text", label: "SpO₂:", required: false }
        ]
      },
      {
        section: "EXAMINATION",
        fields: [{ name: "findings", type: "textarea", label: "Examination Findings:", required: false }]
      },
      {
        section: "INVESTIGATIONS",
        fields: [{ name: "info", type: "textarea", label: "Investigations:", required: false }]
      },
      {
        section: "TREATMENT (Rx)",
        fields: [
          { name: "1", type: "text", label: "1.", required: false },
          { name: "2", type: "text", label: "2.", required: false },
          { name: "3", type: "text", label: "3.", required: false },
          { name: "4", type: "text", label: "4.", required: false },
          { name: "5", type: "text", label: "5.", required: false }
        ]
      },
      {
        section: "FOLLOW-UP",
        fields: [
          { name: "return_after", type: "text", label: "Return after:", required: false },
          { name: "warning_signs", type: "textarea", label: "Warning Signs:", required: false }
        ]
      }
    ],
    default_values: {
      "VITALS": {
        bp: "",
        pulse: "",
        temperature: "",
        respiratory_rate: "",
        spo: ""
      },
      "FOLLOW-UP": {
        return_after: ""
      },
      diagnosis: "",
      follow_up: { return_after: "" },
      vital_signs: {
        bp: "",
        pulse: "",
        temperature: "",
        respiratory_rate: "",
        spo: ""
      }
    }
  };

  if (appointment_type === "video_consultation") {
    baseStructure.template_structure.splice(2, 1, {
      section: "TELE-EXAMINATION (Video/History Based)",
      fields: [
        { name: "general_condition", type: "text", label: "General Condition:", required: false },
        { name: "visible_symptoms", type: "textarea", label: "Visible / Reported Symptoms:", required: false }
      ]
    });
  }

  return baseStructure;
}