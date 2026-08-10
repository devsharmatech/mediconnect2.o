"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConsultationWorkspacePage({ params }) {
  const router = useRouter();
  const { id: consultation_id } = React.use(params);

  // Core state maps
  const [consultationData, setConsultationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [modeUsed, setModeUsed] = useState("STANDARD_MODE");

  // Orchestration processing states
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // SUCCESS, FAILURE, WAITING
  const [nextAction, setNextAction] = useState(null);
  const [message, setMessage] = useState("");
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [safetyFlags, setSafetyFlags] = useState([]);

  // Fetch consultation snapshot details
  const fetchConsultation = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch consultation core state
      const res = await fetch(`/api/consultation/status?id=${consultation_id}`);
      if (!res.ok) {
        throw new Error("Failed to resolve active consultation episode metrics");
      }
      const json = await res.json();
      if (json.status === "SUCCESS") {
        setConsultationData(json.data);
        // Pre-fill existing clinical state if available
        if (json.data?.clinical) {
          setSymptoms(json.data.clinical.symptoms?.join(", ") || "");
          setDiagnosis(json.data.clinical.diagnosis || "");
          setPrescriptionNotes(json.data.clinical.notes || "");
        }
      } else {
        throw new Error(json.message || "Consultation resolution returned failure code");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [labReports, setLabReports] = useState([]);
  const [selectedReportIds, setSelectedReportIds] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (consultation_id) {
      fetchConsultation();
    }
  }, [consultation_id]);

  useEffect(() => {
    if (consultationData?.patient_id) {
      const fetchReports = async () => {
        setLoadingReports(true);
        try {
          const res = await fetch(`/api/doctor/patients/${consultationData.patient_id}/records`);
          const json = await res.json();
          if (json.status && json.data?.labReports) {
            setLabReports(json.data.labReports);
          }
        } catch (err) {
          console.error("Failed to load reports:", err);
        } finally {
          setLoadingReports(false);
        }
      };
      fetchReports();
    }
  }, [consultationData?.patient_id]);

  // Action dispatcher
  const handleManageSubmit = async (actionType) => {
    setSubmitting(true);
    setSubmitStatus("WAITING");
    setMessage(`Executing atomic ${actionType} orchestration pipeline...`);
    setNextAction(null);
    setValidationWarnings([]);
    setSafetyFlags([]);

    const payload = {
      consultation_id,
      care_episode_id: consultationData?.care_episode_id || null,
      action: actionType, // "save" or "complete"
      mode_used: modeUsed,
      override_reason: overrideReason || null,
      clinical_payload: {
        symptoms: symptoms.split(",").map((s) => s.trim()).filter(Boolean),
        diagnosis,
        notes: prescriptionNotes,
        severity: "MODERATE", // default assignment mapping
        duration: "3 days",
      },
    };

    if (actionType === "complete") {
      payload.idempotency_key = crypto.randomUUID();
    }

    try {
      const res = await fetch("/api/consultation/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      // Enforce Layer-111 Schema Validation Rules (status, next_action, data)
      setSubmitStatus(json.status || (res.ok ? "SUCCESS" : "FAILURE"));
      setNextAction(json.next_action || null);
      setMessage(json.message || (res.ok ? "Action finalized successfully" : "Execution interrupted"));

      if (json.data) {
        if (json.data.validation_warnings) {
          setValidationWarnings(json.data.validation_warnings);
        }
        if (json.data.safety_flags) {
          setSafetyFlags(json.data.safety_flags);
        }
      }

      // Handle custom client-side redirection strictly responding to next_action parameters
      if (json.status === "SUCCESS" && actionType === "complete") {
        setTimeout(() => {
          // Navigate to parent summary or appointments hub following atomic finalization
          router.push("/doctor/appointments");
        }, 2500);
      }
    } catch (err) {
      setSubmitStatus("FAILURE");
      setMessage(`Network execution disconnect: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm tracking-wide text-gray-400">Loading Clinician Care Workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] p-6 text-white">
        <div className="max-w-md w-full bg-red-950/40 border border-red-500/50 rounded-2xl p-6 backdrop-blur-xl text-center space-y-4">
          <svg className="w-12 h-12 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-semibold">Workspace Resolution Fault</h3>
          <p className="text-sm text-gray-300">{error}</p>
          <button
            onClick={fetchConsultation}
            className="w-full py-2.5 px-4 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition shadow-lg shadow-red-500/20"
          >
            Retry Validation Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Workspace Header Banner */}
        <div className="bg-gradient-to-r from-teal-900/40 via-slate-900/60 to-blue-900/40 border border-[#0067A1]/30 rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#0080C6]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#0080C6]/10 border border-[#0067A1]/20 rounded-full text-xs font-semibold text-[#0080C6] mb-3">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                <span>Layer-111 Atomic Care Portal</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Clinical Consultation Sign-Off</h1>
              <p className="text-xs md:text-sm text-gray-400 mt-1">
                Episode ID: <span className="font-mono text-teal-300">{consultation_id}</span>
              </p>
            </div>

            <div className="flex items-center space-x-3 bg-slate-950/60 border border-slate-800 rounded-2xl p-3 px-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Current Scope Status</p>
                <p className="text-sm font-bold text-[#0080C6] uppercase tracking-wider">
                  {consultationData?.case_status || "STARTED"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0080C6]/10 border border-[#0067A1]/20 flex items-center justify-center text-[#0080C6] font-bold">
                🩺
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Status Notifications Bar */}
        {submitStatus && (
          <div className={`border rounded-2xl p-4 backdrop-blur-xl transition-all duration-300 ${
            submitStatus === "SUCCESS" ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200" :
            submitStatus === "WAITING" ? "bg-amber-950/30 border-amber-500/40 text-amber-200" :
            "bg-red-950/30 border-red-500/40 text-red-200"
          }`}>
            <div className="flex items-center space-x-3">
              {submitStatus === "WAITING" && (
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              )}
              <div className="flex-1 font-medium text-sm">
                <span className="font-bold uppercase tracking-wide mr-2">[{submitStatus}]</span>
                {message}
              </div>
              {nextAction && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-black/40 border border-white/10">
                  Action: {nextAction}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quality & Safety Flag Alerts */}
        {safetyFlags.length > 0 && (
          <div className="bg-red-950/30 border border-red-500/40 rounded-2xl p-4 text-red-200 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-red-400">⚠️ Systemic Clinical Safety Exceptions Intercepted</p>
            <ul className="list-disc list-inside text-xs space-y-1 text-gray-300">
              {safetyFlags.map((flag, i) => (
                <li key={i}><strong className="text-red-300">[{flag.severity}]</strong> {flag.description || "Contraindication detected"}</li>
              ))}
            </ul>
            <p className="text-xs text-amber-300 mt-2">
              Mandatory Layer-111 safety check constraints require an explicit clinical override justification reason below to authorize sign-off.
            </p>
          </div>
        )}

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-5">
              <h2 className="text-lg font-semibold text-[#0080C6] flex items-center space-x-2">
                <span>📝 Electronic Documentation Core</span>
              </h2>

              {/* Clinical Mode Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Consultation Review Protocol Mode</label>
                <select
                  value={modeUsed}
                  onChange={(e) => setModeUsed(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-[#0067A1] transition"
                >
                  <option value="STANDARD_MODE">Standard Consultation Class</option>
                  <option value="CHRONIC_CARE_MODE">Chronic Disease Management Class</option>
                  <option value="TELEMEDICINE_EXPRESS">Telemedicine Express Review</option>
                </select>
              </div>

              {/* Symptoms Input */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Observed Symptom Identifiers (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="fever, acute_migraine, dry_cough"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#0067A1] transition"
                />
              </div>

              {/* Diagnosis Input */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Primary Clinical Diagnosis</label>
                <input
                  type="text"
                  placeholder="Acute Upper Respiratory Tract Infection"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#0067A1] transition"
                />
              </div>

              {/* Prescription Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Prescription Directives & Consultation Notes</label>
                <textarea
                  rows={4}
                  placeholder="Advised complete bed rest for 3 days. Prescribed generic antipyretic oral formulation. Follow up required if fever sustains."
                  value={prescriptionNotes}
                  onChange={(e) => setPrescriptionNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#0067A1] transition resize-none"
                ></textarea>
              </div>

              {/* Override Reason Justification (Visible if needed or always as optional guard) */}
              <div>
                <label className="block text-xs font-medium text-[#0080C6] mb-1.5">
                  Clinical Override Justification Notes (Optional / Mandatory on Safety Flag)
                </label>
                <input
                  type="text"
                  placeholder="Patient reports historical safety tolerance to primary active salts. Prescribed under close vitals tracking."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-slate-950 border border-[#0067A1]/20 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#0067A1] transition"
                />
              </div>
            </div>

            {/* Verification & Submission Actions Card */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl backdrop-blur-xl">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleManageSubmit("save")}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-gray-300 border border-slate-700 rounded-xl text-sm font-medium transition disabled:opacity-50"
              >
                💾 Save Working Draft Snapshot
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleManageSubmit("complete")}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-[#0067A1] hover:to-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>🔒 Complete & Digitally Sign Episode</span>
              </button>
            </div>
          </div>

          {/* Right Column: Active Invariants & Trace Reference Context */}
          <div className="space-y-6">
            
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                🧬 Core Orchestration Profile
              </h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
                  <span className="text-gray-400">Doctor ID Ref</span>
                  <span className="font-mono text-gray-300 truncate max-w-[150px]">
                    {consultationData?.doctor_id || "Auth Default"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
                  <span className="text-gray-400">Patient ID Ref</span>
                  <span className="font-mono text-gray-300 truncate max-w-[150px]">
                    {consultationData?.patient_id || "Unresolved Scope"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
                  <span className="text-gray-400">Care Episode ID</span>
                  <span className="font-mono text-[#0080C6] truncate max-w-[150px]">
                    {consultationData?.care_episode_id || "L1 Inherited"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">Sync Pipeline Check</span>
                  <span className="text-emerald-400 font-semibold flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                    ACTIVE POLLED
                  </span>
                </div>
              </div>
            </div>

            {/* Patient Lab Reports History & Comparison Widget */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#0080C6]">
                📄 Diagnostic Lab Reports History
              </h3>
              {loadingReports ? (
                <div className="text-center py-4 text-xs text-gray-500">Loading reports...</div>
              ) : labReports.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-500">No previous reports found for this patient.</div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {labReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-850 hover:border-slate-800 transition">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedReportIds.includes(report.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReportIds([...selectedReportIds, report.id]);
                              } else {
                                setSelectedReportIds(selectedReportIds.filter(id => id !== report.id));
                              }
                            }}
                            className="rounded border-slate-700 bg-slate-950 text-[#0067A1] focus:ring-[#0067A1]"
                          />
                          <div className="text-xs">
                            <p className="font-bold text-gray-250">
                              {report.lab_details?.lab_name || "Diagnostic Report"}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        {report.report_url && (
                          <a
                            href={report.report_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-[#0080C6] hover:underline"
                          >
                            Download PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Comparison Panel */}
                  {selectedReportIds.length > 0 && (() => {
                    const selected = labReports.filter(r => selectedReportIds.includes(r.id));
                    // Extract all structured result keys
                    const keys = Array.from(new Set(selected.flatMap(r => Object.keys(r.structured_results || {}))));
                    if (keys.length === 0) {
                      return <div className="text-center py-2 text-[10px] text-amber-400">Select reports containing structured values to compare.</div>;
                    }
                    return (
                      <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                        <p className="text-xs font-bold text-[#0080C6]">🔬 Report Value Comparison</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[10px]">
                            <thead>
                              <tr className="border-b border-slate-800">
                                <th className="py-1 text-gray-500 font-medium">Test Name</th>
                                {selected.map(r => (
                                  <th key={r.id} className="py-1 text-right text-gray-400 font-bold">
                                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {keys.map(key => (
                                <tr key={key} className="border-b border-slate-900/50 hover:bg-slate-900/10">
                                  <td className="py-1.5 font-medium text-gray-300">{key}</td>
                                  {selected.map(r => {
                                    const val = r.structured_results?.[key];
                                    return (
                                      <td key={r.id} className="py-1.5 text-right font-bold text-gray-205">
                                        {val !== undefined && val !== null ? val : '—'}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* System Invariant Guides */}
            <div className="bg-gradient-to-br from-slate-900/50 to-teal-950/20 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0080C6]">
                📋 Layer-111 Traceability Directives
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Submitting a completed snapshot automatically triggers real-time <strong>DPDP Act Consent Logs</strong> verification, evaluates <strong>drug safety models</strong> natively, generates immutable record baselines, and dispatches authenticated secondary queues to localized laboratory/pharmacy service networks safely.
              </p>
            </div>

            {/* Non-Critical Quality Diagnostics */}
            {validationWarnings.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">ℹ️ Secondary Quality Trace Disclosures</p>
                <ul className="list-disc list-inside text-[11px] text-gray-400 space-y-1">
                  {validationWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
