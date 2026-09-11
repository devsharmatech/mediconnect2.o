"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, Flame, Timer, Footprints, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LungMoveModal({ isOpen, onClose, onSessionSaved }) {
  const [activityType, setActivityType] = useState('walk'); // 'walk' | 'jog' | 'run'
  const [targetDuration, setTargetDuration] = useState(20); // minutes
  const [sessionState, setSessionState] = useState('setup'); // 'setup' | 'active' | 'paused' | 'completed'
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Timer loop
  useEffect(() => {
    let interval = null;
    if (sessionState === 'active') {
      interval = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionState]);

  if (!isOpen) return null;

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Pace & distance estimations
  const speedKmH = activityType === 'run' ? 9.5 : activityType === 'jog' ? 7.0 : 4.5;
  const distanceKm = ((secondsElapsed / 3600) * speedKmH).toFixed(2);
  const caloriesBurned = Math.round((secondsElapsed / 60) * (activityType === 'run' ? 11 : activityType === 'jog' ? 8 : 4.5));
  const estimatedSteps = Math.round(distanceKm * 1350);

  const handleStart = () => {
    setSecondsElapsed(0);
    setSessionState('active');
    toast.success(`${activityType === 'walk' ? 'Walking' : activityType === 'jog' ? 'Jogging' : 'Running'} session started!`);
  };

  const handlePause = () => {
    setSessionState('paused');
  };

  const handleResume = () => {
    setSessionState('active');
  };

  const handleFinish = () => {
    setSessionState('completed');
  };

  const handleSave = () => {
    const sessionRecord = {
      id: `act-${Date.now()}`,
      type: activityType,
      title: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} Session`,
      durationSeconds: secondsElapsed,
      distanceKm: parseFloat(distanceKm),
      calories: caloriesBurned,
      steps: estimatedSteps,
      completedAt: new Date().toISOString(),
    };

    // Save to localStorage activity log
    try {
      const existing = JSON.parse(localStorage.getItem('lung_activity_history') || '[]');
      existing.unshift(sessionRecord);
      localStorage.setItem('lung_activity_history', JSON.stringify(existing));
    } catch (e) {
      console.warn("Could not persist activity to storage:", e);
    }

    toast.success("Move activity recorded successfully!");
    if (onSessionSaved) onSessionSaved(sessionRecord);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSessionState('setup');
    setSecondsElapsed(0);
  };

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
              <div className="w-10 h-10 rounded-xl bg-[#0067A1]/10 text-[#0067A1] dark:text-cyan-400 flex items-center justify-center font-bold">
                <Footprints className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Move Session <span className="text-xs font-normal text-slate-500">(B03)</span>
                </h3>
                <p className="text-xs text-slate-500">Paced aerobic respiratory movement</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (sessionState === 'active') {
                  if (confirm("Session in progress. Do you want to cancel?")) {
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
            {sessionState === 'setup' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Select Activity
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'walk', label: 'Walk', desc: '4.5 km/h' },
                      { id: 'jog', label: 'Jog', desc: '7.0 km/h' },
                      { id: 'run', label: 'Run', desc: '9.5 km/h' },
                    ].map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setActivityType(act.id)}
                        className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          activityType === act.id
                            ? 'border-[#0067A1] bg-[#0067A1]/10 text-[#0067A1] dark:text-cyan-400 font-bold shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <p className="text-sm font-semibold">{act.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{act.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Target Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 20, 30, 45].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setTargetDuration(mins)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          targetDuration === mins
                            ? 'border-[#0067A1] bg-[#0067A1]/10 text-[#0067A1] dark:text-cyan-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Wellness Tip:</p>
                  <p>Gentle rhythmic walking supports diaphragmatic excursion and improves tidal lung volume. Stop immediately if you experience dizziness or shortness of breath.</p>
                </div>

                <button
                  type="button"
                  onClick={handleStart}
                  className="w-full py-3.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Move Session
                </button>
              </div>
            )}

            {(sessionState === 'active' || sessionState === 'paused') && (
              <div className="text-center py-4 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0067A1]/10 text-[#0067A1] dark:text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-[#0067A1] animate-pulse"></span>
                  {activityType} session {sessionState === 'paused' ? '(Paused)' : 'in progress'}
                </div>

                <div className="text-6xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                  {formatTime(secondsElapsed)}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Distance</p>
                    <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">{distanceKm} <span className="text-xs font-normal text-slate-400">km</span></p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Calories</p>
                    <p className="text-lg font-extrabold text-amber-600 mt-1">{caloriesBurned} <span className="text-xs font-normal text-slate-400">kcal</span></p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Est. Steps</p>
                    <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">{estimatedSteps}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  {sessionState === 'active' ? (
                    <button
                      type="button"
                      onClick={handlePause}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <Pause className="w-4 h-4" /> Pause
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResume}
                      className="px-6 py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" /> Resume
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer hover:opacity-90"
                  >
                    <Square className="w-4 h-4" /> Complete
                  </button>
                </div>
              </div>
            )}

            {sessionState === 'completed' && (
              <div className="text-center py-4 space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">Session Completed!</h4>
                  <p className="text-xs text-slate-500 mt-1">Great job! Here is your session summary</p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total Duration</span>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">{formatTime(secondsElapsed)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Distance</span>
                    <p className="text-base font-extrabold text-[#0067A1] mt-1">{distanceKm} km</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Estimated Calories</span>
                    <p className="text-base font-extrabold text-amber-600 mt-1">{caloriesBurned} kcal</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Steps</span>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">{estimatedSteps}</p>
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
                    onClick={handleSave}
                    className="flex-1 py-3 bg-[#0067A1] hover:bg-[#005584] text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Save to Activity History
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
