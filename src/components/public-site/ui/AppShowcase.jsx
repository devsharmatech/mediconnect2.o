"use client";

import React from "react";
import { FaApple, FaGooglePlay, FaCheckCircle, FaUserMd, FaFlask, FaPills, FaFileMedical } from "react-icons/fa";

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
        <div className="bg-[#0B3A5B] rounded-3xl p-8 sm:p-12 lg:p-14 text-white relative overflow-hidden shadow-xl">
          
          {/* Subtle geometric background shapes */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#1677A8]/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#159A8A]/15 blur-2xl pointer-events-none" />

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
                <p className="text-sm sm:text-base text-slate-200 mt-2 max-w-xl mx-auto lg:mx-0">
                  Available on web and mobile. Manage your entire care pathway from your pocket.
                </p>
              </div>

              {/* Capabilities checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {capabilities.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-center sm:justify-start gap-2.5">
                    <FaCheckCircle className="w-4 h-4 text-[#2FA36B] shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-slate-100">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* App Store / Google Play Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-4">
                <a
                  href="#app-store"
                  className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white text-[#0B3A5B] hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <FaApple className="w-6 h-6 shrink-0" />
                  <div className="text-left">
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Download on the</div>
                    <div className="text-xs font-bold leading-none">App Store</div>
                  </div>
                </a>

                <a
                  href="#google-play"
                  className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white text-[#0B3A5B] hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <FaGooglePlay className="w-5 h-5 text-[#1677A8] shrink-0" />
                  <div className="text-left">
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">GET IT ON</div>
                    <div className="text-xs font-bold leading-none">Google Play</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Right Phone Mockup Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[320px] rounded-[32px] border-4 border-slate-700 bg-white p-3.5 shadow-2xl text-slate-900">
                {/* Speaker pill */}
                <div className="w-20 h-3.5 bg-slate-200 rounded-full mx-auto mb-3" />

                {/* Mobile app header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-[#0B3A5B]">MediConnect</span>
                    <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-1 py-0.2 rounded">.fit</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>

                {/* Inside mobile screen elements */}
                <div className="space-y-2.5 pt-3">
                  <div className="p-2.5 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaUserMd className="w-3.5 h-3.5 text-[#1677A8]" />
                      <span className="text-[11px] font-bold text-[#0B3A5B]">Doctor Consultations</span>
                    </div>
                    <span className="text-[9px] font-semibold text-[#1677A8]">Book &rarr;</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaFlask className="w-3.5 h-3.5 text-[#1677A8]" />
                      <span className="text-[11px] font-bold text-[#0B3A5B]">Diagnostics & Labs</span>
                    </div>
                    <span className="text-[9px] font-semibold text-[#1677A8]">Order &rarr;</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaPills className="w-3.5 h-3.5 text-[#1677A8]" />
                      <span className="text-[11px] font-bold text-[#0B3A5B]">Medicine Pharmacy</span>
                    </div>
                    <span className="text-[9px] font-semibold text-[#1677A8]">Track &rarr;</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0B3A5B] text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaFileMedical className="w-3.5 h-3.5 text-teal-300" />
                      <span className="text-[11px] font-bold">MediConnect DigiLocker</span>
                    </div>
                    <span className="text-[9px] font-bold text-teal-300">Live</span>
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
