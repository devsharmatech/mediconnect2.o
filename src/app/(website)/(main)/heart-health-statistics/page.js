"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Footprints,
  Heart,
  Trophy,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  RefreshCw,
  BarChart3,
  Info,
  Check
} from "lucide-react";
import { AnimatedCardioLoader } from "@/components/public-site/health/animations";

// Checkpoint tabs as specified in CC-09 / CC-DELTA-IMAGES.pdf Page 15 & 16
const CHECKPOINTS = [
  { id: "7D", label: "7D", desc: "Last 7 days", days: 7 },
  { id: "15D", label: "15D", desc: "Last 15 days", days: 15 },
  { id: "30D", label: "30D", desc: "Last 30 days", days: 30 },
  { id: "45D", label: "45D", desc: "Last 45 days", days: 45 },
  { id: "Later", label: "Later", desc: "Future checkpoint", days: 90, apiKey: "LONG" }
];

export default function HeartHealthStatisticsPage() {
  const router = useRouter();
  const [selectedCheckpoint, setSelectedCheckpoint] = useState("7D");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Card expanded states (all open by default on desktop, toggleable on mobile)
  const [expandedCards, setExpandedCards] = useState({
    activity: true,
    steps: true,
    spectrum: true,
    milestones: true,
    summary: true
  });

  // Selected factor for spectrum trajectory chart view
  const [selectedFactorKey, setSelectedFactorKey] = useState("systolic");

  const toggleCard = (cardKey) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }));
  };

  const fetchProgress = async (checkpointId) => {
    try {
      setLoading(true);
      setError(null);

      // Get user from localStorage if present (supports userId, patient_id, userData, user)
      let userId = null;
      if (typeof window !== "undefined") {
        try {
          const directUserId = localStorage.getItem("userId") || localStorage.getItem("patient_id");
          if (directUserId && directUserId !== "undefined" && directUserId !== "null") {
            userId = directUserId;
          } else {
            const rawUser = localStorage.getItem("userData") || localStorage.getItem("user");
            if (rawUser) {
              const parsed = JSON.parse(rawUser);
              userId = parsed.id || parsed.user_id || parsed.userId;
            }
          }
        } catch (e) {
          console.warn("Could not read user data from localStorage:", e);
        }
      }

      const cpObj = CHECKPOINTS.find((c) => c.id === checkpointId);
      const apiCheckpoint = cpObj?.apiKey || checkpointId;
      const url = `/api/v1/cardio/progress?checkpoint=${apiCheckpoint}${userId ? `&user_id=${userId}` : ""}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load progress data");
      }

      setProgressData(json.data);
    } catch (err) {
      console.error("Fetch progress error:", err);
      setError(err.message || "Failed to load cardiovascular progress.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress(selectedCheckpoint);
  }, [selectedCheckpoint]);

  const activeCheckpointObj = useMemo(() => {
    return CHECKPOINTS.find((c) => c.id === selectedCheckpoint) || CHECKPOINTS[0];
  }, [selectedCheckpoint]);

  // Validated and sanitized trajectory data points
  const validTrajectory = useMemo(() => {
    const traj = progressData?.spectrum?.trajectory;
    if (!traj || !Array.isArray(traj) || traj.length === 0) return [];
    return traj
      .map((item, idx) => {
        const rawVal = item?.[selectedFactorKey];
        const numVal = Number(rawVal);
        const val = (!isNaN(numVal) && isFinite(numVal)) ? numVal : 0;
        return {
          ...item,
          date: item?.date || `P${idx + 1}`,
          [selectedFactorKey]: val
        };
      })
      .filter((item) => typeof item[selectedFactorKey] === "number" && !isNaN(item[selectedFactorKey]));
  }, [progressData?.spectrum?.trajectory, selectedFactorKey]);

  const dataState = progressData?.dataState || (selectedCheckpoint === "Later" ? "later" : "available");

  // State styling helper
  const stateBadgeInfo = useMemo(() => {
    switch (dataState) {
      case "available":
        return {
          badge: "AVAILABLE",
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dotColor: "bg-emerald-500",
          title: "Progress data is available for the selected checkpoint.",
          statusText: "Data available",
          statusColor: "text-emerald-700"
        };
      case "partial":
        return {
          badge: "PARTIAL",
          badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
          dotColor: "bg-sky-500",
          title: "Some progress data is unavailable.",
          statusText: "Partial data",
          statusColor: "text-sky-700"
        };
      case "insufficient":
        return {
          badge: "INSUFFICIENT DATA",
          badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
          dotColor: "bg-amber-500",
          title: "Not enough data to show progress for this checkpoint.",
          statusText: "Insufficient data",
          statusColor: "text-amber-700"
        };
      case "later":
      default:
        return {
          badge: "LATER",
          badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
          dotColor: "bg-purple-500",
          title: "This checkpoint is not yet available.",
          statusText: "Available later",
          statusColor: "text-slate-500"
        };
    }
  }, [dataState]);

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800 py-2 sm:py-6 px-1.5 sm:px-4 md:px-6 lg:px-8 font-sans pb-44 sm:pb-28"
      style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}
    >
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ─── Top Header Card (Strict CC-09 Design) ─── */}
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
                    Cardiovascular Progress
                  </span>
                  <span className="text-slate-300 text-xs hidden sm:inline">•</span>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">Longitudinal Telemetry</span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                  My Progress
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
                  Longitudinal checkpoint progress experience. Track your activity, steps and key heart health factors over time.
                </p>
              </div>
            </div>

            {/* State Indicator Banner */}
            <div className="self-start sm:self-center shrink-0">
              <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[5px] border text-[11px] sm:text-xs font-bold ${stateBadgeInfo.badgeColor} whitespace-nowrap`}>
                <span className={`w-2 h-2 rounded-full ${stateBadgeInfo.dotColor} animate-pulse`} />
                <span>{stateBadgeInfo.badge}</span>
              </div>
            </div>
          </div>

          {/* ─── Checkpoint Selector Bar (7D, 15D, 30D, 45D, Later) ─── */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Checkpoint Options
              </span>
              <span className="text-xs font-medium text-[#0067A1]">
                {activeCheckpointObj.desc}
              </span>
            </div>

            {/* Checkpoint Pills */}
            <div className="grid grid-cols-5 gap-1 sm:gap-2 bg-slate-100 p-1 sm:p-1.5 rounded-[5px] border border-slate-200">
              {CHECKPOINTS.map((cp) => {
                const isActive = selectedCheckpoint === cp.id;
                return (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => setSelectedCheckpoint(cp.id)}
                    className={`py-1.5 sm:py-2 px-0.5 sm:px-1 text-center rounded-[5px] text-[11px] sm:text-xs md:text-sm font-bold transition-all cursor-pointer truncate ${
                      isActive
                        ? "bg-[#0067A1] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <span>{cp.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-5 gap-1 sm:gap-2 mt-1 px-1">
              {CHECKPOINTS.map((cp) => (
                <div key={cp.id} className="text-center">
                  <span className="text-[9px] sm:text-[10px] text-slate-500 hidden sm:inline-block truncate">
                    {cp.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Error Alert ─── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium px-4 py-3.5 rounded-[5px] flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Unable to Load Progress</p>
              <p className="mt-0.5 text-xs text-red-700">{error}</p>
              <button
                onClick={() => fetchProgress(selectedCheckpoint)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-[5px] text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Retry Checkpoint
              </button>
            </div>
          </div>
        )}

        {/* ─── Loading State ─── */}
        {loading ? (
          <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 overflow-hidden">
            <AnimatedCardioLoader
              title="Aggregating Longitudinal Telemetry..."
              subtitle={`Querying certified database records for checkpoint ${selectedCheckpoint}`}
            />
          </div>
        ) : (
          <div className="space-y-4">

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 1. ACTIVITY TREND CARD (Running Figure Icon)                    */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-sky-200">
              {/* Card Header */}
              <div
                onClick={() => toggleCard("activity")}
                className="p-3 sm:p-4 md:p-5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-[5px] bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0067A1] shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">Activity Trend</h2>
                      {dataState !== "later" && progressData?.activity?.trend && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[5px] bg-slate-100 text-slate-600 border border-slate-200">
                          {progressData.activity.trend}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {dataState === "later" ? (
                        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-600" /> Available later
                        </span>
                      ) : dataState === "insufficient" ? (
                        <span className="text-xs font-semibold text-amber-600">
                          Insufficient data
                        </span>
                      ) : (
                        <span className={`text-xs font-bold ${dataState === "available" ? "text-emerald-700" : "text-sky-700"}`}>
                          {progressData?.activity?.status || "Data available"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Preview & Chevron */}
                <div className="flex items-center gap-3">
                  {/* Micro Bar Chart Preview with real data points */}
                  {dataState !== "later" && dataState !== "insufficient" && progressData?.activity?.dataPoints?.length > 0 && (
                    <div className="hidden sm:flex items-end gap-1 h-7 px-2 py-1 bg-slate-50 rounded-[5px] border border-slate-100">
                      {progressData.activity.dataPoints.slice(-7).map((pt, idx) => (
                        <div
                          key={idx}
                          className="w-1.5 bg-[#0067A1] rounded-t-sm"
                          style={{ height: `${Math.max(2, Math.min(24, Math.round((pt.minutes / 60) * 24)))}px` }}
                          title={`${pt.dayLabel}: ${pt.minutes} min`}
                        />
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="p-1 text-slate-600 hover:text-slate-900 rounded-[5px]"
                    aria-label="Toggle Activity Trend details"
                  >
                    {expandedCards.activity ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Card Body (Expanded) */}
              {expandedCards.activity && (
                <div className="px-3 pb-3 sm:px-5 sm:pb-5 pt-1 border-t border-slate-100">
                  {dataState === "later" ? (
                    <div className="py-6 text-center text-slate-600 space-y-1">
                      <Clock className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                      <p className="text-sm font-bold text-slate-700">Available at later checkpoint</p>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        This checkpoint requires extended longitudinal tracking beyond the current observation window.
                      </p>
                    </div>
                  ) : dataState === "insufficient" ? (
                    <div className="py-6 text-center text-slate-600 space-y-2">
                      <Info className="w-8 h-8 mx-auto text-amber-500 mb-1" />
                      <p className="text-sm font-bold text-slate-700">No Activity Recorded Yet</p>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Complete your Heart Training session or record walking activity in CardioConnect to build your activity curve.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Metric Summary Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-sky-50/60 rounded-[5px] border border-sky-100">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Total Recorded Activity
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-bold font-mono text-[#0067A1]">
                              {progressData?.activity?.totalMinutes || 0}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">minutes</span>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Neutral Reference Standard
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-bold font-mono text-slate-800">
                              {progressData?.activity?.referenceBand || "150 - 300 min/week"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Bar Chart */}
                      {progressData?.activity?.dataPoints?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-700 mb-2">
                            Daily Movement Breakdown (Minutes)
                          </p>
                          <div className="h-44 w-full">
                            {!isMounted ? (
                              <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-[6px] border border-dashed border-slate-200">
                                <div className="w-4 h-4 border-2 border-slate-300 border-t-[#0067A1] rounded-full animate-spin" />
                              </div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={progressData.activity.dataPoints}
                                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                  <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: "#64748b" }} />
                                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                                  <Tooltip
                                    formatter={(value) => [`${value} min`, "Activity Duration"]}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                    contentStyle={{
                                      backgroundColor: "#ffffff",
                                      borderRadius: "8px",
                                      border: "1px solid #e2e8f0",
                                      fontSize: "12px",
                                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                                    }}
                                  />
                                  <Bar dataKey="minutes" fill="#0067A1" radius={[4, 4, 0, 0]}>
                                    {progressData.activity.dataPoints.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={entry.minutes >= 30 ? "#0067A1" : entry.minutes > 0 ? "#38bdf8" : "#e2e8f0"}
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 2. STEPS TREND CARD (Footprints Icon)                           */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-sky-200">
              <div
                onClick={() => toggleCard("steps")}
                className="p-3 sm:p-4 md:p-5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-[5px] bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700 shrink-0">
                    <Footprints className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">Steps Trend</h2>
                      {dataState !== "later" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[5px] bg-slate-100 text-slate-600 border border-slate-200">
                          Independent Metric
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {dataState === "later" ? (
                        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-600" /> Available later
                        </span>
                      ) : dataState === "insufficient" ? (
                        <span className="text-xs font-semibold text-amber-600">
                          Insufficient data
                        </span>
                      ) : (
                        <span className={`text-xs font-bold ${dataState === "available" ? "text-emerald-700" : "text-cyan-700"}`}>
                          {progressData?.steps?.status || "Data available"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {dataState !== "later" && dataState !== "insufficient" && progressData?.steps?.dataPoints?.length > 0 && (
                    <div className="hidden sm:flex items-end gap-1 h-7 px-2 py-1 bg-slate-50 rounded-[5px] border border-slate-100">
                      {progressData.steps.dataPoints.slice(-7).map((pt, idx) => (
                        <div
                          key={idx}
                          className="w-1.5 bg-cyan-600 rounded-t-sm"
                          style={{ height: `${Math.max(2, Math.min(24, Math.round((pt.steps / 10000) * 24)))}px` }}
                          title={`${pt.dayLabel}: ${pt.steps} steps`}
                        />
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="p-1 text-slate-600 hover:text-slate-900 rounded-[5px]"
                    aria-label="Toggle Steps Trend details"
                  >
                    {expandedCards.steps ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {expandedCards.steps && (
                <div className="px-3 pb-3 sm:px-5 sm:pb-5 pt-1 border-t border-slate-100">
                  {dataState === "later" ? (
                    <div className="py-6 text-center text-slate-600 space-y-1">
                      <Clock className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                      <p className="text-sm font-bold text-slate-700">Available at later checkpoint</p>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Daily step logs will populate across subsequent longitudinal evaluations.
                      </p>
                    </div>
                  ) : dataState === "insufficient" ? (
                    <div className="py-6 text-center text-slate-600 space-y-2">
                      <Footprints className="w-8 h-8 mx-auto text-amber-500 mb-1" />
                      <p className="text-sm font-bold text-slate-700">No Step Records Found</p>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Connect mobile device sensors or log walking sessions to record steps.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-cyan-50/60 rounded-[5px] border border-cyan-100">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Daily Average
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-bold font-mono text-cyan-800">
                              {(progressData?.steps?.averageDailySteps || 0).toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">steps / day</span>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Neutral Reference Target
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-bold font-mono text-slate-800">
                              10,000 steps
                            </span>
                            <span className="text-[10px] text-slate-600 ml-1">(Non-prescriptive reference)</span>
                          </div>
                        </div>
                      </div>

                      {progressData?.steps?.dataPoints?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-700 mb-2">
                            Step Counts vs 10,000 Reference Target
                          </p>
                          <div className="h-44 w-full">
                            {!isMounted ? (
                              <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-[6px] border border-dashed border-slate-200">
                                <div className="w-4 h-4 border-2 border-slate-300 border-t-[#0067A1] rounded-full animate-spin" />
                              </div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={progressData.steps.dataPoints}
                                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                  <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: "#64748b" }} />
                                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                                  <Tooltip
                                    formatter={(value) => [`${value.toLocaleString()} steps`, "Daily Movement"]}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                    contentStyle={{
                                      backgroundColor: "#ffffff",
                                      borderRadius: "8px",
                                      border: "1px solid #e2e8f0",
                                      fontSize: "12px",
                                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                                    }}
                                  />
                                  <ReferenceLine y={10000} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "10k Ref", fill: "#d97706", fontSize: 10, position: "top" }} />
                                  <Bar dataKey="steps" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                                    {progressData.steps.dataPoints.map((entry, index) => (
                                      <Cell
                                        key={`cell-step-${index}`}
                                        fill={entry.steps >= 10000 ? "#0284c7" : entry.steps >= 6000 ? "#06b6d4" : "#94a3b8"}
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 3. SPECTRUM TRENDS CARD (Heart Icon, 11 Factors)                */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-rose-200">
              <div
                onClick={() => toggleCard("spectrum")}
                className="p-3 sm:p-4 md:p-5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-[5px] bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">Spectrum Trends</h2>
                      {dataState !== "later" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[5px] bg-rose-50 text-rose-700 border border-rose-200">
                          11 Key Markers
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {dataState === "later" ? (
                        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-600" /> Available later
                        </span>
                      ) : dataState === "insufficient" ? (
                        <span className="text-xs font-semibold text-amber-600">
                          Insufficient data · Not enough data for trends
                        </span>
                      ) : (
                        <span className={`text-xs font-bold ${dataState === "available" ? "text-emerald-700" : "text-rose-700"}`}>
                          {progressData?.spectrum?.status || "Data available"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {dataState !== "later" && dataState !== "insufficient" && (
                    <div className="hidden sm:flex items-center gap-1 h-7 px-2 bg-rose-50/60 rounded-[5px] border border-rose-100">
                      <span className="text-[11px] font-bold text-rose-700">
                        {progressData?.spectrum?.availableCount || 0}/11 factors
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="p-1 text-slate-600 hover:text-slate-900 rounded-[5px]"
                    aria-label="Toggle Spectrum Trends details"
                  >
                    {expandedCards.spectrum ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {expandedCards.spectrum && (
                <div className="px-3 pb-3 sm:px-5 sm:pb-5 pt-1 border-t border-slate-100 space-y-4">
                  {dataState === "later" ? (
                    <div className="py-6 text-center text-slate-600 space-y-1">
                      <Clock className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                      <p className="text-sm font-bold text-slate-700">Available at later checkpoint</p>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Biochemical spectrum trends require serial assessments across extended intervals.
                      </p>
                    </div>
                  ) : dataState === "insufficient" ? (
                    <div className="py-6 text-center text-slate-600 space-y-2">
                      <Heart className="w-8 h-8 mx-auto text-rose-400 mb-1" />
                      <p className="text-sm font-bold text-slate-700">No Assessment Spectrum Data</p>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Complete your clinical heart assessment to generate your personalized 11-factor cardiovascular spectrum.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Longitudinal Trajectory Chart across assessments */}
                      {validTrajectory.length > 0 && (
                        <div className="pt-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <p className="text-xs font-bold text-slate-700">
                              Longitudinal Physiological Marker Trajectory
                            </p>
                            {/* Factor Toggle Chips */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                              {[
                                { key: "systolic", label: "Systolic BP" },
                                { key: "diastolic", label: "Diastolic BP" },
                                { key: "heartRate", label: "Heart Rate" },
                                { key: "score", label: "Health Score" }
                              ].map((f) => (
                                <button
                                  key={f.key}
                                  type="button"
                                  onClick={() => setSelectedFactorKey(f.key)}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                    selectedFactorKey === f.key
                                      ? "bg-[#0067A1] text-white shadow-xs"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="h-44 w-full">
                            {!isMounted ? (
                              <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-[6px] border border-dashed border-slate-200">
                                <div className="w-4 h-4 border-2 border-slate-300 border-t-[#0067A1] rounded-full animate-spin" />
                              </div>
                            ) : validTrajectory.length === 1 ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/70 border border-slate-200/80 rounded-lg p-4 text-center">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#0067A1]" />
                                  <span className="text-xs font-bold text-slate-700">Baseline Recording:</span>
                                  <span className="text-sm font-bold text-[#0067A1] font-mono">
                                    {validTrajectory[0][selectedFactorKey]} {
                                      selectedFactorKey.includes("BP") || selectedFactorKey === "systolic" || selectedFactorKey === "diastolic"
                                        ? "mmHg"
                                        : selectedFactorKey === "heartRate"
                                        ? "bpm"
                                        : "/ 100"
                                    }
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 max-w-sm">
                                  Baseline recorded on {validTrajectory[0].date}. Complete your next assessment to view the longitudinal trendline.
                                </p>
                              </div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={validTrajectory}
                                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                                  <Tooltip
                                    formatter={(value) => [
                                      `${value} ${
                                        selectedFactorKey.includes("BP") || selectedFactorKey === "systolic" || selectedFactorKey === "diastolic"
                                          ? "mmHg"
                                          : selectedFactorKey === "heartRate"
                                          ? "bpm"
                                          : "/ 100"
                                      }`,
                                      selectedFactorKey.toUpperCase()
                                    ]}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                    contentStyle={{
                                      backgroundColor: "#ffffff",
                                      borderRadius: "8px",
                                      border: "1px solid #e2e8f0",
                                      fontSize: "12px",
                                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                                    }}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey={selectedFactorKey}
                                    stroke="#0067A1"
                                    strokeWidth={2.5}
                                    dot={{ fill: "#0067A1", r: 4 }}
                                    activeDot={{ r: 6, fill: "#0284c7" }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 11 Factor Clinical Status Grid */}
                      {progressData?.spectrum?.factors?.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-xs font-bold text-slate-700 mb-2.5">
                            Authoritative 11-Factor Spectrum Profile (ESC 2024 Criteria)
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2.5">
                            {progressData.spectrum.factors.map((factor) => (
                              <div
                                key={factor.key}
                                className={`p-2 sm:p-2.5 rounded-[5px] border transition-all ${
                                  factor.available
                                    ? "bg-slate-50/80 border-slate-200"
                                    : "bg-slate-50/30 border-dashed border-slate-200 opacity-60"
                                }`}
                              >
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                                  {factor.shortLabel || factor.label}
                                </span>
                                <div className="flex items-baseline gap-1 mt-1">
                                  <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
                                    {factor.available
                                      ? typeof factor.value === "number"
                                        ? factor.key === "bmi" || factor.key === "hba1c"
                                          ? factor.value.toFixed(1)
                                          : Math.round(factor.value)
                                        : factor.value
                                      : "—"}
                                  </span>
                                  <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold">{factor.unit}</span>
                                </div>
                                <span className="text-[9px] text-slate-600 block mt-0.5">
                                  Ref: {factor.optimal}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 4. MILESTONES CARD (Trophy Icon)                                */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-amber-200">
              <div
                onClick={() => toggleCard("milestones")}
                className="p-3 sm:p-4 md:p-5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-[5px] bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">Milestones</h2>
                      {dataState !== "later" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[5px] bg-amber-50 text-amber-700 border border-amber-200">
                          Checkpoints
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {dataState === "later" ? (
                        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-600" /> Available later
                        </span>
                      ) : dataState === "insufficient" ? (
                        <span className="text-xs font-semibold text-amber-600">
                          Insufficient data
                        </span>
                      ) : (
                        <span className={`text-xs font-bold ${progressData?.milestones?.achievedCount > 0 ? "text-emerald-700" : "text-amber-700"}`}>
                          {progressData?.milestones?.status || "Milestones tracking"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Progress Bar Preview matching page_15.png */}
                  {dataState !== "later" && dataState !== "insufficient" && (
                    <div className="hidden sm:block w-24">
                      <div className="w-full bg-slate-100 rounded-[5px] h-2 overflow-hidden border border-slate-200">
                        <div
                          className="bg-emerald-500 h-full rounded-[5px] transition-all duration-500"
                          style={{
                            width: `${Math.round(
                              ((progressData?.milestones?.achievedCount || 0) /
                                (progressData?.milestones?.totalCount || 4)) *
                                100
                            )}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    className="p-1 text-slate-600 hover:text-slate-900 rounded-[5px]"
                    aria-label="Toggle Milestones details"
                  >
                    {expandedCards.milestones ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {expandedCards.milestones && (
                <div className="px-3 pb-3 sm:px-5 sm:pb-5 pt-1 border-t border-slate-100">
                  {dataState === "later" ? (
                    <div className="py-6 text-center text-slate-600 space-y-1">
                      <Clock className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                      <p className="text-sm font-bold text-slate-700">Available at later checkpoint</p>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Milestone unlocks will appear as activity and follow-ups are completed.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(progressData?.milestones?.items || []).map((m) => (
                          <div
                            key={m.id}
                            className={`p-3 rounded-[5px] border flex items-start gap-2.5 transition-colors ${
                              m.achieved
                                ? "bg-emerald-50/50 border-emerald-200"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0 mt-0.5 ${
                                m.achieved
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-200 text-slate-400"
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${m.achieved ? "text-emerald-900" : "text-slate-700"}`}>
                                {m.title}
                              </p>
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                {m.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 5. SUMMARY CARD (Document Icon)                                 */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-blue-200">
              <div
                onClick={() => toggleCard("summary")}
                className="p-3 sm:p-4 md:p-5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-[5px] bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Summary</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {dataState === "later" ? (
                        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-600" /> Available later
                        </span>
                      ) : dataState === "insufficient" ? (
                        <span className="text-xs font-semibold text-amber-600">
                          Insufficient data
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700">
                          {progressData?.summary?.status || "Data available"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="p-1 text-slate-600 hover:text-slate-900 rounded-[5px]"
                  aria-label="Toggle Summary details"
                >
                  {expandedCards.summary ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              </div>

              {expandedCards.summary && (
                <div className="px-3 pb-3 sm:px-5 sm:pb-5 pt-1 border-t border-slate-100">
                  <div className="p-3.5 bg-slate-50 rounded-[5px] border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                    {progressData?.summary?.text || (
                      dataState === "later"
                        ? "This checkpoint is not yet available. Continue recording regular activity and screenings to unlock longitudinal projections."
                        : "Longitudinal checkpoint progress: physiological markers and physical activity duration logged in accordance with ESC 2024 standards."
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PRIMARY ACTION: VIEW SPECTRUM                                   */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => router.push("/heart-health-result")}
                className="w-full sm:max-w-md mx-auto py-3.5 px-6 bg-[#0067A1] hover:bg-[#005282] text-white rounded-[5px] font-bold text-sm sm:text-base tracking-wide uppercase transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <span>VIEW SPECTRUM</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
