import React from "react";
import { MEDICONNECT_LOGO_URI } from "@/lib/logoBase64";

/**
 * AssessmentPrintReport: Publication-Grade Clinical Print & Canvas Template
 * Optimized for high-resolution html2canvas export and browser print dialog.
 * Features:
 * - Official MediConnect.Fit circular branding logo
 * - Elegant semi-transparent verification watermark
 * - Comprehensive patient demographics and lifestyle observations
 * - 4-column clinical vitals table with standard reference benchmarks
 * - Controlled non-diagnostic assessment summary adhering to the semantic firewall
 * - Professional header, legal disclaimers, and audit verification footer
 */
export default function AssessmentPrintReport({
  assessmentType = "lung",
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  const isHeart = assessmentType === "heart";
  const inputs = isHeart
    ? assessmentData?.heart_health_inputs?.[0] || {}
    : assessmentData?.lung_health_inputs?.[0] || {};

  const score = Number(assessmentData?.health_score || 75);
  const riskLevel = String(assessmentData?.risk_level || "moderate").toLowerCase();
  const createdAt = assessmentData?.created_at || new Date().toISOString();

  const serialNo = assessmentData?.serial_no || (
    isHeart
      ? `CCN-${new Date(createdAt).getFullYear()}-${(assessmentData?.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
      : `LCN-${new Date(createdAt).getFullYear()}-${(assessmentData?.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
  );

  const patientName = patientData?.name || patientData?.full_name || patientData?.user?.name || "Sneha Kapoor";
  const chronologicalAge = Number(inputs?.age || patientData?.age || 45);
  const patientGender = inputs?.gender || inputs?.sex || patientData?.gender || "Female";

  // BMI calculation & categorization
  const bmiNum = inputs?.bmi
    ? Number(inputs?.bmi)
    : (inputs?.height_cm && inputs?.weight_kg ? Number(inputs?.weight_kg / ((inputs?.height_cm / 100) ** 2)) : 22.5);
  const bmi = bmiNum.toFixed(1);
  const bmiCategory = bmiNum < 18.5 ? "Underweight" : bmiNum < 25 ? "Normal Weight" : bmiNum < 30 ? "Overweight" : "Obese";

  // Estimated Lung Age
  const lungAge = inputs?.lung_age || Math.max(18, Math.round(chronologicalAge + (100 - score) * 0.25));

  // Risk styling
  const riskConfig = {
    low: { label: "LOW RISK", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
    moderate: { label: "MODERATE RISK", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
    high: { label: "HIGH RISK", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
    critical: { label: "HIGH RISK", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" }
  };
  const currentRisk = riskConfig[riskLevel] || riskConfig.moderate;

  // Formatted Dates
  const assessmentDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const printTimestamp = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  // Controlled summary narrative
  const summaryText = typeof assessmentData?.ai_analysis === "string"
    ? assessmentData?.ai_analysis
    : (assessmentData?.ai_analysis?.analysis || (
      isHeart
        ? "Assessment summary: Based on self-reported inputs, cardiovascular observations reflect resting vitals, lifestyle habits, and activity levels. Regular monitoring and balanced diet are recommended."
        : `Assessment summary: Based on self-reported entries, parameters reflect current breath-holding capacity (${inputs?.breath_holding_time || 35}s), peak expiratory flow (${inputs?.peak_flow || 450} L/min), and local AQI exposure (${inputs?.aqi || 60} AQI). This summary provides lifestyle wellness indicators and is not a clinical diagnosis.`
    ));

  // Occupational exposure label
  const occupationalExp = inputs?.occupational_exposure
    ? (inputs.occupational_exposure.charAt(0).toUpperCase() + inputs.occupational_exposure.slice(1))
    : (inputs?.occupational_risk ? "Moderate (Dust/Fume Exposure)" : "None (Office Environment)");

  return (
    <div
      ref={reportRef}
      id="assessment-print-report"
      data-print-report="true"
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0,
        width: "820px",
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        padding: "32px 38px",
        boxSizing: "border-box",
        lineHeight: "1.4",
        overflow: "hidden"
      }}
    >
      {/* 1. Official Semi-Transparent Watermark Layer */}
      <div
        style={{
          position: "absolute",
          top: "52%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-30deg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.045,
          width: "550px",
          textAlign: "center"
        }}
      >
        <img
          src={MEDICONNECT_LOGO_URI}
          alt=""
          style={{ width: "260px", height: "260px", objectFit: "contain", marginBottom: "14px" }}
        />
        <span style={{ fontSize: "30px", fontWeight: "900", color: "#0067A1", letterSpacing: "6px", textTransform: "uppercase" }}>
          MEDICONNECT.FIT
        </span>
        <span style={{ fontSize: "13px", fontWeight: "800", color: "#334155", letterSpacing: "4px", marginTop: "4px", textTransform: "uppercase" }}>
          VERIFIED DIGITAL WELLNESS RECORD
        </span>
      </div>

      {/* Foreground Container (zIndex: 1) */}
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Top Header Card */}
        <div style={{ borderBottom: "2.5px solid #0067A1", paddingBottom: "14px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Official Circular Logo */}
            <img
              src={MEDICONNECT_LOGO_URI}
              alt="MediConnect Logo"
              style={{
                width: "56px",
                height: "56px",
                objectFit: "contain",
                borderRadius: "50%",
                border: "1.5px solid #e2e8f0",
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.06)"
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px", fontWeight: "900", color: "#0067A1", letterSpacing: "-0.5px" }}>
                  MediConnect<span style={{ color: "#0ea5e9" }}>.fit</span>
                </span>
                <span style={{ fontSize: "9px", backgroundColor: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "1.5px 6px", borderRadius: "4px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Verified Artifact
                </span>
              </div>
              <p style={{ margin: "1px 0 0 0", fontSize: "10.5px", color: "#64748b", fontWeight: "500" }}>
                Telemedicine & Digital Health Wellness Platform · Telemedicine Practice Guidelines Compliant
              </p>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <h1 style={{ margin: "0 0 3px 0", fontSize: "14px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {isHeart ? "Cardiovascular Health Screening Summary" : "Lung Health Screening Summary"}
            </h1>
            <div style={{ display: "inline-block", backgroundColor: "#f1f5f9", padding: "2.5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
              <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#0067A1", fontWeight: "bold" }}>
                Serial No: #{serialNo}
              </span>
            </div>
            <p style={{ margin: "3px 0 0 0", fontSize: "9.5px", color: "#64748b" }}>
              Assessment Date: {assessmentDate}
            </p>
          </div>
        </div>

        {/* Non-Diagnostic Screening Scope Subtitle (P0-07) */}
        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 12px", marginBottom: "12px", fontSize: "9.5px", color: "#475569", lineHeight: "1.4" }}>
          <strong>Screening Scope:</strong> This screening summarizes the information entered for this assessment. It does not diagnose {isHeart ? "cardiovascular disease" : "respiratory disease"} or determine individual treatment.
        </div>

        {/* Patient Profile Demographics Panel (4x2 Grid) */}
        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px", marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "5px", marginBottom: "7px" }}>
            <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", color: "#475569", letterSpacing: "0.5px" }}>
              Patient Profile & Record Demographics
            </span>
            <span style={{ fontSize: "9.5px", backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", padding: "1px 6px", borderRadius: "3px", fontWeight: "700" }}>
              Source: Self-Reported Questionnaire & Vitals
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
            <tbody>
              <tr>
                <td style={{ padding: "3px 0", color: "#64748b", width: "16%" }}>Patient Name:</td>
                <td style={{ padding: "3px 0", fontWeight: "bold", color: "#0f172a", width: "34%" }}>{patientName}</td>
                <td style={{ padding: "3px 0", color: "#64748b", width: "16%" }}>Chronological Age:</td>
                <td style={{ padding: "3px 0", fontWeight: "bold", color: "#0f172a", width: "34%" }}>
                  {chronologicalAge} yrs {!isHeart && <span style={{ color: "#0067A1", fontWeight: "normal" }}>(Lung Age: {lungAge} yrs)</span>}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "3px 0", color: "#64748b" }}>Biological Sex:</td>
                <td style={{ padding: "3px 0", fontWeight: "bold", color: "#0f172a", textTransform: "capitalize" }}>{patientGender}</td>
                <td style={{ padding: "3px 0", color: "#64748b" }}>Calculated BMI:</td>
                <td style={{ padding: "3px 0", fontWeight: "bold", color: "#0f172a" }}>
                  {bmi} kg/m² <span style={{ fontSize: "9.5px", color: "#64748b", fontWeight: "normal" }}>({bmiCategory} · {inputs?.height_cm || 170}cm / {inputs?.weight_kg || 68}kg)</span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "3px 0", color: "#64748b" }}>Smoking Profile:</td>
                <td style={{ padding: "3px 0", fontWeight: "bold", color: "#0f172a", textTransform: "capitalize" }}>
                  {inputs?.smoking_status || "Never"}{inputs?.smoking_pack_years ? ` (${inputs.smoking_pack_years} pk-yrs)` : ""}
                </td>
                <td style={{ padding: "3px 0", color: "#64748b" }}>Occupational Exposure:</td>
                <td style={{ padding: "3px 0", fontWeight: "bold", color: "#0f172a" }}>
                  {occupationalExp}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "3px 0", color: "#64748b" }}>Ambient Air Quality:</td>
                <td style={{ padding: "3px 0", fontWeight: "bold", color: "#0067A1" }}>
                  {inputs?.aqi || 60} AQI ({inputs?.location || "Delhi, India"})
                </td>
                <td style={{ padding: "3px 0", color: "#64748b" }}>Clinical Framework:</td>
                <td style={{ padding: "3px 0", fontWeight: "bold", color: "#334155" }}>
                  {isHeart ? "2024 ESC Lifestyle Model" : "Standard Global Respiratory Model"}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: "6px 0 0 0", fontSize: "8.5px", color: "#94a3b8" }}>
            * BMI is calculated from recorded height and weight at assessment time (kg/m²).
          </p>
        </div>

        {/* Primary Score & Risk Overview Banner */}
        <div style={{ backgroundColor: "#0067A1", color: "#ffffff", borderRadius: "8px", padding: "12px 20px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9, display: "block" }}>
              {isHeart ? "Heart Health Lifestyle Index" : "Lung Health Lifestyle Index"}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "2px" }}>
              <span style={{ fontSize: "32px", fontWeight: "900", fontFamily: "monospace" }}>{score}</span>
              <span style={{ fontSize: "14px", opacity: 0.8 }}>/ 100</span>
            </div>
          </div>

          {!isHeart && (
            <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.2)", borderRight: "1px solid rgba(255,255,255,0.2)", padding: "0 28px" }}>
              <span style={{ fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9, display: "block" }}>
                Biological Lung Age
              </span>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "4px", marginTop: "2px" }}>
                <span style={{ fontSize: "28px", fontWeight: "900", fontFamily: "monospace" }}>{lungAge}</span>
                <span style={{ fontSize: "12px", opacity: 0.8 }}>yrs</span>
              </div>
              <span style={{ fontSize: "9px", opacity: 0.75 }}>
                Chronological: {chronologicalAge} yrs
              </span>
            </div>
          )}

          <div style={{ textAlign: "right" }}>
            <span style={{ display: "inline-block", backgroundColor: "#ffffff", color: currentRisk.color, padding: "5px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {currentRisk.label}
            </span>
            <span style={{ display: "block", fontSize: "9px", opacity: 0.85, marginTop: "4px" }}>
              Self-Reported Risk Spectrum
            </span>
          </div>
        </div>

        {/* Structured Clinical & Environmental Observations Table */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#0f172a", margin: 0 }}>
              {isHeart ? "Cardiovascular Vitals & Spectrum Observations" : "Respiratory Function & Environmental Observations"}
            </h2>
            <span style={{ fontSize: "9px", color: "#64748b" }}>Clinical Reference Standards</span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", border: "1px solid #cbd5e1" }}>
            <thead>
              <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left", color: "#334155" }}>
                <th style={{ padding: "6px 10px", borderBottom: "1px solid #cbd5e1", width: "28%" }}>Parameter</th>
                <th style={{ padding: "6px 10px", borderBottom: "1px solid #cbd5e1", width: "24%" }}>Recorded Value</th>
                <th style={{ padding: "6px 10px", borderBottom: "1px solid #cbd5e1", width: "26%" }}>Reference Benchmark</th>
                <th style={{ padding: "6px 10px", borderBottom: "1px solid #cbd5e1", width: "22%" }}>Observation</th>
              </tr>
            </thead>
            <tbody>
              {isHeart ? (
                <>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 10px", fontWeight: "600" }}>Blood Pressure</td>
                    <td style={{ padding: "5px 10px" }}>{inputs?.systolic_bp && inputs?.diastolic_bp ? `${inputs.systolic_bp}/${inputs.diastolic_bp} mmHg` : "120/80 mmHg"}</td>
                    <td style={{ padding: "5px 10px", color: "#64748b" }}>&lt; 120/80 mmHg (2024 ESC)</td>
                    <td style={{
                      padding: "5px 10px",
                      color: (inputs?.systolic_bp >= 140 || inputs?.diastolic_bp >= 90) ? "#dc2626" : (inputs?.systolic_bp >= 120 || inputs?.diastolic_bp >= 70) ? "#d97706" : "#059669",
                      fontWeight: "700"
                    }}>
                      {(inputs?.systolic_bp >= 140 || inputs?.diastolic_bp >= 90)
                        ? "Potential Elevation*"
                        : (inputs?.systolic_bp >= 120 || inputs?.diastolic_bp >= 70)
                          ? "Elevated BP (2024 ESC)*"
                          : "Normal / Optimal"}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 10px", fontWeight: "600" }}>Resting Heart Rate</td>
                    <td style={{ padding: "5px 10px" }}>{inputs?.resting_heart_rate || 72} bpm</td>
                    <td style={{ padding: "5px 10px", color: "#64748b" }}>60–80 bpm</td>
                    <td style={{ padding: "5px 10px", color: inputs?.resting_heart_rate > 100 ? "#dc2626" : "#059669", fontWeight: "700" }}>
                      {inputs?.resting_heart_rate > 100 ? "Elevated" : "Normal"}
                    </td>
                  </tr>
                  {inputs?.ldl_cholesterol && (
                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "5px 10px", fontWeight: "600" }}>LDL Cholesterol</td>
                      <td style={{ padding: "5px 10px" }}>{inputs.ldl_cholesterol} mg/dL</td>
                      <td style={{ padding: "5px 10px", color: "#64748b" }}>&lt; 115 mg/dL</td>
                      <td style={{ padding: "5px 10px", color: inputs.ldl_cholesterol > 160 ? "#dc2626" : inputs.ldl_cholesterol > 115 ? "#d97706" : "#059669", fontWeight: "700" }}>
                        {inputs.ldl_cholesterol > 160 ? "High" : inputs.ldl_cholesterol > 115 ? "Elevated" : "Optimal"}
                      </td>
                    </tr>
                  )}
                  {inputs?.hba1c && (
                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "5px 10px", fontWeight: "600" }}>HbA1c (Glycated Hb)</td>
                      <td style={{ padding: "5px 10px" }}>{inputs.hba1c} %</td>
                      <td style={{ padding: "5px 10px", color: "#64748b" }}>&lt; 5.7 %</td>
                      <td style={{ padding: "5px 10px", color: inputs.hba1c >= 6.5 ? "#dc2626" : inputs.hba1c >= 5.7 ? "#d97706" : "#059669", fontWeight: "700" }}>
                        {inputs.hba1c >= 6.5 ? "Elevated" : inputs.hba1c >= 5.7 ? "Borderline" : "Normal"}
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 10px", fontWeight: "600" }}>Physical Activity</td>
                    <td style={{ padding: "5px 10px" }}>{inputs?.physical_activity_minutes ? `${inputs.physical_activity_minutes} mins/wk` : "150 mins/wk"}</td>
                    <td style={{ padding: "5px 10px", color: "#64748b" }}>150–300 mins/wk (WHO)</td>
                    <td style={{ padding: "5px 10px", color: inputs?.physical_activity_minutes >= 150 ? "#059669" : "#d97706", fontWeight: "700" }}>
                      {inputs?.physical_activity_minutes >= 150 ? "Adequate Band" : "Below Reference"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "5px 10px", fontWeight: "600" }}>Smoking Status</td>
                    <td style={{ padding: "5px 10px", textTransform: "capitalize" }}>{inputs?.smoking_status || "Never"}</td>
                    <td style={{ padding: "5px 10px", color: "#64748b" }}>Non-smoker</td>
                    <td style={{ padding: "5px 10px", color: inputs?.smoking_status === "current" ? "#dc2626" : "#059669", fontWeight: "700" }}>
                      {inputs?.smoking_status === "current" ? "High Risk Factor" : "Non-smoker (Optimal)"}
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 10px", fontWeight: "600" }}>Breath Holding Duration</td>
                    <td style={{ padding: "5px 10px", fontWeight: "700", color: "#0f172a" }}>{inputs?.breath_holding_time || 35} seconds</td>
                    <td style={{ padding: "5px 10px", color: "#64748b" }}>&ge; 30 seconds</td>
                    <td style={{ padding: "5px 10px", color: inputs?.breath_holding_time < 20 ? "#dc2626" : "#059669", fontWeight: "700" }}>
                      {inputs?.breath_holding_time < 20 ? "Below Reference (<20s)" : "Adequate Capacity (≥30s)"}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 10px", fontWeight: "600" }}>Peak Expiratory Flow (PEFR)</td>
                    <td style={{ padding: "5px 10px", fontWeight: "700", color: "#0f172a" }}>{inputs?.peak_flow || 450} L/min</td>
                    <td style={{ padding: "5px 10px", color: "#64748b" }}>400–600 L/min</td>
                    <td style={{ padding: "5px 10px", color: inputs?.peak_flow < 350 ? "#dc2626" : "#059669", fontWeight: "700" }}>
                      {inputs?.peak_flow < 350 ? "Below Reference" : "Normal Ventilatory Range"}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 10px", fontWeight: "600" }}>Breaths Per Minute (Respiration Rate)</td>
                    <td style={{ padding: "5px 10px", fontWeight: "700", color: "#0f172a" }}>{inputs?.breaths_per_minute || 16} bpm</td>
                    <td style={{ padding: "5px 10px", color: "#64748b" }}>12–20 bpm</td>
                    <td style={{ padding: "5px 10px", color: (inputs?.breaths_per_minute < 12 || inputs?.breaths_per_minute > 20) ? "#dc2626" : "#059669", fontWeight: "700" }}>
                      {(inputs?.breaths_per_minute < 12 || inputs?.breaths_per_minute > 20) ? "Elevated Respiration" : "Normal Resting Rate"}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 10px", fontWeight: "600" }}>Ambient AQI Exposure</td>
                    <td style={{ padding: "5px 10px", fontWeight: "700", color: "#0f172a" }}>{inputs?.aqi || 60} AQI ({inputs?.pollution_exposure || "moderate"} exposure)</td>
                    <td style={{ padding: "5px 10px", color: "#64748b" }}>&lt; 50 AQI (Optimal)</td>
                    <td style={{ padding: "5px 10px", color: inputs?.aqi > 150 ? "#dc2626" : inputs?.aqi > 100 ? "#d97706" : "#059669", fontWeight: "700" }}>
                      {inputs?.aqi > 150 ? "Unhealthy Air Exposure" : inputs?.aqi > 100 ? "Moderate Exposure" : "Good Air Quality"}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 10px", fontWeight: "600" }}>Occupational Dust/Fume Exposure</td>
                    <td style={{ padding: "5px 10px", textTransform: "capitalize" }}>{occupationalExp}</td>
                    <td style={{ padding: "5px 10px", color: "#64748b" }}>None / Low</td>
                    <td style={{ padding: "5px 10px", color: inputs?.occupational_exposure === "high" ? "#dc2626" : "#059669", fontWeight: "700" }}>
                      {inputs?.occupational_exposure === "high" ? "Elevated Occupational Risk" : "Low Risk Environment"}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 10px", fontWeight: "600" }}>Smoking History</td>
                    <td style={{ padding: "5px 10px", textTransform: "capitalize" }}>
                      {inputs?.smoking_status || "Never"}{inputs?.smoking_pack_years ? ` (${inputs.smoking_pack_years} pack-years)` : ""}
                    </td>
                    <td style={{ padding: "5px 10px", color: "#64748b" }}>Non-smoker</td>
                    <td style={{ padding: "5px 10px", color: inputs?.smoking_status === "current" ? "#dc2626" : "#059669", fontWeight: "700" }}>
                      {inputs?.smoking_status === "current" ? "High Risk Factor" : "Non-smoker (Optimal)"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "5px 10px", fontWeight: "600" }}>Reported Respiratory Symptoms</td>
                    <td colSpan={3} style={{ padding: "5px 10px", color: "#334155" }}>
                      Cough: <strong>{inputs?.cough_frequency || "None"}</strong> · Breathlessness: <strong>{inputs?.breathlessness || "None"}</strong> · Wheezing: <strong>{inputs?.wheezing ? "Present" : "Absent"}</strong>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
          {isHeart && (
            <p style={{ margin: "5px 0 0 0", fontSize: "8.5px", color: "#64748b", lineHeight: "1.3" }}>
              * Blood pressure: {inputs?.systolic_bp || 120}/{inputs?.diastolic_bp || 80} mmHg. This single reading does not diagnose hypertension. Blood-pressure classification depends on the clinical guideline framework (2024 ESC) and repeated, properly measured readings.
            </p>
          )}
        </div>

        {/* Controlled Non-Diagnostic Clinical Narrative Summary (P0-08, P0-10) */}
        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "10px" }}>
          <h3 style={{ margin: "0 0 3px 0", fontSize: "10px", fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Assessment Summary & Lifestyle Observations
          </h3>
          <p style={{ margin: 0, color: "#334155", lineHeight: "1.45" }}>
            {summaryText}
          </p>
        </div>

        {/* Suggested Next Steps / Wellness Practices (P1-02, P1-05, P1-06, P1-08) */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "9px 14px", marginBottom: "12px", fontSize: "9.5px", backgroundColor: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
            <h4 style={{ margin: 0, fontSize: "9.5px", fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Suggested Wellness Practices & Action Plan
            </h4>
            <span style={{ fontSize: "8.5px", color: "#64748b" }}>
              Content adapted for common Indian food and activity contexts
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {isHeart ? (
              <>
                <div style={{ backgroundColor: "#f8fafc", padding: "6px 9px", borderRadius: "5px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0067A1", display: "block", marginBottom: "2px" }}>1. Aerobic Physical Activity</strong>
                  <span style={{ color: "#475569", lineHeight: "1.35", display: "block" }}>
                    For adults for whom moderate-intensity aerobic activity is appropriate, 150–300 minutes per week is used as a public-health reference band. Increase activity gradually and seek professional advice when appropriate.
                  </span>
                </div>
                <div style={{ backgroundColor: "#f8fafc", padding: "6px 9px", borderRadius: "5px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0067A1", display: "block", marginBottom: "2px" }}>2. Heart-Healthy Dietary Pattern</strong>
                  <span style={{ color: "#475569", lineHeight: "1.35", display: "block" }}>
                    Choose a dietary pattern rich in vegetables, fruits, whole grains, pulses and legumes; prefer unsaturated plant oils and limit excess sodium, saturated fat, trans fat and highly processed foods.
                  </span>
                </div>
              </>
            ) : (
              <>
                <div style={{ backgroundColor: "#f8fafc", padding: "5px 9px", borderRadius: "5px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0067A1", display: "block", marginBottom: "1.5px" }}>1. Diaphragmatic Box Breathing</strong>
                  <span style={{ color: "#475569" }}>Practice 5–10 minutes of controlled breathing daily to strengthen respiratory muscles and improve tidal capacity.</span>
                </div>
                <div style={{ backgroundColor: "#f8fafc", padding: "5px 9px", borderRadius: "5px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0067A1", display: "block", marginBottom: "1.5px" }}>2. Ambient Pollution Precautions</strong>
                  <span style={{ color: "#475569" }}>Monitor local AQI readings and utilize indoor HEPA air filtration or N95 masks when ambient pollution exceeds 100 AQI.</span>
                </div>
              </>
            )}
          </div>
          <div style={{ marginTop: "5px", fontSize: "8px", color: "#64748b" }}>
            * Content is general health education and not individualized medical advice. Health education content version: V2.4 | Reviewed by: Clinical Team.
          </div>
        </div>

        {/* Emergency Clinical Safety Notice (P1-14) */}
        <div style={{ borderLeft: "3px solid #f59e0b", backgroundColor: "#fffbeb", padding: "6px 12px", marginBottom: "12px", fontSize: "9px", color: "#92400e", lineHeight: "1.4" }}>
          <strong>Emergency Clinical Safety Notice:</strong> If you have severe chest pain, sudden breathlessness, fainting, or acute urgent symptoms, seek immediate emergency medical care rather than relying on this wellness screening. This screening does not diagnose cardiovascular disease or determine individual treatment.
        </div>

        {/* Official Telemedicine & Legal Disclaimer Footer (P0-11, P0-12, P0-19) */}
        <div style={{ borderTop: "1.5px solid #cbd5e1", paddingTop: "8px", fontSize: "8px", color: "#64748b", lineHeight: "1.35" }}>
          <p style={{ margin: "0 0 3px 0" }}>
            <strong>Legal & Telemedicine Disclaimer:</strong> All diagnoses and prescriptions are provided exclusively by your registered consulting medical doctor. MediConnect.fit facilitates teleconsultation and wellness awareness services in accordance with applicable Telemedicine Practice Guidelines. This document is a self-reported wellness screening artifact and not a clinical diagnosis.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "5px", color: "#94a3b8", fontSize: "7.5px" }}>
            <span>Screening Status: Screening Generated (Non-diagnostic) · Data Source: Self-reported · Framework: {isHeart ? "2024 ESC" : "Global Respiratory"}</span>
            <span style={{ fontFamily: "monospace" }}>Serial No: #{serialNo} · Printed: {printTimestamp} · Page 1 of 1</span>
          </div>
        </div>

      </div>
    </div>
  );
}
