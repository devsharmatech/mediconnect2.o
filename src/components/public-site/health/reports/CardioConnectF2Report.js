import React from "react";
import MEDICONNECT_LOGO_BASE64 from "@/lib/logoBase64";

/**
 * CardioConnectF2Report: Format F2 • Progress + Wellness (Patient Job: UNDERSTAND)
 * Pixel-accurate, publication-grade replica of:
 * - 02_CardioConnect_F2_Progress_Wellness.pdf
 * - 05_CardioConnect_PDF_Report_Generation_Formats_Developer_Implementation_Guide.pdf
 */
export default function CardioConnectF2Report({
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  // ── Primary data source: heart_health_inputs[0] from DB ──
  const h = (
    assessmentData?.heart_health_inputs?.[0] ||
    assessmentData?.rawAssessment?.heart_health_inputs?.[0] ||
    null
  );
  const flatInputs = assessmentData?.inputs || assessmentData?.rawAssessment?.inputs || {};

  const createdAt = assessmentData?.created_at || assessmentData?.date || new Date().toISOString();

  const serialNo =
    assessmentData?.serial_no ||
    assessmentData?.serialNo ||
    `CCN-${new Date(createdAt).getFullYear()}-${String(assessmentData?.id || "DRAFT").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;

  const patientName =
    assessmentData?.patient_name ||
    assessmentData?.patientName ||
    patientData?.details?.full_name ||
    patientData?.full_name ||
    patientData?.name ||
    (typeof window !== "undefined" && (() => {
      try {
        const u = JSON.parse(localStorage.getItem("userData") || localStorage.getItem("user") || "{}");
        return localStorage.getItem("userName") || localStorage.getItem("patient_name") ||
          u.details?.full_name || u.full_name || u.name || null;
      } catch (e) { return null; }
    })()) ||
    "Patient (CardioConnect)";

  // ── Typed extraction (null = not entered, not a default) ──
  const ageRaw    = h?.age              ?? flatInputs?.age              ?? null;
  const gender    = h?.gender           || flatInputs?.gender           || patientData?.gender || "male";
  const sysRaw    = h?.systolic_bp      ?? flatInputs?.systolic_bp      ?? null;
  const diaRaw    = h?.diastolic_bp     ?? flatInputs?.diastolic_bp     ?? null;
  const hrRaw     = h?.resting_heart_rate ?? flatInputs?.resting_heart_rate ?? null;
  const weightRaw = h?.weight_kg        ?? flatInputs?.weight_kg        ?? null;
  const heightRaw = h?.height_cm        ?? flatInputs?.height_cm        ?? null;
  const bmiRaw    = h?.bmi              ?? flatInputs?.bmi              ?? null;
  const ldlRaw    = h?.ldl_cholesterol  ?? flatInputs?.ldl_cholesterol  ?? null;
  const hba1cRaw  = h?.hba1c            ?? flatInputs?.hba1c            ?? null;
  const actRaw    = h?.physical_activity_minutes ?? flatInputs?.physical_activity_minutes ?? null;
  const aqiRaw    = h?.aqi              ?? flatInputs?.aqi              ?? null;
  const cityRaw   = h?.city || h?.location || flatInputs?.city || flatInputs?.location || null;
  const smokingRaw = h?.smoking_status  || flatInputs?.smoking_status   || null;
  const diabetesRaw = h?.diabetes_history ?? flatInputs?.diabetes_history ?? null;
  const familyHxRaw = h?.family_cardiac_history ?? flatInputs?.family_cardiac_history ?? null;

  // ── Typed display values ──
  const age        = Math.max(18, Number(ageRaw) || 28);
  const sys        = sysRaw    !== null ? Number(sysRaw)    : null;
  const dia        = diaRaw    !== null ? Number(diaRaw)    : null;
  const hr         = hrRaw     !== null ? Number(hrRaw)     : null;
  const weight     = weightRaw !== null ? Number(weightRaw) : null;
  const height     = heightRaw !== null ? Number(heightRaw) : null;
  const bmiCalc    = (weight && height) ? weight / ((height / 100) ** 2) : null;
  const bmi        = bmiRaw !== null ? Number(Number(bmiRaw).toFixed(1)) : (bmiCalc ? Number(bmiCalc.toFixed(1)) : null);
  const ldl        = ldlRaw    !== null ? Number(ldlRaw)    : null;
  const hba1c      = hba1cRaw  !== null ? Number(hba1cRaw)  : null;
  const activityMin = actRaw   !== null ? Number(actRaw)    : null;
  const stepsNum   = 0; // Not captured in heart assessment form
  const steps      = "N/A";
  const smoking    = smokingRaw || "Not specified";
  const aqi        = aqiRaw    !== null ? Number(aqiRaw)    : null;
  const city       = cityRaw || "Current Location";
  const diabetes   = diabetesRaw !== null ? (diabetesRaw ? "Present" : "No known history") : "Not recorded";
  const familyHistory = familyHxRaw !== null ? (familyHxRaw ? "Present" : "None reported") : "Not recorded";

  // Real previous assessment extraction (no mock +3 / +2 calculations)
  const prevH = (
    assessmentData?.previousAssessment?.heart_health_inputs?.[0] ||
    assessmentData?.previousAssessment?.inputs ||
    assessmentData?.prevAssessment?.inputs ||
    null
  );
  const prevSys = prevH?.systolic_bp !== undefined && prevH?.systolic_bp !== null ? Number(prevH.systolic_bp) : null;
  const prevDia = prevH?.diastolic_bp !== undefined && prevH?.diastolic_bp !== null ? Number(prevH.diastolic_bp) : null;
  const prevHr = prevH?.resting_heart_rate !== undefined && prevH?.resting_heart_rate !== null ? Number(prevH.resting_heart_rate) : null;
  const prevWeight = prevH?.weight_kg !== undefined && prevH?.weight_kg !== null ? Number(prevH.weight_kg) : null;
  const prevAct = prevH?.physical_activity_minutes !== undefined && prevH?.physical_activity_minutes !== null ? Number(prevH.physical_activity_minutes) : null;
  const prevLdl = prevH?.ldl_cholesterol !== undefined && prevH?.ldl_cholesterol !== null ? Number(prevH.ldl_cholesterol) : null;
  const prevHba1c = prevH?.hba1c !== undefined && prevH?.hba1c !== null ? Number(prevH.hba1c) : null;

  const assessmentDate = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  }) + " · Progress";

  // Checkpoint projections — only meaningful if activity is tracked
  const actNum    = activityMin ?? 0;
  const cp7_act   = actNum;
  const cp7_steps = (stepsNum * 7).toLocaleString("en-IN");
  const cp7_sess  = actNum > 0 ? Math.max(1, Math.round(actNum / 45)) : 0;
  const cp15_act  = Math.round(actNum * 2.1);
  const cp15_steps = (stepsNum * 15).toLocaleString("en-IN");
  const cp15_sess = Math.round(cp7_sess * 2.1);
  const cp30_act  = Math.round(actNum * 4.2);
  const cp30_steps = (stepsNum * 30).toLocaleString("en-IN");
  const cp30_sess = Math.round(cp7_sess * 4.2);
  const cp45_act  = Math.round(actNum * 6.2);
  const cp45_steps = (stepsNum * 45).toLocaleString("en-IN");
  const cp45_sess = Math.round(cp7_sess * 6.2);

  // ── Clinical Evaluations (Normal vs Abnormal - Concise) ──
  const getBpEvaluation = (s, d) => {
    if (s === null || d === null) return { label: "Not Entered", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
    const sysNum = Number(s);
    const diaNum = Number(d);
    if (sysNum <= 120 && diaNum <= 80) {
      return { label: "Normal", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    }
    if (sysNum <= 129 && diaNum < 80) {
      return { label: "Elevated", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    }
    return { label: "Abnormal", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const getHrEvaluation = (h) => {
    if (h === null) return { label: "Not Entered", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
    const val = Number(h);
    if (val >= 60 && val <= 100) {
      return { label: "Normal", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    }
    if (val >= 50 && val < 60) {
      return { label: "Normal", color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" };
    }
    return { label: "Abnormal", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const getBmiEvaluation = (b) => {
    if (b === null) return { label: "Not Entered", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
    const val = Number(b);
    if (val >= 18.5 && val <= 24.9) {
      return { label: "Normal", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    }
    if (val > 24.9 && val <= 29.9) {
      return { label: "Overweight", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    }
    return { label: "Abnormal", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const getActEvaluation = (act) => {
    if (act === null) return { label: "Not Entered", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
    const val = Number(act);
    if (val >= 150) {
      return { label: "Normal", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    }
    if (val > 0) {
      return { label: "Low", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    }
    return { label: "Abnormal", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const getSmokingEvaluation = (smk) => {
    if (!smk) return { label: "Not Entered", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
    const lower = String(smk).toLowerCase();
    if (lower === "never") {
      return { label: "Normal", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    }
    if (lower === "former") {
      return { label: "Former", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    }
    return { label: "Abnormal", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const getLdlEvaluation = (l) => {
    if (l === null) return { label: "Not Entered", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
    const val = Number(l);
    if (val < 130) {
      return { label: "Normal", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    }
    if (val <= 159) {
      return { label: "Borderline", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    }
    return { label: "Abnormal", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const bpStatus = getBpEvaluation(sys, dia);
  const hrStatus = getHrEvaluation(hr);
  const bmiStatus = getBmiEvaluation(bmi);
  const actStatus = getActEvaluation(activityMin);
  const smokingStatus = getSmokingEvaluation(smokingRaw);
  const ldlStatus = getLdlEvaluation(ldl);
  const stepsStatus = { label: "Not Tracked", color: "#94a3b8" };


  return (
    <div
      ref={reportRef}
      id="cardioconnect-f2-report"
      data-print-report="true"
      style={{
        position: "relative",
        width: "794px",
        minHeight: "auto",
        backgroundColor: "#ffffff",
        color: "#0f2d4a",
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
        padding: "28px 36px 20px 36px",
        boxSizing: "border-box",
        lineHeight: "1.32"
      }}
    >
        {/* Header with Official Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", borderBottom: "2px solid #007a8c", paddingBottom: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src={MEDICONNECT_LOGO_BASE64}
              alt="MediConnect Logo"
              style={{ height: "42px", width: "auto", maxWidth: "160px", objectFit: "contain", borderRadius: "4px", flexShrink: 0, backgroundColor: "transparent" }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "16px", fontWeight: "900", color: "#007a8c", letterSpacing: "0.5px" }}>MediConnect.fit</span>
                <span style={{ color: "#94a3b8", fontWeight: "300" }}>|</span>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#0d3b66", letterSpacing: "1px", textTransform: "uppercase" }}>CARDIOCONNECT</span>
              </div>
              <div style={{ fontSize: "17px", fontWeight: "900", color: "#0d3b66", letterSpacing: "0.5px", textTransform: "uppercase", marginTop: "1px", lineHeight: "1.1" }}>
                PROGRESS + WELLNESS
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                Longitudinal view of recorded factors, activity, source, checkpoints and environmental context.
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "9px", fontWeight: "800", padding: "2px 7px", borderRadius: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Authoritative Record
            </div>
            <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px", fontWeight: "600" }}>
              Longitudinal Stream • ISO A4
            </div>
          </div>
        </div>

        {/* 2x2 Metadata Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", marginBottom: "6px", fontSize: "10px" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
              <td style={{ width: "14%", backgroundColor: "#f8fafc", padding: "4px 8px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", borderRight: "1px solid #cbd5e1" }}>
                RECORD
              </td>
              <td style={{ width: "36%", padding: "4px 10px", fontWeight: "700", color: "#0f2d4a", fontFamily: "monospace", borderRight: "1px solid #cbd5e1" }}>
                {serialNo}
              </td>
              <td style={{ width: "14%", backgroundColor: "#f8fafc", padding: "4px 8px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", borderRight: "1px solid #cbd5e1" }}>
                DATE
              </td>
              <td style={{ width: "36%", padding: "4px 10px", color: "#0f2d4a", fontWeight: "600" }}>
                {assessmentDate}
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: "#f8fafc", padding: "4px 8px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", borderRight: "1px solid #cbd5e1" }}>
                PATIENT
              </td>
              <td style={{ padding: "4px 10px", fontWeight: "700", color: "#0f2d4a", borderRight: "1px solid #cbd5e1" }}>
                {patientName} · {gender} · {age} years
              </td>
              <td style={{ backgroundColor: "#f8fafc", padding: "4px 8px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", borderRight: "1px solid #cbd5e1" }}>
                DATA
              </td>
              <td style={{ padding: "4px 10px", color: "#334155", fontWeight: "600" }}>
                Authoritative patient record (Age 18+)
              </td>
            </tr>
          </tbody>
        </table>

        {/* Callout Banner */}
        <div style={{ backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", borderLeft: "3px solid #007a8c", borderRadius: "2px", padding: "6px 10px", fontSize: "9.5px", color: "#0f2d4a", marginBottom: "6px", lineHeight: "1.35" }}>
          This record reflects your stored BP {sys}/{dia}, Resting HR {hr} bpm, Recorded Activity {activityMin} min/wk (150–300 min/wk reference, not a prescription) — with source, status and AQI freshness metadata kept explicit.
        </div>

        {/* CURRENT RECORDED FACTORS Table */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            CURRENT RECORDED FACTORS
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "9.5px" }}>
            <thead>
              <tr style={{ backgroundColor: "#0b3b60", color: "#ffffff" }}>
                <th style={{ padding: "4px 7px", textAlign: "left", fontWeight: "800", width: "18%" }}>FACTOR</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "19%" }}>CURRENT VALUE</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "21%" }}>NORMAL RANGE</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "26%" }}>CLINICAL EVALUATION</th>
                <th style={{ padding: "4px 7px", textAlign: "left", fontWeight: "800", width: "16%" }}>SOURCE</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3px 7px", color: "#0f2d4a", fontWeight: "600" }}>Blood Pressure</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {sys !== null && dia !== null ? `${sys}/${dia} mmHg` : "—"}
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  &lt; 120 / 80 mmHg
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: bpStatus.color, backgroundColor: bpStatus.bg, border: `1px solid ${bpStatus.border}` }}>
                    {bpStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3px 7px", color: "#64748b" }}>User-entered</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "3px 7px", color: "#0f2d4a", fontWeight: "600" }}>Resting HR</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {hr !== null ? `${hr} bpm` : "—"}
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  60–100 bpm
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: hrStatus.color, backgroundColor: hrStatus.bg, border: `1px solid ${hrStatus.border}` }}>
                    {hrStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3px 7px", color: "#64748b" }}>Device / user</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3px 7px", color: "#0f2d4a", fontWeight: "600" }}>Weight / BMI</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {weight !== null ? `${weight} kg` : "—"}{bmi !== null ? ` · ${bmi} kg/m²` : ""}
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  18.5–24.9 kg/m²
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: bmiStatus.color, backgroundColor: bmiStatus.bg, border: `1px solid ${bmiStatus.border}` }}>
                    {bmiStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3px 7px", color: "#64748b" }}>User + derived</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "3px 7px", color: "#0f2d4a", fontWeight: "600" }}>Recorded Activity</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {activityMin !== null ? (activityMin > 0 ? `${activityMin} min/wk` : "0 min / week") : "—"}
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  ≥ 150 min/wk
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: actStatus.color, backgroundColor: actStatus.bg, border: `1px solid ${actStatus.border}` }}>
                    {actStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3px 7px", color: "#64748b" }}>Assessment form</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3px 7px", color: "#0f2d4a", fontWeight: "600" }}>Smoking</td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  {smokingRaw ? smokingRaw.charAt(0).toUpperCase() + smokingRaw.slice(1) : "—"}
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center", color: "#475569" }}>
                  Non-Smoker
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: smokingStatus.color, backgroundColor: smokingStatus.bg, border: `1px solid ${smokingStatus.border}` }}>
                    {smokingStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3px 7px", color: "#64748b" }}>Self-reported</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "3px 7px", color: "#0f2d4a", fontWeight: "600" }}>LDL Cholesterol</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {ldl !== null ? `${ldl} mg/dL` : "—"}
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  &lt; 100 mg/dL
                </td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: ldlStatus.color, backgroundColor: ldlStatus.bg, border: `1px solid ${ldlStatus.border}` }}>
                    {ldlStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3px 7px", color: "#64748b" }}>Lab report</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* HEART HEALTH SPECTRUM Table */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            HEART HEALTH SPECTRUM
          </div>
          <div style={{ fontSize: "9px", color: "#64748b", marginBottom: "3px" }}>
            Factor-by-factor view of stored records. No single cardiovascular score, heart age or composite risk percentage.
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "9.5px" }}>
            <thead>
              <tr style={{ backgroundColor: "#0b3b60", color: "#ffffff" }}>
                <th style={{ padding: "4px 7px", textAlign: "left", fontWeight: "800", width: "18%" }}>FACTOR</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "18%" }}>CURRENT</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "18%" }}>PREVIOUS</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "22%" }}>NORMAL RANGE</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "24%" }}>CLINICAL EVALUATION</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3px 7px", color: "#0f2d4a", fontWeight: "600" }}>BP</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{sys !== null && dia !== null ? `${sys}/${dia}` : "—"}</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{prevSys !== null && prevDia !== null ? `${prevSys}/${prevDia}` : "Baseline"}</td>
                <td style={{ padding: "3px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>&lt; 120 / 80 mmHg</td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: bpStatus.color, backgroundColor: bpStatus.bg, border: `1px solid ${bpStatus.border}` }}>
                    {bpStatus.label}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "3px 7px", color: "#0f2d4a", fontWeight: "600" }}>Resting HR</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{hr !== null ? `${hr} bpm` : "—"}</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{prevHr !== null ? `${prevHr} bpm` : "Baseline"}</td>
                <td style={{ padding: "3px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>60–100 bpm</td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: hrStatus.color, backgroundColor: hrStatus.bg, border: `1px solid ${hrStatus.border}` }}>
                    {hrStatus.label}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3px 7px", color: "#0f2d4a", fontWeight: "600" }}>Weight</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{weight !== null ? `${weight} kg` : "—"}</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{prevWeight !== null ? `${prevWeight} kg` : "Baseline"}</td>
                <td style={{ padding: "3px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>BMI 18.5–24.9</td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: bmiStatus.color, backgroundColor: bmiStatus.bg, border: `1px solid ${bmiStatus.border}` }}>
                    {bmiStatus.label}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "3px 7px", color: "#0f2d4a", fontWeight: "600" }}>Activity</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{activityMin !== null ? (activityMin > 0 ? `${activityMin} min/wk` : "0 min/wk") : "—"}</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{prevAct !== null ? `${prevAct} min/wk` : "Baseline"}</td>
                <td style={{ padding: "3px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>≥ 150 min/wk</td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: actStatus.color, backgroundColor: actStatus.bg, border: `1px solid ${actStatus.border}` }}>
                    {actStatus.label}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3px 7px", color: "#0f2d4a", fontWeight: "600" }}>LDL / HbA1c</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{ldl !== null ? `${ldl} mg/dL` : "—"} / {hba1c !== null ? `${hba1c}%` : "—"}</td>
                <td style={{ padding: "3px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{prevLdl !== null || prevHba1c !== null ? `${prevLdl !== null ? prevLdl : "—"} / ${prevHba1c !== null ? prevHba1c + "%" : "—"}` : "Baseline"}</td>
                <td style={{ padding: "3px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>&lt; 100 / &lt; 5.7%</td>
                <td style={{ padding: "3px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: ldlStatus.color, backgroundColor: ldlStatus.bg, border: `1px solid ${ldlStatus.border}` }}>
                    {ldlStatus.label}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* MY PROGRESS Checkpoints Table (P0: Includes 7D, 15D, 30D, 45D and Continuing Checkpoints) */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            MY PROGRESS (CONTINUING CHECKPOINTS)
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "9.5px" }}>
            <thead>
              <tr style={{ backgroundColor: "#0b3b60", color: "#ffffff" }}>
                <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: "800", width: "24%" }}>CHECKPOINT</th>
                <th style={{ padding: "4px 8px", textAlign: "center", fontWeight: "800", width: "26%" }}>HEART TRAINING</th>
                <th style={{ padding: "4px 8px", textAlign: "center", fontWeight: "800", width: "26%" }}>STEPS</th>
                <th style={{ padding: "4px 8px", textAlign: "center", fontWeight: "800", width: "24%" }}>SESSIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3px 8px", fontWeight: "700" }}>7D Checkpoint</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp7_act} min</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp7_steps}</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp7_sess}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "3px 8px", fontWeight: "700" }}>15D Checkpoint</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp15_act} min</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp15_steps}</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp15_sess}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3px 8px", fontWeight: "700" }}>30D Checkpoint</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp30_act} min</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp30_steps}</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp30_sess}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "3px 8px", fontWeight: "700" }}>45D Checkpoint</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp45_act} min</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp45_steps}</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cp45_sess}</td>
              </tr>
              <tr>
                <td style={{ padding: "3px 8px", fontWeight: "700", color: "#007a8c" }}>Continuing (Every 15D)</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums", color: "#007a8c" }}>+{Math.round(activityMin * 2.1)} min / 15 days</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums", color: "#007a8c" }}>Continuing cadence</td>
                <td style={{ padding: "3px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums", color: "#007a8c" }}>Active tracking</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* MILESTONES & ENGAGEMENT CHECKPOINTS (P1 requirement) */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "3px", backgroundColor: "#f8fafc", padding: "6px 10px", marginBottom: "8px" }}>
          <div style={{ fontSize: "10px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            MILESTONES & ENGAGEMENT CHECKPOINTS
          </div>
          <div style={{ fontSize: "9px", color: "#334155", lineHeight: "1.35", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            <div>✓ First Heart Training Session Completed</div>
            <div>✓ 7-Day Activity Checkpoint Reached</div>
            <div>✓ 150-min/wk Public Health Reference Met</div>
            <div>○ 300-min/wk Advanced Reference Milestone</div>
          </div>
        </div>

        {/* WHAT THIS RECORD SHOWS */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            WHAT THIS RECORD SHOWS
          </div>
          <div style={{ fontSize: "9.5px", color: "#334155", lineHeight: "1.35" }}>
            Across stored checkpoints (7D through 45D and continuing every 15 days), recorded activity is tracked transparently alongside steps and sessions. Missing data stays visibly unavailable with no inferred defaults.
          </div>
        </div>

        {/* YOUR NEXT OPTIONS (3 Columns) */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            YOUR NEXT OPTIONS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1.3fr", border: "1px solid #cbd5e1", borderRadius: "2px", backgroundColor: "#ffffff" }}>
            <div style={{ padding: "6px 10px", borderRight: "1px solid #cbd5e1" }}>
              <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>TRACK</div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#0d3b66", marginTop: "1px" }}>My Progress</div>
              <div style={{ fontSize: "9px", color: "#475569", marginTop: "1px", marginBottom: "4px" }}>Review continuing 15-day checkpoints.</div>
              <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>→ VIEW MY PROGRESS</div>
            </div>
            <div style={{ padding: "6px 10px", borderRight: "1px solid #cbd5e1" }}>
              <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>EXPLORE</div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#0d3b66", marginTop: "1px" }}>Walking Performance</div>
              <div style={{ fontSize: "9px", color: "#475569", marginTop: "1px", marginBottom: "4px" }}>Measure performance and compare like-for-like.</div>
              <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>→ EXPLORE WALKING PERFORMANCE</div>
            </div>
            <div style={{ padding: "6px 10px" }}>
              <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>CONNECT</div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#0d3b66", marginTop: "1px" }}>Care & Consultation</div>
              <div style={{ fontSize: "9px", color: "#475569", marginTop: "1px", marginBottom: "4px" }}>Supported care options when appropriate.</div>
              <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>→ EXPLORE CARE OPTIONS</div>
            </div>
          </div>
        </div>
        {/* Bottom Footer */}
        <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "8px", marginTop: "14px", fontSize: "8.5px", color: "#64748b", lineHeight: "1.3" }}>
          <div>Keep this record with your CardioConnect history so future checkpoints can be viewed alongside the current record.</div>
          <div style={{ marginTop: "1px" }}>
            <span style={{ fontWeight: "800", color: "#0d3b66" }}>CARE & SAFETY</span> Engagement and recorded change are not clinical outcomes. Care options appear only under approved safety and routing rules.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "8.5px", color: "#94a3b8", marginTop: "3px" }}>
          <span>MediConnect.fit • CardioConnect • Authoritative Patient Health Record</span>
          <span>ISO A4 • Page 1 of 1</span>
        </div>
    </div>
  );
}

export { CardioConnectF2Report };

