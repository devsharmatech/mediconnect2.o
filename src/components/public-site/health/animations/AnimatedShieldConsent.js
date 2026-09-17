"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * AnimatedShieldConsent
 * Medical privacy shield SVG with dynamic checkmark draw matching B17 & B18.
 */
export default function AnimatedShieldConsent({
  size = "md", // 'sm' | 'md' | 'lg'
  isVerified = true,
  className = "",
}) {
  const dimensions = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  }[size] || "w-16 h-16";

  return (
    <div className={`relative flex items-center justify-center ${dimensions} ${className}`}>
      {/* Background Ripple */}
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full blur-md bg-emerald-500/20"
      />

      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10">
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0067A1" />
            <stop offset="100%" stopColor="#003358" />
          </linearGradient>
        </defs>

        {/* Shield Outer Path */}
        <path
          d="M 50 10 Q 75 14 85 24 C 85 58, 70 80, 50 92 C 30 80, 15 58, 15 24 Q 25 14 50 10 Z"
          fill="url(#shieldGrad)"
          stroke="#38bdf8"
          strokeWidth="2.5"
        />

        {/* Inner Shield Contour */}
        <path
          d="M 50 18 Q 70 21 78 29 C 78 55, 66 73, 50 83 C 34 73, 22 55, 22 29 Q 30 21 50 18 Z"
          fill="#002b4a"
          opacity="0.75"
        />

        {/* Animated Checkmark Draw */}
        {isVerified ? (
          <motion.path
            d="M 34 50 L 46 62 L 68 38"
            stroke="#22c55e"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut", repeat: Infinity, repeatDelay: 3 }}
          />
        ) : (
          <path
            d="M 38 38 L 62 62 M 62 38 L 38 62"
            stroke="#f43f5e"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}
