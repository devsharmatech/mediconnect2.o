"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import {
  ChevronLeft,
  Activity,
  Wind,
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Stethoscope,
  Sparkles,
  ArrowRight,
  Filter,
  BarChart2,
  Flame,
  Info,
  Printer,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import LungSnapshotModal from "@/components/public-site/health/LungSnapshotModal";
import AssessmentPrintReport from "@/components/public-site/health/AssessmentPrintReport";
import LungConnectV99Report from "@/components/public-site/health/reports/LungConnectV99Report";
import LungConnectFullReport from "@/components/public-site/health/reports/LungConnectFullReport";
import { generateClientPdf, printClientReport } from "@/lib/clientPdfGenerator";
import { AnimatedRespiratoryLoader } from "@/components/public-site/health/animations";

const TIMEFRAMES = [
  { id: "7d", label: "7 Days" },
  { id: "1m", label: "1 Month" },
  { id: "3months", label: "3 Months" },
  { id: "year", label: "1 Year" },
  { id: "all", label: "All Time" }
];

const METRICS = [
  { id: "score", label: "Health Score", unit: "/100", icon: Activity },
  { id: "breathHold", label: "Breath-Holding", unit: "sec", icon: Clock },
  { id: "peakFlow", label: "Peak Flow (PEFR)", unit: "L/min", icon: Wind },
  { id: "aqi", label: "Ambient AQI", unit: "AQI", icon: Flame }
];

