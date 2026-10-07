import React from "react";
import MEDICONNECT_LOGO_BASE64 from "@/lib/logoBase64";
import { getSavedPatientLocation } from "@/lib/patientLocation";

/**
 * CardioConnectF1Report: Format F1 • Home + Activity (Patient Job: DO)
 * Multi-page A4 Fixed Clinical & Activity Record
 * Page 1: 7-Day Activity Stream, Step Distribution, Milestone Matrix & Provenance
 * Page 2: Suggested Specialist Consultation, Suggested Cardiovascular Wellness Practices & Activity Focus Areas
 */
export default function CardioConnectF1Report({
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  const rawInputs = assessmentData?.heart_health_inputs?.[0] || assessmentData?.inputs || {};
  const lifestyle = assessmentData?.lifestyle || {};
  const demographics = assessmentData?.demographics || {};
  const createdAt = assessmentData?.created_at || assessmentData?.date || new Date().toISOString();

  const serialNo =
    assessmentData?.serial_no ||
    assessmentData?.serialNo ||
    `CCN-${new Date(createdAt).getFullYear()}-${String(assessmentData?.id || "ACT001").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;

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
    "Patient (CardioConnect)";

  const age = Math.max(18, Number(rawInputs?.age || demographics?.age || patientData?.age || 29));
  const rawGender = rawInputs?.gender || demographics?.gender || patientData?.gender || "Female";
  const gender = rawGender ? (rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase()) : "Female";

  const assessmentDate = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }) + " · Activity";

  const heartTrainingMin = Number(rawInputs?.physical_activity_minutes ?? rawInputs?.weekly_activity_minutes ?? lifestyle?.physicalActivity ?? 0);
  const stepsToday = Number(rawInputs?.daily_steps ?? rawInputs?.steps ?? 0).toLocaleString("en-IN");
  const savedPatientLoc = typeof window !== "undefined" ? getSavedPatientLocation() : null;
  const aqiValue = Number(rawInputs?.aqi || savedPatientLoc?.aqi || 146);
  const aqiCity = rawInputs?.city || rawInputs?.location || savedPatientLoc?.city || "Delhi";

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
  const shortCity = formatShortLocation(aqiCity);

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

  const isAbnormal =
    heartTrainingMin < 60 ||
    rawInputs?.chest_pain === true ||
    rawInputs?.breathlessness === true ||
    (rawInputs?.systolic_bp && Number(rawInputs.systolic_bp) >= 135);

  const primarySpecialist = isAbnormal ? "Cardiologist" : "General Physician";
  const specialistRecommendation = isAbnormal
    ? "Based on your recorded physical activity profile and health indicators, consulting a Cardiologist is recommended prior to intensifying exercise workloads or if exercise intolerance / chest tightness is experienced."
    : "Based on recorded screening responses, activity levels are progressing steadily. Routine preventive wellness check-ins with your General Physician are recommended.";

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
            "Follow physician-recommended activity thresholds for safe cardiovascular progression.",
            "Log your daily active minutes and resting heart rate in CardioConnect."
          ];
        }

        const categoryTag = rec.category ? String(rec.category).toUpperCase() : "CARDIO WELLNESS";
        const priorityTag = rec.priority || rec.priorityTag || (isAbnormal ? "PRIORITY CLINICAL" : "EVIDENCE-BASED");
        const timeframe = rec.timeframe || (isAbnormal ? "Immediate Action" : "Daily Activity");

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
        `Recorded Heart Training: ${heartTrainingMin} min/wk`,
        `Daily Step Metric: ${stepsToday} steps`,
        `Ambient AQI Context: AQI ${aqiValue} (${aqiCity})`,
        `Movement Consistency: Logged active sessions`,
        `Cardiovascular Safety: Screened parameters`
      ];

  const positiveIndicators = Array.isArray(aiObj.positive_aspects) && aiObj.positive_aspects.length > 0
    ? aiObj.positive_aspects
    : [
        "Completed structured activity assessment",
        "Proactive movement tracking and session logging",
        "Engagement with public-health physical activity reference bands"
      ];

  const focusAreas = Array.isArray(aiObj.improvement_areas) && aiObj.improvement_areas.length > 0
    ? aiObj.improvement_areas
    : [
        heartTrainingMin < 150 ? "Gradually build towards the 150 min/wk moderate aerobic activity benchmark" : "Maintain structured cardiovascular exercise consistency",
        "Schedule outdoor workouts during clean-air morning windows",
        "Log regular weekly sessions to sustain longitudinal tracking"
      ];

  const sessionsCount = assessmentData?.sessions?.length || assessmentData?.training_sessions?.length || 0;

  return (
    <div
      ref={reportRef}
      id="cardioconnect-f1-report"
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
                  HOME + ACTIVITY
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  A clear view of your recorded activity, movement and everyday context.
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "10px", fontWeight: "800", padding: "4px 10px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Authoritative Record
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", fontWeight: "600" }}>
                Activity Stream • ISO A4
              </div>
            </div>
          </div>

          {/* 2x2 Metadata Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", marginBottom: "12px", fontSize: "11px" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                <td style={{ width: "14%", backgroundColor: "#f8fafc", padding: "7px 12px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #cbd5e1" }}>
                  RECORD
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

          {/* YOUR CARDIOCONNECT TODAY (4 Columns) */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
              YOUR CARDIOCONNECT TODAY
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px 12px", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>HEART TRAINING</div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f2d4a", marginTop: "2px" }}>{heartTrainingMin} <span style={{ fontSize: "10px", fontWeight: "600", color: "#64748b" }}>min</span></div>
                <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "1px" }}>150–300 min/wk ref</div>
              </div>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px 12px", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>STEPS TODAY</div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f2d4a", marginTop: "2px" }}>{stepsToday}</div>
                <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "1px" }}>Movement indicator</div>
              </div>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px 12px", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>SESSIONS</div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f2d4a", marginTop: "2px" }}>{sessionsCount}</div>
                <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "1px" }}>This week</div>
              </div>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px 12px", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>AIR QUALITY</div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: aqiValue <= 100 ? "#0d9488" : "#d97706", marginTop: "2px" }}>{aqiValue}</div>
                <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "1px" }}>{aqiCity}</div>
              </div>
            </div>
          </div>

          {/* 7-DAY STEP & ACTIVITY STREAM (Factual Daily Ledger) */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
              7-DAY STEP & ACTIVITY STREAM
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "10px" }}>
              <thead>
                <tr style={{ backgroundColor: "#0b3b60", color: "#ffffff" }}>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "800", width: "18%" }}>DAY / DATE</th>
                  <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: "800", width: "20%" }}>STEPS</th>
                  <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: "800", width: "22%" }}>TRAINING MIN</th>
                  <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: "800", width: "18%" }}>STATUS</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "800", width: "22%" }}>NOTES</th>
                </tr>
              </thead>
              <tbody>
                {assessmentData?.daily_activity && assessmentData.daily_activity.length > 0 ? (
                  assessmentData.daily_activity.slice(0, 7).map((d, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: i % 2 === 1 ? "#f8fafc" : "#ffffff" }}>
                      <td style={{ padding: "5px 8px", fontWeight: "600" }}>{d.day || `Day ${i + 1}`}</td>
                      <td style={{ padding: "5px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{Number(d.steps || 0).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "5px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{d.training_min || d.minutes || 0} min</td>
                      <td style={{ padding: "5px 8px", textAlign: "center", color: "#0d9488", fontWeight: "700" }}>Recorded</td>
                      <td style={{ padding: "5px 8px", color: "#64748b" }}>{d.notes || "Regular daily routine"}</td>
                    </tr>
                  ))
                ) : (
                  (() => {
                    const rows = [];
                    const todayDate = new Date(createdAt);
                    for (let i = 0; i < 7; i++) {
                      const d = new Date(todayDate);
                      d.setDate(d.getDate() - i);
                      const isToday = i === 0;
                      const dateStr = d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
                      rows.push(
                        <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: i % 2 === 1 ? "#f8fafc" : "#ffffff" }}>
                          <td style={{ padding: "5px 8px", fontWeight: isToday ? "800" : "600", color: isToday ? "#007a8c" : "#0f2d4a" }}>
                            {dateStr} {isToday ? "(Today)" : ""}
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: isToday ? "700" : "normal" }}>
                            {isToday ? stepsToday : "—"}
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: isToday ? "700" : "normal" }}>
                            {isToday ? `${heartTrainingMin} min` : "—"}
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "center", color: isToday ? "#0d9488" : "#94a3b8", fontWeight: "700" }}>
                            {isToday ? "Active Log" : "Awaiting sync"}
                          </td>
                          <td style={{ padding: "5px 8px", color: "#64748b" }}>
                            {isToday ? `AQI ${aqiValue} recorded in ${aqiCity}` : "Standard tracking window"}
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })()
                )}
              </tbody>
            </table>
          </div>

          {/* WHAT THIS RECORD SHOWS */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", backgroundColor: "#f8fafc", padding: "10px 12px", marginBottom: "12px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
              WHAT THIS RECORD SHOWS
            </div>
            <div style={{ fontSize: "9.5px", color: "#334155", lineHeight: "1.45" }}>
              Recorded Heart Training: <strong>{heartTrainingMin} minutes</strong> across {sessionsCount} genuine sessions. The 150–300 min/week range is a neutral public-health reference, not a prescription. Steps remain a separate movement measure, while AQI provides environmental context only.
              <div style={{ marginTop: "4px" }}>
                Milestones: ✓ First Heart Training · ✓ 150-min reference · ○ 300-min reference · ✓ Personal best. Shared data: Activity/Steps/AQI permissions available; a denied source becomes unavailable only, while unrelated features continue.
              </div>
            </div>
          </div>

          {/* YOUR NEXT OPTIONS */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
              YOUR NEXT OPTIONS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: "#ffffff" }}>
              <div style={{ padding: "10px 12px", borderRight: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>CONTINUE</div>
                <div style={{ fontSize: "12px", fontWeight: "800", color: "#0d3b66", marginTop: "2px", marginBottom: "3px" }}>Heart Training</div>
                <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: "1.3", marginBottom: "6px" }}>Start or resume your activity journey.</div>
                <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>→ START HEART TRAINING</div>
              </div>
              <div style={{ padding: "10px 12px", borderRight: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>TRACK</div>
                <div style={{ fontSize: "12px", fontWeight: "800", color: "#0d3b66", marginTop: "2px", marginBottom: "3px" }}>My Progress</div>
                <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: "1.3", marginBottom: "6px" }}>Review checkpoints and recorded activity over time.</div>
                <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>→ VIEW MY PROGRESS</div>
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>CONNECT</div>
                <div style={{ fontSize: "12px", fontWeight: "800", color: "#0d3b66", marginTop: "2px", marginBottom: "3px" }}>Care & Consultation</div>
                <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: "1.3", marginBottom: "6px" }}>Supported care options when appropriate.</div>
                <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>→ EXPLORE CARE OPTIONS</div>
              </div>
            </div>
          </div>

          {/* Factual Record Integrity Block */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div>
              <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                ✓ AUTHORITATIVE PATIENT RECORD & PROVENANCE
              </div>
              <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>
                MediConnect Engine v1.0 • Formats Authority F1 • ID: {serialNo}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "9px", color: "#94a3b8" }}>
              Generated: {assessmentDate.replace(" · Activity", "")}
            </div>
          </div>
        </div>

        {/* Bottom Page 1 Footer */}
        <div>
          <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "8px", marginTop: "12px", fontSize: "9.5px", color: "#64748b", lineHeight: "1.45" }}>
            <div>Keep this record with your CardioConnect journey so future activity can be viewed alongside today&apos;s record.</div>
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontWeight: "800", color: "#0d3b66" }}>CARE & SAFETY</span> CardioConnect does not diagnose cardiovascular disease or prescribe treatment. Care options appear only under approved safety and routing rules.
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
                  HOME ACTIVITY & CARDIOVASCULAR WELLNESS PRACTICES
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                  Activity clearance guidance, evidence-based wellness practices, and actionable movement targets.
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

          {/* SECTION 1: Suggested Specialist Consultation & Activity Guidance */}
          <div style={{ marginBottom: "12px", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: "#ffffff", overflow: "hidden" }}>
            <div style={{ backgroundColor: isAbnormal ? "#eff6ff" : "#f0fdf4", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                SUGGESTED SPECIALIST CONSULTATION & ACTIVITY GUIDANCE
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
                Adapted for everyday activity and home routines
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

          {/* SECTION 3: Recorded Activity Indicators & Actionable Insights */}
          <div style={{ marginBottom: "10px", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: "#ffffff", padding: "9px 12px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
              RECORDED ACTIVITY INDICATORS & ACTIONABLE INSIGHTS
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
          <span>MediConnect.fit • CardioConnect • Home Activity Guidance & Wellness Practices</span>
          <span>ISO A4 • Page 2 of 2</span>
        </div>
      </div>
    </div>
  );
}

export { CardioConnectF1Report };
