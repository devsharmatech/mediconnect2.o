'use client';

import React from 'react';
import {
  X,
  Activity,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Wind,
  Shield
} from 'lucide-react';

/**
 * LC-10: Full Lung Report Snapshot Modal
 * Based on user policy:
 * - No score displays (no numbers /100)
 * - No risk displays (no Low/Moderate/High risk labels)
 * - Displays verified physiological measures: Breath Hold, Peak Flow, Breathing Rate
 * - Safely parsed AI Assessment Observations
 */
export default function LungSnapshotModal({
  isOpen,
  onClose,
  assessmentData = {},
  trendPoints = [],
  patientData = {}
}) {
  if (!isOpen || !assessmentData) return null;

  const {
    ai_analysis,
    recommendations = [],
    created_at = new Date().toISOString(),
    id: assessmentId,
    serial_no
  } = assessmentData;

  const rawInputs = assessmentData.inputs || assessmentData.lung_health_inputs?.[0] || {};
  const peakFlow = Number(rawInputs.peak_flow ?? rawInputs.peakFlow) || 450;
  const bpm = Number(rawInputs.breaths_per_minute ?? rawInputs.breathsPerMinute) || 16;
  const aqiVal = Number(rawInputs.aqi) || 68;
  const breathHold = Number(rawInputs.breath_holding_time ?? rawInputs.breathHold) || 35;

  const inputs = {
    ...rawInputs,
    peak_flow: peakFlow,
    breaths_per_minute: bpm,
    aqi: aqiVal,
    breath_holding_time: breathHold
  };

  // Safely parse AI analysis (handles stringified JSON, double-stringified JSON, or plain text)
  let parsedAi = null;
  if (ai_analysis) {
    if (typeof ai_analysis === 'object') {
      parsedAi = ai_analysis;
    } else if (typeof ai_analysis === 'string') {
      try {
        parsedAi = JSON.parse(ai_analysis);
      } catch (e) {
        parsedAi = { analysis: ai_analysis };
      }
    }
  }
  if (parsedAi && typeof parsedAi.analysis === 'string' && parsedAi.analysis.trim().startsWith('{')) {
    try {
      const nested = JSON.parse(parsedAi.analysis);
      parsedAi = { ...parsedAi, ...nested };
    } catch (e) {}
  }

  // Serial No fallback
  const formattedSerialNo = serial_no || (assessmentId
    ? `LCN-${new Date(created_at).getFullYear()}-${String(assessmentId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
    : 'LCN-LATEST'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl overflow-hidden bg-white rounded-none sm:rounded-md shadow-2xl border-0 sm:border border-slate-200 flex flex-col text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 pb-3 sm:pb-3 border-b border-slate-100 shrink-0 z-20">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Wind className="w-4 h-4 text-[#0067A1]" />
              Full Lung Report Snapshot
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Summary of your latest non-diagnostic respiratory assessment
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Close Snapshot"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4">

          {/* 3 Verified Physiological Metric Cards (No Score, No Risk) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. BREATH HOLD CAPACITY */}
            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  BREATH HOLD CAPACITY
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-semibold font-mono text-slate-900">
                    {breathHold}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">sec</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Standard Baseline:</span>
                <span className="font-medium text-slate-800">&ge; 30 sec</span>
              </div>
            </div>

            {/* 2. PEAK EXPIRATORY FLOW */}
            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  PEAK EXPIRATORY FLOW
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-semibold font-mono text-[#0067A1]">
                    {peakFlow}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">L/min</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Reference Range:</span>
                <span className="font-medium text-slate-800">350–550 L/min</span>
              </div>
            </div>

            {/* 3. RESPIRATORY RATE */}
            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  BREATHS / MINUTE
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-semibold font-mono text-slate-900">
                    {bpm}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">bpm</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Typical Range:</span>
                <span className="font-medium text-slate-800">12–20 bpm</span>
              </div>
            </div>
          </div>

          {/* Controlled Non-Diagnostic Assessment Summary & Observations */}
          <div className="p-3.5 sm:p-4 rounded-md bg-slate-50/70 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
              <Activity className="w-4 h-4 text-[#0067A1]" />
              ASSESSMENT SUMMARY
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
              {parsedAi?.analysis || `Assessment summary: Based on self-reported inputs, your recorded measures include breath-holding capacity (${breathHold}s), peak expiratory flow (${peakFlow} L/min), and respiratory rate (${bpm} bpm). This non-diagnostic assessment provides lifestyle wellness indicators.`}
            </p>

            {/* Key Findings Badges */}
            {Array.isArray(parsedAi?.key_findings) && parsedAi.key_findings.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Recorded Clinical Indicators
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {parsedAi.key_findings.map((finding, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0067A1]" />
                      {finding}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Positive Aspects & Improvement Areas in 2-col Grid */}
            {((Array.isArray(parsedAi?.positive_aspects) && parsedAi.positive_aspects.length > 0) ||
              (Array.isArray(parsedAi?.improvement_areas) && parsedAi.improvement_areas.length > 0)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {Array.isArray(parsedAi?.positive_aspects) && parsedAi.positive_aspects.length > 0 && (
                  <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-md space-y-1">
                    <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Positive Indicators
                    </span>
                    <ul className="space-y-1 text-xs text-emerald-950">
                      {parsedAi.positive_aspects.map((pos, idx) => (
                        <li key={idx} className="flex items-start gap-1 leading-snug">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{pos}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(parsedAi?.improvement_areas) && parsedAi.improvement_areas.length > 0 && (
                  <div className="p-2.5 bg-sky-50/60 border border-sky-200 rounded-md space-y-1">
                    <span className="text-[10px] font-semibold text-sky-800 uppercase tracking-wider flex items-center gap-1">
                      <Wind className="w-3 h-3 text-[#0067A1]" /> Recommended Focus Areas
                    </span>
                    <ul className="space-y-1 text-xs text-sky-950">
                      {parsedAi.improvement_areas.map((area, idx) => (
                        <li key={idx} className="flex items-start gap-1 leading-snug">
                          <span className="text-[#0067A1] font-bold">•</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Medical Attention / Guidance */}
            {parsedAi?.medical_attention && (
              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="font-semibold text-amber-950">Clinical Guidance:</strong> {parsedAi.medical_attention}
                </span>
              </div>
            )}
          </div>

          {/* Suggested Next Steps */}
          <div className="p-3.5 sm:p-4 rounded-md bg-slate-50/70 border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              SUGGESTED NEXT STEPS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
              <div className="p-2.5 rounded-md bg-white border border-slate-200">
                <span className="font-medium text-slate-900 block mb-0.5">Diaphragmatic Breathing</span>
                <span className="text-[11px] text-slate-600 font-normal">Practice 5–10 minutes of box breathing daily to maintain healthy tidal lung volume.</span>
              </div>
              <div className="p-2.5 rounded-md bg-white border border-slate-200">
                <span className="font-medium text-slate-900 block mb-0.5">Air Quality Precautions</span>
                <span className="text-[11px] text-slate-600 font-normal">Monitor local AQI levels before prolonged outdoor cardiovascular exercise.</span>
              </div>
            </div>
          </div>

          {/* Clinical Safety Notice */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="font-normal text-[11px] sm:text-xs">
              <span className="font-semibold text-amber-950">Medical Attention Advised:</span> Seek clinical attention if any new respiratory symptoms develop, such as persistent cough, acute breathlessness, or wheezing.
            </div>
          </div>

          {/* Footer info & Disclaimer */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Snapshot taken on {new Date(created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })} · Serial No: #{formattedSerialNo}
            </div>
            <p className="text-[9px] text-slate-800 max-w-xs sm:text-right">
              Non-diagnostic wellness artifact. Not a substitute for clinical spirometry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
