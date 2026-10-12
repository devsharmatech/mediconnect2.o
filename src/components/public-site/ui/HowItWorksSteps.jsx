"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  FaFilter,
  FaUserMd,
  FaCalendarCheck,
  FaArrowRight,
  FaArrowDown,
} from "react-icons/fa";

/**
 * Robust Native Lottie-web player
 * Directly mounts SVG inside container ref without React 19 forwardRef incompatibilities.
 */
function LottieStepIcon({ animationPath, fallbackIcon: FallbackIcon, className = "w-20 h-20 sm:w-24 sm:h-24" }) {
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let anim = null;
    let isCancelled = false;

    // Parallel fetch of lottie-web library and animation JSON
    Promise.all([
      import("lottie-web"),
      fetch(animationPath).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    ])
      .then(([lottieModule, animationData]) => {
        if (isCancelled || !containerRef.current) return;
        const lottie = lottieModule.default || lottieModule;

        try {
          // Clear any previous children in container
          containerRef.current.innerHTML = "";

          anim = lottie.loadAnimation({
            container: containerRef.current,
            renderer: "svg",
            loop: true,
            autoplay: true,
            animationData: animationData,
          });

          // Once DOM elements are rendered
          anim.addEventListener("DOMLoaded", () => {
            if (!isCancelled) setIsReady(true);
          });

          // Fallback timer ensures visibility even if DOMLoaded event fires before listener
          setTimeout(() => {
            if (!isCancelled) setIsReady(true);
          }, 200);
        } catch (err) {
          console.warn(`Lottie render failed for ${animationPath}:`, err);
          if (!isCancelled) setHasError(true);
        }
      })
      .catch((err) => {
        console.warn(`Failed to initialize Lottie for ${animationPath}:`, err);
        if (!isCancelled) setHasError(true);
      });

    return () => {
      isCancelled = true;
      if (anim) {
        try {
          anim.destroy();
        } catch (e) {}
      }
    };
  }, [animationPath]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      {/* Fallback Icon while loading or on error */}
      {(!isReady || hasError) && (
        <div className="absolute inset-0 flex items-center justify-center text-[#1677A8]">
          <FallbackIcon className="w-10 h-10 sm:w-12 sm:h-12 text-[#1677A8] animate-pulse" />
        </div>
      )}

      {/* Lottie SVG Container */}
      <div
        ref={containerRef}
        className={`w-full h-full flex items-center justify-center transition-opacity duration-300 pointer-events-none [&_svg]:w-full [&_svg]:h-full [&_svg]:max-h-full ${
          isReady && !hasError ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export default function HowItWorksSteps({ className = "" }) {
  const router = useRouter();
  const pathname = usePathname();
  const isDoctorsPage = pathname?.includes("/doctors");

  const handleStep1Click = () => {
    if (isDoctorsPage) {
      const el = document.getElementById("specialty-filter") || document.getElementById("doctors-list");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      const consultationEl = document.getElementById("book-consultation");
      if (consultationEl) {
        consultationEl.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push("/doctors#doctors-list");
      }
    }
  };

  const handleStep2Click = () => {
    if (isDoctorsPage) {
      const el = document.getElementById("doctors-list");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/doctors#doctors-list");
    }
  };

  const handleStep3Click = () => {
    if (isDoctorsPage) {
      const el = document.getElementById("doctors-list");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/doctors#doctors-list");
    }
  };

  return (
    <section id="how-it-works" className={`w-full bg-[#F7FAFC] py-12 sm:py-16 border-t border-b border-[#DCE6EB] scroll-mt-16 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
            SIMPLE &amp; COORDINATED PROCESS
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
            How It Works
          </h2>
          <p className="text-xs sm:text-sm text-[#607580] mt-1.5 leading-relaxed">
            Get started with verified doctor consultations in 3 simple connected steps
          </p>
        </div>

        {/* Visual Step Progress Tracker (Desktop & Mobile) */}
        <div className="max-w-md sm:max-w-xl mx-auto mb-8 sm:mb-10 px-4">
          <div className="relative flex items-center justify-between">
            {/* Horizontal Connecting Guide Line */}
            <div className="absolute top-4 left-8 right-8 h-0.5 bg-[#DCE6EB] -z-0" />

            {/* Step 1 Node */}
            <div className="flex flex-col items-center relative z-10 group cursor-pointer" onClick={handleStep1Click}>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1677A8] text-white text-xs font-bold flex items-center justify-center shadow-xs ring-4 ring-[#F7FAFC] group-hover:scale-105 transition-transform">
                01
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#0B3A5B] mt-1.5 whitespace-nowrap">
                Specialty
              </span>
            </div>

            {/* Step 2 Node */}
            <div className="flex flex-col items-center relative z-10 group cursor-pointer" onClick={handleStep2Click}>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1677A8] text-white text-xs font-bold flex items-center justify-center shadow-xs ring-4 ring-[#F7FAFC] group-hover:scale-105 transition-transform">
                02
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#0B3A5B] mt-1.5 whitespace-nowrap">
                Doctor
              </span>
            </div>

            {/* Step 3 Node */}
            <div className="flex flex-col items-center relative z-10 group cursor-pointer" onClick={handleStep3Click}>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1677A8] text-white text-xs font-bold flex items-center justify-center shadow-xs ring-4 ring-[#F7FAFC] group-hover:scale-105 transition-transform">
                03
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#0B3A5B] mt-1.5 whitespace-nowrap">
                Book Slot
              </span>
            </div>
          </div>
        </div>

        {/* 3 Balanced Step Cards */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 lg:gap-6 items-stretch relative">

            {/* ================= STEP 01 ================= */}
            <div className="relative flex flex-col items-center justify-between text-center p-6 sm:p-8 rounded-2xl bg-white border border-[#DCE6EB] hover:border-[#1677A8] transition-all duration-300 shadow-2xs hover:shadow-lg group">
              <div className="flex flex-col items-center w-full">
                <span className="text-[11px] font-extrabold text-[#1677A8] bg-[#F7FAFC] border border-[#DCE6EB] px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-4">
                  Step 01
                </span>

                {/* Big Animated Lottie Icon */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#F7FAFC] border border-[#DCE6EB] group-hover:border-[#1677A8]/40 group-hover:scale-105 flex items-center justify-center mb-5 transition-all duration-300 shadow-2xs overflow-hidden p-2">
                  <LottieStepIcon
                    animationPath="/animations/how-it-works/step1-specialty.json"
                    fallbackIcon={FaFilter}
                    className="w-20 h-20 sm:w-24 sm:h-24"
                  />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#0B3A5B] mb-2 leading-snug group-hover:text-[#1677A8] transition-colors">
                  Choose Doctor Specialty
                </h3>
                <p className="text-xs sm:text-sm text-[#607580] leading-relaxed mb-6">
                  Select the clinical specialty aligned with your health concern or symptoms.
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleStep1Click}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#1677A8] hover:text-[#0B3A5B] bg-[#F7FAFC] hover:bg-sky-50 border border-[#DCE6EB] hover:border-[#1677A8] px-4 py-2 rounded-lg transition-all w-full max-w-[200px]"
              >
                <span>Select Specialty</span>
                <FaArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Desktop Connected Arrow to Step 2 */}
              <div className="hidden md:flex absolute top-1/2 -right-3.5 lg:-right-4.5 -translate-y-1/2 z-20 w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-white border-2 border-[#DCE6EB] text-[#1677A8] items-center justify-center shadow-sm group-hover:border-[#1677A8] group-hover:scale-105 transition-all">
                <FaArrowRight className="w-3 h-3 text-[#1677A8]" />
              </div>
            </div>

            {/* Mobile Vertical Connector between Step 1 and Step 2 */}
            <div className="flex md:hidden items-center justify-center -my-2.5 z-10">
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3 bg-[#1677A8]/30" />
                <div className="w-7 h-7 rounded-full bg-white border border-[#DCE6EB] text-[#1677A8] flex items-center justify-center shadow-xs">
                  <FaArrowDown className="w-2.5 h-2.5 text-[#1677A8]" />
                </div>
                <div className="w-0.5 h-3 bg-[#1677A8]/30" />
              </div>
            </div>

            {/* ================= STEP 02 ================= */}
            <div className="relative flex flex-col items-center justify-between text-center p-6 sm:p-8 rounded-2xl bg-white border border-[#DCE6EB] hover:border-[#1677A8] transition-all duration-300 shadow-2xs hover:shadow-lg group">
              <div className="flex flex-col items-center w-full">
                <span className="text-[11px] font-extrabold text-[#1677A8] bg-[#F7FAFC] border border-[#DCE6EB] px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-4">
                  Step 02
                </span>

                {/* Big Animated Lottie Icon */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#F7FAFC] border border-[#DCE6EB] group-hover:border-[#1677A8]/40 group-hover:scale-105 flex items-center justify-center mb-5 transition-all duration-300 shadow-2xs overflow-hidden p-2">
                  <LottieStepIcon
                    animationPath="/animations/how-it-works/step2-doctor.json"
                    fallbackIcon={FaUserMd}
                    className="w-20 h-20 sm:w-24 sm:h-24"
                  />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#0B3A5B] mb-2 leading-snug group-hover:text-[#1677A8] transition-colors">
                  Choose Your Doctor
                </h3>
                <p className="text-xs sm:text-sm text-[#607580] leading-relaxed mb-6">
                  Browse verified specialists, review clinical experience, and patient ratings.
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleStep2Click}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#1677A8] hover:text-[#0B3A5B] bg-[#F7FAFC] hover:bg-sky-50 border border-[#DCE6EB] hover:border-[#1677A8] px-4 py-2 rounded-lg transition-all w-full max-w-[200px]"
              >
                <span>View Doctors</span>
                <FaArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Desktop Connected Arrow to Step 3 */}
              <div className="hidden md:flex absolute top-1/2 -right-3.5 lg:-right-4.5 -translate-y-1/2 z-20 w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-white border-2 border-[#DCE6EB] text-[#1677A8] items-center justify-center shadow-sm group-hover:border-[#1677A8] group-hover:scale-105 transition-all">
                <FaArrowRight className="w-3 h-3 text-[#1677A8]" />
              </div>
            </div>

            {/* Mobile Vertical Connector between Step 2 and Step 3 */}
            <div className="flex md:hidden items-center justify-center -my-2.5 z-10">
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3 bg-[#1677A8]/30" />
                <div className="w-7 h-7 rounded-full bg-white border border-[#DCE6EB] text-[#1677A8] flex items-center justify-center shadow-xs">
                  <FaArrowDown className="w-2.5 h-2.5 text-[#1677A8]" />
                </div>
                <div className="w-0.5 h-3 bg-[#1677A8]/30" />
              </div>
            </div>

            {/* ================= STEP 03 ================= */}
            <div className="relative flex flex-col items-center justify-between text-center p-6 sm:p-8 rounded-2xl bg-white border border-[#DCE6EB] hover:border-[#1677A8] transition-all duration-300 shadow-2xs hover:shadow-lg group">
              <div className="flex flex-col items-center w-full">
                <span className="text-[11px] font-extrabold text-[#1677A8] bg-[#F7FAFC] border border-[#DCE6EB] px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-4">
                  Step 03
                </span>

                {/* Big Animated Lottie Icon */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#F7FAFC] border border-[#DCE6EB] group-hover:border-[#1677A8]/40 group-hover:scale-105 flex items-center justify-center mb-5 transition-all duration-300 shadow-2xs overflow-hidden p-2">
                  <LottieStepIcon
                    animationPath="/animations/how-it-works/step3-booking.json"
                    fallbackIcon={FaCalendarCheck}
                    className="w-20 h-20 sm:w-24 sm:h-24"
                  />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#0B3A5B] mb-2 leading-snug group-hover:text-[#1677A8] transition-colors">
                  Choose Time &amp; Book
                </h3>
                <p className="text-xs sm:text-sm text-[#607580] leading-relaxed mb-6">
                  Pick a convenient slot and confirm your video or clinic consultation instantly.
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleStep3Click}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#1677A8] hover:bg-[#0B3A5B] border border-[#1677A8] px-4 py-2 rounded-lg transition-all w-full max-w-[200px] shadow-2xs"
              >
                <span>Book Slot</span>
                <FaArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
