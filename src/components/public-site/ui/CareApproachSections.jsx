"use client";

import React from "react";
import Link from "next/link";
import { FaCheckCircle, FaChevronRight, FaShieldAlt, FaFileMedical, FaUserMd, FaHospital } from "react-icons/fa";

export default function CareApproachSections({ pageBlocks = {}, isLoadingBlocks = false }) {
  return (
    <div className="w-full">
      {/* 1. SUPPORTIVE TOOLS & ABHA INTEGRATION */}
      <section className="w-full bg-[#F7FAFC] py-10 sm:py-14 border-b border-[#DCE6EB]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Tools Block */}
            <div className="rounded-2xl border border-[#DCE6EB] bg-white p-6 sm:p-8 flex flex-col justify-between shadow-2xs">
              <div className="text-center sm:text-left">
                <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
                  TOOLS THAT SUPPORT DOCTOR CONSULTATIONS
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0B3A5B] mb-2 tracking-tight">
                  Helpful tools around your care
                </h3>
                <p className="text-xs sm:text-sm text-[#607580] leading-relaxed mb-6 max-w-md mx-auto sm:mx-0">
                  These tools support care. They do not replace doctor consultations or professional medical advice.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
                  <Link 
                    href="/website/coming-soon" 
                    className="p-4 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] hover:border-[#1677A8] hover:bg-white transition-all group block"
                  >
                    <p className="text-xs font-bold text-[#1677A8] uppercase tracking-wide mb-1">
                      Guided Symptom Check
                    </p>
                    <p className="text-xs text-[#607580] leading-relaxed">
                      Helps you explain your concern before consulting a doctor.
                    </p>
                    <span className="text-[11px] font-bold text-[#1677A8] mt-3 inline-flex items-center group-hover:translate-x-0.5 transition-transform">
                      Learn more &rarr;
                    </span>
                  </Link>

                  <Link 
                    href="/website/coming-soon" 
                    className="p-4 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] hover:border-[#1677A8] hover:bg-white transition-all group block"
                  >
                    <p className="text-xs font-bold text-[#1677A8] uppercase tracking-wide mb-1">
                      Health Insights
                    </p>
                    <p className="text-xs text-[#607580] leading-relaxed">
                      Simple summaries to support doctor-led decisions.
                    </p>
                    <span className="text-[11px] font-bold text-[#1677A8] mt-3 inline-flex items-center group-hover:translate-x-0.5 transition-transform">
                      Learn more &rarr;
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* ABHA Creation Block */}
            <div className="relative rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-6 sm:p-8 flex flex-col justify-between shadow-2xs">
              <div className="absolute top-4 right-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Coming Soon
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[11px] sm:text-xs font-bold tracking-widest text-emerald-800 uppercase mb-1.5">
                  NATIONAL HEALTH AUTHORITY
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0B3A5B] mb-2 tracking-tight">
                  Create Your ABHA Account
                </h3>
                <p className="text-xs sm:text-sm text-[#607580] leading-relaxed max-w-md mx-auto sm:mx-0">
                  Join India&apos;s digital health ecosystem. Create your Ayushman Bharat Health Account (ABHA) to securely store and share your health records.
                </p>
              </div>
              <div className="mt-6 flex justify-center sm:justify-start">
                <Link 
                  href="/coming-soon" 
                  className="inline-flex items-center justify-center px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl text-white bg-[#0B3A5B] hover:bg-[#1677A8] transition-colors shadow-xs"
                >
                  Coming Soon &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CALM BANNER BREAK */}
      <section className="bg-white border-b border-[#DCE6EB] py-8 sm:py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-base sm:text-lg lg:text-xl font-semibold text-[#0B3A5B] leading-relaxed italic">
            &ldquo;Healthcare decisions feel easier when you&apos;re guided, not rushed.&rdquo;
          </p>
        </div>
      </section>

      {/* 3. CONNECTED CARE ECOSYSTEM (Image Right, Text Left) */}
      <section className="w-full bg-[#FFFFFF] py-10 sm:py-14 border-b border-[#DCE6EB]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Text */}
            <div className="space-y-4 text-center lg:text-left">
              <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
                {pageBlocks["home_connected_care"]?.eyebrow || "CONNECTED CARE ECOSYSTEM"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight leading-tight">
                {pageBlocks["home_connected_care"]?.title || "Care That Works Together"}
              </h2>
              {pageBlocks["home_connected_care"]?.content ? (
                <div 
                  className="text-xs sm:text-sm text-[#607580] leading-relaxed [&_p]:mb-3 max-w-xl mx-auto lg:mx-0" 
                  dangerouslySetInnerHTML={{ __html: pageBlocks["home_connected_care"].content.replace(/&nbsp;/g, ' ') }} 
                />
              ) : (
                <div className="space-y-3 text-xs sm:text-sm text-[#607580] leading-relaxed max-w-xl mx-auto lg:mx-0">
                  <p>
                    MediConnect.fit connects medical consultations with essential healthcare services, helping ensure that care remains context-aware and coordinated.
                  </p>
                  <p>
                    Some services are available directly, while others are offered with appropriate medical context to support safe and meaningful use.
                  </p>
                </div>
              )}
            </div>

            {/* Image */}
            <div className="w-full overflow-hidden rounded-2xl border border-[#DCE6EB] shadow-xs">
              <img
                src={pageBlocks["home_connected_care"]?.image || "/p3.png"}
                alt="Connected care across services"
                className="w-full h-64 sm:h-80 lg:h-96 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW MEDICONNECT.FIT APPROACHES CARE (Image Left, Text Right) */}
      <section className="w-full bg-[#F7FAFC] py-10 sm:py-14 border-b border-[#DCE6EB]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Image */}
            <div className="order-2 lg:order-1 w-full overflow-hidden rounded-2xl border border-[#DCE6EB] shadow-xs">
              <img
                src={pageBlocks["home_care_approaches"]?.image || "/p4.png"}
                alt="Designed around medical responsibility"
                className="w-full h-64 sm:h-80 lg:h-96 object-cover"
              />
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2 space-y-4 text-center lg:text-left">
              <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
                {pageBlocks["home_care_approaches"]?.eyebrow || "HOW MEDICONNECT.FIT APPROACHES CARE"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight leading-tight">
                {pageBlocks["home_care_approaches"]?.title || "Designed Around Medical Responsibility"}
              </h2>
              {pageBlocks["home_care_approaches"]?.content ? (
                <div 
                  className="text-xs sm:text-sm text-[#607580] leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 max-w-xl mx-auto lg:mx-0 text-left" 
                  dangerouslySetInnerHTML={{ __html: pageBlocks["home_care_approaches"].content.replace(/&nbsp;/g, ' ') }} 
                />
              ) : (
                <div className="space-y-3 text-xs sm:text-sm text-[#607580] leading-relaxed max-w-xl mx-auto lg:mx-0 text-left">
                  <p>MediConnect.fit is built to support:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="w-3.5 h-3.5 text-[#1677A8] shrink-0" />
                      <span>Clear communication between patients and doctors</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="w-3.5 h-3.5 text-[#1677A8] shrink-0" />
                      <span>Thoughtful use of diagnostics and services</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="w-3.5 h-3.5 text-[#1677A8] shrink-0" />
                      <span>Continuity across consultations and care services</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="w-3.5 h-3.5 text-[#1677A8] shrink-0" />
                      <span>Transparency in how care pathways evolve</span>
                    </li>
                  </ul>
                  <p className="pt-2">
                    The platform helps patients understand options and plan next steps, while respecting that medical decisions are personal and individual.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. HEALTH RECORDS & PRIVACY (Text Left, Image Right) */}
      <section className="w-full bg-[#FFFFFF] py-10 sm:py-14 border-b border-[#DCE6EB]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Text */}
            <div className="space-y-4 text-center lg:text-left">
              <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
                {pageBlocks["home_privacy"]?.eyebrow || "HEALTH RECORDS & PRIVACY"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight leading-tight">
                {pageBlocks["home_privacy"]?.title || "Your Health Information, Securely Managed"}
              </h2>
              {pageBlocks["home_privacy"]?.content ? (
                <div 
                  className="text-xs sm:text-sm text-[#607580] leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 max-w-xl mx-auto lg:mx-0 text-left" 
                  dangerouslySetInnerHTML={{ __html: pageBlocks["home_privacy"].content.replace(/&nbsp;/g, ' ') }} 
                />
              ) : (
                <div className="space-y-3 text-xs sm:text-sm text-[#607580] leading-relaxed max-w-xl mx-auto lg:mx-0 text-left">
                  <p>
                    MediConnect.fit supports India&apos;s digital health ecosystem through optional ABHA integration.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="w-3.5 h-3.5 text-[#1677A8] shrink-0" />
                      <span>Create or link your ABHA ID</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="w-3.5 h-3.5 text-[#1677A8] shrink-0" />
                      <span>Store health records securely</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="w-3.5 h-3.5 text-[#1677A8] shrink-0" />
                      <span>Control access to your information</span>
                    </li>
                  </ul>
                  <p className="pt-2">
                    Your health data is handled responsibly, in line with Indian healthcare and data protection regulations.
                  </p>
                </div>
              )}
            </div>

            {/* Image */}
            <div className="w-full overflow-hidden rounded-2xl border border-[#DCE6EB] shadow-xs">
              <img
                src={pageBlocks["home_privacy"]?.image || "/p5.png"}
                alt="Secure health records & ABHA card"
                className="w-full h-64 sm:h-80 lg:h-96 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOW MEDICONNECT.FIT GROWS OVER TIME (Dark Navy 3-Layer Cards) */}
      <section className="w-full bg-[#0B3A5B] py-12 sm:py-16 text-white border-b border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#E0F2F1] uppercase mb-2">
              {pageBlocks["home_roadmap_header"]?.eyebrow || "HOW MEDICONNECT.FIT GROWS OVER TIME"}
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-3">
              {pageBlocks["home_roadmap_header"]?.title || "Everyday care today, guided support tomorrow"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
              The platform starts with practical medical services, adds doctor-guided support carefully, and leaves room for a connected network in future.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Layer 1 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-amber-400/50 backdrop-blur-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-amber-300 uppercase block mb-1">
                  LAYER 1 — LIVE TODAY
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                  Everyday medical care (Available now)
                </h3>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  Doctor consultations, lab tests, medicines and health records — organised for clarity.
                </p>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Online & clinic consultations</li>
                  <li>Lab tests with digital reports</li>
                  <li>Digital health records & ABHA support</li>
                </ul>
              </div>
            </div>

            {/* Layer 2 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-[#1677A8]/60 backdrop-blur-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-cyan-300 uppercase block mb-1">
                  LAYER 2 — COMING SOON
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                  Coming Soon: Guided Care
                </h3>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  Thoughtful, doctor-led support when it matters most.
                </p>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Second opinions</li>
                  <li>Care coordination for chronic conditions</li>
                  <li>Pre-hospitalization / surgery consults</li>
                </ul>
              </div>
            </div>

            {/* Layer 3 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-[#1677A8]/60 backdrop-blur-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-teal-300 uppercase block mb-1">
                  LAYER 3 — FUTURE
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                  Connected healthcare network
                </h3>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  In future, mediConnect.fit may connect hospitals and health partners — with clear medical boundaries.
                </p>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Integrated healthcare ecosystem</li>
                  <li>Cross-hospital care coordination</li>
                  <li>Unified patient history federation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
