"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * AnimatedCardioLoader
 * High-precision medical cardiovascular loading state.
 * Replaces generic spinning squares with an authentic animated cardiac telemetry pulse,
 * rhythmic heart contractions, radiating pulse rings, and continuous ECG signal wave.
 */
export default function AnimatedCardioLoader({
  title = "Loading cardiovascular statistics...",
  subtitle = "Aggregating historical assessment records & cardiac telemetry",
  compact = false,
  className = "",
}) {
  if (compact) {
    return (
      <div className={`flex items-center gap-3 py-3 px-4 ${className}`}>
        <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-[#0067A1]/20 animate-ping" />
          <motion.div
            animate={{ scale: [1, 1.2, 1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 text-[#0067A1]"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" stroke="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
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
      {/* ── Center Animated Cardiac Telemetry Orb ── */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Radiating concentric pulse rings */}
        <span className="absolute inset-0 rounded-full bg-[#0067A1]/15 animate-ping opacity-60" style={{ animationDuration: "1.8s" }} />
        <span className="absolute -inset-2 rounded-full border-2 border-[#0067A1]/20 animate-pulse" />
        
        {/* Medical glass badge */}
        <div className="relative w-18 h-18 rounded-2xl bg-gradient-to-br from-sky-50 via-white to-blue-50 border border-sky-200/80 flex items-center justify-center shadow-lg shadow-sky-100/80">
          {/* Beating Heart SVG with ECG rhythm */}
          <motion.div
            animate={{
              scale: [1, 1.18, 1.02, 1.14, 1],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative flex items-center justify-center"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-10 h-10 drop-shadow-sm"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="cardioLoaderHeartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0067A1" />
                  <stop offset="50%" stopColor="#0080C6" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="url(#cardioLoaderHeartGrad)"
                stroke="#0067A1"
                strokeWidth="0.5"
              />
              {/* Crisp illuminated ECG spike across the heart */}
              <path
                d="M5 12h2.5l1.2-3.5 2.2 7 1.8-5 1.1 2.2h5.2"
                stroke="#ffffff"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-95"
              />
            </svg>
          </motion.div>
        </div>

        {/* Live Active Telemetry Beacon */}
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-xs" />
        </span>
      </div>

      {/* ── Flowing ECG Waveform Monitor Line ── */}
      <div className="w-56 h-7 relative flex items-center justify-center overflow-hidden">
        <svg className="w-full h-full text-[#0067A1]" viewBox="0 0 200 24" fill="none">
          {/* Subtle baseline track */}
          <line x1="0" y1="12" x2="200" y2="12" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />
          
          {/* Flowing clinical ECG pulse */}
          <motion.path
            d="M 0 12 H 40 L 46 9 L 50 15 L 56 -1 L 64 25 L 70 6 L 75 14 L 80 12 H 200"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathOffset: 0 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{
              duration: 1.8,
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
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
