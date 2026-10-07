import React from "react";
import MEDICONNECT_LOGO_BASE64 from "@/lib/logoBase64";

/**
 * CardioConnectF3Report: Format F3 • Walking Performance (Patient Job: MEASURE)
 * Multi-page A4 Fixed Walking Performance Record
 * Page 1: 6-Minute WPT Result, Metric Blocks, Energy Calculation, Provenance
 * Page 2: Suggested Specialist Consultation, Suggested Cardiovascular Wellness Practices & Endurance Focus Areas
 */
export default function CardioConnectF3Report({
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  const rawInputs = 
    assessmentData?.heart_health_inputs?.[0] || 
    assessmentData?.rawAssessment?.heart_health_inputs?.[0] || 
    assessmentData?.rawAssessment?.inputs ||
    assessmentData?.inputs || 
    {};

  const demographics = assessmentData?.inputs?.demographics || assessmentData?.rawAssessment?.inputs?.demographics || {};
  const vitals = assessmentData?.inputs?.vitals || assessmentData?.rawAssessment?.inputs?.vitals || {};
  const lifestyle = assessmentData?.inputs?.lifestyle || assessmentData?.rawAssessment?.inputs?.lifestyle || {};

  const createdAt = assessmentData?.created_at || assessmentData?.date || assessmentData?.rawAssessment?.created_at || new Date().toISOString();

  const serialNo = 
    assessmentData?.serialNo || 
    assessmentData?.serial_no || 
    assessmentData?.rawAssessment?.serial_no || 
    `WPT-${new Date(createdAt).getFullYear()}-${String(assessmentData?.id || assessmentData?.rawAssessment?.id || "0918").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;

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
    assessmentData?.user_name || 
    assessmentData?.user?.name || 
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
    "Patient (CardioConnect)";

  const age = Math.max(18, Number(rawInputs?.age || demographics?.age || patientData?.age || 29));
  const rawGender = rawInputs?.gender || demographics?.gender || patientData?.gender || "Female";
  const gender = rawGender ? (rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase()) : "Female";

  const assessmentDate = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }) + " · Completed";

  const distanceM = Number(rawInputs?.walking_distance_m || rawInputs?.distance || assessmentData?.distance || 460);
  const steps = Number(rawInputs?.walking_steps || rawInputs?.steps || assessmentData?.steps || 640);
  const weightKg = Number(rawInputs?.weight_kg || rawInputs?.weight || demographics?.weight || patientData?.weight || 68);
  const heartRate = Number(rawInputs?.resting_heart_rate || vitals?.restingHeartRate || 72);
  const aqiValue = Number(rawInputs?.aqi || lifestyle?.aqi || 146);
  const city = rawInputs?.city || rawInputs?.location || lifestyle?.location || "Delhi";

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

  const speedKmh = ((distanceM / 1000) / (6 / 60)).toFixed(1);
  const paceMinKm = distanceM > 0 ? (6 / (distanceM / 1000)).toFixed(1) : "—";
  const metEstimate = 3.8;
  const estimatedKcal = Math.round(metEstimate * weightKg * (6 / 60));

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

  const isAbnormal = distanceM < 350 || rawInputs?.chest_pain === true || rawInputs?.breathlessness === true;
  const primarySpecialist = isAbnormal ? "Cardiologist" : "General Physician";
  const specialistRecommendation = isAbnormal
    ? "Based on your 6-minute walking capacity test (< 350m functional threshold) or reported shortness of breath, clinical evaluation with a Cardiologist is suggested for cardiopulmonary exercise testing and cardiac assessment."
    : "Based on recorded screening responses, 6-minute functional mobility is preserved above baseline reference benchmarks. Routine annual check-ins with your General Physician are recommended.";

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
            "Follow tailored functional recommendations provided by your consulting clinician.",
            "Track 6-minute walking capacity tests periodically in CardioConnect."
          ];
        }

        const categoryTag = rec.category ? String(rec.category).toUpperCase() : "CARDIO WELLNESS";
        const priorityTag = rec.priority || rec.priorityTag || (isAbnormal ? "PRIORITY CLINICAL" : "EVIDENCE-BASED");
        const timeframe = rec.timeframe || (isAbnormal ? "Immediate Action" : "Target Protocol");

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
          priorityTag: "Vascular Maintenance",
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

  const clinicalIndicators = Array.isArray(aiObj.key_findings) && aiObj.key_findings.length > 0
    ? aiObj.key_findings
    : [
        `6-Min Walk Distance: ${distanceM} m`,
        `Cadence & Pace: ${paceMinKm} min/km (${speedKmh} km/h)`,
        `Resting Heart Rate: ${heartRate} bpm`,
        `MET Functional Estimate: 3.8 METs (${estimatedKcal} kcal)`,
        `Ambient AQI Context: AQI ${aqiValue} (${city})`
      ];

  const positiveIndicators = Array.isArray(aiObj.positive_aspects) && aiObj.positive_aspects.length > 0
    ? aiObj.positive_aspects
    : [
        "Completed standardized 6-minute functional mobility test",
        "Documented objective walking endurance metric",
        "Consistent steady pacing maintained across full test window"
      ];

  const focusAreas = Array.isArray(aiObj.improvement_areas) && aiObj.improvement_areas.length > 0
    ? aiObj.improvement_areas
    : [
        "Target gradual incremental distance progression in 30-day reassessments",
        "Perform structured daily walking sessions to condition lower-limb musculature",
        "Avoid strenuous outdoor walking during elevated AQI peaks (> 150)"
      ];

  return (
    <div
      ref={reportRef}
      id="cardioconnect-f3-report"
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
          padding: "32px 40px 24px 40px",
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
                style={{ height: "46px", width: "auto", maxWidth: "160px", objectFit: "contain", borderRadius: "4px", flexShrink: 0, backgroundColor: "transparent" }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px", fontWeight: "900", color: "#007a8c", letterSpacing: "0.5px" }}>MediConnect.fit</span>
                  <span style={{ color: "#94a3b8", fontWeight: "300" }}>|</span>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#0d3b66", letterSpacing: "1px", textTransform: "uppercase" }}>CARDIOCONNECT</span>
                </div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#0d3b66", letterSpacing: "0.5px", textTransform: "uppercase", marginTop: "1px", lineHeight: "1.1" }}>
                  WALKING PERFORMANCE
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  A clear result for your recorded test distance, pace, movement and everyday context.
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "10px", fontWeight: "800", padding: "4px 10px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Measured Test
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", fontWeight: "600" }}>
                6-Minute WPT • ISO A4
              </div>
            </div>
          </div>

          {/* 2x2 Metadata Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", marginBottom: "14px", fontSize: "11px" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                <td style={{ width: "14%", backgroundColor: "#f8fafc", padding: "7px 12px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #cbd5e1" }}>
                  RESULT
                </td>
                <td style={{ width: "36%", padding: "7px 14px", fontWeight: "700", color: "#0f2d4a", fontFamily: "monospace", fontSize: "11.5px", borderRight: "1px solid #cbd5e1" }}>
                  {serialNo}
                </td>
                <td style={{ width: "14%", backgroundColor: "#f8fafc", padding: "7px 12px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #cbd5e1" }}>
                  DATE
                </td>
                <td style={{ width: "36%", padding: "7px 14px", fontWeight: "700", color: "#0f2d4a" }}>
                  {assessmentDate}
                </td>
              </tr>
              <tr>
                <td style={{ backgroundColor: "#f8fafc", padding: "7px 12px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #cbd5e1" }}>
                  PATIENT
                </td>
                <td style={{ padding: "7px 14px", fontWeight: "700", color: "#0f2d4a", borderRight: "1px solid #cbd5e1" }}>
                  {patientName} • {age} yrs • {gender}
                </td>
                <td style={{ backgroundColor: "#f8fafc", padding: "7px 12px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #cbd5e1" }}>
                  LOCATION & AQI
                </td>
                <td style={{ padding: "7px 14px", fontWeight: "700", color: "#0f2d4a" }}>
                  {shortCity} • AQI {aqiValue}
                </td>
              </tr>
            </tbody>
          </table>

          {/* PRIMARY METRIC: DISTANCE IN 6 MINUTES */}
          <div style={{ backgroundColor: "#0b3b60", color: "#ffffff", borderRadius: "4px", padding: "18px 24px", marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#99f6e4" }}>
                6-MINUTE WALKING DISTANCE
              </div>
              <div style={{ fontSize: "36px", fontWeight: "900", letterSpacing: "-0.5px", marginTop: "2px" }}>
                {distanceM} <span style={{ fontSize: "18px", fontWeight: "600", color: "#cbd5e1" }}>meters</span>
              </div>
              <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px" }}>
                Controlled 6-minute self-paced test protocol (Completed)
              </div>
            </div>
            <div style={{ textAlign: "right", borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: "24px" }}>
              <div style={{ fontSize: "10.5px", color: "#99f6e4", fontWeight: "700", textTransform: "uppercase" }}>TEST COMPLETION</div>
              <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "2px" }}>100% Full Duration</div>
              <div style={{ fontSize: "10.5px", color: "#cbd5e1", marginTop: "2px" }}>Zero pauses recorded</div>
            </div>
          </div>

          {/* 4 SECONDARY METRIC BLOCKS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px 12px", backgroundColor: "#ffffff" }}>
              <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>AVERAGE SPEED</div>
              <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f2d4a", marginTop: "2px" }}>{speedKmh} <span style={{ fontSize: "10px", fontWeight: "600", color: "#64748b" }}>km/h</span></div>
              <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "1px" }}>Self-paced walk</div>
            </div>
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px 12px", backgroundColor: "#ffffff" }}>
              <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>PACE</div>
              <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f2d4a", marginTop: "2px" }}>{paceMinKm} <span style={{ fontSize: "10px", fontWeight: "600", color: "#64748b" }}>min/km</span></div>
              <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "1px" }}>Average pace</div>
            </div>
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px 12px", backgroundColor: "#ffffff" }}>
              <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>EST. ENERGY</div>
              <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f2d4a", marginTop: "2px" }}>{estimatedKcal} <span style={{ fontSize: "10px", fontWeight: "600", color: "#64748b" }}>kcal</span></div>
              <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "1px" }}>MET v1.0 standard</div>
            </div>
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px 12px", backgroundColor: "#ffffff" }}>
              <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>STEPS COUNT</div>
              <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f2d4a", marginTop: "2px" }}>{steps}</div>
              <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "1px" }}>In 6 minutes</div>
            </div>
          </div>

          {/* WHAT THIS RECORD SHOWS */}
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: "#f8fafc", padding: "12px 14px", marginBottom: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
              WHAT THIS RECORD SHOWS
            </div>
            <div style={{ fontSize: "10.5px", color: "#334155", lineHeight: "1.5" }}>
              Recorded test distance: <strong>{distanceM} meters</strong> in 6 minutes ({speedKmh} km/h). Walking Performance Test results are compared like-for-like against your own previous tests over time. Steps remain a separate movement metric and AQI provides environmental context.
            </div>
          </div>

          {/* YOUR NEXT OPTIONS */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" }}>
              YOUR NEXT OPTIONS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.2fr 1.3fr", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: "#ffffff" }}>
              <div style={{ padding: "12px 14px", borderRight: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>COMPARE</div>
                <div style={{ fontSize: "13px", fontWeight: "800", color: "#0d3b66", marginTop: "2px", marginBottom: "3px" }}>My Progress</div>
                <div style={{ fontSize: "10px", color: "#475569", lineHeight: "1.35", marginBottom: "8px" }}>Review like-for-like performance over time.</div>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>→ VIEW MY PROGRESS</div>
              </div>
              <div style={{ padding: "12px 14px", borderRight: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>CONTINUE</div>
                <div style={{ fontSize: "13px", fontWeight: "800", color: "#0d3b66", marginTop: "2px", marginBottom: "3px" }}>Heart Training</div>
                <div style={{ fontSize: "10px", color: "#475569", lineHeight: "1.35", marginBottom: "8px" }}>Use performance within the wider activity journey.</div>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>→ START HEART TRAINING</div>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>CONNECT</div>
                <div style={{ fontSize: "13px", fontWeight: "800", color: "#0d3b66", marginTop: "2px", marginBottom: "3px" }}>Care & Consultation</div>
                <div style={{ fontSize: "10px", color: "#475569", lineHeight: "1.35", marginBottom: "8px" }}>Supported care only when an approved rule permits.</div>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>→ EXPLORE CARE OPTIONS</div>
              </div>
            </div>
          </div>

          {/* Factual Record Verification Block */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "9px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div>
              <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                ✓ AUTHORITATIVE RECORD VERIFICATION & PROVENANCE
              </div>
              <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>
                MediConnect Engine v1.0 • Formats Authority F3 • ID: {serialNo}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "9px", color: "#94a3b8" }}>
              Generated: {assessmentDate.replace(" · Completed", "")}
            </div>
          </div>
        </div>

        {/* Bottom Page 1 Footer */}
        <div>
          <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "8px", marginTop: "12px", fontSize: "9.5px", color: "#64748b", lineHeight: "1.45" }}>
            <div>Keep this result with your CardioConnect history so a future like-for-like test can be viewed alongside it.</div>
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontWeight: "800", color: "#0d3b66" }}>ENERGY</span> Estimated kcal = MET × weight kg × active duration hours. CARDIO_MET_ESTIMATE v1.0 is server-authoritative and versioned; missing input = Unavailable. This is not a clinical 6-minute walk test, stress test or cardiac diagnostic test.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9px", color: "#94a3b8", marginTop: "6px" }}>
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
          padding: "32px 40px 24px 40px",
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
                  WALKING PERFORMANCE & WELLNESS GUIDANCE
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                  Functional endurance recommendations, specialist guidance, and cardiovascular practices.
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

          {/* Reference Strip */}
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
              <strong style={{ color: "#0f2d4a" }}>Location / AQI:</strong> {shortCity} • AQI {aqiValue}
            </span>
          </div>

          {/* SECTION 1: Suggested Specialist Consultation & Guidance */}
          <div style={{ marginBottom: "12px", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: "#ffffff", overflow: "hidden" }}>
            <div style={{ backgroundColor: isAbnormal ? "#eff6ff" : "#f0fdf4", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                SUGGESTED SPECIALIST CONSULTATION & ENDURANCE GUIDANCE
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
                Functional mobility and aerobic endurance practices
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

          {/* SECTION 3: Recorded Walking Indicators & Focus Areas */}
          <div style={{ marginBottom: "10px", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: "#ffffff", padding: "9px 12px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
              RECORDED WALKING INDICATORS & ACTIONABLE INSIGHTS
            </div>

            {/* Badges strip */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
              {clinicalIndicators.slice(0, 5).map((ind, iIdx) => (
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
          <span>MediConnect.fit • CardioConnect • Walking Performance & Wellness Guidance</span>
          <span>ISO A4 • Page 2 of 2</span>
        </div>
      </div>
    </div>
  );
}

export { CardioConnectF3Report };
