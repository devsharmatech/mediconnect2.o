"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaTimes, FaPaperPlane, FaFlask, FaPills, FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
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

  const formatVital = (k, v) => {
    let val = String(v).trim();
    if (/[a-zA-Z%]/.test(val)) return val;
    const key = k.toLowerCase();
    if (key.includes('blood_pressure') || key === 'bp') return `${val} mmHg`;
    if (key.includes('pulse') || key === 'heart_rate') return `${val} bpm`;
    if (key.includes('temp')) return `${val} °F`;
    if (key.includes('weight')) return `${val} kg`;
    if (key.includes('height')) return `${val} cm`;
    if (key.includes('spo2') || key.includes('oxygen')) return `${val} %`;
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
    const raw = data.diagnosis;
    if (!raw) return "";
    if (typeof raw === "string") return raw;
    return safeStr(raw.primary || raw.diagnosis || "");
  })();
  const diagnosisNotes = (() => {
    const raw = data.diagnosis;
    if (!raw) return safeStr(data.diagnosis_notes);
    if (typeof raw === "string") return safeStr(data.diagnosis_notes);
    return safeStr(raw.notes);
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl h-[95dvh] sm:max-h-[96vh] flex flex-col overflow-hidden">

        {/* Modal toolbar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 flex-shrink-0">
          <span className="text-white font-semibold text-sm">Prescription View</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const el = document.getElementById('rx-print-area');
                if(!el) return;
                const w = window.open('', '_blank');
                w.document.write(`<html><head><title>Prescription</title><style>body{font-family:Segoe UI,sans-serif;margin:0;padding:0;} .no-print{display:none;} @media print{.no-print{display:none;}}</style></head><body>${el.innerHTML}</body></html>`);
                w.document.close();
                w.focus();
                w.print();
                w.close();
              }}
              className="px-4 py-1.5 bg-[#0080C6] text-white rounded-lg text-xs font-semibold hover:bg-[#0067A1] transition"
            >
              🖨 Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable prescription document — vertical scroll on all screens, horizontal scroll on mobile to preserve layout */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#f5f7fa] to-[#e4edf5] p-2 sm:p-4">
          {/* Inner wrapper: allows horizontal scroll on narrow screens without breaking prescription structure */}
          <div className="overflow-x-auto pb-2">
          <div id="rx-print-area" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', background: 'white', minWidth: 520, maxWidth: 860, margin: '0 auto', padding: 24, borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', color: '#333' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'linear-gradient(135deg,#66baf7 0%,#62bcfb 100%)', borderRadius: 8, marginBottom: 16 }}>
              <div>
                <img src="/real-logo.png" alt="logo" style={{ width: 72, height: 72, borderRadius: '50%', background: 'white', objectFit: 'contain' }} />
              </div>
              <div style={{ textAlign: 'center', flexGrow: 1 }}>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'black', textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>MediConnect.fit</h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'black', fontWeight: 500 }}>
                  {tagline}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'black' }}>📧 hello@mediconnect.fit</p>
              </div>
              <div style={{ width: 72, height: 72, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src="/md-pdf/dr.png" alt="dr" style={{ width: 56, height: 56 }} />
              </div>
            </div>

            {/* TOP ROW */}
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f0f7ff', padding: '10px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              <div>Booking ID: <span style={{ color: '#0067A1' }}>{prescriptionId}</span></div>
              <div>Date: <span style={{ color: '#0067A1' }}>{fmtDate(data.created_at)}</span></div>
              <div>Time: <span style={{ color: '#0067A1' }}>{fmtTime(appt.appointment_time || appt.time || data.created_at)}</span></div>
            </div>

            {/* NOTICE */}
            {isTele && (
              <div style={{ background: '#fff8d6', padding: '10px 14px', fontSize: 12, borderRadius: 6, borderLeft: '4px solid #ffc107', fontStyle: 'italic', marginBottom: 12 }}>
                This prescription is based solely on information provided during teleconsultation without physical examination. If symptoms worsen, seek in-person evaluation or emergency care immediately.
              </div>
            )}

            <hr style={{ border: 'none', height: 1, background: 'linear-gradient(90deg,transparent,#0080C6,transparent)', margin: '12px 0' }} />

            {/* TWO COLUMNS */}
            <div style={{ display: 'flex', gap: 20 }}>
              
              {/* LEFT COLUMN */}
              <div style={{ width: '50%', fontSize: 12 }}>
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
                  <span style={{ color: '#0067A1', fontWeight: 500 }}>{diagnosis || '—'}</span>
                </div>

                {vitals && Object.values(vitals).some(Boolean) && (
                  <>
                    <h4 style={{ margin: '12px 0 6px', fontSize: 12, fontWeight: 700, borderLeft: '3px solid #0080C6', paddingLeft: 8 }}>VITALS (Self-reported)</h4>
                    {Object.entries(vitals).map(([k, v]) =>
                      v ? (
                        <div key={k} style={{ position: 'relative', paddingBottom: 5, margin: '4px 0', borderBottom: '1px dotted #e0e0e0' }}>
                          <span style={{ fontWeight: 600 }}>{k.replace(/_/g, ' ')}: </span>
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
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ width: '50%', fontSize: 12 }}>
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

                <div style={{ background: 'linear-gradient(135deg,#66baf7,#62bcfb)', color: 'black', textAlign: 'center', fontWeight: 900, padding: 10, margin: '12px 0', borderRadius: 6, fontSize: 13, letterSpacing: '0.5px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
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
              </div>
            </div>

            <hr style={{ border: 'none', height: 1, background: 'linear-gradient(90deg,transparent,#0080C6,transparent)', margin: '14px 0 8px' }} />
            <p style={{ textAlign: 'center', fontSize: 10, color: '#888', margin: 0 }}>MediConnect Healthcare Services &middot; Ref ID: {prescriptionId}</p>
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
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors"
                  >
                    View <FaArrowRight className="w-2.5 h-2.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShareTarget("chemist")}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold transition-colors"
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
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors"
                  >
                    View <FaArrowRight className="w-2.5 h-2.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShareTarget("lab")}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold transition-colors"
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
            className="w-full py-2.5 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>

      </div>

      <AnimatePresence>
        {shareTarget && (
          <SharePrescriptionModal
            userId={typeof window !== "undefined" ? localStorage.getItem("userId") : null}
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
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in duration-200"
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
