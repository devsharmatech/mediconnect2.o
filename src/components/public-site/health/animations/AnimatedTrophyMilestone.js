"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * AnimatedTrophyMilestone
 * Golden animated trophy SVG with sparkling sheen matching B10 Milestones (ui15.png).
 */
export default function AnimatedTrophyMilestone({
  size = "md", // 'sm' | 'md' | 'lg'
  unlockedCount = 6,
  totalCount = 12,
  showBadge = true,
  className = "",
}) {
  const dimensions = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
  }[size] || "w-20 h-20";

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${dimensions} flex items-center justify-center`}>
        {/* Radiating Sparkles */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full blur-md bg-amber-400/30"
        />

        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10">
          <defs>
            <linearGradient id="trophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <linearGradient id="trophyPedestal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>

          {/* Pedestal Base */}
          <rect x="30" y="80" width="40" height="12" rx="3" fill="url(#trophyPedestal)" />
          <rect x="36" y="74" width="28" height="7" rx="1.5" fill="#64748b" />
          <rect x="44" y="62" width="12" height="13" rx="2" fill="url(#trophyGold)" />

          {/* Left Handle */}
          <path
            d="M 32 30 C 18 30 18 52 34 54"
            stroke="url(#trophyGold)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Right Handle */}
          <path
            d="M 68 30 C 82 30 82 52 66 54"
            stroke="url(#trophyGold)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Trophy Cup Body */}
          <path
            d="M 30 20 C 30 20 28 62 50 62 C 72 62 70 20 70 20 Z"
            fill="url(#trophyGold)"
          />

          {/* Shining Cup Lip */}
          <ellipse cx="50" cy="20" rx="20" ry="4.5" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />

          {/* Animated Reflection Sheen */}
          <motion.path
            d="M 38 24 Q 40 45 48 56"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.65"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Star Embellishment on Cup */}
          <polygon
            points="50,30 52,36 58,36 53,40 55,46 50,42 45,46 47,40 42,36 48,36"
            fill="#ffffff"
            opacity="0.9"
          />

          {/* Floating Stars */}
          <motion.g
            animate={{ scale: [0.8, 1.2, 0.8], rotate: [0, 90, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: "20px", originY: "18px" }}
          >
            <polygon points="20,14 21,17 24,18 21,19 20,22 19,19 16,18 19,17" fill="#fde047" />
          </motion.g>
          <motion.g
            animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            style={{ originX: "80px", originY: "16px" }}
          >
            <polygon points="80,12 81,15 84,16 81,17 80,20 79,17 76,16 79,15" fill="#fde047" />
          </motion.g>
        </svg>
      </div>

      {showBadge && (
        <div className="text-center mt-1">
          <span className="text-base font-bold font-mono text-slate-800 block">
            {unlockedCount} / {totalCount}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Milestones Unlocked
          </span>
        </div>
      )}
    </div>
  );
}
