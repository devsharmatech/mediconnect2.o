"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaLungs, FaMale, FaFemale, FaArrowRight, FaArrowLeft,
  FaCheck, FaWind, FaSmoking, FaCity, FaCloud, FaIndustry,
  FaExclamationTriangle, FaMapMarkerAlt, FaSync,
  FaBuilding, FaTools, FaTree, FaShieldAlt, FaChevronLeft, FaInfoCircle,
  FaPlus, FaMinus
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { getSavedPatientLocation, savePatientLocation } from "@/lib/patientLocation";

const LoginModal = dynamic(
  () => import("@/components/public-site/auth/LoginModal"),
  { ssr: false }
);

/* ── Top-Level Memoized Sub-components (Prevents DOM recreation on re-render for butter-smooth sliding) ── */
const RangeSlider = memo(function RangeSlider({
  label,
  name,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  subtitle = ""
}) {
  const numValue = value === "" || value === undefined || isNaN(value) ? min : Number(value);
  const pct = Math.min(100, Math.max(0, ((numValue - min) / (max - min)) * 100));

  return (
    <div className="bg-white hover:bg-slate-50/40 rounded-xl p-4 sm:p-4.5 border border-slate-200/90 hover:border-[#0067A1]/40 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="flex justify-between items-start mb-2.5 gap-2">
        <div>
          <label className="text-xs sm:text-sm font-bold text-slate-800 block select-none">
            {label}
          </label>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5 font-normal select-none">
              {subtitle}
            </p>
          )}
        </div>

        {/* Stepper + Manual Input Pill */}
        <div className="flex items-center bg-slate-50/90 border border-slate-200/90 focus-within:border-[#0067A1] focus-within:ring-2 focus-within:ring-[#0067A1]/20 rounded-lg p-0.5 shadow-2xs transition-all">
          <button
            type="button"
            onClick={() => {
              const next = Math.max(min, Number((numValue - step).toFixed(2)));
              onChange(name, next);
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-[#0067A1] hover:bg-white active:scale-90 transition-all cursor-pointer select-none"
            title="Decrease"
          >
            <FaMinus className="w-2.5 h-2.5" />
          </button>

          <div className="flex items-center px-1">
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={value ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  onChange(name, "");
                } else {
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed)) onChange(name, parsed);
                }
              }}
              onBlur={(e) => {
                let val = parseFloat(e.target.value);
                if (isNaN(val) || val < min) val = min;
                if (val > max) val = max;
                onChange(name, val);
              }}
              className="w-12 sm:w-14 text-xs sm:text-sm font-bold text-[#0067A1] font-mono text-center bg-transparent outline-none p-0"
            />
            <span className="text-[11px] font-semibold text-[#0067A1]/80 select-none pl-0.5">{unit}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = Math.min(max, Number((numValue + step).toFixed(2)));
              onChange(name, next);
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-[#0067A1] hover:bg-white active:scale-90 transition-all cursor-pointer select-none"
            title="Increase"
          >
            <FaPlus className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* 100% Full Width Slider Track */}
      <div className="relative w-full py-2.5 my-1 block">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={numValue}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) onChange(name, val);
          }}
          style={{
            background: `linear-gradient(to right, #0067A1 0%, #0089cf ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)`,
          }}
          className="smooth-range-slider w-full block cursor-pointer"
        />
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 font-medium select-none">
        <span className="bg-slate-100/90 px-2 py-0.5 rounded text-slate-500 font-mono text-[10px]">{min} {unit}</span>
        <span className="text-[11px] font-bold text-[#0067A1] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100 shadow-2xs">
          {numValue} {unit}
        </span>
        <span className="bg-slate-100/90 px-2 py-0.5 rounded text-slate-500 font-mono text-[10px]">{max} {unit}</span>
      </div>
    </div>
  );
});

const ChoiceCard = memo(function ChoiceCard({ active, onClick, icon, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 sm:p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 sm:gap-3.5 cursor-pointer select-none ${
        active
          ? 'border-[#0067A1] bg-sky-50/70 text-[#0067A1] shadow-xs ring-2 ring-[#0067A1]/20'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
      }`}
    >
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
        active ? 'bg-[#0067A1] text-white shadow-xs' : 'bg-slate-100 text-slate-500'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs sm:text-sm font-semibold leading-tight ${active ? 'text-[#0067A1]' : 'text-slate-800'}`}>
          {title}
        </p>
        {subtitle && (
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-snug font-normal">
            {subtitle}
          </p>
        )}
      </div>
      {active && (
        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#0067A1] text-white flex items-center justify-center shrink-0 shadow-2xs">
          <FaCheck className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
        </div>
      )}
    </button>
  );
});

