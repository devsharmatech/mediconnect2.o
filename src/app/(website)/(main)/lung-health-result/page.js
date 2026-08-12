"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Share2, FileText, Activity, Wind, Apple, ShieldAlert, ChevronLeft, Download, TrendingUp, AlertTriangle, CheckCircle, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';

const LungHealthResult = () => {
  const [assessmentData, setAssessmentData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [graphSummary, setGraphSummary] = useState(null);
  const [history, setHistory] = useState([]);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    preferredDate: '',
    preferredTime: '',
    testType: 'full-check',
    notes: ''
  });

  const router = useRouter();

  useEffect(() => {
    const resultData = sessionStorage.getItem('lungAssessmentResult');
    if (resultData) {
      setAssessmentData(JSON.parse(resultData));
    } else {
      router.push('/website/lung-assessment');
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const userData = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
    if (!userData) {
      setGraphLoading(false);
      return;
    }

    const user = JSON.parse(userData);

    const fetchGraphData = async () => {
      try {
        setGraphLoading(true);
        setGraphError(null);

        const res = await fetch(`/api/health/assessments/graph?user_id=${user.id}&type=lung&timeframe=year&limit=50`);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0067A1]"></div>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Data Found</h2>
          <p className="text-gray-500 mb-6 text-sm">Please complete the lung health assessment first.</p>
          <button
            onClick={() => router.push('/website/lung-assessment')}
            className="bg-[#0067A1] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#0080C6] transition-colors"
          >
            Take Assessment
          </button>
        </div>
      </div>
    );
  }

  const { health_score, calculated_age, risk_level, risk_factors, ai_analysis, recommendations } = assessmentData;
  const inputs = assessmentData.lung_health_inputs?.[0] || {};

  // Calculate BMI if it's not provided by the API
  let displayBmi = inputs.bmi;
  if (!displayBmi && inputs.weight_kg && inputs.height_cm) {
    displayBmi = inputs.weight_kg / Math.pow(inputs.height_cm / 100, 2);
  }

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', circle: 'text-emerald-500' };
      case 'moderate': return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', circle: 'text-amber-500' };
      case 'high': return { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', circle: 'text-orange-500' };
      case 'critical': return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', circle: 'text-red-500' };
      default: return { text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', circle: 'text-gray-500' };
    }
  };

  const riskColors = getRiskColor(risk_level);

  // Calculate pie chart data
  const scorePercentage = health_score;
  const circumference = 2 * Math.PI * 45; // Smaller circle
  const strokeDashoffset = circumference - (scorePercentage / 100) * circumference;

  return (
    <div className="min-h-screen text-gray-800  font-sans">

      {/* Header */}
      <header className="max-w-full mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/website/dashboard')}
            className="p-2.5 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-gray-500 hover:text-gray-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Lung Health Report
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 font-medium">
              Generated on {new Date(assessmentData.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all border border-gray-200"
          >
            <Download className="w-4 h-4 text-gray-600" />
            Download PDF Report
          </button>
          <Link
            href="/website/doctors"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0067A1] hover:bg-[#0080C6] text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Stethoscope className="w-4 h-4" />
            Book Appointment
          </Link>
        </div>
      </header>

      <main className="max-w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Overview Sidebar */}
        <div className="lg:col-span-1 space-y-6">

          {/* Main Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="45" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`${riskColors.circle} transition-all duration-1000`}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-4xl font-black text-gray-800 tracking-tighter"
                  >
                    {health_score}
                  </motion.span>
                </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${riskColors.bg} ${riskColors.text} border ${riskColors.border}`}>
                {risk_level} Risk
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center mb-5 border border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Lung Age</p>
                <p className="text-3xl font-black text-[#0067A1]">{calculated_age}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Actual Age</p>
                <p className="text-lg font-bold text-gray-600">{inputs.age || '--'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowResultModal(true)}
                className="flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2.5 rounded-xl font-bold text-xs transition-colors border border-emerald-200"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" /> Full Report
              </button>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center justify-center bg-[#0067A1] hover:bg-[#0080C6] text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                View History
              </button>
            </div>
          </motion.div>

          {/* Key Metrics Mini-Grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm"
          >
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0067A1]" /> Profile Overview
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'BMI', val: displayBmi ? `${displayBmi.toFixed(1)}` : '--' },
                { label: 'Smoking', val: inputs.smoking_status ? inputs.smoking_status.charAt(0).toUpperCase() + inputs.smoking_status.slice(1) : '--' },
                { label: 'Breath Hold', val: inputs.breath_holding_time ? `${inputs.breath_holding_time}s` : '--' },
                { label: 'Peak Flow', val: inputs.peak_flow ? `${inputs.peak_flow}` : '--' }
              ].map((m, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">{m.label}</p>
                  <p className="text-sm font-bold text-gray-800">{m.val}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RESTORED History Snapshot Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0067A1]" />
                <h3 className="text-sm font-bold text-gray-800">Trend</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                View all
              </button>
            </div>

            {graphLoading ? (
              <div className="flex items-center justify-center h-24">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0067A1]" />
              </div>
            ) : graphError ? (
              <p className="text-xs text-red-500">{graphError}</p>
            ) : !graphData || !graphData.healthScoreTrend || graphData.healthScoreTrend.length === 0 ? (
              <p className="text-xs text-gray-500">No previous assessments found yet.</p>
            ) : (
              <div className="mt-2">
                <div className="h-24 flex items-end gap-2">
                  {graphData.healthScoreTrend.map((point, index) => {
                    const height = Math.max(12, Math.min(100, point.score));
                    return (
                      <motion.div
                        key={point.assessmentId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: `${height}%`, opacity: 1 }}
                        transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className={`w-full rounded-t-lg bg-gradient-to-t from-[#0067A1] to-emerald-400 ${index === graphData.healthScoreTrend.length - 1 ? 'shadow-md opacity-100' : 'opacity-60'
                            }`}
                          style={{ minHeight: '8px' }}
                        />
                      </motion.div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] uppercase font-bold text-gray-400">
                  <span>
                    First: {graphData.healthScoreTrend[0].score}/100
                  </span>
                  <span>
                    Latest: {graphData.healthScoreTrend[graphData.healthScoreTrend.length - 1].score}/100
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Risk Factors */}
          {risk_factors && risk_factors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-red-50 rounded-3xl p-6 border border-red-100"
            >
              <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Detected Risks
              </h3>
              <ul className="space-y-2">
                {risk_factors.map((factor, index) => (
                  <li key={index} className="flex items-start text-xs font-medium text-red-700">
                    <span className="text-red-400 mr-2 mt-0.5">•</span> {factor}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

        </div>

        {/* RIGHT COLUMN: AI Analysis & Tips */}
        <div className="lg:col-span-2 space-y-6">

          {/* Professional AI Clinical Report */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="bg-gray-50/80 p-5 sm:p-6 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                <Stethoscope className="text-[#0067A1] w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Clinical Analysis Report</h3>
                <p className="text-xs font-medium text-gray-500">AI-generated diagnostic review</p>
              </div>
            </div>

            <div className="p-5 sm:p-6 text-sm">
              {ai_analysis ? (
                <div className="space-y-6">
                  {/* Executive Summary */}
                  {ai_analysis.analysis && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Executive Summary</h4>
                      <p className="text-gray-700 leading-relaxed font-medium">{ai_analysis.analysis}</p>
                    </div>
                  )}

                  {/* Detailed Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {ai_analysis.positive_aspects && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Positive Markers
                        </h4>
                        <p className="text-gray-600 leading-relaxed">{ai_analysis.positive_aspects}</p>
                      </div>
                    )}
                    {ai_analysis.improvement_areas && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Areas to Monitor
                        </h4>
                        <p className="text-gray-600 leading-relaxed">{ai_analysis.improvement_areas}</p>
                      </div>
                    )}
                  </div>

                  {/* Critical Warnings */}
                  {ai_analysis.medical_attention && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Medical Attention Advised
                      </h4>
                      <p className="text-red-700 font-medium text-sm">{ai_analysis.medical_attention}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0067A1] mb-3"></div>
                  <span className="text-gray-500 font-medium text-sm">Synthesizing clinical data...</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Actionable Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="p-5 sm:p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Action Plan</h3>
              <p className="text-xs font-medium text-gray-500 mt-1">Targeted steps to improve respiratory capacity</p>
            </div>

            <div className="p-5 sm:p-6">
              {recommendations ? (
                typeof recommendations === 'string' ? (
                  <p className="text-gray-600 text-sm leading-relaxed">{recommendations}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recommendations.exercise && (
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Wind className="w-4 h-4 text-[#0067A1]" />
                          <h4 className="font-bold text-gray-800 text-sm">Breathing & Exercise</h4>
                        </div>
                        <p className="text-gray-600 text-xs leading-relaxed">{recommendations.exercise}</p>
                      </div>
                    )}
                    {recommendations.lifestyle && (
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-bold text-gray-800 text-sm">Lifestyle Adjustments</h4>
                        </div>
                        <p className="text-gray-600 text-xs leading-relaxed">{recommendations.lifestyle}</p>
                      </div>
                    )}
                    {recommendations.diet && (
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Apple className="w-4 h-4 text-emerald-500" />
                          <h4 className="font-bold text-gray-800 text-sm">Dietary Focus</h4>
                        </div>
                        <p className="text-gray-600 text-xs leading-relaxed">{recommendations.diet}</p>
                      </div>
                    )}
                    {recommendations.monitoring && (
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-[#0067A1]" />
                          <h4 className="font-bold text-gray-800 text-sm">Ongoing Monitoring</h4>
                        </div>
                        <p className="text-gray-600 text-xs leading-relaxed">{recommendations.monitoring}</p>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                  Loading recommendations...
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </main>

      {/* RESTORED History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Detailed Lung History</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">All your recorded lung assessments</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-800 transition-colors">
                ✕
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto">
              {graphLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0067A1]" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-gray-500">No lung assessments found yet.</p>
              ) : (
                <div className="space-y-4">
                  {history
                    .filter(item => item.type === 'lung')
                    .map(item => {
                      let aiSnippet = '';
                      if (typeof item.aiAnalysis === 'string') {
                        aiSnippet = item.aiAnalysis;
                      } else if (item.aiAnalysis && typeof item.aiAnalysis === 'object') {
                        aiSnippet = item.aiAnalysis.analysis || '';
                      }
                      return (
                        <div
                          key={item.id}
                          className="border border-gray-100 rounded-2xl p-4 bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                                {new Date(item.date).toLocaleString('en-US', {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                              <p className="text-sm font-bold text-gray-900 mt-1">
                                Score {item.healthScore}/100 · <span className="text-[#0067A1]">{item.riskLevel?.toUpperCase()} RISK</span>
                              </p>
                            </div>
                            <div className="text-right text-xs font-bold text-gray-400 uppercase tracking-wide">
                              <p>Lung age: <span className="text-gray-800">{item.calculatedAge}</span></p>
                            </div>
                          </div>
                          {aiSnippet && (
                            <p className="text-xs text-gray-600 mt-3 border-t border-gray-200 pt-3">
                              <span className="font-bold text-gray-800">Insight: </span>
                              {aiSnippet.length > 200 ? `${aiSnippet.slice(0, 200)}...` : aiSnippet}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setShowRequestModal(true);
                }}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Stethoscope className="w-3.5 h-3.5" /> Request new lung test
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* RESTORED Result Modal (Full Report Modal) */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Full Lung Report Snapshot</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Summary of your latest lung assessment</p>
              </div>
              <button
                onClick={() => setShowResultModal(false)}
                className="text-gray-400 hover:text-gray-800 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Current score</p>
                  <p className="text-3xl font-black text-[#0067A1]">{health_score}</p>
                  {graphSummary?.lung && (
                    <p className="text-xs font-medium text-emerald-700 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {graphSummary.lung.improvement > 0 ? 'Improved' : graphSummary.lung.improvement < 0 ? 'Declined' : 'Stable'} by {Math.abs(graphSummary.lung.improvement)} pts
                    </p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Lung age</p>
                  <p className="text-3xl font-black text-gray-800">{calculated_age}</p>
                  {inputs?.age && (
                    <p className="text-xs font-medium text-gray-500 mt-1">Chronological age: {inputs.age}</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Risk level</p>
                  <p className="text-2xl font-black capitalize text-amber-600">{risk_level}</p>
                </div>
              </div>

              {ai_analysis && (
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#0067A1]" /> Assistive summary
                  </p>
                  {typeof ai_analysis === 'string' ? (
                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{ai_analysis}</p>
                  ) : (
                    <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                      {ai_analysis.analysis && <p>{ai_analysis.analysis}</p>}
                      {ai_analysis.key_findings && <p>{ai_analysis.key_findings}</p>}
                    </div>
                  )}
                </div>
              )}

              {recommendations && (
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#0067A1]" /> Suggested next steps
                  </p>
                  {typeof recommendations === 'string' ? (
                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{recommendations}</p>
                  ) : (
                    <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                      {recommendations.diet && <p><strong className="text-gray-800">Diet:</strong> {recommendations.diet}</p>}
                      {recommendations.exercise && <p><strong className="text-gray-800">Exercise:</strong> {recommendations.exercise}</p>}
                      {recommendations.lifestyle && <p><strong className="text-gray-800">Lifestyle:</strong> {recommendations.lifestyle}</p>}
                      {recommendations.monitoring && <p><strong className="text-gray-800">Monitoring:</strong> {recommendations.monitoring}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Test Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Book Medical Review</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Schedule a follow-up test</p>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-800 transition-colors">
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRequestSubmitting(true);
                setTimeout(() => {
                  setRequestSubmitting(false);
                  setShowRequestModal(false);
                  alert('Test request submitted successfully!');
                }, 600);
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Date</label>
                  <input type="date" required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Time</label>
                  <input type="time" required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Consultation Type</label>
                <select className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all outline-none">
                  <option>Full lung capacity check</option>
                  <option>Symptom review</option>
                  <option>Routine follow-up</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800">
                  Cancel
                </button>
                <button type="submit" disabled={requestSubmitting} className="px-5 py-2 bg-[#0067A1] hover:bg-[#0080C6] text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50">
                  {requestSubmitting ? 'Confirming...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default LungHealthResult;