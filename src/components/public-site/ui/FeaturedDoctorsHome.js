"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaUserMd,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import Link from "next/link";

const SpecialtyFilter = ({ specialties, selectedSpecialty, onSelect }) => {
  const scrollContainer = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainer.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
  }, [specialties]);

  const scroll = (direction) => {
    if (scrollContainer.current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      scrollContainer.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/95 border border-[#DCE6EB] rounded-full p-2.5 shadow-md text-[#0B3A5B] hover:text-[#1677A8] hover:border-[#1677A8] hover:scale-105 transition-all cursor-pointer flex items-center justify-center opacity-100"
            aria-label="Scroll left"
          >
            <FaChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          ref={scrollContainer}
          onScroll={checkScroll}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          className="flex overflow-x-auto gap-2.5 py-2.5 px-1.5 no-scrollbar hide-scrollbar scrollbar-none snap-x snap-mandatory scroll-smooth w-full [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
        >
          {specialties.map((specialty, index) => (
            <button
              key={index}
              type="button"
              suppressHydrationWarning
              onClick={() => onSelect(specialty)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all snap-center cursor-pointer ${
                selectedSpecialty === specialty
                  ? "bg-[#0B3A5B] text-white shadow-xs"
                  : "border border-[#DCE6EB] bg-white text-[#18303D] hover:border-[#1677A8] hover:text-[#1677A8]"
              }`}
            >
              {specialty}
            </button>
          ))}
        </div>

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/95 border border-[#DCE6EB] rounded-full p-2.5 shadow-md text-[#0B3A5B] hover:text-[#1677A8] hover:border-[#1677A8] hover:scale-105 transition-all cursor-pointer flex items-center justify-center opacity-100"
            aria-label="Scroll right"
          >
            <FaChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

const ConditionsStrip = ({ conditions, onSelectCondition }) => {
  const scrollContainer = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainer.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
  }, [conditions]);

  const scroll = (direction) => {
    if (scrollContainer.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollContainer.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(checkScroll, 300);
    }
  };

  if (!conditions || conditions.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 gap-2.5">
        <div className="text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-[#0B3A5B] tracking-tight">
            What health concern are you looking to address?
          </h2>
          <p className="text-xs sm:text-sm text-[#607580] mt-1 max-w-xl mx-auto sm:mx-0">
            Find the right care pathways, specialists and services for your health needs.
          </p>
        </div>
        <div className="flex justify-center sm:justify-end">
          <Link 
            href="/website/doctors" 
            className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#1677A8] hover:text-[#0B3A5B] transition-colors shrink-0"
          >
            <span>View all health concerns</span>
            <FaChevronRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
      </div>

      <div className="relative w-full mt-2">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/95 border border-[#DCE6EB] rounded-full p-2.5 shadow-md text-[#0B3A5B] hover:text-[#1677A8] hover:border-[#1677A8] hover:scale-105 transition-all cursor-pointer flex items-center justify-center opacity-100"
            aria-label="Scroll left"
          >
            <FaChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          ref={scrollContainer}
          onScroll={checkScroll}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          className="flex overflow-x-auto pt-2.5 pb-2.5 px-1.5 no-scrollbar hide-scrollbar scrollbar-none snap-x snap-mandatory scroll-smooth gap-3 md:gap-4 w-full items-stretch [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
        >
          {conditions.map((condition) => (
            <div
              key={condition.id}
              onClick={() => onSelectCondition(condition.slug)}
              className="bg-white border border-[#DCE6EB] rounded-xl p-3 md:p-3.5 flex flex-col items-center justify-center min-w-[110px] md:min-w-[130px] cursor-pointer group/item snap-center shrink-0 hover:shadow-sm hover:-translate-y-0.5 hover:border-[#1677A8] transition-all"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#F7FAFC] border border-[#DCE6EB] flex items-center justify-center p-1.5 group-hover/item:bg-[#1677A8]/10 transition-colors mb-2.5 shrink-0">
                {condition.icon_name ? (
                  <img 
                    src={condition.icon_name} 
                    alt={condition.title} 
                    className="w-full h-full object-contain" 
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-200" />
                )}
              </div>
              <span className="font-semibold text-[#18303D] text-xs text-center leading-tight group-hover/item:text-[#1677A8] transition-colors break-words w-full">
                {condition.title}
              </span>
            </div>
          ))}
        </div>

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/95 border border-[#DCE6EB] rounded-full p-2.5 shadow-md text-[#0B3A5B] hover:text-[#1677A8] hover:border-[#1677A8] hover:scale-105 transition-all cursor-pointer flex items-center justify-center opacity-100"
            aria-label="Scroll right"
          >
            <FaChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default function FeaturedDoctorsHome() {
  const router = useRouter();
  const [conditions, setConditions] = useState([]);
  const [specialties, setSpecialties] = useState(["All Specialties"]);

  useEffect(() => {
    async function fetchSpecialties() {
      try {
        const res = await fetch("/api/cms/specialties");
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          const active = json.data.filter(s => s.is_active !== false).sort((a, b) => a.display_order - b.display_order);
          setSpecialties(["All Specialties", ...active.map(s => s.name)]);
        } else {
          setSpecialties([
            "All Specialties",
            "General Physician",
            "Dermatology",
            "Gynaecology",
            "Pediatrics",
            "Cardiology",
            "Pulmonology",
            "Endocrinology",
            "Gastroenterology",
            "Orthopedics",
            "Neurology",
            "Urology",
          ]);
        }
      } catch (e) {
        console.error("Failed to load specialties from CMS", e);
      }
    }

    async function fetchConditions() {
      try {
        const res = await fetch("/api/cms/conditions?active_only=true");
        const json = await res.json();
        if (json.success && json.data) {
          setConditions(json.data);
        }
      } catch (e) {
        console.error("Failed to load conditions", e);
      }
    }
    fetchSpecialties();
    fetchConditions();
  }, []);

  return (
    <section className="bg-[#FFFFFF] py-8 sm:py-10 border-b border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section 4: Health Concerns */}
        <div className="mb-8 w-full">
          <ConditionsStrip
            conditions={conditions}
            onSelectCondition={(slug) => router.push(`/problem/${slug}`)}
          />
        </div>

        {/* Section 5: Specialties */}
        <div className="pt-6 border-t border-[#DCE6EB]/80">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 gap-2.5">
            <div className="text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0B3A5B] tracking-tight">
                Find the right healthcare professional
              </h2>
              <p className="text-xs sm:text-sm text-[#607580] mt-1 max-w-xl mx-auto sm:mx-0">
                Consult top specialists for your specific health needs.
              </p>
            </div>
            <div className="flex justify-center sm:justify-end">
              <Link 
                href="/website/doctors" 
                className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#1677A8] hover:text-[#0B3A5B] transition-colors shrink-0"
              >
                <span>View all specialties</span>
                <FaChevronRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>

          <SpecialtyFilter
            specialties={specialties}
            selectedSpecialty={"All Specialties"}
            onSelect={(s) => {
              if (s === "All Specialties") {
                router.push(`/website/doctors`);
              } else {
                router.push(`/website/doctors?specialty=${encodeURIComponent(s)}`);
              }
            }}
          />
        </div>
      </div>
    </section>
  );
}
