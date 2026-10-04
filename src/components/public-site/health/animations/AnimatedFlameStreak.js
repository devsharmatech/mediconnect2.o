"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * AnimatedFlameStreak
 * Dynamic multi-tier flickering SVG flame matching B10 Streaks (ui15.png / ui16.png).
 */
export default function AnimatedFlameStreak({
  days = 5,
  size = "md", // 'sm' | 'md' | 'lg'
  showCount = true,
  className = "",
}) {
  const isActive = days > 0;
  const dimensions = {
    sm: "w-10 h-12",
    md: "w-16 h-20",
    lg: "w-24 h-28",
  }[size] || "w-16 h-20";

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${dimensions} flex items-center justify-center`}>
        {/* Soft Radial Backlight Glow */}
        <motion.div
          animate={
            isActive
              ? {
                  scale: [1, 1.2, 0.95, 1.15, 1],
                  opacity: [0.35, 0.6, 0.4, 0.55, 0.35],
                }
              : {
                  scale: 1,
                  opacity: 0.15,
                }
          }
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute inset-0 rounded-full blur-lg ${
            isActive
              ? "bg-gradient-to-t from-amber-500 via-orange-500 to-red-500"
              : "bg-slate-300"
          }`}
        />

        <svg
          viewBox="0 0 100 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full relative z-10 drop-shadow-md transition-all ${
            isActive ? "" : "opacity-45 grayscale-[40%]"
          }`}
        >
          <defs>
            <linearGradient id="flameOuter" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="45%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="flameMid" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
            <linearGradient id="flameInner" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="80%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>

          {/* Outer Red/Orange Flame Layer */}
          <motion.path
            d="M 50 15 C 56 30, 85 55, 82 85 C 79 105, 65 115, 50 115 C 35 115, 21 105, 18 85 C 15 55, 44 30, 50 15 Z"
            fill="url(#flameOuter)"
            animate={{
              d: [
                "M 50 15 C 56 30, 85 55, 82 85 C 79 105, 65 115, 50 115 C 35 115, 21 105, 18 85 C 15 55, 44 30, 50 15 Z",
                "M 52 10 C 60 28, 88 52, 85 84 C 82 106, 64 116, 50 116 C 36 116, 18 104, 15 84 C 12 52, 42 26, 52 10 Z",
                "M 48 18 C 54 32, 82 58, 80 86 C 77 104, 66 114, 50 114 C 34 114, 23 106, 20 86 C 17 58, 43 32, 48 18 Z",
                "M 50 15 C 56 30, 85 55, 82 85 C 79 105, 65 115, 50 115 C 35 115, 21 105, 18 85 C 15 55, 44 30, 50 15 Z",
              ],
              scaleY: [1, 1.05, 0.98, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Middle Amber/Yellow Flame Layer */}
          <motion.path
            d="M 50 35 C 54 45, 74 65, 72 88 C 70 102, 60 110, 50 110 C 40 110, 30 102, 28 88 C 26 65, 46 45, 50 35 Z"
            fill="url(#flameMid)"
            animate={{
              d: [
                "M 50 35 C 54 45, 74 65, 72 88 C 70 102, 60 110, 50 110 C 40 110, 30 102, 28 88 C 26 65, 46 45, 50 35 Z",
                "M 52 30 C 58 44, 76 63, 74 87 C 72 101, 58 111, 50 111 C 42 111, 26 100, 26 87 C 24 63, 44 42, 52 30 Z",
                "M 48 38 C 52 46, 72 67, 70 89 C 68 103, 62 109, 50 109 C 38 109, 32 103, 30 89 C 28 67, 46 46, 48 38 Z",
                "M 50 35 C 54 45, 74 65, 72 88 C 70 102, 60 110, 50 110 C 40 110, 30 102, 28 88 C 26 65, 46 45, 50 35 Z",
              ],
            }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
          />

          {/* Core White/Hot Center */}
          <motion.path
            d="M 50 55 C 52 62, 62 76, 61 92 C 60 100, 54 105, 50 105 C 46 105, 40 100, 39 92 C 38 76, 48 62, 50 55 Z"
            fill="url(#flameInner)"
            animate={{
              scaleY: [1, 1.15, 0.92, 1],
              opacity: [0.9, 1, 0.85, 0.9],
            }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ originY: "95%", originX: "50%" }}
          />

          {/* Rising Embers / Sparks */}
          <motion.circle
            cx="48"
            cy="20"
            r="1.8"
            fill="#fef08a"
            animate={{
              cy: [25, 0],
              cx: [48, 52, 46],
              opacity: [1, 0],
              scale: [1, 0.5],
            }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.circle
            cx="55"
            cy="35"
            r="1.5"
            fill="#fde047"
            animate={{
              cy: [35, 8],
              cx: [55, 60, 56],
              opacity: [1, 0],
              scale: [1, 0.3],
            }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
          />
          <motion.circle
            cx="42"
            cy="40"
            r="1.2"
            fill="#ea580c"
            animate={{
              cy: [40, 15],
              cx: [42, 38, 41],
              opacity: [1, 0],
            }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
          />
        </svg>
      </div>

      {showCount && (
        <div className="text-center mt-1">
          <span className="text-xl font-bold font-mono text-slate-800 block leading-none">
            {days}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            {days === 1 ? "Day" : "Days"}
          </span>
        </div>
      )}
    </div>
  );
}
