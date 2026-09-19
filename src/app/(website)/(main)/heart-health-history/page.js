"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Activity,
  Printer,
  Download,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  User,
  Ruler,
  Scale,
  RefreshCw,
  X,
  Eye,
  Sparkles,
  Info
} from "lucide-react";
import toast from "react-hot-toast";
import AssessmentPrintReport from "@/components/public-site/health/AssessmentPrintReport";
import { generateClientPdf, printClientReport } from "@/lib/clientPdfGenerator";
import { AnimatedCardioLoader } from "@/components/public-site/health/animations";

export default function HeartHealthHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [selectedAssessmentForPrint, setSelectedAssessmentForPrint] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const reportRef = useRef(null);

  // Load user data & assessment history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Resolve user ID
      let userId = null;
      let pData = null;
      if (typeof window !== "undefined") {
        try {
          const directUserId = localStorage.getItem("userId") || localStorage.getItem("patient_id");
          if (directUserId && directUserId !== "undefined" && directUserId !== "null") {
            userId = directUserId;
          }
          const rawUser = localStorage.getItem("userData") || localStorage.getItem("user");
          if (rawUser) {
            pData = JSON.parse(rawUser);
            if (!userId) {
              userId = pData.id || pData.user_id || pData.userId;
            }
          }
        } catch (e) {
          console.warn("Could not read user data:", e);
        }
      }

      setPatientData(pData);

      // If no user ID, try fallback to top user from progress API or prompt
      let url = `/api/health/assessments/graph?type=heart&limit=50`;
      if (userId) {
        url += `&user_id=${userId}`;
      } else {
        // Find top user with heart assessments
        try {
          const topRes = await fetch(`/api/v1/cardio/progress?checkpoint=7D`);
          const topJson = await topRes.json();
          if (topJson.success && topJson.data?.user?.id) {
            url += `&user_id=${topJson.data.user.id}`;
          }
        } catch (e) {
          console.warn("Could not resolve default user:", e);
        }
      }

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load assessment history");
      }

      const items = json.data?.history || [];
      setHistory(items);
      if (items.length > 0) {
        // Set initial print data to most recent
        setSelectedAssessmentForPrint(items[0].rawAssessment || items[0]);
      }
    } catch (err) {
      console.error("Error loading assessment history:", err);
      setError(err.message || "Unable to load assessment history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle PDF Download
  const handleDownloadPdf = async (item) => {
    try {
      const assessmentData = item.rawAssessment || item;
      setSelectedAssessmentForPrint(assessmentData);
      setIsDownloading(true);
      toast.loading("Preparing high-resolution clinical PDF...", { id: "download-pdf" });

      // Small delay to ensure the hidden template renders with the chosen item
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (!reportRef.current) {
        throw new Error("Report element not ready");
      }

      const serial = item.serialNo || item.serial_no || "CARDIO_REPORT";
      const filename = `MediConnect_CardioReport_${serial}.pdf`;

      await generateClientPdf(reportRef.current, filename, {
        scale: 2,
        action: "download"
      });

      toast.dismiss("download-pdf");
      toast.success("Cardio assessment report downloaded!");
    } catch (err) {
      console.error("PDF download error:", err);
      toast.dismiss("download-pdf");
      toast.error("Could not generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Print
  const handlePrint = async (item) => {
    try {
      const assessmentData = item.rawAssessment || item;
      setSelectedAssessmentForPrint(assessmentData);
      setIsPrinting(true);
      toast.loading("Preparing report for print...", { id: "print-report" });

      await new Promise((resolve) => setTimeout(resolve, 300));

      if (!reportRef.current) {
        throw new Error("Report element not ready");
      }

      await printClientReport(reportRef.current);
      toast.dismiss("print-report");
      toast.success("Print dialog opened!");
    } catch (err) {
      console.error("Print error:", err);
      toast.dismiss("print-report");
      toast.error("Could not open print dialog.");
    } finally {
      setIsPrinting(false);
    }
  };

  const getRiskBadge = (risk) => {
    const r = (risk || "low").toLowerCase();
    if (r === "high" || r === "critical") {
      return {
        label: "HIGH RISK",
        bg: "bg-rose-50 text-rose-700 border-rose-200"
      };
    }
    if (r === "moderate") {
      return {
        label: "MODERATE RISK",
        bg: "bg-amber-50 text-amber-800 border-amber-200"
      };
    }
    return {
      label: "LOW RISK",
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200"
    };
  };

  const getScoreColor = (score) => {
    const s = Number(score) || 0;
    if (s >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (s >= 60) return "text-amber-800 bg-amber-50 border-amber-200";
    return "text-rose-800 bg-rose-50 border-rose-200";
  };

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800 py-3 sm:py-6 px-2.5 sm:px-4 md:px-6 lg:px-8 font-sans pb-44 sm:pb-28"
      style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}
    >
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">

        {/* ─── Top Header Card ─── */}
        <div className="bg-white rounded-[5px] border border-slate-200 p-3 sm:p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.push("/cardio-connect")}
                className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[5px] transition-colors shrink-0 mt-0.5 cursor-pointer border border-slate-200"
                title="Back to CardioConnect"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#0067A1] bg-sky-50 px-2 py-0.5 rounded-[5px] border border-sky-200 shrink-0 whitespace-nowrap">
                    CardioConnect Records
                  </span>
                  <span className="text-slate-300 text-xs hidden sm:inline">•</span>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
                    Clinical Assessment Log
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                  Assessment History
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
                  Historical screening evaluations, cardiovascular markers, and downloadable official clinical reports.
                </p>
              </div>
            </div>

            {/* Top Action: New Assessment */}
            <div className="self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => router.push("/heart-health")}
                className="px-3.5 py-2 bg-[#0067A1] hover:bg-[#005282] text-white rounded-[5px] font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>New Assessment</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Metrics */}
          {history.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="p-2.5 bg-slate-50 rounded-[5px] border border-slate-200">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Screenings
                </span>
                <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-0.5 block">
                  {history.length}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-[5px] border border-slate-200">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Latest Score
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-lg sm:text-xl font-bold font-mono text-[#0067A1]">
                    {history[0]?.healthScore || 0}/100
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-[5px] border border-slate-200">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Latest Risk
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 capitalize mt-1 block truncate">
                  {history[0]?.riskLevel || "Low"} Risk
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-[5px] border border-slate-200">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Latest Date
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 mt-1 block truncate">
                  {new Date(history[0]?.date || Date.now()).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Error State ─── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium px-4 py-3.5 rounded-[5px] flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Unable to Load History</p>
              <p className="mt-0.5 text-xs text-red-700">{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-[5px] text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          </div>
        )}

        {/* ─── Loading State ─── */}
        {loading ? (
          <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 overflow-hidden">
            <AnimatedCardioLoader
              title="Retrieving Assessment History..."
              subtitle="Querying certified database records and clinical reports"
            />
          </div>
        ) : history.length === 0 ? (
          /* ─── Empty State ─── */
          <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-[5px] bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center mx-auto">
              <Heart className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                No Assessment Records Found
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                You haven&apos;t recorded any cardiovascular assessments yet. Complete your first screening to generate your baseline score and downloadable report.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/heart-health")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0067A1] hover:bg-[#005282] text-white rounded-[5px] text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Start First Cardio Assessment</span>
            </button>
          </div>
        ) : (
          /* ─── Assessment Records List ─── */
          <div className="space-y-3 sm:space-y-4">
            {history.map((item, idx) => {
              const riskBadge = getRiskBadge(item.riskLevel);
              const scoreColor = getScoreColor(item.healthScore);
              const inp = item.inputs || {};
              const vitals = inp.vitals || {};
              const lipids = inp.lipids || {};
              const bloodSugar = inp.bloodSugar || {};
              const demo = inp.demographics || {};
              const lifestyle = inp.lifestyle || {};

              const dateStr = new Date(item.date).toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric"
              });
              const timeStr = new Date(item.date).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div
                  key={item.id || idx}
                  className="bg-white rounded-[5px] border border-slate-200 shadow-xs hover:border-[#0067A1]/40 hover:shadow-md transition-all p-3.5 sm:p-5 flex flex-col gap-3.5"
                >
                  {/* Card Header: Serial, Date, Score, Risk */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-[5px] border border-slate-200">
                        {item.serialNo || `CCN-2026-${(item.id || "").slice(0, 8).toUpperCase()}`}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dateStr}</span>
                        <span className="text-slate-300">•</span>
                        <span>{timeStr}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-[5px] border ${scoreColor}`}>
                        Score {item.healthScore}/100
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[5px] border ${riskBadge.bg}`}>
                        {riskBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Vitals Snapshot Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-slate-50/80 rounded-[5px] border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Blood Pressure</span>
                      <span className="font-bold font-mono text-slate-900 mt-0.5 block">
                        {vitals.systolicBP && vitals.diastolicBP ? `${vitals.systolicBP}/${vitals.diastolicBP} mmHg` : "—"}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50/80 rounded-[5px] border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Heart Rate</span>
                      <span className="font-bold font-mono text-slate-900 mt-0.5 block">
                        {vitals.restingHeartRate ? `${vitals.restingHeartRate} bpm` : "—"}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50/80 rounded-[5px] border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">BMI</span>
                      <span className="font-bold font-mono text-slate-900 mt-0.5 block">
                        {demo.bmi ? `${Number(demo.bmi).toFixed(1)} kg/m²` : "—"}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50/80 rounded-[5px] border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Physical Activity</span>
                      <span className="font-bold font-mono text-slate-900 mt-0.5 block">
                        {lifestyle.physicalActivity ? `${lifestyle.physicalActivity} min/wk` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Summary / Analysis Preview */}
                  {item.aiAnalysis?.analysis && (
                    <div className="bg-slate-50/60 p-3 rounded-[5px] border border-slate-200">
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <Info className="w-3 h-3 text-[#0067A1]" />
                        <span>Clinical Summary & Observations</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {item.aiAnalysis.analysis}
                      </p>
                    </div>
                  )}

                  {/* Action Bar: View Details, Print, Download PDF */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedAssessment(item)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-[5px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Report</span>
                    </button>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => handlePrint(item)}
                        disabled={isPrinting}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-[5px] text-xs font-semibold border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        title="Print this assessment"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline">Print</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(item)}
                        disabled={isDownloading}
                        className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0067A1] rounded-[5px] text-xs font-bold border border-sky-200 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        title="Download official PDF report"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ─── Detail Modal (Full Report View) ─── */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-[5px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#0067A1] bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-[5px]">
                  {selectedAssessment.serialNo || "CARDIO REPORT"}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  Cardiovascular Screening Report
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssessment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[5px] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              {/* Score & Risk Banner */}
              <div className="p-3.5 bg-slate-50 rounded-[5px] border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Cardiovascular Health Score
                  </span>
                  <span className="text-2xl font-bold font-mono text-[#0067A1]">
                    {selectedAssessment.healthScore}/100
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Risk Category
                  </span>
                  <span className={`inline-block text-xs font-bold uppercase px-2.5 py-0.5 rounded-[5px] border mt-0.5 ${getRiskBadge(selectedAssessment.riskLevel).bg}`}>
                    {selectedAssessment.riskLevel} Risk
                  </span>
                </div>
              </div>

              {/* Summary Narrative */}
              {selectedAssessment.aiAnalysis?.analysis && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                    Clinical Summary
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-[5px] border border-slate-100">
                    {selectedAssessment.aiAnalysis.analysis}
                  </p>
                </div>
              )}

              {/* Key Findings */}
              {selectedAssessment.aiAnalysis?.key_findings?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                    Key Observations
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {selectedAssessment.aiAnalysis.key_findings.map((finding, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detailed Metrics Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  Recorded Clinical Parameters
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-[5px] border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block">Blood Pressure</span>
                    <span className="font-bold font-mono text-slate-800">
                      {selectedAssessment.inputs?.vitals?.systolicBP
                        ? `${selectedAssessment.inputs.vitals.systolicBP}/${selectedAssessment.inputs.vitals.diastolicBP} mmHg`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-[5px] border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block">Resting Heart Rate</span>
                    <span className="font-bold font-mono text-slate-800">
                      {selectedAssessment.inputs?.vitals?.restingHeartRate
                        ? `${selectedAssessment.inputs.vitals.restingHeartRate} bpm`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-[5px] border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block">BMI</span>
                    <span className="font-bold font-mono text-slate-800">
                      {selectedAssessment.inputs?.demographics?.bmi
                        ? `${Number(selectedAssessment.inputs.demographics.bmi).toFixed(1)} kg/m²`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-[5px] border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block">Total Cholesterol</span>
                    <span className="font-bold font-mono text-slate-800">
                      {selectedAssessment.inputs?.lipids?.totalCholesterol
                        ? `${selectedAssessment.inputs.lipids.totalCholesterol} mg/dL`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-[5px] border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block">LDL Cholesterol</span>
                    <span className="font-bold font-mono text-slate-800">
                      {selectedAssessment.inputs?.lipids?.ldlCholesterol
                        ? `${selectedAssessment.inputs.lipids.ldlCholesterol} mg/dL`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-[5px] border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block">Fasting Glucose</span>
                    <span className="font-bold font-mono text-slate-800">
                      {selectedAssessment.inputs?.bloodSugar?.fastingGlucose
                        ? `${selectedAssessment.inputs.bloodSugar.fastingGlucose} mg/dL`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-[5px] border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block">HbA1c</span>
                    <span className="font-bold font-mono text-slate-800">
                      {selectedAssessment.inputs?.bloodSugar?.hba1c
                        ? `${Number(selectedAssessment.inputs.bloodSugar.hba1c).toFixed(1)} %`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-[5px] border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block">Physical Activity</span>
                    <span className="font-bold font-mono text-slate-800">
                      {selectedAssessment.inputs?.lifestyle?.physicalActivity
                        ? `${selectedAssessment.inputs.lifestyle.physicalActivity} min/wk`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-[5px] border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block">Smoking Status</span>
                    <span className="font-bold capitalize text-slate-800">
                      {selectedAssessment.inputs?.lifestyle?.smokingStatus || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {selectedAssessment.recommendations?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Personalized Guidance
                  </h4>
                  <div className="space-y-2">
                    {selectedAssessment.recommendations.map((rec, rIdx) => (
                      <div key={rIdx} className="p-3 bg-sky-50/50 rounded-[5px] border border-sky-100">
                        <span className="text-xs font-bold text-slate-900 block">{rec.title}</span>
                        <p className="text-[11px] text-slate-600 mt-0.5">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedAssessment(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint(selectedAssessment)}
                  disabled={isPrinting}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-[5px] text-xs font-bold border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedAssessment)}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-[#0067A1] hover:bg-[#005282] text-white rounded-[5px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hidden Printable Template for Canvas/PDF Generation ─── */}
      {selectedAssessmentForPrint && (
        <AssessmentPrintReport
          assessmentType="heart"
          assessmentData={selectedAssessmentForPrint}
          patientData={patientData || {}}
          reportRef={reportRef}
        />
      )}

    </div>
  );
}
