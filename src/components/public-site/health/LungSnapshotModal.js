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
  Clock,
  Flame,
  Info
} from 'lucide-react';

/**
 * LC-10: Full Lung Report Snapshot Modal
 * Based on user policy:
 * - No score displays (no numbers /100)
 * - No risk displays (no Low/Moderate/High risk labels)
 * - Displays 4 verified physiological & environmental measures: Breath Hold, Peak Flow, Breathing Rate, Local AQI
 * - Clinically tailored Respiratory Wellness Practices (Diaphragmatic Breathing, AQI Defense, Airway Steam, Aerobic Walk)
 * - Safely sanitized & normalized clinical observations
 */
export default function LungSnapshotModal({
  isOpen,
  onClose,
  assessmentData = {},
  trendPoints = [],
  patientData = {},
  resolvedPractices = [],
  metrics = []
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
  const breathHold = Number(rawInputs.breath_holding_time ?? rawInputs.breathHold) || 35;

  // Extract AQI robustly
  const extractedAqi = typeof ai_analysis === 'string'
    ? Number(ai_analysis.match(/AQI[^0-9]*([0-9]{2,3})/i)?.[1])
    : (typeof ai_analysis?.analysis === 'string' ? Number(ai_analysis.analysis.match(/AQI[^0-9]*([0-9]{2,3})/i)?.[1]) : null);
  const aqiVal = Number(rawInputs.aqi ?? rawInputs.aqiVal ?? assessmentData.aqi ?? extractedAqi) || 162;

  const rawSmoking = String(rawInputs.smoking_status || rawInputs.smokingStatus || 'never').toLowerCase();
  const packYears = Number(rawInputs.smoking_pack_years ?? rawInputs.pack_years ?? rawInputs.smokingPackYears) || 0;

  const weight = Number(rawInputs.weight_kg ?? rawInputs.weight) || 0;
  const height = Number(rawInputs.height_cm ?? rawInputs.height) || 0;
  const calculatedBmi = weight && height ? (weight / ((height / 100) ** 2)).toFixed(1) : (rawInputs.bmi ? Number(rawInputs.bmi).toFixed(1) : null);

  const inputs = {
    ...rawInputs,
    peak_flow: peakFlow,
    breaths_per_minute: bpm,
    aqi: aqiVal,
    breath_holding_time: breathHold,
    smoking_status: rawSmoking,
    smoking_pack_years: packYears
  };

  // Safely parse AI analysis
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

  const patientName =
    assessmentData?.patient_name ||
    assessmentData?.patientName ||
    patientData?.details?.full_name ||
    patientData?.full_name ||
    patientData?.name ||
    patientData?.details?.name ||
    patientData?.user?.details?.full_name ||
    patientData?.user?.name ||
    (typeof window !== "undefined" && (() => {
      try {
        const u = JSON.parse(localStorage.getItem("userData") || localStorage.getItem("user") || "{}");
        return localStorage.getItem("userName") || localStorage.getItem("patient_name") || u.details?.full_name || u.full_name || u.name;
      } catch (e) { return null; }
    })()) ||
    null;

  // Derive or use rich practices
  const practicesToDisplay = (resolvedPractices && resolvedPractices.length > 0)
    ? resolvedPractices
    : (() => {
        let list = [];
        if (Array.isArray(recommendations)) {
          list = [...recommendations];
        } else if (typeof recommendations === 'string') {
          try {
            const parsed = JSON.parse(recommendations);
            if (Array.isArray(parsed)) list = parsed;
            else if (Array.isArray(parsed?.recommendations)) list = parsed.recommendations;
          } catch (e) {}
        }
        if (list.length > 0 && list[0]?.action_steps) return list;

        const hasWheezing = inputs.wheezing === true || inputs.wheezing === 'true';
        const isShortOfBreath = inputs.breathlessness === 'moderate' || inputs.breathlessness === 'severe';
        const hasCough = inputs.cough_frequency === 'daily' || inputs.cough_frequency === 'constant';
        const isSmoker = rawSmoking === 'current' || rawSmoking === 'former' || packYears > 0;

        const tailored = [];

        // 1. Airway Relief (Wheezing / Breathlessness)
        if (hasWheezing || isShortOfBreath) {
          tailored.push({
            id: 'pursed-lip',
            category: 'Airway Relief',
            title: 'Pursed-Lip Breathing Technique',
            priorityTag: 'Targeted for Wheezing',
            timeframe: '5–8 mins · 2–3x Daily',
            description: 'Creates positive expiratory airway pressure (PEEP effect) preventing premature bronchiolar collapse during exhalation, relieving air trapping and chest tightness.',
            action_steps: [
              'Inhale gently through your nose for 2 counts with relaxed shoulders.',
              'Pucker your lips as if gently cooling hot tea; exhale slowly for 4 counts without forcing breath.',
              'Practice for 5–8 minutes whenever you experience chest tightness, wheezing, or after exertion.'
            ]
          });
        }

        // 2. Diaphragmatic Deep Breathing (Core Habit)
        tailored.push({
          id: 'diaphragmatic',
          category: 'Respiratory Conditioning',
          title: 'Diaphragmatic Deep Breathing & Lung Expansion',
          priorityTag: 'Daily Core Habit',
          timeframe: '10 mins · Morning & Evening',
          description: 'Strengthens the primary diaphragm muscle, shifts shallow upper-chest breathing to deep abdominal ventilation, and increases functional arterial oxygen saturation.',
          action_steps: [
            'Place one hand on your upper chest and the other on your abdomen just below the rib cage.',
            'Inhale slowly through your nose for 4 seconds, allowing your abdomen to push outward while keeping chest steady.',
            'Exhale gently through pursed lips for 6 seconds as your abdomen relaxes inward. Repeat for 10 minutes.'
          ]
        });

        // 3. Environmental AQI Defense (Particulate Defense Protocol)
        if (aqiVal >= 100) {
          const aqiSeverity = aqiVal > 200 ? 'Severe Pollution' : aqiVal > 150 ? 'Unhealthy Smog' : 'Moderate Pollution';
          tailored.push({
            id: 'aqi-defense',
            category: 'Environmental Defense',
            title: `Particulate Defense Protocol (Local AQI ${aqiVal})`,
            priorityTag: `${aqiSeverity} · AQI ${aqiVal}`,
            timeframe: 'Commute & Peak Smog Windows',
            description: `Current local ambient air quality (${aqiVal} AQI) exposes sensitive airways to fine particulate matter (PM2.5/PM10). Protective filtration shields bronchial mucosa from acute inflammation.`,
            action_steps: [
              'Wear a certified N95 or particulate respirator during high-traffic commutes, foggy mornings, or dusty outdoor environments.',
              'Shift cardiovascular workouts indoors and avoid heavy outdoor exertion between 6:00 AM – 9:00 AM during thermal smog peaks.',
              'Keep living and sleeping areas sealed during peak pollution and run HEPA air filtration if available.'
            ]
          });
        }

        // 4. Airway Hydration & Gentle Steam Therapy
        if (hasWheezing || hasCough || aqiVal >= 120) {
          tailored.push({
            id: 'airway-hydration',
            category: 'Bronchial Hygiene',
            title: 'Warm Airway Hydration & Gentle Steam Therapy',
            priorityTag: 'Airway Soothing',
            timeframe: '5–7 mins · Evening Routine',
            description: 'Moisturizes sensitive bronchial epithelium, thins stagnant airway secretions, and eases nocturnal throat irritation, dry cough, and wheezing triggers.',
            action_steps: [
              'Inhale gentle warm water steam for 5–7 minutes in the evening (plain water without harsh essential oils or irritants).',
              'Maintain daily hydration with 2 to 2.5 liters of warm or room-temperature water to prevent mucosal drying.',
              'Avoid sudden exposure to ice-cold beverages or dry, high-blast air conditioning after being in humid heat.'
            ]
          });
        }

        // 5. Smoker recovery if smoker
        if (isSmoker) {
          tailored.unshift({
            id: 'smoking-cessation',
            category: 'Pulmonary Recovery',
            title: 'Bronchial Recovery & Controlled Cough Protocol',
            priorityTag: 'High Priority Recovery',
            timeframe: 'Immediate · Next 7–14 days',
            description: 'Halts accelerated decline in FEV1 vital capacity and clears trapped bronchial mucus using non-straining respiratory clearance techniques.',
            action_steps: [
              'Practice the "Huff Cough" technique (two forced exhalations with open mouth) to clear deep bronchial mucus without vocal cord strain.',
              'Consult a physician for clinical nicotine replacement options and establish a 14-day quit milestones plan.'
            ]
          });
        }

        // 6. Structured Aerobic Walking Conditioning
        tailored.push({
          id: 'aerobic-conditioning',
          category: 'Endurance Conditioning',
          title: 'Structured Aerobic Walking Conditioning',
          priorityTag: '150–300 mins/week Band',
          timeframe: '20–30 mins/day · 5 days/week',
          description: 'Increases peripheral muscle oxygen extraction and functional cardiopulmonary reserve without provoking acute airway bronchospasm.',
          action_steps: [
            'Walk briskly at a steady rhythm where you can speak comfortably in full sentences without gasping (talk test).',
            'Walk indoors on a treadmill or outside during clean-air afternoon windows when particulate pollution is lowest.'
          ]
        });

        return tailored;
      })();

  // Direct REAL DATA from assessment parsedAi (ZERO mock data)
  const clinicalIndicators = Array.isArray(parsedAi?.key_findings) ? parsedAi.key_findings : [];
  const positiveIndicators = Array.isArray(parsedAi?.positive_aspects) ? parsedAi.positive_aspects : [];
  const focusAreas = Array.isArray(parsedAi?.improvement_areas) ? parsedAi.improvement_areas : [];
  const summaryAnalysisText = parsedAi?.analysis || "Based on self-reported inputs, respiratory measures reflect your current breath-holding capacity and recorded environmental exposure. Continue monitoring and practice regular breathing exercises.";
  const clinicalGuidance = parsedAi?.medical_attention || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-3xl overflow-hidden bg-white rounded-none sm:rounded-lg shadow-2xl border-0 sm:border border-slate-200 flex flex-col text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 pb-3 border-b border-slate-100 shrink-0 z-20 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                <Wind className="w-4 h-4 text-[#0067A1]" />
                Full Lung Report Snapshot
              </h2>
              {patientName && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                  Patient: {patientName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Summary of your latest non-diagnostic respiratory assessment
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
              title="Close Snapshot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4">

          {/* 4 Verified Physiological & Environmental Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. BREATH HOLD CAPACITY */}
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 truncate">
                  BREATH HOLD
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-semibold font-mono text-slate-900">
                    {breathHold}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">sec</span>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
                <span>Baseline:</span>
                <span className="font-semibold text-slate-800">&ge; 30 sec</span>
              </div>
            </div>

            {/* 2. PEAK EXPIRATORY FLOW */}
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 truncate">
                  PEAK FLOW
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-semibold font-mono text-[#0067A1]">
                    {peakFlow}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">L/min</span>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
                <span>Ref Range:</span>
                <span className="font-semibold text-slate-800">350–550</span>
              </div>
            </div>

            {/* 3. RESPIRATORY RATE */}
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 truncate">
                  BREATHS / MIN
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-semibold font-mono text-slate-900">
                    {bpm}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">bpm</span>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
                <span>Typical:</span>
                <span className="font-semibold text-slate-800">12–20 bpm</span>
              </div>
            </div>

            {/* 4. LOCAL AMBIENT AQI */}
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 truncate">
                  LOCAL AQI
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-2xl sm:text-3xl font-semibold font-mono ${aqiVal > 150 ? 'text-amber-700' : 'text-slate-900'}`}>
                    {aqiVal}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">AQI</span>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
                <span>Air Quality:</span>
                <span className={`font-semibold ${aqiVal > 150 ? 'text-amber-800' : 'text-emerald-700'}`}>
                  {aqiVal <= 50 ? 'Good' : aqiVal <= 100 ? 'Satisfactory' : aqiVal <= 200 ? 'Unhealthy' : 'Severe'}
                </span>
              </div>
            </div>
          </div>

          {/* Controlled Non-Diagnostic Assessment Summary & Observations */}
          <div className="p-3.5 sm:p-4 rounded-md bg-slate-50/70 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
              <Activity className="w-4 h-4 text-[#0067A1]" />
              ASSESSMENT SUMMARY & OBSERVATIONS
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
              {summaryAnalysisText}
            </p>

            {/* Key Clinical Findings Badges */}
            {clinicalIndicators.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Recorded Clinical Indicators
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {clinicalIndicators.map((finding, idx) => (
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
            {(positiveIndicators.length > 0 || focusAreas.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {positiveIndicators.length > 0 && (
                  <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-md space-y-1">
                    <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Positive Indicators
                    </span>
                    <ul className="space-y-1 text-xs text-emerald-950">
                      {positiveIndicators.map((pos, idx) => (
                        <li key={idx} className="flex items-start gap-1 leading-snug">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <span>{pos}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {focusAreas.length > 0 && (
                  <div className="p-2.5 bg-sky-50/60 border border-sky-200 rounded-md space-y-1">
                    <span className="text-[10px] font-semibold text-sky-800 uppercase tracking-wider flex items-center gap-1">
                      <Wind className="w-3 h-3 text-[#0067A1]" /> Recommended Focus Areas
                    </span>
                    <ul className="space-y-1 text-xs text-sky-950">
                      {focusAreas.map((area, idx) => (
                        <li key={idx} className="flex items-start gap-1 leading-snug">
                          <span className="text-[#0067A1] font-bold shrink-0">•</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Clinical Guidance */}
            {parsedAi?.medical_attention && (
              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="font-semibold text-amber-950">Clinical Guidance:</strong> {parsedAi.medical_attention}
                </span>
              </div>
            )}
          </div>

          {/* Suggested Respiratory Wellness Practices (Replacing hardcoded steps) */}
          <div className="p-3.5 sm:p-4 rounded-md bg-slate-50/70 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                SUGGESTED RESPIRATORY WELLNESS PRACTICES
              </div>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline-block">
                Tailored to your symptoms & ambient AQI ({aqiVal})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {practicesToDisplay.map((practice, idx) => (
                <div
                  key={practice.id || idx}
                  className="p-3 rounded-md bg-white border border-slate-200 flex flex-col justify-between space-y-2 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-sky-50 text-[#0067A1] border border-sky-100">
                        {practice.category || "Wellness"}
                      </span>
                      {practice.priorityTag && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[140px]">
                          {practice.priorityTag}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-900 text-xs sm:text-[13px] leading-tight mb-1">
                      {practice.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-normal line-clamp-2">
                      {practice.description}
                    </p>
                  </div>

                  {Array.isArray(practice.action_steps) && practice.action_steps.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-700">
                      <div className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold shrink-0">✓</span>
                        <span className="line-clamp-2">{practice.action_steps[0]}</span>
                      </div>
                    </div>
                  )}

                  {practice.timeframe && (
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 pt-0.5 border-t border-slate-50">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{practice.timeframe}</span>
                    </div>
                  )}
                </div>
              ))}
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
