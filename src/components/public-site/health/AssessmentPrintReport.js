import React from "react";
import CardioConnectF1Report from "./reports/CardioConnectF1Report";
import CardioConnectF2Report from "./reports/CardioConnectF2Report";
import CardioConnectF3Report from "./reports/CardioConnectF3Report";
import CardioConnectF4Report from "./reports/CardioConnectF4Report";
import LungConnectV99Report from "./reports/LungConnectV99Report";
import LungConnectFullReport from "./reports/LungConnectFullReport";

/**
 * AssessmentPrintReport: Universal High-Precision Clinical Report Dispatcher
 * Directly supports all authoritative client formats from client-docs-lungsconnect-cardioconnect:
 * - F1: CardioConnect Home + Activity (Patient Job: DO)
 * - F2: CardioConnect Progress + Wellness (Patient Job: UNDERSTAND)
 * - F3: CardioConnect Walking Performance (Patient Job: MEASURE)
 * - F4: CardioConnect Controlled Full Assessment (Patient Job: RECEIVE / SHARE / CONTINUE)
 * - lung-v9.9: LungConnect V9.9 Frozen 1-Page A4 Fixed
 * - lung-full: LungConnect Full Clinical Assessment Report (LC-07 to LC-10)
 */
export default function AssessmentPrintReport({
  assessmentType = "lung",
  formatType, // "F1" | "F2" | "F3" | "F4" | "lung-v9.9" | "lung-full"
  assessmentData = {},
  patientData = {},
  reportRef
}) {
  const isHeart = assessmentType === "heart";

  // Normalize format string: preserve lung-v9.9 and lung-full as-is, uppercase cardio formats
  const rawFormatInput = formatType || (isHeart ? "F4" : "lung-v9.9");
  const isLungFormat = rawFormatInput.toLowerCase().startsWith("lung");
  const rawFormat = isLungFormat ? rawFormatInput.toLowerCase() : rawFormatInput.toUpperCase();

  const containerStyle = {
    position: "absolute",
    left: "-9999px",
    top: 0,
    width: "794px",
    minHeight: "auto",
    backgroundColor: "#ffffff",
    boxSizing: "border-box"
  };

  if (rawFormat === "F1") {
    return (
      <div ref={reportRef} id="assessment-print-report" data-print-report="true" style={containerStyle}>
        <CardioConnectF1Report assessmentData={assessmentData} patientData={patientData} />
      </div>
    );
  }

  if (rawFormat === "F2") {
    return (
      <div ref={reportRef} id="assessment-print-report" data-print-report="true" style={containerStyle}>
        <CardioConnectF2Report assessmentData={assessmentData} patientData={patientData} />
      </div>
    );
  }

  if (rawFormat === "F3") {
    return (
      <div ref={reportRef} id="assessment-print-report" data-print-report="true" style={containerStyle}>
        <CardioConnectF3Report assessmentData={assessmentData} patientData={patientData} />
      </div>
    );
  }

  if (rawFormat === "F4") {
    return (
      <div ref={reportRef} id="assessment-print-report" data-print-report="true" style={containerStyle}>
        <CardioConnectF4Report assessmentData={assessmentData} patientData={patientData} />
      </div>
    );
  }

  if (rawFormat === "lung-full") {
    return (
      <div ref={reportRef} id="assessment-print-report" data-print-report="true" style={containerStyle}>
        <LungConnectFullReport assessmentData={assessmentData} patientData={patientData} />
      </div>
    );
  }

  // Fallback to LungConnect V9.9
  return (
    <div ref={reportRef} id="assessment-print-report" data-print-report="true" style={containerStyle}>
      <LungConnectV99Report assessmentData={assessmentData} patientData={patientData} />
    </div>
  );
}

export {
  CardioConnectF1Report,
  CardioConnectF2Report,
  CardioConnectF3Report,
  CardioConnectF4Report,
  LungConnectV99Report,
  LungConnectFullReport
};
