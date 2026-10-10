"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, AlertCircle, FileText, CheckCircle, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function DpdpConsentModal({ role, userId, onAccept }) {
  const [loading, setLoading] = useState(true);
  const [acceptedToday, setAcceptedToday] = useState(true); // Default true to prevent flash
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const checkAgreement = async () => {
      if (!userId || !role) {
        setLoading(false);
        return;
      }

      try {
        const endpoint = role === "lab" 
          ? `/api/lab/dpdp-consent?lab_id=${userId}`
          : `/api/chemists/dpdp-consent?chemist_id=${userId}`;

        const res = await fetch(endpoint);
        const result = await res.json();

        if (result.success) {
          setAcceptedToday(result.data.accepted_today);
        }
      } catch (err) {
        console.error("Failed to check daily DPDP consent status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAgreement();
  }, [userId, role]);

  const handleAccept = async () => {
    if (!agreed) {
      toast.error("Please check the box to confirm your DPDP Act consent.");
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = role === "lab" ? "/api/lab/dpdp-consent" : "/api/chemists/dpdp-consent";
      const body = role === "lab" ? { lab_id: userId } : { chemist_id: userId };

      // Optional: Add IP and Device info
      if (typeof window !== "undefined") {
        body.device_info = window.navigator.userAgent;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("DPDP Daily Consent accepted successfully.");
        setAcceptedToday(true);
        if (onAccept) onAccept();
      } else {
        toast.error(result.error || "Failed to submit DPDP consent.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Failed to submit DPDP consent.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || acceptedToday) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col my-auto max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="bg-[#0067A1] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white rounded-xl p-1.5 flex items-center justify-center shadow-md border border-white/20 shrink-0 overflow-hidden">
              <img
                src="/real-logo.png"
                alt="MediConnect"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Daily DPDP Consent</h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-emerald-200 text-[10px] font-semibold border border-white/20">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  DPDP 2023
                </span>
              </div>
              <p className="text-sky-100 text-xs mt-0.5 font-medium">Digital Personal Data Protection Act, 2023 Compliance</p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[11px] font-semibold text-white/95 tracking-wide">MediConnect</span>
            <span className="text-[10px] text-sky-200 font-medium">Verified Partner Portal</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          <div className="flex items-start gap-2.5 sm:gap-3 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 p-3 sm:p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs sm:text-sm leading-relaxed">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p>
              As a registered health service partner, you will be processing sensitive patient health data. Under the <strong className="font-semibold text-amber-950 dark:text-amber-100">DPDP Act 2023 of India</strong>, you must explicitly reaffirm your data protection commitments daily before accessing the portal.
            </p>
          </div>

          <div className="border border-slate-200 dark:border-gray-700 rounded-xl p-3.5 sm:p-4 bg-slate-50 dark:bg-gray-900/50 text-slate-700 dark:text-gray-300 text-xs sm:text-sm space-y-3.5">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs sm:text-sm">
              <FileText className="w-4 h-4 text-[#0067A1] dark:text-emerald-400 shrink-0" /> Reaffirmation of Legal Commitments
            </h4>
            
            <div className="space-y-3">
              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#0067A1] dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">1</div>
                <p className="leading-relaxed">
                  <strong className="font-semibold text-slate-900 dark:text-white">Data Purpose Limitation:</strong> I agree to access, view, and process patient records (prescriptions, tests, reports) strictly for the purpose of executing the requested services and none other.
                </p>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#0067A1] dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">2</div>
                <p className="leading-relaxed">
                  <strong className="font-semibold text-slate-900 dark:text-white">Access Control & Integrity:</strong> I will restrict patient data visibility only to authorized operators inside my facility. I will not share, download, or export any patient data without explicit legal authorization.
                </p>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#0067A1] dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">3</div>
                <p className="leading-relaxed">
                  <strong className="font-semibold text-slate-900 dark:text-white">Audit Logs & Compliance:</strong> I acknowledge that all actions performed within this session (updates, uploads, orders processed) are fully logged, audited, and stored for legal compliance under DPDP guidelines.
                </p>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#0067A1] dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">4</div>
                <p className="leading-relaxed">
                  <strong className="font-semibold text-slate-900 dark:text-white">Honor Patient Rights:</strong> I agree to respect and immediately facilitate any request regarding patient rights (data erasure, corrections, consent withdrawal) forwarded to my facility by the platform.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-900/30 transition-colors">
            <div className="relative flex items-center justify-center mt-0.5 flex-shrink-0">
              <input 
                type="checkbox" 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-5 h-5 appearance-none border-2 border-slate-300 dark:border-gray-600 rounded-md checked:bg-[#0067A1] checked:border-[#0067A1] dark:checked:bg-[#0067A1] dark:checked:border-[#0067A1] transition-colors cursor-pointer"
              />
              <Check className={`absolute w-3.5 h-3.5 text-white pointer-events-none transition-opacity ${agreed ? 'opacity-100' : 'opacity-0'}`} />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-relaxed">
              I have read, understood, and accept my legal obligations under the Indian DPDP Act 2023 for today&apos;s operations.
            </span>
          </label>
        </div>

        {/* Footer — always visible at the bottom */}
        <div className="bg-slate-50 dark:bg-gray-900/50 px-5 py-4 border-t border-slate-100 dark:border-gray-700 flex justify-end flex-shrink-0 gap-3">
          <button
            onClick={handleAccept}
            disabled={!agreed || submitting}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              agreed && !submitting
                ? "bg-[#0067A1] hover:bg-[#004F7C] text-white shadow-lg shadow-[#0067A1]/20"
                : "bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : null}
            {submitting ? "Verifying..." : "Accept & Proceed"}
          </button>
        </div>

      </div>
    </div>
  );
}