export default function LungHealthStatisticsPage() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState("year");
  const [selectedMetric, setSelectedMetric] = useState("score");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [breathingStats, setBreathingStats] = useState({ totalSessions: 0, totalMinutes: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  // Modal and print report states
  const [selectedAssessmentForModal, setSelectedAssessmentForModal] = useState(null);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [selectedReportForViewer, setSelectedReportForViewer] = useState(null);
  const [selectedLungFormat, setSelectedLungFormat] = useState("lung-v9.9");
  const [selectedAssessmentForPrint, setSelectedAssessmentForPrint] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    let resolvedId = null;
    let resolvedName = "Patient";
    let extraUser = {};

    if (typeof window !== "undefined") {
      try {
        const directId = localStorage.getItem("userId") || localStorage.getItem("patient_id");
        if (directId && directId !== "undefined" && directId !== "null" && directId !== "guest") {
          resolvedId = directId;
        }

        const raw = localStorage.getItem("user") || localStorage.getItem("userData");
        if (raw) {
          const parsed = JSON.parse(raw);
          extraUser = parsed;
          resolvedId = resolvedId || parsed.id || parsed.user_id || parsed.user?.id;
          resolvedName = parsed.name || parsed.full_name || parsed.details?.full_name || resolvedName;
        }
      } catch (e) {
        console.warn("Could not read user data:", e);
      }
    }

    setUser({
      id: resolvedId || "guest",
      name: resolvedName,
      ...extraUser,
    });
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        const targetUserId = user?.id && user.id !== "guest" ? user.id : "";

        // 1. Fetch graph data & history
        const graphUrl = targetUserId
          ? `/api/health/assessments/graph?user_id=${targetUserId}&type=lung&timeframe=${timeframe}&limit=100`
          : `/api/health/assessments/graph?type=lung&timeframe=${timeframe}&limit=100`;

        const graphRes = await fetch(graphUrl);
        const graphJson = await graphRes.json();
        if (graphRes.ok && graphJson.success && graphJson.data) {
          setGraphData(graphJson.data.graphData || null);
          setSummary(graphJson.data.summary || null);
          setHistory((graphJson.data.history || []).filter((h) => h.type === "lung"));
        }

        // 2. Fetch breathing wellness sessions
        try {
          const breathUrl = targetUserId
            ? `/api/health/breathing?user_id=${targetUserId}&limit=50`
            : `/api/health/breathing?limit=50`;
          const breathRes = await fetch(breathUrl);
          const breathJson = await breathRes.json();
          let sessions = 0;
          let minutes = 0;
          if (breathJson.success && breathJson.data?.stats) {
            sessions = breathJson.data.stats.total_sessions ?? breathJson.data.stats.totalSessions ?? 0;
            minutes = breathJson.data.stats.total_duration_minutes ?? breathJson.data.stats.totalMinutes ?? 0;
          }

          // Also check lung_activity_sessions breathing stats via lung progress API
          if (sessions === 0) {
            try {
              const progUrl = targetUserId ? `/api/v1/lung/progress?user_id=${targetUserId}` : `/api/v1/lung/progress`;
              const progRes = await fetch(progUrl);
              const progJson = await progRes.json();
              if (progJson.success && progJson.data?.stats) {
                sessions = progJson.data.stats.total_breathing_sessions_30d || sessions;
              }
            } catch (_) {}
          }

          setBreathingStats({ totalSessions: sessions, totalMinutes: minutes });
        } catch (bErr) {
          console.warn("Breathing stats error", bErr);
        }
      } catch (err) {
        console.error("Lung statistics error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user, timeframe]);

  // Extract raw trend points
  const rawTrend = graphData?.healthScoreTrend?.filter((p) => p.type === "lung") || [];

  // Match detailed inputs to trend points
  const enrichedTrend = useMemo(() => {
    return rawTrend.map((point) => {
      const historyMatch = history.find((h) => h.id === point.assessmentId);
      const lungInputs = historyMatch?.inputs?.respiratoryTests || {};
      const envInputs = historyMatch?.inputs?.environment || {};
      const serialNo = historyMatch?.serialNo || (point.assessmentId
        ? `LCN-${new Date(point.date).getFullYear()}-${point.assessmentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
        : "LCN-REC");

      return {
        ...point,
        serialNo,
        breathHold: lungInputs.breathHoldingTime || 35,
        peakFlow: lungInputs.peakFlow || 450,
        aqi: envInputs.aqi || 60,
        breathsPerMinute: lungInputs.breathsPerMinute || 16,
        historyRecord: historyMatch
      };
    });
  }, [rawTrend, history]);

  // Derived aggregates
  const totalAssessments = summary?.lung?.total || enrichedTrend.length;
  const latestScore = summary?.lung?.latestScore ?? (enrichedTrend[enrichedTrend.length - 1]?.score || 75);
  const averageScore = summary?.lung?.averageScore ?? (
    enrichedTrend.length > 0
      ? Math.round(enrichedTrend.reduce((acc, p) => acc + (p.score || 0), 0) / enrichedTrend.length)
      : 75
  );

  // Delta calculation (Strictly Sheet 03 / LC-11: "Recorded Change")
  const hasMultipleTests = enrichedTrend.length >= 2;
  const firstScore = enrichedTrend[0]?.score ?? latestScore;
  const recordedChange = latestScore - firstScore;

  // Average vitals across records
  const avgBreathHold = enrichedTrend.length > 0
    ? Math.round(enrichedTrend.reduce((acc, p) => acc + (p.breathHold || 35), 0) / enrichedTrend.length)
    : 35;
  const avgPeakFlow = enrichedTrend.length > 0
    ? Math.round(enrichedTrend.reduce((acc, p) => acc + (p.peakFlow || 450), 0) / enrichedTrend.length)
    : 450;
  const avgAQI = enrichedTrend.length > 0
    ? Math.round(enrichedTrend.reduce((acc, p) => acc + (p.aqi || 60), 0) / enrichedTrend.length)
    : 60;

  // Helper to build complete assessment object for modals and prints
  const buildAssessmentObject = (record) => {
    if (record.rawAssessment?.lung_health_inputs?.length > 0) {
      return record.rawAssessment;
    }
    return {
      id: record.id,
      health_score: record.healthScore || record.score,
      risk_level: record.riskLevel,
      created_at: record.date || record.created_at,
      serial_no: record.serialNo,
      ai_analysis: record.aiAnalysis,
      recommendations: record.recommendations,
      lung_health_inputs: [
        {
          age: record.inputs?.demographics?.age || 35,
          gender: record.inputs?.demographics?.gender || "Not specified",
          height_cm: record.inputs?.demographics?.height || 170,
          weight_kg: record.inputs?.demographics?.weight || 68,
          bmi: record.inputs?.demographics?.bmi,
          smoking_status: record.inputs?.lifestyle?.smokingStatus || "Never",
          smoking_pack_years: record.inputs?.lifestyle?.smokingPackYears || 0,
          occupational_exposure: record.inputs?.lifestyle?.occupationalRisk || "none",
          breath_holding_time: record.inputs?.respiratoryTests?.breathHoldingTime || record.breathHold || 35,
          peak_flow: record.inputs?.respiratoryTests?.peakFlow || record.peakFlow || 450,
          breaths_per_minute: record.inputs?.respiratoryTests?.breathsPerMinute || record.breathsPerMinute || 16,
          aqi: record.inputs?.environment?.aqi || record.aqi || 60,
          location: record.inputs?.environment?.location || "Delhi, India",
          cough_frequency: record.inputs?.symptoms?.coughFrequency || "None",
          breathlessness: record.inputs?.symptoms?.breathlessness || "None",
          wheezing: record.inputs?.symptoms?.wheezing || false
        }
      ]
    };
  };

  // Open Snapshot modal for a record
  const handleOpenSnapshot = (record) => {
    const raw = buildAssessmentObject(record);
    setSelectedAssessmentForModal(raw);
    setIsSnapshotOpen(true);
  };

  // Open Full Multi-Format Report Viewer
  const handleOpenReportViewer = (record, format = "lung-v9.9") => {
    const raw = buildAssessmentObject(record);
    setSelectedReportForViewer(raw);
    setSelectedLungFormat(format);
    setSelectedAssessmentForPrint(raw);
  };

  // Trigger Client-Side PDF Download with professional formatting
  const handleDownloadReport = async (record, format = selectedLungFormat) => {
    try {
      const raw = buildAssessmentObject(record);
      setSelectedAssessmentForPrint(raw);
      setSelectedLungFormat(format);
      setIsDownloading(true);
      toast.loading(`Preparing ${format === "lung-full" ? "Full Clinical" : "V9.9 Wellness"} PDF...`, { id: "stats-pdf" });

      await new Promise((resolve) => setTimeout(resolve, 350));

      if (!reportRef.current) throw new Error("Report element not found");

      const serial = record.serialNo || record.id || "LCN_REPORT";
      const filename = `MediConnect_Lung_${format === "lung-full" ? "Full" : "V9.9"}_${serial.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      await generateClientPdf(reportRef.current, filename, { scale: 2, action: "download" });
      toast.success("PDF Report downloaded successfully!", { id: "stats-pdf" });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF report", { id: "stats-pdf" });
    } finally {
      setIsDownloading(false);
    }
  };

  // Direct Print handler (with official MediConnect Logo & Watermark)
  const handlePrintReport = async (record, format = selectedLungFormat) => {
    try {
      const raw = buildAssessmentObject(record);
      setSelectedAssessmentForPrint(raw);
      setSelectedLungFormat(format);
      setIsPrinting(true);
      toast.loading("Opening print layout...", { id: "stats-print" });

      await new Promise((resolve) => setTimeout(resolve, 350));

      if (!reportRef.current) throw new Error("Report element not found");

      await printClientReport(reportRef.current);
      toast.success("Print dialog opened!", { id: "stats-print" });
    } catch (err) {
      console.error("Print layout failed:", err);
      toast.error("Failed to open print layout", { id: "stats-print" });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 py-5 sm:py-8 px-3 sm:px-6 lg:px-8 font-sans">
      {/* Main Container */}
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header Card */}
        <div className="bg-white rounded-[5px] border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/assessments")}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[5px] transition-colors shrink-0 mt-0.5 cursor-pointer"
              title="Back to Assessments"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0067A1] bg-sky-50 px-2 py-0.5 rounded-[5px] border border-sky-200/80">
                  Longitudinal Analytics
                </span>
                <span className="text-slate-400 text-xs">·</span>
                <span className="text-xs text-slate-500">LungConnect V1.8</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                <Wind className="w-5 h-5 text-[#0067A1]" />
                Lung Health Statistics
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed trends and physiological metrics across your completed lung assessments
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
            {/* Timeframe Filter Tabs */}
            <div className="inline-flex rounded-[5px] bg-slate-100 p-1 border border-slate-200 shadow-2xs">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeframe(t.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[5px] transition-all cursor-pointer ${
                    timeframe === t.id
                      ? "bg-white text-[#0067A1] shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Link
              href="/lung-assessment"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0067A1] hover:bg-[#005584] text-white rounded-[5px] text-xs font-semibold shadow-xs transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              New Assessment
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-[5px] flex items-start gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to load statistics</p>
              <p className="text-[11px] mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-[5px] border border-slate-200 shadow-xs overflow-hidden">
            <AnimatedRespiratoryLoader
              title="Loading physiological statistics..."
              subtitle="Aggregating historical lung capacity & respiratory analytics"
            />
          </div>
        ) : enrichedTrend.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-[5px] border border-slate-200 p-10 text-center shadow-xs space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center mx-auto text-[#0067A1]">
              <Wind className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">No Assessment Records Found</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Take your initial self-reported lung health assessment to unlock longitudinal trends, breath-holding analytics, and air quality exposure tracking.
              </p>
            </div>
            <Link
              href="/lung-assessment"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0067A1] hover:bg-[#005584] text-white rounded-[5px] text-xs font-semibold shadow-xs transition-colors"
            >
              <Activity className="w-4 h-4" />
              Start Assessment
            </Link>
          </div>
        ) : (
          <>
            {/* 4 Executive KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* 1. Total Assessments */}
              <div className="bg-white rounded-[5px] p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total Assessments
                  </p>
                  <p className="text-2xl font-bold text-slate-900 font-mono mt-1">
                    {totalAssessments}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Recorded in time window
                  </p>
                </div>
                <div className="w-10 h-10 rounded-[5px] bg-sky-50 flex items-center justify-center text-[#0067A1]">
                  <FileText className="w-5 h-5" />
                </div>
              </div>

              {/* 2. Latest Score */}
              <div className="bg-white rounded-[5px] p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Latest Score
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-[#0067A1] font-mono">
                      {latestScore}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                  <div className="mt-1">
                    <span className={`inline-block px-1.5 py-0.2 rounded-[5px] text-[10px] font-semibold uppercase tracking-wider border ${
                      latestScore >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      latestScore >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {latestScore >= 80 ? "Optimal Status" : latestScore >= 60 ? "Moderate Status" : "Priority Care"}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-[5px] bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Activity className="w-5 h-5" />
                </div>
              </div>

              {/* 3. Average Score */}
              <div className="bg-white rounded-[5px] p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Average Score
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-slate-900 font-mono">
                      {averageScore}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Across {totalAssessments} records
                  </p>
                </div>
                <div className="w-10 h-10 rounded-[5px] bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <BarChart2 className="w-5 h-5" />
                </div>
              </div>

              {/* 4. Recorded Change (Strictly Sheet 03 / LC-11 non-diagnostic rule) */}
              <div className="bg-white rounded-[5px] p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Recorded Change
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    {hasMultipleTests ? (
                      <span className="text-2xl font-bold text-slate-900 font-mono">
                        {recordedChange > 0 ? `+${recordedChange}` : recordedChange}
                      </span>
                    ) : (
                      <span className="text-base font-bold text-slate-500">
                        Baseline
                      </span>
                    )}
                    {hasMultipleTests && <span className="text-xs text-slate-400">pts</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {hasMultipleTests ? "Between first & latest test" : "First test recorded"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-[5px] bg-amber-50 flex items-center justify-center text-amber-600">
                  {hasMultipleTests && recordedChange > 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  ) : hasMultipleTests && recordedChange < 0 ? (
                    <TrendingDown className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Minus className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Main Interactive Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Left Column (2/3 width): Interactive Trend Curve */}
              <div className="lg:col-span-2 bg-white rounded-[5px] p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  {/* Metric Switcher Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#0067A1]" />
                        Recorded Assessment Trend
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Longitudinal movement across verified assessments
                      </p>
                    </div>

                    {/* Metric Selectors */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {METRICS.map((m) => {
                        const Icon = m.icon;
                        const isSelected = selectedMetric === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMetric(m.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-[11px] font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#0067A1] text-white shadow-2xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Professional Recharts Area Chart */}
                  {(() => {
                    // Determine metric config
                    const metricConfig = {
                      score: { dataKey: "score", domain: [0, 100], ticks: [0, 25, 50, 75, 100], unit: "/100", label: "Health Score" },
                      breathHold: { dataKey: "breathHold", domain: [0, 60], ticks: [0, 15, 30, 45, 60], unit: " sec", label: "Breath-Hold" },
                      peakFlow: { dataKey: "peakFlow", domain: [200, 700], ticks: [200, 350, 500, 650], unit: " L/min", label: "Peak Flow" },
                      aqi: { dataKey: "aqi", domain: [0, 300], ticks: [0, 50, 100, 200, 300], unit: " AQI", label: "Ambient AQI" },
                    };
                    const cfg = metricConfig[selectedMetric] || metricConfig.score;

                    // Prepare sanitized chart data
                    const rechartsData = (enrichedTrend || [])
                      .map((p, idx) => {
                        const rawVal = Number(p?.[cfg.dataKey]);
                        const currentVal = (!isNaN(rawVal) && isFinite(rawVal)) ? rawVal : 0;
                        const d = p?.date ? new Date(p.date) : null;
                        const dateLabel = d && !isNaN(d.getTime())
                          ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : `Record ${idx + 1}`;

                        return {
                          ...p,
                          dateLabel,
                          currentVal,
                        };
                      })
                      .filter((p) => typeof p.currentVal === "number" && !isNaN(p.currentVal));

                    // Compute average for reference line
                    const avgVal = rechartsData.length > 0
                      ? Math.round(rechartsData.reduce((acc, p) => acc + p.currentVal, 0) / rechartsData.length)
                      : 0;

                    // Custom tooltip renderer
                    const CustomTooltip = ({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-[5px] p-3 shadow-xl text-xs" style={{ minWidth: 180 }}>
                          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 mb-1.5 border-b border-slate-700 pb-1.5">
                            <span className="font-mono">{data.serialNo}</span>
                            <span>{new Date(data.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                            <div><span className="text-slate-400">Score: </span><span className="font-bold text-white font-mono">{data.score}/100</span></div>
                            <div><span className="text-slate-400">Breath-Hold: </span><span className="font-bold text-white font-mono">{data.breathHold}s</span></div>
                            <div><span className="text-slate-400">Peak Flow: </span><span className="font-bold text-white font-mono">{data.peakFlow} L/m</span></div>
                            <div><span className="text-slate-400">AQI: </span><span className="font-bold text-white font-mono">{data.aqi}</span></div>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="w-full mt-2" style={{ height: 280 }}>
                        {!isMounted ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-[6px] border border-dashed border-slate-200">
                            <div className="w-5 h-5 border-2 border-slate-300 border-t-[#0067A1] rounded-full animate-spin" />
                          </div>
                        ) : rechartsData.length === 1 ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/70 border border-slate-200/80 rounded-[6px] p-6 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <span className="w-3 h-3 rounded-full bg-[#0067A1]" />
                              <span className="text-sm font-bold text-slate-800">{cfg.label} Baseline:</span>
                              <span className="text-lg font-black text-[#0067A1] font-mono">
                                {rechartsData[0].currentVal}{cfg.unit}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
                              Recorded on {rechartsData[0].dateLabel} ({rechartsData[0].serialNo}). Complete additional lung wellness tests to activate your multi-point longitudinal area chart.
                            </p>
                            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Baseline 1 of 1 Verified in Authoritative Database</span>
                            </div>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={rechartsData}
                              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                            >
                              <defs>
                                <linearGradient id="lungMetricGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0067A1" stopOpacity={0.15} />
                                  <stop offset="95%" stopColor="#0067A1" stopOpacity={0.01} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis
                                dataKey="dateLabel"
                                tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
                                tickLine={false}
                                axisLine={{ stroke: "#e2e8f0" }}
                                dy={8}
                              />
                              <YAxis
                                domain={cfg.domain}
                                ticks={cfg.ticks}
                                tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "monospace" }}
                                tickLine={false}
                                axisLine={false}
                                width={40}
                              />
                              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#0067A1", strokeWidth: 1, strokeDasharray: "4 4" }} />
                              <ReferenceLine
                                y={avgVal}
                                stroke="#94a3b8"
                                strokeDasharray="6 4"
                                strokeWidth={1}
                                label={{ value: `Avg: ${avgVal}`, position: "right", fontSize: 10, fill: "#94a3b8" }}
                              />
                              <Area
                                type="monotone"
                                dataKey="currentVal"
                                stroke="#0067A1"
                                strokeWidth={2.5}
                                fill="url(#lungMetricGradient)"
                                dot={{ r: 4, fill: "#ffffff", stroke: "#0067A1", strokeWidth: 2, cursor: "pointer" }}
                                activeDot={{
                                  r: 7,
                                  fill: "#0067A1",
                                  stroke: "#ffffff",
                                  strokeWidth: 2,
                                  cursor: "pointer",
                                  onClick: (_, payload) => {
                                    if (payload?.payload) handleOpenSnapshot(payload.payload);
                                  }
                                }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Bottom Timeline Summary */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-4 text-[11px]">
                    <span>First: <strong className="text-slate-900 font-mono">{firstScore}/100</strong></span>
                    <span>·</span>
                    <span>
                      Change:{" "}
                      <strong className={`font-mono ${recordedChange > 0 ? "text-emerald-600" : recordedChange < 0 ? "text-amber-600" : "text-slate-700"}`}>
                        {hasMultipleTests ? (recordedChange > 0 ? `+${recordedChange}` : recordedChange) : "0"} pts
                      </strong>
                    </span>
                    <span>·</span>
                    <span>Latest: <strong className="text-[#0067A1] font-mono">{latestScore}/100</strong></span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Click any point to view snapshot
                  </span>
                </div>

                {/* Sheet 03 / LC-11 Mandatory Policy Notice */}
                <div className="mt-3 p-2.5 bg-slate-50 rounded-[5px] border border-slate-200 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Clinical Notice:</strong> Recorded movement does not by itself establish clinical improvement. Discuss persistent respiratory concerns with a qualified physician.
                  </span>
                </div>
              </div>

              {/* Right Column (1/3 width): Risk Breakdown & Respiratory Benchmarks */}
              <div className="space-y-4 flex flex-col justify-between">
                
                {/* 1. Category Distribution (LC-11) */}
                <div className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-[#0067A1]" />
                      Status Breakdown
                    </h3>
                    <span className="text-[10px] text-slate-400">Product Categories</span>
                  </div>

                  <div className="space-y-3">
                    {[
                      { level: "Optimal", key: "low", color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
                      { level: "Moderate", key: "moderate", color: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50" },
                      { level: "Priority Care", key: "high", color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
                      { level: "Urgent Care", key: "critical", color: "bg-red-600", text: "text-red-700", bg: "bg-red-50" }
                    ].map((item) => {
                      const dist = (graphData?.riskLevelDistribution || []).find(
                        (d) => d.level?.toLowerCase() === item.key || d.level?.toLowerCase() === item.level.toLowerCase()
                      );
                      const count = dist?.count || 0;
                      const pct = totalAssessments > 0 ? Math.round((count / totalAssessments) * 100) : 0;

                      return (
                        <div key={item.level} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{item.level}</span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {count} <span className="text-slate-400">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Key Respiratory Benchmark Averages */}
                <div className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Wind className="w-4 h-4 text-[#0067A1]" />
                      Physiological Averages
                    </h3>
                    <span className="text-[10px] text-slate-400">Aggregated</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-2.5 rounded-[5px] bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Avg Breath-Hold</span>
                        <span className="font-bold text-slate-900 font-mono text-sm">{avgBreathHold} sec</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-semibold border ${
                        avgBreathHold >= 30 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {avgBreathHold >= 30 ? "Optimal (≥30s)" : "Below Ref (<30s)"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-[5px] bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Avg Peak Flow</span>
                        <span className="font-bold text-slate-900 font-mono text-sm">{avgPeakFlow} L/min</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-semibold bg-sky-50 text-[#0067A1] border border-sky-200">
                        Ref: 400–600
                      </span>
                    </div>

                    <div className="p-2.5 rounded-[5px] bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Avg AQI Exposure</span>
                        <span className="font-bold text-slate-900 font-mono text-sm">{avgAQI} AQI</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-semibold border ${
                        avgAQI <= 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {avgAQI <= 100 ? "Moderate/Good" : "Elevated"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Breathing Wellness Practice (LC-14) */}
                <div className="bg-gradient-to-br from-[#0067A1] to-[#005584] text-white rounded-[5px] p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">
                      Breathing Consistency
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-sky-200" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono">{breathingStats.totalSessions}</span>
                    <span className="text-xs text-sky-200">completed sessions</span>
                  </div>
                  <p className="text-[11px] text-sky-100 mt-1">
                    {breathingStats.totalMinutes} total minutes practiced
                  </p>
                  <Link
                    href="/lung-connect?action=breathing"
                    className="mt-3 block w-full py-1.5 px-3 bg-white text-[#0067A1] hover:bg-sky-50 rounded-[5px] text-xs font-semibold text-center transition-colors shadow-2xs"
                  >
                    Start Breathing Exercise
                  </Link>
                </div>
              </div>
            </div>

            {/* Historical Assessment Log (LC-12 / Sheet 03) */}
            <div className="bg-white rounded-[5px] border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0067A1]" />
                    Recent Lung Assessments
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Audit trail with non-diagnostic Recorded Assessment Summaries
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  Showing {history.length} completed records
                </span>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-[11px] uppercase tracking-wide">
                      <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                      <th className="py-2.5 px-3 font-semibold">Serial No</th>
                      <th className="py-2.5 px-3 font-semibold">Score</th>
                      <th className="py-2.5 px-3 font-semibold">Status Category</th>
                      <th className="py-2.5 px-3 font-semibold">Vitals Recorded</th>
                      <th className="py-2.5 px-3 font-semibold">Recorded Assessment Summary</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((record) => {
                      const dt = new Date(record.date);
                      const formattedDate = dt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      });
                      const formattedTime = dt.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      const scoreVal = record.healthScore ?? 75;
                      const riskStr = String(record.riskLevel || "moderate").toLowerCase();

                      const riskClasses = {
                        low: "bg-emerald-50 text-emerald-700 border-emerald-200",
                        moderate: "bg-amber-50 text-amber-700 border-amber-200",
                        high: "bg-rose-50 text-rose-700 border-rose-200",
                        critical: "bg-red-50 text-red-700 border-red-200"
                      };

                      // Clean non-diagnostic summary
                      let summaryText = "";
                      if (typeof record.aiAnalysis === "string") {
                        summaryText = record.aiAnalysis;
                      } else if (record.aiAnalysis && typeof record.aiAnalysis === "object") {
                        summaryText = record.aiAnalysis.analysis || "";
                      }

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Date */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 block">{formattedDate}</span>
                            <span className="text-[10px] text-slate-400">{formattedTime}</span>
                          </td>

                          {/* Serial No */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-[5px] border border-slate-200">
                              #{record.serialNo}
                            </span>
                          </td>

                          {/* Score */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-base font-bold text-slate-900 font-mono">
                              {scoreVal}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-0.5">/100</span>
                          </td>

                          {/* Status Category */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-semibold uppercase tracking-wider border ${riskClasses[riskStr] || riskClasses.moderate}`}>
                              {riskStr === "low" ? "Optimal" : riskStr === "high" ? "Priority Care" : riskStr === "critical" ? "Urgent Care" : "Moderate"}
                            </span>
                          </td>

                          {/* Vitals */}
                          <td className="py-3 px-3 text-[11px] text-slate-600 whitespace-nowrap">
                            <div>Hold: <strong className="font-mono">{record.inputs?.respiratoryTests?.breathHoldingTime || 35}s</strong></div>
                            <div className="text-slate-400">Peak: <span className="font-mono">{record.inputs?.respiratoryTests?.peakFlow || 450} L/m</span></div>
                          </td>

                          {/* Recorded Summary */}
                          <td className="py-3 px-3 max-w-xs">
                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                              {summaryText || "Assessment summary based on recorded breath holding duration and lifestyle entries."}
                            </p>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenReportViewer(record, "lung-v9.9")}
                                className="px-2.5 py-1.5 bg-[#0b3b60] hover:bg-[#07243c] text-white rounded-[5px] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Open Full Clinical Report Viewer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View Report</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenSnapshot(record)}
                                className="px-2 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0067A1] border border-sky-200 rounded-[5px] text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Open Quick Snapshot (LC-10)"
                              >
                                <Eye className="w-3.5 h-3.5 inline mr-0.5" />
                                <span>Snapshot</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadReport(record, "lung-v9.9")}
                                disabled={isDownloading}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-[5px] text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Download V9.9 Wellness Summary PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePrintReport(record, "lung-v9.9")}
                                disabled={isPrinting}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-[5px] text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Print Report"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>

      {/* ─── Detail Modal (Full Multi-Format Report Viewer Workbench) ─── */}
      {selectedReportForViewer && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl max-h-[96vh] rounded-[6px] shadow-2xl flex flex-col overflow-hidden text-slate-900 border border-slate-700/50 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono font-bold uppercase text-[#007a8c] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-[4px]">
                  {selectedReportForViewer.serial_no || selectedReportForViewer.serialNo || "LUNG REPORT"}
                </span>
                <span className="text-xs font-bold text-slate-300">•</span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  LungConnect Authoritative Clinical Report
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportForViewer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[5px] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Format Selection Tab Bar */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider shrink-0 mr-1">
                Official Format:
              </span>
              {[
                { id: "lung-v9.9", label: "V9.9 • Wellness Summary", badge: "Frozen 1-Page A4 Fixed" },
                { id: "lung-full", label: "Full • Clinical Assessment", badge: "Comprehensive Matrix" }
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => {
                    setSelectedLungFormat(fmt.id);
                    setSelectedAssessmentForPrint(selectedReportForViewer);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedLungFormat === fmt.id
                      ? "bg-[#007a8c] text-white shadow-sm ring-1 ring-slate-900"
                      : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  <span>{fmt.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-normal ${selectedLungFormat === fmt.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {fmt.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Modal Body: Sleek dark inspection workbench with centered A4 document */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900/90 flex justify-center items-start">
              <div className="bg-white shadow-2xl ring-1 ring-black/20 overflow-x-auto max-w-full rounded-[2px]">
                {selectedLungFormat === "lung-v9.9" && <LungConnectV99Report assessmentData={selectedReportForViewer} patientData={user || {}} />}
                {selectedLungFormat === "lung-full" && <LungConnectFullReport assessmentData={selectedReportForViewer} patientData={user || {}} />}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedReportForViewer(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReport(selectedReportForViewer, selectedLungFormat)}
                  disabled={isPrinting}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-[5px] text-xs font-bold border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-[#007a8c]" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReport(selectedReportForViewer, selectedLungFormat)}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-[#007a8c] hover:bg-[#005e6c] text-white rounded-[5px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {selectedLungFormat === "lung-full" ? "Full Clinical" : "V9.9"} PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LC-10: Full Lung Report Snapshot Modal */}
      {selectedAssessmentForModal && (
        <LungSnapshotModal
          isOpen={isSnapshotOpen}
          onClose={() => {
            setIsSnapshotOpen(false);
            setSelectedAssessmentForModal(null);
          }}
          assessmentData={selectedAssessmentForModal}
          trendPoints={enrichedTrend}
          patientData={user || {}}
        />
      )}

      {/* ─── Hidden Printable Template for Canvas/PDF Generation ─── */}
      <AssessmentPrintReport
        assessmentType="lung"
        formatType={selectedLungFormat}
        assessmentData={selectedAssessmentForPrint || (selectedReportForViewer || (history[0] ? buildAssessmentObject(history[0]) : {}))}
        patientData={user || {}}
        reportRef={reportRef}
      />
    </div>
  );
}

