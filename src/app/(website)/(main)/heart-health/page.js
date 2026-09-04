"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHeartbeat, FaMale, FaFemale, FaArrowRight, FaArrowLeft,
  FaCheck, FaRunning, FaSmoking, FaWineGlass, FaWineBottle, FaBan,
  FaCouch, FaWalking, FaExclamationTriangle, FaHeart, FaDumbbell
} from 'react-icons/fa';

export default function GamifiedHeartHealthAssessment() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [loading, setLoading] = useState(false);

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
        alert('Please login to submit assessment');
        router.push('/website/auth/patient/login');
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

  // UI Components
  const RangeSlider = ({ label, name, min, max, step = 1, unit = "", accentClass = "accent-[#0067A1]", helper = "" }) => (
    <div className="bg-slate-50/80 rounded-lg p-3 sm:p-3.5 border border-slate-200/80">
      <div className="flex justify-between items-center mb-1.5">
        <div>
          <label className="text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</label>
          {helper && <p className="text-[10px] text-slate-400 mt-0.5">{helper}</p>}
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
          ? 'border-rose-300 bg-rose-50/40'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${active ? 'text-rose-900 font-semibold' : 'text-slate-800'}`}>{title}</p>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${active ? 'bg-rose-500' : 'bg-slate-200'}`}>
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
    { num: 2, name: "Vitals" },
    { num: 3, name: "Lipids" },
    { num: 4, name: "Lifestyle" },
    { num: 5, name: "History" }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 py-4 sm:py-6 px-3 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-2xs shrink-0">
              <FaHeart className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Cardiovascular Wellness Screening
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Standardized non-diagnostic cardiovascular lifestyle screening
              </p>
            </div>
          </div>
          <div className="text-right self-start sm:self-auto">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Red Flag Emergency Gate (SP-07 P1-14) */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5 sm:p-3 flex items-start gap-2.5 text-[11px] sm:text-xs text-amber-900 leading-relaxed shadow-2xs">
          <FaExclamationTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Important Safety Notice:</span> If you have severe chest pain, sudden breathlessness, fainting, or acute symptoms, seek immediate emergency medical care rather than relying on this wellness screening.
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
              {currentStep === 1 && "Basic Demographic Profile"}
              {currentStep === 2 && "Vital Signs & Blood Pressure"}
              {currentStep === 3 && "Lipid Profile Markers"}
              {currentStep === 4 && "Blood Sugar & Lifestyle Habits"}
              {currentStep === 5 && "Cardiac History & Symptoms"}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              {currentStep === 1 && "Provide your age, sex, and physical measurements."}
              {currentStep === 2 && "Enter your recorded blood pressure and resting heart rate."}
              {currentStep === 3 && "Optional blood lipid measurements from recent lab reports."}
              {currentStep === 4 && "Fasting glucose, physical activity, and smoking status."}
              {currentStep === 5 && "Relevant personal and family medical history indicators."}
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

                {/* LEVEL 1: Demographic Profile */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Biological Sex</label>
                      <div className="grid grid-cols-2 gap-2.5">
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

                    <RangeSlider label="Age" name="age" min={18} max={100} unit="yrs" helper="Derived from your profile date of birth" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <RangeSlider label="Height" name="height" min={120} max={220} unit="cm" />
                      <RangeSlider label="Weight" name="weight" min={40} max={150} unit="kg" />
                    </div>
                  </div>
                )}

                {/* LEVEL 2: Vitals */}
                {currentStep === 2 && (
                  <div className="space-y-3.5">
                    <RangeSlider label="Systolic BP (Top number)" name="systolicBP" min={90} max={200} unit="mmHg" helper="Normal reference: < 120 mmHg (2024 ESC Guidelines)" />
                    <RangeSlider label="Diastolic BP (Bottom number)" name="diastolicBP" min={50} max={130} unit="mmHg" helper="Normal reference: < 80 mmHg" />
                    <RangeSlider label="Resting Heart Rate" name="restingHeartRate" min={40} max={120} unit="bpm" helper="Normal resting range: 60–100 bpm" />
                  </div>
                )}

                {/* LEVEL 3: Lipids */}
                {currentStep === 3 && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <RangeSlider label="Total Cholesterol" name="totalCholesterol" min={100} max={300} unit="mg/dL" />
                      <RangeSlider label="Triglycerides" name="triglycerides" min={50} max={400} unit="mg/dL" />
                      <RangeSlider label="HDL (Good) Cholesterol" name="hdlCholesterol" min={20} max={100} unit="mg/dL" />
                      <RangeSlider label="LDL (Bad) Cholesterol" name="ldlCholesterol" min={50} max={200} unit="mg/dL" />
                    </div>
                  </div>
                )}

                {/* LEVEL 4: Lifestyle */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <RangeSlider label="HbA1c" name="hba1c" min={4.0} max={12.0} step={0.1} unit="%" />
                      <RangeSlider label="Fasting Glucose" name="fastingGlucose" min={60} max={250} unit="mg/dL" />
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Smoking Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        <ChoiceCard active={formData.smokingStatus === 'never'} onClick={() => handleSelect('smokingStatus', 'never')} icon={<FaBan className="w-3 h-3" />} title="Never" />
                        <ChoiceCard active={formData.smokingStatus === 'former'} onClick={() => handleSelect('smokingStatus', 'former')} icon={<FaSmoking className="w-3 h-3" />} title="Former" />
                        <ChoiceCard active={formData.smokingStatus === 'current'} onClick={() => handleSelect('smokingStatus', 'current')} icon={<FaSmoking className="w-3 h-3 text-rose-500" />} title="Current" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Physical Activity Level</label>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <ChoiceCard active={formData.physicalActivity === 'sedentary'} onClick={() => handleSelect('physicalActivity', 'sedentary')} icon={<FaCouch className="w-3 h-3" />} title="Sedentary" />
                        <ChoiceCard active={formData.physicalActivity === 'light'} onClick={() => handleSelect('physicalActivity', 'light')} icon={<FaWalking className="w-3 h-3" />} title="Light" />
                        <ChoiceCard active={formData.physicalActivity === 'moderate'} onClick={() => handleSelect('physicalActivity', 'moderate')} icon={<FaRunning className="w-3 h-3" />} title="Moderate" />
                        <ChoiceCard active={formData.physicalActivity === 'very'} onClick={() => handleSelect('physicalActivity', 'very')} icon={<FaDumbbell className="w-3 h-3" />} title="Very Active" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Alcohol Consumption</label>
                      <div className="grid grid-cols-3 gap-2">
                        <ChoiceCard active={formData.alcoholConsumption === 'none'} onClick={() => handleSelect('alcoholConsumption', 'none')} icon={<FaBan className="w-3 h-3" />} title="None" />
                        <ChoiceCard active={formData.alcoholConsumption === 'occasional'} onClick={() => handleSelect('alcoholConsumption', 'occasional')} icon={<FaWineGlass className="w-3 h-3" />} title="Occasional" />
                        <ChoiceCard active={formData.alcoholConsumption === 'regular'} onClick={() => handleSelect('alcoholConsumption', 'regular')} icon={<FaWineBottle className="w-3 h-3" />} title="Regular" />
                      </div>
                    </div>
                  </div>
                )}

                {/* LEVEL 5: History */}
                {currentStep === 5 && (
                  <div className="space-y-3">
                    <p className="text-[11px] sm:text-xs text-slate-500">Select any medical conditions or symptoms that apply to you or your immediate family.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                className="flex items-center gap-2 px-5 py-2 bg-[#0067A1] hover:bg-[#005584] text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <span>Calculate Screening</span>
                    <FaHeartbeat className="w-3 h-3 text-white/90" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
