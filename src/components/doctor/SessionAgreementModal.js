"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, AlertCircle, FileText, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function SessionAgreementModal() {
  const [loading, setLoading] = useState(true);
  const [acceptedToday, setAcceptedToday] = useState(true); // Default true to prevent flash
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const checkAgreement = async () => {
      try {
        const doctorId = localStorage.getItem("userId");
        const role = localStorage.getItem("userRole");
        if (!doctorId || role !== "doctor") {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/doctors/session-agreement?doctor_id=${doctorId}`);
        const data = await res.json();

        if (data.success) {
          setAcceptedToday(data.data.accepted_today);
        }
      } catch (err) {
        console.error("Failed to check session agreement", err);
      } finally {
        setLoading(false);
      }
    };

    checkAgreement();
  }, []);

  const handleAccept = async () => {
    if (!agreed) {
      toast.error("Please explicitly tick the checkbox to agree to the terms.");
      return;
    }

    try {
      setSubmitting(true);
      const doctorId = localStorage.getItem("userId");

      const res = await fetch("/api/doctors/session-agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Daily Clinical Liability accepted.");
        setAcceptedToday(true);
      } else {
        toast.error(data.error || "Failed to submit agreement.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit agreement.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || acceptedToday) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col my-auto max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#0067A1] px-5 py-4 flex items-center gap-3 flex-shrink-0">
          <div className="p-2.5 bg-white/20 rounded-xl">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Daily Liability Agreement</h2>
            <p className="text-emerald-100 text-xs mt-0.5">Required before starting today&apos;s sessions</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-start gap-3 bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
            <p>
              Under DPDP regulations and internal medical compliance policies, you must explicitly accept clinical liability before conducting any consultations today.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-slate-700 text-sm space-y-3 max-h-40 overflow-y-auto">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Mediconnect Terms of Clinical Practice
            </h4>
            <p>1. I confirm that I am a registered medical practitioner authorized to prescribe medications digitally.</p>
            <p>2. I understand that I hold full clinical liability for the safety and appropriateness of prescriptions generated via this platform.</p>
            <p>3. I agree to review the system&apos;s &quot;Clinical Risk Warnings&quot; carefully and provide sound medical justification when overriding any high-severity drug interaction flags.</p>
            <p>4. I will respect patient data privacy and adhere to the DPDP Act guidelines.</p>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5 flex-shrink-0">
              <input 
                type="checkbox" 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-5 h-5 appearance-none border-2 border-slate-300 rounded-md checked:bg-[#0067A1] checked:border-[#0067A1] transition-colors cursor-pointer"
              />
              <CheckCircle className={`absolute w-3.5 h-3.5 text-white pointer-events-none transition-opacity ${agreed ? 'opacity-100' : 'opacity-0'}`} />
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors leading-snug">
              I have read, understood, and accept the Mediconnect Clinical Liability terms for today&apos;s session.
            </span>
          </label>
        </div>

        {/* Footer — always visible at bottom */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={handleAccept}
            disabled={!agreed || submitting}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
              agreed && !submitting
                ? "bg-[#0067A1] hover:bg-[#004F7C] text-white shadow-lg shadow-[#0067A1]/20"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {submitting ? "Processing..." : "Accept Risk & Proceed"}
          </button>
        </div>

      </div>
    </div>
  );

}
