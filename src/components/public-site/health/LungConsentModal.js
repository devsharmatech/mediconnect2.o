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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="bg-white rounded-[5px] shadow-2xl border-2 border-slate-300 max-w-lg w-full overflow-hidden font-sans text-black"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b-2 border-slate-200 flex items-center justify-between bg-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[5px] bg-[#0067A1] text-white flex items-center justify-center font-bold shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-950">
                    Purpose-Specific Consent Hub
                  </h3>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-[5px] bg-[#003358] text-white">
                    B17
                  </span>
                </div>
                <p className="text-xs text-slate-800 font-semibold mt-0.5">Transparent health data authorization & governance</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-700 hover:text-black p-1.5 rounded-[5px] hover:bg-slate-200 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-3.5 bg-white">
            <p className="text-xs text-slate-900 font-semibold leading-relaxed bg-slate-50 p-3 rounded-[5px] border border-slate-200">
              MediConnect strictly isolates patient authorization by purpose. You have full control over what data is recorded, processed, or shared.
            </p>

            {/* Purpose 1: Core Wellness Records */}
            <div className="p-4 rounded-[5px] border-2 border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-[#0067A1] shrink-0" />
                  <h4 className="text-xs font-black text-slate-950">
                    1. Wellness Assessment Data
                  </h4>
                </div>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  Allows storing self-reported respiratory inputs, breath-holding seconds, and assessment results against your Care Episode. Required for historical trends.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consents.wellnessData}
                onChange={() => handleToggle('wellnessData')}
                className="w-5 h-5 accent-[#0067A1] rounded-[3px] cursor-pointer mt-1"
              />
            </div>

            {/* Purpose 2: Environmental & Location (B18) */}
            <div className="p-4 rounded-[5px] border-2 border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-[#0067A1] shrink-0" />
                  <h4 className="text-xs font-black text-slate-950">
                    2. Location & Air Quality Context
                  </h4>
                </div>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  Allows accessing device GPS or selected city to retrieve live Air Quality Index (AQI) and weather. Optional; denying this does not block your assessment.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consents.environmentalLocation}
                onChange={() => handleToggle('environmentalLocation')}
                className="w-5 h-5 accent-[#0067A1] rounded-[3px] cursor-pointer mt-1"
              />
            </div>

            {/* Purpose 3: Specialist Sharing */}
            <div className="p-4 rounded-[5px] border-2 border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Stethoscope className="w-4 h-4 text-[#003358] shrink-0" />
                  <h4 className="text-xs font-black text-slate-950">
                    3. Pulmonologist Report Sharing
                  </h4>
                </div>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  Authorizes sharing your summary assessment report with the consulting doctor only when you book an appointment. No public or third-party disclosure.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consents.specialistSharing}
                onChange={() => handleToggle('specialistSharing')}
                className="w-5 h-5 accent-[#0067A1] rounded-[3px] cursor-pointer mt-1"
              />
            </div>

            {/* Consent Policy Notice */}
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-[5px] text-xs text-amber-950 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong className="font-black text-amber-950">Non-Revocable Clinical Logs:</strong> Historical clinical activity sessions already rendered remain preserved in HIPAA/audit compliant records.
              </span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border-2 border-slate-400 hover:bg-slate-100 text-black font-black text-xs rounded-[5px] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-black text-xs rounded-[5px] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Save Preferences
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
