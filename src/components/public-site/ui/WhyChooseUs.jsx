"use client";

import React from "react";
import { 
  FaUserMd, 
  FaShieldAlt, 
  FaCalendarCheck, 
  FaLock, 
  FaFolderOpen, 
  FaHandsHelping,
  FaCheckCircle 
} from "react-icons/fa";

export default function WhyChooseUs() {
  const pillars = [
    {
      title: "Doctor-led healthcare services",
      desc: "Clinical consultations and decisions guided strictly by verified medical professionals.",
      icon: FaUserMd,
    },
    {
      title: "Access to trusted and verified providers",
      desc: "Pre-screened clinicians, NABL-accredited diagnostic labs, and licensed pharmacies.",
      icon: FaShieldAlt,
    },
    {
      title: "Convenient online and in-person options",
      desc: "Flexible teleconsultations via video or scheduled in-clinic visits based on patient comfort.",
      icon: FaCalendarCheck,
    },
    {
      title: "Secure and private platform",
      desc: "End-to-end data protection aligned with Indian healthcare data regulations.",
      icon: FaLock,
    },
    {
      title: "Your health information in one place",
      desc: "Seamless storage and access for prescriptions, diagnostic reports, and medical history.",
      icon: FaFolderOpen,
    },
    {
      title: "Ongoing support for your healthcare journey",
      desc: "Coordinated care follow-ups, medication reminders, and multi-channel assistance.",
      icon: FaHandsHelping,
    },
  ];

  return (
    <section className="w-full bg-[#F7FAFC] py-10 sm:py-14 border-b border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
            WHY MEDICONNECT.FIT
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
            Why choose MediConnect.fit?
          </h2>
          <p className="text-xs sm:text-sm text-[#607580] mt-1.5 leading-relaxed">
            Built from the ground up to deliver transparent, doctor-led healthcare continuity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-[#DCE6EB] hover:border-[#1677A8]/40 hover:shadow-xs transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] text-[#1677A8] flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-[#1677A8]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B3A5B] mb-1 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#607580] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
