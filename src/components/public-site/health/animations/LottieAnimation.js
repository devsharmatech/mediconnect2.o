"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";

// Dynamically import Lottie from lottie-react to prevent SSR issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/**
 * Lightweight Built-in Lottie Bodymovin Presets
 * Clean, mathematically verified JSON animations for medical & wellness micro-interactions.
 */
const BUILTIN_LOTTIE_PRESETS = {
  // Celebration Confetti / Sparkle Lottie JSON
  celebration: {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: "Celebration",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Star1",
        sr: 1,
        ks: {
          o: { a: 1, k: [{ t: 0, s: [0] }, { t: 15, s: [100] }, { t: 50, s: [0] }] },
          r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [180] }] },
          p: { a: 1, k: [{ t: 0, s: [50, 50, 0] }, { t: 60, s: [25, 20, 0] }] },
          s: { a: 1, k: [{ t: 0, s: [0, 0, 100] }, { t: 25, s: [120, 120, 100] }, { t: 60, s: [40, 40, 100] }] },
        },
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ty: "sr",
                sy: 1,
                p: { a: 0, k: [0, 0] },
                r: { a: 0, k: 0 },
                or: { a: 0, k: 8 },
                ir: { a: 0, k: 4 },
                pt: { a: 0, k: 5 },
                nm: "Star",
              },
              { ty: "fl", c: { a: 0, k: [0.98, 0.75, 0.14, 1] }, nm: "GoldFill" },
              { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
            ],
          },
        ],
      },
      {
        ddd: 0,
        ind: 2,
        ty: 4,
        nm: "Sparkle2",
        sr: 1,
        ks: {
          o: { a: 1, k: [{ t: 10, s: [0] }, { t: 25, s: [100] }, { t: 60, s: [0] }] },
          r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [-120] }] },
          p: { a: 1, k: [{ t: 0, s: [50, 50, 0] }, { t: 60, s: [78, 25, 0] }] },
          s: { a: 1, k: [{ t: 10, s: [0, 0, 100] }, { t: 35, s: [100, 100, 100] }, { t: 60, s: [20, 20, 100] }] },
        },
        shapes: [
          {
            ty: "gr",
            it: [
              { ty: "el", s: { a: 0, k: [8, 8] }, p: { a: 0, k: [0, 0] }, nm: "Circle" },
              { ty: "fl", c: { a: 0, k: [0.0, 0.65, 0.45, 1] }, nm: "EmeraldFill" },
              { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
            ],
          },
        ],
      },
      {
        ddd: 0,
        ind: 3,
        ty: 4,
        nm: "Sparkle3",
        sr: 1,
        ks: {
          o: { a: 1, k: [{ t: 5, s: [0] }, { t: 20, s: [100] }, { t: 55, s: [0] }] },
          r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [90] }] },
          p: { a: 1, k: [{ t: 0, s: [50, 50, 0] }, { t: 60, s: [75, 75, 0] }] },
          s: { a: 1, k: [{ t: 5, s: [0, 0, 100] }, { t: 30, s: [110, 110, 100] }, { t: 55, s: [30, 30, 100] }] },
        },
        shapes: [
          {
            ty: "gr",
            it: [
              { ty: "el", s: { a: 0, k: [10, 10] }, p: { a: 0, k: [0, 0] }, nm: "Circle" },
              { ty: "fl", c: { a: 0, k: [0.0, 0.4, 0.63, 1] }, nm: "BlueFill" },
              { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
            ],
          },
        ],
      },
    ],
  },

  // Breathing Rhythm Ring
  breathing: {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 120,
    w: 120,
    h: 120,
    nm: "BreathingRhythm",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "BreathingSphere",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [60, 60, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [60, 60, 100] },
              { t: 40, s: [115, 115, 100] },
              { t: 60, s: [115, 115, 100] },
              { t: 100, s: [60, 60, 100] },
              { t: 120, s: [60, 60, 100] },
            ],
          },
        },
        shapes: [
          {
            ty: "gr",
            it: [
              { ty: "el", s: { a: 0, k: [50, 50] }, p: { a: 0, k: [0, 0] }, nm: "Core" },
              { ty: "fl", c: { a: 0, k: [0.0, 0.4, 0.63, 0.4] }, nm: "SoftBlue" },
              { ty: "st", c: { a: 0, k: [0.0, 0.2, 0.35, 0.9] }, w: { a: 0, k: 3 }, nm: "Border" },
              { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
            ],
          },
        ],
      },
    ],
  },

  // Loading Medical Triple Spinner
  loading: {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 60,
    w: 60,
    h: 60,
    nm: "LoadingSpinner",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "SpinnerArc",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [360] }] },
          p: { a: 0, k: [30, 30, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        shapes: [
          {
            ty: "gr",
            it: [
              { ty: "el", s: { a: 0, k: [40, 40] }, p: { a: 0, k: [0, 0] }, nm: "Circle" },
              {
                ty: "st",
                c: { a: 0, k: [0.0, 0.4, 0.63, 1] },
                w: { a: 0, k: 4 },
                d: [{ n: "d", v: { a: 0, k: 60 } }, { n: "g", v: { a: 0, k: 40 } }],
                nm: "Stroke",
              },
              { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
            ],
          },
        ],
      },
    ],
  },
};

class SafeLottieErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("LottieAnimation caught runtime error gracefully:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center w-full h-full text-amber-500 animate-pulse">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * LottieAnimation
 * Universal client-side Lottie player supporting built-in presets ('celebration', 'breathing', 'loading')
 * or custom Bodymovin JSON animationData.
 */
export default function LottieAnimation({
  type = null, // 'celebration' | 'breathing' | 'loading'
  animationData = null,
  loop = true,
  autoplay = true,
  className = "w-24 h-24",
  fallback = null,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeData = useMemo(() => {
    if (animationData) return animationData;
    if (type && BUILTIN_LOTTIE_PRESETS[type]) {
      return BUILTIN_LOTTIE_PRESETS[type];
    }
    return BUILTIN_LOTTIE_PRESETS.loading;
  }, [animationData, type]);

  if (!mounted) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {fallback || <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />}
      </div>
    );
  }

  return (
    <SafeLottieErrorBoundary>
      <div className={`flex items-center justify-center ${className}`}>
        <Lottie
          animationData={activeData}
          loop={loop}
          autoPlay={autoplay}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </SafeLottieErrorBoundary>
  );
}

