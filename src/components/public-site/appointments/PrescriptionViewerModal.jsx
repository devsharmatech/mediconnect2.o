"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaTimes, FaArrowsAltH, FaLock, FaCheck } from "react-icons/fa";
import { Download, Loader2, Building2, FlaskConical, RotateCcw, ShoppingBag, CalendarCheck } from "lucide-react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { exportPrescriptionPdf, createPrescriptionJsPdf } from "@/lib/prescriptionPdfEngine";
import { MEDICONNECT_LOGO_BASE64, DOCTOR_CADUCEUS_BASE64 } from "@/lib/prescriptionAssets";
import SharePrescriptionModal from "./SharePrescriptionModal";

function SectionHeading({ title }) {
  return (
    <h4 className="text-xs font-bold text-[#0067A1] uppercase tracking-wider border-b border-[#0067A1]/30 pb-1">
      {title}
    </h4>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <span className="font-semibold text-gray-500">{label}:</span>{" "}
      <span className="text-gray-800">{value || "—"}</span>
    </div>
  );
}

function VitalChip({ label, value }) {
  return (
    <div className="bg-[#0067A1]/5 rounded-lg px-2 py-1.5 text-center">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className="text-xs font-semibold text-[#0067A1]">{value}</p>
    </div>
  );
}

