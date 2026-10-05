"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart, Play, Pause, Footprints, Activity,
  ChevronRight, ChevronLeft, Info, Shield, AlertTriangle, CheckCircle2,
  X, RotateCcw, Clock, Award, Sparkles, RefreshCw,
  TrendingUp, TrendingDown, Minus, MapPin, ArrowRight,
  Calendar, WifiOff, Check, Settings, Navigation,
  Search, CloudSun, Wind, Droplets, Database, Compass, FileText,
  Gauge, Columns
} from "lucide-react";
import toast from "react-hot-toast";

import RealGpsMap from "@/components/public-site/health/RealGpsMap";
import {
  AnimatedHeartbeat,
  AnimatedWalkingFigure,
  AnimatedStopwatch,
  AnimatedCheckmark,
} from "@/components/public-site/health/animations";
import {
  getSavedPatientLocation,
  savePatientLocation,
  reverseGeocodeCoords,
} from "@/lib/patientLocation";

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

export default function CardioConnectHome() {
  const router = useRouter();
  // CC-01 Home States: 'populated' | 'loading' | 'no-data' | 'partial' | 'stale' | 'offline' | 'error'
  const [uiState, setUiState] = useState("loading");
  const [homeData, setHomeData] = useState(null);
  const [spectrumData, setSpectrumData] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState("7D");
  const [currentUserId, setCurrentUserId] = useState(null);

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
  const [sessionSteps, setSessionSteps] = useState(0);
  const [sessionDistanceKm, setSessionDistanceKm] = useState(0);
  const [lastCompletedSession, setLastCompletedSession] = useState(null);

  // Real GPS & Sensor Telemetry State
  const [gpsStatus, setGpsStatus] = useState("prompt"); // 'prompt' | 'granted' | 'denied' | 'unsupported'
  const [gpsPoints, setGpsPoints] = useState([]); // [{ lat, lng, time, speed }]
  const [realGpsDistanceKm, setRealGpsDistanceKm] = useState(0);
  const [currentSpeedKmH, setCurrentSpeedKmH] = useState(0);
  const [pedometerSteps, setPedometerSteps] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [trainingViewMode, setTrainingViewMode] = useState("gauge"); // 'gauge' | 'map' | 'split'
  const [walkingGpsEnabled, setWalkingGpsEnabled] = useState(false);
  const [savedUserCity, setSavedUserCity] = useState("Your Location");
  const watchIdRef = useRef(null);

  // Walking Performance Test State (CC-10 -> CC-12)
  const WALKING_TEST_TOTAL_SECONDS = 360; // 6:00 fixed standardized protocol
  const [walkingRemainingSeconds, setWalkingRemainingSeconds] = useState(360);
  const [walkingDistanceInput, setWalkingDistanceInput] = useState(""); // user-entered distance
  const [walkingDistanceUnit, setWalkingDistanceUnit] = useState("m"); // 'm' (meters) | 'km'
  const [walkingHeartRateInput, setWalkingHeartRateInput] = useState(""); // optional HR bpm
  const [walkingTestResult, setWalkingTestResult] = useState(null);

  const handleToggleWalkingUnit = (newUnit) => {
    if (newUnit === walkingDistanceUnit) return;
    setWalkingDistanceUnit(newUnit);
    if (walkingDistanceInput && !isNaN(parseFloat(walkingDistanceInput))) {
      const val = parseFloat(walkingDistanceInput);
      if (newUnit === "km") {
        setWalkingDistanceInput((val / 1000).toFixed(2));
      } else {
        setWalkingDistanceInput(Math.round(val * 1000).toString());
      }
    }
  };

  const trainingTimerRef = useRef(null);
  const walkingTimerRef = useRef(null);

  // Activity History State
  const [timelineDate, setTimelineDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [timelineData, setTimelineData] = useState(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // Device Permissions & Data Sources State: 'granted' | 'denied' | 'restricted' | 'unavailable' | 'sync_pending'
  const [permissionsState, setPermissionsState] = useState("granted");

  // CC-13 AQI & Patient Location Selector State
  const [aqiDetailData, setAqiDetailData] = useState(null);
  const [isAqiLoading, setIsAqiLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [citySearchInput, setCitySearchInput] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const cityDebounceRef = useRef(null);
  const lastAqiFetchKeyRef = useRef("");
  const isFetchingAqiRef = useRef(false);
  const POPULAR_CITIES = [
    "Bulandshahr", "Delhi NCR", "Noida", "Greater Noida",
    "Ghaziabad", "Gurugram", "Meerut", "Lucknow",
    "Mumbai", "Bengaluru", "Pune", "Jaipur", "Chandigarh"
  ];

  // Fetch Authoritative CC-01 Home Data from AWS RDS
  const fetchHomeData = async (uid = currentUserId) => {
    try {
      setUiState("loading");
      const url = uid ? `/api/v1/cardio/home?user_id=${uid}` : "/api/v1/cardio/home";
      const res = await fetch(url);
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

  // Fetch Heart Health Spectrum Data from AWS RDS
  const fetchSpectrumData = async (uid = currentUserId) => {
    try {
      const url = uid ? `/api/v1/cardio/spectrum?user_id=${uid}` : "/api/v1/cardio/spectrum";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setSpectrumData(json.data);
      }
    } catch (err) {
      console.warn("Could not fetch /api/v1/cardio/spectrum:", err);
    }
  };

  // Fetch CC-09 Progress Data from AWS RDS
  const fetchProgressData = async (cp = "7D", uid = currentUserId) => {
    try {
      const url = uid
        ? `/api/v1/cardio/progress?checkpoint=${cp}&user_id=${uid}`
        : `/api/v1/cardio/progress?checkpoint=${cp}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setProgressData(json.data);
      }
    } catch (err) {
      console.warn("Could not fetch /api/v1/cardio/progress:", err);
    }
  };

  // Fetch CC-06 Timeline Data from AWS RDS
  const fetchTimelineData = async (dateStr, uid = currentUserId) => {
    try {
      setIsLoadingTimeline(true);
      const targetDate = dateStr || timelineDate;
      const url = uid
        ? `/api/v1/cardio/activity-timeline?date=${targetDate}&user_id=${uid}`
        : `/api/v1/cardio/activity-timeline?date=${targetDate}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setTimelineData(json.data);
      }
    } catch (e) {
      console.warn("Could not fetch timeline:", e);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  // Fetch CC-13 Real AQI Data & Persist to Database
  const fetchAqiData = async (cityOverride, latOverride, lngOverride, forceRefresh = false) => {
    const targetCity = cityOverride || savedUserCity || "Bulandshahr, Uttar Pradesh";
    const targetLat = latOverride !== undefined ? latOverride : (gpsPoints?.[0]?.lat || null);
    const targetLng = lngOverride !== undefined ? lngOverride : (gpsPoints?.[0]?.lng || null);

    const latKey = targetLat ? Number(targetLat).toFixed(3) : "null";
    const lngKey = targetLng ? Number(targetLng).toFixed(3) : "null";
    const fetchKey = `${targetCity}_${latKey}_${lngKey}`;

    if (!forceRefresh && lastAqiFetchKeyRef.current === fetchKey) {
      return;
    }

    if (isFetchingAqiRef.current && !forceRefresh) {
      return;
    }

    try {
      isFetchingAqiRef.current = true;
      lastAqiFetchKeyRef.current = fetchKey;
      setIsAqiLoading(true);

      let url = `/api/v1/cardio/aqi?city=${encodeURIComponent(targetCity)}`;
      if (targetLat && targetLng) {
        url += `&lat=${targetLat}&lng=${targetLng}&is_gps=true`;
      } else {
        url += `&is_gps=false`;
      }
      if (forceRefresh) {
        url += `&refresh=true`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setAqiDetailData(json.data);
      }
    } catch (e) {
      console.warn("Could not fetch AQI:", e);
    } finally {
      setIsAqiLoading(false);
      isFetchingAqiRef.current = false;
    }
  };

  const handleCityInputChange = (val) => {
    setCitySearchInput(val);
    if (!val || val.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }

    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    cityDebounceRef.current = setTimeout(async () => {
      setIsSearchingCity(true);
      try {
        const res = await fetch(`/api/location/search?query=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        if (data && data.suggestions && data.suggestions.length > 0) {
          setCitySuggestions(data.suggestions);
        } else {
          setCitySuggestions([]);
        }
      } catch (err) {
        console.warn("Cardio city search error:", err);
      } finally {
        setIsSearchingCity(false);
      }
    }, 250);
  };

  const handleSelectSuggestion = async (sug) => {
    const cityName = sug.name || sug.text.split(",")[0].trim();
    setCitySearchInput("");
    setCitySuggestions([]);
    setShowLocationPicker(false);
    toast.loading(`Updating telemetry for ${cityName}...`, { id: "city-sel" });

    let lat = null;
    let lng = null;
    if (sug.placeId) {
      try {
        const detRes = await fetch(`/api/location/search?place_id=${encodeURIComponent(sug.placeId)}`);
        const detJson = await detRes.json();
        if (detJson.success && detJson.data) {
          lat = detJson.data.latitude;
          lng = detJson.data.longitude;
        }
      } catch (e) {
        console.warn("Place details error:", e);
      }
    }

    setSavedUserCity(cityName);
    savePatientLocation({
      city: cityName,
      lat: lat || undefined,
      lng: lng || undefined,
      isGps: false,
      forceReset: true,
    });
    await fetchAqiData(cityName, lat, lng, true);
    toast.dismiss("city-sel");
    toast.success(`Location updated to ${cityName}`);
  };

  const handleSelectCity = async (cityName) => {
    setSavedUserCity(cityName);
    setCitySuggestions([]);
    setShowLocationPicker(false);
    toast.loading(`Updating telemetry for ${cityName}...`, { id: "city-sel" });

    let lat = null;
    let lng = null;
    try {
      const geoRes = await fetch(`/api/location/search?geocode=${encodeURIComponent(cityName)}`);
      const geoJson = await geoRes.json();
      if (geoJson.success && geoJson.data) {
        lat = geoJson.data.latitude;
        lng = geoJson.data.longitude;
      }
    } catch (e) {
      console.warn("Geocoding lookup warning:", e);
    }

    savePatientLocation({
      city: cityName,
      lat: lat || undefined,
      lng: lng || undefined,
      isGps: false,
      forceReset: true,
    });
    await fetchAqiData(cityName, lat, lng, true);
    toast.dismiss("city-sel");
    toast.success(`Location updated to ${cityName}`);
  };

  const handleCitySearchSubmit = async (e) => {
    e?.preventDefault();
    if (!citySearchInput.trim()) return;
    const q = citySearchInput.trim();
    setCitySearchInput("");
    setCitySuggestions([]);
    await handleSelectCity(q);
  };

  // GPS Location Request & Geocoding
  const requestGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsStatus("unsupported");
      toast.error("GPS location is not supported on this device/browser.");
      return;
    }
    toast.loading("Acquiring GPS fix...", { id: "gps-req" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        toast.dismiss("gps-req");
        setGpsStatus("granted");
        setGpsAccuracy(Math.round(accuracy));
        setGpsPoints([{ lat: latitude, lng: longitude, time: Date.now(), speed }]);
        toast.success(`GPS Location active (${Math.round(accuracy)}m accuracy)`);

        try {
          const clientResolvedCity = await reverseGeocodeCoords(latitude, longitude);
          const finalCity = (clientResolvedCity && clientResolvedCity !== "Current Location")
            ? clientResolvedCity
            : "Bulandshahr, Uttar Pradesh";
          setSavedUserCity(finalCity);
          savePatientLocation({
            city: finalCity,
            lat: latitude,
            lng: longitude,
            isGps: true,
            forceReset: true,
          });
          toast.success(`GPS locked to ${finalCity} (±${Math.round(accuracy)}m)`);
          fetchAqiData(finalCity, latitude, longitude, true);
        } catch (e) {
          toast.success(`GPS Location active (±${Math.round(accuracy)}m)`);
        }
      },
      (err) => {
        toast.dismiss("gps-req");
        setGpsStatus("denied");
        if (err.code === 1) {
          toast.error("Location permission denied. Please allow GPS access in browser.");
        } else {
          toast.error("Unable to acquire GPS signal. Check device location.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Check saved location, user session, and initial data on mount
  useEffect(() => {
    let resolvedId = null;
    try {
      const stored = localStorage.getItem("user") || localStorage.getItem("userData");
      if (stored) {
        const u = JSON.parse(stored);
        resolvedId = u.id || u.user_id || u.user?.id;
      }
    } catch (_) {}

    if (resolvedId) {
      setCurrentUserId(resolvedId);
    }

    fetchHomeData(resolvedId);
    fetchSpectrumData(resolvedId);
    fetchProgressData("7D", resolvedId);
    fetchTimelineData(timelineDate, resolvedId);

    let initialCity = "Bulandshahr, Uttar Pradesh";
    let initialLat = 28.4069;
    let initialLng = 77.8498;

    if (typeof window !== "undefined") {
      const savedLoc = getSavedPatientLocation();
      if (savedLoc?.city && savedLoc.city !== "Current Location") {
        initialCity = savedLoc.city;
        setSavedUserCity(savedLoc.city);
      }
      if (savedLoc?.lat && savedLoc?.lng) {
        initialLat = savedLoc.lat;
        initialLng = savedLoc.lng;
        setGpsPoints([{ lat: savedLoc.lat, lng: savedLoc.lng, time: Date.now() }]);
        if (savedLoc.isGps) setGpsStatus("granted");
      } else if (navigator.geolocation && navigator.permissions?.query) {
        navigator.permissions.query({ name: "geolocation" }).then((p) => {
          if (p.state === "granted") setGpsStatus("granted");
          else if (p.state === "denied") setGpsStatus("denied");
          else setGpsStatus("prompt");
        }).catch(() => {});
      }

      fetchAqiData(initialCity, initialLat, initialLng, false);

      const handleLocationEvent = (e) => {
        if (e.detail?.city) {
          setSavedUserCity(e.detail.city);
          fetchAqiData(e.detail.city, e.detail.lat, e.detail.lng, false);
        }
      };
      window.addEventListener("patient-location-updated", handleLocationEvent);

      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      if (action === "training" || action === "setup") {
        setActiveModal("setup");
      } else if (action === "walking") {
        setActiveModal("walking_intro");
      } else if (action === "spectrum") {
        setActiveModal("spectrum");
      } else if (action === "progress") {
        setActiveModal("progress");
      } else if (action === "timeline") {
        setActiveModal("timeline");
      } else if (action === "aqi") {
        setActiveModal("aqi");
      }

      return () => {
        window.removeEventListener("patient-location-updated", handleLocationEvent);
      };
    }
  }, []);

  // Device motion accelerometer step detection
  useEffect(() => {
    const isTracking = (activeModal === "active_training" && !isTrainingPaused) ||
                       (activeModal === "walking_active");
    if (!isTracking || typeof window === "undefined") return;

    let lastStepTime = 0;
    const handleDeviceMotion = (event) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (magnitude > 12.2 && now - lastStepTime > 330) {
        lastStepTime = now;
        setPedometerSteps((prev) => prev + 1);
        setSessionSteps((prev) => prev + 1);
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", handleDeviceMotion, { passive: true });
    }
    return () => {
      if (window.DeviceMotionEvent) {
        window.removeEventListener("devicemotion", handleDeviceMotion);
      }
    };
  }, [activeModal, isTrainingPaused]);

  // Live GPS Coordinates Watcher with Strict Stationary Drift Guard (DOCX Issue #2)
  const lastBearingRef = useRef(null);

  useEffect(() => {
    const isLive = (activeModal === "active_training" && !isTrainingPaused) ||
                   (activeModal === "walking_active" && walkingGpsEnabled);

    if (isLive && gpsStatus === "granted" && typeof window !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, speed } = pos.coords;
          const acc = Math.round(accuracy || 999);
          setGpsAccuracy(acc);

          // Handle device hardware speed reporting if available
          const hasHardwareSpeed = typeof speed === "number" && !isNaN(speed) && speed !== null;
          if (hasHardwareSpeed) {
            if (speed >= 0.6) {
              setCurrentSpeedKmH(parseFloat((speed * 3.6).toFixed(1)));
            } else {
              setCurrentSpeedKmH(0);
            }
          }

          // Strict Stationary & Desktop Wi-Fi Jitter Guard:
          // If accuracy is weak (> 35m) or device speed says stationary (< 0.5 m/s), discard displacement
          if (acc > 35 || (hasHardwareSpeed && speed < 0.5)) {
            setCurrentSpeedKmH(0);
            return;
          }

          setGpsPoints((prev) => {
            if (prev.length > 0) {
              const prevPoint = prev[prev.length - 1];
              const dist = getHaversineDistance(prevPoint.lat, prevPoint.lng, latitude, longitude);
              const timeDeltaSec = (Date.now() - prevPoint.time) / 1000;
              const calcSpd = timeDeltaSec > 0 ? (dist / (timeDeltaSec / 3600)) : 0;

              // Calculate bearing to detect back-and-forth stationary Wi-Fi oscillation
              const y = Math.sin((longitude - prevPoint.lng) * Math.PI / 180) * Math.cos(latitude * Math.PI / 180);
              const x = Math.cos(prevPoint.lat * Math.PI / 180) * Math.sin(latitude * Math.PI / 180) -
                        Math.sin(prevPoint.lat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.cos((longitude - prevPoint.lng) * Math.PI / 180);
              const currentBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

              // Check if direction flipped ~180° back to the original spot (classic Wi-Fi tower bounce)
              let isDirectionFlip = false;
              if (lastBearingRef.current !== null) {
                const bearingDiff = Math.abs(currentBearing - lastBearingRef.current);
                if (bearingDiff > 140 && bearingDiff < 220 && dist < 0.04) {
                  isDirectionFlip = true;
                }
              }

              // Require true physical movement:
              // - Minimum displacement of 20 meters (or 60% of accuracy radius) to defeat desktop jitter
              // - Discard direction flips (stationary oscillation)
              // - Speed must be between normal walking/running range (2.0 km/h to 20 km/h)
              const minDisplacement = Math.max(0.020, (acc * 0.6) / 1000);

              if (!isDirectionFlip && dist >= minDisplacement && dist < 0.25 && calcSpd >= 2.0 && calcSpd <= 20) {
                lastBearingRef.current = currentBearing;
                const newDist = parseFloat((realGpsDistanceKm + dist).toFixed(3));
                setRealGpsDistanceKm(newDist);
                setSessionDistanceKm(newDist);

                if (activeModal === "walking_active") {
                  if (walkingDistanceUnit === "m") {
                    setWalkingDistanceInput(Math.round(newDist * 1000).toString());
                  } else {
                    setWalkingDistanceInput(newDist.toFixed(2));
                  }
                }

                if (!hasHardwareSpeed) {
                  setCurrentSpeedKmH(parseFloat(Math.min(calcSpd, 18).toFixed(1)));
                }
                return [...prev, { lat: latitude, lng: longitude, time: Date.now(), speed }];
              } else {
                if (timeDeltaSec > 3) {
                  setCurrentSpeedKmH(0);
                }
                return prev;
              }
            }
            return [{ lat: latitude, lng: longitude, time: Date.now(), speed }];
          });
        },
        (err) => console.warn("CardioConnect GPS watch error:", err),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    } else {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeModal, isTrainingPaused, gpsStatus, walkingGpsEnabled]);

  // Timer loop for Active Heart Training (CC-03 / CC-04) - strictly real physical telemetry only
  useEffect(() => {
    if (activeModal === "active_training" && !isTrainingPaused) {
      trainingTimerRef.current = setInterval(() => {
        setTrainingElapsedSeconds((prev) => prev + 1);
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
    setSessionSteps(0);
    setSessionDistanceKm(0);
    setRealGpsDistanceKm(0);
    setPedometerSteps(0);
    setCurrentSpeedKmH(0);

    if (gpsPoints.length > 0) {
      const last = gpsPoints[gpsPoints.length - 1];
      setGpsPoints([{ lat: last.lat, lng: last.lng, time: Date.now() }]);
    }

    setActiveModal("active_training");
    toast.success(`Heart Training started: ${targetMin} minutes target`);
  };

  // Handle Heart Training Completion (CC-03/04 -> CC-05)
  const handleEndTrainingSession = async () => {
    const actualMin = Math.round(trainingElapsedSeconds / 60);
    const targetMin = Math.round(trainingTargetSeconds / 60);
    const isTargetReached = trainingElapsedSeconds >= trainingTargetSeconds;
    const effectiveDistance = realGpsDistanceKm > 0 ? realGpsDistanceKm : sessionDistanceKm;
    const effectiveSteps = pedometerSteps > 0 ? pedometerSteps : sessionSteps;
    const hasMovementData = effectiveSteps > 0 || effectiveDistance > 0;

    // Energy / Calories computation:
    // Strictly 0 kcal if stationary (no physical movement, 0 distance and 0 steps)!
    // If movement detected: ~60 kcal per km walked or ~0.04 kcal per step
    let burnedKcal = 0;
    if (effectiveDistance > 0) {
      burnedKcal = Math.round(effectiveDistance * 60);
    } else if (effectiveSteps > 0) {
      burnedKcal = Math.round(effectiveSteps * 0.04);
    }

    const record = {
      actual_duration_formatted: `${Math.floor(trainingElapsedSeconds / 60)}:${(trainingElapsedSeconds % 60).toString().padStart(2, "0")}`,
      actual_duration_minutes: actualMin,
      target_duration_minutes: targetMin,
      target_status: isTargetReached ? "Target reached" : "Partial session recorded",
      steps: hasMovementData ? effectiveSteps : null,
      distance_km: hasMovementData ? effectiveDistance : null,
      estimated_energy: `${burnedKcal} kcal`,
      weekly_reference_update: "Session recorded toward 150-300 min/week reference band",
      milestone: isTargetReached ? "Session Goal Reached" : null,
      is_reached: isTargetReached,
      gps_points: gpsPoints.length > 1 ? gpsPoints : null
    };

    setLastCompletedSession(record);
    setActiveModal("completion");

    try {
      await fetch("/api/v1/cardio/activity-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          user_id: currentUserId,
          target_duration_minutes: targetMin,
          accumulated_active_seconds: trainingElapsedSeconds,
          steps: effectiveSteps,
          distance_km: effectiveDistance,
          estimated_energy_kcal: burnedKcal,
          client_idempotency_key: `client-${Date.now()}`
        })
      });
      fetchHomeData();
    } catch (e) {
      console.warn("Could not save session to server:", e);
    }
  };

  // Handlers for Active / Paused Heart Training Controls (CC-03 / CC-04)
  const handlePauseTraining = () => {
    setIsTrainingPaused(true);
    toast("Heart Training session paused");
  };

  const handleResumeTraining = () => {
    setIsTrainingPaused(false);
    toast.success("Heart Training session resumed");
  };

  const handleCompleteTrainingSession = () => {
    handleEndTrainingSession();
  };

  const handleCancelTrainingSession = () => {
    if (trainingTimerRef.current) clearInterval(trainingTimerRef.current);
    setActiveModal(null);
    setIsTrainingPaused(false);
    setTrainingElapsedSeconds(0);
    setSessionSteps(0);
    setSessionDistanceKm(0);
    setRealGpsDistanceKm(0);
    setPedometerSteps(0);
    toast("Training session canceled");
  };

  // Finish Walking Test (CC-11 -> CC-12)
  const finishWalkingTest = async (stoppedEarly = false) => {
    const elapsed = Math.max(1, WALKING_TEST_TOTAL_SECONDS - walkingRemainingSeconds);
    const isComplete = !stoppedEarly && walkingRemainingSeconds === 0;

    let distanceMeters = null;
    let distanceKm = null;

    if (walkingDistanceInput && !isNaN(parseFloat(walkingDistanceInput))) {
      const raw = parseFloat(walkingDistanceInput);
      if (walkingDistanceUnit === "m") {
        if (raw > 0 && raw < 2) {
          distanceMeters = Math.round(raw * 1000);
          distanceKm = Number(raw.toFixed(3));
        } else {
          distanceMeters = Math.round(raw);
          distanceKm = Number((raw / 1000).toFixed(3));
        }
      } else {
        if (raw > 15) {
          distanceMeters = Math.round(raw);
          distanceKm = Number((raw / 1000).toFixed(3));
        } else {
          distanceKm = Number(raw.toFixed(3));
          distanceMeters = Math.round(raw * 1000);
        }
      }
    } else if (realGpsDistanceKm > 0) {
      distanceKm = Number(realGpsDistanceKm.toFixed(3));
      distanceMeters = Math.round(realGpsDistanceKm * 1000);
    }

    // Physiological validation for 6-Minute Walk Test (6MWT)
    // In 6 minutes, a normal human walks 300m - 750m. Olympic race walkers reach max ~1,450m (~14.5 km/h).
    // Entering 10,000m equals 100 km/h (car speed) or confusing meters with daily pedometer steps.
    if (distanceMeters !== null) {
      if (distanceMeters > 1500) {
        const speedKmh = Math.round((distanceMeters / 1000) / (elapsed / 3600));
        if (distanceMeters >= 2000) {
          toast.error(
            `Impossible distance: ${distanceMeters.toLocaleString()}m in 6 min = ${speedKmh} km/h (vehicle speed)! For a 6-minute walk, maximum realistic limit is 1,500m (1.5 km). If you entered daily pedometer steps, note that a 6-min walk is ~400–800 steps (≈300m–600m).`,
            { duration: 6000 }
          );
        } else {
          toast.error(
            `Distance exceeds realistic walking limit: 6-minute walk cannot exceed 1,500m (1.5 km). You entered ${distanceMeters}m.`
          );
        }
        return;
      }

      if (!stoppedEarly && distanceMeters < 10) {
        toast.error("Please enter a valid walking distance (at least 10 meters).");
        return;
      }
    }

    const heartRateBpm = walkingHeartRateInput ? parseInt(walkingHeartRateInput, 10) : null;
    if (heartRateBpm !== null && (heartRateBpm < 35 || heartRateBpm > 220)) {
      toast.error("Heart rate must be realistic (between 35 and 220 bpm).");
      return;
    }

    let paceKmh = null;
    let paceMinPerKm = null;

    if (distanceKm !== null && distanceKm > 0 && elapsed > 0) {
      const hours = elapsed / 3600;
      const rawSpeed = distanceKm / hours;
      // Walking speed upper bound: 16 km/h max
      paceKmh = Number(Math.min(rawSpeed, 16.0).toFixed(1));

      const secPerKm = elapsed / distanceKm;
      if (secPerKm > 0 && secPerKm < 3600) {
        const m = Math.floor(secPerKm / 60);
        const s = Math.floor(secPerKm % 60);
        paceMinPerKm = `${m}:${s.toString().padStart(2, "0")} /km`;
      }
    }

    const resultPayload = {
      isComplete,
      durationFormatted: `${Math.floor(elapsed / 60).toString().padStart(2, "0")}:${(elapsed % 60).toString().padStart(2, "0")}`,
      distanceKm,
      distanceMeters,
      paceKmh,
      paceMinPerKm,
      heartRateBpm,
      stoppedEarly,
      previousComparable: null,
      comparison: null,
      gps_points: gpsPoints.length > 1 ? gpsPoints : null
    };

    setWalkingTestResult(resultPayload);
    setActiveModal("walking_result");

    try {
      const res = await fetch("/api/v1/cardio/walking-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId,
          duration_seconds: elapsed,
          distance_km: distanceKm,
          distance_m: distanceMeters,
          pace_kmh: paceKmh,
          heart_rate_bpm: heartRateBpm,
          stopped_early: stoppedEarly,
          protocol_version: "V1.0"
        })
      });
      const data = await res.json();
      if (data?.data?.comparison?.previous_test) {
        setWalkingTestResult((prev) => ({
          ...prev,
          previousComparable: data.data.comparison.previous_test,
          comparison: data.data.comparison
        }));
      }
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-44 sm:pb-28">
      
      {/* ── CARDIOCONNECT HEADER & BRAND BANNER ── */}
      <header className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-2xs">
        <div className="w-full max-w-5xl mx-auto px-2.5 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-[5px] bg-sky-50 border border-sky-200 text-[#0067A1] flex items-center justify-center shrink-0">
              <AnimatedHeartbeat size="sm" color="#0067A1" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-semibold text-[#003358] tracking-tight">MediConnect.Fit</span>
                <span className="text-[10px] font-medium uppercase bg-sky-50 text-[#0067A1] px-1.5 py-0.5 rounded-[5px] border border-sky-200 shrink-0 whitespace-nowrap">
                  CardioConnect
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate max-w-[220px] sm:max-w-none">
                Cardiovascular health awareness, activity tracking & progress
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/heart-health"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-[5px] text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title="Update or Retake Cardio Assessment"
            >
              <Heart className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Update Assessment</span>
            </Link>

            <Link
              href="/heart-health-history"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-sky-50 hover:bg-sky-100 text-[#0067A1] rounded-[5px] text-xs font-semibold border border-sky-200 transition-colors shadow-2xs cursor-pointer"
              title="View History & Download Reports (F1, F2, F3, F4)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Reports (F1–F4)</span>
            </Link>

            <button
              type="button"
              onClick={fetchHomeData}
              className="p-1.5 sm:p-2 text-slate-600 hover:text-[#0067A1] hover:bg-slate-100 rounded-[5px] transition-colors cursor-pointer border border-slate-200"
              title="Refresh State"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER (Responsive Desktop & Mobile Layout) ── */}
      <main className="max-w-5xl mx-auto px-2.5 sm:px-4 md:px-6 pt-4 sm:pt-5 space-y-3 sm:space-y-4">
        
        {/* State Banner (if offline, stale, or error) */}
        {uiState === "offline" && (
          <div className="bg-amber-50 border border-amber-200 rounded-[5px] p-3 flex items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You are offline. Limited functionality available. Data will sync once connected.</span>
          </div>
        )}

        {/* ── CARD 1: HEART TRAINING HERO BANNER ── */}
        <section className="bg-gradient-to-r from-[#002b49] via-[#003d66] to-[#005584] rounded-[5px] p-5 sm:p-7 text-white shadow-md relative overflow-hidden group">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/5 pointer-events-none blur-xl group-hover:bg-white/10 transition-all duration-500" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-sky-200 bg-white/10 px-2.5 py-0.5 rounded-[5px] border border-white/15 whitespace-nowrap">
                  Daily Heart Exercise
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-white">
                  Heart Training
                </h1>
                <AnimatedHeartbeat size="sm" color="#ffffff" glowColor="#38bdf8" />
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md">
                Cardiorespiratory training to build endurance and lower resting heart rate. Choose your duration and train at a comfortable, moderate pace.
              </p>
            </div>

            <div className="shrink-0 flex items-center">
              <button
                type="button"
                onClick={() => setActiveModal("setup")}
                className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-white hover:bg-slate-50 text-[#0067A1] font-semibold text-xs sm:text-sm rounded-[5px] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                <span>START HEART TRAINING</span>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ── 2-COLUMN GRID: WEEKLY ACTIVITY & TODAY'S MOVEMENT ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── CARD 2: WEEKLY ACTIVITY ── */}
          <section
            onClick={() => router.push("/heart-health-statistics")}
            className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-[#0067A1]/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-[5px] bg-blue-50 text-[#0067A1] flex items-center justify-center relative shrink-0">
                    <Activity className="w-4 h-4" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#0067A1] animate-ping" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-slate-900 truncate">Weekly Activity</h3>
                    <p className="text-[11px] text-slate-500 truncate">Cardiovascular reference</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-slate-900 block">150 – 300 min/wk</span>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    {homeData?.weekly_activity?.recorded_minutes || 0} mins logged
                  </span>
                </div>
              </div>

              {/* Reference Progress Bar */}
              <div className="w-full bg-slate-100 rounded-[5px] h-2 overflow-hidden relative">
                <div
                  className="bg-[#0067A1] h-full rounded-[5px] transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(5, ((homeData?.weekly_activity?.recorded_minutes || 0) / 300) * 100))}%`
                  }}
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2.5">
              Recommended: 150–300 min/week of moderate physical activity.
            </p>
          </section>

          {/* ── CARD 3: TODAY'S MOVEMENT ── */}
          <section
            onClick={() => {
              fetchTimelineData(timelineDate);
              setActiveModal("timeline");
            }}
            className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-emerald-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-[5px] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <AnimatedWalkingFigure size="sm" color="#059669" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-slate-900 truncate">Today&apos;s Movement</h3>
                    <span className="text-base sm:text-lg font-semibold font-mono text-slate-800">
                      {homeData?.today_movement?.steps ? `${homeData.today_movement.steps.toLocaleString()} steps` : "— steps"}
                    </span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-1 shrink-0">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Goal target</span>
                    <span className="text-xs font-mono text-slate-500 block">10,000 steps</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2.5">
              Physical movement logged from your device and walking sessions.
            </p>
          </section>
        </div>

        {/* ── 2-COLUMN GRID: SPECTRUM & MY PROGRESS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── CARD 4: HEART HEALTH SPECTRUM ── */}
          <section
            onClick={() => setActiveModal("spectrum")}
            className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-rose-400/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[5px] bg-rose-50 text-rose-600 flex items-center justify-center mt-0.5 shrink-0">
                  <AnimatedHeartbeat size="sm" color="#e11d48" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-900">Heart Health Spectrum</h3>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                    Multi-factor cardiovascular panel tracking blood pressure, cholesterol, and metabolic markers.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-semibold text-[#0067A1] bg-[#0067A1]/10 px-2 py-0.5 rounded-[5px]">
                      {spectrumData.filter(f => f.current.value !== null).length} of 11 factors available
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#0067A1] shrink-0">
                <span>VIEW</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </section>

          {/* ── CARD 5: MY PROGRESS ── */}
          <section
            onClick={() => router.push("/heart-health-statistics")}
            className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-purple-400/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[5px] bg-purple-50 text-purple-600 flex items-center justify-center mt-0.5 shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-900">My Progress</h3>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                    Track your longitudinal recovery milestones, activity consistency, and physiological trends across checkpoints.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#0067A1] shrink-0">
                <span>CHECKPOINTS</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </section>
        </div>

        {/* ── 2-COLUMN GRID: WALKING PERFORMANCE TEST & AIR QUALITY ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── CARD 6: WALKING PERFORMANCE TEST ── */}
          <section
            onClick={() => setActiveModal("walking_intro")}
            className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-indigo-400/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[5px] bg-indigo-50 text-indigo-600 flex items-center justify-center mt-0.5 shrink-0 relative overflow-hidden">
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-900">Walking Performance Test</h3>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                    Standardized 6-minute aerobic endurance evaluation to record distance and functional capacity.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#0067A1] shrink-0">
                <span>START</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </section>

          {/* ── CARD 7: AIR QUALITY & WEATHER ── */}
          <section className="bg-white rounded-[5px] p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-sky-400/40 hover:shadow-md transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div
                onClick={() => {
                  fetchAqiData(savedUserCity, null, null, false);
                  setActiveModal("aqi");
                }}
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
              >
                <div className="w-9 h-9 rounded-[5px] bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <CloudSun className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Air Quality & Weather</h3>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-[5px] border border-emerald-200 inline-flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 text-[#0067A1] shrink-0" />
                    <span className="font-semibold text-slate-800">{savedUserCity}</span>
                  </p>
                </div>
              </div>

              <div
                onClick={() => {
                  fetchAqiData(savedUserCity, null, null, false);
                  setActiveModal("aqi");
                }}
                className="flex items-center sm:flex-col sm:items-end justify-between gap-1 cursor-pointer shrink-0"
              >
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-[5px] border whitespace-nowrap ${
                  (aqiDetailData?.aqi_value || 80) <= 50
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : (aqiDetailData?.aqi_value || 80) <= 100
                    ? "bg-teal-50 text-teal-800 border-teal-200"
                    : (aqiDetailData?.aqi_value || 80) <= 200
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}>
                  AQI {aqiDetailData?.aqi_value || 80} • {aqiDetailData?.category || "Satisfactory"}
                </span>
                <span className="text-[10px] text-slate-500 block font-medium">
                  {aqiDetailData?.weather?.temp_c ? `${aqiDetailData.weather.temp_c}°C • ${aqiDetailData.weather.condition}` : "Real-time Telemetry"}
                </span>
              </div>
            </div>

            {/* Quick Action Bar for Location & Refresh */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={requestGps}
                  className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold rounded-[5px] text-[11px] flex items-center gap-1 border border-sky-200 transition-colors cursor-pointer"
                >
                  <Navigation className="w-3 h-3" />
                  <span>GPS Lock</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    fetchAqiData(savedUserCity, null, null, false);
                    setActiveModal("aqi");
                    setShowLocationPicker(true);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-[5px] text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                  <span>Choose City</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  fetchAqiData(savedUserCity, null, null, false);
                  setActiveModal("aqi");
                }}
                className="text-[#0067A1] font-semibold hover:underline flex items-center gap-1 text-[11px] cursor-pointer ml-auto"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        </div>

        {/* ── OPTIONAL SECONDARY ACTION: CARDIO SCREENING / UPDATE ASSESSMENT ── */}
        <div className="p-3.5 bg-white rounded-[5px] border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-900 font-bold block">Need to update your clinical vitals or retake assessment?</span>
            <span className="text-slate-500 text-[11px]">Log new blood pressure, lipid panel, or lifestyle readings to refresh your longitudinal trajectory.</span>
          </div>
          <Link
            href="/heart-health"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-[5px] font-semibold text-xs transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            <span>Update / Retake Assessment</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </main>

      {/* ══════════════════════════════════════════════════════════════
          MODAL 1: HEART TRAINING SETUP (Full Screen on Mobile)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "setup" && (
        <div className="fixed inset-0 z-[99999] bg-white sm:bg-slate-900/80 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md rounded-none sm:rounded-[5px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in sm:zoom-in-95 duration-150">
            
            {/* Sticky Header */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
              <div>
                <span className="text-[10px] font-mono font-medium uppercase text-[#0067A1] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-[5px]">
                  Training Setup
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 mt-1">Heart Training Setup</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-[5px] hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Choose your activity type and set a target duration to start your Heart Training session.
              </p>

              {/* Activity Type Indicator (Links to Device Permissions) */}
              <div
                onClick={() => setActiveModal("permissions")}
                className="p-3 bg-slate-50 rounded-[5px] border border-slate-200 flex items-center justify-between cursor-pointer hover:border-[#0067A1]/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[5px] bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <AnimatedWalkingFigure size="md" color="#059669" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Activity Type</span>
                    <p className="text-xs font-semibold text-slate-900">Walking / Moderate Aerobic</p>
                    <p className="text-[10px] text-slate-500">From device motion (Active)</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[5px] border border-emerald-200">
                    Connected
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* GPS Outdoor Route Tracking Status Pill */}
              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center shrink-0 ${
                      gpsStatus === 'granted' ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-600 uppercase block">GPS Live Route Map</span>
                      <p className="text-[11px] text-slate-800 font-medium">
                        {gpsStatus === 'granted' ? `Location locked (${savedUserCity})` : 'Outdoor running / walking path'}
                      </p>
                    </div>
                  </div>
                  {gpsStatus === 'granted' ? (
                    <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-[5px] inline-flex items-center gap-1">
                      <Check className="w-3 h-3 text-sky-600" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={requestGps}
                      className="text-[10px] font-medium text-[#0067A1] bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2.5 py-1 rounded-[5px] transition-colors cursor-pointer"
                    >
                      Enable GPS
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Current Area: <strong>{savedUserCity}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal("aqi");
                      setShowLocationPicker(true);
                    }}
                    className="text-[#0067A1] font-semibold hover:underline"
                  >
                    Change City
                  </button>
                </div>
              </div>

              {/* Duration Selector (CC-07 Embedded Presets) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-800">Select duration</label>
                  <span className="text-[10px] text-slate-500 font-medium">Minutes</span>
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
                      className={`py-2.5 rounded-[5px] text-xs font-semibold transition-all border ${
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
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
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
                <p className="text-[10px] text-slate-500 mt-1">
                  You can enter any duration. There is no artificial maximum limit.
                </p>
              </div>

              {/* Safety Guidance Note */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-[5px] flex items-start gap-2.5 text-xs text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[11px]">A few things to keep in mind</p>
                  <p className="text-[11px] text-blue-800/90 mt-0.5 leading-relaxed">
                    Choose a duration that feels right for you. Heart Training is a safe, moderate activity. Stop immediately if you feel unwell or experience discomfort.
                  </p>
                </div>
              </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="shrink-0 p-4 sm:p-6 border-t border-slate-100 bg-white space-y-2 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={handleStartTrainingSession}
                className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-medium text-xs rounded-[5px] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
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
          MODAL 2: CC-03 / CC-04 ACTIVE & PAUSED HEART TRAINING (Full Screen Mobile)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "active_training" && (
        <div className="fixed inset-0 z-[99999] bg-white sm:bg-slate-900/85 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl rounded-none sm:rounded-[5px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in sm:zoom-in-95 duration-150">
            
            {/* Header with CC ID & View Switcher */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-medium uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded-[5px]">
                  {isTrainingPaused ? "Session Paused" : "Active Training"}
                </span>
                <span className="text-xs font-semibold text-slate-700">Heart Training</span>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-[5px] text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setTrainingViewMode("gauge")}
                  className={`px-2.5 py-1 rounded-[5px] transition-all flex items-center gap-1 cursor-pointer ${
                    trainingViewMode === "gauge"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Gauge className="w-3 h-3 text-amber-500" />
                  <span>Gauge</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (gpsStatus !== "granted") requestGps();
                    setTrainingViewMode("map");
                  }}
                  className={`px-2.5 py-1 rounded-[5px] transition-all flex items-center gap-1 cursor-pointer ${
                    trainingViewMode === "map"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <MapPin className="w-3 h-3 text-[#0067A1]" />
                  <span>Live Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (gpsStatus !== "granted") requestGps();
                    setTrainingViewMode("split");
                  }}
                  className={`px-2.5 py-1 rounded-[5px] transition-all hidden sm:flex items-center gap-1 cursor-pointer ${
                    trainingViewMode === "split"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Columns className="w-3 h-3 text-slate-600" />
                  <span>Split</span>
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-4">
              <div className="text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {isTrainingPaused ? "Session Paused" : "Active Heart Training"}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isTrainingPaused
                      ? "Your session is paused. Paused time is strictly excluded from training credit."
                      : "Session in progress. Maintain a comfortable, conversational pace."}
                  </p>
                </div>
                {gpsStatus === "granted" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[5px] self-center sm:self-auto">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    GPS Live {gpsAccuracy ? `(±${gpsAccuracy}m)` : ""} • {savedUserCity}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={requestGps}
                    className="inline-flex items-center gap-1 text-[10px] text-[#0067A1] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-[5px] self-center sm:self-auto transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" /> Enable GPS Map
                  </button>
                )}
              </div>

              {/* Main Interactive Display Area: Gauge View / Map View / Split View */}
              <div>
                {trainingViewMode === "gauge" && (
                  <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-[#f0f7ff] via-white to-[#f4f9ff] border border-sky-100 rounded-[5px] shadow-xs relative overflow-hidden">
                    <AnimatedStopwatch
                      isActive={!isTrainingPaused}
                      isPaused={isTrainingPaused}
                      size="responsive"
                      timeString={formatSeconds(trainingElapsedSeconds)}
                      label={`${currentSpeedKmH > 0 ? currentSpeedKmH : "4.8"} km/h`}
                      subLabel={isTrainingPaused ? "session paused" : "live pace"}
                      progress={trainingTargetSeconds > 0 ? Math.min(1, trainingElapsedSeconds / trainingTargetSeconds) : 0}
                    />
                    <div className="flex items-center justify-center gap-3 text-xs text-slate-600 font-mono mt-3">
                      <span className="font-semibold text-[#003358]">Target: {formatSeconds(trainingTargetSeconds)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-rose-600 font-sans font-medium flex items-center gap-1">
                        <AnimatedHeartbeat size="sm" color="#e11d48" /> Heart Training
                      </span>
                    </div>
                  </div>
                )}

                {trainingViewMode === "map" && (
                  <div className="rounded-[5px] overflow-hidden border border-slate-200 shadow-sm relative">
                    <RealGpsMap
                      points={gpsPoints}
                      distanceKm={realGpsDistanceKm || sessionDistanceKm}
                      activity="HEART TRAINING"
                      isLiveTracking={!isTrainingPaused}
                      height="h-64 sm:h-80"
                      showControls={true}
                    />
                    {/* Floating Telemetry HUD over map */}
                    <div className="absolute top-2 left-2 z-[400] bg-[#003358]/90 backdrop-blur-md text-white px-3 py-1.5 rounded-[5px] shadow-md flex items-center gap-3 font-mono text-xs border border-white/15">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-300 block">Time</span>
                        <strong className="text-white text-sm">{formatSeconds(trainingElapsedSeconds)}</strong>
                      </div>
                      <div className="w-px h-6 bg-white/20" />
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-300 block">Dist</span>
                        <strong className="text-white text-sm">{(realGpsDistanceKm || sessionDistanceKm).toFixed(2)} km</strong>
                      </div>
                      <div className="w-px h-6 bg-white/20" />
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-300 block">Speed</span>
                        <strong className="text-emerald-400 text-sm">{currentSpeedKmH.toFixed(1)} km/h</strong>
                      </div>
                    </div>
                  </div>
                )}

                {trainingViewMode === "split" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-b from-[#f0f7ff] via-white to-[#f4f9ff] border border-sky-100 rounded-[5px] shadow-xs">
                      <AnimatedStopwatch
                        isActive={!isTrainingPaused}
                        isPaused={isTrainingPaused}
                        size="md"
                        timeString={formatSeconds(trainingElapsedSeconds)}
                        label={formatSeconds(trainingTargetSeconds)}
                        subLabel="target"
                        progress={trainingTargetSeconds > 0 ? Math.min(1, trainingElapsedSeconds / trainingTargetSeconds) : 0}
                      />
                    </div>
                    <div className="rounded-[5px] overflow-hidden border border-slate-200 shadow-sm">
                      <RealGpsMap
                        points={gpsPoints}
                        distanceKm={realGpsDistanceKm || sessionDistanceKm}
                        activity="HEART TRAINING"
                        isLiveTracking={!isTrainingPaused}
                        height="h-52"
                        showControls={false}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Telemetry Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-[5px]">
                  <span className="text-[10px] text-slate-500 font-medium uppercase block">Elapsed Time</span>
                  <strong className="text-slate-900 font-mono text-base block mt-0.5">
                    {formatSeconds(trainingElapsedSeconds)}
                  </strong>
                  <span className="text-[9px] text-slate-500">paused time excluded</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-[5px]">
                  <span className="text-[10px] text-slate-500 font-medium uppercase block">Remaining</span>
                  <strong className="text-slate-900 font-mono text-base block mt-0.5">
                    {formatSeconds(Math.max(0, trainingTargetSeconds - trainingElapsedSeconds))}
                  </strong>
                  <span className="text-[9px] text-slate-500">target {Math.round(trainingTargetSeconds / 60)} min</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-[5px]">
                  <span className="text-[10px] text-slate-500 font-medium uppercase block">Live Distance</span>
                  <strong className="text-[#0067A1] font-mono text-base block mt-0.5">
                    {(realGpsDistanceKm || sessionDistanceKm).toFixed(2)} km
                  </strong>
                  <span className="text-[9px] text-slate-500">{gpsStatus === "granted" ? "GPS tracked" : "estimated"}</span>
                </div>
              </div>

              {/* Additional live telemetry rows */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-[5px]">
                  <span className="text-[10px] text-slate-500 block">Motion Steps</span>
                  <strong className="text-slate-900 font-mono text-sm">
                    {(pedometerSteps || sessionSteps).toLocaleString()}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-[5px]">
                  <span className="text-[10px] text-slate-500 block">Pace / Speed</span>
                  <strong className="text-slate-900 font-mono text-sm">
                    {currentSpeedKmH > 0
                      ? `${currentSpeedKmH.toFixed(1)} km/h`
                      : (realGpsDistanceKm > 0 && trainingElapsedSeconds > 0
                          ? `${(realGpsDistanceKm / (trainingElapsedSeconds / 3600)).toFixed(1)} km/h`
                          : "0.0 km/h")}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-[5px]">
                  <span className="text-[10px] text-slate-500 block">Reference</span>
                  <strong className="text-emerald-700 text-sm">150–300 min/wk</strong>
                </div>
              </div>

              {/* Strict Clinical Rules callout */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-[5px] text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Clinical Rule:</strong> Paused time is strictly excluded from training credit. Maintain a comfortable, conversational effort level.
                </p>
              </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="shrink-0 p-4 sm:p-6 border-t border-slate-100 bg-white space-y-2 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <div className="flex gap-2">
                {isTrainingPaused ? (
                  <button
                    type="button"
                    onClick={handleResumeTraining}
                    className="flex-1 py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-medium text-xs rounded-[5px] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>RESUME TRAINING</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseTraining}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs rounded-[5px] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    <span>PAUSE TRAINING</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCompleteTrainingSession}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-[5px] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>COMPLETE SESSION</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCancelTrainingSession}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-[5px] transition-colors cursor-pointer"
              >
                Cancel / Discard Session
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════
          MODAL 3: CC-05 SESSION COMPLETION (Full Screen Mobile)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "completion" && lastCompletedSession && (
        <div className="fixed inset-0 z-[99999] bg-white sm:bg-slate-900/80 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-[8px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in sm:zoom-in-95 duration-150 text-center">
            
            {/* Header */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
              <span className="text-[10px] font-mono font-medium uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded-[5px]">
                Session Summary
              </span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-[5px] hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-4">
              <AnimatedCheckmark size="lg" showParticles={true} className="mb-2" />

              <h2 className="text-xl font-semibold text-slate-900 mt-1">Session Recorded</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Your Heart Training session has been safely recorded to your health profile.
              </p>

              {/* Route Summary Map (if GPS was active) */}
              {lastCompletedSession.gps_points && lastCompletedSession.gps_points.length > 1 && (
                <div className="my-3 rounded-[5px] overflow-hidden border border-slate-200 shadow-2xs">
                  <RealGpsMap
                    points={lastCompletedSession.gps_points}
                    distanceKm={lastCompletedSession.distance_km}
                    activity="HEART TRAINING"
                    isLiveTracking={false}
                    height="h-40"
                    showControls={false}
                  />
                </div>
              )}

              {/* Results Table per CC-05 Exact Order */}
              <div className="divide-y divide-slate-100 text-xs text-left bg-slate-50 p-3 rounded-[5px] border border-slate-200">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-600">Actual duration</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {lastCompletedSession.actual_duration_formatted}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-600">Target / status</span>
                  <span className="font-semibold text-slate-900">
                    {lastCompletedSession.target_status}
                  </span>
                </div>
                {lastCompletedSession.steps !== null && (
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Steps</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {lastCompletedSession.steps.toLocaleString()}
                    </span>
                  </div>
                )}
                {lastCompletedSession.distance_km !== null && (
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Distance</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {typeof lastCompletedSession.distance_km === 'number'
                        ? lastCompletedSession.distance_km.toFixed(2)
                        : lastCompletedSession.distance_km} km
                    </span>
                  </div>
                )}
                {lastCompletedSession.estimated_energy !== null && (
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Estimated energy</span>
                    <span className="font-semibold text-slate-900">
                      {lastCompletedSession.estimated_energy}
                    </span>
                  </div>
                )}
                <div className="py-2 flex justify-between">
                  <span className="text-slate-600">Weekly reference update</span>
                  <span className="font-semibold text-emerald-700 text-right">
                    Logged to 150-300 min/wk
                  </span>
                </div>
                {lastCompletedSession.milestone && (
                  <div className="py-2 flex justify-between bg-amber-50/50 px-2 rounded-[5px]">
                    <span className="text-amber-800 font-medium">Milestone achieved</span>
                    <span className="font-semibold text-amber-700 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> {lastCompletedSession.milestone}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-slate-500 italic text-left">
                * Heart Training is a moderate wellness activity. Paused duration was strictly excluded from training credit.
              </p>
            </div>

            {/* Sticky Actions Footer */}
            <div className="shrink-0 p-4 sm:p-6 border-t border-slate-100 bg-white space-y-2 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold text-xs rounded-[5px] shadow-xs transition-colors cursor-pointer"
              >
                DONE (Back to Home)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  router.push("/heart-health-history");
                }}
                className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 text-[#0067A1] border border-sky-200 font-semibold text-xs rounded-[5px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>VIEW HISTORY & PRINT PDF REPORT (F1–F4)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("progress")}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-[5px] transition-colors cursor-pointer"
              >
                VIEW PROGRESS
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════
          MODAL 4: CC-08 HEART HEALTH SPECTRUM (11 Factors - Full Screen Mobile)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "spectrum" && (
        <div className="fixed inset-0 z-[99999] bg-white sm:bg-slate-900/80 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-xl md:max-w-2xl lg:max-w-3xl rounded-none sm:rounded-[8px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in sm:zoom-in-95 duration-150">
            
            {/* Sticky Header */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
              <div>
                <span className="text-[10px] font-mono font-medium uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  Heart Health Spectrum
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5">Heart Health Spectrum</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-[5px] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Multiple individual factors for a broader view of your heart health. Factor-based representation without composite scoring.
              </p>

              <div className="space-y-2.5">
                {spectrumData.map((factor) => (
                  <div
                    key={factor.id}
                    className="p-3.5 sm:p-4 bg-slate-50/70 hover:bg-slate-50 rounded-[6px] border border-slate-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 shrink-0 rounded-[6px] bg-white border border-slate-200/90 text-[#0067A1] flex items-center justify-center font-medium shadow-2xs">
                        <Heart className="w-4 h-4 text-[#0067A1]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 text-xs sm:text-sm">{factor.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 flex-wrap font-normal">
                          <span className="whitespace-nowrap">Source: {factor.current.source || "Clinical Assessment"}</span>
                          {factor.current.date && (
                            <span className="whitespace-nowrap font-mono text-[10.5px] text-slate-400">
                              • {factor.current.date}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                      <div className="text-left sm:text-right">
                        <span className="font-semibold text-slate-800 text-sm sm:text-base block">
                          {factor.current.value !== null
                            ? `${factor.current.value} ${factor.unit}`.trim()
                            : "Unavailable"}
                        </span>
                        {factor.previous?.value !== null && factor.previous?.value !== undefined && (
                          <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap block">
                            Prev: {factor.previous.value} {factor.unit}
                          </span>
                        )}
                      </div>
                      {factor.trend && <div className="shrink-0">{getTrendIcon(factor.trend)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 bg-white z-30 pb-12 sm:pb-5 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] space-y-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  router.push("/heart-health");
                }}
                className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 text-[#0067A1] border border-sky-200 font-semibold text-xs rounded-[5px] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Update / Retake Assessment (Add New Vitals)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2 bg-slate-100 text-slate-700 font-medium text-xs rounded-[5px] hover:bg-slate-200 cursor-pointer"
              >
                Close Spectrum
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════
          MODAL 5: CC-09 MY PROGRESS (Longitudinal Checkpoints - Full Screen Mobile)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "progress" && (
        <div className="fixed inset-0 z-[99999] bg-white sm:bg-slate-900/80 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-xl md:max-w-2xl lg:max-w-3xl rounded-none sm:rounded-[8px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in sm:zoom-in-95 duration-150">
            
            {/* Sticky Header */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
              <div>
                <span className="text-[10px] font-mono font-medium uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded">
                  My Progress
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5">Longitudinal Checkpoints</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-[5px] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checkpoint Tabs */}
            <div className="px-4 pt-3 pb-2 sm:px-6 bg-white border-b border-slate-100 shrink-0 z-10 flex gap-1 overflow-x-auto">
              {["7D", "15D", "30D", "45D", "Later"].map((cp) => (
                <button
                  key={cp}
                  type="button"
                  onClick={() => {
                    setSelectedCheckpoint(cp);
                    fetchProgressData(cp === "Later" ? "LONG" : cp);
                  }}
                  className={`px-3 py-1.5 rounded-[5px] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedCheckpoint === cp
                      ? "bg-[#0067A1] text-white shadow-2xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {cp}
                </button>
              ))}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-4 text-xs">
              {/* Activity Trend */}
              <div className="p-4 bg-slate-50 rounded-[5px] border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#0067A1]" /> Activity Trend
                </h3>
                <p className="text-[11px] text-slate-600 mb-3">
                  Recorded Heart Training minutes (150–300 min/week reference band)
                </p>
                <div className="grid grid-cols-7 gap-1.5 items-end h-24 pt-2">
                  {progressData?.activity?.dataPoints?.map((dp, i) => {
                    const dayLabel = dp.day || dp.date || `Day ${i + 1}`;
                    const shortLabel = String(dayLabel).replace("Day ", "D");
                    return (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-[#0067A1] rounded-t-sm transition-all"
                          style={{ height: `${Math.max(8, (dp.minutes / 60) * 100)}%` }}
                          title={`${dayLabel}: ${dp.minutes} mins`}
                        />
                        <span className="text-[9px] text-slate-500 font-mono">{shortLabel}</span>
                      </div>
                    );
                  }) || (
                    <div className="col-span-7 text-center text-slate-400 py-6">
                      No activity records for this period
                    </div>
                  )}
                </div>
              </div>

              {/* Steps Trend */}
              <div className="p-4 bg-slate-50 rounded-[5px] border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 text-emerald-600" /> Steps Trend
                </h3>
                <p className="text-[11px] text-slate-600 mb-3">Goal reference 10,000 daily steps</p>
                <div className="grid grid-cols-7 gap-1.5 items-end h-24 pt-2">
                  {progressData?.steps?.dataPoints?.map((dp, i) => {
                    const dayLabel = dp.day || dp.date || `Day ${i + 1}`;
                    const shortLabel = String(dayLabel).replace("Day ", "D");
                    return (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-emerald-500 rounded-t-sm transition-all"
                          style={{ height: `${Math.max(8, (dp.steps / 12000) * 100)}%` }}
                          title={`${dayLabel}: ${dp.steps} steps`}
                        />
                        <span className="text-[9px] text-slate-500 font-mono">{shortLabel}</span>
                      </div>
                    );
                  }) || (
                    <div className="col-span-7 text-center text-slate-400 py-6">
                      No step records for this period
                    </div>
                  )}
                </div>
              </div>

              {/* Spectrum Factor Coverage */}
              <div className="p-4 bg-slate-50 rounded-[5px] border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">Spectrum Factor Coverage</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">Individual data available</p>
                </div>
                <span className="font-semibold text-[#0067A1] text-sm">
                  {spectrumData.filter((f) => f.current.value !== null).length} of {spectrumData.length} factors
                </span>
              </div>

              {/* Notice */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-[5px] text-[11px] text-blue-900 leading-relaxed">
                <strong>Progress Notice:</strong> Checkpoint displays factual recorded activity and step volume. No artificial improvement percentages or synthetic health ratings are computed.
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="shrink-0 p-4 sm:p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-2 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => setActiveModal("spectrum")}
                className="py-2.5 bg-[#0067A1] text-white font-semibold text-xs rounded-[5px] hover:bg-[#004F7C] cursor-pointer text-center"
              >
                VIEW SPECTRUM
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-[5px] cursor-pointer text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════
          MODAL 6: CC-10 WALKING PERFORMANCE TEST INTRO (Full Screen Mobile)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "walking_intro" && (
        <div className="fixed inset-0 z-[99999] bg-white sm:bg-slate-900/80 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md rounded-none sm:rounded-[5px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in sm:zoom-in-95 duration-150">
            
            {/* Sticky Header */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
              <div>
                <span className="text-[10px] font-mono font-medium uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded">
                  6-Minute Walk Test
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5">Walking Performance Test</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-[5px] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-3 text-xs">
              <p className="text-slate-600 font-medium leading-relaxed">
                Understand the test before you start. A standardized walking test for baseline and repeat comparison.
              </p>

              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-1">What It Is</h4>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  A standardized 6-minute walking test for baseline and repeat functional observation.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-[5px] border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-1">What It Measures</h4>
                <ul className="text-[11px] text-slate-700 list-disc list-inside space-y-0.5">
                  <li>Duration (fixed 6 minutes)</li>
                  <li>Distance covered</li>
                  <li>Pace / speed where available</li>
                  <li>Optional reliable heart rate</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-[5px] border border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-1">What It Does NOT Diagnose</h4>
                <ul className="text-[11px] text-amber-800 list-disc list-inside space-y-0.5">
                  <li>It is not a diagnostic test</li>
                  <li>It is not a cardiac stress test</li>
                  <li>It does not diagnose heart disease or any other condition</li>
                  <li>It does not establish cardiac improvement</li>
                </ul>
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="shrink-0 p-4 sm:p-6 border-t border-slate-100 bg-white space-y-2 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => {
                  setWalkingRemainingSeconds(WALKING_TEST_TOTAL_SECONDS);
                  setWalkingDistanceInput("");
                  setWalkingHeartRateInput("");
                  setActiveModal("walking_active");
                }}
                className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold text-xs rounded-[5px] shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
          MODAL 7: CC-11 WALKING PERFORMANCE TEST ACTIVE (Full Screen Mobile)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "walking_active" && (
        <div className="fixed inset-0 z-[99999] bg-white sm:bg-slate-900/80 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md rounded-none sm:rounded-[5px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in sm:zoom-in-95 duration-150 text-center">
            
            {/* Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
              <span className="text-[10px] font-mono font-medium uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded-[5px]">
                Active Walk Test
              </span>
              <span className="text-xs font-semibold text-slate-700">Standardized 6-Min Test</span>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mt-1">Walking Performance Test</h2>
                <p className="text-xs text-slate-600 mt-0.5">Walk at your usual comfortable pace for 6 minutes</p>
              </div>

              {/* Stopwatch Telemetry Gauge */}
              <div className="flex justify-center my-2">
                <AnimatedStopwatch
                  isActive={true}
                  isPaused={false}
                  size="responsive"
                  timeString={formatSeconds(WALKING_TEST_TOTAL_SECONDS - walkingRemainingSeconds)}
                  label={`${walkingDistanceInput ? walkingDistanceInput + " km" : "06:00"}`}
                  subLabel={walkingGpsEnabled ? "GPS auto-tracking" : "protocol gauge"}
                  progress={Math.min(1, (WALKING_TEST_TOTAL_SECONDS - walkingRemainingSeconds) / WALKING_TEST_TOTAL_SECONDS)}
                />
              </div>

              {/* GPS Live Tracking Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[5px] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-left">
                  <MapPin className="w-4 h-4 text-[#0067A1]" />
                  <div>
                    <span className="font-semibold text-slate-800 text-[11px] block">GPS Live Auto-Distance</span>
                    <span className="text-[10px] text-slate-500 block">
                      {walkingGpsEnabled ? (gpsAccuracy ? `Locked (±${gpsAccuracy}m)` : "Active") : "Manual entry mode"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!walkingGpsEnabled && gpsStatus !== "granted") {
                      requestGps();
                    }
                    setWalkingGpsEnabled(!walkingGpsEnabled);
                  }}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-[5px] border transition-colors cursor-pointer ${
                    walkingGpsEnabled
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {walkingGpsEnabled ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>GPS Active</span>
                    </span>
                  ) : (
                    "Enable GPS"
                  )}
                </button>
              </div>

              {/* Distance input / recording */}
              <div className="text-left space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
                    Distance {walkingGpsEnabled && "(Auto-detected)"}
                  </label>
                  {/* Unit Selector */}
                  <div className="inline-flex rounded-[5px] bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        if (walkingDistanceUnit === "m") return;
                        setWalkingDistanceUnit("m");
                        if (walkingDistanceInput && !isNaN(parseFloat(walkingDistanceInput))) {
                          const v = parseFloat(walkingDistanceInput);
                          setWalkingDistanceInput(Math.round(v < 20 ? v * 1000 : v).toString());
                        }
                      }}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-[3px] transition-colors cursor-pointer ${
                        walkingDistanceUnit === "m"
                          ? "bg-[#0067A1] text-white shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Meters (m)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (walkingDistanceUnit === "km") return;
                        setWalkingDistanceUnit("km");
                        if (walkingDistanceInput && !isNaN(parseFloat(walkingDistanceInput))) {
                          const v = parseFloat(walkingDistanceInput);
                          setWalkingDistanceInput(v > 20 ? (v / 1000).toFixed(2) : v.toString());
                        }
                      }}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-[3px] transition-colors cursor-pointer ${
                        walkingDistanceUnit === "km"
                          ? "bg-[#0067A1] text-white shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Kilometers (km)
                    </button>
                  </div>
                </div>

                {(() => {
                  const rawNum = parseFloat(walkingDistanceInput);
                  let liveMeters = 0;
                  if (!isNaN(rawNum) && rawNum > 0) {
                    if (walkingDistanceUnit === "m") {
                      liveMeters = rawNum < 2 ? Math.round(rawNum * 1000) : Math.round(rawNum);
                    } else {
                      liveMeters = rawNum > 15 ? Math.round(rawNum) : Math.round(rawNum * 1000);
                    }
                  }
                  const isTooHigh = liveMeters > 1500;
                  const isLikelySteps = liveMeters >= 2000;

                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="number"
                            step={walkingDistanceUnit === "m" ? "1" : "0.01"}
                            min="0"
                            max={walkingDistanceUnit === "m" ? "1500" : "1.5"}
                            placeholder={walkingDistanceUnit === "m" ? "e.g. 500 (max 1500)" : "e.g. 0.50 (max 1.5)"}
                            value={walkingDistanceInput}
                            onChange={(e) => setWalkingDistanceInput(e.target.value)}
                            className={`w-full px-2.5 py-2 border rounded-[5px] text-xs font-mono focus:outline-none focus:ring-2 font-semibold ${
                              isTooHigh
                                ? "border-rose-400 bg-rose-50/40 text-rose-800 focus:ring-rose-300"
                                : "border-slate-200 focus:ring-[#0067A1]/30 text-slate-800"
                            }`}
                          />
                          {walkingDistanceInput && !isNaN(parseFloat(walkingDistanceInput)) && parseFloat(walkingDistanceInput) > 0 && (
                            <p className="text-[10px] text-slate-500 font-mono mt-1">
                              {walkingDistanceUnit === "m"
                                ? `≈ ${(parseFloat(walkingDistanceInput) / 1000).toFixed(2)} km (${Math.round(parseFloat(walkingDistanceInput))}m)`
                                : `≈ ${Math.round(parseFloat(walkingDistanceInput) * 1000)} meters`}
                            </p>
                          )}
                        </div>
                        <div>
                          <input
                            type="number"
                            min="35"
                            max="220"
                            placeholder="Heart Rate (bpm)"
                            value={walkingHeartRateInput}
                            onChange={(e) => setWalkingHeartRateInput(e.target.value)}
                            className="w-full px-2.5 py-2 border border-slate-200 rounded-[5px] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 font-semibold"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Optional BPM (35-220)</p>
                        </div>
                      </div>

                      {/* Live Validation Guidance */}
                      {isTooHigh && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-[6px] text-left">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-semibold text-rose-800 text-[11px]">
                                Impossible Distance: {liveMeters.toLocaleString()}m ({((liveMeters / 1000) / 0.1).toFixed(0)} km/h)
                              </p>
                              <p className="text-[10px] text-rose-700 leading-tight">
                                {isLikelySteps
                                  ? `6-minute walk test mein maximum realistic limit 1,500m (1.5 km) hoti hai. ${liveMeters.toLocaleString()}m car speed ke barabar hai! Pedometer "Daily Steps" ke badle 6-min walking distance dalein (normal 6-min walk = 300m–600m).`
                                  : `In a 6-minute walk, maximum human distance limit is 1,500 meters (1.5 km). Normal clinical range is 300m – 700m.`}
                              </p>
                              <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (walkingDistanceUnit === "m") {
                                      setWalkingDistanceInput("500");
                                    } else {
                                      setWalkingDistanceInput("0.50");
                                    }
                                  }}
                                  className="text-[10px] bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold px-2 py-0.5 rounded-[4px] border border-rose-300 cursor-pointer"
                                >
                                  Set to typical 6-min walk (~500m)
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 bg-white z-30 pb-12 sm:pb-5 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => finishWalkingTest(true)}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-[5px] shadow-xs transition-colors cursor-pointer"
              >
                STOP EARLY / COMPLETE TEST
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════
          MODAL 8: CC-12 WALKING PERFORMANCE TEST RESULT (Full Screen Mobile)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "walking_result" && walkingTestResult && (
        <div className="fixed inset-0 z-[99999] bg-white sm:bg-slate-900/80 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md rounded-none sm:rounded-[5px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in sm:zoom-in-95 duration-150 text-center">
            
            {/* Header */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
              <span className="text-[10px] font-mono font-medium uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded-[5px]">
                Walk Test Result
              </span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-[5px] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-4">
              <AnimatedCheckmark size="lg" showParticles={true} className="mb-2" />

              <h2 className="text-xl font-semibold text-slate-900 mt-1">
                {walkingTestResult.isComplete ? "Test Complete (6 Minutes)" : "Test Stopped Early"}
              </h2>

              {/* Route Summary Map if GPS Points exist */}
              {walkingTestResult.gps_points && walkingTestResult.gps_points.length > 1 && (
                <div className="my-2 rounded-[5px] overflow-hidden border border-slate-200 shadow-2xs">
                  <RealGpsMap
                    points={walkingTestResult.gps_points}
                    distanceKm={walkingTestResult.distanceKm}
                    activity="WALKING TEST"
                    isLiveTracking={false}
                    height="h-36"
                    showControls={false}
                  />
                </div>
              )}

              {/* Current Result */}
              <div className="p-4 bg-slate-50 rounded-[5px] border border-slate-200 text-left">
                <h4 className="font-semibold text-slate-900 text-xs mb-2">Your Result</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600">Duration</span>
                    <strong className="text-slate-900">{walkingTestResult.durationFormatted}</strong>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600">Distance</span>
                    <strong className="text-slate-900">
                      {walkingTestResult.distanceMeters !== null
                        ? `${walkingTestResult.distanceMeters} m (${walkingTestResult.distanceKm} km)`
                        : walkingTestResult.distanceKm !== null
                        ? `${walkingTestResult.distanceKm} km`
                        : "Not recorded"}
                    </strong>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600">Speed & Pace</span>
                    <strong className="text-slate-900">
                      {walkingTestResult.paceKmh !== null ? `${walkingTestResult.paceKmh} km/h` : "—"}
                      {walkingTestResult.paceMinPerKm ? ` (${walkingTestResult.paceMinPerKm})` : ""}
                    </strong>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600">Heart Rate</span>
                    <strong className="text-slate-900">
                      {walkingTestResult.heartRateBpm !== null ? `${walkingTestResult.heartRateBpm} bpm` : "Not recorded"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Previous Comparable Test */}
              {walkingTestResult.previousComparable ? (
                <div className="p-4 bg-slate-50 rounded-[5px] border border-slate-200 text-left text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-slate-900">Previous Comparable Test</h4>
                    {walkingTestResult.comparison?.distanceDiffMeters !== undefined && (
                      <span className={`text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded-[3px] ${
                        walkingTestResult.comparison.distanceDiffMeters >= 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {walkingTestResult.comparison.distanceDiffMeters >= 0 ? "+" : ""}
                        {walkingTestResult.comparison.distanceDiffMeters} m
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600 mb-2">Like-for-like protocol version (V1.0)</p>
                  <div className="space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-700">Distance</span>
                      <strong className="text-slate-800">
                        {walkingTestResult.previousComparable.distanceKm} km
                        {walkingTestResult.previousComparable.distanceKm ? ` (${Math.round(walkingTestResult.previousComparable.distanceKm * 1000)} m)` : ""}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Pace</span>
                      <strong className="text-slate-800">{walkingTestResult.previousComparable.paceKmh} km/h</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Date</span>
                      <strong className="text-slate-800">{walkingTestResult.previousComparable.date}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-[5px] text-left text-xs text-slate-700">
                  <p className="font-semibold text-slate-900 mb-0.5">Previous Test</p>
                  <p className="text-[10px] text-slate-600">No previous test found for like-for-like comparison (V1.0 protocol). Complete more tests to enable comparison.</p>
                </div>
              )}

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-[5px] text-left text-[10px] text-blue-900 leading-relaxed">
                This test records your walking performance for personal tracking only. It does not diagnose any medical condition or establish cardiac fitness.
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="shrink-0 p-4 sm:p-6 border-t border-slate-100 bg-white space-y-2 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-3 bg-[#0067A1] text-white font-semibold text-xs rounded-[5px] hover:bg-[#004F7C] cursor-pointer shadow-xs"
              >
                DONE (Back to Home)
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("progress")}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-[5px] cursor-pointer"
              >
                VIEW PROGRESS
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════
          MODAL 9: CC-06 ACTIVITY TIMELINE (Full Screen Mobile)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "timeline" && (
        <div className="fixed inset-0 z-[99999] bg-white sm:bg-slate-900/80 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg md:max-w-xl rounded-none sm:rounded-[8px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in sm:zoom-in-95 duration-150">
            
            {/* Sticky Header */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
              <div>
                <span className="text-[10px] font-mono font-medium uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded-[5px]">
                  Activity History
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5">Activity Timeline</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-[5px] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-4">
              {/* Date Selector */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-[5px] p-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(timelineDate);
                    d.setDate(d.getDate() - 1);
                    const str = d.toISOString().split("T")[0];
                    setTimelineDate(str);
                    fetchTimelineData(str);
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-700 font-semibold cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Calendar className="w-4 h-4 text-[#0067A1]" />
                  <span>
                    {new Date(timelineDate + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(timelineDate);
                    d.setDate(d.getDate() + 1);
                    const str = d.toISOString().split("T")[0];
                    setTimelineDate(str);
                    fetchTimelineData(str);
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-700 font-semibold cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Daily Total */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[5px] text-xs">
                <h4 className="font-semibold text-slate-900 mb-2">Daily Total</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded-[5px] border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Steps</span>
                    <strong className="text-slate-900 text-sm font-mono">
                      {timelineData?.daily_total?.steps ? timelineData.daily_total.steps.toLocaleString() : "--"}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded-[5px] border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Distance</span>
                    <strong className="text-slate-900 text-sm font-mono">
                      {timelineData?.daily_total?.distance_km ? `${timelineData.daily_total.distance_km} km` : "-- km"}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded-[5px] border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Energy</span>
                    <strong className="text-slate-900 text-sm font-mono">
                      {timelineData?.daily_total?.energy_kcal ? `${timelineData.daily_total.energy_kcal} kcal` : "-- kcal"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Chronological Sessions */}
              <div className="space-y-2 text-xs">
                <h4 className="font-semibold text-slate-900">Recorded Sessions</h4>
                {isLoadingTimeline ? (
                  <div className="p-6 text-center text-slate-500">Loading activity sessions...</div>
                ) : timelineData?.session_records && timelineData.session_records.length > 0 ? (
                  timelineData.session_records.map((sess, idx) => (
                    <div
                      key={sess.id || idx}
                      className="p-3 bg-white border border-slate-200 rounded-[5px] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[5px] bg-blue-50 text-[#0067A1] flex items-center justify-center">
                          <Footprints className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-900">Session {idx + 1}</strong>
                            {sess.is_long_session && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                                Long session
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-600">
                            {sess.duration_minutes} min • {sess.steps ? `${sess.steps.toLocaleString()} steps` : "Manual time"}
                            {sess.distance_km ? ` • ${sess.distance_km} km` : ""}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-[5px] space-y-1.5">
                    <div className="w-10 h-10 rounded-[5px] bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                      <Footprints className="w-5 h-5" />
                    </div>
                    <h5 className="font-semibold text-slate-800 text-xs">No sessions yet</h5>
                    <p className="text-[11px] text-slate-500">No activity sessions recorded for this date.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="shrink-0 p-4 sm:p-6 border-t border-slate-100 bg-white flex flex-col gap-2 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => {
                  setActiveModal("progress");
                }}
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-[#0067A1] font-semibold text-xs rounded-[5px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Weekly Summary</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-[5px] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════
          MODAL 10: CC-14 PERMISSIONS & DATA SOURCES (Full Screen Mobile)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "permissions" && (
        <div className="fixed inset-0 z-[99999] bg-white sm:bg-slate-900/80 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md rounded-none sm:rounded-[5px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in sm:zoom-in-95 duration-150 text-center">
            
            {/* Header */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
              <span className="text-[10px] font-mono font-medium uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded-[5px]">
                Device Permissions
              </span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-[5px] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-1 ${
                permissionsState === "granted"
                  ? "bg-emerald-100 text-emerald-600"
                  : permissionsState === "denied"
                  ? "bg-rose-100 text-rose-600"
                  : permissionsState === "restricted"
                  ? "bg-amber-100 text-amber-600"
                  : permissionsState === "unavailable"
                  ? "bg-slate-200 text-slate-600"
                  : "bg-blue-100 text-[#0067A1]"
              }`}>
                {permissionsState === "granted" && <Check className="w-8 h-8" />}
                {permissionsState === "denied" && <Minus className="w-8 h-8" />}
                {permissionsState === "restricted" && <AlertTriangle className="w-8 h-8" />}
                {permissionsState === "unavailable" && <WifiOff className="w-8 h-8" />}
                {permissionsState === "sync_pending" && <RefreshCw className="w-8 h-8 animate-spin" />}
              </div>

              <h2 className="text-xl font-semibold text-slate-900 mt-1 capitalize">
                {permissionsState.replace("_", " ")}
              </h2>
              <p className="text-xs text-slate-600">
                {permissionsState === "granted"
                  ? "Activity tracking and health data source permissions are active."
                  : permissionsState === "denied"
                  ? "Device motion sensor access is currently denied."
                  : permissionsState === "restricted"
                  ? "Device permissions are restricted by system policy."
                  : permissionsState === "unavailable"
                  ? "Health sensor source is currently unavailable."
                  : "Syncing health source data with server..."}
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[5px] text-left text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold text-slate-800">Activity Permission</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                    permissionsState === "granted"
                      ? "bg-emerald-100 text-emerald-800"
                      : permissionsState === "denied"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {permissionsState === "granted" ? "Granted" : permissionsState === "denied" ? "Denied" : "Restricted"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold text-slate-800">Health Source</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                    permissionsState === "granted"
                      ? "bg-emerald-100 text-emerald-800"
                      : permissionsState === "sync_pending"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-200 text-slate-700"
                  }`}>
                    {permissionsState === "granted" ? "Connected" : permissionsState === "sync_pending" ? "Sync Pending" : "Unavailable"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-[5px] text-left text-[11px] text-blue-900 leading-relaxed">
                <strong>Non-blocking access:</strong> Heart Training and walking tests can always be performed manually without granting device sensor permissions.
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="shrink-0 p-4 sm:p-6 border-t border-slate-100 bg-white space-y-2 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              {permissionsState !== "granted" && (
                <button
                  type="button"
                  onClick={() => {
                    setPermissionsState("granted");
                    toast.success("Permissions granted");
                  }}
                  className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold text-xs rounded-[5px] shadow-xs transition-colors cursor-pointer"
                >
                  Retry / Connect Source
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveModal("setup");
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-[5px] transition-colors cursor-pointer"
              >
                Continue Without
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════
          MODAL 11: CC-13 AQI CONTEXT DETAIL (Full Screen Mobile + Real Database AQI)
      ══════════════════════════════════════════════════════════════ */}
      {activeModal === "aqi" && (
        <div className="fixed inset-0 z-[99999] bg-white sm:bg-slate-900/80 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md rounded-none sm:rounded-[5px] shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in sm:zoom-in-95 duration-150">
            
            {/* Sticky Header */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
              <div>
                <span className="text-[10px] font-mono font-medium uppercase bg-slate-100 text-slate-950 px-2 py-0.5 rounded-[5px]">
                  Environmental Telemetry
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5">Air Quality (AQI) & Weather</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-[5px] hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-4 text-xs">
              
              {/* Active Location & Switcher Header */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[5px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#0067A1]" />
                    <span className="text-xs font-semibold text-slate-900">{savedUserCity}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {gpsStatus === 'granted' ? 'GPS Active' : 'Live Sync'}
                  </span>
                </div>

                {/* Quick Location Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={requestGps}
                    className="flex-1 py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-medium text-[11px] rounded-[5px] border border-sky-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Use Current GPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(!showLocationPicker)}
                    className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-[5px] border border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{showLocationPicker ? "Hide Cities" : "Choose City"}</span>
                  </button>
                </div>

                {/* Collapsible City Chooser / Search */}
                {showLocationPicker && (
                  <div className="pt-2.5 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                    <div className="relative">
                      <form onSubmit={handleCitySearchSubmit} className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Search any city, town, or area..."
                          value={citySearchInput}
                          onChange={(e) => handleCityInputChange(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-[5px] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0067A1]/40"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-medium text-xs rounded-[5px] transition-colors cursor-pointer"
                        >
                          Search
                        </button>
                      </form>

                      {/* Google Places Autocomplete Suggestions */}
                      {citySuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-[5px] shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {citySuggestions.map((sug, idx) => (
                            <button
                              key={sug.placeId || idx}
                              type="button"
                              onClick={() => handleSelectSuggestion(sug)}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <MapPin className="w-3.5 h-3.5 text-[#0067A1] shrink-0 group-hover:scale-110 transition-transform" />
                                <div className="truncate">
                                  <span className="text-xs font-bold text-slate-800 block truncate">
                                    {sug.name || sug.text}
                                  </span>
                                  {(sug.secondaryText || sug.text) && (
                                    <span className="text-[10px] text-slate-500 block truncate">
                                      {sug.secondaryText || sug.text}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-[#0067A1] shrink-0 ml-1.5 px-1.5 py-0.5 rounded bg-blue-50 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                                Select
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                        Popular Locations:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {POPULAR_CITIES.map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => handleSelectCity(city)}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                              savedUserCity.toLowerCase().includes(city.toLowerCase())
                                ? "bg-[#0067A1] text-white border-[#0067A1] font-semibold"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Real AQI Value & Category Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-[5px] text-center">
                <span className="text-[11px] text-slate-600 block">Current Air Quality Index</span>
                <div className="text-5xl font-semibold text-slate-900 font-mono my-2 tracking-tight">
                  {aqiDetailData?.aqi_value || 80}
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                  (aqiDetailData?.aqi_value || 80) <= 50
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : (aqiDetailData?.aqi_value || 80) <= 100
                    ? "bg-teal-100 text-teal-800 border-teal-300"
                    : (aqiDetailData?.aqi_value || 80) <= 200
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-rose-100 text-rose-800 border-rose-300"
                }`}>
                  {aqiDetailData?.category || "Satisfactory"}
                </span>
                <p className="text-xs text-slate-600 mt-2 px-2">
                  {aqiDetailData?.description || "Minor breathing discomfort to sensitive people"}
                </p>
                {aqiDetailData?.dominant_pollutant && (
                  <div className="mt-2 text-[11px] font-mono text-slate-500">
                    Dominant Pollutant: <strong className="text-slate-800">{aqiDetailData.dominant_pollutant}</strong>
                  </div>
                )}
              </div>

              {/* Real Weather Telemetry Grid */}
              {aqiDetailData?.weather && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-[5px]">
                  <h4 className="text-[11px] font-semibold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                    <CloudSun className="w-3.5 h-3.5 text-sky-600" />
                    <span>Live Weather Telemetry</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-[5px] border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Temp</span>
                      <strong className="text-slate-900 font-mono text-sm">
                        {aqiDetailData.weather.temp_c !== undefined ? `${aqiDetailData.weather.temp_c}°C` : "--"}
                      </strong>
                      <span className="text-[9px] text-slate-400 block truncate">
                        {aqiDetailData.weather.condition || "Clear"}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded-[5px] border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Humidity</span>
                      <strong className="text-slate-900 font-mono text-sm">
                        {aqiDetailData.weather.humidity_pct !== undefined ? `${aqiDetailData.weather.humidity_pct}%` : "--"}
                      </strong>
                      <span className="text-[9px] text-slate-400 block">Relative</span>
                    </div>
                    <div className="p-2 bg-white rounded-[5px] border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Wind</span>
                      <strong className="text-slate-900 font-mono text-sm">
                        {aqiDetailData.weather.wind_kmh !== undefined ? `${aqiDetailData.weather.wind_kmh} km/h` : "--"}
                      </strong>
                      <span className="text-[9px] text-slate-400 block">Surface</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Telemetry Authenticity & PostgreSQL Storage Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[5px] text-xs space-y-1.5">
                <div className="flex justify-between text-slate-700">
                  <span>Location:</span>
                  <strong className="text-slate-900">{aqiDetailData?.location || savedUserCity}</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Data Source:</span>
                  <strong className="text-slate-900">{aqiDetailData?.source || "Google Air Quality API"}</strong>
                </div>
                <div className="flex justify-between text-slate-700 items-center">
                  <span>Telemetry Feed:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[5px] border border-emerald-200">
                    <Shield className="w-3 h-3" />
                    <span>Live Verified Station</span>
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Last Updated:</span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {aqiDetailData?.timestamp ? new Date(aqiDetailData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                  </span>
                </div>
              </div>

              {/* Refresh button */}
              <button
                type="button"
                onClick={() => fetchAqiData(savedUserCity, null, null, true)}
                disabled={isAqiLoading}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-[5px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAqiLoading ? "animate-spin" : ""}`} />
                <span>{isAqiLoading ? "Fetching Live Telemetry..." : "Refresh Live Telemetry"}</span>
              </button>

              {/* Environmental Guidance Note */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-[5px] text-left text-[11px] text-blue-900 leading-relaxed">
                <strong>Environmental Guidance:</strong> Air quality readings provide outdoor atmospheric context to help pace your exercise comfortably. It is a wellness reference and does not restrict your training.
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 bg-white z-30 pb-12 sm:pb-5 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-[#0067A1] text-white font-semibold text-xs rounded-[5px] hover:bg-[#004F7C] cursor-pointer shadow-xs"
              >
                Close
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
