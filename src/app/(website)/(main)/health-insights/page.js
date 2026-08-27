"use client";

import {
  FaChartLine,
  FaArrowLeft,
  FaFileMedical,
  FaHeartbeat,
  FaShieldAlt,
  FaUserMd,
  FaFlask,
  FaCheckCircle,
  FaLock,
  FaHistory,
} from "react-icons/fa";
import Link from "next/link";

export default function HealthInsightsPage() {
  const pillars = [
    {
      title: "Lab Biomarker Tracking",
      desc: "Visualize your blood test parameters (HbA1c, lipid profiles, kidney function, CBC) chronologically to detect subtle shifts before they become health issues.",
      icon: FaFlask,
    },
    {
      title: "Vital Trend Logs",
      desc: "Monitor your blood pressure, resting heart rate, and blood sugar readings in real time to assist your doctor with precise medication adjustments.",
      icon: FaHeartbeat,
    },
    {
      title: "ABHA Health Locker Integration",
      desc: "Securely aggregate diagnostic reports, digital prescriptions, and discharge summaries across all hospitals into a unified Ayushman Bharat health account.",
      icon: FaLock,
    },
    {
      title: "Post-Consultation Recovery Care",
      desc: "Track treatment milestones and symptom relief progress following your doctor's consultations and follow-up care plans.",
      icon: FaHistory,
    },
  ];

  const benefits = [
    {
      title: "Doctor-Led Decision Support",
      desc: "Gives your consulting physician access to your longitudinal medical trajectory rather than just a single isolated report.",
    },
    {
      title: "Avoid Duplicate & Redundant Lab Tests",
      desc: "Keeping all historical diagnostics in one digital record prevents unnecessary repeating of expensive lab tests.",
    },
    {
      title: "Personalized Preventive Health Alerts",
      desc: "Receive timely reminders when chronic condition parameters require re-testing or follow-up reviews.",
    },
    {
      title: "100% Patient Privacy & Consent Control",
      desc: "You retain full ownership of your records. Only verified healthcare providers with your explicit OTP consent can review your history.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-16">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#0067A1] to-[#0080C6] px-6 py-12 md:px-10 md:py-16 text-center text-white">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs shadow-inner">
            <FaChartLine className="h-8 w-8 text-white" />
          </div>
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            Longitudinal Health Intelligence
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Health Insights & Trends
          </h1>
          <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
            Transform disparate lab reports, vitals, and medical histories into clear, continuous trends to empower informed clinical decisions and proactive wellness.
          </p>

          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link
              href="/website/appointments"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-[#0067A1] font-bold text-sm rounded-xl shadow-md hover:bg-slate-50 transition-all cursor-pointer"
            >
              <FaFileMedical className="w-4 h-4" />
              View Your Health Records
            </Link>
            <Link
              href="/website/doctors"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/15 hover:bg-white/25 text-white font-semibold text-sm rounded-xl backdrop-blur-xs transition-all border border-white/30"
            >
              Consult a Specialist
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

        {/* Overview Box */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xs mb-10">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Why Continuous Health Tracking Matters
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Traditional healthcare is episodic: patients see a doctor when sick and lose track of the broader picture once symptoms subside. MediConnect Health Insights creates a continuous, longitudinal health record that links consultations, diagnostic reports, and recovery outcomes together.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              When doctors can observe how your blood sugar, cholesterol, or kidney biomarkers behave over 6 to 12 months, they can offer more personalized clinical advice and catch potential health risks early.
            </p>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Key Components of Health Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pillars.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:border-[#0067A1]/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 shadow-xs mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            How You and Your Doctor Benefit
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-2xs flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <FaCheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">{b.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action / Next Steps Banner */}
        <div className="bg-gradient-to-r from-[#003358] to-[#0067A1] rounded-2xl p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="max-w-xl">
            <h3 className="text-xl md:text-2xl font-bold mb-2">Track Your Health With Verified Doctors</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Book a video consultation, upload recent diagnostic reports, and receive clear clinical guidance tailored to your health trends.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
            <Link
              href="/website/doctors"
              className="px-6 py-3.5 bg-white text-[#0067A1] rounded-xl font-bold text-sm hover:bg-slate-100 transition-all text-center"
            >
              Consult a Doctor
            </Link>
            <Link
              href="/website/services"
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl font-semibold text-sm transition-all text-center"
            >
              Explore Services
            </Link>
          </div>
        </div>

        {/* Footer Support Info */}
        <div className="mt-12 text-center text-xs text-gray-500 space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <FaShieldAlt className="text-emerald-600" /> Ayushman Bharat Digital Mission (ABDM) PHR & Data Privacy Compliant
          </p>
          <p>Support Hours: 9:00 AM – 9:00 PM (All Days) | Email: info@mediconnect.fit</p>
        </div>
      </div>
    </div>
  );
}