const ToggleCard = memo(function ToggleCard({ active, onClick, title, subtitle }) {
  return (
    <div
      onClick={onClick}
      className={`p-2.5 sm:p-3.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 select-none ${
        active ? 'border-[#0067A1] bg-sky-50/70 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-xs sm:text-sm font-semibold ${active ? 'text-[#0067A1]' : 'text-slate-800'}`}>{title}</p>
        {subtitle && <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-normal">{subtitle}</p>}
      </div>
      <div className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full p-0.5 sm:p-1 transition-colors shrink-0 ${active ? 'bg-[#0067A1]' : 'bg-slate-200'}`}>
        <motion.div
          layout className="w-4 h-4 bg-white rounded-full shadow-xs"
          animate={{ x: active ? 18 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </div>
  );
});

/* ── Main Component ────────────────────────────────────────── */
export default function GamifiedLungAssessment() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [loading, setLoading] = useState(false);
  const [aqiLoading, setAqiLoading] = useState(false);
  const [aqiInfo, setAqiInfo] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasPreviousAssessment, setHasPreviousAssessment] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const searchDebounceRef = useRef(null);

  // Auto-scroll to top when advancing steps so the page header is always cleanly visible
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const [formData, setFormData] = useState(() => {
    let initialLocation = 'Delhi';
    let initialAqi = 68;
    let initialSex = 'male';
    let initialAge = 35;
    if (typeof window !== 'undefined') {
      const saved = getSavedPatientLocation();
      if (saved?.city && !saved.city.toLowerCase().includes("kartavya") && !saved.city.toLowerCase().includes("rajpath") && saved.city !== 'Delhi') {
        initialLocation = saved.city;
      }
      if (saved?.aqi) initialAqi = saved.aqi;

      try {
        const stored = localStorage.getItem('userData');
        if (stored) {
          const u = JSON.parse(stored);
          const rawGender =
            u.details?.gender ||
            u.profile?.gender ||
            u.user?.details?.gender ||
            u.user?.profile?.gender ||
            u.gender ||
            u.user?.gender;
          if (rawGender) {
            const lower = String(rawGender).toLowerCase().trim();
            if (lower.startsWith('f') || lower === 'female') initialSex = 'female';
            else if (lower.startsWith('m') || lower === 'male') initialSex = 'male';
          }

          const dobStr =
            u.user?.details?.date_of_birth ||
            u.details?.date_of_birth ||
            u.profile?.date_of_birth ||
            u.date_of_birth;
          if (dobStr) {
            const dob = new Date(dobStr);
            if (!isNaN(dob.getTime())) {
              const today = new Date();
              let a = today.getFullYear() - dob.getFullYear();
              const m = today.getMonth() - dob.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
              if (a > 0) initialAge = a;
            }
          }
        }
      } catch (e) {}
    }
    return {
      sex: initialSex,
      age: initialAge,
      height: 172,
      weight: 70,
      smokingStatus: 'never',
      breathHold: 35,
      smokingPackYears: 0,
      peakFlow: 450,
      aqi: initialAqi,
      breathsPerMinute: 16,
      pollutionExposure: 'moderate',
      occupationalRisk: 'none',
      location: initialLocation,
      CoughFrequency: 'none',
      Breathlessness: 'none',
      Wheezing: 'false'
    };
  });

  const fetchAqiForLocation = async (locName, lat = null, lng = null) => {
    try {
      setAqiLoading(true);
      let url = '/api/health/aqi';
      if (lat !== null && lng !== null) {
        url += `?lat=${lat}&lng=${lng}`;
      } else if (locName) {
        url += `?location=${encodeURIComponent(locName)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data?.aqi_data) {
        const item = data.data.aqi_data;
        let resolvedCityName = item.location || locName || "Current Location";
        if (resolvedCityName.toLowerCase().includes("kartavya") || resolvedCityName.toLowerCase().includes("rajpath")) {
          resolvedCityName = "Delhi";
        }

        setFormData(prev => ({
          ...prev,
          aqi: item.aqi ?? prev.aqi,
          location: resolvedCityName
        }));
        setAqiInfo(item);
        
        // Save to global persistent store across whole patient side
        savePatientLocation({
          city: resolvedCityName,
          lat: lat,
          lng: lng,
          aqi: item.aqi,
          isGps: lat !== null && lng !== null,
        });
        return item;
      }
      return null;
    } catch (e) {
      console.warn("Failed to fetch AQI:", e);
      return null;
    } finally {
      setAqiLoading(false);
    }
  };

  const detectUserLocation = async (showToast = false) => {
    setAqiLoading(true);
    let toastId = null;
    if (showToast) {
      toastId = toast.loading("Detecting live location & Google Air Quality...");
    }

    // 0. Prioritize existing saved patient location if set (and clean)
    const saved = getSavedPatientLocation();
    if (saved?.city && !saved.city.toLowerCase().includes("kartavya") && !saved.city.toLowerCase().includes("rajpath") && saved.city !== 'Delhi') {
      const item = await fetchAqiForLocation(saved.city, saved.lat, saved.lng);
      if (item) {
        if (showToast && toastId) toast.success(`Location: ${item.location} (Google AQI: ${item.aqi})`, { id: toastId });
        return item;
      }
    }

    // 1. Try browser GPS first (fast timeout, works across desktop/mobile)
    if (typeof window !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 60000
          });
        });
        if (pos?.coords) {
          const item = await fetchAqiForLocation(null, pos.coords.latitude, pos.coords.longitude);
          if (item) {
            if (showToast && toastId) toast.success(`Detected: ${item.location} (Google AQI: ${item.aqi})`, { id: toastId });
            return item;
          }
        }
      } catch (gpsErr) {
        console.warn("Browser GPS unavailable or timed out, trying IP fallback...", gpsErr);
      }
    }

    // 2. Fast IP Geolocation fallback (BigDataCloud HTTPS client, no Cloudflare captcha blocks)
    try {
      const bdcRes = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client').catch(() => null);
      if (bdcRes && bdcRes.ok) {
        const bdcData = await bdcRes.json();
        const city = bdcData.city || bdcData.locality || bdcData.principalSubdivision;
        if (city && !city.toLowerCase().includes("kartavya") && !city.toLowerCase().includes("rajpath")) {
          const item = await fetchAqiForLocation(city, bdcData.latitude, bdcData.longitude);
          if (item) {
            if (showToast && toastId) toast.success(`Detected Region: ${item.location} (Google AQI: ${item.aqi})`, { id: toastId });
            return item;
          }
        }
      }
    } catch (ipErr) {
      console.warn("IP geolocation fallback failed:", ipErr);
    }

    // 3. Final fallback: Use saved patient location or default to Delhi
    const fallbackCity = (saved?.city && !saved.city.toLowerCase().includes("kartavya")) ? saved.city : 'Delhi';
    const fallbackItem = await fetchAqiForLocation(fallbackCity);
    if (showToast && toastId) {
      toast.error(`Could not auto-detect location. Using ${fallbackCity}.`, { id: toastId });
    }
    return fallbackItem;
  };

  const handleManualLocationUpdate = (customLoc) => {
    const query = (customLoc !== undefined ? customLoc : formData.location || '').trim();
    if (!query) {
      toast.error("Please enter a city name.");
      return;
    }
    const tId = toast.loading(`Fetching live Google AQI for ${query}...`);
    fetchAqiForLocation(query).then(item => {
      if (item) {
        savePatientLocation({
          city: item.location || query,
          aqi: item.aqi,
          forceReset: true,
        });
        toast.success(`${item.location} · Google AQI: ${item.aqi} (${item.category || 'Satisfactory'})`, { id: tId });
      } else {
        toast.error(`Could not update air quality for "${query}"`, { id: tId });
      }
    });
  };

  const handleLocationInputChange = (val) => {
    setFormData(prev => ({ ...prev, location: val }));
    if (!val || val.trim().length < 2) {
      setLocationSuggestions([]);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        setIsSearchingLocation(true);
        const res = await fetch(`/api/location/search?query=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.suggestions)) {
          setLocationSuggestions(data.suggestions);
        } else {
          setLocationSuggestions([]);
        }
      } catch (err) {
        console.warn("Location suggestion fetch error:", err);
        setLocationSuggestions([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 280);
  };

  const handleSelectLocationSuggestion = async (sug) => {
    setLocationSuggestions([]);
    const locName = sug.name || sug.main_text || sug.text || "";
    setFormData(prev => ({ ...prev, location: locName }));

    const tId = toast.loading(`Loading Google Air Quality for ${locName}...`);
    try {
      let lat = null;
      let lng = null;

      const pId = sug.placeId || sug.place_id;
      if (pId) {
        const placeRes = await fetch(`/api/location/search?place_id=${encodeURIComponent(pId)}`);
        const placeData = await placeRes.json();
        if (placeData.success && placeData.data) {
          lat = placeData.data.latitude;
          lng = placeData.data.longitude;
        }
      }

      const item = await fetchAqiForLocation(locName, lat, lng);
      if (item) {
        toast.success(`${item.location || locName} · Google AQI: ${item.aqi} (${item.category || 'Live'})`, { id: tId });
      } else {
        toast.dismiss(tId);
      }
    } catch (e) {
      console.warn("Failed resolving place details:", e);
      toast.error(`Could not fetch details for ${locName}`, { id: tId });
    }
  };

  useEffect(() => {
    // Clean any legacy "Kartavya Path" glitch from localStorage
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("mediconnect_patient_location");
        if (raw && (raw.toLowerCase().includes("kartavya") || raw.toLowerCase().includes("rajpath"))) {
          localStorage.removeItem("mediconnect_patient_location");
        }
      } catch (_) {}
    }

    // Automatically detect or sync user location on initial mount
    detectUserLocation(false);

    // Sync if location updated elsewhere
    const handleLocationUpdate = (e) => {
      const loc = e.detail;
      if (loc?.city) {
        setFormData(prev => ({
          ...prev,
          location: loc.city,
          aqi: loc.aqi ?? prev.aqi,
        }));
      }
    };
    window.addEventListener("patient-location-updated", handleLocationUpdate);

    try {
      const stored = localStorage.getItem('userData');
      const userId = localStorage.getItem('userId');
      if (stored) {
        const u = JSON.parse(stored);
        const rawGender =
          u.details?.gender ||
          u.profile?.gender ||
          u.user?.details?.gender ||
          u.user?.profile?.gender ||
          u.gender ||
          u.user?.gender;
        if (rawGender) {
          const lower = String(rawGender).toLowerCase().trim();
          if (lower.startsWith('f') || lower === 'female') {
            setFormData(prev => ({ ...prev, sex: 'female' }));
          } else if (lower.startsWith('m') || lower === 'male') {
            setFormData(prev => ({ ...prev, sex: 'male' }));
          }
        }

        const dobStr =
          u.user?.details?.date_of_birth ||
          u.details?.date_of_birth ||
          u.profile?.date_of_birth ||
          u.date_of_birth;
        if (dobStr) {
          const dob = new Date(dobStr);
          if (!isNaN(dob.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
            if (age > 0) setFormData(prev => ({ ...prev, age }));
          }
        }
      }

      // Also verify with latest profile from API if userId is present
      if (userId) {
        fetch(`/api/patient/profile?id=${userId}`)
          .then(r => r.json())
          .then(res => {
            if (res.success && res.data) {
              const fresh = res.data;
              const g =
                fresh.gender ||
                fresh.details?.gender ||
                fresh.profile?.gender ||
                fresh.user?.details?.gender;
              if (g) {
                const lower = String(g).toLowerCase().trim();
                if (lower.startsWith('f') || lower === 'female') {
                  setFormData(prev => ({ ...prev, sex: 'female' }));
                } else if (lower.startsWith('m') || lower === 'male') {
                  setFormData(prev => ({ ...prev, sex: 'male' }));
                }
              }
              const freshDob =
                fresh.date_of_birth ||
                fresh.details?.date_of_birth ||
                fresh.profile?.date_of_birth;
              if (freshDob) {
                const dob = new Date(freshDob);
                if (!isNaN(dob.getTime())) {
                  const today = new Date();
                  let age = today.getFullYear() - dob.getFullYear();
                  const m = today.getMonth() - dob.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                  if (age > 0) setFormData(prev => ({ ...prev, age }));
                }
              }
            }
          })
          .catch(e => console.warn("Could not fetch fresh user profile in lung-assessment:", e));
      }

      // Also fetch previous lung assessment to prefill user's previous metrics
      const resolvedUid = userId || (() => {
        try {
          const u = JSON.parse(stored || '{}');
          return u.id || u.user_id || u.user?.id;
        } catch (_) { return null; }
      })();

      if (resolvedUid) {
        fetch(`/api/health/assessments?userId=${resolvedUid}&type=lung&limit=1`)
          .then(r => r.json())
          .then(res => {
            const assessment = res?.data?.assessments?.[0];
            const inputs = assessment?.lung_health_inputs?.[0];
            if (inputs) {
              setHasPreviousAssessment(true);
              setFormData(prev => ({
                ...prev,
                sex: inputs.gender
                  ? (String(inputs.gender).toLowerCase().trim().startsWith('f') || String(inputs.gender).toLowerCase().trim() === 'female' ? 'female' : 'male')
                  : prev.sex,
                age: inputs.age ? Number(inputs.age) : prev.age,
                height: inputs.height_cm ? Number(inputs.height_cm) : prev.height,
                weight: inputs.weight_kg ? Number(inputs.weight_kg) : prev.weight,
                smokingStatus: inputs.smoking_status || prev.smokingStatus,
                breathHold: inputs.breath_holding_time ? Number(inputs.breath_holding_time) : prev.breathHold,
                smokingPackYears: inputs.smoking_pack_years !== undefined && inputs.smoking_pack_years !== null
                  ? Number(inputs.smoking_pack_years)
                  : (inputs.pack_years !== undefined && inputs.pack_years !== null ? Number(inputs.pack_years) : prev.smokingPackYears),
                peakFlow: inputs.peak_flow ? Number(inputs.peak_flow) : prev.peakFlow,
                breathsPerMinute: inputs.breaths_per_minute ? Number(inputs.breaths_per_minute) : prev.breathsPerMinute,
                pollutionExposure: inputs.pollution_exposure || prev.pollutionExposure,
                occupationalRisk: inputs.occupational_exposure || prev.occupationalRisk,
                location: inputs.location || prev.location,
                aqi: inputs.aqi ? Number(inputs.aqi) : prev.aqi,
                CoughFrequency: inputs.cough_frequency || prev.CoughFrequency,
                Breathlessness: inputs.breathlessness || prev.Breathlessness,
                Wheezing: inputs.wheezing !== undefined && inputs.wheezing !== null ? String(inputs.wheezing) : prev.Wheezing,
              }));
            }
          })
          .catch(e => console.warn("Could not fetch previous lung assessment:", e));
      }
    } catch (e) { console.warn("Could not load DOB / Gender:", e); }

    return () => window.removeEventListener("patient-location-updated", handleLocationUpdate);
  }, []);

  const handleSliderChange = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSelect = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const userData = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
      if (!userData) {
        setLoading(false);
        setShowLoginModal(true);
        toast.error('Please log in to save your assessment.');
        return;
      }
      const user = JSON.parse(userData);
      const userId = user.user_id || user.user?.id || user.id;
      const resolvedPatientName =
        user?.details?.full_name ||
        user?.details?.name ||
        user?.full_name ||
        user?.name ||
        user?.user?.details?.full_name ||
        user?.user?.name ||
        (typeof window !== 'undefined' ? (localStorage.getItem('userName') || localStorage.getItem('patient_name')) : '') ||
        '';

      const bmi = (formData.weight / ((formData.height / 100) ** 2)).toFixed(1);
      const apiData = {
        user_id: userId,
        assessment_type: 'lung',
        patient_name: resolvedPatientName,
        patientName: resolvedPatientName,
        inputs: {
          patient_name: resolvedPatientName,
          age: parseInt(formData.age) || 0,
          gender: formData.sex || '',
          height_cm: parseFloat(formData.height) || 0,
          weight_kg: parseFloat(formData.weight) || 0,
          smoking_status: formData.smokingStatus || '',
          breath_holding_time: parseInt(formData.breathHold) || 0,
          cough_frequency: formData.CoughFrequency || '',
          breathlessness: formData.Breathlessness || '',
          wheezing: formData.Wheezing === 'true',
          pollution_exposure: formData.pollutionExposure || 'low',
          occupational_exposure: formData.occupationalRisk || 'none',
          peak_flow: parseInt(formData.peakFlow) || 450,
          aqi: parseInt(formData.aqi) || 60,
          breaths_per_minute: parseInt(formData.breathsPerMinute) || 16,
          location: formData.location || 'Delhi',
          pack_years: parseFloat(formData.smokingPackYears) || 0,
          bmi: parseFloat(bmi) || 22.5
        }
      };
      const response = await fetch('/api/v2/ai/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });
      const result = await response.json();
      if (result.success) {
        const finalPatientName = result.data?.patient_name || result.data?.patientName || resolvedPatientName || '';
        const assessmentPayload = {
          ...result.data,
          patient_name: finalPatientName,
          patientName: finalPatientName
        };
        sessionStorage.setItem('lungAssessmentResult', JSON.stringify(assessmentPayload));
        router.push('/lung-health-result');
      } else {
        toast.error('Failed to submit: ' + (result.message || 'Error'));
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = [
    { num: 1, name: "Profile", shortName: "Profile", title: "Physical Profile", desc: "Physical measurements and biological factors." },
    { num: 2, name: "Habits", shortName: "Habits", title: "Habits & Breathing", desc: "Breath-holding time and smoking history." },
    { num: 3, name: "Function", shortName: "Function", title: "Lung Function Telemetry", desc: "Breathing rate and peak airflow telemetry." },
    { num: 4, name: "Environment", shortName: "Environ", title: "Environmental & Occupational Exposure", desc: "Indian CPCB AQI and environmental exposure telemetry." },
    { num: 5, name: "Symptoms", shortName: "Symptoms", title: "Respiratory Symptoms", desc: "Recorded cough frequency and clinical symptom indicators." }
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 pt-3 sm:pt-6 pb-48 sm:pb-28 px-3 sm:px-6 font-sans">
      <div className="max-w-2xl sm:max-w-3xl mx-auto space-y-3 sm:space-y-4">

        {/* ── Page Header (Original Blue Gradient Header Restored) ── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#003358] via-[#0067A1] to-[#0284c7] p-3.5 sm:p-5 text-white shadow-sm border border-[#005584]"
        >
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
          <div className="relative flex items-center gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center shrink-0 shadow-sm">
              <FaLungs className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <h1 className="text-xs sm:text-base md:text-lg font-bold tracking-tight text-white leading-snug">
                  Respiratory Wellness Assessment
                </h1>
                <span className="text-[10px] sm:text-xs font-semibold bg-white/20 border border-white/30 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
                  Step {currentStep}/{totalSteps}
                </span>
              </div>
              <p className="text-sky-100 text-[10px] sm:text-sm mt-0.5 font-normal leading-normal">
                Standardized non-diagnostic respiratory telemetry
              </p>
              <div className="mt-2 sm:mt-2.5 flex gap-1 sm:gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i < currentStep ? 'bg-white w-4 sm:w-6' : 'bg-white/30 w-2 sm:w-3'}`} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Safety Notice ── */}
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-amber-50/90 border border-amber-200/90 rounded-lg p-2.5 sm:p-3 flex items-start gap-2 sm:gap-2.5 text-[11px] sm:text-xs text-amber-900 leading-relaxed shadow-2xs"
        >
          <FaExclamationTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold text-amber-950">Safety Notice: </span>
            For sudden breathlessness, chest tightness, or coughing blood, seek immediate emergency medical care. This assessment is not a diagnostic tool.
          </p>
        </motion.div>

        {/* ── Existing Telemetry Auto-Loaded Banner ── */}
        {hasPreviousAssessment && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 sm:p-3 flex items-start gap-2 sm:gap-2.5 text-[11px] sm:text-xs text-slate-800 leading-relaxed shadow-2xs"
          >
            <FaSync className="w-3.5 h-3.5 text-[#0067A1] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#003358]">Previous Assessment Loaded: </span>
              Your recent respiratory metrics and lifestyle entries have been pre-filled. Adjust any current readings below before submitting.
            </div>
          </motion.div>
        )}

        {/* ── Step Progress Indicator ── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-4 shadow-2xs"
        >
          <div className="relative">
            {/* Progress track */}
            <div className="absolute left-[10%] right-[10%] top-3.5 sm:top-4 h-0.5 bg-slate-100 rounded-full overflow-hidden pointer-events-none -z-0">
              <div
                className="h-full bg-[#0067A1] transition-all duration-300 rounded-full"
                style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
              />
            </div>
            <div className="grid grid-cols-5 gap-0.5 sm:gap-1 relative z-10">
              {stepLabels.map((s) => {
                const isDone = currentStep > s.num;
                const isCurrent = currentStep === s.num;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => s.num < currentStep && setCurrentStep(s.num)}
                    disabled={s.num > currentStep}
                    className={`flex flex-col items-center gap-1 sm:gap-1.5 transition-all group ${
                      s.num < currentStep ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs transition-all ${
                      isDone
                        ? 'bg-[#0067A1] text-white shadow-2xs font-semibold'
                        : isCurrent
                        ? 'bg-sky-50 border-2 border-[#0067A1] text-[#0067A1] font-bold ring-2 sm:ring-4 ring-[#0067A1]/15 shadow-xs'
                        : 'bg-white border-2 border-slate-200 text-slate-400 font-medium group-hover:border-slate-300'
                    }`}>
                      {isDone ? <FaCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" /> : <span>{s.num}</span>}
                    </div>
                    <p className={`text-[10px] sm:text-xs text-center font-medium leading-tight truncate max-w-full px-0.5 ${
                      isCurrent ? 'text-[#0067A1] font-bold' : isDone ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      <span className="hidden sm:inline">{s.name}</span>
                      <span className="sm:hidden">{s.shortName}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Form Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
        >
          {/* Step header */}
          <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0067A1] text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                {currentStep}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xs sm:text-base font-bold text-slate-900 leading-tight">
                  {stepLabels[currentStep - 1]?.title}
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
                  {stepLabels[currentStep - 1]?.desc}
                </p>
              </div>
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md shrink-0">
              Step {currentStep}/{totalSteps}
            </span>
          </div>

          {/* Step content */}
          <div className="p-3.5 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >

                {/* STEP 1: Profile */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">Biological Sex</label>
                      <div className="grid grid-cols-2 gap-3">
                        <ChoiceCard active={formData.sex === 'male'} onClick={() => handleSelect('sex', 'male')} icon={<FaMale className="w-4 h-4" />} title="Male" subtitle="Assigned at birth" />
                        <ChoiceCard active={formData.sex === 'female'} onClick={() => handleSelect('sex', 'female')} icon={<FaFemale className="w-4 h-4" />} title="Female" subtitle="Assigned at birth" />
                      </div>
                    </div>
                    <RangeSlider label="Age" name="age" value={formData.age} onChange={handleSliderChange} min={18} max={100} unit="yrs" subtitle="Auto-synced from your profile date of birth" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <RangeSlider label="Height" name="height" value={formData.height} onChange={handleSliderChange} min={120} max={220} unit="cm" subtitle="Used to calculate expected lung volume" />
                      <RangeSlider label="Weight" name="weight" value={formData.weight} onChange={handleSliderChange} min={40} max={150} unit="kg" subtitle="Used for BMI baseline" />
                    </div>
                  </div>
                )}

                {/* STEP 2: Habits */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">Smoking History</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <ChoiceCard active={formData.smokingStatus === 'never'} onClick={() => handleSelect('smokingStatus', 'never')} icon={<FaTree className="w-4 h-4" />} title="Never" subtitle="Never smoked" />
                        <ChoiceCard active={formData.smokingStatus === 'former'} onClick={() => handleSelect('smokingStatus', 'former')} icon={<FaSmoking className="w-4 h-4" />} title="Former" subtitle="Quit smoking" />
                        <ChoiceCard active={formData.smokingStatus === 'current'} onClick={() => handleSelect('smokingStatus', 'current')} icon={<FaSmoking className="w-4 h-4 text-rose-500" />} title="Current" subtitle="Active smoker" />
                      </div>
                    </div>
                    <RangeSlider label="Breath Holding Time" name="breathHold" value={formData.breathHold} onChange={handleSliderChange} min={5} max={120} unit="sec" subtitle="Hold breath after normal inhale (Clinical normal > 25s)" />
                    {(formData.smokingStatus === 'former' || formData.smokingStatus === 'current') && (
                      <RangeSlider label="Smoking Pack-Years" name="smokingPackYears" value={formData.smokingPackYears} onChange={handleSliderChange} min={0} max={100} step={0.5} unit="years" subtitle="Packs per day × years smoked" />
                    )}
                  </div>
                )}

                {/* STEP 3: Lung Function */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <RangeSlider label="Peak Flow (PEFR - Optional)" name="peakFlow" value={formData.peakFlow} onChange={handleSliderChange} min={100} max={800} unit="L/min" subtitle="Measure with peak flow meter if available (Normal: 400-600)" />
                    <RangeSlider label="Breaths Per Minute" name="breathsPerMinute" value={formData.breathsPerMinute} onChange={handleSliderChange} min={8} max={40} unit="breaths" subtitle="Resting count of chest rises in 60 seconds (Normal: 12-20)" />
                  </div>
                )}

                {/* STEP 4: Environment */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    {/* Location & AQI Station Card */}
                    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3.5">
                      
                      {/* Search & Action Bar with Google Places Suggestions */}
                      <div className="flex items-center gap-2 relative">
                        <div className="relative flex-1">
                          <FaMapMarkerAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10" />
                          <input
                            type="text"
                            placeholder="Search any city or place (e.g. Khurja, Bulandshahr, Noida)..."
                            value={formData.location}
                            onChange={(e) => handleLocationInputChange(e.target.value)}
                            onFocus={() => {
                              if (formData.location && formData.location.trim().length >= 2) {
                                handleLocationInputChange(formData.location);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setLocationSuggestions([]);
                                handleManualLocationUpdate();
                              }
                            }}
                            className="w-full text-xs sm:text-sm font-normal pl-9 pr-9 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-white text-slate-800 shadow-2xs transition-all"
                          />
                          {isSearchingLocation && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <FaSync className="w-3.5 h-3.5 text-[#0067A1] animate-spin" />
                            </div>
                          )}

                          {/* Google Places Autocomplete Suggestions Dropdown */}
                          {locationSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
                              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                                <span className="flex items-center gap-1.5 text-[#0067A1]">
                                  <FaMapMarkerAlt className="w-3 h-3" /> Google Places
                                </span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-normal">Select a location</span>
                              </div>
                              {locationSuggestions.map((sug, idx) => (
                                <button
                                  key={sug.place_id || sug.placeId || idx}
                                  type="button"
                                  onClick={() => handleSelectLocationSuggestion(sug)}
                                  className="w-full px-3.5 py-2.5 text-left hover:bg-sky-50/80 flex items-center justify-between transition-colors cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0067A1] group-hover:bg-[#0067A1] group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                                      <FaMapMarkerAlt className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="truncate">
                                      <span className="text-xs sm:text-sm font-bold text-slate-800 block truncate group-hover:text-[#0067A1] transition-colors">
                                        {sug.main_text || sug.name || sug.text}
                                      </span>
                                      {(sug.secondaryText || sug.secondary_text || sug.text) && (
                                        <span className="text-[11px] text-slate-400 block truncate">
                                          {sug.secondaryText || sug.secondary_text || sug.text}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-semibold text-[#0067A1] shrink-0 px-2 py-0.5 rounded bg-blue-50 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                                    Select
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLocationSuggestions([]);
                            handleManualLocationUpdate();
                          }}
                          disabled={aqiLoading || !formData.location?.trim()}
                          className="px-4 py-2.5 bg-[#0067A1] hover:bg-[#005584] text-white text-xs sm:text-sm font-medium rounded-lg transition-all shrink-0 cursor-pointer disabled:opacity-50 shadow-2xs"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLocationSuggestions([]);
                            detectUserLocation(true);
                          }}
                          disabled={aqiLoading}
                          title="Detect GPS Location"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-sky-50 text-[#0067A1] border border-sky-200 text-xs sm:text-sm font-medium rounded-lg transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs"
                        >
                          <FaSync className={`w-3.5 h-3.5 ${aqiLoading ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">GPS</span>
                        </button>
                      </div>

                      {/* Quick City Chips */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500 font-medium">Quick Select:</span>
                        {['Khurja', 'Bulandshahr', 'Delhi', 'Noida', 'Meerut', 'Mumbai'].map(city => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, location: city }));
                              handleManualLocationUpdate(city);
                            }}
                            className={`text-xs px-3 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                              formData.location?.toLowerCase() === city.toLowerCase()
                                ? 'bg-[#0067A1] text-white border-[#0067A1] shadow-2xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>

                      {/* Live Google Air Quality Telemetry Display */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3.5">
                            <div className={`px-3 py-2 rounded-lg text-center border font-mono min-w-[62px] shadow-2xs ${
                              formData.aqi <= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              formData.aqi <= 100 ? 'bg-teal-50 text-teal-700 border-teal-200' :
                              formData.aqi <= 200 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              formData.aqi <= 300 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              formData.aqi <= 400 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-red-50 text-red-900 border-red-300'
                            }`}>
                              <span className="text-xl font-bold leading-none">{formData.aqi}</span>
                              <span className="text-[10px] tracking-wider block uppercase font-semibold mt-0.5 opacity-80">CPCB</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                                  formData.aqi <= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  formData.aqi <= 100 ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                  formData.aqi <= 200 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  formData.aqi <= 300 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                  formData.aqi <= 400 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  'bg-red-50 text-red-900 border-red-200'
                                }`}>
                                  {aqiInfo?.category || (
                                    formData.aqi <= 50 ? 'Good' :
                                    formData.aqi <= 100 ? 'Satisfactory' :
                                    formData.aqi <= 200 ? 'Moderate' :
                                    formData.aqi <= 300 ? 'Poor' :
                                    formData.aqi <= 400 ? 'Very Poor' : 'Severe'
                                  )}
                                </span>
                                <span className="text-sm font-semibold text-slate-800">
                                  {formData.location || 'Current Station'}
                                </span>
                                {aqiInfo?.dominant_pollutant && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-200">
                                    Dominant: {aqiInfo.dominant_pollutant}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="font-medium text-slate-600">
                                  {aqiInfo?.provider || aqiInfo?.source || 'Google Air Quality API'}
                                </span>
                                <span>· CPCB NAQI Standard (Live)</span>
                              </p>
                            </div>
                          </div>

                          {aqiInfo?.pollutant_data && (
                            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto text-xs text-slate-600 font-medium">
                              {aqiInfo.pollutant_data.pm2_5 !== null && aqiInfo.pollutant_data.pm2_5 !== undefined && (
                                <div className="bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200 text-center sm:text-left">
                                  PM2.5: <span className="text-slate-800 font-bold">{aqiInfo.pollutant_data.pm2_5}</span> µg/m³
                                </div>
                              )}
                              {aqiInfo.pollutant_data.pm10 !== null && aqiInfo.pollutant_data.pm10 !== undefined && (
                                <div className="bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200 text-center sm:text-left">
                                  PM10: <span className="text-slate-800 font-bold">{aqiInfo.pollutant_data.pm10}</span> µg/m³
                                </div>
                              )}
                              {aqiInfo.pollutant_data.no2 !== null && aqiInfo.pollutant_data.no2 !== undefined && (
                                <div className="hidden lg:block bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200 text-center sm:text-left">
                                  NO₂: <span className="text-slate-800 font-bold">{aqiInfo.pollutant_data.no2}</span> ppb
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 font-normal leading-relaxed pt-2 border-t border-slate-100">
                          {aqiInfo?.health_advisory || (formData.aqi <= 100 ? "Air quality is Satisfactory. Minor discomfort to sensitive individuals. Suitable for routine outdoor activity." : "Elevated ambient particulate matter — sensitive groups should reduce prolonged outdoor exertion.")}
                        </p>
                      </div>
                    </div>

                    {/* Environmental Notice */}
                    <div className="p-3 bg-sky-50/70 rounded-lg border border-sky-200/70 text-xs text-sky-900 leading-relaxed shadow-2xs flex items-center gap-2.5">
                      <FaInfoCircle className="w-4 h-4 text-[#0067A1] shrink-0" />
                      <p>
                        <span className="font-semibold text-[#0067A1]">Environmental Telemetry:</span> Real-time AQI provides localized exposure context without skewing your baseline physiological score.
                      </p>
                    </div>

                    {/* Daily Pollution Exposure */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                        Daily Pollution Exposure
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <ChoiceCard
                          active={formData.pollutionExposure === 'low'}
                          onClick={() => handleSelect('pollutionExposure', 'low')}
                          icon={<FaTree className="w-3.5 h-3.5" />}
                          title="Low Exposure"
                          subtitle="Clean air / rural area"
                        />
                        <ChoiceCard
                          active={formData.pollutionExposure === 'moderate'}
                          onClick={() => handleSelect('pollutionExposure', 'moderate')}
                          icon={<FaCity className="w-3.5 h-3.5" />}
                          title="Moderate Exposure"
                          subtitle="Urban / traffic corridor"
                        />
                        <ChoiceCard
                          active={formData.pollutionExposure === 'high'}
                          onClick={() => handleSelect('pollutionExposure', 'high')}
                          icon={<FaIndustry className="w-3.5 h-3.5" />}
                          title="High Exposure"
                          subtitle="Industrial / heavy smog"
                        />
                      </div>
                    </div>

                    {/* Occupational Dust/Fume Exposure */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                        Occupational Dust / Fume Exposure
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <ChoiceCard
                          active={formData.occupationalRisk === 'none'}
                          onClick={() => handleSelect('occupationalRisk', 'none')}
                          icon={<FaBuilding className="w-3.5 h-3.5" />}
                          title="No Exposure"
                          subtitle="Office / indoor space"
                        />
                        <ChoiceCard
                          active={formData.occupationalRisk === 'moderate'}
                          onClick={() => handleSelect('occupationalRisk', 'moderate')}
                          icon={<FaTools className="w-3.5 h-3.5" />}
                          title="Moderate Exposure"
                          subtitle="Dust, construction, trade"
                        />
                        <ChoiceCard
                          active={formData.occupationalRisk === 'high'}
                          onClick={() => handleSelect('occupationalRisk', 'high')}
                          icon={<FaIndustry className="w-3.5 h-3.5 text-rose-500" />}
                          title="High Exposure"
                          subtitle="Factory, chemical, welding"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: Symptoms */}
                {currentStep === 5 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">Cough Frequency</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <ChoiceCard active={formData.CoughFrequency === 'none'} onClick={() => handleSelect('CoughFrequency', 'none')} icon={<FaShieldAlt className="w-3.5 h-3.5" />} title="None" subtitle="No regular cough" />
                        <ChoiceCard active={formData.CoughFrequency === 'occasional'} onClick={() => handleSelect('CoughFrequency', 'occasional')} icon={<FaWind className="w-3.5 h-3.5" />} title="Occasional" subtitle="Rare episodes / throat clearing" />
                        <ChoiceCard active={formData.CoughFrequency === 'daily'} onClick={() => handleSelect('CoughFrequency', 'daily')} icon={<FaWind className="w-3.5 h-3.5 text-amber-500" />} title="Daily" subtitle="Frequent / several times a day" />
                        <ChoiceCard active={formData.CoughFrequency === 'constant'} onClick={() => handleSelect('CoughFrequency', 'constant')} icon={<FaWind className="w-3.5 h-3.5 text-rose-500" />} title="Constant" subtitle="Persistent throughout day & night" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">Breathlessness (MRC Dyspnea Scale)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <ChoiceCard active={formData.Breathlessness === 'none'} onClick={() => handleSelect('Breathlessness', 'none')} icon={<FaShieldAlt className="w-3.5 h-3.5" />} title="None" subtitle="Normal breathing during routine exertion" />
                        <ChoiceCard active={formData.Breathlessness === 'mild'} onClick={() => handleSelect('Breathlessness', 'mild')} icon={<FaExclamationTriangle className="w-3.5 h-3.5" />} title="Mild" subtitle="Only with strenuous exercise" />
                        <ChoiceCard active={formData.Breathlessness === 'moderate'} onClick={() => handleSelect('Breathlessness', 'moderate')} icon={<FaExclamationTriangle className="w-3.5 h-3.5 text-amber-500" />} title="Moderate" subtitle="When walking uphill or hurrying" />
                        <ChoiceCard active={formData.Breathlessness === 'severe'} onClick={() => handleSelect('Breathlessness', 'severe')} icon={<FaExclamationTriangle className="w-3.5 h-3.5 text-rose-500" />} title="Severe" subtitle="Stop for breath after walking 100 meters" />
                      </div>
                    </div>

                    <ToggleCard
                      active={formData.Wheezing === 'true'}
                      onClick={() => handleSelect('Wheezing', formData.Wheezing === 'true' ? 'false' : 'true')}
                      title="Do you experience wheezing?"
                      subtitle="A high-pitched whistling sound while breathing out"
                    />

                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2.5">
                      <FaExclamationTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-900 leading-relaxed font-normal">
                        <span className="font-semibold">Clinical Guidance:</span> If you experience new or worsening respiratory distress, chest tightness, or hemoptysis (blood in sputum), seek emergency clinical evaluation immediately.
                      </p>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Navigation Footer ── */}
          <div className="px-3.5 sm:px-6 py-3 sm:py-4 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/70 transition-all cursor-pointer ${
                currentStep === 1 ? 'opacity-0 pointer-events-none' : ''
              }`}
            >
              <FaArrowLeft className="w-3 h-3" /> Back
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0067A1] hover:bg-[#005584] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Next Step <FaArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0067A1] hover:bg-[#005584] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <><FaSync className="w-3.5 h-3.5 animate-spin" /> Calculating...</>
                ) : (
                  <><FaLungs className="w-3.5 h-3.5" /> Calculate Score</>
                )}
              </button>
            )}
          </div>
        </motion.div>

      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        initialUserType="patient"
        onSuccess={() => { setShowLoginModal(false); handleSubmit(); }}
      />
    </div>
  );
}
