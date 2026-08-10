"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaMale, FaFemale, FaArrowRight, FaArrowLeft,
  FaCheck, FaBan, FaSmoking, FaClock, FaCloud, FaCity,
  FaIndustry, FaExclamationTriangle, FaCough, FaThermometerHalf, FaWind
} from 'react-icons/fa';
import { FaLungs } from 'react-icons/fa6';

export default function GamifiedLungAssessment() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [loading, setLoading] = useState(false);

  // Pre-filled "Game" values
  const [formData, setFormData] = useState({
    age: 45,
    sex: 'male',
    height: 175,
    weight: 75,
    smokingStatus: 'never',
    breathHold: 35,
    smokingPackYears: 0,
    peakFlow: 450,
    aqi: 60,
    breathsPerMinute: 16,
    pollutionExposure: 'low',
    occupationalRisk: 'none',
    location: 'Metropolis',
    CoughFrequency: 'none',
    Breathlessness: 'none',
    Wheezing: 'false'
  });

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
          peak_flow: parseFloat(formData.peakFlow) || null,
          aqi: parseInt(formData.aqi) || null,
          smoking_pack_years: parseFloat(formData.smokingPackYears) || null,
          pollution_exposure: formData.pollutionExposure || null,
          occupational_risk: formData.occupationalRisk
            ? formData.occupationalRisk === 'moderate' || formData.occupationalRisk === 'high'
            : null,
          breaths_per_minute: parseInt(formData.breathsPerMinute) || null,
          location: formData.location || '',
          bmi: parseFloat(bmi) || 0
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
        router.push('/website/lung-health-result');
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
  const RangeSlider = ({ label, name, min, max, step = 1, unit = "", colorClass = "text-[#0067A1]", accentClass = "accent-[#0067A1]", subtitle = "" }) => (
    <div className="bg-white/50 rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-end mb-4">
        <div>
          <label className="text-gray-600 font-bold uppercase tracking-wide text-xs">{label}</label>
          {subtitle && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{subtitle}</p>}
        </div>
        <div className={`text-4xl font-black ${colorClass}`}>
          {formData[name]}<span className="text-sm text-gray-400 font-normal ml-1">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={formData[name]}
        onChange={(e) => handleSliderChange(name, e.target.value)}
        className={`w-full cursor-pointer mt-2 mb-1 ${accentClass}`}
      />
      <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );

  const ChoiceCard = ({ active, onClick, icon, title, subtitle }) => (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-2xl cursor-pointer border-2 transition-all transform hover:scale-105 ${active ? 'border-[#0067A1] bg-[#0067A1]/5 shadow-lg' : 'border-gray-100 bg-white hover:border-gray-300'}`}
    >
      {active && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-[#0067A1] text-white rounded-full flex items-center justify-center">
          <FaCheck className="w-3 h-3" />
        </div>
      )}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${active ? 'bg-[#0067A1] text-white' : 'bg-gray-100 text-gray-400'}`}>
        {icon}
      </div>
      <h4 className={`font-bold text-sm sm:text-base ${active ? 'text-[#0067A1]' : 'text-gray-700'}`}>{title}</h4>
      {subtitle && <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  const ToggleCard = ({ active, onClick, title, subtitle }) => (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl cursor-pointer border-2 transition-all ${active ? 'border-[#0067A1] bg-[#0067A1]/5' : 'border-gray-100 bg-white'}`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className={`font-bold ${active ? 'text-[#0067A1]' : 'text-gray-600'}`}>{title}</span>
        <div className={`w-14 h-8 rounded-full p-1 transition-colors shrink-0 ${active ? 'bg-[#0067A1]' : 'bg-gray-200'}`}>
          <motion.div
            layout
            className="w-6 h-6 bg-white rounded-full shadow-sm flex items-center justify-center"
            animate={{ x: active ? 24 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {active && <FaCheck className="w-3 h-3 text-[#0067A1]" />}
          </motion.div>
        </div>
      </div>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );

  return (
    <div className="min-h-screen  py-10">
      <div className="max-w-full mx-auto">

        {/* Header & Breathing Lung Animation */}
        <div className="text-center mb-10">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-28 h-28 bg-[#0067A1]/10 rounded-full mb-4 shadow-inner relative overflow-hidden"
          >
            {/* Wind effect rotating around */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              className="absolute inset-0 rounded-full border-4 border-dashed border-[#0067A1]/20"
            />
            {/* Lung SVG */}
            <FaLungs className="w-14 h-14 text-[#0067A1] drop-shadow-md z-10" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Lung Health Check</h1>
          <p className="text-gray-500 mt-2 font-medium">Level {currentStep} of {totalSteps}</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Capacity Analysed</span>
            <span className="text-xs font-black text-[#0067A1]">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#0067A1] to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col relative min-h-[600px]">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="p-6 sm:p-10 pb-32 sm:pb-32"
              >

                {/* LEVEL 1: Player Profile */}
                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div className="mb-6">
                      <h2 className="text-2xl font-black text-gray-800">Who are you?</h2>
                      <p className="text-gray-500 text-sm mt-1">Let&apos;s build your physical profile.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <ChoiceCard
                        active={formData.sex === 'male'} onClick={() => handleSelect('sex', 'male')}
                        icon={<FaMale className="w-6 h-6" />} title="Male"
                      />
                      <ChoiceCard
                        active={formData.sex === 'female'} onClick={() => handleSelect('sex', 'female')}
                        icon={<FaFemale className="w-6 h-6" />} title="Female"
                      />
                    </div>

                    <RangeSlider label="Age" name="age" min={18} max={100} unit="yrs" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <RangeSlider label="Height" name="height" min={120} max={220} unit="cm" />
                      <RangeSlider label="Weight" name="weight" min={40} max={150} unit="kg" />
                    </div>
                  </div>
                )}

                {/* LEVEL 2: Habits */}
                {currentStep === 2 && (
                  <div className="space-y-8">
                    <div className="mb-6">
                      <h2 className="text-2xl font-black text-gray-800">Habits & Capacity</h2>
                      <p className="text-gray-500 text-sm mt-1">Smoking history and basic lung strength.</p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-gray-600 font-bold uppercase tracking-wide text-xs ml-1">Smoking Status</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ChoiceCard active={formData.smokingStatus === 'never'} onClick={() => handleSelect('smokingStatus', 'never')} icon={<FaBan />} title="Never Smoked" />
                        <ChoiceCard active={formData.smokingStatus === 'former'} onClick={() => handleSelect('smokingStatus', 'former')} icon={<FaSmoking />} title="Former Smoker" />
                        <ChoiceCard active={formData.smokingStatus === 'current'} onClick={() => handleSelect('smokingStatus', 'current')} icon={<FaSmoking className="text-red-500" />} title="Current Smoker" />
                      </div>
                    </div>

                    <RangeSlider
                      label="Breath Holding Time" name="breathHold"
                      min={5} max={120} unit="sec"
                      colorClass="text-blue-500" accentClass="accent-blue-500"
                      subtitle="Take a deep breath and hold it as long as you can."
                    />

                    {(formData.smokingStatus === 'former' || formData.smokingStatus === 'current') && (
                      <RangeSlider
                        label="Smoking Pack-Years" name="smokingPackYears"
                        min={0} max={100} step={0.5} unit="years"
                        colorClass="text-amber-500" accentClass="accent-amber-500"
                        subtitle="Packs per day × years smoked"
                      />
                    )}
                  </div>
                )}

                {/* LEVEL 3: Lung Function */}
                {currentStep === 3 && (
                  <div className="space-y-8">
                    <div className="mb-6">
                      <h2 className="text-2xl font-black text-gray-800">Lung Function</h2>
                      <p className="text-gray-500 text-sm mt-1">Airflow and breathing rates.</p>
                    </div>

                    <RangeSlider
                      label="Peak Flow (Optional)" name="peakFlow"
                      min={100} max={800} unit="L/min"
                      colorClass="text-emerald-500" accentClass="accent-emerald-500"
                      subtitle="Measure with a peak flow meter if available"
                    />

                    <RangeSlider
                      label="Breaths Per Minute" name="breathsPerMinute"
                      min={8} max={40} unit="breaths"
                      colorClass="text-purple-500" accentClass="accent-purple-500"
                      subtitle="Count how many times your chest rises in 60 seconds."
                    />
                  </div>
                )}

                {/* LEVEL 4: Exposure */}
                {currentStep === 4 && (
                  <div className="space-y-8">
                    <div className="mb-6">
                      <h2 className="text-2xl font-black text-gray-800">Environment</h2>
                      <p className="text-gray-500 text-sm mt-1">What are you breathing in daily?</p>
                    </div>

                    <RangeSlider
                      label="Local Air Quality Index (AQI)" name="aqi"
                      min={0} max={500} unit="AQI"
                      colorClass="text-orange-500" accentClass="accent-orange-500"
                      subtitle="Check your local weather app for current AQI."
                    />

                    <div className="space-y-3">
                      <label className="text-gray-600 font-bold uppercase tracking-wide text-xs ml-1">Daily Pollution Exposure</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ChoiceCard active={formData.pollutionExposure === 'low'} onClick={() => handleSelect('pollutionExposure', 'low')} icon={<FaCity />} title="Low" subtitle="Mostly indoors / Clean air" />
                        <ChoiceCard active={formData.pollutionExposure === 'moderate'} onClick={() => handleSelect('pollutionExposure', 'moderate')} icon={<FaCloud />} title="Moderate" subtitle="Urban traffic / Occasional smoke" />
                        <ChoiceCard active={formData.pollutionExposure === 'high'} onClick={() => handleSelect('pollutionExposure', 'high')} icon={<FaIndustry />} title="High" subtitle="Industrial area / Heavy smog" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-gray-600 font-bold uppercase tracking-wide text-xs ml-1">Occupational Dust/Fumes Risk</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ChoiceCard active={formData.occupationalRisk === 'none'} onClick={() => handleSelect('occupationalRisk', 'none')} icon={<FaCheck />} title="None" subtitle="Office / Home worker" />
                        <ChoiceCard active={formData.occupationalRisk === 'moderate'} onClick={() => handleSelect('occupationalRisk', 'moderate')} icon={<FaExclamationTriangle />} title="Moderate" subtitle="Some chemicals or dust" />
                        <ChoiceCard active={formData.occupationalRisk === 'high'} onClick={() => handleSelect('occupationalRisk', 'high')} icon={<FaExclamationTriangle className="text-red-500" />} title="High" subtitle="Mining, factory, construction" />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="text-gray-600 font-bold uppercase tracking-wide text-xs ml-1 block mb-2">City / Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Mumbai, Delhi"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full text-gray-500 font-medium px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* LEVEL 5: Symptoms */}
                {currentStep === 5 && (
                  <div className="space-y-8">
                    <div className="mb-6">
                      <h2 className="text-2xl font-black text-gray-800">Current Symptoms</h2>
                      <p className="text-gray-500 text-sm mt-1">How are your lungs feeling right now?</p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-gray-600 font-bold uppercase tracking-wide text-xs ml-1">Cough Frequency</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <ChoiceCard active={formData.CoughFrequency === 'none'} onClick={() => handleSelect('CoughFrequency', 'none')} icon={<FaCheck />} title="None" />
                        <ChoiceCard active={formData.CoughFrequency === 'occasional'} onClick={() => handleSelect('CoughFrequency', 'occasional')} icon={<FaWind />} title="Occasional" />
                        <ChoiceCard active={formData.CoughFrequency === 'daily'} onClick={() => handleSelect('CoughFrequency', 'daily')} icon={<FaWind className="text-orange-500" />} title="Daily" />
                        <ChoiceCard active={formData.CoughFrequency === 'constant'} onClick={() => handleSelect('CoughFrequency', 'constant')} icon={<FaWind className="text-red-500" />} title="Constant" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-gray-600 font-bold uppercase tracking-wide text-xs ml-1">Breathlessness (MRC Grade)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ChoiceCard active={formData.Breathlessness === 'none'} onClick={() => handleSelect('Breathlessness', 'none')} icon={<FaCheck />} title="None" subtitle="Normal breathing" />
                        <ChoiceCard active={formData.Breathlessness === 'mild'} onClick={() => handleSelect('Breathlessness', 'mild')} icon={<FaExclamationTriangle />} title="Mild" subtitle="Only with strenuous exercise" />
                        <ChoiceCard active={formData.Breathlessness === 'moderate'} onClick={() => handleSelect('Breathlessness', 'moderate')} icon={<FaExclamationTriangle className="text-orange-500" />} title="Moderate" subtitle="When hurrying or uphill" />
                        <ChoiceCard active={formData.Breathlessness === 'severe'} onClick={() => handleSelect('Breathlessness', 'severe')} icon={<FaExclamationTriangle className="text-red-500" />} title="Severe" subtitle="Stop for breath after 100m" />
                      </div>
                    </div>

                    <div className="pt-4">
                      <ToggleCard
                        active={formData.Wheezing === 'true'}
                        onClick={() => handleSelect('Wheezing', formData.Wheezing === 'true' ? 'false' : 'true')}
                        title="Do you experience wheezing?"
                        subtitle="(A high-pitched whistling sound while breathing)"
                      />
                    </div>

                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-between items-center z-10">
            <button
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <FaArrowLeft /> Back
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#0067A1] to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all"
              >
                Next Level <FaArrowRight />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white rounded-xl font-bold shadow-lg shadow-[#0067A1]/30 hover:scale-105 transition-all disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Calculate Score'}
                {!loading && <FaLungs />}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
