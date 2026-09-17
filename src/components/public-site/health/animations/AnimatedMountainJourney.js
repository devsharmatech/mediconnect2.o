"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * AnimatedMountainJourney
 * Beautiful animated SVG illustrating B02 LungConnect Journey (ui2.png).
 * Features mountain ridges, ascending climber, glowing trail checkpoints, and a waving summit flag.
 */
export default function AnimatedMountainJourney({
  currentDay = 15,
  nextDay = 30,
  className = "",
}) {
  return (
    <div className={`relative w-full overflow-hidden rounded-[5px] bg-gradient-to-br from-sky-50 via-teal-50/50 to-blue-50 border border-slate-200 p-3.5 sm:p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left Text Block */}
        <div className="space-y-1 w-full text-center sm:text-left">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block">
            Current Position
          </span>
          <div className="flex items-baseline justify-center sm:justify-start gap-2">
            <span className="text-2xl sm:text-4xl font-bold font-mono text-[#003358]">
              Day {currentDay}
            </span>
            <span className="text-xs text-slate-500 font-normal">of your journey</span>
          </div>
          <p className="text-xs text-slate-600 font-normal">
            Next Checkpoint at <strong className="text-[#0067A1] font-semibold">Day {nextDay}</strong> ({Math.max(0, nextDay - currentDay)} days to go)
          </p>
        </div>

        {/* Mountain Illustration SVG */}
        <div className="w-40 sm:w-48 h-24 sm:h-28 relative shrink-0">
          <svg
            viewBox="0 0 200 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="100%" stopColor="#f0f9ff" />
              </linearGradient>
              <linearGradient id="mountainBack" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
              <linearGradient id="mountainMid" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="mountainFore" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#003358" />
              </linearGradient>
            </defs>

            {/* Sun / Sky Highlight */}
            <circle cx="150" cy="28" r="14" fill="#fef08a" opacity="0.6" />
            <motion.circle
              cx="150"
              cy="28"
              r="18"
              fill="#fde047"
              opacity="0.25"
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Distant Mountain Peak */}
            <polygon points="100,120 150,35 190,120" fill="url(#mountainBack)" opacity="0.7" />
            <polygon points="135,55 150,35 165,55 155,60 145,58" fill="#ffffff" opacity="0.8" />

            {/* Middle Mountain Ridge */}
            <polygon points="30,120 90,45 160,120" fill="url(#mountainMid)" opacity="0.85" />
            <polygon points="78,60 90,45 102,60 95,65 85,63" fill="#ffffff" opacity="0.9" />

            {/* Summit Foreground Mountain */}
            <polygon points="90,120 160,25 210,120" fill="url(#mountainFore)" />
            <polygon points="148,42 160,25 174,42 166,47 154,45" fill="#ffffff" />

            {/* Summit Flagpole & Waving Green Flag */}
            <line x1="160" y1="25" x2="160" y2="10" stroke="#003358" strokeWidth="2" />
            <motion.path
              d="M 160 10 Q 172 12 178 15 Q 170 20 160 21 Z"
              fill="#059669"
              animate={{
                d: [
                  "M 160 10 Q 172 12 178 15 Q 170 20 160 21 Z",
                  "M 160 10 Q 170 8 180 12 Q 172 18 160 21 Z",
                  "M 160 10 Q 172 12 178 15 Q 170 20 160 21 Z",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Ascending Trail Curve */}
            <path
              d="M 20 115 Q 60 105 85 92 T 120 68 T 150 40 T 160 25"
              stroke="#f8fafc"
              strokeWidth="3.5"
              strokeDasharray="4 3"
              fill="none"
              opacity="0.9"
            />

            {/* Checkpoint Dots on Trail */}
            <circle cx="35" cy="110" r="3.5" fill="#059669" />
            <circle cx="75" cy="96" r="3.5" fill="#059669" />
            <circle cx="115" cy="72" r="4.5" fill="#0067A1" stroke="#ffffff" strokeWidth="1.5" />

            {/* Hiker / Climber Figure on Trail at Day 15 */}
            <motion.g
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Head */}
              <circle cx="114" cy="62" r="2.8" fill="#003358" />
              {/* Backpack */}
              <rect x="108" y="65" width="3.5" height="5" rx="1.5" fill="#0284c7" />
              {/* Body */}
              <path d="M 114 65 L 115 72" stroke="#003358" strokeWidth="2.5" strokeLinecap="round" />
              {/* Walking stick */}
              <line x1="117" y1="67" x2="119" y2="74" stroke="#64748b" strokeWidth="1.2" />
              {/* Legs */}
              <line x1="114" y1="72" x2="112" y2="76" stroke="#003358" strokeWidth="2" strokeLinecap="round" />
              <line x1="115" y1="72" x2="117" y2="75" stroke="#003358" strokeWidth="2" strokeLinecap="round" />
            </motion.g>

            {/* Floating Clouds */}
            <motion.g
              animate={{ x: [0, 15, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              opacity="0.75"
            >
              <ellipse cx="45" cy="30" rx="14" ry="6" fill="#ffffff" />
              <circle cx="40" cy="26" r="7" fill="#ffffff" />
              <circle cx="50" cy="27" r="6" fill="#ffffff" />
            </motion.g>
          </svg>
        </div>
      </div>
    </div>
  );
}
