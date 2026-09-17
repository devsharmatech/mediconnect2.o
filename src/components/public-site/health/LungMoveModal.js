"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, Flame, Timer, Footprints, ArrowRight, CheckCircle2, RotateCcw, Info, MapPin, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatedStopwatch, AnimatedLungs, AnimatedRouteTracker, AnimatedCheckmark } from './animations';
import RealGpsMap from './RealGpsMap';
import { getSavedPatientLocation, savePatientLocation, reverseGeocodeCoords } from "@/lib/patientLocation";

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
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

export default function LungMoveModal({
  isOpen,
  onClose,
  userId = null,
  userCoords = null,
  locationName = null,
  onSessionSaved = null,
}) {
  const [activityType, setActivityType] = useState('walk'); // 'walk' | 'jog' | 'run'
  const [targetDuration, setTargetDuration] = useState(20); // minutes
  const [sessionState, setSessionState] = useState('setup'); // 'setup' | 'active' | 'paused' | 'completed'
  const [trackingMode, setTrackingMode] = useState('real'); // 'real' (GPS & Sensor real movement) | 'treadmill' (Indoor Paced Simulation)
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // GPS tracking state
  const [gpsStatus, setGpsStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'unsupported'
  const [gpsPoints, setGpsPoints] = useState([]);
  const [realGpsDistanceKm, setRealGpsDistanceKm] = useState(0);
  const [currentSpeedKmH, setCurrentSpeedKmH] = useState(0);
  const [pedometerSteps, setPedometerSteps] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const watchIdRef = useRef(null);

  // Check GPS permission on modal open
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
      toast.error('GPS is not supported on this device/browser.');
      return;
    }
    toast.loading('Acquiring GPS fix...', { id: 'gps-req' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        toast.dismiss('gps-req');
        setGpsStatus('granted');
        setGpsAccuracy(Math.round(accuracy));
        setGpsPoints([{ lat: latitude, lng: longitude, time: Date.now() }]);
        toast.success(`GPS Location active (${Math.round(accuracy)}m accuracy)`);
        
        // Reverse-geocode & save permanently so it never reverts to Delhi
        try {
          const clientResolvedCity = await reverseGeocodeCoords(latitude, longitude);
          if (clientResolvedCity && clientResolvedCity !== "Current Location" && clientResolvedCity !== "Delhi") {
            savePatientLocation({
              city: clientResolvedCity,
              lat: latitude,
              lng: longitude,
              isGps: true,
            });
          }
        } catch (revErr) {}

        fetch(`/api/v1/lung/environment?lat=${latitude}&lng=${longitude}&refresh=true`)
          .then((r) => r.json())
          .then((json) => {
            if (json.success && json.data) {
              savePatientLocation({
                city: json.data.aqi_location,
                lat: latitude,
                lng: longitude,
                aqi: json.data.aqi,
                isGps: true,
              });
            }
          })
          .catch(() => {});
      },
      (err) => {
        toast.dismiss('gps-req');
        setGpsStatus('denied');
        if (err.code === 1) {
          toast.error('Location permission was denied. Please allow GPS access in browser.');
        } else {
          toast.error('Unable to acquire GPS signal. Check device location.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Device motion accelerometer step detection for smartphones
  useEffect(() => {
    if (sessionState !== 'active' || typeof window === 'undefined') return;

    let lastStepTime = 0;
    const handleDeviceMotion = (event) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      // Resting gravity is ~9.8 m/s^2. Footsteps cause a transient impact spike > 12.2 m/s^2
      const now = Date.now();
      if (magnitude > 12.2 && now - lastStepTime > 330) {
        lastStepTime = now;
        setPedometerSteps((prev) => prev + 1);
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
    }
    return () => {
      if (window.DeviceMotionEvent) {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
    };
  }, [sessionState]);

  // Watch GPS coordinates during active session
  useEffect(() => {
    if (sessionState === 'active' && gpsStatus === 'granted' && typeof window !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, speed } = pos.coords;
          setGpsAccuracy(Math.round(accuracy));

          if (typeof speed === 'number' && !isNaN(speed) && speed > 0.2) {
            setCurrentSpeedKmH(parseFloat((speed * 3.6).toFixed(1)));
          }

          setGpsPoints((prev) => {
            if (prev.length > 0) {
              const prevPoint = prev[prev.length - 1];
              const dist = getHaversineDistance(prevPoint.lat, prevPoint.lng, latitude, longitude);
              // Ignore jitter under 3 meters (0.003 km) or abnormal teleports over 200m per update
              if (dist >= 0.003 && dist < 0.2) {
                setRealGpsDistanceKm((curr) => parseFloat((curr + dist).toFixed(3)));
                if (typeof speed !== 'number' || isNaN(speed)) {
                  const timeDeltaSec = (Date.now() - prevPoint.time) / 1000;
                  if (timeDeltaSec > 0) {
                    const calcSpd = dist / (timeDeltaSec / 3600);
                    setCurrentSpeedKmH(parseFloat(Math.min(calcSpd, 25).toFixed(1)));
                  }
                }
                return [...prev, { lat: latitude, lng: longitude, time: Date.now(), speed }];
              } else {
                if (Date.now() - prevPoint.time > 3500) {
                  setCurrentSpeedKmH(0);
                }
                return prev;
              }
            }
            return [{ lat: latitude, lng: longitude, time: Date.now(), speed }];
          });
        },
        (err) => console.warn('GPS tracking watch error:', err),
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
  }, [sessionState, gpsStatus]);

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

  // Target reference speed for chosen activity
  const referenceSpeedKmH = activityType === 'run' ? 9.5 : activityType === 'jog' ? 7.0 : 4.5;
  const isGpsActive = gpsStatus === 'granted';

  // Distance computation:
  // In 'real' mode: strictly rely on actual GPS movement (realGpsDistanceKm) or physical pedometer steps.
  // Stationary => 0.00 km, 0 steps, 0 kcal!
  const sensorDistanceKm = pedometerSteps > 0 ? pedometerSteps / 1350 : 0;
  const effectiveDistanceNum = trackingMode === 'treadmill'
    ? (secondsElapsed / 3600) * referenceSpeedKmH
    : Math.max(realGpsDistanceKm, sensorDistanceKm);

  const isMoving = trackingMode === 'treadmill'
    ? sessionState === 'active'
    : (effectiveDistanceNum >= 0.005 || currentSpeedKmH > 0.3 || pedometerSteps > 0);

  const finalDistanceKm = effectiveDistanceNum.toFixed(2);
  const effectiveSteps = trackingMode === 'treadmill'
    ? Math.round(effectiveDistanceNum * 1350)
    : (pedometerSteps > 0 ? pedometerSteps : Math.round(effectiveDistanceNum * 1350));

  // Calories: Strictly 0 if no movement occurred!
  // When moving: ~58 kcal/km (walk), ~64 kcal/km (jog), ~68 kcal/km (run).
  const caloriesBurned = effectiveDistanceNum > 0
    ? Math.round(effectiveDistanceNum * (activityType === 'run' ? 68 : activityType === 'jog' ? 64 : 58))
    : 0;

  // Live speed display inside the stopwatch gauge
  const liveSpeedDisplay = trackingMode === 'treadmill'
    ? `${referenceSpeedKmH} km/h`
    : isMoving
    ? `${(currentSpeedKmH > 0 ? currentSpeedKmH : effectiveDistanceNum / (Math.max(1, secondsElapsed) / 3600)).toFixed(1)} km/h`
    : '0.0 km/h';

  const liveSpeedSubLabel = trackingMode === 'treadmill'
    ? 'treadmill pace'
    : isMoving
    ? 'live pace'
    : 'stationary';

  const handleStart = () => {
    setSecondsElapsed(0);
    setRealGpsDistanceKm(0);
    setPedometerSteps(0);
    setCurrentSpeedKmH(0);
    setGpsPoints(gpsPoints.slice(0, 1));
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

  const handleComplete = () => {
    const sessionRecord = {
      id: `lms-${Date.now()}`,
      activity_type: activityType,
      title: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} Session`,
      created_at: new Date().toISOString(),
      duration_seconds: secondsElapsed,
      distance_km: parseFloat(finalDistanceKm),
      steps: effectiveSteps,
      avg_pace: parseFloat(finalDistanceKm) > 0 ? `${((secondsElapsed / 60) / parseFloat(finalDistanceKm)).toFixed(1)} /km` : '0.0 /km',
      status: 'completed',
      gps_tracked: isGpsActive && trackingMode === 'real',
      gps_points_count: gpsPoints.length,
    };

    try {
      const existing = JSON.parse(localStorage.getItem('lung_activity_history') || '[]');
      existing.unshift(sessionRecord);
      localStorage.setItem('lung_activity_history', JSON.stringify(existing));
    } catch (e) {
      console.warn("Could not persist activity to storage:", e);
    }

    // Persist to PostgreSQL backend
    try {
      let currentUserId = userId;
      if (!currentUserId && typeof window !== 'undefined') {
        const raw = localStorage.getItem('user') || localStorage.getItem('userData');
        if (raw) {
          const u = JSON.parse(raw);
          currentUserId = u.id || u.user_id || u.user?.id;
        }
      }

      fetch('/api/v1/lung/activity-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          user_id: currentUserId || 'usr_guest',
          activity_type: `lung_${activityType}`,
          accumulated_active_seconds: secondsElapsed,
          target_duration_minutes: targetDuration,
          distance_km: parseFloat(finalDistanceKm),
          steps: effectiveSteps,
          estimated_energy_kcal: caloriesBurned,
          gps_tracked: isGpsActive,
          gps_points: gpsPoints,
        })
      }).catch(err => console.warn("Backend activity sync error:", err));
    } catch (err) {
      console.warn("Failed to dispatch activity session to API:", err);
    }

    toast.success("Move activity recorded successfully!");
    if (onSessionSaved) onSessionSaved(sessionRecord);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSessionState('setup');
    setSecondsElapsed(0);
    setRealGpsDistanceKm(0);
    setPedometerSteps(0);
    setCurrentSpeedKmH(0);
    setGpsPoints(gpsPoints.slice(0, 1));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-200/80 flex flex-col overflow-hidden font-sans text-slate-800"
        >
          {/* Header (Pinned Top) */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 z-20">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[5px] bg-[#0067A1] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Footprints className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  Move Activity Session
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-normal truncate">
                  Paced functional respiratory movement & aerobic logging
                </p>
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
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-[5px] hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Middle Body (Scrollable with smooth overscroll) */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 bg-white space-y-3.5 sm:space-y-4">
            {sessionState === 'setup' && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Select Activity Mode:
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {[
                      { id: 'walk', label: 'Walk', desc: '4.5 km/h' },
                      { id: 'jog', label: 'Jog', desc: '7.0 km/h' },
                      { id: 'run', label: 'Run', desc: '9.5 km/h' },
                    ].map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setActivityType(act.id)}
                        className={`p-2.5 sm:p-3 rounded-[5px] border text-center transition-all cursor-pointer ${
                          activityType === act.id
                            ? 'border-[#0067A1] bg-[#0067A1] text-white shadow-xs'
                            : 'border-slate-200 hover:border-[#0067A1] text-slate-700 bg-white hover:bg-blue-50/30'
                        }`}
                      >
                        <p className={`text-xs sm:text-sm font-semibold ${activityType === act.id ? 'text-white' : 'text-slate-900'}`}>
                          {act.label}
                        </p>
                        <p className={`text-[10.5px] sm:text-xs mt-0.5 font-mono font-medium ${activityType === act.id ? 'text-white/90' : 'text-slate-500'}`}>
                          {act.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Target Duration:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {[10, 20, 30, 45].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setTargetDuration(mins)}
                        className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-[5px] border text-xs font-semibold transition-all cursor-pointer ${
                          targetDuration === mins
                            ? 'border-[#003358] bg-[#003358] text-white shadow-2xs'
                            : 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-sky-50 rounded-[5px] p-3 sm:p-3.5 border border-sky-200 text-xs text-slate-700 leading-relaxed shadow-2xs">
                  <span className="font-semibold text-[#003358] block mb-1 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#0067A1] shrink-0" />
                    Clinical Movement Guidance:
                  </span>
                  <p className="text-slate-600 font-normal text-[11px] sm:text-xs leading-normal">
                    Rhythmic, self-paced walking engages the diaphragm and improves lung functional capacity. Stop if dizzy, chest pain develops, or severe shortness of breath occurs.
                  </p>
                </div>

                {/* Movement Tracking Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Movement Tracking Source:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTrackingMode('real')}
                      className={`p-2.5 rounded-[5px] border text-left transition-all cursor-pointer ${
                        trackingMode === 'real'
                          ? 'border-[#0067A1] bg-sky-50/70 ring-1 ring-[#0067A1]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Navigation className={`w-3.5 h-3.5 ${trackingMode === 'real' ? 'text-[#0067A1]' : 'text-slate-400'}`} />
                        <span>Real Movement</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        GPS & Sensors. 0 movement = 0 km, 0 kcal.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTrackingMode('treadmill')}
                      className={`p-2.5 rounded-[5px] border text-left transition-all cursor-pointer ${
                        trackingMode === 'treadmill'
                          ? 'border-[#0067A1] bg-sky-50/70 ring-1 ring-[#0067A1]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Timer className={`w-3.5 h-3.5 ${trackingMode === 'treadmill' ? 'text-[#0067A1]' : 'text-slate-400'}`} />
                        <span>Indoor Treadmill</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Timer simulation for stationary gym machines.
                      </p>
                    </button>
                  </div>
                </div>

                {/* GPS Tracking Permission & Status */}
                {gpsStatus !== 'granted' ? (
                  <div className="bg-amber-50/90 border border-amber-200 rounded-[5px] p-2.5 sm:p-3 flex items-center justify-between gap-2 text-xs text-amber-900">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold block truncate">Real GPS Tracking Disabled</span>
                        <p className="text-[10.5px] text-amber-800 truncate">Enable location for accurate outdoor route & distance logging.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={requestGps}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded-[4px] shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Enable GPS</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-[5px] p-2.5 flex items-center justify-between text-xs text-emerald-950">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span className="font-semibold text-[11.5px] sm:text-xs">GPS Active ({gpsAccuracy ? `${gpsAccuracy}m accuracy` : 'Ready'})</span>
                    </div>
                    <span className="text-[9.5px] sm:text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-[4px] font-bold">
                      Outdoor GPS Ready
                    </span>
                  </div>
                )}
              </div>
            )}

            {(sessionState === 'active' || sessionState === 'paused') && (
              <div className="space-y-3 sm:space-y-3.5">
                {/* Active Status Bar */}
                <div className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-50 border border-slate-200 rounded-[5px]">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${sessionState === 'paused' ? 'bg-amber-500' : isMoving ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`}></span>
                    <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-700 truncate">
                      {activityType.toUpperCase()} {sessionState === 'paused' ? '(PAUSED)' : isMoving ? 'IN PROGRESS' : '(WAITING FOR MOVEMENT)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9.5px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-[4px] border ${
                      trackingMode === 'treadmill'
                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                        : isMoving
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {trackingMode === 'treadmill'
                        ? 'TREADMILL PACED'
                        : isMoving
                        ? `GPS LIVE (${gpsPoints.length} pts)`
                        : 'STATIONARY (0.0 km/h)'}
                    </span>
                    <span className="text-[10.5px] sm:text-xs font-mono font-medium text-[#003358] bg-white px-1.5 sm:px-2 py-0.5 rounded-[4px] border border-slate-200">
                      Target: {targetDuration}m
                    </span>
                  </div>
                </div>

                {/* Primary Animated Stopwatch Timer */}
                <div className="flex items-center justify-center py-1 sm:py-2 px-2 sm:px-3 bg-gradient-to-b from-slate-50/90 via-sky-50/40 to-white rounded-md border border-slate-200 shadow-2xs">
                  <AnimatedStopwatch
                    isActive={sessionState === 'active'}
                    isPaused={sessionState === 'paused'}
                    size="responsive"
                    timeString={formatTime(secondsElapsed)}
                    label={liveSpeedDisplay}
                    subLabel={liveSpeedSubLabel}
                    progress={Math.min(1, secondsElapsed / ((targetDuration || 20) * 60))}
                  />
                </div>

                {/* Stationary Indicator Banner */}
                {!isMoving && trackingMode === 'real' && secondsElapsed > 3 && (
                  <div className="px-3 py-1.5 bg-amber-50/90 border border-amber-200 rounded-[5px] flex items-center gap-2 text-[11px] sm:text-xs text-amber-900">
                    <Footprints className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Stationary. Walk or move with your device to record distance, steps & energy.</span>
                  </div>
                )}

                {/* Live Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  <div className="bg-slate-50/70 p-2 sm:p-2.5 rounded-[5px] border border-slate-200/80 text-center">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase text-slate-500 tracking-wide block">
                      Distance {trackingMode === 'treadmill' ? '(Est.)' : isGpsActive ? '(GPS)' : '(Live)'}
                    </span>
                    <p className="text-xl sm:text-2xl font-bold font-mono text-slate-800 mt-0.5">{finalDistanceKm}</p>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-500">km</span>
                  </div>
                  <div className="bg-slate-50/70 p-2 sm:p-2.5 rounded-[5px] border border-slate-200/80 text-center">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase text-slate-500 tracking-wide block">Energy</span>
                    <p className="text-xl sm:text-2xl font-bold font-mono text-amber-600 mt-0.5">{caloriesBurned}</p>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-500">kcal</span>
                  </div>
                  <div className="bg-slate-50/70 p-2 sm:p-2.5 rounded-[5px] border border-slate-200/80 text-center">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase text-slate-500 tracking-wide block">Steps</span>
                    <p className="text-xl sm:text-2xl font-bold font-mono text-slate-800 mt-0.5">{effectiveSteps}</p>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-500">steps</span>
                  </div>
                </div>

                {/* Real OpenStreetMap Route Tracker (ui3.png B03-S02 / S03) */}
                <RealGpsMap
                  isLiveTracking={sessionState === 'active'}
                  distanceKm={`${finalDistanceKm} km`}
                  activity={activityType.toUpperCase()}
                  coords={userCoords || (gpsPoints.length > 0 ? gpsPoints[gpsPoints.length - 1] : null)}
                  locationName={locationName || getSavedPatientLocation()?.city || 'Current Location'}
                  points={gpsPoints}
                  height="h-36 sm:h-44"
                  className="w-full"
                />
              </div>
            )}

            {sessionState === 'completed' && (
              <div className="space-y-3.5">
                <div className="p-3 sm:p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-[5px] flex items-center gap-3">
                  <AnimatedCheckmark size="sm" showParticles={true} />
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-emerald-950">
                      Move Session Recorded Successfully
                    </h4>
                    <p className="text-[11px] sm:text-xs text-emerald-800 font-normal mt-0.5">
                      Factual metrics have been calculated for your respiratory activity log.
                    </p>
                  </div>
                </div>

                {/* Real Map Summary (ui3.png B03-S04) */}
                <RealGpsMap
                  isLiveTracking={false}
                  distanceKm={`${finalDistanceKm} km`}
                  activity={activityType.toUpperCase()}
                  coords={userCoords}
                  points={gpsPoints}
                  height="h-32 sm:h-36"
                  className="w-full"
                />

                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                  <div className="p-2.5 sm:p-3 bg-slate-50/60 rounded-[5px] border border-slate-200">
                    <span className="text-[10.5px] sm:text-[11px] text-slate-500 uppercase font-semibold tracking-wide block">Total Duration</span>
                    <p className="text-lg sm:text-xl font-bold font-mono text-slate-800 mt-0.5">{formatTime(secondsElapsed)}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-50/60 rounded-[5px] border border-slate-200">
                    <span className="text-[10.5px] sm:text-[11px] text-slate-500 uppercase font-semibold tracking-wide block">Distance</span>
                    <p className="text-lg sm:text-xl font-bold font-mono text-[#0067A1] mt-0.5">{finalDistanceKm} km</p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-50/60 rounded-[5px] border border-slate-200">
                    <span className="text-[10.5px] sm:text-[11px] text-slate-500 uppercase font-semibold tracking-wide block">Energy Expended</span>
                    <p className="text-lg sm:text-xl font-bold font-mono text-amber-600 mt-0.5">{caloriesBurned} kcal</p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-50/60 rounded-[5px] border border-slate-200">
                    <span className="text-[10.5px] sm:text-[11px] text-slate-500 uppercase font-semibold tracking-wide block">Steps Logged</span>
                    <p className="text-lg sm:text-xl font-bold font-mono text-slate-800 mt-0.5">{effectiveSteps}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pinned Action Controls (Always visible at bottom) */}
          {sessionState === 'setup' && (
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 bg-slate-50 shrink-0 z-20">
              <button
                type="button"
                onClick={handleStart}
                className="w-full py-2.5 sm:py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold text-xs sm:text-sm rounded-[5px] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" /> Start Move Session
              </button>
            </div>
          )}

          {(sessionState === 'active' || sessionState === 'paused') && (
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 bg-slate-50 shrink-0 z-20 flex items-center justify-between gap-2 sm:gap-2.5">
              {sessionState === 'active' ? (
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex-1 py-2 sm:py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-[5px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Pause className="w-4 h-4" /> Pause Session
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResume}
                  className="flex-1 py-2 sm:py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold text-xs sm:text-sm rounded-[5px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Play className="w-4 h-4 fill-white" /> Resume Session
                </button>
              )}
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 py-2 sm:py-2.5 bg-[#003358] hover:bg-[#00223d] text-white font-semibold text-xs sm:text-sm rounded-[5px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Square className="w-4 h-4" /> Complete Session
              </button>
            </div>
          )}

          {sessionState === 'completed' && (
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 bg-slate-50 shrink-0 z-20 flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2 sm:py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-[5px] cursor-pointer transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="flex-1 py-2 sm:py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold text-xs sm:text-sm rounded-[5px] transition-all shadow-xs cursor-pointer"
              >
                Save to Activity History
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
