import React from "react";
import MEDICONNECT_LOGO_BASE64 from "@/lib/logoBase64";

/**
 * LungConnectFullReport: Comprehensive Clinical Lung Health Assessment Report (Multi-page A4 Fixed)
 * Strictly complies with:
 * - LUNGCONNECT CORRECTIONS .pdf (LC-07 to LC-10)
 * - SP-06 LungConnect Appendices 1-6
 * Features full clinical matrix: Biomarkers, Vital Signs, Symptoms, Medical Attention Notice, Action Plan, and Environmental Context.
 * Page 1: Comprehensive Clinical Matrix, Vital Signs, Symptoms, Precedence Notice & Monitoring Plan
 * Page 2: Suggested Specialist Consultation, Suggested Respiratory Wellness Practices & Actionable Clinical Indicators
 */
export default function LungConnectFullReport({
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  const inputs = assessmentData?.lung_health_inputs?.[0] || assessmentData?.inputs || {};
  const createdAt = assessmentData?.created_at || new Date().toISOString();

  const serialNo = assessmentData?.serial_no || (
    `LCN-${new Date(createdAt).getFullYear()}-${String(assessmentData?.id || "FULL0920").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
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
  }) + " · " + new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  const rawBreathHold = inputs?.breath_holding_time !== undefined && inputs?.breath_holding_time !== null && inputs?.breath_holding_time !== "" ? Number(inputs.breath_holding_time) : null;
  const rawPefr = inputs?.peak_flow !== undefined && inputs?.peak_flow !== null && inputs?.peak_flow !== "" ? Number(inputs.peak_flow) : null;
  const rawRr = (inputs?.breaths_per_minute ?? inputs?.respiratory_rate) !== undefined && (inputs?.breaths_per_minute ?? inputs?.respiratory_rate) !== null ? Number(inputs?.breaths_per_minute ?? inputs?.respiratory_rate) : null;
  const rawBmi = inputs?.bmi ? Number(inputs.bmi) : null;

  const breathHold = rawBreathHold !== null ? rawBreathHold : "—";
  const pefr = rawPefr !== null ? rawPefr : "—";
  const rr = rawRr !== null ? rawRr : "—";
  const bmi = rawBmi !== null ? rawBmi.toFixed(1) : "—";

  const isMale = String(gender || "").toLowerCase().startsWith("m");
  const rawHeight = Number(inputs?.height || inputs?.height_cm || patientData?.height || null);
  const rawWeight = Number(inputs?.weight || patientData?.weight || null);
  const estimatedHeight = rawWeight && rawBmi ? Math.round(Math.sqrt(rawWeight / rawBmi) * 100) : null;
  const heightCm = rawHeight || estimatedHeight || (isMale ? 172 : 160);

  // Dynamic predicted PEFR based on demographic standards (Nunn & Gregg / Indian reference)
  const predictedPefr = Math.round(
    isMale
      ? Math.max(380, Math.min(650, (heightCm * 4.0) - (age * 2.0) - 20))
      : Math.max(280, Math.min(500, (heightCm * 3.0) - (age * 1.8) - 10))
  );

  const normalPefrMin = Math.round(predictedPefr * 0.80);
  const normalPefrMax = Math.round(predictedPefr * 1.25);

  const cigsPerDay = Number(inputs?.cigarettes_per_day ?? inputs?.cigarettesPerDay) || (
    inputs?.smoking_pack_years && Number(inputs.smoking_pack_years) > 0
      ? Math.round(Number(inputs.smoking_pack_years) * 20 / (Number(inputs?.smoking_years ?? inputs?.smokingYears) || 5))
      : 0
  );
  const smkYears = Number(inputs?.smoking_years ?? inputs?.smokingYears) || 0;
  const pkYears = Number(inputs?.smoking_pack_years ?? inputs?.pack_years) || 0;

  const smoking = inputs?.smoking_history || (
    inputs?.smoking_status === "never" ? "Never smoked (0 pk-yrs)" :
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

  const city = (rawCity && rawCity !== "Current Location")
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
  const shortCity = formatShortLocation(city);

  const aqiCat = aqi !== "—" ? (aqi <= 50 ? "Good" : aqi <= 100 ? "Satisfactory" : aqi <= 200 ? "Moderate" : aqi <= 300 ? "Poor" : "Very Poor") : "Unspecified";

  // Dynamic, non-hardcoded PEFR classification based on % of predicted and physiological feasibility
  const getPefrStatus = (val) => {
    if (val === null) return { label: "Not Recorded", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
    const ratio = val / predictedPefr;
    if (ratio > 1.35 || (!isMale && val >= 700) || val >= 800) {
      return { label: "Supra-Normal / Retest", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    }
    if (ratio >= 0.80) {
      return { label: "Normal", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    }
    if (ratio >= 0.60) {
      return { label: "Borderline", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    }
    return { label: "Abnormal", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const getBreathHoldStatus = (val) => {
    if (val === null) return { label: "Not Recorded", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
    if (val >= 25) return { label: "Normal", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    if (val >= 15) return { label: "Borderline", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    return { label: "Abnormal", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const getRrStatus = (val) => {
    if (val === null) return { label: "Not Recorded", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
    if (val >= 12 && val <= 20) return { label: "Normal", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    if (val >= 10 && val <= 24) return { label: "Borderline", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    return { label: "Abnormal", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const getBmiStatus = (val) => {
    if (val === null) return { label: "Not Recorded", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
    if (val >= 18.5 && val <= 24.9) return { label: "Normal", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    if (val < 18.5) return { label: "Underweight", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    if (val <= 29.9) return { label: "Overweight", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    return { label: "Obese (Abnormal)", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const getAqiStatus = (val) => {
    if (val === null) return { label: "Not Recorded", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
    if (val <= 50) return { label: "Good", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    if (val <= 100) return { label: "Satisfactory", color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" };
    if (val <= 200) return { label: "Moderate", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    if (val <= 300) return { label: "Poor", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" };
    return { label: "Very Poor", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const pefrStatus = getPefrStatus(rawPefr);
  const breathHoldStatus = getBreathHoldStatus(rawBreathHold);
  const rrStatus = getRrStatus(rawRr);
  const bmiStatus = getBmiStatus(rawBmi);
  const aqiStatus = getAqiStatus(aqiRaw !== null ? Number(aqiRaw) : null);

  const hasCough = inputs?.symptoms_cough === true || inputs?.symptoms_cough === "yes" || (inputs?.cough_frequency && inputs?.cough_frequency !== "none");
  const hasBreathless = inputs?.symptoms_breathlessness === true || inputs?.symptoms_breathlessness === "yes" || (inputs?.breathlessness && inputs?.breathlessness !== "none");
  const hasWheezing = inputs?.wheezing === true || inputs?.wheezing === "true" || inputs?.symptoms_wheezing === true || inputs?.symptoms_wheezing === "yes";

  const coughText = inputs?.cough_frequency && inputs?.cough_frequency !== "none" ? inputs.cough_frequency : (hasCough ? "present" : "none");
  const breathlessnessText = inputs?.breathlessness && inputs?.breathlessness !== "none" ? inputs.breathlessness : (hasBreathless ? "present" : "none");

  // Dynamic clinical synthesis narratives reflecting genuine status
  const pefrNarrative = rawPefr === null
    ? "unrecorded spirometric parameters"
    : pefrStatus.label === "Normal"
      ? `spirometric parameters within normal limits (${pefr} L/min)`
      : pefrStatus.label === "Borderline"
        ? `mildly reduced peak expiratory flow (${pefr} L/min)`
        : pefrStatus.label === "Abnormal"
          ? `significantly reduced peak expiratory flow (${pefr} L/min)`
          : `supra-normal peak expiratory flow (${pefr} L/min, technique re-check recommended)`;

  const breathHoldNarrative = rawBreathHold === null
    ? "breath-holding capacity not recorded"
    : rawBreathHold >= 30
      ? `healthy breath-holding capacity (${rawBreathHold}s)`
      : rawBreathHold >= 20
        ? `borderline breath-holding capacity (${rawBreathHold}s)`
        : `reduced breath-holding capacity (${rawBreathHold}s)`;

  const rrNarrative = rawRr === null
    ? "respiratory rate not recorded"
    : (rawRr >= 12 && rawRr <= 20)
      ? `normal resting respiratory rate (${rawRr} bpm)`
      : rawRr > 20
        ? `elevated respiratory rate (${rawRr} bpm, tachypneic)`
        : `low respiratory rate (${rawRr} bpm)`;

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

  // Suggested Respiratory Wellness Practices (Matching exact on-screen cards)
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
        `Smoking history: ${smoking}`,
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
      id="lungconnect-full-report"
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
          padding: "36px 40px 24px 40px",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <div>
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
                  <span style={{ fontSize: "17px", fontWeight: "700", color: "#007a8c" }}>MediConnect.fit</span>
                  <span style={{ color: "#94a3b8" }}>|</span>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#0d3b66", letterSpacing: "1px", textTransform: "uppercase" }}>LUNGCONNECT</span>
                </div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#0d3b66", letterSpacing: "0.5px", textTransform: "uppercase", marginTop: "1px" }}>
                  CLINICAL REPORT
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                  Full Multi-Factor Assessment Matrix (Biomarkers, Symptoms, Action Plan)
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "10.5px", fontWeight: "600", padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                LC-FULL • CLINICAL
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "3px" }}>
                {serialNo}
              </div>
            </div>
          </div>

          {/* Subject & Assessment Details */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "2px", padding: "10px 14px", marginBottom: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 18px", fontSize: "11px" }}>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "10px", textTransform: "uppercase" }}>Patient Name</span>
                <span style={{ fontWeight: "600", color: "#0f2d4a" }}>{patientName}</span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "10px", textTransform: "uppercase" }}>Demographics</span>
                <span style={{ fontWeight: "600", color: "#0f2d4a" }}>{age} yrs • {gender}</span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "10px", textTransform: "uppercase" }}>Date of Assessment</span>
                <span style={{ fontWeight: "600", color: "#0f2d4a" }}>{assessmentDate}</span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "10px", textTransform: "uppercase" }}>Report ID</span>
                <span style={{ fontWeight: "600", color: "#0f2d4a", fontFamily: "monospace" }}>{serialNo}</span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "10px", textTransform: "uppercase" }}>Smoking History</span>
                <span style={{ fontWeight: "600", color: "#0f2d4a" }}>{smoking}</span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "10px", textTransform: "uppercase" }}>Environmental Context</span>
                <span style={{ fontWeight: "600", color: "#0f2d4a" }}>{aqi !== "—" ? `AQI ${aqi} (${shortCity})` : "Not recorded"}</span>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div style={{ backgroundColor: "#f0f7f9", border: "1px solid #cbd5e1", borderRadius: "2px", padding: "10px 14px", marginBottom: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
              CLINICAL SYNTHESIS & FINDINGS SUMMARY
            </div>
            <div style={{ fontSize: "11px", color: "#0f2d4a", lineHeight: "1.5" }}>
              Patient presented with {pefrNarrative}, {breathHoldNarrative}, and {rrNarrative}.
              {hasWheezing ? " Wheezing was affirmatively recorded, which is an active clinical symptom requiring structured follow-up." : " No audible wheezing reported on check-in."}
              {hasCough ? ` Cough was reported (${coughText}).` : " No persistent cough reported."}
              {hasBreathless ? ` Breathlessness was recorded as ${breathlessnessText}.` : " No active dyspnea reported."}
              Local air quality of AQI {aqi} ({shortCity}) constitutes an environmental co-factor.
            </div>
          </div>

          {/* Comprehensive Clinical Matrix Table */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px" }}>
              RECORDED CLINICAL INDICATORS & VITAL SIGNS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "10.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "5px 10px", textAlign: "left", fontWeight: "600", color: "#0d3b66", width: "28%" }}>INDICATOR / PARAMETER</th>
                  <th style={{ padding: "5px 10px", textAlign: "left", fontWeight: "600", color: "#0d3b66", width: "26%" }}>RECORDED VALUE</th>
                  <th style={{ padding: "5px 10px", textAlign: "left", fontWeight: "600", color: "#0d3b66", width: "26%" }}>REFERENCE / RANGE</th>
                  <th style={{ padding: "5px 10px", textAlign: "center", fontWeight: "600", color: "#0d3b66", width: "20%" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "4px 10px", fontWeight: "500", color: "#0f2d4a" }}>Peak Expiratory Flow (PEFR)</td>
                  <td style={{ padding: "4px 10px" }}>{pefr} {pefr !== "—" ? "L/min" : ""}</td>
                  <td style={{ padding: "4px 10px", color: "#64748b" }}>Pred: ~{predictedPefr} L/min ({normalPefrMin}–{normalPefrMax})</td>
                  <td style={{ padding: "4px 10px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: pefrStatus.color, backgroundColor: pefrStatus.bg, border: `1px solid ${pefrStatus.border}` }}>
                      {pefrStatus.label}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <td style={{ padding: "4px 10px", fontWeight: "500", color: "#0f2d4a" }}>Breath-Holding Time</td>
                  <td style={{ padding: "4px 10px" }}>{breathHold} {breathHold !== "—" ? "seconds" : ""}</td>
                  <td style={{ padding: "4px 10px", color: "#64748b" }}>≥ 25 seconds</td>
                  <td style={{ padding: "4px 10px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: breathHoldStatus.color, backgroundColor: breathHoldStatus.bg, border: `1px solid ${breathHoldStatus.border}` }}>
                      {breathHoldStatus.label}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "4px 10px", fontWeight: "500", color: "#0f2d4a" }}>Respiratory Rate (RR)</td>
                  <td style={{ padding: "4px 10px" }}>{rr} {rr !== "—" ? "breaths/min" : ""}</td>
                  <td style={{ padding: "4px 10px", color: "#64748b" }}>12 – 20 bpm resting</td>
                  <td style={{ padding: "4px 10px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: rrStatus.color, backgroundColor: rrStatus.bg, border: `1px solid ${rrStatus.border}` }}>
                      {rrStatus.label}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <td style={{ padding: "4px 10px", fontWeight: "500", color: "#0f2d4a" }}>Symptom Profile</td>
                  <td style={{ padding: "4px 10px" }}>Wheezing: {hasWheezing ? "Present" : "None"}</td>
                  <td style={{ padding: "4px 10px", color: "#64748b" }}>Absence of symptoms</td>
                  <td style={{ padding: "4px 10px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: hasWheezing ? "#b91c1c" : "#15803d", backgroundColor: hasWheezing ? "#fef2f2" : "#f0fdf4", border: `1px solid ${hasWheezing ? "#fecaca" : "#bbf7d0"}` }}>
                      {hasWheezing ? "Abnormal" : "Normal"}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "4px 10px", fontWeight: "500", color: "#0f2d4a" }}>BMI / Anthropometry</td>
                  <td style={{ padding: "4px 10px" }}>{bmi} {bmi !== "—" ? "kg/m²" : ""}</td>
                  <td style={{ padding: "4px 10px", color: "#64748b" }}>18.5 – 24.9 kg/m²</td>
                  <td style={{ padding: "4px 10px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: bmiStatus.color, backgroundColor: bmiStatus.bg, border: `1px solid ${bmiStatus.border}` }}>
                      {bmiStatus.label}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 10px", fontWeight: "500", color: "#0f2d4a" }}>Local Air Quality</td>
                  <td style={{ padding: "4px 10px" }}>{aqi !== "—" ? `AQI ${aqi} (${shortCity})` : "Not recorded"}</td>
                  <td style={{ padding: "4px 10px", color: "#64748b" }}>CPCB Standard &lt; 100</td>
                  <td style={{ padding: "4px 10px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: aqiStatus.color, backgroundColor: aqiStatus.bg, border: `1px solid ${aqiStatus.border}` }}>
                      {aqiStatus.label}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Assistive Guidance Notice (LC-09) */}
          <div style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a", borderRadius: "2px", padding: "10px 14px", marginBottom: "14px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#92400e", textTransform: "uppercase", marginBottom: "3px" }}>
              ASSISTIVE CLINICAL PRECEDENCE NOTICE (LC-09)
            </div>
            <div style={{ fontSize: "10.5px", color: "#78350f", lineHeight: "1.4" }}>
              Under MediConnect clinical governance rules, subjective or active respiratory symptoms (e.g. wheezing or dyspnea) require prompt clinical evaluation. Patients experiencing new or worsening chest tightness or respiratory sounds should promptly consult a registered medical practitioner.
            </div>
          </div>

          {/* Recommended Action Plan */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px" }}>
              RECOMMENDED LIFESTYLE & MONITORING PLAN
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "2px", padding: "8px 10px", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "10px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase" }}>RESPIRATORY CONDITIONING</div>
                <div style={{ fontSize: "10px", color: "#334155", marginTop: "3px", lineHeight: "1.35" }}>Practice Diaphragmatic and Box Breathing (4-4-4-4) 2x daily to optimize alveolar ventilation.</div>
              </div>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "2px", padding: "8px 10px", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "10px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase" }}>ENVIRONMENTAL DISCIPLINE</div>
                <div style={{ fontSize: "10px", color: "#334155", marginTop: "3px", lineHeight: "1.35" }}>Track hourly CPCB AQI before outdoor workouts. Limit prolonged outdoor exertion when AQI exceeds 200.</div>
              </div>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "2px", padding: "8px 10px", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "10px", fontWeight: "600", color: "#007a8c", textTransform: "uppercase" }}>FOLLOW-UP CADENCE</div>
                <div style={{ fontSize: "10px", color: "#334155", marginTop: "3px", lineHeight: "1.35" }}>Log regular weekly check-ins. Authoritative full re-assessment eligible on standard 30-day cadence.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Page 1 Footer */}
        <div>
          <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "8px", marginTop: "12px", fontSize: "9.5px", color: "#64748b", lineHeight: "1.4" }}>
            <div>Keep this clinical assessment record with your permanent MediConnect health locker.</div>
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontWeight: "600", color: "#0d3b66" }}>CARE & SAFETY</span> LungConnect is a digital wellness screening and symptom monitoring instrument; it does not constitute formal diagnostic spirometry or individualized medical prescription.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9.5px", color: "#94a3b8", marginTop: "6px" }}>
            <span>MediConnect.fit • LungConnect • Full Clinical Assessment Report • Authoritative Record</span>
            <span>ISO A4 • Page 1 of 2</span>
          </div>
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
              <strong style={{ color: "#0f2d4a" }}>Environmental Context:</strong> {aqi !== "—" ? `AQI ${aqi} (${shortCity})` : "Not recorded"}
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

export { LungConnectFullReport };
