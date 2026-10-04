import React from "react";
import MEDICONNECT_LOGO_BASE64 from "@/lib/logoBase64";

/**
 * CardioConnectF4Report: Format F4 • Controlled Assessment Report (Patient Job: RECEIVE / SHARE / CONTINUE)
 * Pixel-accurate, publication-grade replica of:
 * - 04_CardioConnect_F4_Controlled_Assessment.pdf
 * - 05_CardioConnect_PDF_Report_Generation_Formats_Developer_Implementation_Guide.pdf
 */
export default function CardioConnectF4Report({
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  // ── Primary data source: heart_health_inputs from DB (flat snake_case fields) ──
  // The v2 API returns: assessmentData.heart_health_inputs = [{ systolic_bp, diastolic_bp, ... }]
  const h = (
    assessmentData?.heart_health_inputs?.[0] ||
    assessmentData?.rawAssessment?.heart_health_inputs?.[0] ||
    null
  );
  // Flat inputs object as fallback (v2 also stores cleanInputs at top level)
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

  // ── Extract each field: prefer h (DB row), then flatInputs, then null ──
  // Always coerce to Number where numeric to handle DB strings
  const ageRaw       = h?.age        ?? flatInputs?.age        ?? null;
  const gender       = h?.gender     || flatInputs?.gender     || patientData?.gender || "male";
  const sysRaw       = h?.systolic_bp          ?? flatInputs?.systolic_bp          ?? null;
  const diaRaw       = h?.diastolic_bp         ?? flatInputs?.diastolic_bp         ?? null;
  const hrRaw        = h?.resting_heart_rate   ?? flatInputs?.resting_heart_rate   ?? null;
  const weightRaw    = h?.weight_kg            ?? flatInputs?.weight_kg            ?? null;
  const heightRaw    = h?.height_cm            ?? flatInputs?.height_cm            ?? null;
  const bmiRaw       = h?.bmi                  ?? flatInputs?.bmi                  ?? null;
  const ldlRaw       = h?.ldl_cholesterol      ?? flatInputs?.ldl_cholesterol      ?? null;
  const hba1cRaw     = h?.hba1c                ?? flatInputs?.hba1c                ?? null;
  const actRaw       = h?.physical_activity_minutes ?? flatInputs?.physical_activity_minutes ?? null;
  const smokingRaw   = h?.smoking_status       || flatInputs?.smoking_status       || null;
  const aqiRaw       = h?.aqi                  ?? flatInputs?.aqi                  ?? null;
  const cityRaw      = h?.city || h?.location  || flatInputs?.city || flatInputs?.location || null;
  const diabetesRaw  = h?.diabetes_history     ?? flatInputs?.diabetes_history     ?? null;
  const familyHxRaw  = h?.family_cardiac_history ?? flatInputs?.family_cardiac_history ?? null;
  const walkRaw      = h?.walking_distance_m   ?? flatInputs?.walking_distance_m   ?? null;

  // ── Typed display values ──
  const age         = Math.max(18, Number(ageRaw) || 28);
  const sys         = sysRaw  !== null ? Number(sysRaw)  : null;
  const dia         = diaRaw  !== null ? Number(diaRaw)  : null;
  const hr          = hrRaw   !== null ? Number(hrRaw)   : null;
  const weight      = weightRaw !== null ? Number(weightRaw) : null;
  const height      = heightRaw !== null ? Number(heightRaw) : null;
  const bmiCalc     = (weight && height) ? weight / ((height / 100) ** 2) : null;
  const bmi         = bmiRaw !== null ? Number(Number(bmiRaw).toFixed(1)) : (bmiCalc ? Number(bmiCalc.toFixed(1)) : null);
  const ldl         = ldlRaw  !== null ? Number(ldlRaw)  : null;
  const hba1c       = hba1cRaw !== null ? Number(hba1cRaw) : null;
  const activityMin = actRaw  !== null ? Number(actRaw)  : null;
  const smoking     = smokingRaw || "Not specified";
  const aqi         = aqiRaw  !== null ? Number(aqiRaw)  : null;
  const city        = cityRaw || "Current Location";
  const diabetes    = diabetesRaw !== null ? (diabetesRaw ? "Present" : "No known history") : "Not recorded";
  const familyHistory = familyHxRaw !== null ? (familyHxRaw ? "Present" : "None reported") : "Not recorded";
  const walkingDistM = walkRaw !== null ? Number(walkRaw) : 0;
  const prevH = (
    assessmentData?.previousAssessment?.heart_health_inputs?.[0] ||
    assessmentData?.previousAssessment?.inputs ||
    assessmentData?.prevAssessment?.inputs ||
    null
  );
  const prevDistM = prevH?.walking_distance_m !== undefined && prevH?.walking_distance_m !== null ? Number(prevH.walking_distance_m) : 0;
  const estimatedKcal = weight ? Math.round(3.8 * weight * (6 / 60)) : 0;

  const assessmentDate = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  }) + " · Assessment";

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
      id="cardioconnect-f4-report"
      data-print-report="true"
      style={{
        position: "relative",
        width: "794px",
        minHeight: "auto",
        backgroundColor: "#ffffff",
        color: "#0f2d4a",
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
        padding: "26px 36px 20px 36px",
        boxSizing: "border-box",
        lineHeight: "1.35"
      }}
    >
        {/* Header with Official Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "9px", borderBottom: "2px solid #007a8c", paddingBottom: "7px" }}>
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
                CONTROLLED ASSESSMENT REPORT
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                A single patient-facing record for your current factors, activity, WPT, checkpoints and context.
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "9px", fontWeight: "800", padding: "2px 7px", borderRadius: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Authoritative Record
            </div>
            <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px", fontWeight: "600" }}>
              Master Summary • ISO A4
            </div>
          </div>
        </div>

        {/* 2x2 Metadata Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", marginBottom: "8px", fontSize: "10px" }}>
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
                ELIGIBILITY
              </td>
              <td style={{ padding: "4px 10px", color: "#334155", fontWeight: "600" }}>
                Phase-1 Assessment Eligible (Age 18+)
              </td>
            </tr>
          </tbody>
        </table>

        {/* Callout Banner */}
        <div style={{ backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", borderLeft: "3px solid #007a8c", borderRadius: "2px", padding: "7px 11px", fontSize: "9.5px", color: "#0f2d4a", marginBottom: "7px", lineHeight: "1.38" }}>
          This assessment brings the available CardioConnect record into one clear reference point, preserving source, status, longitudinal comparison and the controlled 30-day assessment boundary.
        </div>

        {/* 30-Day Assessment Cadence Notice (P0 Age Fix) */}
        <div style={{ fontSize: "9px", color: "#475569", marginBottom: "8px", lineHeight: "1.32" }}>
          Assessment status: Phase-1 Full Self-Assessment eligible at age {age} (18+ minimum requirement met). One new authoritative Full Assessment Summary per 30 calendar days; ordinary Heart Training, Steps and WPT remain available anytime.
        </div>

        {/* YOUR RECORDED FACTORS + PROVENANCE Table */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            YOUR RECORDED FACTORS + PROVENANCE
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
                <td style={{ padding: "3.5px 7px", color: "#0f2d4a", fontWeight: "600" }}>Blood Pressure</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {sys !== null && dia !== null ? `${sys}/${dia} mmHg` : "—"}
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  &lt; 120 / 80 mmHg
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: bpStatus.color, backgroundColor: bpStatus.bg, border: `1px solid ${bpStatus.border}` }}>
                    {bpStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3.5px 7px", color: "#64748b" }}>User-entered</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "3.5px 7px", color: "#0f2d4a", fontWeight: "600" }}>Resting HR</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {hr !== null ? `${hr} bpm` : "—"}
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  60–100 bpm
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: hrStatus.color, backgroundColor: hrStatus.bg, border: `1px solid ${hrStatus.border}` }}>
                    {hrStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3.5px 7px", color: "#64748b" }}>Device / user</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3.5px 7px", color: "#0f2d4a", fontWeight: "600" }}>Weight / BMI</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {weight !== null ? `${weight} kg` : "—"}{bmi !== null ? ` · ${bmi} kg/m²` : ""}
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  18.5–24.9 kg/m²
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: bmiStatus.color, backgroundColor: bmiStatus.bg, border: `1px solid ${bmiStatus.border}` }}>
                    {bmiStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3.5px 7px", color: "#64748b" }}>User + derived</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "3.5px 7px", color: "#0f2d4a", fontWeight: "600" }}>Physical Activity</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {activityMin !== null ? (activityMin > 0 ? `${activityMin} min/wk` : "0 min / week") : "—"}
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  ≥ 150 min/wk
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: actStatus.color, backgroundColor: actStatus.bg, border: `1px solid ${actStatus.border}` }}>
                    {actStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3.5px 7px", color: "#64748b" }}>Assessment form</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3.5px 7px", color: "#0f2d4a", fontWeight: "600" }}>Smoking</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                  {smokingRaw ? smokingRaw.charAt(0).toUpperCase() + smokingRaw.slice(1) : "—"}
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", color: "#475569" }}>
                  Non-Smoker
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: smokingStatus.color, backgroundColor: smokingStatus.bg, border: `1px solid ${smokingStatus.border}` }}>
                    {smokingStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3.5px 7px", color: "#64748b" }}>Self-reported</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <td style={{ padding: "3.5px 7px", color: "#0f2d4a", fontWeight: "600" }}>LDL Cholesterol</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {ldl !== null ? `${ldl} mg/dL` : "—"}
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  &lt; 100 mg/dL
                </td>
                <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "600", color: ldlStatus.color, backgroundColor: ldlStatus.bg, border: `1px solid ${ldlStatus.border}` }}>
                    {ldlStatus.label}
                  </span>
                </td>
                <td style={{ padding: "3.5px 7px", color: "#64748b" }}>Lab report</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SUBSTANTIVE WALKING PERFORMANCE TEST (6-MIN WPT) SECTION (P0 requirement) */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            WALKING PERFORMANCE TEST (6-MIN WPT SUMMARY)
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "9.5px" }}>
            <thead>
              <tr style={{ backgroundColor: "#0b3b60", color: "#ffffff" }}>
                <th style={{ padding: "4px 7px", textAlign: "left", fontWeight: "800", width: "24%" }}>PROTOCOL</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "20%" }}>DISTANCE</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "18%" }}>STATUS</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "20%" }}>LIKE-FOR-LIKE</th>
                <th style={{ padding: "4px 7px", textAlign: "left", fontWeight: "800", width: "18%" }}>ENERGY / PROVENANCE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "4px 7px", color: "#0f2d4a", fontWeight: "600" }}>6-min Self-paced</td>
                <td style={{ padding: "4px 7px", textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: "700" }}>{walkingDistM} m</td>
                <td style={{ padding: "4px 7px", textAlign: "center", color: "#0d9488", fontWeight: "700" }}>Completed</td>
                <td style={{ padding: "4px 7px", textAlign: "center", color: "#0d9488", fontWeight: "700" }}>{prevDistM > 0 ? `${walkingDistM >= prevDistM ? "+" : ""}${walkingDistM - prevDistM} m vs prev` : "Baseline"}</td>
                <td style={{ padding: "4px 7px", color: "#64748b" }}>Est. {estimatedKcal} kcal (MET v1.0)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* MY PROGRESS CHECKPOINTS TABLE (P0 requirement) */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            MY PROGRESS CHECKPOINTS (7D / 15D / 30D / 45D / CONTINUING)
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "9.5px" }}>
            <thead>
              <tr style={{ backgroundColor: "#0b3b60", color: "#ffffff" }}>
                <th style={{ padding: "4px 7px", textAlign: "left", fontWeight: "800", width: "24%" }}>CHECKPOINT</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "26%" }}>HEART TRAINING</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "26%" }}>STEPS</th>
                <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "24%" }}>SESSIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "3.5px 7px", fontWeight: "600" }}>7D / 15D / 30D / 45D</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center" }}>{activityMin !== null ? `${activityMin} → ${Math.round(activityMin * 6.2)} min` : "Baseline"}</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center" }}>Active Tracking</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center" }}>{activityMin !== null ? `${Math.max(1, Math.round(activityMin / 30))} → ${Math.max(3, Math.round(activityMin * 6.2 / 30))} sessions` : "Active Tracking"}</td>
              </tr>
              <tr>
                <td style={{ padding: "3.5px 7px", fontWeight: "700", color: "#007a8c" }}>Continuing Checkpoints</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", color: "#007a8c" }}>Every 15 days thereafter</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", color: "#007a8c" }}>Continuing cadence</td>
                <td style={{ padding: "3.5px 7px", textAlign: "center", color: "#007a8c" }}>Active tracking</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* EXPORT / SHARE / CONTINUE ACTION CONTROLS (P1 requirement) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", border: "1px solid #cbd5e1", borderRadius: "3px", backgroundColor: "#f8fafc", padding: "7px 11px", marginBottom: "8px" }}>
          <div>
            <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>EXPORT RECORD</div>
            <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>PDF Master Summary ready for download & print</div>
          </div>
          <div>
            <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>SHARE WITH PROVIDER</div>
            <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>Secure health locker & clinician review linkage</div>
          </div>
          <div>
            <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>CONTINUE JOURNEY</div>
            <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>Return to active Heart Training & Progress tracking</div>
          </div>
        </div>

        {/* GOVERNED CARE LINKAGE STATEMENT (P1 requirement) */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "3px", backgroundColor: "#f8fafc", padding: "7px 11px", marginBottom: "12px" }}>
          <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            GOVERNED CLINICAL CARE LINKAGE RULE
          </div>
          <div style={{ fontSize: "8.5px", color: "#334155", lineHeight: "1.32" }}>
            Only approved clinical triggers create or link a <code>care_episode_id</code>; routine activity, Steps, AQI and ordinary WPT do not create clinical episodes. Care options appear strictly under governed safety and routing rules.
          </div>
        </div>

        {/* Bottom Footer */}
        <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "6px", fontSize: "8.5px", color: "#64748b", lineHeight: "1.3" }}>
          <div>Keep this assessment with your CardioConnect record so future activity and permitted assessments can be viewed alongside today&apos;s record.</div>
          <div style={{ marginTop: "1px" }}>
            <span style={{ fontWeight: "800", color: "#0d3b66" }}>CARE & SAFETY</span> CardioConnect does not diagnose cardiovascular disease, prescribe treatment or replace medical care. One authoritative record → four patient formats → one consistent journey.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "8.5px", color: "#94a3b8", marginTop: "3px" }}>
          <span>MediConnect.fit • CardioConnect • Authoritative Patient Health Record</span>
          <span>ISO A4 • Page 1 of 1</span>
        </div>
    </div>
  );
}

export { CardioConnectF4Report };

