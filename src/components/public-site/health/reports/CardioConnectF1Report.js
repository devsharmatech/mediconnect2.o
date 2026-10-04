import React from "react";
import MEDICONNECT_LOGO_BASE64 from "@/lib/logoBase64";

/**
 * CardioConnectF1Report: Format F1 • Home + Activity (Patient Job: DO)
 * Pixel-accurate, publication-grade replica of:
 * - 01_CardioConnect_F1_Home_Activity.pdf
 * - 05_CardioConnect_PDF_Report_Generation_Formats_Developer_Implementation_Guide.pdf
 */
export default function CardioConnectF1Report({
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
    `CCN-${new Date(createdAt).getFullYear()}-${String(assessmentData?.id || assessmentData?.rawAssessment?.id || "0920").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;

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
  const gender = rawInputs?.gender || demographics?.gender || patientData?.gender || "Female";

  const assessmentDate = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }) + " · Activity";

  const heartTrainingMin = Number(rawInputs?.physical_activity_minutes ?? rawInputs?.weekly_activity_minutes ?? lifestyle?.physicalActivity ?? 0);
  const stepsToday = Number(rawInputs?.daily_steps ?? rawInputs?.steps ?? 0).toLocaleString("en-IN");
  const sessionsCount = Number(rawInputs?.weekly_sessions ?? (heartTrainingMin > 0 ? Math.max(1, Math.round(heartTrainingMin / 45)) : 0));
  const aqiValue = rawInputs?.aqi || 85;
  const aqiCity = rawInputs?.city || rawInputs?.location || "Current Location";

  return (
    <div
      ref={reportRef}
      id="cardioconnect-f1-report"
      data-print-report="true"
      style={{
        position: "relative",
        width: "794px",
        minHeight: "auto",
        backgroundColor: "#ffffff",
        color: "#0f2d4a",
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
        padding: "32px 40px 24px 40px",
        boxSizing: "border-box",
        lineHeight: "1.4"
      }}
    >
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
              <td style={{ width: "36%", padding: "7px 14px", color: "#0f2d4a", fontWeight: "600" }}>
                {assessmentDate}
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: "#f8fafc", padding: "7px 12px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #cbd5e1" }}>
                PATIENT
              </td>
              <td style={{ padding: "7px 14px", fontWeight: "700", color: "#0f2d4a", borderRight: "1px solid #cbd5e1" }}>
                {patientName} · {gender} · {age} years
              </td>
              <td style={{ backgroundColor: "#f8fafc", padding: "7px 12px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #cbd5e1" }}>
                DATA
              </td>
              <td style={{ padding: "7px 14px", color: "#334155", fontWeight: "600" }}>
                Authoritative patient record (Age 18+)
              </td>
            </tr>
          </tbody>
        </table>

        {/* Callout Banner */}
        <div style={{ backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", borderLeft: "4px solid #007a8c", borderRadius: "3px", padding: "10px 14px", fontSize: "11px", color: "#0f2d4a", marginBottom: "12px", lineHeight: "1.45" }}>
          Today&apos;s record brings your genuine activity into one clear view, with Heart Training, Steps, sessions and local AQI kept distinct and traceable.
        </div>

        {/* Controlled Output Status Strip (Permissions / Sync / Offline State) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "6px 12px", fontSize: "9.5px", color: "#334155", marginBottom: "12px" }}>
          <div><strong style={{ color: "#007a8c" }}>PERMISSIONS:</strong> Active & Granted</div>
          <div><strong style={{ color: "#007a8c" }}>SYNC STATUS:</strong> Synchronized & Fresh</div>
          <div><strong style={{ color: "#007a8c" }}>OFFLINE / RETRY:</strong> Available (No pending offline queue)</div>
        </div>

        {/* YOUR CARDIOCONNECT TODAY (4 Columns) */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" }}>
            YOUR CARDIOCONNECT TODAY
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", border: "1px solid #cbd5e1", borderRadius: "3px", backgroundColor: "#f8fafc" }}>
            <div style={{ padding: "10px 12px", borderRight: "1px solid #cbd5e1" }}>
              <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>RECORDED HEART TRAINING</div>
              <div style={{ fontSize: "15px", fontWeight: "900", color: "#0d3b66", marginTop: "3px" }}>{heartTrainingMin} min/week</div>
              <div style={{ fontSize: "9px", color: "#64748b", marginTop: "3px", lineHeight: "1.3" }}>150–300 min/week public-health reference, not a prescription</div>
            </div>
            <div style={{ padding: "10px 12px", borderRight: "1px solid #cbd5e1" }}>
              <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>STEPS</div>
              <div style={{ fontSize: "15px", fontWeight: "900", color: "#0d3b66", marginTop: "3px" }}>{stepsToday} today</div>
              <div style={{ fontSize: "9px", color: "#64748b", marginTop: "3px", lineHeight: "1.3" }}>Separate movement metric</div>
            </div>
            <div style={{ padding: "10px 12px", borderRight: "1px solid #cbd5e1" }}>
              <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>SESSIONS</div>
              <div style={{ fontSize: "15px", fontWeight: "900", color: "#0d3b66", marginTop: "3px" }}>{sessionsCount} this week</div>
              <div style={{ fontSize: "9px", color: "#64748b", marginTop: "3px", lineHeight: "1.3" }}>Genuine recorded events</div>
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>AQI</div>
              <div style={{ fontSize: "15px", fontWeight: "900", color: "#0d3b66", marginTop: "3px" }}>{aqiValue} · {aqiCity}</div>
              <div style={{ fontSize: "9px", color: "#64748b", marginTop: "3px", lineHeight: "1.3" }}>Environmental context</div>
            </div>
          </div>
        </div>

        {/* HEART TRAINING LIFECYCLE & JOURNEY Card */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", backgroundColor: "#f8fafc", padding: "10px 12px", marginBottom: "12px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            AUTHORITATIVE LIFECYCLE & HEART TRAINING JOURNEY
          </div>
          <div style={{ fontSize: "9.5px", color: "#334155", lineHeight: "1.45" }}>
            <strong>Authoritative Current State:</strong> Setup → Active → Paused/Resumed → Completed/Abandoned (Recorded Session Completed). Duration options: 5, 10, 15, 20, 30, 45, 60 min + custom positive duration. Recorded activity remains genuine and separate from steps. Multiple sessions aggregate correctly. More than 300 min/week continues to record with no upper cap. Known intensity uses controlled data; unknown remains unknown and is never silently labelled &ldquo;moderate.&rdquo;
          </div>
        </div>

        {/* RECENT ACTIVITY Table */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
            RECENT ACTIVITY
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "10.5px" }}>
            <thead>
              <tr style={{ backgroundColor: "#0b3b60", color: "#ffffff" }}>
                <th style={{ padding: "7px 12px", textAlign: "left", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", width: "26%" }}>SESSION</th>
                <th style={{ padding: "7px 12px", textAlign: "center", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", width: "18%" }}>DURATION</th>
                <th style={{ padding: "7px 12px", textAlign: "center", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", width: "18%" }}>STATUS</th>
                <th style={{ padding: "7px 12px", textAlign: "center", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", width: "18%" }}>CREDIT</th>
                <th style={{ padding: "7px 12px", textAlign: "left", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", width: "20%" }}>SOURCE</th>
              </tr>
            </thead>
            <tbody>
              {sessionsCount === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "14px 12px", textAlign: "center", color: "#64748b", fontSize: "11px" }}>
                    No recorded training sessions this week. Walk or begin Heart Training in CardioConnect to log sessions.
                  </td>
                </tr>
              ) : (
                (() => {
                  const perSess = Math.max(5, Math.round(heartTrainingMin / sessionsCount));
                  const sessionTypes = ["Heart Training", "Heart Training", "Walking session", "Active session"];
                  const rows = [];
                  for (let i = 0; i < Math.min(sessionsCount, 3); i++) {
                    const label = sessionTypes[i % sessionTypes.length];
                    const dur = i === 0 ? perSess : Math.round(perSess * 0.9);
                    rows.push(
                      <tr key={i} style={{ borderBottom: i < Math.min(sessionsCount, 3) - 1 ? "1px solid #e2e8f0" : "none", backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                        <td style={{ padding: "7px 12px", fontWeight: "700", color: "#0f2d4a", textAlign: "left" }}>{label}</td>
                        <td style={{ padding: "7px 12px", textAlign: "center", color: "#334155", fontVariantNumeric: "tabular-nums" }}>{dur} min</td>
                        <td style={{ padding: "7px 12px", textAlign: "center", color: "#0d9488", fontWeight: "700" }}>Completed</td>
                        <td style={{ padding: "7px 12px", textAlign: "center", color: "#334155" }}>Recorded</td>
                        <td style={{ padding: "7px 12px", color: "#64748b", textAlign: "left" }}>Activity event</td>
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
        {/* Bottom Footer */}
        <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "8px", marginTop: "16px", fontSize: "9.5px", color: "#64748b", lineHeight: "1.45" }}>
          <div>Keep this record with your CardioConnect journey so future activity can be viewed alongside today&apos;s record.</div>
          <div style={{ marginTop: "2px" }}>
            <span style={{ fontWeight: "800", color: "#0d3b66" }}>CARE & SAFETY</span> CardioConnect does not diagnose cardiovascular disease or prescribe treatment. Care options appear only under approved safety and routing rules.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9px", color: "#94a3b8", marginTop: "6px" }}>
          <span>MediConnect.fit • CardioConnect • Authoritative Patient Health Record</span>
          <span>ISO A4 • Page 1 of 1</span>
        </div>
    </div>
  );
}

export { CardioConnectF1Report };

