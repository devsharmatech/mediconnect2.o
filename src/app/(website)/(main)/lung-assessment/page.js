"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaLungs, FaMale, FaFemale, FaArrowRight, FaArrowLeft,
  FaCheck, FaWind, FaSmoking, FaCity, FaCloud, FaIndustry,
  FaExclamationTriangle, FaMapMarkerAlt, FaSync
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

  const [formData, setFormData] = useState(() => {
    let initialLocation = 'Delhi';
    let initialAqi = 68;
    if (typeof window !== 'undefined') {
      const saved = getSavedPatientLocation();
      if (saved?.city && saved.city !== 'Delhi') initialLocation = saved.city;
      if (saved?.aqi) initialAqi = saved.aqi;
    }
    return {
      sex: 'male',
      age: 35,
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
      toastId = toast.loading("Detecting current location & CPCB AQI...");
    }

    // 0. Prioritize existing saved patient location if set
    const saved = getSavedPatientLocation();
    if (saved?.city && saved.city !== 'Delhi') {
      const item = await fetchAqiForLocation(saved.city, saved.lat, saved.lng);
      if (item) {
        if (showToast && toastId) toast.success(`Location: ${item.location} (CPCB AQI: ${item.aqi})`, { id: toastId });
        return item;
      }
    }

    // 1. Try browser GPS first (fast timeout, low accuracy is faster and works across desktop/laptops)
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
            if (showToast && toastId) toast.success(`Detected: ${item.location} (CPCB AQI: ${item.aqi})`, { id: toastId });
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
          if (showToast && toastId) toast.success(`Region: ${item.location} (CPCB AQI: ${item.aqi})`, { id: toastId });
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
    const tId = toast.loading(`Checking CPCB AQI for ${query}...`);
    fetchAqiForLocation(query).then(item => {
      if (item) {
        savePatientLocation({
          city: item.location || query,
          aqi: item.aqi,
          forceReset: true,
        });
        toast.success(`${item.location} · CPCB AQI: ${item.aqi} (${item.category || 'Satisfactory'})`, { id: tId });
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
      if (stored) {
        const u = JSON.parse(stored);
        const dobStr = u.user?.details?.date_of_birth || u.details?.date_of_birth || u.date_of_birth;
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
    } catch (e) { console.warn("Could not load DOB:", e); }

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
    <div className="bg-slate-50/70 rounded-md p-2.5 sm:p-3 border border-slate-200">
      <div className="flex justify-between items-start mb-2">
        <div>
          <label className="text-xs sm:text-sm font-medium text-slate-800 block">{label}</label>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 font-normal">{subtitle}</p>}
        </div>
        <div className="text-xs sm:text-sm font-semibold text-[#0067A1] bg-white px-2 py-0.5 rounded border border-sky-200 font-mono min-w-[55px] text-center shadow-2xs">
          {formData[name]} <span className="text-[11px] font-normal text-slate-500">{unit}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={formData[name]}
        onChange={(e) => handleSliderChange(name, e.target.value)}
        className="w-full h-1.5 bg-slate-200 rounded-full cursor-pointer appearance-none accent-[#0067A1]"
      />
      <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-normal">
        <span>{min} {unit}</span><span>{max} {unit}</span>
      </div>
    </div>
  );

  const ChoiceCard = ({ active, onClick, icon, title, subtitle }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-2 sm:p-2.5 rounded-md border transition-all flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none ${
        active
          ? 'border-[#0067A1] bg-sky-50 text-[#0067A1] shadow-2xs ring-1 ring-[#0067A1]/20'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center shrink-0 transition-all ${
        active ? 'bg-[#0067A1] text-white shadow-2xs' : 'bg-slate-100 text-slate-500'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs sm:text-sm font-medium leading-tight ${active ? 'text-[#0067A1]' : 'text-slate-800'}`}>
          {title}
        </p>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug font-normal">
            {subtitle}
          </p>
        )}
      </div>
      {active && (
        <FaCheck className="w-3 h-3 text-[#0067A1] shrink-0 ml-1" />
      )}
    </button>
  );

  const ToggleCard = ({ active, onClick, title, subtitle }) => (
    <div
      onClick={onClick}
      className={`p-2.5 sm:p-3 rounded-md border cursor-pointer transition-all flex items-center justify-between gap-3 ${
        active ? 'border-[#0067A1] bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-xs sm:text-sm font-medium ${active ? 'text-[#0067A1]' : 'text-slate-800'}`}>{title}</p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 font-normal">{subtitle}</p>}
      </div>
      <div className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 ${active ? 'bg-[#0067A1]' : 'bg-slate-200'}`}>
        <motion.div
          layout className="w-4 h-4 bg-white rounded-full shadow-xs"
          animate={{ x: active ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </div>
  );

  const stepLabels = [
    { num: 1, name: "Profile" },
    { num: 2, name: "Habits" },
    { num: 3, name: "Function" },
    { num: 4, name: "Environ." },
    { num: 5, name: "Symptoms" }
  ];

  const stepIcons = ["👤", "🚬", "🫁", "🌍", "😮‍💨"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 py-3 sm:py-6 px-3 sm:px-4 font-sans">
      <div className="max-w-xl mx-auto space-y-2.5 sm:space-y-3">

        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#003358] via-[#0067A1] to-[#0284c7] p-3.5 sm:p-4 text-white shadow-sm border border-[#005584]"
        >
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{backgroundImage:'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',backgroundSize:'12px 12px'}} />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-md bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <FaLungs className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white leading-snug truncate">
                  Respiratory Wellness Assessment
                </h1>
                <span className="text-[11px] font-medium bg-white/20 border border-white/30 px-2 py-0.5 rounded shrink-0">
                  Step {currentStep}/{totalSteps}
                </span>
              </div>
              <p className="text-sky-100 text-[11px] sm:text-xs mt-0.5 font-normal">
                Standardized non-diagnostic respiratory telemetry
              </p>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={`h-1 rounded-sm transition-all ${i < currentStep ? 'bg-white w-5' : 'bg-white/30 w-3'}`} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Safety Notice ── */}
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-amber-50/90 border border-amber-200 rounded-md p-2.5 flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed"
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
          className="bg-white rounded-lg border border-slate-200 p-2 sm:p-2.5 shadow-2xs"
        >
          <div className="relative h-1 bg-slate-100 rounded-full mb-2 overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full bg-[#0067A1]"
              animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            />
          </div>
          <div className="grid grid-cols-5 gap-1">
            {stepLabels.map((s) => {
              const isDone = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div key={s.num} className="flex flex-col items-center gap-1">
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-[10px] sm:text-xs border transition-all font-medium ${
                    isDone ? 'bg-[#0067A1] border-[#0067A1] text-white'
                    : isCurrent ? 'bg-sky-50 border-[#0067A1] text-[#0067A1] font-semibold'
                    : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {isDone ? <FaCheck className="w-2 h-2" /> : <span>{s.num}</span>}
                  </div>
                  <p className={`text-[10px] text-center leading-tight truncate w-full ${
                    isCurrent ? 'text-[#0067A1] font-medium' : isDone ? 'text-slate-600' : 'text-slate-400 font-normal'
                  }`}>
                    {s.name}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Form Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden"
        >
          {/* Step header */}
          <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-[#0067A1] text-white flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold">{currentStep}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight">
                {currentStep === 1 && "Physical Profile"}
                {currentStep === 2 && "Habits & Breathing"}
                {currentStep === 3 && "Lung Function Measurements"}
                {currentStep === 4 && "Environmental & Occupational Exposure"}
                {currentStep === 5 && "Respiratory Symptoms"}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate font-normal">
                {currentStep === 1 && "Physical measurements and biological factors."}
                {currentStep === 2 && "Breath-holding time and smoking history."}
                {currentStep === 3 && "Breathing rate and peak airflow telemetry."}
                {currentStep === 4 && "Indian CPCB AQI and environmental exposure."}
                {currentStep === 5 && "Recorded cough frequency and symptom indicators."}
              </p>
            </div>
          </div>

          {/* Step content */}
          <div className="p-3 sm:p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="space-y-3"
              >

                {/* STEP 1: Profile */}
                {currentStep === 1 && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] sm:text-xs font-medium text-slate-600 uppercase tracking-wide block mb-1.5">Biological Sex</label>
                      <div className="grid grid-cols-2 gap-2">
                        <ChoiceCard active={formData.sex === 'male'} onClick={() => handleSelect('sex', 'male')} icon={<FaMale className="w-3.5 h-3.5" />} title="Male" />
                        <ChoiceCard active={formData.sex === 'female'} onClick={() => handleSelect('sex', 'female')} icon={<FaFemale className="w-3.5 h-3.5" />} title="Female" />
                      </div>
                    </div>
                    <RangeSlider label="Age" name="age" min={18} max={100} unit="yrs" subtitle="Derived from your profile date of birth" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <RangeSlider label="Height" name="height" min={120} max={220} unit="cm" />
                      <RangeSlider label="Weight" name="weight" min={40} max={150} unit="kg" />
                    </div>
                  </div>
                )}

                {/* STEP 2: Habits */}
                {currentStep === 2 && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] sm:text-xs font-medium text-slate-600 uppercase tracking-wide block mb-1.5">Smoking Status</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <ChoiceCard active={formData.smokingStatus === 'never'} onClick={() => handleSelect('smokingStatus', 'never')} icon={<FaWind className="w-3.5 h-3.5" />} title="Never" subtitle="Never smoked" />
                        <ChoiceCard active={formData.smokingStatus === 'former'} onClick={() => handleSelect('smokingStatus', 'former')} icon={<FaSmoking className="w-3.5 h-3.5" />} title="Former" subtitle="Quit smoking" />
                        <ChoiceCard active={formData.smokingStatus === 'current'} onClick={() => handleSelect('smokingStatus', 'current')} icon={<FaSmoking className="w-3.5 h-3.5 text-rose-500" />} title="Current" subtitle="Active smoker" />
                      </div>
                    </div>
                    <RangeSlider label="Breath Holding Time" name="breathHold" min={5} max={120} unit="sec" subtitle="Hold breath after normal inhale" />
                    {(formData.smokingStatus === 'former' || formData.smokingStatus === 'current') && (
                      <RangeSlider label="Smoking Pack-Years" name="smokingPackYears" min={0} max={100} step={0.5} unit="years" subtitle="Packs per day × years smoked" />
                    )}
                  </div>
                )}

                {/* STEP 3: Lung Function */}
                {currentStep === 3 && (
                  <div className="space-y-3">
                    <RangeSlider label="Peak Flow (Optional)" name="peakFlow" min={100} max={800} unit="L/min" subtitle="Measure with peak flow meter if available" />
                    <RangeSlider label="Breaths Per Minute" name="breathsPerMinute" min={8} max={40} unit="breaths" subtitle="Count chest rises in 60 seconds" />
                  </div>
                )}

                {/* STEP 4: Environment */}
                {currentStep === 4 && (
                  <div className="space-y-2.5">
                    {/* Location & AQI Station Card */}
                    <div className="bg-slate-50/70 rounded-md p-2.5 border border-slate-200 space-y-2">
                      
                      {/* Search & Action Bar */}
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <FaMapMarkerAlt className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Enter city (e.g. Khurja, Delhi, Mumbai)..."
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleManualLocationUpdate();
                              }
                            }}
                            className="w-full text-xs font-normal pl-7 pr-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] bg-white text-slate-800"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleManualLocationUpdate()}
                          disabled={aqiLoading || !formData.location?.trim()}
                          className="px-2.5 py-1.5 bg-[#0067A1] hover:bg-[#005584] text-white text-xs font-medium rounded-md transition-all shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => detectUserLocation(true)}
                          disabled={aqiLoading}
                          title="Detect GPS Location"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-sky-50 text-[#0067A1] border border-sky-200 text-xs font-medium rounded-md transition-all disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          <FaSync className={`w-2.5 h-2.5 ${aqiLoading ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">GPS</span>
                        </button>
                      </div>

                      {/* Quick City Chips */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-normal mr-0.5">Quick:</span>
                        {['Khurja', 'Bulandshahr', 'Delhi', 'Noida', 'Meerut', 'Mumbai'].map(city => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, location: city }));
                              handleManualLocationUpdate(city);
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer font-normal ${
                              formData.location?.toLowerCase() === city.toLowerCase()
                                ? 'bg-sky-50 text-[#0067A1] border-sky-300 font-medium'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>

                      {/* Live CPCB Telemetry Display */}
                      <div className="bg-white rounded-md border border-slate-200 p-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className={`px-2 py-1 rounded text-center border font-mono min-w-[50px] ${
                              formData.aqi <= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              formData.aqi <= 100 ? 'bg-teal-50 text-teal-700 border-teal-200' :
                              formData.aqi <= 200 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              formData.aqi <= 300 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              formData.aqi <= 400 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-red-50 text-red-900 border-red-300'
                            }`}>
                              <span className="text-base font-semibold leading-none">{formData.aqi}</span>
                              <span className="text-[8px] tracking-wide block uppercase text-slate-400 font-medium">CPCB</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
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
                                <span className="text-xs font-medium text-slate-800">
                                  {formData.location || 'Current Station'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {aqiInfo?.pollutant_data && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-normal">
                              {aqiInfo.pollutant_data.pm2_5 !== null && aqiInfo.pollutant_data.pm2_5 !== undefined && (
                                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                  PM2.5: <span className="text-slate-700 font-medium">{aqiInfo.pollutant_data.pm2_5}</span> µg/m³
                                </span>
                              )}
                              {aqiInfo.pollutant_data.pm10 !== null && aqiInfo.pollutant_data.pm10 !== undefined && (
                                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                  PM10: <span className="text-slate-700 font-medium">{aqiInfo.pollutant_data.pm10}</span> µg/m³
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                          {aqiInfo?.health_advisory || (formData.aqi <= 100 ? "Air quality is Satisfactory. Minor discomfort to sensitive individuals." : "Elevated ambient particulate matter — sensitive groups reduce outdoor exertion.")}
                        </p>
                      </div>
                    </div>

                    {/* Environmental Notice */}
                    <div className="p-2 bg-sky-50/50 rounded border border-sky-100 text-[11px] text-sky-900 font-normal leading-relaxed">
                      <span className="font-medium text-[#0067A1]">Environmental Context:</span> Real-time AQI and geographic telemetry provide localized exposure context. They do not alter your clinical baseline score.
                    </div>

                    {/* Daily Pollution Exposure */}
                    <div>
                      <label className="text-[11px] sm:text-xs font-medium text-slate-700 uppercase tracking-wide block mb-1">
                        Daily Pollution Exposure
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <ChoiceCard
                          active={formData.pollutionExposure === 'low'}
                          onClick={() => handleSelect('pollutionExposure', 'low')}
                          icon={<FaCity className="w-3.5 h-3.5" />}
                          title="Low Exposure"
                          subtitle="Clean air / rural area"
                        />
                        <ChoiceCard
                          active={formData.pollutionExposure === 'moderate'}
                          onClick={() => handleSelect('pollutionExposure', 'moderate')}
                          icon={<FaCloud className="w-3.5 h-3.5" />}
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
                    <div>
                      <label className="text-[11px] sm:text-xs font-medium text-slate-700 uppercase tracking-wide block mb-1">
                        Occupational Dust/Fume Exposure
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <ChoiceCard
                          active={formData.occupationalRisk === 'none'}
                          onClick={() => handleSelect('occupationalRisk', 'none')}
                          icon={<FaCheck className="w-3.5 h-3.5" />}
                          title="No Exposure"
                          subtitle="Office / indoor space"
                        />
                        <ChoiceCard
                          active={formData.occupationalRisk === 'moderate'}
                          onClick={() => handleSelect('occupationalRisk', 'moderate')}
                          icon={<FaExclamationTriangle className="w-3.5 h-3.5" />}
                          title="Moderate Exposure"
                          subtitle="Dust, construction, trade"
                        />
                        <ChoiceCard
                          active={formData.occupationalRisk === 'high'}
                          onClick={() => handleSelect('occupationalRisk', 'high')}
                          icon={<FaExclamationTriangle className="w-3.5 h-3.5 text-rose-500" />}
                          title="High Exposure"
                          subtitle="Factory, chemical, welding"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: Symptoms */}
                {currentStep === 5 && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] sm:text-xs font-medium text-slate-600 uppercase tracking-wide block mb-1.5">Cough Frequency</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <ChoiceCard active={formData.CoughFrequency === 'none'} onClick={() => handleSelect('CoughFrequency', 'none')} icon={<FaCheck className="w-3.5 h-3.5" />} title="None" />
                        <ChoiceCard active={formData.CoughFrequency === 'occasional'} onClick={() => handleSelect('CoughFrequency', 'occasional')} icon={<FaWind className="w-3.5 h-3.5" />} title="Occasional" />
                        <ChoiceCard active={formData.CoughFrequency === 'daily'} onClick={() => handleSelect('CoughFrequency', 'daily')} icon={<FaWind className="w-3.5 h-3.5 text-amber-500" />} title="Daily" />
                        <ChoiceCard active={formData.CoughFrequency === 'constant'} onClick={() => handleSelect('CoughFrequency', 'constant')} icon={<FaWind className="w-3.5 h-3.5 text-rose-500" />} title="Constant" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-medium text-slate-600 uppercase tracking-wide block mb-1.5">Breathlessness (MRC Scale)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ChoiceCard active={formData.Breathlessness === 'none'} onClick={() => handleSelect('Breathlessness', 'none')} icon={<FaCheck className="w-3.5 h-3.5" />} title="None" subtitle="Normal breathing" />
                        <ChoiceCard active={formData.Breathlessness === 'mild'} onClick={() => handleSelect('Breathlessness', 'mild')} icon={<FaExclamationTriangle className="w-3.5 h-3.5" />} title="Mild" subtitle="Only with strenuous exercise" />
                        <ChoiceCard active={formData.Breathlessness === 'moderate'} onClick={() => handleSelect('Breathlessness', 'moderate')} icon={<FaExclamationTriangle className="w-3.5 h-3.5 text-amber-500" />} title="Moderate" subtitle="When hurrying or uphill" />
                        <ChoiceCard active={formData.Breathlessness === 'severe'} onClick={() => handleSelect('Breathlessness', 'severe')} icon={<FaExclamationTriangle className="w-3.5 h-3.5 text-rose-500" />} title="Severe" subtitle="Stop for breath after 100m" />
                      </div>
                    </div>

                    <ToggleCard
                      active={formData.Wheezing === 'true'}
                      onClick={() => handleSelect('Wheezing', formData.Wheezing === 'true' ? 'false' : 'true')}
                      title="Do you experience wheezing?"
                      subtitle="A high-pitched whistling sound while breathing"
                    />

                    <div className="p-2.5 bg-amber-50 rounded-md border border-amber-200 flex items-start gap-2">
                      <FaExclamationTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-900 leading-relaxed font-normal">
                        <span className="font-semibold">Safety Notice:</span> If you have severe or worsening symptoms, seek medical attention promptly. This assessment does not provide a diagnosis.
                      </p>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Navigation Footer ── */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-200 transition-all cursor-pointer ${
                currentStep === 1 ? 'opacity-0 pointer-events-none' : ''
              }`}
            >
              <FaArrowLeft className="w-3 h-3" /> Back
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0067A1] hover:bg-[#005584] text-white text-xs sm:text-sm font-medium rounded-md shadow-2xs transition-all cursor-pointer"
              >
                Next Step <FaArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium rounded-md shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <><FaSync className="w-3 h-3 animate-spin" /> Calculating...</>
                ) : (
                  <><FaLungs className="w-3 h-3" /> Calculate Score</>
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