const safeJsonParse = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const formatCustomFieldLabel = (rawField, secName = "") => {
  if (!rawField) return "";
  const rf = String(rawField).trim();
  const lower = rf.toLowerCase();
  if (lower === "lesion_type") return "Lesion Type";
  if (lower === "hairscalp" || lower === "hair_scalp") return "Hair / Scalp";
  if (lower === "site") return "Site";
  if (lower === "morphology") return "Morphology";
  if (lower === "distribution") return "Distribution";
  if (lower === "nails") return "Nails";
  if (lower === "findings") return "Findings";
  if (lower === "lmp") return "LMP";
  if (lower === "procedure" || lower === "procedures") return "Procedure";
  if (lower === "others") return "Others";
  if (lower === "info" || lower === "notes") return "Notes";
  if (lower === "bp") return "BP";
  if (lower === "pulse") return "Pulse";
  if (lower === "respiratory_rate") return "Respiratory Rate";
  if (lower === "spo" || lower === "spo2") return "SpO₂";
  if (lower === "temperature") return "Temperature";
  if (lower === "return_after") return "Return After";
  if (lower === "warning_signs") return "Warning Signs";
  if (lower === "red_flags") return "Red Flags";
  if (lower === "instructions") return "Instructions";
  if (lower === "itching_rash_redness_scaling_burning_pain") return "Itching / Rash / Redness / Scaling";
  if (lower === "hair_fall_white_patches_acne_boils_nail_changes") return "Hair fall / White patches / Acne";
  return rf.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatSpecialMessage = (text) => {
  if (!text) return null;
  const cleanText = String(text).replace(/\[\s*(PRESENTING COMPLAINTS|COMPLAINTS)\s*\][^\[]*/gi, '');
  return cleanText.split("\n").map((line, idx) => {
    if (!line.trim()) return null;
    const isHeader = line.trim().startsWith("[") && line.trim().endsWith("]");
    return isHeader ? (
      <div key={idx} className="font-bold text-gray-800 mt-2 mb-1 border-b border-gray-200 pb-1 text-xs uppercase tracking-wider">
        {line.trim().slice(1, -1).replace(/_/g, " ")}
      </div>
    ) : (
      <div key={idx} className="mb-0.5 text-sm">{line}</div>
    );
  });
};

export default function PrescriptionViewerModal({
  data: rawData,
  onClose,
  combinedLabs = [],
  onSendToLab,
  onSendToChemist,
  isDoctor = false,
  onOrdersUpdated,
  chemistOrder: propChemistOrder,
  chemistInfo: propChemistInfo,
  labOrder: propLabOrder,
  labInfo: propLabInfo,
  autoSaveDigiLocker = false,
}) {
  const data = rawData || {};
  const router = useRouter();
  const [chemistOrder, setChemistOrder] = useState(null);
  const [chemistInfo, setChemistInfo] = useState(null);
  const [labOrder, setLabOrder] = useState(null);
  const [labInfo, setLabInfo] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [shareTarget, setShareTarget] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingToDigiLocker, setIsSavingToDigiLocker] = useState(false);
  const [isSavedInDigiLocker, setIsSavedInDigiLocker] = useState(false);
  const [sigLoadFailed, setSigLoadFailed] = useState(false);

  useEffect(() => {
    let patientId = typeof window !== "undefined" ? (localStorage.getItem("userId") || localStorage.getItem("user_id")) : null;
    const rxId = data?.id;
    if (patientId && rxId) {
      fetch(`/api/patients/prescriptions/save-to-digilocker?patient_id=${patientId}&prescription_id=${rxId}`)
        .then((res) => res.json())
        .then((d) => {
          if (d?.data?.is_saved) setIsSavedInDigiLocker(true);
        })
        .catch(() => {});
    }
  }, [data?.id]);

  const fetchOrders = async () => {
    if (!data?.id) { setOrdersLoading(false); return; }
    const patientId = data?.patient_id || data?.patient_details?.id || (typeof window !== "undefined" && !isDoctor ? (localStorage.getItem("userId") || localStorage.getItem("user_id")) : null);
    if (!patientId) { setOrdersLoading(false); return; }

    const pickLatest = (orders) => {
      if (!Array.isArray(orders) || orders.length === 0) return null;
      const active = orders.filter(o => (o.status || "").toLowerCase() !== "cancelled");
      const list = active.length ? active : orders;
      return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    };

    setOrdersLoading(true);
    try {
      const [medRes, labRes] = await Promise.all([
        fetch("/api/patients/orders/medicine/by-prescription", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prescription_id: data.id, patient_id: patientId }),
        }),
        fetch("/api/patients/orders/lab/by-prescription", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prescription_id: data.id, patient_id: patientId }),
        }),
      ]);

      const medData = await medRes.json().catch(() => null);
      const labData = await labRes.json().catch(() => null);

      const latestMed = pickLatest(medData?.data || []);
      const latestLab = pickLatest(labData?.data || []);

      setChemistOrder(latestMed || null);
      setLabOrder(latestLab || null);

      if (latestMed?.chemist_id) {
        const chemistRes = await fetch(`/api/chemists/web/${latestMed.chemist_id}`);
        const chemistData = await chemistRes.json().catch(() => null);
        setChemistInfo(chemistData?.data || null);
      } else {
        setChemistInfo(null);
      }

      if (latestLab?.lab_id) {
        const labRes = await fetch(`/api/lab/web/${latestLab.lab_id}`);
        const labInfoData = await labRes.json().catch(() => null);
        setLabInfo(labInfoData?.data || null);
      } else {
        setLabInfo(null);
      }
    } catch {
      setChemistOrder(null);
      setLabOrder(null);
      setChemistInfo(null);
      setLabInfo(null);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [data?.id]);

  const doc = data.doctor_details || {};
  const appt = data.appointments || {};
  const pat = {
    ...(data.patient || {}),
    ...(appt.patient || {}),
    ...(appt.patient_details || {}),
    ...(data.patient_details || {}),
  };
  const medicines = Array.isArray(data.medicines) ? data.medicines : [];
  const td = safeJsonParse(data.template_data, {});

  const rawVitals = safeJsonParse(data.vital_signs || data.vitals, null);
  const vitals = (() => {
    let v = rawVitals && typeof rawVitals === "object" ? { ...rawVitals } : {};
    if (td && typeof td === "object") {
      Object.entries(td).forEach(([k, val]) => {
        if (!val || typeof val !== "string" || !val.trim()) return;
        const lower = k.toLowerCase();
        if (lower.startsWith("vitals__") || lower.startsWith("vitals (reported)__")) {
          const field = (k.split("__")[1] || "").toLowerCase();
          if (field === "bp" && !v.blood_pressure && !v.bp) v.blood_pressure = val.trim();
          else if (field === "pulse" && !v.pulse) v.pulse = val.trim();
          else if (field === "temperature" && !v.temperature) v.temperature = val.trim();
          else if ((field === "spo" || field === "spo2") && !v.spo2 && !v.spo) v.spo2 = val.trim();
          else if (field === "respiratory_rate" && !v.respiratory_rate && !v.rr) v.respiratory_rate = val.trim();
          else if (field === "weight" && !v.weight) v.weight = val.trim();
          else if (field === "height" && !v.height) v.height = val.trim();
        }
      });
    }
    return Object.keys(v).length > 0 ? v : null;
  })();

  const labTestsRaw = Array.isArray(data.lab_tests) ? data.lab_tests : [];
  const investigationsRaw = Array.isArray(data.investigations) ? data.investigations : [];

  const combinedLabsAndInvestigations = [
    ...((Array.isArray(combinedLabs) && combinedLabs.length > 0) ? combinedLabs : []),
    ...labTestsRaw.map(t => ({
      name: typeof t === "string" ? t : t.test_name || t.name || "",
      instructions: typeof t === "string" ? "" : t.instructions || "",
      urgency: typeof t === "string" ? "" : t.urgency || ""
    })),
    ...investigationsRaw.map(inv => ({
      name: typeof inv === "string" ? inv : inv?.name || "",
      instructions: typeof inv === "string" ? "" : inv?.instructions || "",
      urgency: typeof inv === "string" ? "" : inv?.urgency || ""
    }))
  ].filter(item => {
    const n = typeof item === "string" ? item : item?.name;
    return n && n.trim();
  });

  const uniqueLabs = [];
  const seenLabNames = new Set();
  for (const item of combinedLabsAndInvestigations) {
    const n = typeof item === "string" ? item.trim() : (item.name || "").trim();
    if (n && !seenLabNames.has(n.toLowerCase())) {
      seenLabNames.add(n.toLowerCase());
      uniqueLabs.push(typeof item === "string" ? { name: n } : item);
    }
  }

  // Include any extra investigations from template_data
  if (td && typeof td === "object") {
    const extraInv = td['INVESTIGATIONS__others'] || td['INVESTIGATIONS__info'] || td['INVESTIGATIONS.__others'] || td['INVESTIGATIONS.__info'];
    if (extraInv && typeof extraInv === "string" && extraInv.trim()) {
      const invNames = extraInv.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      invNames.forEach(invName => {
        if (invName && !seenLabNames.has(invName.toLowerCase())) {
          seenLabNames.add(invName.toLowerCase());
          uniqueLabs.push({ name: invName });
        }
      });
    }
  }
  
  const symptoms = (() => {
    let symp = {};
    if (td && typeof td === "object") {
      if (td._dynamic_complaints && Array.isArray(td._dynamic_complaints)) {
        td._dynamic_complaints.forEach((c) => {
          if (c && c.complaint && typeof c.complaint === "string" && c.complaint.trim()) {
            symp[c.complaint.trim()] = c.details ? c.details.trim() : "Yes";
          }
        });
      }
      Object.entries(td).forEach(([k, val]) => {
        if (!val || typeof val !== "string" || !val.trim()) return;
        const lower = k.toLowerCase();
        if (
          lower.startsWith("presenting complaints__") ||
          lower.startsWith("persenting complaints__") ||
          lower.startsWith("complaints__")
        ) {
          const field = k.split("__")[1] || "";
          const label = formatCustomFieldLabel(field, "Complaints");
          if (label && !symp[label]) {
            symp[label] = val.trim();
          }
        }
      });
    }

    if (data.symptoms) {
      if (typeof data.symptoms === "string" && data.symptoms.trim()) {
        if (!symp[data.symptoms.trim()]) symp[data.symptoms.trim()] = "Yes";
      } else if (Array.isArray(data.symptoms)) {
        data.symptoms.forEach((s) => {
          if (typeof s === "string" && s.trim() && !symp[s.trim()]) {
            symp[s.trim()] = "Yes";
          }
        });
      } else if (typeof data.symptoms === "object") {
        Object.entries(data.symptoms).forEach(([k, v]) => {
          if (v && !symp[k]) symp[k] = String(v);
        });
      }
    }
    return Object.keys(symp).length > 0 ? symp : null;
  })();

  const customTemplateSections = (() => {
    const sections = {};
    if (!td || typeof td !== "object") return sections;

    const isIgnoredSection = (normSec) => {
      return (
        normSec.startsWith("vital") ||
        normSec.includes("provisional diagnosis") ||
        normSec === "diagnosis" ||
        normSec.startsWith("treatment") ||
        normSec === "rx" ||
        normSec.startsWith("medicine") ||
        normSec.startsWith("investigation") ||
        normSec.startsWith("lab") ||
        normSec.startsWith("follow") ||
        normSec.includes("complaint") ||
        normSec === "symptoms" ||
        normSec === "conditions" ||
        normSec.includes("digital signature")
      );
    };

    Object.entries(td).forEach(([key, val]) => {
      if (val === null || val === undefined) return;
      if (typeof val !== "string" && typeof val !== "number") return;
      const strVal = String(val).trim();
      if (!strVal || strVal === "—") return;

      if (!key.includes("__")) return;
      const [rawSec, rawField] = key.split("__");
      if (!rawSec || !rawField) return;

      const trimmedSec = rawSec.trim().replace(/:+$/, "");
      const normSec = trimmedSec.toLowerCase();

      if (isIgnoredSection(normSec)) return;

      const label = formatCustomFieldLabel(rawField, trimmedSec);
      if (!sections[trimmedSec]) {
        sections[trimmedSec] = [];
      }
      sections[trimmedSec].push({
        key: rawField,
        label: label || rawField,
        value: strVal,
      });
    });

    return sections;
  })();

  const examFindingsNotes = (() => {
    const ef = data.examination_findings;
    if (!ef) return "";
    if (typeof ef === "string") {
      try {
        const parsed = JSON.parse(ef);
        return typeof parsed === "object" ? (parsed.notes || parsed.text || "") : ef;
      } catch {
        return ef;
      }
    }
    if (typeof ef === "object") {
      return ef.notes || ef.text || "";
    }
    return String(ef);
  })().trim();

  const formatVitalKey = (k) => {
    if (!k) return "";
    const kl = String(k).toLowerCase().trim();
    if (kl.includes("spo") || kl.includes("oxygen")) return "SpO₂";
    if (kl.includes("blood_pressure") || kl === "bp") return "Blood Pressure";
    if (kl.includes("pulse") || kl.includes("heart_rate")) return "Pulse";
    if (kl.includes("temp")) return "Temperature";
    if (kl.includes("weight")) return "Weight";
    if (kl.includes("height")) return "Height";
    if (kl.includes("respiratory") || kl === "rr") return "Respiratory Rate";
    if (kl.includes("sugar") || kl.includes("glucose")) return "Blood Sugar";
    return String(k).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatVital = (k, v) => {
    if (!v && v !== 0) return "—";
    let val = String(v).trim();
    if (!val) return "—";
    if (/[a-zA-Z%°]/.test(val)) return val;
    const key = String(k || "").toLowerCase().trim();
    if (key.includes('blood_pressure') || key === 'bp') return `${val} mmHg`;
    if (key.includes('pulse') || key === 'heart_rate') return `${val} bpm`;
    if (key.includes('temp')) return `${val} °F`;
    if (key.includes('weight')) return `${val} kg`;
    if (key.includes('height')) return `${val} cm`;
    if (key.includes('spo') || key.includes('oxygen')) return `${val} %`;
    if (key.includes('respiratory') || key === 'rr') return `${val} /min`;
    if (key.includes('sugar') || key.includes('glucose')) return `${val} mg/dL`;
    return val;
  };

  const safeStr = (v) => {
    if (!v) return "";
    if (typeof v === "string") {
      const trimmed = v.trim();
      if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
        try { return safeStr(JSON.parse(trimmed)); } catch { return v; }
      }
      return v;
    }
    if (Array.isArray(v)) return v.filter(Boolean).join(", ");
    if (typeof v === "object") {
      const tryKeys = ["primary", "notes", "text", "name", "value"];
      for (const k of tryKeys) { if (v[k] && typeof v[k] === "string") return v[k]; }
      const vals = Object.values(v).filter((x) => typeof x === "string" && x);
      return vals.length ? vals.join(", ") : "";
    }
    return String(v);
  };

  const diagnosis = (() => {
    let raw = data.diagnosis;
    if (!raw) return "";
    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      try { raw = JSON.parse(raw); } catch {}
    }
    if (typeof raw === "string") return raw.trim();
    if (typeof raw === "object" && raw !== null) {
      return safeStr(raw.primary || raw.provisional_diagnosis || raw.diagnosis || raw.name || raw.text || "");
    }
    return safeStr(raw);
  })();
  const diagnosisNotes = (() => {
    let raw = data.diagnosis;
    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      try { raw = JSON.parse(raw); } catch {}
    }
    if (!raw || typeof raw === "string") {
      const td = typeof data.template_data === "string" ? safeJsonParse(data.template_data, {}) : (data.template_data || {});
      return safeStr(data.diagnosis_notes || td['PROVISIONAL DIAGNOSIS__clinical_notes']);
    }
    return safeStr(raw.notes || raw.clinical_notes || data.diagnosis_notes);
  })();
  const qualification = safeStr(doc.qualification);
  const specialization = (() => {
    const raw = safeStr(data.specialization || doc.specialization);
    if (!raw || raw === "—") return "";
    return raw.split(",")[0].trim();
  })();

  const isTele = data.appointment_type === 'video_consultation' || data.appointment_type === 'video' || appt.appointment_type === 'video_consultation' || appt.appointment_type === 'video';

  const tagline = (() => {
    if (specialization && specialization !== "—") return `${specialization} Care & Consultation`;
    if (isTele) return "Teleconsultation Care & Consultation";
    return "OPD Care & Consultation";
  })();

  const prescriptionId = `MED-${doc.un_id || "0"}-${pat.un_id || "0"}-${data.unid || data.pid || data.prescription_number || data.id?.slice(0, 8) || "0"}`;

  const episodeCode = (() => {
    if (data.episode_id) return data.episode_id;
    if (data.episode_code) return data.episode_code;
    if (appt.care_episode_code) return appt.care_episode_code;
    if (data.care_episode_id) return `EP-${String(data.care_episode_id).slice(0, 8).toUpperCase()}`;
    if (appt.care_episode_id) return `EP-${String(appt.care_episode_id).slice(0, 8).toUpperCase()}`;
    if (data.id) return `EP-${String(data.id).slice(0, 8).toUpperCase()}`;
    return null;
  })();

  const chemistName = chemistInfo?.pharmacy_name || chemistInfo?.owner_name || chemistOrder?.chemist_name || "Selected Chemist";
  const chemistSub = [chemistInfo?.address || chemistOrder?.delivery_address, chemistInfo?.mobile || chemistOrder?.contact_number].filter(Boolean).join(" • ");
  const labName = labInfo?.lab_name || labInfo?.owner_name || labOrder?.lab_name || "Selected Lab";
  const labSub = [labInfo?.address, labInfo?.phone_number].filter(Boolean).join(" • ");

  const fmtDate = (d) => {
    if (!d) return "N/A";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
  };

  const fmtDateTime = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return d;
    }
  };

  const signatureRawUrl = (() => {
    const raw = doc.signature_url || data.doctor_signature_url || data.signature_url;
    if (!raw) return null;
    if (typeof raw === "string" && raw.startsWith("[")) {
      try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr[0] : raw;
      } catch {
        return raw;
      }
    }
    if (Array.isArray(raw)) return raw[0];
    return raw;
  })();

  const signatureImgUrl = signatureRawUrl
    ? (signatureRawUrl.startsWith("http")
        ? `/api/common/image-proxy?url=${encodeURIComponent(signatureRawUrl)}`
        : signatureRawUrl)
    : null;

  const fmtTime = (str) => {
    if (!str) return "—";
    if (String(str).includes("Z") || String(str).includes("T")) {
      try {
        return new Date(str).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      } catch { }
    }
    const base = String(str).length > 5 ? String(str).slice(0, 5) : String(str);
    const [h, m] = base.split(":");
    const hNum = parseInt(h, 10);
    if (isNaN(hNum)) return base;
    return `${((hNum + 11) % 12) + 1}:${m} ${hNum >= 12 ? "PM" : "AM"}`;
  };

  const followUpObj = (() => {
    if (!data.follow_up) return null;
    if (typeof data.follow_up === "object") return data.follow_up;
    try {
      return JSON.parse(data.follow_up);
    } catch {
      return { notes: data.follow_up };
    }
  })();

  let warningSignsHtml = followUpObj?.warning_signs || followUpObj?.notes || td?.['INFORM IMMEDIATELY IN CASE:__info'] || td?.['INFORM IMMEDIATELY IN CASES__info'] || td?.['RED FLAGS__info'] || td?.['Warning signs__info'] || "";
  if (Array.isArray(warningSignsHtml)) warningSignsHtml = warningSignsHtml.join(", ");
  warningSignsHtml = warningSignsHtml.trim();
  if (!warningSignsHtml || warningSignsHtml === "—") {
    warningSignsHtml = "Seek immediate medical attention if you experience high fever, severe breathlessness, chest pain, or sudden weakness.";
  }

  const followUpDateVal = followUpObj?.date || followUpObj?.return_after || td?.['FOLLOW-UP__return_after'] || td?.['FOLLOW-UP:__return_after'] || td?.['FOLLOW-UP__info'] || "";
  const followUpNotesVal = followUpObj?.notes || "";
  const isDateVal = followUpDateVal && !isNaN(Date.parse(followUpDateVal));

  const calculateAge = (dob, explicitAge) => {
    if (explicitAge) {
      const str = String(explicitAge).trim();
      return str.toLowerCase().includes("yr") ? str : `${str} yrs`;
    }
    const dobVal = dob || pat.date_of_birth || pat.dob || pat.birth_date;
    if (!dobVal) return "—";
    const birthDate = new Date(dobVal);
    if (isNaN(birthDate.getTime())) return "—";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} yrs` : "—";
  };

  const handleDownload = async () => {
    const el = document.getElementById('rx-print-area');
    if (!el) {
      toast.error("Prescription area not found");
      return;
    }
    try {
      setIsDownloading(true);
      const filename = `Prescription_${prescriptionId || "MediConnect"}.pdf`;
      await exportPrescriptionPdf(el, filename, true);
      toast.success("Prescription PDF downloaded & opened");
    } catch (err) {
      console.error("Prescription download error:", err);
      toast.error("Failed to generate prescription PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveToDigiLocker = async () => {
    const el = document.getElementById("rx-print-area");
    if (!el) {
      toast.error("Prescription area not found");
      return;
    }
    const patientId = data?.patient_id || data?.patient_details?.id || (typeof window !== "undefined" ? (localStorage.getItem("userId") || localStorage.getItem("user_id")) : null);
    if (!patientId) {
      toast.error("Please login to save to DigiLocker");
      return;
    }
    try {
      setIsSavingToDigiLocker(true);
      toast.loading("Rendering PDF & saving to DigiLocker...", { id: "save-rx-digilocker" });

      const pdf = await createPrescriptionJsPdf(el);
      const pdfBlob = pdf.output("blob");
      const filename = `Prescription_${prescriptionId || "MediConnect"}.pdf`;
      const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

      const formData = new FormData();
      formData.append("patient_id", patientId);
      formData.append("prescription_id", data?.id || "");
      formData.append("appointment_id", data?.appointment_id || "");
      formData.append("file", pdfFile);

      const res = await fetch("/api/patients/prescriptions/save-to-digilocker", {
        method: "POST",
        body: formData,
      });
      const resData = await res.json();

      if (resData.success) {
        setIsSavedInDigiLocker(true);
        toast.success(resData.message || "Prescription saved to your MediConnect DigiLocker!", { id: "save-rx-digilocker" });
      } else {
        toast.error(resData.message || "Failed to save to DigiLocker", { id: "save-rx-digilocker" });
      }
    } catch (err) {
      console.error("Save to DigiLocker error:", err);
      toast.error("Failed to save to DigiLocker: " + err.message, { id: "save-rx-digilocker" });
    } finally {
      setIsSavingToDigiLocker(false);
    }
  };

  useEffect(() => {
    if (autoSaveDigiLocker && !isSavedInDigiLocker && !isSavingToDigiLocker) {
      const timer = setTimeout(() => {
        handleSaveToDigiLocker();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [autoSaveDigiLocker]);

  const handlePrint = async () => {
    await handleDownload();
  };

  if (!rawData) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-black/70">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[95vh] flex flex-col overflow-hidden">

        {/* ── Close bar ── */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 bg-gradient-to-r from-[#0067A1] to-[#005282] text-white shrink-0 shadow-sm gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-xs sm:text-base font-bold tracking-wide uppercase truncate">Prescription</h3>
            <span className="hidden md:inline-block text-[10px] bg-white/20 text-white font-semibold px-2 py-0.5 rounded-md tracking-wider border border-white/20">A4 PDF</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Save to DigiLocker Button */}
            {!isDoctor && (
              <button
                type="button"
                onClick={handleSaveToDigiLocker}
                disabled={isSavingToDigiLocker}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                  isSavedInDigiLocker
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-white/15 hover:bg-white/25 text-white border border-white/20"
                }`}
                title={isSavedInDigiLocker ? "Saved in MediConnect DigiLocker" : "Save this PDF in MediConnect DigiLocker"}
              >
                {isSavingToDigiLocker ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isSavedInDigiLocker ? (
                  <FaCheck className="w-3 h-3 text-white" />
                ) : (
                  <FaLock className="w-3 h-3 text-white/80" />
                )}
                <span className="hidden sm:inline">{isSavingToDigiLocker ? "Saving..." : isSavedInDigiLocker ? "In Locker" : "DigiLocker"}</span>
                <span className="sm:hidden">{isSavedInDigiLocker ? "Saved" : "Locker"}</span>
              </button>
            )}

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-2.5 sm:px-3.5 py-1.5 bg-white text-[#0067A1] hover:bg-sky-50 active:scale-95 disabled:opacity-50 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Download Prescription (A4 PDF)"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isDownloading ? "Generating..." : "Download PDF"}</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 active:scale-95 transition-all cursor-pointer">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable letter body (2-way scrollable for narrow screens while maintaining pristine A4 layout) ── */}
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-slate-100/90 p-2 sm:p-6">
          <div className="min-w-fit flex flex-col items-center">

            {/* ── Mobile Scroll Hint ── */}
            <div className="block md:hidden text-[11px] text-slate-500 font-medium mb-2 w-[794px] px-2 text-center flex items-center justify-center gap-1.5">
              <FaArrowsAltH className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Scroll horizontally to view full standard A4 prescription sheet</span>
            </div>

            {/* ─── A4 Prescription Sheet ─── */}
            <div 
              id="rx-print-area"
              className="bg-white text-gray-900 mx-auto"
              style={{ width: 794, minWidth: 794, maxWidth: 794, boxSizing: 'border-box', background: '#ffffff', padding: '24px 28px', border: 'none', boxShadow: 'none', borderRadius: '0px' }}
            >
            
              {/* ─── Header / Letterhead ─── */}
              <table 
                style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  background: 'linear-gradient(135deg, #66baf7 0%, #62bcfb 100%)', 
                  borderRadius: '0px',
                  borderBottom: '2px solid #0067A1',
                  boxSizing: 'border-box'
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ width: '84px', padding: '10px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <img
                        src={MEDICONNECT_LOGO_BASE64}
                        alt="MediConnect Logo"
                        style={{ width: '60px', height: '60px', maxWidth: '60px', maxHeight: '60px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                        width={60}
                        height={60}
                      />
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 4px' }}>
                      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#000000', textShadow: '1px 1px 2px rgba(0,0,0,0.25)', whiteSpace: 'nowrap' }}>
                        MediConnect.fit
                      </h1>
                      <p style={{ margin: '3px 0 0', fontSize: '12px', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {tagline}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#000000' }}>
                        hello@mediconnect.fit
                      </p>
                    </td>
                    <td style={{ width: '84px', padding: '10px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <img
                        src={DOCTOR_CADUCEUS_BASE64}
                        alt="Doctor Icon"
                        style={{ width: '60px', height: '60px', maxWidth: '60px', maxHeight: '60px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                        width={60}
                        height={60}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* ─── Top Info Bar (Clean Letterhead Metadata Strip - No Box) ─── */}
              <table 
                style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  background: 'transparent', 
                  borderTop: '1px solid #e2e8f0', 
                  borderBottom: '1px solid #e2e8f0', 
                  marginTop: '10px',
                  boxSizing: 'border-box'
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 4px', fontSize: '12px', fontWeight: 600, color: '#374151', textAlign: 'left', width: '38%' }}>
                      Prescription ID: <span style={{ color: '#0067A1', fontWeight: 700 }}>{prescriptionId}</span>
                    </td>
                    <td style={{ padding: '8px 4px', fontSize: '12px', textAlign: 'center', width: '34%' }}>
                      {episodeCode ? (
                        <span>
                          <span style={{ color: '#6b7280' }}>Episode ID: </span>
                          <span style={{ color: '#0067A1', fontWeight: 700, fontFamily: 'monospace' }}>{episodeCode}</span>
                        </span>
                      ) : null}
                    </td>
                    <td style={{ padding: '8px 4px', fontSize: '12px', fontWeight: 600, color: '#374151', textAlign: 'right', width: '28%' }}>
                      Date: <span style={{ color: '#0067A1', fontWeight: 700 }}>{fmtDate(data.created_at)}</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* ─── Teleconsultation Notice ─── */}
              {isTele && (
                <div 
                  style={{ 
                    marginTop: '10px',
                    background: '#fffbeb', 
                    padding: '7px 12px', 
                    borderRadius: '0px', 
                    borderLeft: '3px solid #f59e0b', 
                    fontSize: '11px', 
                    color: '#475569', 
                    fontStyle: 'italic',
                    boxSizing: 'border-box' 
                  }}
                >
                  This prescription is based solely on information provided during teleconsultation without physical examination. If symptoms worsen, seek in-person evaluation or emergency care immediately.
                </div>
              )}

            {/* ─── Doctor & Patient Info Block (Guaranteed 2 Columns Side-by-Side via Table) ─── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', boxSizing: 'border-box' }}>
              <tbody>
                <tr>
                  {/* Doctor Details */}
                  <td style={{ width: '48%', verticalAlign: 'top', paddingRight: '12px', boxSizing: 'border-box' }}>
                    <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                      Doctor Details
                    </h3>
                    <div className="mt-1 divide-y divide-dotted divide-gray-300 text-xs">
                      <div className="py-1 flex justify-between gap-2">
                        <span className="font-semibold text-gray-500 shrink-0">Name:</span>
                        <span className="text-[#0067A1] font-bold text-right">{doc.full_name ? `Dr. ${doc.full_name.replace(/^Dr\.\s*/i, '')}` : "—"}</span>
                      </div>
                      <div className="py-1 flex justify-between gap-2">
                        <span className="font-semibold text-gray-500 shrink-0">Qualification:</span>
                        <span className="text-[#0067A1] font-bold text-right">{qualification || "—"}</span>
                      </div>
                      <div className="py-1 flex justify-between gap-2">
                        <span className="font-semibold text-gray-500 shrink-0">Specialization:</span>
                        <span className="text-[#0067A1] font-bold text-right">{specialization || "—"}</span>
                      </div>
                      <div className="py-1 flex justify-between gap-2">
                        <span className="font-semibold text-gray-500 shrink-0">License No:</span>
                        <span className="text-[#0067A1] font-bold text-right">{doc.license_number || "—"}</span>
                      </div>
                      <div className="py-1 flex justify-between gap-2">
                        <span className="font-semibold text-gray-500 shrink-0">Clinic:</span>
                        <span className="text-[#0067A1] font-bold text-right">
                          {[doc.clinic_name, doc.clinic_address].filter(Boolean).join(", ") || "Virtual Consultation"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td style={{ width: '4%', borderRight: '1px dashed #cbd5e1' }}></td>

                  {/* Patient Details */}
                  <td style={{ width: '48%', verticalAlign: 'top', paddingLeft: '12px', boxSizing: 'border-box' }}>
                    <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                      Patient Details
                    </h3>
                    <div className="mt-1 divide-y divide-dotted divide-gray-300 text-xs">
                      <div className="py-1 flex justify-between gap-2">
                        <span className="font-semibold text-gray-500 shrink-0">Name:</span>
                        <span className="text-[#0067A1] font-bold text-right">{pat.full_name || "—"}</span>
                      </div>
                      <div className="py-1 flex justify-between gap-2">
                        <span className="font-semibold text-gray-500 shrink-0">Gender:</span>
                        <span className="text-[#0067A1] font-bold text-right">{pat.gender || "—"}</span>
                      </div>
                      <div className="py-1 flex justify-between gap-2">
                        <span className="font-semibold text-gray-500 shrink-0">Blood Group:</span>
                        <span className="text-[#0067A1] font-bold text-right">{pat.blood_group || "—"}</span>
                      </div>
                      <div className="py-1 flex justify-between gap-2">
                        <span className="font-semibold text-gray-500 shrink-0">Age:</span>
                        <span className="text-[#0067A1] font-bold text-right">{calculateAge(pat.date_of_birth, pat.age)}</span>
                      </div>
                      <div className="py-1 flex justify-between gap-2">
                        <span className="font-semibold text-gray-500 shrink-0">Address:</span>
                        <span className="text-[#0067A1] font-bold text-right">{pat.address || "—"}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ─── Prescription (Rx) Medical Divider (Clean Divider - No Bulky Pill Box) ─── */}
            <table 
              style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                borderTop: '1px solid #e2e8f0', 
                borderBottom: '2px solid #0067A1', 
                marginTop: '12px', 
                marginBottom: '10px',
                boxSizing: 'border-box'
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: '6px 2px', verticalAlign: 'middle', textAlign: 'left' }}>
                    <span style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'serif', color: '#0067A1', marginRight: '8px', verticalAlign: 'middle', lineHeight: 1 }}>℞</span>
                    <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#0f172a', verticalAlign: 'middle' }}>
                      PRESCRIPTION (Rx)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ─── Clinical Columns (Guaranteed 2 Columns Side-by-Side via Table) ─── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
              <tbody>
                <tr>
                  {/* Left Column: Diagnosis & Findings */}
                  <td style={{ width: '48%', verticalAlign: 'top', paddingRight: '12px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Diagnosis */}
                      <div>
                        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                          Provisional Diagnosis
                        </h3>
                        <div className="mt-1 border-b border-dotted border-gray-300 py-1 text-xs">
                          <div className="text-[#0067A1] font-bold">
                            {diagnosis || "—"}
                          </div>
                          {diagnosisNotes && (
                            <p className="text-[11px] text-gray-500 mt-0.5 italic">{diagnosisNotes}</p>
                          )}
                        </div>
                      </div>

                      {/* Presenting Complaints */}
                      {symptoms && Object.keys(symptoms).length > 0 && (
                        <div>
                          <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                            Presenting Complaints
                          </h3>
                          <div className="mt-1 divide-y divide-dotted divide-gray-300 text-xs">
                            {Object.entries(symptoms).map(([k, val]) => (
                              <div key={k} className="py-1 flex justify-between gap-2">
                                <span className="font-semibold text-gray-500 shrink-0">{k}:</span>
                                <span className="text-[#0067A1] font-bold text-right">{String(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vital Signs */}
                      <div>
                        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                          Vital Signs
                        </h3>
                        <div className="mt-1 divide-y divide-dotted divide-gray-300 text-xs">
                          {vitals && Object.entries(vitals).some(([_, val]) => val) ? (
                            Object.entries(vitals)
                              .filter(([_, val]) => val)
                              .map(([k, val]) => (
                                <div key={k} className="py-1 flex justify-between gap-2">
                                  <span className="font-semibold text-gray-500 shrink-0">{formatVitalKey(k)}:</span>
                                  <span className="text-[#0067A1] font-bold text-right">{formatVital(k, val)}</span>
                                </div>
                              ))
                          ) : (
                            <div className="py-1 text-gray-500 italic">Not recorded</div>
                          )}
                        </div>
                      </div>

                      {/* Custom Specialty Template Sections (e.g. Tele-Examination, Positive Findings, Procedures, etc.) */}
                      {Object.entries(customTemplateSections).map(([secTitle, fields]) => (
                        <div key={secTitle}>
                          <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                            {secTitle}
                          </h3>
                          <div className="mt-1 divide-y divide-dotted divide-gray-300 text-xs">
                            {fields.map((f, i) => {
                              const isLongText = f.value.length > 40 || f.value.includes("\n");
                              return isLongText ? (
                                <div key={i} className="py-1 flex flex-col gap-0.5">
                                  <span className="font-semibold text-gray-500">{f.label}:</span>
                                  <span className="text-[#0067A1] font-bold text-left whitespace-pre-wrap">{f.value}</span>
                                </div>
                              ) : (
                                <div key={i} className="py-1 flex justify-between gap-2">
                                  <span className="font-semibold text-gray-500 shrink-0">{f.label}:</span>
                                  <span className="text-[#0067A1] font-bold text-right">{f.value}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Examination Findings Fallback (if no custom structured sections were rendered but notes exist) */}
                      {Object.keys(customTemplateSections).length === 0 && examFindingsNotes && (
                        <div>
                          <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                            Examination Findings
                          </h3>
                          <div className="mt-1 text-gray-800 text-xs leading-relaxed">
                            {formatSpecialMessage(examFindingsNotes)}
                          </div>
                        </div>
                      )}

                      {/* Clinical Notes / Special Instructions */}
                      {(data.special_message || data.notes || diagnosisNotes) && (
                        <div>
                          <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                            Clinical Notes / Special Instructions
                          </h3>
                          <div className="mt-1 text-gray-800 text-xs leading-relaxed">
                            {formatSpecialMessage(data.special_message || data.notes || diagnosisNotes)}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  <td style={{ width: '4%', borderRight: '1px dashed #cbd5e1' }}></td>

                  {/* Right Column: Treatment & Follow-up */}
                  <td style={{ width: '48%', verticalAlign: 'top', paddingLeft: '12px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Medicines */}
                      <div>
                        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                          Medicines
                        </h3>
                        <div className="mt-1 divide-y divide-dotted divide-gray-300 text-xs">
                          {medicines.length > 0 ? (
                            medicines.map((m, i) => (
                              <div key={i} className="py-1 flex flex-col gap-0.5">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-semibold text-gray-500 shrink-0">{i + 1}.</span>
                                  <span className="text-[#0067A1] font-bold text-left flex-1">{m.name || "—"}</span>
                                  <span className="text-gray-600 text-[11px] shrink-0 text-right">
                                    {[m.dosage || m.dose, m.frequency, m.duration].filter(Boolean).join(" · ")}
                                  </span>
                                </div>
                                {(m.instructions || m.notes) && (
                                  <div className="pl-4 text-[11px] text-gray-500 italic">
                                    {m.instructions || m.notes}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="py-1 text-gray-500 italic">No medicines prescribed</div>
                          )}
                        </div>
                      </div>

                      {/* Investigations / Lab Tests */}
                      <div>
                        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                          Investigations / Lab Tests
                        </h3>
                        <div className="mt-1 divide-y divide-dotted divide-gray-300 text-xs">
                          {uniqueLabs.length > 0 ? (
                            uniqueLabs.map((t, i) => {
                              const testName = typeof t === "string" ? t : (t.test_name || t.name || "");
                              const urgency = typeof t === "object" && t.urgency ? ` (${t.urgency})` : "";
                              const instructions = typeof t === "object" && t.instructions ? ` — ${t.instructions}` : "";
                              return (
                                <div key={i} className="py-1 flex flex-col gap-0.5">
                                  <div className="flex justify-between gap-2">
                                    <span className="font-semibold text-gray-500 shrink-0">{i + 1}.</span>
                                    <span className="text-[#0067A1] font-bold text-right flex-1">{testName}{urgency}</span>
                                  </div>
                                  {instructions && (
                                    <div className="pl-4 text-[11px] text-gray-500 italic">
                                      {instructions}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-1 text-gray-500 italic">No investigations or lab tests advised</div>
                          )}
                        </div>
                      </div>

                      {/* Follow Up */}
                      <div>
                        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                          Follow Up
                        </h3>
                        <div className="mt-1 divide-y divide-dotted divide-gray-300 text-xs">
                          {followUpDateVal && (
                            <div className="py-1 flex justify-between gap-2">
                              <span className="font-semibold text-gray-500 shrink-0">
                                {isDateVal ? "Follow-up Date:" : "Return After:"}
                              </span>
                              <span className="text-[#0067A1] font-bold text-right">
                                {isDateVal ? fmtDate(followUpDateVal) : followUpDateVal}
                              </span>
                            </div>
                          )}
                          {followUpNotesVal && (
                            <div className="py-1 flex justify-between gap-2">
                              <span className="font-semibold text-gray-500 shrink-0">Notes:</span>
                              <span className="text-[#0067A1] font-bold text-right">{followUpNotesVal}</span>
                            </div>
                          )}
                          {(!followUpDateVal && !followUpNotesVal) && (
                            <div className="py-1 flex justify-between gap-2">
                              <span className="font-semibold text-gray-500 shrink-0">Return After:</span>
                              <span className="text-[#0067A1] font-bold text-right">—</span>
                            </div>
                          )}
                          <div className="py-1 flex flex-col gap-0.5">
                            <span className="font-semibold text-red-600">Warning Signs:</span>
                            <span className="text-gray-700 text-[11px]">
                              {warningSignsHtml}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Digital Signature */}
                      <div>
                        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, borderBottom: '2px solid #030712', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827' }}>
                          Digital Signature
                        </h3>
                        <div className="mt-1 flex flex-col items-end text-xs">
                          {signatureImgUrl && !sigLoadFailed ? (
                            <div className="flex justify-end w-full mb-1">
                              <img
                                src={signatureImgUrl}
                                alt="Doctor Signature"
                                onError={(e) => {
                                  if (signatureRawUrl && e.currentTarget.src !== signatureRawUrl) {
                                    e.currentTarget.src = signatureRawUrl;
                                  } else {
                                    setSigLoadFailed(true);
                                  }
                                }}
                                style={{ maxHeight: '42px', height: '42px', objectFit: 'contain' }}
                                className="h-10 border-b border-gray-300 pb-0.5 object-contain inline-block"
                              />
                            </div>
                          ) : (
                            <div className="font-serif italic text-base text-[#0067A1] font-bold py-1">
                              Dr. {doc.full_name?.replace(/^Dr\.\s*/i, '') || "Doctor"}
                            </div>
                          )}
                          <div className="w-full flex justify-end mb-1">
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                              ✓ Digitally Signed &amp; Verified
                            </span>
                          </div>
                          <div className="py-1 flex justify-between w-full gap-2 border-b border-dotted border-gray-300">
                            <span className="font-semibold text-gray-500">Signed by:</span>
                            <span className="text-[#0067A1] font-bold">{doc.full_name ? `Dr. ${doc.full_name.replace(/^Dr\.\s*/i, '')}` : "—"}</span>
                          </div>
                          {(doc.license_number || doc.reg_no) && (
                            <div className="py-1 flex justify-between w-full gap-2 border-b border-dotted border-gray-300">
                              <span className="font-semibold text-gray-500">Reg / License No:</span>
                              <span className="text-[#0067A1] font-bold text-right">{doc.license_number || doc.reg_no}</span>
                            </div>
                          )}
                          <div className="py-1 flex justify-between w-full gap-2 border-b border-dotted border-gray-300">
                            <span className="font-semibold text-gray-500">Signed at:</span>
                            <span className="text-[#0067A1] font-bold text-right">
                              {fmtDateTime(data.signed_at || data.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

              {/* ─── Bottom Footer Strip ─── */}
              <table 
                style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  borderTop: '2px solid #e2e8f0', 
                  marginTop: '14px', 
                  paddingTop: '6px',
                  boxSizing: 'border-box' 
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ fontSize: '11px', color: '#4b5563', padding: '6px 0', textAlign: 'left' }}>
                      <strong style={{ color: '#1f2937' }}>MediConnect Healthcare Services</strong>
                      <span style={{ color: '#9ca3af', margin: '0 6px' }}>|</span>
                      <span>Confidential Medical Document</span>
                    </td>
                    <td style={{ fontSize: '11px', color: '#4b5563', padding: '6px 0', textAlign: 'right' }}>
                      Issued for: <span style={{ color: '#0067A1', fontWeight: 700 }}>{pat.full_name || "—"}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: '10px', color: '#6b7280', paddingTop: '4px', borderTop: '1px dotted #e5e7eb', textAlign: 'left' }}>
                      © {new Date().getFullYear()} MediConnect.fit &bull; Digitally verified medical teleconsultation prescription.
                    </td>
                    <td style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, paddingTop: '4px', borderTop: '1px dotted #e5e7eb', textAlign: 'right' }}>
                      Page 1 of 1
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── Responsive Action / Order Cards Footer (100% responsive, outside horizontal scroll) ─── */}
        <div className="bg-white border-t border-slate-200 p-3 sm:p-4 shrink-0 shadow-sm z-10 w-full">
          <div className="w-full">
            <div className={`grid grid-cols-1 ${uniqueLabs.length > 0 ? "sm:grid-cols-2" : ""} gap-3 w-full`}>
              {/* Chemist Order Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-blue-50/40 via-white to-slate-50/60 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-[#0067A1]/40 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0067A1] to-[#005282] text-white flex items-center justify-center shadow-xs shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Chemist Order</p>
                      {chemistOrder && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          {chemistOrder.status || "Ordered"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {chemistOrder ? chemistName : "Not ordered yet"}
                    </p>
                    {chemistOrder && (chemistSub || chemistOrder.unid) && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {chemistSub ? chemistSub : ""}{chemistOrder.unid ? ` • #${chemistOrder.unid}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                {isDoctor ? (
                  <span className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                    chemistOrder
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {chemistOrder ? "Ordered" : "Pending Patient"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShareTarget("chemist")}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs hover:shadow ${
                      chemistOrder
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80"
                        : "bg-gradient-to-r from-[#0067A1] to-[#0080C6] hover:from-[#005a8f] hover:to-[#006ea8] text-white"
                    }`}
                  >
                    {chemistOrder ? (
                      <>
                        <span>Change</span>
                        <RotateCcw className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Order</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Lab Order Card */}
              {uniqueLabs.length > 0 && (
                <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-teal-50/40 via-white to-slate-50/60 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-teal-600/40 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center shadow-xs shrink-0">
                      <FlaskConical className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lab Order</p>
                        {labOrder && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            {labOrder.status || "Ordered"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {labOrder ? labName : "Not ordered yet"}
                      </p>
                      {labOrder && (labSub || labOrder.unid) && (
                        <p className="text-[11px] text-slate-500 truncate">
                          {labSub ? labSub : ""}{labOrder.unid ? ` • #${labOrder.unid}` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {isDoctor ? (
                    <span className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      labOrder
                        ? "bg-teal-50 text-teal-700 border border-teal-200"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {labOrder ? "Booked" : "Pending Patient"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShareTarget("lab")}
                      className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs hover:shadow ${
                        labOrder
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80"
                          : "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                      }`}
                    >
                      {labOrder ? (
                        <>
                          <span>Change</span>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <CalendarCheck className="w-3.5 h-3.5" />
                          <span>Book</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Share Modal overlay ── */}
      <AnimatePresence>
        {shareTarget && (
          <SharePrescriptionModal
            userId={data?.patient_id || data?.patient_details?.id || (typeof window !== "undefined" ? (localStorage.getItem("userId") || localStorage.getItem("user_id")) : null)}
            type={shareTarget}
            prescriptionId={data.id}
            prescriptionDisplayId={prescriptionId}
            medicines={medicines}
            labTests={uniqueLabs}
            existingOrder={shareTarget === "chemist" ? chemistOrder : labOrder}
            onOrdersUpdated={async () => fetchOrders()}
            onClose={() => setShareTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
