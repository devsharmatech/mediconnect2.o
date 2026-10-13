"use client";

import React from "react";
import Link from "next/link";
import { 
  FaUserMd, 
  FaFlask, 
  FaPills, 
  FaNotesMedical,
  FaHandHoldingHeart,
  FaChevronRight,
  FaIdCard
} from "react-icons/fa";

export default function ConnectedJourney() {
  const steps = [
    {
      step: "01",
      title: "Understand",
      subtitle: "Your Health Concern",
      icon: FaNotesMedical,
    },
    {
      step: "02",
      title: "Consult",
      subtitle: "with the Right Doctor",
      icon: FaUserMd,
    },
    {
      step: "03",
      title: "Investigate",
      subtitle: "with Diagnostics",
      icon: FaFlask,
    },
    {
      step: "04",
      title: "Treat",
      subtitle: "with Medicines / Care",
      icon: FaPills,
    },
    {
      step: "05",
      title: "Continue Care",
      subtitle: "with Follow-up & Records",
      icon: FaHandHoldingHeart,
    },
  ];

  return (
    <section className="w-full bg-[#F7FAFC] py-12 sm:py-16 border-b border-[#DCE6EB] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          
          {/* Left Column (Section 7: 5-step flow) */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div className="text-center lg:text-left mb-6 sm:mb-8">
              <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
                ONE CONNECTED HEALTHCARE JOURNEY
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0B3A5B] tracking-tight leading-tight">
                From a health concern to continuing care.
              </h2>
              <p className="text-xs sm:text-sm text-[#607580] mt-2 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                MediConnect.fit connects every step of your healthcare journey, so your care stays coordinated, informed and continuous.
              </p>
            </div>

            {/* Responsive 5-Step Connected Flow Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-3.5">
              {steps.map((item, idx) => {
                const Icon = item.icon;
                const isLastOnMobileOdd = idx === 4;

                return (
                  <div 
                    key={idx}
                    className={`group relative flex flex-col items-center text-center p-4 sm:p-4.5 rounded-2xl bg-white border border-[#DCE6EB] hover:border-[#1677A8] hover:shadow-md hover:-translate-y-1 transition-all duration-200 select-none ${
                      isLastOnMobileOdd ? "col-span-2 sm:col-span-1" : ""
                    }`}
                  >
                    {/* Step Number Tag */}
                    <span className="text-[10px] font-bold text-[#1677A8] bg-[#E8F2F7] px-2.5 py-0.5 rounded-full mb-3 tracking-wide">
                      {item.step}
                    </span>

                    {/* Dedicated Medical Icon Container */}
                    <div className="w-12 h-12 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] text-[#1677A8] flex items-center justify-center mb-3 group-hover:bg-[#EBF5FA] group-hover:border-[#1677A8]/40 group-hover:scale-108 transition-all duration-200">
                      <Icon className="w-5 h-5 text-[#1677A8]" />
                    </div>

                    {/* Step Title */}
                    <h4 className="text-xs sm:text-sm font-bold text-[#0B3A5B] mb-1 group-hover:text-[#1677A8] transition-colors leading-snug">
                      {item.title}
                    </h4>

                    {/* Step Subtitle */}
                    <p className="text-[10px] sm:text-[11px] text-[#607580] leading-tight">
                      {item.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (Section 8: Your Care Episode with Theme Background) */}
          <div className="lg:col-span-4 flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-[#0B3A5B] text-white border border-[#1677A8]/30 shadow-lg relative overflow-hidden group">
            {/* Subtle Medical Ambient Radial Glow */}
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#1677A8]/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#159A8A]/15 blur-2xl pointer-events-none" />

            <div className="relative z-10">
              {/* Top Badge Row */}
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-[#1677A8]/40 text-teal-300 border border-teal-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-pulse" />
                  Care Episode
                </span>
                <span className="text-[11px] font-mono font-bold text-teal-200 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15 shadow-2xs">
                  CE-2024-001568
                </span>
              </div>
              
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
                  Your Care Episode
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed mb-5">
                  One connected healthcare journey. Your consultations, tests, medicines and follow-ups stay linked within the same care episode for better, more coordinated care.
                </p>
              </div>

              {/* Structured Care Episode ID Box */}
              <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs flex items-start gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-teal-400/20 text-teal-300 border border-teal-300/30 flex items-center justify-center shrink-0 mt-0.5">
                  <FaIdCard className="w-4 h-4 text-teal-300" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white tracking-wide">
                    Care Episode ID
                  </div>
                  <div className="text-[11px] text-slate-300 leading-tight mt-0.5">
                    A unique identifier that keeps your consultations, labs & prescriptions coordinated.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action CTA */}
            <div className="pt-3 border-t border-white/15 relative z-10">
              <Link
                href="/about"
                className="w-full inline-flex items-center justify-between py-2.5 px-4 rounded-xl bg-white text-[#0B3A5B] hover:bg-slate-100 font-bold text-xs transition-all shadow-sm group/btn"
              >
                <span>Learn More</span>
                <FaChevronRight className="w-2.5 h-2.5 text-[#1677A8] group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
