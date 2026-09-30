"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity, Wind, ChevronLeft, Download,
  AlertTriangle, Stethoscope, Calendar,
  Zap, Info, CheckCircle2, FileText, History, Printer, Eye, X
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
      try { setAssessmentData(JSON.parse(resultData)); hasSessionResult = true; }
      catch (e) { console.warn("Could not parse lungAssessmentResult", e); }
    }

    const userDataRaw = typeof window !== 'undefined'
      ? (localStorage.getItem('userData') || localStorage.getItem('user')) : null;
    let parsedUser = null;
    if (userDataRaw) {
      try { parsedUser = JSON.parse(userDataRaw); setPatientData(parsedUser); }
      catch (e) { console.warn("Could not parse userData", e); }
    }

    const userId = parsedUser?.user_id || parsedUser?.user?.id || parsedUser?.id;
    if (!hasSessionResult && userId && userId !== 'usr_guest') {
      fetch(`/api/health/assessments?user_id=${userId}&type=lung&limit=1`)
        .then(r => r.json())
        .then(res => { if (res.success && res.data?.assessments?.length > 0) setAssessmentData(res.data.assessments[0]); })
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
  const aqiVal = Number(rawInputs.aqi) || 68;
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
              Assessment Summary
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
                <div className="bg-white/10 rounded p-2 border border-white/15">
                  <p className="text-[10px] text-white/70 font-medium uppercase">Source Modality</p>
                  <p className="font-medium text-white text-sm">Self-Reported</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowSnapshotModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-md text-xs font-medium transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> Full Report
                </button>
                <Link
                  href="/dashboard/assessments"
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-md text-xs font-medium transition-all"
                >
                  <History className="w-3.5 h-3.5" /> History
                </Link>
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

          {/* Suggested Respiratory Wellness Practices */}
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Suggested Respiratory Wellness Practices
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Array.isArray(recommendations) && recommendations.length > 0
                ? recommendations.slice(0, 4).map((rec, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">{rec.title || `Action Plan ${i + 1}`}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                        {rec.category || 'Wellness'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3 font-normal">
                      {rec.description || (rec.action_steps?.[0]) || 'Practice daily diaphragmatic breathing and monitor local air quality.'}
                    </p>
                  </div>
                ))
                : (
                  <>
                    <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                      <span className="text-xs font-semibold text-slate-900">Diaphragmatic Breathing</span>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                        Perform 5–10 minutes of deep belly breathing or box breathing daily to strengthen respiratory muscles.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                      <span className="text-xs font-semibold text-slate-900">Air Quality Protection</span>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                        Use HEPA filtration indoors during high pollution days and wear an N95 mask in congested traffic.
                      </p>
                    </div>
                  </>
                )
              }
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
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider shrink-0 mr-1">
                Official Format:
              </span>
              {[
                { id: "lung-v9.9", label: "V9.9 • Health Summary", badge: "Frozen 1-Page A4 Fixed" },
                { id: "lung-full", label: "Full • Clinical Assessment", badge: "Comprehensive Matrix" }
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedLungFormat(fmt.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
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
                  <span>Download {selectedLungFormat === "lung-full" ? "Full Clinical" : "V9.9"} PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}