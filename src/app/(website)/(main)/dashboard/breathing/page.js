"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaWind,
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaClock,
  FaHeart,
  FaFire,
  FaRegSmile,
  FaRegCalendarAlt,
  FaCheck,
  FaLungs,
  FaBolt,
  FaSpa,
  FaMoon,
  FaBrain,
  FaShieldAlt,
  FaChevronLeft,
  FaChevronRight
} from "react-icons/fa";
import toast from "react-hot-toast";

// Audio Synth Helper: Generates pure sine chime sounds dynamically
const playChime = (frequency = 440, duration = 0.5, volume = 0.08) => {
  if (typeof window === "undefined" || (!window.AudioContext && !window.webkitAudioContext)) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.3, ctx.currentTime + duration);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Audio synth error:", e);
  }
};

const EXERCISE_CATEGORIES = [
  { id: "all", label: "All Exercises", icon: FaWind },
  { id: "calm", label: "Calm & Stress", icon: FaSpa },
  { id: "lung", label: "Pulmonary Health", icon: FaLungs },
  { id: "heart", label: "Heart Coherence", icon: FaHeart },
  { id: "sleep", label: "Sleep & Rest", icon: FaMoon },
  { id: "focus", label: "Focus & Pranayama", icon: FaBolt }
];

const EXERCISES = [
  // 1. Calm & Stress Relief
  {
    id: "box",
    name: "Box Breathing",
    category: "calm",
    categoryLabel: "Autonomic Balance",
    desc: "Equal 4-part cadence (4-4-4-4) to steady heart cadence and reset acute stress.",
    target: "Rapid stress relief and nervous equilibrium",
    difficulty: "Beginner",
    cycleDuration: 16,
    icon: FaSpa,
    color: "sky",
    pattern: [
      { type: "Inhale", label: "Inhale Deeply", duration: 4, instruction: "Inhale smoothly through your nose" },
      { type: "Hold", label: "Hold Full", duration: 4, instruction: "Hold lungs filled comfortably without tension" },
      { type: "Exhale", label: "Exhale Completely", duration: 4, instruction: "Exhale slowly through your mouth" },
      { type: "Hold", label: "Hold Empty", duration: 4, instruction: "Rest lungs empty before next breath" }
    ]
  },
  {
    id: "478",
    name: "4-7-8 Deep Relaxation",
    category: "calm",
    categoryLabel: "Parasympathetic Activation",
    desc: "Extended exhalation cadence designed to activate vagal tone and ease racing thoughts.",
    target: "Anxiety de-escalation, rapid relaxation",
    difficulty: "Intermediate",
    cycleDuration: 19,
    icon: FaSpa,
    color: "indigo",
    pattern: [
      { type: "Inhale", label: "Inhale Quietly", duration: 4, instruction: "Inhale gently through your nose (4s)" },
      { type: "Hold", label: "Hold Still", duration: 7, instruction: "Hold breath steady and soften shoulders (7s)" },
      { type: "Exhale", label: "Exhale Completely", duration: 8, instruction: "Release breath fully with a soft whoosh (8s)" }
    ]
  },
  {
    id: "extended_exhale",
    name: "Extended Exhale (4-2-6)",
    category: "calm",
    categoryLabel: "Vagal Stimulation",
    desc: "Gentle inhale with lengthened exhalation to stimulate the vagus nerve and slow heart rate.",
    target: "Pulse moderation and physical tension release",
    difficulty: "Beginner",
    cycleDuration: 12,
    icon: FaSpa,
    color: "teal",
    pattern: [
      { type: "Inhale", label: "Inhale Smoothly", duration: 4, instruction: "Inhale steady through your nose (4s)" },
      { type: "Hold", label: "Brief Pause", duration: 2, instruction: "Brief pause at the peak (2s)" },
      { type: "Exhale", label: "Lengthened Exhale", duration: 6, instruction: "Slow continuous exhalation to calm pulse (6s)" }
    ]
  },
  {
    id: "panic_reset",
    name: "7-11 De-escalation Breath",
    category: "calm",
    categoryLabel: "Acute Relief",
    desc: "Extended 11-second exhalation to counteract hyperventilation and acute panic sensations.",
    target: "Rapid calming during high stress moments",
    difficulty: "Intermediate",
    cycleDuration: 18,
    icon: FaShieldAlt,
    color: "emerald",
    pattern: [
      { type: "Inhale", label: "Deep Nasal Inhale", duration: 7, instruction: "Expand diaphragm steadily through nose (7s)" },
      { type: "Exhale", label: "Long Extended Exhale", duration: 11, instruction: "Slow, continuous release through mouth (11s)" }
    ]
  },

  // 2. Pulmonary Health (Lung Conditioning)
  {
    id: "pursed_lip",
    name: "Pursed-Lip Breathing",
    category: "lung",
    categoryLabel: "Airway Ventilation",
    desc: "Inhale through nose and exhale gently through pursed lips to keep airways open longer.",
    target: "Breathlessness control, oxygen exchange efficiency",
    difficulty: "Beginner",
    cycleDuration: 6,
    icon: FaLungs,
    color: "sky",
    pattern: [
      { type: "Inhale", label: "Inhale Through Nose", duration: 2, instruction: "Inhale normally through your nose (2s)" },
      { type: "Exhale", label: "Exhale Pursed Lips", duration: 4, instruction: "Exhale gently like cooling hot tea (4s)" }
    ]
  },
  {
    id: "diaphragmatic",
    name: "Diaphragmatic Belly Breathing",
    category: "lung",
    categoryLabel: "Diaphragm Strengthening",
    desc: "Deep belly breathing to engage diaphragm muscles and reduce shallow chest breathing.",
    target: "Lung expansion, respiratory muscle endurance",
    difficulty: "Beginner",
    cycleDuration: 12,
    icon: FaLungs,
    color: "emerald",
    pattern: [
      { type: "Inhale", label: "Belly Expands", duration: 4, instruction: "Inhale deep: feel your belly expand outward (4s)" },
      { type: "Hold", label: "Soft Hold", duration: 2, instruction: "Hold steady with relaxed shoulders (2s)" },
      { type: "Exhale", label: "Belly Contracts", duration: 6, instruction: "Exhale slowly: feel your belly draw inward (6s)" }
    ]
  },
  {
    id: "vital_expansion",
    name: "Thoracic Vital Expansion (5-3-5-2)",
    category: "lung",
    categoryLabel: "Thoracic Mobility",
    desc: "Complete lung volume exercise to maintain ribcage and chest wall flexibility.",
    target: "Vital capacity support, ribcage elasticity",
    difficulty: "Intermediate",
    cycleDuration: 15,
    icon: FaLungs,
    color: "teal",
    pattern: [
      { type: "Inhale", label: "Full Chest Expansion", duration: 5, instruction: "Expand lower, mid, and upper chest (5s)" },
      { type: "Hold", label: "Hold Full Volume", duration: 3, instruction: "Hold full volume with relaxed throat (3s)" },
      { type: "Exhale", label: "Controlled Exhale", duration: 5, instruction: "Even, controlled breath release (5s)" },
      { type: "Hold", label: "Resting Pause", duration: 2, instruction: "Short resting pause before next cycle (2s)" }
    ]
  },
  {
    id: "mucus_clearance",
    name: "Airway Secretion Clearance",
    category: "lung",
    categoryLabel: "Bronchial Hygiene",
    desc: "Controlled ventilation cadence used in pulmonary rehabilitation to loosen bronchial secretions.",
    target: "Airway clearing and breath efficiency",
    difficulty: "Intermediate",
    cycleDuration: 9,
    icon: FaLungs,
    color: "cyan",
    pattern: [
      { type: "Inhale", label: "Mid-Depth Inhale", duration: 3, instruction: "Inhale medium volume through nose (3s)" },
      { type: "Hold", label: "Hold Air Behind Palate", duration: 3, instruction: "Keep glottis open and relaxed (3s)" },
      { type: "Exhale", label: "Huff Breath Out", duration: 3, instruction: "Open-mouth huff-style breath out (3s)" }
    ]
  },

  // 3. Heart Coherence (Cardiovascular & HRV)
  {
    id: "coherent",
    name: "Resonant Coherence (5.5s / 5.5s)",
    category: "heart",
    categoryLabel: "HRV Synchronization",
    desc: "Optimal 5.5 breaths/min cadence for maximum Heart Rate Variability (HRV) resonance.",
    target: "Cardiovascular synchrony, autonomic balance",
    difficulty: "Intermediate",
    cycleDuration: 11,
    icon: FaHeart,
    color: "rose",
    pattern: [
      { type: "Inhale", label: "Rhythmic Inhale", duration: 5.5, instruction: "Smooth rhythmic inhalation with guide (5.5s)" },
      { type: "Exhale", label: "Rhythmic Exhale", duration: 5.5, instruction: "Smooth rhythmic exhalation with guide (5.5s)" }
    ]
  },
  {
    id: "equi_rhythm",
    name: "Equi-Cadence Balance (4-4)",
    category: "heart",
    categoryLabel: "Circulatory Cadence",
    desc: "Balanced 4-second cycles for steady blood flow and mental centeredness.",
    target: "Vascular relaxation, calm steady focus",
    difficulty: "Beginner",
    cycleDuration: 8,
    icon: FaHeart,
    color: "rose",
    pattern: [
      { type: "Inhale", label: "Steady Inhale", duration: 4, instruction: "Steady inhale through nose (4s)" },
      { type: "Exhale", label: "Steady Exhale", duration: 4, instruction: "Steady exhale through nose or mouth (4s)" }
    ]
  },
  {
    id: "vascular_ease",
    name: "Vascular Cadence (4-0-6)",
    category: "heart",
    categoryLabel: "Arterial Compliance",
    desc: "Gentle 4s inhalation with extended 6s exhalation to promote nitric oxide vascular dilation.",
    target: "Blood pressure support, vascular calming",
    difficulty: "Beginner",
    cycleDuration: 10,
    icon: FaHeart,
    color: "rose",
    pattern: [
      { type: "Inhale", label: "Nasal Inhalation", duration: 4, instruction: "Inhale smooth through nose (4s)" },
      { type: "Exhale", label: "Vascular Release", duration: 6, instruction: "Slow continuous exhalation to lower tension (6s)" }
    ]
  },

  // 4. Sleep & Rest
  {
    id: "yoga_nidra",
    name: "Yoga Nidra Breath (4-4-8-2)",
    category: "sleep",
    categoryLabel: "Circadian Transition",
    desc: "Deep sedative rhythm designed to slow brainwave activity and prepare for sleep.",
    target: "Insomnia relief, bedtime relaxation",
    difficulty: "Intermediate",
    cycleDuration: 18,
    icon: FaMoon,
    color: "indigo",
    pattern: [
      { type: "Inhale", label: "Silent Inhale", duration: 4, instruction: "Gentle silent nasal inhale (4s)" },
      { type: "Hold", label: "Stillness Hold", duration: 4, instruction: "Rest in full stillness at top (4s)" },
      { type: "Exhale", label: "Sedative Exhale", duration: 8, instruction: "Long effortless release (8s)" },
      { type: "Hold", label: "Rest Empty", duration: 2, instruction: "Total relaxation before next breath (2s)" }
    ]
  },
  {
    id: "melatonin_cadence",
    name: "Melatonin Induction (3-6-6)",
    category: "sleep",
    categoryLabel: "Nocturnal Reset",
    desc: "Slow holding and exhalation cadence for nervous deceleration before bed.",
    target: "Restless mind relief, sleep readiness",
    difficulty: "Intermediate",
    cycleDuration: 15,
    icon: FaMoon,
    color: "indigo",
    pattern: [
      { type: "Inhale", label: "Gentle Inhale", duration: 3, instruction: "Gentle inhale through nose (3s)" },
      { type: "Hold", label: "Relaxation Hold", duration: 6, instruction: "Hold comfortably with soft jaw (6s)" },
      { type: "Exhale", label: "Slow Exhale", duration: 6, instruction: "Slow continuous exhalation (6s)" }
    ]
  },

  // 5. Focus & Pranayama (True Alternate Nostril Full Cycle)
  {
    id: "nadi_shodhana",
    name: "Nadi Shodhana Cadence",
    category: "focus",
    categoryLabel: "Pranayama Balance",
    desc: "Alternate nostril breathing cadence for mental clarity, alertness, and hemisphere balance.",
    target: "Mental focus, cognitive balance",
    difficulty: "Advanced",
    cycleDuration: 28,
    icon: FaBrain,
    color: "amber",
    pattern: [
      { type: "Inhale", label: "Inhale Left Nostril", duration: 4, instruction: "Close right nostril with thumb, inhale left (4s)" },
      { type: "Hold", label: "Hold Both Closed", duration: 4, instruction: "Gently close both nostrils with fingers (4s)" },
      { type: "Exhale", label: "Exhale Right Nostril", duration: 4, instruction: "Release thumb, exhale slowly through right (4s)" },
      { type: "Hold", label: "Short Pause", duration: 2, instruction: "Brief pause before inhaling right (2s)" },
      { type: "Inhale", label: "Inhale Right Nostril", duration: 4, instruction: "Inhale slowly through right nostril (4s)" },
      { type: "Hold", label: "Hold Both Closed", duration: 4, instruction: "Gently close both nostrils (4s)" },
      { type: "Exhale", label: "Exhale Left Nostril", duration: 4, instruction: "Release ring finger, exhale slowly through left (4s)" },
      { type: "Hold", label: "Resting Pause", duration: 2, instruction: "Full cycle complete, prepare to switch (2s)" }
    ]
  },
  {
    id: "bhramari",
    name: "Bhramari Humming Breath",
    category: "focus",
    categoryLabel: "Nitric Oxide Activation",
    desc: "Inhale followed by gentle humming exhalation for sinus aeration and neurological calming.",
    target: "Sinus health, cranial tension release",
    difficulty: "Beginner",
    cycleDuration: 10,
    icon: FaBrain,
    color: "amber",
    pattern: [
      { type: "Inhale", label: "Deep Nasal Inhale", duration: 4, instruction: "Inhale deep through both nostrils (4s)" },
      { type: "Exhale", label: "Humming Exhale ('Mmm')", duration: 6, instruction: "Exhale slowly while humming gently like a bee (6s)" }
    ]
  },
  {
    id: "morning_vitality",
    name: "Morning Awakening Rhythm (3-1-3)",
    category: "focus",
    categoryLabel: "Alertness Activation",
    desc: "Crisp 3-second cadence for morning oxygenation and refreshing mental energy.",
    target: "Morning vitality, sluggishness relief",
    difficulty: "Beginner",
    cycleDuration: 7,
    icon: FaBolt,
    color: "amber",
    pattern: [
      { type: "Inhale", label: "Brisk Inhale", duration: 3, instruction: "Brisk full inhalation to energize (3s)" },
      { type: "Hold", label: "Top Pause", duration: 1, instruction: "Quick top pause (1s)" },
      { type: "Exhale", label: "Complete Exhale", duration: 3, instruction: "Complete exhalation (3s)" }
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
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
  const [selectedMinutes, setSelectedMinutes] = useState(2);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Active Session Tracking
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [totalSecondsLeft, setTotalSecondsLeft] = useState(0);
  const [breathsCompleted, setBreathsCompleted] = useState(0);

  // Feedback States
  const [calmScore, setCalmScore] = useState(8);
  const [submitting, setSubmitting] = useState(false);

  // Timers and Refs
  const intervalRef = useRef(null);
  const tabsRef = useRef(null);
  const totalSecondsInitial = selectedMinutes * 60;

  const scrollTabs = (direction) => {
    if (tabsRef.current) {
      const scrollAmount = direction === "left" ? -180 : 180;
      tabsRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

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
      toast.error("Please log in to record wellness exercises");
      router.push("/login");
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
    setIsPaused(false);
    setPhaseIndex(0);
    setBreathsCompleted(0);
    setCalmScore(8);

    const pattern = selectedExercise.pattern;
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
        clearInterval(intervalRef.current);
        setStage("feedback");
        playChime(880, 1.2, 0.1);
        return;
      }

      if (secondsInCurrentPhase <= 0) {
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

  const togglePause = () => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      const pattern = selectedExercise.pattern;
      let activePhaseIdx = phaseIndex;
      let secondsInCurrentPhase = phaseTimeLeft;
      let totalSecsLeft = totalSecondsLeft;
      let countBreaths = breathsCompleted;

      intervalRef.current = setInterval(() => {
        totalSecsLeft -= 1;
        secondsInCurrentPhase -= 1;
        setTotalSecondsLeft(totalSecsLeft);

        if (totalSecsLeft <= 0) {
          clearInterval(intervalRef.current);
          setStage("feedback");
          playChime(880, 1.2, 0.1);
          return;
        }

        if (secondsInCurrentPhase <= 0) {
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
    } else {
      // Pause
      setIsPaused(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
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
          session_type: selectedExercise.name,
          duration_seconds: totalSecondsInitial,
          breaths_count: breathsCompleted > 0 ? breathsCompleted : Math.max(1, Math.round(totalSecondsInitial / selectedExercise.cycleDuration)),
          calm_score: calmScore
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Exercise session recorded in profile!");
        await fetchStatsAndHistory();
        setStage("complete");
      } else {
        toast.error(data.message || "Failed to save session");
      }
    } catch (err) {
      console.error(err);
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

  const filteredExercises = activeCategory === "all"
    ? EXERCISES
    : EXERCISES.filter(ex => ex.category === activeCategory);

  const currentPhase = selectedExercise.pattern[phaseIndex] || selectedExercise.pattern[0];

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 py-4 sm:py-6 px-3 sm:px-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">

        {/* Top Header (Shown during Setup, Feedback, and Completion) */}
        {stage !== "active" && (
          <header className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors shrink-0 mt-0.5"
                title="Back to Dashboard"
              >
                <FaArrowLeft className="w-3.5 h-3.5" />
              </button>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                  Guided Respiratory & Wellness Exercises
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Evidence-based breathing patterns for pulmonary conditioning, cardiac coherence, sleep, and stress reduction.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
                title={soundEnabled ? "Mute audio cues" : "Enable audio cues"}
              >
                {soundEnabled ? <FaVolumeUp className="w-3.5 h-3.5 text-[#0067A1]" /> : <FaVolumeMute className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-50 text-[#0067A1] border border-sky-200">
                <FaWind className="w-3 h-3" /> MediCalm Suite
              </span>
            </div>
          </header>
        )}

        {/* Minimal Nav Header during Active Exercise */}
        {stage === "active" && (
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={cancelSession}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <FaArrowLeft className="w-3 h-3" /> Back to Menu
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title={soundEnabled ? "Mute audio cues" : "Enable audio cues"}
              >
                {soundEnabled ? <FaVolumeUp className="w-3.5 h-3.5 text-[#0067A1]" /> : <FaVolumeMute className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-50 text-[#0067A1] border border-sky-200">
                <FaWind className="w-3 h-3" /> Active Session
              </span>
            </div>
          </div>
        )}

        {/* SETUP STAGE */}
        {stage === "setup" && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-400">Total Sessions</p>
                  <p className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">{stats.total_sessions}</p>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center">
                  <FaWind className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-400">Practiced Time</p>
                  <p className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">{stats.total_duration_minutes} min</p>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FaClock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-400">Avg Calm Score</p>
                  <p className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">{stats.average_calm_score || 8}/10</p>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                  <FaHeart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-400">Active Streak</p>
                  <p className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">{stats.current_streak} days</p>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                  <FaFire className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
            </div>

            {/* Exercise Selector */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
              
              {/* Category Selector Bar (Dedicated Row, Fully Responsive & Scrollable) */}
              <div className="space-y-3 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Select Breathing Technique</h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Choose an evidence-based exercise for your clinical or wellness goal.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#0067A1] bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200 shrink-0">
                    {filteredExercises.length} Techniques
                  </span>
                </div>

                {/* Category Pills (Smooth Scrollable with Navigation Arrows) */}
                <div className="relative flex items-center w-full gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => scrollTabs("left")}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-200/80 shrink-0 cursor-pointer"
                    title="Scroll left"
                    aria-label="Scroll categories left"
                  >
                    <FaChevronLeft className="w-3 h-3" />
                  </button>

                  <div
                    ref={tabsRef}
                    className="flex items-center gap-1.5 overflow-x-auto scroll-smooth py-1 w-full no-scrollbar"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {EXERCISE_CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const isActive = activeCategory === cat.id;
                      const count = cat.id === "all" ? EXERCISES.length : EXERCISES.filter(e => e.category === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveCategory(cat.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#0067A1] text-white shadow-2xs"
                              : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/60"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-500"}`} />
                          <span>{cat.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollTabs("right")}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-200/80 shrink-0 cursor-pointer"
                    title="Scroll right"
                    aria-label="Scroll categories right"
                  >
                    <FaChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Grid of Exercises */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {filteredExercises.map(ex => {
                  const isSelected = selectedExercise.id === ex.id;
                  const Icon = ex.icon || FaWind;
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setSelectedExercise(ex)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-lg border transition-all flex flex-col justify-between gap-3 relative cursor-pointer ${
                        isSelected
                          ? "border-[#0067A1] bg-[#0067A1]/5 ring-1 ring-[#0067A1]/40 shadow-2xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                              isSelected ? "bg-[#0067A1] text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <h3 className={`text-xs sm:text-sm font-bold ${isSelected ? "text-[#0067A1]" : "text-slate-900"}`}>
                              {ex.name}
                            </h3>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            {ex.difficulty}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">{ex.desc}</p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                          <span className="text-slate-400 font-medium">
                            Cycle: <strong className="text-slate-700">{ex.cycleDuration}s</strong>
                          </span>
                          <span className="text-[#0067A1] font-semibold truncate ml-2">{ex.categoryLabel}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                          {ex.pattern.map((p, idx) => (
                            <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                              {p.label || p.type}: {p.duration}s
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Duration & Launch Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-slate-700">Duration:</span>
                  <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 overflow-x-auto no-scrollbar">
                    {[1, 2, 3, 5, 10].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMinutes(m)}
                        className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                          selectedMinutes === m
                            ? "bg-white text-[#0067A1] shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startSession}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#0067A1] hover:bg-[#005584] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaPlay className="w-3 h-3" />
                  Begin {selectedExercise.name} ({selectedMinutes}m)
                </button>
              </div>

            </div>

            {/* Session History Log Table */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FaRegCalendarAlt className="text-slate-400 w-3.5 h-3.5" />
                Completed Exercise History
              </h3>

              {history.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No completed exercise sessions recorded yet. Completed exercises will be stored here.
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {history.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 block">{item.session_type}</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400">
                          {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className="text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px] font-medium">
                          {Math.round(item.duration_seconds / 60)} min ({item.breaths_count || 0} breaths)
                        </span>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-semibold">
                          Calm: {item.calm_score}/10
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ACTIVE EXERCISE STAGE (Compact, Fits 100% in viewport without scrolling) */}
        {stage === "active" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-xl max-w-sm sm:max-w-md w-full mx-auto flex flex-col items-center justify-between text-center border border-slate-800 relative overflow-hidden space-y-3"
          >
            {/* Soft Ambient Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,103,161,0.1)_0%,transparent_70%)] pointer-events-none" />

            {/* Top Info Bar */}
            <div className="w-full flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2 z-10">
              <span className="font-semibold text-slate-200 truncate max-w-[140px] sm:max-w-[200px] text-left">
                {selectedExercise.name}
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                  {formatDuration(totalSecondsLeft)}
                </span>
                <span className="bg-sky-950/80 text-sky-300 px-2 py-0.5 rounded border border-sky-800/60">
                  {breathsCompleted} cycles
                </span>
              </div>
            </div>

            {/* Immersive Breathing Visualizer */}
            <div className="relative my-1 flex items-center justify-center w-36 h-36 sm:w-40 sm:h-40 z-10">
              {/* Layer 1: Outermost Ambient Glow Aura */}
              <motion.div
                key={`aura-${currentPhase.type}`}
                className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full blur-md pointer-events-none"
                initial={{ scale: currentPhase.type === "Inhale" ? 0.9 : currentPhase.type === "Exhale" ? 1.25 : 1.25, opacity: 0.2 }}
                animate={{
                  scale: currentPhase.type === "Inhale" ? 1.25 : currentPhase.type === "Exhale" ? 0.9 : 1.25,
                  opacity: currentPhase.type === "Hold" ? 0.35 : 0.22,
                  backgroundColor: currentPhase.type === "Inhale"
                    ? "rgba(14, 165, 233, 0.35)"
                    : currentPhase.type === "Exhale"
                    ? "rgba(16, 185, 129, 0.35)"
                    : "rgba(99, 102, 241, 0.35)"
                }}
                transition={{ duration: currentPhase.duration, ease: "easeInOut" }}
              />

              {/* Layer 2: Middle Soft Ripple Ring */}
              <motion.div
                key={`ring-${currentPhase.type}`}
                className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-white/10"
                initial={{ scale: currentPhase.type === "Inhale" ? 0.95 : currentPhase.type === "Exhale" ? 1.18 : 1.18 }}
                animate={{
                  scale: currentPhase.type === "Inhale" ? 1.18 : currentPhase.type === "Exhale" ? 0.95 : 1.18,
                  borderColor: currentPhase.type === "Inhale"
                    ? "rgba(14, 165, 233, 0.4)"
                    : currentPhase.type === "Exhale"
                    ? "rgba(16, 185, 129, 0.4)"
                    : "rgba(165, 180, 252, 0.4)"
                }}
                transition={{ duration: currentPhase.duration, ease: "easeInOut" }}
              />

              {/* Layer 3: Main Breathing Core Orb */}
              <motion.div
                key={`orb-${currentPhase.type}`}
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-slate-850 via-slate-800 to-slate-900 border border-white/20 shadow-xl flex flex-col items-center justify-center backdrop-blur-md"
                initial={{ scale: currentPhase.type === "Inhale" ? 0.95 : currentPhase.type === "Exhale" ? 1.15 : 1.15 }}
                animate={{
                  scale: currentPhase.type === "Inhale" ? 1.15 : currentPhase.type === "Exhale" ? 0.95 : 1.15,
                  boxShadow: currentPhase.type === "Inhale"
                    ? "0 0 25px rgba(14, 165, 233, 0.3)"
                    : currentPhase.type === "Exhale"
                    ? "0 0 25px rgba(16, 185, 129, 0.3)"
                    : "0 0 25px rgba(99, 102, 241, 0.3)"
                }}
                transition={{ duration: currentPhase.duration, ease: "easeInOut" }}
              >
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-xs">
                  {Math.ceil(phaseTimeLeft)}s
                </span>
              </motion.div>
            </div>

            {/* Instruction Guidance (Distinct, Non-repetitive Phase Label and Description) */}
            <div className="space-y-1 z-10">
              <motion.div
                key={currentPhase.label || currentPhase.type}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider ${
                  currentPhase.type === "Inhale"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                    : currentPhase.type === "Exhale"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-400/30"
                }`}>
                  {currentPhase.label || (currentPhase.type === "Hold" ? "Hold Gently" : currentPhase.type)}
                </span>
              </motion.div>
              <motion.p
                key={currentPhase.instruction}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="text-[11px] sm:text-xs text-slate-300 max-w-xs leading-snug px-2 pt-0.5"
              >
                {currentPhase.instruction}
              </motion.p>
            </div>

            {/* Session Controls */}
            <div className="flex items-center gap-2.5 w-full justify-center pt-2 border-t border-slate-800/80 z-10">
              <button
                type="button"
                onClick={togglePause}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-700/60 cursor-pointer"
              >
                {isPaused ? <><FaPlay className="w-2.5 h-2.5" /> Resume</> : <><FaPause className="w-2.5 h-2.5" /> Pause</>}
              </button>
              <button
                type="button"
                onClick={cancelSession}
                className="px-3.5 py-1.5 bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 rounded-lg text-xs font-semibold transition-all border border-slate-700/60 cursor-pointer"
              >
                End Session
              </button>
            </div>

          </motion.div>
        )}

        {/* FEEDBACK STAGE */}
        {stage === "feedback" && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs max-w-sm sm:max-w-md mx-auto text-center space-y-4 sm:space-y-5 animate-in fade-in duration-200">
            <div className="w-10 h-10 bg-sky-50 text-[#0067A1] rounded-lg flex items-center justify-center mx-auto">
              <FaRegSmile className="w-5 h-5" />
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Exercise Completed</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                You completed {selectedMinutes} minutes of <strong>{selectedExercise.name}</strong> ({breathsCompleted} breath cycles).
              </p>
            </div>

            {/* Calm Level Rating */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                <span>Self-Reported Calm Level</span>
                <span className="text-[#0067A1] text-xs font-bold">{calmScore} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={calmScore}
                onChange={(e) => setCalmScore(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0067A1]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>1 - Tense</span>
                <span>5 - Moderate</span>
                <span>10 - Very Calm</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStage("setup")}
                className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={submitSession}
                disabled={submitting}
                className="flex-[2] py-2 bg-[#0067A1] hover:bg-[#005584] text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submitting ? "Saving..." : "Save to Health Profile"}
              </button>
            </div>
          </div>
        )}

        {/* COMPLETION STAGE */}
        {stage === "complete" && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs max-w-sm mx-auto text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mx-auto">
              <FaCheck className="w-4 h-4" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">Session Recorded!</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your exercise session has been stored in your patient wellness profile.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setStage("setup");
                fetchStatsAndHistory();
              }}
              className="w-full py-2 bg-[#0067A1] hover:bg-[#005584] text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Return to Exercise Menu
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
