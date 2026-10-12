"use client";

import React from "react";
import Link from "next/link";
import { FaHeartbeat, FaLungs, FaBookOpen, FaChevronRight } from "react-icons/fa";

export default function SpecializedProgramsStrip() {
  const programs = [
    {
      icon: FaHeartbeat,
      title: "CardioConnect",
      tagline: "Heart-health wellness.",
      description: "Consult cardiologists, get relevant tests and access personalised care.",
      cta: "Explore CardioConnect",
      link: "/cardio-connect",
      badgeColor: "bg-rose-50 text-rose-600 border-rose-200",
    },
    {
      icon: FaLungs,
      title: "LungConnect",
      tagline: "Respiratory wellness.",
      description: "Consult pulmonologists, access relevant tests and ongoing care.",
      cta: "Explore LungConnect",
      link: "/lung-connect",
      badgeColor: "bg-teal-50 text-teal-600 border-teal-200",
    },
    {
      icon: FaBookOpen,
      title: "Health Library",
      tagline: "Reliable health information for everyday living.",
      description: "Explore easy-to-understand articles, guides and resources on a range of health topics.",
      cta: "Explore Health Library",
      link: "/health-insights",
      badgeColor: "bg-blue-50 text-blue-600 border-blue-200",
    },
  ];

  return (
    <section className="w-full bg-[#FFFFFF] py-10 sm:py-14 border-b border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
            SPECIALIZED HEALTH PROGRAMS & RESOURCES
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
            Dedicated programs and trusted information for your health.
          </h2>
          <p className="text-xs sm:text-sm text-[#607580] mt-1.5 max-w-2xl leading-relaxed">
            Explore dedicated programs and trusted information for your heart, lungs and overall health.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {programs.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group flex flex-col justify-between p-6 rounded-2xl bg-white border border-[#DCE6EB] hover:border-[#1677A8]/50 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6 text-[#1677A8]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0B3A5B] mb-1 group-hover:text-[#1677A8] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs font-semibold text-[#18303D] mb-2">
                    {item.tagline}
                  </p>
                  <p className="text-xs text-[#607580] leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                <div>
                  <Link
                    href={item.link}
                    className="inline-flex items-center text-xs font-bold text-[#1677A8] group-hover:text-[#0B3A5B] transition-colors"
                  >
                    <span>{item.cta}</span>
                    <FaChevronRight className="w-3 h-3 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
