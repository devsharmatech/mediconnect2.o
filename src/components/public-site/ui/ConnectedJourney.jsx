"use client";

import React from "react";
import Link from "next/link";
import { 
  FaUserMd, 
  FaFlask, 
  FaPills, 
  FaSyncAlt, 
  FaQuestionCircle,
  FaChevronRight,
  FaIdBadge
} from "react-icons/fa";

export default function ConnectedJourney() {
  const steps = [
    {
      step: "01",
      title: "Understand",
      subtitle: "Your Health Concern",
      icon: FaQuestionCircle,
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
      icon: FaSyncAlt,
    },
  ];

  return (
    <section className="w-full bg-[#F7FAFC] py-10 sm:py-14 border-b border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          
          {/* Left Column (Section 7: 5-step flow) */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div className="text-center lg:text-left">
              <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
                ONE CONNECTED HEALTHCARE JOURNEY
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
                From a health concern to continuing care.
              </h2>
              <p className="text-xs sm:text-sm text-[#607580] mt-1.5 max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-6">
                MediConnect.fit connects every step of your healthcare journey, so your care stays coordinated, informed and continuous.
              </p>
            </div>

            {/* Steps Container */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
              {steps.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={idx}
                    className="relative flex flex-col items-center text-center p-3.5 rounded-xl bg-white border border-[#DCE6EB] hover:border-[#1677A8] transition-all shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#F7FAFC] border border-[#DCE6EB] text-[#1677A8] flex items-center justify-center mb-2.5">
                      <Icon className="w-4 h-4 text-[#1677A8]" />
                    </div>
                    <span className="text-[10px] font-bold text-[#1677A8] uppercase tracking-wider mb-0.5">
                      {item.step}
                    </span>
                    <h4 className="text-xs font-bold text-[#0B3A5B] leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-[#607580] leading-tight mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (Section 8: Your Care Episode) */}
          <div className="lg:col-span-4 flex flex-col justify-between p-6 rounded-2xl bg-white border border-[#DCE6EB] shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#1677A8]/10 text-[#1677A8]">
                  Care Episode
                </span>
                <span className="text-[11px] font-bold text-[#0B3A5B] bg-[#F7FAFC] px-2 py-0.5 rounded border border-[#DCE6EB]">
                  CE-2024-001568
                </span>
              </div>
              
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-bold text-[#0B3A5B] mb-2">
                  Your Care Episode
                </h3>
                <p className="text-xs text-[#607580] leading-relaxed mb-4 max-w-sm mx-auto sm:mx-0">
                  One connected healthcare journey. Your consultations, tests, medicines and follow-ups stay linked within the same care episode for better, more coordinated care.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB]/80 flex items-start gap-2.5">
                <FaIdBadge className="w-4 h-4 text-[#1677A8] shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-bold text-[#18303D]">Care Episode ID</div>
                  <div className="text-[10px] text-[#607580] leading-tight mt-0.5">
                    A unique identifier that helps keep your related care connected.
                  </div>
                </div>
              </div>

              <Link
                href="/website/about"
                className="inline-flex items-center text-xs font-bold text-[#1677A8] hover:text-[#0B3A5B] transition-colors"
              >
                <span>Learn More</span>
                <FaChevronRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
