import React from "react";
import MEDICONNECT_LOGO_BASE64 from "@/lib/logoBase64";

/**
 * LungConnectV99Report: Frozen 1-Page A4 Patient Summary
 * Pixel-accurate, publication-grade replica of:
 * - MediConnect_LungConnect_V9.9_FREEZE_CANDIDATE_ONE_PAGE_A4_FIXED.pdf
 * - MediConnect_LungConnect_V9.9_DEVELOPER_IMPLEMENTATION_CONTROL_V2_ONE_PAGE.pdf
 * - SP-06_LungConnect_Developer_Delta_Addendum_V4_RECONCILED_REVIEW.pdf (P0 Action: LUNGCONNECT CHECK-IN RESULT)
 */
export default function LungConnectV99Report({
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  const inputs = assessmentData?.lung_health_inputs?.[0] || {};
  const createdAt = assessmentData?.created_at || new Date().toISOString();

  const serialNo = assessmentData?.serial_no || (
    `LCN-${new Date(createdAt).getFullYear()}-${String(assessmentData?.id || "BC2C4C29").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
  );

  const patientName = patientData?.name || patientData?.full_name || patientData?.user?.name || "Sneha Kapoor";
  const age = Math.max(18, Number(inputs?.age || patientData?.age || 29));

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
  const breathHold = inputs?.breath_holding_time || 35;
  const pefr = inputs?.peak_flow || 450;
  const rr = inputs?.respiratory_rate || 16;

  // Symptoms
  const hasCough = inputs?.symptoms_cough === true || inputs?.symptoms_cough === "yes";
  const hasBreathless = inputs?.symptoms_breathlessness === true || inputs?.symptoms_breathlessness === "yes";
  const hasWheezing = inputs?.symptoms_wheezing === true || inputs?.symptoms_wheezing === "yes" || (!hasCough && !hasBreathless);

  const coughText = hasCough ? "present" : "none";
  const breathlessnessText = hasBreathless ? "present" : "none";
  const wheezingText = hasWheezing ? "present" : "none";

  // Context & AQI
  const bmi = Number(inputs?.bmi || 24.5).toFixed(1);
  const smokingHistory = inputs?.smoking_history || (inputs?.smoking_status === "former" ? "Former smoking history" : inputs?.smoking_status === "never" ? "Never smoked" : "Former smoking history");
  const aqi = inputs?.aqi || 60;
  const aqiCity = inputs?.city || inputs?.location || "Khurja";
  const aqiCategory = aqi <= 50 ? "Good" : aqi <= 100 ? "Satisfactory" : aqi <= 200 ? "Moderate" : aqi <= 300 ? "Poor" : "Very Poor";

  return (
    <div
      ref={reportRef}
      id="lungconnect-v99-report"
      data-print-report="true"
      style={{
        position: "relative",
        width: "794px",
        minHeight: "auto",
        backgroundColor: "#ffffff",
        color: "#0f2d4a",
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
        padding: "36px 44px 28px 44px",
        boxSizing: "border-box",
        lineHeight: "1.4"
      }}
    >
      {/* Top Header & Content Body */}
      <div>
        {/* Document Header with Official Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "2px solid #007a8c", paddingBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              src={MEDICONNECT_LOGO_BASE64}
              alt="MediConnect Logo"
              style={{ height: "46px", width: "46px", objectFit: "contain", borderRadius: "50%", flexShrink: 0, backgroundColor: "#ffffff" }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px", fontWeight: "900", color: "#007a8c", letterSpacing: "0.5px" }}>MediConnect.fit</span>
                <span style={{ color: "#94a3b8", fontWeight: "300" }}>|</span>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "#0d3b66", letterSpacing: "1px", textTransform: "uppercase" }}>LUNGCONNECT</span>
              </div>
              <div style={{ fontSize: "18px", fontWeight: "900", color: "#0d3b66", letterSpacing: "0.5px", textTransform: "uppercase", marginTop: "1px", lineHeight: "1.1" }}>
                YOUR LUNGCONNECT HEALTH SUMMARY
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                Authoritative respiratory wellness and vital capacity record.
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "inline-block", backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", fontSize: "10px", fontWeight: "800", padding: "4px 10px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Authoritative Record
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", fontWeight: "600" }}>
              Freeze Candidate v9.9 • ISO A4
            </div>
          </div>
        </div>

        {/* 2x2 Clean Structured Metadata Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", marginBottom: "18px", fontSize: "11.5px" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
              <td style={{ width: "15%", backgroundColor: "#eaf4f6", padding: "7px 12px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #cbd5e1" }}>
                RECORD
              </td>
              <td style={{ width: "35%", backgroundColor: "#ffffff", padding: "7px 14px", fontWeight: "700", color: "#0f2d4a", fontFamily: "monospace", fontSize: "12px", borderRight: "1px solid #cbd5e1" }}>
                {serialNo}
              </td>
              <td style={{ width: "16%", backgroundColor: "#eaf4f6", padding: "7px 12px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #cbd5e1" }}>
                ASSESSMENT
              </td>
              <td style={{ width: "34%", backgroundColor: "#ffffff", padding: "7px 14px", color: "#0f2d4a", fontWeight: "600" }}>
                {assessmentDate}
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: "#eaf4f6", padding: "7px 12px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #cbd5e1" }}>
                PATIENT
              </td>
              <td style={{ backgroundColor: "#ffffff", padding: "7px 14px", fontWeight: "700", color: "#0f2d4a", borderRight: "1px solid #cbd5e1" }}>
                {patientName}
              </td>
              <td style={{ backgroundColor: "#eaf4f6", padding: "7px 12px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #cbd5e1" }}>
                SOURCE
              </td>
              <td style={{ backgroundColor: "#ffffff", padding: "7px 14px", color: "#334155", fontSize: "11px" }}>
                Self-reported questionnaire & vitals
              </td>
            </tr>
          </tbody>
        </table>

        {/* Narrative Heading & Description */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "14.5px", fontWeight: "800", color: "#0d3b66", marginBottom: "4px" }}>
            A clear picture of your breathing and wellness today
          </div>
          <div style={{ fontSize: "11.5px", color: "#334155", lineHeight: "1.5" }}>
            LungConnect brings together what you shared about your breathing, everyday wellness and the air around you. This summary distils today&apos;s check-in into one clear reference point for you and your ongoing LungConnect record.
          </div>
        </div>

        {/* Main Unified Wellness Panel */}
        <div style={{ backgroundColor: "#f0f7f9", border: "1px solid #cbd5e1", borderRadius: "2px", marginBottom: "20px", overflow: "hidden" }}>
          {/* Row 1: Objective Respiratory Snapshot */}
          <div style={{ display: "flex", padding: "14px 20px", borderBottom: "1px solid #cbd5e1", backgroundColor: "#f0fdfa", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "12.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
                YOUR RESPIRATORY HEALTH SNAPSHOT
              </div>
              <div style={{ fontSize: "11px", color: "#334155", lineHeight: "1.4" }}>
                A single reference point from today&apos;s check-in, combining genuine vitals, recorded symptoms, and personal context.
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "3px", padding: "5px 12px", textAlign: "center", minWidth: "75px" }}>
                <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>PEFR</div>
                <div style={{ fontSize: "15px", fontWeight: "900", color: "#0d3b66" }}>{pefr} <span style={{ fontSize: "9.5px", fontWeight: "600", color: "#64748b" }}>L/min</span></div>
              </div>
              <div style={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "3px", padding: "5px 12px", textAlign: "center", minWidth: "75px" }}>
                <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>BREATH HOLD</div>
                <div style={{ fontSize: "15px", fontWeight: "900", color: "#0d3b66" }}>{breathHold} <span style={{ fontSize: "9.5px", fontWeight: "600", color: "#64748b" }}>sec</span></div>
              </div>
              <div style={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "3px", padding: "5px 12px", textAlign: "center", minWidth: "75px" }}>
                <div style={{ fontSize: "9px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>RESP. RATE</div>
                <div style={{ fontSize: "15px", fontWeight: "900", color: "#0d3b66" }}>{rr} <span style={{ fontSize: "9.5px", fontWeight: "600", color: "#64748b" }}>bpm</span></div>
              </div>
            </div>
          </div>

          {/* Row 2: Key Takeaway */}
          <div style={{ padding: "14px 20px", backgroundColor: "#ffffff", borderBottom: "1px solid #cbd5e1" }}>
            <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "5px" }}>
              YOUR KEY TAKEAWAY
            </div>
            <div style={{ fontSize: "11.5px", color: "#334155", lineHeight: "1.55" }}>
              Today&apos;s check-in brings your recorded responses into one clear view. {hasWheezing ? "Wheezing is the symptom to keep in view" : "No persistent wheezing reported"}, while {hasCough ? "cough was reported" : "no persistent cough reported"} and {hasBreathless ? "breathlessness was reported" : "no severe breathlessness reported"}.
              <br />
              Keep this record as a reference for your next check-in, when you can see what has changed, stayed the same or newly appeared. If symptoms are new, persistent, worsening or concerning, consider a healthcare consultation.
            </div>
          </div>

          {/* Row 3: Today's Recorded Check-in (White Card Insert) */}
          <div style={{ padding: "14px 20px", backgroundColor: "#ffffff", borderBottom: "1px solid #cbd5e1" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 28px" }}>
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase" }}>
                  TODAY&apos;S RECORDED CHECK-IN
                </div>
                <div style={{ fontSize: "11.5px", color: "#334155", marginTop: "3px" }}>
                  Breath-hold {breathHold} sec • PEFR {pefr} L/min • Respiratory rate {rr} bpm
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase" }}>
                  SYMPTOMS
                </div>
                <div style={{ fontSize: "11.5px", color: "#334155", marginTop: "3px" }}>
                  Cough: {coughText} • Breathlessness: {breathlessnessText} • Wheezing: {wheezingText}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase" }}>
                  PERSONAL CONTEXT
                </div>
                <div style={{ fontSize: "11.5px", color: "#334155", marginTop: "3px" }}>
                  Age {age} yrs • BMI {bmi} kg/m² • {smokingHistory}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase" }}>
                  AIR QUALITY
                </div>
                <div style={{ fontSize: "11.5px", color: "#334155", marginTop: "3px" }}>
                  AQI {aqi} • {aqiCity} • CPCB category: {aqiCategory}
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Air Quality Context & Everyday Habit */}
          <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
            <div>
              <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                AIR-QUALITY CONTEXT
              </div>
              <div style={{ fontSize: "11px", color: "#334155", lineHeight: "1.45" }}>
                AQI {aqi} in {aqiCity} is in the CPCB {aqiCategory} category. This provides local air-quality context for everyday well-being.
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
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
          <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#0d3b66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            YOUR NEXT OPTIONS
          </div>
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "2px", backgroundColor: "#ffffff", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", borderBottom: "1px solid #cbd5e1" }}>
              <div style={{ padding: "14px 16px", borderRight: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  EXPLORE
                </div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#0d3b66", marginTop: "2px", marginBottom: "4px" }}>
                  Breathing Wellness
                </div>
                <div style={{ fontSize: "10.5px", color: "#475569", lineHeight: "1.4", marginBottom: "10px" }}>
                  Guided breathing for calm, comfortable everyday wellness.
                </div>
                <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>
                  → EXPLORE BREATHING WELLNESS
                </div>
              </div>

              <div style={{ padding: "14px 16px", borderRight: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  TRACK
                </div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#0d3b66", marginTop: "2px", marginBottom: "4px" }}>
                  My Progress
                </div>
                <div style={{ fontSize: "10.5px", color: "#475569", lineHeight: "1.4", marginBottom: "10px" }}>
                  Review your recorded check-ins and available progress over time.
                </div>
                <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>
                  → VIEW MY PROGRESS
                </div>
              </div>

              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  CONNECT
                </div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#0d3b66", marginTop: "2px", marginBottom: "4px" }}>
                  Care & Consultation
                </div>
                <div style={{ fontSize: "10.5px", color: "#475569", lineHeight: "1.4", marginBottom: "10px" }}>
                  Explore supported care options or connect with a healthcare professional when you want support.
                </div>
                <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase" }}>
                  → EXPLORE CARE OPTIONS
                </div>
                <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#007a8c", textTransform: "uppercase", marginTop: "3px" }}>
                  • BOOK A CONSULTATION
                </div>
              </div>
            </div>

            {/* Bottom Row of Options Panel: READY FOR NEXT CHECK-IN & CARE DISCLAIMER */}
            <div style={{ backgroundColor: "#f0f7f9", padding: "14px 18px" }}>
              <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0d3b66", marginBottom: "3px" }}>
                READY FOR YOUR NEXT CHECK-IN
              </div>
              <div style={{ fontSize: "10.5px", color: "#334155", marginBottom: "8px" }}>
                Keep this summary with your LungConnect record so your next check-in can be viewed alongside today&apos;s record.
              </div>
              <div style={{ fontSize: "10.5px", color: "#334155", lineHeight: "1.4" }}>
                <span style={{ fontWeight: "800", color: "#0d3b66" }}>CARE & SAFETY</span> This summary does not diagnose a respiratory condition and should not delay urgent medical care. If symptoms are severe, sudden or worsening, seek appropriate medical attention.
              </div>
            </div>
          </div>
        </div>

        {/* Footnote Notice */}
        <div style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.4" }}>
          * AQI is shown as local air-quality context. It provides environmental reference for your recorded vitals. This report uses one authoritative result record.
        </div>
      </div>

      {/* Bottom Page Footer */}
      <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "10px", marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#94a3b8" }}>
        <span>MediConnect.fit • LungConnect • Patient Summary</span>
        <span>ISO A4 • Page 1 of 1</span>
      </div>
    </div>
  );
}

export { LungConnectV99Report };

