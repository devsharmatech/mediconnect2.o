"use client";

import React, { useState } from "react";
import { ShieldCheck, X, AlertTriangle, CheckCircle } from "lucide-react";
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

    if (!isOpen) return null;

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

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh]">

                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-[#0067A1] to-[#0080C6] flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Patient Consent Required</h2>
                            <p className="text-xs text-white/70 mt-0.5">DPDP Act 2023 — Mandatory before consultation</p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/70 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Notice */}
                <div className="px-5 pt-4 flex-shrink-0">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                            All 4 consents are mandatory under Indian telemedicine regulations and the DPDP Act 2023.
                            Your data is protected and will never be sold.
                        </p>
                    </div>
                </div>

                {/* Consent items */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {CONSENT_ITEMS.map((item) => {
                        const isChecked = !!checked[item.type];
                        return (
                            <label
                                key={item.type}
                                onClick={() => toggleConsent(item.type)}
                                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                                    isChecked
                                        ? "border-[#0067A1] bg-[#0067A1]/5"
                                        : "border-gray-200 hover:border-[#0067A1]/40 hover:bg-gray-50"
                                }`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors ${
                                    isChecked ? "bg-[#0067A1] border-[#0067A1]" : "border-gray-300"
                                }`}>
                                    {isChecked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{item.title}
                                        <span className="ml-1 text-red-500 text-xs">*</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                                </div>
                            </label>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-xs text-[#0067A1] font-semibold hover:underline"
                        >
                            Select All Consents
                        </button>
                        <span className="text-xs text-gray-400">
                            {Object.values(checked).filter(Boolean).length} / {CONSENT_ITEMS.length} granted
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!allChecked || submitting}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white font-bold text-sm shadow-lg shadow-[#0067A1]/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ShieldCheck className="w-4 h-4" />
                        )}
                        {submitting ? "Recording Consents..." : (actionLabel || "I Agree — Proceed to Booking")}
                    </button>
                    <p className="text-center text-[10px] text-gray-400">
                        You can withdraw consent anytime from Settings → Privacy.
                    </p>
                </div>
            </div>
        </div>
    );
}
