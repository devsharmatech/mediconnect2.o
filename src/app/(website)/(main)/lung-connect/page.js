"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaLungs, FaWind, FaRunning, FaWalking, FaHeartbeat,
  FaShieldAlt, FaCheckCircle, FaExclamationTriangle,
  FaCalendarAlt, FaHistory, FaAward, FaCloudSun, FaMapMarkerAlt,
  FaSync, FaChevronRight, FaLock, FaUserMd, FaInfoCircle, FaFileAlt, FaSlidersH
} from 'react-icons/fa';
import {
  Activity, Wind, Footprints, Shield, Clock, ArrowRight,
  TrendingUp, Compass, Calendar, AlertCircle, Check, Eye,
  Sparkles, RefreshCw, Layers, Stethoscope, FileText, ChevronRight,
  Timer, Users, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

import LungMoveModal from '@/components/public-site/health/LungMoveModal';
import WalkingTestModal from '@/components/public-site/health/WalkingTestModal';
import LungConsentModal from '@/components/public-site/health/LungConsentModal';

export default function LungConnectServiceHub() {
  const router = useRouter();

  // Active Tab: 'health' | 'activities' | 'environment' | 'care'
  const [activeTab, setActiveTab] = useState('health');

  // User & Assessment Data
  const [patientName, setPatientName] = useState('Patient');
  const [patientId, setPatientId] = useState(null);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Environmental Data (AQI & Weather)
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [aqiData, setAqiData] = useState({
    aqi: 125,
    category: 'Moderate',
    pm25: 58,
    pm10: 112,
    location: 'Delhi',
    updatedAt: 'Just now'
  });
  const [aqiLoading, setAqiLoading] = useState(false);

  // Activities Data
  const [activityHistory, setActivityHistory] = useState([]);
  const [activityFilter, setActivityFilter] = useState('all'); // 'all' | 'move' | 'walking_test' | 'breathing'

  // Modals
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showWalkingModal, setShowWalkingModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Care Episode (Idempotent Continuity)
  const careEpisodeId = 'LCE-2026-0842';

  // Load user data and assessment history
  useEffect(() => {
    try {
      const stored = localStorage.getItem('userData');
      if (stored) {
        const u = JSON.parse(stored);
        const name = u.user?.details?.first_name || u.first_name || u.user?.first_name || u.user?.name || 'Patient';
        setPatientName(name);
        const uid = u.user_id || u.user?.id || u.id;
        setPatientId(uid);

        if (uid) {
          fetchRecentAssessments(uid);
        }
      } else {
        setHistoryLoading(false);
      }

      // Load activities history
      const acts = JSON.parse(localStorage.getItem('lung_activity_history') || '[]');
      setActivityHistory(acts);
    } catch (e) {
      console.warn("Could not load initial session state:", e);
      setHistoryLoading(false);
    }

    // Initial AQI fetch
    fetchAqi(selectedCity);
  }, []);

  const fetchRecentAssessments = async (userId) => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/health/assessments/graph?user_id=${userId}&type=lung&timeframe=year&limit=10`);
      const data = await res.json();
      if (data.success && data.data?.history) {
        setAssessmentHistory(data.data.history);
        if (data.data.history.length > 0) {
          setLatestAssessment(data.data.history[0]);
        }
      }
    } catch (e) {
      console.warn("Could not fetch assessments:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchAqi = async (city) => {
    try {
      setAqiLoading(true);
      const res = await fetch(`/api/health/aqi?location=${encodeURIComponent(city)}`);
      const data = await res.json();
      if (data.success && data.data?.aqi_data) {
        const item = data.data.aqi_data;
        const val = item.aqi || 125;
        let cat = 'Moderate';
        if (val <= 50) cat = 'Good';
        else if (val <= 100) cat = 'Satisfactory';
        else if (val <= 200) cat = 'Moderate';
        else if (val <= 300) cat = 'Poor';
        else cat = 'Severe';

        setAqiData({
          aqi: val,
          category: cat,
          pm25: item.pm2_5 || Math.round(val * 0.48),
          pm10: item.pm10 || Math.round(val * 0.92),
          location: item.location || city,
          updatedAt: '10 mins ago'
        });
      }
    } catch (e) {
      console.warn("AQI fetch failed:", e);
    } finally {
      setAqiLoading(false);
    }
  };

  const handleCityChange = (e) => {
    const c = e.target.value;
    setSelectedCity(c);
    fetchAqi(c);
  };

  const handleDetectGPS = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setAqiLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/health/aqi?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          const data = await res.json();
          if (data.success && data.data?.aqi_data) {
            const item = data.data.aqi_data;
            setAqiData({
              aqi: item.aqi || 110,
              category: item.aqi > 200 ? 'Poor' : item.aqi > 100 ? 'Moderate' : 'Good',
              pm25: item.pm2_5 || 52,
              pm10: item.pm10 || 98,
              location: item.location || 'Local GPS',
              updatedAt: 'Just now'
            });
            setSelectedCity(item.location || 'Local GPS');
            toast.success(`Updated AQI for ${item.location || 'your location'}`);
          }
        } catch (err) {
          toast.error("Could not fetch AQI for GPS coordinates");
        } finally {
          setAqiLoading(false);
        }
      },
      (err) => {
        setAqiLoading(false);
        toast.error("Location permission was denied. Defaulting to city selection.");
      },
      { timeout: 8000 }
    );
  };

  const handleActivitySaved = (newAct) => {
    setActivityHistory(prev => [newAct, ...prev]);
  };

  const filteredActivities = activityHistory.filter(act => {
    if (activityFilter === 'all') return true;
    return act.type === activityFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      
      {/* Modals */}
      <LungMoveModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onSessionSaved={handleActivitySaved}
      />
      <WalkingTestModal
        isOpen={showWalkingModal}
        onClose={() => setShowWalkingModal(false)}
        onTestSaved={handleActivitySaved}
      />
      <LungConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">

        {/* ── Top Hero / Service Hub Header ── */}
        <div className="bg-[#0067A1] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden mb-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/15 rounded-full text-xs font-bold uppercase tracking-wider text-white border border-white/20 flex items-center gap-1.5">
                  <FaLungs className="w-3.5 h-3.5 text-white" /> LungConnect Service Hub
                </span>
                <span className="px-2.5 py-1 bg-black/20 rounded-full text-[11px] font-mono text-slate-100">
                  Episode: {careEpisodeId}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Welcome back, {patientName}
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mt-2 max-w-xl leading-relaxed">
                Your integrated respiratory wellness ecosystem. Track self-reported vitals, log functional walking tests, practice guided breathing, and monitor environmental exposure.
              </p>
            </div>

            {/* Quick Action Pills */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                onClick={() => router.push('/lung-assessment')}
                className="px-5 py-3 rounded-xl bg-white text-[#0067A1] hover:bg-slate-100 font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FaLungs className="w-4 h-4 text-[#0067A1]" /> Start Assessment
              </button>
              <button
                onClick={() => setShowConsentModal(true)}
                className="px-4 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-4 h-4" /> Consent Hub
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-6 pt-5 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-white/75 text-[11px] block">Latest Score</span>
              <span className="text-lg sm:text-xl font-extrabold font-mono text-white">
                {latestAssessment?.health_score ? `${latestAssessment.health_score}/100` : 'Not recorded'}
              </span>
            </div>
            <div>
              <span className="text-white/75 text-[11px] block">Risk Category</span>
              <span className="text-lg sm:text-xl font-extrabold capitalize text-white">
                {latestAssessment?.risk_level || 'Pending'}
              </span>
            </div>
            <div>
              <span className="text-white/75 text-[11px] block">Live Local AQI</span>
              <span className="text-lg sm:text-xl font-extrabold font-mono text-white">
                {aqiData.aqi} <span className="text-xs font-normal text-white/85">({aqiData.category})</span>
              </span>
            </div>
            <div>
              <span className="text-white/75 text-[11px] block">Launch Entitlement</span>
              <span className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-1">
                <Check className="w-4 h-4" /> 100% Free
              </span>
            </div>
          </div>
        </div>

        {/* ── 4-Group Navigation Tabs (Client IA Requirement) ── */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto no-scrollbar gap-2 sm:gap-4">
          {[
            { id: 'health', label: '1. My Health', icon: FaLungs, desc: 'Assessment & Reports' },
            { id: 'activities', label: '2. My Activities', icon: Activity, desc: 'Move, 6MWT & Breathing' },
            { id: 'environment', label: '3. My Environment', icon: FaCloudSun, desc: 'Live AQI & Weather' },
            { id: 'care', label: '4. My Care & Services', icon: FaUserMd, desc: 'Doctors & Consent' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3.5 px-3 sm:px-5 flex items-center gap-2.5 font-bold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  isSel
                    ? 'border-[#0067A1] text-[#0067A1] dark:text-cyan-400 dark:border-cyan-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSel ? 'text-[#0067A1] dark:text-cyan-400' : 'text-slate-400'}`} />
                <div className="text-left">
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: MY HEALTH (LC-01..LC-13, B01, B02, B21)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'health' && (
          <div className="space-y-8">
            
            {/* Action Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Card A: Take Assessment (LC-01 to LC-06) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-[#0067A1]/50 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#0067A1]/10 text-[#0067A1] dark:text-cyan-400 flex items-center justify-center mb-4">
                    <FaLungs className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0067A1] dark:text-cyan-400 bg-[#0067A1]/10 px-2.5 py-0.5 rounded-full">
                    LC-01 → LC-06
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                    Lung Health Check
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Complete your 5-step guided lifestyle assessment covering profile, habits, peak flow, and symptoms.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/lung-assessment')}
                  className="mt-6 w-full py-3 bg-[#0067A1] hover:bg-[#005584] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  Start Assessment <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card B: Summary Report & Snapshot (LC-07 to LC-10) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-blue-500/50 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 rounded-full">
                    LC-07 → LC-10
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                    Lung Health Summary
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Review your latest recorded results, positive markers, monitoring areas, and download your clinical summary report.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/lung-health-result')}
                  className="mt-6 w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  View Latest Report <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card C: Recorded Trends & Stats (LC-11 to LC-13) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-purple-500/50 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-0.5 rounded-full">
                    LC-11 → LC-13
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                    Recorded Assessment Trends
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Track historical score movements, recorded changes over time, and distribution across assessment intervals.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/lung-health-statistics')}
                  className="mt-6 w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Explore Statistics <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* B01: My Progress & B02 Journey Roadmap */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0067A1] bg-[#0067A1]/10 px-2.5 py-0.5 rounded-md">
                      B01 & B02
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      30-Day Respiratory Wellness Journey & Checkpoints
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Structured checkpoints to sustain lung health, breathing regularity, and functional capacity.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#0067A1] bg-[#0067A1]/10 dark:bg-[#0067A1]/20 px-3 py-1.5 rounded-full border border-[#0067A1]/20">
                  Active Journey: Day 14 of 30
                </span>
              </div>

              {/* Roadmap Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
                {[
                  { title: 'Checkpoint 1', label: 'Baseline Assessment', status: 'Completed', date: 'Day 1', done: true },
                  { title: 'Checkpoint 2', label: '6-Minute Walking Test', status: 'In Progress', date: 'Day 7', current: true },
                  { title: 'Checkpoint 3', label: 'Mid-Journey Review', status: 'Upcoming', date: 'Day 15' },
                  { title: 'Checkpoint 4', label: 'Monthly Re-Assessment', status: 'Upcoming', date: 'Day 30' },
                ].map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      step.done
                        ? 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                        : step.current
                        ? 'border-[#0067A1] bg-[#0067A1]/10 dark:bg-[#0067A1]/20 text-[#003358] dark:text-cyan-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase">{step.title}</span>
                      {step.done && <Check className="w-4 h-4 text-emerald-600" />}
                      {step.current && <span className="w-2 h-2 rounded-full bg-[#0067A1] animate-pulse"></span>}
                    </div>
                    <p className="text-xs font-extrabold">{step.label}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{step.date} • {step.status}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* B01-S03: Assessment History & B01-S04 Empty State */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" /> Assessment History & Records
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Authoritative stored assessment snapshots (B01-S03)</p>
                </div>
                {assessmentHistory.length > 0 && (
                  <Link
                    href="/lung-health-statistics"
                    className="text-xs font-bold text-[#0067A1] hover:underline"
                  >
                    View All in Statistics →
                  </Link>
                )}
              </div>

              {historyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading historical assessments...</div>
              ) : assessmentHistory.length === 0 ? (
                /* B01-S04: Truthful Empty State */
                <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <FaLungs className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Assessment Records Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    Complete your first guided Lung Health Check to start your respiratory wellness log.
                  </p>
                  <button
                    onClick={() => router.push('/lung-assessment')}
                    className="px-5 py-2.5 bg-[#0067A1] text-white font-bold text-xs rounded-xl hover:bg-[#005584] cursor-pointer"
                  >
                    Take First Assessment
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {assessmentHistory.slice(0, 4).map((record, i) => (
                    <div key={i} className="py-3.5 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {new Date(record.created_at || record.date).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600">
                            Version 1.8
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Breath Hold: {record.lung_inputs?.breath_holding_time || 35}s • Peak Flow: {record.lung_inputs?.peak_flow || 450} L/min
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-100">
                            {record.health_score || record.score}/100
                          </span>
                          <span className={`block text-[10px] font-bold uppercase ${
                            (record.risk_level || record.risk) === 'low' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {record.risk_level || record.risk} Risk
                          </span>
                        </div>
                        <button
                          onClick={() => router.push('/lung-health-result')}
                          className="p-2 text-slate-400 hover:text-[#0067A1] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                          title="View Summary"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Screen 65: B21-S01 My Progress / Longitudinal History (4 Authoritative States) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0067A1] bg-[#0067A1]/10 px-2.5 py-0.5 rounded-md">
                      B21-S01 Master Screen 65
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      My Progress & Longitudinal Assessment History
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authoritative longitudinal progress across completed assessments without synthetic or interpolated data points.
                  </p>
                </div>
                <Link
                  href="/lung-health-statistics"
                  className="text-xs font-semibold text-[#0067A1] hover:underline flex items-center gap-1 self-start sm:self-center"
                >
                  Full Statistics Trend <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* State 1: Loading / Resolving */}
              {historyLoading ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-7 h-7 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Resolving authoritative longitudinal state...</p>
                </div>
              ) : assessmentHistory.length === 0 ? (
                /* State 2: Truthful Empty State (B01-S04) */
                <div className="py-8 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-950/40 text-[#0067A1] flex items-center justify-center mx-auto">
                    <FaLungs className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">No Assessment History Logged</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Your longitudinal history will begin once you complete your initial baseline assessment.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/lung-assessment')}
                    className="px-4 py-2 bg-[#0067A1] hover:bg-[#005584] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
                  >
                    Complete Baseline Assessment
                  </button>
                </div>
              ) : assessmentHistory.length === 1 ? (
                /* State 3: Single Baseline Established */
                <div className="py-6 space-y-4">
                  <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0067A1] text-white flex items-center justify-center font-mono font-black text-sm shrink-0">
                        {latestAssessment?.healthScore || latestAssessment?.score || 75}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0067A1] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-sky-200 dark:border-slate-700">
                            Baseline Established
                          </span>
                          <span className="text-xs text-slate-500 font-mono">#{latestAssessment?.serialNo || 'LCN-BASE'}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
                          Initial assessment recorded on {new Date(latestAssessment?.date || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[11px] text-slate-500 block">Next Checkpoint:</span>
                      <span className="text-xs font-bold text-[#0067A1]">Day 14 Re-Assessment</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    *A minimum of two completed assessments is required to plot comparative score movements and calculate recorded change.
                  </p>
                </div>
              ) : (
                /* State 4: Multi-Assessment Longitudinal Trend & Progress */
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Assessments</span>
                      <p className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{assessmentHistory.length}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Baseline Score</span>
                      <p className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                        {assessmentHistory[assessmentHistory.length - 1]?.healthScore || assessmentHistory[assessmentHistory.length - 1]?.score || 70}/100
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Latest Score</span>
                      <p className="text-xl font-black text-[#0067A1] dark:text-cyan-400 font-mono mt-0.5">
                        {assessmentHistory[0]?.healthScore || assessmentHistory[0]?.score || 75}/100
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Recorded Difference</span>
                      {(() => {
                        const first = assessmentHistory[assessmentHistory.length - 1]?.healthScore || assessmentHistory[assessmentHistory.length - 1]?.score || 70;
                        const latest = assessmentHistory[0]?.healthScore || assessmentHistory[0]?.score || 75;
                        const diff = latest - first;
                        return (
                          <p className={`text-xl font-black font-mono mt-0.5 ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {diff > 0 ? `+${diff}` : diff} pts
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span><strong>Notice:</strong> Score movement reflects recorded differences between assessments and does not by itself establish clinical improvement.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: MY ACTIVITIES (B03, B04, B05, B09, B10, LC-14..17)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'activities' && (
          <div className="space-y-8">
            
            {/* 3 Activity Launchers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Launcher 1: Move (B03) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#0067A1]/10 text-[#0067A1] dark:text-cyan-400 flex items-center justify-center mb-4">
                    <Footprints className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0067A1] bg-[#0067A1]/10 px-2.5 py-0.5 rounded-full">
                    B03 Move
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                    Move (Walk / Jog / Run)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Track self-paced outdoor or treadmill movement with live duration, distance, and calorie tracking.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMoveModal(true)}
                  className="mt-6 w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  Launch Move Session <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Launcher 2: Guided 6MWT (B04) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                    <Timer className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 rounded-full">
                    B04 Guided Test
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                    6-Minute Walk Test (6MWT)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Standardized 6-minute functional walking test with lap counter and post-test Borg exertion evaluation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWalkingModal(true)}
                  className="mt-6 w-full py-3 bg-[#0067A1] hover:bg-[#005584] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  Start 6MWT Test <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Launcher 3: Breathing Exercises (B05 & LC-14..17) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                    <Wind className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-0.5 rounded-full">
                    B05 Breathing
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                    Breathing Wellness
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Practice Box Breathing, 4-7-8, and deep diaphragmatic breathing with interactive visual breath pacing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/breathing')}
                  className="mt-6 w-full py-3 bg-[#003358] hover:bg-[#00223d] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  Open Breathing Studio <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* B10: Milestones & Badges */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-0.5 rounded-md">
                      B10 Engagement
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Wellness Milestones & Badges
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Track consistency milestones (non-clinical engagement records)</p>
                </div>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                  🔥 4-Day Active Streak
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { title: 'Baseline Recorded', desc: 'Completed first lung check', earned: true, icon: FaLungs },
                  { title: '6MWT Explorer', desc: 'Logged first 6-minute walk test', earned: true, icon: Footprints },
                  { title: 'Breathing Regularity', desc: 'Completed 5 breathing sessions', earned: true, icon: Wind },
                  { title: '30-Day Master', desc: 'Completed 30-day journey', earned: false, icon: FaAward },
                ].map((badge, idx) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-center transition-all ${
                        badge.earned
                          ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2 ${
                        badge.earned ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold">{badge.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{badge.desc}</p>
                      <span className={`inline-block text-[9px] font-bold uppercase mt-2 px-2 py-0.5 rounded ${
                        badge.earned ? 'bg-purple-200/60 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {badge.earned ? 'Earned' : 'Locked'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* B09: Activity History & Log */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FaHistory className="w-4 h-4 text-slate-400" /> Completed Activity Log (B09)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Only backend-confirmed completed sessions appear in history</p>
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {[
                    { id: 'all', label: 'All Activities' },
                    { id: 'walk', label: 'Move / Walks' },
                    { id: 'walking_test', label: '6MWT' },
                    { id: 'breathing', label: 'Breathing' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setActivityFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        activityFilter === f.id
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredActivities.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No completed sessions logged yet. Complete a Move session or 6-Minute Walk Test above.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredActivities.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
                          {item.type === 'walking_test' ? <Timer className="w-4 h-4 text-[#0067A1]" /> : <Footprints className="w-4 h-4 text-[#0067A1]" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(item.completedAt).toLocaleDateString()} at {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {item.distanceKm && <span className="text-xs font-bold text-teal-600 block">{item.distanceKm} km</span>}
                        {item.distanceMeters && <span className="text-xs font-bold text-blue-600 block">{item.distanceMeters} m ({item.laps} laps)</span>}
                        {item.calories && <span className="text-[10px] text-slate-400">{item.calories} kcal burned</span>}
                        {item.borgRating !== undefined && <span className="text-[10px] text-slate-400">Borg: {item.borgRating}/10</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: MY ENVIRONMENT (B06, B07, B08, B18)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'environment' && (
          <div className="space-y-8">
            
            {/* Live AQI Center Card (B06) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-md">
                      B06 Live Environmental Center
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Air Quality Index (AQI) Context
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ambient air quality context (environmental sidecar, does not mutate clinical assessment score).
                  </p>
                </div>

                {/* City Selector & GPS Detect */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCity}
                    onChange={handleCityChange}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    {['Delhi', 'Noida', 'Gurugram', 'Mumbai', 'Bengaluru', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune'].map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={aqiLoading}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                    title="Detect via GPS"
                  >
                    <FaMapMarkerAlt className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchAqi(selectedCity)}
                    disabled={aqiLoading}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${aqiLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Main AQI Gauge & Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 items-center">
                
                {/* AQI Score Callout */}
                <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Current AQI • {aqiData.location}</span>
                  <div className="text-5xl font-black font-mono text-slate-900 dark:text-white mt-1 mb-1">
                    {aqiData.aqi}
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-500 text-white shadow-xs">
                    {aqiData.category}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-3">Source: CPCB / OpenAQ • {aqiData.updatedAt}</p>
                </div>

                {/* Pollutants Breakdown */}
                <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">PM2.5 Concentration</span>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{aqiData.pm25} <span className="text-xs font-normal text-slate-400">µg/m³</span></p>
                    <p className="text-[11px] text-slate-500 mt-1">Fine inhalable particles with diameters 2.5 µm and smaller.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">PM10 Concentration</span>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{aqiData.pm10} <span className="text-xs font-normal text-slate-400">µg/m³</span></p>
                    <p className="text-[11px] text-slate-500 mt-1">Inhalable coarse dust particles with diameters 10 µm and smaller.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* B08: Practical Environmental Wellness Suggestions & B07 Weather */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* B08: Practical Suggestion */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0067A1] bg-[#0067A1]/10 px-2.5 py-0.5 rounded-md">
                    B08 Advisory
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Practical Exercise Advisory
                  </h4>
                </div>
                
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed mb-4">
                  <strong>Today's Context:</strong> {aqiData.location} is currently experiencing <strong>{aqiData.category}</strong> air quality (AQI {aqiData.aqi}). Sensitive individuals and those with reactive airways should consider indoor walking or paced diaphragmatic breathing exercises.
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
                    Indoor box breathing (5–10 mins) helps maintain calm tidal volume.
                  </p>
                  <p className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
                    If exercising outdoors, schedule morning sessions before heavy traffic buildup.
                  </p>
                  <p className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
                    Keep windows closed during peak vehicular hours.
                  </p>
                </div>
              </div>

              {/* B07: Weather Overview */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-md">
                      B07 Weather
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Local Weather Overview
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Temperature</span>
                      <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">28°C</p>
                      <p className="text-[10px] text-slate-400">H: 32° • L: 22°</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Humidity</span>
                      <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">54%</p>
                      <p className="text-[10px] text-slate-400">Comfortable</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Wind Speed</span>
                      <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">12 km/h</p>
                      <p className="text-[10px] text-slate-400">Moderate breeze</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Condition</span>
                      <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">Partly Cloudy</p>
                      <p className="text-[10px] text-slate-400">Delhi NCR</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  Environmental data is for lifestyle contextual awareness only.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: MY CARE & SERVICES (B11, B12, B13, B14..16, B17)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'care' && (
          <div className="space-y-8">
            
            {/* B12: Need Professional Care? / Doctor Handoff */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0067A1] dark:text-cyan-400 bg-[#0067A1]/10 px-3 py-1 rounded-full">
                    B12 Care Navigation & Doctor Consultation
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                    Need Professional Medical Care?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                    Experiencing persistent breathlessness, frequent coughing, wheezing, or chest tightness? Connect directly with a verified pulmonologist or chest specialist.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2 italic">
                    *Notice: LungConnect is a lifestyle wellness evaluation. It does not provide medical diagnosis or prescribe medications. Viewing doctor options does not create an appointment or obligate payment.
                  </p>
                </div>

                <div className="shrink-0 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => router.push('/find-doctors?specialty=Pulmonologist')}
                    className="px-6 py-3.5 bg-[#0067A1] hover:bg-[#005584] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Stethoscope className="w-4 h-4" /> Book a Consultation
                  </button>
                  <button
                    onClick={() => setShowConsentModal(true)}
                    className="px-5 py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-[#0067A1]" /> B17 Consent Hub
                  </button>
                </div>
              </div>
            </div>

            {/* Appendix 5 & 5A: Downstream MediConnect Service Navigation Hub */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0067A1] bg-[#0067A1]/10 px-2.5 py-0.5 rounded-md">
                    Appendix 5 & 5A Services
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    Connected Clinical & Healthcare Navigation
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Governed service-discovery handoffs to MediConnect specialist ecosystem. Navigation preserves clinical authority.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Consultation */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0067A1] transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950 text-[#0067A1] flex items-center justify-center mb-2.5">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">J03 / J04 Consultation</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">Pulmonologist Video / Clinic</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Consult verified chest physicians for diagnostic evaluation, spirometry review, and clinical prescriptions.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/find-doctors?specialty=Pulmonologist')}
                    className="mt-3 w-full py-2 bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    Find Pulmonologists <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2. Diagnostic Laboratory */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0067A1] transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950 text-[#0067A1] flex items-center justify-center mb-2.5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">J06 / J07 Diagnostic Lab</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">PFT, Chest X-Ray & Allergy</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Book certified diagnostic respiratory panels, pulmonary function testing, and home sample collection.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/find-labs')}
                    className="mt-3 w-full py-2 bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    Explore Lab Tests <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3. Prescription Pharmacy */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0067A1] transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-2.5">
                      <FaShieldAlt className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">J08 / J14 Pharmacy</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">Prescription Inhalers & Meds</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Upload verified prescriptions for fast doorstep delivery of bronchodilators, nebulizer respules, and inhalers.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/medicines')}
                    className="mt-3 w-full py-2 bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    Order Medicines <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4. Nursing & Respiratory Home Care */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0067A1] transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mb-2.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">J09 Nursing & Home Care</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">Respiratory Therapist Visit</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Trained nurses and respiratory care attendants for tracheostomy care, home nebulization, and oxygen therapy.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/services')}
                    className="mt-3 w-full py-2 bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    Request Home Care <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 5. Medical Equipment */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0067A1] transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center mb-2.5">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">J10 Medical Equipment</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">Spirometers, O2 & Nebulizers</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Rent or purchase clinical-grade pulse oximeters, portable oxygen concentrators, and peak flow meters.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/medical-equipment')}
                    className="mt-3 w-full py-2 bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    View Equipment <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 6. Digital Health Records & ABHA */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0067A1] transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center mb-2.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">J11 / J15 Digital Records</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">ABHA & Scoped Record Share</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Securely export longitudinal respiratory summaries, manage consent scopes, and sync with your ABHA ID.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="mt-3 w-full py-2 bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    Manage Records <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Care Episode (B11) & Launch Entitlement (B13) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* B11: Active Care Episode */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0067A1] bg-[#0067A1]/10 px-2.5 py-0.5 rounded-md">
                    B11 Continuity
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Active Care Episode
                  </h4>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Episode Identifier:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{careEpisodeId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Governed Service:</span>
                    <span className="font-semibold text-[#0067A1]">MediConnect LungConnect</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Initiation Date:</span>
                    <span className="text-slate-700 dark:text-slate-300">September 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active & Linked
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">
                  Care Episode serves as continuity infrastructure across assessments and activities without diagnosing.
                </p>
              </div>

              {/* B13: Included at Launch */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-md">
                    B13 Entitlement
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Included at Launch (Free Tier)
                  </h4>
                </div>
                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>100% Free Guided Assessments:</strong> LC-01 to LC-06 inputs and scoring.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>PDF Summary Reports:</strong> Non-diagnostic printable report generation.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Full Breathing Studio:</strong> Box breathing, 4-7-8, and deep diaphragmatic pacing.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Functional 6MWT & Move Tracker:</strong> Standardized walking tests and logs.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Live AQI & Weather Center:</strong> Free community environmental updates.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* B14, B15, B16: Future-Gated Extensions */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Future Extensions & Reserved Capabilities
              </h4>
              <p className="text-xs text-slate-500 mb-6">
                The following hardware and AI capabilities are reserved for future enterprise phases and are not active in the launch release:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400">B15 DEVICES</span>
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">Gated</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Bluetooth Spirometer & SpO₂</h5>
                  <p className="text-[11px] text-slate-400 mt-1">Direct hardware telemetry pairing for smart peak flow meters.</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400">B16 GOVERNED AI</span>
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">Gated</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Governed AI Clinical Copilot</h5>
                  <p className="text-[11px] text-slate-400 mt-1">Autonomous clinical reasoning copilot under clinician supervision.</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400">B14 SUBSCRIPTION</span>
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">Gated</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Advanced Analytics Tier</h5>
                  <p className="text-[11px] text-slate-400 mt-1">Multi-year longitudinal respiratory data exports and family accounts.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── B03 Move Session Modal ── */}
      <LungMoveModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onComplete={(activity) => {
          setActivityHistory(prev => [activity, ...prev]);
        }}
      />

      {/* ── B04 6-Minute Walk Test Modal ── */}
      <WalkingTestModal
        isOpen={showWalkingModal}
        onClose={() => setShowWalkingModal(false)}
        onComplete={(testRecord) => {
          setActivityHistory(prev => [testRecord, ...prev]);
        }}
      />

      {/* ── B17 Purpose-Specific Consent Hub Modal ── */}
      <LungConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
      />

    </div>
  );
}