"use client";

import React, { useEffect, useState } from "react";
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
  TrendingUp,
  Heart,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Calendar,
  Clock,
  FileText,
  ShieldAlert,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

const TIMEFRAMES = [
  { id: "3months", label: "Last 3 months" },
  { id: "year", label: "Last year" },
  { id: "all", label: "All time" }
];

export default function HeartHealthStatisticsPage() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState("year");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const userData = typeof window !== "undefined" ? localStorage.getItem("userData") : null;
    if (!userData) {
      setError("Please login to view your heart statistics.");
      setLoading(false);
      return;
    }

    const user = JSON.parse(userData);

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/health/assessments/graph?user_id=${user.id || user.user_id}&type=heart&timeframe=${timeframe}&limit=100`
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load heart statistics.");
        }
        setGraphData(data.data.graphData || null);
        setSummary(data.data.summary || null);
        setHistory((data.data.history || []).filter((h) => h.type === "heart"));
      } catch (err) {
        console.error("Heart statistics error", err);
        setError("Unable to load heart statistics right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeframe]);

  const trend = graphData?.healthScoreTrend?.filter((p) => p.type === "heart") || [];

  const scores = trend.map((p) => p.score);

  const chartData = trend.map((point, index) => ({
    id: point.assessmentId || index,
    score: point.score,
    dateLabel: new Date(point.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  const totalAssessments = summary?.heart?.total || trend.length;
  const latestScore = summary?.heart?.latestScore || (trend.length ? trend[trend.length - 1].score : "-");
  const avgScore = summary?.heart?.averageScore || (scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : "-");
  const recordedChange = trend.length >= 2 ? (summary?.heart?.improvement ?? (trend[trend.length - 1].score - trend[0].score)) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-6 px-4 sm:px-6 lg:px-8 font-sans" style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ─── Top Header Card (No Gradient, Strict rounded-[5px]) ─── */}
        <div className="bg-white rounded-[5px] border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.push("/cardio-connect")}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[5px] transition-colors shrink-0 mt-0.5 cursor-pointer border border-slate-200"
              title="Back to CardioConnect"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0067A1] bg-sky-50 px-2 py-0.5 rounded-[5px] border border-sky-200">
                  Cardiovascular Trends
                </span>
                <span className="text-slate-400 text-xs">·</span>
                <span className="text-xs font-semibold text-slate-600">CardioConnect Analytics</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#0067A1]" />
                Heart Health Statistics
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Detailed physiological scores and risk trajectory across your recorded heart assessments
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
            {/* Timeframe Filter Tabs */}
            <div className="inline-flex rounded-[5px] bg-slate-100 p-1 border border-slate-200">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeframe(t.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[5px] transition-all cursor-pointer ${
                    timeframe === t.id
                      ? "bg-white text-[#0067A1] shadow-sm font-bold"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Link
              href="/cardio-connect"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0067A1] hover:bg-[#005584] text-white rounded-[5px] text-xs font-semibold shadow-sm transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              Cardio Hub
            </Link>
          </div>
        </div>

        {/* ─── Error Alert ─── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium px-4 py-3 rounded-[5px] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Unable to load statistics</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ─── Loading State ─── */}
        {loading ? (
          <div className="bg-white rounded-[5px] border border-slate-200 p-12 text-center shadow-sm space-y-3">
            <div className="w-8 h-8 border-2 border-[#0067A1] border-t-transparent rounded-[5px] animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-800">Loading cardiovascular statistics...</p>
            <p className="text-[11px] text-slate-600">Aggregating historical assessment records</p>
          </div>
        ) : !summary || !trend.length ? (
          /* ─── Empty State ─── */
          <div className="bg-white rounded-[5px] border border-slate-200 p-10 text-center shadow-sm space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 bg-sky-50 rounded-[5px] border border-sky-100 flex items-center justify-center mx-auto text-[#0067A1]">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">No Heart Assessment Records Found</h2>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Take an assessment or complete a guided CardioConnect session to unlock longitudinal scores and functional analysis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/cardio-connect")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0067A1] hover:bg-[#005584] text-white rounded-[5px] text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              Open CardioConnect
            </button>
          </div>
        ) : (
          <>
            {/* ─── 4 Executive KPI Metric Cards (Clean, High Contrast, rounded-[5px]) ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Total Assessments */}
              <div className="bg-white rounded-[5px] p-4 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Total Assessments
                  </p>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                    {totalAssessments}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Completed in time window
                  </p>
                </div>
                <div className="w-10 h-10 rounded-[5px] bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0067A1] shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>

              {/* Card 2: Latest Score */}
              <div className="bg-white rounded-[5px] p-4 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Latest Score
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-[#0067A1] font-mono">
                      {latestScore}
                    </span>
                    <span className="text-xs font-mono text-slate-500">/ 100</span>
                  </div>
                  <div className="mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-bold uppercase tracking-wider border ${
                      Number(latestScore) >= 80
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : Number(latestScore) >= 60
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}>
                      {Number(latestScore) >= 80 ? "Low Risk" : Number(latestScore) >= 60 ? "Moderate Risk" : "High Risk"}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-[5px] bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Average Score */}
              <div className="bg-white rounded-[5px] p-4 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Average Score
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {avgScore}
                    </span>
                    <span className="text-xs font-mono text-slate-500">/ 100</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Across assessment history
                  </p>
                </div>
                <div className="w-10 h-10 rounded-[5px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              {/* Card 4: Recorded Change */}
              <div className="bg-white rounded-[5px] p-4 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Recorded Change
                  </p>
                  <p className={`text-2xl font-black font-mono mt-1 ${
                    recordedChange === null
                      ? "text-slate-500"
                      : recordedChange > 0
                      ? "text-emerald-700"
                      : recordedChange < 0
                      ? "text-amber-700"
                      : "text-slate-700"
                  }`}>
                    {recordedChange === null ? "—" : `${recordedChange > 0 ? "+" : ""}${recordedChange} pts`}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Between first and latest
                  </p>
                </div>
                <div className="w-10 h-10 rounded-[5px] bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* ─── Main Trend Chart (Solid Colors, No Gradient, rounded-[5px]) ─── */}
            <div className="bg-white rounded-[5px] border border-slate-200 p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[5px] bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0067A1]">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Recorded Assessment Trend</h2>
                    <p className="text-xs text-slate-600">Score movement across completed heart assessments</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[2px] bg-[#0067A1]" /> Health Score
                  </span>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="w-full" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="heartScoreGradient" x1="0" y1="0" x2="0" y2="1">
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
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "monospace" }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "5px",
                        padding: "10px 14px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                      }}
                      labelStyle={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4 }}
                      itemStyle={{ color: "#ffffff", fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}
                      formatter={(value) => [`${value}/100`, "Health Score"]}
                      cursor={{ stroke: "#0067A1", strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                    <ReferenceLine y={avgScore !== "-" ? avgScore : 0} stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={1} label={{ value: `Avg: ${avgScore}`, position: "right", fontSize: 10, fill: "#94a3b8" }} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#0067A1"
                      strokeWidth={2.5}
                      fill="url(#heartScoreGradient)"
                      dot={{ r: 4, fill: "#ffffff", stroke: "#0067A1", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#0067A1", stroke: "#ffffff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Quick Summary Strip */}
              <div className="mt-3.5 p-3 rounded-[5px] bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-800">
                <span>First: <span className="font-mono text-[#003358]">{trend[0]?.score}/100</span></span>
                <span>
                  Change:{" "}
                  <span className={`font-mono ${
                    recordedChange > 0 ? "text-emerald-700" : recordedChange < 0 ? "text-amber-700" : "text-slate-700"
                  }`}>
                    {recordedChange > 0 ? "+" : ""}{recordedChange ?? 0} pts
                  </span>
                </span>
                <span>Latest: <span className="font-mono text-[#0067A1]">{trend[trend.length - 1]?.score}/100</span></span>
              </div>

              <p className="text-[11px] text-slate-600 mt-3 leading-relaxed border-t border-slate-100 pt-2">
                *Recorded movement reflects historical input differences and does not by itself establish clinical improvement. Discuss persistent concerns with a qualified physician.
              </p>
            </div>

            {/* ─── Risk Distribution Card (rounded-[5px]) ─── */}
            <div className="bg-white rounded-[5px] border border-slate-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-[5px] bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Risk Distribution</h2>
                  <p className="text-xs text-slate-600">Distribution of completed assessments across clinical risk categories</p>
                </div>
              </div>

              <div className="space-y-3">
                {(graphData?.riskLevelDistribution || []).map((item) => (
                  <div key={item.level} className="flex items-center gap-3 text-xs">
                    <span className="w-20 capitalize font-bold text-slate-800">{item.level}</span>
                    <div className="flex-1 h-3 rounded-[5px] bg-slate-100 overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-[5px] ${
                          item.level === "low"
                            ? "bg-emerald-600"
                            : item.level === "moderate"
                            ? "bg-amber-500"
                            : item.level === "high"
                            ? "bg-orange-600"
                            : "bg-red-600"
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono font-bold text-slate-900">{item.count} ({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Recent Assessments List (Clean Table/Cards, rounded-[5px]) ─── */}
            <div className="bg-white rounded-[5px] border border-slate-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[5px] bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0067A1]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Recent Heart Assessments</h2>
                    <p className="text-xs text-slate-600">Authoritatively logged assessment snapshots</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {history.slice(0, 5).map((item) => {
                  let aiSnippet = "";
                  if (typeof item.aiAnalysis === "string") {
                    aiSnippet = item.aiAnalysis;
                  } else if (item.aiAnalysis && typeof item.aiAnalysis === "object") {
                    aiSnippet = item.aiAnalysis.analysis || "";
                  }
                  return (
                    <div
                      key={item.id}
                      className="border border-slate-200 rounded-[5px] p-4 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-4"
                    >
                      <div className="lg:w-1/3 shrink-0">
                        <p className="text-xs font-semibold text-slate-500">
                          {new Date(item.date).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base font-black font-mono text-slate-900">
                            {item.healthScore || item.score}/100
                          </span>
                          <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold uppercase border ${
                            (item.riskLevel || "").toLowerCase() === "low"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : (item.riskLevel || "").toLowerCase() === "moderate"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}>
                            {item.riskLevel || "Standard"} Risk
                          </span>
                        </div>
                        {item.inputs?.demographics && (
                          <p className="text-[11px] text-slate-600 mt-1 font-medium">
                            Age {item.inputs.demographics.age} · BMI {item.inputs.demographics.bmi ?? "N/A"}
                          </p>
                        )}
                      </div>

                      {aiSnippet && (
                        <div className="flex-1 border-t lg:border-t-0 lg:border-l border-slate-200 pt-3 lg:pt-0 lg:pl-4">
                          <p className="text-xs text-slate-700 leading-relaxed">
                            <strong className="text-slate-900">Clinical Note: </strong>
                            {aiSnippet}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
