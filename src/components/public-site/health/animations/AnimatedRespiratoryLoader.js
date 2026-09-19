"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * AnimatedRespiratoryLoader
 * High-precision medical respiratory loading state.
 * Displays smooth pulmonary expansion and contraction with oxygen flow particles,
 * tidal volume rhythm, and clinical biomarker synchronization status.
 */
export default function AnimatedRespiratoryLoader({
  title = "Loading physiological statistics...",
  subtitle = "Aggregating historical assessment records & respiratory biomarkers",
  compact = false,
  className = "",
}) {
  if (compact) {
    return (
      <div className={`flex items-center gap-3 py-3 px-4 ${className}`}>
        <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-sky-500/20 animate-ping" />
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 text-[#0067A1]"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v9m0 0l-3-3m3 3l3-3M6.5 10C4 12 3 15 4 18c1 3 4 4 8 4s7-1 8-4c1-3 0-6-2.5-8" />
            </svg>
          </motion.div>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{title}</p>
          {subtitle && <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-4 ${className}`}>
      {/* ── Center Animated Pulmonary Orb ── */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Soft breathing halo ring */}
        <motion.div
          animate={{ scale: [0.95, 1.25, 0.95], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-400/20 to-teal-400/20 filter blur-sm"
        />
        <span className="absolute -inset-2 rounded-full border-2 border-sky-300/30 animate-pulse" />

        {/* Medical glass badge */}
        <div className="relative w-18 h-18 rounded-2xl bg-gradient-to-br from-sky-50 via-white to-teal-50 border border-sky-200/80 flex items-center justify-center shadow-lg shadow-sky-100/80">
          {/* Anatomical Breathing Lungs SVG with continuous expansion/contraction */}
          <motion.div
            animate={{
              scale: [0.92, 1.14, 0.92],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative flex items-center justify-center"
          >
            <svg
              viewBox="0 0 64 64"
              className="w-11 h-11 drop-shadow-sm"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="lungLoadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="60%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#003358" />
                </linearGradient>
              </defs>
              {/* Trachea & Main Bronchi */}
              <path
                d="M32 8 V24 M32 24 L22 34 M32 24 L42 34"
                stroke="#0284c7"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Tracheal Rings */}
              <line x1="29" y1="12" x2="35" y2="12" stroke="#bae6fd" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="29" y1="16" x2="35" y2="16" stroke="#bae6fd" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="29" y1="20" x2="35" y2="20" stroke="#bae6fd" strokeWidth="1.5" strokeLinecap="round" />

              {/* Left Lung Lobe */}
              <path
                d="M20 28 C15 28 8 32 8 43 C8 53 14 58 22 58 C26 58 29 54 30 48 C30 40 28 32 20 28 Z"
                fill="url(#lungLoadGrad)"
                opacity="0.9"
              />
              {/* Right Lung Lobe */}
              <path
                d="M44 28 C49 28 56 32 56 43 C56 53 50 58 42 58 C38 58 35 54 34 48 C34 40 36 32 44 28 Z"
                fill="url(#lungLoadGrad)"
                opacity="0.9"
              />

              {/* Bronchial arbor accents */}
              <path
                d="M17 38 Q14 44 19 49 M47 38 Q50 44 45 49"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.75"
              />
            </svg>
          </motion.div>
        </div>

        {/* Live Active Telemetry Beacon */}
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-teal-500 border-2 border-white shadow-xs" />
        </span>
      </div>

      {/* ── Flowing Tidal Volume Rhythm Wave ── */}
      <div className="w-56 h-7 relative flex items-center justify-center overflow-hidden">
        <svg className="w-full h-full text-sky-600" viewBox="0 0 200 24" fill="none">
          <line x1="0" y1="12" x2="200" y2="12" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />
          <motion.path
            d="M 0 12 C 25 2, 35 22, 60 12 C 85 2, 95 22, 120 12 C 145 2, 155 22, 180 12 H 200"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathOffset: 0 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </svg>
      </div>

      {/* ── Status Text & Biomarker Subtitle ── */}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-slate-800 tracking-tight flex items-center justify-center gap-2">
          <span>{title}</span>
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-500 font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* ── Smooth Gradient Shimmer Line ── */}
      <div className="w-44 h-1 bg-slate-100 rounded-full overflow-hidden relative mt-1">
        <motion.div
          className="h-full bg-gradient-to-r from-transparent via-[#0067A1] to-transparent w-1/2 rounded-full"
          animate={{ x: ["-100%", "250%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
