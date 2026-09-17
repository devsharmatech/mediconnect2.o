"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, Pause } from "lucide-react";

/**
 * AnimatedStopwatch — Ultra-Modern Clinical Fitness Telemetry Gauge
 * Features:
 * - Accurate progress arc linked to actual elapsed session progress (not infinite loop)
 * - Compact, responsive typography and inner console
 * - Ambient dynamic glowing aura
 * - Precision radial calibration micro-ticks (60 steps)
 * - Smooth rotating gradient progress track with glowing tip particle
 */
export default function AnimatedStopwatch({
  isActive = false,
  isPaused = false,
  size = "md",
  timeString = "00:00",
  label = "4.5 km/h",
  subLabel = "reference pace",
  progress = null,
  secondsElapsed = null,
  totalSeconds = null,
  className = "",
}) {
  const dimensionClass = {
    sm: "w-36 h-36 sm:w-40 sm:h-40",
    md: "w-44 h-44 sm:w-48 sm:h-48 max-w-full",
    lg: "w-52 h-52 sm:w-56 sm:h-56 max-w-full",
    responsive: "w-36 h-36 sm:w-44 sm:h-44 max-w-full",
  }[size] || "w-44 h-44 sm:w-48 sm:h-48 max-w-full";

  // Geometry constants (viewBox 0 0 240 240, Center = 120, 120)
  const CX = 120;
  const CY = 120;
  const R_OUTER = 108;
  const R_ARC = 94;
  const ARC_CIRCUMFERENCE = 2 * Math.PI * R_ARC; // ≈ 590.62

  // Helper: polar to cartesian
  const polar = (r, angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  };

  // Double-line parse for secondary context badge (e.g. "4.5 km/h" and "reference pace")
  const { line1, line2 } = useMemo(() => {
    if (subLabel) {
      return { line1: String(label || "").trim(), line2: String(subLabel).trim() };
    }
    if (!label) return { line1: "", line2: "" };

    const raw = String(label).trim();
    if (raw.includes("\n")) {
      const [first, ...rest] = raw.split("\n");
      return { line1: first.trim(), line2: rest.join(" ").trim() };
    }
    if (/reference\s*pace/i.test(raw)) {
      return {
        line1: raw.replace(/reference\s*pace/i, "").trim(),
        line2: "reference pace",
      };
    }
    if (/\bpace\b/i.test(raw) && !raw.toLowerCase().startsWith("pace")) {
      return {
        line1: raw.replace(/\bpace\b/i, "").trim(),
        line2: "pace",
      };
    }
    if (raw.includes(" / ")) {
      const parts = raw.split(" / ");
      return { line1: parts[0].trim(), line2: parts[1].trim() };
    }
    if (raw.includes(": ")) {
      const parts = raw.split(": ");
      return { line1: parts[0].trim(), line2: parts.slice(1).join(": ").trim() };
    }
    return { line1: raw, line2: "" };
  }, [label, subLabel]);

  // Calculate normalized progress (0 to 1) based on real session metrics
  const calculatedProgress = useMemo(() => {
    if (typeof progress === "number" && !isNaN(progress)) {
      const p = progress > 1 ? progress / 100 : progress;
      return Math.max(0, Math.min(1, p));
    }
    if (
      typeof secondsElapsed === "number" &&
      typeof totalSeconds === "number" &&
      totalSeconds > 0
    ) {
      return Math.max(0, Math.min(1, secondsElapsed / totalSeconds));
    }
    return 0;
  }, [progress, secondsElapsed, totalSeconds]);

  // Target strokeDashoffset: at 0 progress => full ARC_CIRCUMFERENCE; at 1 progress => 0
  const targetOffset = ARC_CIRCUMFERENCE * (1 - calculatedProgress);
  const beaconAngle = calculatedProgress * 360;

  return (
    <div className={`relative flex items-center justify-center select-none ${dimensionClass} ${className}`}>
      {/* 1. Dynamic Ambient Breathing Aura when Active */}
      {isActive && !isPaused && (
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.25, 0.45, 0.25],
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-2 rounded-full bg-gradient-to-tr from-sky-400/20 via-[#0067A1]/20 to-emerald-400/20 blur-xl pointer-events-none"
        />
      )}

      {/* 2. SVG Telemetry Dial & Progress Arc */}
      <svg
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
      >
        <defs>
          {/* Dial Face Background Gradient */}
          <radialGradient id="telemetry-face-bg" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#f0f9ff" />
          </radialGradient>

          {/* Active Progress Arc Gradient (MediConnect Cyan -> Sky -> Emerald) */}
          <linearGradient id="telemetry-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0067A1" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="85%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Subtle Outer Bezel Gradient */}
          <linearGradient id="telemetry-bezel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="50%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          {/* Glow Filter for tip beacon */}
          <filter id="telemetry-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Ring Casing */}
        <circle
          cx={CX}
          cy={CY}
          r={R_OUTER}
          fill="url(#telemetry-face-bg)"
          stroke="url(#telemetry-bezel)"
          strokeWidth="2.5"
        />

        {/* Inner Subtle Border Track */}
        <circle
          cx={CX}
          cy={CY}
          r={R_OUTER - 4}
          stroke="#f1f5f9"
          strokeWidth="1.5"
          fill="none"
        />

        {/* 60 Precision Telemetry Calibration Ticks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const isMajor = i % 5 === 0;
          const isCardinal = i % 15 === 0;
          const r1 = R_OUTER - 5;
          const r2 = isCardinal ? r1 - 7 : isMajor ? r1 - 5 : r1 - 3;
          const p1 = polar(r1, i * 6);
          const p2 = polar(r2, i * 6);

          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={isCardinal ? "#0067A1" : isMajor ? "#0284c7" : "#cbd5e1"}
              strokeWidth={isCardinal ? 1.8 : isMajor ? 1.3 : 0.75}
              strokeLinecap="round"
              opacity={isCardinal ? 0.9 : isMajor ? 0.7 : 0.4}
            />
          );
        })}

        {/* Inactive Track Arc */}
        <circle
          cx={CX}
          cy={CY}
          r={R_ARC}
          stroke="#e2e8f0"
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Secondary Concentric Calibration Ring */}
        <circle
          cx={CX}
          cy={CY}
          r={R_ARC - 10}
          stroke="#f1f5f9"
          strokeWidth="1"
          strokeDasharray="3 3"
          fill="none"
        />

        {/* Active Animated Progress Arc (Controlled by calculatedProgress) */}
        <motion.circle
          cx={CX}
          cy={CY}
          r={R_ARC}
          stroke={isPaused ? "#f59e0b" : "url(#telemetry-arc-grad)"}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={ARC_CIRCUMFERENCE}
          transform={`rotate(-90 ${CX} ${CY})`}
          animate={{
            strokeDashoffset:
              isActive || isPaused || calculatedProgress > 0
                ? targetOffset
                : ARC_CIRCUMFERENCE,
          }}
          transition={{
            duration: 0.35,
            ease: "easeOut",
          }}
        />

        {/* Orbiting Telemetry Tip Beacon (when active or paused and progress > 0) */}
        {(isActive || isPaused) && calculatedProgress > 0.005 && (
          <motion.g
            animate={{ rotate: beaconAngle }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          >
            {/* Outer soft glow halo */}
            <circle
              cx={CX}
              cy={CY - R_ARC}
              r="6"
              fill={isPaused ? "#f59e0b" : "#10b981"}
              opacity="0.4"
              filter="url(#telemetry-glow)"
            />
            {/* Crisp white/emerald core */}
            <circle cx={CX} cy={CY - R_ARC} r="4" fill={isPaused ? "#f59e0b" : "#10b981"} />
            <circle cx={CX} cy={CY - R_ARC} r="2" fill="#ffffff" />
          </motion.g>
        )}
      </svg>

      {/* 3. High-Precision Digital Telemetry Center Console - Double-Line & Compact */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
        {/* Status Indicator Pill */}
        <div className="flex items-center gap-1 mb-0.5">
          {isActive && !isPaused ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[8.5px] sm:text-[9px] font-bold text-emerald-700 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>TRACKING</span>
            </span>
          ) : isPaused ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[8.5px] sm:text-[9px] font-bold text-amber-700 shadow-2xs">
              <Pause className="w-2 h-2 fill-amber-500 text-amber-500" />
              <span>PAUSED</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[8.5px] sm:text-[9px] font-bold text-[#0067A1]">
              <Activity className="w-2 h-2" />
              <span>READY</span>
            </span>
          )}
        </div>

        {/* High-Contrast Monospace Timer - Scaled with reduced text size */}
        <motion.div
          key={timeString}
          initial={{ scale: 0.98, opacity: 0.85 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="text-xl sm:text-2xl font-black font-mono text-[#003358] tracking-tight leading-none drop-shadow-2xs my-0.5"
        >
          {timeString}
        </motion.div>

        {/* Secondary Context / Pace Badge - Double Line with reduced text size */}
        {(line1 || line2) && (
          <div className="mt-0.5 flex flex-col items-center justify-center px-2 py-0.5 rounded-[4px] bg-sky-50/90 border border-sky-200/80 shadow-2xs max-w-[100px] overflow-hidden">
            {line1 && (
              <span className="text-[9px] sm:text-[9.5px] font-bold text-[#0067A1] leading-tight tracking-tight whitespace-nowrap">
                {line1}
              </span>
            )}
            {line2 && (
              <span className="text-[7px] sm:text-[7.5px] font-semibold text-slate-500 uppercase tracking-wider leading-tight whitespace-nowrap mt-0.5">
                {line2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
