"use client";

import React from "react";
import { 
  Gauge, 
  Wind, 
  Activity, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Info 
} from "lucide-react";

/**
 * AnimatedAqiMeter
 * Compact, responsive Indian CPCB 6-band Air Quality Index visualizer.
 * Clean, calibrated SVG semicircular gauge with smooth vector needle and balanced typography.
 */
export default function AnimatedAqiMeter({
  aqi = 59,
  category = "Satisfactory",
  location = "Bulandshahr, Uttar Pradesh",
  lastUpdated = "Today, 11:46 AM",
  onInfoClick = null,
  className = "",
}) {
  // Clamp AQI: 0 to 500
  const clampedAqi = Math.min(500, Math.max(0, Number(aqi) || 0));
  // Needle Angle: -90° (0) to +90° (500)
  const needleAngle = -90 + (clampedAqi / 500) * 180;

  // Category Theme Styles
  const categoryConfig = {
    Good: {
      bg: "from-emerald-700 via-emerald-800 to-green-900",
      border: "border-emerald-600/70",
      accent: "#10b981",
      badgeBg: "bg-emerald-400/25 text-emerald-100 border-emerald-300/40",
      description: "Air quality is considered satisfactory, and air pollution poses little or no risk.",
    },
    Satisfactory: {
      bg: "from-emerald-800 via-green-900 to-teal-950",
      border: "border-emerald-700/70",
      accent: "#22c55e",
      badgeBg: "bg-green-400/25 text-green-100 border-green-300/40",
      description: "Air quality is acceptable for most individuals.",
    },
    Moderate: {
      bg: "from-amber-700 via-amber-800 to-yellow-950",
      border: "border-amber-600/70",
      accent: "#f59e0b",
      badgeBg: "bg-amber-400/25 text-amber-100 border-amber-300/40",
      description: "May cause breathing discomfort to sensitive individuals and lung disease patients.",
    },
    Poor: {
      bg: "from-orange-800 via-orange-900 to-red-950",
      border: "border-orange-700/70",
      accent: "#ea580c",
      badgeBg: "bg-orange-400/25 text-orange-100 border-orange-300/40",
      description: "May cause breathing discomfort on prolonged exposure. Limit outdoor workouts.",
    },
    "Very Poor": {
      bg: "from-red-800 via-red-900 to-slate-950",
      border: "border-red-700/70",
      accent: "#dc2626",
      badgeBg: "bg-red-400/25 text-red-100 border-red-300/40",
      description: "May cause respiratory illness on prolonged exposure. Avoid outdoor activities.",
    },
    Severe: {
      bg: "from-purple-950 via-slate-900 to-black",
      border: "border-purple-800/70",
      accent: "#7e22ce",
      badgeBg: "bg-purple-400/25 text-purple-100 border-purple-300/40",
      description: "Emergency health warning: serious risk of respiratory impact on entire population.",
    },
  }[category] || {
    bg: "from-emerald-700 via-emerald-800 to-green-900",
    border: "border-emerald-600/70",
    accent: "#10b981",
    badgeBg: "bg-emerald-400/25 text-emerald-100 border-emerald-300/40",
    description: "Air quality is considered satisfactory, and air pollution poses little or no risk.",
  };

  const scaleBands = [
    { range: "0 - 50", label: "Good", bgClass: "bg-emerald-500" },
    { range: "51 - 100", label: "Satisfactory", bgClass: "bg-green-500" },
    { range: "101 - 200", label: "Moderate", bgClass: "bg-amber-500" },
    { range: "201 - 300", label: "Poor", bgClass: "bg-orange-500" },
    { range: "301 - 400", label: "Very Poor", bgClass: "bg-red-500" },
    { range: "401 - 500", label: "Severe", bgClass: "bg-purple-800" },
  ];

  return (
    <div className={`rounded-[6px] overflow-hidden text-white shadow-xs border ${categoryConfig.border} bg-gradient-to-br ${categoryConfig.bg} p-3.5 sm:p-4 flex flex-col justify-between relative ${className}`}>
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 relative z-10 mb-1.5">
        <div className="min-w-0 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-white truncate">
            {location}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-normal text-white/85 bg-black/20 px-2 py-0.5 rounded-[4px] border border-white/10 shrink-0">
          <Clock className="w-2.5 h-2.5 text-emerald-200" />
          <span>{lastUpdated}</span>
        </div>
      </div>

      {/* Main Meter Area: Symmetrical & Responsive */}
      <div className="flex items-center justify-between gap-3 my-2 relative z-10">
        {/* Left: Value & Description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-emerald-100/90">
            <Gauge className="w-3 h-3 text-emerald-200" />
            <span>AQI (India CPCB)</span>
            {onInfoClick && (
              <button
                type="button"
                onClick={onInfoClick}
                className="w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-[9px] font-bold cursor-pointer transition-colors"
                title="View Source & Freshness"
              >
                <Info className="w-2 h-2" />
              </button>
            )}
          </div>

          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              {clampedAqi}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-[4px] border ${categoryConfig.badgeBg}`}>
              {category}
            </span>
          </div>

          <p className="text-xs text-white/85 font-normal leading-relaxed line-clamp-2 mt-1 max-w-xs">
            {categoryConfig.description}
          </p>
        </div>

        {/* Right: Clean, Responsive SVG Semicircular Gauge */}
        <div className="w-28 h-18 sm:w-36 sm:h-22 relative flex items-center justify-center shrink-0">
          <svg viewBox="0 0 180 105" className="w-full h-full overflow-hidden">
            <defs>
              {/* Linear Gradient for Scale Arc */}
              <linearGradient id="aqiArcGradClean" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="20%" stopColor="#22c55e" />
                <stop offset="45%" stopColor="#f59e0b" />
                <stop offset="65%" stopColor="#f97316" />
                <stop offset="85%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#7e22ce" />
              </linearGradient>
            </defs>

            {/* Background Base Track */}
            <path
              d="M 22,95 A 68,68 0 0,1 158,95"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="9"
              strokeLinecap="round"
            />

            {/* Colored Telemetry Scale Arc */}
            <path
              d="M 22,95 A 68,68 0 0,1 158,95"
              fill="none"
              stroke="url(#aqiArcGradClean)"
              strokeWidth="7.5"
              strokeLinecap="round"
            />

            {/* Calibrated Tick Marks */}
            {[0, 36, 72, 108, 144, 180].map((deg, idx) => {
              const rad = ((deg - 180) * Math.PI) / 180;
              const x1 = 90 + 73 * Math.cos(rad);
              const y1 = 95 + 73 * Math.sin(rad);
              const x2 = 90 + 79 * Math.cos(rad);
              const y2 = 95 + 79 * Math.sin(rad);
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Correctly Transformed Needle pivoting about (90, 95) */}
            <g
              transform={`rotate(${needleAngle}, 90, 95)`}
              style={{ transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              <line
                x1="90"
                y1="95"
                x2="90"
                y2="38"
                stroke="#ffffff"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <polygon points="87,42 93,42 90,30" fill="#ffffff" />
            </g>

            {/* Central Dial Hub Cover */}
            <circle cx="90" cy="95" r="8" fill="#0f172a" stroke="#ffffff" strokeWidth="2.5" />
            <circle cx="90" cy="95" r="3.5" fill={categoryConfig.accent} />
          </svg>
        </div>
      </div>

      {/* 6-Band Horizontal Visual Scale — Readable & Responsive */}
      <div className="pt-2.5 border-t border-white/20 relative z-10 mt-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 gap-1 flex-wrap">
          <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-100/90">
            AQI Scale (CPCB)
          </span>
          <span className="text-[11px] font-normal text-white/85">
            Band: <span className="font-semibold text-white ml-1">{category}</span>
          </span>
        </div>

        {/* Scale Bands — horizontal scroll on very small screens */}
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="grid grid-cols-6 gap-1 min-w-[280px] text-center">
            {scaleBands.map((b) => {
              const isCurrent = category.toLowerCase() === b.label.toLowerCase();
              return (
                <div
                  key={b.label}
                  className={`flex flex-col items-center gap-0.5 rounded-[4px] px-0.5 py-1 transition-all ${
                    isCurrent
                      ? "bg-white/20 ring-1 ring-white/60 shadow-sm"
                      : ""
                  }`}
                >
                  {/* Color swatch */}
                  <div
                    className={`w-full h-3 sm:h-3.5 rounded-[3px] ${b.bgClass} ${
                      isCurrent ? "ring-2 ring-white shadow-sm scale-105" : "opacity-90"
                    }`}
                  />
                  {/* Category label */}
                  <span
                    className={`text-[10px] sm:text-[11px] block leading-tight mt-0.5 ${
                      isCurrent ? "font-semibold text-white" : "font-normal text-white/85"
                    }`}
                    style={{ wordBreak: "break-word" }}
                  >
                    {b.label}
                  </span>
                  {/* Range */}
                  <span
                    className={`text-[9px] sm:text-[10px] leading-none ${
                      isCurrent ? "font-medium text-emerald-100" : "font-normal text-white/60"
                    }`}
                  >
                    {b.range}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
