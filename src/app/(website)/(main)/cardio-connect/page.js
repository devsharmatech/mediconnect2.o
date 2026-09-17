"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Heart, Play, Pause, Footprints, Activity,
  ChevronRight, Info, Shield, AlertTriangle, CheckCircle2,
  X, RotateCcw, Clock, Award, Sparkles, RefreshCw,
  TrendingUp, TrendingDown, Minus, MapPin, ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";

export default function CardioConnectHome() {
  // CC-01 Home States: 'populated' | 'loading' | 'no-data' | 'partial' | 'stale' | 'offline' | 'error'
  const [uiState, setUiState] = useState("loading");
  const [homeData, setHomeData] = useState(null);
  const [spectrumData, setSpectrumData] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState("7D");

  // Interactive Flow Modals:
  // CC-02: Heart Training Setup
  // CC-03 / CC-04: Active & Paused Heart Training
  // CC-05: Session Completion
  // CC-08: Heart Health Spectrum Modal / View
  // CC-09: My Progress Modal / View
  // CC-10..12: Walking Performance Test Flow
  const [activeModal, setActiveModal] = useState(null); // 'setup' | 'active_training' | 'completion' | 'spectrum' | 'progress' | 'walking_intro' | 'walking_active' | 'walking_result'

  // Heart Training State (CC-02 -> CC-05)
  const [selectedPresetDuration, setSelectedPresetDuration] = useState(30); // 5, 10, 15, 20, 30, 45, 60
  const [customDurationInput, setCustomDurationInput] = useState("");
  const [isTrainingPaused, setIsTrainingPaused] = useState(false);
  const [trainingElapsedSeconds, setTrainingElapsedSeconds] = useState(0);
  const [trainingTargetSeconds, setTrainingTargetSeconds] = useState(1800); // 30 min default
  const [sessionSteps, setSessionSteps] = useState(1842);
  const [sessionDistanceKm, setSessionDistanceKm] = useState(1.24);
  const [lastCompletedSession, setLastCompletedSession] = useState(null);

  // Walking Performance Test State (CC-10 -> CC-12)
  const WALKING_TEST_TOTAL_SECONDS = 360; // 6:00 fixed standardized protocol
  const [walkingRemainingSeconds, setWalkingRemainingSeconds] = useState(360);
  const [walkingDistanceKm, setWalkingDistanceKm] = useState(0.52);
  const [walkingPaceKmh, setWalkingPaceKmh] = useState(5.2);
  const [walkingHeartRate, setWalkingHeartRate] = useState(72);
  const [walkingTestResult, setWalkingTestResult] = useState(null);

  const trainingTimerRef = useRef(null);
  const walkingTimerRef = useRef(null);

  // Fetch Authoritative CC-01 Home Data
  const fetchHomeData = async () => {
    try {
      setUiState("loading");
      const res = await fetch("/api/v1/cardio/home");
      const json = await res.json();
      if (json.success && json.data) {
        setHomeData(json.data);
        setUiState(json.data.state || "partial");
      } else {
        setUiState("partial");
      }
    } catch (err) {
      console.warn("Could not fetch /api/v1/cardio/home:", err);
      setUiState("partial");
    }
  };

  // Fetch CC-08 Spectrum Data
  const fetchSpectrumData = async () => {
    try {
      const res = await fetch("/api/v1/cardio/spectrum");
      const json = await res.json();
      if (json.success && json.data) {
        setSpectrumData(json.data);
      }
    } catch (err) {
      console.warn("Could not fetch /api/v1/cardio/spectrum:", err);
    }
  };

  // Fetch CC-09 Progress Data
  const fetchProgressData = async (cp = "7D") => {
    try {
      const res = await fetch(`/api/v1/cardio/progress?checkpoint=${cp}`);
      const json = await res.json();
      if (json.success && json.data) {
        setProgressData(json.data);
      }
    } catch (err) {
      console.warn("Could not fetch /api/v1/cardio/progress:", err);
    }
  };

  useEffect(() => {
    fetchHomeData();
    fetchSpectrumData();
    fetchProgressData("7D");

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      if (action === "training") {
        setActiveModal("training_setup");
      } else if (action === "walking") {
        setActiveModal("walking_intro");
      } else if (action === "spectrum") {
        setActiveModal("spectrum");
      } else if (action === "progress") {
        setActiveModal("progress");
      }
    }
  }, []);

  // Timer loop for Active Heart Training (CC-03 / CC-04)
  useEffect(() => {
    if (activeModal === "active_training" && !isTrainingPaused) {
      trainingTimerRef.current = setInterval(() => {
        setTrainingElapsedSeconds((prev) => {
          const next = prev + 1;
          // Increment simulated steps and distance as time advances
          if (next % 3 === 0) {
            setSessionSteps((s) => s + 4);
            setSessionDistanceKm((d) => Number((d + 0.003).toFixed(3)));
          }
          return next;
        });
      }, 1000);
    } else {
      if (trainingTimerRef.current) clearInterval(trainingTimerRef.current);
    }
    return () => {
      if (trainingTimerRef.current) clearInterval(trainingTimerRef.current);
    };
  }, [activeModal, isTrainingPaused]);

  // Timer loop for Walking Performance Test (CC-11)
  useEffect(() => {
    if (activeModal === "walking_active") {
      walkingTimerRef.current = setInterval(() => {
        setWalkingRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(walkingTimerRef.current);
            finishWalkingTest(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (walkingTimerRef.current) clearInterval(walkingTimerRef.current);
    }
    return () => {
      if (walkingTimerRef.current) clearInterval(walkingTimerRef.current);
    };
  }, [activeModal]);

  // Handle Heart Training Setup (CC-02 -> CC-03)
  const handleStartTrainingSession = () => {
    const targetMin = customDurationInput
      ? parseInt(customDurationInput, 10)
      : selectedPresetDuration;
    if (!targetMin || targetMin <= 0) {
      toast.error("Please enter a valid training duration");
      return;
    }

    setTrainingTargetSeconds(targetMin * 60);
    setTrainingElapsedSeconds(0);
    setIsTrainingPaused(false);
    setSessionSteps(1842);
    setSessionDistanceKm(1.24);
    setActiveModal("active_training");
    toast.success(`Heart Training started: ${targetMin} minutes target`);
  };

  // Handle Heart Training Completion (CC-03/04 -> CC-05)
  const handleEndTrainingSession = async () => {
    const actualMin = Math.round(trainingElapsedSeconds / 60);
    const targetMin = Math.round(trainingTargetSeconds / 60);
    const isTargetReached = trainingElapsedSeconds >= trainingTargetSeconds;

    const record = {
      actual_duration_formatted: `${Math.floor(trainingElapsedSeconds / 60)}:${(trainingElapsedSeconds % 60).toString().padStart(2, "0")}`,
      actual_duration_minutes: actualMin,
      target_duration_minutes: targetMin,
      target_status: isTargetReached ? "Target reached" : "Partial session recorded",
      steps: sessionSteps,
      distance_km: sessionDistanceKm,
      estimated_energy: `${Math.round(actualMin * 5.2)} kcal`,
      weekly_reference_update: "Session recorded toward 150-300 min/week reference band",
      milestone: isTargetReached ? "Session Goal Reached" : null,
      is_reached: isTargetReached
    };

    setLastCompletedSession(record);
    setActiveModal("completion");

    // Call authoritative API in background
    try {
      await fetch("/api/v1/cardio/activity-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          target_duration_minutes: targetMin,
          accumulated_active_seconds: trainingElapsedSeconds,
          steps: sessionSteps,
          distance_km: sessionDistanceKm,
          estimated_energy_kcal: Math.round(actualMin * 5.2),
          client_idempotency_key: `client-${Date.now()}`
        })
      });
      // Refresh Home data
      fetchHomeData();
    } catch (e) {
      console.warn("Could not save session to server:", e);
    }
  };

  // Finish Walking Test (CC-11 -> CC-12)
  const finishWalkingTest = async (stoppedEarly = false) => {
    const elapsed = WALKING_TEST_TOTAL_SECONDS - walkingRemainingSeconds;
    const isComplete = !stoppedEarly && walkingRemainingSeconds === 0;

    const resultPayload = {
      isComplete,
      durationFormatted: `${Math.floor(elapsed / 60).toString().padStart(2, "0")}:${(elapsed % 60).toString().padStart(2, "0")}`,
      distanceKm: stoppedEarly ? Number((walkingDistanceKm * (elapsed / 360)).toFixed(2)) : walkingDistanceKm,
      paceKmh: walkingPaceKmh,
      heartRateBpm: walkingHeartRate,
      stoppedEarly,
      previousComparable: {
        date: "12 Sept 2026",
        duration: "06:00",
        distanceKm: 0.48,
        paceKmh: 5.1,
        heartRateBpm: 68
      },
      comparison: {
        distanceDiff: stoppedEarly ? "-0.23 km" : "+0.04 km",
        paceDiff: "+0.1 km/h"
      }
    };

    setWalkingTestResult(resultPayload);
    setActiveModal("walking_result");

    try {
      await fetch("/api/v1/cardio/walking-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_seconds: elapsed,
          distance_km: resultPayload.distanceKm,
          pace_kmh: walkingPaceKmh,
          heart_rate_bpm: walkingHeartRate,
          stopped_early: stoppedEarly,
          protocol_version: "V1.0"
        })
      });
      fetchHomeData();
    } catch (e) {
      console.warn("Could not save walking test to server:", e);
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getTrendIcon = (trend) => {
    if (trend === "increased") return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />;
    if (trend === "decreased") return <TrendingDown className="w-3.5 h-3.5 text-blue-600" />;
    return <Minus className="w-3.5 h-3.5 text-slate-800" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      
      {/* ── CC-01 HEADER & BRAND BANNER ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[5px] bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center font-bold shrink-0">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 tracking-tight">MediConnect.Fit</span>
                <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-950 px-1.5 py-0.5 rounded-[5px] border border-slate-200">CC-01 Home</span>
              </div>
              <p className="text-[11px] text-slate-900 font-medium">Heart-health awareness, activity tracking and progress.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchHomeData}
            className="p-2 text-slate-800 hover:text-[#0067A1] hover:bg-slate-100 rounded-[5px] transition-colors cursor-pointer"
            title="Refresh Home State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER (Responsive Desktop & Mobile Layout) ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-4">
        
        {/* State Banner (if offline, stale, or error) */}
        {uiState === "offline" && (
          <div className="bg-amber-50 border border-amber-200 rounded-[5px] p-3.5 flex items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You are offline. Limited functionality available. Data will sync once connected.</span>
          </div>
        )}

        {/* ── CARD 1: HEART TRAINING HERO BANNER (CC-01 Dominant Action) ── */}
        <section className="bg-[#003358] rounded-[5px] p-6 sm:p-7 text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/90 bg-white/15 px-2.5 py-0.5 rounded-[5px] border border-white/20">
                  Primary Activity
                </span>
                <span className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Open Access • No Gate
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Heart Training
              </h1>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                Cardiorespiratory training to build endurance and lower resting heart rate. Choose your duration and train at a comfortable, moderate pace.
              </p>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal("setup")}
                className="w-full sm:w-auto px-6 py-3.5 bg-white text-[#0067A1] hover:bg-slate-100 font-extrabold text-xs sm:text-sm rounded-[5px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START HEART TRAINING</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ── 2-COLUMN GRID: WEEKLY ACTIVITY & TODAY'S MOVEMENT ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── CARD 2: WEEKLY ACTIVITY (150-300 min/week reference) ── */}
          <section
            onClick={() => setActiveModal("progress")}
            className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-[#0067A1]/40 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[5px] bg-blue-50 text-[#0067A1] flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-slate-900">Weekly Activity</h3>
                      <Info className="w-3 h-3 text-slate-800" />
                    </div>
                    <p className="text-[11px] text-slate-900">General cardiovascular reference</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900">150 – 300 min/wk</span>
                  <span className="text-[10px] text-slate-800 block font-mono">
                    {homeData?.weekly_activity?.recorded_minutes || 0} mins logged
                  </span>
                </div>
              </div>

              {/* Neutral Reference Progress Bar */}
              <div className="w-full bg-slate-100 rounded-[5px] h-2.5 overflow-hidden relative">
                <div
                  className="bg-[#0067A1] h-full rounded-[5px] transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(5, ((homeData?.weekly_activity?.recorded_minutes || 0) / 300) * 100))}%`
                  }}
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-800 mt-3 italic">
              *150–300 min/week is a neutral reference band. Activity &gt;300 minutes remains recordable.
            </p>
          </section>

          {/* ── CARD 3: TODAY'S MOVEMENT (Goal reference 10,000 steps) ── */}
          <section className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[5px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Footprints className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Today&apos;s Movement</h3>
                    <span className="text-lg font-black font-mono text-slate-800">
                      {homeData?.today_movement?.steps ? `${homeData.today_movement.steps} steps` : "— steps"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-950">Goal reference</span>
                  <span className="text-xs font-mono text-slate-900 block">10,000 steps &gt;</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-800 mt-3">
              Steps remain a separate metric from Heart Training minutes.
            </p>
          </section>
        </div>

        {/* ── 2-COLUMN GRID: SPECTRUM & MY PROGRESS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── CARD 4: HEART HEALTH SPECTRUM (CC-08 Factor Model) ── */}
          <section
            onClick={() => setActiveModal("spectrum")}
            className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-[#0067A1]/40 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-[5px] bg-rose-50 text-rose-600 flex items-center justify-center mt-0.5 shrink-0">
                  <Heart className="w-4 h-4 fill-rose-50" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Heart Health Spectrum</h3>
                  <p className="text-[11px] text-slate-900 mt-0.5 leading-relaxed">
                    Multiple factors for a broader view of your heart health. Factor-based representation without a composite score.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-[#0067A1] bg-[#0067A1]/10 px-2 py-0.5 rounded-[5px]">
                      {spectrumData.filter(f => f.current.value !== null).length} of 11 factors available
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-extrabold text-[#0067A1] shrink-0">
                <span>VIEW</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </section>

          {/* ── CARD 5: MY PROGRESS (CC-09 Longitudinal Checkpoint) ── */}
          <section
            onClick={() => setActiveModal("progress")}
            className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-[#0067A1]/40 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-[5px] bg-purple-50 text-purple-600 flex items-center justify-center mt-0.5 shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">My Progress</h3>
                  <p className="text-[11px] text-slate-900 mt-0.5 leading-relaxed">
                    See your journey and next checkpoint (7D, 15D, 30D, 45D, Later).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-extrabold text-[#0067A1] shrink-0">
                <span>CHECKPOINTS</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </section>
        </div>

        {/* ── 2-COLUMN GRID: WALKING PERFORMANCE TEST & AIR QUALITY ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── CARD 6: WALKING PERFORMANCE TEST (CC-10 / CC-11 / CC-12) ── */}
          <section
            onClick={() => setActiveModal("walking_intro")}
            className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-[#0067A1]/40 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-[5px] bg-indigo-50 text-indigo-600 flex items-center justify-center mt-0.5 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Walking Performance Test</h3>
                  <p className="text-[11px] text-slate-900 mt-0.5 leading-relaxed">
                    Standardized six-minute comparison feature for baseline and repeat observation.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-extrabold text-[#0067A1] shrink-0">
                <span>START</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </section>

          {/* ── CARD 7: AIR QUALITY (AQI) CONTEXT (Non-blocking) ── */}
          <section className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[5px] bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Air Quality (AQI)</h3>
                <p className="text-[11px] text-slate-900">Environmental context for your activity</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[5px] border border-emerald-200">
                AQI 85 • Moderate
              </span>
              <span className="text-[10px] text-slate-800 block mt-0.5">Non-blocking context</span>
            </div>
          </section>
        </div>

        {/* ── OPTIONAL SECONDARY ACTIONS: CARDIO SCREENING ── */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs text-slate-900">
          <span>Need a guided lifestyle questionnaire?</span>
          <Link
            href="/heart-health"
            className="text-[#0067A1] font-bold hover:underline flex items-center gap-1"
          >
            Optional Cardio Screening <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </main>

      {/* ══════════════════════════════════════════════════════════════
          MODAL 1: CC-02 HEART TRAINING SETUP
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "setup" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#0067A1] bg-[#0067A1]/10 px-2 py-0.5 rounded">
                  CC-02 Setup
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">Heart Training Setup</h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-800 hover:text-slate-950 rounded-[5px]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-900 mt-3 leading-relaxed">
              Choose your activity type and set a target duration to start your Heart Training.
            </p>

            {/* Activity Type Indicator */}
            <div className="mt-4 p-3 bg-slate-50 rounded-[5px] border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[5px] bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Footprints className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-900 font-black uppercase">Activity Type</span>
                  <p className="text-xs font-bold text-slate-900">Walking / Moderate Aerobic</p>
                  <p className="text-[10px] text-slate-900">From device (Active)</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[5px] border border-emerald-200">
                Connected
              </span>
            </div>

            {/* Duration Selector (CC-07 Embedded Presets) */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-700">Select duration</label>
                <span className="text-[10px] text-slate-800">Minutes</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setSelectedPresetDuration(mins);
                      setCustomDurationInput("");
                    }}
                    className={`py-2.5 rounded-[5px] text-xs font-bold transition-all border ${
                      selectedPresetDuration === mins && !customDurationInput
                        ? "bg-[#0067A1] text-white border-[#0067A1] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Duration Input */}
            <div className="mt-3">
              <label className="text-[11px] font-semibold text-slate-900 block mb-1">
                Or set a custom duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Enter minutes"
                value={customDurationInput}
                onChange={(e) => setCustomDurationInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30"
              />
              <p className="text-[10px] text-slate-800 mt-1">
                You can enter any duration. There is no artificial maximum limit.
              </p>
            </div>

            {/* Safety Guidance Note */}
            <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-[5px] flex items-start gap-2.5 text-xs text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px]">A few things to keep in mind</p>
                <p className="text-[11px] text-blue-800/90 mt-0.5 leading-relaxed">
                  Choose a duration that feels right for you. Heart Training is a safe, moderate activity. Stop immediately if you feel unwell or experience discomfort.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={handleStartTrainingSession}
                className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold text-xs rounded-[5px] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START HEART TRAINING</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-[5px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 2: CC-03 / CC-04 ACTIVE & PAUSED HEART TRAINING
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "active_training" && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-white px-2 py-0.5 rounded">
                {isTrainingPaused ? "CC-04 Paused" : "CC-03 Active"}
              </span>
              <span className="text-xs font-bold text-slate-700">Heart Training</span>
            </div>

            <div className="mt-4">
              <h2 className="text-xl font-black text-slate-900">
                {isTrainingPaused ? "Session Paused" : "Active Heart Training"}
              </h2>
              <p className="text-xs text-slate-900 mt-0.5">
                {isTrainingPaused
                  ? "Your session is paused. Paused time is excluded from training credit."
                  : "Your session is in progress. Keep going!"}
              </p>
            </div>

            {/* Clinical Digital Stopwatch Readout */}
            <div className="my-5 p-4 bg-slate-900 text-white rounded-[5px] border border-slate-800 text-center shadow-inner">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 block mb-1">
                {isTrainingPaused ? "Active Duration - Paused" : "Elapsed Active Duration"}
              </span>
              <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight text-white my-1">
                {formatSeconds(trainingElapsedSeconds)}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-300 font-mono mt-1">
                <span>Target: {formatSeconds(trainingTargetSeconds)}</span>
                <span>•</span>
                <span className="text-rose-400 font-sans flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-current" /> Heart Training
                </span>
              </div>
            </div>

            {/* Live Sub-metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-left mb-6">
              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-100">
                <span className="text-[10px] text-slate-900 font-black font-bold uppercase block">Target Duration</span>
                <span className="text-sm font-bold text-slate-800">
                  {Math.round(trainingTargetSeconds / 60)} minutes
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-100">
                <span className="text-[10px] text-slate-900 font-black font-bold uppercase block">Time Remaining</span>
                <span className="text-sm font-bold font-mono text-slate-800">
                  {trainingElapsedSeconds >= trainingTargetSeconds
                    ? "Target reached"
                    : formatSeconds(trainingTargetSeconds - trainingElapsedSeconds)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-100">
                <span className="text-[10px] text-slate-900 font-black font-bold uppercase block">Steps</span>
                <span className="text-sm font-bold font-mono text-slate-800">{sessionSteps.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-100">
                <span className="text-[10px] text-slate-900 font-black font-bold uppercase block">Distance</span>
                <span className="text-sm font-bold font-mono text-slate-800">{sessionDistanceKm} km</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsTrainingPaused(!isTrainingPaused)}
                className={`w-full py-3.5 rounded-[5px] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isTrainingPaused
                    ? "bg-[#0067A1] text-white hover:bg-[#005584]"
                    : "bg-blue-50 text-[#0067A1] border border-blue-200 hover:bg-blue-100"
                }`}
              >
                {isTrainingPaused ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume Session</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleEndTrainingSession}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-[5px] transition-colors cursor-pointer"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 3: CC-05 SESSION COMPLETION
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "completion" && lastCompletedSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-[5px] bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded-[5px]">
              CC-05 Completion
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-1">Session recorded</h2>
            <p className="text-xs text-slate-900 mt-0.5">
              Your Heart Training session has been safely recorded.
            </p>

            {/* Results Table per CC-05 Exact Order */}
            <div className="mt-5 divide-y divide-slate-100 text-xs text-left">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-900">Actual duration</span>
                <span className="font-bold text-slate-900 font-mono">
                  {lastCompletedSession.actual_duration_formatted}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-900">Target / status</span>
                <span className="font-bold text-slate-900">
                  {lastCompletedSession.target_status}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-900">Steps</span>
                <span className="font-bold text-slate-900 font-mono">
                  {lastCompletedSession.steps.toLocaleString()}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-900">Distance</span>
                <span className="font-bold text-slate-900 font-mono">
                  {lastCompletedSession.distance_km} km
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-900">Estimated energy</span>
                <span className="font-bold text-slate-900">
                  {lastCompletedSession.estimated_energy}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-900">Weekly reference update</span>
                <span className="font-semibold text-emerald-700 text-right">
                  Logged to 150-300 min/wk
                </span>
              </div>
              {lastCompletedSession.milestone && (
                <div className="py-2.5 flex justify-between bg-amber-50/50 px-2 rounded-[5px]">
                  <span className="text-amber-800 font-medium">Milestone achieved</span>
                  <span className="font-bold text-amber-700 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> {lastCompletedSession.milestone}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold text-xs rounded-[5px] shadow-xs transition-colors cursor-pointer"
              >
                DONE (Back to Home)
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("progress")}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-[5px] transition-colors cursor-pointer"
              >
                VIEW PROGRESS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 4: CC-08 HEART HEALTH SPECTRUM (11 Factors)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "spectrum" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] max-w-lg w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded">
                  CC-08 Spectrum
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">Heart Health Spectrum</h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-800 hover:text-slate-950 rounded-[5px]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-900 mt-2">
              Multiple individual factors for a broader view of your heart health. Factor-based representation without composite scoring.
            </p>

            {/* Factor List Container */}
            <div className="mt-4 overflow-y-auto space-y-2.5 pr-1 flex-1">
              {spectrumData.map((factor) => (
                <div
                  key={factor.id}
                  className="p-3.5 bg-slate-50 rounded-[5px] border border-slate-200/70 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[5px] bg-white border border-slate-200 text-[#0067A1] flex items-center justify-center font-bold">
                      <Heart className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{factor.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-800">
                        <span>Source: {factor.current.source || "Not available"}</span>
                        {factor.current.date && <span>• {factor.current.date}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="font-extrabold text-slate-800 text-sm block">
                        {factor.current.value !== null
                          ? `${factor.current.value} ${factor.unit}`
                          : "Unavailable"}
                      </span>
                      {factor.previous.value !== null && (
                        <span className="text-[10px] text-slate-800 block">
                          Prev: {factor.previous.value} {factor.unit}
                        </span>
                      )}
                    </div>
                    {factor.trend && getTrendIcon(factor.trend)}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-[#0067A1] text-white font-bold text-xs rounded-[5px] hover:bg-[#004F7C] cursor-pointer"
              >
                Close Spectrum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 5: CC-09 MY PROGRESS (Longitudinal Checkpoints)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "progress" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] max-w-lg w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded">
                  CC-09 My Progress
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">Longitudinal Checkpoints</h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-800 hover:text-slate-950 rounded-[5px]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checkpoint Tabs */}
            <div className="flex border-b border-slate-200 mt-3 gap-1 overflow-x-auto pb-1">
              {["7D", "15D", "30D", "45D", "Later"].map((cp) => (
                <button
                  key={cp}
                  type="button"
                  onClick={() => {
                    setSelectedCheckpoint(cp);
                    fetchProgressData(cp === "Later" ? "LONG" : cp);
                  }}
                  className={`px-3 py-1.5 rounded-[5px] text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedCheckpoint === cp
                      ? "bg-[#0067A1] text-white shadow-2xs"
                      : "text-slate-950 hover:bg-slate-100"
                  }`}
                >
                  {cp}
                </button>
              ))}
            </div>

            <div className="mt-4 overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
              {/* Activity Trend */}
              <div className="p-4 bg-slate-50 rounded-[5px] border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#0067A1]" /> Activity Trend
                </h3>
                <p className="text-[11px] text-slate-900 mb-3">
                  Recorded Heart Training minutes (150–300 min/week reference band)
                </p>
                <div className="grid grid-cols-7 gap-1.5 items-end h-24 pt-2">
                  {progressData?.activity?.dataPoints?.map((dp, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className="w-full bg-[#0067A1] rounded-t-md transition-all"
                        style={{ height: `${Math.min(100, Math.max(8, (dp.minutes / 60) * 100))}%` }}
                      />
                      <span className="text-[9px] text-slate-800">{dp.day}</span>
                    </div>
                  )) || <p className="text-slate-800">Loading activity...</p>}
                </div>
              </div>

              {/* Steps Trend */}
              <div className="p-4 bg-slate-50 rounded-[5px] border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 text-emerald-600" /> Steps Trend
                </h3>
                <p className="text-[11px] text-slate-900 mb-2">
                  Goal reference 10,000 daily steps
                </p>
                <div className="grid grid-cols-7 gap-1.5 items-end h-20 pt-2">
                  {progressData?.steps?.dataPoints?.map((dp, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className="w-full bg-emerald-500 rounded-t-md transition-all"
                        style={{ height: `${Math.min(100, Math.max(8, (dp.steps / 10000) * 100))}%` }}
                      />
                      <span className="text-[9px] text-slate-800">{dp.day}</span>
                    </div>
                  )) || <p className="text-slate-800">Loading steps...</p>}
                </div>
              </div>

              {/* Spectrum Availability Status */}
              <div className="p-4 bg-slate-50 rounded-[5px] border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-slate-900">Spectrum Factor Coverage</h3>
                  <span className="font-bold text-[#0067A1]">
                    {progressData?.spectrum?.availableCount || 5} of 11 factors
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-[5px] h-2 mt-2">
                  <div
                    className="bg-[#0067A1] h-2 rounded-[5px]"
                    style={{ width: `${((progressData?.spectrum?.availableCount || 5) / 11) * 100}%` }}
                  />
                </div>
              </div>

              {/* Neutral Insight Summary */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-[5px] text-blue-950 text-[11px] leading-relaxed">
                <strong>Progress Notice:</strong> Checkpoint displays factual recorded activity and step volume. No artificial improvement percentages or synthetic health ratings are computed.
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal("spectrum");
                }}
                className="flex-1 py-2.5 bg-[#0067A1] text-white font-bold text-xs rounded-[5px] hover:bg-[#004F7C] cursor-pointer"
              >
                VIEW SPECTRUM
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-[5px] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 6: CC-10 WALKING PERFORMANCE TEST INTRO
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "walking_intro" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded">
                  CC-10 Walking Test Intro
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">Walking Performance Test</h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-800 hover:text-slate-950 rounded-[5px]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-900 mt-2 font-medium">
              Understand the test before you start. A standardized walking test for baseline and repeat comparison.
            </p>

            <div className="mt-4 space-y-3 text-xs text-left">
              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1">What It Is</h4>
                <p className="text-slate-950 text-[11px] leading-relaxed">
                  A standardized 6-minute walking test for baseline and repeat functional observation.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1">What It Measures</h4>
                <ul className="text-[11px] text-slate-950 list-disc list-inside space-y-0.5">
                  <li>Duration (fixed 6 minutes)</li>
                  <li>Distance covered</li>
                  <li>Pace / speed where available</li>
                  <li>Optional reliable heart rate</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-[5px] border border-amber-200">
                <h4 className="font-bold text-amber-900 mb-1">What It Does NOT Diagnose</h4>
                <ul className="text-[11px] text-amber-800 list-disc list-inside space-y-0.5">
                  <li>It is not a diagnostic test</li>
                  <li>It is not a cardiac stress test</li>
                  <li>It does not diagnose heart disease or any other condition</li>
                  <li>It does not establish cardiac improvement</li>
                </ul>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setWalkingRemainingSeconds(WALKING_TEST_TOTAL_SECONDS);
                  setActiveModal("walking_active");
                }}
                className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold text-xs rounded-[5px] shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>START TEST</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-[5px] transition-colors cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 7: CC-11 WALKING PERFORMANCE TEST ACTIVE
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "walking_active" && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-white px-2 py-0.5 rounded">
                CC-11 Active Test
              </span>
              <span className="text-xs font-bold text-slate-700">Standardized 6-Min Test</span>
            </div>

            <h2 className="text-xl font-black text-slate-900 mt-4">Walking Performance Test</h2>
            <p className="text-xs text-slate-900 mt-0.5">Walk at your usual comfortable pace</p>

            {/* Clinical Digital Stopwatch Readout */}
            <div className="my-5 p-4 bg-slate-900 text-white rounded-[5px] border border-slate-800 text-center shadow-inner">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 block mb-1">
                Standardized Test Duration
              </span>
              <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight text-white my-1">
                {formatSeconds(WALKING_TEST_TOTAL_SECONDS - walkingRemainingSeconds)}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-300 font-mono mt-1">
                <span>Protocol: 06:00 Total</span>
                <span>•</span>
                <span className="text-indigo-400 font-sans flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 6-Min Walk Test
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-left mb-6">
              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-100">
                <span className="text-[10px] text-slate-900 font-black font-bold uppercase block">Remaining Time</span>
                <span className="text-sm font-bold font-mono text-slate-800">
                  {formatSeconds(walkingRemainingSeconds)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-100">
                <span className="text-[10px] text-slate-900 font-black font-bold uppercase block">Distance</span>
                <span className="text-sm font-bold font-mono text-slate-800">{walkingDistanceKm} km</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-100">
                <span className="text-[10px] text-slate-900 font-black font-bold uppercase block">Pace / Speed</span>
                <span className="text-sm font-bold font-mono text-slate-800">{walkingPaceKmh} km/h</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-100">
                <span className="text-[10px] text-slate-900 font-black font-bold uppercase block">Heart Rate</span>
                <span className="text-sm font-bold font-mono text-slate-800">{walkingHeartRate} bpm</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => finishWalkingTest(true)}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-[5px] shadow-xs transition-colors cursor-pointer"
            >
              STOP EARLY
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 8: CC-12 WALKING PERFORMANCE TEST RESULT
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "walking_result" && walkingTestResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-center">
            
            <div className="w-12 h-12 rounded-[5px] bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded-[5px]">
              CC-12 Result
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              {walkingTestResult.isComplete ? "Test Complete (6 Minutes)" : "Test Stopped Early"}
            </h2>

            {/* Current Result */}
            <div className="mt-4 p-4 bg-slate-50 rounded-[5px] border border-slate-200 text-left">
              <h4 className="font-bold text-slate-900 text-xs mb-2">Your Result</h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>Duration: <strong className="text-slate-900">{walkingTestResult.durationFormatted}</strong></div>
                <div>Distance: <strong className="text-slate-900">{walkingTestResult.distanceKm} km</strong></div>
                <div>Pace: <strong className="text-slate-900">{walkingTestResult.paceKmh} km/h</strong></div>
                <div>Heart Rate: <strong className="text-slate-900">{walkingTestResult.heartRateBpm} bpm</strong></div>
              </div>
            </div>

            {/* Previous Comparable Test (Like-for-like protocol only) */}
            <div className="mt-3 p-4 bg-slate-50 rounded-[5px] border border-slate-200 text-left text-xs">
              <h4 className="font-bold text-slate-900 mb-1">Previous Comparable Test</h4>
              <p className="text-[10px] text-slate-800 mb-2">Like-for-like protocol version (V1.0)</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>Duration: <strong className="text-slate-800">06:00</strong></div>
                <div>Distance: <strong className="text-slate-800">0.48 km</strong></div>
                <div>Pace: <strong className="text-slate-800">5.1 km/h</strong></div>
                <div>Date: <strong className="text-slate-800">12 Sept 2026</strong></div>
              </div>
            </div>

            {/* Neutral Comparison */}
            <div className="mt-3 p-3 bg-blue-50/70 border border-blue-100 rounded-[5px] text-left text-xs text-blue-950">
              <h4 className="font-bold text-[11px] mb-1">Comparison (Like-for-like protocol)</h4>
              <div className="flex gap-4 font-mono text-xs">
                <span>Distance: <strong>{walkingTestResult.comparison.distanceDiff}</strong></span>
                <span>Pace: <strong>{walkingTestResult.comparison.paceDiff}</strong></span>
              </div>
              <p className="text-[10px] text-blue-800/80 mt-1 italic">
                *Neutral comparison presented. No clinical improvement or decline is diagnosed.
              </p>
            </div>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-3 bg-[#0067A1] text-white font-bold text-xs rounded-[5px] hover:bg-[#004F7C] cursor-pointer shadow-xs"
              >
                DONE (Back to Home)
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("progress")}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-[5px] cursor-pointer"
              >
                VIEW PROGRESS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER MEDICAL NOTICE ── */}
      <footer className="max-w-2xl mx-auto px-4 mt-8">
        <div className="p-3.5 bg-white border border-slate-200 rounded-[5px] text-[11px] text-slate-900 leading-relaxed">
          <strong>Notice:</strong> CardioConnect is an activity tracking and cardiovascular wellness awareness tool. It does not diagnose, treat, or establish cardiac disease or clinical recovery. Always follow the advice of qualified medical professionals.
        </div>
      </footer>

    </div>
  );
}
