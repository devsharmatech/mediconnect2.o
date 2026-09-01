"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity, Wind, ChevronLeft, Download,
  TrendingUp, AlertTriangle, Stethoscope, Calendar,
  Zap, Info, CheckCircle2
} from 'lucide-react';
import { FaLungs } from 'react-icons/fa';
import { motion } from 'framer-motion';
import AssessmentTrendChart from '@/components/public-site/health/AssessmentTrendChart';
import AssessmentPrintReport from '@/components/public-site/health/AssessmentPrintReport';
import { generateClientPdf } from '@/lib/clientPdfGenerator';

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

  const reportRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const resultData = sessionStorage.getItem('lungAssessmentResult');
    if (resultData) {
      setAssessmentData(JSON.parse(resultData));
    } else {
      router.push('/lung-assessment');
    }

    const userDataRaw = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
    if (userDataRaw) {
      try {
        setPatientData(JSON.parse(userDataRaw));
      } catch (e) {
        console.warn("Could not parse userData", e);
      }
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

        const res = await fetch(`/api/health/assessments/graph?user_id=${userId}&type=lung&timeframe=year&limit=50`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to load lung history');
        }

        setGraphData(data.data.graphData || null);
        setGraphSummary(data.data.summary || null);
        setHistory(data.data.history || []);
      } catch (error) {
        console.error('Error loading lung graph data:', error);
        setGraphError('Unable to load your lung health history right now.');
      } finally {
        setGraphLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-[#0067A1] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading your respiratory screening results...</p>
        </div>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-md w-full text-center">
          <FaLungs className="w-14 h-14 text-teal-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Assessment Required</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Please complete the respiratory wellness assessment to view your calculated lung lifestyle indicators.
          </p>
          <button
            type="button"
            onClick={() => router.push('/lung-assessment')}
            className="w-full bg-[#0067A1] hover:bg-[#005584] text-white py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Take Assessment
          </button>
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
  } = assessmentData;

  const inputs = assessmentData.lung_health_inputs?.[0] || {};

  // Formatted Serial No fallback
  const formattedSerialNo = serial_no || (assessmentId
    ? `LCN-${new Date(created_at).getFullYear()}-${assessmentId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
    : 'LCN-LATEST'
  );

  const riskBadgeStyles = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200',
    critical: 'bg-red-50 text-red-700 border-red-200'
  };

  const currentRiskBadge = riskBadgeStyles[risk_level?.toLowerCase()] || riskBadgeStyles.moderate;

  /**
   * Client-side high-resolution canvas PDF generation
   * Instant, reliable, and completely independent of external backend APIs
   */
  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      const filename = `mediconnect-lung-report-${formattedSerialNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      await generateClientPdf(reportRef.current, filename);
    } catch (error) {
      console.error('Client PDF generation error, falling back to window.print():', error);
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Trend data points for line graph
  const trendPoints = graphData?.healthScoreTrend?.filter((p) => p.type === 'lung') || [];

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 py-4 sm:py-6 px-3 sm:px-6 font-sans">
      
      {/* Hidden Off-Screen Report Template for Canvas/PDF Generation */}
      <AssessmentPrintReport
        assessmentType="lung"
        assessmentData={assessmentData}
        patientData={patientData}
        reportRef={reportRef}
      />

      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">

        {/* Top Header Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors shrink-0 mt-0.5 cursor-pointer"
                title="Back to Dashboard"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Respiratory Health Screening Summary
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 max-w-xl leading-relaxed">
                  Assessment summary based on recorded self-reported measures. This utility does not replace clinical spirometry or diagnostic testing.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                  <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-200 font-mono">
                    Serial No: #{formattedSerialNo}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded border border-emerald-200">
                    Source: Self-reported
                  </span>
                  <span className="flex items-center gap-1 text-slate-400 ml-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all border border-slate-200 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                {downloadingPDF ? 'Generating PDF...' : 'PDF Report'}
              </button>
              <Link
                href="/doctors"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0067A1] hover:bg-[#005584] text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Consult Doctor
              </Link>
            </div>
          </div>
        </div>

        {/* Safety Notice Banner */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5 sm:p-3 flex items-start gap-2.5 text-[11px] sm:text-xs text-amber-900 leading-relaxed shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Important Clinical Notice:</span> If experiencing acute shortness of breath, continuous chest tightness, or hemoptysis (coughing blood), seek immediate hospital emergency care.
          </div>
        </div>

        {/* Primary Health Spectrum & Trend Line Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Main Score & Risk Overview */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">Lung Health Index</h2>
                <p className="text-[11px] text-slate-400">Calculated lifestyle score</p>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${currentRiskBadge}`}>
                {risk_level} Risk
              </span>
            </div>

            <div className="flex items-center justify-center my-3">
              <div className="relative w-36 h-36 flex items-center justify-center rounded-full border-6 border-slate-100 bg-gradient-to-b from-slate-50 to-white shadow-inner">
                <div className="text-center">
                  <span className="text-3xl font-black text-slate-900 block font-mono">{health_score}</span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mt-0.5">OUT OF 100</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100">
              <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200/80">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Age at Assessment</p>
                <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 font-mono">{inputs.age || 35} yrs</p>
              </div>
              <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200/80">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Breath-Hold Time</p>
                <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 font-mono">
                  {inputs.breath_holding_time || 35} <span className="text-[10px] font-normal text-slate-400">sec</span>
                </p>
              </div>
            </div>
          </div>

          {/* Real Assessment Trend Line Graph */}
          <AssessmentTrendChart
            trendData={trendPoints}
            assessmentType="lung"
            currentScore={health_score}
            currentDate={created_at}
          />

        </div>

        {/* Respiratory Measurements & Environmental Spectrum */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wind className="w-4 h-4 text-[#0067A1]" />
              Respiratory Function & Exposure Observations
            </h3>
            <span className="text-[10px] text-slate-400">Recorded Inputs</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              {
                label: 'Peak Expiratory Flow',
                value: inputs.peak_flow ? `${inputs.peak_flow}` : '450',
                unit: 'L/min',
                status: inputs.peak_flow >= 450 ? 'Optimal' : inputs.peak_flow >= 350 ? 'Moderate' : 'Below Ref',
                badgeClass: inputs.peak_flow >= 450 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              },
              {
                label: 'Breaths Per Minute',
                value: inputs.breaths_per_minute || '16',
                unit: 'breaths/min',
                status: (inputs.breaths_per_minute >= 12 && inputs.breaths_per_minute <= 20) ? 'Normal' : 'Elevated',
                badgeClass: (inputs.breaths_per_minute >= 12 && inputs.breaths_per_minute <= 20) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              },
              {
                label: 'Local AQI Exposure',
                value: inputs.aqi || '60',
                unit: 'AQI',
                status: inputs.aqi > 150 ? 'Unhealthy' : inputs.aqi > 100 ? 'Moderate' : 'Good',
                badgeClass: inputs.aqi > 150 ? 'bg-rose-50 text-rose-700 border-rose-200' : inputs.aqi > 100 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              },
              {
                label: 'Smoking Status',
                value: inputs.smoking_status ? (inputs.smoking_status.charAt(0).toUpperCase() + inputs.smoking_status.slice(1)) : 'Never',
                unit: inputs.smoking_pack_years ? `${inputs.smoking_pack_years} pk-yrs` : '',
                status: inputs.smoking_status === 'current' ? 'High Risk' : inputs.smoking_status === 'former' ? 'Former Smoker' : 'Non-Smoker',
                badgeClass: inputs.smoking_status === 'current' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }
            ].map((metric, idx) => (
              <div key={idx} className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 flex flex-col justify-between">
                <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide">{metric.label}</p>
                <div className="my-1.5">
                  <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">{metric.value}</span>{' '}
                  <span className="text-[10px] text-slate-400 font-normal">{metric.unit}</span>
                </div>
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${metric.badgeClass}`}>
                    {metric.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Recorded Symptoms:</span> Cough frequency: <span className="font-medium text-slate-900">{inputs.cough_frequency || 'None'}</span> · Breathlessness scale: <span className="font-medium text-slate-900">{inputs.breathlessness || 'None'}</span> · Wheezing: <span className="font-medium text-slate-900">{inputs.wheezing ? 'Present' : 'Absent'}</span>.
            </div>
          </div>
        </div>

        {/* Narrative Analysis & Observations */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Zap className="w-4 h-4 text-[#0067A1]" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Assessment Summary & Observations
            </h3>
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
            <p>
              {typeof ai_analysis === 'string'
                ? ai_analysis
                : (ai_analysis?.analysis || "Assessment summary: Based on self-reported inputs, respiratory measures reflect current breath-holding capacity and recorded environmental exposure.")}
            </p>
          </div>

          {/* Action Recommendations */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Suggested Respiratory Wellness Practices
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Array.isArray(recommendations) && recommendations.length > 0 ? (
                recommendations.slice(0, 4).map((rec, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/90 text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900 text-xs">{rec.title || `Action Plan ${idx + 1}`}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {rec.category || 'Wellness'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                      {rec.description || (rec.action_steps && rec.action_steps[0]) || 'Practice daily diaphragmatic breathing and monitor local air quality.'}
                    </p>
                  </div>
                ))
              ) : (
                <>
                  <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/90 text-xs space-y-1">
                    <span className="font-semibold text-slate-900 text-xs">Diaphragmatic Breathing</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Perform 5–10 minutes of deep belly breathing or box breathing daily to strengthen respiratory muscles.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/90 text-xs space-y-1">
                    <span className="font-semibold text-slate-900 text-xs">Air Quality Protection</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Use HEPA filtration indoors during high pollution days and wear an N95 mask in congested traffic.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}