"use client";

import React from "react";

/**
 * AnimatedWalkingFigure
 * Animated walking person SVG with leg/arm movement cycle.
 * Used in CardioConnect for Activity Type indicator and Today's Movement card.
 */
export default function AnimatedWalkingFigure({
  size = "md", // 'sm' | 'md' | 'lg'
  color = "#059669", // emerald default
  className = "",
}) {
  const sizeMap = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const dim = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative inline-flex items-center justify-center ${dim} ${className}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        {/* Head */}
        <circle cx="32" cy="10" r="6" fill={color} />

        {/* Body */}
        <line
          x1="32" y1="16" x2="32" y2="36"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Left arm - swinging forward */}
        <line
          x1="32" y1="22" x2="22" y2="32"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="-15 32 22"
            to="15 32 22"
            dur="0.7s"
            repeatCount="indefinite"
            values="-15 32 22; 15 32 22; -15 32 22"
            keyTimes="0; 0.5; 1"
          />
        </line>

        {/* Right arm - swinging backward */}
        <line
          x1="32" y1="22" x2="42" y2="32"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="15 32 22"
            to="-15 32 22"
            dur="0.7s"
            repeatCount="indefinite"
            values="15 32 22; -15 32 22; 15 32 22"
            keyTimes="0; 0.5; 1"
          />
        </line>

        {/* Left leg - stepping forward */}
        <line
          x1="32" y1="36" x2="22" y2="54"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="15 32 36"
            to="-15 32 36"
            dur="0.7s"
            repeatCount="indefinite"
            values="15 32 36; -15 32 36; 15 32 36"
            keyTimes="0; 0.5; 1"
          />
        </line>

        {/* Right leg - stepping backward */}
        <line
          x1="32" y1="36" x2="42" y2="54"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="-15 32 36"
            to="15 32 36"
            dur="0.7s"
            repeatCount="indefinite"
            values="-15 32 36; 15 32 36; -15 32 36"
            keyTimes="0; 0.5; 1"
          />
        </line>
      </svg>
    </div>
  );
}
