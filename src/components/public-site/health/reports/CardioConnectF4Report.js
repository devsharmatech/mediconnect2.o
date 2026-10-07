import React from "react";
import MEDICONNECT_LOGO_BASE64 from "@/lib/logoBase64";

/**
 * CardioConnectF4Report: Format F4 • Controlled Assessment Report (Patient Job: RECEIVE / SHARE / CONTINUE)
 * Multi-page A4 Fixed Clinical Record
 * Page 1: Vitals, Factor Overview, Lipid Spectrum, WPT Test, Progress Checkpoints
 * Page 2: Suggested Specialist Consultation, Suggested Cardiovascular Wellness Practices & Actionable Clinical Indicators
 */
export default function CardioConnectF4Report({
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  // Primary data source: heart_health_inputs from DB
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

  // Coerce inputs
  const ageRaw       = h?.age        ?? flatInputs?.age        ?? null;
  const rawGender    = h?.gender     || flatInputs?.gender     || patientData?.gender || "male";
  const gender       = rawGender ? (rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase()) : "Male";
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

  const chestPainRaw = h?.chest_pain ?? flatInputs?.chest_pain ?? false;
  const breathlessRaw = h?.breathlessness ?? flatInputs?.breathlessness ?? false;
  const palpitationsRaw = h?.palpitations ?? flatInputs?.palpitations ?? false;

  // Typed display values
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
  const shortCity   = formatShortLocation(city);
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

  // Evaluations
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

  // Specialist Referral Logic
  const hasChestPain = chestPainRaw === true || chestPainRaw === "yes";
  const hasBreathless = breathlessRaw === true || breathlessRaw === "yes";
  const hasPalpitations = palpitationsRaw === true || palpitationsRaw === "yes";
  const isSmoker = smokingRaw && String(smokingRaw).toLowerCase() === "current";
  const isAbnormal =
    (sys !== null && sys >= 130) ||
    (dia !== null && dia >= 85) ||
    hasChestPain ||
    hasBreathless ||
    hasPalpitations ||
    (hr !== null && (hr > 100 || hr < 50)) ||
    (ldl !== null && ldl >= 130) ||
    isSmoker ||
    familyHxRaw === true;

  const primarySpecialist = isAbnormal ? "Cardiologist" : "General Physician";
  const specialistRecommendation = isAbnormal
    ? "Based on your recorded screening responses (blood pressure / lipid profile / reported symptoms / cardiac history), consulting a Cardiologist is recommended for comprehensive cardiac evaluation, resting 12-lead ECG, echocardiogram, and personalized cardiovascular risk reduction."
    : "Based on recorded screening responses, vitals and metabolic parameters are within expected baseline intervals. Routine annual check-ins with your General Physician are recommended for preventive wellness.";

  const clinicalGuidanceText = aiObj.medical_attention ||
    "Discuss persistent, recurring, or worsening symptoms with a qualified physician. Seek emergency clinical care immediately for severe acute chest discomfort, shortness of breath, or radiating arm/jaw tightness.";

  // Dynamic Cardiovascular Recommendations from assessmentData or aiObj
  const dynamicRecs = (() => {
    let recs =
      assessmentData?.recommendations ||
      assessmentData?.rawAssessment?.recommendations ||
      assessmentData?.rawAssessment?.ai_analysis?.recommendations ||
      assessmentData?.rawAssessment?.ai_analysis?.action_plan ||
      aiObj?.recommendations ||
      aiObj?.action_plan ||
      aiObj?.action_recommendations;

    if (typeof recs === "string") {
      try {
        const p = JSON.parse(recs);
        if (Array.isArray(p)) return p;
        if (Array.isArray(p?.recommendations)) return p.recommendations;
        if (Array.isArray(p?.action_plan)) return p.action_plan;
      } catch (_) {}
    }
    if (Array.isArray(recs)) return recs;
    return [];
  })();

  const wellnessPractices = dynamicRecs.length > 0
    ? dynamicRecs.slice(0, 4).map((rec, idx) => {
        let steps = [];
        if (Array.isArray(rec.action_steps) && rec.action_steps.length > 0) {
          steps = rec.action_steps.map((s) => String(s));
        } else if (Array.isArray(rec.steps) && rec.steps.length > 0) {
          steps = rec.steps.map((s) => String(s));
        } else if (rec.description) {
          const sentences = String(rec.description)
            .split(/(?<=[.!?])\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 12);
          if (sentences.length > 1) {
            steps = sentences.slice(0, 3);
          } else if (sentences.length === 1) {
            steps = [sentences[0]];
          }
        }

        if (steps.length === 0) {
          steps = [
            "Discuss tailored recommendations with your consulting physician.",
            "Record vital signs and symptoms in your CardioConnect health log."
          ];
        }

        const categoryTag = rec.category ? String(rec.category).toUpperCase() : "CARDIO WELLNESS";
        const priorityTag = rec.priority || rec.priorityTag || (idx === 0 && hasChestPain ? "URGENT CLINICAL" : "EVIDENCE-BASED");
        const timeframe = rec.timeframe || (idx === 0 && hasChestPain ? "Immediate Action" : "Daily Protocol");

        return {
          title: rec.title || `Cardiovascular Recommendation ${idx + 1}`,
          category: categoryTag,
          priorityTag: priorityTag,
          timeframe: timeframe,
          description: rec.description || "Adhere to physician-directed cardiovascular guidance and balanced lifestyle habits.",
          steps: steps
        };
      })
    : [
        {
          title: "Structured Aerobic Physical Activity",
          category: "Active Living",
          priorityTag: "Daily Core Habit",
          timeframe: "150–300 mins/week · Moderate Pace",
          description: "For adults for whom moderate-intensity aerobic exercise is appropriate, 150–300 minutes per week is the public-health gold standard to strengthen myocardium and reduce arterial stiffness.",
          steps: [
            "Engage in brisk walking, swimming, or cycling at a moderate intensity where you can speak comfortably without gasping.",
            "Distribute sessions across 4–5 days per week, aiming for 30–45 minutes each session.",
            "Include a 5-minute dynamic warm-up and gentle cool-down stretch with each session."
          ]
        },
        {
          title: "Heart-Healthy Nutrition & Lipid Optimization",
          category: "Nutritional Care",
          priorityTag: "DASH Dietary Protocol",
          timeframe: "Daily Core Routine",
          description: "Dietary patterns rich in vegetables, whole grains, and legumes support healthy lipid profiles and assist in blood pressure management.",
          steps: [
            "Emphasize leafy greens, seasonal vegetables, whole grains (millet, oats), and lentils/legumes.",
            "Limit dietary sodium to < 2,000 mg/day (approx. 1 level tsp salt) and avoid ultra-processed foods.",
            "Replace saturated and trans-fats with cold-pressed plant oils (mustard, olive) and handfuls of nuts (walnuts, almonds)."
          ]
        },
        {
          title: "Blood Pressure & Autonomic Vascular Regulation",
          category: "Vascular Care",
          priorityTag: (sys !== null && sys >= 130) || (dia !== null && dia >= 85) ? "Targeted BP Protocol" : "Vascular Maintenance",
          timeframe: "Morning & Evening Log",
          description: "Consistent home blood pressure tracking paired with mindful stress reduction supports vascular tone and prevents hypertensive peaks.",
          steps: [
            "Record home blood pressure at consistent times: once in the morning before breakfast and once in the evening.",
            "Sit comfortably with your back supported for 5 minutes in a quiet room before taking readings.",
            "Practice relaxation techniques and stress-relief habits to maintain calm autonomic balance."
          ]
        },
        {
          title: "Restorative Sleep & Circadian Recovery Protocol",
          category: "Lifestyle Rhythm",
          priorityTag: "Rest & Recovery",
          timeframe: "7–8 Hours Nightly",
          description: "Deep restorative sleep facilitates nocturnal blood-pressure dipping and hormonal equilibrium essential for myocardial recovery.",
          steps: [
            "Maintain consistent bedtime and wake times 7 days a week to anchor cardiac circadian rhythm.",
            "Avoid heavy meals, caffeine, and digital screen blue-light within 60 minutes of sleeping.",
            "Ensure a calm, dark sleeping environment to support healthy sleep cycles."
          ]
        }
      ];

  // Clinical Indicators & Actionable Insights
  const clinicalIndicators = Array.isArray(aiObj.key_findings) && aiObj.key_findings.length > 0
    ? aiObj.key_findings
    : [
        `Blood Pressure: ${sys && dia ? `${sys}/${dia} mmHg` : "Recorded"}`,
        `Resting Heart Rate: ${hr ? `${hr} bpm` : "Recorded"}`,
        `BMI: ${bmi ? `${bmi} kg/m²` : "Recorded"}`,
        `Physical Activity: ${activityMin ? `${activityMin} min/wk` : "150 min/wk baseline"}`,
        `Lipid Profile: ${ldl ? `LDL ${ldl} mg/dL` : "Baseline observation"}`,
        `Environmental AQI: ${aqi !== null ? `${aqi} (${city})` : "Local context"}`
      ];

  const positiveIndicators = Array.isArray(aiObj.positive_aspects) && aiObj.positive_aspects.length > 0
    ? aiObj.positive_aspects
    : [
        "Completed structured cardiovascular assessment",
        "Proactive heart health and vital sign monitoring",
        !hasChestPain ? "Absence of acute chest pain symptoms" : "Prompt documentation of cardiac observations",
        smokingRaw && smokingRaw.toLowerCase() === "never" ? "Non-smoker cardiovascular profile preserved" : "Established baseline for ongoing lifestyle tracking"
      ];

  const focusAreas = Array.isArray(aiObj.improvement_areas) && aiObj.improvement_areas.length > 0
    ? aiObj.improvement_areas
    : [
        (sys && sys >= 130) ? "Maintain structured daily home blood pressure logging" : "Sustain recommended 150+ minutes weekly aerobic activity",
        (ldl && ldl >= 130) ? "Discuss lipid profile optimization and dietary fiber with your doctor" : "Prioritize whole grains, leafy vegetables, and sodium control",
        "Adopt morning clean-air exercise windows when ambient particulate levels are lowest",
        "Schedule follow-up check-in at 30-day milestone to review trajectory"
      ];

  return (
    <div
      ref={reportRef}
      id="cardioconnect-f4-report"
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
          padding: "26px 36px 20px 36px",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <div>
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
                FORMAT F4 • CONTROLLED
              </div>
              <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px", fontWeight: "600" }}>
                ID: {serialNo}
              </div>
            </div>
          </div>

          {/* Top Hero Block: Status & Key Clinical Takeaway */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "3px", padding: "8px 12px", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>
              <div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "#0d3b66" }}>{patientName}</span>
                <span style={{ fontSize: "10.5px", color: "#64748b", marginLeft: "8px" }}>Age: {age} • {gender}</span>
              </div>
              <div style={{ fontSize: "9.5px", color: "#475569", fontWeight: "600" }}>
                Assessment Date: {assessmentDate}
              </div>
            </div>
            <div style={{ fontSize: "9.5px", color: "#334155", lineHeight: "1.4" }}>
              <span style={{ fontWeight: "800", color: "#007a8c" }}>ASSESSMENT TAKEAWAY: </span>
              {sys && dia ? `Blood pressure recorded at ${sys}/${dia} mmHg. ` : ""}
              {activityMin !== null ? `Physical activity recorded at ${activityMin} min/wk. ` : ""}
              {smoking !== "Not specified" ? `Smoking status: ${smoking}. ` : ""}
              {aqi !== null ? `Local environmental context: AQI ${aqi} (${shortCity}). ` : ""}
              Follow structured lifestyle measures, maintain training cadence, and schedule routine clinical review.
            </div>
          </div>

          {/* CARDIOCONNECT FACTOR SPECTRUM TABLE */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "10px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
              CARDIOCONNECT FACTOR SPECTRUM (CURRENT VALUES & STATUS)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "9.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "#0b3b60", color: "#ffffff" }}>
                  <th style={{ padding: "4px 7px", textAlign: "left", fontWeight: "800", width: "30%" }}>FACTOR</th>
                  <th style={{ padding: "4px 7px", textAlign: "left", fontWeight: "800", width: "24%" }}>RECORDED VALUE</th>
                  <th style={{ padding: "4px 7px", textAlign: "left", fontWeight: "800", width: "26%" }}>CLINICAL REFERENCE</th>
                  <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "20%" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "3.5px 7px", fontWeight: "600", color: "#0f2d4a" }}>Blood Pressure</td>
                  <td style={{ padding: "3.5px 7px", fontVariantNumeric: "tabular-nums" }}>{sys && dia ? `${sys}/${dia} mmHg` : "Not Entered"}</td>
                  <td style={{ padding: "3.5px 7px", color: "#64748b" }}>&lt; 120/80 mmHg (ESC 2024)</td>
                  <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 5px", borderRadius: "3px", fontSize: "8.5px", fontWeight: "700", color: bpStatus.color, backgroundColor: bpStatus.bg, border: `1px solid ${bpStatus.border}` }}>
                      {bpStatus.label}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <td style={{ padding: "3.5px 7px", fontWeight: "600", color: "#0f2d4a" }}>Resting Heart Rate</td>
                  <td style={{ padding: "3.5px 7px", fontVariantNumeric: "tabular-nums" }}>{hr !== null ? `${hr} bpm` : "Not Entered"}</td>
                  <td style={{ padding: "3.5px 7px", color: "#64748b" }}>60 – 100 bpm resting</td>
                  <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 5px", borderRadius: "3px", fontSize: "8.5px", fontWeight: "700", color: hrStatus.color, backgroundColor: hrStatus.bg, border: `1px solid ${hrStatus.border}` }}>
                      {hrStatus.label}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "3.5px 7px", fontWeight: "600", color: "#0f2d4a" }}>Body Mass Index (BMI)</td>
                  <td style={{ padding: "3.5px 7px", fontVariantNumeric: "tabular-nums" }}>{bmi !== null ? `${bmi} kg/m²` : "Not Entered"}</td>
                  <td style={{ padding: "3.5px 7px", color: "#64748b" }}>18.5 – 24.9 kg/m² (WHO)</td>
                  <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 5px", borderRadius: "3px", fontSize: "8.5px", fontWeight: "700", color: bmiStatus.color, backgroundColor: bmiStatus.bg, border: `1px solid ${bmiStatus.border}` }}>
                      {bmiStatus.label}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <td style={{ padding: "3.5px 7px", fontWeight: "600", color: "#0f2d4a" }}>Physical Activity</td>
                  <td style={{ padding: "3.5px 7px", fontVariantNumeric: "tabular-nums" }}>{activityMin !== null ? `${activityMin} min/wk` : "Not Entered"}</td>
                  <td style={{ padding: "3.5px 7px", color: "#64748b" }}>≥ 150 min/wk moderate</td>
                  <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 5px", borderRadius: "3px", fontSize: "8.5px", fontWeight: "700", color: actStatus.color, backgroundColor: actStatus.bg, border: `1px solid ${actStatus.border}` }}>
                      {actStatus.label}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "3.5px 7px", fontWeight: "600", color: "#0f2d4a" }}>Smoking Status</td>
                  <td style={{ padding: "3.5px 7px" }}>{smoking}</td>
                  <td style={{ padding: "3.5px 7px", color: "#64748b" }}>Never smoked</td>
                  <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 5px", borderRadius: "3px", fontSize: "8.5px", fontWeight: "700", color: smokingStatus.color, backgroundColor: smokingStatus.bg, border: `1px solid ${smokingStatus.border}` }}>
                      {smokingStatus.label}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <td style={{ padding: "3.5px 7px", fontWeight: "600", color: "#0f2d4a" }}>LDL Cholesterol</td>
                  <td style={{ padding: "3.5px 7px", fontVariantNumeric: "tabular-nums" }}>{ldl !== null ? `${ldl} mg/dL` : "Not Entered"}</td>
                  <td style={{ padding: "3.5px 7px", color: "#64748b" }}>&lt; 130 mg/dL</td>
                  <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 5px", borderRadius: "3px", fontSize: "8.5px", fontWeight: "700", color: ldlStatus.color, backgroundColor: ldlStatus.bg, border: `1px solid ${ldlStatus.border}` }}>
                      {ldlStatus.label}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "3.5px 7px", fontWeight: "600", color: "#0f2d4a" }}>HbA1c</td>
                  <td style={{ padding: "3.5px 7px", fontVariantNumeric: "tabular-nums" }}>{hba1c !== null ? `${hba1c}%` : "Not Entered"}</td>
                  <td style={{ padding: "3.5px 7px", color: "#64748b" }}>&lt; 5.7% (ADA Normal)</td>
                  <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 5px", borderRadius: "3px", fontSize: "8.5px", fontWeight: "700", color: hba1c !== null ? (hba1c < 5.7 ? "#15803d" : "#b45309") : "#64748b", backgroundColor: hba1c !== null ? (hba1c < 5.7 ? "#f0fdf4" : "#fffbeb") : "#f1f5f9", border: `1px solid ${hba1c !== null ? (hba1c < 5.7 ? "#bbf7d0" : "#fde68a") : "#cbd5e1"}` }}>
                      {hba1c !== null ? (hba1c < 5.7 ? "Normal" : "Prediabetes") : "Not Entered"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "3.5px 7px", fontWeight: "600", color: "#0f2d4a" }}>Air Quality (AQI)</td>
                  <td style={{ padding: "3.5px 7px", fontVariantNumeric: "tabular-nums" }}>{aqi !== null ? `AQI ${aqi}` : "Not Recorded"}</td>
                  <td style={{ padding: "3.5px 7px", color: "#64748b" }}>CPCB Standard &lt; 100 ({shortCity})</td>
                  <td style={{ padding: "3.5px 7px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "1px 5px", borderRadius: "3px", fontSize: "8.5px", fontWeight: "700", color: aqi !== null ? (aqi <= 100 ? "#15803d" : aqi <= 200 ? "#b45309" : "#b91c1c") : "#64748b", backgroundColor: aqi !== null ? (aqi <= 100 ? "#f0fdf4" : aqi <= 200 ? "#fffbeb" : "#fef2f2") : "#f1f5f9", border: `1px solid ${aqi !== null ? (aqi <= 100 ? "#bbf7d0" : aqi <= 200 ? "#fde68a" : "#fecaca") : "#cbd5e1"}` }}>
                      {aqi !== null ? (aqi <= 50 ? "Good" : aqi <= 100 ? "Satisfactory" : aqi <= 200 ? "Moderate" : "Poor") : "Not Recorded"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6-MINUTE WALKING PERFORMANCE TEST (WPT) TABLE */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "10px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
              WALKING PERFORMANCE TEST (6-MINUTE WPT SUMMARY)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "9.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "#0b3b60", color: "#ffffff" }}>
                  <th style={{ padding: "4px 7px", textAlign: "left", fontWeight: "800", width: "24%" }}>PROTOCOL</th>
                  <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "19%" }}>DISTANCE</th>
                  <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "19%" }}>COMPLETION</th>
                  <th style={{ padding: "4px 7px", textAlign: "center", fontWeight: "800", width: "19%" }}>COMPARISON</th>
                  <th style={{ padding: "4px 7px", textAlign: "left", fontWeight: "800", width: "19%" }}>ENERGY EXPENDITURE</th>
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

          {/* MY PROGRESS CHECKPOINTS TABLE */}
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

          {/* EXPORT / SHARE / CONTINUE ACTION CONTROLS */}
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

          {/* GOVERNED CARE LINKAGE STATEMENT */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "3px", backgroundColor: "#f8fafc", padding: "7px 11px", marginBottom: "12px" }}>
            <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
              GOVERNED CLINICAL CARE LINKAGE RULE
            </div>
            <div style={{ fontSize: "8.5px", color: "#334155", lineHeight: "1.32" }}>
              Only approved clinical triggers create or link a <code>care_episode_id</code>; routine activity, Steps, AQI and ordinary WPT do not create clinical episodes. Care options appear strictly under governed safety and routing rules.
            </div>
          </div>
        </div>

        {/* Bottom Page 1 Footer */}
        <div>
          <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "6px", fontSize: "8.5px", color: "#64748b", lineHeight: "1.3" }}>
            <div>Keep this assessment with your CardioConnect record so future activity and permitted assessments can be viewed alongside today&apos;s record.</div>
            <div style={{ marginTop: "1px" }}>
              <span style={{ fontWeight: "800", color: "#0d3b66" }}>CARE & SAFETY</span> CardioConnect does not diagnose cardiovascular disease, prescribe treatment or replace medical care. One authoritative record → four patient formats → one consistent journey.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "8.5px", color: "#94a3b8", marginTop: "3px" }}>
            <span>MediConnect.fit • CardioConnect • Authoritative Patient Health Record</span>
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
          padding: "32px 36px 24px 36px",
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "2px solid #007a8c", paddingBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img
                src={MEDICONNECT_LOGO_BASE64}
                alt="MediConnect Logo"
                style={{ height: "40px", width: "auto", maxWidth: "150px", objectFit: "contain", borderRadius: "0px", flexShrink: 0, backgroundColor: "transparent" }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "900", color: "#007a8c", letterSpacing: "0.5px" }}>MediConnect.fit</span>
                  <span style={{ color: "#94a3b8", fontWeight: "300" }}>|</span>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#0d3b66", letterSpacing: "1px", textTransform: "uppercase" }}>CARDIOCONNECT</span>
                </div>
                <div style={{ fontSize: "16px", fontWeight: "900", color: "#0d3b66", letterSpacing: "0.4px", textTransform: "uppercase", marginTop: "1px" }}>
                  CLINICAL GUIDANCE & CARDIOVASCULAR WELLNESS PRACTICES
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                  Condition-tailored specialist consultation, evidence-based practices, and clinical focus areas.
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "9.5px", fontWeight: "800", padding: "2px 7px", borderRadius: "3px", textTransform: "uppercase" }}>
                Action Plan
              </div>
              <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px", fontWeight: "600" }}>
                {serialNo}
              </div>
            </div>
          </div>

          {/* Patient Demographic & Environmental Summary Strip */}
          <div
            style={{
              backgroundColor: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "3px",
              padding: "6px 14px",
              marginBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "10px",
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
              <strong style={{ color: "#0f2d4a" }}>Environmental Context:</strong> {aqi !== null ? `AQI ${aqi} (${shortCity})` : "AQI Not Recorded"}
            </span>
          </div>

          {/* SECTION 1: Suggested Specialist Consultation & Clinical Guidance */}
          <div style={{ marginBottom: "12px", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: "#ffffff", overflow: "hidden" }}>
            <div style={{ backgroundColor: isAbnormal ? "#eff6ff" : "#f0fdf4", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                SUGGESTED SPECIALIST CONSULTATION & CLINICAL GUIDANCE
              </div>
              <span style={{ fontSize: "9.5px", fontWeight: "800", color: isAbnormal ? "#1d4ed8" : "#15803d", backgroundColor: "#ffffff", padding: "2px 8px", borderRadius: "3px", border: `1px solid ${isAbnormal ? "#bfdbfe" : "#bbf7d0"}` }}>
                {isAbnormal ? `Recommended: ${primarySpecialist}` : "Routine Care: General Physician"}
              </span>
            </div>

            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontSize: "10.5px", color: "#1e293b", lineHeight: "1.45", marginBottom: "8px" }}>
                {specialistRecommendation}
              </div>

              {/* Clinical Guidance Notice */}
              <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "3px", padding: "7px 11px", fontSize: "10px", color: "#92400e", lineHeight: "1.35" }}>
                <strong style={{ color: "#78350f" }}>Clinical Guidance:</strong> {clinicalGuidanceText}
              </div>
            </div>
          </div>

          {/* SECTION 2: Suggested Cardiovascular Wellness Practices */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                SUGGESTED CARDIOVASCULAR WELLNESS PRACTICES
              </div>
              <div style={{ fontSize: "9.5px", color: "#64748b", fontWeight: "500" }}>
                Content adapted for common Indian food and activity contexts
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
              {wellnessPractices.map((practice, idx) => (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    backgroundColor: "#ffffff",
                    padding: "9px 11px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    {/* Badge & timeframe */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap", gap: "3px" }}>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <span style={{ fontSize: "8.5px", fontWeight: "800", color: "#065f46", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", padding: "1px 5px", borderRadius: "2px", textTransform: "uppercase" }}>
                          {practice.category}
                        </span>
                        <span style={{ fontSize: "8px", fontWeight: "700", color: "#1e293b", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", padding: "1px 4px", borderRadius: "2px", textTransform: "uppercase" }}>
                          {practice.priorityTag}
                        </span>
                      </div>
                      <span style={{ fontSize: "8.5px", color: "#64748b", fontWeight: "600" }}>
                        {practice.timeframe}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: "11px", fontWeight: "800", color: "#0f2d4a", marginBottom: "3px", lineHeight: "1.25" }}>
                      {practice.title}
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: "1.35", marginBottom: "6px" }}>
                      {practice.description}
                    </div>

                    {/* Steps list */}
                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "5px" }}>
                      <div style={{ fontSize: "8.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "3px", letterSpacing: "0.2px" }}>
                        Recommended Steps:
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {practice.steps.map((step, sIdx) => (
                          <li key={sIdx} style={{ fontSize: "9px", color: "#334155", lineHeight: "1.3", marginBottom: "2.5px", display: "flex", alignItems: "flex-start", gap: "4px" }}>
                            <span style={{ color: "#059669", fontWeight: "800", flexShrink: 0 }}>✓</span>
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
          <div style={{ marginBottom: "10px", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: "#ffffff", padding: "9px 12px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
              RECORDED CLINICAL INDICATORS & ACTIONABLE INSIGHTS
            </div>

            {/* Badges strip */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
              {clinicalIndicators.slice(0, 6).map((ind, iIdx) => (
                <span
                  key={iIdx}
                  style={{
                    fontSize: "8.5px",
                    fontWeight: "600",
                    color: "#334155",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    padding: "2px 6px",
                    borderRadius: "3px"
                  }}
                >
                  • {ind}
                </span>
              ))}
            </div>

            {/* 2-Column Matrix */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "3px", padding: "7px 9px" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#166534", textTransform: "uppercase", marginBottom: "3px" }}>
                  ✓ Positive Indicators
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {positiveIndicators.map((pos, pIdx) => (
                    <li key={pIdx} style={{ fontSize: "9px", color: "#14532d", lineHeight: "1.3", marginBottom: "2px" }}>
                      ✓ {pos}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "3px", padding: "7px 9px" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#1e40af", textTransform: "uppercase", marginBottom: "3px" }}>
                  ℹ Recommended Focus Areas
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {focusAreas.map((area, aIdx) => (
                    <li key={aIdx} style={{ fontSize: "9px", color: "#1e3a8a", lineHeight: "1.3", marginBottom: "2px" }}>
                      • {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "8px", marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9px", color: "#94a3b8" }}>
          <span>MediConnect.fit • CardioConnect • Clinical Guidance & Cardiovascular Wellness Practices</span>
          <span>ISO A4 • Page 2 of 2</span>
        </div>
      </div>
    </div>
  );
}

export { CardioConnectF4Report };
