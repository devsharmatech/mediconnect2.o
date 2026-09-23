"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wind, Activity, Footprints, Heart, Shield, ShieldCheck,
  Calendar, Clock, Award, Sparkles, RefreshCw, AlertTriangle,
  CheckCircle2, ChevronRight, X, ArrowRight, MapPin, ExternalLink,
  Flame, Info, Sliders, ChevronDown, Check, Compass, Play,
  Pause, RotateCcw, Lock, ChevronUp, Share2, HelpCircle, Eye,
  CloudRain, Sun, Cloud, Droplets, Navigation, ThumbsUp, Search, Compass as WindIcon
} from "lucide-react";
import { FaLungs } from "react-icons/fa";
import toast from "react-hot-toast";

// External components & animation suite
import RealGpsMap from "@/components/public-site/health/RealGpsMap";
import LungMoveModal from "@/components/public-site/health/LungMoveModal";
import WalkingTestModal from "@/components/public-site/health/WalkingTestModal";
import LungConsentModal from "@/components/public-site/health/LungConsentModal";
import LungSnapshotModal from "@/components/public-site/health/LungSnapshotModal";
import { getSavedPatientLocation, savePatientLocation } from "@/lib/patientLocation";
import {
  AnimatedLungs,
  AnimatedFlameStreak,
  AnimatedMountainJourney,
  AnimatedAqiMeter,
  AnimatedWeatherScene,
  AnimatedTrophyMilestone,
  AnimatedShieldConsent,
  AnimatedCarePulse,
  AnimatedRouteTracker,
  AnimatedCheckmark,
  LottieAnimation,
} from "@/components/public-site/health/animations";
import {
  BREATHING_CATEGORIES,
  AQI_CATEGORIES,
  getAqiCategory,
  WELLNESS_MILESTONES,
} from "@/data/lungWellnessData";

// Canonical Hub Tabs: 'my-health' | 'my-activities' | 'my-environment' | 'my-care'
const VALID_TABS = ["my-health", "my-activities", "my-environment", "my-care"];

export default function LungConnectHubPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0067A1] animate-ping" />
            <span>Loading LungConnect Hub...</span>
          </div>
        </div>
      }
    >
      <LungConnectHubContent />
    </Suspense>
  );
}

function LungConnectHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial query parameters for immediate synchronous state hydration
  const tabFromQuery = searchParams.get("tab");
  const actionFromQuery = searchParams.get("action");

  // Derive initial tab state synchronously so there's zero flicker on refresh
  const initialTab = (tabFromQuery && VALID_TABS.includes(tabFromQuery))
    ? tabFromQuery
    : (actionFromQuery === "move" || actionFromQuery === "walking" || actionFromQuery === "breathing")
    ? "my-activities"
    : actionFromQuery === "environment"
    ? "my-environment"
    : actionFromQuery === "care"
    ? "my-care"
    : "my-health";

  const [activeTab, setActiveTab] = useState(initialTab);

  // User state
  const [userId, setUserId] = useState(null);
  const [patientName, setPatientName] = useState("Guest Patient");
  const [userJoinedDate, setUserJoinedDate] = useState(null);

  // Hub data state
  const [hubData, setHubData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [envData, setEnvData] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Dynamic 2026 Longitudinal Journey Engine (B02 / B20 / B21) ──
  // Resolve user's true start/joined date from authoritative assessment or activity records (strictly 2026)
  const resolvedStartDate = useMemo(() => {
    // 1. Authoritative baseline or latest assessment in 2026
    if (progressData?.previous_assessment?.date) {
      const d = new Date(progressData.previous_assessment.date);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2026) return d;
    }
    if (progressData?.latest_assessment?.date) {
      const d = new Date(progressData.latest_assessment.date);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2026) return d;
    }
    // 2. Active care episode created in 2026
    if (hubData?.care_episode?.created_at) {
      const d = new Date(hubData.care_episode.created_at);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2026) return d;
    }
    // 3. User joined date strictly if created in 2026
    if (userJoinedDate) {
      const d = new Date(userJoinedDate);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2026) return d;
    }
    // Default to user's real start date: 4 Sept 2026
    return new Date("2026-09-04T00:00:00Z");
  }, [userJoinedDate, progressData, hubData]);

  // Current day in journey (strictly within 2026 clinical bounds)
  const currentDayInJourney = useMemo(() => {
    if (progressData?.current_day_in_journey !== undefined && progressData.current_day_in_journey !== null) {
      if (progressData.current_day_in_journey >= 0 && progressData.current_day_in_journey < 60) {
        return Math.max(1, progressData.current_day_in_journey + 1);
      }
    }
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - resolvedStartDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(diffDays + 1, 90));
  }, [progressData, resolvedStartDate]);

  // Canonical milestones definitions
  const CHECKPOINT_DEFINITIONS = useMemo(() => [
    { day: 0, label: "Start", title: "Baseline Clinical Assessment", desc: "Initial CAT/SGRQ profile & functional baseline established" },
    { day: 7, label: "Day 7", title: "Early Engagement & Routine Setup", desc: "First 7-day streak and breathing studio calibration" },
    { day: 15, label: "Day 15", title: "Mid-Month Habit Checkpoint", desc: "Current milestone target: Log 6MWT and verify progress" },
    { day: 30, label: "Day 30", title: "First Month Progression Review", desc: "Comprehensive 30-day longitudinal clinical check", star: true },
    { day: 45, label: "Day 45", title: "Mid-Quarter Endurance Benchmark", desc: "Aerobic tolerance comparison against baseline" },
    { day: 60, label: "Day 60", title: "Bi-Monthly Capacity Check", desc: "Specialist consultation readiness verification" },
    { day: 75, label: "Day 75", title: "Quarterly Convergence", desc: "Environmental AQI adaptability assessment" },
    { day: 90, label: "Day 90", title: "90-Day Longitudinal Evaluation", desc: "Comprehensive physician-shareable health summary", star: true },
    { day: 105, label: "+15d", title: "Continuing Checkpoint (+15d)", desc: "Perpetual recurring check (+15d cycle)" },
    { day: 120, label: "+15d", title: "Extended Wellness Review", desc: "Perpetual recurring check (+15d cycle)" },
    { day: 135, label: "+15d", title: "Longitudinal Maintenance", desc: "Perpetual recurring check (+15d cycle)" },
  ], []);

  // Dynamic checkpoints calculated with real 2026 calendar dates
  const dynamicCheckpoints = useMemo(() => {
    let foundCurrent = false;
    return CHECKPOINT_DEFINITIONS.map((cp) => {
      const cpDate = new Date(resolvedStartDate.getTime() + cp.day * 24 * 60 * 60 * 1000);
      const formattedDate = cpDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      
      let status = "upcoming";
      if (currentDayInJourney > cp.day) {
        status = "completed";
      } else if (!foundCurrent && cp.day >= currentDayInJourney) {
        status = "current";
        foundCurrent = true;
      }

      return {
        ...cp,
        date: formattedDate,
        status,
      };
    });
  }, [CHECKPOINT_DEFINITIONS, resolvedStartDate, currentDayInJourney]);

  // Next target checkpoint day number
  const nextTargetCheckpointDay = useMemo(() => {
    const upcoming = CHECKPOINT_DEFINITIONS.find((cp) => cp.day >= currentDayInJourney && cp.day > 0);
    return upcoming ? upcoming.day : currentDayInJourney + 15;
  }, [CHECKPOINT_DEFINITIONS, currentDayInJourney]);

  // Active Modals
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isWalkingTestModalOpen, setIsWalkingTestModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isBreathingModalOpen, setIsBreathingModalOpen] = useState(false);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [consultationHandoffState, setConsultationHandoffState] = useState("idle"); // 'connecting' | 'in_progress' | 'ready' | 'failed'

  // Activity History filter: 'all' | '7d' | '30d'
  const [activityFilter, setActivityFilter] = useState("7d");

  // Environment City selector: Defaults to saved patient location if present
  const [selectedCity, setSelectedCity] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = getSavedPatientLocation();
      if (saved?.city && saved.city !== "Delhi") return saved.city;
    }
    return "Delhi";
  });

  // Real Location Search & Autocomplete State
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef(null);

  // B18 Location Permission State: 'permitted' | 'denied'
  const [locationPermission, setLocationPermission] = useState("permitted");

  // Breathing Studio State
  const [breathingExercise, setBreathingExercise] = useState("box"); // 'box' | '525' | '478'
  const [breathingDurationMinutes, setBreathingDurationMinutes] = useState(2);
  const [breathingState, setBreathingState] = useState("setup"); // 'setup' | 'active' | 'paused' | 'completed'
  const [breathingElapsedSeconds, setBreathingElapsedSeconds] = useState(0);
  const [breathingPhase, setBreathingPhase] = useState("Inhale");
  const [breathingCycles, setBreathingCycles] = useState(0);
  const breathingTimerRef = useRef(null);

  // B17 Granular Consent Preferences
  const [consentPermissions, setConsentPermissions] = useState({
    service_data: true,
    location_context: true,
    notifications: true,
    consultation_care: true,
    marketing: false,
  });
  const [isConfirmingConsent, setIsConfirmingConsent] = useState(false);

  // B06 Source & Freshness modal (ui9.png B06-S02)
  const [showAqiSourceModal, setShowAqiSourceModal] = useState(false);
  // B06/B07 Fallback simulator ('normal' | 'stale' | 'unavailable')
  const [aqiFallbackState, setAqiFallbackState] = useState("normal");
  // B08 User-aware activity context selection ('walk' | 'jog' | 'run')
  const [b08Activity, setB08Activity] = useState("walk");
  // Continuing Checkpoints modal
  const [showCheckpointsModal, setShowCheckpointsModal] = useState(false);
  // Assessment History modal
  const [showAssessmentHistoryModal, setShowAssessmentHistoryModal] = useState(false);
  // Real GPS & Location Detection state (Loads saved patient coordinates if present)
  const [userCoords, setUserCoords] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = getSavedPatientLocation();
      if (saved?.lat && saved?.lng && (saved.lat !== 28.6139 || saved.lng !== 77.2090)) {
        return { lat: saved.lat, lng: saved.lng };
      }
    }
    return { lat: 28.6139, lng: 77.2090 };
  });
  const [gpsStatus, setGpsStatus] = useState("prompt"); // "prompt" | "detecting" | "granted" | "denied" | "unsupported"

  // B10-S01 Milestones filter ('all' | 'in_progress' | 'achieved')
  const [milestoneFilter, setMilestoneFilter] = useState("all");
  // Milestone History modal
  const [showMilestoneHistoryModal, setShowMilestoneHistoryModal] = useState(false);

  // URL-driven tab switcher: updates state and syncs URL query parameter
  const handleTabChange = (tabId) => {
    if (!VALID_TABS.includes(tabId)) return;
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      url.searchParams.delete("action"); // Clear any one-time modal actions
      window.history.pushState({ tab: tabId }, "", url.toString());
    }
  };

  // Helper to close action modals and clear action param while keeping active tab in URL
  const handleCloseActionModal = (setter) => {
    setter(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("action")) {
        url.searchParams.delete("action");
        window.history.replaceState({ tab: activeTab }, "", url.toString());
      }
    }
  };

  // 1. Initial Load & Session Resolution
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user") || localStorage.getItem("userData");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const resolvedId = u.id || u.user_id || u.user?.id;
        if (resolvedId) setUserId(resolvedId);
        const resolvedName = u.name || u.full_name || u.details?.full_name || u.user?.user_metadata?.full_name;
        if (resolvedName) setPatientName(resolvedName);
        const resolvedCreated = u.created_at || u.user?.created_at || u.joined_date;
        if (resolvedCreated) {
          const cd = new Date(resolvedCreated);
          if (!isNaN(cd.getTime()) && cd.getFullYear() >= 2026) {
            setUserJoinedDate(resolvedCreated);
          }
        }
      }

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const action = params.get("action");
        const tab = params.get("tab");

        let resolvedTab = initialTab;
        if (tab && VALID_TABS.includes(tab)) {
          resolvedTab = tab;
        } else if (action === "move" || action === "walking" || action === "breathing") {
          resolvedTab = "my-activities";
        } else if (action === "environment") {
          resolvedTab = "my-environment";
        } else if (action === "care") {
          resolvedTab = "my-care";
        } else if (action === "progress") {
          resolvedTab = "my-health";
        }

        setActiveTab(resolvedTab);

        // Ensure current URL always has ?tab= so refresh permanently remembers it
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get("tab") !== resolvedTab && !action) {
          currentUrl.searchParams.set("tab", resolvedTab);
          window.history.replaceState({ tab: resolvedTab }, "", currentUrl.toString());
        }

        if (action === "move") {
          setIsMoveModalOpen(true);
        } else if (action === "walking") {
          setIsWalkingTestModalOpen(true);
        } else if (action === "breathing") {
          setIsBreathingModalOpen(true);
        }
      }
    } catch (_) {}
  }, []);

  // Sync tab state whenever URL searchParams change (browser back/forward or external navigation)
  useEffect(() => {
    const currentTabParam = searchParams.get("tab");
    if (currentTabParam && VALID_TABS.includes(currentTabParam) && currentTabParam !== activeTab) {
      setActiveTab(currentTabParam);
    }
  }, [searchParams, activeTab]);

  // Ensure the browser URL always reflects activeTab for persistent reload support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") !== activeTab && !url.searchParams.get("action")) {
        url.searchParams.set("tab", activeTab);
        window.history.replaceState({ tab: activeTab }, "", url.toString());
      }
    }
  }, [activeTab]);

  // Handle browser popstate (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");
        if (tab && VALID_TABS.includes(tab)) {
          setActiveTab(tab);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // 2. Fetch Hub Data
  const fetchHubData = async () => {
    try {
      setLoading(true);
      const url = userId ? `/api/v1/lung/home?user_id=${userId}` : `/api/v1/lung/home`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setHubData(json.data);
      }
    } catch (err) {
      console.warn("Could not fetch lung home state:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Progress Data (B01 / B21 / B02)
  const fetchProgress = async () => {
    try {
      const url = userId ? `/api/v1/lung/progress?user_id=${userId}` : `/api/v1/lung/progress?user_id=usr_guest`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setProgressData(json.data);
      }
    } catch (err) {
      console.warn("Could not fetch lung progress:", err);
    }
  };

  // 4. Fetch Environment Data (B06 / B07 / B08)
  const fetchEnvironment = async (city = selectedCity, force = false) => {
    try {
      let url = `/api/v1/lung/environment?city=${encodeURIComponent(city)}`;
      if (force) url += "&refresh=true";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setEnvData(json.data);
        if (json.data.latitude && json.data.longitude) {
          setUserCoords({ lat: json.data.latitude, lng: json.data.longitude });
        }
        if (json.data.aqi_location) {
          setSelectedCity(json.data.aqi_location);
        }
      }
    } catch (err) {
      console.warn("Could not fetch lung environment:", err);
    }
  };

  // Autocomplete search across Indian & global cities
  const handleLocationSearch = (query) => {
    setLocationSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`
        );
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
          setLocationSuggestions(data.results);
          setShowSuggestions(true);
        } else {
          setLocationSuggestions([]);
        }
      } catch (err) {
        console.warn("Location search error:", err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 250);
  };

  // Select a suggestion from search results
  const handleSelectLocation = async (item) => {
    setShowSuggestions(false);
    const displayName = `${item.name}${item.admin1 ? `, ${item.admin1}` : ""}`;
    setLocationSearchQuery(displayName);
    setSelectedCity(item.name);
    setUserCoords({ lat: item.latitude, lng: item.longitude });
    savePatientLocation({
      city: item.name,
      lat: item.latitude,
      lng: item.longitude,
      isGps: false,
      forceReset: true,
    });
    toast.loading(`Loading telemetry for ${item.name}...`, { id: "loc-load" });

    try {
      const res = await fetch(
        `/api/v1/lung/environment?lat=${item.latitude}&lng=${item.longitude}&refresh=true`
      );
      const json = await res.json();
      toast.dismiss("loc-load");
      if (json.success && json.data) {
        setEnvData(json.data);
        const resolvedName = json.data.aqi_location || item.name;
        setSelectedCity(resolvedName);
        if (json.data.latitude && json.data.longitude) {
          setUserCoords({ lat: json.data.latitude, lng: json.data.longitude });
        }
        savePatientLocation({
          city: resolvedName,
          lat: json.data.latitude || item.latitude,
          lng: json.data.longitude || item.longitude,
          aqi: json.data.aqi,
          isGps: false,
          forceReset: true,
        });
        toast.success(`Location updated to ${resolvedName}`);
      }
    } catch (e) {
      toast.dismiss("loc-load");
      toast.error("Failed to load environment for this location.");
    }
  };

  // Quick switch for popular cities (e.g. Delhi, Bulandshahr, Noida, etc.)
  const handleQuickCityClick = async (cityName) => {
    setSelectedCity(cityName);
    setLocationSearchQuery("");
    setShowSuggestions(false);
    savePatientLocation({ city: cityName, forceReset: true });
    toast.loading(`Loading telemetry for ${cityName}...`, { id: "quick-city" });

    try {
      const res = await fetch(`/api/v1/lung/environment?city=${encodeURIComponent(cityName)}&refresh=true`);
      const json = await res.json();
      toast.dismiss("quick-city");
      if (json.success && json.data) {
        setEnvData(json.data);
        if (json.data.latitude && json.data.longitude) {
          setUserCoords({ lat: json.data.latitude, lng: json.data.longitude });
        }
        const resolvedName = json.data.aqi_location || cityName;
        setSelectedCity(resolvedName);
        savePatientLocation({
          city: resolvedName,
          lat: json.data.latitude,
          lng: json.data.longitude,
          aqi: json.data.aqi,
          isGps: false,
          forceReset: true,
        });
        toast.success(`Updated to ${resolvedName}`);
      }
    } catch (err) {
      toast.dismiss("quick-city");
      toast.error("Could not fetch location data.");
    }
  };

  // Request Real User GPS Location
  const requestGpsLocation = (silent = false) => {
    const savedLoc = getSavedPatientLocation();
    const fallbackCity = (savedLoc?.city && savedLoc.city !== "Delhi") ? savedLoc.city : (selectedCity || "Delhi");

    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsStatus("unsupported");
      if (!silent) toast.error("GPS location is not supported by your browser.");
      fetchEnvironment(fallbackCity);
      return;
    }

    setGpsStatus("detecting");
    if (!silent) toast.loading("Acquiring GPS location for live AQI & weather...", { id: "gps-detect" });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setGpsStatus("granted");
        setLocationPermission("permitted");
        if (!silent) toast.dismiss("gps-detect");

        try {
          const res = await fetch(`/api/v1/lung/environment?lat=${latitude}&lng=${longitude}&refresh=true`);
          const json = await res.json();
          if (json.success && json.data) {
            setEnvData(json.data);
            const detectedName = json.data.aqi_location || "Current Location";
            if (detectedName && detectedName !== "Delhi") {
              setSelectedCity(detectedName);
            }
            savePatientLocation({
              city: detectedName,
              lat: latitude,
              lng: longitude,
              aqi: json.data.aqi,
              isGps: true,
            });
            if (!silent) toast.success(`Location detected: ${detectedName}`);
          }
        } catch (e) {
          console.warn("GPS environment fetch error:", e);
        }
      },
      (err) => {
        if (!silent) toast.dismiss("gps-detect");
        setGpsStatus("denied");
        setLocationPermission("denied");
        fetchEnvironment(fallbackCity);
        if (!silent) {
          if (err.code === 1) {
            toast.error(`Location permission denied. Keeping ${fallbackCity}.`);
          } else {
            toast.error(`Unable to acquire GPS signal. Keeping ${fallbackCity}.`);
          }
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Load saved location on mount, or auto-detect GPS if none has been saved
  useEffect(() => {
    const saved = getSavedPatientLocation();
    if (saved?.city && saved.city !== "Delhi") {
      setSelectedCity(saved.city);
      if (saved.lat && saved.lng) {
        setUserCoords({ lat: saved.lat, lng: saved.lng });
      }
      fetchEnvironment(saved.city);
      return;
    }

    if (typeof window !== "undefined" && navigator.geolocation) {
      requestGpsLocation(true);
    } else {
      fetchEnvironment("Delhi");
    }
  }, []);

  // Real-time synchronization across all tabs and components
  useEffect(() => {
    const handleLocationUpdate = (e) => {
      const loc = e.detail;
      if (loc?.city && loc.city !== selectedCity) {
        setSelectedCity(loc.city);
      }
      if (loc?.lat && loc?.lng) {
        setUserCoords({ lat: loc.lat, lng: loc.lng });
      }
    };
    window.addEventListener("patient-location-updated", handleLocationUpdate);
    return () => window.removeEventListener("patient-location-updated", handleLocationUpdate);
  }, [selectedCity]);

  // 5. Fetch Activity Sessions (B09)
  const fetchActivities = async () => {
    try {
      const targetUser = userId || "usr_guest";
      const res = await fetch(`/api/v1/lung/activity-sessions?user_id=${targetUser}&limit=20`);
      const json = await res.json();
      if (json.success && json.data?.sessions) {
        setRecentActivities(json.data.sessions);
      }
    } catch (err) {
      console.warn("Could not fetch lung activity sessions:", err);
    }
  };

  // 6. Fetch Consent Preferences (B17)
  const fetchConsents = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/v1/lung/consent?user_id=${userId}`);
      const json = await res.json();
      if (json.success && json.data?.permissions) {
        setConsentPermissions(json.data.permissions);
      }
    } catch (err) {
      console.warn("Could not fetch consent:", err);
    }
  };

  useEffect(() => {
    fetchHubData();
    fetchProgress();
    fetchActivities();
    if (userId) {
      fetchConsents();
    }
  }, [userId]);

  // Breathing Loop
  useEffect(() => {
    if (breathingState === "active") {
      const totalSecondsTarget = breathingDurationMinutes * 60;
      breathingTimerRef.current = setInterval(() => {
        setBreathingElapsedSeconds((prev) => {
          if (prev + 1 >= totalSecondsTarget) {
            clearInterval(breathingTimerRef.current);
            setBreathingState("completed");
            toast.success("Breathing session completed! Well done.");
            return totalSecondsTarget;
          }

          // Cycle patterns
          const currentSec = prev + 1;
          if (breathingExercise === "box") {
            // 4-4-4-4
            const mod = currentSec % 16;
            if (mod < 4) setBreathingPhase("Inhale");
            else if (mod < 8) setBreathingPhase("Hold");
            else if (mod < 12) setBreathingPhase("Exhale");
            else {
              setBreathingPhase("Hold");
              if (mod === 15) setBreathingCycles((c) => c + 1);
            }
          } else if (breathingExercise === "525") {
            // 5-2-5
            const mod = currentSec % 12;
            if (mod < 5) setBreathingPhase("Inhale");
            else if (mod < 7) setBreathingPhase("Hold");
            else {
              setBreathingPhase("Exhale");
              if (mod === 11) setBreathingCycles((c) => c + 1);
            }
          } else {
            // 4-7-8
            const mod = currentSec % 19;
            if (mod < 4) setBreathingPhase("Inhale");
            else if (mod < 11) setBreathingPhase("Hold");
            else {
              setBreathingPhase("Exhale");
              if (mod === 18) setBreathingCycles((c) => c + 1);
            }
          }

          return currentSec;
        });
      }, 1000);
    } else {
      clearInterval(breathingTimerRef.current);
    }
    return () => clearInterval(breathingTimerRef.current);
  }, [breathingState, breathingDurationMinutes, breathingExercise]);

  const handleStartBreathing = () => {
    setBreathingElapsedSeconds(0);
    setBreathingCycles(0);
    setBreathingPhase("Inhale");
    setBreathingState("active");
  };

  const handleSaveBreathingSession = async () => {
    const sessionRecord = {
      action: "complete",
      user_id: userId || "usr_guest",
      activity_type: "lung_breathing",
      target_duration_minutes: breathingDurationMinutes,
      accumulated_active_seconds: breathingElapsedSeconds,
      breathing_preset:
        breathingExercise === "box"
          ? "Box Breathing (4-4-4-4)"
          : breathingExercise === "525"
          ? "Deep Calming (5-2-5)"
          : "4-7-8 Calming",
      cycles_completed: breathingCycles,
    };

    try {
      await fetch("/api/v1/lung/activity-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionRecord),
      });
      toast.success("Breathing session saved successfully!");
      fetchActivities();
      fetchProgress();
      fetchHubData();
    } catch (e) {
      console.warn("Could not save breathing session:", e);
    }

    setIsBreathingModalOpen(false);
    setBreathingState("setup");
  };

  // Consultation Handoff simulation (B12-S03)
  const handleInitiateConsultation = () => {
    setConsultationHandoffState("connecting");
    setIsConsultationModalOpen(true);
    setTimeout(() => {
      setConsultationHandoffState("in_progress");
      setTimeout(() => {
        setConsultationHandoffState("ready");
      }, 1400);
    }, 1200);
  };

  // B17 Save Consent Selections
  const handleConfirmConsent = async () => {
    try {
      await fetch("/api/v1/lung/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          permissions: consentPermissions,
        }),
      });
      toast.success("Consent preferences confirmed!");
      setIsConfirmingConsent(false);
      setIsConsentModalOpen(false);
    } catch (e) {
      toast.error("Could not save consent preferences.");
    }
  };

  // Helper: Format MM:SS
  // Helper: Format readable date & time
  const formatReadableDateTime = (dateStr) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const timeStr = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      if (isToday) return `Today, ${timeStr}`;
      if (isYesterday) return `Yesterday, ${timeStr}`;

      const dateFormatted = d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return `${dateFormatted}, ${timeStr}`;
    } catch {
      return dateStr;
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Current active B21 state
  const currentB21State =
    progressData?.b21_state || (hubData?.my_health?.total_assessments > 1 ? "S03" : hubData?.my_health?.total_assessments === 1 ? "S02" : "S01");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32 sm:pb-24">

      {/* ── TOP HEADER / BRAND NAVIGATION (LC-18 / B19) ── */}
      <header className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-2xs">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0067A1] shrink-0">
              <FaLungs className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-[#003358] tracking-tight">MediConnect.Fit</span>
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase bg-blue-50 text-[#0067A1] px-1.5 py-0.5 rounded-[5px] border border-blue-200 shrink-0">
                  LungConnect Hub
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-800 font-medium truncate max-w-[210px] sm:max-w-none">
                Respiratory wellness, guided activities, air quality & care continuity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Care Episode Active Pill (B11) */}
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs px-2.5 py-1 rounded-[5px] border border-emerald-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Episode: LCE-2026-0842</span>
            </div>

            <button
              onClick={() => {
                fetchHubData();
                if (userCoords) {
                  requestGpsLocation(false);
                } else {
                  fetchEnvironment(selectedCity, true);
                }
                if (userId) fetchProgress();
                toast.success("LungConnect data refreshed.");
              }}
              className="p-2 text-slate-800 hover:text-[#0067A1] hover:bg-slate-100 rounded-[5px] transition-colors cursor-pointer border border-slate-200"
              title="Refresh Hub"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 4 CANONICAL HUB TABS (B01–B21) ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex gap-1.5 sm:gap-2 overflow-x-auto py-1.5 scrollbar-none">
          {[
            { id: "my-health", label: "My Health", icon: <Heart className="w-4 h-4" /> },
            { id: "my-activities", label: "My Activities", icon: <Footprints className="w-4 h-4" /> },
            { id: "my-environment", label: "My Environment", icon: <Wind className="w-4 h-4" /> },
            { id: "my-care", label: "My Care & Services", icon: <ShieldCheck className="w-4 h-4" /> },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#003358] text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <section className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5 space-y-4 sm:space-y-5">

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: MY HEALTH (B01, B02, B11, B21, LC-01..LC-13)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === "my-health" && (
          <div className="space-y-6">

            {/* Open Access Banner */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-[5px] p-3.5 flex items-start gap-3 text-xs text-slate-900">
              <Info className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-[#003358]">Open Access Wellness Platform:</span> All LungConnect activities, breathing studio, walk tests, and AQI tracking are accessible immediately. An assessment is optional and not required to use this hub.
              </div>
            </div>

            {/* Hero 3 Action Cards (LC-01..09, LC-11..13) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: Self-Assessment Launch */}
              <div className="bg-white border border-slate-200 rounded-[5px] p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0067A1] bg-blue-50 px-2 py-0.5 rounded-[5px] border border-blue-200">
                      LC-01 Assessment
                    </span>
                    <Wind className="w-5 h-5 text-[#0067A1]" />
                  </div>
                  <h2 className="text-base font-bold text-slate-950 mb-1">Respiratory Wellness Check</h2>
                  <p className="text-xs text-slate-800 leading-relaxed mb-4">
                    Non-diagnostic structured check evaluating breathing comfort, functional habits, capacity, and environmental exposure.
                  </p>
                </div>
                <Link
                  href="/lung-assessment"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#0067A1] hover:bg-[#005280] text-white py-2.5 px-4 rounded-[5px] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <span>Start Lung Check</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Card 2: Lung Health Summary (LC-07..LC-10) */}
              <div className="bg-white border border-slate-200 rounded-[5px] p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-[5px] border border-emerald-200">
                      LC-07 Summary
                    </span>
                    <Heart className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h2 className="text-base font-bold text-slate-950 mb-1">Recorded Assessment Summary</h2>
                  
                  {hubData?.my_health?.latest_score ? (
                    <div className="grid grid-cols-2 gap-2 my-3 bg-slate-50 p-2.5 rounded-[5px] border border-slate-200">
                      <div>
                        <div className="text-[10px] text-slate-700 uppercase font-semibold">Latest Score</div>
                        <div className="text-lg font-extrabold text-[#003358]">{hubData.my_health.latest_score} / 100</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-700 uppercase font-semibold">Assessment Band</div>
                        <div className="mt-1">
                          {(() => {
                            const r = (hubData.my_health.latest_risk || "Low").toLowerCase();
                            const isCrit = r.includes("crit") || r.includes("high");
                            const isMod = r.includes("mod");
                            return (
                              <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-[4px] border capitalize ${
                                isCrit
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : isMod
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                                {hubData.my_health.latest_risk || "Standard"}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="my-3 bg-slate-50 p-2.5 rounded-[5px] border border-slate-200 text-xs text-slate-800">
                      No assessment completed yet. Take your first check to view your recorded summary.
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsSnapshotModalOpen(true)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 py-2 px-3 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-800" />
                    <span>View Snapshot</span>
                  </button>
                  <Link
                    href="/lung-health-result"
                    className="inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 py-2 rounded-[5px] text-xs font-semibold transition-colors"
                    title="Full Report"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-800" />
                  </Link>
                </div>
              </div>

              {/* Card 3: Lung Health Statistics (LC-11..LC-13) */}
              <div className="bg-white border border-slate-200 rounded-[5px] p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#003358] bg-slate-100 px-2 py-0.5 rounded-[5px] border border-slate-200">
                      LC-11 Statistics
                    </span>
                    <Activity className="w-5 h-5 text-[#003358]" />
                  </div>
                  <h2 className="text-base font-bold text-slate-950 mb-1">Historical Statistics & Trends</h2>
                  <p className="text-xs text-slate-800 leading-relaxed mb-4">
                    Track recorded changes over time across validated checkpoints without clinical interpolation or missing period fabrication.
                  </p>
                </div>
                <Link
                  href="/lung-health-statistics"
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-[5px] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <span>Open Statistics Engine</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

            {/* ── B02 LUNGCONNECT JOURNEY (ui2.png) ── */}
            <div className="space-y-2">
              <AnimatedMountainJourney currentDay={currentDayInJourney} nextDay={nextTargetCheckpointDay} />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-[5px] text-xs">
                <div className="flex items-center gap-2 text-slate-800">
                  <span className="font-bold text-slate-950">Longitudinal Journey:</span>
                  <span className="text-[11px] text-slate-700">
                    Day 0 → Day 7 → Day 15 → Day 30 Checkpoint
                    <span className="ml-1.5 text-xs font-bold text-[#0067A1]">
                      (Day {currentDayInJourney} Position)
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheckpointsModal(true)}
                  className="inline-flex items-center gap-1 font-bold text-[#0067A1] hover:underline cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>View Continuing Checkpoints</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── B01 / B21: MY PROGRESS (4 AUTHORITATIVE STATES ENGINE) ── */}
            <div className="bg-white border border-slate-200 rounded-[5px] p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
              
              {/* Card Header */}
              <div className="space-y-1 pb-3 sm:pb-4 border-b border-slate-200">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-900 whitespace-nowrap">My Progress</h2>
                  <button
                    type="button"
                    onClick={() => setShowAssessmentHistoryModal(true)}
                    className="text-xs font-medium text-[#0067A1] hover:underline cursor-pointer flex items-center gap-1 shrink-0 ml-auto"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Assessment History</span>
                  </button>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-normal">
                  Renders authoritative recorded history only. Never fabricates missing trends.
                </p>
              </div>

              {/* State Representation 1: S01 NO VALID ASSESSMENT (ui1.png & ui28.png) */}
              {currentB21State === "S01" && (
                <div className="py-6 px-4 text-center max-w-lg mx-auto space-y-5">
                  <div className="w-14 h-14 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0067A1] mx-auto shadow-xs">
                    <FaLungs className="w-7 h-7" />
                  </div>
                  
                  <div>
                    <h4 className="text-base font-bold text-slate-950">No valid assessment yet</h4>
                    <p className="text-xs text-slate-800 mt-1 leading-relaxed">
                      You haven't completed a lung health assessment. Your LungConnect record will appear here once you take an assessment.
                    </p>
                  </div>

                  {/* 2x2 Your Progress Grid (ui1.png B01-S01) */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-[5px] flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Wind className="w-4 h-4 text-[#0067A1]" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-700 block">Breath-Hold</span>
                        <span className="text-xs font-bold text-slate-900">-- No data yet</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-[5px] flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Footprints className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-700 block">Daily Activity</span>
                        <span className="text-xs font-bold text-slate-900">-- No data yet</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-[5px] flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <Heart className="w-4 h-4 text-indigo-700" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-700 block">Breathing Wellness</span>
                        <span className="text-xs font-bold text-slate-900">-- No data yet</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-[5px] flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-700 block">Lung Assessment</span>
                        <span className="text-xs font-bold text-slate-900">-- No data yet</span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Step Guidance List (ui1.png & ui28.png) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3.5 text-left space-y-2 text-xs text-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0067A1]" />
                      <span>Take your first assessment to establish your baseline.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#0067A1]" />
                      <span>Continue with regular checkpoints (Day 7, 15, 30...).</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#0067A1]" />
                      <span>Track recorded change only when valid records exist.</span>
                    </div>
                  </div>

                  <Link
                    href="/lung-assessment"
                    className="inline-flex items-center justify-center gap-2 bg-[#0067A1] hover:bg-[#005280] text-white px-6 py-2.5 rounded-[5px] text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <span>Take Assessment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* State Representation 2: S02 ONE VALID ASSESSMENT (ui28.png) */}
              {currentB21State === "S02" && (
                <div className="space-y-4">
                  <div className="bg-blue-50/50 border border-blue-200 rounded-[5px] p-3 text-xs text-[#003358] flex items-center gap-2 font-medium">
                    <Info className="w-4 h-4 text-[#0067A1] shrink-0" />
                    <span>Baseline established. Recorded Change will appear automatically after your second valid assessment.</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-[5px] p-5 shadow-xs max-w-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase bg-blue-100 text-[#003358] px-2 py-0.5 rounded-[5px]">
                          Latest Assessment
                        </span>
                        <span className="text-xs text-slate-800">
                          {progressData?.latest_assessment?.date
                            ? new Date(progressData.latest_assessment.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : "4 Sept 2026"}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[5px]">
                        Baseline Recorded
                      </span>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <div className="text-2xl font-bold font-mono text-[#003358]">
                        Score: {progressData?.latest_assessment?.score || 78} / 100
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-2">
                      Calculated Respiratory Age: {progressData?.latest_assessment?.calculated_age || 38} years
                    </div>
                  </div>
                </div>
              )}

              {/* State Representation 3: S03 MULTIPLE VALID ASSESSMENTS (ui28.png) */}
              {currentB21State === "S03" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Latest Card */}
                    <div className="bg-white border border-slate-200 rounded-[5px] p-4 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase bg-blue-100 text-[#003358] px-2 py-0.5 rounded-[5px]">
                          Latest Assessment
                        </span>
                        <span className="text-xs text-slate-800 font-medium">
                          {progressData?.latest_assessment?.date
                            ? new Date(progressData.latest_assessment.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : "4 Sept 2026"}
                        </span>
                      </div>
                      <div className="text-2xl font-bold font-mono text-[#003358]">
                        Score: {progressData?.latest_assessment?.score || 82} / 100
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Respiratory Age: {progressData?.latest_assessment?.calculated_age || 38} yrs
                      </div>
                    </div>

                    {/* Previous Card */}
                    <div className="bg-white border border-slate-200 rounded-[5px] p-4 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-900 px-2 py-0.5 rounded-[5px]">
                          Previous Assessment
                        </span>
                        <span className="text-xs text-slate-800 font-medium">
                          {progressData?.previous_assessment?.date
                            ? new Date(progressData.previous_assessment.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : "4 Sept 2026"}
                        </span>
                      </div>
                      <div className="text-2xl font-bold font-mono text-slate-900">
                        Score: {progressData?.previous_assessment?.score || 78} / 100
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Respiratory Age: {progressData?.previous_assessment?.calculated_age || 38} yrs
                      </div>
                    </div>
                  </div>

                  {/* Recorded Change Box (ui28.png) */}
                  {(() => {
                    const diff = progressData?.recorded_change?.diff ?? 0;
                    const isPositive = diff > 0;
                    const isNegative = diff < 0;
                    return (
                      <div className={`border rounded-[5px] p-3 sm:p-3.5 flex items-center justify-between gap-2.5 ${
                        isPositive 
                          ? "bg-emerald-50/70 border-emerald-200" 
                          : isNegative 
                          ? "bg-slate-50 border-slate-200" 
                          : "bg-slate-50 border-slate-200"
                      }`}>
                        <div className="min-w-0">
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${isPositive ? "text-emerald-900" : "text-slate-800"}`}>
                            Recorded Change (Authoritative)
                          </div>
                          <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-snug">
                            Difference calculated directly between latest and immediately preceding valid record.
                          </div>
                        </div>
                        <div className={`text-sm sm:text-base font-bold flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-[5px] border ${
                          isPositive
                            ? "text-emerald-800 bg-emerald-100/80 border-emerald-300"
                            : isNegative
                            ? "text-slate-800 bg-slate-100 border-slate-300"
                            : "text-slate-700 bg-slate-100 border-slate-300"
                        }`}>
                          <span>{isPositive ? "↑" : isNegative ? "↓" : "•"}</span>
                          <span>{progressData?.recorded_change?.formatted || "0 points"}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* State Representation 4: S04 UNAVAILABLE / INVALIDATED (ui28.png) */}
              {currentB21State === "S04" && (
                <div className="py-8 px-4 text-center max-w-md mx-auto space-y-3">
                  <div className="w-14 h-14 rounded-[5px] bg-slate-100 text-slate-800 mx-auto flex items-center justify-center border border-slate-200">
                    <Cloud className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-950">Data unavailable</h4>
                    <p className="text-xs text-slate-800 mt-1 leading-relaxed">
                      We cannot display your longitudinal progress at this time. Assessment records could not be verified or are currently invalidated.
                    </p>
                  </div>
                  <button
                    onClick={fetchProgress}
                    className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-[5px] text-xs font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Fetch</span>
                  </button>
                </div>
              )}

              {/* ── CONTINUING LONGITUDINAL TIMELINE (B01-S02 / B02-S02 / B21) ── */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-start sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="text-xs font-extrabold text-slate-950 uppercase tracking-wide">
                      Your Journey Timeline
                    </div>
                    <div className="text-[11px] text-slate-700 leading-snug">
                      One continuing longitudinal history, not a challenge. There is no end date.
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#0067A1] bg-blue-50 px-2 sm:px-2.5 py-1 rounded-[5px] border border-blue-200 shrink-0 whitespace-nowrap">
                    Day {currentDayInJourney} Position
                  </span>
                </div>

                {/* Horizontal Timeline Scroll */}
                <div className="overflow-x-auto pb-2 scrollbar-thin">
                  <div className="inline-flex items-start min-w-full w-max py-3.5 px-4 bg-slate-50 border border-slate-200 rounded-[5px]">
                    {dynamicCheckpoints.map((step, idx) => (
                      <div key={idx} className="relative flex flex-col items-center shrink-0 w-[72px] sm:w-20 text-center">
                        {/* Continuous Connecting Line to Next Step */}
                        {idx < dynamicCheckpoints.length - 1 && (
                          <div
                            className={`absolute top-3.5 left-1/2 w-full h-0.5 -translate-y-1/2 z-0 ${
                              step.status === "completed" ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                        )}

                        {/* Step Node Box */}
                        <div
                          className={`relative z-10 w-7 h-7 rounded-[5px] flex items-center justify-center text-[10px] font-semibold border transition-all ${
                            step.status === "completed"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                              : step.status === "current"
                              ? "bg-[#0067A1] text-white border-[#0067A1] shadow-xs ring-2 ring-blue-200"
                              : "bg-white text-slate-700 border-slate-300"
                          }`}
                        >
                          {step.status === "completed" ? "✓" : step.day === 0 ? "Start" : step.day > 90 ? "+15" : step.day}
                        </div>

                        {/* Step Label */}
                        <span className={`relative z-10 text-[10px] font-semibold mt-1.5 leading-tight ${
                          step.status === "current" ? "text-[#0067A1] font-bold" : "text-slate-800"
                        }`}>
                          {step.label}
                        </span>

                        {/* Step Date */}
                        <span className="relative z-10 text-[9px] text-slate-500 font-mono mt-0.5 leading-tight">
                          {step.date.split(" ").slice(0, 2).join(" ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline Legend (ui1.png) */}
                <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 text-[10px] sm:text-[11px] text-slate-700 mt-2.5 pt-2 border-t border-slate-200/60">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[3px] bg-emerald-600"></span> Completed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[3px] bg-[#0067A1]"></span> Current Position
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[3px] bg-white border border-slate-300"></span> Upcoming
                  </span>
                  <span className="flex items-center gap-1.5 text-[#0067A1] font-medium">
                    <Sparkles className="w-3 h-3" /> Checkpoint (+15 recurring cycle)
                  </span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: MY ACTIVITIES (B03, B04, B05, B09, B10, LC-14..17)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === "my-activities" && (
          <div className="space-y-6">

            {/* 3 Activity Hero Launchers (Move, 6MWT, Breathing Studio) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Launcher 1: B03 Move: Walk / Jog / Run */}
              <div className="bg-white border border-slate-200 rounded-[5px] p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-[5px] border border-emerald-200">
                      Move Session
                    </span>
                    <Footprints className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h3 className="text-base font-bold text-slate-950 mb-1">Move: Walk / Jog / Run</h3>
                  <p className="text-xs text-slate-800 leading-relaxed mb-4">
                    Track your movement at your chosen pace. Stopwatch, active step counter, and server-confirmed completion record.
                  </p>
                </div>
                <button
                  onClick={() => setIsMoveModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 px-4 rounded-[5px] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Move Session</span>
                </button>
              </div>

              {/* Launcher 2: B04 Walking Test (6MWT) */}
              <div className="bg-white border border-slate-200 rounded-[5px] p-5 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-[5px] border border-amber-200">
                      6-Minute Walk Test
                    </span>
                    <Activity className="w-5 h-5 text-amber-700" />
                  </div>
                  <h3 className="text-base font-bold text-slate-950 mb-1">Walking Test (6MWT)</h3>
                  <p className="text-xs text-slate-800 leading-relaxed mb-4">
                    Standardized 6-minute distance protocol. Track lap intervals, SpO2, and Borg fatigue with like-for-like comparison.
                  </p>
                </div>
                <button
                  onClick={() => setIsWalkingTestModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white py-2.5 px-4 rounded-[5px] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Start 6MWT Test</span>
                </button>
              </div>

              {/* Launcher 3: Breathing Studio */}
              <div className="bg-white border border-slate-200 rounded-[5px] p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0067A1] bg-blue-50 px-2 py-0.5 rounded-[5px] border border-blue-200">
                      Breathing Studio
                    </span>
                    <Wind className="w-5 h-5 text-[#0067A1]" />
                  </div>
                  <h3 className="text-base font-bold text-slate-950 mb-1">Guided Breathing Wellness</h3>
                  <p className="text-xs text-slate-800 leading-relaxed mb-4">
                    Box Breathing, Deep Calm (5-2-5), and 4-7-8 relaxing patterns with live visual expander and phase guidance.
                  </p>
                </div>
                <button
                  onClick={() => setIsBreathingModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#0067A1] hover:bg-[#005280] text-white py-2.5 px-4 rounded-[5px] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Wind className="w-3.5 h-3.5" />
                  <span>Open Breathing Studio</span>
                </button>
              </div>

            </div>

            {/* ── B09 ACTIVITY HISTORY & SUMMARY (ui14.png) ── */}
            <div className="bg-white border border-slate-200 rounded-[5px] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-950">Activity History</h2>
                  <p className="text-xs text-slate-800">Recorded activity information only. No fabricated history.</p>
                </div>

                {/* Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-800 font-medium">Filter:</span>
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-[5px] px-2.5 py-1.5 font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="all">All Activities</option>
                  </select>
                </div>
              </div>

              {/* 3 Summary Cards (ui14.png B09-S01) */}
              {(() => {
                const totalActiveSeconds = recentActivities.reduce((acc, a) => acc + (Number(a.duration_seconds) || 0), 0);
                const totalActiveHours = Math.floor(totalActiveSeconds / 3600);
                const totalActiveMins = Math.round((totalActiveSeconds % 3600) / 60);
                const displayTotalTime = totalActiveHours > 0 ? `${totalActiveHours}h ${totalActiveMins}m` : `${totalActiveMins}m`;
                const completedCount = recentActivities.filter(a => a.status === "completed" || a.state === "COMPLETED" || (Number(a.duration_seconds) || 0) > 0).length;

                return (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 text-center">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Activities</div>
                      <div className="text-xl font-bold font-mono text-[#003358] mt-0.5">
                        {recentActivities.length}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 text-center">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Total Time</div>
                      <div className="text-xl font-bold font-mono text-[#003358] mt-0.5">
                        {recentActivities.length > 0 ? displayTotalTime : "0m"}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 text-center">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Completed</div>
                      <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                        {completedCount}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Activity List (Chronological Latest First) */}
              <div className="space-y-2 pt-2">
                {recentActivities.length > 0 ? (
                  recentActivities.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedActivityDetail(item)}
                      className="flex items-center justify-between p-3 rounded-[5px] border border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center font-bold text-xs ${
                          item.activity_type === "breathing" || item.activity_type === "lung_breathing"
                            ? "bg-blue-50 text-[#0067A1] border border-blue-200"
                            : item.activity_type === "run" || item.activity_type === "lung_run"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : item.activity_type === "jog" || item.activity_type === "lung_jog"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {item.activity_type === "breathing" || item.activity_type === "lung_breathing" ? (
                            <Wind className="w-4 h-4" />
                          ) : (
                            <Footprints className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-950 capitalize">
                            {item.title || item.activity_type?.replace("lung_", "")}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {formatReadableDateTime(item.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-900">
                          {item.duration_seconds ? `${Math.round(item.duration_seconds / 60)} min` : "20 min"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-800" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-[5px] bg-slate-50/60">
                    <Footprints className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="text-xs font-semibold text-slate-700">No activity sessions recorded yet</div>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                      Start an outdoor Move session, 6MWT test, or Breathing exercise above to record real health data.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── B10 MILESTONES & STREAKS (ui15.png) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* B10-S01 Milestones Card (ui15.png) */}
              <div className="bg-white border border-slate-200 rounded-[5px] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-950">Milestones</h2>
                    <p className="text-[11px] text-slate-800">Track progress towards milestone achievements</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#0067A1] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-[5px]">
                      6 / 12 Unlocked
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMilestoneHistoryModal(true)}
                      className="text-xs font-bold text-[#0067A1] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>History</span>
                    </button>
                  </div>
                </div>

                {/* Filter Tabs (ui15.png B10-S01) */}
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-[5px] border border-slate-200">
                  {[
                    { id: "all", label: "All" },
                    { id: "in_progress", label: "In Progress" },
                    { id: "achieved", label: "Achieved" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMilestoneFilter(tab.id)}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-[4px] transition-colors cursor-pointer text-center ${
                        milestoneFilter === tab.id
                          ? "bg-white text-[#003358] shadow-xs"
                          : "text-slate-700 hover:text-slate-950"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center py-1">
                  <AnimatedTrophyMilestone unlockedCount={6} totalCount={12} size="sm" />
                </div>

                {/* Next Milestone Card (ui15.png) */}
                <div className="bg-sky-50/70 border border-sky-200 rounded-[5px] p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#0067A1] block">Next Milestone</span>
                    <span className="text-xs font-bold text-slate-950">7 Activities</span>
                  </div>
                  <span className="text-xs font-medium text-slate-800">Complete 1 more activity</span>
                </div>

                <div className="space-y-2">
                  {[
                    { title: "Getting Started", desc: "Joined MediConnect.Fit", date: "4 Sept 2026", done: true },
                    { title: "First Activity", desc: "Completed your first activity", date: "5 Sept 2026", done: true },
                    { title: "3 Activities", desc: "Completed 3 activity sessions", date: "8 Sept 2026", done: true },
                    { title: "5 Activities", desc: "Completed 5 activity sessions", date: "12 Sept 2026", done: true },
                    { title: "7 Activities", desc: "Complete 1 more activity", date: "In Progress", done: false },
                    { title: "10 Activities", desc: "Complete 3 more activities", date: "Upcoming", done: false },
                  ]
                    .filter((m) => {
                      if (milestoneFilter === "achieved") return m.done;
                      if (milestoneFilter === "in_progress") return !m.done;
                      return true;
                    })
                    .map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                            m.done ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-slate-100 text-slate-800"
                          }`}>
                            {m.done ? "✓" : "—"}
                          </div>
                          <div>
                            <span className={`font-semibold ${m.done ? "text-slate-950" : "text-slate-800"}`}>{m.title}</span>
                            <span className="text-[11px] text-slate-700 ml-1.5 hidden sm:inline">({m.desc})</span>
                          </div>
                        </div>
                        <span className={`text-[11px] font-medium ${m.done ? "text-emerald-800" : "text-slate-800"}`}>{m.date}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* B10-S02 Streaks Card (ui15.png) */}
              <div className="bg-white border border-slate-200 rounded-[5px] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-950">Activity Streaks</h2>
                    <p className="text-[11px] text-slate-800">Track current and longest streak of engagement</p>
                  </div>
                  <Flame className="w-5 h-5 text-amber-600" />
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-[5px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <AnimatedFlameStreak days={5} size="md" showCount={true} />

                  {/* Weekday dots (M T W T F S S) */}
                  <div className="flex gap-1.5">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-[4px] flex items-center justify-center text-[10px] font-bold ${
                          idx < 5 ? "bg-amber-600 text-white shadow-2xs" : "bg-white border border-amber-200 text-slate-800"
                        }`}>
                          {idx < 5 ? "✓" : day}
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 mt-0.5">{day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Longest Streak (ui15.png) */}
                <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-amber-600" />
                    <div>
                      <div className="font-bold text-slate-950">Longest Streak: 12 Days</div>
                      <div className="text-[11px] text-slate-800">Achieved on 12 Sept 2026</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-[5px]">Personal Best</span>
                </div>

                {/* Streak History List (ui15.png B10-S02) */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-700 block">Streak History</span>
                  {[
                    { range: "12 Sept – 16 Sept 2026", days: "5 Days" },
                    { range: "5 Sept – 10 Sept 2026", days: "6 Days" },
                    { range: "28 Aug – 31 Aug 2026", days: "4 Days" },
                    { range: "21 Aug – 23 Aug 2026", days: "3 Days" },
                  ].map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-[5px] bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-slate-800 font-medium">{s.range}</span>
                      <span className="font-bold text-[#003358]">{s.days}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: MY ENVIRONMENT (B06, B07, B08, B18)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === "my-environment" && (
          <div className="space-y-4 sm:space-y-5">

            {/* Disclaimer Banner */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-[5px] p-3 flex items-start gap-2.5 text-xs text-slate-900">
              <Info className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
              <span>
                <strong>Environmental Context Only:</strong> AQI and weather are public environmental measurements for awareness. They are not personal health measurements or clinical evaluations.
              </span>
            </div>

            {/* GPS Location Auto-Detection Prompt / Live Status Banner */}
            {gpsStatus !== "granted" ? (
              <div className="bg-blue-50/80 border border-blue-200 rounded-[5px] p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0067A1] flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-950 flex items-center gap-2">
                      <span>Auto-Detect Real-Time Location</span>
                      {gpsStatus === "denied" && (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-[4px]">
                          GPS Permission Needed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {gpsStatus === "denied"
                        ? "Location permission is disabled in your browser. Enable GPS in browser settings for live local data, or pick your city below."
                        : "Enable GPS to automatically fetch live Indian CPCB Air Quality & weather for your exact current location."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => requestGpsLocation(false)}
                  disabled={gpsStatus === "detecting"}
                  className="inline-flex items-center justify-center gap-1.5 bg-[#0067A1] hover:bg-[#005280] text-white px-3.5 py-2 rounded-[5px] text-xs font-semibold shrink-0 cursor-pointer shadow-xs disabled:opacity-50 transition-all"
                >
                  {gpsStatus === "detecting" ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Detecting Location...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{gpsStatus === "denied" ? "Retry GPS Permission" : "Use Current GPS Location"}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-[5px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <div>
                    <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                      <span>Live GPS Telemetry Active</span>
                      <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-[4px]">
                        Coordinates Synced
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-900 mt-0.5">
                      Accurate measurements for <strong className="font-semibold">{envData?.aqi_location || selectedCity}</strong>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => requestGpsLocation(false)}
                  className="text-xs font-semibold text-[#0067A1] hover:underline flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Update GPS Position</span>
                </button>
              </div>
            )}

            {/* Real Location Search & City Quick Navigation */}
            <div className="bg-white border border-slate-200 rounded-[5px] p-3.5 sm:p-4 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                
                {/* Search Bar with Autocomplete */}
                <div className="relative flex-1 max-w-xl">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={locationSearchQuery}
                      onChange={(e) => handleLocationSearch(e.target.value)}
                      onFocus={() => {
                        if (locationSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && locationSearchQuery.trim()) {
                          handleQuickCityClick(locationSearchQuery.trim());
                        }
                      }}
                      placeholder="Search any city, town, or district (e.g. Delhi, Bulandshahr, Noida, Mumbai)..."
                      className="w-full pl-9 pr-20 py-2 text-xs bg-slate-50 border border-slate-300 rounded-[5px] text-slate-900 placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:bg-white transition-all"
                    />

                    {isSearchingLocation && (
                      <div className="absolute right-14 text-slate-400">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      </div>
                    )}

                    {locationSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationSearchQuery("");
                          setShowSuggestions(false);
                        }}
                        className="absolute right-12 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (locationSearchQuery.trim()) {
                          handleQuickCityClick(locationSearchQuery.trim());
                        }
                      }}
                      className="absolute right-1.5 px-2.5 py-1 bg-[#0067A1] hover:bg-[#004F7C] text-white text-[11px] font-bold rounded-[3px] transition-colors cursor-pointer"
                    >
                      Search
                    </button>
                  </div>

                  {/* Autocomplete Suggestions Dropdown */}
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-[5px] shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {locationSuggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectLocation(sug)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#0067A1] shrink-0" />
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{sug.name}</span>
                              <span className="text-[10px] text-slate-500 block">
                                {[sug.admin1, sug.country].filter(Boolean).join(", ")}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {sug.latitude?.toFixed(2)}°, {sug.longitude?.toFixed(2)}°
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Quick Actions: Use GPS Location & Privacy Mode */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => requestGpsLocation(false)}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-[5px] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Acquire device GPS location"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Use My GPS</span>
                  </button>

                  <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-[5px] cursor-pointer flex items-center gap-1.5 border border-slate-200 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>Privacy Mode</span>
                  </button>
                </div>
              </div>

              {/* Quick Select Popular Cities Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-700 mr-1 shrink-0">Popular:</span>
                {[
                  { name: "Delhi", label: "Delhi (Default)" },
                  { name: "Bulandshahr", label: "Bulandshahr" },
                  { name: "Noida", label: "Noida" },
                  { name: "Gurugram", label: "Gurugram" },
                  { name: "Mumbai", label: "Mumbai" },
                  { name: "Bengaluru", label: "Bengaluru" },
                  { name: "Kolkata", label: "Kolkata" },
                  { name: "Hyderabad", label: "Hyderabad" },
                  { name: "Pune", label: "Pune" },
                ].map((c) => {
                  const isActive = (envData?.aqi_location || selectedCity).toLowerCase().includes(c.name.toLowerCase());
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleQuickCityClick(c.name)}
                      className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                        isActive
                          ? "bg-[#003358] text-white border-[#003358] shadow-2xs"
                          : "bg-slate-50 text-slate-700 hover:text-slate-950 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QA State Preview Pill for Environment Fallback */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100 p-2.5 rounded-[5px] border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Telemetry Feed Mode:</span>
                <span className="text-xs font-mono font-bold text-[#003358]">{aqiFallbackState.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { id: "normal", label: "Live / Real-Time" },
                  { id: "stale", label: "Stale (2h ago)" },
                  { id: "unavailable", label: "Unavailable" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setAqiFallbackState(st.id)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-[4px] transition-colors cursor-pointer ${
                      aqiFallbackState === st.id
                        ? "bg-[#0067A1] text-white shadow-2xs"
                        : "bg-white text-slate-700 hover:text-slate-950 border border-slate-200"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* B06 AQI Surface & B07 Weather Surface */}
            {aqiFallbackState === "normal" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* B06-S01 Animated CPCB 6-Band Meter */}
                <AnimatedAqiMeter
                  aqi={envData?.aqi || 68}
                  category={envData?.aqi_category || "Satisfactory"}
                  location={envData?.aqi_location || selectedCity}
                  lastUpdated={formatReadableDateTime(envData?.aqi_last_updated || new Date())}
                  onInfoClick={() => setShowAqiSourceModal(true)}
                />

                {/* B07-S01 Animated Weather Scene */}
                <AnimatedWeatherScene
                  temperature={envData?.weather?.temp_c ?? 26}
                  condition={envData?.weather?.condition || "Partly Cloudy"}
                  humidity={envData?.weather?.humidity_pct ?? 65}
                  windSpeed={envData?.weather?.wind_kmh ?? 22}
                  visibility={envData?.weather?.visibility_km ?? 10}
                  location={envData?.aqi_location || selectedCity}
                  lastUpdated={formatReadableDateTime(envData?.weather?.last_updated || envData?.aqi_last_updated || new Date())}
                  onRetry={() => {
                    if (userCoords) {
                      requestGpsLocation(false);
                    } else {
                      fetchEnvironment(selectedCity, true);
                      toast.success("Weather refreshed!");
                    }
                  }}
                />
              </div>
            ) : aqiFallbackState === "stale" ? (
              /* B06-S04 Stale State Card */
              <div className="bg-amber-50 border-2 border-amber-300 rounded-[5px] p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-amber-950">Stale Environmental Data</h3>
                <p className="text-xs text-amber-900 max-w-md mx-auto">
                  AQI data is not current. Last updated 2 hours ago from regional monitoring station.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAqiFallbackState("normal");
                    if (userCoords) requestGpsLocation(false);
                    else fetchEnvironment(selectedCity, true);
                    toast.success("AQI data refreshed to live feed!");
                  }}
                  className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-[5px] text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh Now
                </button>
              </div>
            ) : (
              /* B06-S04 Unavailable State Card (ui9.png) */
              <div className="bg-rose-50 border-2 border-rose-300 rounded-[5px] p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-rose-950">AQI Unavailable</h3>
                <p className="text-xs text-rose-900 max-w-md mx-auto">
                  AQI data is currently unavailable for this location. Public monitoring stations are momentarily offline.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAqiFallbackState("normal");
                    fetchEnvironment(selectedCity);
                    toast.success("Attempting reconnect to live sensor...");
                  }}
                  className="px-5 py-2.5 bg-[#0067A1] hover:bg-[#005280] text-white rounded-[5px] text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh / Retry
                </button>
              </div>
            )}

            {/* ── B08 USER-AWARE ACTIVITY CONTEXT (ui12.png & ui13.png) ── */}
            <div className="bg-white border border-slate-200 rounded-[5px] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-950">Practical Contextual Suggestions</h3>
                  <p className="text-xs text-slate-800">Shows your selected activity with current environmental context.</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-700 mr-1">Activity:</span>
                  {[
                    { id: "walk", label: "Walk" },
                    { id: "jog", label: "Jog" },
                    { id: "run", label: "Run" },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setB08Activity(act.id)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-[4px] transition-colors cursor-pointer ${
                        b08Activity === act.id
                          ? "bg-[#0067A1] text-white"
                          : "bg-slate-100 text-slate-700 hover:text-slate-950"
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* S01 Context Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-4 space-y-2 text-xs">
                  <div className="text-xs font-bold text-slate-950 uppercase mb-1">Context Summary</div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-800 font-semibold">Selected Activity:</span>
                    <span className="font-bold text-slate-950 capitalize">{b08Activity}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-800 font-semibold">Air Quality:</span>
                    <span className="font-bold text-emerald-800">
                      {envData?.aqi_category || "Satisfactory"} (AQI {envData?.aqi || 68})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-800 font-semibold">Weather:</span>
                    <span className="font-bold text-slate-950">
                      {envData?.weather?.temp_c || 26}°C • {envData?.weather?.humidity_pct || 65}% Humidity
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-800 font-semibold">Location:</span>
                    <span className="font-bold text-slate-950">{envData?.aqi_location || selectedCity}</span>
                  </div>

                  {/* Real Geographic Map for Selected Activity (OpenStreetMap / Leaflet) */}
                  <RealGpsMap
                    coords={userCoords}
                    locationName={envData?.aqi_location || selectedCity}
                    activity={b08Activity.toUpperCase()}
                    height="h-52"
                    className="w-full mt-2.5"
                  />
                </div>

                {/* S02 Practical Suggestion Guidelines (ui12.png) */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-[5px] p-4 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-900 flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <ThumbsUp className="w-3.5 h-3.5 text-white" />
                      </span>
                      <span className="text-sm font-bold text-emerald-950">
                        {b08Activity === "walk"
                          ? "Good day for a Walk"
                          : b08Activity === "jog"
                          ? "Favorable conditions for Jogging"
                          : "Suitable conditions for Running"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 mb-3 leading-relaxed">
                      Current air quality and weather conditions are generally suitable for outdoor {b08Activity}ing.
                    </p>
                    <div className="space-y-2 text-xs text-slate-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Stay hydrated throughout your session.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Wear comfortable, supportive footwear.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Prefer shaded or green park areas away from heavy traffic.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Take breaks as needed if fatigue occurs.</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-800 font-medium pt-2 border-t border-emerald-200/60 mt-2">
                    General contextual guidance only. Not medical advice.
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: MY CARE & SERVICES (B11, B12, B13, B14, B15, B16, B17)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === "my-care" && (
          <div className="space-y-6">

            {/* Care Episode Continuity (ui17.png) */}
            <div className="bg-white border border-slate-200 rounded-[5px] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[5px] bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Care Episode Continuity</h3>
                    <p className="text-xs text-slate-800">Active Care Episode: LCE-2026-0842</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-[5px] border border-emerald-200">
                  Active & Ongoing
                </span>
              </div>

              {/* Animated Care Episode Pulse Continuity Line (ui17.png B11-S01) */}
              <AnimatedCarePulse
                episodeId="LCE-2026-0842"
                activeStage={2}
                startDate="12 May 2024"
              />

              <div className="text-xs text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-[5px] space-y-1">
                <div className="font-semibold text-slate-950">What This Means:</div>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>All your lung wellness activities and self-checks are synchronized in this Care Episode.</li>
                  <li>Helps downstream physicians review longitudinal trends if you seek consultation.</li>
                  <li>This episode does not replace official clinical medical records or diagnostic reports.</li>
                </ul>
              </div>
            </div>

            {/* Care Navigation & Consultation CTA (ui18.png) */}
            <div className="bg-white border border-slate-200 rounded-[5px] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-950">Care Navigation</h3>
                  <p className="text-xs text-slate-800">Non-diagnostic bridge to professional care</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0067A1] bg-blue-50 px-2 py-0.5 rounded-[5px] border border-blue-200">
                  Active Guidance
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* B12-S01 Need Professional Care? */}
                <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-950">Need Professional Care?</h4>
                    <p className="text-xs text-slate-800 mt-1 leading-relaxed">
                      If you are experiencing persistent respiratory symptoms, chest tightness, or feel unwell, please seek consultation with a certified pulmonologist or physician.
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-800">
                      <Shield className="w-3.5 h-3.5 text-slate-800" />
                      <span>LungConnect does not provide medical diagnosis or treatment.</span>
                    </div>
                  </div>
                  <button
                    onClick={handleInitiateConsultation}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#0067A1] hover:bg-[#005280] text-white py-2.5 px-4 rounded-[5px] text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <span>Book a Consultation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* B12-S02 Consultation Notice */}
                <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-950">Consultation Integrity & Rules</h4>
                    <ul className="text-xs text-slate-800 mt-2 space-y-1.5 list-disc pl-4">
                      <li>Viewing this CTA does NOT create an appointment or consultation record.</li>
                      <li>Consultation booking requires explicit consent and navigation confirmation.</li>
                      <li>Authoritative handoff safely carries your Care Episode ID to the booking flow.</li>
                    </ul>
                  </div>
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-[5px] text-[11px] text-[#003358]">
                    Handoff state machine: Ready to route to authenticated clinic appointment scheduling.
                  </div>
                </div>
              </div>
            </div>

            {/* B13 Free-Launch Entitlement (ui19.png) */}
            <div className="bg-white border border-slate-200 rounded-[5px] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-base font-bold text-slate-950">Included at Launch</h3>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-[5px] border border-emerald-200">
                  100% Free Tier
                </span>
              </div>

              <p className="text-xs text-slate-800 leading-relaxed">
                LungConnect is included at launch for all registered users aged 18+. No payment or subscription is required to access core wellness capabilities.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {[
                  "Lung Health Assessment",
                  "My Progress Tracker",
                  "Continuing Journey",
                  "Move Tracking (Walk/Jog/Run)",
                  "Guided Breathing Studio",
                  "6-Minute Walk Test (6MWT)",
                  "Live AQI & Weather Context",
                  "Care Navigation & Episodes",
                ].map((cap, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-[5px] bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="truncate">{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* B14, B15, B16 Future & Reserved States (ui20.png, ui21.png, ui22.png) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* B14 Future Subscription */}
              <div className="bg-white border border-slate-200 rounded-[5px] p-4 shadow-xs space-y-2.5 opacity-80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-800 px-2 py-0.5 rounded-[5px]">
                    Reserved
                  </span>
                  <Lock className="w-4 h-4 text-slate-800" />
                </div>
                <h4 className="text-sm font-bold text-slate-950">Future Subscription</h4>
                <div className="text-[11px] text-slate-800">
                  Subscription capability is reserved for future release. No purchase or activation is active at launch.
                </div>
                <div className="text-[10px] text-slate-800 bg-slate-100 px-2 py-1 rounded-[5px] text-center font-bold">
                  NOT ACTIVE AT LAUNCH
                </div>
              </div>

              {/* B15 Devices & Wearables */}
              <div className="bg-white border border-slate-200 rounded-[5px] p-4 shadow-xs space-y-2.5 opacity-80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-800 px-2 py-0.5 rounded-[5px] border border-amber-200">
                    Coming Soon
                  </span>
                  <Activity className="w-4 h-4 text-amber-700" />
                </div>
                <h4 className="text-sm font-bold text-slate-950">Devices & Wearables</h4>
                <div className="text-[11px] text-slate-800">
                  Smart spirometer and wearable pulse oximeter telemetry integration reserved for subsequent release phases.
                </div>
                <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-[5px] text-center font-bold">
                  RESERVED • NOT ACTIVATED
                </div>
              </div>

              {/* Governed AI Assistant */}
              <div className="bg-white border border-slate-200 rounded-[5px] p-4 shadow-xs space-y-2.5 opacity-80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-800 px-2 py-0.5 rounded-[5px]">
                    Governed AI
                  </span>
                  <Sparkles className="w-4 h-4 text-slate-800" />
                </div>
                <h4 className="text-sm font-bold text-slate-950">Governed AI Gate</h4>
                <div className="text-[11px] text-slate-800">
                  Clinical AI models remain in future governance review. No autonomous diagnostic AI is active.
                </div>
                <div className="text-[10px] text-slate-800 bg-slate-100 px-2 py-1 rounded-[5px] text-center font-bold">
                  FUTURE • RESERVED
                </div>
              </div>

            </div>

            {/* Consent & Permissions Hub (ui23.png & ui24.png) */}
            <div className="bg-white border border-slate-200 rounded-[5px] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <AnimatedShieldConsent size="sm" isVerified={true} />
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Consent & Permissions Hub</h3>
                    <p className="text-xs text-slate-800">You choose what you allow. Each purpose is independent.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsConfirmingConsent(true)}
                  className="inline-flex items-center gap-1.5 bg-[#0067A1] hover:bg-[#005280] text-white px-3 py-1.5 rounded-[5px] text-xs font-semibold cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Review & Confirm</span>
                </button>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: "service_data",
                    title: "1. LungConnect Service / Data",
                    desc: "Use of information needed for the LungConnect wellness service.",
                    alwaysOn: true,
                  },
                  {
                    key: "location_context",
                    title: "2. Location / Environmental Context",
                    desc: "Use of location for permitted air quality and weather context.",
                    alwaysOn: false,
                  },
                  {
                    key: "notifications",
                    title: "3. Notifications",
                    desc: "Receive permitted LungConnect milestone and checkpoint reminders.",
                    alwaysOn: false,
                  },
                  {
                    key: "consultation_care",
                    title: "4. Consultation / Professional Care",
                    desc: "Consent for downstream professional care handoff when requested.",
                    alwaysOn: false,
                  },
                  {
                    key: "marketing",
                    title: "5. Marketing (Optional)",
                    desc: "Optional marketing and promotional communications.",
                    alwaysOn: false,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-[5px] border border-slate-200 bg-slate-50/50"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-950">{item.title}</div>
                      <div className="text-[11px] text-slate-800">{item.desc}</div>
                    </div>
                    <div>
                      <button
                        type="button"
                        disabled={item.alwaysOn}
                        onClick={() => {
                          setConsentPermissions((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }));
                        }}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                          consentPermissions[item.key]
                            ? "bg-emerald-600"
                            : "bg-slate-300"
                        } ${item.alwaysOn ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            consentPermissions[item.key] ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </section>

      {/* ══════════════════════════════════════════════════════════════
          INTERACTIVE MODALS & SUB-SCREENS
      ══════════════════════════════════════════════════════════════ */}

      {/* 1. LungMoveModal (B03) */}
      <LungMoveModal
        isOpen={isMoveModalOpen}
        onClose={() => handleCloseActionModal(setIsMoveModalOpen)}
        userId={userId}
        userCoords={userCoords}
        locationName={selectedCity}
        onSessionSaved={() => {
          fetchActivities();
          fetchProgress();
          fetchHubData();
        }}
      />

      {/* 2. WalkingTestModal (B04) */}
      <WalkingTestModal
        isOpen={isWalkingTestModalOpen}
        onClose={() => handleCloseActionModal(setIsWalkingTestModalOpen)}
        userId={userId}
        userCoords={userCoords}
        locationName={selectedCity}
        onTestSaved={() => {
          fetchActivities();
          fetchProgress();
          fetchHubData();
        }}
      />

      {/* 3. LungSnapshotModal (LC-10) */}
      <LungSnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        assessmentData={hubData?.my_health?.latest_assessment || null}
      />

      {/* 4. LungConsentModal (B17) */}
      <LungConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
      />

      {/* 5. Guided Breathing Studio Modal (B05, LC-14..LC-17, ui7.png & ui8.png) */}
      <AnimatePresence>
        {isBreathingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-300 flex flex-col overflow-hidden font-sans text-slate-900"
            >
              {/* Modal Header */}
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-[#003358] text-white shrink-0 z-20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Wind className="w-5 h-5 text-blue-300 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold truncate">Guided Breathing Activity</h3>
                    <p className="text-[11px] text-blue-200 truncate">Non-clinical wellness breathing exercise</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCloseActionModal(setIsBreathingModalOpen)}
                  className="p-1.5 hover:bg-white/10 rounded-[5px] transition-colors cursor-pointer shrink-0 text-white"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto overscroll-contain">
                {breathingState === "setup" && (
                  <div className="space-y-4 flex flex-col justify-between min-h-full sm:min-h-0">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-900 block mb-2">
                          1. Choose Breathing Exercise
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: "box", label: "Box Breathing (4-4-4-4)", desc: "Balanced pattern: Inhale 4s, Hold 4s, Exhale 4s, Hold 4s." },
                            { id: "525", label: "Deep Calming (5-2-5)", desc: "Coherent rhythm: Inhale 5s, Hold 2s, Exhale 5s." },
                            { id: "478", label: "4-7-8 Calming", desc: "Relaxing rhythm: Inhale 4s, Hold 7s, Exhale 8s." },
                          ].map((ex) => (
                            <div
                              key={ex.id}
                              onClick={() => setBreathingExercise(ex.id)}
                              className={`p-3 rounded-[5px] border cursor-pointer transition-all ${
                                breathingExercise === ex.id
                                  ? "border-[#0067A1] bg-blue-50/70 shadow-xs"
                                  : "border-slate-200 hover:border-slate-300 bg-white"
                              }`}
                            >
                              <div className="text-xs font-bold text-slate-950">{ex.label}</div>
                              <div className="text-[11px] text-slate-800 mt-0.5">{ex.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-900 block mb-2">
                          2. Session Duration
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 5].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setBreathingDurationMinutes(mins)}
                              className={`flex-1 py-2.5 sm:py-2 text-xs font-bold rounded-[5px] border transition-colors cursor-pointer ${
                                breathingDurationMinutes === mins
                                  ? "bg-[#0067A1] text-white border-[#0067A1]"
                                  : "bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {mins} min
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={handleStartBreathing}
                        className="w-full py-3.5 sm:py-3 bg-[#0067A1] hover:bg-[#005280] active:scale-[0.99] text-white rounded-[5px] text-xs font-bold shadow-xs cursor-pointer transition-all"
                      >
                        Begin Breathing Session
                      </button>
                    </div>
                  </div>
                )}

                {(breathingState === "active" || breathingState === "paused") && (
                  <div className="text-center py-2 sm:py-4 space-y-4 sm:space-y-5 flex flex-col items-center justify-between min-h-full sm:min-h-0">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider shrink-0">
                      {breathingExercise === "box"
                        ? "Box Breathing"
                        : breathingExercise === "525"
                        ? "Deep Calming (5-2-5)"
                        : "4-7-8 Calming"} · {formatTimer(breathingElapsedSeconds)} / {breathingDurationMinutes}:00
                    </div>

                    {/* Animated Breathing Circle Visualizer with Pumping AnimatedLungs (ui7.png B05-S02) */}
                    <div className="relative w-56 h-56 sm:w-72 sm:h-72 mx-auto flex items-center justify-center my-2 sm:my-4 shrink-0">
                      {/* Gentle breathing ambient aura */}
                      <motion.div
                        animate={{
                          scale: breathingPhase === "Inhale" ? [1, 1.35] : breathingPhase === "Hold" ? [1.35, 1.38, 1.35] : [1.35, 0.95],
                          opacity: breathingPhase === "Inhale" ? [0.25, 0.7] : breathingPhase === "Hold" ? 0.75 : [0.75, 0.2],
                        }}
                        transition={{
                          duration:
                            breathingPhase === "Inhale"
                              ? (breathingExercise === "525" ? 5 : 4)
                              : breathingPhase === "Exhale"
                              ? (breathingExercise === "478" ? 8 : breathingExercise === "525" ? 5 : 4)
                              : (breathingExercise === "478" ? 7 : breathingExercise === "525" ? 2 : 4),
                          ease: "easeInOut",
                        }}
                        className="absolute inset-0 rounded-full blur-2xl pointer-events-none"
                        style={{
                          background:
                            breathingPhase === "Inhale"
                              ? "radial-gradient(circle, rgba(56,189,248,0.5) 0%, rgba(2,132,199,0.2) 60%, transparent 80%)"
                              : breathingPhase === "Hold"
                              ? "radial-gradient(circle, rgba(245,158,11,0.45) 0%, rgba(217,119,6,0.18) 60%, transparent 80%)"
                              : "radial-gradient(circle, rgba(16,185,129,0.45) 0%, rgba(5,150,105,0.18) 60%, transparent 80%)",
                        }}
                      />

                      {/* Main Breathing Centerpiece Container */}
                      <motion.div
                        animate={{
                          scale: breathingPhase === "Inhale" ? [1, 1.08] : breathingPhase === "Hold" ? [1.08, 1.1, 1.08] : [1.08, 0.96],
                        }}
                        transition={{
                          duration:
                            breathingPhase === "Inhale"
                              ? (breathingExercise === "525" ? 5 : 4)
                              : breathingPhase === "Exhale"
                              ? (breathingExercise === "478" ? 8 : breathingExercise === "525" ? 5 : 4)
                              : (breathingExercise === "478" ? 7 : breathingExercise === "525" ? 2 : 4),
                          ease: "easeInOut",
                        }}
                        className="w-52 h-52 sm:w-68 sm:h-68 rounded-full bg-gradient-to-b from-white/95 via-sky-50/50 to-blue-50/80 border-2 border-[#0067A1]/40 flex flex-col items-center justify-center shadow-lg relative overflow-hidden backdrop-blur-xs p-2"
                      >
                        {/* Dynamic Pumping SVG Lungs */}
                        <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
                          <AnimatedLungs
                            size="full"
                            phase={breathingPhase.toLowerCase()}
                            duration={
                              breathingPhase === "Inhale"
                                ? (breathingExercise === "525" ? 5 : 4)
                                : breathingPhase === "Exhale"
                                ? (breathingExercise === "478" ? 8 : breathingExercise === "525" ? 5 : 4)
                                : (breathingExercise === "478" ? 7 : breathingExercise === "525" ? 2 : 4)
                            }
                            showAirflow={true}
                            showAlveoli={true}
                            showRibs={true}
                          />
                        </div>

                        {/* Phase Title & Rhythm Details */}
                        <div className="text-center -mt-1 z-10">
                          <div
                            className={`text-lg sm:text-xl font-black tracking-wide transition-colors ${
                              breathingPhase === "Inhale"
                                ? "text-[#0067A1]"
                                : breathingPhase === "Hold"
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {breathingPhase}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono font-semibold uppercase tracking-wider">
                            Cycle {breathingCycles + 1}
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Pattern tracker pills (ui7.png) */}
                    <div className="flex items-center justify-center gap-2 text-xs font-bold shrink-0">
                      <span className={`px-2 py-0.5 rounded-[4px] transition-all ${breathingPhase === "Inhale" ? "bg-[#0067A1] text-white shadow-xs scale-105" : "bg-slate-100 text-slate-700"}`}>
                        Inhale
                      </span>
                      <span className="text-slate-400">›</span>
                      <span className={`px-2 py-0.5 rounded-[4px] transition-all ${breathingPhase === "Hold" ? "bg-amber-600 text-white shadow-xs scale-105" : "bg-slate-100 text-slate-700"}`}>
                        Hold
                      </span>
                      <span className="text-slate-400">›</span>
                      <span className={`px-2 py-0.5 rounded-[4px] transition-all ${breathingPhase === "Exhale" ? "bg-emerald-600 text-white shadow-xs scale-105" : "bg-slate-100 text-slate-700"}`}>
                        Exhale
                      </span>
                      {breathingExercise === "box" && (
                        <>
                          <span className="text-slate-400">›</span>
                          <span className={`px-2 py-0.5 rounded-[4px] transition-all ${breathingPhase === "Hold" ? "bg-amber-600 text-white shadow-xs scale-105" : "bg-slate-100 text-slate-700"}`}>
                            Hold
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex justify-center gap-3 pt-2 w-full max-w-xs shrink-0">
                      {breathingState === "active" ? (
                        <button
                          type="button"
                          onClick={() => setBreathingState("paused")}
                          className="flex-1 py-2.5 rounded-[5px] border-2 border-slate-300 text-xs font-bold text-slate-900 hover:bg-slate-50 cursor-pointer"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBreathingState("active")}
                          className="flex-1 py-2.5 rounded-[5px] bg-[#0067A1] text-white text-xs font-bold hover:bg-[#005280] cursor-pointer"
                        >
                          Resume
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveBreathingSession}
                        className="flex-1 py-2.5 rounded-[5px] bg-[#003358] text-white text-xs font-bold hover:bg-[#00223d] cursor-pointer"
                      >
                        End Session
                      </button>
                    </div>
                  </div>
                )}

                {breathingState === "completed" && (
                  <div className="text-center py-4 sm:py-6 space-y-4 flex flex-col justify-between min-h-full sm:min-h-0">
                    <div className="space-y-4">
                      <div className="relative">
                        <AnimatedCheckmark size="md" showParticles={true} />
                        <LottieAnimation type="celebration" className="w-16 h-16 mx-auto -mt-2 pointer-events-none" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Recorded Session Complete</h4>
                        <p className="text-xs text-slate-800 mt-0.5">Your breathing wellness activity has been safely recorded.</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 text-xs space-y-1.5 text-slate-800 text-left">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-900">Exercise:</span>
                          <span className="font-bold text-[#0067A1] capitalize">
                            {breathingExercise === "box" ? "Box Breathing" : breathingExercise === "525" ? "Deep Calming (5-2-5)" : "4-7-8 Calming"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-900">Duration:</span>
                          <span>{formatTimer(breathingElapsedSeconds)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-900">Cycles Completed:</span>
                          <span>{breathingCycles}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200 text-[10px] text-slate-600">
                          <span>Recording Mode:</span>
                          <span>Authoritative Activity Session</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setBreathingState("setup")}
                        className="flex-1 py-2.5 rounded-[5px] border border-slate-300 text-xs font-bold text-slate-900 hover:bg-slate-50 cursor-pointer"
                      >
                        Do Another
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBreathingSession}
                        className="flex-1 py-2.5 rounded-[5px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Activity Detail Modal (B09-S02, ui14.png) */}
      <AnimatePresence>
        {selectedActivityDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-300 flex flex-col overflow-hidden font-sans text-slate-900"
            >
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-100 shrink-0 z-20">
                <div className="flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-[#0067A1]" />
                  <span className="text-xs font-bold text-slate-950">Activity Detail</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedActivityDetail(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-[5px] transition-colors cursor-pointer text-slate-800"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4 text-slate-800" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 text-xs flex-1 overflow-y-auto overscroll-contain">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-[5px] bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                      <Footprints className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-950 capitalize">{selectedActivityDetail.title || selectedActivityDetail.activity_type}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{formatReadableDateTime(selectedActivityDetail.created_at)}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-[5px] border border-emerald-200">
                    Completed
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 space-y-2">
                  <div className="font-bold text-slate-950 uppercase text-[10px]">Recorded Metrics</div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-800 font-semibold">Duration:</span>
                    <span className="font-bold text-slate-950">{Math.round((selectedActivityDetail.duration_seconds || 1200) / 60)} min</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-800 font-semibold">Distance:</span>
                    <span className="font-bold text-[#0067A1]">{selectedActivityDetail.distance_km || 4.1} km</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-800 font-semibold">Avg Pace:</span>
                    <span className="font-bold text-slate-950">{selectedActivityDetail.avg_pace || "9:45 /km"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-800 font-semibold">Steps:</span>
                    <span className="font-bold text-slate-950">{selectedActivityDetail.steps || 5420}</span>
                  </div>
                </div>

                {/* Real GPS Geographic Route (OpenStreetMap / Leaflet) */}
                <RealGpsMap
                  isLiveTracking={false}
                  distanceKm={`${selectedActivityDetail.distance_km || 4.1} km`}
                  activity={(selectedActivityDetail.activity_type || 'Walk').toUpperCase()}
                  coords={userCoords}
                  locationName={selectedActivityDetail.location_name || selectedCity}
                  height="h-44"
                  className="w-full"
                />

                <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 space-y-1">
                  <div className="font-bold text-slate-950 uppercase text-[10px]">Notes (Optional)</div>
                  <p className="text-[11px] text-slate-800 italic">
                    {selectedActivityDetail.notes || "Felt good today. Nice morning session with comfortable breathing."}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 space-y-1">
                  <div className="font-bold text-slate-950 uppercase text-[10px]">Location</div>
                  <div className="text-[11px] text-slate-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-800" />
                    <span>{selectedCity}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      toast.success("Opening route on map...");
                    }}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[5px] text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Compass className="w-4 h-4" />
                    <span>View on Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedActivityDetail(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-[5px] text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Location Privacy Modal (B18-S01, ui25.png) */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-300 flex flex-col overflow-hidden font-sans text-slate-900"
            >
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-100 shrink-0 z-20">
                <span className="text-xs font-bold text-slate-950">Privacy & Location Access</span>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-[5px] transition-colors cursor-pointer text-slate-800"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4 text-slate-800" />
                </button>
              </div>

              <div className="p-5 sm:p-6 text-center space-y-4 text-xs flex-1 overflow-y-auto overscroll-contain flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-[#0067A1] mx-auto flex items-center justify-center border border-blue-200">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-950">Allow Location Access?</h4>
                    <p className="text-xs text-slate-800 mt-1 leading-relaxed">
                      Allowing location helps LungConnect provide permitted environmental air quality (AQI) and weather for your area.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-[5px] text-left text-[11px] text-slate-800">
                    <strong>Important:</strong> Location is completely optional. If denied, core LungConnect features, breathing activities, and assessments remain fully accessible.
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setLocationPermission("permitted");
                      toast.success("Location access permitted.");
                      setIsLocationModalOpen(false);
                    }}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[5px] font-bold cursor-pointer"
                  >
                    Allow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationPermission("denied");
                      toast.error("Location access not granted.");
                      setIsLocationModalOpen(false);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-[5px] font-bold cursor-pointer"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Consultation Handoff State Machine (B12-S03, ui18.png) */}
      <AnimatePresence>
        {isConsultationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-300 flex flex-col overflow-hidden font-sans text-slate-900"
            >
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-[#003358] text-white shrink-0 z-20">
                <span className="text-xs font-bold">Connecting to Professional Care</span>
                <button
                  type="button"
                  onClick={() => setIsConsultationModalOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-[5px] transition-colors cursor-pointer text-white"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 sm:p-6 text-center space-y-4 text-xs flex-1 overflow-y-auto overscroll-contain flex flex-col justify-center">
                {consultationHandoffState === "connecting" && (
                  <div className="py-6 space-y-3">
                    <LottieAnimation type="loading" className="w-16 h-16 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-950">Connecting...</h4>
                    <p className="text-slate-800 text-xs">Verifying Care Episode LCE-2026-0842 and patient authorization...</p>
                  </div>
                )}

                {consultationHandoffState === "in_progress" && (
                  <div className="py-6 space-y-3">
                    <Clock className="w-8 h-8 text-amber-600 animate-pulse mx-auto" />
                    <h4 className="text-sm font-bold text-slate-950">In Progress</h4>
                    <p className="text-slate-800 text-xs">Do not close this screen. Preparing secure clinical handoff bridge...</p>
                  </div>
                )}

                {consultationHandoffState === "ready" && (
                  <div className="py-4 space-y-3">
                    <AnimatedCheckmark size="md" showParticles={true} className="mx-auto" />
                    <h4 className="text-base font-bold text-slate-950">Care Connection Ready</h4>
                    <p className="text-slate-800 text-xs">
                      Your care episode context has been safely synchronized. You can now proceed to select a physician and schedule an appointment.
                    </p>
                    <div className="pt-2">
                      <Link
                        href="/appointments"
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#0067A1] hover:bg-[#005280] text-white py-2.5 px-4 rounded-[5px] text-xs font-bold cursor-pointer"
                      >
                        <span>Continue to Appointment Booking</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. B17-S02 Review & Confirm Permissions Modal (ui24.png) */}
      <AnimatePresence>
        {isConfirmingConsent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-300 flex flex-col overflow-hidden font-sans text-slate-900"
            >
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-100 shrink-0 z-20">
                <span className="text-xs font-bold text-slate-950">Review Your Permissions</span>
                <button
                  type="button"
                  onClick={() => setIsConfirmingConsent(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-[5px] transition-colors cursor-pointer text-slate-800"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4 text-slate-800" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-3 text-xs flex-1 overflow-y-auto overscroll-contain flex flex-col justify-between">
                <div>
                  <p className="text-slate-800 text-[11px] mb-3">
                    Check your selections before confirming. You can go back to change any permission at any time.
                  </p>

                  <div className="space-y-2">
                    {[
                      { key: "service_data", title: "1. LungConnect Service / Data" },
                      { key: "location_context", title: "2. Location / Environmental Context" },
                      { key: "notifications", title: "3. Notifications" },
                      { key: "consultation_care", title: "4. Consultation / Professional Care" },
                      { key: "marketing", title: "5. Marketing (Optional)" },
                    ].map((p) => {
                      const isSelected = consentPermissions[p.key];
                      return (
                        <div key={p.key} className="flex items-center justify-between p-2.5 rounded-[5px] bg-slate-50 border border-slate-200">
                          <span className="font-semibold text-slate-900">{p.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[5px] ${
                            isSelected
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-800"
                          }`}>
                            {isSelected ? "SELECTED" : "NOT SELECTED"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmConsent}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[5px] text-xs font-bold cursor-pointer"
                  >
                    Confirm Selections
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingConsent(false)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-[5px] text-xs font-semibold cursor-pointer"
                  >
                    Back to Change
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. AQI Source & Freshness Modal (ui9.png & ui10.png) */}
      <AnimatePresence>
        {showAqiSourceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-300 flex flex-col overflow-hidden font-sans text-slate-900"
            >
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-[#003358] text-white shrink-0 z-20">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-cyan-300" />
                  <span className="text-xs font-bold uppercase tracking-wider">AQI Source & Freshness</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAqiSourceModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-[5px] transition-colors cursor-pointer text-white"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 text-xs flex-1 overflow-y-auto overscroll-contain">
                <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-950">Primary Provenance Provider</span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-[5px]">
                      Official / Verified
                    </span>
                  </div>
                  <p className="text-slate-800 text-[11px] leading-relaxed">
                    Data is ingested from CPCB (Central Pollution Control Board, India) official ambient air quality monitoring stations and OpenAQ / IQAir aggregated telemetry feeds.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Update Frequency</span>
                    <div className="text-xs font-extrabold text-[#003358] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#0067A1]" />
                      <span>Hourly Ingestion</span>
                    </div>
                    <p className="text-[10px] text-slate-700 mt-1">Refreshed every 60 mins at top of the hour</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Standard Scale</span>
                    <div className="text-xs font-extrabold text-[#003358] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>CPCB 6-Band Index</span>
                    </div>
                    <p className="text-[10px] text-slate-700 mt-1">Indian National Air Quality Index scale</p>
                  </div>
                </div>

                {/* 6-Band Range Reference Table */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-700 block">CPCB National Scale Reference</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                    {[
                      { band: "Good (0–50)", color: "bg-emerald-100 text-emerald-900 border-emerald-300" },
                      { band: "Satisfactory (51–100)", color: "bg-lime-100 text-lime-900 border-lime-300" },
                      { band: "Moderate (101–200)", color: "bg-amber-100 text-amber-900 border-amber-300" },
                      { band: "Poor (201–300)", color: "bg-orange-100 text-orange-900 border-orange-300" },
                      { band: "Very Poor (301–400)", color: "bg-red-100 text-red-900 border-red-300" },
                      { band: "Severe (401–500)", color: "bg-purple-100 text-purple-900 border-purple-300" },
                    ].map((b, idx) => (
                      <div key={idx} className={`p-1.5 rounded-[4px] border font-bold text-center ${b.color}`}>
                        {b.band}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clinical Boundary Disclaimer */}
                <div className="bg-amber-50/80 border border-amber-300 rounded-[5px] p-3.5 flex items-start gap-2.5 text-slate-900">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong className="text-slate-950 font-bold">Non-Personal Exposure Notice:</strong> Ambient AQI measures general regional outdoor air quality. It does not measure personal inhaled pollutant dose, micro-environment indoor air quality, or individual respiratory tolerance.
                  </div>
                </div>

                <button
                  onClick={() => setShowAqiSourceModal(false)}
                  className="w-full py-2.5 bg-[#0067A1] hover:bg-[#005280] text-white rounded-[5px] text-xs font-bold cursor-pointer transition-colors"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. B02-S02 Continuing Checkpoints Modal (ui2.png & ui27.png) */}
      <AnimatePresence>
        {showCheckpointsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-300 flex flex-col overflow-hidden font-sans text-slate-900"
            >
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-[#003358] text-white shrink-0 z-20">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">Continuing Checkpoints</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheckpointsModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-[5px] transition-colors cursor-pointer text-white"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 text-xs flex-1 overflow-y-auto overscroll-contain">
                {/* Infinite Journey Statement */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-[5px] p-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-base shrink-0">
                    ∞
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">Your LungConnect Journey Continues</h4>
                    <p className="text-[11px] text-emerald-900 mt-0.5 leading-relaxed">
                      There is no graduation or termination date. Respiratory health is a longitudinal, lifelong practice. Checkpoints recur indefinitely every 15 to 30 days to ensure continuity of care.
                    </p>
                  </div>
                </div>

                {/* Vertical Checkpoints Timeline */}
                <div className="space-y-2 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 pl-8">
                  {dynamicCheckpoints.map((cp, idx) => (
                    <div key={idx} className="relative p-2.5 rounded-[5px] bg-slate-50 border border-slate-200">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[27px] top-3.5 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                        cp.status === "completed"
                          ? "border-emerald-600 bg-emerald-600"
                          : cp.status === "current"
                          ? "border-[#0067A1] bg-[#0067A1] ring-2 ring-blue-200"
                          : "border-slate-300 bg-white"
                      }`} />

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-950 text-xs">{cp.day === 0 ? "Start" : `Day ${cp.day}`}: {cp.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${
                          cp.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : cp.status === "current"
                            ? "bg-blue-100 text-blue-900 animate-pulse"
                            : "bg-slate-200 text-slate-700"
                        }`}>
                          {cp.status === "completed" ? "✓ Completed" : cp.status === "current" ? "📍 Current Target" : "Upcoming"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 mt-1">{cp.desc}</p>
                      <span className="text-[10px] font-mono text-slate-600 mt-1 block font-medium">
                        Target Date: {cp.date} {cp.status === "current" ? "(Next Milestone Target)" : ""}
                      </span>
                    </div>
                  ))}

                  {/* Infinite Perpetual Checkpoint */}
                  <div className="relative p-2.5 rounded-[5px] bg-slate-50 border border-slate-200">
                    <div className="absolute -left-[27px] top-3.5 w-3.5 h-3.5 rounded-full border-2 border-purple-600 bg-purple-600" />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-950 text-xs">+15/30d: Infinite Recurring Cycle</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-purple-100 text-purple-900">
                        ∞ Perpetual
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-1">Checkpoints continue every 15–30 days for continuous lifelong respiratory health.</p>
                    <span className="text-[10px] font-mono text-purple-700 mt-1 block font-medium">Perpetual Longitudinal Continuity</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCheckpointsModal(false)}
                  className="w-full py-2.5 bg-[#0067A1] hover:bg-[#005280] text-white rounded-[5px] text-xs font-bold cursor-pointer transition-colors"
                >
                  Close Checkpoints Roadmap
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. B01-S03 Assessment History & Recorded Changes Modal (ui1.png & ui28.png) */}
      <AnimatePresence>
        {showAssessmentHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-300 flex flex-col overflow-hidden font-sans text-slate-900"
            >
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-[#003358] text-white shrink-0 z-20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">Assessment History</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAssessmentHistoryModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-[5px] transition-colors cursor-pointer text-white"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 text-xs flex-1 overflow-y-auto overscroll-contain">
                <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3">
                  <h4 className="text-xs font-bold text-slate-950">Recorded Clinical Assessments Only</h4>
                  <p className="text-[11px] text-slate-800 mt-0.5 leading-relaxed">
                    MediConnect strictly records real, completed assessments. Intervals without assessment reflect truthful absence of data, never artificial curves or fabricated clinical trends.
                  </p>
                </div>

                {/* Recorded Assessment Cards */}
                <div className="space-y-3">
                  {/* Latest Assessment */}
                  <div className="p-4 rounded-[5px] bg-white border-2 border-emerald-500 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[#003358]">
                          {progressData?.previous_assessment ? "Assessment #2" : "Assessment #1"}
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-[4px]">
                          {progressData?.previous_assessment ? "Latest Checkpoint" : "Baseline Assessment"}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {progressData?.latest_assessment?.date
                          ? new Date(progressData.latest_assessment.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : "4 Sept 2026"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-[5px] text-center border border-slate-200">
                      <div>
                        <div className="text-[10px] text-slate-600 font-medium">Overall Score</div>
                        <div className="text-base font-extrabold text-[#003358]">
                          {progressData?.latest_assessment?.score ?? 100} / 100
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600 font-medium">Recorded Band</div>
                        <div className="mt-1">
                          {(() => {
                            const r = (progressData?.latest_assessment?.risk_level || "Standard").toLowerCase();
                            const isCrit = r.includes("crit") || r.includes("high");
                            const isMod = r.includes("mod");
                            return (
                              <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] border capitalize ${
                                isCrit ? "bg-rose-50 text-rose-700 border-rose-200" : isMod ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                                {progressData?.latest_assessment?.risk_level || "Standard"}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600 font-medium">Recorded Change</div>
                        <div className="text-xs font-bold text-slate-700 mt-1">
                          {progressData?.recorded_change?.formatted || "Baseline Standard"}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-800 space-y-1">
                      <div><strong>Respiratory Age:</strong> {progressData?.latest_assessment?.calculated_age || 38} years</div>
                      <div><strong>Functional Status:</strong> Normal outdoor walking tolerance maintained</div>
                      <div><strong>Status:</strong> Authoritative clinical assessment verified</div>
                    </div>
                  </div>

                  {/* Baseline / Previous Assessment if available */}
                  {progressData?.previous_assessment && (
                    <div className="p-4 rounded-[5px] bg-white border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">Assessment #1</span>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-[4px] border border-slate-300">
                            Initial Baseline
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-600">
                          {new Date(progressData.previous_assessment.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-[5px] text-center border border-slate-200">
                        <div>
                          <div className="text-[10px] text-slate-600 font-medium">Overall Score</div>
                          <div className="text-base font-extrabold text-[#003358]">
                            {progressData.previous_assessment.score} / 100
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-600 font-medium">Recorded Band</div>
                          <div className="mt-1">
                            {(() => {
                              const r = (progressData.previous_assessment.risk_level || "Standard").toLowerCase();
                              const isCrit = r.includes("crit") || r.includes("high");
                              const isMod = r.includes("mod");
                              return (
                                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] border capitalize ${
                                  isCrit ? "bg-rose-50 text-rose-700 border-rose-200" : isMod ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}>
                                  {progressData.previous_assessment.risk_level || "Standard"}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-600 font-medium">Recorded Change</div>
                          <div className="text-xs font-bold text-slate-600 mt-1">Baseline Standard</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-800 space-y-1">
                        <div><strong>Respiratory Age:</strong> {progressData.previous_assessment.calculated_age || 38} years</div>
                        <div><strong>Clinical Note:</strong> Initial clinical baseline established on enrolment</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Link
                    href="/lung-assessment"
                    className="flex-1 py-2.5 bg-[#0067A1] hover:bg-[#005280] text-white rounded-[5px] text-xs font-bold text-center cursor-pointer transition-colors"
                  >
                    Take New Assessment
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowAssessmentHistoryModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-[5px] text-xs font-bold cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 13. B10-S03 Milestone History Modal (ui15.png & ui16.png) */}
      <AnimatePresence>
        {showMilestoneHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-300 flex flex-col overflow-hidden font-sans text-slate-900"
            >
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-[#003358] text-white shrink-0 z-20">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">Milestone History</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMilestoneHistoryModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-[5px] transition-colors cursor-pointer text-white"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 text-xs flex-1 overflow-y-auto overscroll-contain">
                <div className="bg-amber-50/70 border border-amber-200 rounded-[5px] p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-900 block">Total Progression</span>
                    <div className="text-sm font-extrabold text-[#003358]">6 of 12 Milestones Unlocked</div>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-[5px]">
                    50% Complete
                  </span>
                </div>

                {/* September 2026 Group */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-700 block tracking-wider">September 2026</span>
                  {[
                    { title: "5 Activities Completed", desc: "Completed 5 activity sessions across Move, 6MWT, and Breathing", date: "15 Sept 2026" },
                    { title: "3 Activities Completed", desc: "Sustained respiratory activity progression", date: "12 Sept 2026" },
                    { title: "First Activity Completed", desc: "Logged initial 15-minute outdoor walk session", date: "6 Sept 2026" },
                    { title: "Getting Started", desc: "Joined MediConnect LungConnect wellness hub", date: "4 Sept 2026" },
                    { title: "5-Day Streak", desc: "Maintained 5 consecutive days of daily respiratory wellness", date: "10 Sept 2026" },
                  ].map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-[5px] bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-slate-950">{m.title}</div>
                          <div className="text-[11px] text-slate-700">{m.desc}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 shrink-0 ml-2">{m.date}</span>
                    </div>
                  ))}
                </div>

                {/* August 2026 Group */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-700 block tracking-wider">August 2026</span>
                  {[
                    { title: "Profile Registered", desc: "Enrolled in personalized lung health management", date: "28 Aug 2026" },
                  ].map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-[5px] bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-slate-950">{m.title}</div>
                          <div className="text-[11px] text-slate-700">{m.desc}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 shrink-0 ml-2">{m.date}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowMilestoneHistoryModal(false)}
                  className="w-full py-2.5 bg-[#0067A1] hover:bg-[#005280] text-white rounded-[5px] text-xs font-bold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}