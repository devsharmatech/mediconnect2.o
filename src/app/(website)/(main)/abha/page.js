"use client";

import { useState } from "react";
import Image from "next/image";
import { FaIdCard, FaShieldAlt, FaUserShield, FaCheckCircle, FaArrowRight } from "react-icons/fa";
import { motion } from "framer-motion";

export default function AbhaCreationPage() {
    const [step, setStep] = useState(1);
    const [creationType, setCreationType] = useState("aadhaar"); // aadhaar, mobile, dl
    const [inputValue, setInputValue] = useState("");
    const [otp, setOtp] = useState("");

    const handleCreateAbha = (e) => {
        e.preventDefault();
        // Placeholder for actual ABHA creation logic
        alert(`Creating ABHA using ${creationType} with value: ${inputValue}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Hero Section */}
            <section className="bg-[#0067A1] text-white py-16 lg:py-24 relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                    <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.1C93.5,9,82.2,22.4,70.9,33.2C59.6,44,48.3,52.3,36.4,59.3C24.5,66.3,12,72.1,-1.1,74C-14.2,75.9,-29.4,73.9,-42.5,66.6C-55.6,59.3,-66.6,46.7,-74.6,32.3C-82.6,17.9,-87.6,1.7,-84.8,-12.9C-82,-27.5,-71.4,-40.5,-59.3,-49.4C-47.2,-58.3,-33.6,-63.1,-20.3,-66.7C-7,-70.3,6,-72.7,19.3,-75.1Z" transform="translate(100 100)" />
                    </svg>
                </div>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-sm font-medium tracking-wide">National Health Authority Approved</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                            Create Your <span className="text-[#3edcb4]">ABHA Number</span>
                        </h1>
                        <p className="text-lg text-gray-100 max-w-2xl mb-8 leading-relaxed">
                            Unlock India's digital health ecosystem. Securely store and share your health records, skip long queues at hospitals, and get seamless access to healthcare services.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                                <FaShieldAlt className="text-[#3edcb4]" />
                                <span className="text-sm font-medium">Secure & Private</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                                <FaCheckCircle className="text-[#3edcb4]" />
                                <span className="text-sm font-medium">Government Verified</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                    {/* Left Column: Form Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
                    >
                        <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Get Started</h2>
                                <p className="text-sm text-gray-500">Create your ABHA in 3 easy steps</p>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <FaIdCard className="text-[#0067A1] w-6 h-6" />
                            </div>
                        </div>

                        <div className="p-8">
                            {/* Tabs */}
                            {step === 1 && (
                                <div className="flex space-x-4 border-b border-gray-200 mb-6">
                                    {["aadhaar", "dl", "mobile"].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setCreationType(type);
                                                setInputValue("");
                                            }}
                                            className={`pb-2 text-sm font-medium capitalize transition-colors border-b-2 ${creationType === type
                                                    ? "border-[#0067A1] text-[#0067A1]"
                                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                                }`}
                                        >
                                            {type === "dl" ? "Driving License" : type}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={handleCreateAbha} className="space-y-6">
                                {step === 1 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                                                Enter {creationType === "dl" ? "Driving License" : creationType} Number
                                            </label>
                                            <input
                                                type="text"
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                placeholder={`Enter your ${creationType === "dl" ? "Driving License" : creationType} number`}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#0067A1] focus:border-transparent outline-none transition-all"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            By continuing, you agree to share your details for ABHA creation as per NHA guidelines.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            disabled={!inputValue}
                                            className="w-full bg-[#0067A1] text-white py-3.5 rounded-xl font-semibold hover:bg-[#004F7C] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0067A1]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Send OTP <FaArrowRight className="text-sm" />
                                        </button>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                                            <input
                                                type="text"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                placeholder="Enter 6-digit OTP sent to mobile"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#0067A1] focus:border-transparent outline-none transition-all"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setStep(3)}
                                            className="w-full bg-[#0067A1] text-white py-3.5 rounded-xl font-semibold hover:bg-[#004F7C] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0067A1]/20"
                                        >
                                            Verify & Create <FaCheckCircle className="text-sm" />
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 font-medium">Powered by</span>
                                <img src="https://abdm.gov.in/static/media/Ayushman-logo.d6e0ea533c09466a0598ccb56c7ef652.svg" alt="ABDM" className="h-6" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Benefits */}
                    <div className="space-y-8 lg:pt-8">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-4 items-start">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <FaUserShield className="w-6 h-6 text-[#0067A1]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Unified Health Identity</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    One identity for all your healthcare needs. No more carrying excessive physical files or reports.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-4 items-start">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                <FaShieldAlt className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Consent-Based Sharing</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    You have full control. Share your health records with doctors only when you choose to, with granular consent.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-4 items-start">
                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                                <FaCheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Easy Registration</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Skip the queues at hospital registration counters. Use your ABHA to scan and share details instantly.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
