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
        <div className="fixed inset-0 z-[999999] bg-white flex flex-col h-[100dvh] w-screen overflow-hidden">

            {/* ── Header ── */}
            <div className="flex-shrink-0 bg-[#0067A1] text-white shadow-md z-10">
                <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-semibold text-white leading-tight">
                                Patient Consent Required
                            </h2>
                            <p className="text-[11px] text-white/75 mt-0.5 font-normal">
                                DPDP Act 2023 — Mandatory before consultation
                            </p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 transition-colors text-white/80 hover:text-white cursor-pointer"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-4">

                    {/* Notice banner */}
                    <div className="bg-amber-50 border border-amber-200 p-3.5 flex gap-3">
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
                                    className={`flex items-start gap-4 p-4 border cursor-pointer transition-colors select-none ${
                                        isChecked
                                            ? "border-[#0067A1] bg-[#0067A1]/5"
                                            : "border-gray-200 bg-white hover:border-[#0067A1]/50 hover:bg-blue-50/30"
                                    }`}
                                >
                                    {/* Square checkbox */}
                                    <div className={`w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors ${
                                        isChecked
                                            ? "bg-[#0067A1] border-[#0067A1]"
                                            : "border-gray-300 bg-white"
                                    }`}>
                                        {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </div>

                                    {/* Text */}
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">
                                            {item.title}
                                            <span className="ml-1 text-red-500 text-xs font-normal">*</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed font-normal">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Sticky Footer ── */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-10">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-3">

                    {/* Select all + counter */}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-xs text-[#0067A1] font-medium hover:underline cursor-pointer"
                        >
                            Select All Consents
                        </button>
                        <span className="text-xs text-gray-400 font-normal">
                            {grantedCount} / {CONSENT_ITEMS.length} granted
                        </span>
                    </div>

                    {/* Primary CTA — no rounded, prominent shadow */}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!allChecked || submitting}
                        className="w-full py-3 px-4 bg-[#0067A1] hover:bg-[#004F7C] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_14px_rgba(0,103,161,0.35)] hover:shadow-[0_6px_20px_rgba(0,103,161,0.45)]"
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>{submitting ? "Recording Consents..." : (actionLabel || "I Agree — Proceed to Booking")}</span>
                    </button>

                    <p className="text-center text-[11px] text-gray-400 font-normal">
                        You can withdraw consent anytime from Settings → Privacy.
                    </p>
                </div>
            </div>
        </div>
    );

    return createPortal(modalMarkup, document.body);
}
