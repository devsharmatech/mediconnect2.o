'use client';

import React from 'react';
import {
  X,
  Activity,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Wind,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

/**
 * LC-10: Full Lung Report Snapshot Modal
 * Based on SP-06 LUNGCONNECT frozen policy V1.8.1 (Sheet 03 / Page 15)
 *
 * Rules:
 * 1. 3 Metric Cards: Current Score, Lung Age, Risk Level.
 * 2. Rename "Assistive Summary" to "Assessment Summary".
 * 3. Replace diagnostic/therapeutic narrative with controlled, non-diagnostic assessment-context content.
 * 4. Display Recorded Change ONLY when two valid historical assessment records exist (trendPoints >= 2).
 * 5. Do not describe movement as clinical improvement unless separately authorized by clinical authority.
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
    health_score = 75,
    risk_level = 'moderate',
    ai_analysis,
    recommendations = [],
    created_at = new Date().toISOString(),
    id: assessmentId,
    serial_no
  } = assessmentData;

  const inputs = assessmentData.lung_health_inputs?.[0] || {};
  // Chronological Age
  const chronologicalAge = inputs.age || patientData?.age || 45;

  // Serial No fallback
  const formattedSerialNo = serial_no || (assessmentId
    ? `LCN-${new Date(created_at).getFullYear()}-${assessmentId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
    : 'LCN-LATEST'
  );

  // Rule 4: Recorded Change strictly when >= 2 historical tests exist
  const hasHistory = Array.isArray(trendPoints) && trendPoints.length >= 2;
  let changeDelta = 0;
  let changeText = '';
  let changeType = 'stable'; // 'up' | 'down' | 'stable'

  if (hasHistory) {
    const latestScore = Number(trendPoints[trendPoints.length - 1]?.score ?? health_score);
    const previousScore = Number(trendPoints[trendPoints.length - 2]?.score ?? health_score);
    changeDelta = latestScore - previousScore;

    if (changeDelta > 0) {
      changeType = 'up';
      changeText = `+${changeDelta} pts change since previous`;
    } else if (changeDelta < 0) {
      changeType = 'down';
      changeText = `${changeDelta} pts change since previous`;
    } else {
      changeType = 'stable';
      changeText = 'Stable by 0 pts';
    }
  }

  // Risk styling
  const riskStyles = {
    low: {
      text: 'Low',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200'
    },
    moderate: {
      text: 'Moderate',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200'
    },
    high: {
      text: 'High',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200'
    },
    critical: {
      text: 'High',
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200'
    }
  };

  const riskInfo = riskStyles[risk_level?.toLowerCase()] || riskStyles.moderate;

  // Controlled, non-diagnostic narrative summary
  const summaryText = typeof ai_analysis === 'string'
    ? ai_analysis
    : (ai_analysis?.analysis || `Assessment summary: Based on self-reported inputs, your lung health index reflects current breath-holding capacity (${inputs.breath_holding_time || 35}s), recorded peak flow (${inputs.peak_flow || 450} L/min), and local AQI exposure (${inputs.aqi || 60} AQI). This non-diagnostic assessment provides lifestyle wellness indicators.`);

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

        {/* 3 Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. CURRENT SCORE */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                CURRENT SCORE
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-semibold font-mono text-[#0067A1]">
                  {health_score}
                </span>
                <span className="text-xs text-slate-500 font-normal">/100</span>
              </div>
            </div>

            {/* Conditional "Recorded Change" - strictly rendered ONLY when >= 2 historical tests exist */}
            {hasHistory && (
              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                {changeType === 'up' && (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                {changeType === 'down' && (
                  <TrendingDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                {changeType === 'stable' && (
                  <Minus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                <span>{changeText}</span>
              </div>
            )}
          </div>

          {/* 2. BREATH HOLD CAPACITY (Replaces Lung Age per document specification) */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                BREATH HOLD CAPACITY
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-semibold font-mono text-slate-900">
                  {inputs.breath_holding_time || 35}
                </span>
                <span className="text-xs text-slate-500 font-normal">sec</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Standard Baseline:</span>
              <span className="font-medium text-slate-800">&ge; 30 sec</span>
            </div>
          </div>

          {/* 3. RISK LEVEL */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                RISK LEVEL
              </p>
              <div className="mt-1">
                <span className={`text-2xl font-semibold capitalize ${riskInfo.color}`}>
                  {riskInfo.text}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200">
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${riskInfo.bg} ${riskInfo.color} ${riskInfo.border}`}>
                Self-Reported Spectrum
              </span>
            </div>
          </div>
        </div>

        {/* Controlled Non-Diagnostic Assessment Summary */}
        <div className="p-3.5 sm:p-4 rounded-md bg-slate-50/70 border border-slate-200 space-y-1.5">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
            <Activity className="w-4 h-4 text-[#0067A1]" />
            ASSESSMENT SUMMARY
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
            {summaryText}
          </p>
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

        {/* Medical Attention Advised Notice */}
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
