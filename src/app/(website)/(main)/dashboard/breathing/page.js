"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaWind,
  FaPlay,
  FaVolumeUp,
  FaVolumeMute,
  FaClock,
  FaHeart,
  FaFire,
  FaTrophy,
  FaRegSmile,
  FaRegCalendarAlt
} from "react-icons/fa";
import toast from "react-hot-toast";

// Audio Synth Helper: Generates beautiful, organic ambient chime sounds dynamically
const playChime = (frequency = 440, duration = 0.5, volume = 0.1) => {
  if (typeof window === "undefined" || !window.AudioContext && !window.webkitAudioContext) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, ctx.currentTime + duration);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Web Audio API error:", e);
  }
};

const SESSION_TYPES = [
  {
    id: "box", name: "Box Breathing", desc: "Equal duration inhale, hold, exhale, hold. Balances energy and relieves stress.", pattern: [
      { type: "Inhale", duration: 4, action: () => playChime(523, 0.4, 0.08) },
      { type: "Hold", duration: 4, action: () => playChime(659, 0.3, 0.05) },
      { type: "Exhale", duration: 4, action: () => playChime(440, 0.5, 0.08) },
      { type: "Hold", duration: 4, action: () => playChime(392, 0.3, 0.05) }
    ]
  },
  {
    id: "calm", name: "Deep Calming (5-2-5)", desc: "Slow inhale and exhale with short holding phases. Lowers active heart rates.", pattern: [
      { type: "Inhale", duration: 5, action: () => playChime(523, 0.4, 0.08) },
      { type: "Hold", duration: 2, action: () => playChime(659, 0.3, 0.05) },
      { type: "Exhale", duration: 5, action: () => playChime(440, 0.5, 0.08) }
    ]
  },
  {
    id: "478", name: "4-7-8 Calming", desc: "Inhale for 4s, hold for 7s, exhale for 8s. Promotes deep, restorative sleep.", pattern: [
      { type: "Inhale", duration: 4, action: () => playChime(523, 0.4, 0.08) },
      { type: "Hold", duration: 7, action: () => playChime(659, 0.3, 0.05) },
      { type: "Exhale", duration: 8, action: () => playChime(440, 0.5, 0.08) }
    ]
  }
];

