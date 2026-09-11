"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, MapPin, Stethoscope, Check, AlertCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LungConsentModal({ isOpen, onClose }) {
  const [consents, setConsents] = useState({
    wellnessData: true,
    environmentalLocation: true,
    specialistSharing: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lung_consent_preferences');
      if (stored) {
        setConsents(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not load consent settings:", e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    setConsents(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      return updated;
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem('lung_consent_preferences', JSON.stringify(consents));
      toast.success("Consent preferences saved successfully!");
    } catch (e) {
      console.warn("Failed to persist consent:", e);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Purpose-Specific Consent Hub <span className="text-xs font-normal text-slate-500">(B17)</span>
                </h3>
                <p className="text-xs text-slate-500">Transparent health data authorization & governance</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              MediConnect strictly isolates patient authorization by purpose. You have full control over what data is recorded, processed, or shared.
            </p>

            {/* Purpose 1: Core Wellness Records */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-[#0067A1] shrink-0" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    1. Wellness Assessment Data
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Allows storing self-reported respiratory inputs, breath-holding seconds, and assessment results against your Care Episode. Required for historical trends.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consents.wellnessData}
                onChange={() => handleToggle('wellnessData')}
                className="w-5 h-5 accent-[#0067A1] rounded cursor-pointer mt-1"
              />
            </div>

            {/* Purpose 2: Environmental & Location (B18) */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    2. Location & Air Quality Context
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Allows accessing device GPS or selected city to retrieve live Air Quality Index (AQI) and weather. Optional; denying this does not block your assessment.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consents.environmentalLocation}
                onChange={() => handleToggle('environmentalLocation')}
                className="w-5 h-5 accent-[#0067A1] rounded cursor-pointer mt-1"
              />
            </div>

            {/* Purpose 3: Specialist Sharing */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Stethoscope className="w-4 h-4 text-purple-600 shrink-0" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    3. Pulmonologist Report Sharing
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Authorizes sharing your summary assessment report with the consulting doctor only when you book an appointment. No public or third-party disclosure.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consents.specialistSharing}
                onChange={() => handleToggle('specialistSharing')}
                className="w-5 h-5 accent-[#0067A1] rounded cursor-pointer mt-1"
              />
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-3 bg-[#0067A1] hover:bg-[#005584] text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
