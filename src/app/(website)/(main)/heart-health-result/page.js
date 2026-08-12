"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Activity, Heart, Apple, ShieldAlert, ChevronLeft, Download, TrendingUp, AlertTriangle, Stethoscope, Calendar, Clock, User, Ruler, Scale, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const HeartHealthResult = () => {
  const [assessmentData, setAssessmentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [graphSummary, setGraphSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const resultData = sessionStorage.getItem('heartAssessmentResult');
    if (resultData) {
      setAssessmentData(JSON.parse(resultData));
    } else {
      router.push('/website/heart-health');
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
        const res = await fetch(`/api/health/assessments/graph?user_id=${JSON.parse(userData).id}&type=heart&timeframe=year&limit=50`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-6"
          />
          <p className="text-gray-600 font-medium animate-pulse">Loading your heart health assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-emerald-100 shadow-2xl shadow-emerald-100/50">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Heart className="w-20 h-20 text-rose-500 mx-auto mb-6 drop-shadow-lg" />
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3 text-center">Assessment Required</h2>
            <p className="text-gray-600 mb-8 text-center leading-relaxed">
              Complete the heart health assessment to get your personalized cardiac risk analysis and recommendations.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/website/heart-health')}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all duration-300"
            >
              Take Assessment
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  const { health_score, calculated_age, risk_level, risk_factors, ai_analysis, recommendations, created_at } = assessmentData;
  const inputs = assessmentData.heart_health_inputs?.[0] || {};
  const assessmentId = assessmentData.id;

  const getRiskColor = (level) => {
    const colors = {
      low: { 
        bg: 'bg-gradient-to-r from-green-100 to-emerald-100', 
        text: 'text-emerald-800', 
        border: 'border-emerald-200',
        glow: 'shadow-lg shadow-emerald-200/50',
        score: 'from-emerald-500 to-emerald-600'
      },
      moderate: { 
        bg: 'bg-gradient-to-r from-amber-100 to-yellow-100', 
        text: 'text-amber-800', 
        border: 'border-amber-200',
        glow: 'shadow-lg shadow-amber-200/50',
        score: 'from-amber-500 to-amber-600'
      },
      high: { 
        bg: 'bg-gradient-to-r from-orange-100 to-red-100', 
        text: 'text-orange-800', 
        border: 'border-orange-200',
        glow: 'shadow-lg shadow-orange-200/50',
        score: 'from-orange-500 to-red-500'
      },
      critical: { 
        bg: 'bg-gradient-to-r from-red-100 to-rose-100', 
        text: 'text-rose-800', 
        border: 'border-rose-200',
        glow: 'shadow-lg shadow-rose-200/50',
        score: 'from-rose-600 to-red-600'
      }
    };
    return colors[level] || colors.moderate;
  };

  const riskColors = getRiskColor(risk_level);
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (health_score / 100) * circumference;

  // Enrich with graph summary & history data when available
  const heartSummary = graphSummary?.heart || null;
  const overallSummary = graphSummary?.overall || null;
  const riskDistribution = graphData?.riskLevelDistribution || [];
  const organAgeInfo = graphData?.organAgeComparison?.find((item) => item.type === 'heart') || null;
  const improvementInfo = graphData?.improvementTimeline?.find((item) => item.type === 'heart') || null;
  const currentHistory = history.find((item) => item.id === assessmentId) || null;
  const combinedAiAnalysis = currentHistory?.aiAnalysis || ai_analysis;
  const combinedRecommendations = currentHistory?.recommendations || recommendations;
  const combinedInputs = currentHistory?.inputs || null;

  const downloadPDF = async () => {
    if (!assessmentId) return;
    try {
      setDownloadingPDF(true);

      const userDataRaw = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
      const userData = userDataRaw ? JSON.parse(userDataRaw) : null;
      const userId = userData?.id;

      if (!userId) {
        throw new Error('User not found in local storage');
      }

      const response = await fetch('/api/health/assessments/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          assessment_id: assessmentId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        const message = result?.message || 'Failed to generate PDF.';
        throw new Error(message);
      }

      const pdfUrl = result?.data?.url;
      if (pdfUrl) {
        window.location.href = pdfUrl;
      } else {
        window.print();
      }
    } catch (error) {
      console.error('Failed to generate/download PDF:', error);
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  const getStatusColor = (value, type) => {
    if (type === 'bp') {
      if (value > 130) return 'bg-red-100 text-red-800 border-red-200';
      if (value > 120) return 'bg-amber-100 text-amber-800 border-amber-200';
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (type === 'bmi') {
      if (value > 30) return 'bg-red-100 text-red-800 border-red-200';
      if (value > 25) return 'bg-amber-100 text-amber-800 border-amber-200';
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (type === 'ldl') {
      if (value > 160) return 'bg-red-100 text-red-800 border-red-200';
      if (value > 100) return 'bg-amber-100 text-amber-800 border-amber-200';
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (type === 'hr') {
      if (value > 100) return 'bg-red-100 text-red-800 border-red-200';
      if (value > 90) return 'bg-amber-100 text-amber-800 border-amber-200';
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen py-6 font-sans">
      <div className="w-full mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/website/dashboard')}
                className="p-3 bg-white rounded-2xl shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-gray-300/50 transition-all duration-300 border border-gray-100 hover:border-emerald-300"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </motion.button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 bg-gradient-to-r from-emerald-700 to-[#003358] bg-clip-text text-transparent">
                  Heart Health Assessment
                </h1>
                <p className="text-gray-600 mt-1 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(created_at).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                  <Clock className="w-4 h-4 ml-2" />
                  {new Date(created_at).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={downloadPDF}
              disabled={downloadingPDF}
              className="hidden md:flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-semibold shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all duration-300 disabled:opacity-50"
            >
              {downloadingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download Report</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Mobile Download Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadPDF}
            disabled={downloadingPDF}
            className="md:hidden w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-semibold shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all duration-300 mb-6 disabled:opacity-50"
          >
            {downloadingPDF ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                <span>Downloading Report...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download Detailed Heart Report (PDF)</span>
              </>
            )}
          </motion.button>
        </motion.header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          
          {/* Left Column: Score & Personal Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Main Score Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-emerald-100/30">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Heart Health Score</h2>
                  <p className="text-sm text-gray-500">Based on clinical analysis</p>
                </div>
                <div className={`px-4 py-2 rounded-full ${riskColors.bg} ${riskColors.text} text-sm font-bold border ${riskColors.border} ${riskColors.glow}`}>
                  {risk_level.toUpperCase()} RISK
                </div>
              </div>

              <div className="relative w-64 h-64 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <motion.circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="url(#scoreGradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="100%" stopColor="#0d9488" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-bold text-gray-900">{health_score}</span>
                  <span className="text-sm text-gray-500 mt-1">OUT OF 100</span>
                  <div className="mt-4 text-sm text-gray-600 bg-emerald-50 px-4 py-2 rounded-full">
                    Heart Age: <span className="font-bold text-gray-900">{calculated_age}</span> years
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Age</p>
                      <p className="text-lg font-bold text-gray-900">{inputs.age || '-'} yrs</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <Scale className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">BMI</p>
                      <p className="text-lg font-bold text-gray-900">{inputs.bmi ? inputs.bmi.toFixed(1) : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vital Metrics */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-emerald-100/30">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                Vital Metrics
              </h3>
              <div className="space-y-4">
                {[
                  { 
                    label: 'Blood Pressure', 
                    value: inputs.systolic_bp && inputs.diastolic_bp ? `${inputs.systolic_bp}/${inputs.diastolic_bp}` : 'N/A',
                    unit: 'mmHg',
                    icon: '💓',
                    type: 'bp',
                    status: inputs.systolic_bp > 130 ? 'High' : inputs.systolic_bp > 120 ? 'Elevated' : 'Normal'
                  },
                  { 
                    label: 'LDL Cholesterol', 
                    value: inputs.ldl_cholesterol || 'N/A',
                    unit: 'mg/dL',
                    icon: '🩸',
                    type: 'ldl',
                    status: inputs.ldl_cholesterol > 160 ? 'High' : inputs.ldl_cholesterol > 100 ? 'Elevated' : 'Normal'
                  },
                  { 
                    label: 'Resting Heart Rate', 
                    value: inputs.resting_heart_rate || 'N/A',
                    unit: 'bpm',
                    icon: '📊',
                    type: 'hr',
                    status: inputs.resting_heart_rate > 100 ? 'High' : inputs.resting_heart_rate > 90 ? 'Elevated' : 'Normal'
                  },
                  { 
                    label: 'Physical Activity', 
                    value: inputs.physical_activity_level ? `${inputs.physical_activity_level}/10` : 'N/A',
                    unit: 'Level',
                    icon: '🏃‍♂️',
                    type: 'activity',
                    status: inputs.physical_activity_level > 7 ? 'Active' : inputs.physical_activity_level > 4 ? 'Moderate' : 'Low'
                  }
                ].map((metric, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-emerald-200 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{metric.icon}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{metric.label}</p>
                        <p className="text-xl font-bold text-gray-900">{metric.value} <span className="text-sm text-gray-500">{metric.unit}</span></p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(metric.value === 'N/A' ? 0 : metric.value, metric.type)}`}>
                      {metric.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Middle Column: Analysis & Risk Factors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* AI Analysis */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-emerald-100/30 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-lg">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Clinical Assessment</h3>
                  <p className="text-sm text-gray-500">Assistive clinical suggestions</p>
                </div>
              </div>

              <div className="space-y-6">
                {combinedAiAnalysis ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl mt-1">
                          <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {typeof combinedAiAnalysis === 'string'
                            ? combinedAiAnalysis
                            : combinedAiAnalysis.analysis || ''}
                        </p>
                      </div>
                    </motion.div>

                    {combinedAiAnalysis?.key_findings && (
                      <div className="p-4 bg-blue-50 rounded-2xl border-l-4 border-blue-500">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Key Findings
                        </h4>
                        {Array.isArray(combinedAiAnalysis.key_findings) ? (
                          <ul className="list-disc list-inside space-y-1 text-[#004F7C] text-sm">
                            {combinedAiAnalysis.key_findings.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[#004F7C] text-sm">{combinedAiAnalysis.key_findings}</p>
                        )}
                      </div>
                    )}

                    {combinedAiAnalysis?.positive_aspects && (
                      <div className="p-4 bg-green-50 rounded-2xl border-l-4 border-green-500">
                        <h4 className="font-bold text-green-800 mb-2">Positive Aspects</h4>
                        {Array.isArray(combinedAiAnalysis.positive_aspects) ? (
                          <ul className="list-disc list-inside space-y-1 text-green-700 text-sm">
                            {combinedAiAnalysis.positive_aspects.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-green-700 text-sm">{combinedAiAnalysis.positive_aspects}</p>
                        )}
                      </div>
                    )}

                    {combinedAiAnalysis?.improvement_areas && (
                      <div className="p-4 bg-amber-50 rounded-2xl border-l-4 border-amber-500">
                        <h4 className="font-bold text-amber-800 mb-2">Areas for Improvement</h4>
                        {Array.isArray(combinedAiAnalysis.improvement_areas) ? (
                          <ul className="list-disc list-inside space-y-1 text-amber-700 text-sm">
                            {combinedAiAnalysis.improvement_areas.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-amber-700 text-sm">{combinedAiAnalysis.improvement_areas}</p>
                        )}
                      </div>
                    )}

                    {combinedAiAnalysis?.medical_attention && (
                      <div className="p-4 bg-red-50 rounded-2xl border-l-4 border-red-500">
                        <h4 className="font-bold text-red-800 mb-2">Medical Attention</h4>
                        <p className="text-red-700 text-sm">{combinedAiAnalysis.medical_attention}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3" />
                    <span className="text-gray-600">Generating analysis...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Risk Factors */}
            {risk_factors && risk_factors.length > 0 && (
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-3xl p-6 border border-rose-100 shadow-xl shadow-rose-100/30">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-rose-100 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  Risk Factors
                </h3>
                <div className="space-y-3">
                  {risk_factors.map((factor, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 p-4 bg-white/80 rounded-2xl border border-rose-100 hover:bg-white transition-all duration-300"
                    >
                      <div className="w-3 h-3 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full animate-pulse" />
                      <span className="font-medium text-gray-800">{factor}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Column: Recommendations & Progress */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Recommendations */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-emerald-100/30">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  Recommendations
                  <p className="text-sm text-gray-500 font-normal">Personalized action plan</p>
                </div>
              </h3>

              <div className="space-y-4">
                {combinedRecommendations ? (
                  typeof combinedRecommendations === 'string' ? (
                    <div className="p-4 bg-emerald-50 rounded-2xl border-l-4 border-emerald-500">
                      <p className="text-gray-700">{combinedRecommendations}</p>
                    </div>
                  ) : Array.isArray(combinedRecommendations) ? (
                    combinedRecommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-gray-900 mb-1">{rec.title}</h4>
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              {rec.category} • Priority: {rec.priority}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            {rec.timeframe}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">{rec.description}</p>
                        {Array.isArray(rec.action_steps) && rec.action_steps.length > 0 && (
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mt-1">
                            {rec.action_steps.map((step, sIdx) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ul>
                        )}
                        {rec.indian_context && (
                          <p className="text-[11px] text-emerald-700 mt-1">Tailored for Indian lifestyle and diet.</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <>
                      {combinedRecommendations.diet && (
                        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-emerald-100">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-100 rounded-xl">
                              <Apple className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-2">Diet & Nutrition</h4>
                              <p className="text-gray-700 text-sm">{combinedRecommendations.diet}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {combinedRecommendations.exercise && (
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-cyan-100">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-cyan-100 rounded-xl">
                              <Activity className="w-5 h-5 text-cyan-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-2">Exercise Plan</h4>
                              <p className="text-gray-700 text-sm">{combinedRecommendations.exercise}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {combinedRecommendations.monitoring && (
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl border border-purple-100">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 rounded-xl">
                              <ShieldAlert className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-2">Monitoring</h4>
                              <p className="text-gray-700 text-sm">{combinedRecommendations.monitoring}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mr-3" />
                    <span className="text-gray-600">Generating recommendations...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary & Risk Distribution from Graph API */}
            {heartSummary && (
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-emerald-100/30">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <Activity className="w-5 h-5 text-emerald-700" />
                  </div>
                  Summary & Risk Overview
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="bg-gray-50 rounded-2xl p-3">
                    <p className="text-gray-500">Total assessments</p>
                    <p className="text-xl font-bold text-gray-900">{graphSummary.totalAssessments}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3">
                    <p className="text-gray-500">Latest score</p>
                    <p className="text-xl font-bold text-gray-900">{heartSummary.latestScore}/100</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3">
                    <p className="text-gray-500">Average score</p>
                    <p className="text-xl font-bold text-gray-900">{heartSummary.averageScore}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3">
                    <p className="text-gray-500">Improvement</p>
                    <p className="text-xl font-bold text-gray-900">{heartSummary.improvement} pts</p>
                  </div>
                </div>

                {organAgeInfo && (
                  <div className="mb-6 text-sm bg-emerald-50 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-gray-500">Organ age vs actual</p>
                      <p className="text-base font-semibold text-gray-900">
                        Actual: {organAgeInfo.actualAge} yrs • Heart age: {organAgeInfo.organAge} yrs
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                      +{organAgeInfo.ageDifference} yrs older
                    </span>
                  </div>
                )}

                {riskDistribution.length > 0 && (
                  <div className="space-y-2 text-xs">
                    {riskDistribution.map((item) => (
                      <div key={item.level} className="flex items-center gap-3">
                        <span className="w-16 capitalize text-gray-600">{item.level}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.level === 'low'
                                ? 'bg-emerald-500'
                                : item.level === 'moderate'
                                ? 'bg-amber-400'
                                : item.level === 'high'
                                ? 'bg-orange-500'
                                : 'bg-rose-600'
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-gray-700">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Progress Trend */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-emerald-100/30">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Progress Trend</h3>
                  <p className="text-sm text-gray-500">Historical assessment scores</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowHistoryModal(true)}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 px-3 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  View All
                </motion.button>
              </div>

              {graphLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
              ) : graphError ? (
                <div className="text-center py-8">
                  <p className="text-red-500 text-sm">{graphError}</p>
                </div>
              ) : !graphData?.healthScoreTrend || graphData.healthScoreTrend.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No historical data available</p>
                  <p className="text-sm text-gray-400 mt-1">Complete more assessments to track progress</p>
                </div>
              ) : (
                <div className="h-40 flex items-end gap-1.5 px-2">
                  {graphData.healthScoreTrend.map((point, index) => {
                    const height = Math.max(20, Math.min(100, (point.score / 100) * 100));
                    const isLatest = index === graphData.healthScoreTrend.length - 1;
                    
                    return (
                      <div key={point.assessmentId} className="flex-1 flex flex-col items-center">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: index * 0.05, duration: 0.8, ease: "easeOut" }}
                          className={`w-full rounded-t-xl ${
                            isLatest 
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-200' 
                              : 'bg-gradient-to-t from-emerald-400 to-emerald-300'
                          } min-h-[2px] hover:opacity-80 transition-opacity cursor-help`}
                          title={`Score: ${point.score} - ${new Date(point.date).toLocaleDateString()}`}
                        />
                        {index % 3 === 0 && (
                          <span className="text-xs text-gray-500 mt-2">
                            {new Date(point.date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Assessment History</h3>
                  <p className="text-gray-600">Complete cardiac assessment timeline</p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 hover:bg-white/50 rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-4">
              {history.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-5 rounded-2xl ${
                    index === 0 
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200' 
                      : 'bg-gray-50 border border-gray-100'
                  } hover:shadow-lg transition-all duration-300`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-900">
                      {new Date(item.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                      item.riskLevel === 'low' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      item.riskLevel === 'moderate' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      item.riskLevel === 'high' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                      'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {item.riskLevel?.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/50 p-3 rounded-xl">
                      <p className="text-gray-500">Score</p>
                      <p className="text-xl font-bold text-gray-900">{item.healthScore}/100</p>
                    </div>
                    <div className="bg-white/50 p-3 rounded-xl">
                      <p className="text-gray-500">Heart Age</p>
                      <p className="text-xl font-bold text-gray-900">{item.calculatedAge} years</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default HeartHealthResult;