export default function BreathingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  // States
  const [stats, setStats] = useState({ total_sessions: 0, total_duration_minutes: 0, average_calm_score: 0, current_streak: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("setup"); // setup | active | feedback | complete

  // Selection States
  const [selectedType, setSelectedType] = useState(SESSION_TYPES[0]);
  const [selectedMinutes, setSelectedMinutes] = useState(2);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active Session Tracking
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [totalSecondsLeft, setTotalSecondsLeft] = useState(0);
  const [breathsCompleted, setBreathsCompleted] = useState(0);

  // Feedback States
  const [calmScore, setCalmScore] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [newBadges, setNewBadges] = useState([]);

  // Timers and Refs
  const intervalRef = useRef(null);
  const totalSecondsInitial = selectedMinutes * 60;

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // Sound triggers
  const triggerSound = (type) => {
    if (!soundEnabled) return;
    if (type === "Inhale") playChime(523, 0.4, 0.06);
    else if (type === "Hold") playChime(659, 0.3, 0.04);
    else if (type === "Exhale") playChime(440, 0.5, 0.06);
  };

  useEffect(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const u = JSON.parse(userData);
        setUser(u);
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    } else {
      toast.error("Please login to log breathing exercises");
      router.push("/website/login");
    }
  }, [router]);

  useEffect(() => {
    if (user?.id) {
      fetchStatsAndHistory();
    }
  }, [user]);

  const fetchStatsAndHistory = async () => {
    try {
      const res = await fetch(`/api/health/breathing?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats || { total_sessions: 0, total_duration_minutes: 0, average_calm_score: 0, current_streak: 0 });
        setHistory(data.data.sessions || []);
      }
    } catch (e) {
      console.error("Failed to load stats & history:", e);
    } finally {
      setLoading(false);
    }
  };

  // Start active session
  const startSession = () => {
    setStage("active");
    setPhaseIndex(0);
    setBreathsCompleted(0);
    setCalmScore(7);
    setNewBadges([]);

    const pattern = selectedType.pattern;
    setPhaseTimeLeft(pattern[0].duration);
    setTotalSecondsLeft(selectedMinutes * 60);
    triggerSound(pattern[0].type);

    if (intervalRef.current) clearInterval(intervalRef.current);

    let activePhaseIdx = 0;
    let secondsInCurrentPhase = pattern[0].duration;
    let totalSecsLeft = selectedMinutes * 60;
    let countBreaths = 0;

    intervalRef.current = setInterval(() => {
      totalSecsLeft -= 1;
      secondsInCurrentPhase -= 1;
      setTotalSecondsLeft(totalSecsLeft);

      if (totalSecsLeft <= 0) {
        // Session finishes
        clearInterval(intervalRef.current);
        setStage("feedback");
        playChime(880, 1.2, 0.1); // Beautiful ambient ending bell
        return;
      }

      if (secondsInCurrentPhase <= 0) {
        // Move to next phase in pattern
        activePhaseIdx = (activePhaseIdx + 1) % pattern.length;
        if (activePhaseIdx === 0) {
          countBreaths += 1;
          setBreathsCompleted(countBreaths);
        }
        secondsInCurrentPhase = pattern[activePhaseIdx].duration;
        setPhaseIndex(activePhaseIdx);
        triggerSound(pattern[activePhaseIdx].type);
      }
      setPhaseTimeLeft(secondsInCurrentPhase);
    }, 1000);
  };

  const cancelSession = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStage("setup");
  };

  const submitSession = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/health/breathing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          session_type: selectedType.name,
          duration_seconds: totalSecondsInitial,
          breaths_count: breathsCompleted > 0 ? breathsCompleted : Math.round(totalSecondsInitial / 12),
          calm_score: calmScore
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Breathing session saved successfully!");

        // Fetch new stats to check if a new badge was awarded
        const { data: updatedData } = await fetch(`/api/health/breathing?user_id=${user.id}`).then(r => r.json());
        if (updatedData) {
          setStats(updatedData.stats || stats);
          setHistory(updatedData.sessions || history);
        }

        // Fetch newly awarded badges in last 5 seconds (mock or query user_badges)
        try {
          const badgeRes = await fetch(`/api/user/badges?user_id=${user.id}`).then(r => r.json());
          if (badgeRes.success && Array.isArray(badgeRes.data)) {
            // Find badges earned in last 10 seconds
            const recent = badgeRes.data.filter(b => {
              const diff = new Date() - new Date(b.earned_at);
              return diff < 15000;
            });
            setNewBadges(recent);
          }
        } catch { /* ignore */ }

        setStage("complete");
      } else {
        toast.error(data.message || "Failed to save session");
      }
    } catch (err) {
      toast.error("Error connecting to server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const currentPhase = selectedType.pattern[phaseIndex] || selectedType.pattern[0];

  return (
    <div className="min-h-screen text-slate-800 py-4">
      {/* Background Micro-ambient Orbs */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-teal-200/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-emerald-200/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/website/dashboard")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#0067A1] bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-all active:scale-95"
          >
            <FaArrowLeft />
            Dashboard
          </button>
          <div className="flex items-center gap-2 bg-[#0067A1]/5 border border-[#0067A1]/10 px-4 py-2 rounded-2xl">
            <FaWind className="text-[#0067A1] animate-pulse" />
            <span className="text-xs font-black text-[#0067A1] tracking-wider uppercase">MediCalm Wellness</span>
          </div>
        </header>

        {/* SETUP SCREEN */}
        {stage === "setup" && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Wellness Overview Cards */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col justify-between shadow-sm">
                <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center mb-4">
                  <FaWind className="text-[#0067A1] w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">{stats.total_sessions}</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Total Sessions</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col justify-between shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                  <FaClock className="text-emerald-600 w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">{stats.total_duration_minutes}m</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Total Minutes</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col justify-between shadow-sm">
                <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                  <FaHeart className="text-rose-500 w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">{stats.average_calm_score}/10</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Avg Calm Score</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col justify-between shadow-sm">
                <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                  <FaFire className="text-orange-500 w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">{stats.current_streak} days</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Daily Streak</p>
                </div>
              </div>
            </section>

            {/* Exercise Selector */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
              <h2 className="text-2xl font-black tracking-tight text-slate-800 mb-6">Start a Breathing Session</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {SESSION_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type)}
                    className={`p-6 rounded-3xl border text-left flex flex-col justify-between transition-all duration-300 ${selectedType.id === type.id
                      ? "border-[#0067A1] bg-[#0067A1]/5 shadow-md shadow-[#0067A1]/5"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <div>
                      <h3 className={`text-base font-bold transition-colors ${selectedType.id === type.id ? 'text-[#0067A1]' : 'text-slate-800'}`}>
                        {type.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">{type.desc}</p>
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full mt-4 self-start ${selectedType.id === type.id ? 'bg-[#0067A1] text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                      {type.pattern.length} Stages
                    </span>
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 border-t border-slate-50 pt-6">
                {/* Duration */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-600">Select Duration:</span>
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    {[1, 2, 5].map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedMinutes(m)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${selectedMinutes === m ? "bg-white text-[#0067A1] shadow-sm" : "text-slate-500 hover:text-slate-800"
                          }`}
                      >
                        {m} Min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound Settings & Launch */}
                <div className="flex items-center justify-end gap-4">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-3 bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-200 transition-colors"
                    title={soundEnabled ? "Mute chimes" : "Enable chimes"}
                  >
                    {soundEnabled ? <FaVolumeUp className="w-4 h-4 text-[#0067A1]" /> : <FaVolumeMute className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={startSession}
                    className="flex-1 sm:flex-none px-8 py-4 bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white font-black text-sm rounded-2xl shadow-lg shadow-[#0067A1]/20 hover:shadow-xl hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-3"
                  >
                    <FaPlay className="text-xs" />
                    Begin Session
                  </button>
                </div>
              </div>
            </div>

            {/* Past History Panel */}
            <section className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-black tracking-tight text-slate-800 mb-6 flex items-center gap-2.5">
                <FaRegCalendarAlt className="text-slate-400" />
                Past Sessions History
              </h2>
              {history.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 mx-auto">
                    <FaWind className="text-slate-300 w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-400">No completed sessions logged yet.</p>
                  <p className="text-xs text-slate-400 mt-0.5">Your breathing exercises will appear here once saved.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {history.map((hItem) => (
                    <div key={hItem.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{hItem.session_type}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          {new Date(hItem.created_at).toLocaleDateString()} at {new Date(hItem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-lg">
                          {Math.round(hItem.duration_seconds / 60)} min
                        </span>
                        <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-100/50 px-2.5 py-1 rounded-lg">
                          <FaRegSmile className="text-[#0067A1] w-3.5 h-3.5" />
                          <span className="text-xs font-bold text-[#004F7C]">{hItem.calm_score}/10</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ACTIVE EXERCISE SCREEN */}
        {stage === "active" && (
          <div className="bg-slate-900 rounded-3xl p-5 sm:p-10 text-white shadow-2xl relative overflow-hidden min-h-[50vh] max-w-md mx-auto flex flex-col justify-between items-center text-center animate-in fade-in duration-300">
            {/* Animated expanding breathing ring */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.06)_0%,transparent_70%)] pointer-events-none" />

            {/* Total Time & Progress Info */}
            <div className="w-full flex flex-col sm:flex-row gap-3 items-center justify-between z-10">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <FaClock className="w-3.5 h-3.5 text-[#0080C6]" />
                <span>TIME REMAINING: {formatDuration(totalSecondsLeft)}</span>
              </div>
              <div className="text-[11px] font-bold text-slate-400 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
                BREATHS: {breathsCompleted}
              </div>
            </div>

            {/* Immersive Breathing Circle Container */}
            <div className="relative my-8 flex flex-col items-center justify-center">
              {/* Pulsing Backglow Ring */}
              <motion.div
                className="absolute w-[180px] h-[180px] sm:w-[260px] sm:h-[260px] rounded-full"
                animate={{
                  scale: currentPhase.type === "Inhale" ? [1, 1.25] : currentPhase.type === "Exhale" ? [1.25, 1] : 1.25,
                  backgroundColor: currentPhase.type === "Inhale"
                    ? "rgba(20,184,166,0.15)"
                    : currentPhase.type === "Exhale"
                      ? "rgba(13,107,100,0.1)"
                      : "rgba(99,102,241,0.12)"
                }}
                transition={{ duration: currentPhase.duration, ease: "easeInOut" }}
              />

              {/* Main Breathing Glass Circle */}
              <motion.div
                className="relative w-[140px] h-[140px] sm:w-[200px] sm:h-[200px] rounded-full bg-gradient-to-br from-teal-400/20 to-emerald-500/10 border border-white/20 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center z-10"
                animate={{
                  scale: currentPhase.type === "Inhale" ? [1, 1.22] : currentPhase.type === "Exhale" ? [1.22, 1] : 1.22,
                }}
                transition={{ duration: currentPhase.duration, ease: "easeInOut" }}
              >
                {/* Visual indicator of duration remaining */}
                <span className="text-3xl sm:text-4xl font-black font-mono select-none tracking-tight">
                  {phaseTimeLeft}s
                </span>
              </motion.div>
            </div>

            {/* Active Instruction */}
            <div className="z-10 space-y-2">
              <motion.h3
                key={currentPhase.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-2xl sm:text-3xl font-black tracking-wide bg-gradient-to-r from-teal-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent uppercase select-none"
              >
                {currentPhase.type === "Hold" ? "Hold Breath" : currentPhase.type}
              </motion.h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-[280px] sm:max-w-xs select-none leading-relaxed">
                {currentPhase.type === "Inhale" && "Inhale deeply through your nose."}
                {currentPhase.type === "Hold" && "Hold your lungs steady and relax."}
                {currentPhase.type === "Exhale" && "Exhale slowly through your mouth."}
              </p>
            </div>

            {/* Cancel Button */}
            <div className="w-full mt-6 z-10">
              <button
                onClick={cancelSession}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white rounded-2xl border border-white/10 text-xs font-bold tracking-wider uppercase transition-all"
              >
                Cancel Session
              </button>
            </div>
          </div>
        )}

        {/* FEEDBACK ASSESSMENT SCREEN */}
        {stage === "feedback" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-8 sm:p-12 shadow-sm text-center max-w-2xl mx-auto animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-6 mx-auto">
              <FaRegSmile className="text-[#0067A1] w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-800">Excellent Work!</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              You completed the <span className="font-bold text-[#0067A1]">{selectedType.name}</span> session. Let&apos;s record how calm you feel right now.
            </p>

            {/* Custom Calm Score Slider */}
            <div className="my-10 space-y-6 bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-100">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>STILL ANXIOUS</span>
                <span className="text-[#0067A1] text-lg font-black">{calmScore} / 10</span>
                <span>COMPLETELY CALM</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={calmScore}
                onChange={(e) => setCalmScore(parseInt(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0067A1]"
              />
              <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
                <span>7</span>
                <span>8</span>
                <span>9</span>
                <span>10</span>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setStage("setup")}
                className="flex-1 py-4 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-sm rounded-2xl transition-colors"
              >
                Discard
              </button>
              <button
                onClick={submitSession}
                disabled={submitting}
                className="flex-[2] py-4 bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white font-black text-sm rounded-2xl shadow-lg shadow-[#0067A1]/20 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Save Session"}
              </button>
            </div>
          </div>
        )}

        {/* COMPLETION & BADGE UNLOCK SCREEN */}
        {stage === "complete" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-8 sm:p-12 shadow-sm text-center max-w-xl mx-auto animate-in fade-in duration-300 space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200 mx-auto">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-800">Session Recorded!</h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                Your calming session has been successfully written to your clinical health profile. Take a moment to enjoy the tranquility.
              </p>
            </div>

            {/* Awarded Badges Display */}
            {newBadges.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl space-y-4 animate-in zoom-in-95 delay-100">
                <div className="flex items-center justify-center gap-2 text-amber-800">
                  <FaTrophy className="text-amber-500 text-lg" />
                  <span className="text-sm font-black uppercase tracking-wider">New Badge Awarded!</span>
                </div>
                {newBadges.map((badge, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center text-center">
                    <h3 className="text-base font-black text-amber-900">{badge.badge_name}</h3>
                    <p className="text-xs text-amber-700 mt-0.5">{badge.description}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setStage("setup");
                fetchStatsAndHistory();
              }}
              className="w-full py-4 bg-[#0067A1] hover:bg-[#004F7C] text-white font-black text-sm rounded-2xl shadow-lg transition-colors"
            >
              Done & Return
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
