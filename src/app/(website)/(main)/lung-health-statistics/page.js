"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Activity, TrendingUp, Wind, AlertTriangle, BarChart3, CalendarClock } from "lucide-react";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";

const TIMEFRAMES = [
  { id: "3months", label: "Last 3 months" },
  { id: "year", label: "Last year" },
  { id: "all", label: "All time" }
];

export default function LungHealthStatisticsPage() {
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
      setError("Please login to view your lung statistics.");
      setLoading(false);
      return;
    }

    const user = JSON.parse(userData);

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/health/assessments/graph?user_id=${user.id}&type=lung&timeframe=${timeframe}&limit=100`
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load lung statistics.");
        }
        setGraphData(data.data.graphData || null);
        setSummary(data.data.summary || null);
        setHistory((data.data.history || []).filter((h) => h.type === "lung"));
      } catch (err) {
        console.error("Lung statistics error", err);
        setError("Unable to load lung statistics right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeframe]);

  const trend = graphData?.healthScoreTrend?.filter((p) => p.type === "lung") || [];

  return (
    <div className="min-h-screen  text-gray-800  font-sans">
      <header className="max-w-full mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/website/dashboard/assessments")}
            className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0067A1] to-[#0080C6] bg-clip-text text-transparent">
              Lung Health Statistics
            </h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2 text-sm">
              <CalendarClock className="w-4 h-4 text-[#0067A1]" />
              Detailed trends from your lung assessments
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="inline-flex rounded-full bg-white/60 p-1 border border-white/70 shadow-sm">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  timeframe === t.id
                    ? "bg-[#0067A1] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => router.push("/website/lung-health-result")}
            className="hidden md:inline-flex items-center gap-2 text-xs font-semibold text-[#0067A1] hover:underline"
          >
            <Wind className="w-4 h-4" />
            Back to latest result
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-2xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <LoadingScreen message="Loading lung statistics..." submessage="Analyzing your assessment data" />
        ) : !summary || !trend.length ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-10 border border-white/20 shadow-xl text-center">
            <p className="text-gray-700 text-sm mb-3">We could not find enough lung assessments to build statistics.</p>
            <button
              onClick={() => router.push("/website/lung-assessment")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white text-sm font-semibold shadow-md hover:shadow-lg"
            >
              <Activity className="w-4 h-4" />
              Take a lung assessment
            </button>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard
                icon={<BarChart3 className="w-5 h-5 text-[#0067A1]" />}
                title="Total assessments"
                value={summary.lung?.total ?? "-"}
              />
              <SummaryCard
                icon={<Activity className="w-5 h-5 text-[#0067A1]" />}
                title="Latest score"
                value={summary.lung?.latestScore ?? "-"}
                helper="out of 100"
              />
              <SummaryCard
                icon={<TrendingUp className="w-5 h-5 text-[#0067A1]" />}
                title="Average score"
                value={summary.lung?.averageScore ?? "-"}
              />
              <SummaryCard
                icon={<Wind className="w-5 h-5 text-[#0067A1]" />}
                title="Improvement"
                value={summary.lung?.improvement ?? 0}
                helper="points from first to latest"
              />
            </section>

            {/* Main trend chart */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#0067A1]/10">
                      <Activity className="w-5 h-5 text-[#0067A1]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">Lung score trend</h2>
                      <p className="text-xs text-gray-500">Score movement over time</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Higher is better</p>
                </div>
                <div className="h-60">
                  {(() => {
                    const chartWidth = 640;
                    const chartHeight = 220;
                    const paddingX = 30;
                    const paddingY = 20;
                    const scores = trend.map((point) => Math.max(0, Math.min(100, point.score || 0)));
                    const maxScore = Math.max(100, ...scores);
                    const minScore = Math.min(0, ...scores);
                    const span = Math.max(1, maxScore - minScore);
                    const toX = (index) =>
                      paddingX + (index / Math.max(1, trend.length - 1)) * (chartWidth - paddingX * 2);
                    const toY = (score) =>
                      paddingY + (1 - (score - minScore) / span) * (chartHeight - paddingY * 2);
                    const points = trend
                      .map((point, index) => `${toX(index)},${toY(point.score || 0)}`)
                      .join(" ");

                    return (
                      <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="w-full h-full"
                        role="img"
                        aria-label="Lung score trend"
                      >
                        <defs>
                          <linearGradient id="lungTrend" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#0067A1" />
                            <stop offset="100%" stopColor="#0080C6" />
                          </linearGradient>
                          <linearGradient id="lungFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(11,79,74,0.2)" />
                            <stop offset="100%" stopColor="rgba(15,118,110,0.05)" />
                          </linearGradient>
                        </defs>

                        {[0, 25, 50, 75, 100].map((tick) => (
                          <g key={tick}>
                            <line
                              x1={paddingX}
                              x2={chartWidth - paddingX}
                              y1={toY(tick)}
                              y2={toY(tick)}
                              stroke="#e5e7eb"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={6}
                              y={toY(tick) + 4}
                              fontSize="10"
                              fill="#9ca3af"
                            >
                              {tick}
                            </text>
                          </g>
                        ))}

                        <polyline
                          points={`${paddingX},${chartHeight - paddingY} ${points} ${chartWidth - paddingX},${chartHeight - paddingY}`}
                          fill="url(#lungFill)"
                          stroke="none"
                        />
                        <polyline
                          points={points}
                          fill="none"
                          stroke="url(#lungTrend)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {trend.map((point, index) => {
                          const cx = toX(index);
                          const cy = toY(point.score || 0);
                          const dateLabel = new Date(point.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                          return (
                            <g key={point.assessmentId || `${point.date}-${index}`}>
                              <circle cx={cx} cy={cy} r="5" fill="#ffffff" stroke="#0067A1" strokeWidth="3" />
                              <text x={cx} y={chartHeight - 2} textAnchor="middle" fontSize="10" fill="#9ca3af">
                                {dateLabel}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-gray-500">
                  <span>First: {trend[0].score}/100</span>
                  <span>
                    Change: {summary.lung.improvement > 0 ? "+" : ""}
                    {summary.lung.improvement} pts
                  </span>
                  <span>Latest: {trend[trend.length - 1].score}/100</span>
                </div>
              </motion.div>

              {/* Risk distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-[#0067A1]/10">
                    <AlertTriangle className="w-5 h-5 text-[#0067A1]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Risk distribution</h2>
                    <p className="text-xs text-gray-500">How many assessments fell in each risk zone</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {(graphData?.riskLevelDistribution || []).map((item) => (
                    <div key={item.level} className="flex items-center gap-3 text-xs">
                      <span className="w-16 capitalize text-gray-600">{item.level}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.level === "low"
                              ? "bg-green-500"
                              : item.level === "moderate"
                              ? "bg-yellow-400"
                              : item.level === "high"
                              ? "bg-orange-500"
                              : "bg-red-600"
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-gray-600">{item.count}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </section>

            {/* Recent assessments list */}
            <section className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#0067A1]/10">
                    <BarChart3 className="w-5 h-5 text-[#0067A1]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Recent lung assessments</h2>
                    <p className="text-xs text-gray-500">With assistive insight snippets</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {history.map((item) => {
                  let aiSnippet = "";
                  if (typeof item.aiAnalysis === "string") {
                    aiSnippet = item.aiAnalysis;
                  } else if (item.aiAnalysis && typeof item.aiAnalysis === "object") {
                    aiSnippet = item.aiAnalysis.analysis || "";
                  }
                  return (
                    <div
                      key={item.id}
                      className="border border-gray-100 rounded-2xl p-4 bg-emerald-50/40 flex flex-col lg:flex-row lg:items-start gap-4"
                    >
                      <div className="lg:w-1/4 flex-shrink-0">
                        <p className="text-xs text-gray-500">
                          {new Date(item.date).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                          Score {item.healthScore}/100 · {item.riskLevel?.toUpperCase()} RISK
                        </p>
                      </div>
                      {aiSnippet && (
                        <div className="flex-1 mt-2 lg:mt-0 border-t lg:border-t-0 lg:border-l border-gray-200/60 pt-3 lg:pt-0 lg:pl-4">
                          <p className="text-xs text-gray-700 leading-relaxed">
                            <span className="font-semibold">Assistive Insights: </span>
                            {aiSnippet}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ icon, title, value, helper }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 border border-white/20 shadow-xl flex items-center gap-3">
      <div className="p-2 rounded-xl bg-[#0067A1]/10">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
        {helper && <p className="text-[11px] text-gray-500 mt-0.5">{helper}</p>}
      </div>
    </div>
  );
}
