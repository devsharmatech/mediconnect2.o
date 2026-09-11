"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, Footprints, AlertTriangle, CheckCircle2, ChevronRight, RotateCcw, Timer, Award } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WalkingTestModal({ isOpen, onClose, onTestSaved }) {
  const [step, setStep] = useState(1); // 1: Intro (B04-S01), 2: Prep (B04-S02), 3: Active (B04-S03), 4: Complete & Borg (B04-S04)
  const TOTAL_TEST_SECONDS = 360; // 6 minutes
  const [secondsRemaining, setSecondsRemaining] = useState(TOTAL_TEST_SECONDS);
  const [isActive, setIsActive] = useState(false);
  const [lapsCompleted, setLapsCompleted] = useState(0);
  const LAP_METERS = 30; // 30m standard hallway lap
  const [borgRating, setBorgRating] = useState(3); // 0-10 Borg CR10 scale

  // Countdown loop
  useEffect(() => {
    let interval = null;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            setIsActive(false);
            setStep(4);
            toast.success("6-Minute Walk Test completed!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, secondsRemaining]);

  if (!isOpen) return null;

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalDistanceMeters = lapsCompleted * LAP_METERS;

  const handleStartTest = () => {
    setSecondsRemaining(TOTAL_TEST_SECONDS);
    setLapsCompleted(0);
    setIsActive(true);
    setStep(3);
  };

  const handleLapClick = () => {
    setLapsCompleted(prev => prev + 1);
  };

  const handleEarlyFinish = () => {
    if (confirm("Are you sure you want to conclude the 6-minute test now?")) {
      setIsActive(false);
      setStep(4);
    }
  };

  const handleSaveResult = () => {
    const elapsedSecs = TOTAL_TEST_SECONDS - secondsRemaining;
    const testRecord = {
      id: `6mwt-${Date.now()}`,
      type: 'walking_test',
      title: '6-Minute Walking Test (6MWT)',
      durationSeconds: elapsedSecs,
      distanceMeters: totalDistanceMeters,
      laps: lapsCompleted,
      borgRating: borgRating,
      completedAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('lung_activity_history') || '[]');
      existing.unshift(testRecord);
      localStorage.setItem('lung_activity_history', JSON.stringify(existing));
    } catch (e) {
      console.warn("Could not save 6MWT record:", e);
    }

    toast.success("6-Minute Walking Test recorded!");
    if (onTestSaved) onTestSaved(testRecord);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setStep(1);
    setSecondsRemaining(TOTAL_TEST_SECONDS);
    setIsActive(false);
    setLapsCompleted(0);
    setBorgRating(3);
  };

  const borgDescriptions = [
    { score: 0, label: "Nothing at all", desc: "No breathlessness, effortless" },
    { score: 1, label: "Very light", desc: "Hardly noticeable" },
    { score: 2, label: "Light", desc: "Noticeable, fully comfortable" },
    { score: 3, label: "Moderate", desc: "Breathing faster, able to speak easily" },
    { score: 4, label: "Somewhat severe", desc: "Breathing deeply" },
    { score: 5, label: "Severe", desc: "Heavy breathing, talking requires pause" },
    { score: 7, label: "Very severe", desc: "Gasping, difficulty continuing" },
    { score: 10, label: "Maximal effort", desc: "Cannot breathe or take another step" },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Footprints className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  6-Minute Walking Test <span className="text-xs font-normal text-slate-500">(B04)</span>
                </h3>
                <p className="text-xs text-slate-500">Standardized functional respiratory endurance evaluation</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (isActive) {
                  if (confirm("Test in progress. Do you want to cancel?")) {
                    handleReset();
                    onClose();
                  }
                } else {
                  handleReset();
                  onClose();
                }
              }}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Step 1: Introduction (B04-S01) */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl">
                  <h4 className="text-sm font-bold text-blue-950 dark:text-blue-200 mb-1">
                    What is the 6-Minute Walk Test?
                  </h4>
                  <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                    The 6MWT is a widely recognized, non-diagnostic functional walking assessment that measures how far you can comfortably walk in 6 minutes. It evaluates aerobic capacity and functional mobility over time.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Key Information:</h5>
                  <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
                    <span><strong>Self-Paced:</strong> Walk as briskly as you can safely manage, but do not jog or run.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
                    <span><strong>Rest When Needed:</strong> You may pause or rest against a wall if you experience fatigue. The timer continues.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span><strong>Safety Notice:</strong> Stop immediately if you feel chest pain, severe breathlessness, dizziness, or leg cramps.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 bg-[#0067A1] hover:bg-[#005584] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  Continue to Preparation <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Instructions & Preparation (B04-S02) */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Setup Checklist before starting:
                  </h4>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2 text-slate-700 dark:text-slate-300">
                    <p className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold flex items-center justify-center text-[11px]">1</span>
                      Choose a flat indoor corridor, hallway, or clear path (~30 meters).
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold flex items-center justify-center text-[11px]">2</span>
                      Wear comfortable, flat walking shoes.
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold flex items-center justify-center text-[11px]">3</span>
                      Each time you turn or complete a 30m lap, tap the <strong>"+1 Lap (30m)"</strong> button on screen.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStartTest}
                    className="flex-2 py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" /> Start 6-Minute Test
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Active Test (B04-S03) */}
            {step === 3 && (
              <div className="text-center py-3 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  6-Minute Test in progress
                </div>

                <div className="text-6xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                  {formatCountdown(secondsRemaining)}
                </div>

                {/* Live Distance & Laps Counter */}
                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Laps Logged</span>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{lapsCompleted}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Distance</span>
                    <p className="text-2xl font-black text-[#0067A1] mt-0.5">{totalDistanceMeters} <span className="text-xs font-normal text-slate-400">m</span></p>
                  </div>
                </div>

                {/* Big Lap Tap Button */}
                <button
                  type="button"
                  onClick={handleLapClick}
                  className="w-full py-4 bg-[#0067A1]/10 hover:bg-[#0067A1]/20 border-2 border-[#0067A1] text-[#0067A1] dark:text-cyan-300 font-extrabold text-sm rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Footprints className="w-5 h-5" /> Tap each time you finish 1 lap (+30m)
                </button>

                {/* Secondary Actions */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isActive ? "Pause Timer" : "Resume"}
                  </button>
                  <button
                    type="button"
                    onClick={handleEarlyFinish}
                    className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                  >
                    <Square className="w-3.5 h-3.5" /> Conclude Test
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Completion & Borg Exertion Rating (B04-S04) */}
            {step === 4 && (
              <div className="space-y-5 py-1">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                    <Award className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">6MWT Completed!</h4>
                  <p className="text-xs text-slate-500">Record your perceived level of breathlessness</p>
                </div>

                {/* Results Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Distance Walked</span>
                    <p className="text-2xl font-black text-[#0067A1]">{totalDistanceMeters} meters</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Completed Laps</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{lapsCompleted} laps (30m each)</p>
                  </div>
                </div>

                {/* Borg Rating Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    How was your breathing at the end of the test? (Borg Scale)
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {borgDescriptions.map(b => (
                      <button
                        key={b.score}
                        type="button"
                        onClick={() => setBorgRating(b.score)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          borgRating === b.score
                            ? 'border-[#0067A1] bg-[#0067A1]/10 text-[#0067A1] dark:text-cyan-400 font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold flex items-center justify-center">
                            {b.score}
                          </span>
                          <div>
                            <p className="text-xs font-semibold">{b.label}</p>
                            <p className="text-[10px] text-slate-400">{b.desc}</p>
                          </div>
                        </div>
                        {borgRating === b.score && <CheckCircle2 className="w-4 h-4 text-[#0067A1]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveResult}
                    className="flex-1 py-3 bg-[#0067A1] hover:bg-[#005584] text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Save 6MWT Result
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
