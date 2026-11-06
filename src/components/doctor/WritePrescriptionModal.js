"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  Pill,
  Droplets,
  Wind,
  Activity,
  Heart,
  Thermometer,
  Scale,
  CheckCircle,
  FlaskConical,
  Calendar,
  ChevronLeft,
  Printer,
  Download,
  Loader2,
  Lock,
  ShieldCheck,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { exportPrescriptionPdf, printPrescriptionPdf } from "@/lib/prescriptionPdfEngine";
import { MEDICONNECT_LOGO_BASE64, DOCTOR_CADUCEUS_BASE64 } from "@/lib/prescriptionAssets";

function Spinner({ size = "w-5 h-5" }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${size}`}
    />
  );
}

function calculatePatientAge(dob, explicitAge) {
  if (explicitAge !== undefined && explicitAge !== null && explicitAge !== "") {
    const a = String(explicitAge).trim();
    return a.toLowerCase().includes("yr") ? a : `${a} yrs`;
  }
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age >= 0 ? `${age} yrs` : null;
}

function buildMetaFromAppointment(apt) {
  if (!apt) return {};
  const patient = apt.patient || apt.patient_details || {};
  const doctor = apt.doctor || apt.doctor_details || {};
  
  let qual = doctor.qualification || "";
  if (Array.isArray(qual)) qual = qual.join(", ");
  else if (typeof qual === "string") {
    try { const p = JSON.parse(qual); if (Array.isArray(p)) qual = p.join(", "); } catch {}
  }

  const careEpId = apt.care_episode_id || apt.care_episode?.id || null;
  const aptId = apt.id || apt.appointment_id || null;
  const epCode = apt.episode_id || 
    (careEpId ? (String(careEpId).toUpperCase().startsWith("EP-") ? String(careEpId).toUpperCase() : `EP-${String(careEpId).slice(0, 8).toUpperCase()}`) : null) ||
    (aptId ? `EP-${String(aptId).slice(0, 8).toUpperCase()}` : null);

  const calculatedAge = calculatePatientAge(patient.date_of_birth || patient.dob, patient.age || patient.patient_age);

  return {
    patient_id: patient.id || apt.patient_id,
    doctor_id: doctor.id || apt.doctor_id,
    care_episode_id: careEpId,
    episode_id: epCode,
    patient_name: patient.full_name || apt.patient_name || "Patient",
    patient_gender: patient.gender || "",
    patient_age: calculatedAge,
    patient_dob: patient.date_of_birth || patient.dob || "",
    patient_email: patient.email || "",
    patient_blood_group: patient.blood_group || "",
    patient_address: patient.address || "",
    doctor_name: doctor.full_name || apt.doctor_name || "",
    doctor_specialization: doctor.specialization || apt.specialization || "",
    doctor_qualification: qual,
    doctor_license: doctor.license_number || "",
    doctor_clinic: doctor.clinic_name || "",
    doctor_clinic_address: doctor.clinic_address || "",
    appointment_type: apt.appointment_type || "clinic_visit",
  };
}

const EMPTY_MEDICINE = { name: "", dosage: "", frequency: "", duration: "", quantity: "", instructions: "" };
const EMPTY_VITALS = { blood_pressure: "", pulse: "", temperature: "", weight: "", spo2: "", respiratory_rate: "" };

const DEFAULT_STRUCTURE = [
  {
    section: "SYMPTOMS",
    fields: [{ name: "symptoms", type: "textarea", label: "SYMPTOMS", required: false }]
  },
  {
    section: "CONDITIONS",
    fields: [{ name: "conditions", type: "textarea", label: "CONDITIONS", required: false }]
  },
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
    section: "TREATMENT (Rx)",
    fields: []
  },
  {
    section: "INVESTIGATIONS",
    fields: []
  },
  {
    section: "FOLLOW-UP",
    fields: [
      { name: "return_after", type: "text", label: "Return after:", required: false },
      { name: "warning_signs", type: "textarea", label: "Warning Signs:", required: false }
    ]
  }
];

const COMPLAINT_SUGGESTIONS = [
  "Fever / Chills",
  "Cough / Cold",
  "Sore Throat",
  "Headache",
  "Bodyache / Muscle Pain",
  "Nausea / Vomiting",
  "Diarrhea / Loose Motions",
  "Weakness / Fatigue",
  "Shortness of Breath",
  "Chest Pain",
  "Abdominal Pain",
  "Dizziness / Vertigo",
  "Rash / Skin Irritation",
  "Joint Pain"
];

let cachedDrugMaster = null;

export default function WritePrescriptionModal({
  appointmentId,
  appointment,
  meta: propMeta,
  templates: propTemplates,
  onClose,
  isSidebarPanel = false,
  onViewPrescription,
  onPrescriptionSaved,
}) {
  const meta = propMeta || buildMetaFromAppointment(appointment);
  const [templates, setTemplates] = useState(propTemplates || []);
  const [templatesLoading, setTemplatesLoading] = useState(!propTemplates || propTemplates.length === 0);
  const [templateStep, setTemplateStep] = useState("select");
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [presentingComplaints, setPresentingComplaints] = useState([{ complaint: "", details: "" }]);
  const [medicines, setMedicines] = useState([{ ...EMPTY_MEDICINE }]);
  const [labTests, setLabTests] = useState([{ test_name: "", instructions: "" }]);
  const [vitalSigns, setVitalSigns] = useState({ ...EMPTY_VITALS });
  const [examinationFindings, setExaminationFindings] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("Seek immediate medical attention if you experience high fever, severe breathlessness, chest pain, or sudden weakness.");
  const [specialMessage, setSpecialMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [existingPrescriptionId, setExistingPrescriptionId] = useState(null);
  const [existingPid, setExistingPid] = useState(null);
  const [existingEpisodeId, setExistingEpisodeId] = useState(null);
  const [selectedTemplateSpec, setSelectedTemplateSpec] = useState("");
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [isPrescriptionSigned, setIsPrescriptionSigned] = useState(false);
  const [signedPrescriptionUrl, setSignedPrescriptionUrl] = useState(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState("specialty");
  const [allTemplatesList, setAllTemplatesList] = useState([]);

  const [doctorInfo, setDoctorInfo] = useState({
    name: meta?.doctor_name || "",
    specialization: meta?.doctor_specialization || "",
    qualification: meta?.doctor_qualification || "",
    license: meta?.doctor_license || "",
    clinic: meta?.doctor_clinic || "",
  });

  const episodeCode = 
    meta?.episode_id || 
    existingEpisodeId || 
    (meta?.care_episode_id ? (String(meta.care_episode_id).toUpperCase().startsWith("EP-") ? String(meta.care_episode_id).toUpperCase() : `EP-${String(meta.care_episode_id).slice(0, 8).toUpperCase()}`) : null) ||
    (appointment?.episode_id || (appointment?.care_episode_id ? `EP-${String(appointment.care_episode_id).slice(0, 8).toUpperCase()}` : null)) ||
    (appointmentId ? `EP-${String(appointmentId).slice(0, 8).toUpperCase()}` : null);

  const patientAge = (() => {
    if (meta?.patient_age) return meta.patient_age;
    const pat = appointment?.patient || appointment?.patient_details || null;
    return calculatePatientAge(meta?.patient_dob || pat?.date_of_birth || pat?.dob, pat?.age || pat?.patient_age);
  })();

  // Dynamic template states
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customFields, setCustomFields] = useState({});
  const [drugMaster, setDrugMaster] = useState(cachedDrugMaster || []);
  const [labMaster, setLabMaster] = useState([]);
  const [diagnosisMaster, setDiagnosisMaster] = useState([]);
  
  // Clinical API states for new fields
  const [symptoms, setSymptoms] = useState("");
  const [conditions, setConditions] = useState("");
  const [symptomMaster, setSymptomMaster] = useState([]);
  const [conditionMaster, setConditionMaster] = useState([]);
  const [complaintSuggestions, setComplaintSuggestions] = useState([]);

  // Auto-fetch doctor profile if doctor details or specialization were not in appointment object
  useEffect(() => {
    const docId = meta?.doctor_id || (typeof window !== "undefined" ? (localStorage.getItem("userId") || localStorage.getItem("user_id")) : null);
    if (docId && (!doctorInfo.specialization || !doctorInfo.name)) {
      fetch(`/api/doctor/profile?doctor_id=${encodeURIComponent(docId)}`)
        .then((r) => r.json())
        .then((res) => {
          if (res?.success && res.data) {
            const d = res.data;
            let qual = d.qualification || "";
            if (Array.isArray(qual)) qual = qual.join(", ");
            else if (typeof qual === "string") {
              try { const p = JSON.parse(qual); if (Array.isArray(p)) qual = p.join(", "); } catch {}
            }
            setDoctorInfo({
              name: d.full_name || d.name || doctorInfo.name || "Doctor",
              specialization: d.specialization || doctorInfo.specialization || "General Physician",
              qualification: qual || doctorInfo.qualification,
              license: d.license_number || doctorInfo.license,
              clinic: d.clinic_name || doctorInfo.clinic,
            });
          }
        })
        .catch((err) => console.warn("Failed to load doctor profile:", err));
    }
  }, [meta?.doctor_id, doctorInfo.name, doctorInfo.specialization, doctorInfo.qualification, doctorInfo.license, doctorInfo.clinic]);

  // Load prescription templates from AWS RDS
  useEffect(() => {
    if (propTemplates && propTemplates.length > 0) {
      setTemplates(propTemplates);
      setTemplatesLoading(false);
      return;
    }
    const spec = doctorInfo.specialization || meta?.doctor_specialization || "";
    const aptType = meta?.appointment_type || "clinic_visit";
    setTemplatesLoading(true);
    fetch(`/api/prescriptions/get-temp?specialization=${encodeURIComponent(spec)}&appointment_type=${encodeURIComponent(aptType)}`)
      .then((r) => r.json())
      .then((json) => {
        const loaded = json?.data?.templates || json?.templates || [];
        const allLoaded = json?.data?.allTemplates || json?.all_templates || loaded;
        if (Array.isArray(loaded)) {
          setTemplates(loaded);
        }
        if (Array.isArray(allLoaded)) {
          setAllTemplatesList(allLoaded);
        }
      })
      .catch((err) => console.warn("Failed to load templates:", err))
      .finally(() => setTemplatesLoading(false));
  }, [doctorInfo.specialization, meta?.doctor_specialization, meta?.appointment_type, propTemplates]);

  useEffect(() => {
    // 1. Fetch medicines immediately and unblocked
    fetch("/api/admin/medicines")
      .then(r => r.json())
      .then(json => {
        if (json?.success && Array.isArray(json.data)) {
          const activeMeds = json.data.filter(d => d.is_active !== false);
          cachedDrugMaster = activeMeds;
          setDrugMaster(activeMeds);
        }
      })
      .catch(err => {
        console.error("Failed to fetch medicines", err);
      });

    // Helper to fetch all pages of a paginated resource
    const fetchAllPages = async (endpoint) => {
      try {
        const res1 = await fetch(`${endpoint}?page=1&limit=1000`);
        const json1 = await res1.json();
        if (!json1.success || !Array.isArray(json1.data)) return [];
        let allData = [...json1.data];
        const total = json1.pagination?.total || 0;
        const totalPages = Math.ceil(total / 1000);

        if (totalPages > 1) {
          const fetchPromises = [];
          for (let p = 2; p <= totalPages; p++) {
            fetchPromises.push(
              fetch(`${endpoint}?page=${p}&limit=1000`)
                .then(r => r.json())
                .then(j => j.success && Array.isArray(j.data) ? j.data : [])
                .catch(err => {
                  console.error(`Failed fetching page ${p} for ${endpoint}`, err);
                  return [];
                })
            );
          }
          const results = await Promise.all(fetchPromises);
          for (const pageData of results) {
            allData = allData.concat(pageData);
          }
        }
        return allData;
      } catch (err) {
        console.error(`Error in fetchAllPages for ${endpoint}:`, err);
        return [];
      }
    };

    // 2. Fetch labs independently
    fetchAllPages("/api/admin/lab-tests")
      .then(labsData => {
        setLabMaster(labsData.filter(l => l.is_active && !l.is_package && l.category !== 'Package'));
      })
      .catch(err => console.error("Failed to fetch labs", err));

    // 3. Fetch diagnosis independently
    fetchAllPages("/api/admin/diagnosis")
      .then(diagData => {
        setDiagnosisMaster(diagData.filter(d => d.is_active));
      })
      .catch(err => console.error("Failed to fetch diagnosis", err));

    // 4. Fetch complaints independently
    fetch("/api/admin/clinical-repository?table=cr_complaint_master&limit=1000")
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) {
          setComplaintSuggestions([...new Set(j.data.map(d => d.canonical_complaint).filter(Boolean))].sort());
        }
      })
      .catch(err => {
        console.error("Failed to fetch complaints", err);
      });
  }, []);

  const effectiveDoctorName = doctorInfo.name || meta?.doctor_name || "Doctor";
  const effectiveDoctorSpec = doctorInfo.specialization || meta?.doctor_specialization || "";
  const effectiveDoctorQual = doctorInfo.qualification || meta?.doctor_qualification || "";
  const effectiveDoctorLicense = doctorInfo.license || meta?.doctor_license || "";
  const effectiveDoctorClinic = doctorInfo.clinic || meta?.doctor_clinic || "";

  const specList = (effectiveDoctorSpec || meta?.doctor_specialization || "").split(",").map(s => s.trim()).filter(Boolean);

  const basePool = (templateFilter === "all" && allTemplatesList.length > 0)
    ? allTemplatesList
    : templates;

  const filteredTemplates = basePool.filter((tpl) => {
    if (!tpl) return false;
    const q = templateSearch.trim().toLowerCase();
    const nameMatch = !q || (tpl.name || "").toLowerCase().includes(q) ||
      (tpl.specialization || "").toLowerCase().includes(q) ||
      (tpl.appointment_type || "").toLowerCase().includes(q);
    if (!nameMatch) return false;

    if (templateFilter === "specialty" || templateFilter === "recommended") {
      return tpl.is_recommended !== false;
    }
    return true;
  });

  const fullPool = allTemplatesList.length > 0 ? allTemplatesList : templates;
  const recommendedCount = fullPool.filter((t) => t.is_recommended).length || templates.length;

  /* ── Get active template structure ── */
  const getActiveStructure = () => {
    let structure = DEFAULT_STRUCTURE;
    if (selectedTemplate && selectedTemplate.template_structure) {
      try {
        const parsed = typeof selectedTemplate.template_structure === "string"
          ? JSON.parse(selectedTemplate.template_structure)
          : selectedTemplate.template_structure;
        if (Array.isArray(parsed) && parsed.length > 0) {
          structure = parsed;
        }
      } catch (e) {
        console.error("Failed to parse template structure:", e);
      }
    }

    return structure;
  };

  /* ── Case-insensitive lookup for field default value ── */
  const getFieldDefaultValue = (defaults, sectionName, fieldName) => {
    if (!defaults) return "";
    // 1. Try exact section and field key
    if (defaults[sectionName] && typeof defaults[sectionName] === "object") {
      if (defaults[sectionName][fieldName] !== undefined) {
        return defaults[sectionName][fieldName];
      }
      const key = Object.keys(defaults[sectionName]).find(k => k.toLowerCase() === fieldName.toLowerCase());
      if (key !== undefined) {
        return defaults[sectionName][key];
      }
    }
    // 2. Try case-insensitive section name
    const secKey = Object.keys(defaults).find(k => k.toLowerCase() === sectionName.toLowerCase());
    if (secKey && typeof defaults[secKey] === "object") {
      if (defaults[secKey][fieldName] !== undefined) {
        return defaults[secKey][fieldName];
      }
      const key = Object.keys(defaults[secKey]).find(k => k.toLowerCase() === fieldName.toLowerCase());
      if (key !== undefined) {
        return defaults[secKey][key];
      }
    }
    // 3. Try fieldName directly at root level
    if (defaults[fieldName] !== undefined) {
      return defaults[fieldName];
    }
    const rootKey = Object.keys(defaults).find(k => k.toLowerCase() === fieldName.toLowerCase());
    if (rootKey !== undefined) {
      return defaults[rootKey];
    }
    return "";
  };

  const normalizeSectionName = (name) => {
    return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  /* ── Case-insensitive key finder for template defaults ── */
  const findTemplateKey = (obj, ...patterns) => {
    for (const pattern of patterns) {
      const lp = pattern.toLowerCase();
      const found = Object.keys(obj).find(k => k.toLowerCase() === lp);
      if (found !== undefined) return obj[found];
    }
    for (const pattern of patterns) {
      const lp = pattern.toLowerCase();
      const found = Object.keys(obj).find(k => k.toLowerCase().includes(lp));
      if (found !== undefined) return obj[found];
    }
    return null;
  };

  /* ── When a template is selected: fill clinical fields from template.default_values ── */
  const applyTemplate = (template) => {
    if (!template) {
      setSelectedTemplate(null);
      setCustomFields({});
      setDiagnosis("");
      setDiagnosisNotes("");
      setMedicines([{ ...EMPTY_MEDICINE }]);
      setLabTests([{ test_name: "", instructions: "" }]);
      setVitalSigns({ ...EMPTY_VITALS });
      setExaminationFindings("");
      setFollowUpDate("");
      setFollowUpNotes("");
      setSpecialMessage("");
      setSelectedTemplateSpec(specList[0] || "");
      setTemplateStep("write");
      return;
    }

    setSelectedTemplate(template);
    const defaults = template.default_values || {};
    const isSystemTemplate = !template.created_by || template.is_default || (template.name && (template.name.includes("TEMPLATE") || template.name.includes("default")));

    // Populate custom fields values from defaults
    const newCustomFields = {};
    const structure = template.template_structure
      ? (typeof template.template_structure === "string" ? JSON.parse(template.template_structure) : template.template_structure)
      : DEFAULT_STRUCTURE;

    if (Array.isArray(structure)) {
      structure.forEach(sec => {
        if (sec && Array.isArray(sec.fields)) {
          sec.fields.forEach(f => {
            const val = getFieldDefaultValue(defaults, sec.section, f.name);
            newCustomFields[`${sec.section}__${f.name}`] = val || "";
          });
        }
      });
    }
    setCustomFields(newCustomFields);

    // ── 1. Diagnosis ──────────────────────────────────────────────────────────
    // Do not pre-fill provisional diagnosis from default/system templates as they are case-specific
    let diag = "";
    if (!isSystemTemplate) {
      const provDiag = findTemplateKey(defaults, "provisional diagnosis");
      diag =
        defaults.diagnosis ||
        provDiag?.diagnosis ||
        provDiag?.info ||
        "";
    }
    setDiagnosis(typeof diag === "string" ? diag : "");
    setDiagnosisNotes("");

    // ── 2. Medicines (TREATMENT (RX) — numbered keys "1","2","3"…) ───────────
    const rxSection = findTemplateKey(defaults, "treatment (rx)", "treatment(rx)", "treatment (rx)");
    const medArr = [];
    if (rxSection && typeof rxSection === "object") {
      ["1","2","3","4","5","6","7","8","9","10"].forEach(n => {
        const val = rxSection[n];
        if (val && typeof val === "string" && val.trim()) {
          const dosageMatch = val.match(/\b(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|IU|units?))\b/i);
          const freqMatch   = val.match(/\b(OD|BD|TDS|QID|SOS|PRN|HS|AC|PC|1-0-1|1-1-1|0-0-1|1-0-0|2-0-2|1-1-0)\b/gi);
          const durMatch    = val.match(/\bfor\s+(\d+\s+(?:days?|weeks?|months?))\b/i);
          let nameClean = val;
          if (dosageMatch) nameClean = nameClean.replace(dosageMatch[0], "");
          if (freqMatch) {
            freqMatch.forEach(f => {
              nameClean = nameClean.replace(new RegExp(`\\b${f}\\b`, "gi"), "");
            });
          }
          if (durMatch) nameClean = nameClean.replace(durMatch[0], "");
          nameClean = nameClean.replace(/\s+/g, " ").trim();
          nameClean = nameClean.replace(/^[-,\s]+|[-,\s]+$/g, "").trim();
          if (!nameClean) nameClean = val;

          medArr.push({
            ...EMPTY_MEDICINE,
            name: nameClean,
            dosage:      dosageMatch ? dosageMatch[0] : "",
            frequency:   freqMatch   ? freqMatch[0]  : "",
            duration:    durMatch    ? durMatch[1]   : "",
            instructions: "",
          });
        }
      });
    }
    setMedicines(medArr.length > 0 ? medArr : [{ ...EMPTY_MEDICINE }]);

    // ── 3. Lab Tests (INVESTIGATIONS — combine info + others + any string values) ──
    const invSection = findTemplateKey(defaults, "investigations");
    const labs = [];
    if (invSection && typeof invSection === "object") {
      Object.values(invSection).forEach(v => {
        if (typeof v === "string" && v.trim()) {
          v.split(/[,/]+/).forEach(part => {
            const t = part.trim();
            if (t) labs.push(t);
          });
        }
      });
    }
    setLabTests(labs.length > 0 ? labs : [""]);

    // ── 4. Vital Signs (vital_signs key, then VITALS, VITALS (REPORTED), etc.) ──
    // Always clear vital signs from template to ensure patient-specific values are entered fresh
    setVitalSigns({ ...EMPTY_VITALS });

    // ── 5. Examination Findings (find ALL keys with "examination" in name) ───
    // Do not pre-fill physical examination findings from system templates as they are case-specific
    let examFindings = "";
    if (!isSystemTemplate) {
      const examParts = [];
      Object.keys(defaults)
        .filter(k => k.toLowerCase().includes("examination") || k.toLowerCase().includes("tele-examination"))
        .forEach(key => {
          const section = defaults[key];
          if (section && typeof section === "object") {
            Object.entries(section).forEach(([field, val]) => {
              if (typeof val === "string" && val.trim()) {
                if (field === "info") {
                  examParts.push(val.trim());
                } else {
                  examParts.push(`${field.replace(/_/g, " ")}: ${val.trim()}`);
                }
              }
            });
          }
        });
      // Also grab POSITIVE FINDINGS
      const posFindings = findTemplateKey(defaults, "positive findings", "positive findings:");
      if (posFindings?.findings && typeof posFindings.findings === "string") {
        examParts.push(`Positive Findings: ${posFindings.findings}`);
      }
      examFindings = examParts.join("\n");
    }
    setExaminationFindings(examFindings);

    // ── 6. Follow-Up ─────────────────────────────────────────────────────────
    const fUp =
      findTemplateKey(defaults, "follow-up", "follow up", "follow-up:") ||
      defaults.follow_up ||
      {};
    setFollowUpDate(fUp.return_after || fUp.review_after || fUp.review_after_days || "");
    setFollowUpNotes(fUp.info || fUp.warning_signs || fUp.to_report_immediately || "Seek immediate medical attention if you experience high fever, severe breathlessness, chest pain, or sudden weakness.");

    // ── 7. Presenting Complaints ───────────────────────────
    if (defaults._dynamic_complaints && Array.isArray(defaults._dynamic_complaints) && defaults._dynamic_complaints.length > 0) {
      setPresentingComplaints(defaults._dynamic_complaints);
    } else {
      setPresentingComplaints([{ complaint: "", details: "" }]);
    }

    // Legacy fallback for old templates without _dynamic_complaints
    let complaintsStr = "";
    if (!isSystemTemplate && (!defaults._dynamic_complaints || defaults._dynamic_complaints.length === 0)) {
      const complaints = findTemplateKey(defaults, "presenting complaints", "persenting complaints");
      if (complaints && typeof complaints === "object") {
        complaintsStr = Object.entries(complaints)
          .filter(([, v]) => typeof v === "string" && v.trim())
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v.trim()}`)
          .join("\n");
      }
    }
    setSpecialMessage(complaintsStr);

    setSelectedTemplateSpec(template?.specialization || specList[0] || "");
    setTemplateStep("write");
  };

  /* ── complaint helpers ── */
  const addComplaint = () => setPresentingComplaints((prev) => [...prev, { complaint: "", details: "" }]);
  const removeComplaint = (idx) => setPresentingComplaints((prev) => prev.filter((_, i) => i !== idx));
  const updateComplaint = (idx, field, value) => {
    setPresentingComplaints((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  /* ── medicine form detection & smart defaults ── */
  const detectMedicineForm = (name = "", category = "") => {
    const cat = (category || "").toLowerCase();
    if (cat === "syrup") return "syrup";
    if (cat === "gel" || cat === "ointment") return "gel";
    if (cat === "drops") return "drops";
    if (cat === "inhaler") return "inhaler";
    if (cat === "injection") return "injection";

    const n = (name || "").toLowerCase();
    if (n.includes("syrup") || n.includes("syp") || n.includes("suspension") || n.includes("liquid") || n.includes("solution") || (n.includes("drops") && (n.includes("pediatric") || n.includes("oral")))) {
      return "syrup";
    }
    if (n.includes("gel") || n.includes("cream") || n.includes("ointment") || n.includes("lotion") || n.includes("liniment") || n.includes("emulgel") || n.includes("balm") || n.includes("jelly")) {
      return "gel";
    }
    if (n.includes("drop") || n.includes("eye drop") || n.includes("ear drop") || n.includes("nasal drop") || n.includes("spray")) {
      return "drops";
    }
    if (n.includes("inhaler") || n.includes("respule") || n.includes("rotacap") || n.includes("transcap")) {
      return "inhaler";
    }
    if (n.includes("inj") || n.includes("injection") || n.includes("vial") || n.includes("ampoule")) {
      return "injection";
    }
    return "tablet";
  };

  const setMedicineForm = (idx, newForm) => {
    setMedicines((prev) =>
      prev.map((m, i) => {
        if (i !== idx) return m;
        let newDosage = m.dosage;
        let newQuantity = m.quantity;
        let newInstructions = m.instructions;

        if (newForm === "gel") {
          newDosage = "Apply thin layer";
          newQuantity = "1 tube";
          newInstructions = "Apply gently on affected clean area. For external use only.";
        } else if (newForm === "syrup") {
          newDosage = "5 ml";
          newQuantity = "1 bottle";
          newInstructions = "Take with measuring cup after food. Shake well before use.";
        } else if (newForm === "drops") {
          newDosage = "1-2 drops";
          newQuantity = "1 bottle";
          newInstructions = "Instill into affected area as directed. Wash hands before use.";
        } else if (newForm === "inhaler") {
          newDosage = "1-2 puffs";
          newQuantity = "1 inhaler";
          newInstructions = "Inhale deeply. Rinse mouth with water after inhalation.";
        } else if (newForm === "injection") {
          newDosage = "1 vial";
          newQuantity = "1 ampoule";
          newInstructions = "To be administered by healthcare professional.";
        } else {
          newDosage = "1 tablet";
          newQuantity = "10";
          newInstructions = "Take after food with water";
        }

        return {
          ...m,
          form: newForm,
          dosage: newDosage,
          quantity: newQuantity,
          instructions: newInstructions,
        };
      })
    );
  };

  const selectMedicine = (idx, opt) => {
    const form = detectMedicineForm(opt.name, opt.category);
    let defaultDosage = opt.dose || opt.power || "";
    let defaultFrequency = "1-0-1";
    let defaultDuration = "5 days";
    let defaultQuantity = "10";
    let defaultInstructions = "Take after food with water";

    if (form === "syrup") {
      defaultDosage = opt.power ? `${opt.power}` : "5 ml";
      defaultFrequency = "1-0-1";
      defaultDuration = "5 days";
      defaultQuantity = "1 bottle";
      defaultInstructions = "Take with measuring cup after food. Shake well before use.";
    } else if (form === "gel") {
      defaultDosage = "Apply thin layer";
      defaultFrequency = "1-0-1";
      defaultDuration = "7 days";
      defaultQuantity = "1 tube";
      defaultInstructions = "Apply gently on affected clean area. For external use only.";
    } else if (form === "drops") {
      defaultDosage = "1-2 drops";
      defaultFrequency = "1-0-1";
      defaultDuration = "5 days";
      defaultQuantity = "1 bottle";
      defaultInstructions = "Instill into affected area as directed. Wash hands before use.";
    } else if (form === "inhaler") {
      defaultDosage = "1-2 puffs";
      defaultFrequency = "1-0-1";
      defaultDuration = "30 days";
      defaultQuantity = "1 inhaler";
      defaultInstructions = "Inhale deeply. Rinse mouth with water after inhalation.";
    } else if (form === "injection") {
      defaultDosage = opt.power || "1 vial";
      defaultFrequency = "Once";
      defaultDuration = "1 day";
      defaultQuantity = "1 ampoule";
      defaultInstructions = "To be administered by healthcare professional.";
    } else {
      defaultDosage = opt.power || opt.dose || "1 tab";
      defaultFrequency = "1-0-1";
      defaultDuration = "5 days";
      defaultQuantity = "10";
      defaultInstructions = "Take after food with water";
    }

    setMedicines((prev) =>
      prev.map((m, i) =>
        i === idx
          ? {
              ...m,
              name: opt.name,
              dosage: defaultDosage,
              frequency: defaultFrequency,
              duration: defaultDuration,
              quantity: defaultQuantity,
              instructions: defaultInstructions,
              form: form,
            }
          : m
      )
    );
  };

  /* ── Follow-up Quick Date Calculator ── */
  const setQuickFollowUp = (days) => {
    if (!days) {
      setFollowUpDate("");
      setFollowUpNotes("Review SOS if symptoms persist or worsen");
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    setFollowUpDate(dateStr);
    const noteText =
      days === 1
        ? "Review tomorrow"
        : days === 3
        ? "Review after 3 days"
        : days === 5
        ? "Review after 5 days"
        : days === 7
        ? "Review after 1 week"
        : days === 14
        ? "Review after 2 weeks"
        : days === 30
        ? "Review after 1 month"
        : `Review after ${days} days`;
    if (!followUpNotes.trim() || followUpNotes.toLowerCase().includes("review")) {
      setFollowUpNotes(noteText);
    }
  };

  /* ── medicine helpers ── */
  const addMedicine = () => setMedicines((prev) => [...prev, { ...EMPTY_MEDICINE }]);
  const removeMedicine = (idx) => setMedicines((prev) => prev.filter((_, i) => i !== idx));
  const updateMedicine = (idx, field, value) => {
    setMedicines((prev) => {
      const next = prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m));
      // Auto-calculate quantity if frequency or duration changed
      if (field === "frequency" || field === "duration") {
         const m = next[idx];
         let days = 1;
         
         // parse duration e.g., "5 days", "1 week"
         const durMatch = (m.duration || "").match(/(\d+)\s*(day|week|month)s?/i);
         if (durMatch) {
            let num = parseInt(durMatch[1]);
            let unit = durMatch[2].toLowerCase();
            if (unit === 'week') days = num * 7;
            else if (unit === 'month') days = num * 30;
            else days = num;
         } else if (!isNaN(parseInt(m.duration))) {
            days = parseInt(m.duration);
         }
         
         // parse frequency e.g., "1-0-1", "OD", "BD", "TDS", "QID"
         let times = 0;
         const freq = (m.frequency || "").trim().toUpperCase();
         if (freq === "OD") times = 1;
         else if (freq === "BD" || freq === "BID") times = 2;
         else if (freq === "TDS" || freq === "TID") times = 3;
         else if (freq === "QID") times = 4;
         else if (/^\d+(-\d+)+$/.test(freq)) {
            times = freq.split('-').reduce((acc, val) => acc + (parseInt(val) || 0), 0);
         } else if (!isNaN(parseInt(freq))) {
            times = parseInt(freq);
         }
         
         const form = m.form || detectMedicineForm(m.name);
         if (form === "syrup" || form === "gel" || form === "drops" || form === "inhaler") {
            // Keep container unit like 1 bottle, 1 tube unless user customized
            if (!m.quantity || /^\d+$/.test(m.quantity)) {
               next[idx].quantity = form === "gel" ? "1 tube" : form === "inhaler" ? "1 inhaler" : "1 bottle";
            }
         } else if (times > 0 && days > 0) {
            next[idx].quantity = (times * days).toString();
         }
      }
      return next;
    });
  };

  /* ── lab test helpers with smart instructions & auto-clearing ── */
  const addLabTest = () => setLabTests((prev) => [...prev, { test_name: "", instructions: "", autoFilledInstruction: "" }]);
  const removeLabTest = (idx) => setLabTests((prev) => prev.filter((_, i) => i !== idx));

  const getSmartTestInstructions = (opt) => {
    if (!opt) return "";
    if (opt.instructions && opt.instructions.trim() && opt.instructions.toLowerCase() !== "remarks") {
      return opt.instructions.trim();
    }
    if (opt.remarks && opt.remarks.trim() && opt.remarks.toLowerCase() !== "remarks") {
      return opt.remarks.trim();
    }

    const name = (opt.test_name || "").toUpperCase();
    const dept = (opt.department || opt.category || "").toUpperCase();

    // Fasting checks
    if (
      name.includes("FASTING") ||
      name.includes("BSF") ||
      name.includes("GLUCOSE (F)") ||
      name.includes("LIPID") ||
      name.includes("CHOLESTEROL") ||
      name.includes("TRIGLYCERIDE") ||
      name.includes("INSULIN FASTING") ||
      opt.requires_fasting
    ) {
      return "10-12 hours overnight fasting required. Water is permitted.";
    }

    // Ultrasound / Abdomen checks
    if (
      name.includes("WHOLE ABDOMEN") ||
      name.includes("PELVIS") ||
      name.includes("KUB") ||
      name.includes("PREGNANCY") ||
      dept.includes("ULTRASOUND")
    ) {
      if (name.includes("UPPER ABDOMEN")) {
        return "4-6 hours fasting prior to ultrasound.";
      }
      return "Drink plenty of water. Full bladder required for ultrasound scan.";
    }

    // CT / Contrast checks
    if (name.includes("CECT") || name.includes("CONTRAST")) {
      return "Fasting 4-6 hours before scan. Recent Serum Creatinine report required.";
    } else if (name.includes("NCCT") || dept.includes("CT")) {
      return "Remove metallic objects, jewelry, and hairpins prior to scan.";
    }

    // X-Ray checks
    if (dept.includes("X-RAY") || name.includes("X-RAY")) {
      return "Remove metallic accessories, watches, and ornaments in scan area.";
    }

    // Sample & container details
    const parts = [];
    if (opt.sample_type && !opt.sample_type.toLowerCase().includes("sample type")) {
      parts.push(`Sample: ${opt.sample_type}`);
    }
    if (opt.container && !opt.container.toLowerCase().includes("container temp")) {
      parts.push(`Container: ${opt.container}`);
    }
    if (opt.reporting_schedule && !opt.reporting_schedule.toLowerCase().includes("reporting schedule")) {
      parts.push(`Report: ${opt.reporting_schedule}`);
    }

    return parts.join(", ") || "Standard sample collection as per laboratory protocol.";
  };

  const selectLabTest = (idx, opt) => {
    const instruction = getSmartTestInstructions(opt);
    setLabTests((prev) =>
      prev.map((t, i) => {
        if (i !== idx) return t;
        const curr = typeof t === "string" ? { test_name: t } : { ...t };
        return {
          ...curr,
          test_name: opt.test_name,
          instructions: instruction,
          autoFilledInstruction: instruction,
          test_code: opt.test_code || "",
        };
      })
    );
  };

  const updateLabTestName = (idx, val) => {
    setLabTests((prev) =>
      prev.map((t, i) => {
        if (i !== idx) return t;
        const curr = typeof t === "string" ? { test_name: t, instructions: "" } : { ...t };
        // If user clears the test name or modifies it away from chosen test,
        // clear the auto-filled instruction so it never stays stuck on custom typing!
        const shouldClear = !val.trim() || (curr.autoFilledInstruction && curr.instructions === curr.autoFilledInstruction);
        return {
          ...curr,
          test_name: val,
          instructions: shouldClear ? "" : (curr.instructions || ""),
          autoFilledInstruction: shouldClear ? "" : curr.autoFilledInstruction,
        };
      })
    );
  };

  const updateLabTestInstruction = (idx, val) => {
    setLabTests((prev) =>
      prev.map((t, i) => {
        if (i !== idx) return t;
        const curr = typeof t === "string" ? { test_name: t } : { ...t };
        return {
          ...curr,
          instructions: val,
          // User manually edited instruction, so decouple from auto-filled tracking
          autoFilledInstruction: "",
        };
      })
    );
  };

  /* ── vital sign helper ── */
  const updateVital = (key, value) => setVitalSigns((prev) => ({ ...prev, [key]: value }));

  const hydrateFromPrescription = (prescription) => {
    if (!prescription) return;

    const isSigned = Boolean(
      prescription.is_draft === false ||
      prescription.status === "completed" ||
      prescription.status === "signed" ||
      prescription.signed_at ||
      prescription.completed_at
    );
    setIsPrescriptionSigned(isSigned);
    if (prescription.pdf_url) {
      setSignedPrescriptionUrl(prescription.pdf_url);
    }

    if (prescription.id) {
      setExistingPrescriptionId(prescription.id);
    }
    if (prescription.pid) {
      setExistingPid(prescription.pid);
    }
    if (prescription.episode_id) {
      setExistingEpisodeId(prescription.episode_id);
    }

    if (prescription.specialization) {
      setSelectedTemplateSpec(prescription.specialization.split(",")[0].trim());
    } else {
      setSelectedTemplateSpec(specList[0] || "");
    }

    let diag = prescription.diagnosis || {};
    if (typeof diag === "string" && diag.trim().startsWith("{")) {
      try { diag = JSON.parse(diag); } catch {}
    }
    if (typeof diag === "string") {
      setDiagnosis(diag.trim());
      setDiagnosisNotes("");
    } else if (typeof diag === "object" && diag !== null) {
      setDiagnosis(diag.primary || diag.provisional_diagnosis || diag.diagnosis || diag.name || diag.text || "");
      setDiagnosisNotes(diag.notes || diag.clinical_notes || "");
    }
    if (prescription.template_data && typeof prescription.template_data === "object") {
      const td = prescription.template_data;
      const fallbackDiag = td['PROVISIONAL DIAGNOSIS__diagnosis'] || td.diagnosis || td.provisional_diagnosis;
      if (fallbackDiag) {
        setDiagnosis((prev) => prev || fallbackDiag);
      }
    }

    if (Array.isArray(prescription.medicines) && prescription.medicines.length > 0) {
      setMedicines(prescription.medicines);
    }

    if (Array.isArray(prescription.lab_tests) && prescription.lab_tests.length > 0) {
      setLabTests(prescription.lab_tests);
    }

    if (prescription.vital_signs && typeof prescription.vital_signs === "object") {
      setVitalSigns({ ...EMPTY_VITALS, ...prescription.vital_signs });
    }

    if (prescription.follow_up) {
      if (typeof prescription.follow_up === "string") {
        setFollowUpNotes(prescription.follow_up);
      } else {
        setFollowUpDate(prescription.follow_up.date || prescription.follow_up.return_after || "");
        setFollowUpNotes(prescription.follow_up.notes || prescription.follow_up.warning_signs || "");
      }
    }

    if (prescription.template_data && typeof prescription.template_data === "object") {
      setCustomFields(prescription.template_data);
      if (prescription.template_data._dynamic_complaints && Array.isArray(prescription.template_data._dynamic_complaints)) {
        if (prescription.template_data._dynamic_complaints.length > 0) {
          setPresentingComplaints(prescription.template_data._dynamic_complaints);
        }
      }
      if (prescription.template_data.SYMPTOMS__symptoms !== undefined) {
        setSymptoms(prescription.template_data.SYMPTOMS__symptoms);
      }
      if (prescription.template_data.CONDITIONS__conditions !== undefined) {
        setConditions(prescription.template_data.CONDITIONS__conditions);
      }
      if (prescription.template_data.raw_special_message !== undefined) {
        setSpecialMessage(prescription.template_data.raw_special_message);
      } else {
        setSpecialMessage(typeof prescription.special_message === "string" ? prescription.special_message : "");
      }
      if (prescription.template_data.raw_examination_findings !== undefined) {
        setExaminationFindings(prescription.template_data.raw_examination_findings);
      } else {
        setExaminationFindings(typeof prescription.examination_findings === "string" ? prescription.examination_findings : (prescription.examination_findings?.notes || ""));
      }
    } else {
      setCustomFields({});
      setSpecialMessage(typeof prescription.special_message === "string" ? prescription.special_message : "");
      setExaminationFindings(typeof prescription.examination_findings === "string" ? prescription.examination_findings : (prescription.examination_findings?.notes || ""));
    }
  };

  // Sync selectedTemplate based on prescription template_data or specialization
  useEffect(() => {
    if (templates.length > 0) {
      if (customFields.template_id) {
        const matched = templates.find(t => t.id === customFields.template_id);
        if (matched) {
          setSelectedTemplate(matched);
          return;
        }
      }
      
      // Fallback: match by specialization and appointment_type if we have no template_id
      if (selectedTemplateSpec) {
        const matched = templates.find(t =>
          t.specialization?.toLowerCase() === selectedTemplateSpec.toLowerCase()
        );
        if (matched && !selectedTemplate) {
          setSelectedTemplate(matched);
        }
      }
    }
  }, [templates, customFields.template_id, selectedTemplateSpec]);

  // Load existing draft (or last prescription) for this appointment
  useEffect(() => {
    if (hasLoadedDraft) return;

    const loadDraft = async () => {
      const resolvedMeta = await resolveMeta();
      if (!resolvedMeta?.doctor_id) {
        setHasLoadedDraft(true);
        return;
      }

      try {
        const res = await fetch("/api/prescriptions/by-appointment-doctor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointment_id: appointmentId,
            doctor_id: resolvedMeta.doctor_id,
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.success && data?.data?.prescription) {
          hydrateFromPrescription(data.data.prescription);
          setIsEditingExisting(true);
          setTemplateStep("write");
        }
      } catch (err) {
        console.warn("Failed to load prescription draft:", err);
      } finally {
        setHasLoadedDraft(true);
      }
    };

    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, hasLoadedDraft]);

  /* ── submit ── */
  const resolveMeta = async () => {
    if (meta?.patient_id && meta?.doctor_id) return meta;
    const loggedDoctorId = typeof window !== "undefined" ? (localStorage.getItem("userId") || localStorage.getItem("user_id")) : null;
    if (meta?.patient_id && !meta?.doctor_id && loggedDoctorId) {
      return { ...meta, doctor_id: loggedDoctorId };
    }
    try {
      const res = await fetch(`/api/appointment/web/${appointmentId}`);
      const data = await res.json().catch(() => null);
      const appointment = data?.data?.appointment || null;
      if (!appointment) {
        return {
          ...meta,
          doctor_id: meta?.doctor_id || loggedDoctorId,
        };
      }
      return {
        ...meta,
        patient_id: appointment.patient?.id || appointment.patient_id || meta?.patient_id,
        doctor_id: appointment.doctor?.id || appointment.doctor_id || meta?.doctor_id || loggedDoctorId,
        patient_name: appointment.patient?.full_name || appointment.patient_name || meta?.patient_name || "Patient",
        care_episode_id: appointment.care_episode_id || meta?.care_episode_id || null,
        episode_id: appointment.episode_id || meta?.episode_id || (appointment.care_episode_id ? `EP-${String(appointment.care_episode_id).slice(0, 8).toUpperCase()}` : null),
        appointment_type: appointment.appointment_type || meta?.appointment_type || "clinic",
      };
    } catch {
      return {
        ...meta,
        doctor_id: meta?.doctor_id || loggedDoctorId,
      };
    }
  };

  const handleSubmit = async (action = "sign") => {
    if (isPrescriptionSigned) {
      toast.error("This prescription is already signed and locked.");
      return;
    }

    const resolvedMeta = await resolveMeta();
    if (!resolvedMeta?.patient_id || !resolvedMeta?.doctor_id) {
      toast.error("Appointment details not loaded. Try again.");
      return;
    }

    const filledMedicines = medicines.filter((m) => m.name.trim());
    if (filledMedicines.length === 0) {
      toast.error("Add at least one medicine.");
      return;
    }
    if (!diagnosis.trim() && action === "sign") {
      toast.error("Diagnosis is required to sign.");
      return;
    }

    setSaving(true);
    const tid = toast.loading(action === "sign" ? "Signing prescription…" : "Saving draft…");

    // Build cleaned vital_signs — only include filled fields
    const cleanedVitals = {};
    Object.entries(vitalSigns).forEach(([k, v]) => {
      if (v.trim()) cleanedVitals[k] = v.trim();
    });

    // Compile dynamic custom fields
    let compiledExam = "";
    let compiledSpecial = "";
    
    const activeStructure = getActiveStructure();
    activeStructure.forEach(sec => {
      const normSec = normalizeSectionName(sec.section);
      if (
        normSec.includes("diagnosis") ||
        normSec.includes("vitals") ||
        normSec === "vital" ||
        normSec.includes("treatment") ||
        normSec === "rx" ||
        normSec === "medicines" ||
        normSec.includes("investigation") ||
        normSec.includes("lab") ||
        normSec.includes("followup") ||
        normSec.includes("symptoms") ||
        normSec.includes("conditions") ||
        normSec.includes("presenting complaints") ||
        normSec.includes("complaints")
      ) {
        return;
      }
      
      const parts = [];
      (sec.fields || []).forEach(f => {
        const val = customFields[`${sec.section}__${f.name}`];
        if (val && typeof val === "string" && val.trim()) {
          parts.push(`${f.label || f.name} ${val.trim()}`);
        }
      });
      
      if (parts.length > 0) {
        const sectionText = `[${sec.section}]\n` + parts.join("\n");
        if (normSec.includes("examination") || normSec.includes("findings")) {
          compiledExam += (compiledExam ? "\n\n" : "") + sectionText;
        } else {
          compiledSpecial += (compiledSpecial ? "\n\n" : "") + sectionText;
        }
      }
    });

    const finalExamFindings = compiledExam || examinationFindings.trim();
    const finalSpecialMessage = (compiledSpecial ? compiledSpecial + "\n\n" : "") + specialMessage.trim();

    try {
      const hasExisting = !!existingPrescriptionId;
      const endpoint = hasExisting
        ? "/api/prescriptions/update"
        : "/api/prescriptions/create";

      const payload = {
        doctor_id: resolvedMeta.doctor_id,
        patient_id: resolvedMeta.patient_id,
        appointment_id: appointmentId,
        appointment_type: (() => {
          const raw = String(resolvedMeta.appointment_type || meta?.appointment_type || "video_call").toLowerCase();
          if (raw.includes("video")) return "video_call";
          if (raw.includes("home")) return "home_visit";
          return "clinic_visit";
        })(),
        specialization: selectedTemplateSpec || specList[0] || "general_medicine",
        diagnosis: { primary: diagnosis.trim(), notes: diagnosisNotes.trim() },
        medicines: filledMedicines,
        lab_tests: labTests.filter((t) => typeof t === "string" ? t.trim() : (t.test_name || "").trim()),
        vital_signs: Object.keys(cleanedVitals).length > 0 ? cleanedVitals : {},
        examination_findings: finalExamFindings ? { notes: finalExamFindings } : {},
        follow_up: followUpDate || followUpNotes.trim()
          ? { 
              date: followUpDate, 
              return_after: followUpDate,
              notes: followUpNotes.trim(), 
              warning_signs: followUpNotes.trim() 
            }
          : {},
        special_message: finalSpecialMessage,
        template_data: {
          ...customFields,
          _dynamic_complaints: presentingComplaints.filter(c => c.complaint.trim()),
          SYMPTOMS__symptoms: symptoms.trim(),
          CONDITIONS__conditions: conditions.trim(),
          template_id: selectedTemplate?.id,
          raw_special_message: specialMessage.trim(),
          raw_examination_findings: examinationFindings.trim()
        },
        action,
      };

      if (hasExisting) {
        payload.prescription_id = existingPrescriptionId;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      toast.dismiss(tid);

      if (!res.ok || !data?.success) {
        toast.error(data?.message || "Failed to save prescription.");
        return;
      }

      toast.success(
        action === "sign"
          ? "Prescription signed & appointment completed!"
          : "Prescription draft saved."
      );
      if (onPrescriptionSaved) {
        onPrescriptionSaved(data?.data);
      }
      onClose();
    } catch (err) {
      toast.dismiss(tid);
      console.error("Prescription save error:", err);
      toast.error("Failed to save prescription.");
    } finally {
      setSaving(false);
    }
  };

  /* ── styles ── */
  const inputClass = isPrescriptionSigned
    ? "w-full rounded-md border border-slate-200 bg-slate-100/80 px-3 py-2 text-sm text-slate-800 font-normal cursor-not-allowed select-text outline-none"
    : "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 font-normal placeholder:text-slate-400 focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1] outline-none transition";
  const sectionTitle =
    "flex items-center gap-2 text-xs font-semibold text-[#0067A1] uppercase tracking-wider mb-2.5";

  const wrapper = (children) => {
    if (isSidebarPanel) {
      return (
        <div className="relative w-full h-full bg-white overflow-hidden flex flex-col border-l border-gray-800">
          {children}
        </div>
      );
    }
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
      >
        <div className="absolute inset-0" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative w-full h-full sm:h-auto sm:max-h-[96vh] sm:max-w-4xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        >
          {children}
        </motion.div>
      </motion.div>
    );
  };

  return wrapper(
    <>
        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-6 py-4 shrink-0 transition-colors ${isPrescriptionSigned ? "bg-slate-900 border-b border-slate-800" : "bg-[#0067A1]"}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {templateStep === "write" && !isPrescriptionSigned && (
                <button
                  type="button"
                  onClick={() => setTemplateStep("select")}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors mr-1 cursor-pointer flex items-center gap-1 text-xs font-medium"
                  title="Choose Different Template"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Templates</span>
                </button>
              )}
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                {isPrescriptionSigned && <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />}
                {isPrescriptionSigned ? "Prescription (Signed & Finalized)" : isEditingExisting ? "Edit Prescription" : "Write Prescription"}
              </h3>
              {episodeCode && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/20 text-white border border-white/30 tracking-wide" title="Care Episode Tracking ID">
                  Episode: {episodeCode}
                </span>
              )}
              {isPrescriptionSigned ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  {existingPid ? `Rx #${existingPid} · Finalized` : "Signed"}
                </span>
              ) : isEditingExisting ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-400/20 text-yellow-200 border border-yellow-400/30">
                  {existingPid ? `Rx #${existingPid}` : "Existing"}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              {meta?.patient_name && (
                <p className="text-xs text-white/80">
                  <span className="text-white/60">Patient:</span> {meta.patient_name}
                  {meta.patient_gender ? `, ${meta.patient_gender}` : ""}
                  {patientAge ? `, Age: ${patientAge}` : ""}
                </p>
              )}
              {effectiveDoctorName && (
                <p className="text-xs text-white/80">
                  <span className="text-white/60">Dr:</span> {effectiveDoctorName}
                  {effectiveDoctorQual ? ` (${effectiveDoctorQual})` : ""}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 transition-colors shrink-0 ml-3 cursor-pointer">
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ───── STEP 1: Template Selector ───── */}
          {templateStep === "select" && (
            <div className="p-6">

              {/* Doctor & Patient Info Cards */}
              <div className="space-y-2 mb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#0067A1]/5 border border-[#0067A1]/10">
                    <p className="text-[10px] font-medium text-[#0067A1] uppercase tracking-wider mb-1">Doctor Profile</p>
                    <p className="text-xs font-semibold text-slate-800">{effectiveDoctorName}</p>
                    {effectiveDoctorQual && <p className="text-[11px] text-slate-600 font-normal">{effectiveDoctorQual}</p>}
                    {effectiveDoctorSpec && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0067A1]/10 text-[#0067A1]">
                        Specialization: {effectiveDoctorSpec}
                      </span>
                    )}
                    {effectiveDoctorLicense && <p className="text-[10px] text-slate-500 font-normal mt-0.5">Reg: {effectiveDoctorLicense}</p>}
                    {effectiveDoctorClinic && <p className="text-[10px] text-slate-500 font-normal">{effectiveDoctorClinic}</p>}
                  </div>

                  {meta?.patient_name && (
                    <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
                      <p className="text-[10px] font-medium text-[#0067A1] uppercase tracking-wider mb-1">Patient</p>
                      <p className="text-xs font-semibold text-slate-800">{meta.patient_name}</p>
                      {meta.patient_gender && <p className="text-[11px] text-slate-600 font-normal capitalize">{meta.patient_gender}</p>}
                      {patientAge && <p className="text-[11px] font-medium text-slate-700">Age: {patientAge}</p>}
                      {meta.patient_blood_group && <p className="text-[10px] text-slate-500 font-normal">Blood: {meta.patient_blood_group}</p>}
                    </div>
                  )}
                </div>
                {episodeCode && (
                  <div className="px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">Episode ID</span>
                    <span className="font-mono font-medium text-[#0067A1]">{episodeCode}</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-800">Choose a Prescription Template</h4>
                <p className="text-xs text-slate-600 font-normal mt-0.5">
                  {effectiveDoctorSpec ? (
                    <>Templates pre-configured for <strong className="text-[#0067A1] font-semibold">{effectiveDoctorSpec}</strong>.</>
                  ) : (
                    "Select a template to pre-fill clinical diagnosis, medicines and advice, or start with a blank form."
                  )}
                </p>
              </div>

              {/* Search & Specialty Filter Controls */}
              <div className="space-y-2.5 mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search templates by specialty or name…"
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1]"
                  />
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {templateSearch && (
                    <button
                      type="button"
                      onClick={() => setTemplateSearch("")}
                      className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {fullPool.length > recommendedCount && recommendedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTemplateFilter("specialty")}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                        templateFilter === "specialty" || templateFilter === "recommended"
                          ? "bg-[#0067A1] text-white shadow-xs"
                          : "bg-[#0067A1]/10 text-[#0067A1] hover:bg-[#0067A1]/20 border border-[#0067A1]/20"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{effectiveDoctorSpec ? `${effectiveDoctorSpec} (${recommendedCount})` : `Your Specialty (${recommendedCount})`}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateFilter("all")}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        templateFilter === "all"
                          ? "bg-[#0067A1] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      All Specialties ({fullPool.length})
                    </button>
                  </div>
                )}
              </div>

              {templatesLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-2.5">
                  <Spinner size="w-6 h-6 text-[#0067A1]" />
                  <p className="text-xs font-medium text-slate-600">Loading prescription templates from AWS RDS…</p>
                </div>
              ) : filteredTemplates.length > 0 ? (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredTemplates.map((tpl, idx) => {
                    const isRec = Boolean(tpl.is_recommended);
                    return (
                      <button
                        key={tpl.id || idx}
                        onClick={() => applyTemplate(tpl)}
                        className={`w-full flex items-start gap-3 p-3.5 rounded-lg border transition-all text-left group cursor-pointer ${
                          isRec
                            ? "border-[#0067A1]/40 bg-[#0067A1]/5 hover:border-[#0067A1] hover:bg-[#0067A1]/10 shadow-xs"
                            : "border-slate-200 bg-white hover:border-[#0067A1] hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          isRec
                            ? "bg-[#0067A1] text-white"
                            : "bg-[#0067A1]/10 text-[#0067A1] group-hover:bg-[#0067A1]/20"
                        }`}>
                          <span className="font-bold text-xs">Rx</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900 truncate">{tpl.name || `Template ${idx + 1}`}</p>
                            {isRec && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Recommended for your specialty
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {tpl.specialization && (
                              <p className="text-[11px] text-[#0067A1] font-semibold capitalize">{tpl.specialization.replace(/_/g, " ")}</p>
                            )}
                            {tpl.appointment_type && (
                              <span className="text-[10px] text-slate-500 font-normal capitalize">• {tpl.appointment_type.replace(/_/g, " ")}</span>
                            )}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-[#0067A1] shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-700">No matching templates found for your search.</p>
                  <p className="text-[11px] text-slate-500">You can clear your search to view all templates, or start with a blank form.</p>
                </div>
              )}

              <button
                onClick={() => applyTemplate(null)}
                className="w-full mt-4 py-2.5 rounded-lg border border-dashed border-slate-300 text-sm text-slate-700 hover:border-[#0067A1] hover:text-[#0067A1] hover:bg-slate-50 transition-all font-semibold cursor-pointer"
              >
                + Start with Blank Form
              </button>
            </div>
          )}

          {/* ───── STEP 2: Prescription Form ───── */}
          {templateStep === "write" && (
          <div className="p-6 space-y-6">

          {/* ── Doctor & Patient Info Summary ── */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-medium text-[#0067A1] uppercase tracking-wider mb-0.5">Doctor</p>
                <p className="text-xs font-semibold text-slate-800">{effectiveDoctorName}</p>
                {effectiveDoctorQual && <p className="text-[11px] text-slate-600 font-normal">{effectiveDoctorQual}</p>}
                
                {specList.length > 1 ? (
                  <div className="mt-1">
                    <label className="text-[10px] text-slate-600 font-medium block">Active Specialization</label>
                    <select
                      disabled={isPrescriptionSigned}
                      value={selectedTemplateSpec}
                      onChange={(e) => setSelectedTemplateSpec(e.target.value)}
                      className={`text-xs ${isPrescriptionSigned ? "bg-slate-100 text-slate-600 cursor-not-allowed" : "bg-white text-[#0067A1]"} border border-slate-300 rounded p-1 font-medium mt-0.5 focus:outline-none focus:ring-1 focus:ring-[#0067A1]`}
                    >
                      {specList.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  (selectedTemplateSpec || effectiveDoctorSpec) && <p className="text-[11px] text-[#0067A1] font-semibold">{selectedTemplateSpec || effectiveDoctorSpec}</p>
                )}

                {effectiveDoctorLicense && <p className="text-[10px] text-slate-500 font-normal">Reg: {effectiveDoctorLicense}</p>}
                {effectiveDoctorClinic && <p className="text-[10px] text-slate-500 font-normal">{effectiveDoctorClinic}</p>}
              </div>

              {meta?.patient_name && (
                <div>
                  <p className="text-[10px] font-medium text-[#0067A1] uppercase tracking-wider mb-0.5">Patient</p>
                  <p className="text-xs font-semibold text-slate-800">{meta.patient_name}</p>
                  {meta.patient_gender && <p className="text-[11px] text-slate-600 font-normal capitalize">{meta.patient_gender}</p>}
                  {patientAge && <p className="text-[11px] font-medium text-slate-700">Age: {patientAge}</p>}
                  {meta.patient_blood_group && <p className="text-[10px] text-slate-500 font-normal">Blood: {meta.patient_blood_group}</p>}
                  {meta.patient_address && <p className="text-[10px] text-slate-500 font-normal truncate">{meta.patient_address}</p>}
                </div>
              )}
            </div>

            {/* ── Journey & Episode Tracking Strip ── */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">Episode ID:</span>
                <span className="font-mono font-medium text-[#0067A1] bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                  {episodeCode}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                <span className="font-normal text-slate-500">Prescription:</span>
                <span className="font-medium text-slate-800">
                  {isPrescriptionSigned ? "Finalized (Signed)" : isEditingExisting ? (existingPid ? `Rx #${existingPid}` : "Saved Draft") : "New Rx (Draft)"}
                </span>
                {!isPrescriptionSigned && (
                  <button
                    type="button"
                    onClick={() => setTemplateStep("select")}
                    className="ml-2 text-[#0067A1] hover:text-[#005282] font-semibold underline text-[11px] cursor-pointer"
                  >
                    Change Template
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* ── Existing Prescription Notice ── */}
          {isPrescriptionSigned ? (
            <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-emerald-900">
                  Prescription Signed & Completed
                </p>
                <p className="text-emerald-800 text-[11px] leading-relaxed mt-0.5 font-normal">
                  This prescription has been digitally signed by the doctor and legally recorded for the patient. In accordance with medical documentation compliance, signed clinical records cannot be edited or re-signed.
                </p>
              </div>
            </div>
          ) : isEditingExisting ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <svg className="w-4 h-4 shrink-0 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-xs font-medium text-amber-900">
                You&apos;ve already written a draft prescription for this appointment. You can review and update it below.
              </p>
            </div>
          ) : null}

          {/* Dynamic rendering of sections */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className={`${sectionTitle} mb-0`}>
                <span className="w-5 h-5 rounded bg-[#0067A1]/10 flex items-center justify-center text-[11px] font-medium text-[#0067A1]">
                  <Activity className="w-3.5 h-3.5 text-[#0067A1]" />
                </span>
                Presenting Complaints
              </div>
              {!isPrescriptionSigned && (
                <button
                  type="button"
                  onClick={addComplaint}
                  className="inline-flex items-center gap-1 text-xs text-[#0067A1] hover:text-[#004F7C] font-medium bg-[#0067A1]/5 hover:bg-[#0067A1]/10 px-2.5 py-1.5 rounded-md transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5" /> Add Row
                </button>
              )}
            </div>
            <div className="space-y-3">
              {presentingComplaints.map((comp, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs font-medium text-slate-500 shrink-0 w-5">#{idx + 1}</span>
                  <Autocomplete
                    disabled={isPrescriptionSigned}
                    value={comp.complaint}
                    onChange={(val) => updateComplaint(idx, "complaint", val)}
                    onSelect={(opt) => updateComplaint(idx, "complaint", opt.name)}
                    options={complaintSuggestions.map(s => ({ name: s }))}
                    placeholder="Symptom / Complaint *"
                    className={`${inputClass} flex-1 font-normal`}
                  />
                  <input
                    type="text"
                    disabled={isPrescriptionSigned}
                    placeholder="Details (e.g. since 3 days, mild/severe)"
                    value={comp.details}
                    onChange={(e) => updateComplaint(idx, "details", e.target.value)}
                    className={`${inputClass} flex-1 font-normal`}
                  />
                  {!isPrescriptionSigned && presentingComplaints.length > 1 && (
                    <button
                      onClick={() => removeComplaint(idx)}
                      className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {getActiveStructure().map((sec, secIdx) => {
            const normSec = normalizeSectionName(sec.section);
            const displayIndex = secIdx + 1;

            if (normSec.includes("presenting complaints") || normSec.includes("complaints") || normSec === "presenting complaints") {
              return null; // Handled dynamically above
            }

            if (normSec.includes("symptoms")) {
              return (
                <section key={secIdx}>
                  <div className={sectionTitle}>
                    <span className="w-5 h-5 rounded bg-[#0067A1]/10 flex items-center justify-center text-[11px] font-medium text-[#0067A1]">{displayIndex}</span>
                    {sec.section || "Symptoms"}
                  </div>
                  <Autocomplete
                    disabled={isPrescriptionSigned}
                    value={symptoms}
                    onChange={(val) => {
                      setSymptoms(val);
                      if (val.trim().length > 2) {
                        fetch(`/api/clinical/complaint-mapping?query=${encodeURIComponent(val)}`)
                          .then(res => res.json())
                          .then(json => {
                            if (json.success && json.data) {
                              const mapped = json.data.map(d => ({
                                id: d.canonical_complaint,
                                name: d.canonical_complaint,
                                description: d.diagnoses.map(dx => dx.diagnosis_name).join(", ")
                              }));
                              setSymptomMaster(mapped);
                            }
                          })
                          .catch(console.error);
                      } else {
                        setSymptomMaster([]);
                      }
                    }}
                    onSelect={(opt) => {
                      setSymptoms(opt.name);
                    }}
                    options={symptomMaster}
                    placeholder="Search symptoms (e.g. fever, headache)"
                    className={`${inputClass} font-normal text-slate-800`}
                  />
                </section>
              );
            }

            if (normSec.includes("conditions")) {
              return (
                <section key={secIdx}>
                  <div className={sectionTitle}>
                    <span className="w-5 h-5 rounded bg-[#0067A1]/10 flex items-center justify-center text-[11px] font-medium text-[#0067A1]">{displayIndex}</span>
                    {sec.section || "Conditions"}
                  </div>
                  <Autocomplete
                    disabled={isPrescriptionSigned}
                    value={conditions}
                    onChange={(val) => {
                      setConditions(val);
                      if (val.trim().length > 2) {
                        fetch(`/api/clinical/search?type=diagnosis&query=${encodeURIComponent(val)}`)
                          .then(res => res.json())
                          .then(json => {
                            if (json.success && json.data) {
                              const mapped = json.data.map(d => ({
                                id: d.diagnosis_id,
                                name: d.diagnosis_name,
                                description: ''
                              }));
                              setConditionMaster(mapped);
                            }
                          })
                          .catch(console.error);
                      } else {
                        setConditionMaster([]);
                      }
                    }}
                    onSelect={(opt) => {
                      setConditions(opt.name);
                    }}
                    options={conditionMaster}
                    placeholder="Search clinical conditions"
                    className={`${inputClass} font-normal text-slate-800`}
                  />
                </section>
              );
            }

            if (normSec.includes("diagnosis")) {
              return (
                <section key={secIdx}>
                  <div className={sectionTitle}>
                    <span className="w-5 h-5 rounded bg-[#0067A1]/10 flex items-center justify-center text-[11px] font-medium text-[#0067A1]">{displayIndex}</span>
                    {sec.section || "Diagnosis"} *
                  </div>
                  <Autocomplete
                    disabled={isPrescriptionSigned}
                    value={diagnosis}
                    onChange={(val) => setDiagnosis(val)}
                    onSelect={(opt) => {
                      setDiagnosis(opt.name);
                      if (opt.description) {
                        setDiagnosisNotes(opt.description);
                      }
                    }}
                    options={diagnosisMaster}
                    placeholder="Primary diagnosis (e.g. Essential Hypertension, Type 2 Diabetes)"
                    className={`${inputClass} font-normal text-slate-800`}
                    renderOption={(opt) => (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800 dark:text-white">{opt.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {opt.icd_code && <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">{opt.icd_code}</span>}
                          {opt.description && <span className="text-xs text-slate-500 font-normal line-clamp-1">{opt.description}</span>}
                        </div>
                      </div>
                    )}
                  />
                  <textarea
                    disabled={isPrescriptionSigned}
                    placeholder="Clinical notes / history (optional)"
                    value={diagnosisNotes}
                    onChange={(e) => setDiagnosisNotes(e.target.value)}
                    rows={2}
                    className={`${inputClass} mt-2 resize-none font-normal`}
                  />
                </section>
              );
            }

            if (normSec.includes("vitals") || normSec === "vital") {
              const parseBP = () => {
                const parts = (vitalSigns.blood_pressure || "").split("/");
                const sys = parseInt(parts[0], 10);
                const dia = parseInt(parts[1], 10);
                return {
                  sys: isNaN(sys) ? 120 : sys,
                  dia: isNaN(dia) ? 80 : dia,
                  hasVal: Boolean(vitalSigns.blood_pressure),
                };
              };

              const bpValues = parseBP();

              const getBPStatus = () => {
                if (!bpValues.hasVal) return null;
                const { sys, dia } = bpValues;
                if (sys < 90 || dia < 60) return { text: "Low", color: "blue" };
                if (sys < 120 && dia < 80) return { text: "Normal", color: "emerald" };
                if (sys <= 129 && dia < 80) return { text: "Elevated", color: "amber" };
                if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return { text: "Stg 1 HTN", color: "orange" };
                if (sys >= 140 || dia >= 90) return { text: "Stg 2 HTN", color: "red" };
                return null;
              };

              const getPulseStatus = () => {
                const p = parseInt(vitalSigns.pulse, 10);
                if (isNaN(p) || !vitalSigns.pulse) return null;
                if (p < 60) return { text: "Low (<60)", color: "amber" };
                if (p <= 100) return { text: "Normal", color: "emerald" };
                return { text: "High (>100)", color: "red" };
              };

              const getTempStatus = () => {
                const t = parseFloat(vitalSigns.temperature);
                if (isNaN(t) || !vitalSigns.temperature) return null;
                if (t < 97.0) return { text: "Low", color: "blue" };
                if (t <= 99.1) return { text: "Normal", color: "emerald" };
                if (t <= 100.4) return { text: "Mild Fever", color: "amber" };
                return { text: "High Fever", color: "red" };
              };

              const getSpo2Status = () => {
                const s = parseInt(vitalSigns.spo2, 10);
                if (isNaN(s) || !vitalSigns.spo2) return null;
                if (s >= 95) return { text: "Normal", color: "emerald" };
                if (s >= 90) return { text: "Mild Low", color: "amber" };
                return { text: "Critical", color: "red" };
              };

              const getRRStatus = () => {
                const r = parseInt(vitalSigns.respiratory_rate, 10);
                if (isNaN(r) || !vitalSigns.respiratory_rate) return null;
                if (r < 12) return { text: "Low", color: "amber" };
                if (r <= 20) return { text: "Normal", color: "emerald" };
                return { text: "High", color: "red" };
              };

              const calcPct = (val, min, max, def) => {
                const n = parseFloat(val !== "" && val !== undefined ? val : def);
                if (isNaN(n)) return 50;
                return Math.max(0, Math.min(100, ((n - min) / (max - min)) * 100));
              };

              const renderStatusPill = (status) => {
                if (!status) return null;
                const colors = {
                  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  amber: "bg-amber-50 text-amber-700 border-amber-200",
                  orange: "bg-orange-50 text-orange-700 border-orange-200",
                  red: "bg-red-50 text-red-700 border-red-200",
                  blue: "bg-blue-50 text-blue-700 border-blue-200",
                };
                return (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded border shrink-0 whitespace-nowrap leading-none ${colors[status.color] || colors.emerald}`}>
                    {status.text}
                  </span>
                );
              };

              const handleSetAllNormal = () => {
                setVitalSigns({
                  blood_pressure: "120/80",
                  pulse: "72",
                  temperature: "98.6",
                  weight: "70",
                  spo2: "98",
                  respiratory_rate: "16",
                });
              };

              const handleClearVitals = () => {
                setVitalSigns({ ...EMPTY_VITALS });
              };

              const pulseVal = vitalSigns.pulse !== "" && vitalSigns.pulse !== undefined ? vitalSigns.pulse : "72";
              const tempVal = vitalSigns.temperature !== "" && vitalSigns.temperature !== undefined ? vitalSigns.temperature : "98.6";
              const spo2Val = vitalSigns.spo2 !== "" && vitalSigns.spo2 !== undefined ? vitalSigns.spo2 : "98";
              const rrVal = vitalSigns.respiratory_rate !== "" && vitalSigns.respiratory_rate !== undefined ? vitalSigns.respiratory_rate : "16";
              const weightVal = vitalSigns.weight !== "" && vitalSigns.weight !== undefined ? vitalSigns.weight : "70";

              return (
                <section key={secIdx} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-[#0067A1]/10 flex items-center justify-center text-[11px] font-medium text-[#0067A1]">
                        {displayIndex}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">{sec.section || "Vitals"}</h4>
                    </div>
                    {!isPrescriptionSigned && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSetAllNormal}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          title="Click to set standard healthy normal vitals"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Set Normal
                        </button>
                        <button
                          type="button"
                          onClick={handleClearVitals}
                          className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Clear vitals"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`grid grid-cols-1 ${isSidebarPanel ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"} gap-3`}>
                    {/* 1. Blood Pressure Card */}
                    <div className="bg-white border border-slate-200/90 rounded-xl p-3 hover:border-[#0067A1]/50 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <Activity className="w-4 h-4 text-[#0067A1] shrink-0" />
                          <span className="text-xs font-semibold text-slate-800">BP</span>
                          {renderStatusPill(getBPStatus())}
                        </div>
                        <div className="shrink-0 flex items-center gap-0.5 text-xs font-semibold text-[#0067A1] bg-[#0067A1]/8 border border-[#0067A1]/20 px-2 py-0.5 rounded-md">
                          <span>{bpValues.sys}</span>
                          <span className="text-slate-400">/</span>
                          <span>{bpValues.dia}</span>
                          <span className="text-[10px] text-slate-500 font-normal ml-0.5">mmHg</span>
                        </div>
                      </div>

                      <div className="space-y-2 py-0.5">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 font-medium mb-1">
                            <span>Upper (Systolic)</span>
                            <span className="font-semibold text-[#0067A1]">{bpValues.sys}</span>
                          </div>
                          <input
                            type="range"
                            disabled={isPrescriptionSigned}
                            min={70}
                            max={200}
                            step={1}
                            value={bpValues.sys}
                            onChange={(e) => updateVital("blood_pressure", `${e.target.value}/${bpValues.dia}`)}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0067A1] block disabled:cursor-not-allowed disabled:opacity-60"
                            style={{
                              background: `linear-gradient(to right, #0067A1 0%, #0067A1 ${calcPct(bpValues.sys, 70, 200, 120)}%, #E2E8F0 ${calcPct(bpValues.sys, 70, 200, 120)}%, #E2E8F0 100%)`
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 font-medium mb-1">
                            <span>Lower (Diastolic)</span>
                            <span className="font-semibold text-[#0067A1]">{bpValues.dia}</span>
                          </div>
                          <input
                            type="range"
                            disabled={isPrescriptionSigned}
                            min={40}
                            max={130}
                            step={1}
                            value={bpValues.dia}
                            onChange={(e) => updateVital("blood_pressure", `${bpValues.sys}/${e.target.value}`)}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0067A1] block disabled:cursor-not-allowed disabled:opacity-60"
                            style={{
                              background: `linear-gradient(to right, #0067A1 0%, #0067A1 ${calcPct(bpValues.dia, 40, 130, 80)}%, #E2E8F0 ${calcPct(bpValues.dia, 40, 130, 80)}%, #E2E8F0 100%)`
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] pt-1.5 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Norm: 90–120 / 60–80</span>
                        {!isPrescriptionSigned && (
                          <div className="flex items-center gap-1.5">
                            {["120/80", "130/85"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => updateVital("blood_pressure", c)}
                                className="px-1.5 py-0.5 font-medium rounded bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Pulse / Heart Rate Card */}
                    <div className="bg-white border border-slate-200/90 rounded-xl p-3 hover:border-[#0067A1]/50 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <Heart className="w-4 h-4 text-rose-500 fill-rose-50 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800">Pulse</span>
                          {renderStatusPill(getPulseStatus())}
                        </div>
                        <div className="shrink-0 flex items-center gap-0.5 text-xs font-semibold text-[#0067A1] bg-[#0067A1]/8 border border-[#0067A1]/20 px-2 py-0.5 rounded-md">
                          <span>{pulseVal}</span>
                          <span className="text-[10px] text-slate-500 font-normal ml-0.5">bpm</span>
                        </div>
                      </div>

                      <div className="my-auto py-1 space-y-1.5">
                        <input
                          type="range"
                          disabled={isPrescriptionSigned}
                          min={40}
                          max={180}
                          step={1}
                          value={pulseVal}
                          onChange={(e) => updateVital("pulse", e.target.value)}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0067A1] block disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            background: `linear-gradient(to right, #0067A1 0%, #0067A1 ${calcPct(pulseVal, 40, 180, 72)}%, #E2E8F0 ${calcPct(pulseVal, 40, 180, 72)}%, #E2E8F0 100%)`
                          }}
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>40</span>
                          <span className="text-slate-600 font-medium">Norm: 60–100</span>
                          <span>180</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] pt-1.5 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Resting: 72</span>
                        {!isPrescriptionSigned && (
                          <div className="flex items-center gap-1.5">
                            {["68", "72", "80"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => updateVital("pulse", c)}
                                className="px-1.5 py-0.5 font-medium rounded bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Temperature Card */}
                    <div className="bg-white border border-slate-200/90 rounded-xl p-3 hover:border-[#0067A1]/50 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <Thermometer className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800">Body Temp</span>
                          {renderStatusPill(getTempStatus())}
                        </div>
                        <div className="shrink-0 flex items-center gap-0.5 text-xs font-semibold text-[#0067A1] bg-[#0067A1]/8 border border-[#0067A1]/20 px-2 py-0.5 rounded-md">
                          <span>{tempVal}</span>
                          <span className="text-[10px] text-slate-500 font-normal ml-0.5">°F</span>
                        </div>
                      </div>

                      <div className="my-auto py-1 space-y-1.5">
                        <input
                          type="range"
                          disabled={isPrescriptionSigned}
                          min={95.0}
                          max={105.0}
                          step={0.1}
                          value={tempVal}
                          onChange={(e) => updateVital("temperature", e.target.value)}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0067A1] block disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            background: `linear-gradient(to right, #0067A1 0%, #0067A1 ${calcPct(tempVal, 95.0, 105.0, 98.6)}%, #E2E8F0 ${calcPct(tempVal, 95.0, 105.0, 98.6)}%, #E2E8F0 100%)`
                          }}
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>95°</span>
                          <span className="text-slate-600 font-medium">Norm: 97.8–99.1°</span>
                          <span>105°</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] pt-1.5 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Baseline: 98.6°</span>
                        {!isPrescriptionSigned && (
                          <div className="flex items-center gap-1.5">
                            {["98.4", "98.6", "100.4"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => updateVital("temperature", c)}
                                className="px-1.5 py-0.5 font-medium rounded bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
                              >
                                {c}°
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. Oxygen Saturation (SpO2) Card */}
                    <div className="bg-white border border-slate-200/90 rounded-xl p-3 hover:border-[#0067A1]/50 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <Droplets className="w-4 h-4 text-sky-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800">SpO₂</span>
                          {renderStatusPill(getSpo2Status())}
                        </div>
                        <div className="shrink-0 flex items-center gap-0.5 text-xs font-semibold text-[#0067A1] bg-[#0067A1]/8 border border-[#0067A1]/20 px-2 py-0.5 rounded-md">
                          <span>{spo2Val}</span>
                          <span className="text-[10px] text-slate-500 font-normal ml-0.5">%</span>
                        </div>
                      </div>

                      <div className="my-auto py-1 space-y-1.5">
                        <input
                          type="range"
                          disabled={isPrescriptionSigned}
                          min={70}
                          max={100}
                          step={1}
                          value={spo2Val}
                          onChange={(e) => updateVital("spo2", e.target.value)}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0067A1] block disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            background: `linear-gradient(to right, #0067A1 0%, #0067A1 ${calcPct(spo2Val, 70, 100, 98)}%, #E2E8F0 ${calcPct(spo2Val, 70, 100, 98)}%, #E2E8F0 100%)`
                          }}
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>70%</span>
                          <span className="text-slate-600 font-medium">Norm: 95–100%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] pt-1.5 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Target: ≥95%</span>
                        {!isPrescriptionSigned && (
                          <div className="flex items-center gap-1.5">
                            {["98", "96", "94"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => updateVital("spo2", c)}
                                className="px-1.5 py-0.5 font-medium rounded bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
                              >
                                {c}%
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 5. Respiratory Rate Card */}
                    <div className="bg-white border border-slate-200/90 rounded-xl p-3 hover:border-[#0067A1]/50 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <Wind className="w-4 h-4 text-teal-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800">Resp Rate</span>
                          {renderStatusPill(getRRStatus())}
                        </div>
                        <div className="shrink-0 flex items-center gap-0.5 text-xs font-semibold text-[#0067A1] bg-[#0067A1]/8 border border-[#0067A1]/20 px-2 py-0.5 rounded-md">
                          <span>{rrVal}</span>
                          <span className="text-[10px] text-slate-500 font-normal ml-0.5">/min</span>
                        </div>
                      </div>

                      <div className="my-auto py-1 space-y-1.5">
                        <input
                          type="range"
                          disabled={isPrescriptionSigned}
                          min={8}
                          max={40}
                          step={1}
                          value={rrVal}
                          onChange={(e) => updateVital("respiratory_rate", e.target.value)}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0067A1] block disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            background: `linear-gradient(to right, #0067A1 0%, #0067A1 ${calcPct(rrVal, 8, 40, 16)}%, #E2E8F0 ${calcPct(rrVal, 8, 40, 16)}%, #E2E8F0 100%)`
                          }}
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>8</span>
                          <span className="text-slate-600 font-medium">Norm: 12–20</span>
                          <span>40</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] pt-1.5 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Resting: 16</span>
                        {!isPrescriptionSigned && (
                          <div className="flex items-center gap-1.5">
                            {["14", "16", "20"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => updateVital("respiratory_rate", c)}
                                className="px-1.5 py-0.5 font-medium rounded bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 6. Body Weight Card */}
                    <div className="bg-white border border-slate-200/90 rounded-xl p-3 hover:border-[#0067A1]/50 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <Scale className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800">Weight</span>
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-full">Std</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-0.5 text-xs font-semibold text-[#0067A1] bg-[#0067A1]/8 border border-[#0067A1]/20 px-2 py-0.5 rounded-md">
                          <span>{weightVal}</span>
                          <span className="text-[10px] text-slate-500 font-normal ml-0.5">kg</span>
                        </div>
                      </div>

                      <div className="my-auto py-1 space-y-1.5">
                        <input
                          type="range"
                          disabled={isPrescriptionSigned}
                          min={20}
                          max={180}
                          step={0.5}
                          value={weightVal}
                          onChange={(e) => updateVital("weight", e.target.value)}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0067A1] block disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            background: `linear-gradient(to right, #0067A1 0%, #0067A1 ${calcPct(weightVal, 20, 180, 70)}%, #E2E8F0 ${calcPct(weightVal, 20, 180, 70)}%, #E2E8F0 100%)`
                          }}
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>20 kg</span>
                          <span className="text-slate-600 font-medium">Baseline: 70 kg</span>
                          <span>180 kg</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] pt-1.5 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Adult</span>
                        {!isPrescriptionSigned && (
                          <div className="flex items-center gap-1.5">
                            {["60", "70", "80"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => updateVital("weight", c)}
                                className="px-1.5 py-0.5 font-medium rounded bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
                              >
                                {c} kg
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            }

            if (normSec.includes("treatment") || normSec === "rx" || normSec === "medicines") {
              return (
                <section key={secIdx}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`${sectionTitle} mb-0`}>
                      <span className="w-5 h-5 rounded bg-[#0067A1]/10 flex items-center justify-center text-[11px] font-medium text-[#0067A1]">{displayIndex}</span>
                      {sec.section || "Medicines"} *
                    </div>
                    {!isPrescriptionSigned && (
                      <button
                        type="button"
                        onClick={addMedicine}
                        className="inline-flex items-center gap-1 text-xs text-[#0067A1] hover:text-[#004F7C] font-medium bg-[#0067A1]/5 hover:bg-[#0067A1]/10 px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        <PlusIcon className="w-3.5 h-3.5" /> Add Medicine
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {medicines.map((med, idx) => {
                      const detectedForm = med.form || detectMedicineForm(med.name);
                      
                      // Form-specific quick options
                      const dosagePresets =
                        detectedForm === "gel"
                          ? ["Apply thin layer", "Pea-sized amount", "Small fingertip unit"]
                          : detectedForm === "syrup"
                          ? ["5 ml (1 tsp)", "10 ml (2 tsp)", "2.5 ml", "15 ml"]
                          : detectedForm === "drops"
                          ? ["1-2 drops", "2-3 drops", "1 drop"]
                          : detectedForm === "inhaler"
                          ? ["1 puff", "2 puffs"]
                          : ["1 tablet", "1/2 tablet", "2 tablets"];

                      const timingPresets =
                        detectedForm === "gel"
                          ? ["Apply on affected area", "External use only", "Gently massage", "At bedtime", "Wash hands after use", "Avoid eyes/mouth"]
                          : detectedForm === "syrup"
                          ? ["After food", "Before food", "With measuring cup", "Shake well before use", "With warm water", "At bedtime"]
                          : detectedForm === "drops"
                          ? ["In affected eye/ear", "Wash hands before use", "At bedtime", "Every 4-6 hours"]
                          : detectedForm === "inhaler"
                          ? ["Rinse mouth with water after use", "Morning & Night", "During wheezing / SOS"]
                          : ["After food", "Before food", "With food", "Empty stomach", "At bedtime"];

                      return (
                        <div key={idx} className="p-3.5 sm:p-4 rounded-lg bg-white border border-slate-200/90 shadow-xs space-y-3">
                          {/* Medicine Name Autocomplete */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 shrink-0 w-5">#{idx + 1}</span>
                            <div className="flex-1 relative">
                              <Autocomplete
                                disabled={isPrescriptionSigned}
                                value={med.name}
                                onChange={(val) => updateMedicine(idx, "name", val)}
                                onSelect={(opt) => selectMedicine(idx, opt)}
                                options={drugMaster}
                                preferredCategory={detectedForm}
                                searchEndpoint="/api/admin/medicines"
                                emptyActionLabel={`Use "${med.name}" as prescribed medicine`}
                                placeholder="Search medicine (e.g. Paracetamol, Volini Gel, Ascoril Syrup)..."
                                className={`${inputClass} w-full font-medium text-slate-800`}
                                renderOption={(opt) => (
                                   <div className="flex flex-col py-0.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{opt.name}</span>
                                      {opt.category && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase shrink-0 ${
                                          opt.category.toLowerCase() === "syrup" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                          opt.category.toLowerCase() === "gel" || opt.category.toLowerCase() === "ointment" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                                          opt.category.toLowerCase() === "drops" ? "bg-cyan-50 text-cyan-700 border border-cyan-200" :
                                          opt.category.toLowerCase() === "inhaler" ? "bg-teal-50 text-teal-700 border border-teal-200" :
                                          "bg-blue-50 text-[#0067A1] border border-blue-200"
                                        }`}>
                                          {opt.category}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                      {opt.salt && <span className="text-xs text-slate-500 truncate max-w-[240px]">{opt.salt}</span>}
                                      {opt.power && <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 rounded">{opt.power}</span>}
                                    </div>
                                  </div>
                                )}
                              />
                            </div>
                            {!isPrescriptionSigned && medicines.length > 1 && (
                              <button
                                onClick={() => removeMedicine(idx)}
                                className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                title="Remove medicine"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Form Switcher Buttons */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-600 mr-1">Form:</span>
                            {[
                              { id: "tablet", label: "Tablet / Cap" },
                              { id: "syrup", label: "Syrup / Susp" },
                              { id: "gel", label: "Gel / Cream / Ointment" },
                              { id: "drops", label: "Drops / Spray" },
                              { id: "inhaler", label: "Inhaler" },
                            ].map((f) => {
                              const isActive = detectedForm === f.id;
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  disabled={isPrescriptionSigned}
                                  onClick={() => setMedicineForm(idx, f.id)}
                                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                                    isActive
                                      ? "bg-[#0067A1] text-white border-[#0067A1] shadow-xs"
                                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                  } ${isPrescriptionSigned ? "cursor-not-allowed opacity-80" : ""}`}
                                >
                                  {f.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Dosage, Frequency, Duration, Quantity */}
                          <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5">
                            <div className="col-span-2 sm:col-span-4">
                              <label className="text-xs font-medium text-slate-700 block mb-1">
                                Dosage {detectedForm !== "tablet" ? `(${detectedForm})` : ""}
                              </label>
                              <input
                                type="text"
                                disabled={isPrescriptionSigned}
                                placeholder={
                                  detectedForm === "syrup" ? "e.g. 5ml, 10ml" :
                                  detectedForm === "gel" ? "e.g. Apply thin layer" :
                                  detectedForm === "drops" ? "e.g. 1-2 drops" :
                                  detectedForm === "inhaler" ? "e.g. 1-2 puffs" :
                                  "e.g. 500mg, 1 tab"
                                }
                                value={med.dosage}
                                onChange={(e) => updateMedicine(idx, "dosage", e.target.value)}
                                className={inputClass}
                              />
                            </div>
                            <div className="col-span-1 sm:col-span-3">
                              <label className="text-xs font-medium text-slate-700 block mb-1">Frequency</label>
                              <input
                                type="text"
                                disabled={isPrescriptionSigned}
                                placeholder="e.g. 1-0-1"
                                value={med.frequency}
                                onChange={(e) => updateMedicine(idx, "frequency", e.target.value)}
                                className={inputClass}
                              />
                            </div>
                            <div className="col-span-1 sm:col-span-3">
                              <label className="text-xs font-medium text-slate-700 block mb-1">Duration</label>
                              <input
                                type="text"
                                disabled={isPrescriptionSigned}
                                placeholder="e.g. 5 days, 1 week"
                                value={med.duration}
                                onChange={(e) => updateMedicine(idx, "duration", e.target.value)}
                                className={inputClass}
                              />
                            </div>
                            <div className="col-span-2 sm:col-span-2">
                              <label className="text-xs font-medium text-slate-700 block mb-1">Quantity</label>
                              <input
                                type="text"
                                disabled={isPrescriptionSigned}
                                placeholder={detectedForm === "gel" ? "1 tube" : detectedForm === "syrup" ? "1 bottle" : "Total"}
                                value={med.quantity || ""}
                                onChange={(e) => updateMedicine(idx, "quantity", e.target.value)}
                                className={inputClass}
                              />
                            </div>
                          </div>

                          {/* Quick Dosage and Quick Frequency suggestions */}
                          {!isPrescriptionSigned && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                              {/* Quick Frequency */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-medium text-slate-600 mr-0.5">Quick Freq:</span>
                                {[
                                  { label: "1-0-1", tip: "Twice daily (Morning & Night)" },
                                  { label: "1-0-0", tip: "Once daily (Morning only)" },
                                  { label: "0-0-1", tip: "Once daily (Bedtime/Night)" },
                                  { label: "1-1-1", tip: "Thrice daily (Morning, Noon & Night)" },
                                  { label: "0-1-0", tip: "Once daily (Afternoon)" },
                                  { label: "SOS", tip: "As needed / In pain" },
                                ].map((freq) => {
                                  const isSelected = (med.frequency || "").trim() === freq.label;
                                  return (
                                    <button
                                      key={freq.label}
                                      type="button"
                                      title={freq.tip}
                                      onClick={() => updateMedicine(idx, "frequency", freq.label)}
                                      className={`px-2 py-0.5 text-xs font-medium rounded border transition-colors ${
                                        isSelected
                                          ? "bg-[#0067A1] text-white border-[#0067A1] shadow-xs"
                                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                      }`}
                                    >
                                      {freq.label}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Quick Dose */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-medium text-slate-600 mr-0.5">Quick Dose:</span>
                                {dosagePresets.map((d) => (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => updateMedicine(idx, "dosage", d)}
                                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                                      (med.dosage || "").trim() === d
                                        ? "bg-[#0067A1]/10 text-[#0067A1] border-[#0067A1]/30 font-medium"
                                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-normal"
                                    }`}
                                  >
                                    {d}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Instructions & Timing Chips adapted to Form */}
                          <div className="space-y-1.5 pt-1 border-t border-slate-100">
                            {!isPrescriptionSigned && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-medium text-slate-600 mr-0.5">
                                  {detectedForm === "gel" ? "Application Tips:" : "Instructions / Timing:"}
                                </span>
                                {timingPresets.map((timing) => (
                                  <button
                                    key={timing}
                                    type="button"
                                    onClick={() => {
                                      const current = (med.instructions || "").trim();
                                      if (!current) {
                                        updateMedicine(idx, "instructions", timing);
                                      } else if (!current.toLowerCase().includes(timing.toLowerCase())) {
                                        updateMedicine(idx, "instructions", `${current}, ${timing}`);
                                      }
                                    }}
                                    className="px-2 py-0.5 text-xs font-normal rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                                  >
                                    + {timing}
                                  </button>
                                ))}
                              </div>
                            )}
                            <input
                              type="text"
                              disabled={isPrescriptionSigned}
                              placeholder={
                                detectedForm === "gel"
                                  ? "e.g. Apply gently on affected area twice daily. For external use only."
                                  : detectedForm === "syrup"
                                  ? "e.g. Take with measuring cup after meals. Shake well before use."
                                  : "e.g. Take 1 tablet after meals with water at bedtime"
                              }
                              value={med.instructions}
                              onChange={(e) => updateMedicine(idx, "instructions", e.target.value)}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            }

            if (normSec.includes("investigation") || normSec.includes("lab")) {
              return (
                <section key={secIdx}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`${sectionTitle} mb-0`}>
                      <span className="w-5 h-5 rounded bg-[#0067A1]/10 flex items-center justify-center text-[11px] font-medium text-[#0067A1]">{displayIndex}</span>
                      {sec.section || "Lab Tests"}
                    </div>
                    {!isPrescriptionSigned && (
                      <button
                        type="button"
                        onClick={addLabTest}
                        className="inline-flex items-center gap-1 text-xs text-[#0067A1] hover:text-[#004F7C] font-medium bg-[#0067A1]/5 hover:bg-[#0067A1]/10 px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        <PlusIcon className="w-3.5 h-3.5" /> Add Test
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {labTests.map((test, idx) => (
                      <div key={idx} className="flex flex-col gap-2 p-2.5 rounded-lg border border-slate-200 relative group bg-white shadow-xs">
                        <div className="flex items-center gap-2">
                           <Autocomplete
                            disabled={isPrescriptionSigned}
                            value={typeof test === "string" ? test : (test?.test_name || "")}
                            onChange={(val) => updateLabTestName(idx, val)}
                            onSelect={(opt) => selectLabTest(idx, opt)}
                            options={labMaster}
                            placeholder="Search investigation or test (e.g. CBC, Ultrasound, X-Ray)..."
                            className={`${inputClass} w-full font-medium text-slate-800`}
                            renderOption={(opt) => (
                              <div className="flex flex-col py-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-slate-800 dark:text-white">
                                    {opt.test_name} {opt.test_code ? `(${opt.test_code})` : ""}
                                  </span>
                                </div>
                                {(opt.sample_type || opt.container || opt.remarks) && (
                                  <div className="text-xs text-slate-500 font-normal mt-0.5 truncate">
                                    {opt.sample_type && <span className="mr-2 font-medium text-slate-600">Sample: {opt.sample_type}</span>}
                                    {opt.container && <span className="mr-2">Container: {opt.container}</span>}
                                    {opt.remarks && <span className="italic">{opt.remarks}</span>}
                                  </div>
                                )}
                              </div>
                            )}
                          />
                          {!isPrescriptionSigned && labTests.length > 1 && (
                            <button
                              onClick={() => removeLabTest(idx)}
                              className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Remove test"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div>
                          <input
                            type="text"
                            disabled={isPrescriptionSigned}
                            placeholder="Specific Instructions for patient (e.g. 10 hours fasting, Full bladder)"
                            value={typeof test === "string" ? "" : (test?.instructions || "")}
                            onChange={(e) => updateLabTestInstruction(idx, e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            }

            if (normSec.includes("followup")) {
              const getPresetDate = (days) => {
                const d = new Date();
                d.setDate(d.getDate() + days);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                return `${yyyy}-${mm}-${dd}`;
              };

              const formattedFollowUpDate = followUpDate
                ? (() => {
                    try {
                      return new Date(followUpDate + "T00:00:00").toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                    } catch (e) {
                      return followUpDate;
                    }
                  })()
                : null;

              return (
                <section key={secIdx} className="space-y-3">
                  <div className={sectionTitle}>
                    <span className="w-5 h-5 rounded bg-[#0067A1]/10 flex items-center justify-center text-[11px] font-medium text-[#0067A1]">{displayIndex}</span>
                    {sec.section || "Follow-Up Consultation"}
                  </div>

                  <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 space-y-3">
                    {/* Timing Selector Header & Chips */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          Next Visit Timing:
                        </span>
                        {formattedFollowUpDate && (
                          <span className="text-[11px] font-medium text-[#0067A1] bg-[#0067A1]/10 border border-[#0067A1]/20 px-2 py-0.5 rounded">
                            {formattedFollowUpDate}
                          </span>
                        )}
                      </div>
                      {!isPrescriptionSigned && (
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: "Tomorrow", days: 1 },
                            { label: "3 Days", days: 3 },
                            { label: "5 Days", days: 5 },
                            { label: "1 Week", days: 7 },
                            { label: "2 Weeks", days: 14 },
                            { label: "1 Month", days: 30 },
                            { label: "SOS / As Needed", days: 0 },
                          ].map((preset) => {
                            const isMatch = preset.days === 0
                              ? (!followUpDate && (followUpNotes || "").includes("SOS"))
                              : followUpDate === getPresetDate(preset.days);
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => setQuickFollowUp(preset.days)}
                                className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                                  isMatch
                                    ? "bg-[#0067A1] text-white border-[#0067A1] font-medium shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 font-normal"
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Specific Date Row */}
                    <div className="pt-2.5 border-t border-slate-200/80">
                      <div className="max-w-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-slate-700">
                            Specific Date
                          </label>
                          {!isPrescriptionSigned && followUpDate && (
                            <button
                              type="button"
                              onClick={() => setFollowUpDate("")}
                              className="text-xs text-red-500 hover:text-red-700 font-normal hover:underline"
                            >
                              ✕ Clear
                            </button>
                          )}
                        </div>
                        <input
                          type="date"
                          disabled={isPrescriptionSigned}
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className={`${inputClass} font-normal`}
                        />
                      </div>
                    </div>

                    {/* Follow-up Notes / Warning Signs in New Row */}
                    <div className="pt-2.5 border-t border-slate-200/80">
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Follow-up Notes / Warning Signs
                      </label>
                      <textarea
                        rows={2}
                        disabled={isPrescriptionSigned}
                        placeholder="e.g. Review after 3 days. Seek immediate medical attention if you experience high fever, severe breathlessness, or persistent pain."
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        className={`${inputClass} font-normal resize-none py-2`}
                      />
                    </div>
                  </div>
                </section>
              );
            }

            if (normSec.includes("specialinstructions") || normSec.includes("instructions") || normSec.includes("advice")) {
              return (
                <section key={secIdx}>
                  <div className={sectionTitle}>
                    <span className="w-5 h-5 rounded bg-[#0067A1]/10 flex items-center justify-center text-[11px] font-medium text-[#0067A1]">{displayIndex}</span>
                    {sec.section || "Special Instructions / Advice"}
                  </div>
                  <textarea
                    disabled={isPrescriptionSigned}
                    placeholder="Dietary advice, lifestyle changes, precautions…"
                    value={specialMessage}
                    onChange={(e) => setSpecialMessage(e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </section>
              );
            }

            // Custom Section
            return (
              <section key={secIdx}>
                <div className={sectionTitle}>
                  <span className="w-5 h-5 rounded bg-[#0067A1]/10 flex items-center justify-center text-[11px] font-medium text-[#0067A1]">{displayIndex}</span>
                  {sec.section}
                </div>
                <div className="space-y-3">
                  {(sec.fields || []).map((field, fieldIdx) => {
                    const fieldKey = `${sec.section}__${field.name}`;
                    const isTextarea = field.type === "textarea";
                    return (
                      <div key={fieldIdx}>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {isTextarea ? (
                          <textarea
                            rows={2}
                            disabled={isPrescriptionSigned}
                            placeholder={field.placeholder || `Enter ${field.label || field.name}`}
                            value={customFields[fieldKey] || ""}
                            onChange={(e) => setCustomFields(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                            className={`${inputClass} resize-none`}
                          />
                        ) : (
                          <input
                            type="text"
                            disabled={isPrescriptionSigned}
                            placeholder={field.placeholder || `Enter ${field.label || field.name}`}
                            value={customFields[fieldKey] || ""}
                            onChange={(e) => setCustomFields(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                            className={inputClass}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          </div>
          )}
        </div>

        {/* ── Footer ── */}
        {templateStep === "write" && (
          <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-200 bg-white shrink-0 shadow-xs">
            <div>
              {templates.length > 0 && !isPrescriptionSigned && (
                <button
                  onClick={() => setTemplateStep("select")}
                  className="text-xs text-slate-600 hover:text-[#0067A1] font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Templates
                </button>
              )}
              {isPrescriptionSigned && (
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Finalized Clinical Record</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              {isPrescriptionSigned ? (
                <>
                  {onViewPrescription && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onViewPrescription();
                      }}
                      className="px-4 py-2 rounded-md text-sm font-medium border border-[#0067A1]/40 text-[#0067A1] bg-white hover:bg-[#0067A1]/5 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-[#0067A1]" />
                      <span>View PDF</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-md text-sm font-medium bg-[#0067A1] text-white hover:bg-[#005282] transition-colors shadow-xs cursor-pointer"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2 rounded-md text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmit("save")}
                    disabled={saving}
                    className="px-4 py-2 rounded-md text-sm font-medium border border-[#0067A1]/40 text-[#0067A1] bg-white hover:bg-[#0067A1]/5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Saving…" : "Save Draft"}
                  </button>
                  <button
                    onClick={() => handleSubmit("sign")}
                    disabled={saving}
                    className="px-5 py-2 rounded-md text-sm font-medium bg-[#0067A1] text-white hover:bg-[#005282] transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <><Spinner size="w-4 h-4" />Processing…</> : "Sign & Complete"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
    </>
  );
}
