"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShieldCheck, MapPin, Stethoscope, Check, AlertCircle,
  FileText, Bell, Sparkles, ChevronRight, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatedShieldConsent } from './animations';

export default function LungConsentModal({ isOpen, onClose, onSaved }) {
  const [step, setStep] = useState('select'); // 'select' | 'confirm'
  const [consents, setConsents] = useState({
    service_data: true,
    location_context: true,
    notifications: true,
    consultation_care: true,
    marketing: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lung_consent_preferences');
      if (stored) {
        setConsents(prev => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch (e) {
      console.warn("Could not load consent settings:", e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    setConsents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleProceedToConfirm = () => {
    setStep('confirm');
  };

  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('lung_consent_preferences', JSON.stringify(consents));

      let currentUserId = null;
      const raw = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
      if (raw) {
        const u = JSON.parse(raw);
        currentUserId = u.user_id || u.user?.id || u.id;
      }

      await fetch('/api/v1/lung/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId || 'guest_user',
          permissions: consents,
          policy_version: '1.0',
        }),
      });

      toast.success("Consent preferences confirmed & saved!");
      if (onSaved) onSaved(consents);
      setStep('select');
      onClose();
    } catch (e) {
      console.warn("Failed to persist consent to backend:", e);
      toast.success("Preferences saved locally.");
      if (onSaved) onSaved(consents);
      setStep('select');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const purposes = [
    {
      key: 'service_data',
      title: '1. LungConnect Service / Data',
      desc: 'Stores and processes exercise logs, 6MWT distance, and wellness trend records against your care profile.',
      icon: FileText,
      badge: 'Core Service',
    },
    {
      key: 'location_context',
      title: '2. Location / Environmental Context',
      desc: 'Allows accessing device GPS or selected city to retrieve real-time Indian CPCB Air Quality Index & weather metrics.',
      icon: MapPin,
      badge: 'Environmental Context',
    },
    {
      key: 'notifications',
      title: '3. Notifications & Prompts',
      desc: 'Enables interval reminders, Day 15/30 checkpoint notifications, and daily respiratory exercise alerts.',
      icon: Bell,
      badge: 'Pacing Prompts',
    },
    {
      key: 'consultation_care',
      title: '4. Consultation / Professional Care',
      desc: 'Authorizes pre-populating care episodes and structured reports when requesting a licensed pulmonologist consultation.',
      icon: Stethoscope,
      badge: 'Clinical Care',
    },
    {
      key: 'marketing',
      title: '5. Marketing & Platform Insights (Optional)',
      desc: 'Allows receiving wellness education newsletters, feature updates, and participating in voluntary health surveys.',
      icon: Sparkles,
      badge: 'Optional',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-[6px] shadow-2xl border-0 sm:border border-slate-200/80 flex flex-col overflow-hidden font-sans text-slate-800"
        >
          {/* Header */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 z-20">
            <div className="flex items-center gap-3">
              <AnimatedShieldConsent size="sm" isVerified={true} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {step === 'confirm' ? 'Review & Confirm Permissions' : 'Consent & Permissions Hub'}
                  </h3>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5">
                  {step === 'confirm' ? 'Confirm your purpose-specific authorization' : 'Transparent health data authorization & governance'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-[5px] hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-3.5 flex-1">
            {step === 'select' ? (
              <>
                <p className="text-xs text-slate-700 font-normal leading-relaxed bg-sky-50 p-3 rounded-[5px] border border-sky-200">
                  MediConnect strictly isolates patient authorization by specific purpose. You retain continuous authority to toggle each permission without losing access to non-dependent features.
                </p>

                <div className="space-y-2.5">
                  {purposes.map((p) => {
                    const Icon = p.icon;
                    const isChecked = Boolean(consents[p.key]);
                    return (
                      <div
                        key={p.key}
                        onClick={() => handleToggle(p.key)}
                        className={`p-3 rounded-[5px] border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isChecked
                            ? 'border-[#0067A1] bg-sky-50/40'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-[4px] flex items-center justify-center shrink-0 mt-0.5 ${
                            isChecked ? 'bg-[#0067A1] text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="text-xs font-semibold text-slate-900">{p.title}</h4>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                {p.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-normal leading-relaxed">
                              {p.desc}
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div
                          className="w-4 h-4 accent-[#0067A1] rounded-[3px] cursor-pointer mt-1 shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-[5px] text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold text-amber-900">Audit Compliance:</strong> Permission modifications are logged with UTC timestamps in compliance with MediConnect Clinical Governance.
                  </span>
                </div>
              </>
            ) : (
              /* Review & Confirm (B17-S02) */
              <div className="space-y-3.5">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[5px]">
                  <h4 className="text-xs font-semibold text-slate-900 mb-1">Confirmation Summary</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Please review your selections before confirming. Your authorizations take effect immediately across all sessions.
                  </p>
                </div>

                <div className="space-y-2">
                  {purposes.map((p) => {
                    const isSelected = Boolean(consents[p.key]);
                    return (
                      <div key={p.key} className="flex items-center justify-between p-3 rounded-[5px] bg-white border border-slate-200">
                        <span className="text-xs font-semibold text-slate-800">{p.title}</span>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[4px] ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {isSelected ? 'GRANTED' : 'DENIED'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0 flex gap-2.5">
            {step === 'select' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-[5px] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToConfirm}
                  className="flex-1 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold text-xs rounded-[5px] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Review & Confirm</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="flex-1 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-[5px] cursor-pointer transition-colors"
                >
                  Back to Change
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSave}
                  disabled={isSaving}
                  className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-xs rounded-[5px] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? "Saving..." : "Confirm & Save"}</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
