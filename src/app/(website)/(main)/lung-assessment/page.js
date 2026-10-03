"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaLungs, FaMale, FaFemale, FaArrowRight, FaArrowLeft,
  FaCheck, FaWind, FaSmoking, FaCity, FaCloud, FaIndustry,
  FaExclamationTriangle, FaMapMarkerAlt, FaSync,
  FaBuilding, FaTools, FaTree, FaShieldAlt, FaChevronLeft, FaInfoCircle
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { getSavedPatientLocation, savePatientLocation } from "@/lib/patientLocation";

const LoginModal = dynamic(
  () => import("@/components/public-site/auth/LoginModal"),
  { ssr: false }
);



/* ── Main Component ────────────────────────────────────────── */
export default function GamifiedLungAssessment() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [loading, setLoading] = useState(false);
  const [aqiLoading, setAqiLoading] = useState(false);
  const [aqiInfo, setAqiInfo] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
      if (saved?.city && saved.city !== 'Delhi') initialLocation = saved.city;
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
        const resolvedCityName = item.location || locName || "Current Location";
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

    // 0. Prioritize existing saved patient location if set
    const saved = getSavedPatientLocation();
    if (saved?.city && saved.city !== 'Delhi') {
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
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 120000
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

    // 2. Fast IP Geolocation fallback (works without prompt across desktop/mobile)
    try {
      const ipRes = await fetch('https://ipapi.co/json/').catch(() => null);
      if (ipRes && ipRes.ok) {
        const ipData = await ipRes.json();
        const city = ipData.city || ipData.region || saved?.city || 'Delhi';
        const item = await fetchAqiForLocation(city, ipData.latitude, ipData.longitude);
        if (item) {
          if (showToast && toastId) toast.success(`Region: ${item.location} (Google AQI: ${item.aqi})`, { id: toastId });
          return item;
        }
      }
    } catch (ipErr) {
      console.warn("IP fallback failed:", ipErr);
    }

    // 3. Final fallback: Use saved patient location or default to Delhi
    const fallbackCity = saved?.city || 'Delhi';
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

  useEffect(() => {
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
    } catch (e) { console.warn("Could not load DOB / Gender:", e); }

    return () => window.removeEventListener("patient-location-updated", handleLocationUpdate);
  }, []);

  const handleSliderChange = (name, value) => setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
  const handleSelect = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const userData = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
      if (!userData) { setLoading(false); setShowLoginModal(true); toast.error('Please log in to save your assessment.'); return; }
      const user = JSON.parse(userData);
      const userId = user.user_id || user.user?.id || user.id;
      const bmi = (formData.weight / ((formData.height / 100) ** 2)).toFixed(1);
      const apiData = {
        user_id: userId,
        assessment_type: 'lung',
        inputs: {
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
          location: formData.location || 'Metropolis',
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
        sessionStorage.setItem('lungAssessmentResult', JSON.stringify(result.data));
        router.push('/lung-health-result');
      } else {
        alert('Failed to submit: ' + (result.message || 'Error'));
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Sub-components ── */
  const RangeSlider = ({ label, name, min, max, step = 1, unit = "", subtitle = "" }) => (
    <div className="bg-slate-50/70 rounded-lg p-3 sm:p-3.5 border border-slate-200">
      <div className="flex justify-between items-start mb-2 gap-2">
        <div>
          <label className="text-xs sm:text-sm font-semibold text-slate-800 block">{label}</label>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 font-normal">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-sky-300 focus-within:ring-2 focus-within:ring-[#0067A1]/30 shadow-2xs">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={formData[name] ?? ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                handleSliderChange(name, val);
              } else {
                setFormData(prev => ({ ...prev, [name]: "" }));
              }
            }}
            onBlur={(e) => {
              let val = parseFloat(e.target.value);
              if (isNaN(val)) val = min;
              if (val < min) val = min;
              if (val > max) val = max;
              handleSliderChange(name, val);
            }}
            className="w-14 text-xs sm:text-sm font-semibold text-[#0067A1] font-mono text-right bg-transparent outline-none p-0"
          />
          <span className="text-[11px] font-normal text-slate-500">{unit}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={formData[name] === "" ? min : formData[name]}
        onChange={(e) => handleSliderChange(name, e.target.value)}
        className="w-full h-2 bg-slate-200 rounded-full cursor-pointer appearance-none accent-[#0067A1]"
      />
      <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-normal">
        <span>{min} {unit}</span><span>{max} {unit}</span>
      </div>
    </div>
  );

  const ChoiceCard = ({ active, onClick, icon, title, subtitle }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-2.5 sm:p-3.5 rounded-lg border transition-all flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none ${
        active
          ? 'border-[#0067A1] bg-sky-50/70 text-[#0067A1] shadow-xs ring-1 ring-[#0067A1]/30'
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

  const ToggleCard = ({ active, onClick, title, subtitle }) => (
    <div
      onClick={onClick}
      className={`p-2.5 sm:p-3.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
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
                    <RangeSlider label="Age" name="age" min={18} max={100} unit="yrs" subtitle="Auto-synced from your profile date of birth" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <RangeSlider label="Height" name="height" min={120} max={220} unit="cm" subtitle="Used to calculate expected lung volume" />
                      <RangeSlider label="Weight" name="weight" min={40} max={150} unit="kg" subtitle="Used for BMI baseline" />
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
                    <RangeSlider label="Breath Holding Time" name="breathHold" min={5} max={120} unit="sec" subtitle="Hold breath after normal inhale (Clinical normal > 25s)" />
                    {(formData.smokingStatus === 'former' || formData.smokingStatus === 'current') && (
                      <RangeSlider label="Smoking Pack-Years" name="smokingPackYears" min={0} max={100} step={0.5} unit="years" subtitle="Packs per day × years smoked" />
                    )}
                  </div>
                )}

                {/* STEP 3: Lung Function */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <RangeSlider label="Peak Flow (PEFR - Optional)" name="peakFlow" min={100} max={800} unit="L/min" subtitle="Measure with peak flow meter if available (Normal: 400-600)" />
                    <RangeSlider label="Breaths Per Minute" name="breathsPerMinute" min={8} max={40} unit="breaths" subtitle="Resting count of chest rises in 60 seconds (Normal: 12-20)" />
                  </div>
                )}

                {/* STEP 4: Environment */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    {/* Location & AQI Station Card */}
                    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3.5">
                      
                      {/* Search & Action Bar */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <FaMapMarkerAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Enter city or location (e.g. Khurja, Delhi, Mumbai)..."
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleManualLocationUpdate();
                              }
                            }}
                            className="w-full text-xs sm:text-sm font-normal pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-white text-slate-800 shadow-2xs transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleManualLocationUpdate()}
                          disabled={aqiLoading || !formData.location?.trim()}
                          className="px-4 py-2.5 bg-[#0067A1] hover:bg-[#005584] text-white text-xs sm:text-sm font-medium rounded-lg transition-all shrink-0 cursor-pointer disabled:opacity-50 shadow-2xs"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => detectUserLocation(true)}
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
