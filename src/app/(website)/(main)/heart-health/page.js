"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHeartbeat, FaMale, FaFemale, FaArrowRight, FaArrowLeft,
  FaCheck, FaRunning, FaSmoking, FaWineGlass, FaWineBottle, FaBan,
  FaCouch, FaWalking, FaBiking, FaExclamationTriangle, FaHeart, FaDumbbell
} from 'react-icons/fa';

export default function GamifiedHeartHealthAssessment() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [loading, setLoading] = useState(false);

  // Pre-filled "Game" values
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
        router.push('/website/heart-health-result');
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
  const RangeSlider = ({ label, name, min, max, step = 1, unit = "", colorClass = "text-emerald-500", accentClass = "accent-emerald-500" }) => (
    <div className="bg-white/50 rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-end mb-4">
        <label className="text-gray-600 font-bold uppercase tracking-wide text-xs">{label}</label>
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
      <h4 className={`font-bold text-lg ${active ? 'text-[#0067A1]' : 'text-gray-700'}`}>{title}</h4>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  const ToggleCard = ({ active, onClick, title }) => (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl cursor-pointer border-2 transition-all flex justify-between items-center ${active ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-white'}`}
    >
      <span className={`font-bold ${active ? 'text-red-700' : 'text-gray-600'}`}>{title}</span>
      <div className={`w-14 h-8 rounded-full p-1 transition-colors ${active ? 'bg-red-500' : 'bg-gray-200'}`}>
        <motion.div
          layout
          className="w-6 h-6 bg-white rounded-full shadow-sm"
          animate={{ x: active ? 24 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-full mx-auto">

        {/* Header & Heart Animation */}
        <div className="text-center mb-10">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-4 shadow-inner"
          >
            <FaHeart className="w-12 h-12 text-red-500 drop-shadow-md" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Heart Health Score</h1>
          <p className="text-gray-500 mt-2 font-medium">Level {currentStep} of {totalSteps}</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Progress</span>
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
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden min-h-[500px] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="p-6 sm:p-10 pb-32 sm:pb-32"
            >

              {/* LEVEL 1 */}
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-800">Who are you?</h2>
                    <p className="text-gray-500 text-sm mt-1">Let&apos;s build your player profile.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <ChoiceCard
                      active={formData.gender === 'male'}
                      onClick={() => handleSelect('gender', 'male')}
                      icon={<FaMale className="w-6 h-6" />}
                      title="Male"
                    />
                    <ChoiceCard
                      active={formData.gender === 'female'}
                      onClick={() => handleSelect('gender', 'female')}
                      icon={<FaFemale className="w-6 h-6" />}
                      title="Female"
                    />
                  </div>

                  <RangeSlider label="Age" name="age" min={18} max={100} unit="yrs" colorClass="text-[#0067A1]" accentClass="accent-[#0067A1]" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RangeSlider label="Height" name="height" min={120} max={220} unit="cm" colorClass="text-blue-500" accentClass="accent-blue-500" />
                    <RangeSlider label="Weight" name="weight" min={40} max={150} unit="kg" colorClass="text-blue-500" accentClass="accent-blue-500" />
                  </div>
                </div>
              )}

              {/* LEVEL 2 */}
              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-800">The Vitals</h2>
                    <p className="text-gray-500 text-sm mt-1">How is the engine running?</p>
                  </div>

                  <RangeSlider label="Systolic BP (Top number)" name="systolicBP" min={90} max={200} unit="mmHg" colorClass="text-red-500" accentClass="accent-red-500" />
                  <RangeSlider label="Diastolic BP (Bottom number)" name="diastolicBP" min={50} max={130} unit="mmHg" colorClass="text-red-500" accentClass="accent-red-500" />
                  <RangeSlider label="Resting Heart Rate" name="restingHeartRate" min={40} max={120} unit="bpm" colorClass="text-pink-500" accentClass="accent-pink-500" />
                </div>
              )}

              {/* LEVEL 3 */}
              {currentStep === 3 && (
                <div className="space-y-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-800">Lipid Profile</h2>
                    <p className="text-gray-500 text-sm mt-1">Cholesterol and fat levels in your blood.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RangeSlider label="Total Cholesterol" name="totalCholesterol" min={100} max={300} unit="mg/dL" colorClass="text-amber-500" accentClass="accent-amber-500" />
                    <RangeSlider label="Triglycerides" name="triglycerides" min={50} max={400} unit="mg/dL" colorClass="text-amber-500" accentClass="accent-amber-500" />
                    <RangeSlider label="HDL (Good) Cholesterol" name="hdlCholesterol" min={20} max={100} unit="mg/dL" colorClass="text-green-500" accentClass="accent-green-500" />
                    <RangeSlider label="LDL (Bad) Cholesterol" name="ldlCholesterol" min={50} max={200} unit="mg/dL" colorClass="text-orange-500" accentClass="accent-orange-500" />
                  </div>
                </div>
              )}

              {/* LEVEL 4 */}
              {currentStep === 4 && (
                <div className="space-y-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-800">Blood Sugar & Lifestyle</h2>
                    <p className="text-gray-500 text-sm mt-1">Daily habits and glucose levels.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RangeSlider label="HbA1c" name="hba1c" min={4.0} max={12.0} step={0.1} unit="%" colorClass="text-purple-500" accentClass="accent-purple-500" />
                    <RangeSlider label="Fasting Glucose" name="fastingGlucose" min={60} max={250} unit="mg/dL" colorClass="text-purple-500" accentClass="accent-purple-500" />
                  </div>

                  <div className="space-y-3">
                    <label className="text-gray-600 font-bold uppercase tracking-wide text-xs ml-1">Smoking Status</label>
                    <div className="grid grid-cols-3 gap-3">
                      <ChoiceCard active={formData.smokingStatus === 'never'} onClick={() => handleSelect('smokingStatus', 'never')} icon={<FaBan />} title="Never" />
                      <ChoiceCard active={formData.smokingStatus === 'former'} onClick={() => handleSelect('smokingStatus', 'former')} icon={<FaSmoking />} title="Former" />
                      <ChoiceCard active={formData.smokingStatus === 'current'} onClick={() => handleSelect('smokingStatus', 'current')} icon={<FaSmoking className="text-red-500" />} title="Current" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-gray-600 font-bold uppercase tracking-wide text-xs ml-1">Activity Level</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <ChoiceCard active={formData.physicalActivity === 'sedentary'} onClick={() => handleSelect('physicalActivity', 'sedentary')} icon={<FaCouch />} title="Sedentary" />
                      <ChoiceCard active={formData.physicalActivity === 'light'} onClick={() => handleSelect('physicalActivity', 'light')} icon={<FaWalking />} title="Light" />
                      <ChoiceCard active={formData.physicalActivity === 'moderate'} onClick={() => handleSelect('physicalActivity', 'moderate')} icon={<FaRunning />} title="Moderate" />
                      <ChoiceCard active={formData.physicalActivity === 'very'} onClick={() => handleSelect('physicalActivity', 'very')} icon={<FaDumbbell />} title="Very Active" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-gray-600 font-bold uppercase tracking-wide text-xs ml-1">Alcohol Consumption</label>
                    <div className="grid grid-cols-3 gap-3">
                      <ChoiceCard active={formData.alcoholConsumption === 'none'} onClick={() => handleSelect('alcoholConsumption', 'none')} icon={<FaBan />} title="None" />
                      <ChoiceCard active={formData.alcoholConsumption === 'occasional'} onClick={() => handleSelect('alcoholConsumption', 'occasional')} icon={<FaWineGlass />} title="Occasional" />
                      <ChoiceCard active={formData.alcoholConsumption === 'regular'} onClick={() => handleSelect('alcoholConsumption', 'regular')} icon={<FaWineBottle />} title="Regular" />
                    </div>
                  </div>
                </div>
              )}

              {/* LEVEL 5 */}
              {currentStep === 5 && (
                <div className="space-y-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-800">History & Symptoms</h2>
                    <p className="text-gray-500 text-sm mt-1">Check any that apply to you or your family.</p>
                  </div>

                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-4 flex gap-4 items-start">
                    <FaExclamationTriangle className="text-orange-500 w-6 h-6 shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-800">Toggle these switches if you experience any of these symptoms or have been diagnosed with these conditions.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToggleCard active={formData.familyHistory} onClick={() => toggleBoolean('familyHistory')} title="Family Cardiac History" />
                    <ToggleCard active={formData.hypertensionHistory} onClick={() => toggleBoolean('hypertensionHistory')} title="Hypertension (High BP)" />
                    <ToggleCard active={formData.diabetesHistory} onClick={() => toggleBoolean('diabetesHistory')} title="Diabetes" />
                    <ToggleCard active={formData.chestPain} onClick={() => toggleBoolean('chestPain')} title="Frequent Chest Pain" />
                    <ToggleCard active={formData.breathlessness} onClick={() => toggleBoolean('breathlessness')} title="Breathlessness" />
                    <ToggleCard active={formData.palpitations} onClick={() => toggleBoolean('palpitations')} title="Palpitations" />
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

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
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 hover:scale-105 transition-all disabled:opacity-50"
              >
                {loading ? 'Calculating...' : 'Calculate Score'}
                {!loading && <FaHeartbeat />}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
