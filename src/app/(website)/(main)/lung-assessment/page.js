"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaLungs, FaMale, FaFemale, FaArrowRight, FaArrowLeft,
  FaCheck, FaWind, FaSmoking, FaCity, FaCloud, FaIndustry,
  FaExclamationTriangle, FaMapMarkerAlt, FaSync
} from 'react-icons/fa';

export default function GamifiedLungAssessment() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [loading, setLoading] = useState(false);
  const [aqiLoading, setAqiLoading] = useState(false);
  const [aqiInfo, setAqiInfo] = useState(null);

  // Pre-filled values (Delhi default per policy)
  const [formData, setFormData] = useState({
    sex: 'male',
    age: 35,
    height: 172,
    weight: 70,
    smokingStatus: 'never',
    breathHold: 35,
    smokingPackYears: 0,
    peakFlow: 450,
    aqi: 125,
    breathsPerMinute: 16,
    pollutionExposure: 'moderate',
    occupationalRisk: 'none',
    location: 'Delhi',
    CoughFrequency: 'none',
    Breathlessness: 'none',
    Wheezing: 'false'
  });

  // Fetch AQI from free community-cached API
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
        setFormData(prev => ({
          ...prev,
          aqi: item.aqi || prev.aqi,
          location: item.location || prev.location
        }));
        setAqiInfo(item);
      }
    } catch (e) {
      console.warn("Failed to fetch AQI:", e);
    } finally {
      setAqiLoading(false);
    }
  };

  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setAqiLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchAqiForLocation(null, pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn("Geolocation denied or error:", err.message);
        fetchAqiForLocation(formData.location || 'Delhi');
      },
      { timeout: 8000 }
    );
  };

  // Canonical Age Derivation from Authoritative DOB (SP-06 LC-02) & Initial Delhi AQI
  useEffect(() => {
    fetchAqiForLocation('Delhi');
    try {
      const stored = localStorage.getItem('userData');
      if (stored) {
        const u = JSON.parse(stored);
        const dobStr = u.user?.details?.date_of_birth || u.details?.date_of_birth || u.date_of_birth;
        if (dobStr) {
          const dob = new Date(dobStr);
          if (!isNaN(dob.getTime())) {
            const today = new Date();
            let calculatedAge = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
              calculatedAge--;
            }
            if (calculatedAge > 0) {
              setFormData(prev => ({ ...prev, age: calculatedAge }));
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not load DOB for lung assessment:", e);
    }
  }, []);

  const handleSliderChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleSelect = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const userData = localStorage.getItem('userData');
      if (!userData) {
        alert('Please login to submit assessment');
        router.push('/website/auth/patient/login');
        return;
      }

      const user = JSON.parse(userData);
      const userId = user.user_id || user.user?.id || user.id;

      const heightInMeters = formData.height / 100;
      const bmi = (formData.weight / (heightInMeters * heightInMeters)).toFixed(1);

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

  // UI Components
  const RangeSlider = ({ label, name, min, max, step = 1, unit = "", accentClass = "accent-[#0067A1]", subtitle = "" }) => (
    <div className="bg-slate-50/80 rounded-lg p-3 sm:p-3.5 border border-slate-200/80">
      <div className="flex justify-between items-center mb-1.5">
        <div>
          <label className="text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</label>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-xs sm:text-sm font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs font-mono">
          {formData[name]} <span className="text-[10px] font-normal text-slate-500 font-sans">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={formData[name]}
        onChange={(e) => handleSliderChange(name, e.target.value)}
        className={`w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer appearance-none ${accentClass}`}
      />
      <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );

  const ChoiceCard = ({ active, onClick, icon, title, subtitle }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-2.5 sm:p-3 rounded-lg border transition-all flex items-center gap-2 sm:gap-2.5 cursor-pointer ${
        active
          ? 'border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1] ring-1 ring-[#0067A1]/20 shadow-2xs'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
      }`}
    >
      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
        active ? 'bg-[#0067A1] text-white' : 'bg-slate-100 text-slate-500'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-tight">{title}</p>
        {subtitle && <p className="text-[10px] text-slate-400 truncate mt-0.5">{subtitle}</p>}
      </div>
      {active && (
        <div className="w-4 h-4 rounded-full bg-[#0067A1] text-white flex items-center justify-center shrink-0">
          <FaCheck className="w-2 h-2" />
        </div>
      )}
    </button>
  );

  const ToggleCard = ({ active, onClick, title, subtitle }) => (
    <div
      onClick={onClick}
      className={`p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
        active
          ? 'border-[#0067A1] bg-[#0067A1]/5'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${active ? 'text-[#0067A1] font-semibold' : 'text-slate-800'}`}>{title}</p>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${active ? 'bg-[#0067A1]' : 'bg-slate-200'}`}>
        <motion.div
          layout
          className="w-4 h-4 bg-white rounded-full shadow-2xs"
          animate={{ x: active ? 16 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </div>
  );

  const stepLabels = [
    { num: 1, name: "Profile" },
    { num: 2, name: "Habits" },
    { num: 3, name: "Function" },
    { num: 4, name: "Environment" },
    { num: 5, name: "Symptoms" }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 py-4 sm:py-6 px-3 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-teal-50 border border-teal-100 text-[#0067A1] flex items-center justify-center shadow-2xs shrink-0">
              <FaLungs className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Respiratory Wellness Assessment
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Standardized non-diagnostic respiratory lifestyle assessment
              </p>
            </div>
          </div>
          <div className="text-right self-start sm:self-auto">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Safety Notice (SP-06 LC-06) */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5 sm:p-3 flex items-start gap-2.5 text-[11px] sm:text-xs text-amber-900 leading-relaxed shadow-2xs">
          <FaExclamationTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Important Safety Notice:</span> If you have severe breathlessness, chest pain, coughing up blood, or sudden worsening of breathing, seek emergency medical care immediately. This wellness assessment does not provide a clinical diagnosis.
          </div>
        </div>

        {/* Step Progress Tracker */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {stepLabels.map((s) => {
              const isDone = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div key={s.num} className="space-y-1">
                  <div className={`h-1 sm:h-1.5 rounded-full transition-all ${
                    isDone ? 'bg-[#0067A1]' : isCurrent ? 'bg-[#0067A1]' : 'bg-slate-100'
                  }`} />
                  <p className={`text-[10px] sm:text-[11px] font-medium truncate ${
                    isCurrent ? 'text-[#0067A1] font-semibold' : isDone ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {s.num}. {s.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          
          {/* Step Header */}
          <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/40">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">
              {currentStep === 1 && "Physical Profile"}
              {currentStep === 2 && "Habits & Recorded Breathing"}
              {currentStep === 3 && "Lung Function Measurements"}
              {currentStep === 4 && "Environmental & Occupational Exposure"}
              {currentStep === 5 && "Respiratory Symptoms"}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              {currentStep === 1 && "Tell us about your profile."}
              {currentStep === 2 && "Enter the breath-holding time recorded for this assessment."}
              {currentStep === 3 && "Airflow and breathing rate measurements."}
              {currentStep === 4 && "Air quality index and daily environmental dust/fume exposure."}
              {currentStep === 5 && "Recorded cough frequency, breathlessness scale, and wheezing."}
            </p>
          </div>

          <div className="p-4 sm:p-5 min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >

                {/* LEVEL 1: Profile */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Biological Sex</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <ChoiceCard
                          active={formData.sex === 'male'} onClick={() => handleSelect('sex', 'male')}
                          icon={<FaMale className="w-3.5 h-3.5" />} title="Male"
                        />
                        <ChoiceCard
                          active={formData.sex === 'female'} onClick={() => handleSelect('sex', 'female')}
                          icon={<FaFemale className="w-3.5 h-3.5" />} title="Female"
                        />
                      </div>
                    </div>

                    <RangeSlider label="Age" name="age" min={18} max={100} unit="yrs" subtitle="Derived from your profile date of birth" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <RangeSlider label="Height" name="height" min={120} max={220} unit="cm" />
                      <RangeSlider label="Weight" name="weight" min={40} max={150} unit="kg" />
                    </div>
                  </div>
                )}

                {/* LEVEL 2: Habits */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Smoking Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        <ChoiceCard active={formData.smokingStatus === 'never'} onClick={() => handleSelect('smokingStatus', 'never')} icon={<FaWind className="w-3 h-3" />} title="Never" />
                        <ChoiceCard active={formData.smokingStatus === 'former'} onClick={() => handleSelect('smokingStatus', 'former')} icon={<FaSmoking className="w-3 h-3" />} title="Former" />
                        <ChoiceCard active={formData.smokingStatus === 'current'} onClick={() => handleSelect('smokingStatus', 'current')} icon={<FaSmoking className="w-3 h-3 text-rose-500" />} title="Current" />
                      </div>
                    </div>

                    <RangeSlider
                      label="Breath Holding Time" name="breathHold"
                      min={5} max={120} unit="sec"
                      subtitle="Enter the breath-holding time recorded for this assessment."
                    />

                    {(formData.smokingStatus === 'former' || formData.smokingStatus === 'current') && (
                      <RangeSlider
                        label="Smoking Pack-Years" name="smokingPackYears"
                        min={0} max={100} step={0.5} unit="years"
                        subtitle="Packs per day × years smoked"
                      />
                    )}
                  </div>
                )}

                {/* LEVEL 3: Lung Function */}
                {currentStep === 3 && (
                  <div className="space-y-3.5">
                    <RangeSlider
                      label="Peak Flow (Optional)" name="peakFlow"
                      min={100} max={800} unit="L/min"
                      subtitle="Measure with a peak flow meter if available"
                    />

                    <RangeSlider
                      label="Breaths Per Minute" name="breathsPerMinute"
                      min={8} max={40} unit="breaths"
                      subtitle="Count how many times your chest rises in 60 seconds."
                    />
                  </div>
                )}

                {/* LEVEL 4: Exposure */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    {/* Location & AQI Detection Card */}
                    <div className="bg-slate-50/90 rounded-lg p-3 sm:p-3.5 border border-slate-200/90 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <label className="text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            <FaMapMarkerAlt className="w-3 h-3 text-[#0067A1]" /> Location & Local Air Quality
                          </label>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Auto-detected via free Open-Meteo API & community cache (Default: Delhi)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          disabled={aqiLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0067A1] hover:bg-[#005584] text-white text-[11px] font-semibold rounded-md shadow-2xs transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                        >
                          <FaSync className={`w-2.5 h-2.5 ${aqiLoading ? 'animate-spin' : ''}`} />
                          {aqiLoading ? 'Detecting...' : 'Detect My Location'}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <div className="flex-1 min-w-[160px]">
                          <input
                            type="text"
                            placeholder="e.g. Delhi, Mumbai, Bengaluru"
                            value={formData.location}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({ ...prev, location: val }));
                            }}
                            onBlur={() => {
                              if (formData.location && formData.location.trim()) {
                                fetchAqiForLocation(formData.location.trim());
                              }
                            }}
                            className="w-full text-slate-800 text-xs sm:text-sm font-medium px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0067A1] bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-md border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Live AQI:</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">{formData.aqi}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            {formData.aqi <= 50 ? 'Good' : formData.aqi <= 100 ? 'Moderate' : formData.aqi <= 150 ? 'Sensitive' : 'Unhealthy'}
                          </span>
                        </div>
                      </div>

                      {/* Community Cache badge & pollutant details */}
                      {aqiInfo && (
                        <div className="text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-1 pt-0.5">
                          <span>📍 {aqiInfo.location} ({aqiInfo.source === 'cache' ? 'Sourced from community cache' : 'Live weather station'})</span>
                          {aqiInfo.pollutant_data?.pm2_5 && (
                            <span>PM2.5: {aqiInfo.pollutant_data.pm2_5} µg/m³</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* SP-06 DEC-006 & LC-05 Mandatory Compliance Disclaimer */}
                    <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200/80 text-[10px] sm:text-[11px] text-blue-900 leading-relaxed">
                      <span className="font-semibold">Environmental Context Notice:</span> AQI and location are environmental context only. They do not measure your lung exposure or enter your assessment calculation.
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Daily Pollution Exposure</label>
                      <div className="grid grid-cols-3 gap-2">
                        <ChoiceCard active={formData.pollutionExposure === 'low'} onClick={() => handleSelect('pollutionExposure', 'low')} icon={<FaCity className="w-3 h-3" />} title="Low" subtitle="Clean air" />
                        <ChoiceCard active={formData.pollutionExposure === 'moderate'} onClick={() => handleSelect('pollutionExposure', 'moderate')} icon={<FaCloud className="w-3 h-3" />} title="Moderate" subtitle="Urban traffic" />
                        <ChoiceCard active={formData.pollutionExposure === 'high'} onClick={() => handleSelect('pollutionExposure', 'high')} icon={<FaIndustry className="w-3 h-3" />} title="High" subtitle="Industrial" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Occupational Dust/Fume Exposure</label>
                      <div className="grid grid-cols-3 gap-2">
                        <ChoiceCard active={formData.occupationalRisk === 'none'} onClick={() => handleSelect('occupationalRisk', 'none')} icon={<FaCheck className="w-3 h-3" />} title="None" subtitle="Office" />
                        <ChoiceCard active={formData.occupationalRisk === 'moderate'} onClick={() => handleSelect('occupationalRisk', 'moderate')} icon={<FaExclamationTriangle className="w-3 h-3" />} title="Moderate" subtitle="Dust" />
                        <ChoiceCard active={formData.occupationalRisk === 'high'} onClick={() => handleSelect('occupationalRisk', 'high')} icon={<FaExclamationTriangle className="w-3 h-3 text-rose-500" />} title="High" subtitle="Factory" />
                      </div>
                    </div>
                  </div>
                )}

                {/* LEVEL 5: Symptoms */}
                {currentStep === 5 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Cough Frequency</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <ChoiceCard active={formData.CoughFrequency === 'none'} onClick={() => handleSelect('CoughFrequency', 'none')} icon={<FaCheck className="w-3 h-3" />} title="None" />
                        <ChoiceCard active={formData.CoughFrequency === 'occasional'} onClick={() => handleSelect('CoughFrequency', 'occasional')} icon={<FaWind className="w-3 h-3" />} title="Occasional" />
                        <ChoiceCard active={formData.CoughFrequency === 'daily'} onClick={() => handleSelect('CoughFrequency', 'daily')} icon={<FaWind className="w-3 h-3 text-amber-500" />} title="Daily" />
                        <ChoiceCard active={formData.CoughFrequency === 'constant'} onClick={() => handleSelect('CoughFrequency', 'constant')} icon={<FaWind className="w-3 h-3 text-rose-500" />} title="Constant" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Breathlessness (MRC Scale)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ChoiceCard active={formData.Breathlessness === 'none'} onClick={() => handleSelect('Breathlessness', 'none')} icon={<FaCheck className="w-3 h-3" />} title="None" subtitle="Normal breathing" />
                        <ChoiceCard active={formData.Breathlessness === 'mild'} onClick={() => handleSelect('Breathlessness', 'mild')} icon={<FaExclamationTriangle className="w-3 h-3" />} title="Mild" subtitle="Only with strenuous exercise" />
                        <ChoiceCard active={formData.Breathlessness === 'moderate'} onClick={() => handleSelect('Breathlessness', 'moderate')} icon={<FaExclamationTriangle className="w-3 h-3 text-amber-500" />} title="Moderate" subtitle="When hurrying or uphill" />
                        <ChoiceCard active={formData.Breathlessness === 'severe'} onClick={() => handleSelect('Breathlessness', 'severe')} icon={<FaExclamationTriangle className="w-3 h-3 text-rose-500" />} title="Severe" subtitle="Stop for breath after 100m" />
                      </div>
                    </div>

                    <ToggleCard
                      active={formData.Wheezing === 'true'}
                      onClick={() => handleSelect('Wheezing', formData.Wheezing === 'true' ? 'false' : 'true')}
                      title="Do you experience wheezing?"
                      subtitle="A high-pitched whistling sound while breathing"
                    />

                    {/* LC-06 Mandatory Safety Alert */}
                    <div className="p-2.5 bg-amber-50/80 rounded-lg border border-amber-200 text-[10px] sm:text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                      <FaExclamationTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Safety Notice:</span> If you have severe or worsening symptoms, seek medical attention promptly. This assessment does not provide a diagnosis.
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Card Footer Navigation */}
          <div className="px-4 sm:px-5 py-3 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-all cursor-pointer ${
                currentStep === 1 ? 'opacity-0 pointer-events-none' : ''
              }`}
            >
              <FaArrowLeft className="w-3 h-3" /> Back
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0067A1] hover:bg-[#005584] text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Next Step <FaArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#0067A1] hover:bg-[#005584] text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Processing...' : 'Calculate Score'}
                {!loading && <FaLungs className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
