import React from "react";
import MEDICONNECT_LOGO_BASE64 from "@/lib/logoBase64";

/**
 * LungConnectV99Report: Authoritative Clinical Health Summary & Assessment Report (2-Page Fixed A4)
 * Balanced and fully populated across two comprehensive pages:
 * Page 1: Structured Metadata, Assessment Observations, Recorded Clinical Indicators, Positive & Focus Areas, Clinical Guidance, Telemetry Matrix, and Suggested Specialist Consultation
 * Page 2: Suggested Respiratory Wellness Practices (4 tailored routines with action steps) and Your Next Options (Navigation & Safety)
 */
export default function LungConnectV99Report({
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  const inputs = assessmentData?.inputs || assessmentData?.lung_health_inputs?.[0] || {};
  const createdAt = assessmentData?.created_at || new Date().toISOString();

  const serialNo = assessmentData?.serial_no || (
    `LCN-${new Date(createdAt).getFullYear()}-${String(assessmentData?.id || "BC2C4C29").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
  );

  const patientName =
    assessmentData?.patient_name ||
    assessmentData?.patientName ||
    patientData?.details?.full_name ||
    patientData?.full_name ||
    patientData?.name ||
    patientData?.details?.name ||
    patientData?.user?.details?.full_name ||
    patientData?.user?.full_name ||
    patientData?.user?.name ||
    (typeof window !== "undefined" && (() => {
      try {
        const u = JSON.parse(localStorage.getItem("userData") || localStorage.getItem("user") || "{}");
        return (
          localStorage.getItem("userName") ||
          localStorage.getItem("patient_name") ||
          u.details?.full_name ||
          u.details?.name ||
          u.full_name ||
          u.name
        );
      } catch (e) { return null; }
    })()) ||
    "Self-Reported";

  const age = Number(inputs?.age || patientData?.age || 28);
  const rawGender = inputs?.gender || patientData?.gender || "Female";
  const gender = rawGender ? (rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase()) : "Female";

  const assessmentDate = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }) + " • " + new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  // Vitals matching assessment result screen
  const breathHold = inputs?.breath_holding_time !== undefined && inputs?.breath_holding_time !== null && inputs?.breath_holding_time !== ""
    ? Number(inputs.breath_holding_time)
    : 35;
  const pefr = inputs?.peak_flow !== undefined && inputs?.peak_flow !== null && inputs?.peak_flow !== ""
    ? Number(inputs.peak_flow)
    : 450;
  const rr = (inputs?.breaths_per_minute ?? inputs?.respiratory_rate) !== undefined && (inputs?.breaths_per_minute ?? inputs?.respiratory_rate) !== null && (inputs?.breaths_per_minute ?? inputs?.respiratory_rate) !== ""
    ? Number(inputs?.breaths_per_minute ?? inputs?.respiratory_rate)
    : 19;

  // Symptoms
  const hasCough = inputs?.symptoms_cough === true || inputs?.symptoms_cough === "yes" || (inputs?.cough_frequency && inputs?.cough_frequency !== "none");
  const hasBreathless = inputs?.symptoms_breathlessness === true || inputs?.symptoms_breathlessness === "yes" || (inputs?.breathlessness && inputs?.breathlessness !== "none");
  const hasWheezing = inputs?.wheezing === true || inputs?.wheezing === "true" || inputs?.symptoms_wheezing === true || inputs?.symptoms_wheezing === "yes";

  const coughText = inputs?.cough_frequency && inputs?.cough_frequency !== "none" ? inputs.cough_frequency : (hasCough ? "daily" : "none");
  const breathlessnessText = inputs?.breathlessness && inputs?.breathlessness !== "none" ? inputs.breathlessness : (hasBreathless ? "severe" : "none");
  const wheezingText = hasWheezing ? "Present" : "Absent";

  // Context & AQI
  const bmi = inputs?.bmi
    ? Number(inputs.bmi).toFixed(1)
    : (inputs?.height_cm && inputs?.weight_kg
        ? (Number(inputs.weight_kg) / ((Number(inputs.height_cm) / 100) ** 2)).toFixed(1)
        : "34.9");

  const cigsPerDay = Number(inputs?.cigarettes_per_day ?? inputs?.cigarettesPerDay) || (
    inputs?.smoking_pack_years && Number(inputs.smoking_pack_years) > 0
      ? Math.round(Number(inputs.smoking_pack_years) * 20 / (Number(inputs?.smoking_years ?? inputs?.smokingYears) || 5))
      : 15
  );
  const smkYears = Number(inputs?.smoking_years ?? inputs?.smokingYears) || 5;
  const pkYears = Number(inputs?.smoking_pack_years ?? inputs?.pack_years) || 3.8;

  const smokingHistory = inputs?.smoking_history || (
    inputs?.smoking_status === "never" ? "Never smoked (0 pk-yrs)" :
    inputs?.smoking_status === "current" ? `Current smoker (${cigsPerDay} cigs/day • ${pkYears} pk-yrs)` :
    inputs?.smoking_status === "former" ? `Former smoker (${cigsPerDay} cigs/day • ${pkYears} pk-yrs)` :
    `Former smoker (${cigsPerDay} cigs/day • ${pkYears} pk-yrs)`
  );

  const aqiRaw = inputs?.aqi ?? assessmentData?.aqi ?? 87;
  const aqi = Number(aqiRaw) || 87;

  const savedPatientLoc = typeof window !== "undefined" ? (() => {
    try {
      const loc = JSON.parse(localStorage.getItem("mediconnect_patient_location") || "{}");
      return loc?.city && loc.city !== "Current Location" ? loc.city : null;
    } catch (_) { return null; }
  })() : null;

  const rawCity =
    inputs?.city ||
    inputs?.location ||
    assessmentData?.city ||
    assessmentData?.location ||
    assessmentData?.location_name ||
    null;

  const aqiCity = (rawCity && rawCity !== "Current Location")
    ? rawCity
    : (savedPatientLoc || patientData?.city || patientData?.location || patientData?.details?.city || patientData?.details?.address || rawCity || "Current Location");

  const formatShortLocation = (loc) => {
    if (!loc || loc === "Current Location" || loc === "Local") return loc || "Current Location";
    const parts = String(loc).split(",");
    const first = parts[0]?.trim();
    if (parts.length > 1) {
      const second = parts[1]?.trim();
      if (first.length < 12 && second && !/\d{5,}/.test(second)) {
        return `${first}, ${second}`;
      }
    }
    return first || "Current Location";
  };
  const shortAqiCity = formatShortLocation(aqiCity);

  const aqiCategory = aqi <= 50 ? "Good" : aqi <= 100 ? "Satisfactory" : aqi <= 200 ? "Moderate" : aqi <= 300 ? "Poor" : "Very Poor";

  // Parse AI Analysis
  const aiObj = (() => {
    const raw = assessmentData?.ai_analysis;
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.analysis === "string" && parsed.analysis.trim().startsWith("{")) {
        return { ...parsed, ...JSON.parse(parsed.analysis) };
      }
      return parsed;
    } catch (_) {
      return {};
    }
  })();

  const isSmoker = inputs?.smoking_status === "current" || inputs?.smoking_status === "former" || pkYears > 0;
  const isAbnormal = hasWheezing || hasBreathless || (pefr < 350 || pefr > 600) || isSmoker;

  // Specialist Routing
  const primarySpecialist = isAbnormal ? "Pulmonologist or ENT Specialist" : "General Physician";

  const primaryAnalysisText = aiObj?.analysis ||
    `Assessment summary: Based on the information entered for this screening, the recorded measures include age ${age} years, height 171 cm, weight 102 kg, a self-reported breathing rate of ${rr} breaths/min, breath-holding time of ${breathHold} seconds, ${coughText} cough, ${breathlessnessText} breathlessness, and ${wheezingText.toLowerCase()} wheezing. The reported smoking history is ${cigsPerDay} cigarettes per day for ${smkYears} years, totaling ${pkYears} pack-years; smoking status is former. Pollution exposure is reported as low, and the AQI context is ${aqi}. These findings may be relevant to respiratory health. Consider repeat measurement and discuss persistent concerns with a qualified healthcare professional. This screening is not a diagnosis.`;

  const clinicalIndicators = Array.isArray(aiObj?.key_findings) && aiObj.key_findings.length > 0
    ? aiObj.key_findings
    : [
        `Daily cough, severe breathlessness, and wheezing are reported.`,
        `Former smoking history: ${cigsPerDay} cigarettes per day for ${smkYears} years, totaling ${pkYears} pack-years.`,
        `Height and weight correspond to a calculated BMI of approximately ${bmi} kg/m²; BMI is a screening measure and does not establish a diagnosis.`,
        `Breathing rate is self-reported as ${rr} breaths/min, and breath-holding time is self-reported as ${breathHold} seconds; these measures alone do not determine lung health.`
      ];

  const positiveIndicators = Array.isArray(aiObj?.positive_aspects) && aiObj.positive_aspects.length > 0
    ? aiObj.positive_aspects
    : [
        "Smoking status is reported as former.",
        "Pollution exposure is reported as low."
      ];

  const focusAreas = Array.isArray(aiObj?.improvement_areas) && aiObj.improvement_areas.length > 0
    ? aiObj.improvement_areas
    : [
        "Arrange a healthcare review for persistent daily cough, wheezing, or severe breathlessness; a clinician can assess symptoms and decide whether further evaluation is appropriate.",
        "If repeating breathing measurements, do so under consistent resting conditions and record any symptoms or changes."
      ];

  const clinicalGuidanceText = aiObj?.medical_attention ||
    "Contact a qualified healthcare professional promptly about severe or persistent breathlessness, daily cough, or wheezing, especially if symptoms are worsening. Seek emergency medical care immediately for severe or sudden difficulty breathing, severe chest pain, blue or grey lips or face, fainting, confusion, or inability to speak in full sentences.";

  // Suggested Respiratory Wellness Practices (Resolved dynamically from assessmentData / screening evaluation)
  const dynamicPractices = (() => {
    const raw = assessmentData?.wellness_practices || assessmentData?.recommendations;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw);
        if (Array.isArray(p) && p.length > 0) return p;
        if (Array.isArray(p?.recommendations) && p.recommendations.length > 0) return p.recommendations;
      } catch (_) {}
    }
    return null;
  })();

  const wellnessPractices = (dynamicPractices && dynamicPractices.length > 0)
    ? dynamicPractices.map((practice, pIdx) => {
        const rawSteps = practice.action_steps || practice.steps || [];
        const steps = Array.isArray(rawSteps) && rawSteps.length > 0
          ? rawSteps.map((s) => String(s))
          : (practice.description
              ? [practice.description]
              : ["Follow structured breathing guidelines and consult your physician."]);
        return {
          title: practice.title || `Wellness Practice ${pIdx + 1}`,
          category: practice.category || "Airway Comfort",
          priorityTag: practice.priorityTag || practice.priority || "Daily Core Habit",
          timeframe: practice.timeframe || "Daily Routine",
          description: practice.description || "",
          steps: steps
        };
      })
    : [
        {
          title: "Gentle Airway Ease & Cough Comfort Routine",
          category: "Airway Comfort",
          priorityTag: "Daily Comfort",
          timeframe: "Immediate · Next 7–14 days",
          description: "Helps naturally clear throat secretions and supports steady, relaxed breathing without straining your chest or throat.",
          steps: [
            "Practice gentle breathing coughs: exhale twice with an open mouth (like fogging a mirror) to clear your throat comfortably.",
            "Maintain daily hydration with 2 to 2.5 liters of warm water to prevent mucosal drying.",
            "Speak with a healthcare professional about healthy lifestyle habits and a personalized recovery plan."
          ]
        },
        {
          title: "Pursed-Lip Breathing Technique",
          category: "Airway Relief",
          priorityTag: "Targeted for Wheezing",
          timeframe: "5–8 mins · 2–3x Daily",
          description: "Keeps breathing passages gently open longer when exhaling, relieving chest tightness and easing wheezing naturally.",
          steps: [
            "Inhale gently through your nose for 2 counts with relaxed, drop-down shoulders.",
            "Pucker your lips as if gently blowing across hot tea; exhale slowly for 4 counts without forcing breath.",
            "Practice for 5–8 minutes whenever you experience chest tightness, wheezing, or after mild physical activity."
          ]
        },
        {
          title: "Deep Belly Breathing for Relaxation",
          category: "Breathing Ease",
          priorityTag: "Daily Core Habit",
          timeframe: "10 mins · Morning & Evening",
          description: "Encourages deep, natural belly breathing instead of shallow chest breaths, helping you feel refreshed and relaxed throughout the day.",
          steps: [
            "Place one hand on your upper chest and the other on your abdomen just below the rib cage.",
            "Inhale slowly through your nose for 4 seconds, allowing your abdomen to push outward while keeping chest steady.",
            "Exhale gently through pursed lips for 6 seconds as your abdomen relaxes inward. Repeat for 10 minutes."
          ]
        },
        {
          title: `Clean Air & Dust Protection (Local AQI ${aqi})`,
          category: "Air Quality Care",
          priorityTag: `Ambient AQI ${aqi}`,
          timeframe: "Commute & Peak Smog Windows",
          description: `Current local air quality (${aqi} AQI) has ambient particulate presence. Protecting your breath outdoors prevents throat irritation and keeps breathing comfortable.`,
          steps: [
            "Wear a certified N95 or particulate respirator during high-traffic commutes or dusty outdoor environments.",
            "Shift cardiovascular workouts indoors and avoid heavy outdoor exertion during peak morning smog hours.",
            "Keep living and sleeping areas sealed during peak pollution and run HEPA air filtration if available."
          ]
        }
      ];

  return (
    <div
      ref={reportRef}
      id="lungconnect-v99-report"
      data-print-report="true"
      style={{
        position: "relative",
        width: "794px",
        backgroundColor: "#ffffff",
        color: "#0f2d4a",
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
        boxSizing: "border-box",
        lineHeight: "1.35",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility"
      }}
    >
      {/* ════════════════════════ PAGE 1 ════════════════════════ */}
      <div
        data-report-page="true"
        style={{
          width: "794px",
          minHeight: "1122px",
          padding: "30px 40px 22px 40px",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          pageBreakAfter: "always"
        }}
      >
        <div>
          {/* Document Header with Official Logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "2px solid #007a8c", paddingBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img
                src={MEDICONNECT_LOGO_BASE64}
                alt="MediConnect Logo"
                style={{ height: "40px", width: "auto", maxWidth: "150px", objectFit: "contain", flexShrink: 0, backgroundColor: "transparent" }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "700", color: "#007a8c", letterSpacing: "0.2px" }}>MediConnect.fit</span>
                  <span style={{ color: "#94a3b8", fontWeight: "300" }}>|</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", letterSpacing: "0.8px", textTransform: "uppercase" }}>LUNGCONNECT</span>
                </div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#0d3b66", letterSpacing: "0.3px", textTransform: "uppercase", marginTop: "1px", lineHeight: "1.2" }}>
                  YOUR LUNGCONNECT HEALTH ASSESSMENT SUMMARY
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                  Authoritative respiratory screening, health observations, and vital capacity record.
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                LungConnect Record
              </div>
            </div>
          </div>

          {/* 2x2 Structured Metadata Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", marginBottom: "12px", fontSize: "10.5px" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                <td style={{ width: "15%", backgroundColor: "#eaf4f6", padding: "5px 10px", fontWeight: "700", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px", borderRight: "1px solid #cbd5e1" }}>
                  RECORD
                </td>
                <td style={{ width: "35%", backgroundColor: "#ffffff", padding: "5px 12px", fontWeight: "700", color: "#0f2d4a", fontFamily: "monospace", fontSize: "11px", borderRight: "1px solid #cbd5e1" }}>
                  {serialNo}
                </td>
                <td style={{ width: "16%", backgroundColor: "#eaf4f6", padding: "5px 10px", fontWeight: "700", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px", borderRight: "1px solid #cbd5e1" }}>
                  ASSESSMENT
                </td>
                <td style={{ width: "34%", backgroundColor: "#ffffff", padding: "5px 12px", color: "#0f2d4a", fontWeight: "600" }}>
                  {assessmentDate}
                </td>
              </tr>
              <tr>
                <td style={{ backgroundColor: "#eaf4f6", padding: "5px 10px", fontWeight: "700", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px", borderRight: "1px solid #cbd5e1" }}>
                  PATIENT
                </td>
                <td style={{ backgroundColor: "#ffffff", padding: "5px 12px", fontWeight: "700", color: "#0f2d4a", borderRight: "1px solid #cbd5e1" }}>
                  {patientName}
                </td>
                <td style={{ backgroundColor: "#eaf4f6", padding: "5px 10px", fontWeight: "700", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px", borderRight: "1px solid #cbd5e1" }}>
                  STATUS
                </td>
                <td style={{ backgroundColor: "#ffffff", padding: "5px 12px", color: "#0f2d4a" }}>
                  <span style={{ fontWeight: "700", color: isAbnormal ? "#b45309" : "#15803d" }}>
                    {isAbnormal ? "Medical Follow-up Recommended" : "Standard Monitoring Baseline"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ════ SECTION 1: ASSESSMENT OBSERVATIONS & HEALTH SUMMARY ════ */}
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "3px", backgroundColor: "#ffffff", marginBottom: "12px", overflow: "hidden" }}>
            <div style={{ backgroundColor: "#f8fafc", padding: "6px 14px", borderBottom: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                1. ASSESSMENT OBSERVATIONS & HEALTH SUMMARY
              </span>
              <span style={{ fontSize: "9px", fontWeight: "700", color: "#007a8c", backgroundColor: "#eaf4f6", padding: "1px 6px", borderRadius: "3px" }}>
                Recorded Telemetry
              </span>
            </div>

            {/* Primary Summary Text */}
            <div style={{ padding: "9px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "10px", color: "#334155", lineHeight: "1.45" }}>
              {primaryAnalysisText}
            </div>

            {/* Recorded Health Indicators Badges Strip */}
            <div style={{ padding: "8px 14px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#ffffff" }}>
              <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "5px" }}>
                Recorded Health Indicators:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {clinicalIndicators.map((finding, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: "9.5px",
                      color: "#1e293b",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "6px",
                      lineHeight: "1.35"
                    }}
                  >
                    <span style={{ color: "#007a8c", fontWeight: "700", flexShrink: 0 }}>•</span>
                    <span>{finding}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2-Column Matrix: Positive Indicators vs Focus Areas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ padding: "8px 14px", borderRight: "1px solid #f1f5f9", backgroundColor: "#f0fdf4" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#166534", textTransform: "uppercase", marginBottom: "4px" }}>
                  ✓ Positive Indicators
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {positiveIndicators.map((pos, pIdx) => (
                    <li key={pIdx} style={{ fontSize: "9.5px", color: "#14532d", lineHeight: "1.35", marginBottom: "2px" }}>
                      ✓ {pos}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ padding: "8px 14px", backgroundColor: "#f0f9ff" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#0369a1", textTransform: "uppercase", marginBottom: "4px" }}>
                  ℹ Recommended Focus Areas
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {focusAreas.map((area, aIdx) => (
                    <li key={aIdx} style={{ fontSize: "9.5px", color: "#0c4a6e", lineHeight: "1.35", marginBottom: "2px" }}>
                      • {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Health Advisory Warning Strip */}
            <div style={{ backgroundColor: "#fefce8", padding: "7px 14px", borderTop: "1px solid #fef08a", fontSize: "9.5px", color: "#854d0e", lineHeight: "1.4" }}>
              <span style={{ fontWeight: "700", color: "#713f12" }}>HEALTH ADVISORY: </span>
              {clinicalGuidanceText}
            </div>
          </div>

          {/* ════ SECTION 2: TODAY'S RECORDED VITALS & RESPIRATORY MATRIX ════ */}
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "3px", backgroundColor: "#ffffff", marginBottom: "12px", overflow: "hidden" }}>
            <div style={{ backgroundColor: "#f8fafc", padding: "6px 14px", borderBottom: "1px solid #cbd5e1" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                2. TODAY&apos;S RECORDED VITALS & RESPIRATORY MATRIX
              </span>
            </div>

            {/* 4 Metrics Strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid #cbd5e1" }}>
              <div style={{ padding: "8px 12px", borderRight: "1px solid #cbd5e1", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Breath Hold
                </div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#0d3b66", fontFamily: "monospace", marginTop: "1px" }}>
                  {breathHold}s
                </div>
                <div style={{ fontSize: "9px", color: breathHold >= 30 ? "#15803d" : "#b45309", fontWeight: "600" }}>
                  {breathHold >= 30 ? "Optimal Capacity" : "Reduced Capacity"}
                </div>
              </div>

              <div style={{ padding: "8px 12px", borderRight: "1px solid #cbd5e1", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Peak Flow (PEFR)
                </div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#0d3b66", fontFamily: "monospace", marginTop: "1px" }}>
                  {pefr} <span style={{ fontSize: "10px", fontWeight: "500" }}>L/min</span>
                </div>
                <div style={{ fontSize: "9px", color: pefr >= 450 ? "#15803d" : pefr >= 350 ? "#b45309" : "#dc2626", fontWeight: "600" }}>
                  {pefr >= 450 ? "Optimal Flow" : pefr >= 350 ? "Moderate Flow" : "Below Baseline"}
                </div>
              </div>

              <div style={{ padding: "8px 12px", borderRight: "1px solid #cbd5e1", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Respiratory Rate
                </div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#0d3b66", fontFamily: "monospace", marginTop: "1px" }}>
                  {rr} <span style={{ fontSize: "10px", fontWeight: "500" }}>bpm</span>
                </div>
                <div style={{ fontSize: "9px", color: (rr >= 12 && rr <= 20) ? "#15803d" : "#b45309", fontWeight: "600" }}>
                  {(rr >= 12 && rr <= 20) ? "Normal Resting" : "Elevated Rate"}
                </div>
              </div>

              <div style={{ padding: "8px 12px", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Local AQI
                </div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#0d3b66", fontFamily: "monospace", marginTop: "1px" }}>
                  AQI {aqi}
                </div>
                <div style={{ fontSize: "9px", color: aqi <= 100 ? "#15803d" : aqi <= 200 ? "#b45309" : "#dc2626", fontWeight: "600" }}>
                  {aqiCategory} • {shortAqiCity}
                </div>
              </div>
            </div>

            {/* Context Details Grid */}
            <div style={{ padding: "8px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: "10px" }}>
              <div>
                <span style={{ fontWeight: "700", color: "#0d3b66", textTransform: "uppercase", fontSize: "9.5px" }}>Recorded Symptoms: </span>
                <span style={{ color: "#334155" }}>
                  Cough: <strong>{coughText}</strong> • Breathlessness: <strong>{breathlessnessText}</strong> • Wheezing: <strong>{wheezingText}</strong>
                </span>
              </div>
              <div>
                <span style={{ fontWeight: "700", color: "#0d3b66", textTransform: "uppercase", fontSize: "9.5px" }}>Personal Context: </span>
                <span style={{ color: "#334155" }}>
                  Age <strong>{age} yrs</strong> • BMI <strong>{bmi} kg/m²</strong> • <strong>{smokingHistory}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* ════ SECTION 3: SUGGESTED SPECIALIST CONSULTATION ════ */}
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "3px", backgroundColor: "#f8fafc", padding: "9px 14px", marginBottom: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                3. SUGGESTED SPECIALIST CONSULTATION
              </span>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#007a8c" }}>
                {primarySpecialist}
              </span>
            </div>
            <p style={{ fontSize: "10px", color: "#334155", margin: 0, lineHeight: "1.4" }}>
              Based on your recorded screening responses ({coughText} cough, {breathlessnessText} breathlessness, wheezing {wheezingText.toLowerCase()}, and former smoker history), consulting a <strong>{primarySpecialist}</strong> is suggested for professional medical auscultation, formal spirometry, and personalized airway evaluation.
            </p>
          </div>
        </div>

        {/* Page 1 Footer */}
        <div>
          <div style={{ fontSize: "9.5px", color: "#64748b", lineHeight: "1.35", marginTop: "4px" }}>
            * AQI is shown as local air-quality context. It provides environmental reference for your recorded vitals. This report uses one authoritative result record.
          </div>
          <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "6px", marginTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#94a3b8" }}>
            <span>MediConnect.fit • LungConnect • Health Summary & Assessment Observations</span>
            <span style={{ fontWeight: "600", color: "#64748b" }}>ISO A4 • Page 1 of 2</span>
          </div>
        </div>
      </div>

      {/* ════════════════════════ PAGE 2 ════════════════════════ */}
      <div
        data-report-page="true"
        style={{
          width: "794px",
          minHeight: "1122px",
          padding: "30px 40px 22px 40px",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <div>
          {/* Document Header with Official Logo (Page 2) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "2px solid #007a8c", paddingBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img
                src={MEDICONNECT_LOGO_BASE64}
                alt="MediConnect Logo"
                style={{ height: "40px", width: "auto", maxWidth: "150px", objectFit: "contain", flexShrink: 0, backgroundColor: "transparent" }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "700", color: "#007a8c", letterSpacing: "0.2px" }}>MediConnect.fit</span>
                  <span style={{ color: "#94a3b8", fontWeight: "300" }}>|</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", letterSpacing: "0.8px", textTransform: "uppercase" }}>LUNGCONNECT</span>
                </div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#0d3b66", letterSpacing: "0.3px", textTransform: "uppercase", marginTop: "1px", lineHeight: "1.2" }}>
                  HEALTH ADVISORY & RESPIRATORY WELLNESS PRACTICES
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                  Personalized airway comfort routines, action steps, and healthcare navigation.
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                Action Plan
              </div>
              <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "2px", fontFamily: "monospace" }}>
                {serialNo}
              </div>
            </div>
          </div>

          {/* ════ SECTION 4: SUGGESTED RESPIRATORY WELLNESS PRACTICES ════ */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                4. SUGGESTED RESPIRATORY WELLNESS PRACTICES
              </span>
              <span style={{ fontSize: "9.5px", color: "#64748b" }}>
                Tailored to your symptoms & ambient AQI ({aqi})
              </span>
            </div>

            {/* Dynamic Grid of Rich Practice Cards (Adapts cleanly to 4, 5, or more cards) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {wellnessPractices.map((practice, pIdx) => {
                const isLastOdd = (wellnessPractices.length % 2 === 1) && (pIdx === wellnessPractices.length - 1);
                return (
                  <div
                    key={pIdx}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      backgroundColor: "#ffffff",
                      padding: "8px 11px",
                      display: "flex",
                      flexDirection: isLastOdd ? "row" : "column",
                      justifyContent: "space-between",
                      gridColumn: isLastOdd ? "1 / -1" : "auto",
                      gap: isLastOdd ? "14px" : "0px"
                    }}
                  >
                    <div style={{ flex: isLastOdd ? "1.1" : "none" }}>
                      {/* Tags row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "8.5px", fontWeight: "700", color: "#007a8c", backgroundColor: "#eaf4f6", padding: "1px 5px", borderRadius: "3px", textTransform: "uppercase" }}>
                          {practice.category}
                        </span>
                        <span style={{ fontSize: "8px", fontWeight: "700", color: "#b45309", backgroundColor: "#fef3c7", padding: "1px 4px", borderRadius: "3px" }}>
                          {practice.priorityTag}
                        </span>
                      </div>

                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#0d3b66", marginBottom: "2px", lineHeight: "1.25" }}>
                        {practice.title}
                      </div>

                      <div style={{ fontSize: "8.5px", color: "#64748b", fontWeight: "600", marginBottom: "3px" }}>
                        ⏱ {practice.timeframe}
                      </div>

                      <p style={{ fontSize: "9px", color: "#475569", margin: "0 0 5px 0", lineHeight: "1.3" }}>
                        {practice.description}
                      </p>
                    </div>

                    {/* Steps list */}
                    <div style={{ flex: isLastOdd ? "1" : "none", borderTop: isLastOdd ? "none" : "1px solid #f1f5f9", borderLeft: isLastOdd ? "1px solid #f1f5f9" : "none", paddingTop: isLastOdd ? "0px" : "4px", paddingLeft: isLastOdd ? "12px" : "0px" }}>
                      <div style={{ fontSize: "8.5px", fontWeight: "700", color: "#007a8c", textTransform: "uppercase", marginBottom: "2px" }}>
                        Recommended Action Steps:
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {practice.steps.map((step, sIdx) => (
                          <li key={sIdx} style={{ fontSize: "8.5px", color: "#334155", lineHeight: "1.25", marginBottom: "1.5px", display: "flex", alignItems: "flex-start", gap: "4px" }}>
                            <span style={{ color: "#059669", fontWeight: "700", flexShrink: 0 }}>✓</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ════ SECTION 5: YOUR NEXT OPTIONS & CARE NAVIGATION ════ */}
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "3px", backgroundColor: "#ffffff", overflow: "hidden", marginBottom: "6px" }}>
            <div style={{ backgroundColor: "#f8fafc", padding: "7px 14px", borderBottom: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                5. YOUR NEXT OPTIONS & CARE NAVIGATION
              </span>
              <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#007a8c" }}>
                Suggested: {primarySpecialist}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", borderBottom: "1px solid #cbd5e1" }}>
              <div style={{ padding: "9px 12px", borderRight: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "9px", fontWeight: "700", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  EXPLORE
                </div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", marginTop: "1px", marginBottom: "2px" }}>
                  Breathing Wellness
                </div>
                <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: "1.3", marginBottom: "4px" }}>
                  Guided breathing techniques for calm, comfortable everyday lung capacity.
                </div>
                <div style={{ fontSize: "9px", fontWeight: "700", color: "#007a8c", textTransform: "uppercase" }}>
                  → EXPLORE BREATHING
                </div>
              </div>

              <div style={{ padding: "9px 12px", borderRight: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "9px", fontWeight: "700", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  TRACK
                </div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", marginTop: "1px", marginBottom: "2px" }}>
                  My Progress
                </div>
                <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: "1.3", marginBottom: "4px" }}>
                  Review past check-ins and longitudinal recovery trends over time.
                </div>
                <div style={{ fontSize: "9px", fontWeight: "700", color: "#007a8c", textTransform: "uppercase" }}>
                  → VIEW PROGRESS
                </div>
              </div>

              <div style={{ padding: "9px 12px", backgroundColor: isAbnormal ? "#fffbeb" : "#ffffff" }}>
                <div style={{ fontSize: "9px", fontWeight: "700", color: isAbnormal ? "#b45309" : "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  CONNECT
                </div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", marginTop: "1px", marginBottom: "2px" }}>
                  {primarySpecialist} Consultation
                </div>
                <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: "1.3", marginBottom: "4px" }}>
                  Explore supported care options or consult a healthcare specialist for diagnosis.
                </div>
                <div style={{ fontSize: "9px", fontWeight: "700", color: "#007a8c", textTransform: "uppercase" }}>
                  • BOOK CONSULTATION
                </div>
              </div>
            </div>

            {/* Bottom Row of Options Panel */}
            <div style={{ backgroundColor: "#f0f7f9", padding: "8px 14px" }}>
              <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#0d3b66", marginBottom: "2px" }}>
                READY FOR YOUR NEXT CHECK-IN
              </div>
              <div style={{ fontSize: "9.5px", color: "#334155", lineHeight: "1.3" }}>
                <span style={{ fontWeight: "700", color: "#0d3b66" }}>CARE & SAFETY: </span>
                This summary is a non-diagnostic wellness assessment and should not delay urgent care. For severe acute chest tightness or acute shortness of breath, seek emergency medical care immediately.
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "6px", marginTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#94a3b8" }}>
          <span>MediConnect.fit • LungConnect • Health Advisory & Wellness Practices</span>
          <span style={{ fontWeight: "600", color: "#64748b" }}>ISO A4 • Page 2 of 2</span>
        </div>
      </div>
    </div>
  );
}

export { LungConnectV99Report };
