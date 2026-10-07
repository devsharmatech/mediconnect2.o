import React from "react";
import MEDICONNECT_LOGO_BASE64 from "@/lib/logoBase64";

/**
 * LungConnectV99Report: Authoritative Clinical Report (Multi-page A4 Fixed)
 * Features 2 comprehensive pages:
 * Page 1: Vitals, Symptoms, Biomarkers, Check-in Matrix & Next Options
 * Page 2: Suggested Specialist Consultation, Suggested Respiratory Wellness Practices & Clinical Indicators
 */
export default function LungConnectV99Report({
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  const inputs = assessmentData?.lung_health_inputs?.[0] || assessmentData?.inputs || {};
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
          u.name ||
          u.user?.details?.full_name ||
          u.user?.name
        );
      } catch (e) { return null; }
    })()) ||
    "Patient";
  const age = Math.max(18, Number(inputs?.age || patientData?.age || 29));
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

  // Vitals
  const rawBreathHold = inputs?.breath_holding_time !== undefined && inputs?.breath_holding_time !== null && inputs?.breath_holding_time !== "" ? Number(inputs.breath_holding_time) : null;
  const rawPefr = inputs?.peak_flow !== undefined && inputs?.peak_flow !== null && inputs?.peak_flow !== "" ? Number(inputs.peak_flow) : null;
  const rawRr = (inputs?.breaths_per_minute ?? inputs?.respiratory_rate) !== undefined && (inputs?.breaths_per_minute ?? inputs?.respiratory_rate) !== null ? Number(inputs?.breaths_per_minute ?? inputs?.respiratory_rate) : null;

  const breathHold = rawBreathHold !== null ? rawBreathHold : "—";
  const pefr = rawPefr !== null ? rawPefr : "—";
  const rr = rawRr !== null ? rawRr : "—";

  // Symptoms
  const hasCough = inputs?.symptoms_cough === true || inputs?.symptoms_cough === "yes" || (inputs?.cough_frequency && inputs?.cough_frequency !== "none");
  const hasBreathless = inputs?.symptoms_breathlessness === true || inputs?.symptoms_breathlessness === "yes" || (inputs?.breathlessness && inputs?.breathlessness !== "none");
  const hasWheezing = inputs?.wheezing === true || inputs?.wheezing === "true" || inputs?.symptoms_wheezing === true || inputs?.symptoms_wheezing === "yes";

  const coughText = inputs?.cough_frequency && inputs?.cough_frequency !== "none" ? inputs.cough_frequency : (hasCough ? "present" : "none");
  const breathlessnessText = inputs?.breathlessness && inputs?.breathlessness !== "none" ? inputs.breathlessness : (hasBreathless ? "present" : "none");
  const wheezingText = hasWheezing ? "present" : "none";

  // Context & AQI
  const bmi = inputs?.bmi ? Number(inputs.bmi).toFixed(1) : "—";
  const cigsPerDay = Number(inputs?.cigarettes_per_day ?? inputs?.cigarettesPerDay) || (
    inputs?.smoking_pack_years && Number(inputs.smoking_pack_years) > 0
      ? Math.round(Number(inputs.smoking_pack_years) * 20 / (Number(inputs?.smoking_years ?? inputs?.smokingYears) || 5))
      : 0
  );
  const smkYears = Number(inputs?.smoking_years ?? inputs?.smokingYears) || 0;
  const pkYears = Number(inputs?.smoking_pack_years ?? inputs?.pack_years) || 0;

  const smokingHistory = inputs?.smoking_history || (
    inputs?.smoking_status === "never" ? "Never smoked" :
    inputs?.smoking_status === "current" ? (
      cigsPerDay > 0
        ? `Current smoker (${cigsPerDay} cigs/day${smkYears ? ` • ${smkYears} yrs` : ""} • ${pkYears} pk-yrs)`
        : `Current smoker (${pkYears > 0 ? `${pkYears} pack-years` : "active"})`
    ) :
    inputs?.smoking_status === "former" ? (
      cigsPerDay > 0
        ? `Former smoker (${cigsPerDay} cigs/day${smkYears ? ` • ${smkYears} yrs` : ""} • ${pkYears} pk-yrs)`
        : `Former smoker (${pkYears > 0 ? `${pkYears} pack-years` : "quit"})`
    ) :
    "Never smoked"
  );
  const aqiRaw = inputs?.aqi ?? assessmentData?.aqi ?? null;
  const aqi = aqiRaw !== null ? Number(aqiRaw) : "—";
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

  const aqiCategory = aqi !== "—" ? (aqi <= 50 ? "Good" : aqi <= 100 ? "Satisfactory" : aqi <= 200 ? "Moderate" : aqi <= 300 ? "Poor" : "Very Poor") : "Unspecified";

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
  const isAbnormal = hasWheezing || hasBreathless || (rawPefr !== null && rawPefr < 350) || isSmoker;

  // Specialist Routing
  const primarySpecialist = isAbnormal ? "Pulmonologist" : "General Physician";
  const specialistRecommendation = isAbnormal
    ? "Based on your recorded screening responses (wheezing symptoms / breathlessness / smoking history), consulting a Pulmonologist is recommended for formal spirometry, clinical auscultation, and personalized airway evaluation."
    : "Based on recorded screening responses, no acute airway obstruction was noted. Routine preventive check-ins with your General Physician are recommended.";

  const hasEntRecommendation = hasCough;

  // Suggested Respiratory Wellness Practices
  const wellnessPractices = [
    {
      title: "Pursed-Lip Breathing Technique",
      category: "Airway Relief",
      priorityTag: hasWheezing ? "Targeted for Wheezing" : "Airway Ease",
      timeframe: "5–8 mins · 2–3x Daily",
      description: "Keeps breathing passages gently open longer when exhaling, relieving chest tightness and easing wheezing naturally.",
      steps: [
        "Inhale gently through your nose for 2 counts with relaxed, drop-down shoulders.",
        "Pucker your lips as if gently blowing across hot tea; exhale slowly for 4 counts without forcing breath.",
        "Practice for 5–8 minutes whenever you experience chest tightness, wheezing, or after physical activity."
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
      priorityTag: `Ambient Smog · AQI ${aqi}`,
      timeframe: "Commute & Peak Smog Windows",
      description: `Current local air quality (${aqi} AQI) has elevated particulate exposure. Protecting your breath outdoors prevents throat irritation and keeps breathing comfortable.`,
      steps: [
        "Wear a certified N95 or particulate respirator during high-traffic commutes or dusty outdoor environments.",
        "Shift cardiovascular workouts indoors and avoid heavy outdoor exertion during peak morning smog hours.",
        "Keep living areas sealed during high-pollution windows and run HEPA air filtration if available."
      ]
    },
    isSmoker || hasCough
      ? {
          title: "Gentle Airway Ease & Cough Comfort Routine",
          category: "Airway Comfort",
          priorityTag: "Daily Comfort",
          timeframe: "Immediate · Next 7–14 days",
          description: "Helps naturally clear throat secretions and supports steady, relaxed breathing without straining your chest or throat.",
          steps: [
            "Practice gentle breathing coughs: exhale twice with an open mouth (like fogging a mirror) to clear your throat comfortably.",
            "Maintain daily hydration with 2 to 2.5 liters of warm water to prevent mucosal drying.",
            "Speak with a healthcare professional about healthy lifestyle habits and personalized airway recovery."
          ]
        }
      : {
          title: "Daily Gentle Walking for Stamina",
          category: "Active Living",
          priorityTag: "Comfortable Pace",
          timeframe: "20–30 mins/day · 5 days/week",
          description: "Builds steady stamina and daily energy while keeping your lungs active at an easy, comfortable walking pace.",
          steps: [
            "Walk briskly at a steady rhythm where you can speak comfortably in full sentences without gasping (talk test).",
            "Walk indoors or outside during clean-air afternoon windows when particulate pollution is lowest.",
            "Perform light shoulder and chest stretches before and after your walk."
          ]
        }
  ];

  // Clinical Indicators & Focus Areas
  const clinicalIndicators = Array.isArray(aiObj.key_findings) && aiObj.key_findings.length > 0
    ? aiObj.key_findings
    : [
        `Breath-holding capacity: ${breathHold !== "—" ? `${breathHold}s` : "Recorded"}`,
        `Respiratory rate: ${rr !== "—" ? `${rr} breaths/min` : "Recorded"}`,
        `Smoking history: ${smokingHistory}`,
        `Expiratory symptoms: ${hasWheezing ? "Wheezing reported" : "No wheezing"}`,
        `Cough frequency: ${coughText}`,
        `Local air quality: AQI ${aqi}`
      ];

  const positiveIndicators = Array.isArray(aiObj.positive_aspects) && aiObj.positive_aspects.length > 0
    ? aiObj.positive_aspects
    : [
        "Completed structured health assessment",
        "Proactive respiratory health monitoring",
        inputs?.smoking_status === "never" ? "Non-smoker baseline preserved" : "Recorded baseline for longitudinal tracking"
      ];

  const focusAreas = Array.isArray(aiObj.improvement_areas) && aiObj.improvement_areas.length > 0
    ? aiObj.improvement_areas
    : [
        hasWheezing ? "Monitor whether wheezing persists, recurs, or is associated with activity or triggers" : "Maintain regular respiratory exercise cadence",
        isSmoker ? "Prioritize smoking cessation guidance to reduce chronic airway remodeling" : "Practice daily deep breathing exercises",
        "Adopt outdoor N95 particulate mask protocol during high-pollution periods (AQI > 150)",
        "Schedule follow-up check-in to track progress against today's baseline"
      ];

  const clinicalGuidanceText = aiObj.medical_attention ||
    "Discuss persistent, recurring, or worsening symptoms with a qualified physician. Seek emergency clinical care immediately for severe acute shortness of breath or radiating chest tightness.";

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
        lineHeight: "1.4",
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
          padding: "36px 44px 28px 44px",
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "2px solid #007a8c", paddingBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <img
                src={MEDICONNECT_LOGO_BASE64}
                alt="MediConnect Logo"
                style={{ height: "44px", width: "auto", maxWidth: "160px", objectFit: "contain", borderRadius: "0px", flexShrink: 0, backgroundColor: "transparent" }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "17px", fontWeight: "700", color: "#007a8c", letterSpacing: "0.2px" }}>MediConnect.fit</span>
                  <span style={{ color: "#94a3b8", fontWeight: "300" }}>|</span>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#0d3b66", letterSpacing: "0.8px", textTransform: "uppercase" }}>LUNGCONNECT</span>
                </div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#0d3b66", letterSpacing: "0.3px", textTransform: "uppercase", marginTop: "1px", lineHeight: "1.2" }}>
                  YOUR LUNGCONNECT HEALTH SUMMARY
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Authoritative respiratory wellness and vital capacity record.
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "10px", fontWeight: "600", padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                LungConnect Record
              </div>
            </div>
          </div>

          {/* 2x2 Clean Structured Metadata Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", marginBottom: "18px", fontSize: "11px" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                <td style={{ width: "15%", backgroundColor: "#eaf4f6", padding: "6px 12px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px", borderRight: "1px solid #cbd5e1" }}>
                  RECORD
                </td>
                <td style={{ width: "35%", backgroundColor: "#ffffff", padding: "6px 14px", fontWeight: "600", color: "#0f2d4a", fontFamily: "monospace", fontSize: "11.5px", borderRight: "1px solid #cbd5e1" }}>
                  {serialNo}
                </td>
                <td style={{ width: "16%", backgroundColor: "#eaf4f6", padding: "6px 12px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px", borderRight: "1px solid #cbd5e1" }}>
                  ASSESSMENT
                </td>
                <td style={{ width: "34%", backgroundColor: "#ffffff", padding: "6px 14px", color: "#0f2d4a", fontWeight: "500" }}>
                  {assessmentDate}
                </td>
              </tr>
              <tr>
                <td style={{ backgroundColor: "#eaf4f6", padding: "6px 12px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px", borderRight: "1px solid #cbd5e1" }}>
                  PATIENT
                </td>
                <td style={{ backgroundColor: "#ffffff", padding: "6px 14px", fontWeight: "600", color: "#0f2d4a", borderRight: "1px solid #cbd5e1" }}>
                  {patientName}
                </td>
                <td style={{ backgroundColor: "#eaf4f6", padding: "6px 12px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px", borderRight: "1px solid #cbd5e1" }}>
                  STATUS
                </td>
                <td style={{ backgroundColor: "#ffffff", padding: "6px 14px", color: "#0f2d4a" }}>
                  <span style={{ fontWeight: "600", color: isAbnormal ? "#b45309" : "#15803d" }}>
                    {isAbnormal ? "Clinical Follow-up Recommended" : "Standard Monitoring Baseline"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Core Content Container */}
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "2px", backgroundColor: "#f8fafc", marginBottom: "18px" }}>
            {/* Row 1: Primary Header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #cbd5e1" }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#0d3b66" }}>
                Today&apos;s check-in has been added to your LungConnect record.
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                Recorded {assessmentDate}
              </div>
            </div>

            {/* Row 2: Key Takeaway */}
            <div style={{ padding: "14px 20px", backgroundColor: "#ffffff", borderBottom: "1px solid #cbd5e1" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "5px" }}>
                YOUR KEY TAKEAWAY
              </div>
              <div style={{ fontSize: "11px", color: "#334155", lineHeight: "1.55" }}>
                Today&apos;s check-in brings your recorded responses into one clear view. {hasWheezing ? "Wheezing is the primary symptom to keep in view" : "No persistent wheezing reported"}, while {hasCough ? "cough was reported" : "no persistent cough reported"} and {hasBreathless ? "breathlessness was reported" : "no severe breathlessness reported"}.
                <br />
                Keep this record as a reference for your next check-in, when you can see what has changed, stayed the same or newly appeared. If symptoms are new, persistent, worsening or concerning, consider a healthcare consultation.
              </div>
            </div>

            {/* Row 3: Today's Recorded Check-in (White Card Insert) */}
            <div style={{ padding: "14px 20px", backgroundColor: "#ffffff", borderBottom: "1px solid #cbd5e1" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 28px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#0d3b66", textTransform: "uppercase" }}>
                    TODAY&apos;S RECORDED CHECK-IN
                  </div>
                  <div style={{ fontSize: "11px", color: "#334155", marginTop: "3px" }}>
                    Breath-hold {breathHold} {breathHold !== "—" ? "sec" : ""} • PEFR {pefr} {pefr !== "—" ? "L/min" : ""} • Respiratory rate {rr} {rr !== "—" ? "bpm" : ""}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#0d3b66", textTransform: "uppercase" }}>
                    SYMPTOMS
                  </div>
                  <div style={{ fontSize: "11px", color: "#334155", marginTop: "3px" }}>
                    Cough: {coughText} • Breathlessness: {breathlessnessText} • Wheezing: {wheezingText}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#0d3b66", textTransform: "uppercase" }}>
                    PERSONAL CONTEXT
                  </div>
                  <div style={{ fontSize: "11px", color: "#334155", marginTop: "3px" }}>
                    Age {age} yrs • BMI {bmi} {bmi !== "—" ? "kg/m²" : ""} • {smokingHistory}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#0d3b66", textTransform: "uppercase" }}>
                    AIR QUALITY
                  </div>
                  <div style={{ fontSize: "11px", color: "#334155", marginTop: "3px" }}>
                    {aqi !== "—" ? `AQI ${aqi} • ${shortAqiCity} • CPCB category: ${aqiCategory}` : "Environmental AQI not recorded"}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Air Quality Context & Everyday Habit */}
            <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px" }}>
                  AIR-QUALITY CONTEXT
                </div>
                <div style={{ fontSize: "11px", color: "#334155", lineHeight: "1.45" }}>
                  AQI {aqi} in {shortAqiCity} is in the CPCB {aqiCategory} category. This provides local air-quality context for everyday well-being.
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px" }}>
                  A USEFUL EVERYDAY HABIT
                </div>
                <div style={{ fontSize: "11px", color: "#334155", lineHeight: "1.45" }}>
                  Keeping an eye on local AQI as it changes can be a useful part of staying aware of your respiratory well-being.
                </div>
              </div>
            </div>
          </div>

          {/* Section: YOUR NEXT OPTIONS */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>
              YOUR NEXT OPTIONS
            </div>
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "2px", backgroundColor: "#ffffff", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", borderBottom: "1px solid #cbd5e1" }}>
                <div style={{ padding: "14px 16px", borderRight: "1px solid #cbd5e1" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    EXPLORE
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#0d3b66", marginTop: "2px", marginBottom: "4px" }}>
                    Breathing Wellness
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#475569", lineHeight: "1.4", marginBottom: "10px" }}>
                    Guided breathing for calm, comfortable everyday wellness.
                  </div>
                  <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase" }}>
                    → EXPLORE BREATHING WELLNESS
                  </div>
                </div>

                <div style={{ padding: "14px 16px", borderRight: "1px solid #cbd5e1" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    TRACK
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#0d3b66", marginTop: "2px", marginBottom: "4px" }}>
                    My Progress
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#475569", lineHeight: "1.4", marginBottom: "10px" }}>
                    Review your recorded check-ins and available progress over time.
                  </div>
                  <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase" }}>
                    → VIEW MY PROGRESS
                  </div>
                </div>

                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    CONNECT
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#0d3b66", marginTop: "2px", marginBottom: "4px" }}>
                    Care & Consultation
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#475569", lineHeight: "1.4", marginBottom: "10px" }}>
                    Explore supported care options or connect with a healthcare professional when you want support.
                  </div>
                  <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase" }}>
                    → EXPLORE CARE OPTIONS
                  </div>
                  <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", marginTop: "3px" }}>
                    • BOOK A CONSULTATION
                  </div>
                </div>
              </div>

              {/* Bottom Row of Options Panel */}
              <div style={{ backgroundColor: "#f0f7f9", padding: "14px 18px" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#0d3b66", marginBottom: "3px" }}>
                  READY FOR YOUR NEXT CHECK-IN
                </div>
                <div style={{ fontSize: "10.5px", color: "#334155", marginBottom: "8px" }}>
                  Keep this summary with your LungConnect record so your next check-in can be viewed alongside today&apos;s record.
                </div>
                <div style={{ fontSize: "10.5px", color: "#334155", lineHeight: "1.4" }}>
                  <span style={{ fontWeight: "600", color: "#0d3b66" }}>CARE & SAFETY</span> This summary does not diagnose a respiratory condition and should not delay urgent medical care. If symptoms are severe, sudden or worsening, seek appropriate medical attention.
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.4" }}>
            * AQI is shown as local air-quality context. It provides environmental reference for your recorded vitals. This report uses one authoritative result record.
          </div>
        </div>

        {/* Page 1 Footer */}
        <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "10px", marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#94a3b8" }}>
          <span>MediConnect.fit • LungConnect • Patient Summary</span>
          <span>ISO A4 • Page 1 of 2</span>
        </div>
      </div>

      {/* ════════════════════════ PAGE 2 ════════════════════════ */}
      <div
        data-report-page="true"
        style={{
          width: "794px",
          minHeight: "1122px",
          padding: "36px 44px 28px 44px",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          pageBreakBefore: "always",
          borderTop: "none"
        }}
      >
        <div>
          {/* Page 2 Header with Official Logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", borderBottom: "2px solid #007a8c", paddingBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <img
                src={MEDICONNECT_LOGO_BASE64}
                alt="MediConnect Logo"
                style={{ height: "40px", width: "auto", maxWidth: "150px", objectFit: "contain", borderRadius: "0px", flexShrink: 0, backgroundColor: "transparent" }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "700", color: "#007a8c" }}>MediConnect.fit</span>
                  <span style={{ color: "#94a3b8" }}>|</span>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#0d3b66", letterSpacing: "0.8px", textTransform: "uppercase" }}>LUNGCONNECT</span>
                </div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#0d3b66", letterSpacing: "0.3px", textTransform: "uppercase", marginTop: "1px" }}>
                  CLINICAL GUIDANCE & RESPIRATORY WELLNESS PRACTICES
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                  Condition-tailored specialist consultation, breathing exercises, and clinical focus areas.
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "10px", fontWeight: "600", padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase" }}>
                Action Plan
              </div>
              <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "3px" }}>
                {serialNo}
              </div>
            </div>
          </div>

          {/* Reference Strip */}
          <div
            style={{
              backgroundColor: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "3px",
              padding: "6px 14px",
              marginBottom: "14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "10.5px",
              color: "#334155",
              whiteSpace: "nowrap"
            }}
          >
            <span style={{ whiteSpace: "nowrap" }}>
              <strong style={{ color: "#0f2d4a" }}>Patient:</strong> {patientName} • {age}&nbsp;yrs • {gender}
            </span>
            <span style={{ whiteSpace: "nowrap" }}>
              <strong style={{ color: "#0f2d4a" }}>Date:</strong> {assessmentDate}
            </span>
            <span style={{ whiteSpace: "nowrap" }}>
              <strong style={{ color: "#0f2d4a" }}>Environmental Context:</strong> {aqi !== "—" ? `AQI ${aqi} (${shortAqiCity})` : "Not recorded"}
            </span>
          </div>

          {/* SECTION 1: Suggested Specialist Consultation */}
          <div style={{ marginBottom: "14px", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: "#ffffff", overflow: "hidden" }}>
            <div style={{ backgroundColor: isAbnormal ? "#eff6ff" : "#f0fdf4", borderBottom: "1px solid #cbd5e1", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                SUGGESTED SPECIALIST CONSULTATION & CLINICAL GUIDANCE
              </div>
              <span style={{ fontSize: "10px", fontWeight: "700", color: isAbnormal ? "#1d4ed8" : "#15803d", backgroundColor: "#ffffff", padding: "2px 8px", borderRadius: "4px", border: `1px solid ${isAbnormal ? "#bfdbfe" : "#bbf7d0"}` }}>
                {isAbnormal ? `Recommended: ${primarySpecialist}` : "Routine Care: General Physician"}
              </span>
            </div>

            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: "11px", color: "#1e293b", lineHeight: "1.5", marginBottom: "10px" }}>
                {specialistRecommendation}
                {hasEntRecommendation && (
                  <span style={{ display: "block", marginTop: "4px", color: "#475569" }}>
                    • <strong>ENT Specialist Review:</strong> Also suggested for persistent or recurrent cough evaluation to rule out upper airway irritation or post-nasal drip.
                  </span>
                )}
              </div>

              {/* Clinical Guidance Box */}
              <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "4px", padding: "8px 12px", fontSize: "10.5px", color: "#92400e", lineHeight: "1.4" }}>
                <strong style={{ color: "#78350f" }}>Clinical Guidance:</strong> {clinicalGuidanceText}
              </div>
            </div>
          </div>

          {/* SECTION 2: Suggested Respiratory Wellness Practices */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
              <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                SUGGESTED RESPIRATORY WELLNESS PRACTICES
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "500" }}>
                Tailored to your symptoms & ambient AQI ({aqi})
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {wellnessPractices.map((practice, idx) => (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    backgroundColor: "#ffffff",
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    {/* Badge & timeframe */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px", flexWrap: "wrap", gap: "4px" }}>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <span style={{ fontSize: "9px", fontWeight: "700", color: "#065f46", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", padding: "1px 6px", borderRadius: "3px", textTransform: "uppercase" }}>
                          {practice.category}
                        </span>
                        <span style={{ fontSize: "8.5px", fontWeight: "700", color: "#1e293b", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", padding: "1px 5px", borderRadius: "3px", textTransform: "uppercase" }}>
                          {practice.priorityTag}
                        </span>
                      </div>
                      <span style={{ fontSize: "9px", color: "#64748b", fontWeight: "500" }}>
                        {practice.timeframe}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#0f2d4a", marginBottom: "4px", lineHeight: "1.3" }}>
                      {practice.title}
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: "10px", color: "#475569", lineHeight: "1.4", marginBottom: "7px" }}>
                      {practice.description}
                    </div>

                    {/* Steps list */}
                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "6px" }}>
                      <div style={{ fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "3px", letterSpacing: "0.3px" }}>
                        Recommended Steps:
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {practice.steps.map((step, sIdx) => (
                          <li key={sIdx} style={{ fontSize: "9.5px", color: "#334155", lineHeight: "1.35", marginBottom: "3px", display: "flex", alignItems: "flex-start", gap: "5px" }}>
                            <span style={{ color: "#059669", fontWeight: "700", flexShrink: 0 }}>✓</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: Recorded Clinical Indicators & Focus Areas */}
          <div style={{ marginBottom: "12px", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: "#ffffff", padding: "10px 14px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>
              RECORDED CLINICAL INDICATORS & ACTIONABLE INSIGHTS
            </div>

            {/* Badges strip */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
              {clinicalIndicators.slice(0, 6).map((ind, iIdx) => (
                <span
                  key={iIdx}
                  style={{
                    fontSize: "9px",
                    fontWeight: "600",
                    color: "#334155",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    padding: "2px 7px",
                    borderRadius: "3px"
                  }}
                >
                  • {ind}
                </span>
              ))}
            </div>

            {/* 2-Column Matrix */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "3px", padding: "8px 10px" }}>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#166534", textTransform: "uppercase", marginBottom: "4px" }}>
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

              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "3px", padding: "8px 10px" }}>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#1e40af", textTransform: "uppercase", marginBottom: "4px" }}>
                  ℹ Recommended Focus Areas
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {focusAreas.map((area, aIdx) => (
                    <li key={aIdx} style={{ fontSize: "9.5px", color: "#1e3a8a", lineHeight: "1.35", marginBottom: "2px" }}>
                      • {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "10px", marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#94a3b8" }}>
          <span>MediConnect.fit • LungConnect • Clinical Guidance & Wellness Practices</span>
          <span>ISO A4 • Page 2 of 2</span>
        </div>
      </div>
    </div>
  );
}

export { LungConnectV99Report };
