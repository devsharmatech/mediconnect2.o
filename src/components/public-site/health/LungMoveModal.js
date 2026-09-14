"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, Flame, Timer, Footprints, ArrowRight, CheckCircle2, RotateCcw, Info } from 'lucide-react';
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
                    Move Activity Session
                  </h3>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-[5px] bg-[#003358] text-white">
                    B03
                  </span>
                </div>
                <p className="text-xs text-slate-800 font-semibold mt-0.5">Paced functional respiratory movement & aerobic logging</p>
              </div>
            </div>
            <button
              type="button"
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
              className="text-slate-700 hover:text-black p-1.5 rounded-[5px] hover:bg-slate-200 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 bg-white">
            {sessionState === 'setup' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                    Select Activity Mode:
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'walk', label: 'Walk', desc: '4.5 km/h' },
                      { id: 'jog', label: 'Jog', desc: '7.0 km/h' },
                      { id: 'run', label: 'Run', desc: '9.5 km/h' },
                    ].map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setActivityType(act.id)}
                        className={`p-3 rounded-[5px] border-2 text-center transition-all cursor-pointer ${
                          activityType === act.id
                            ? 'border-[#0067A1] bg-[#0067A1] text-white shadow-sm'
                            : 'border-slate-300 hover:border-[#0067A1] text-black bg-white hover:bg-blue-50/40'
                        }`}
                      >
                        <p className={`text-sm font-black ${activityType === act.id ? 'text-white' : 'text-slate-950'}`}>
                          {act.label}
                        </p>
                        <p className={`text-xs mt-0.5 font-mono font-bold ${activityType === act.id ? 'text-white/95' : 'text-slate-800'}`}>
                          {act.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                    Target Duration:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 20, 30, 45].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setTargetDuration(mins)}
                        className={`py-2.5 px-3 rounded-[5px] border-2 text-xs font-black transition-all cursor-pointer ${
                          targetDuration === mins
                            ? 'border-[#003358] bg-[#003358] text-white shadow-xs'
                            : 'border-slate-300 text-black bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-sky-50 rounded-[5px] p-3.5 border-2 border-sky-200 text-xs text-slate-950 leading-relaxed shadow-2xs">
                  <span className="font-black text-[#003358] block mb-1 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#0067A1] shrink-0" />
                    Clinical Movement Guidance:
                  </span>
                  <p className="text-black font-medium text-xs leading-normal">
                    Rhythmic, self-paced walking engages the diaphragm and improves lung functional capacity. Stop if dizzy, chest pain develops, or severe shortness of breath occurs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStart}
                  className="w-full py-3.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-black text-sm rounded-[5px] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Move Session
                </button>
              </div>
            )}

            {(sessionState === 'active' || sessionState === 'paused') && (
              <div className="py-1 space-y-4">
                {/* Active Status Bar */}
                <div className="flex items-center justify-between p-3 bg-slate-100 border-2 border-slate-300 rounded-[5px]">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-[2px] ${sessionState === 'paused' ? 'bg-amber-500' : 'bg-emerald-600 animate-pulse'}`}></span>
                    <span className="text-xs font-black uppercase tracking-wider text-black">
                      {activityType.toUpperCase()} {sessionState === 'paused' ? '(PAUSED)' : 'IN PROGRESS'}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#003358] bg-white px-2 py-0.5 rounded-[5px] border border-slate-300">
                    Target: {targetDuration}m
                  </span>
                </div>

                {/* Primary Digital Timer */}
                <div className="p-5 bg-slate-950 text-white rounded-[5px] text-center border-2 border-slate-800 shadow-md">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300 block mb-1">
                    Elapsed Active Duration
                  </span>
                  <div className="text-5xl font-black font-mono tracking-tight text-white my-1">
                    {formatTime(secondsElapsed)}
                  </div>
                  <span className="text-xs font-bold text-slate-300 block mt-1">
                    {speedKmH} km/h reference pace
                  </span>
                </div>

                {/* Live Metrics Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 p-3 rounded-[5px] border-2 border-slate-200 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-900 block">Distance</span>
                    <p className="text-xl font-black font-mono text-black mt-0.5">{distanceKm}</p>
                    <span className="text-[11px] font-bold text-slate-700">km</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-[5px] border-2 border-slate-200 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-900 block">Energy</span>
                    <p className="text-xl font-black font-mono text-amber-700 mt-0.5">{caloriesBurned}</p>
                    <span className="text-[11px] font-bold text-slate-700">kcal</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-[5px] border-2 border-slate-200 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-900 block">Est. Steps</span>
                    <p className="text-xl font-black font-mono text-black mt-0.5">{estimatedSteps}</p>
                    <span className="text-[11px] font-bold text-slate-700">steps</span>
                  </div>
                </div>

                {/* Control Actions */}
                <div className="flex items-center justify-between gap-2.5 pt-1">
                  {sessionState === 'active' ? (
                    <button
                      type="button"
                      onClick={handlePause}
                      className="flex-1 py-3 bg-white border-2 border-slate-400 hover:bg-slate-100 text-black font-black text-xs rounded-[5px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Pause className="w-4 h-4" /> Pause Session
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResume}
                      className="flex-1 py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-black text-xs rounded-[5px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    >
                      <Play className="w-4 h-4 fill-white" /> Resume Session
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="flex-1 py-3 bg-[#003358] hover:bg-[#00223d] text-white font-black text-xs rounded-[5px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <Square className="w-4 h-4" /> Complete Session
                  </button>
                </div>
              </div>
            )}

            {sessionState === 'completed' && (
              <div className="space-y-4 py-1">
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-[5px] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[5px] bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950">
                      Move Session Recorded Successfully
                    </h4>
                    <p className="text-xs text-emerald-900 font-medium mt-0.5">
                      Factual metrics have been calculated for your respiratory activity log.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-[5px] border-2 border-slate-200">
                    <span className="text-[10px] text-slate-900 uppercase font-black block">Total Duration</span>
                    <p className="text-lg font-black font-mono text-black mt-0.5">{formatTime(secondsElapsed)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-[5px] border-2 border-slate-200">
                    <span className="text-[10px] text-slate-900 uppercase font-black block">Distance</span>
                    <p className="text-lg font-black font-mono text-[#0067A1] mt-0.5">{distanceKm} km</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-[5px] border-2 border-slate-200">
                    <span className="text-[10px] text-slate-900 uppercase font-black block">Energy Expended</span>
                    <p className="text-lg font-black font-mono text-amber-700 mt-0.5">{caloriesBurned} kcal</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-[5px] border-2 border-slate-200">
                    <span className="text-[10px] text-slate-900 uppercase font-black block">Estimated Steps</span>
                    <p className="text-lg font-black font-mono text-black mt-0.5">{estimatedSteps}</p>
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
                    onClick={handleSave}
                    className="flex-1 py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-black text-xs rounded-[5px] transition-all shadow-xs cursor-pointer"
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
