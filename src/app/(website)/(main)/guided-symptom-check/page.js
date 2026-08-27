"use client";

import { useState } from "react";
import {
  FaHeartbeat,
  FaArrowLeft,
  FaStethoscope,
  FaUserMd,
  FaShieldAlt,
  FaNotesMedical,
  FaClock,
  FaCheckCircle,
  FaComments,
  FaExclamationTriangle,
  FaArrowRight,
} from "react-icons/fa";
import Link from "next/link";

export default function GuidedSymptomCheckPage() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: "01",
      title: "Describe Your Symptoms",
      desc: "Type or speak your symptoms in everyday language. Describe what you feel, how long it has persisted, and any trigger factors.",
      icon: FaComments,
    },
    {
      step: "02",
      title: "Interactive Clinical Triage",
      desc: "Our intelligent triage assistant asks relevant follow-up questions regarding severity, associated symptoms, and medical history.",
      icon: FaStethoscope,
    },
    {
      step: "03",
      title: "Doctor-Ready Health Summary",
      desc: "A structured, chronological summary is compiled so your consulting doctor understands your case immediately without redundant questions.",
      icon: FaNotesMedical,
    },
    {
      step: "04",
      title: "Match with the Right Specialist",
      desc: "Receive evidence-based specialty recommendations (e.g. ENT, Gastroenterology, Cardiology) and book an instant or scheduled video consult.",
      icon: FaUserMd,
    },
  ];

  const benefits = [
    {
      title: "Streamlined Consultations",
      desc: "Share your complete symptom timeline before joining, allowing the doctor to focus directly on clinical diagnosis and treatment.",
    },
    {
      title: "Red-Flag & Emergency Warnings",
      desc: "Automatic detection of critical vital alerts (e.g. severe chest pain, sudden numbness) prompting immediate emergency care.",
    },
    {
      title: "Zero Medical Jargon Required",
      desc: "Express yourself comfortably in plain conversational language. The system organizes terms into clinical categories.",
    },
    {
      title: "Private & ABDM Compliant",
      desc: "Your symptom assessments are securely protected under Indian data privacy and Ayushman Bharat Digital Mission guidelines.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-16">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#0067A1] to-[#0080C6] px-6 py-12 md:px-10 md:py-16 text-center text-white">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs shadow-inner">
            <FaHeartbeat className="h-8 w-8 text-white" />
          </div>
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            Supportive Clinical Tools
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Guided Symptom Check
          </h1>
          <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
            Prepare for your doctor visit in minutes. Structure your symptoms, identify relevant medical specialties, and ensure your doctor has full context before your consultation starts.
          </p>

          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link
              href="/website/doctors"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-[#0067A1] font-bold text-sm rounded-xl shadow-md hover:bg-slate-50 transition-all cursor-pointer"
            >
              <FaUserMd className="w-4 h-4" />
              Find Doctors for Your Symptoms
            </Link>
            <Link
              href="/website/services"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/15 hover:bg-white/25 text-white font-semibold text-sm rounded-xl backdrop-blur-xs transition-all border border-white/30"
            >
              Explore All Services
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
        {/* Navigation Breadcrumb */}
        <Link
          href="/website/services"
          className="inline-flex items-center text-sm font-medium text-[#0067A1] hover:underline mb-8"
        >
          <FaArrowLeft className="mr-2 h-3.5 w-3.5" />
          Back to Healthcare Services
        </Link>

        {/* Emergency Alert Banner */}
        <div className="mb-10 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 shadow-xs">
          <FaExclamationTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 leading-relaxed">
            <p className="font-bold text-amber-950">Important Clinical Disclaimer</p>
            <p className="mt-1 text-amber-800">
              The Guided Symptom Check is a supportive educational and triage tool designed to assist patient-doctor communication. It does <strong>not</strong> provide a final medical diagnosis or substitute professional clinical examination. If you are experiencing emergency symptoms (such as acute shortness of breath, severe chest pressure, or loss of consciousness), please dial <strong>108 / 112</strong> or proceed to the nearest emergency room immediately.
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10 shadow-xs mb-10">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              How Guided Symptom Check Works
            </h2>
            <p className="text-gray-600 text-sm mt-2">
              A four-step streamlined pathway to connect your health concerns with verified medical care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-6 flex flex-col hover:border-[#0067A1]/30 hover:bg-[#0067A1]/5 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-extrabold text-[#0067A1] bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      STEP {item.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center group-hover:bg-[#0067A1] group-hover:text-white transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed flex-1">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Core Benefits Grid */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Key Advantages for Patients & Doctors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <FaCheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">{b.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action / Next Steps Banner */}
        <div className="bg-gradient-to-r from-[#003358] to-[#0067A1] rounded-2xl p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="max-w-xl">
            <h3 className="text-xl md:text-2xl font-bold mb-2">Ready to consult a verified specialist?</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Find experienced doctors across 20+ specialties including General Physicians, ENT, Gastroenterologists, Dermatologists, and Pediatricians.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
            <Link
              href="/website/doctors"
              className="px-6 py-3.5 bg-white text-[#0067A1] rounded-xl font-bold text-sm hover:bg-slate-100 transition-all text-center"
            >
              Browse Doctor Specialties
            </Link>
            <Link
              href="/website/contact"
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl font-semibold text-sm transition-all text-center"
            >
              Contact Support
            </Link>
          </div>
        </div>

        {/* Footer Support Info */}
        <div className="mt-12 text-center text-xs text-gray-500 space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <FaShieldAlt className="text-emerald-600" /> Compliant with Telemedicine Practice Guidelines & ABDM Framework
          </p>
          <p>Support Hours: 9:00 AM – 9:00 PM (All Days) | Email: info@mediconnect.fit</p>
        </div>
      </div>
    </div>
  );
}
