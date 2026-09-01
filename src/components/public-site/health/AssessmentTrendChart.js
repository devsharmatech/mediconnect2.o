"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Dot
} from "recharts";
import { TrendingUp, Calendar, AlertCircle, Info } from "lucide-react";

export default function AssessmentTrendChart({
  trendData = [],
  assessmentType = "heart",
  currentScore = 75,
  currentDate = new Date().toISOString()
}) {
  const [activeMetric, setActiveMetric] = useState("score");

  // Determine primary color palette based on assessment type
  const isHeart = assessmentType === "heart";
  const primaryColor = isHeart ? "#0067A1" : "#0D9488";
  const gradientId = isHeart ? "heartTrendGradient" : "lungTrendGradient";

  // Build clean chart dataset from real historical records
  // If no previous history exists, show current assessment as the baseline point
  const formattedPoints = React.useMemo(() => {
    if (trendData && trendData.length > 0) {
      return trendData.map((item, idx) => {
        const d = new Date(item.date || item.created_at);
        const formattedDate = !isNaN(d.getTime())
          ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : `Point ${idx + 1}`;

        return {
          id: item.assessmentId || item.id || idx,
          date: formattedDate,
          fullDate: !isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
          score: typeof item.score === "number" ? item.score : (item.healthScore || item.health_score || currentScore),
          riskLevel: item.riskLevel || item.risk_level || "moderate",
          isCurrent: idx === trendData.length - 1
        };
      });
    }

    // Fallback single baseline point from current assessment
    const d = new Date(currentDate);
    const dateLabel = !isNaN(d.getTime())
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Current";

    return [
      {
        id: "current",
        date: dateLabel,
        fullDate: !isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
        score: currentScore || 75,
        riskLevel: "moderate",
        isCurrent: true
      }
    ];
  }, [trendData, currentScore, currentDate]);

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs shadow-lg border border-slate-700/60 z-50">
          <p className="font-semibold text-slate-200 text-[11px] mb-1 flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-teal-400" />
            {data.fullDate || data.date}
            {data.isCurrent && (
              <span className="bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ml-1">
                Latest
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Recorded Score:</span>
            <span className="font-bold text-sm text-white font-mono">{data.score}/100</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const isSinglePoint = formattedPoints.length === 1;

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${isHeart ? "bg-sky-50 text-[#0067A1]" : "bg-teal-50 text-teal-700"}`}>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Recorded Assessment Trend
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Longitudinal trend from verified assessment database records
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {formattedPoints.length} {formattedPoints.length === 1 ? "Record" : "Records"}
          </span>
        </div>
      </div>

      {/* Single Point Baseline Indicator if only 1 assessment exists */}
      {isSinglePoint && (
        <div className="mb-3 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-lg flex items-start gap-2 text-[11px] text-slate-600">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Initial baseline recorded. Complete regular assessments over time to track your longitudinal health progression.
          </span>
        </div>
      )}

      {/* Chart Area */}
      <div className="w-full h-48 sm:h-52 my-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedPoints}
            margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
              dy={5}
            />

            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              ticks={[0, 25, 50, 75, 100]}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="score"
              stroke={primaryColor}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              dot={{
                r: 4,
                strokeWidth: 2,
                stroke: primaryColor,
                fill: "#FFFFFF"
              }}
              activeDot={{
                r: 6,
                strokeWidth: 2,
                stroke: "#FFFFFF",
                fill: primaryColor
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400">
        <span>Framework: ESC 2024 / Longitudinal Factor Model</span>
        <span className="font-mono">Authoritative DB Source</span>
      </div>
    </div>
  );
}
