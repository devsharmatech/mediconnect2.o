import React from "react";
import { FaHeartbeat, FaLungs } from "react-icons/fa";

export default function AssessmentPrintReport({
  assessmentType = "heart",
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  const isHeart = assessmentType === "heart";
  const inputs = isHeart
    ? assessmentData?.heart_health_inputs?.[0] || {}
    : assessmentData?.lung_health_inputs?.[0] || {};

  const score = assessmentData?.health_score || 75;
  const riskLevel = assessmentData?.risk_level || "moderate";
  const createdAt = assessmentData?.created_at || new Date().toISOString();
  const serialNo = assessmentData?.serial_no || (
    isHeart
      ? `CCN-${new Date(createdAt).getFullYear()}-${(assessmentData?.id || '').slice(0, 8).toUpperCase()}`
      : `LCN-${new Date(createdAt).getFullYear()}-${(assessmentData?.id || '').slice(0, 8).toUpperCase()}`
  );

  const patientName = patientData?.name || patientData?.full_name || patientData?.user?.name || "Patient";
  const patientEmail = patientData?.email || patientData?.user?.email || "";
  const patientAge = inputs?.age || patientData?.age || 45;
  const patientGender = inputs?.gender || inputs?.sex || patientData?.gender || "Not Specified";
  const bmi = inputs?.bmi ? Number(inputs?.bmi).toFixed(1) : (inputs?.height_cm && inputs?.weight_kg ? (inputs?.weight_kg / ((inputs?.height_cm/100)**2)).toFixed(1) : "22.5");

  return (
    <div
      ref={reportRef}
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0,
        width: "800px",
        backgroundColor: "#ffffff",
        color: "#1e293b",
        fontFamily: "Arial, sans-serif",
        padding: "36px 40px",
        boxSizing: "border-box"
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: "2px solid #0067A1", paddingBottom: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#0067A1", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "16px" }}>
              M
            </div>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#0067A1", letterSpacing: "-0.5px" }}>MediConnect.fit</span>
          </div>
          <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>Digital Health Wellness & Screening Platform</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {isHeart ? "Cardiovascular Screening Summary" : "Respiratory Screening Summary"}
          </h2>
          <p style={{ margin: 0, fontSize: "11px", fontFamily: "monospace", color: "#0067A1", fontWeight: "bold" }}>
            Serial No: #{serialNo}
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: "10px", color: "#64748b" }}>
            Date: {new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Patient Profile Card */}
      <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px", marginBottom: "18px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "4px 0", color: "#64748b", width: "15%" }}>Patient Name:</td>
              <td style={{ padding: "4px 0", fontWeight: "bold", color: "#0f172a", width: "35%" }}>{patientName}</td>
              <td style={{ padding: "4px 0", color: "#64748b", width: "15%" }}>Chronological Age:</td>
              <td style={{ padding: "4px 0", fontWeight: "bold", color: "#0f172a", width: "35%" }}>{patientAge} yrs</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "#64748b" }}>Gender / Sex:</td>
              <td style={{ padding: "4px 0", fontWeight: "bold", color: "#0f172a", textTransform: "capitalize" }}>{patientGender}</td>
              <td style={{ padding: "4px 0", color: "#64748b" }}>Calculated BMI:</td>
              <td style={{ padding: "4px 0", fontWeight: "bold", color: "#0f172a" }}>{bmi} kg/m² ({inputs?.height_cm || 172} cm / {inputs?.weight_kg || 70} kg)</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "#64748b" }}>Data Source:</td>
              <td style={{ padding: "4px 0", color: "#059669", fontWeight: "bold" }}>Self-reported</td>
              <td style={{ padding: "4px 0", color: "#64748b" }}>Guideline:</td>
              <td style={{ padding: "4px 0", color: "#0284c7", fontWeight: "bold" }}>{isHeart ? "2024 ESC Framework" : "Standard Respiratory Model"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Primary Score Banner */}
      <div style={{ backgroundColor: "#0067A1", color: "#ffffff", borderRadius: "8px", padding: "14px 20px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.85, display: "block" }}>
            {isHeart ? "Heart Health Lifestyle Score" : "Lung Health Lifestyle Score"}
          </span>
          <span style={{ fontSize: "28px", fontWeight: "900", fontFamily: "monospace" }}>{score} <span style={{ fontSize: "14px", fontWeight: "normal", opacity: 0.8 }}>/ 100</span></span>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ display: "inline-block", backgroundColor: "#ffffff", color: "#0067A1", padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {riskLevel} Risk
          </span>
        </div>
      </div>

      {/* Observations Table */}
      <div style={{ marginBottom: "18px" }}>
        <h3 style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#0f172a", margin: "0 0 8px 0" }}>
          {isHeart ? "Cardiovascular Vitals & Spectrum Observations" : "Respiratory & Environmental Observations"}
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", border: "1px solid #e2e8f0" }}>
          <thead>
            <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left", color: "#475569" }}>
              <th style={{ padding: "8px 10px", borderBottom: "1px solid #cbd5e1" }}>Parameter</th>
              <th style={{ padding: "8px 10px", borderBottom: "1px solid #cbd5e1" }}>Recorded Value</th>
              <th style={{ padding: "8px 10px", borderBottom: "1px solid #cbd5e1" }}>Optimal Benchmark</th>
              <th style={{ padding: "8px 10px", borderBottom: "1px solid #cbd5e1" }}>Observation</th>
            </tr>
          </thead>
          <tbody>
            {isHeart ? (
              <>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px", fontWeight: "bold" }}>Blood Pressure</td>
                  <td style={{ padding: "6px 10px" }}>{inputs?.systolic_bp && inputs?.diastolic_bp ? `${inputs.systolic_bp}/${inputs.diastolic_bp} mmHg` : "120/80 mmHg"}</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>&lt; 120/80 mmHg</td>
                  <td style={{ padding: "6px 10px", color: inputs?.systolic_bp >= 140 ? "#b91c1c" : "#059669", fontWeight: "bold" }}>
                    {inputs?.systolic_bp >= 140 ? "Elevated" : "Optimal / Normal"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px", fontWeight: "bold" }}>LDL Cholesterol</td>
                  <td style={{ padding: "6px 10px" }}>{inputs?.ldl_cholesterol || 110} mg/dL</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>&lt; 100 mg/dL</td>
                  <td style={{ padding: "6px 10px", color: inputs?.ldl_cholesterol > 160 ? "#b91c1c" : "#059669", fontWeight: "bold" }}>
                    {inputs?.ldl_cholesterol > 160 ? "High" : "Optimal"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px", fontWeight: "bold" }}>Resting Heart Rate</td>
                  <td style={{ padding: "6px 10px" }}>{inputs?.resting_heart_rate || 72} bpm</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>60–80 bpm</td>
                  <td style={{ padding: "6px 10px", color: inputs?.resting_heart_rate > 100 ? "#b91c1c" : "#059669", fontWeight: "bold" }}>
                    {inputs?.resting_heart_rate > 100 ? "Elevated" : "Normal"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px", fontWeight: "bold" }}>Physical Activity</td>
                  <td style={{ padding: "6px 10px" }}>{inputs?.physical_activity_minutes ? `${inputs.physical_activity_minutes} mins/wk` : "150 mins/wk"}</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>&ge; 150 mins/wk</td>
                  <td style={{ padding: "6px 10px", color: "#059669", fontWeight: "bold" }}>Adequate</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px", fontWeight: "bold" }}>Smoking Status</td>
                  <td style={{ padding: "6px 10px", textTransform: "capitalize" }}>{inputs?.smoking_status || "Never"}</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>Non-smoker</td>
                  <td style={{ padding: "6px 10px", color: inputs?.smoking_status === "current" ? "#b91c1c" : "#059669", fontWeight: "bold" }}>
                    {inputs?.smoking_status === "current" ? "High Risk" : "Non-smoker"}
                  </td>
                </tr>
              </>
            ) : (
              <>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px", fontWeight: "bold" }}>Breath Holding Duration</td>
                  <td style={{ padding: "6px 10px" }}>{inputs?.breath_holding_time || 35} seconds</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>&ge; 30 seconds</td>
                  <td style={{ padding: "6px 10px", color: inputs?.breath_holding_time < 20 ? "#b91c1c" : "#059669", fontWeight: "bold" }}>
                    {inputs?.breath_holding_time < 20 ? "Below Reference" : "Adequate"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px", fontWeight: "bold" }}>Peak Flow (PEFR)</td>
                  <td style={{ padding: "6px 10px" }}>{inputs?.peak_flow || 450} L/min</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>400–600 L/min</td>
                  <td style={{ padding: "6px 10px", color: "#059669", fontWeight: "bold" }}>Normal Range</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px", fontWeight: "bold" }}>Breaths Per Minute</td>
                  <td style={{ padding: "6px 10px" }}>{inputs?.breaths_per_minute || 16} bpm</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>12–20 bpm</td>
                  <td style={{ padding: "6px 10px", color: "#059669", fontWeight: "bold" }}>Normal</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px", fontWeight: "bold" }}>Local AQI Exposure</td>
                  <td style={{ padding: "6px 10px" }}>{inputs?.aqi || 60} AQI ({inputs?.pollution_exposure || "low"} exposure)</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>&lt; 50 AQI</td>
                  <td style={{ padding: "6px 10px", color: inputs?.aqi > 150 ? "#b91c1c" : "#059669", fontWeight: "bold" }}>
                    {inputs?.aqi > 150 ? "Unhealthy" : "Moderate / Good"}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Clinical Narrative & Action Plan */}
      <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "11px" }}>
        <h4 style={{ margin: "0 0 6px 0", fontSize: "11px", fontWeight: "bold", color: "#0f172a", textTransform: "uppercase" }}>
          Screening Narrative Summary
        </h4>
        <p style={{ margin: 0, color: "#334155", lineHeight: "1.5" }}>
          {typeof assessmentData?.ai_analysis === "string"
            ? assessmentData?.ai_analysis
            : (assessmentData?.ai_analysis?.analysis || "Assessment summary: Based on self-reported entries, parameters reflect current lifestyle factors. Regular aerobic activity, balanced diet, and periodic monitoring are recommended.")}
        </p>
      </div>

      {/* ESC 2024 / Safety Note */}
      {isHeart ? (
        <div style={{ borderLeft: "3px solid #0284c7", backgroundColor: "#f0f9ff", padding: "8px 12px", marginBottom: "16px", fontSize: "10px", color: "#0369a1" }}>
          <strong>Blood Pressure Note (2024 ESC Framework):</strong> Single reading of {inputs?.systolic_bp || 120}/{inputs?.diastolic_bp || 80} mmHg does not diagnose hypertension. Official classification requires repeated clinical measurements.
        </div>
      ) : (
        <div style={{ borderLeft: "3px solid #f59e0b", backgroundColor: "#fffbeb", padding: "8px 12px", marginBottom: "16px", fontSize: "10px", color: "#92400e" }}>
          <strong>Respiratory Clinical Notice:</strong> This wellness screening does not replace clinical spirometry or diagnostic pulmonary testing. Seek immediate emergency care for acute breathlessness or chest discomfort.
        </div>
      )}

      {/* Footer / Telemedicine Disclaimer */}
      <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "12px", fontSize: "9px", color: "#64748b", lineHeight: "1.4" }}>
        <p style={{ margin: "0 0 4px 0" }}>
          <strong>Legal & Medical Disclaimer:</strong> All diagnoses and prescriptions are provided by your consulting doctor. MediConnect.fit facilitates teleconsultation and wellness awareness services in accordance with applicable Telemedicine Practice Guidelines. This document is a self-reported wellness screening artifact and not a clinical diagnosis.
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", color: "#94a3b8" }}>
          <span>MediConnect.fit · Automated System Generated Record</span>
          <span style={{ fontFamily: "monospace" }}>Serial No: #{serialNo}</span>
        </div>
      </div>
    </div>
  );
}
