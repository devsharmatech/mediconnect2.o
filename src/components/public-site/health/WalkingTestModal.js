"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, Footprints, AlertTriangle, CheckCircle2, ChevronRight, Award, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WalkingTestModal({ isOpen, onClose, onTestSaved }) {
  // Steps: 1: Introduction, 2: Instructions, 3: Active Test, 4: Results/Borg
  const [step, setStep] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(360); // 6 minutes = 360 seconds
  const [isActive, setIsActive] = useState(false);
  const [lapsCompleted, setLapsCompleted] = useState(0); // each lap = 30 meters
  const [borgRating, setBorgRating] = useState(3);

  const TOTAL_TEST_SECONDS = 360;
  const METERS_PER_LAP = 30;

  // Countdown timer
  useEffect(() => {
    let timer = null;
    if (isActive && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsActive(false);
            setStep(4);
            toast.success("6-Minute Walking Test completed!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isActive, secondsRemaining]);

  if (!isOpen) return null;

  const totalDistanceMeters = lapsCompleted * METERS_PER_LAP;

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTest = () => {
    setSecondsRemaining(TOTAL_TEST_SECONDS);
    setLapsCompleted(0);
    setIsActive(true);
    setStep(3);
    toast.success("Standardized 6-minute walking test started! Walk at a brisk, comfortable pace.");
  };

  const handleLapClick = () => {
    setLapsCompleted(prev => prev + 1);
    toast.success(`Lap ${lapsCompleted + 1} logged (+30m)`, { duration: 1200 });
  };

  const handleEarlyFinish = () => {
    if (confirm("Are you sure you want to stop the test early? Your distance logged so far will be recorded.")) {
      setIsActive(false);
      setStep(4);
    }
  };

  const handleSaveResult = () => {
    const testRecord = {
      id: `6mwt-${Date.now()}`,
      type: '6mwt',
      title: '6-Minute Walking Test',
      totalDistanceMeters,
      lapsCompleted,
      durationSeconds: TOTAL_TEST_SECONDS - secondsRemaining,
      borgRating,
      completedAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('lung_walking_history') || '[]');
      existing.unshift(testRecord);
      localStorage.setItem('lung_walking_history', JSON.stringify(existing));

      // Also append to general activities
      const acts = JSON.parse(localStorage.getItem('lung_activity_history') || '[]');
      acts.unshift({
        id: testRecord.id,
        type: 'walk',
        title: `6MWT (${totalDistanceMeters}m)`,
        durationSeconds: testRecord.durationSeconds,
        distanceKm: (totalDistanceMeters / 1000).toFixed(2),
        calories: Math.round((testRecord.durationSeconds / 60) * 5),
        steps: Math.round(totalDistanceMeters * 1.35),
        completedAt: testRecord.completedAt,
      });
      localStorage.setItem('lung_activity_history', JSON.stringify(acts));
    } catch (e) {
      console.warn("Could not save walking test to localStorage:", e);
    }

    toast.success("Walking test result saved to your clinical record!");
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="bg-white rounded-[5px] shadow-2xl border-2 border-slate-300 max-w-lg w-full overflow-hidden font-sans text-black"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b-2 border-slate-200 flex items-center justify-between bg-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[5px] bg-[#0067A1] text-white flex items-center justify-center font-bold shadow-xs">
                <Footprints className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-950">
                    6-Minute Walking Test (6MWT)
                  </h3>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-[5px] bg-[#003358] text-white">
                    B04
                  </span>
                </div>
                <p className="text-xs text-slate-800 font-semibold mt-0.5">Standardized functional respiratory endurance evaluation</p>
              </div>
            </div>
            <button
              type="button"
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
              className="text-slate-700 hover:text-black p-1.5 rounded-[5px] hover:bg-slate-200 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 bg-white">
            {/* Step 1: Introduction (B04-S01) */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="p-4 bg-sky-50 border-2 border-sky-200 rounded-[5px]">
                  <span className="text-xs font-black uppercase tracking-wider text-[#003358] block mb-1">
                    Clinical Standard: ATS / ERS Guidelines
                  </span>
                  <p className="text-xs text-slate-900 leading-relaxed font-medium">
                    The 6MWT measures the total distance walked over a continuous 6-minute period along a flat 30-meter indoor path. It provides a reliable baseline of functional aerobic capacity and endurance.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-black block">
                    Protocol Instructions:
                  </span>
                  <div className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-[5px] space-y-2.5 text-xs text-black">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
                      <span><strong className="text-slate-950 font-black">Self-Paced:</strong> Walk at your regular brisk pace. Do not jog or run.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
                      <span><strong className="text-slate-950 font-black">Standing Rests Allowed:</strong> If breathless, you may pause. The timer continues running.</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-rose-900 bg-rose-50 p-2 rounded-[5px] border border-rose-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <span><strong className="font-black">Stop Immediately:</strong> If you experience chest pain, extreme dizziness, or severe dyspnea.</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-black text-sm rounded-[5px] transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer mt-3"
                >
                  Proceed to Preparation Checklist <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Instructions & Preparation (B04-S02) */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-black mb-2.5">
                    Pre-Test Checklist:
                  </h4>
                  <div className="p-4 rounded-[5px] border-2 border-slate-200 bg-slate-50 text-xs space-y-3 text-slate-950">
                    <p className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-[4px] bg-[#003358] text-white font-black flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                      <span className="font-medium">Identify a flat hallway or corridor approximately <strong className="text-black font-black">30 meters</strong> in length.</span>
                    </p>
                    <p className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-[4px] bg-[#003358] text-white font-black flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                      <span className="font-medium">Ensure you are wearing comfortable walking shoes.</span>
                    </p>
                    <p className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-[4px] bg-[#003358] text-white font-black flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                      <span className="font-medium">Each time you complete one 30m lap, tap the <strong className="text-[#0067A1] font-black">&quot;Log Completed Lap (+30m)&quot;</strong> button on screen.</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 border-2 border-slate-400 hover:bg-slate-100 text-black font-black text-xs rounded-[5px] cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStartTest}
                    className="flex-2 py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-black text-xs rounded-[5px] transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" /> Start 6-Minute Timer
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Active Test (B04-S03) */}
            {step === 3 && (
              <div className="py-1 space-y-4">
                {/* Active Status Bar */}
                <div className="flex items-center justify-between p-3 bg-slate-100 border-2 border-slate-300 rounded-[5px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-wider text-black">
                      Standardized Test in Progress
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-[#003358] bg-white px-2 py-0.5 rounded-[5px] border border-slate-300">
                    Track: 30m Hallway
                  </span>
                </div>

                {/* Primary Digital Readout */}
                <div className="p-5 bg-slate-950 text-white rounded-[5px] text-center border-2 border-slate-800 shadow-md">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300 block mb-1">
                    Remaining Time
                  </span>
                  <div className="text-5xl font-black font-mono tracking-tight text-white my-1">
                    {formatCountdown(secondsRemaining)}
                  </div>
                  <span className="text-xs font-bold text-slate-300 block mt-1">
                    Elapsed: {formatCountdown(TOTAL_TEST_SECONDS - secondsRemaining)} / 06:00
                  </span>
                </div>

                {/* Live Distance & Laps Counter */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-50 p-3.5 rounded-[5px] border-2 border-slate-200 text-center">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">Laps Logged</span>
                    <p className="text-3xl font-black font-mono text-black mt-1">{lapsCompleted}</p>
                    <span className="text-xs font-bold text-slate-700 mt-0.5 block">× 30 meters per lap</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-[5px] border-2 border-slate-200 text-center">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">Total Distance</span>
                    <p className="text-3xl font-black font-mono text-[#0067A1] mt-1">
                      {totalDistanceMeters} <span className="text-sm font-black text-black font-sans">m</span>
                    </p>
                    <span className="text-xs font-bold text-slate-700 mt-0.5 block">Cumulative walked</span>
                  </div>
                </div>

                {/* Lap Recording Button */}
                <button
                  type="button"
                  onClick={handleLapClick}
                  className="w-full py-4 bg-[#0067A1] hover:bg-[#004F7C] active:bg-[#003358] text-white font-black text-sm rounded-[5px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Footprints className="w-5 h-5" /> Tap to Log 1 Completed Lap (+30m)
                </button>

                {/* Secondary Actions */}
                <div className="flex items-center justify-between gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className="flex-1 py-3 bg-white border-2 border-slate-400 hover:bg-slate-100 text-black font-black text-xs rounded-[5px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isActive ? "Pause Timer" : "Resume"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEarlyFinish}
                    className="flex-1 py-3 bg-[#003358] hover:bg-[#00223d] text-white font-black text-xs rounded-[5px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <Square className="w-4 h-4" />
                    <span>Conclude Test</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Completion & Borg Exertion Rating (B04-S04) */}
            {step === 4 && (
              <div className="space-y-4 py-1">
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-[5px] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[5px] bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950">
                      6-Minute Walking Test Completed
                    </h4>
                    <p className="text-xs text-emerald-900 font-medium mt-0.5">
                      Factual distance recorded. Please record your perceived exertion on the Borg CR10 scale below.
                    </p>
                  </div>
                </div>

                {/* Results Summary Grid */}
                <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-slate-50 rounded-[5px] border-2 border-slate-200">
                  <div>
                    <span className="text-xs uppercase font-black text-slate-900 block">Total Distance</span>
                    <p className="text-2xl font-black font-mono text-[#0067A1] mt-0.5">{totalDistanceMeters} meters</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase font-black text-slate-900 block">Laps Completed</span>
                    <p className="text-xl font-black font-mono text-black mt-0.5">{lapsCompleted} laps (30m)</p>
                  </div>
                </div>

                {/* Borg Rating Selection */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                    Post-Test Exertion (Borg CR10 Scale):
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {borgDescriptions.map(b => (
                      <button
                        key={b.score}
                        type="button"
                        onClick={() => setBorgRating(b.score)}
                        className={`w-full p-2.5 rounded-[5px] border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                          borgRating === b.score
                            ? 'border-[#0067A1] bg-[#0067A1] text-white shadow-xs'
                            : 'border-slate-300 hover:border-slate-400 text-black bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-[3px] text-xs font-mono font-black flex items-center justify-center ${
                            borgRating === b.score ? 'bg-white text-[#0067A1]' : 'bg-slate-200 text-black'
                          }`}>
                            {b.score}
                          </span>
                          <div>
                            <span className={`text-xs font-black ${borgRating === b.score ? 'text-white' : 'text-slate-950'}`}>
                              {b.label}
                            </span>
                            <span className={`text-xs ml-2 font-medium ${borgRating === b.score ? 'text-white/90' : 'text-slate-700'}`}>
                              ({b.desc})
                            </span>
                          </div>
                        </div>
                        {borgRating === b.score && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 py-3 border-2 border-slate-400 hover:bg-slate-100 text-black font-black text-xs rounded-[5px] cursor-pointer transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveResult}
                    className="flex-1 py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-black text-xs rounded-[5px] transition-all shadow-xs cursor-pointer"
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
