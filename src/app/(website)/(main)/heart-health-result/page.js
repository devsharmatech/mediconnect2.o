"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity, Heart, ShieldAlert, ChevronLeft, Download,
  TrendingUp, AlertTriangle, Stethoscope, Calendar, Clock,
  User, Ruler, Scale, Zap, Info, CheckCircle2, Printer, X, FileText, Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import AssessmentTrendChart from '@/components/public-site/health/AssessmentTrendChart';
import AssessmentPrintReport from '@/components/public-site/health/AssessmentPrintReport';
import CardioConnectF1Report from '@/components/public-site/health/reports/CardioConnectF1Report';
import CardioConnectF2Report from '@/components/public-site/health/reports/CardioConnectF2Report';
import CardioConnectF3Report from '@/components/public-site/health/reports/CardioConnectF3Report';
import CardioConnectF4Report from '@/components/public-site/health/reports/CardioConnectF4Report';
import { generateClientPdf, printClientReport } from '@/lib/clientPdfGenerator';
import { AnimatedCardioLoader } from '@/components/public-site/health/animations';

export default function HeartHealthResult() {
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
  const [selectedFormat, setSelectedFormat] = useState("F4");
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [cardioHomeData, setCardioHomeData] = useState(null);

  const reportRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const resultData = sessionStorage.getItem('heartAssessmentResult');
    if (resultData) {
      try {
        setAssessmentData(JSON.parse(resultData));
      } catch (e) {
        console.warn("Could not parse heartAssessmentResult", e);
      }
    }

    const userDataRaw = typeof window !== 'undefined' ? (localStorage.getItem('userData') || localStorage.getItem('user')) : null;
    let userId = null;
    if (userDataRaw) {
      try {
        const parsed = JSON.parse(userDataRaw);
        const resolvedName =
          parsed?.details?.full_name ||
          parsed?.details?.name ||
          parsed?.full_name ||
          parsed?.name ||
          parsed?.user?.details?.full_name ||
          parsed?.user?.name ||
          (typeof window !== "undefined" ? (localStorage.getItem("userName") || localStorage.getItem("patient_name")) : null);
        if (resolvedName) {
          parsed.full_name = resolvedName;
          parsed.name = resolvedName;
        }
        setPatientData(parsed);
        userId = parsed.user_id || parsed.user?.id || parsed.id;
      } catch (e) {
        console.warn("Could not parse userData", e);
      }
    } else if (typeof window !== "undefined" && (localStorage.getItem("userName") || localStorage.getItem("patient_name"))) {
      const fallbackName = localStorage.getItem("userName") || localStorage.getItem("patient_name");
      setPatientData({ full_name: fallbackName, name: fallbackName });
    }

    // Fetch live RDS activity & step statistics
    const fetchLiveCardioData = async () => {
      try {
        const url = userId ? `/api/v1/cardio/home?user_id=${userId}` : '/api/v1/cardio/home';
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data) {
          setCardioHomeData(json.data);
        }
      } catch (err) {
        console.warn("Could not load live RDS cardio data:", err);
      }
    };
    fetchLiveCardioData();

    if (userId && userId !== 'usr_guest') {
      fetch(`/api/health/assessments?user_id=${userId}&type=heart&limit=1`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data?.assessments?.length > 0) {
            const latest = res.data.assessments[0];
            setAssessmentData(prev => {
              if (!prev) return latest;
              return {
                ...prev,
                patient_name: prev.patient_name || latest.patient_name,
                patientName: prev.patientName || latest.patient_name,
                patient_gender: prev.patient_gender || latest.patient_gender,
                patient_dob: prev.patient_dob || latest.patient_dob,
                patient_blood_group: prev.patient_blood_group || latest.patient_blood_group,
              };
            });
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
        .catch(e => console.warn("Could not fetch latest heart assessment", e));
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    const userData = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
    if (!userData) {
      setGraphLoading(false);
      return;
    }

    const fetchGraphData = async () => {
      try {
        setGraphLoading(true);
        setGraphError(null);
        const parsed = JSON.parse(userData);
        const userId = parsed.user_id || parsed.user?.id || parsed.id;
        if (!userId) {
          setGraphLoading(false);
          return;
        }

        const res = await fetch(`/api/health/assessments/graph?user_id=${userId}&type=heart&timeframe=year&limit=50`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to load heart history');
        }

        setGraphData(data.data.graphData || null);
        setGraphSummary(data.data.summary || null);
        setHistory(data.data.history || []);
      } catch (error) {
        console.error('Error loading heart graph data:', error);
        setGraphError('Unable to load your heart health history right now.');
      } finally {
        setGraphLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  const effectiveAssessmentData = React.useMemo(() => {
    if (!assessmentData) return null;
    const baseInputs = assessmentData.heart_health_inputs?.[0] || {};

    // Live AWS RDS activity metrics
    const liveSteps = cardioHomeData?.today_movement?.steps !== undefined 
      ? Number(cardioHomeData.today_movement.steps) 
      : (baseInputs.daily_steps !== undefined ? Number(baseInputs.daily_steps) : 0);

    const liveWeeklyMin = cardioHomeData?.weekly_activity?.recorded_minutes !== undefined 
      ? Number(cardioHomeData.weekly_activity.recorded_minutes) 
      : (baseInputs.physical_activity_minutes !== undefined ? Number(baseInputs.physical_activity_minutes) : 0);

    const liveAqi = cardioHomeData?.aqi_context?.value || baseInputs.aqi || 85;
    const liveLocation = cardioHomeData?.aqi_context?.location || baseInputs.location || baseInputs.city || "Current Location";

    return {
      ...assessmentData,
      heart_health_inputs: [
        {
          ...baseInputs,
          daily_steps: liveSteps,
          steps: liveSteps,
          physical_activity_minutes: liveWeeklyMin,
          weekly_sessions: liveWeeklyMin > 0 ? Math.max(1, Math.round(liveWeeklyMin / 45)) : 0,
          aqi: liveAqi,
          city: liveLocation,
          location: liveLocation
        }
      ]
    };
  }, [assessmentData, cardioHomeData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
          <AnimatedCardioLoader
            title="Loading your heart screening results..."
            subtitle="Analyzing cardiovascular markers & risk indicators"
          />
        </div>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[5px] p-8 border border-slate-200 shadow-sm max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-[5px] bg-[#003358]/10 text-[#003358] flex items-center justify-center mx-auto mb-4">
            <Heart className="w-7 h-7" />
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-[5px] text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
            Open Access Rule
          </span>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No Compulsory Assessment</h2>
          <p className="text-xs text-slate-900 mb-6 leading-relaxed">
            CardioConnect wellness activities are open to every patient without requiring a prior assessment. You can launch Heart Training sessions, test functional capacity with the 6-Minute Walking Test, or view the factor spectrum.
          </p>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => router.push('/website/cardio-connect?action=training')}
              className="w-full bg-[#003358] hover:bg-[#00223d] text-white py-2.5 rounded-[5px] text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" /> Start Heart Training
            </button>
            <button
              type="button"
              onClick={() => router.push('/website/cardio-connect?action=walking')}
              className="w-full bg-[#0067A1] hover:bg-[#005584] text-white py-2.5 rounded-[5px] text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4" /> Walking Performance Test
            </button>
            <button
              type="button"
              onClick={() => router.push('/website/cardio-connect')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
            >
              Enter CardioConnect Home
            </button>
            <button
              type="button"
              onClick={() => router.push('/website/heart-health')}
              className="w-full text-slate-800 hover:text-slate-950 py-1.5 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Or complete an optional cardio screening →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    health_score = 75,
    risk_level = 'moderate',
    risk_factors = [],
    ai_analysis,
    recommendations,
    created_at = new Date().toISOString(),
    id: assessmentId,
    serial_no
  } = effectiveAssessmentData || assessmentData;

  const inputs = (effectiveAssessmentData || assessmentData).heart_health_inputs?.[0] || {};

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

  // Formatted Serial No fallback
  const formattedSerialNo = serial_no || (assessmentId
    ? `CCN-${new Date(created_at).getFullYear()}-${String(assessmentId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
    : 'CCN-LATEST'
  );

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

  let parsedRecs = [];
  if (Array.isArray(recommendations)) {
    parsedRecs = recommendations;
  } else if (typeof recommendations === 'string') {
    try {
      const p = JSON.parse(recommendations);
      if (Array.isArray(p)) parsedRecs = p;
      else if (Array.isArray(p?.recommendations)) parsedRecs = p.recommendations;
    } catch (e) {}
  }

  const riskBadgeStyles = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200',
    critical: 'bg-red-50 text-red-700 border-red-200'
  };

  const currentRiskBadge = riskBadgeStyles[risk_level?.toLowerCase()] || riskBadgeStyles.moderate;

  /**
   * Client-side high-resolution canvas PDF generation supporting F1, F2, F3, F4 formats
   */
  const handleDownloadPDF = async (format = selectedFormat) => {
    try {
      setDownloadingPDF(true);
      setSelectedFormat(format);
      await new Promise((resolve) => setTimeout(resolve, 350));
      const filename = `mediconnect-cardio-${format}-${formattedSerialNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      await generateClientPdf(reportRef.current, filename);
    } catch (error) {
      console.error('Client PDF generation error, falling back to window.print():', error);
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  /**
   * High-Resolution Direct Print with MediConnect Logo and Watermark
   */
  const handlePrintReport = async (format = selectedFormat) => {
    try {
      setPrintingReport(true);
      setSelectedFormat(format);
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (!reportRef.current) throw new Error("Report element not found");
      await printClientReport(reportRef.current);
    } catch (error) {
      console.error('Client print error, falling back to window.print():', error);
      window.print();
    } finally {
      setPrintingReport(false);
    }
  };

  // Trend data points for line graph
  const trendPoints = graphData?.healthScoreTrend?.filter((p) => p.type === 'heart') || [];

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 py-4 sm:py-6 px-3 sm:px-6 font-sans">
      
      {/* Hidden Off-Screen Report Template for Canvas/PDF Generation */}
      <AssessmentPrintReport
        assessmentType="heart"
        formatType={selectedFormat}
        assessmentData={assessmentData}
        patientData={patientData}
        reportRef={reportRef}
      />

      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">

        {/* Top Header Card */}
        <div className="bg-white rounded-[5px] border border-slate-200 shadow-xs overflow-hidden">
          {/* Main Header Row */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex items-center gap-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-[5px] text-slate-700 transition-colors shrink-0 cursor-pointer border border-slate-200"
              title="Back to Dashboard"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0067A1] bg-sky-50 px-2 py-0.5 rounded-[4px] border border-sky-200 shrink-0">
                  CardioConnect
                </span>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                  Cardiovascular Health Screening Summary
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed hidden sm:block">
                Assessment summary based on entered information. Does not diagnose cardiovascular disease or determine treatment.
              </p>
            </div>
          </div>

          {/* Meta + Actions Row */}
          <div className="px-4 py-2.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/60">
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
              <span className="bg-slate-100 text-slate-600 font-mono font-semibold px-2 py-0.5 rounded border border-slate-200">
                #{formattedSerialNo}
              </span>
              {resolvedPatientName && (
                <span className="bg-sky-50 text-sky-800 font-semibold px-2 py-0.5 rounded border border-sky-200">
                  Patient: {resolvedPatientName}
                </span>
              )}
              <span className="bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded border border-emerald-200">
                Self-reported
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <Calendar className="w-3 h-3" />
                {new Date(created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0b3b60] hover:bg-[#07243c] text-white rounded-[5px] text-xs font-bold transition-colors cursor-pointer"
                title="Open Clinical Report Viewer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Report</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFormatModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
                title="Choose preferred clinical report format"
              >
                <span>Report Format</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintReport(selectedFormat)}
                disabled={printingReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                title="Print Clinical Report"
              >
                <Printer className="w-3.5 h-3.5 text-[#0067A1]" />
                <span className="hidden sm:inline">{printingReport ? 'Preparing...' : 'Print'}</span>
                <span className="sm:hidden">{printingReport ? '...' : 'Print'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPDF(selectedFormat)}
                disabled={downloadingPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1] hover:bg-[#005282] text-white rounded-[5px] text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                title="Download PDF Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingPDF ? 'Generating...' : 'Download PDF'}</span>
              </button>

              <Link
                href="/doctors"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-[5px] text-xs font-semibold shadow-2xs transition-all"
              >
                <Stethoscope className="w-3.5 h-3.5 text-[#0067A1]" />
                <span className="hidden sm:inline">Consult Doctor</span>
                <span className="sm:hidden">Consult</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Emergency Safety Notice Banner (SP-07 P1-14) */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-[5px] p-2.5 sm:p-3 flex items-start gap-2.5 text-[11px] sm:text-xs text-amber-900 leading-relaxed shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Important Clinical Notice:</span> If you have severe chest pain, sudden breathlessness, fainting, or acute symptoms, seek immediate emergency medical care rather than relying on this wellness screening.
          </div>
        </div>

        {/* Your Assessment Answers */}
        <div className="bg-white rounded-[5px] border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 sm:px-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">Your Assessment Answers</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Information entered for this screening session</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Self-Reported
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Group 1: Personal & Vitals */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <User className="w-3 h-3" /> Personal & Vitals
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {[
                  { label: "Patient", value: resolvedPatientName || "Self-Reported" },
                  { label: "Age", value: inputs.age ? `${inputs.age} yrs` : "—" },
                  { label: "Gender", value: inputs.gender ? (inputs.gender.charAt(0).toUpperCase() + inputs.gender.slice(1)) : "—" },
                  { label: "Height", value: inputs.height_cm ? `${inputs.height_cm} cm` : "—" },
                  { label: "Weight", value: inputs.weight_kg ? `${inputs.weight_kg} kg` : "—" },
                  { label: "Blood Pressure", value: inputs.systolic_bp && inputs.diastolic_bp ? `${inputs.systolic_bp}/${inputs.diastolic_bp} mmHg` : "—" },
                  { label: "Resting Heart Rate", value: inputs.resting_heart_rate ? `${inputs.resting_heart_rate} bpm` : "—" },
                  { label: "Total Cholesterol", value: inputs.total_cholesterol ? `${inputs.total_cholesterol} mg/dL` : "—" },
                  { label: "HDL Cholesterol", value: inputs.hdl_cholesterol ? `${inputs.hdl_cholesterol} mg/dL` : "—" },
                  { label: "LDL Cholesterol", value: inputs.ldl_cholesterol ? `${inputs.ldl_cholesterol} mg/dL` : "—" },
                  { label: "Triglycerides", value: inputs.triglycerides ? `${inputs.triglycerides} mg/dL` : "—" },
                  { label: "Fasting Glucose", value: inputs.fasting_glucose ? `${inputs.fasting_glucose} mg/dL` : "—" },
                  { label: "HbA1c", value: inputs.hba1c ? `${inputs.hba1c}%` : "—" },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-[5px] px-3 py-2.5 border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide leading-tight">{item.label}</p>
                    <p className="text-xs sm:text-[13px] font-bold text-slate-900 mt-0.5 font-mono">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Group 2: Lifestyle */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Lifestyle
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  {
                    label: "Smoking Status",
                    value: inputs.smoking_status
                      ? ({ never: "Non-Smoker", former: "Former Smoker", current: "Current Smoker", light: "Light Smoker", heavy: "Heavy Smoker" }[inputs.smoking_status] || inputs.smoking_status)
                      : "—"
                  },
                  {
                    label: "Physical Activity",
                    value: inputs.physical_activity_minutes != null
                      ? `${inputs.physical_activity_minutes} min/wk`
                      : "—"
                  },
                  {
                    label: "Alcohol Consumption",
                    value: inputs.alcohol_consumption
                      ? (inputs.alcohol_consumption.charAt(0).toUpperCase() + inputs.alcohol_consumption.slice(1))
                      : "—"
                  },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-[5px] px-3 py-2.5 border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide leading-tight">{item.label}</p>
                    <p className="text-xs sm:text-[13px] font-bold text-slate-900 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Group 3: Medical History & Symptoms */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3" /> Medical History & Symptoms
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
                {[
                  { label: "Family Cardiac History", value: inputs.family_cardiac_history },
                  { label: "Hypertension History", value: inputs.hypertension_history },
                  { label: "Diabetes History", value: inputs.diabetes_history },
                  { label: "Chest Pain", value: inputs.chest_pain },
                  { label: "Breathlessness", value: inputs.breathlessness },
                  { label: "Palpitations", value: inputs.palpitations },
                ].map((item) => (
                  <div key={item.label} className={`rounded-[5px] px-3 py-2.5 border flex items-center gap-2 ${item.value ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${item.value ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide leading-tight">{item.label}</p>
                      <p className={`text-xs font-bold mt-0.5 ${item.value ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {item.value === undefined || item.value === null ? "Not answered" : item.value ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Health Spectrum & Trend Line Grid */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Main Spectrum Factor Overview (Replaces legacy 0-100 composite score) */}
          <div className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">Heart Health Spectrum Overview</h2>
                <p className="text-[11px] text-slate-800">Factor-level cardiovascular wellness observations</p>
              </div>
              <span className="px-2.5 py-1 rounded-[5px] text-[11px] font-semibold uppercase tracking-wider bg-sky-50 text-[#003358] border border-sky-200">
                11 Factors Tracked
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 my-2">
              <div className="p-2.5 bg-slate-50/80 rounded-[5px] border border-slate-200/80">
                <span className="text-[10px] uppercase font-semibold text-slate-800 block">Resting Heart Rate</span>
                <span className="text-base font-semibold text-slate-900 font-mono mt-0.5 block">{inputs.resting_heart_rate || 72} bpm</span>
                <span className="text-[10px] text-emerald-600 font-medium">Recorded Metric</span>
              </div>
              <div className="p-2.5 bg-slate-50/80 rounded-[5px] border border-slate-200/80">
                <span className="text-[10px] uppercase font-semibold text-slate-800 block">Blood Pressure</span>
                <span className="text-base font-semibold text-slate-900 font-mono mt-0.5 block">{inputs.systolic_bp || 120}/{inputs.diastolic_bp || 80} mmHg</span>
                <span className="text-[10px] text-slate-900 font-medium">ESC 2024 Framework</span>
              </div>
              <div className="p-2.5 bg-slate-50/80 rounded-[5px] border border-slate-200/80">
                <span className="text-[10px] uppercase font-semibold text-slate-800 block">Physical Activity</span>
                <span className="text-base font-semibold text-slate-900 font-mono mt-0.5 block">{inputs.physical_activity_minutes ? `${inputs.physical_activity_minutes}m` : '150m'}/wk</span>
                <span className="text-[10px] text-slate-900 font-medium">Ref: 150–300 min/wk</span>
              </div>
              <div className="p-2.5 bg-slate-50/80 rounded-[5px] border border-slate-200/80">
                <span className="text-[10px] uppercase font-semibold text-slate-800 block">Body Mass Index</span>
                <span className="text-base font-semibold text-slate-900 font-mono mt-0.5 block">
                  {inputs.bmi ? Number(inputs.bmi).toFixed(1) : (inputs.height_cm && inputs.weight_kg ? (inputs.weight_kg / ((inputs.height_cm/100)**2)).toFixed(1) : '22.5')}
                </span>
                <span className="text-[10px] text-slate-900 font-medium">kg/m²</span>
              </div>
            </div>

            <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-800 italic">No composite score or risk tiers computed (CC-08).</span>
              <button
                type="button"
                onClick={() => router.push('/website/cardio-connect?action=training')}
                className="px-3 py-1.5 bg-[#003358] hover:bg-[#00223d] text-white text-[11px] font-bold rounded-[5px] transition-colors cursor-pointer shrink-0"
              >
                Heart Training →
              </button>
            </div>
          </div>

          {/* Real Assessment Trend Line Graph */}
          <AssessmentTrendChart
            trendData={trendPoints}
            assessmentType="heart"
            currentScore={health_score}
            currentDate={created_at}
          />

        </div>

        {/* Vital Sign Observations (Heart Health Spectrum) */}
        <div className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0067A1]" />
              Vital Sign Observations & Lipid Spectrum
            </h3>
            <span className="text-[10px] text-slate-800">Framework: 2024 ESC</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              {
                label: 'Blood Pressure',
                value: inputs.systolic_bp && inputs.diastolic_bp ? `${inputs.systolic_bp}/${inputs.diastolic_bp}` : '120/80',
                unit: 'mmHg',
                status: (inputs.systolic_bp >= 140 || inputs.diastolic_bp >= 90)
                  ? 'Potential Elevation*'
                  : (inputs.systolic_bp >= 120 || inputs.diastolic_bp >= 70)
                    ? 'Elevated BP (2024 ESC)*'
                    : 'Normal / Optimal',
                badgeClass: (inputs.systolic_bp >= 140 || inputs.diastolic_bp >= 90)
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : (inputs.systolic_bp >= 120 || inputs.diastolic_bp >= 70)
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              },
              {
                label: 'LDL Cholesterol',
                value: inputs.ldl_cholesterol || '110',
                unit: 'mg/dL',
                status: inputs.ldl_cholesterol > 160 ? 'High' : inputs.ldl_cholesterol > 115 ? 'Elevated' : 'Optimal',
                badgeClass: inputs.ldl_cholesterol > 160 ? 'bg-rose-50 text-rose-700 border-rose-200' : inputs.ldl_cholesterol > 115 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              },
              {
                label: 'Resting Heart Rate',
                value: inputs.resting_heart_rate || '72',
                unit: 'bpm',
                status: inputs.resting_heart_rate > 100 ? 'Elevated' : inputs.resting_heart_rate > 80 ? 'Moderate' : 'Normal',
                badgeClass: inputs.resting_heart_rate > 100 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              },
              {
                label: 'Physical Activity',
                value: inputs.physical_activity_minutes ? `${inputs.physical_activity_minutes}m` : (inputs.physical_activity_level || '150m'),
                unit: '/week',
                status: (inputs.physical_activity_minutes >= 150 || inputs.physical_activity_level === 'high') ? 'Adequate' : 'Low (<150m)',
                badgeClass: (inputs.physical_activity_minutes >= 150 || inputs.physical_activity_level === 'high') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }
            ].map((metric, idx) => (
              <div key={idx} className="p-3 bg-slate-50/80 rounded-[5px] border border-slate-200/80 flex flex-col justify-between">
                <p className="text-[10px] uppercase font-semibold text-slate-800 tracking-wide">{metric.label}</p>
                <div className="my-1.5">
                  <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">{metric.value}</span>{' '}
                  <span className="text-[10px] text-slate-800 font-normal">{metric.unit}</span>
                </div>
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${metric.badgeClass}`}>
                    {metric.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ESC 2024 BP Clinical Integrity Notice (SP-07 CLIN-01) */}
          <div className="mt-3 p-3 bg-slate-50 rounded-[5px] border border-slate-200 text-[11px] text-slate-950 leading-relaxed flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Blood pressure: {inputs.systolic_bp || 120}/{inputs.diastolic_bp || 80} mmHg.</span> This single reading does not diagnose hypertension. Blood-pressure classification depends on the guideline framework and repeated, properly measured clinical readings.
            </div>
          </div>
        </div>

        {/* Narrative Analysis & Observations */}
        <div className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Zap className="w-4 h-4 text-[#0067A1]" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Assessment Summary & Observations
            </h3>
          </div>

          {/* Primary Summary Text */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
            {parsedAi?.analysis || "Assessment summary: Based on the information entered for this screening, recorded measures reflect self-reported lifestyle and vital parameters. Continue monitoring and maintain heart-healthy routines."}
          </div>

          {/* Key Findings Badges */}
          {Array.isArray(parsedAi?.key_findings) && parsedAi.key_findings.length > 0 && (
            <div className="space-y-1.5 pt-1">
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

          {/* Medical Guidance */}
          {parsedAi?.medical_attention && (
            <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <Stethoscope className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <strong className="font-semibold text-amber-950">Clinical Guidance:</strong> {parsedAi.medical_attention}
              </span>
            </div>
          )}

          {/* Action Recommendations */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Suggested Cardiovascular Wellness Practices
              </h4>
              <span className="text-[10px] text-slate-900 font-medium">
                Content adapted for common Indian food and activity contexts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Array.isArray(parsedRecs) && parsedRecs.length > 0 ? (
                parsedRecs.slice(0, 4).map((rec, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/70 rounded-[5px] border border-slate-200/90 text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900 text-xs">{rec.title || `Action Plan ${idx + 1}`}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {rec.category || 'Wellness'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-950 leading-relaxed line-clamp-3">
                      {rec.description || (rec.action_steps && rec.action_steps[0]) || 'Maintain healthy daily activity and balanced diet.'}
                    </p>
                  </div>
                ))
              ) : (
                <>
                  <div className="p-3 bg-slate-50/70 rounded-[5px] border border-slate-200/90 text-xs space-y-1">
                    <span className="font-semibold text-slate-900 text-xs">1. Aerobic Physical Activity</span>
                    <p className="text-[11px] text-slate-950 leading-relaxed">
                      For adults for whom moderate-intensity aerobic activity is appropriate, 150–300 minutes per week is used as a public-health reference band. Increase activity gradually.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50/70 rounded-[5px] border border-slate-200/90 text-xs space-y-1">
                    <span className="font-semibold text-slate-900 text-xs">2. Heart-Healthy Nutrition</span>
                    <p className="text-[11px] text-slate-950 leading-relaxed">
                      Choose a dietary pattern rich in vegetables, whole grains, and legumes; prefer unsaturated plant oils and limit excess sodium, saturated fat, and processed foods.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-800">
              <span>Health education content version: V2.4 | Reviewed by: Clinical Team | Framework: 2024 ESC</span>
              <span>Screening generated · Not individualized medical advice</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Format Chooser Quick Modal (F1, F2, F3, F4) ─── */}
      {showFormatModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[5px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0067A1] bg-sky-50 px-2 py-0.5 rounded-[5px] border border-sky-200">
                  Select Official Format
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Choose CardioConnect Report Type
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFormatModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[5px] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-2.5 max-h-[70vh] overflow-y-auto">
              {[
                {
                  id: "F4",
                  name: "Comprehensive Clinical Assessment",
                  desc: "Complete clinical overview synthesizing recorded cardiovascular factors, vital markers, active training minutes, and care navigation.",
                  tag: "Master Summary"
                },
                {
                  id: "F1",
                  name: "Home & Physical Activity Report",
                  desc: "Dedicated physical activity record detailing weekly training, daily step distribution, and completed exercise sessions.",
                  tag: "Activity & Workouts"
                },
                {
                  id: "F2",
                  name: "Progress & Longitudinal Wellness",
                  desc: "Longitudinal health factor registry with recorded trends (Decreased / Increased / Stable) across milestone checkpoints.",
                  tag: "Longitudinal Trends"
                },
                {
                  id: "F3",
                  name: "6-Minute Walking Performance Test (WPT)",
                  desc: "Objective functional capacity assessment with distance, pace, step metrics, and energy calculation.",
                  tag: "Walking Endurance"
                }
              ].map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFormat(f.id)}
                  className={`p-3 rounded-[5px] border transition-all cursor-pointer flex items-start gap-3 ${
                    selectedFormat === f.id
                      ? "bg-sky-50/70 border-[#0067A1] shadow-2xs"
                      : "bg-white hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-format-select-result"
                    checked={selectedFormat === f.id}
                    onChange={() => setSelectedFormat(f.id)}
                    className="mt-1 text-[#0067A1] focus:ring-[#0067A1] cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{f.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {f.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowFormatModal(false);
                  setShowPreviewModal(true);
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-[5px] text-xs font-medium border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormatModal(false);
                    handlePrintReport(selectedFormat);
                  }}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-[5px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFormatModal(false);
                    handleDownloadPDF(selectedFormat);
                  }}
                  className="px-4 py-2 bg-[#0067A1] hover:bg-[#005282] text-white rounded-[5px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Format {selectedFormat} PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail Modal (Full Multi-Format Report Workbench Viewer) ─── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl max-h-[96vh] rounded-[6px] shadow-2xl flex flex-col overflow-hidden text-slate-900 border border-slate-700/50 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono font-bold uppercase text-[#0067A1] bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-[4px]">
                  #{formattedSerialNo}
                </span>
                <span className="text-xs font-bold text-slate-300">•</span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  CardioConnect Authoritative Clinical Report
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[5px] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Format Selection Tab Bar */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider shrink-0 mr-1">
                Report Type:
              </span>
              {[
                { id: "F4", label: "Clinical Assessment", badge: "Master" },
                { id: "F1", label: "Home & Activity", badge: "Training" },
                { id: "F2", label: "Progress & Trends", badge: "Spectrum" },
                { id: "F3", label: "Walking Test", badge: "6-Min WPT" }
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedFormat === fmt.id
                      ? "bg-[#0b3b60] text-white shadow-sm ring-1 ring-slate-900"
                      : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  <span>{fmt.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-normal ${selectedFormat === fmt.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {fmt.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Modal Body: Sleek dark inspection workbench with centered A4 document */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900/90 flex justify-center items-start">
              <div className="bg-white shadow-2xl ring-1 ring-black/20 overflow-x-auto max-w-full rounded-[2px]">
                {selectedFormat === "F1" && (
                  <CardioConnectF1Report
                    assessmentData={effectiveAssessmentData || assessmentData}
                    patientData={patientData || {}}
                    reportRef={reportRef}
                  />
                )}
                {selectedFormat === "F2" && (
                  <CardioConnectF2Report
                    assessmentData={effectiveAssessmentData || assessmentData}
                    patientData={patientData || {}}
                    reportRef={reportRef}
                  />
                )}
                {selectedFormat === "F3" && (
                  <CardioConnectF3Report
                    assessmentData={effectiveAssessmentData || assessmentData}
                    patientData={patientData || {}}
                    reportRef={reportRef}
                  />
                )}
                {selectedFormat === "F4" && (
                  <CardioConnectF4Report
                    assessmentData={effectiveAssessmentData || assessmentData}
                    patientData={patientData || {}}
                    reportRef={reportRef}
                  />
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReport(selectedFormat)}
                  disabled={printingReport}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-[5px] text-xs font-bold border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-[#0067A1]" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedFormat)}
                  disabled={downloadingPDF}
                  className="px-4 py-2 bg-[#0b3b60] hover:bg-[#082944] text-white rounded-[5px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}