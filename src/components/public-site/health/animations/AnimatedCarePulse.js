"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * AnimatedCarePulse
 * Flowing ECG continuity pulse line matching B11 Care Episode (ui17.png).
 */
export default function AnimatedCarePulse({
  activeStage = 2, // 0: Started, 1: Recorded, 2: In Progress, 3: Resolved
  episodeId = "LCE-ACTIVE",
  startDate = "Initial Enrolment",
  recordedDate = "Active Monitoring",
  className = "",
}) {
  const stages = [
    { title: "Episode Started", date: startDate, desc: "Episode created" },
    { title: "Data Recorded", date: recordedDate, desc: "Activities synchronized" },
    { title: "Care In Progress", date: "Ongoing", desc: "Longitudinal monitoring" },
    { title: "Episode Resolved", date: "--", desc: "Formal resolution" },
  ];

  return (
    <div className={`p-4 sm:p-5 rounded-[5px] bg-white border border-slate-200 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-700 block">
            Care Continuity Infrastructure
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-semibold text-slate-900">Active Care Episode:</span>
            <span className="text-xs font-mono font-semibold bg-[#003358] text-white px-2 py-0.5 rounded-[4px]">
              {episodeId}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          Active & Continuous
        </span>
      </div>

      {/* Continuity Timeline Graphic with Flowing Pulse */}
      <div className="my-6 relative">
        {/* Background Connecting Line */}
        <div className="absolute top-5 left-6 right-6 h-1 bg-slate-200 -z-0" />

        {/* Animated Active Track */}
        <motion.div
          className="absolute top-5 left-6 h-1 bg-[#0067A1] -z-0"
          initial={{ width: "0%" }}
          animate={{ width: `${(activeStage / (stages.length - 1)) * 100}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* 4 Nodes */}
        <div className="grid grid-cols-4 gap-2 relative z-10">
          {stages.map((stg, idx) => {
            const isCompleted = idx < activeStage;
            const isCurrent = idx === activeStage;
            return (
              <div key={stg.title} className="flex flex-col items-center text-center">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-colors ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-[#003358] text-white ring-4 ring-[#0067A1]/25"
                      : "bg-white text-slate-400 border border-slate-300"
                  }`}
                  animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {isCompleted ? "✓" : idx + 1}
                </motion.div>
                <span className={`text-xs font-medium mt-2 leading-tight ${isCurrent ? "text-[#003358]" : "text-slate-700"}`}>
                  {stg.title}
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-normal mt-0.5">
                  {stg.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notice Callout */}
      <div className="p-3 bg-sky-50 rounded-[5px] border border-sky-200 text-xs text-slate-800 leading-relaxed">
        <strong className="text-[#003358] font-semibold">Care Continuity Rule:</strong> This episode keeps your health check history, daily activity metrics, and physician handoff records in sync. It is continuity infrastructure, not a diagnosis.
      </div>
    </div>
  );
}
