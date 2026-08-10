"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/* ─── Helpers ────────────────────────────────────────────────────── */

function parseSignatureUrl(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] || null;
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try { const a = JSON.parse(raw); return Array.isArray(a) ? a[0] : raw; } catch { return raw; }
  }
  return raw;
}

function safeStr(val, fallback = "—") {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.filter(Boolean).join(", ") || fallback;
  if (typeof val === "string") {
    const t = val.trim();
    if (t.startsWith("[")) {
      try { const p = JSON.parse(t); if (Array.isArray(p)) return p.filter(Boolean).join(", ") || fallback; } catch {}
    }
    return t || fallback;
  }
  if (typeof val === "object") {
    const s = val.test_name || val.primary || val.notes || val.text || val.value || val.name || val.label;
    return s ? String(s) : JSON.stringify(val);
  }
  return fallback;
}

function fmtDate(str) {
  if (!str) return "N/A";
  const d = new Date(str);
  if (isNaN(d)) return String(str);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(str) {
  if (!str) return "N/A";
  const base = String(str).length > 5 ? String(str).slice(0, 5) : String(str);
  const [h, m] = base.split(":");
  const hNum = parseInt(h, 10);
  if (isNaN(hNum)) return base;
  return `${((hNum + 11) % 12) + 1}:${m} ${hNum >= 12 ? "PM" : "AM"}`;
}

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/* ─── Field row (dotted underline style like the template) ─────── */
function Field({ label, value }) {
  return (
    <div className="field">
      {label && <span className="field-label">{label}: </span>}
      <span className="filled-data">{value || "—"}</span>
    </div>
  );
}

function formatSpecialMessage(text) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} style={{ height: "4px" }} />;
        
        // Match [SECTION NAME]
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          const sectionTitle = trimmed.slice(1, -1).replace(/_/g, " ").toUpperCase();
          return (
            <div
              key={idx}
              style={{
                fontWeight: "bold",
                color: "#333",
                borderBottom: "1px solid #eee",
                paddingBottom: "2px",
                marginBottom: "6px",
                marginTop: "12px",
                fontSize: "11px",
                letterSpacing: "0.5px",
                textTransform: "uppercase"
              }}
            >
              {sectionTitle}
            </div>
          );
        }
        
        // Match key: value
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0) {
          const key = trimmed.slice(0, colonIdx).trim();
          const val = trimmed.slice(colonIdx + 1).trim();
          return (
            <div key={idx} style={{ padding: "2px 0", display: "flex", gap: "8px", fontSize: "12px" }}>
              <span style={{ color: "#666", fontWeight: "600", shrink: 0 }}>{key}:</span>
              <span style={{ color: "#0067A1", fontWeight: "700" }}>{val}</span>
            </div>
          );
        }
        
        // Plain text line
        return (
          <div key={idx} style={{ color: "#444", fontSize: "12px", lineHeight: "1.4" }}>
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

export default function LegalRecordPage() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/consultation/${id}/legal-record?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { if (data.success) setRecord(data.data); else setError(data.message || "Failed"); })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", fontFamily: "Segoe UI, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #ddd", borderTopColor: "#0080C6", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#666" }}>Loading record…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", fontFamily: "Segoe UI, sans-serif" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div><p style={{ color: "#666" }}>{error}</p></div>
    </div>
  );

  const { record_metadata, consultation, appointment, doctor, patient, prescriptions = [], medications = [] } = record;
  const rx = prescriptions[0] || null;
  const appt = appointment || consultation || {};
  const medicines = rx?.medicines || medications || [];
  const labTests = [
    ...(rx?.lab_tests || []).map(t => typeof t === "string" ? t : (t.test_name || t.name || "")),
    ...(Array.isArray(rx?.investigations)
      ? rx.investigations
      : (rx?.investigations?.requested || [])).map(inv => typeof inv === "string" ? inv : (inv.name || inv.test_name || ""))
  ].filter(Boolean);
  const vitals = rx?.vital_signs || {};
  const sigUrl = parseSignatureUrl(doctor?.signature_url);
  const docId = `MED-${doctor?.un_id || "0"}-${patient?.un_id || "0"}-${rx?.unid || rx?.id?.slice(0, 8) || appt?.unid || String(id).slice(0, 8).toUpperCase()}`;
  const age = calcAge(patient?.date_of_birth);
  const specialization = (() => {
    const raw = safeStr(rx?.specialization || doctor?.specialization);
    if (!raw || raw === "—") return "";
    return raw.split(",")[0].trim();
  })();
  const tagline = specialization && specialization !== "—"
    ? `${specialization} Care & Consultation`
    : "Teleconsultation Care & Consultation";
  const genAt = record_metadata?.generated_at;

  return (
    <>
      {/* Toolbar — hidden on print */}
      <div className="toolbar no-print">
        <button onClick={() => router.push("/website/appointments")} className="btn-back">← Back to Appointments</button>
        <span className="toolbar-brand">MediConnect · Legal Record</span>
        <button onClick={() => window.print()} className="btn-print">🖨 Print / Save PDF</button>
      </div>

      {/* Page shell */}
      <div className="body-bg">
        <div className="page">

          {/* ══ HEADER ══ */}
          <header className="header">
            <div className="logo-box">
              <img src="/real-logo.png" alt="MediConnect" />
            </div>
            <div className="title-box">
              <h1>MediConnect.fit</h1>
              <p className="tagline">{tagline}</p>
              <p className="email">📧 hello@mediconnect.fit</p>
            </div>
            <div className="cross-icon">
              <div className="medical-cross">
                <img src="/md-pdf/dr.png" alt="Doctor" />
              </div>
            </div>
          </header>

          {/* ══ TOP ROW ══ */}
          <div className="top-row">
            <div>Booking ID: <span className="filled-data">{docId}</span></div>
            <div>Date: <span className="filled-data">{fmtDate(appt?.appointment_date || appt?.created_at || record_metadata?.generated_at)}</span></div>
            <div>Time: <span className="filled-data">{fmtTime(appt?.appointment_time)}</span></div>
          </div>

          {/* ══ TELECONSULT NOTICE ══ */}
          <p className="note">
            This prescription is based solely on information provided during teleconsultation without physical
            examination. If symptoms worsen, seek in-person evaluation or emergency care immediately.
          </p>

          <hr />

          {/* ══ TWO COLUMNS ══ */}
          <div className="two-column">

            {/* ── LEFT ── */}
            <div className="column">

              <h3>DOCTOR DETAILS</h3>
              <Field label="Name" value={`Dr. ${safeStr(doctor?.full_name)}`} />
              <Field label="Qualification" value={safeStr(doctor?.qualification)} />
              <Field label="Specialization" value={specialization || "—"} />
              <Field label="Reg No." value={safeStr(doctor?.license_number)} />
              <Field label="Clinic" value={[doctor?.clinic_name, doctor?.clinic_address].filter(Boolean).join(", ") || "Virtual Consultation Only"} />

              <br />

              <h3>PROVISIONAL DIAGNOSIS</h3>
              <Field value={safeStr(rx?.diagnosis || consultation?.disease_info, "As per teleconsultation")} />

              {rx?.diagnosis_notes && (
                <>
                  <h4>CLINICAL NOTES</h4>
                  <Field value={safeStr(rx.diagnosis_notes)} />
                </>
              )}

              {rx?.examination_findings && (
                <>
                  <h4>EXAMINATION FINDINGS</h4>
                  <Field value={safeStr(rx.examination_findings)} />
                </>
              )}

              {Object.values(vitals).some(Boolean) && (
                <>
                  <h4>VITALS (Self-reported)</h4>
                  {Object.entries(vitals).map(([k, v]) =>
                    v ? <Field key={k} label={k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} value={safeStr(v)} /> : null
                  )}
                </>
              )}

              {labTests.length > 0 && (
                <>
                  <h4>INVESTIGATIONS / LAB TESTS ADVISED</h4>
                  {labTests.map((t, i) => <Field key={i} value={`${i + 1}. ${safeStr(t)}`} />)}
                </>
              )}

            </div>

            {/* ── RIGHT ── */}
            <div className="column">

              <h3>PATIENT DETAILS</h3>
              <Field label="Name" value={safeStr(patient?.full_name)} />
              <Field label="Gender" value={safeStr(patient?.gender)} />
              <Field label="Blood Group" value={safeStr(patient?.blood_group, "—")} />
              <Field label="Age" value={age ? `${age} Yrs` : "—"} />

              <div className="badge">{specialization.toUpperCase()} TELECONSULTATION</div>

              {(() => {
                let symp = {};
                let td = rx?.template_data || {};
                if (typeof td === 'string') {
                  try { td = JSON.parse(td); } catch { td = {}; }
                }
                if (td) {
                  if (td._dynamic_complaints && Array.isArray(td._dynamic_complaints)) {
                    td._dynamic_complaints.forEach(c => {
                      if (c.complaint) symp[c.complaint] = c.details || "Reported";
                    });
                  } else {
                    if (td['PRESENTING COMPLAINTS__fever']) symp['Fever / Chills'] = td['PRESENTING COMPLAINTS__fever'];
                    if (td['PRESENTING COMPLAINTS__cough']) symp['Cough / Cold / Sore throat'] = td['PRESENTING COMPLAINTS__cough'];
                    if (td['PRESENTING COMPLAINTS__headache']) symp['Headache / Bodyache'] = td['PRESENTING COMPLAINTS__headache'];
                    if (td['PRESENTING COMPLAINTS__gi_symptoms']) symp['Nausea / Vomiting / Diarrhea'] = td['PRESENTING COMPLAINTS__gi_symptoms'];
                    if (td['PRESENTING COMPLAINTS__weakness']) symp['Weakness / Fatigue'] = td['PRESENTING COMPLAINTS__weakness'];
                  }
                }
                if (Object.keys(symp).length > 0) {
                  return (
                    <>
                      <h3>PRESENTING COMPLAINTS</h3>
                      {Object.entries(symp).map(([k, v]) =>
                        v ? <Field key={k} label={k} value={String(v)} /> : null
                      )}
                    </>
                  );
                }
                return null;
              })()}

              <h3>CHIEF COMPLAINT</h3>
              <Field value={safeStr(rx?.disease_info || consultation?.disease_info, "As stated during consultation")} />

              {medicines.length > 0 && (
                <>
                  <h3>TREATMENT (Rx)</h3>
                  {medicines.map((med, idx) => (
                    <div className="field" key={idx}>
                      <span className="filled-data">
                        {idx + 1}. {safeStr(med.name || med.medicine_name)}
                        {(med.dosage || med.dose) ? ` — ${safeStr(med.dosage || med.dose)}` : ""}
                        {med.frequency ? `, ${safeStr(med.frequency)}` : ""}
                        {med.duration ? ` × ${safeStr(med.duration)}` : ""}
                        {(med.instructions || med.notes) ? `. ${safeStr(med.instructions || med.notes)}` : ""}
                      </span>
                    </div>
                  ))}
                </>
              )}

              <h3>FOLLOW-UP</h3>
              {rx?.follow_up_date && <Field label="Next Visit" value={fmtDate(rx.follow_up_date)} />}
              {rx?.follow_up_notes && <Field value={safeStr(rx.follow_up_notes)} />}
              {!rx?.follow_up_date && !rx?.follow_up_notes && <Field value="As advised during consultation" />}

              {rx?.special_message && (
                <>
                  <h4>SPECIAL ADVICE / CLINICAL NOTES</h4>
                  <div className="field-notes-container" style={{ padding: "8px 0" }}>
                    {formatSpecialMessage(rx.special_message)}
                  </div>
                </>
              )}

              <h3>DIGITAL SIGNATURE</h3>
              <Field label="Timestamp" value={genAt ? `${fmtDate(genAt)} ${fmtTime(new Date(genAt).toTimeString())}` : "—"} />
              <div className="field">
                {sigUrl
                  ? <img src={sigUrl} alt="Signature" style={{ height: 48, borderBottom: "1px solid #aaa", display: "block", marginTop: 8, paddingBottom: 4 }} />
                  : <span className="filled-data">[Digitally Signed — Dr. {safeStr(doctor?.full_name)}]</span>}
              </div>
              <Field label="Doctor" value={`Dr. ${safeStr(doctor?.full_name)}, ${safeStr(doctor?.license_number)}`} />

            </div>

          </div>

          {/* Footer */}
          <hr />
          <p className="small" style={{ textAlign: "center", marginTop: 8 }}>
            {record_metadata?.disclaimer || "This is a legally binding medical record. Ref ID: " + docId}
          </p>

        </div>
      </div>

      {/* ── Styles ── */}
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
          color: #333;
        }

        /* Toolbar */
        .toolbar {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 24px; background: #1e293b;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }
        .toolbar-brand { color: #94a3b8; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; }
        .btn-back { color: #94a3b8; background: none; border: 1px solid #334155; padding: 6px 16px; border-radius: 5px; font-size: 13px; cursor: pointer; font-family: inherit; }
        .btn-back:hover { background: #334155; color: #fff; }
        .btn-print { background: #0080C6; color: #fff; border: none; padding: 7px 20px; border-radius: 5px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn-print:hover { background: #0067A1; }

        /* Body background */
        .body-bg { background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%); min-height: 100vh; padding: 24px 16px 48px; }

        /* Page */
        .page {
          width: 210mm;
          min-height: 297mm;
          background: white;
          margin: 0 auto;
          padding: 25px;
          box-sizing: border-box;
          border-radius: 8px;
          box-shadow: 0 3px 15px rgba(0,0,0,0.12);
          position: relative;
        }

        /* Header */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 20px;
          background: linear-gradient(135deg, #66baf7 0%, #62bcfb 100%);
          border-radius: 8px;
          color: white;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }
        .logo-box img { width: 90px; height: 90px; border-radius: 50%; background: white; object-fit: contain; }
        .title-box { text-align: center; flex-grow: 1; }
        .title-box h1 { color: black; text-shadow: 2px 2px 4px rgba(0,0,0,0.4); margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 0.5px; }
        .tagline { margin: 5px 0 0; font-size: 14px; font-weight: 500; color: black; }
        .email { margin-top: 5px; font-size: 13px; color: black; }
        .cross-icon { display: flex; align-items: center; justify-content: center; }
        .medical-cross { width: 90px; height: 90px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .medical-cross img { height: 70px; width: 70px; }

        /* Top row */
        .top-row {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          margin-bottom: 0;
          font-weight: 600;
          background: #f0f7ff;
          padding: 12px 15px;
          border-radius: 6px;
          font-size: 13px;
        }

        /* Two column layout */
        .two-column { display: flex; gap: 25px; }
        .column { width: 50%; font-size: 12px; }

        h3 {
          border-bottom: 2px solid #000;
          margin-top: 12px;
          padding-bottom: 6px;
          font-size: 13px;
          color: #000;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        h4 {
          margin: 12px 0 6px;
          font-size: 13px;
          color: #000;
          font-weight: 600;
          border-left: 3px solid #0080C6;
          padding-left: 8px;
        }

        /* Badge */
        .badge {
          background: linear-gradient(135deg, #66baf7 0%, #62bcfb 100%);
          color: black;
          text-align: center;
          font-weight: 900;
          padding: 10px;
          margin: 12px 0;
          border-radius: 6px;
          display: block;
          font-size: 13px;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        p { margin: 8px 0; }

        hr {
          border: none;
          height: 1px;
          background: linear-gradient(90deg, transparent, #0080C6, transparent);
          margin: 15px 0;
        }

        /* Fields */
        .field {
          position: relative;
          padding-bottom: 5px;
          margin: 6px 0;
        }
        .field::after {
          content: "";
          position: absolute;
          bottom: 0; left: 0;
          width: 100%; height: 1px;
          background: repeating-linear-gradient(90deg, transparent, transparent 2px, #e0e0e0 2px, #e0e0e0 4px);
        }
        .field-label { font-weight: 600; color: #333; }
        .filled-data { color: #0067A1; font-weight: 500; }

        /* Note */
        .note {
          background: #fff8d6;
          padding: 12px;
          font-size: 12px;
          margin: 12px 0;
          border-radius: 6px;
          border-left: 4px solid #ffc107;
          font-style: italic;
        }

        .small { font-size: 11px; color: #666; }

        /* Print */
        .no-print {}

        @page { size: A4; margin: 0; }

        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: white !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .body-bg { background: white !important; padding: 0 !important; }
          .page { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; width: 100% !important; min-height: 100vh !important; padding: 15px !important; }
          .header { -webkit-print-color-adjust: exact; }
          .badge { -webkit-print-color-adjust: exact; }
          .note { -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
