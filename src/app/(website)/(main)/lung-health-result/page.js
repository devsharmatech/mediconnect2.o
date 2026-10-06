"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity, Wind, ChevronLeft, Download,
  AlertTriangle, Stethoscope, Calendar,
  Zap, Info, CheckCircle2, FileText, History, Printer, Eye, X,
  Clock, ArrowUpRight, ArrowRight
} from 'lucide-react';
import { FaLungs, FaWalking } from 'react-icons/fa';
import { motion } from 'framer-motion';
import AssessmentTrendChart from '@/components/public-site/health/AssessmentTrendChart';
import AssessmentPrintReport from '@/components/public-site/health/AssessmentPrintReport';
import LungConnectV99Report from '@/components/public-site/health/reports/LungConnectV99Report';
import LungConnectFullReport from '@/components/public-site/health/reports/LungConnectFullReport';
import LungSnapshotModal from '@/components/public-site/health/LungSnapshotModal';
import { generateClientPdf, printClientReport } from '@/lib/clientPdfGenerator';
import { AnimatedRespiratoryLoader } from '@/components/public-site/health/animations';

/* ─── Modern Score Ring ──────────────────────────────────────── */
function ScoreRing({ score, color = "#ffffff", size = 110 }) {
  const radius = 42;
  const strokeWidth = 8;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.span
          className="text-2xl sm:text-3xl font-bold font-mono text-white leading-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-white/70 font-medium mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function LungHealthResult() {
  const [assessmentData, setAssessmentData] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [graphSummary, setGraphSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [printingReport, setPrintingReport] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [selectedLungFormat, setSelectedLungFormat] = useState("lung-v9.9");

  const reportRef = useRef(null);
  const router = useRouter();

  /* ── Load assessment data ── */
  useEffect(() => {
    let hasSessionResult = false;
    const resultData = sessionStorage.getItem('lungAssessmentResult');
    if (resultData) {
      try {
        const parsed = JSON.parse(resultData);
        setAssessmentData(parsed);
        hasSessionResult = true;
      }
      catch (e) { console.warn("Could not parse lungAssessmentResult", e); }
    }

    const userDataRaw = typeof window !== 'undefined'
      ? (localStorage.getItem('userData') || localStorage.getItem('user')) : null;
    let parsedUser = null;
    if (userDataRaw) {
      try {
        parsedUser = JSON.parse(userDataRaw);
        const resolvedName =
          parsedUser?.details?.full_name ||
          parsedUser?.details?.name ||
          parsedUser?.full_name ||
          parsedUser?.name ||
          parsedUser?.user?.details?.full_name ||
          parsedUser?.user?.name ||
          (typeof window !== "undefined" ? (localStorage.getItem("userName") || localStorage.getItem("patient_name")) : null);
        if (resolvedName) {
          parsedUser.full_name = resolvedName;
          parsedUser.name = resolvedName;
        }
        setPatientData(parsedUser);
      }
      catch (e) { console.warn("Could not parse userData", e); }
    } else if (typeof window !== "undefined" && (localStorage.getItem("userName") || localStorage.getItem("patient_name"))) {
      const fallbackName = localStorage.getItem("userName") || localStorage.getItem("patient_name");
      setPatientData({ full_name: fallbackName, name: fallbackName });
    }

    const userId = parsedUser?.user_id || parsedUser?.user?.id || parsedUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('userId') : null);
    if (userId && userId !== 'usr_guest') {
      fetch(`/api/health/assessments?user_id=${userId}&type=lung&limit=1`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data?.assessments?.length > 0) {
            const latest = res.data.assessments[0];
            if (!hasSessionResult) {
              setAssessmentData(latest);
            } else {
              setAssessmentData(prev => ({
                ...prev,
                patient_name: prev?.patient_name || latest.patient_name,
                patientName: prev?.patientName || latest.patient_name,
                patient_gender: prev?.patient_gender || latest.patient_gender,
                patient_dob: prev?.patient_dob || latest.patient_dob,
                patient_blood_group: prev?.patient_blood_group || latest.patient_blood_group,
              }));
            }
            if (latest.patient_name) {
              setPatientData(prev => ({
                ...(prev || {}),
                full_name: latest.patient_name,
                name: latest.patient_name,
                gender: latest.patient_gender || prev?.gender,
                blood_group: latest.patient_blood_group || prev?.blood_group
              }));
            }
          }
        })
        .catch(err => console.warn("Could not fetch latest assessment", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [router]);

  /* ── Load graph data ── */
  useEffect(() => {
    const userData = typeof window !== 'undefined'
      ? (localStorage.getItem('userData') || localStorage.getItem('user')) : null;
    if (!userData) { setGraphLoading(false); return; }

    const fetchGraphData = async () => {
      try {
        setGraphLoading(true); setGraphError(null);
        const parsed = JSON.parse(userData);
        const userId = parsed.user_id || parsed.user?.id || parsed.id;
        if (!userId) { setGraphLoading(false); return; }
        const res = await fetch(`/api/health/assessments/graph?user_id=${userId}&type=lung&timeframe=year&limit=50`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load');
        setGraphData(data.data.graphData || null);
        setGraphSummary(data.data.summary || null);
        setHistory(data.data.history || []);
      } catch (err) {
        console.error('Error loading graph:', err);
        setGraphError('Unable to load your lung health history right now.');
      } finally {
        setGraphLoading(false);
      }
    };
    fetchGraphData();
  }, []);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
          <AnimatedRespiratoryLoader
            title="Loading your respiratory summary…"
            subtitle="Analyzing breath-hold metrics & lung capacity indicators"
          />
        </div>
      </div>
    );
  }

  /* ── No data state ── */
  if (!assessmentData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4"
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0067A1]">
            <FaLungs className="w-6 h-6" />
          </div>
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-sky-50 text-[#0067A1] border border-sky-200 mb-2">
              Respiratory Wellness Hub
            </span>
            <h2 className="text-base font-semibold text-slate-900">No Assessment Record Found</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              You can explore self-guided breathing sessions, 6-minute walk tests, or complete your lifestyle assessment.
            </p>
          </div>
          <div className="space-y-2 pt-1">
            <button type="button" onClick={() => router.push('/lung-connect?action=move')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5">
              <FaWalking className="w-3.5 h-3.5" /> Launch Move Session
            </button>
            <button type="button" onClick={() => router.push('/lung-connect?action=walking')}
              className="w-full bg-[#0067A1] hover:bg-[#005584] text-white py-2 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Launch 6-Minute Walk Test
            </button>
            <button type="button" onClick={() => router.push('/lung-assessment')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer">
              Complete Lung Assessment →
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Derive display values ── */
  const {
    health_score = 75,
    risk_level = 'moderate',
    risk_factors = [],
    ai_analysis,
    recommendations,
    created_at = new Date().toISOString(),
    id: assessmentId,
    serial_no
  } = assessmentData;

  const rawInputs = assessmentData.inputs || assessmentData.lung_health_inputs?.[0] || {};
  const peakFlow = Number(rawInputs.peak_flow ?? rawInputs.peakFlow) || 450;
  const bpm = Number(rawInputs.breaths_per_minute ?? rawInputs.breathsPerMinute) || 16;
  const extractedAqi = typeof ai_analysis === 'string'
    ? Number(ai_analysis.match(/AQI[^0-9]*([0-9]{2,3})/i)?.[1])
    : (typeof ai_analysis?.analysis === 'string' ? Number(ai_analysis.analysis.match(/AQI[^0-9]*([0-9]{2,3})/i)?.[1]) : null);
  const aqiVal = Number(rawInputs.aqi ?? rawInputs.aqiVal ?? assessmentData.aqi ?? extractedAqi) || 162;
  const breathHold = Number(rawInputs.breath_holding_time ?? rawInputs.breathHold) || 35;
  const rawSmoking = String(rawInputs.smoking_status || rawInputs.smokingStatus || 'never').toLowerCase();
  const packYears = Number(rawInputs.smoking_pack_years ?? rawInputs.pack_years ?? rawInputs.smokingPackYears) || 0;
  const isBpmNormal = bpm >= 12 && bpm <= 20;

  const inputs = {
    ...rawInputs,
    peak_flow: peakFlow,
    breaths_per_minute: bpm,
    aqi: aqiVal,
    breath_holding_time: breathHold,
    smoking_status: rawSmoking,
    smoking_pack_years: packYears
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

  const formattedSerialNo = serial_no || (assessmentId
    ? `LCN-${new Date(created_at).getFullYear()}-${String(assessmentId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
    : 'LCN-LATEST');

  const resolvedPatientName =
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

  const hasWheezing =
    inputs.wheezing === true ||
    inputs.wheezing === 'true' ||
    inputs.Wheezing === true ||
    inputs.Wheezing === 'true' ||
    rawInputs.wheezing === true ||
    rawInputs.wheezing === 'true' ||
    risk_factors?.some(rf => String(rf).toLowerCase().includes('wheez'));

  const aqiNum = aqiVal;
  const isSmoker = rawSmoking === 'current' || rawSmoking === 'former' || packYears > 0;
  const isShortOfBreath =
    inputs.breathlessness === 'moderate' ||
    inputs.breathlessness === 'severe' ||
    risk_factors?.some(rf => String(rf).toLowerCase().includes('breathless'));
  const hasCough =
    inputs.cough_frequency === 'daily' ||
    inputs.cough_frequency === 'constant' ||
    risk_factors?.some(rf => String(rf).toLowerCase().includes('cough'));

  // ── Condition-tailored Doctor Specialty Consultation Suggestions ──
  const suggestedSpecialties = (() => {
    const list = [];

    // Condition A: Wheezing, shortness of breath, lower peak flow, or smoker -> Pulmonology
    if (hasWheezing || isShortOfBreath || (inputs.peak_flow && Number(inputs.peak_flow) < 350) || isSmoker) {
      list.push({
        shortName: "Pulmonologist",
        specialtyParam: "Pulmonology",
        btnLabel: "Consult Pulmonologist",
      });
    }

    // Condition B: Frequent or persistent cough -> ENT Specialist
    if (hasCough) {
      list.push({
        shortName: "ENT Specialist",
        specialtyParam: "ENT",
        btnLabel: "Consult ENT Specialist",
      });
    }

    // Condition C: If neither wheezing nor cough, or general health screening -> General Physician
    if (list.length === 0) {
      list.push({
        shortName: "General Physician",
        specialtyParam: "General+Physician",
        btnLabel: "Consult General Physician",
      });
    }

    return list;
  })();

  // ── Construct rich, clinically tailored Suggested Respiratory Wellness Practices ──
  const resolvedPractices = (() => {
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

    const tailored = [];

    // 1. Wheezing / Airway Tightness Targeted Practice
    if (hasWheezing || isShortOfBreath) {
      tailored.push({
        id: 'pursed-lip',
        category: 'Airway Relief',
        badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
        title: 'Pursed-Lip Breathing Technique',
        priorityTag: 'Targeted for Wheezing',
        timeframe: '5–8 mins · 2–3x Daily',
        description: 'Keeps breathing passages gently open longer when exhaling, relieving chest tightness and easing wheezing naturally.',
        action_steps: [
          'Inhale gently through your nose for 2 counts with relaxed, drop-down shoulders.',
          'Pucker your lips as if gently blowing across hot tea; exhale slowly for 4 counts without forcing breath.',
          'Practice for 5–8 minutes whenever you experience chest tightness, wheezing, or after mild physical activity.'
        ],
        hubLink: '/lung-connect'
      });
    }

    // 2. Deep Belly Breathing (Foundational Core Practice)
    tailored.push({
      id: 'diaphragmatic',
      category: 'Breathing Ease',
      badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      title: 'Deep Belly Breathing for Relaxation',
      priorityTag: 'Daily Core Habit',
      timeframe: '10 mins · Morning & Evening',
      description: 'Encourages deep, natural belly breathing instead of shallow chest breaths, helping you feel refreshed and relaxed throughout the day.',
      action_steps: [
        'Place one hand on your upper chest and the other on your abdomen just below the rib cage.',
        'Inhale slowly through your nose for 4 seconds, allowing your abdomen to push outward while keeping chest steady.',
        'Exhale gently through pursed lips for 6 seconds as your abdomen relaxes inward. Repeat for 10 minutes.'
      ],
      hubLink: '/lung-connect'
    });

    // 3. Environmental AQI Defense (Clean Air Protection)
    if (aqiNum >= 100) {
      const aqiSeverity = aqiNum > 200 ? 'Severe Pollution' : aqiNum > 150 ? 'Unhealthy Smog' : 'Moderate Pollution';
      tailored.push({
        id: 'aqi-defense',
        category: 'Air Quality Care',
        badgeColor: 'bg-rose-50 text-rose-900 border-rose-200',
        title: `Clean Air & Dust Protection (Local AQI ${aqiNum})`,
        priorityTag: `${aqiSeverity} · AQI ${aqiNum}`,
        timeframe: 'Commute & Peak Smog Windows',
        description: `Current local air quality (${aqiNum} AQI) has elevated smog and dust. Protecting your breath outdoors prevents throat irritation and keeps breathing comfortable.`,
        action_steps: [
          'Wear a certified N95 or particulate respirator during high-traffic commutes, foggy mornings, or dusty outdoor environments.',
          'Shift cardiovascular workouts indoors and avoid heavy outdoor exertion between 6:00 AM – 9:00 AM during thermal smog peaks.',
          'Keep living and sleeping areas sealed during peak pollution and run HEPA air filtration if available.'
        ]
      });
    }

    // 4. Airway Hydration & Warm Steam Routine
    if (hasWheezing || hasCough || aqiNum >= 120) {
      tailored.push({
        id: 'airway-hydration',
        category: 'Airway Soothing',
        badgeColor: 'bg-sky-50 text-sky-900 border-sky-200',
        title: 'Warm Airway Hydration & Gentle Steam Routine',
        priorityTag: 'Airway Soothing',
        timeframe: '5–7 mins · Evening Routine',
        description: 'Gently moisturizes your throat and breathing passages, easing dry cough, scratchiness, and night-time irritation.',
        action_steps: [
          'Inhale gentle warm water steam for 5–7 minutes in the evening (plain water without harsh essential oils or irritants).',
          'Maintain daily hydration with 2 to 2.5 liters of warm or room-temperature water to prevent mucosal drying.',
          'Avoid sudden exposure to ice-cold beverages or dry, high-blast air conditioning after being in humid heat.'
        ]
      });
    }

    // 5. Gentle Airway Ease & Cough Comfort if smoker
    if (isSmoker) {
      tailored.unshift({
        id: 'smoking-cessation',
        category: 'Airway Comfort',
        badgeColor: 'bg-teal-50 text-teal-900 border-teal-200',
        title: 'Gentle Airway Ease & Cough Comfort Routine',
        priorityTag: 'Daily Comfort',
        timeframe: 'Immediate · Next 7–14 days',
        description: 'Helps naturally clear throat secretions and supports steady, relaxed breathing without straining your chest or throat.',
        action_steps: [
          'Practice gentle breathing coughs: exhale twice with an open mouth (like fogging a mirror) to clear your throat comfortably.',
          'Speak with a healthcare professional about healthy lifestyle habits and a personalized quit plan.'
        ]
      });
    }

    // 6. Low-Impact Aerobic Conditioning
    tailored.push({
      id: 'aerobic-conditioning',
      category: 'Active Living',
      badgeColor: 'bg-teal-50 text-teal-900 border-teal-200',
      title: 'Daily Gentle Walking for Stamina',
      priorityTag: 'Comfortable Pace',
      timeframe: '20–30 mins/day · 5 days/week',
      description: 'Builds steady stamina and daily energy while keeping your lungs active at an easy, comfortable walking pace.',
      action_steps: [
        'Walk briskly at a steady rhythm where you can speak comfortably in full sentences without gasping (talk test).',
        'Walk indoors on a treadmill or outside during clean-air afternoon windows when particulate pollution is lowest.'
      ]
    });

    return tailored;
  })();

  const riskKey = risk_level?.toLowerCase();
  const isGoodResult = health_score >= 70 || riskKey === 'low';

  const riskConfig = {
    low: {
      hero: 'from-[#004f7c] via-[#005f94] to-[#0067A1]',
      ring: '#38bdf8',
      label: 'Optimal Status',
      pill: 'bg-emerald-500/20 text-emerald-100 border-emerald-300/30'
    },
    moderate: {
      hero: 'from-[#5a3a0e] via-[#7c4d12] to-[#925a16]',
      ring: '#f59e0b',
      label: 'Moderate Status',
      pill: 'bg-amber-500/20 text-amber-100 border-amber-300/30'
    },
    high: {
      hero: 'from-[#6e1d24] via-[#88242d] to-[#9f1239]',
      ring: '#f43f5e',
      label: 'Priority Care',
      pill: 'bg-rose-500/20 text-rose-100 border-rose-300/30'
    },
    critical: {
      hero: 'from-[#5e1319] via-[#74171f] to-[#881337]',
      ring: '#dc2626',
      label: 'Urgent Care',
      pill: 'bg-red-500/25 text-red-100 border-red-300/30'
    },
  };
  const cfg = riskConfig[riskKey] || riskConfig.moderate;

  const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
  const elapsedMs = Date.now() - new Date(created_at).getTime();
  const isEligibleForPDF = elapsedMs >= FIFTEEN_DAYS_MS;
  const remainingDaysForPDF = Math.max(0, Math.ceil((FIFTEEN_DAYS_MS - elapsedMs) / (24 * 60 * 60 * 1000)));

  // Formatted BMI strictly to 1 decimal place
  const formattedBmi = inputs.bmi
    ? Number(inputs.bmi).toFixed(1)
    : (inputs.height_cm && inputs.weight_kg
        ? (Number(inputs.weight_kg) / ((Number(inputs.height_cm) / 100) ** 2)).toFixed(1)
        : '22.5');

  const handleDownloadPDF = async (format = selectedLungFormat) => {
    try {
      setDownloadingPDF(true);
      setSelectedLungFormat(format);
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (!reportRef.current) throw new Error("Report element not found");
      const filename = `mediconnect-lung-${format === "lung-full" ? "full-clinical" : "v99-summary"}-${formattedSerialNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      await generateClientPdf(reportRef.current, filename, { scale: 2, action: "download" });
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handlePrintReport = async (format = selectedLungFormat) => {
    try {
      setPrintingReport(true);
      setSelectedLungFormat(format);
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (!reportRef.current) throw new Error("Report element not found");
      await printClientReport(reportRef.current);
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setPrintingReport(false);
    }
  };

  const trendPoints = graphData?.healthScoreTrend?.filter(p => p.type === 'lung') || [];

  /* ── Metric cards data (no risk or score displays) ── */
  const metrics = [
    {
      label: 'Peak Expiratory Flow',
      value: peakFlow,
      unit: 'L/min',
      status: peakFlow >= 450 ? 'Optimal' : peakFlow >= 350 ? 'Moderate' : 'Below Ref',
      tone: peakFlow >= 450 ? 'emerald' : peakFlow >= 350 ? 'amber' : 'rose',
    },
    {
      label: 'Breaths / Minute',
      value: bpm,
      unit: 'bpm',
      status: isBpmNormal ? 'Normal' : (bpm < 12 ? 'Below Range' : 'Elevated'),
      tone: isBpmNormal ? 'emerald' : 'amber',
    },
    {
      label: 'Local AQI',
      value: aqiVal,
      unit: 'CPCB AQI',
      status: aqiVal <= 50 ? 'Good' : aqiVal <= 100 ? 'Satisfactory' : aqiVal <= 200 ? 'Moderate' : 'Poor',
      tone: aqiVal <= 100 ? 'emerald' : aqiVal <= 200 ? 'amber' : 'rose',
    },
    {
      label: 'Smoking Profile',
      value: rawSmoking ? (rawSmoking.charAt(0).toUpperCase() + rawSmoking.slice(1)) : 'Never',
      unit: packYears > 0 ? `${packYears} pk-yrs` : '',
      status: rawSmoking === 'current' ? 'Active' : rawSmoking === 'former' ? 'Former Smoker' : 'Non-Smoker',
      tone: rawSmoking === 'current' ? 'amber' : 'emerald',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-3 sm:py-6 px-3 sm:px-4 font-sans pb-32 sm:pb-16">

      {/* Hidden print template */}
      <AssessmentPrintReport
        assessmentType="lung"
        formatType={selectedLungFormat}
        assessmentData={assessmentData}
        patientData={patientData}
        reportRef={reportRef}
      />

      <div className="max-w-3xl mx-auto space-y-2.5 sm:space-y-3.5">

        {/* ── Top Navigation Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-slate-200 p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition-colors shrink-0 cursor-pointer"
              title="Back to Dashboard"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                Lung Health Summary
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                Standardized non-diagnostic respiratory lifestyle assessment
              </p>
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            <button
              type="button"
              onClick={() => setShowReportViewer(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0b3b60] hover:bg-[#07243c] text-white rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              title="Open Clinical Report Viewer"
            >
              <FileText className="w-3.5 h-3.5" /> View Report
            </button>
            <button
              type="button"
              onClick={() => setShowSnapshotModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0067A1] border border-sky-200 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> Snapshot
            </button>
            <button
              type="button"
              onClick={() => handlePrintReport(selectedLungFormat)}
              disabled={printingReport}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#0067A1]" /> {printingReport ? 'Preparing…' : 'Print'}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadPDF(selectedLungFormat)}
              disabled={downloadingPDF}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> {downloadingPDF ? 'Generating…' : 'PDF'}
            </button>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0067A1] hover:bg-[#005584] text-white rounded-md text-xs font-medium transition-all shrink-0"
            >
              <Stethoscope className="w-3.5 h-3.5" /> Consult Doctor
            </Link>
          </div>
        </motion.div>

        {/* ── 15-Day PDF Notice ── */}
        {!isEligibleForPDF && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-sky-50/80 border border-sky-200 rounded-md p-2.5 flex items-start gap-2 text-[11px] sm:text-xs text-sky-900 leading-normal"
          >
            <Info className="w-3.5 h-3.5 text-[#0067A1] shrink-0 mt-0.5" />
            <span>
              <strong className="font-semibold text-sky-950">Report Sharing Notice:</strong> Full PDF sharing unlocks 15 days post-assessment ({remainingDaysForPDF} days remaining). You can review your results and snapshot now.
            </span>
          </motion.div>
        )}

        {/* ── Clinical Safety Banner ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="bg-amber-50/80 border border-amber-200 rounded-md p-2.5 flex items-start gap-2 text-[11px] sm:text-xs text-amber-900 leading-normal"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong className="font-semibold text-amber-950">Clinical Notice:</strong> If experiencing acute breathlessness, chest tightness, or coughing blood, seek emergency care immediately.
          </span>
        </motion.div>

        {/* ── Hero Score Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className={`relative overflow-hidden rounded-lg bg-gradient-to-r ${cfg.hero} text-white shadow-2xs border border-white/15 p-3.5 sm:p-5`}
        >
          {/* Header pill */}
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/15">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                <FaLungs className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-white tracking-wide">
                Respiratory Wellness Profile
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-white/20 text-white border border-white/25">
              {resolvedPatientName ? `Patient: ${resolvedPatientName}` : "Assessment Summary"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
            {/* Functional Capacity Gauge */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center text-center p-3.5 bg-white/10 rounded-md border border-white/15">
              <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                {inputs.breath_holding_time || 35}s
              </span>
              <span className="text-[10px] uppercase font-bold text-sky-200 mt-1">Breath-Holding</span>
              <p className="text-[10px] text-white/80 mt-0.5 font-normal">
                {inputs.peak_flow ? `Peak Flow: ${inputs.peak_flow} L/min` : "Functional Capacity Recorded"}
              </p>
            </div>

            {/* Assessment Details & Vitals */}
            <div className="sm:col-span-8 space-y-2">
              <div className="flex items-center justify-between text-xs text-white/85 pb-1 border-b border-white/10">
                <span className="font-mono font-medium">#{formattedSerialNo}</span>
                <span className="flex items-center gap-1 font-normal text-[11px] text-white/75">
                  <Calendar className="w-3 h-3" />
                  {new Date(created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="bg-white/10 rounded p-2 border border-white/15">
                  <p className="text-[10px] text-white/70 font-medium uppercase">Patient</p>
                  <p className="font-semibold text-white text-sm truncate" title={resolvedPatientName || "Self-Reported"}>{resolvedPatientName || "Self-Reported"}</p>
                </div>
                <div className="bg-white/10 rounded p-2 border border-white/15">
                  <p className="text-[10px] text-white/70 font-medium uppercase">Chronological Age</p>
                  <p className="font-mono font-semibold text-white text-sm">{inputs.age || 35} yrs</p>
                </div>
                <div className="bg-white/10 rounded p-2 border border-white/15">
                  <p className="text-[10px] text-white/70 font-medium uppercase">Breath Hold</p>
                  <p className="font-mono font-semibold text-white text-sm">{inputs.breath_holding_time || 35} sec</p>
                </div>
                <div className="bg-white/10 rounded p-2 border border-white/15">
                  <p className="text-[10px] text-white/70 font-medium uppercase">Calculated BMI</p>
                  <p className="font-mono font-semibold text-white text-sm">
                    {formattedBmi} <span className="text-[10px] font-normal text-white/70">kg/m²</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowSnapshotModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-md text-xs font-medium transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> Full Report
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Trend Chart ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <AssessmentTrendChart
            trendData={trendPoints}
            assessmentType="lung"
            currentScore={health_score}
            currentDate={created_at}
          />
        </motion.div>

        {/* ── Metric Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg border border-slate-200 shadow-2xs p-3.5 sm:p-4 space-y-3"
        >
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <Wind className="w-4 h-4 text-[#0067A1]" />
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Respiratory Function & Exposure</h3>
            <span className="ml-auto text-[11px] text-slate-400 font-normal">Recorded Telemetry</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {metrics.map((m, i) => {
              const toneStyle = m.tone === 'emerald'
                ? { card: 'bg-emerald-50/50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
                : m.tone === 'amber'
                ? { card: 'bg-amber-50/50 border-amber-200', badge: 'bg-amber-100 text-amber-800 border-amber-200' }
                : { card: 'bg-rose-50/40 border-rose-200', badge: 'bg-rose-100 text-rose-700 border-rose-200' };

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 + i * 0.05 }}
                  className={`p-2.5 rounded-md border flex flex-col justify-between gap-1.5 ${toneStyle.card}`}
                >
                  <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wide text-slate-600 truncate">{m.label}</p>
                  <div>
                    <span className="text-base sm:text-lg font-semibold font-mono text-slate-900">{m.value}</span>
                    {m.unit && <span className="text-[10px] text-slate-500 ml-1">{m.unit}</span>}
                  </div>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border w-fit ${toneStyle.badge}`}>
                    {m.status}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Symptoms row */}
          <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">
              <strong className="font-semibold text-slate-800">Recorded Symptoms:</strong>{' '}
              Cough: <span className="font-medium">{inputs.cough_frequency || 'None'}</span> ·
              Breathlessness: <span className="font-medium">{inputs.breathlessness || 'None'}</span> ·
              Wheezing: <span className="font-medium">{inputs.wheezing ? 'Present' : 'Absent'}</span>
            </span>
          </div>
        </motion.div>

        {/* ── Assessment Observations ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-lg border border-slate-200 shadow-2xs p-3.5 sm:p-5 space-y-4"
        >
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <Zap className="w-4 h-4 text-[#0067A1]" />
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Assessment Observations</h3>
          </div>

          {/* Primary Summary Text */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
            {parsedAi?.analysis || "Based on self-reported inputs, respiratory measures reflect your current breath-holding capacity and recorded environmental exposure. Continue monitoring and practice regular breathing exercises."}
          </div>

          {/* Key Findings Badges */}
          {Array.isArray(parsedAi?.key_findings) && parsedAi.key_findings.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
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

          {/* Positive Aspects & Improvement Areas in a 2-col Grid */}
          {((Array.isArray(parsedAi?.positive_aspects) && parsedAi.positive_aspects.length > 0) ||
            (Array.isArray(parsedAi?.improvement_areas) && parsedAi.improvement_areas.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Positive Indicators */}
              {Array.isArray(parsedAi?.positive_aspects) && parsedAi.positive_aspects.length > 0 && (
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Positive Indicators
                  </span>
                  <ul className="space-y-1.5 text-xs text-emerald-950">
                    {parsedAi.positive_aspects.map((pos, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-snug">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{pos}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Focus Areas */}
              {Array.isArray(parsedAi?.improvement_areas) && parsedAi.improvement_areas.length > 0 && (
                <div className="p-3 bg-sky-50/50 border border-sky-200 rounded-lg space-y-2">
                  <span className="text-[11px] font-semibold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#0067A1]" /> Recommended Focus Areas
                  </span>
                  <ul className="space-y-1.5 text-xs text-sky-950">
                    {parsedAi.improvement_areas.map((area, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-snug">
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
            <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <Stethoscope className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <strong className="font-semibold text-amber-950">Clinical Guidance:</strong> {parsedAi.medical_attention}
              </span>
            </div>
          )}

          {/* ── Suggested Doctor Consultation (Premium Healthcare Banner) ── */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-sky-50/80 via-white to-blue-50/40 rounded-xl border border-sky-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0067A1]/10 flex items-center justify-center text-[#0067A1] shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Suggested Specialist Consultation
                </h4>
              </div>
              <Link
                href="/doctors"
                className="text-[11px] font-semibold text-[#0067A1] hover:underline inline-flex items-center gap-1"
              >
                <span>Browse All Doctors</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed sm:pl-9">
              Based on your recorded screening responses, you may consider consulting a{" "}
              <span className="font-semibold text-slate-900">
                {suggestedSpecialties.map(s => s.shortName).join(" or ")}
              </span>{" "}
              for personalized clinical guidance and evaluation.
            </p>

            <div className="flex items-center gap-2 flex-wrap sm:pl-9 pt-0.5">
              {suggestedSpecialties.map((s, idx) => (
                <Link
                  key={idx}
                  href={`/doctors?specialty=${s.specialtyParam}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                    idx === 0
                      ? "bg-[#0067A1] hover:bg-[#005584] text-white hover:shadow-xs"
                      : "bg-white border border-slate-300 hover:border-[#0067A1] text-slate-800 hover:text-[#0067A1] hover:bg-slate-50"
                  }`}
                >
                  <span>Consult {s.shortName}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Suggested Respiratory Wellness Practices */}
          <div className="pt-3 border-t border-slate-200/80">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Suggested Respiratory Wellness Practices
              </h4>
              <span className="text-[11px] font-medium text-slate-500">
                Tailored to your symptoms & ambient AQI ({aqiVal})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {resolvedPractices.map((practice, i) => (
                <div
                  key={practice.id || i}
                  className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Header badge & timeframe */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${practice.badgeColor || 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                          {practice.category}
                        </span>
                        {practice.priorityTag && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {practice.priorityTag}
                          </span>
                        )}
                      </div>
                      {practice.timeframe && (
                        <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {practice.timeframe}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h5 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug pt-0.5">
                      {practice.title}
                    </h5>

                    {/* Benefit / Description */}
                    <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                      {practice.description}
                    </p>

                    {/* Step-by-step guidance list */}
                    {Array.isArray(practice.action_steps) && practice.action_steps.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recommended Steps:</span>
                        <ul className="space-y-1">
                          {practice.action_steps.map((step, sIdx) => (
                            <li key={sIdx} className="text-[11px] text-slate-700 flex items-start gap-1.5 leading-normal">
                              <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Optional CTA to practice inside LungConnect */}
                  {practice.hubLink && (
                    <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href={practice.hubLink}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0067A1] hover:text-[#005584] transition-colors"
                      >
                        <span>Open Interactive Breathing Timer</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>

      {/* LC-10: Snapshot Modal */}
      <LungSnapshotModal
        isOpen={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        assessmentData={assessmentData}
        trendPoints={trendPoints}
        patientData={patientData}
        resolvedPractices={resolvedPractices}
        metrics={metrics}
      />

      {/* ─── Detail Modal (Full Multi-Format Report Viewer Workbench) ─── */}
      {showReportViewer && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl max-h-[96vh] rounded-[6px] shadow-2xl flex flex-col overflow-hidden text-slate-900 border border-slate-700/50 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono font-bold uppercase text-[#007a8c] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-[4px]">
                  {formattedSerialNo}
                </span>
                <span className="text-xs font-bold text-slate-300">•</span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  LungConnect Authoritative Clinical Report
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReportViewer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[5px] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Format Selection Tab Bar */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
                Official Format:
              </span>
              {[
                { id: "lung-v9.9", label: "Health Summary", badge: "Frozen 1-Page A4 Fixed" },
                { id: "lung-full", label: "Full • Clinical Assessment", badge: "Comprehensive Matrix" }
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedLungFormat(fmt.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedLungFormat === fmt.id
                      ? "bg-[#007a8c] text-white shadow-sm ring-1 ring-slate-900"
                      : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  <span>{fmt.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-normal ${selectedLungFormat === fmt.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {fmt.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Modal Body: Sleek dark inspection workbench with centered A4 document */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900/90 flex justify-center items-start">
              <div className="bg-white shadow-2xl ring-1 ring-black/20 overflow-x-auto max-w-full rounded-[2px]">
                {selectedLungFormat === "lung-v9.9" ? (
                  <LungConnectV99Report
                    assessmentData={assessmentData}
                    patientData={patientData}
                  />
                ) : (
                  <LungConnectFullReport
                    assessmentData={assessmentData}
                    patientData={patientData}
                  />
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowReportViewer(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReport(selectedLungFormat)}
                  disabled={printingReport}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-[5px] text-xs font-bold border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-[#007a8c]" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedLungFormat)}
                  disabled={downloadingPDF}
                  className="px-4 py-2 bg-[#007a8c] hover:bg-[#005e6c] text-white rounded-[5px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {selectedLungFormat === "lung-full" ? "Full Clinical" : "Health Summary"} PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}