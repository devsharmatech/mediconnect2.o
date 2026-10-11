"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X, AlertTriangle, Check } from "lucide-react";
import { toast } from "react-hot-toast";

const CONSENT_ITEMS = [
    {
        type: "CONSULTATION_CONSENT",
        title: "Consultation Consent",
        description: "I consent to receiving medical consultation services from a licensed doctor on this platform.",
        required: true,
    },
    {
        type: "TELEMEDICINE_CONSENT",
        title: "Telemedicine Consent",
        description: "I consent to participate in teleconsultations via video, audio, or text channels as per the telemedicine guidelines (MoHFW 2020).",
        required: true,
    },
    {
        type: "DATA_PROCESSING_CONSENT",
        title: "Data Processing Consent",
        description: "I consent to the processing of my health data for AI-assisted diagnosis support and anonymised analytics under DPDP Act 2023.",
        required: true,
    },
    {
        type: "PRESCRIPTION_CONSENT",
        title: "E-Prescription Consent",
        description: "I consent to receiving electronic prescriptions and to their being shared with affiliated pharmacies and labs with my approval.",
        required: true,
    },
];

/**
 * ConsentGate — DPDP Layer-111 Consent Collection
 *
 * Shown before a patient can book a consultation.
 * Writes to patient_consent_log via POST /api/user/consent/grant.
 *
 * Usage:
 *   <ConsentGate
 *     isOpen={showConsent}
 *     onConsentGranted={() => proceedToBooking()}
 *     onClose={() => setShowConsent(false)}
 *   />
 */
export default function ConsentGate({ isOpen, onConsentGranted, onClose, actionLabel }) {
    const [checked, setChecked] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const allChecked = CONSENT_ITEMS.every(item => checked[item.type]);

    const toggleConsent = (type) => {
        setChecked(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const handleSelectAll = () => {
        const newState = {};
        CONSENT_ITEMS.forEach(item => { newState[item.type] = true; });
        setChecked(newState);
    };

    const handleSubmit = async () => {
        if (!allChecked) {
            toast.error("Please grant all required consents to proceed.");
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem("authToken") || 
                          localStorage.getItem("userId") || 
                          sessionStorage.getItem("userId");
            const consentTypes = CONSENT_ITEMS.map(i => i.type);

            const res = await fetch("/api/user/consent/grant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ consent_types: consentTypes }),
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || data.error || "Failed to grant consents");
            }

            toast.success("Consents recorded successfully!");
            if (onConsentGranted) onConsentGranted();
        } catch (err) {
            console.error("Consent grant error:", err);
            toast.error(err.message || "Failed to record consents. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const grantedCount = Object.values(checked).filter(Boolean).length;

    const modalMarkup = (
        <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
            <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[88vh] sm:max-w-xl md:max-w-2xl bg-white rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-0 sm:border sm:border-slate-200">

                {/* ── Header ── */}
                <div className="flex-shrink-0 bg-[#0067A1] text-white shadow-md z-10 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-semibold text-white leading-tight">
                                Patient Consent Required
                            </h2>
                            <p className="text-[11px] text-white/80 mt-0.5 font-normal">
                                DPDP Act 2023 — Mandatory before consultation
                            </p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white cursor-pointer"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:px-6 py-5 space-y-4">

                    {/* Notice banner */}
                    <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed font-normal">
                            All 4 consents are mandatory under Indian telemedicine regulations and the DPDP Act 2023.
                            Your data is protected and will never be sold.
                        </p>
                    </div>

                    {/* Consent items */}
                    <div className="space-y-2.5">
                        {CONSENT_ITEMS.map((item) => {
                            const isChecked = !!checked[item.type];
                            return (
                                <div
                                    key={item.type}
                                    onClick={() => toggleConsent(item.type)}
                                    className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
                                        isChecked
                                            ? "border-[#0067A1] bg-[#0067A1]/5 shadow-xs"
                                            : "border-slate-200 bg-white hover:border-[#0067A1]/40 hover:bg-slate-50/70"
                                    }`}
                                >
                                    {/* Square checkbox with subtle rounding */}
                                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors ${
                                        isChecked
                                            ? "bg-[#0067A1] border-[#0067A1]"
                                            : "border-slate-300 bg-white"
                                    }`}>
                                        {isChecked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                    </div>

                                    {/* Text */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-semibold text-slate-800">
                                            {item.title}
                                            <span className="ml-1 text-rose-500 text-xs font-normal">*</span>
                                        </p>
                                        <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed font-normal">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Sticky Footer ── */}
                <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-4 space-y-3 z-10">

                    {/* Select all + counter */}
                    <div className="flex items-center justify-between text-xs">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-[#0067A1] font-semibold hover:underline cursor-pointer"
                        >
                            Select All Consents
                        </button>
                        <span className="text-slate-400 font-medium">
                            {grantedCount} / {CONSENT_ITEMS.length} granted
                        </span>
                    </div>

                    {/* Primary CTA — concise button text per AGENTS.md, slight round + shadow */}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!allChecked || submitting}
                        className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#0067A1] hover:bg-[#004F7C] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#0067A1]/20 hover:shadow-lg hover:shadow-[#0067A1]/30"
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>{submitting ? "Saving..." : (actionLabel || "Agree & Continue")}</span>
                    </button>

                    <p className="text-center text-[10px] sm:text-[11px] text-slate-400 font-normal">
                        You can withdraw consent anytime from Settings → Privacy.
                    </p>
                </div>
            </div>
        </div>
    );

    return createPortal(modalMarkup, document.body);
}
