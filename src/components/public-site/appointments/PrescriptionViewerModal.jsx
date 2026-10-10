"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaTimes, FaPaperPlane, FaFlask, FaPills, FaArrowRight, FaCheckCircle, FaPrint, FaEnvelope, FaArrowsAltH, FaDownload, FaSpinner } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { exportPrescriptionPdf, printPrescriptionPdf } from "@/lib/prescriptionPdfEngine";
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

const formatSpecialMessage = (text) => {
  if (!text) return null;
  const cleanText = text.replace(/\[\s*(PRESENTING COMPLAINTS|COMPLAINTS)\s*\][^\[]*/gi, '');
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
  data,
  onClose,
  combinedLabs = [],
  onSendToLab,
  onSendToChemist
}) {
  const router = useRouter();
  const [chemistOrder, setChemistOrder] = useState(null);
  const [labOrder, setLabOrder] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [shareTarget, setShareTarget] = useState(null);
  const [showFulfillPrompt, setShowFulfillPrompt] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchOrders = async () => {
    if (!data?.id) { setOrdersLoading(false); return; }
    const patientId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!patientId) { setOrdersLoading(false); return; }

    const pickLatest = (orders) => {
      if (!Array.isArray(orders) || orders.length === 0) return null;
      const active = orders.filter(o => (o.status || "").toLowerCase() !== "cancelled");
      const list = active.length ? active : orders;
      return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    };

    setOrdersLoading(true);
    try {
      const [medData, labData] = await Promise.all([
        fetch("/api/patients/orders/medicine/by-prescription", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prescription_id: data.id, patient_id: patientId }),
        }).then(r => r.json()).catch(() => null),
        fetch("/api/patients/orders/lab/by-prescription", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prescription_id: data.id, patient_id: patientId }),
        }).then(r => r.json()).catch(() => null),
      ]);
      const mOrder = pickLatest(medData?.data || []);
      const lOrder = pickLatest(labData?.data || []);
      setChemistOrder(mOrder);
      setLabOrder(lOrder);

      const hasMedicines = Array.isArray(data.medicines) && data.medicines.length > 0;
      const hasLabs = Array.isArray(combinedLabs) && combinedLabs.length > 0;
      if ((hasMedicines && !mOrder) || (hasLabs && !lOrder)) {
        setShowFulfillPrompt(true);
      }
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [data?.id]);

  if (!data) return null;

  const doc = data.doctor_details || {};
  const pat = data.patient_details || {};
  const appt = data.appointments || {};
  const medicines = Array.isArray(data.medicines) ? data.medicines : [];
  const vitals = data.vital_signs || data.vitals || null;
  
  const symptoms = (() => {
    let symp = {};
    let td = data.template_data || {};
    if (typeof td === 'string') {
      try { td = JSON.parse(td); } catch { td = {}; }
    }
    if (td) {
      if (td._dynamic_complaints && Array.isArray(td._dynamic_complaints)) {
        td._dynamic_complaints.forEach(c => {
          if (c.complaint) symp[c.complaint] = c.details || "Yes";
        });
      } else {
        if (td['PRESENTING COMPLAINTS__fever']) symp['Fever / Chills'] = td['PRESENTING COMPLAINTS__fever'];
        if (td['PRESENTING COMPLAINTS__cough']) symp['Cough / Cold / Sore throat'] = td['PRESENTING COMPLAINTS__cough'];
        if (td['PRESENTING COMPLAINTS__headache']) symp['Headache / Bodyache'] = td['PRESENTING COMPLAINTS__headache'];
        if (td['PRESENTING COMPLAINTS__gi_symptoms']) symp['Nausea / Vomiting / Diarrhea'] = td['PRESENTING COMPLAINTS__gi_symptoms'];
        if (td['PRESENTING COMPLAINTS__weakness']) symp['Weakness / Fatigue'] = td['PRESENTING COMPLAINTS__weakness'];
      }
    }
    return Object.keys(symp).length > 0 ? symp : null;
  })();

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

  const prescriptionId = `MED-${doc.un_id || "0"}-${pat.un_id || "0"}-${data.unid || data.id?.slice(0, 8) || "0"}`;

  const episodeCode = (() => {
    if (data.episode_id) return data.episode_id;
    if (data.episode_code) return data.episode_code;
    if (appt.care_episode_code) return appt.care_episode_code;
    if (data.care_episode_id) return `EP-${String(data.care_episode_id).slice(0, 8).toUpperCase()}`;
    if (appt.care_episode_id) return `EP-${String(appt.care_episode_id).slice(0, 8).toUpperCase()}`;
    if (data.id) return `EP-${String(data.id).slice(0, 8).toUpperCase()}`;
    return null;
  })();

  const fmtDate = (d) => {
    if (!d) return "N/A";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
  };

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

  let warningSignsHtml = followUpObj?.warning_signs || followUpObj?.notes || "";
  if (Array.isArray(warningSignsHtml)) warningSignsHtml = warningSignsHtml.join(", ");
  warningSignsHtml = warningSignsHtml.trim();
  if (!warningSignsHtml || warningSignsHtml === "—") {
    warningSignsHtml = "Seek immediate medical attention if you experience high fever, severe breathlessness, chest pain, or sudden weakness.";
  }

  const followUpDateVal = followUpObj?.date || followUpObj?.return_after || "";
  const followUpNotesVal = followUpObj?.notes || "";
  const isDateVal = followUpDateVal && !isNaN(Date.parse(followUpDateVal));

  const calculateAge = (dob, explicitAge) => {
    if (explicitAge) return `${explicitAge} yrs`;
    if (!dob) return "—";
    const birthDate = new Date(dob);
    if (isNaN(birthDate)) return "—";
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

  const handlePrint = async () => {
    await handleDownload();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl w-full sm:max-w-4xl h-full sm:h-[95dvh] sm:max-h-[96vh] flex flex-col overflow-hidden">

        {/* Modal toolbar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 flex-shrink-0">
          <span className="text-white font-semibold text-sm">Prescription View</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-1.5 bg-[#0080C6] text-white hover:bg-[#0067A1] active:scale-95 disabled:opacity-50 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm flex items-center gap-1.5"
              title="Download Prescription (A4 PDF)"
            >
              {isDownloading ? <FaSpinner className="w-3.5 h-3.5 animate-spin" /> : <FaDownload className="w-3.5 h-3.5" />}
              <span>{isDownloading ? "Generating PDF..." : "Download PDF"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition ml-1"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable prescription document — vertical and horizontal scroll to preserve pristine A4 layout */}
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-slate-100/90 p-2 sm:p-6">
          <div className="min-w-fit flex flex-col items-center">
            <div className="block md:hidden text-[11px] text-slate-500 font-medium mb-2 w-[794px] px-2 text-center flex items-center justify-center gap-1.5">
              <FaArrowsAltH className="w-3.5 h-3.5 text-slate-400 inline" />
              <span>Scroll horizontally to view full standard A4 prescription sheet</span>
            </div>
            <div id="rx-print-area" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', background: 'white', width: 794, minWidth: 794, maxWidth: 794, margin: '0 auto', padding: 28, borderRadius: 0, boxShadow: 'none', border: 'none', color: '#333', boxSizing: 'border-box' }}>
            
            {/* HEADER */}
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'linear-gradient(135deg,#66baf7 0%,#62bcfb 100%)', borderRadius: 0, borderBottom: '2px solid #0067A1', marginBottom: 10 }}>
              <tbody>
                <tr>
                  <td style={{ width: 84, textAlign: 'center', verticalAlign: 'middle', padding: '10px 14px' }}>
                    <img src={MEDICONNECT_LOGO_BASE64} alt="logo" width={60} height={60} style={{ width: 60, height: 60, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 4px' }}>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'black', textShadow: '1px 1px 2px rgba(0,0,0,0.25)', whiteSpace: 'nowrap' }}>MediConnect.fit</h1>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'black', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {tagline}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'black' }}><FaEnvelope style={{ display: 'inline', width: 12, height: 12, marginRight: 4, verticalAlign: 'middle' }} /> hello@mediconnect.fit</p>
                  </td>
                  <td style={{ width: 84, textAlign: 'center', verticalAlign: 'middle', padding: '10px 14px' }}>
                    <img src={DOCTOR_CADUCEUS_BASE64} alt="dr" width={60} height={60} style={{ width: 60, height: 60, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* TOP ROW (Metadata line - No Box) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'transparent', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', marginBottom: 10 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 4px', fontSize: 12, fontWeight: 600, color: '#333', textAlign: 'left', width: '35%' }}>
                    Rx ID: <span style={{ color: '#0067A1' }}>{data.pid ? `RX-${String(data.pid).padStart(4, '0')}` : prescriptionId}</span>
                  </td>
                  <td style={{ padding: '8px 4px', fontSize: 12, fontWeight: 600, textAlign: 'center', width: '35%' }}>
                    {episodeCode && (
                      <span>Episode ID: <span style={{ color: '#0067A1', fontFamily: 'monospace' }}>{episodeCode}</span></span>
                    )}
                  </td>
                  <td style={{ padding: '8px 4px', fontSize: 12, fontWeight: 600, color: '#333', textAlign: 'right', width: '30%' }}>
                    Date: <span style={{ color: '#0067A1' }}>{fmtDate(data.created_at)}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* NOTICE */}
            {isTele && (
              <div style={{ background: '#fffbeb', padding: '7px 12px', fontSize: 11, borderRadius: 0, borderLeft: '3px solid #f59e0b', fontStyle: 'italic', marginBottom: 10, color: '#475569' }}>
                This prescription is based solely on information provided during teleconsultation without physical examination. If symptoms worsen, seek in-person evaluation or emergency care immediately.
              </div>
            )}

            <hr style={{ border: 'none', height: 1, background: 'linear-gradient(90deg,transparent,#0080C6,transparent)', margin: '10px 0' }} />

            {/* TWO COLUMNS (Table based) */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  {/* LEFT COLUMN */}
                  <td style={{ width: '48%', verticalAlign: 'top', paddingRight: 12, fontSize: 12 }}>
                    <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 10 }}>DOCTOR DETAILS</h3>
                {[['Name', `Dr. ${doc.full_name || 'Doctor'}`],
                  ['Qualification', qualification || 'N/A'],
                  ['Specialization', specialization || 'N/A'],
                  ['Reg No.', doc.license_number ? `${doc.license_number}` : 'N/A'],
                  ['Clinic', isTele && doc.clinic_address ? (
                    <span>
                      {doc.clinic_name ? doc.clinic_name + ", " : ""}
                      <span style={{ filter: 'blur(4px)', userSelect: 'none' }} title="Hidden for Teleconsultation">{doc.clinic_address}</span>
                    </span>
                  ) : ([doc.clinic_name, doc.clinic_address].filter(Boolean).join(", ") || 'Virtual Consultation Only')]
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                    <span style={{ fontWeight: 600 }}>{lbl}: </span>
                    <span style={{ color: '#0067A1', fontWeight: 500 }}>{val}</span>
                  </div>
                ))}

                <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 14 }}>PROVISIONAL DIAGNOSIS</h3>
                <div style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                  <span style={{ color: '#0067A1', fontWeight: 600, fontSize: 13 }}>{diagnosis || '—'}</span>
                  {diagnosisNotes && (
                    <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
                      {diagnosisNotes}
                    </div>
                  )}
                </div>

                {vitals && Object.values(vitals).some(Boolean) && (
                  <>
                    <h4 style={{ margin: '12px 0 6px', fontSize: 12, fontWeight: 700, borderLeft: '3px solid #0080C6', paddingLeft: 8 }}>VITALS (Self-reported)</h4>
                    {Object.entries(vitals).map(([k, v]) =>
                      v ? (
                        <div key={k} style={{ position: 'relative', paddingBottom: 5, margin: '4px 0', borderBottom: '1px dotted #e0e0e0' }}>
                          <span style={{ fontWeight: 600 }}>{formatVitalKey(k)}: </span>
                          <span style={{ color: '#0067A1', fontWeight: 500 }}>{formatVital(k, v)}</span>
                        </div>
                      ) : null
                    )}
                  </>
                )}

                {combinedLabs?.length > 0 && (
                  <>
                    <h4 style={{ margin: '12px 0 6px', fontSize: 12, fontWeight: 700, borderLeft: '3px solid #0080C6', paddingLeft: 8 }}>INVESTIGATIONS / LAB TESTS ADVISED</h4>
                    {combinedLabs.map((t, i) => (
                      <div key={i} style={{ paddingBottom: 5, margin: '4px 0', borderBottom: '1px dotted #e0e0e0' }}>
                        <span style={{ color: '#0067A1', fontWeight: 500 }}>{i+1}. {typeof t === 'object' ? (t.test_name || t.name || JSON.stringify(t)) : t}</span>
                      </div>
                    ))}
                  </>
                )}
              </td>

                  <td style={{ width: '4%', borderRight: '1px dashed #cbd5e1' }}></td>

                  {/* RIGHT COLUMN */}
                  <td style={{ width: '48%', verticalAlign: 'top', paddingLeft: 12, fontSize: 12 }}>
                    <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 10 }}>PATIENT DETAILS</h3>
                    {[['Name', pat.full_name || '—'],
                      ['Gender', pat.gender || '—'],
                      ['Blood Group', pat.blood_group || '—'],
                      ['Age', calculateAge(pat.date_of_birth, pat.age)]
                    ].map(([lbl, val]) => (
                      <div key={lbl} style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                        <span style={{ fontWeight: 600 }}>{lbl}: </span>
                        <span style={{ color: '#0067A1', fontWeight: 500 }}>{val}</span>
                      </div>
                    ))}

                    <div style={{ background: 'transparent', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', color: '#0067A1', textAlign: 'center', fontWeight: 800, padding: '6px 0', margin: '10px 0', borderRadius: 0, fontSize: '11px', letterSpacing: '1px' }}>
                      {(data.appointment_type || 'TELECONSULTATION').toUpperCase().replace(/_/g, ' ')}
                    </div>

                    {symptoms && Object.keys(symptoms).length > 0 && (
                      <>
                        <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 12 }}>PRESENTING COMPLAINTS</h3>
                        {Object.entries(symptoms).map(([k, v]) =>
                          v ? (
                            <div key={k} style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                              <span style={{ fontWeight: 600 }}>{k}: </span>
                              <span style={{ color: '#0067A1', fontWeight: 500 }}>{String(v)}</span>
                            </div>
                          ) : null
                        )}
                      </>
                    )}

                    {medicines?.length > 0 && (
                      <>
                        <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 12 }}>TREATMENT (Rx)</h3>
                        {medicines.map((med, idx) => (
                          <div key={idx} style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                            <span style={{ color: '#0067A1', fontWeight: 500 }}>
                              {idx + 1}. {med.name || `Medicine ${idx+1}`}
                              {med.dosage ? ` - ${med.dosage}` : ''}
                              {med.frequency ? `, ${med.frequency}` : ''}
                              {med.duration ? ` x ${med.duration}` : ''}
                              {med.instructions ? `. ${med.instructions}` : ''}
                            </span>
                          </div>
                        ))}
                      </>
                    )}

                    <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 12 }}>FOLLOW-UP</h3>
                    {(() => {
                      const dateVal = (isDateVal && followUpDateVal) ? followUpDateVal : null;
                      const retVal = followUpObj?.return_after;
                      const displayDate = retVal || dateVal;
                      return displayDate ? (
                        <div style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                          <span style={{ fontWeight: 600 }}>Next Visit: </span>
                          <span style={{ color: '#0067A1', fontWeight: 500 }}>{displayDate}</span>
                        </div>
                      ) : null;
                    })()}
                    {warningSignsHtml && (
                      <div style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                        <span style={{ fontWeight: 600, color: 'red' }}>Warning Signs: </span>
                        <span style={{ color: '#0067A1', fontWeight: 500 }}>
                          {warningSignsHtml}
                        </span>
                      </div>
                    )}
                    {(data.notes || data.special_message || diagnosisNotes) && (
                      <>
                        <h4 style={{ margin: '12px 0 6px', fontSize: 12, fontWeight: 700, borderLeft: '3px solid #0080C6', paddingLeft: 8 }}>SPECIAL ADVICE / CLINICAL NOTES</h4>
                        <div style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', color: '#0067A1' }}>
                          {formatSpecialMessage(data.special_message || data.notes || diagnosisNotes)}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <hr style={{ border: 'none', height: 1, background: 'linear-gradient(90deg,transparent,#0080C6,transparent)', margin: '14px 0 8px' }} />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <tbody>
                <tr>
                  <td style={{ fontSize: 10, color: '#666', textAlign: 'left' }}>
                    <strong>MediConnect Healthcare Services</strong> &middot; Ref ID: {prescriptionId}
                  </td>
                  <td style={{ fontSize: 10, color: '#666', textAlign: 'right' }}>
                    Confidential Medical Document &middot; Page 1 of 1
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', fontSize: 9, color: '#888', paddingTop: 4 }}>
                    &copy; {new Date().getFullYear()} MediConnect.fit &bull; Digitally verified electronic prescription complying with Telemedicine Practice Guidelines.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

        {/* ── Order Status / Actions footer ── */}
        <div className="flex flex-col gap-2 p-3 sm:p-4 border-t border-gray-200 bg-gray-50 shrink-0">

          {/* Medicine Order */}
          {medicines.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#0067A1] text-white flex items-center justify-center shrink-0">
                  <FaPills className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-500">Medicine Order</p>
                  {ordersLoading ? (
                    <p className="text-xs font-semibold text-gray-400">Checking…</p>
                  ) : chemistOrder ? (
                    <div className="flex items-center gap-1.5">
                      <FaCheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-700 truncate">
                        {chemistOrder.status ? chemistOrder.status.charAt(0).toUpperCase() + chemistOrder.status.slice(1) : "Ordered"}
                        {chemistOrder.unid && <span className="text-gray-400 font-normal"> · #{chemistOrder.unid}</span>}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-gray-700">Not ordered yet</p>
                  )}
                </div>
              </div>
              {!ordersLoading && (
                chemistOrder ? (
                  <button
                    onClick={() => { onClose(); router.push("/website/medicine-order"); }}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold active:scale-95 transition-all shadow-xs hover:shadow cursor-pointer"
                  >
                    View <FaArrowRight className="w-2.5 h-2.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShareTarget("chemist")}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0067A1] to-[#0080C6] hover:brightness-105 active:scale-95 text-white text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
                  >
                    <FaPaperPlane className="w-2.5 h-2.5" /> Order
                  </button>
                )
              )}
            </div>
          )}

          {/* Lab Order */}
          {combinedLabs.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#0067A1] text-white flex items-center justify-center shrink-0">
                  <FaFlask className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-500">Lab Order</p>
                  {ordersLoading ? (
                    <p className="text-xs font-semibold text-gray-400">Checking…</p>
                  ) : labOrder ? (
                    <div className="flex items-center gap-1.5">
                      <FaCheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-700 truncate">
                        {labOrder.status ? labOrder.status.charAt(0).toUpperCase() + labOrder.status.slice(1) : "Ordered"}
                        {labOrder.unid && <span className="text-gray-400 font-normal"> · #{labOrder.unid}</span>}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-gray-700">Not ordered yet</p>
                  )}
                </div>
              </div>
              {!ordersLoading && (
                labOrder ? (
                  <button
                    onClick={() => { onClose(); router.push("/website/dashboard/lab-booking/orders"); }}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold active:scale-95 transition-all shadow-xs hover:shadow cursor-pointer"
                  >
                    View <FaArrowRight className="w-2.5 h-2.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShareTarget("lab")}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:brightness-105 active:scale-95 text-white text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
                  >
                    <FaPaperPlane className="w-2.5 h-2.5" /> Book
                  </button>
                )
              )}
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-98 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      <AnimatePresence>
        {shareTarget && (
          <SharePrescriptionModal
            userId={data?.patient_id || data?.patient_details?.id || (typeof window !== "undefined" ? (localStorage.getItem("userId") || localStorage.getItem("user_id")) : null)}
            type={shareTarget}
            prescriptionId={data.id}
            prescriptionDisplayId={prescriptionId}
            medicines={medicines}
            labTests={combinedLabs}
            existingOrder={shareTarget === "chemist" ? chemistOrder : labOrder}
            onOrdersUpdated={async () => fetchOrders()}
            onClose={() => setShareTarget(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFulfillPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-none sm:rounded-3xl p-6 sm:p-8 max-w-md w-full h-[100dvh] sm:h-auto shadow-2xl border-0 sm:border sm:border-slate-100 flex flex-col justify-center items-center text-center animate-in zoom-in duration-200"
            >
              {/* Icon Container */}
              <div className="flex items-center justify-center gap-3 mb-5">
                {medicines.length > 0 && (
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm">
                    <FaPills className="w-5 h-5" />
                  </div>
                )}
                {combinedLabs.length > 0 && (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                    <FaFlask className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Fulfill e-Prescription?
              </h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                {medicines.length > 0 && combinedLabs.length > 0
                  ? "Your doctor has prescribed medicines and lab tests. Would you like to order your medicines and book your lab tests through MediConnect?"
                  : medicines.length > 0
                  ? "Your doctor has prescribed medicines. Would you like to order them through MediConnect's partner pharmacies?"
                  : "Your doctor has prescribed lab tests. Would you like to book them through MediConnect's partner labs?"}
              </p>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2.5">
                {medicines.length > 0 && !chemistOrder && (
                  <button
                    onClick={() => {
                      setShowFulfillPrompt(false);
                      setShareTarget("chemist");
                    }}
                    className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <FaPills className="w-4 h-4" /> Proceed with Medicines
                  </button>
                )}

                {combinedLabs.length > 0 && !labOrder && (
                  <button
                    onClick={() => {
                      setShowFulfillPrompt(false);
                      setShareTarget("lab");
                    }}
                    className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <FaFlask className="w-4 h-4" /> Proceed with Lab Tests
                  </button>
                )}

                <button
                  onClick={() => setShowFulfillPrompt(false)}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-2xl transition-all"
                >
                  No, Thank You
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
