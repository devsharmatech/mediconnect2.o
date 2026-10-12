"use client";

import React from "react";
import Link from "next/link";
import { FaClock, FaChevronRight, FaBookOpen } from "react-icons/fa";

export default function HealthLibrarySection() {
  const articles = [
    {
      title: "Understanding thyroid health",
      category: "Endocrinology",
      readTime: "5 min read",
      summary: "Key indicators, hormone balances, and daily lifestyle steps for maintaining optimal thyroid function.",
      link: "/website/health-library",
    },
    {
      title: "Managing blood pressure effectively",
      category: "Cardiology",
      readTime: "6 min read",
      summary: "Clinical insights on monitoring hypertension, sodium moderation, and cardiovascular wellness habits.",
      link: "/website/health-library",
    },
    {
      title: "Common respiratory allergies and care",
      category: "Pulmonology",
      readTime: "5 min read",
      summary: "Preventative precautions against seasonal triggers, air pollutants, and bronchial sensitivity.",
      link: "/website/health-library",
    },
    {
      title: "PCOS: Symptoms and management",
      category: "Gynaecology",
      readTime: "6 min read",
      summary: "A medically reviewed overview of hormonal health, dietary adjustments, and clinical care approaches.",
      link: "/website/health-library",
    },
  ];

  return (
    <section className="w-full bg-[#FFFFFF] py-10 sm:py-14 border-b border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
              Latest from Health Library
            </h2>
            <p className="text-xs sm:text-sm text-[#607580] mt-1.5 leading-relaxed">
              Expert articles, guides and resources for better health.
            </p>
          </div>
          <Link 
            href="/website/health-library" 
            className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#1677A8] hover:text-[#0B3A5B] transition-colors shrink-0"
          >
            <span>View all articles</span>
            <FaChevronRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {articles.map((art, idx) => (
            <Link
              key={idx}
              href={art.link}
              className="group flex flex-col justify-between p-5 rounded-2xl bg-[#FFFFFF] border border-[#DCE6EB] hover:border-[#1677A8]/50 hover:shadow-xs transition-all"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#607580] mb-3">
                  <span className="text-[#1677A8] bg-[#F7FAFC] px-2 py-0.5 rounded border border-[#DCE6EB]">
                    {art.category}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FaClock className="w-3 h-3 text-slate-400" />
                    {art.readTime}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#0B3A5B] mb-2 leading-snug group-hover:text-[#1677A8] transition-colors">
                  {art.title}
                </h3>
                <p className="text-xs text-[#607580] leading-relaxed line-clamp-3">
                  {art.summary}
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-[#DCE6EB]/60">
                <span className="inline-flex items-center text-xs font-bold text-[#1677A8] group-hover:text-[#0B3A5B] transition-colors">
                  Read Article &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
