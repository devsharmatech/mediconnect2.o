"use client";

import React from "react";

/**
 * AnimatedCheckmark
 * Elegant green circular checkmark badge with SVG draw animation, subtle ripple ring,
 * and optional celebration particles for completion states (B03, B04, B05, B13, B17).
 */
export default function AnimatedCheckmark({
  size = "md", // 'sm' (36px), 'md' (56px), 'lg' (72px)
  className = "",
  label = null,
  showParticles = false,
}) {
  const sizeMap = {
    sm: "w-9 h-9",
    md: "w-14 h-14",
    lg: "w-18 h-18",
  };

  const dim = size === "sm" ? 36 : size === "lg" ? 72 : 56;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${sizeMap[size] || sizeMap.md}`}>
        <svg
          viewBox="0 0 64 64"
          className="w-full h-full drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Soft Glow Circle */}
          <circle
            cx="32"
            cy="32"
            r="30"
            fill="#dcfce7"
            className="animate-pulse"
            style={{ animationDuration: "3s" }}
          />

          {/* Solid Green Main Circle */}
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="#059669"
            stroke="#10b981"
            strokeWidth="1.5"
          />

          {/* Animated Checkmark Path */}
          <path
            d="M 20 33 L 28 41 L 44 24"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="40"
            strokeDashoffset="0"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="40"
              to="0"
              dur="0.6s"
              fill="freeze"
            />
          </path>
        </svg>

        {/* Floating Celebration Particles (if enabled) */}
        {showParticles && (
          <div className="absolute inset-0 pointer-events-none">
            <span
              className="absolute -top-1 left-2 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"
              style={{ animationDuration: "1.8s" }}
            />
            <span
              className="absolute -top-2 right-3 w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping"
              style={{ animationDuration: "2.2s", animationDelay: "0.3s" }}
            />
            <span
              className="absolute bottom-0 -left-1 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"
              style={{ animationDuration: "2s", animationDelay: "0.5s" }}
            />
            <span
              className="absolute bottom-1 -right-1 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"
              style={{ animationDuration: "2.5s", animationDelay: "0.2s" }}
            />
          </div>
        )}
      </div>
      {label && (
        <span className="mt-2 text-xs font-bold text-emerald-800 text-center">
          {label}
        </span>
      )}
    </div>
  );
}
