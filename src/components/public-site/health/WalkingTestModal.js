"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, Footprints, AlertTriangle, CheckCircle2, ChevronRight, Award, Info, MapPin, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatedStopwatch, AnimatedLungs, AnimatedRouteTracker, AnimatedCheckmark } from './animations';
import RealGpsMap from './RealGpsMap';
import { getSavedPatientLocation, savePatientLocation, reverseGeocodeCoords } from "@/lib/patientLocation";

function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function WalkingTestModal({ isOpen, onClose, onTestSaved, userId, userCoords, locationName = null }) {
  // Steps: 1: Introduction, 2: Instructions, 3: Active Test, 4: Results/Borg
  const [step, setStep] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(360); // 6 minutes = 360 seconds
  const [isActive, setIsActive] = useState(false);
  const [lapsCompleted, setLapsCompleted] = useState(0); // each lap = 30 meters
  const [borgRating, setBorgRating] = useState(3);

  // GPS tracking state
  const [gpsStatus, setGpsStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'unsupported'
  const [gpsDistanceMeters, setGpsDistanceMeters] = useState(0);
  const [gpsPoints, setGpsPoints] = useState([]);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const watchIdRef = useRef(null);

  const TOTAL_TEST_SECONDS = 360;
  const METERS_PER_LAP = 30;

  // Check GPS permission
  useEffect(() => {
    if (isOpen) {
      const savedLoc = getSavedPatientLocation();
      const initialLat = userCoords?.lat || savedLoc?.lat;
      const initialLng = userCoords?.lng || savedLoc?.lng;
      if (initialLat && initialLng) {
        setGpsStatus('granted');
        setGpsPoints([{ lat: initialLat, lng: initialLng, time: Date.now() }]);
      } else if (typeof window !== 'undefined' && navigator.geolocation) {
        if (navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: 'geolocation' }).then((p) => {
            if (p.state === 'granted') {
              setGpsStatus('granted');
            } else if (p.state === 'denied') {
              setGpsStatus('denied');
            } else {
              setGpsStatus('prompt');
            }
          }).catch(() => {});
        }
      }
    }
  }, [isOpen, userCoords]);

  const requestGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unsupported');
      toast.error('GPS is not supported on this device.');
      return;
    }
    toast.loading('Acquiring GPS fix...', { id: '6mwt-gps' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        toast.dismiss('6mwt-gps');
        setGpsStatus('granted');
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsPoints([{ lat: pos.coords.latitude, lng: pos.coords.longitude, time: Date.now() }]);
        toast.success(`GPS Active (${Math.round(pos.coords.accuracy)}m precision)`);

        try {
          const revCity = await reverseGeocodeCoords(pos.coords.latitude, pos.coords.longitude);
          if (revCity && revCity !== "Current Location" && revCity !== "Delhi") {
            savePatientLocation({
              city: revCity,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              isGps: true,
            });
          }
        } catch (e) {}
      },
      (err) => {
        toast.dismiss('6mwt-gps');
        setGpsStatus('denied');
        toast.error('GPS permission denied. You can count laps manually.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Watch position during active 6MWT
  useEffect(() => {
    if (isActive && gpsStatus === 'granted' && typeof window !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setGpsAccuracy(Math.round(accuracy));
          setGpsPoints((prev) => {
            if (prev.length > 0) {
              const last = prev[prev.length - 1];
              const dist = getHaversineDistanceMeters(last.lat, last.lng, latitude, longitude);
              // Ignore GPS drift < 2m or sudden jumps > 150m
              if (dist > 2 && dist < 150) {
                setGpsDistanceMeters((d) => Math.round(d + dist));
              }
            }
            return [...prev, { lat: latitude, lng: longitude, time: Date.now() }];
          });
        },
        (err) => console.warn('6MWT GPS watch error:', err),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isActive, gpsStatus]);

  // Countdown timer
  useEffect(() => {
    let timer = null;
    if (isActive && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTestComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isActive, secondsRemaining]);

  if (!isOpen) return null;

  const isGpsActive = gpsStatus === 'granted';
  const manualDistanceMeters = lapsCompleted * METERS_PER_LAP;
  const totalDistanceMeters = isGpsActive ? Math.max(gpsDistanceMeters, manualDistanceMeters) : manualDistanceMeters;

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTest = () => {
    setSecondsRemaining(TOTAL_TEST_SECONDS);
    setLapsCompleted(0);
    setGpsDistanceMeters(0);
    setGpsPoints([]);
    setIsActive(true);
    setStep(3);
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

  const handleLap = () => {
    setLapsCompleted(prev => prev + 1);
  };

  const handleStart = () => {
    setIsActive(true);
    setStep(3);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleResume = () => {
    setIsActive(true);
  };

  const handleTestComplete = () => {
    setIsActive(false);
    setStep(4);
  };

  const handleSaveResult = () => {
    const testRecord = {
      id: `6mwt-${Date.now()}`,
      distanceMeters: totalDistanceMeters,
      durationSeconds: TOTAL_TEST_SECONDS - secondsRemaining,
      borgRating: borgRating,
      completedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    try {
      const history = JSON.parse(localStorage.getItem('lung_6mwt_history') || '[]');
      history.unshift(testRecord);
      localStorage.setItem('lung_6mwt_history', JSON.stringify(history));

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

    try {
      let currentUserId = userId;
      if (!currentUserId && typeof window !== 'undefined') {
        const raw = localStorage.getItem('user') || localStorage.getItem('userData');
        if (raw) {
          const u = JSON.parse(raw);
          currentUserId = u.id || u.user_id || u.user?.id;
        }
      }

      fetch('/api/v1/lung/walking-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          user_id: currentUserId || 'usr_guest',
          distance_m: totalDistanceMeters,
          duration_seconds: TOTAL_TEST_SECONDS - secondsRemaining,
          borg_score: borgRating,
          stops: 0,
        })
      }).catch(err => console.warn("Backend 6MWT sync error:", err));
    } catch (err) {
      console.warn("Failed to dispatch walking test to API:", err);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-200/80 flex flex-col overflow-hidden font-sans text-slate-800"
        >
          {/* Header */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 z-20">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[5px] bg-[#0067A1] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Footprints className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  6-Minute Walking Test (6MWT)
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-normal truncate">Standardized functional respiratory endurance evaluation</p>
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
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-[5px] hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 bg-white space-y-3.5 sm:space-y-4">
            {/* Step 1: Introduction (B04-S01) */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-[5px]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#003358] block mb-1">
                    Clinical Standard: ATS / ERS Guidelines
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                    The 6MWT measures the total distance walked over a continuous 6-minute period along a flat 30-meter indoor path. It provides a reliable baseline of functional aerobic capacity and endurance.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                    Protocol Instructions:
                  </span>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[5px] space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
                      <span><strong className="text-slate-900 font-semibold">Self-Paced:</strong> Walk at your regular brisk pace. Do not jog or run.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
                      <span><strong className="text-slate-900 font-semibold">Standing Rests Allowed:</strong> If breathless, you may pause. The timer continues running.</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-rose-900 bg-rose-50 p-2 rounded-[5px] border border-rose-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <span><strong className="font-semibold">Stop Immediately:</strong> If you experience chest pain, extreme dizziness, or severe dyspnea.</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold text-sm rounded-[5px] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-3"
                >
                  Proceed to Preparation Checklist <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Instructions & Preparation (B04-S02) */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2.5">
                    Pre-Test Checklist:
                  </h4>
                  <div className="p-4 rounded-[5px] border border-slate-200 bg-slate-50 text-xs space-y-3 text-slate-700">
                    <p className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-[4px] bg-[#003358] text-white font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                      <span className="font-normal">Identify a flat hallway or corridor approximately <strong className="text-slate-900 font-semibold">30 meters</strong> in length.</span>
                    </p>
                    <p className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-[4px] bg-[#003358] text-white font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                      <span className="font-normal">Ensure you are wearing comfortable walking shoes.</span>
                    </p>
                    <p className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-[4px] bg-[#003358] text-white font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                      <span className="font-normal">Each time you complete one 30m lap, tap the <strong className="text-[#0067A1] font-semibold">&quot;Log Completed Lap (+30m)&quot;</strong> button on screen.</span>
                    </p>
                  </div>
                </div>

                {/* GPS Status & Automated Distance Tracking */}
                {gpsStatus !== 'granted' ? (
                  <div className="bg-amber-50/90 border border-amber-200 rounded-[5px] p-3 flex items-center justify-between gap-2.5 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                      <div>
                        <span className="font-bold">Real GPS Tracking Disabled</span>
                        <p className="text-[11px] text-amber-800">Enable GPS for automatic 6MWT distance measurement, or count 30m laps manually.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={requestGps}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-[4px] shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Enable GPS</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-[5px] p-2.5 flex items-center justify-between text-xs text-emerald-950">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span className="font-semibold">GPS Tracking Active ({gpsAccuracy ? `${gpsAccuracy}m precision` : 'Ready'})</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-[4px] font-bold">
                      Automated 6MWT Distance
                    </span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-[5px] cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStartTest}
                    className="flex-2 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold text-xs rounded-[5px] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-[5px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Standardized Test in Progress
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] border ${
                      isGpsActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {isGpsActive ? `GPS LIVE (${totalDistanceMeters}m)` : 'MANUAL LAPS'}
                    </span>
                    <span className="text-xs font-mono font-medium text-[#003358] bg-white px-2 py-0.5 rounded-[4px] border border-slate-200">
                      Track: 30m Hallway
                    </span>
                  </div>
                </div>

                {/* Primary Animated Stopwatch Readout */}
                <div className="flex items-center justify-center py-2 px-3 bg-gradient-to-b from-slate-50/90 via-sky-50/40 to-white rounded-md border border-slate-200 shadow-2xs">
                  <AnimatedStopwatch
                    isActive={isActive}
                    isPaused={!isActive && secondsRemaining < TOTAL_TEST_SECONDS && secondsRemaining > 0}
                    size="md"
                    timeString={formatCountdown(secondsRemaining)}
                    label={`Elapsed ${formatCountdown(TOTAL_TEST_SECONDS - secondsRemaining)}`}
                    subLabel="Target 06:00"
                    progress={Math.min(1, (TOTAL_TEST_SECONDS - secondsRemaining) / TOTAL_TEST_SECONDS)}
                    className=""
                  />
                </div>

                {/* Live Distance & Laps Counter */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-50/70 p-3.5 rounded-[5px] border border-slate-200/80 text-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Laps Logged</span>
                    <p className="text-3xl font-bold font-mono text-slate-800 mt-1">{lapsCompleted}</p>
                    <span className="text-xs font-normal text-slate-500 mt-0.5 block">× 30 meters per lap</span>
                  </div>
                  <div className="bg-slate-50/70 p-3.5 rounded-[5px] border border-slate-200/80 text-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                      Total Distance {isGpsActive ? '(GPS Auto)' : '(Laps)'}
                    </span>
                    <p className="text-3xl font-bold font-mono text-[#0067A1] mt-1">
                      {totalDistanceMeters} <span className="text-sm font-semibold text-slate-700 font-sans">m</span>
                    </p>
                    <span className="text-xs font-normal text-slate-500 mt-0.5 block">Cumulative walked</span>
                  </div>
                </div>

                {/* Real GPS 30m Corridor / Track Visualizer (ui5.png B04-S03) */}
                <RealGpsMap
                  isLiveTracking={isActive}
                  distanceKm={`${totalDistanceMeters} m (${lapsCompleted} laps)`}
                  activity="6MWT Track"
                  coords={userCoords}
                  points={gpsPoints}
                  height="h-36"
                  className="w-full"
                />

                {/* Lap Recording Button */}
                <button
                  type="button"
                  onClick={handleLapClick}
                  className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] active:bg-[#003358] text-white font-semibold text-sm rounded-[5px] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Footprints className="w-5 h-5" /> Tap to Log 1 Completed Lap (+30m)
                </button>

                {/* Secondary Actions */}
                <div className="flex items-center justify-between gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className="flex-1 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-[5px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isActive ? "Pause Timer" : "Resume"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEarlyFinish}
                    className="flex-1 py-2.5 bg-[#003358] hover:bg-[#00223d] text-white font-semibold text-xs rounded-[5px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
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
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-[5px] flex items-center gap-3">
                  <AnimatedCheckmark size="sm" showParticles={true} />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-950">
                      6-Minute Walking Test Completed
                    </h4>
                    <p className="text-xs text-emerald-800 font-normal mt-0.5">
                      Factual distance recorded. Please record your perceived exertion on the Borg CR10 scale below.
                    </p>
                  </div>
                </div>

                {/* Results Summary Grid */}
                <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-slate-50/60 rounded-[5px] border border-slate-200">
                  <div>
                    <span className="text-[11px] uppercase font-semibold text-slate-500 tracking-wide block">Total Distance</span>
                    <p className="text-xl font-bold font-mono text-[#0067A1] mt-0.5">{totalDistanceMeters} meters</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] uppercase font-semibold text-slate-500 tracking-wide block">Laps Completed</span>
                    <p className="text-lg font-bold font-mono text-slate-800 mt-0.5">{lapsCompleted} laps (30m)</p>
                  </div>
                </div>

                {/* Borg Rating Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    Post-Test Exertion (Borg CR10 Scale):
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {borgDescriptions.map(b => (
                      <button
                        key={b.score}
                        type="button"
                        onClick={() => setBorgRating(b.score)}
                        className={`w-full p-2.5 rounded-[5px] border text-left flex items-center justify-between transition-all cursor-pointer ${
                          borgRating === b.score
                            ? 'border-[#0067A1] bg-[#0067A1] text-white shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-[3px] text-xs font-mono font-semibold flex items-center justify-center ${
                            borgRating === b.score ? 'bg-white text-[#0067A1]' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {b.score}
                          </span>
                          <div>
                            <span className={`text-xs font-semibold ${borgRating === b.score ? 'text-white' : 'text-slate-900'}`}>
                              {b.label}
                            </span>
                            <span className={`text-xs ml-2 font-normal ${borgRating === b.score ? 'text-white/80' : 'text-slate-500'}`}>
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
                    className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-[5px] cursor-pointer transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveResult}
                    className="flex-1 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold text-xs rounded-[5px] transition-all shadow-xs cursor-pointer"
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
