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

  const [hasPreviousAssessment, setHasPreviousAssessment] = useState(false);

  // Auto-scroll to top when advancing steps so header is always in view
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  // Auto-fill Age, Gender & Existing Assessment Data from Database (DOCX Issue #1)
  useEffect(() => {
    try {
      let resolvedUserId = null;
      const stored = localStorage.getItem('userData') || localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        resolvedUserId = u.id || u.user_id || u.user?.id || localStorage.getItem('userId');

        // ── Age from DOB ──
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
            const clampedAge = Math.max(18, Math.min(100, calculatedAge));
            if (clampedAge > 0) {
              setFormData(prev => ({ ...prev, age: clampedAge }));
            }
          }
        }

        // ── Gender from profile ──
        const profileGender =
          u.details?.gender ||
          u.profile?.gender ||
          u.user?.details?.gender ||
          u.user?.profile?.gender ||
          u.gender ||
          u.user?.gender;
        if (profileGender) {
          const normalized = String(profileGender).toLowerCase().trim();
          if (normalized.startsWith('f') || normalized === 'female') {
            setFormData(prev => ({ ...prev, gender: 'female' }));
          } else if (normalized.startsWith('m') || normalized === 'male') {
            setFormData(prev => ({ ...prev, gender: 'male' }));
          }
        }
      }

      const uid = resolvedUserId || localStorage.getItem('userId');
      if (uid) {
        // Fetch existing heart assessment to prefill user's previous vitals
        fetch(`/api/health/assessments?userId=${uid}&type=heart&limit=1`)
          .then(r => r.json())
          .then(res => {
            const assessment = res?.data?.assessments?.[0];
            const inputs = assessment?.heart_health_inputs?.[0];
            if (inputs) {
              setHasPreviousAssessment(true);
              setFormData(prev => ({
                ...prev,
                age: inputs.age ? Number(inputs.age) : prev.age,
                gender: inputs.gender ? String(inputs.gender).toLowerCase() : prev.gender,
                height: inputs.height_cm ? Number(inputs.height_cm) : prev.height,
                weight: inputs.weight_kg ? Number(inputs.weight_kg) : prev.weight,
                systolicBP: inputs.systolic_bp ? Number(inputs.systolic_bp) : prev.systolicBP,
                diastolicBP: inputs.diastolic_bp ? Number(inputs.diastolic_bp) : prev.diastolicBP,
                restingHeartRate: inputs.resting_heart_rate ? Number(inputs.resting_heart_rate) : prev.restingHeartRate,
                totalCholesterol: inputs.total_cholesterol ? Number(inputs.total_cholesterol) : prev.totalCholesterol,
                hdlCholesterol: inputs.hdl_cholesterol ? Number(inputs.hdl_cholesterol) : prev.hdlCholesterol,
                ldlCholesterol: inputs.ldl_cholesterol ? Number(inputs.ldl_cholesterol) : prev.ldlCholesterol,
                triglycerides: inputs.triglycerides ? Number(inputs.triglycerides) : prev.triglycerides,
                fastingGlucose: inputs.fasting_glucose ? Number(inputs.fasting_glucose) : prev.fastingGlucose,
                hba1c: inputs.hba1c ? Number(inputs.hba1c) : prev.hba1c,
                smokingStatus: inputs.smoking_status || prev.smokingStatus,
                physicalActivity: inputs.physical_activity || prev.physicalActivity,
                alcoholConsumption: inputs.alcohol_consumption || prev.alcoholConsumption,
                familyHistory: inputs.family_history === true,
                hypertensionHistory: inputs.hypertension_history === true,
                diabetesHistory: inputs.diabetes_history === true,
                chestPain: inputs.chest_pain === true,
                breathlessness: inputs.breathlessness === true,
                palpitations: inputs.palpitations === true,
              }));
            }
          })
          .catch(err => console.warn("Failed to fetch previous assessment:", err));

        fetch(`/api/patient/profile?id=${uid}`)
          .then(r => r.json())
          .then(res => {
            if (res.success && res.data) {
              const fresh = res.data;
              const g =
                fresh.gender ||
                fresh.details?.gender ||
                fresh.profile?.gender;
              if (g) {
                const lower = String(g).toLowerCase().trim();
                if (lower.startsWith('f') || lower === 'female') {
                  setFormData(prev => ({ ...prev, gender: 'female' }));
                } else if (lower.startsWith('m') || lower === 'male') {
                  setFormData(prev => ({ ...prev, gender: 'male' }));
                }
              }
            }
          })
          .catch(err => console.warn("Failed background profile fetch in heart-health:", err));
      }
    } catch (e) {
      console.warn("Could not load profile or previous assessment data:", e);
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
      className={`w-full text-left p-2.5 sm:p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer select-none group ${
        active
          ? 'border-[#0067A1] bg-sky-50/70 text-[#0067A1] shadow-2xs'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
          active ? 'bg-[#0067A1] text-white shadow-2xs' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80'
        }`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs sm:text-sm font-bold leading-snug ${active ? 'text-[#0067A1]' : 'text-slate-800'}`}>
            {title}
          </p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-normal font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {active && (
        <div className="w-5 h-5 rounded-full bg-[#0067A1] flex items-center justify-center shrink-0 shadow-2xs">
          <FaCheck className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </button>
  );

  const ToggleCard = ({ active, onClick, title, subtitle }) => (
    <div
      onClick={onClick}
      className={`p-3 sm:p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-2xs ${
        active ? 'border-[#0067A1] bg-sky-50/70' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-xs sm:text-sm font-bold leading-snug ${active ? 'text-[#0067A1]' : 'text-slate-800'}`}>{title}</p>
        {subtitle && <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-normal leading-normal">{subtitle}</p>}
      </div>
      <div className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${active ? 'bg-[#0067A1]' : 'bg-slate-200'}`}>
        <motion.div
          layout
          className="w-5 h-5 bg-white rounded-full shadow-xs"
          animate={{ x: active ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </div>
  );

  const stepLabels = [
    { num: 1, name: "Profile", shortName: "Profile", title: "Demographic Profile", desc: "Physical measurements and biological factors." },
    { num: 2, name: "Vitals", shortName: "Vitals", title: "Vital Signs & Blood Pressure", desc: "Recorded blood pressure and resting heart rate." },
    { num: 3, name: "Lipids", shortName: "Lipids", title: "Lipid Profile Markers", desc: "Optional blood lipid measurements from lab reports." },
    { num: 4, name: "Lifestyle", shortName: "Lifestyle", title: "Blood Sugar & Lifestyle Habits", desc: "Fasting glucose, physical activity, and smoking status." },
    { num: 5, name: "History", shortName: "History", title: "Cardiac History & Symptoms", desc: "Relevant personal and family medical history indicators." }
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 pt-3 sm:pt-6 pb-48 sm:pb-28 px-3 sm:px-6 font-sans">
      <div className="max-w-2xl sm:max-w-3xl mx-auto space-y-3 sm:space-y-4">

        {/* ── Page Header (Original Blue Gradient Header Restored & Responsive) ── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#003358] via-[#0067A1] to-[#0284c7] p-3.5 sm:p-5 text-white shadow-sm border border-[#005584]"
        >
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
          <div className="relative flex items-center gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center shrink-0 shadow-sm">
              <FaHeart className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <h1 className="text-xs sm:text-base md:text-lg font-bold tracking-tight text-white leading-snug">
                  Cardiovascular Wellness Screening
                </h1>
                <span className="text-[10px] sm:text-xs font-semibold bg-white/20 border border-white/30 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
                  Step {currentStep}/{totalSteps}
                </span>
              </div>
              <p className="text-sky-100 text-[10px] sm:text-sm mt-0.5 font-normal leading-normal">
                Standardized non-diagnostic cardiovascular telemetry
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
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-amber-50/90 border border-amber-200/90 rounded-lg p-2.5 sm:p-3 flex items-start gap-2 sm:gap-2.5 text-[11px] sm:text-xs text-amber-900 leading-relaxed shadow-2xs"
        >
          <FaExclamationTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold text-amber-950">Safety Notice: </span>
            For severe chest pain, sudden breathlessness, fainting, or acute symptoms, seek immediate emergency medical care. This assessment is not a diagnostic tool.
          </p>
        </motion.div>

        {/* ── Existing Vitals Auto-Loaded Banner (DOCX Issue #1) ── */}
        {hasPreviousAssessment && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 sm:p-3 flex items-start gap-2 sm:gap-2.5 text-[11px] sm:text-xs text-slate-800 leading-relaxed shadow-2xs"
          >
            <FaSync className="w-3.5 h-3.5 text-[#0067A1] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#003358]">Previous Assessment Loaded: </span>
              Your existing clinical vitals have been prefilled. Update any new blood pressure, cholesterol, or lifestyle readings below to refresh your longitudinal trajectory.
            </div>
          </motion.div>
        )}

        {/* ── Step Progress Indicator (Connected Circular Stepper) ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
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
                      <span className="sm:hidden">{s.shortName || s.name}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Form Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
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
                      subtitle="Pre-filled from your profile — adjust if needed"
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
                  <><FaHeart className="w-3.5 h-3.5" /> Calculate Screening</>
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
