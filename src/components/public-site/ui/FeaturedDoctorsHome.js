"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaUserMd,
  FaSearch,
  FaFilter,
  FaChevronDown,
  FaStar,
  FaMapMarkerAlt,
  FaClock,
  FaVideo,
  FaCalendarAlt,
  FaCalendarCheck,
  FaShieldAlt,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { HiOutlineBadgeCheck } from "react-icons/hi";
import Link from "next/link";



const SpecialtyFilter = ({ specialties, selectedSpecialty, onSelect }) => {
  const scrollContainer = React.useRef(null);

  const scroll = (direction) => {
    if (scrollContainer.current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      scrollContainer.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full group">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 md:-ml-4 z-10 bg-white border border-gray-200 rounded-full p-2 shadow-md text-gray-600 hover:text-[#0067A1] hover:border-[#0067A1] transition hidden md:flex opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Scroll left"
      >
        <FaChevronLeft className="w-3 h-3" />
      </button>

      <div
        ref={scrollContainer}
        className="flex overflow-x-auto gap-3 py-2 px-1 hide-scrollbar snap-x snap-mandatory scroll-smooth w-full"
      >
        {specialties.map((specialty, index) => (
          <button
            key={index}
            onClick={() => onSelect(specialty)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors snap-center ${selectedSpecialty === specialty
              ? "bg-[#0067A1] text-white shadow-md shadow-[#0067A1]/20"
              : "border border-gray-200 bg-white text-gray-700 hover:border-[#0067A1]/50 hover:bg-gray-50"
              }`}
          >
            {specialty}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2 md:-mr-4 z-10 bg-white border border-gray-200 rounded-full p-2 shadow-md text-gray-600 hover:text-[#0067A1] hover:border-[#0067A1] transition hidden md:flex opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Scroll right"
      >
        <FaChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};

const ConditionsStrip = ({ conditions, onSelectCondition }) => {
  const scrollContainer = React.useRef(null);

  if (!conditions || conditions.length === 0) return null;

  const scroll = (direction) => {
    if (scrollContainer.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollContainer.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="mt-2 md:mt-4 border-t border-gray-100 pt-4 md:pt-4 w-full">
      <h3 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-2">
        What health problem are you facing?
      </h3>
      <p className="text-center text-gray-500 mb-8 max-w-2xl mx-auto text-sm md:text-base">
        Select a condition to learn more about the symptoms, causes, and our suggested treatment paths.
      </p>

      <div className="relative w-full group">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-0 top-[40%] -translate-y-1/2 -ml-2 md:-ml-4 z-10 bg-white border border-gray-200 rounded-full p-2.5 shadow-md text-gray-600 hover:text-[#0067A1] hover:border-[#0067A1] transition hidden md:flex opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Scroll left"
        >
          <FaChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollContainer}
          className="flex overflow-x-auto pb-6 px-4 md:px-0 hide-scrollbar snap-x snap-mandatory scroll-smooth gap-4 md:gap-5 w-full items-stretch"
        >
          {conditions.map((condition) => (
            <div
              key={condition.id}
              onClick={() => onSelectCondition(condition.slug)}
              className="bg-white border border-gray-100 shadow-sm rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center min-w-[120px] md:min-w-[140px] cursor-pointer group/item snap-center shrink-0 hover:shadow-md hover:-translate-y-1 hover:border-[#0067A1]/30 transition-all duration-300"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-50 flex items-center justify-center p-1 group-hover/item:bg-[#0067A1]/5 transition-colors mb-3 shrink-0">
                {condition.icon_name ? (
                  <img 
                    src={condition.icon_name} 
                    alt={condition.title} 
                    className="w-full h-full object-contain drop-shadow-sm" 
                    style={{ filter: "hue-rotate(45deg) saturate(120%)" }}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-200" />
                )}
              </div>
              <span className="font-bold text-gray-800 text-sm md:text-base text-center leading-tight group-hover/item:text-[#0067A1] transition-colors break-words w-full">
                {condition.title}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-0 top-[40%] -translate-y-1/2 -mr-2 md:-mr-4 z-10 bg-white border border-gray-200 rounded-full p-2.5 shadow-md text-gray-600 hover:text-[#0067A1] hover:border-[#0067A1] transition hidden md:flex opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Scroll right"
        >
          <FaChevronRight className="w-4 h-4" />
        </button>
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
            "Cardiology",
            "Dermatology",
            "Pediatrics",
            "Neurology",
            "Orthopedics",
            "Gynecology",
            "Dentistry",
            "Psychiatry",
            "General Physician",
            "ENT",
            "Ophthalmology",
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
    <div className="bg-[#F6F8FA] py-4">
      <div className="relative overflow-hidden">
        <div className="relative container mx-auto px-4 sm:px-4 lg:px-4 pb-4 md:pb-4">
          {/* Filter Section */}
          <div className="mb-8 w-full">
            <div className="w-full max-w-full mx-auto relative">
              <ConditionsStrip
                conditions={conditions}
                onSelectCondition={(slug) => router.push(`/website/problem/${slug}`)}
              />
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 w-full max-w-full mx-auto relative mt-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Choose a Specialty
              </h3>
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
        </div>
      </div>
    </div>
  );
}
