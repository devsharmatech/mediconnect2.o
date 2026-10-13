"use client";

import React from "react";
import { FaApple, FaCheckCircle, FaUserMd, FaFlask, FaPills, FaFileMedical } from "react-icons/fa";

export default function AppShowcase() {
  const capabilities = [
    "Book consultations",
    "Order medicines",
    "View medical records",
    "Access all healthcare services",
  ];

  return (
    <section className="w-full bg-[#F7FAFC] py-12 sm:py-16 border-b border-[#DCE6EB] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner with restrained, professional rounded-2xl corners (avoiding oversized bubble curves) */}
        <div className="bg-[#0B3A5B] rounded-2xl p-7 sm:p-10 lg:p-12 text-white relative overflow-hidden shadow-lg border border-[#1677A8]/30">
          
          {/* Subtle medical ambient glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#1677A8]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#159A8A]/15 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="text-center lg:text-left">
                <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#E0F2F1] uppercase mb-2">
                  WEB & MOBILE ECOSYSTEM
                </p>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                  Healthcare, wherever you need it.
                </h2>
                <p className="text-sm sm:text-base text-slate-200 mt-2 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Available on web and mobile. Manage your entire care pathway from your pocket.
                </p>
              </div>

              {/* Capabilities checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {capabilities.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-center sm:justify-start gap-2.5">
                    <FaCheckCircle className="w-4 h-4 text-[#2FA36B] shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-slate-100">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* Authentic, Prominent Official Store Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-3">
                {/* App Store Official Badge */}
                <a
                  href="#app-store"
                  className="group inline-flex items-center gap-3.5 px-5 sm:px-6 py-3 rounded-xl bg-black border border-white/20 hover:border-white/40 hover:bg-slate-950 transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5"
                >
                  <FaApple className="w-7 h-7 text-white shrink-0 group-hover:scale-105 transition-transform" />
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider font-medium text-white/75 leading-tight">
                      Download on the
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                      App Store
                    </div>
                  </div>
                </a>

                {/* Google Play Official Themed Multi-Color Badge */}
                <a
                  href="#google-play"
                  className="group inline-flex items-center gap-3.5 px-5 sm:px-6 py-3 rounded-xl bg-black border border-white/20 hover:border-white/40 hover:bg-slate-950 transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5"
                >
                  <svg className="w-6 h-7 shrink-0 group-hover:scale-105 transition-transform" viewBox="0 0 48 48" fill="none">
                    <path d="M7.4 4.5C7.1 4.9 7 5.5 7 6.2v35.6c0 .7.1 1.3.4 1.7l.1.1 20-20v-.5L7.5 4.4l-.1.1z" fill="#00D2FF" />
                    <path d="M34 29.5l-6.5-6.5v-.5l6.5-6.5.1.1 7.7 4.4c2.2 1.2 2.2 3.3 0 4.5L34 29.5z" fill="#FFC800" />
                    <path d="M27.5 23l-20.1 20c.7.7 1.9.8 3.2.1l23.5-13.6-6.6-6.5z" fill="#FF334B" />
                    <path d="M27.5 22.5L34.1 16 10.6 2.4C9.3 1.7 8.1 1.8 7.4 2.5l20.1 20z" fill="#00E676" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider font-medium text-white/75 leading-tight">
                      GET IT ON
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                      Google Play
                    </div>
                  </div>
                </a>
              </div>
            </div>

            {/* Right Phone Mockup - Professional, Clean Device Frame */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[310px] rounded-2xl border-2 border-slate-600/50 bg-white p-3.5 shadow-2xl text-slate-900">
                {/* Speaker & Sensor Bar */}
                <div className="w-20 h-2 bg-slate-200 rounded-full mx-auto mb-3" />

                {/* Mobile app header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[#0B3A5B] tracking-tight">MediConnect</span>
                    <span className="text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-200/60 px-1.5 py-0.2 rounded">.fit</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                {/* Inside mobile screen navigation tiles */}
                <div className="space-y-2 pt-2.5">
                  <div className="p-2.5 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] flex items-center justify-between hover:border-[#1677A8]/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <FaUserMd className="w-3.5 h-3.5 text-[#1677A8]" />
                      <span className="text-[11px] font-bold text-[#0B3A5B]">Doctor Consultations</span>
                    </div>
                    <span className="text-[9px] font-semibold text-[#1677A8]">Book &rarr;</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] flex items-center justify-between hover:border-[#1677A8]/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <FaFlask className="w-3.5 h-3.5 text-[#1677A8]" />
                      <span className="text-[11px] font-bold text-[#0B3A5B]">Diagnostics & Labs</span>
                    </div>
                    <span className="text-[9px] font-semibold text-[#1677A8]">Order &rarr;</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] flex items-center justify-between hover:border-[#1677A8]/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <FaPills className="w-3.5 h-3.5 text-[#1677A8]" />
                      <span className="text-[11px] font-bold text-[#0B3A5B]">Medicine Pharmacy</span>
                    </div>
                    <span className="text-[9px] font-semibold text-[#1677A8]">Track &rarr;</span>
                  </div>

                  {/* MediConnect DigiLocker - Live Clinical Service */}
                  <div className="p-2.5 rounded-xl bg-[#0B3A5B] text-white flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <FaFileMedical className="w-3.5 h-3.5 text-teal-300" />
                      <span className="text-[11px] font-bold">MediConnect DigiLocker</span>
                    </div>
                    <span className="text-[9px] font-bold text-teal-300 bg-teal-900/60 border border-teal-500/30 px-1.5 py-0.2 rounded-full">Live</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
