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
  Timer, Users, Info, MapPin, Zap, BarChart2, Star, Award,
  HeartPulse, Lungs
} from 'lucide-react';
import toast from 'react-hot-toast';

import LungMoveModal from '@/components/public-site/health/LungMoveModal';
import WalkingTestModal from '@/components/public-site/health/WalkingTestModal';
import LungConsentModal from '@/components/public-site/health/LungConsentModal';

const TABS = [
  { id: 'health', label: 'My Health', icon: FaLungs, short: '1' },
  { id: 'activities', label: 'My Activities', icon: Activity, short: '2' },
  { id: 'environment', label: 'Environment', icon: FaCloudSun, short: '3' },
  { id: 'care', label: 'Care & Services', icon: FaUserMd, short: '4' },
];

export default function LungConnectServiceHub() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('health');
  const [patientName, setPatientName] = useState('Patient');
  const [patientId, setPatientId] = useState(null);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [aqiData, setAqiData] = useState({ aqi: 76, category: 'Satisfactory', pm25: 36, pm10: 68, location: 'Delhi', updatedAt: 'Just now' });
  const [aqiLoading, setAqiLoading] = useState(false);
  const [activityHistory, setActivityHistory] = useState([]);
  const [activityFilter, setActivityFilter] = useState('all');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showWalkingModal, setShowWalkingModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const careEpisodeId = 'LCE-2026-0842';

  useEffect(() => {
    try {
      const stored = localStorage.getItem('userData');
      if (stored) {
        const u = JSON.parse(stored);
        const name = u.user?.details?.first_name || u.first_name || u.user?.first_name || u.user?.name || 'Patient';
        setPatientName(name);
        const uid = u.user_id || u.user?.id || u.id;
        setPatientId(uid);
        if (uid) fetchRecentAssessments(uid);
      } else { setHistoryLoading(false); }
      const acts = JSON.parse(localStorage.getItem('lung_activity_history') || '[]');
      setActivityHistory(acts);
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        const actionParam = params.get('action');
        if (tabParam && TABS.map(t=>t.id).includes(tabParam)) setActiveTab(tabParam);
        if (actionParam === 'move') setShowMoveModal(true);
        else if (actionParam === 'walking' || actionParam === '6mwt') setShowWalkingModal(true);
        else if (actionParam === 'consent') setShowConsentModal(true);
      }
    } catch (e) {
      console.warn('Could not load session state:', e);
      setHistoryLoading(false);
    }
    fetchAqi(selectedCity);
  }, []);

  const fetchRecentAssessments = async (userId) => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/health/assessments/graph?user_id=${userId}&type=lung&timeframe=year&limit=10`);
      const data = await res.json();
      if (data.success && data.data?.history) {
        setAssessmentHistory(data.data.history);
        if (data.data.history.length > 0) setLatestAssessment(data.data.history[0]);
      }
    } catch (e) { console.warn('Could not fetch assessments:', e); }
    finally { setHistoryLoading(false); }
  };

  const fetchAqi = async (city) => {
    try {
      setAqiLoading(true);
      const res = await fetch(`/api/health/aqi?location=${encodeURIComponent(city)}`);
      const data = await res.json();
      if (data.success && data.data?.aqi_data) {
        const item = data.data.aqi_data;
        const val = item.aqi || 76;
        let cat = val <= 50 ? 'Good' : val <= 100 ? 'Satisfactory' : val <= 200 ? 'Moderate' : val <= 300 ? 'Poor' : 'Severe';
        setAqiData({ aqi: val, category: cat, pm25: item.pm2_5 || Math.round(val * 0.48), pm10: item.pm10 || Math.round(val * 0.92), location: item.location || city, updatedAt: '10 mins ago' });
      }
    } catch (e) { console.warn('AQI fetch failed:', e); }
    finally { setAqiLoading(false); }
  };

  const handleCityChange = (e) => { const c = e.target.value; setSelectedCity(c); fetchAqi(c); };
  const handleDetectGPS = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setAqiLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`/api/health/aqi?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
        const data = await res.json();
        if (data.success && data.data?.aqi_data) {
          const item = data.data.aqi_data;
          setAqiData({ aqi: item.aqi || 110, category: item.aqi > 200 ? 'Poor' : item.aqi > 100 ? 'Moderate' : 'Good', pm25: item.pm2_5 || 52, pm10: item.pm10 || 98, location: item.location || 'Local GPS', updatedAt: 'Just now' });
          setSelectedCity(item.location || 'Local GPS');
          toast.success(`Updated AQI for ${item.location || 'your location'}`);
        }
      } catch { toast.error('Could not fetch AQI for GPS'); } finally { setAqiLoading(false); }
    }, () => { setAqiLoading(false); toast.error('Location permission denied'); }, { timeout: 8000 });
  };
  const handleActivitySaved = (newAct) => setActivityHistory(prev => [newAct, ...prev]);
  const filteredActivities = activityHistory.filter(act => activityFilter === 'all' || act.type === activityFilter);

  // ─── AQI Color Helpers ───
  const aqiColor = aqiData.aqi <= 50 ? '#16a34a' : aqiData.aqi <= 100 ? '#0284c7' : aqiData.aqi <= 200 ? '#d97706' : '#dc2626';
  const aqiBg = aqiData.aqi <= 50 ? '#f0fdf4' : aqiData.aqi <= 100 ? '#e0f2fe' : aqiData.aqi <= 200 ? '#fffbeb' : '#fef2f2';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20" style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}>

      {/* Modals */}
      <LungMoveModal isOpen={showMoveModal} onClose={() => setShowMoveModal(false)} onSessionSaved={handleActivitySaved} />
      <WalkingTestModal isOpen={showWalkingModal} onClose={() => setShowWalkingModal(false)} onTestSaved={handleActivitySaved} />
      <LungConsentModal isOpen={showConsentModal} onClose={() => setShowConsentModal(false)} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">

        {/* ═══════════ HERO SECTION (Clean, Solid Theme Colors, No Gradients) ═══════════ */}
        <div className="bg-white rounded-[5px] border border-slate-200 p-6 sm:p-8 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex-1">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-[5px] text-[11px] font-bold uppercase tracking-wider text-[#0067A1]">
                  <FaLungs className="w-3.5 h-3.5" /> LungConnect Service Hub
                </span>
                <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-[5px] text-[11px] font-mono text-slate-700 font-semibold">
                  Episode: {careEpisodeId}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-[5px]">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Open Access Rule
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                Welcome back, <span className="text-[#0067A1]">{patientName}</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
                Your integrated respiratory wellness ecosystem — track vitals, log functional tests, practice guided breathing, and monitor air quality exposure.
              </p>
            </div>

            {/* Hero CTA Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
              <button type="button" onClick={() => setShowMoveModal(true)}
                className="px-5 py-2.5 bg-[#0067A1] hover:bg-[#005584] text-white rounded-[5px] font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                <Footprints className="w-4 h-4" /> Start Move / 6MWT
              </button>
              <button type="button" onClick={() => router.push('/lung-assessment')}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-[5px] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <FaLungs className="w-4 h-4 text-[#0067A1]" /> Optional Self-Check
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="pt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Latest Score', value: latestAssessment?.health_score ? `${latestAssessment.health_score}/100` : 'Not recorded', sub: 'Calculated self-check', color: 'text-[#0067A1]' },
              { label: 'Risk Category', value: latestAssessment?.risk_level || 'Standard', sub: 'Baseline profile', color: 'text-slate-900' },
              { label: 'Live AQI', value: `${aqiData.aqi} (${aqiData.category})`, sub: `${aqiData.location} real-time`, color: 'text-amber-700' },
              { label: 'Launch Access', value: '100% Free', sub: 'No test required', color: 'text-emerald-700' },
            ].map((m, i) => (
              <div key={i} className="bg-slate-50 rounded-[5px] p-3 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{m.label}</span>
                <span className={`text-base sm:text-lg font-black ${m.color} block mt-0.5 leading-tight font-mono`}>{m.value}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{m.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════ QUICK LAUNCHER STRIP ═══════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Move Session', sub: 'Track walk / jog', icon: Footprints, color: '#0067A1', bg: '#e0f2fe', onClick: () => setShowMoveModal(true) },
            { label: '6MWT Test', sub: 'Standard 6-min test', icon: Timer, color: '#1d4ed8', bg: '#eff6ff', onClick: () => setShowWalkingModal(true) },
            { label: 'Breathing Studio', sub: 'Box & 4-7-8 pacing', icon: Wind, color: '#7c3aed', bg: '#f5f3ff', onClick: () => router.push('/dashboard/breathing') },
            { label: 'Live AQI', sub: `${aqiData.location}: ${aqiData.aqi}`, icon: FaCloudSun, color: '#b45309', bg: '#fffbeb', onClick: () => setActiveTab('environment') },
          ].map((btn, i) => {
            const Icon = btn.icon;
            return (
              <button key={i} type="button" onClick={btn.onClick}
                className="group bg-white hover:shadow-md border border-slate-200 hover:border-transparent rounded-[5px] p-3.5 text-left transition-all duration-200 cursor-pointer active:scale-[0.98]"
                style={{ '--hover-border': btn.color }}>
                <div className="w-9 h-9 rounded-[5px] flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110"
                  style={{ background: btn.bg, color: btn.color }}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-900">{btn.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{btn.sub}</p>
              </button>
            );
          })}
        </div>

        {/* ═══════════ NAVIGATION TABS ═══════════ */}
        <div className="flex border-b border-slate-200 mb-7 overflow-x-auto no-scrollbar gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-4 sm:px-5 flex items-center gap-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 cursor-pointer ${isSel ? 'border-[#0067A1] text-[#0067A1]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                <Icon className={`w-4 h-4 ${isSel ? 'text-[#0067A1]' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══════════ TAB 1: MY HEALTH ═══════════ */}
        {activeTab === 'health' && (
          <div className="space-y-6">

            {/* 3 Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card A: Optional Self-Check */}
              <div className="bg-white rounded-[5px] border border-slate-200 hover:border-[#0067A1]/50 hover:shadow-md shadow-sm p-6 flex flex-col justify-between transition-all group">
                <div>
                  <div className="w-11 h-11 rounded-[5px] flex items-center justify-center mb-4" style={{ background: '#e0f2fe', color: '#0067A1' }}>
                    <FaLungs className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#e0f2fe', color: '#0067A1' }}>Optional Self-Check</span>
                  <h3 className="text-base font-bold text-slate-900 mt-2">Lung Health Check</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">Complete an optional 5-step guided self-check covering lifestyle, habits, and symptoms. Never required for wellness activities.</p>
                </div>
                <button type="button" onClick={() => router.push('/lung-assessment')}
                  className="mt-5 w-full py-2.5 bg-[#0067A1] hover:bg-[#005584] text-white font-bold text-xs rounded-[5px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                  Take Optional Check <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card B: Lung Health Summary */}
              <div className="bg-white rounded-[5px] border border-slate-200 hover:border-blue-500/50 hover:shadow-md shadow-sm p-6 flex flex-col justify-between transition-all">
                <div>
                  <div className="w-11 h-11 rounded-[5px] flex items-center justify-center mb-4" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#eff6ff', color: '#1d4ed8' }}>LC-07 → LC-10</span>
                  <h3 className="text-base font-bold text-slate-900 mt-2">Lung Health Summary</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">Review latest results, positive markers, monitoring areas, and download your clinical summary report.</p>
                </div>
                <button onClick={() => router.push('/lung-health-result')}
                  className="mt-5 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-[5px] transition-all flex items-center justify-center gap-2 cursor-pointer">
                  View Latest Report <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card C: Assessment Trends */}
              <div className="bg-white rounded-[5px] border border-slate-200 hover:border-purple-500/50 hover:shadow-md shadow-sm p-6 flex flex-col justify-between transition-all">
                <div>
                  <div className="w-11 h-11 rounded-[5px] flex items-center justify-center mb-4" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#f5f3ff', color: '#7c3aed' }}>LC-11 → LC-13</span>
                  <h3 className="text-base font-bold text-slate-900 mt-2">Assessment Trends</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">Track historical score movements, recorded changes, and distribution across assessment intervals.</p>
                </div>
                <button onClick={() => router.push('/lung-health-statistics')}
                  className="mt-5 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-[5px] transition-all flex items-center justify-center gap-2 cursor-pointer">
                  Explore Statistics <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 30-Day Journey Roadmap */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#e0f2fe', color: '#0067A1' }}>B01 & B02</span>
                    <h3 className="text-base font-bold text-slate-900">30-Day Respiratory Wellness Journey</h3>
                  </div>
                  <p className="text-xs text-slate-500">Structured checkpoints to sustain lung health, breathing regularity, and functional capacity.</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-[5px] border shrink-0" style={{ background: '#e0f2fe', color: '#0067A1', borderColor: '#bae6fd' }}>
                  Active: Day 14 of 30
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-5">
                {[
                  { title: 'Checkpoint 1', label: 'Baseline Assessment', status: 'Completed', date: 'Day 1', done: true },
                  { title: 'Checkpoint 2', label: '6-Minute Walking Test', status: 'In Progress', date: 'Day 7', current: true },
                  { title: 'Checkpoint 3', label: 'Mid-Journey Review', status: 'Upcoming', date: 'Day 15' },
                  { title: 'Checkpoint 4', label: 'Monthly Re-Assessment', status: 'Upcoming', date: 'Day 30' },
                ].map((step, idx) => (
                  <div key={idx} className={`p-4 rounded-[5px] border transition-all ${
                    step.done ? 'border-emerald-200 bg-emerald-50'
                    : step.current ? 'border-[#0067A1] bg-[#e0f2fe] shadow-sm'
                    : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase ${step.done ? 'text-emerald-700' : step.current ? 'text-[#0067A1]' : 'text-slate-500'}`}>{step.title}</span>
                      {step.done && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      {step.current && <span className="w-2 h-2 rounded-full bg-[#0067A1] animate-pulse" />}
                    </div>
                    <p className={`text-xs font-bold ${step.done ? 'text-emerald-900' : step.current ? 'text-[#003358]' : 'text-slate-700'}`}>{step.label}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{step.date} · {step.status}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment History */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0067A1]" />
                    <h3 className="text-base font-bold text-slate-900">Assessment History & Records</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Authoritative stored assessment snapshots (B01-S03)</p>
                </div>
                {assessmentHistory.length > 0 && (
                  <Link href="/lung-health-statistics" className="text-xs font-bold text-[#0067A1] hover:underline">View All →</Link>
                )}
              </div>

              {historyLoading ? (
                <div className="py-8 flex items-center justify-center gap-3 text-xs text-slate-500">
                  <div className="w-5 h-5 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                  Loading assessment history...
                </div>
              ) : assessmentHistory.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-[5px]">
                  <div className="w-12 h-12 rounded-[5px] flex items-center justify-center mx-auto mb-3" style={{ background: '#e0f2fe', color: '#0067A1' }}>
                    <FaLungs className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Assessment Records Logged</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                    Assessments are optional. You can launch Move sessions, 6MWT tests, or breathing exercises directly without taking an assessment.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button type="button" onClick={() => setShowMoveModal(true)}
                      className="px-4 py-2 bg-[#0067A1] hover:bg-[#005584] text-white font-bold text-xs rounded-[5px] transition-colors cursor-pointer">
                      Launch Move Session
                    </button>
                    <button type="button" onClick={() => router.push('/lung-assessment')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-[5px] transition-colors cursor-pointer">
                      Optional Baseline Check
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {assessmentHistory.slice(0, 4).map((record, i) => (
                    <div key={i} className="py-3.5 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {new Date(record.created_at || record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-[5px] font-bold uppercase bg-slate-100 text-slate-700">Version 1.8</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Breath Hold: {record.lung_inputs?.breath_holding_time || 35}s · Peak Flow: {record.lung_inputs?.peak_flow || 450} L/min
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm font-black font-mono text-slate-900">{record.health_score || record.score}/100</span>
                          <span className={`block text-[10px] font-bold uppercase ${(record.risk_level || record.risk) === 'low' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {record.risk_level || record.risk} Risk
                          </span>
                        </div>
                        <button onClick={() => router.push('/lung-health-result')}
                          className="p-2 text-slate-400 hover:text-[#0067A1] hover:bg-slate-100 rounded-[5px] cursor-pointer transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* B21-S01: My Progress */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#e0f2fe', color: '#0067A1' }}>B21-S01</span>
                    <h3 className="text-base font-bold text-slate-900">My Progress & Longitudinal History</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Authoritative longitudinal progress across completed assessments.</p>
                </div>
                <Link href="/lung-health-statistics" className="text-xs font-semibold text-[#0067A1] hover:underline flex items-center gap-1 shrink-0">
                  Full Statistics <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {historyLoading ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-7 h-7 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Resolving longitudinal state...</p>
                </div>
              ) : assessmentHistory.length === 0 ? (
                <div className="py-8 text-center max-w-md mx-auto">
                  <div className="w-11 h-11 rounded-[5px] flex items-center justify-center mx-auto mb-3" style={{ background: '#e0f2fe', color: '#0067A1' }}>
                    <FaLungs className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">No Assessment History Logged</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Longitudinal progress tracks here when you complete optional assessments. Direct activities are always accessible.</p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <button type="button" onClick={() => setShowWalkingModal(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-[5px] cursor-pointer">Launch 6MWT</button>
                    <button type="button" onClick={() => router.push('/lung-assessment')}
                      className="px-4 py-2 bg-[#0067A1] hover:bg-[#005584] text-white text-xs font-bold rounded-[5px] cursor-pointer">Optional Check</button>
                  </div>
                </div>
              ) : assessmentHistory.length === 1 ? (
                <div className="py-5">
                  <div className="p-4 rounded-[5px] border flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: '#e0f2fe', borderColor: '#bae6fd' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[5px] flex items-center justify-center font-mono font-black text-sm text-white shrink-0" style={{ background: '#0067A1' }}>
                        {latestAssessment?.healthScore || latestAssessment?.score || 75}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#0067A1]">Baseline Established</span>
                        <p className="text-xs text-slate-700 font-medium mt-0.5">
                          Recorded {new Date(latestAssessment?.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm sm:text-right">
                      <span className="text-[11px] text-slate-600 block">Next Checkpoint:</span>
                      <span className="text-xs font-bold text-[#0067A1]">Day 14 Re-Assessment</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3 italic">*Two completed assessments required to plot score movement and calculate recorded change.</p>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Assessments', value: assessmentHistory.length, mono: true, color: 'text-slate-900' },
                      { label: 'Baseline Score', value: `${assessmentHistory[assessmentHistory.length-1]?.healthScore || assessmentHistory[assessmentHistory.length-1]?.score || 70}/100`, mono: true, color: 'text-slate-700' },
                      { label: 'Latest Score', value: `${assessmentHistory[0]?.healthScore || assessmentHistory[0]?.score || 75}/100`, mono: true, color: 'text-[#0067A1]' },
                      { label: 'Recorded Change', value: (() => { const f = assessmentHistory[assessmentHistory.length-1]?.score || 70; const l = assessmentHistory[0]?.score || 75; const d = l-f; return `${d>0?'+':''}${d} pts`; })(), mono: true, color: (() => { const f = assessmentHistory[assessmentHistory.length-1]?.score||70; const l = assessmentHistory[0]?.score||75; return l-f>0?'text-emerald-600':l-f<0?'text-amber-600':'text-slate-600'; })() },
                    ].map((s, i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-[5px]">
                        <span className="text-[10px] font-bold uppercase text-slate-500">{s.label}</span>
                        <p className={`text-xl font-black mt-0.5 ${s.color} ${s.mono ? 'font-mono' : ''}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-[5px] text-[11px] text-blue-800 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span><strong>Notice:</strong> Score movement reflects recorded differences and does not by itself establish clinical improvement.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ TAB 2: MY ACTIVITIES ═══════════ */}
        {activeTab === 'activities' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { badge: 'B03 Move', title: 'Move (Walk / Jog / Run)', desc: 'Track self-paced outdoor or treadmill movement with live duration, distance, and calorie tracking.', icon: Footprints, bg: '#e0f2fe', color: '#0067A1', onClick: () => setShowMoveModal(true), btnText: 'Launch Move Session', btnBg: '#0067A1', btnHover: '#004F7C' },
                { badge: 'B04 Guided Test', title: '6-Minute Walk Test (6MWT)', desc: 'Standardized 6-minute functional walking test with lap counter and post-test Borg exertion evaluation.', icon: Timer, bg: '#eff6ff', color: '#1d4ed8', onClick: () => setShowWalkingModal(true), btnText: 'Start 6MWT Test', btnBg: '#0067A1', btnHover: '#005584' },
                { badge: 'B05 Breathing', title: 'Breathing Wellness Studio', desc: 'Practice Box Breathing, 4-7-8, and deep diaphragmatic breathing with interactive visual breath pacing.', icon: Wind, bg: '#f5f3ff', color: '#7c3aed', onClick: () => router.push('/dashboard/breathing'), btnText: 'Open Breathing Studio', btnBg: '#003358', btnHover: '#00223d' },
              ].map((c, i) => {
                const Icon = c.icon;
                return (
                  <div key={i} className="bg-white rounded-[5px] border border-slate-200 hover:shadow-md shadow-sm p-6 flex flex-col justify-between transition-all">
                    <div>
                      <div className="w-11 h-11 rounded-[5px] flex items-center justify-center mb-4" style={{ background: c.bg, color: c.color }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: c.bg, color: c.color }}>{c.badge}</span>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{c.title}</h3>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{c.desc}</p>
                    </div>
                    <button type="button" onClick={c.onClick}
                      className="mt-5 w-full py-2.5 text-white font-bold text-xs rounded-[5px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      style={{ background: c.btnBg }}>
                      {c.btnText} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Wellness Milestones */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#f5f3ff', color: '#7c3aed' }}>B10 Engagement</span>
                    <h3 className="text-base font-bold text-slate-900">Wellness Milestones & Badges</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Non-clinical engagement consistency records</p>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-[5px] border border-amber-200">🔥 4-Day Streak</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { title: 'Baseline Recorded', desc: 'Completed first lung check', earned: true, icon: FaLungs },
                  { title: '6MWT Explorer', desc: 'Logged first 6-minute walk', earned: true, icon: Footprints },
                  { title: 'Breathing Regularity', desc: 'Completed 5 breathing sessions', earned: true, icon: Wind },
                  { title: '30-Day Master', desc: 'Completed 30-day journey', earned: false, icon: FaAward },
                ].map((badge, idx) => {
                  const Icon = badge.icon;
                  return (
                    <div key={idx} className={`p-4 rounded-[5px] border text-center transition-all ${badge.earned ? 'border-purple-200 bg-purple-50/60' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                      <div className={`w-10 h-10 rounded-[5px] mx-auto flex items-center justify-center mb-2 ${badge.earned ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`text-xs font-bold ${badge.earned ? 'text-purple-900' : 'text-slate-600'}`}>{badge.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{badge.desc}</p>
                      <span className={`inline-block text-[9px] font-bold uppercase mt-2 px-2 py-0.5 rounded-[5px] ${badge.earned ? 'bg-purple-200/60 text-purple-800' : 'bg-slate-200 text-slate-500'}`}>
                        {badge.earned ? 'Earned' : 'Locked'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FaHistory className="w-4 h-4 text-[#0067A1]" /> Completed Activity Log (B09)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Only backend-confirmed completed sessions appear here</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'walk', label: 'Move' },
                    { id: 'walking_test', label: '6MWT' },
                    { id: 'breathing', label: 'Breathing' },
                  ].map(f => (
                    <button key={f.id} onClick={() => setActivityFilter(f.id)}
                      className={`px-3 py-1.5 rounded-[5px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${activityFilter === f.id ? 'bg-[#003358] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {filteredActivities.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border-2 border-dashed border-slate-200 rounded-[5px]">
                  No completed sessions logged yet. Complete a Move session or 6MWT above.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredActivities.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[5px] flex items-center justify-center" style={{ background: '#e0f2fe' }}>
                          {item.type === 'walking_test' ? <Timer className="w-4 h-4 text-[#0067A1]" /> : <Footprints className="w-4 h-4 text-[#0067A1]" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{item.title}</p>
                          <p className="text-[11px] text-slate-500">{new Date(item.completedAt).toLocaleDateString()} at {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {item.distanceKm && <span className="text-xs font-bold text-teal-600 block">{item.distanceKm} km</span>}
                        {item.distanceMeters && <span className="text-xs font-bold text-blue-600 block">{item.distanceMeters} m ({item.laps} laps)</span>}
                        {item.calories && <span className="text-[10px] text-slate-500">{item.calories} kcal</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ TAB 3: ENVIRONMENT ═══════════ */}
        {activeTab === 'environment' && (
          <div className="space-y-6">
            {/* Live AQI Card */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#ecfdf5', color: '#059669' }}>B06 Live Environmental Center</span>
                    <h3 className="text-base font-bold text-slate-900">Air Quality Index (AQI) Context</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Environmental sidecar — does not affect clinical assessment score.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={selectedCity} onChange={handleCityChange}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-[5px] text-xs font-semibold text-slate-700 cursor-pointer">
                    {['Delhi','Noida','Gurugram','Mumbai','Bengaluru','Kolkata','Chennai','Hyderabad','Pune'].map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <button type="button" onClick={handleDetectGPS} disabled={aqiLoading}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[5px] transition-all cursor-pointer" title="Detect via GPS">
                    <MapPin className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => fetchAqi(selectedCity)} disabled={aqiLoading}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[5px] transition-all cursor-pointer" title="Refresh">
                    <RefreshCw className={`w-3.5 h-3.5 ${aqiLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5 items-center">
                {/* AQI Score Callout */}
                <div className="p-6 rounded-[5px] border text-center" style={{ background: aqiBg, borderColor: aqiColor + '40' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: aqiColor }}>Current AQI · {aqiData.location}</span>
                  <div className="text-5xl font-black font-mono text-slate-900 mt-1.5 mb-2">{aqiData.aqi}</div>
                  <span className="inline-block px-3 py-1 rounded-[5px] text-xs font-bold uppercase text-white shadow-sm" style={{ background: aqiColor }}>
                    {aqiData.category}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-3">CPCB / OpenAQ · {aqiData.updatedAt}</p>
                </div>

                {/* Pollutants */}
                <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                  {[
                    { label: 'PM2.5 Concentration', value: aqiData.pm25, unit: 'µg/m³', desc: 'Fine inhalable particles ≤ 2.5 µm' },
                    { label: 'PM10 Concentration', value: aqiData.pm10, unit: 'µg/m³', desc: 'Coarse inhalable particles ≤ 10 µm' },
                    { label: 'Temperature', value: '28°C', unit: '', desc: 'H: 32° · L: 22°' },
                    { label: 'Humidity', value: '54%', unit: '', desc: 'Comfortable' },
                  ].map((p, i) => (
                    <div key={i} className="p-4 rounded-[5px] bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-500">{p.label}</span>
                      <p className="text-xl font-black text-slate-900 mt-1 font-mono">{p.value}<span className="text-xs font-normal text-slate-500 ml-1">{p.unit}</span></p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Advisory & Weather */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#e0f2fe', color: '#0067A1' }}>B08 Advisory</span>
                  <h4 className="text-sm font-bold text-slate-900">Practical Exercise Advisory</h4>
                </div>
                <div className="p-3.5 rounded-[5px] border text-xs leading-relaxed mb-4" style={{ background: aqiBg, borderColor: aqiColor + '40', color: '#78350f' }}>
                  <strong>Today's Context:</strong> {aqiData.location} is experiencing <strong>{aqiData.category}</strong> air quality (AQI {aqiData.aqi}). Sensitive individuals should consider indoor exercises.
                </div>
                <div className="space-y-2.5">
                  {[
                    'Indoor box breathing (5–10 mins) maintains calm tidal volume.',
                    'If outdoors, schedule morning sessions before peak traffic.',
                    'Keep windows closed during peak vehicular hours.',
                  ].map((tip, i) => (
                    <p key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <Check className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" /> {tip}
                    </p>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#eff6ff', color: '#1d4ed8' }}>B07 Weather</span>
                  <h4 className="text-sm font-bold text-slate-900">Local Weather Overview</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Temperature', value: '28°C', sub: 'H: 32° · L: 22°' },
                    { label: 'Humidity', value: '54%', sub: 'Comfortable' },
                    { label: 'Wind Speed', value: '12 km/h', sub: 'Moderate breeze' },
                    { label: 'Condition', value: 'Partly Cloudy', sub: 'Delhi NCR' },
                  ].map((w, i) => (
                    <div key={i} className="p-3 rounded-[5px] bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-500">{w.label}</span>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{w.value}</p>
                      <p className="text-[10px] text-slate-500">{w.sub}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-4 border-t border-slate-100 pt-3">Environmental data is for lifestyle context only.</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ TAB 4: CARE & SERVICES ═══════════ */}
        {activeTab === 'care' && (
          <div className="space-y-6">
            {/* Doctor CTA (Clean, Solid Medical Card, No Gradient) */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[5px] bg-sky-50 border border-sky-200 text-[#0067A1]">B12 Care Navigation</span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">Need Professional Medical Care?</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
                    Experiencing persistent breathlessness, frequent coughing, or chest tightness? Connect with a verified pulmonologist or chest specialist.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2 italic">
                    *LungConnect is a lifestyle wellness tool. It does not provide medical diagnosis or prescribe medications.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                  <button onClick={() => router.push('/find-doctors?specialty=Pulmonologist')}
                    className="px-5 py-2.5 bg-[#0067A1] hover:bg-[#005584] text-white font-bold text-xs rounded-[5px] transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                    <Stethoscope className="w-4 h-4" /> Book Consultation
                  </button>
                  <button onClick={() => setShowConsentModal(true)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-[5px] transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <Shield className="w-4 h-4" /> Consent Hub
                  </button>
                </div>
              </div>
            </div>

            {/* Clinical Services Grid */}
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="pb-4 border-b border-slate-100 mb-5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#e0f2fe', color: '#0067A1' }}>Appendix 5 & 5A</span>
                <h4 className="text-base font-bold text-slate-900 mt-1">Connected Clinical & Healthcare Navigation</h4>
                <p className="text-xs text-slate-500 mt-0.5">Governed handoffs to MediConnect specialist ecosystem. Clinical authority preserved.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { badge: 'J03 / J04', title: 'Pulmonologist Consultation', desc: 'Video or clinic consultation with verified chest physicians for spirometry review and clinical prescriptions.', icon: Stethoscope, bg: '#e0f2fe', color: '#0067A1', path: '/find-doctors?specialty=Pulmonologist', btn: 'Find Pulmonologists' },
                  { badge: 'J06 / J07', title: 'PFT, Chest X-Ray & Allergy', desc: 'Book certified diagnostic respiratory panels, pulmonary function testing, and home sample collection.', icon: Activity, bg: '#e0f2fe', color: '#0067A1', path: '/find-labs', btn: 'Explore Lab Tests' },
                  { badge: 'J08 / J14', title: 'Prescription Inhalers & Meds', desc: 'Upload verified prescriptions for doorstep delivery of bronchodilators, nebulizer respules, and inhalers.', icon: FaShieldAlt, bg: '#ecfdf5', color: '#059669', path: '/medicines', btn: 'Order Medicines' },
                  { badge: 'J09', title: 'Respiratory Therapist Visit', desc: 'Trained nurses for tracheostomy care, home nebulization, and oxygen therapy.', icon: Users, bg: '#eef2ff', color: '#4338ca', path: '/services', btn: 'Request Home Care' },
                  { badge: 'J10', title: 'Spirometers, O2 & Nebulizers', desc: 'Rent or purchase pulse oximeters, portable oxygen concentrators, and peak flow meters.', icon: Layers, bg: '#fffbeb', color: '#b45309', path: '/medical-equipment', btn: 'View Equipment' },
                  { badge: 'J11 / J15', title: 'ABHA & Scoped Record Share', desc: 'Export longitudinal respiratory summaries, manage consent scopes, and sync with your ABHA ID.', icon: FileText, bg: '#faf5ff', color: '#7c3aed', path: '/dashboard', btn: 'Manage Records' },
                ].map((svc, i) => {
                  const Icon = svc.icon;
                  return (
                    <div key={i} className="p-4 rounded-[5px] border border-slate-200 hover:border-[#0067A1]/50 hover:shadow-sm transition-all flex flex-col justify-between">
                      <div>
                        <div className="w-9 h-9 rounded-[5px] flex items-center justify-center mb-3" style={{ background: svc.bg, color: svc.color }}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase text-slate-500">{svc.badge}</span>
                        <h5 className="text-xs font-bold text-slate-900 mt-0.5">{svc.title}</h5>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{svc.desc}</p>
                      </div>
                      <button type="button" onClick={() => router.push(svc.path)}
                        className="mt-3 w-full py-2 bg-slate-100 hover:bg-[#0067A1] hover:text-white text-slate-700 rounded-[5px] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                        {svc.btn} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Care Episode & Launch Entitlement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#e0f2fe', color: '#0067A1' }}>B11 Continuity</span>
                  <h4 className="text-sm font-bold text-slate-900">Active Care Episode</h4>
                </div>
                <div className="space-y-2.5 text-xs">
                  {[
                    { label: 'Episode ID', value: careEpisodeId, mono: true },
                    { label: 'Journey Start', value: 'September 2026' },
                    { label: 'Type', value: 'Respiratory Wellness · Open Access' },
                    { label: 'Status', value: 'Active · Day 14 of 30' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-slate-500 font-medium">{row.label}</span>
                      <span className={`font-bold text-slate-800 ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px]" style={{ background: '#ecfdf5', color: '#059669' }}>B13 Premium Tier</span>
                  <h4 className="text-sm font-bold text-slate-900">Advanced Services</h4>
                </div>
                {[
                  { label: 'B15 Devices', title: 'Bluetooth Spirometer & SpO₂', color: '#0067A1' },
                  { label: 'AI Copilot', title: 'Governed AI Clinical Copilot', color: '#7c3aed' },
                  { label: 'Analytics', title: 'Advanced Analytics Tier', color: '#059669' },
                ].map((tier, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded" style={{ background: tier.color + '15', color: tier.color }}>{tier.label}</span>
                    <span className="text-xs font-bold text-slate-800">{tier.title}</span>
                    <FaLock className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
                  </div>
                ))}
                <button type="button" className="mt-4 w-full py-2 text-xs font-bold rounded-[5px] border-2 border-dashed border-slate-300 text-slate-600 cursor-pointer hover:border-[#0067A1] hover:text-[#0067A1] transition-colors">
                  Explore Premium Features →
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}