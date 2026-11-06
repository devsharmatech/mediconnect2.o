"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaUser,
  FaCalendarAlt,
  FaSearch,
  FaPhone,
  FaEnvelope,
  FaVenusMars,
  FaHistory,
  FaLungs,
  FaHeartbeat,
  FaTimes,
  FaPrint,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaWalking
} from "react-icons/fa";

export default function DoctorMyPatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeReport, setActiveReport] = useState(null);

  const loadReport = async (patient, type) => {
    setActiveReport({ patient, type, loading: true, graphData: null, summary: null, history: [] });
    try {
      const res = await fetch(`/api/health/assessments/graph?user_id=${patient.id}&type=${type === "lung" ? "lung" : "heart"}&timeframe=year&limit=50`);
      const json = await res.json();
      if (json.success && json.data) {
        setActiveReport({
          patient,
          type,
          loading: false,
          graphData: json.data.graphData,
          summary: json.data.summary,
          history: json.data.history || []
        });
      } else {
        setActiveReport({
          patient,
          type,
          loading: false,
          graphData: null,
          summary: null,
          history: [],
          notice: "No assessments recorded yet for this patient."
        });
      }
    } catch (err) {
      setActiveReport({
        patient,
        type,
        loading: false,
        graphData: null,
        summary: null,
        history: [],
        error: "Unable to retrieve clinical report at this moment."
      });
    }
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
        
        if (!userId) {
          setError("Please log in as a doctor.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/doctor/my-patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctor_id: userId })
        });
        
        const json = await res.json();
        if (json.success) {
          setPatients(json.data);
        } else {
          setError(json.message || "Failed to fetch patients");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("An error occurred while fetching patients.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(p => {
    const searchStr = searchTerm.toLowerCase();
    return (
      (p.full_name || "").toLowerCase().includes(searchStr) ||
      (p.email || "").toLowerCase().includes(searchStr) ||
      (p.phone || "").toLowerCase().includes(searchStr)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Patients Directory</h1>
          <p className="text-slate-500 mt-2">Track the patients you have treated and view consultation history.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search name, phone, email..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1] shadow-sm bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading your patients...</p>
        </div>
      ) : error ? (
        <div className="py-20 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100 p-8">
          <p className="font-semibold">{error}</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="py-20 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 p-8">
          <FaUser className="mx-auto text-4xl mb-4 text-slate-300" />
          <p className="font-semibold text-lg">No patients found</p>
          <p className="text-sm mt-1">When patients complete appointments with you, they will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPatients.map((patient, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center text-xl font-bold">
                    {patient.full_name?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-800">{patient.full_name}</h3>
                      {patient.is_identity_verified && (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                          title={patient.identity_verified_at ? `Verified on ${new Date(patient.identity_verified_at).toLocaleDateString()}` : "Patient identity confirmed"}
                        >
                          <FaCheckCircle className="text-emerald-600 text-xs" />
                          Identity Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1.5"><FaVenusMars className="text-slate-400" /> {patient.gender || 'N/A'}</span>
                      {(() => {
                        let age = patient.age;
                        if (!age && patient.date_of_birth) {
                          const dob = new Date(patient.date_of_birth);
                          if (!isNaN(dob.getTime())) {
                            const today = new Date();
                            let a = today.getFullYear() - dob.getFullYear();
                            const m = today.getMonth() - dob.getMonth();
                            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
                            if (a >= 0) age = a;
                          }
                        }
                        if (!age) return null;
                        return (
                          <>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="font-medium text-slate-700">{age} yrs</span>
                          </>
                        );
                      })()}
                      {patient.blood_group && (
                        <>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className="text-red-500 font-bold">{patient.blood_group}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex flex-col items-center justify-center bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
                    <span className="text-2xl font-black text-indigo-600">{patient.visit_count}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Total Visits</span>
                  </div>
                </div>
              </div>

              <hr className="my-5 border-slate-100" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <FaPhone />
                  </div>
                  <span className="truncate">{patient.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <FaEnvelope />
                  </div>
                  <span className="truncate">{patient.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 sm:col-span-2">
                  <div className="w-8 h-8 rounded-full bg-[#0067A1]/5 flex items-center justify-center text-[#0067A1] shrink-0">
                    <FaHistory />
                  </div>
                  <div className="flex-1 flex justify-between items-center bg-[#0067A1]/5 px-3 py-2 rounded-lg border border-[#0067A1]/10">
                    <span className="font-medium text-[#0067A1]">Latest Appointment</span>
                    <span className="font-semibold text-slate-700">{formatDate(patient.last_visit_date)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 sm:col-span-2">
                  <span className="text-xs font-bold text-slate-500 mr-1">Clinical Reports:</span>
                  <button
                    type="button"
                    onClick={() => loadReport(patient, "lung")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0067A1] rounded-lg text-xs font-bold border border-sky-200/80 transition-colors shadow-2xs cursor-pointer active:scale-95"
                    title="View LungConnect telemetry report"
                  >
                    <FaLungs className="w-3.5 h-3.5" />
                    <span>LungConnect Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadReport(patient, "cardio")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200/80 transition-colors shadow-2xs cursor-pointer active:scale-95"
                    title="View CardioConnect telemetry report"
                  >
                    <FaHeartbeat className="w-3.5 h-3.5" />
                    <span>CardioConnect Report</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clinical Telemetry Report Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-hidden animate-fade-in">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeReport.type === "lung" ? "bg-sky-100 text-[#0067A1]" : "bg-rose-100 text-rose-600"
                }`}>
                  {activeReport.type === "lung" ? <FaLungs className="w-5 h-5" /> : <FaHeartbeat className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    {activeReport.type === "lung" ? "LungConnect Clinical Telemetry Report" : "CardioConnect Clinical Telemetry Report"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Patient: <strong className="text-slate-800">{activeReport.patient.full_name}</strong>
                    {activeReport.patient.age ? ` • ${activeReport.patient.age} yrs` : ""}
                    {activeReport.patient.gender ? ` • ${activeReport.patient.gender}` : ""}
                    {activeReport.patient.blood_group ? ` • ${activeReport.patient.blood_group}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {activeReport.loading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-semibold text-slate-500">Retrieving patient telemetry and clinical scores...</p>
                </div>
              ) : activeReport.error ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center text-rose-700 text-xs font-medium">
                  {activeReport.error}
                </div>
              ) : activeReport.history.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 sm:p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 mx-auto flex items-center justify-center text-slate-400">
                    <FaHistory className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Assessment Records Yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    {activeReport.patient.full_name} has not recorded any {activeReport.type === "lung" ? "respiratory/lung" : "cardiovascular"} guided wellness assessments yet. Telemetry will appear here once sessions are completed.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sessions</span>
                      <span className="text-lg font-black text-slate-900 mt-0.5 block">{activeReport.history.length}</span>
                      <span className="text-[10px] text-slate-500">Recorded sessions</span>
                    </div>
                    {activeReport.type === "lung" ? (
                      <>
                        <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
                          <span className="text-[10px] font-bold text-[#0067A1] uppercase tracking-wider block">PEFR (Peak Flow)</span>
                          <span className="text-lg font-black text-slate-900 mt-0.5 block">
                            {activeReport.summary?.avgPeakFlow ? `${Math.round(activeReport.summary.avgPeakFlow)} L/min` : "Recorded"}
                          </span>
                          <span className="text-[10px] text-slate-500">Average telemetry</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Breath Hold</span>
                          <span className="text-lg font-black text-slate-900 mt-0.5 block">
                            {activeReport.summary?.avgBreathHold ? `${Math.round(activeReport.summary.avgBreathHold)}s` : "Tested"}
                          </span>
                          <span className="text-[10px] text-slate-500">Capacity score</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Clinical Status</span>
                          <span className="text-sm font-bold text-slate-900 mt-1 block">Active Telemetry</span>
                          <span className="text-[10px] text-slate-500">Monitored</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Resting HR</span>
                          <span className="text-lg font-black text-slate-900 mt-0.5 block">
                            {activeReport.summary?.avgHeartRate ? `${Math.round(activeReport.summary.avgHeartRate)} bpm` : "Tracked"}
                          </span>
                          <span className="text-[10px] text-slate-500">Average telemetry</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Walk Test (6MWT)</span>
                          <span className="text-lg font-black text-slate-900 mt-0.5 block">
                            {activeReport.summary?.avgDistance ? `${Math.round(activeReport.summary.avgDistance)} m` : "Logged"}
                          </span>
                          <span className="text-[10px] text-slate-500">Cardio capacity</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Spectrum</span>
                          <span className="text-sm font-bold text-slate-900 mt-1 block">11 Factors</span>
                          <span className="text-[10px] text-slate-500">Cardio index</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* History Log Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Session History Log</span>
                      <span className="text-[11px] text-slate-500">{activeReport.history.length} records</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {activeReport.history.map((item, idx) => (
                        <div key={item.id || idx} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {item.title || (activeReport.type === "lung" ? "Respiratory Health Check" : "Cardio Performance Assessment")}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">
                              {formatDate(item.created_at || item.date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.score !== undefined && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                                Score: {item.score}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase tracking-wider">
                              Verified Log
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Official clinical telemetry record for practitioner consultation.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FaPrint className="w-3 h-3 text-[#0067A1]" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReport(null)}
                  className="px-4 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
