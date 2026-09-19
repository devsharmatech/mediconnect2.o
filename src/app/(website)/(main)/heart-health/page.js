"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHeartbeat, FaMale, FaFemale, FaArrowRight, FaArrowLeft,
  FaCheck, FaRunning, FaSmoking, FaWineGlass, FaWineBottle, FaBan,
  FaCouch, FaWalking, FaExclamationTriangle, FaHeart, FaDumbbell, FaSync
} from 'react-icons/fa';

const LoginModal = dynamic(
  () => import("@/components/public-site/auth/LoginModal"),
  { ssr: false }
);

export default function GamifiedHeartHealthAssessment() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Pre-filled initial values
  const [formData, setFormData] = useState({
    age: 45,
    gender: 'male',
    height: 175,
    weight: 75,
    systolicBP: 120,
    diastolicBP: 80,
    restingHeartRate: 72,
    totalCholesterol: 180,
    hdlCholesterol: 55,
    ldlCholesterol: 110,
    triglycerides: 130,
    fastingGlucose: 95,
    hba1c: 5.4,
    smokingStatus: 'never',
    physicalActivity: 'moderate',
    alcoholConsumption: 'occasional',
    familyHistory: false,
    hypertensionHistory: false,
    diabetesHistory: false,
    chestPain: false,
    breathlessness: false,
    palpitations: false
  });

  // Auto-scroll to top when advancing steps so header is always in view
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  // Canonical Age Derivation from Authoritative DOB (SP-07 P0-02)
  useEffect(() => {
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
      console.warn("Could not load DOB:", e);
    }
  }, []);

  const handleSliderChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleSelect = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleBoolean = (name) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const userData = localStorage.getItem('userData');
      if (!userData) {
        setShowLoginModal(true);
        setLoading(false);
        return;
      }

      const user = JSON.parse(userData);
      const userId = user.user_id || user.user?.id || user.id;

      const apiData = {
        user_id: userId,
        assessment_type: 'heart',
        inputs: {
          age: parseInt(formData.age),
          gender: formData.gender,
          height_cm: parseFloat(formData.height),
          weight_kg: parseFloat(formData.weight),
          systolic_bp: parseInt(formData.systolicBP),
          diastolic_bp: parseInt(formData.diastolicBP),
          resting_heart_rate: parseInt(formData.restingHeartRate),
          total_cholesterol: parseFloat(formData.totalCholesterol),
          hdl_cholesterol: parseFloat(formData.hdlCholesterol),
          ldl_cholesterol: parseFloat(formData.ldlCholesterol),
          triglycerides: parseFloat(formData.triglycerides),
          fasting_glucose: parseFloat(formData.fastingGlucose),
          hba1c: parseFloat(formData.hba1c),
          smoking_status: formData.smokingStatus,
          physical_activity_minutes: formData.physicalActivity === 'sedentary' ? 0 :
            formData.physicalActivity === 'light' ? 30 :
              formData.physicalActivity === 'moderate' ? 60 :
                formData.physicalActivity === 'very' ? 120 : 0,
          alcohol_consumption: formData.alcoholConsumption === 'none' ? 'none' :
            formData.alcoholConsumption === 'occasional' ? 'light' :
            formData.alcoholConsumption === 'regular' ? 'moderate' : 'none',
          family_cardiac_history: Boolean(formData.familyHistory),
          hypertension_history: Boolean(formData.hypertensionHistory),
          diabetes_history: Boolean(formData.diabetesHistory),
          chest_pain: Boolean(formData.chestPain),
          breathlessness: Boolean(formData.breathlessness),
          palpitations: Boolean(formData.palpitations)
        }
      };

      const response = await fetch('/api/v2/ai/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();
      if (result.success) {
        sessionStorage.setItem('heartAssessmentResult', JSON.stringify(result.data));
        router.push('/heart-health-result');
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

  /* ── Sub-components (Identical styling to LungConnect) ── */
  const RangeSlider = ({ label, name, min, max, step = 1, unit = "", subtitle = "", helper = "" }) => {
    const sub = subtitle || helper;
    return (
      <div className="bg-slate-50/70 rounded-md p-2.5 sm:p-3 border border-slate-200">
        <div className="flex justify-between items-start mb-2">
          <div className="pr-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-800 block">{label}</label>
            {sub && <p className="text-[11px] text-slate-400 mt-0.5 font-normal leading-tight">{sub}</p>}
          </div>
          <div className="text-xs sm:text-sm font-semibold text-[#0067A1] bg-white px-2 py-0.5 rounded border border-sky-200 font-mono min-w-[55px] text-center shadow-2xs shrink-0">
            {formData[name]} <span className="text-[11px] font-normal text-slate-500">{unit}</span>
          </div>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={formData[name]}
          onChange={(e) => handleSliderChange(name, e.target.value)}
          className="w-full h-1.5 bg-slate-200 rounded-full cursor-pointer appearance-none accent-[#0067A1]"
        />
        <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-normal">
          <span>{min} {unit}</span>
          <span>{max} {unit}</span>
        </div>
      </div>
    );
  };

  const ChoiceCard = ({ active, onClick, icon, title, subtitle }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-2 sm:p-2.5 rounded-md border transition-all flex items-center justify-between gap-1.5 cursor-pointer select-none ${
        active
          ? 'border-[#0067A1] bg-sky-50 text-[#0067A1] shadow-2xs ring-1 ring-[#0067A1]/20'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center shrink-0 transition-all ${
          active ? 'bg-[#0067A1] text-white shadow-2xs' : 'bg-slate-100 text-slate-500'
        }`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs sm:text-sm font-semibold leading-tight truncate ${active ? 'text-[#0067A1]' : 'text-slate-800'}`}>
            {title}
          </p>
          {subtitle && (
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-tight font-normal truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {active && (
        <FaCheck className="w-2.5 h-2.5 text-[#0067A1] shrink-0 ml-1" />
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
        <p className={`text-xs sm:text-sm font-semibold ${active ? 'text-[#0067A1]' : 'text-slate-800'}`}>{title}</p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 font-normal leading-tight">{subtitle}</p>}
      </div>
      <div className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 ${active ? 'bg-[#0067A1]' : 'bg-slate-200'}`}>
        <motion.div
          layout
          className="w-4 h-4 bg-white rounded-full shadow-xs"
          animate={{ x: active ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </div>
  );

  const stepLabels = [
    { num: 1, name: "Profile" },
    { num: 2, name: "Vitals" },
    { num: 3, name: "Lipids" },
    { num: 4, name: "Lifestyle" },
    { num: 5, name: "History" }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-sky-50/60 via-white to-slate-50/80 pt-2 pb-12 px-3 sm:px-4 font-sans">
      <div className="max-w-2xl mx-auto space-y-2.5 sm:space-y-3">

        {/* ── Page Header (Identical to LungConnect) ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#003358] via-[#0067A1] to-[#0284c7] p-3.5 sm:p-4 text-white shadow-sm border border-[#005584]"
        >
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-md bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <FaHeart className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white leading-snug truncate">
                  Cardiovascular Wellness Screening
                </h1>
                <span className="text-[11px] font-medium bg-white/20 border border-white/30 px-2 py-0.5 rounded shrink-0">
                  Step {currentStep}/{totalSteps}
                </span>
              </div>
              <p className="text-sky-100 text-[11px] sm:text-xs mt-0.5 font-normal">
                Standardized non-diagnostic cardiovascular telemetry
              </p>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={`h-1 rounded-sm transition-all ${i < currentStep ? 'bg-white w-5' : 'bg-white/30 w-3'}`} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Safety Notice (Identical to LungConnect) ── */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-amber-50/90 border border-amber-200 rounded-md p-2.5 flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed"
        >
          <FaExclamationTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold text-amber-950">Safety Notice: </span>
            For severe chest pain, sudden breathlessness, fainting, or acute symptoms, seek immediate emergency medical care. This assessment is not a diagnostic tool.
          </p>
        </motion.div>

        {/* ── Step Progress Indicator (Identical to LungConnect) ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
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
                <div
                  key={s.num}
                  onClick={() => s.num < currentStep && setCurrentStep(s.num)}
                  className={`flex flex-col items-center gap-1 ${
                    s.num < currentStep ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                  }`}
                >
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-[10px] sm:text-xs border transition-all font-medium ${
                      isDone
                        ? 'bg-[#0067A1] border-[#0067A1] text-white'
                        : isCurrent
                        ? 'bg-sky-50 border-[#0067A1] text-[#0067A1] font-semibold ring-2 ring-[#0067A1]/20'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    {isDone ? <FaCheck className="w-2.5 h-2.5" /> : <span>{s.num}</span>}
                  </div>
                  <p
                    className={`text-[10px] sm:text-[11px] text-center leading-tight truncate w-full ${
                      isCurrent
                        ? 'text-[#0067A1] font-semibold'
                        : isDone
                        ? 'text-slate-600 font-medium'
                        : 'text-slate-400 font-normal'
                    }`}
                  >
                    {s.name}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Form Card (Identical to LungConnect) ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden"
        >
          {/* Step header */}
          <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-[#0067A1] text-white flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold">{currentStep}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight">
                {currentStep === 1 && "Demographic Profile"}
                {currentStep === 2 && "Vital Signs & Blood Pressure"}
                {currentStep === 3 && "Lipid Profile Markers"}
                {currentStep === 4 && "Blood Sugar & Lifestyle Habits"}
                {currentStep === 5 && "Cardiac History & Symptoms"}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate font-normal">
                {currentStep === 1 && "Physical measurements and biological factors."}
                {currentStep === 2 && "Recorded blood pressure and resting heart rate."}
                {currentStep === 3 && "Optional blood lipid measurements from lab reports."}
                {currentStep === 4 && "Fasting glucose, physical activity, and smoking status."}
                {currentStep === 5 && "Relevant personal and family medical history indicators."}
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

                {/* STEP 1: Demographic Profile */}
                {currentStep === 1 && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">
                        Biological Sex
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                        <ChoiceCard
                          active={formData.gender === 'male'}
                          onClick={() => handleSelect('gender', 'male')}
                          icon={<FaMale className="w-3.5 h-3.5" />}
                          title="Male"
                        />
                        <ChoiceCard
                          active={formData.gender === 'female'}
                          onClick={() => handleSelect('gender', 'female')}
                          icon={<FaFemale className="w-3.5 h-3.5" />}
                          title="Female"
                        />
                      </div>
                    </div>

                    <RangeSlider
                      label="Age"
                      name="age"
                      min={18}
                      max={100}
                      unit="yrs"
                      subtitle="Derived from your profile date of birth"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <RangeSlider label="Height" name="height" min={120} max={220} unit="cm" />
                      <RangeSlider label="Weight" name="weight" min={40} max={150} unit="kg" />
                    </div>
                  </div>
                )}

                {/* STEP 2: Vitals */}
                {currentStep === 2 && (
                  <div className="space-y-3">
                    <RangeSlider
                      label="Systolic BP (Top number)"
                      name="systolicBP"
                      min={90}
                      max={200}
                      unit="mmHg"
                      subtitle="Normal reference: < 120 mmHg (2024 ESC Guidelines)"
                    />
                    <RangeSlider
                      label="Diastolic BP (Bottom number)"
                      name="diastolicBP"
                      min={50}
                      max={130}
                      unit="mmHg"
                      subtitle="Normal reference: < 80 mmHg"
                    />
                    <RangeSlider
                      label="Resting Heart Rate"
                      name="restingHeartRate"
                      min={40}
                      max={120}
                      unit="bpm"
                      subtitle="Normal resting range: 60–100 bpm"
                    />
                  </div>
                )}

                {/* STEP 3: Lipids */}
                {currentStep === 3 && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <RangeSlider label="Total Cholesterol" name="totalCholesterol" min={100} max={300} unit="mg/dL" />
                      <RangeSlider label="Triglycerides" name="triglycerides" min={50} max={400} unit="mg/dL" />
                      <RangeSlider label="HDL (Good) Cholesterol" name="hdlCholesterol" min={20} max={100} unit="mg/dL" />
                      <RangeSlider label="LDL (Bad) Cholesterol" name="ldlCholesterol" min={50} max={200} unit="mg/dL" />
                    </div>
                  </div>
                )}

                {/* STEP 4: Lifestyle */}
                {currentStep === 4 && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <RangeSlider label="HbA1c" name="hba1c" min={4.0} max={12.0} step={0.1} unit="%" />
                      <RangeSlider label="Fasting Glucose" name="fastingGlucose" min={60} max={250} unit="mg/dL" />
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">
                        Smoking Status
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                        <ChoiceCard active={formData.smokingStatus === 'never'} onClick={() => handleSelect('smokingStatus', 'never')} icon={<FaBan className="w-3.5 h-3.5" />} title="Never" subtitle="Never smoked" />
                        <ChoiceCard active={formData.smokingStatus === 'former'} onClick={() => handleSelect('smokingStatus', 'former')} icon={<FaSmoking className="w-3.5 h-3.5" />} title="Former" subtitle="Quit smoking" />
                        <ChoiceCard active={formData.smokingStatus === 'current'} onClick={() => handleSelect('smokingStatus', 'current')} icon={<FaSmoking className="w-3.5 h-3.5 text-rose-500" />} title="Current" subtitle="Active smoker" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">
                        Physical Activity Level
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        <ChoiceCard active={formData.physicalActivity === 'sedentary'} onClick={() => handleSelect('physicalActivity', 'sedentary')} icon={<FaCouch className="w-3.5 h-3.5" />} title="Sedentary" subtitle="Little/none" />
                        <ChoiceCard active={formData.physicalActivity === 'light'} onClick={() => handleSelect('physicalActivity', 'light')} icon={<FaWalking className="w-3.5 h-3.5" />} title="Light" subtitle="1–2 d/wk" />
                        <ChoiceCard active={formData.physicalActivity === 'moderate'} onClick={() => handleSelect('physicalActivity', 'moderate')} icon={<FaRunning className="w-3.5 h-3.5" />} title="Moderate" subtitle="3–5 d/wk" />
                        <ChoiceCard active={formData.physicalActivity === 'very'} onClick={() => handleSelect('physicalActivity', 'very')} icon={<FaDumbbell className="w-3.5 h-3.5" />} title="Very Active" subtitle="6+ d/wk" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">
                        Alcohol Consumption
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                        <ChoiceCard active={formData.alcoholConsumption === 'none'} onClick={() => handleSelect('alcoholConsumption', 'none')} icon={<FaBan className="w-3.5 h-3.5" />} title="None" subtitle="Non-drinker" />
                        <ChoiceCard active={formData.alcoholConsumption === 'occasional'} onClick={() => handleSelect('alcoholConsumption', 'occasional')} icon={<FaWineGlass className="w-3.5 h-3.5" />} title="Occasional" subtitle="Social only" />
                        <ChoiceCard active={formData.alcoholConsumption === 'regular'} onClick={() => handleSelect('alcoholConsumption', 'regular')} icon={<FaWineBottle className="w-3.5 h-3.5" />} title="Regular" subtitle="Routine" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: History */}
                {currentStep === 5 && (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-slate-500 font-normal">
                      Select any medical conditions or symptoms that apply to you or your immediate family:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                      <ToggleCard active={formData.familyHistory} onClick={() => toggleBoolean('familyHistory')} title="Family Cardiac History" subtitle="Parents or siblings" />
                      <ToggleCard active={formData.hypertensionHistory} onClick={() => toggleBoolean('hypertensionHistory')} title="Hypertension (High BP)" subtitle="Previously diagnosed" />
                      <ToggleCard active={formData.diabetesHistory} onClick={() => toggleBoolean('diabetesHistory')} title="Diabetes" subtitle="Type 1 or Type 2" />
                      <ToggleCard active={formData.chestPain} onClick={() => toggleBoolean('chestPain')} title="Frequent Chest Discomfort" subtitle="Exertional or at rest" />
                      <ToggleCard active={formData.breathlessness} onClick={() => toggleBoolean('breathlessness')} title="Breathlessness" subtitle="With mild activity" />
                      <ToggleCard active={formData.palpitations} onClick={() => toggleBoolean('palpitations')} title="Palpitations" subtitle="Irregular heartbeats" />
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Step footer (Identical to LungConnect) */}
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
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0067A1] hover:bg-[#005584] text-white text-xs sm:text-sm font-medium rounded-md shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <><FaSync className="w-3 h-3 animate-spin" /> Calculating...</>
                ) : (
                  <><FaHeart className="w-3 h-3" /> Calculate Screening</>
                )}
              </button>
            )}
          </div>
        </motion.div>

      </div>

      {/* Auth Modal if unauthenticated on submission */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            handleSubmit();
          }}
        />
      )}
    </div>
  );
}
