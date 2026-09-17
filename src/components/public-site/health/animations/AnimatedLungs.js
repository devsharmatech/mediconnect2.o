"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * AnimatedLungs
 * Ultra-attractive, anatomical SVG respiratory pumping visualizer.
 * Provides true physiological expansion/contraction animations, glowing bronchial tree,
 * pulsing alveolar clusters, interactive airflow particles, and phase-aware aura.
 *
 * Supports phases: 'inhale' | 'hold' | 'exhale' | 'idle' | 'active' | 'paused'
 */
export default function AnimatedLungs({
  size = "md", // 'sm' | 'md' | 'lg' | 'xl' | 'full'
  phase = "idle",
  duration = 4, // seconds per phase
  className = "",
  showAirflow = true,
  showAlveoli = true,
  showRibs = true,
}) {
  const normPhase = (phase || "idle").toString().toLowerCase();

  const dimensions = {
    sm: "w-14 h-14",
    md: "w-24 h-24",
    lg: "w-36 h-36",
    xl: "w-48 h-48",
    full: "w-full h-full",
  }[size] || "w-24 h-24";

  // Phase-reactive dynamic color palette
  const phaseColors = useMemo(() => {
    switch (normPhase) {
      case "inhale":
        return {
          gradStart: "#38bdf8", // Sky blue
          gradMid: "#0284c7",   // Vibrant cyan
          gradEnd: "#003358",   // Deep navy
          aura: "rgba(56, 189, 248, 0.45)",
          bronchi: "#67e8f9",
          alveoli: "#bae6fd",
          trachea: "#7dd3fc",
        };
      case "hold":
        return {
          gradStart: "#38bdf8",
          gradMid: "#0284c7",
          gradEnd: "#0f4c81",
          aura: "rgba(245, 158, 11, 0.38)", // Warm oxygenated amber glow
          bronchi: "#fbbf24",
          alveoli: "#fde68a",
          trachea: "#fcd34d",
        };
      case "exhale":
        return {
          gradStart: "#34d399", // Calming mint emerald
          gradMid: "#0067A1",
          gradEnd: "#00223d",
          aura: "rgba(52, 211, 153, 0.35)",
          bronchi: "#6ee7b7",
          alveoli: "#a7f3d0",
          trachea: "#6ee7b7",
        };
      default:
        return {
          gradStart: "#38bdf8",
          gradMid: "#0067A1",
          gradEnd: "#003358",
          aura: "rgba(0, 103, 161, 0.28)",
          bronchi: "#38bdf8",
          alveoli: "#bae6fd",
          trachea: "#94a3b8",
        };
    }
  }, [normPhase]);

  // Physiological organic expansion & contraction variants
  const leftLobeVariants = {
    idle: {
      scale: [1, 1.08, 1],
      rotate: [0, -1.5, 0],
      x: [0, -1.5, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    inhale: {
      scale: [1, 1.25],
      rotate: [0, -3.5],
      x: [0, -4],
      transition: { duration: duration, ease: [0.25, 1, 0.5, 1] },
    },
    hold: {
      scale: [1.25, 1.27, 1.25],
      rotate: [-3.5, -3.2, -3.5],
      x: -4,
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    },
    exhale: {
      scale: [1.25, 0.94],
      rotate: [-3.5, 0],
      x: [-4, 0],
      transition: { duration: duration, ease: [0.4, 0, 0.2, 1] },
    },
    paused: {
      scale: 1,
      rotate: 0,
      x: 0,
      transition: { duration: 0.5 },
    },
  };

  const rightLobeVariants = {
    idle: {
      scale: [1, 1.08, 1],
      rotate: [0, 1.5, 0],
      x: [0, 1.5, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    inhale: {
      scale: [1, 1.25],
      rotate: [0, 3.5],
      x: [0, 4],
      transition: { duration: duration, ease: [0.25, 1, 0.5, 1] },
    },
    hold: {
      scale: [1.25, 1.27, 1.25],
      rotate: [3.5, 3.2, 3.5],
      x: 4,
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    },
    exhale: {
      scale: [1.25, 0.94],
      rotate: [3.5, 0],
      x: [4, 0],
      transition: { duration: duration, ease: [0.4, 0, 0.2, 1] },
    },
    paused: {
      scale: 1,
      rotate: 0,
      x: 0,
      transition: { duration: 0.5 },
    },
  };

  // Alveoli sparkle & oxygenation glow
  const alveoliVariants = {
    idle: {
      opacity: [0.5, 0.9, 0.5],
      scale: [0.95, 1.15, 0.95],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
    },
    inhale: {
      opacity: [0.4, 1],
      scale: [0.9, 1.35],
      transition: { duration: duration, ease: "easeOut" },
    },
    hold: {
      opacity: [0.9, 1, 0.9],
      scale: [1.3, 1.4, 1.3],
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
    },
    exhale: {
      opacity: [1, 0.35],
      scale: [1.3, 0.85],
      transition: { duration: duration, ease: "easeIn" },
    },
    paused: {
      opacity: 0.6,
      scale: 1,
    },
  };

  // Airflow oxygen stream particles along the trachea and bronchi
  const particleTracheaVariants = {
    idle: {
      y: [0, 38],
      opacity: [0, 1, 0],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    },
    inhale: {
      y: [0, 48],
      opacity: [0, 1, 0.2],
      transition: { duration: duration * 0.7, repeat: Infinity, ease: "easeOut" },
    },
    hold: {
      y: 45,
      opacity: [0.3, 0.7, 0.3],
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
    },
    exhale: {
      y: [48, 0],
      opacity: [0.2, 0.8, 0],
      transition: { duration: duration * 0.7, repeat: Infinity, ease: "easeIn" },
    },
    paused: {
      opacity: 0,
    },
  };

  const activeVariant =
    normPhase === "inhale" || normPhase === "hold" || normPhase === "exhale" || normPhase === "paused"
      ? normPhase
      : "idle";

  return (
    <div className={`relative flex items-center justify-center select-none ${dimensions} ${className}`}>
      {/* Dynamic Multi-Tier Bioluminescent Respiratory Aura */}
      <motion.div
        animate={{
          scale:
            normPhase === "inhale"
              ? [1, 1.32]
              : normPhase === "hold"
              ? [1.32, 1.36, 1.32]
              : normPhase === "exhale"
              ? [1.32, 0.96]
              : [1, 1.15, 1],
          opacity:
            normPhase === "inhale"
              ? [0.3, 0.75]
              : normPhase === "hold"
              ? [0.75, 0.85, 0.75]
              : normPhase === "exhale"
              ? [0.75, 0.2]
              : [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: normPhase === "hold" ? 2 : duration,
          repeat: normPhase === "hold" || activeVariant === "idle" ? Infinity : 0,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-full blur-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${phaseColors.aura} 0%, rgba(2,132,199,0.12) 55%, transparent 75%)`,
        }}
      />

      <svg
        viewBox="0 0 240 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 overflow-visible drop-shadow-[0_8px_16px_rgba(0,51,88,0.18)]"
      >
        <defs>
          {/* Left Lung 3D Shader Gradient */}
          <linearGradient id="lungLeftGrad" x1="15%" y1="10%" x2="95%" y2="90%">
            <stop offset="0%" stopColor={phaseColors.gradStart} />
            <stop offset="45%" stopColor={phaseColors.gradMid} />
            <stop offset="100%" stopColor={phaseColors.gradEnd} />
          </linearGradient>

          {/* Right Lung 3D Shader Gradient */}
          <linearGradient id="lungRightGrad" x1="85%" y1="10%" x2="5%" y2="90%">
            <stop offset="0%" stopColor={phaseColors.gradStart} />
            <stop offset="45%" stopColor={phaseColors.gradMid} />
            <stop offset="100%" stopColor={phaseColors.gradEnd} />
          </linearGradient>

          {/* Specular Highlight Sheen Gradient */}
          <linearGradient id="lungSheen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Trachea Cartilage Gradient */}
          <linearGradient id="tracheaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="30%" stopColor="#e2e8f0" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#0067A1" />
          </linearGradient>

          {/* Airflow Lumen Glow */}
          <linearGradient id="lumenGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.9" />
            <stop offset="100%" stopColor={phaseColors.bronchi} stopOpacity="0.6" />
          </linearGradient>

          {/* Soft Filter Glow */}
          <filter id="alveoliGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── LEFT LUNG LOBE (Screen Left) ────────────────────── */}
        <motion.g
          variants={leftLobeVariants}
          animate={activeVariant}
          style={{ originX: "46%", originY: "48%" }}
        >
          {/* Main Anatomical Left Lung Body */}
          <path
            d="M 86 54 
               C 60 56, 32 82, 26 122 
               C 20 154, 30 186, 56 194 
               C 76 200, 98 184, 104 166 
               C 108 150, 98 134, 102 116 
               C 105 102, 102 76, 94 62 
               C 91 57, 88 54, 86 54 Z"
            fill="url(#lungLeftGrad)"
            stroke="#0284c7"
            strokeWidth="1.2"
          />

          {/* Top Specular Volume Sheen */}
          <path
            d="M 86 56 
               C 63 58, 38 82, 33 118 
               C 31 130, 36 138, 44 126 
               C 52 112, 70 82, 86 74 
               C 92 70, 94 62, 86 56 Z"
            fill="url(#lungSheen)"
          />

          {/* Anatomical Oblique Fissure Line */}
          <path
            d="M 34 116 C 54 130, 78 144, 102 148"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeDasharray="2 3"
            strokeLinecap="round"
            opacity="0.35"
          />

          {/* Internal Reflective Rib Striations */}
          {showRibs && (
            <g opacity="0.3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round">
              <path d="M 40 88 Q 62 98, 86 96" />
              <path d="M 34 118 Q 60 130, 88 126" />
              <path d="M 38 148 Q 62 160, 86 154" />
              <path d="M 48 174 Q 68 182, 86 178" />
            </g>
          )}

          {/* Left Bronchial Secondary & Tertiary Tree */}
          <path
            d="M 104 100 Q 86 114, 68 128"
            stroke={phaseColors.bronchi}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M 88 112 Q 74 98, 62 88 M 88 112 Q 80 128, 76 150 M 76 122 Q 62 138, 54 162 M 76 122 Q 54 118, 44 112"
            stroke={phaseColors.bronchi}
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Glowing Alveolar Sac Clusters (Left) */}
          {showAlveoli && (
            <motion.g variants={alveoliVariants} animate={activeVariant} filter="url(#alveoliGlow)">
              <circle cx="60" cy="86" r="2.8" fill={phaseColors.alveoli} />
              <circle cx="44" cy="110" r="3.2" fill={phaseColors.alveoli} />
              <circle cx="52" cy="162" r="3" fill={phaseColors.alveoli} />
              <circle cx="74" cy="152" r="2.8" fill={phaseColors.alveoli} />
              <circle cx="48" cy="136" r="2.4" fill={phaseColors.alveoli} />
              <circle cx="70" cy="172" r="2.6" fill={phaseColors.alveoli} />
              <circle cx="82" cy="74" r="2.2" fill={phaseColors.alveoli} />
            </motion.g>
          )}
        </motion.g>

        {/* ── RIGHT LUNG LOBE (Screen Right) ───────────────────── */}
        <motion.g
          variants={rightLobeVariants}
          animate={activeVariant}
          style={{ originX: "54%", originY: "48%" }}
        >
          {/* Main Anatomical Right Lung Body (3 Lobes) */}
          <path
            d="M 154 54 
               C 180 56, 208 82, 214 122 
               C 220 154, 210 186, 184 194 
               C 164 200, 142 184, 136 166 
               C 132 150, 142 134, 138 116 
               C 135 102, 138 76, 146 62 
               C 149 57, 152 54, 154 54 Z"
            fill="url(#lungRightGrad)"
            stroke="#0284c7"
            strokeWidth="1.2"
          />

          {/* Top Specular Volume Sheen */}
          <path
            d="M 154 56 
               C 177 58, 202 82, 207 118 
               C 209 130, 204 138, 196 126 
               C 188 112, 170 82, 154 74 
               C 148 70, 146 62, 154 56 Z"
            fill="url(#lungSheen)"
          />

          {/* Horizontal and Oblique Fissures (Right Lung) */}
          <path
            d="M 210 114 C 188 118, 162 118, 138 126"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeDasharray="2 3"
            strokeLinecap="round"
            opacity="0.35"
          />
          <path
            d="M 204 140 C 182 150, 158 158, 136 164"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeDasharray="2 3"
            strokeLinecap="round"
            opacity="0.3"
          />

          {/* Internal Reflective Rib Striations */}
          {showRibs && (
            <g opacity="0.3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round">
              <path d="M 200 88 Q 178 98, 154 96" />
              <path d="M 206 118 Q 180 130, 152 126" />
              <path d="M 202 148 Q 178 160, 154 154" />
              <path d="M 192 174 Q 172 182, 154 178" />
            </g>
          )}

          {/* Right Bronchial Tree */}
          <path
            d="M 136 100 Q 154 114, 172 128"
            stroke={phaseColors.bronchi}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M 152 112 Q 166 98, 178 88 M 152 112 Q 160 128, 164 150 M 164 122 Q 178 138, 186 162 M 164 122 Q 186 118, 196 112"
            stroke={phaseColors.bronchi}
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Glowing Alveolar Sac Clusters (Right) */}
          {showAlveoli && (
            <motion.g variants={alveoliVariants} animate={activeVariant} filter="url(#alveoliGlow)">
              <circle cx="180" cy="86" r="2.8" fill={phaseColors.alveoli} />
              <circle cx="196" cy="110" r="3.2" fill={phaseColors.alveoli} />
              <circle cx="188" cy="162" r="3" fill={phaseColors.alveoli} />
              <circle cx="166" cy="152" r="2.8" fill={phaseColors.alveoli} />
              <circle cx="192" cy="136" r="2.4" fill={phaseColors.alveoli} />
              <circle cx="170" cy="172" r="2.6" fill={phaseColors.alveoli} />
              <circle cx="158" cy="74" r="2.2" fill={phaseColors.alveoli} />
            </motion.g>
          )}
        </motion.g>

        {/* ── TRACHEA & CENTRAL AIRWAY (Windpipe) ─────────────── */}
        <g className="relative z-20">
          {/* Larynx / Thyroid Cartilage Crown */}
          <path
            d="M 112 18 C 112 12, 128 12, 128 18 L 126 24 L 114 24 Z"
            fill="url(#tracheaGradient)"
            stroke="#0067A1"
            strokeWidth="1"
          />

          {/* Trachea Tube Main Body */}
          <path
            d="M 114 24 L 114 74 Q 120 78 126 74 L 126 24 Z"
            fill="url(#tracheaGradient)"
            stroke="#0284c7"
            strokeWidth="1"
          />

          {/* C-shaped Tracheal Rings */}
          {[28, 36, 44, 52, 60, 68].map((y) => (
            <path
              key={y}
              d={`M 113 ${y} Q 120 ${y + 2.5} 127 ${y}`}
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.8"
            />
          ))}

          {/* Primary Bronchial Bifurcation (Carina) */}
          <path
            d="M 114 72 Q 106 82 96 92 M 126 72 Q 134 82 144 92"
            stroke="#0067A1"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 114 72 Q 106 82 96 92 M 126 72 Q 134 82 144 92"
            stroke={phaseColors.bronchi}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Central Airway Flow Stream */}
          <path
            d="M 120 22 L 120 74"
            stroke="url(#lumenGlow)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* ── DYNAMIC DIAPHRAGM ARC ────────────────────────────── */}
        <motion.path
          d="M 24 204 Q 120 188 216 204"
          stroke="#0067A1"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.45"
          animate={{
            d:
              normPhase === "inhale" || normPhase === "hold"
                ? "M 24 208 Q 120 198 216 208" // Diaphragm contracts downwards on inhalation
                : normPhase === "exhale"
                ? "M 24 198 Q 120 178 216 198" // Diaphragm relaxes dome upwards on exhalation
                : ["M 24 204 Q 120 188 216 204", "M 24 207 Q 120 194 216 207", "M 24 204 Q 120 188 216 204"],
          }}
          transition={{
            duration: normPhase === "hold" ? 2 : duration,
            repeat: normPhase === "hold" || activeVariant === "idle" ? Infinity : 0,
            ease: "easeInOut",
          }}
        />

        {/* ── FLOWING OXYGEN PARTICLES ─────────────────────────── */}
        {showAirflow && (
          <g className="pointer-events-none">
            {/* Trachea Inflow/Outflow Dots */}
            <motion.circle
              cx="120"
              cy="26"
              r="2.4"
              fill="#ffffff"
              variants={particleTracheaVariants}
              animate={activeVariant}
            />
            <motion.circle
              cx="120"
              cy="44"
              r="2"
              fill="#e0f2fe"
              variants={particleTracheaVariants}
              animate={activeVariant}
              transition={{ delay: 0.15 }}
            />
            <motion.circle
              cx="110"
              cy="84"
              r="1.8"
              fill="#bae6fd"
              variants={particleTracheaVariants}
              animate={activeVariant}
              transition={{ delay: 0.3 }}
            />
            <motion.circle
              cx="130"
              cy="84"
              r="1.8"
              fill="#bae6fd"
              variants={particleTracheaVariants}
              animate={activeVariant}
              transition={{ delay: 0.35 }}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
