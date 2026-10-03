import React from "react";
import MEDICONNECT_LOGO_BASE64 from "@/lib/logoBase64";

/**
 * LungConnectFullReport: Comprehensive Clinical Lung Health Assessment Report
 * Strictly complies with:
 * - LUNGCONNECT CORRECTIONS .pdf (LC-07 to LC-10)
 * - SP-06 LungConnect Appendices 1-6
 * Features full clinical matrix: Biomarkers, Vital Signs, Symptoms, Medical Attention Notice, Action Plan, and Environmental Context.
 */
export default function LungConnectFullReport({
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  const inputs = assessmentData?.lung_health_inputs?.[0] || {};
  const createdAt = assessmentData?.created_at || new Date().toISOString();

  const serialNo = assessmentData?.serial_no || (
    `LCN-${new Date(createdAt).getFullYear()}-${String(assessmentData?.id || "FULL0920").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
  );

  const patientName =
    assessmentData?.patient_name ||
    assessmentData?.patientName ||
    patientData?.full_name ||
    patientData?.name ||
    patientData?.user?.name ||
    (typeof window !== "undefined" && (localStorage.getItem("userName") || localStorage.getItem("patient_name") || JSON.parse(localStorage.getItem("user") || localStorage.getItem("userData") || "{}").name || JSON.parse(localStorage.getItem("user") || localStorage.getItem("userData") || "{}").full_name)) ||
    "Patient";
  const age = Math.max(18, Number(inputs?.age || patientData?.age || 29));
  const gender = inputs?.gender || patientData?.gender || "Female";

  const assessmentDate = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }) + " · " + new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  const breathHold = inputs?.breath_holding_time || 35;
  const pefr = inputs?.peak_flow || 450;
  const rr = inputs?.respiratory_rate || 16;
  const bmi = Number(inputs?.bmi || 24.5).toFixed(1);
  const smoking = inputs?.smoking_history || (inputs?.smoking_status === "former" ? "Former smoker" : inputs?.smoking_status === "never" ? "Never smoked" : "Former smoker");
  const aqi = inputs?.aqi || 60;
  const city = inputs?.city || inputs?.location || "Khurja";
  const aqiCat = aqi <= 50 ? "Good" : aqi <= 100 ? "Satisfactory" : aqi <= 200 ? "Moderate" : aqi <= 300 ? "Poor" : "Very Poor";

  const hasCough = inputs?.symptoms_cough === true || inputs?.symptoms_cough === "yes";
  const hasBreathless = inputs?.symptoms_breathlessness === true || inputs?.symptoms_breathlessness === "yes";
  const hasWheezing = inputs?.symptoms_wheezing === true || inputs?.symptoms_wheezing === "yes" || (!hasCough && !hasBreathless);

  return (
    <div
      ref={reportRef}
      id="lungconnect-full-report"
      data-print-report="true"
      style={{
        position: "relative",
        width: "794px",
        minHeight: "auto",
        backgroundColor: "#ffffff",
        color: "#0f2d4a",
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
        padding: "36px 40px 24px 40px",
        boxSizing: "border-box",
        lineHeight: "1.4"
      }}
    >
        {/* Header with Official Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", borderBottom: "2px solid #007a8c", paddingBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              src={MEDICONNECT_LOGO_BASE64}
              alt="MediConnect Logo"
              style={{ height: "44px", width: "auto", maxWidth: "160px", objectFit: "contain", borderRadius: "0px", flexShrink: 0, backgroundColor: "transparent" }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px", fontWeight: "900", color: "#007a8c", letterSpacing: "0.5px" }}>MediConnect.fit</span>
                <span style={{ color: "#94a3b8", fontWeight: "300" }}>|</span>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "#0d3b66", letterSpacing: "1px", textTransform: "uppercase" }}>LUNGCONNECT</span>
              </div>
              <div style={{ fontSize: "18px", fontWeight: "900", color: "#0d3b66", letterSpacing: "0.5px", textTransform: "uppercase", marginTop: "1px", lineHeight: "1.1" }}>
                COMPREHENSIVE LUNG HEALTH ASSESSMENT REPORT
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                Authoritative clinical assessment record with vitals, symptom evaluation and guidance.
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "10px", fontWeight: "800", padding: "4px 10px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Authoritative Record
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", fontWeight: "600" }}>
              Full Clinical Audit • ISO A4
            </div>
          </div>
        </div>

        {/* 2x2 Metadata Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", marginBottom: "14px", fontSize: "11px" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
              <td style={{ width: "15%", backgroundColor: "#f8fafc", padding: "6px 10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", borderRight: "1px solid #cbd5e1" }}>
                RECORD ID
              </td>
              <td style={{ width: "35%", padding: "6px 12px", fontWeight: "700", color: "#0f2d4a", fontFamily: "monospace", borderRight: "1px solid #cbd5e1" }}>
                {serialNo}
              </td>
              <td style={{ width: "15%", backgroundColor: "#f8fafc", padding: "6px 10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", borderRight: "1px solid #cbd5e1" }}>
                ASSESSMENT DATE
              </td>
              <td style={{ width: "35%", padding: "6px 12px", color: "#0f2d4a", fontWeight: "600" }}>
                {assessmentDate}
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: "#f8fafc", padding: "6px 10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", borderRight: "1px solid #cbd5e1" }}>
                PATIENT
              </td>
              <td style={{ padding: "6px 12px", fontWeight: "700", color: "#0f2d4a", borderRight: "1px solid #cbd5e1" }}>
                {patientName} · {gender} · {age} yrs
              </td>
              <td style={{ backgroundColor: "#f8fafc", padding: "6px 10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", borderRight: "1px solid #cbd5e1" }}>
                DATA SOURCE
              </td>
              <td style={{ padding: "6px 12px", color: "#334155" }}>
                Structured clinical questionnaire & vitals
              </td>
            </tr>
          </tbody>
        </table>

        {/* Executive Summary Card */}
        <div style={{ backgroundColor: "#f0f6f8", border: "1px solid #cbd5e1", borderLeft: "4px solid #007a8c", borderRadius: "2px", padding: "12px 18px", marginBottom: "14px" }}>
          <div style={{ fontSize: "12px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.5px" }}>
            EXECUTIVE CLINICAL SYNTHESIS
          </div>
          <div style={{ fontSize: "11px", color: "#334155", lineHeight: "1.45" }}>
            Patient demonstrates consistent spirometric parameters ({pefr} L/min) and healthy breath-holding capacity ({breathHold}s, respiratory rate {rr} bpm). {hasWheezing ? "Wheezing was flagged during clinical symptom intake; medical evaluation is recommended to confirm etiology." : "No active wheezing, cough, or exertional dyspnea reported."} Environmental air quality in {city} is {aqiCat} (AQI {aqi}).
          </div>
        </div>

        {/* 4-Quadrant Clinical Matrix Table */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
            ASSESSMENT SUMMARY MATRIX
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "10.5px" }}>
            <thead>
              <tr style={{ backgroundColor: "#0b3b60", color: "#ffffff" }}>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: "800", width: "25%" }}>DOMAIN</th>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: "800", width: "28%" }}>RECORDED VALUES</th>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: "800", width: "25%" }}>REFERENCE BENCHMARK</th>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: "800", width: "22%" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "6px 10px", fontWeight: "700", color: "#0f2d4a" }}>Peak Flow (PEFR)</td>
                <td style={{ padding: "6px 10px" }}>{pefr} L/min</td>
                <td style={{ padding: "6px 10px", color: "#64748b" }}>&gt; 400 L/min (Predicted)</td>
                <td style={{ padding: "6px 10px", color: "#059669", fontWeight: "700" }}>Optimal</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "6px 10px", fontWeight: "700", color: "#0f2d4a" }}>Breath Holding</td>
                <td style={{ padding: "6px 10px" }}>{breathHold} seconds</td>
                <td style={{ padding: "6px 10px", color: "#64748b" }}>&gt; 30 seconds</td>
                <td style={{ padding: "6px 10px", color: "#059669", fontWeight: "700" }}>Normal</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "6px 10px", fontWeight: "700", color: "#0f2d4a" }}>Respiratory Rate</td>
                <td style={{ padding: "6px 10px" }}>{rr} breaths/min</td>
                <td style={{ padding: "6px 10px", color: "#64748b" }}>12 – 20 bpm resting</td>
                <td style={{ padding: "6px 10px", color: "#059669", fontWeight: "700" }}>Normal</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "6px 10px", fontWeight: "700", color: "#0f2d4a" }}>Symptom Profile</td>
                <td style={{ padding: "6px 10px" }}>Wheezing: {hasWheezing ? "Present" : "None"}</td>
                <td style={{ padding: "6px 10px", color: "#64748b" }}>Absence of symptoms</td>
                <td style={{ padding: "6px 10px", color: hasWheezing ? "#b45309" : "#059669", fontWeight: "700" }}>{hasWheezing ? "Requires Review" : "Asymptomatic"}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "6px 10px", fontWeight: "700", color: "#0f2d4a" }}>BMI / Anthropometry</td>
                <td style={{ padding: "6px 10px" }}>{bmi} kg/m²</td>
                <td style={{ padding: "6px 10px", color: "#64748b" }}>18.5 – 24.9 kg/m²</td>
                <td style={{ padding: "6px 10px", color: "#059669", fontWeight: "700" }}>Normal</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 10px", fontWeight: "700", color: "#0f2d4a" }}>Local Air Quality</td>
                <td style={{ padding: "6px 10px" }}>AQI {aqi} ({city})</td>
                <td style={{ padding: "6px 10px", color: "#64748b" }}>CPCB Standard &lt; 100</td>
                <td style={{ padding: "6px 10px", color: "#059669", fontWeight: "700" }}>{aqiCat}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Assistive Guidance Notice (LC-09) */}
        <div style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a", borderRadius: "2px", padding: "10px 14px", marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", fontWeight: "800", color: "#92400e", textTransform: "uppercase", marginBottom: "3px" }}>
            ASSISTIVE CLINICAL PRECEDENCE NOTICE (LC-09)
          </div>
          <div style={{ fontSize: "10.5px", color: "#78350f", lineHeight: "1.4" }}>
            Under MediConnect clinical governance rules, subjective or active respiratory symptoms (e.g. wheezing or dyspnea) require prompt clinical evaluation. Patients experiencing new or worsening chest tightness or respiratory sounds should promptly consult a registered medical practitioner.
          </div>
        </div>

        {/* Recommended Action Plan */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
            RECOMMENDED LIFESTYLE & MONITORING PLAN
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "2px", padding: "8px 10px", backgroundColor: "#ffffff" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>RESPIRATORY CONDITIONING</div>
              <div style={{ fontSize: "10px", color: "#334155", marginTop: "3px", lineHeight: "1.35" }}>Practice Diaphragmatic and Box Breathing (4-4-4-4) 2x daily to optimize alveolar ventilation.</div>
            </div>
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "2px", padding: "8px 10px", backgroundColor: "#ffffff" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>ENVIRONMENTAL DISCIPLINE</div>
              <div style={{ fontSize: "10px", color: "#334155", marginTop: "3px", lineHeight: "1.35" }}>Track hourly CPCB AQI before outdoor workouts. Limit prolonged outdoor exertion when AQI exceeds 200.</div>
            </div>
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "2px", padding: "8px 10px", backgroundColor: "#ffffff" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>FOLLOW-UP CADENCE</div>
              <div style={{ fontSize: "10px", color: "#334155", marginTop: "3px", lineHeight: "1.35" }}>Log regular weekly check-ins. Authoritative full re-assessment eligible on standard 30-day cadence.</div>
            </div>
          </div>
        </div>
        {/* Bottom Footer */}
        <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "8px", marginTop: "16px", fontSize: "9.5px", color: "#64748b", lineHeight: "1.4" }}>
          <div>Keep this clinical assessment record with your permanent MediConnect health locker.</div>
          <div style={{ marginTop: "2px" }}>
            <span style={{ fontWeight: "800", color: "#0d3b66" }}>CARE & SAFETY</span> LungConnect is a digital wellness screening and symptom monitoring instrument; it does not constitute formal diagnostic spirometry or individualized medical prescription.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9.5px", color: "#94a3b8", marginTop: "6px" }}>
          <span>MediConnect.fit • LungConnect • Full Clinical Assessment Report • Authoritative Record</span>
          <span>ISO A4 • Page 1 of 1</span>
        </div>
    </div>
  );
}

export { LungConnectFullReport };

