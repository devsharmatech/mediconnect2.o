"use client";

import React, { useState, useEffect } from 'react';
import { Layout, User, LogOut, CheckCircle2, Play, Wind, Activity, Timer, RefreshCw, AlertCircle, Info, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const LungConnectDashboard = () => {
  // Game states
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState("Idle"); // "Inhale", "Hold", "Exhale", "Idle"
  const [timerCount, setTimerCount] = useState(4);
  const [bestHold, setBestHold] = useState(55);
  const [gameScoreLog, setGameScoreLog] = useState([
    { hold: "55 sec", score: "Excellent", date: "Today" },
    { hold: "48 sec", score: "Good", date: "Yesterday" }
  ]);

  // Video modal state
  const [playingVideo, setPlayingVideo] = useState(false);

  const breathHoldData = [
    { param: "Best Breath Hold", current: `${bestHold} sec`, progress: "+0.6%", positive: true },
    { param: "Average Breath Hold", current: "44 sec", progress: "-0.22%", positive: false },
    { param: "Improvement %", current: "25%", progress: "-6%", positive: false },
    { param: "Percentile", current: "66th", progress: "18 perch", positive: true },
  ];

  const airQualityData = [
    { param: "AQI Exposure Days", current: "12", progress: "-3 days", positive: true },
    { param: "Pollution Burden Score", current: "38", progress: "-6 points", positive: true },
    { param: "Precaution Days followed", current: "72%", progress: "+90%", positive: true },
  ];

  const lungTips = [
    "Check Air Quality Index (AQI) daily.",
    "Avoid outdoor activity on high AQI days.",
    "Maintain a consistent breathing exercise routine.",
    "Improve ventilation in indoor spaces.",
    "Stay updated on local environmental reports."
  ];

  // Breathe trainer logic (4s Inhale, 7s Hold, 8s Exhale - Box breathing variant)
  useEffect(() => {
    let interval = null;
    if (breathingActive) {
      interval = setInterval(() => {
        setTimerCount((prev) => {
          if (prev <= 1) {
            if (breathPhase === "Inhale") {
              setBreathPhase("Hold");
              return 7;
            } else if (breathPhase === "Hold") {
              setBreathPhase("Exhale");
              return 8;
            } else {
              setBreathPhase("Inhale");
              return 4;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBreathPhase("Idle");
      setTimerCount(4);
    }
    return () => clearInterval(interval);
  }, [breathingActive, breathPhase]);

  const handleStartGame = () => {
    if (breathingActive) {
      setBreathingActive(false);
      toast.success("Breathing exercise completed!");
      setGameScoreLog([{ hold: `${timerCount + 10} sec`, score: "Good", date: "Just now" }, ...gameScoreLog]);
    } else {
      setBreathingActive(true);
      setBreathPhase("Inhale");
      setTimerCount(4);
      toast.success("Breathing game started!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-8 bg-gradient-to-r from-[#0067A1] to-indigo-600 text-white rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <span className="bg-white/20 text-white font-bold text-xs uppercase px-3 py-1 rounded-full border border-white/20">Wellness Module</span>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-3 text-white">Lung Connect</h1>
            <p className="text-white/80 mt-2 text-sm md:text-base max-w-xl">
              Evaluate cardiorespiratory strength through structured breath-holding practices and monitor local air quality exposure indices.
            </p>
          </div>
        </header>

        {/* Breath Game & Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Card 1: Breathing Game / Trainer */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Wind className="w-5 h-5 text-blue-500 animate-pulse" />
                Breath Hold Trainer
              </h3>
              <p className="text-xs text-slate-400 mb-4">Click below to start box breathing simulator to test your capacity.</p>
              
              <div className="flex flex-col items-center justify-center py-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                {/* Visual circle animation */}
                <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-1000 ${
                  breathPhase === "Inhale" ? "bg-blue-100 scale-110 border-4 border-blue-400" :
                  breathPhase === "Hold" ? "bg-indigo-100 scale-100 border-4 border-indigo-400 animate-pulse" :
                  breathPhase === "Exhale" ? "bg-emerald-100 scale-90 border-4 border-emerald-400" :
                  "bg-slate-100 scale-95 border-2 border-slate-200"
                }`}>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    {breathPhase === "Idle" ? "Ready" : breathPhase}
                  </span>
                  <span className="text-3xl font-black text-slate-800 mt-1">
                    {breathingActive ? `${timerCount}s` : "0s"}
                  </span>
                </div>

                <button
                  onClick={handleStartGame}
                  className="mt-6 px-6 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10"
                >
                  <Timer className="w-4 h-4" />
                  {breathingActive ? "Stop Vitals Game" : "Start Breath Game"}
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Practice History</h4>
              <div className="space-y-1.5">
                {gameScoreLog.map((log, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <span>Hold: <span className="font-bold text-slate-700">{log.hold}</span> ({log.score})</span>
                    <span className="text-slate-400">{log.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Restructured Video & Guides */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Wind className="w-5 h-5 text-[#004A8D]" />
                Respiratory Video Guide
              </h3>
              <p className="text-xs text-slate-400 mb-4">Learn about standard respiratory parameters and how to safely hold your breath.</p>

              {/* Video Thumbnail */}
              <div
                onClick={() => setPlayingVideo(true)}
                className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 cursor-pointer group shadow border border-slate-100"
              >
                <img
                  src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop"
                  alt="Yoga Breathing Guide"
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/95 text-[#0067A1] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-6 h-6 fill-current ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-bold">
                  04:45 Mins
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex gap-2.5 items-start text-xs text-slate-600 bg-blue-50/50 p-3 rounded-xl">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p>Breathing exercises expand alveolar capacity and lower daily anxiety triggers.</p>
              </div>
              <button
                onClick={() => setPlayingVideo(true)}
                className="w-full py-2.5 border border-blue-600 text-[#0067A1] hover:bg-blue-50/30 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                Open Breathing Guide <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 3: Breath-Hold Performance metrics */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Respiratory Performance</h3>
              <table className="w-full text-left text-xs mb-4">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Parameter</th>
                    <th className="pb-3 font-semibold">Current</th>
                    <th className="pb-3 font-semibold text-right">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {breathHoldData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 font-medium text-slate-600">{row.param}</td>
                      <td className="py-3 font-bold text-slate-800">{row.current}</td>
                      <td className={`py-3 text-right font-bold ${row.positive ? 'text-[#0067A1]' : 'text-rose-500'}`}>
                        {row.progress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4">
              <h4 className="font-bold text-xs text-blue-800 mb-2">Lung-Friendly Tip</h4>
              <p className="text-[11px] text-[#004F7C]/80 leading-relaxed">
                Avoid outdoor morning workouts in cities on days when the AQI exceeds 150.
              </p>
            </div>
          </div>

        </div>

        {/* Bento Grid Layout - Part 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Air Quality Exposure */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Air Quality Exposure</h3>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">Mild Exposure</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Parameter</th>
                  <th className="pb-3 font-semibold">Current</th>
                  <th className="pb-3 font-semibold text-right">Your Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {airQualityData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-4 font-medium text-slate-600">{row.param}</td>
                    <td className="py-4 font-bold text-slate-800">{row.current}</td>
                    <td className="py-4 text-right font-bold text-[#0067A1]">
                      {row.progress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Precautions Guidelines */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">AQI Precautions Checklist</h3>
              <ul className="space-y-3">
                {lungTips.slice(0, 4).map((tip, idx) => (
                  <li key={idx} className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                    <CheckCircle2 className="size-4.5 text-blue-500 shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
              Guidance verified by Indian Environmental Safety Standards.
            </div>
          </div>

        </div>

        {/* Video Overlay Modal */}
        {playingVideo && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-2xl w-full border border-white/10 shadow-2xl relative">
              <button
                onClick={() => setPlayingVideo(false)}
                className="absolute top-4 right-4 text-white hover:text-slate-300 font-bold text-sm bg-white/10 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
              <div className="p-6 text-center text-white">
                <h3 className="text-xl font-bold mb-4">Lung Breathing Training Guide</h3>
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center relative mb-4">
                  <video
                    src="https://www.w3schools.com/html/mov_bbb.mp4"
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This demo video details deep pranayama postures, capacity measurement, and safety limits.
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="bg-white border border-yellow-200 rounded-2xl p-4 text-xs text-slate-500 leading-relaxed">
          <strong>⚠ Medical Disclaimer:</strong> Lung Connect parameters represent supportive data models. This utility is intended to promote general wellness practices and does not replace, nor is it intended to substitute, clinical spirometry or respiratory therapy.
        </section>

      </div>
    </div>
  );
};

export default LungConnectDashboard;