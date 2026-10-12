"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { 
  FaUserMd, 
  FaFlask, 
  FaPills, 
  FaHandHoldingHeart, 
  FaBed, 
  FaFileMedical, 
  FaHeartbeat,
  FaChevronLeft, 
  FaChevronRight 
} from "react-icons/fa";

const defaultServices = [
  {
    id: "consult",
    icon: FaUserMd,
    title: "Doctor Consultations",
    description: "HD video consultations and in-clinic visits with verified specialists across key specialties.",
    buttonText: "Book Slot",
    link: "/doctors",
  },
  {
    id: "diagnostics",
    icon: FaFlask,
    title: "Lab Tests",
    description: "Book diagnostic lab tests with digital reports. Sample collection available where applicable.",
    buttonText: "Book Test",
    link: "/dashboard/lab-booking",
  },
  {
    id: "pharmacy",
    icon: FaPills,
    title: "Medicine Delivery",
    description: "Order prescribed medicines from trusted pharmacy partners with convenient delivery options.",
    buttonText: "Order Now",
    link: "/medicine-order",
  },
  {
    id: "nursing",
    icon: FaHandHoldingHeart,
    title: "Nursing Care",
    description: "Home nursing services including elder care and post-hospital recovery support.",
    buttonText: "Explore Care",
    link: "/nursing-care",
  },
  {
    id: "equipment",
    icon: FaBed,
    title: "Medical Equipment",
    description: "Rent or purchase essential medical equipment for home care including oxygen, beds, and more.",
    buttonText: "View Equipment",
    link: "/nursing-care",
  },
  {
    id: "digilocker",
    icon: FaFileMedical,
    title: "MediConnect DigiLocker",
    description: "Keep your medical records, prescriptions, and health summaries encrypted, organised and accessible.",
    buttonText: "Open Locker",
    link: "/digital-locker",
    isLive: true,
  },
  {
    id: "wellness",
    icon: FaHeartbeat,
    title: "Wellness Modules",
    description: "Specialized health monitoring programs including LungConnect and CardioConnect for ongoing wellness.",
    buttonText: "View Programs",
    link: "#specialized-programs",
  },
];

export default function HealthServices() {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const card = scrollRef.current.querySelector(".service-card-item");
      const cardWidth = card ? card.offsetWidth + 20 : 300;
      const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  };

  return (
    <section id="services" className="w-full bg-[#FFFFFF] py-10 sm:py-14 border-b border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div className="text-center sm:text-left">
            <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
              OUR SERVICES & CARE ECOSYSTEM
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
              Healthcare services, connected in one place.
            </h2>
            <p className="text-xs sm:text-sm text-[#607580] mt-1.5 max-w-2xl mx-auto sm:mx-0 leading-relaxed">
              From your first consultation to diagnostics, medicines, nursing, and continuing care — all organized clearly with verified partners.
            </p>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-3 shrink-0">
            {/* Slider Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className={`w-9 h-9 rounded-full border border-[#DCE6EB] bg-white flex items-center justify-center transition-all ${
                  canScrollLeft
                    ? "text-[#0B3A5B] hover:border-[#1677A8] hover:text-[#1677A8] cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                    : "text-slate-300 opacity-40 cursor-not-allowed"
                }`}
                aria-label="Previous services"
              >
                <FaChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className={`w-9 h-9 rounded-full border border-[#DCE6EB] bg-white flex items-center justify-center transition-all ${
                  canScrollRight
                    ? "text-[#0B3A5B] hover:border-[#1677A8] hover:text-[#1677A8] cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                    : "text-slate-300 opacity-40 cursor-not-allowed"
                }`}
                aria-label="Next services"
              >
                <FaChevronRight className="w-3 h-3" />
              </button>
            </div>

            <Link 
              href="/website/services" 
              className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#1677A8] hover:text-[#0B3A5B] transition-colors ml-1"
            >
              <span>View all services</span>
              <FaChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>

        {/* Responsive Slider with Exact Card Width Calculation (Zero Side Cutoff) */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          className="flex overflow-x-auto gap-5 pt-2.5 pb-3 px-1 no-scrollbar hide-scrollbar scrollbar-none snap-x snap-mandatory scroll-smooth w-full [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
        >
          {defaultServices.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className="service-card-item group flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-white border border-[#DCE6EB] hover:border-[#1677A8]/50 hover:shadow-md transition-all duration-200 snap-start shrink-0 w-full sm:w-[calc((100%-20px)/2)] md:w-[calc((100%-40px)/3)] lg:w-[calc((100%-60px)/4)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#F7FAFC] group-hover:bg-[#1677A8]/10 text-[#1677A8] border border-[#DCE6EB] flex items-center justify-center transition-colors">
                      <Icon className="w-5 h-5 text-[#1677A8]" />
                    </div>
                    {service.isLive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Live
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#0B3A5B] mb-2 leading-snug group-hover:text-[#1677A8] transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs text-[#607580] leading-relaxed mb-6 line-clamp-3">
                    {service.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#DCE6EB]/60">
                  <Link
                    href={service.link}
                    className="inline-flex items-center text-xs font-bold text-[#1677A8] group-hover:text-[#0B3A5B] transition-colors"
                  >
                    <span>{service.buttonText}</span>
                    <FaChevronRight className="w-2.5 h-2.5 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
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
