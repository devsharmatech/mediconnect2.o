"use client";

import React from "react";

/**
 * AnimatedHeartbeat
 * Pulsing, beating heart SVG with realistic cardiac rhythm animation.
 * Used across CardioConnect cards and hero banner for an "active/alive" feel.
 */
export default function AnimatedHeartbeat({
  size = "md", // 'sm' | 'md' | 'lg' | 'xl'
  color = "#0067A1", // brand blue default
  glowColor = null, // optional glow ring color
  className = "",
}) {
  const sizeMap = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const dim = sizeMap[size] || sizeMap.md;
  const glow = glowColor || color;

  return (
    <div className={`relative inline-flex items-center justify-center ${dim} ${className}`}>
      {/* Soft radiating glow pulse */}
      <span
        className="absolute inset-0 rounded-full opacity-30"
        style={{
          background: `radial-gradient(circle, ${glow}44 0%, transparent 70%)`,
          animation: "heartGlow 1.1s ease-in-out infinite",
        }}
      />

      {/* Heart SVG */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-sm"
        style={{ animation: "heartBeat 1.1s ease-in-out infinite" }}
      >
        <defs>
          <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.75" />
          </linearGradient>
        </defs>
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="url(#heartGrad)"
          stroke={color}
          strokeWidth="0.5"
        />
        {/* ECG line accent across the heart */}
        <path
          d="M5 12h3l1.5-3 2 6 1.5-4 1 2h5"
          stroke="white"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
          strokeDasharray="30"
          strokeDashoffset="0"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="30"
            to="0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>
      </svg>

      {/* Keyframe styles */}
      <style jsx>{`
        @keyframes heartBeat {
          0% { transform: scale(1); }
          14% { transform: scale(1.15); }
          28% { transform: scale(1); }
          42% { transform: scale(1.1); }
          56% { transform: scale(1); }
          100% { transform: scale(1); }
        }
        @keyframes heartGlow {
          0% { transform: scale(0.85); opacity: 0.2; }
          14% { transform: scale(1.3); opacity: 0.45; }
          28% { transform: scale(0.9); opacity: 0.2; }
          42% { transform: scale(1.2); opacity: 0.35; }
          56% { transform: scale(0.9); opacity: 0.15; }
          100% { transform: scale(0.85); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
