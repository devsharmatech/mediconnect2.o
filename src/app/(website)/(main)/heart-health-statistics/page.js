"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Activity, TrendingUp, Heart, AlertTriangle, BarChart3, CalendarClock } from "lucide-react";

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
          `/api/health/assessments/graph?user_id=${user.id}&type=heart&timeframe=${timeframe}&limit=100`
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
  const minScore = scores.length ? Math.min(...scores, 40) : 0;
  const maxScore = scores.length ? Math.max(...scores, 100) : 100;
  const range = maxScore - minScore || 1;

  const chartPoints = trend.map((point, index) => {
    const x = trend.length === 1 ? 50 : (index / Math.max(trend.length - 1, 1)) * 100;
    const normalizedY = (point.score - minScore) / range;
    const y = 90 - normalizedY * 70; // keep top/bottom padding
    const dateLabel = new Date(point.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return {
      id: point.assessmentId,
      x,
      y,
      score: point.score,
      dateLabel,
    };
  });

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-gray-800 py-4 font-sans">
      <header className="w-full mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/website/dashboard/assessments")}
            className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0067A1] to-emerald-600 bg-clip-text text-transparent">
              Heart Health Statistics
            </h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2 text-sm">
              <CalendarClock className="w-4 h-4 text-emerald-600" />
              Detailed trends from your heart assessments
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="inline-flex rounded-full bg-white p-1 border border-gray-200 shadow-sm">
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
            onClick={() => router.push("/website/heart-health-result")}
            className="hidden md:inline-flex items-center gap-2 text-xs font-semibold text-[#0067A1] hover:underline"
          >
            <Heart className="w-4 h-4" />
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
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
          </div>
        ) : !summary || !trend.length ? (
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
            <p className="text-gray-700 text-sm mb-3">We could not find enough heart assessments to build statistics.</p>
            <button
              onClick={() => router.push("/website/heart-health")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0067A1] to-emerald-600 text-white text-sm font-semibold shadow-md hover:shadow-lg"
            >
              <Activity className="w-4 h-4" />
              Take a heart assessment
            </button>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard
                icon={<BarChart3 className="w-5 h-5 text-emerald-600" />}
                title="Total assessments"
                value={summary.heart?.total ?? "-"}
              />
              <SummaryCard
                icon={<Activity className="w-5 h-5 text-emerald-600" />}
                title="Latest score"
                value={summary.heart?.latestScore ?? "-"}
                helper="out of 100"
              />
              <SummaryCard
                icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                title="Average score"
                value={summary.heart?.averageScore ?? "-"}
              />
              <SummaryCard
                icon={<Heart className="w-5 h-5 text-emerald-600" />}
                title="Improvement"
                value={summary.heart?.improvement ?? 0}
                helper="points from first to latest"
              />
            </section>

            {/* Main trend chart */}
            <section className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50">
                      <Activity className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">Heart score trend</h2>
                      <p className="text-xs text-gray-500">Each bar shows an assessment over time</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Higher is better</p>
                </div>
                <div className="h-56 relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="heartLineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0067A1" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                    </defs>

                    {/* Baseline grid */}
                    {[0.25, 0.5, 0.75].map((ratio) => (
                      <line
                        key={ratio}
                        x1="0"
                        x2="100"
                        y1={90 - ratio * 70}
                        y2={90 - ratio * 70}
                        stroke="#E5E7EB"
                        strokeDasharray="2 4"
                        strokeWidth="0.4"
                      />
                    ))}

                    {chartPoints.length > 0 && (
                      <>
                        <motion.polyline
                          points={chartPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                          fill="none"
                          stroke="url(#heartLineGradient)"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                        />

                        {chartPoints.map((p, index) => (
                          <motion.circle
                            key={p.id}
                            cx={p.x}
                            cy={p.y}
                            r={index === chartPoints.length - 1 ? 2.2 : 1.8}
                            fill="#ECFDF5"
                            stroke={index === chartPoints.length - 1 ? "#10B981" : "#0067A1"}
                            strokeWidth={index === chartPoints.length - 1 ? 1.6 : 1.2}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 + index * 0.05, duration: 0.3 }}
                          >
                            <title>{`${p.dateLabel} • ${p.score}/100`}</title>
                          </motion.circle>
                        ))}
                      </>
                    )}
                  </svg>
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                  {chartPoints.map((p) => (
                    <span key={p.id}>{p.dateLabel}</span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-gray-500">
                  <span>First: {trend[0].score}/100</span>
                  <span>
                    Change: {summary.heart.improvement > 0 ? "+" : ""}
                    {summary.heart.improvement} pts
                  </span>
                  <span>Latest: {trend[trend.length - 1].score}/100</span>
                </div>
              </motion.div>

              {/* Risk distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-red-50">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
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
            <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Recent heart assessments</h2>
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
                        {item.inputs?.demographics && (
                          <p className="text-xs text-gray-600 mt-1">
                            Age {item.inputs.demographics.age}, BMI {item.inputs.demographics.bmi ?? "N/A"}
                          </p>
                        )}
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
    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
      <div className="p-2 rounded-xl bg-emerald-50">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
        {helper && <p className="text-[11px] text-gray-500 mt-0.5">{helper}</p>}
      </div>
    </div>
  );
}
