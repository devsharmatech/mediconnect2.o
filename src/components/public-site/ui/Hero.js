'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaUserMd, 
  FaShieldAlt, 
  FaLock, 
  FaHeart 
} from 'react-icons/fa';

const heroImagesFallback = [
  {
    src: '/consult-1.jpg',
    alt: 'Indian doctor consulting a patient in clinic',
  },
  {
    src: '/consult-2.jpg',
    alt: 'Two Indian doctors discussing a case',
  },
  {
    src: '/consult-3.jpg',
    alt: 'Indian family speaking with a doctor online',
  },
];

export default function Hero({ onLoginClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cmsData, setCmsData] = useState(null);
  const [images, setImages] = useState(heroImagesFallback);

  useEffect(() => {
    async function fetchHome() {
      try {
        const res = await fetch("/api/cms/homepage");
        const json = await res.json();
        if (json.success && json.data) {
          setCmsData(json.data);
          const loadedImages = [];
          if (json.data.hero_image) loadedImages.push({ src: json.data.hero_image, alt: 'Hero CMS Image 1' });
          if (json.data.hero_image2) loadedImages.push({ src: json.data.hero_image2, alt: 'Hero CMS Image 2' });
          if (json.data.hero_image3) loadedImages.push({ src: json.data.hero_image3, alt: 'Hero CMS Image 3' });
          if (json.data.hero_image4) loadedImages.push({ src: json.data.hero_image4, alt: 'Hero CMS Image 4' });
          if (loadedImages.length > 0) {
            setImages(loadedImages);
          }
        }
      } catch (e) {
        console.error("Failed to load hero CMS data", e);
      }
    }
    fetchHome();
  }, []);

  // Auto-play slider
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const headline = cmsData?.headline || "Online Doctor Consultation in India";
  const subheadline = cmsData?.subheadline || "Consult verified doctors online through video consultations, prescriptions, lab coordination, and follow-ups — delivered responsibly and in line with medical guidelines.";

  const primaryText = cmsData?.primary_button_text 
    ? (cmsData.primary_button_text.toLowerCase().includes("book a consultation") ? "Book Consultation" : cmsData.primary_button_text)
    : "Book Consultation";
  const secondaryText = cmsData?.secondary_button_text || "How It Works";

  const microTrust = [
    { label: "Doctor-led Care", icon: FaUserMd },
    { label: "Verified Specialists", icon: FaShieldAlt },
    { label: "100% Private & Secure", icon: FaLock },
    { label: "Patient-First Support", icon: FaHeart },
  ];

  // Helper to split headline into balanced two lines
  const renderTwoLineHeadline = (text) => {
    if (!text) return "Online Doctor Consultation in India";

    // 1. If explicit newline is present
    if (text.includes("\n")) {
      const lines = text.split("\n");
      return (
        <>
          <span>{lines[0]}</span>
          <span className="block mt-1 sm:mt-1.5">{lines.slice(1).join(" ")}</span>
        </>
      );
    }

    // 2. Pattern: "... in India" or "... across India"
    const lower = text.toLowerCase();
    if (lower.includes(" in india")) {
      const idx = lower.indexOf(" in india");
      const part1 = text.substring(0, idx).trim();
      const part2 = text.substring(idx).trim();
      return (
        <>
          <span>{part1}</span>
          <span className="block mt-1 sm:mt-1.5">{part2}</span>
        </>
      );
    }

    if (lower.includes(" across india")) {
      const idx = lower.indexOf(" across india");
      const part1 = text.substring(0, idx).trim();
      const part2 = text.substring(idx).trim();
      return (
        <>
          <span>{part1}</span>
          <span className="block mt-1 sm:mt-1.5">{part2}</span>
        </>
      );
    }

    // 3. Pattern: contains hyphen or colon separator
    if (text.includes(" - ")) {
      const [part1, ...rest] = text.split(" - ");
      return (
        <>
          <span>{part1}</span>
          <span className="block mt-1 sm:mt-1.5">{rest.join(" - ")}</span>
        </>
      );
    }

    // 4. Default 4+ words: split neatly into two lines
    const words = text.split(" ");
    if (words.length >= 4) {
      const mid = Math.ceil(words.length / 2);
      return (
        <>
          <span>{words.slice(0, mid).join(" ")}</span>
          <span className="block mt-1 sm:mt-1.5">{words.slice(mid).join(" ")}</span>
        </>
      );
    }

    return text;
  };

  return (
    <div className="bg-[#F7FAFC] w-full max-w-full border-b border-[#DCE6EB] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-16">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
          
          {/* Left: Authority Messaging with Two-Line Headline */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-2">
              DOCTOR-LED · CONNECTED HEALTHCARE
            </p>

            <h1 className="text-[26px] sm:text-3xl lg:text-[44px] xl:text-[48px] leading-[1.2] font-extrabold text-[#0B3A5B] mb-3.5 tracking-tight">
              {renderTwoLineHeadline(headline)}
            </h1>

            <p className="text-sm sm:text-base lg:text-[17px] text-[#607580] leading-relaxed mb-6 max-w-2xl mx-auto lg:mx-0">
              {subheadline}
            </p>

            {/* Concise CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-7 justify-center lg:justify-start">
              <Link
                href="/doctors"
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-bold rounded-xl bg-[#0B3A5B] text-white hover:bg-[#1677A8] transition-all shadow-xs hover:shadow-sm group"
              >
                <span>{primaryText}</span>
                <span className="ml-1.5 transform group-hover:translate-x-1 transition-transform">&rarr;</span>
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold rounded-xl border border-[#DCE6EB] text-[#0B3A5B] bg-white hover:bg-[#F7FAFC] hover:border-[#1677A8]/50 transition-all shadow-2xs"
              >
                {secondaryText}
              </Link>
            </div>

            {/* Micro Trust Strip */}
            <div className="flex flex-wrap items-center gap-x-5 sm:gap-x-7 gap-y-2.5 pt-5 border-t border-[#DCE6EB] justify-center lg:justify-start">
              {microTrust.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#E8F2F7] text-[#1677A8] flex items-center justify-center shrink-0">
                      <Icon className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-xs font-semibold text-[#18303D]">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Doctor Slider with Refined Shadows */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
            <div className="w-full max-w-md lg:max-w-lg rounded-2xl border border-[#DCE6EB] bg-white overflow-hidden shadow-sm flex flex-col">
              <div className="relative aspect-[4/3] w-full bg-[#EFF3F6] overflow-hidden">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image.src}
                    alt={image.alt}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
                      index === currentIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ))}
                
                {/* Left/right navigation buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 z-10 inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/95 text-[#0B3A5B] shadow-md border border-slate-200/60 hover:bg-white hover:text-[#1677A8] hover:scale-105 focus:outline-none transition-all cursor-pointer"
                      aria-label="Previous image"
                    >
                      <FaChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 z-10 inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/95 text-[#0B3A5B] shadow-md border border-slate-200/60 hover:bg-white hover:text-[#1677A8] hover:scale-105 focus:outline-none transition-all cursor-pointer"
                      aria-label="Next image"
                    >
                      <FaChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </>
                )}

                {/* Dot indicator indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === currentIndex ? 'w-5 bg-[#0B3A5B]' : 'w-1.5 bg-white/80'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Slider caption footer */}
              <div className="p-3 bg-white border-t border-[#DCE6EB] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-[#0B3A5B]">Verified Consultations Live</span>
                </div>
                <span className="text-[11px] text-[#607580] font-medium">Online & In-Clinic</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
