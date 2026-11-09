"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDoctorsAction } from "./actions";
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
  FaArrowRight,
  FaClinicMedical,
  FaHome,
  FaLocationArrow,
  FaCrosshairs,
} from "react-icons/fa";
import { HiOutlineBadgeCheck } from "react-icons/hi";
import dynamic from "next/dynamic";
import HowItWorksSteps from "@/components/public-site/ui/HowItWorksSteps";
import { getSavedPatientLocation, savePatientLocation } from "@/lib/patientLocation";
import { ALL_SPECIALTIES_FOR_FILTER } from "@/lib/doctorSpecialties";


const LoginModal = dynamic(
  () => import("@/components/public-site/auth/LoginModal"),
  { ssr: false },
);

const SignupModal = dynamic(
  () => import("@/components/public-site/auth/SignupModal"),
  { ssr: false },
);

const normalizeSpecialty = (value) => {
  if (!value) return "General Physician";

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "General Physician";

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.join(", ");
      }
      if (typeof parsed === "string") {
        return parsed;
      }
    } catch {
      // not JSON, fall through
    }
    // Handle common non-JSON array-like strings, e.g. ["General Physician"] or ['General Physician']
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("(") && trimmed.endsWith(")"))) {
      const inner = trimmed.slice(1, -1);
      const parts = inner.split(",").map((p) => p.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      if (parts.length) return parts.join(", ");
      return "General Physician";
    }

    // Fallback: plain string as-is
    return trimmed;
  }

  return String(value);
};

const cleanClinicAddress = (address) => {
  if (!address) return "India";
  const parts = address.split(',').map(p => p.trim());
  
  // Filter out parts that contain house number indicators or are very short
  const genericParts = parts.filter(p => {
    if (/^\d+$/g.test(p)) return false; // skip pincode or numbers
    if (/^(flat|plot|house|rz|shop|hno|h\sno|room|ward|office|building|pincode)\b/i.test(p)) return false;
    return p.length > 2;
  });

  const lastParts = genericParts.length > 0 ? genericParts.slice(-2) : parts.slice(-2);
  
  // Clean up leading numbers/symbols from the final segments
  return lastParts
    .map(p => p.replace(/^\d+[-\w\/]*\s*/g, '')) // remove leading numbers (like "114-A" or "113A")
    .map(p => p.replace(/^(opposite|opp\.|near|facing)\s+[\w\s]+/gi, '')) // remove landmarks
    .map(p => p.trim())
    .filter(p => p.length > 2)
    .join(', ') || "India";
};

const isFeeServed = (val) => {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  if (str === "") return false;
  const num = Number(str);
  return !Number.isNaN(num) && num >= 0;
};

const formatModeFee = (val) => {
  if (!isFeeServed(val)) return null;
  const num = Number(val);
  if (num === 0) return "Free (₹0)";
  return `₹${num.toLocaleString('en-IN')}`;
};

const parseModeFeeNum = (val) => {
  if (!isFeeServed(val)) return null;
  return Number(val);
};

const DoctorCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 space-y-2.5 animate-pulse shadow-2xs flex flex-col justify-between h-full">
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-lg bg-slate-200 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-4 bg-slate-200 rounded-md w-3/4" />
        <div className="h-3 bg-slate-100 rounded-md w-1/2" />
        <div className="h-4 bg-slate-100 rounded-md w-24" />
      </div>
    </div>
    <div className="h-4 bg-slate-100 rounded w-full pt-1" />
    <div className="flex gap-1.5 pt-1">
      <div className="h-6 bg-slate-100 rounded-md w-24" />
      <div className="h-6 bg-slate-100 rounded-md w-24" />
    </div>
    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
      <div className="space-y-1">
        <div className="h-2.5 bg-slate-100 rounded w-14" />
        <div className="h-4 bg-slate-200 rounded w-16" />
      </div>
      <div className="h-8 bg-slate-200 rounded-lg w-24" />
    </div>
  </div>
);

const DoctorCard = ({ doctor, activeMode = "all", feeFilter = "all", isHighlighted, onSelect, onOpenProfile }) => {
  const availableModes = doctor.modes || [];

  const getBestModeForFilters = () => {
    if (activeMode !== "all") {
      const found = availableModes.find((m) => m.id === activeMode);
      if (found) return found.id;
    }
    if (feeFilter && feeFilter !== "all") {
      const feeMatch = availableModes.find((m) => {
        if (feeFilter === "under_500") return m.fee < 500;
        if (feeFilter === "500_1000") return m.fee >= 500 && m.fee <= 1000;
        if (feeFilter === "above_1000") return m.fee >= 1000;
        return true;
      });
      if (feeMatch) return feeMatch.id;
    }
    return availableModes[0]?.id || "clinic";
  };

  // Local mode selection on card; initial sync with filter activeMode and feeFilter
  const [selectedCardMode, setSelectedCardMode] = useState(getBestModeForFilters);

  useEffect(() => {
    setSelectedCardMode(getBestModeForFilters());
  }, [activeMode, feeFilter, doctor]);

  const effectiveMode =
    activeMode !== "all" && availableModes.some((m) => m.id === activeMode)
      ? activeMode
      : selectedCardMode || availableModes[0]?.id || "clinic";

  // Determine bottom-left consultation fee display based on chosen/effective mode
  let consultationFeeLabel = "Consultation";
  let consultationFeeDisplay = "TBD";

  const matchedMode = availableModes.find((m) => m.id === effectiveMode);
  if (matchedMode) {
    consultationFeeLabel =
      effectiveMode === "clinic"
        ? "In-Clinic Fee"
        : effectiveMode === "video"
        ? "Video Fee"
        : "Home Visit Fee";
    consultationFeeDisplay = matchedMode.formatted;
  } else if (availableModes.length > 0) {
    const minVal = Math.min(...availableModes.map((m) => m.fee));
    consultationFeeLabel = "Consultation";
    consultationFeeDisplay = `From ₹${minVal.toLocaleString("en-IN")}`;
  } else {
    consultationFeeDisplay = "On Request";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenProfile(effectiveMode)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpenProfile(effectiveMode); }}
      className={`group w-full text-left cursor-pointer rounded-xl transition-all duration-200 bg-white border ${
        isHighlighted
          ? "border-[#0067A1] ring-2 ring-[#0067A1]/15 shadow-sm"
          : "border-slate-200/80 hover:border-[#0067A1]/40 hover:shadow-md"
      } p-3.5 sm:p-4 flex flex-col justify-between h-full space-y-2.5`}
    >
      {/* Top Header: Avatar + Info */}
      <div className="flex items-start gap-3">
        <div 
          className="relative shrink-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onOpenProfile(effectiveMode);
          }}
        >
          <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-lg overflow-hidden border border-slate-200/80 bg-slate-50 flex items-center justify-center group-hover:border-[#0067A1]/30 transition-colors">
            <img
              src={doctor.profileImage || "/dr.png"}
              alt={doctor.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden absolute inset-0 bg-[#0067A1]/10 items-center justify-center text-[#0067A1] font-semibold text-sm">
              {doctor.name ? doctor.name.charAt(0) : "D"}
            </div>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-2xs">
            <FaCheckCircle className="h-3 w-3 text-emerald-500" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile(effectiveMode);
            }}
            className="text-sm sm:text-[15px] font-semibold text-slate-900 truncate group-hover:text-[#0067A1] transition-colors leading-snug cursor-pointer"
          >
            {doctor.name}
          </h3>
          <p className="text-xs font-medium text-[#0067A1] truncate">
            {doctor.specialty}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            {typeof doctor.rating === "number" && doctor.rating > 0 ? (
              <div className="inline-flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-800 border border-amber-200/60">
                <FaStar className="h-2.5 w-2.5 text-amber-500" />
                <span>{doctor.rating.toFixed(1)}</span>
                {doctor.reviews && <span className="text-amber-700/70 font-normal">({doctor.reviews})</span>}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                <HiOutlineBadgeCheck className="h-3 w-3 text-emerald-600" />
                Verified Specialist
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Meta Specs: Clean Single Row for Experience & Location */}
      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span className="inline-flex items-center gap-1 text-slate-700 font-medium shrink-0">
          <FaClock className="w-2.5 h-2.5 text-[#0067A1]" />
          <span>{doctor.experience ? `${doctor.experience}+ yrs` : "Verified"}</span>
        </span>
        <span className="text-slate-300">•</span>
        <span className="inline-flex items-center gap-1 text-slate-600 truncate min-w-0" title={doctor.location}>
          <FaMapMarkerAlt className="w-2.5 h-2.5 text-rose-500 shrink-0" />
          <span className="truncate">{doctor.location || "India"}</span>
          {doctor.distanceKm != null && (
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200/70 shrink-0 ml-1">
              {doctor.distanceKm} km
            </span>
          )}
        </span>
      </div>

      {/* Consultation Modes & Pricing - Clickable interactive chips */}
      {availableModes.length > 0 && (
        <div className="pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {availableModes.map((m) => {
              const isSelected = effectiveMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCardMode(m.id);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#0067A1]/10 text-[#0067A1] border border-[#0067A1]/40 font-medium"
                      : "bg-slate-50 text-slate-700 border border-slate-200/70 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                  title={`Select ${m.label} Consultation`}
                >
                  {m.id === "clinic" && <FaClinicMedical className="w-2.5 h-2.5 text-[#0067A1] shrink-0" />}
                  {m.id === "video" && <FaVideo className="w-2.5 h-2.5 text-blue-500 shrink-0" />}
                  {m.id === "home" && <FaHome className="w-2.5 h-2.5 text-emerald-600 shrink-0" />}
                  <span className="text-slate-500 text-[11px] font-normal">{m.label}</span>
                  <span className="font-semibold text-slate-900 text-xs">{m.formatted}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Fee & Action CTA */}
      <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-3 mt-auto">
        <div className="min-w-0">
          <span className="text-[10px] font-medium text-slate-400 block leading-tight">
            {consultationFeeLabel}
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {consultationFeeDisplay}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenProfile(effectiveMode);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:py-2 bg-[#0067A1] hover:bg-[#005585] text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs active:scale-95 shrink-0"
        >
          <FaCalendarCheck className="h-3 w-3" />
          <span>Book Now</span>
        </button>
      </div>
    </div>
  );
};

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
        className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 md:-ml-4 z-10 bg-white border border-gray-200 rounded-lg p-2 shadow-md text-gray-600 hover:text-[#0067A1] hover:border-[#0067A1] transition hidden md:flex opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Scroll left"
      >
        <FaChevronLeft className="w-3 h-3" />
      </button>

      <div
        ref={scrollContainer}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        className="flex overflow-x-auto gap-3 py-2 px-1 no-scrollbar hide-scrollbar scrollbar-none snap-x snap-mandatory scroll-smooth w-full [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
      >
        {specialties.map((specialty, index) => (
          <button
            key={index}
            onClick={() => onSelect(specialty)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all snap-center shadow-xs hover:shadow-sm ${selectedSpecialty === specialty
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
      const scrollAmount = direction === "left" ? -250 : 250;
      scrollContainer.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 mb-4 shadow-2xs w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-2">
            <span>What health concern are you facing?</span>
          </h3>
          <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
            Select a condition to find recommended medical specialists
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-2xs hover:text-[#0067A1] hover:border-[#0067A1]"
            aria-label="Scroll left"
          >
            <FaChevronLeft className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-2xs hover:text-[#0067A1] hover:border-[#0067A1]"
            aria-label="Scroll right"
          >
            <FaChevronRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainer}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        className="flex overflow-x-auto gap-2.5 pb-0.5 no-scrollbar hide-scrollbar scrollbar-none scroll-smooth w-full items-stretch [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
      >
        {conditions.map((condition) => (
          <button
            key={condition.id}
            type="button"
            onClick={() => onSelectCondition(condition.slug)}
            className="bg-slate-50/70 hover:bg-[#0067A1]/5 border border-slate-200/80 hover:border-[#0067A1]/40 rounded-lg p-2.5 flex flex-col items-center justify-center min-w-[85px] sm:min-w-[95px] cursor-pointer group/item shrink-0 transition-all shadow-2xs"
          >
            <div className="w-9 h-9 rounded-md bg-white border border-slate-200/80 group-hover:border-[#0067A1]/40 flex items-center justify-center p-1.5 transition-all shadow-2xs mb-1.5 shrink-0">
              {condition.icon_name ? (
                <img
                  src={condition.icon_name}
                  alt={condition.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full rounded bg-slate-200" />
              )}
            </div>
            <span className="font-medium text-slate-700 text-[11px] text-center leading-tight group-hover/item:text-[#0067A1] transition-colors truncate w-full">
              {condition.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const CustomSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  searchable = false,
  labelPrefix = "",
  fullWidth = false,
  alignRight = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedItem = options.find((opt) =>
    typeof opt === "object" ? opt.value === value : opt === value
  );

  const displayLabel = selectedItem
    ? typeof selectedItem === "object"
      ? selectedItem.label
      : selectedItem
    : value || placeholder;

  const filteredOptions = options.filter((opt) => {
    const label = typeof opt === "object" ? opt.label : opt;
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div ref={dropdownRef} className={`relative ${fullWidth ? "w-full" : "inline-block"} text-xs`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]/20 transition-all flex items-center justify-between gap-2 shadow-none ${
          fullWidth ? "w-full" : "min-w-[130px]"
        }`}
      >
        <span className="truncate">
          {labelPrefix && <span className="text-slate-400 font-normal mr-1">{labelPrefix}</span>}
          {displayLabel}
        </span>
        <FaChevronDown className={`w-2.5 h-2.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#0067A1]" : ""}`} />
      </button>

      {isOpen && (
        <div className={`absolute ${alignRight ? "right-0 left-auto" : "left-0"} mt-1 ${fullWidth ? "w-full" : "w-56"} max-h-64 overflow-hidden bg-white border border-slate-200 rounded-lg shadow-lg z-[10001] p-1.5 animate-in fade-in slide-in-from-top-1 duration-150`}>
          {searchable && (
            <div className="p-1 mb-1 border-b border-slate-100">
              <div className="relative">
                <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                <input
                  type="text"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0067A1]"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            className="space-y-0.5 max-h-48 overflow-y-auto no-scrollbar hide-scrollbar scrollbar-none [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-slate-400 text-center italic text-xs">No matching options</div>
            ) : (
              filteredOptions.map((opt) => {
                const optVal = typeof opt === "object" ? opt.value : opt;
                const optLabel = typeof opt === "object" ? opt.label : opt;
                const isSelected = optVal === value;

                return (
                  <button
                    key={optVal}
                    type="button"
                    onClick={() => {
                      onChange(optVal);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between font-medium text-xs transition-colors ${
                      isSelected
                        ? "bg-[#0067A1]/10 text-[#0067A1]"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate">{optLabel}</span>
                    {isSelected && <FaCheckCircle className="w-3 h-3 text-[#0067A1] shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};


function DoctorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const initialSearch = searchParams?.get("search") || searchParams?.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  
  const initialSpecialty = searchParams.get("specialty") || "All Specialties";
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty);
  const [doctors, setDoctors] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [sortBy, setSortBy] = useState("recommended");
  const [feeFilter, setFeeFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [appointmentMode, setAppointmentMode] = useState("all");
  const [userCoords, setUserCoords] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = getSavedPatientLocation();
      if (saved?.lat && saved?.lng) {
        return { lat: Number(saved.lat), lng: Number(saved.lng), city: saved.city || "", address: saved.city || "" };
      }
    }
    return { lat: null, lng: null, city: "", address: "" };
  });
  const [locationSearchQuery, setLocationSearchQuery] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = getSavedPatientLocation();
      return saved?.city || "";
    }
    return "";
  });
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef(null);
  const searchContainerRef = useRef(null);
  const mobileSearchContainerRef = useRef(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState("");
  const [totalDoctorsCount, setTotalDoctorsCount] = useState(0);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const activeFilterCount =
    (selectedSpecialty !== "All Specialties" ? 1 : 0) +
    (appointmentMode !== "all" ? 1 : 0) +
    (feeFilter !== "all" ? 1 : 0) +
    (experienceFilter !== "all" ? 1 : 0) +
    (sortBy === "nearest" || Boolean(userCoords?.lat) ? 1 : 0) +
    (searchQuery.trim() !== "" ? 1 : 0);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const outsideDesktop = !searchContainerRef.current || !searchContainerRef.current.contains(e.target);
      const outsideMobile = !mobileSearchContainerRef.current || !mobileSearchContainerRef.current.contains(e.target);
      if (outsideDesktop && outsideMobile) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLocationSearch = (query) => {
    setLocationSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await fetch(`/api/location/search?query=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data && data.suggestions && data.suggestions.length > 0) {
          setLocationSuggestions(data.suggestions);
          setShowSuggestions(true);
        } else {
          setLocationSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.warn("Google Places location search error:", err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 250);
  };

  const handleSelectLocation = async (item) => {
    setShowSuggestions(false);
    const displayName = item.name || item.text || "";
    const secondary = item.secondaryText || item.secondary_text || "";
    const fullAddress = secondary ? `${displayName}, ${secondary}` : displayName;
    setLocationSearchQuery(fullAddress);

    try {
      let lat = item.latitude;
      let lng = item.longitude;

      const pid = item.placeId || item.place_id;
      if ((!lat || !lng) && pid) {
        const detRes = await fetch(`/api/location/search?place_id=${encodeURIComponent(pid)}`);
        const detJson = await detRes.json();
        if (detJson.success && detJson.data) {
          lat = detJson.data.latitude;
          lng = detJson.data.longitude;
        }
      }

      if (lat && lng) {
        const newCoords = {
          lat: Number(lat),
          lng: Number(lng),
          address: fullAddress,
          city: displayName,
          isGps: false,
        };
        setUserCoords(newCoords);
        savePatientLocation({
          city: displayName,
          lat: Number(lat),
          lng: Number(lng),
          isGps: false,
          isManual: true,
          forceReset: true,
        });
        setSortBy("nearest");
        setLocationNotice("");
      }
    } catch (e) {
      console.error("Failed to resolve place details:", e);
    }
  };

  const clearLocation = () => {
    setUserCoords({ lat: null, lng: null, address: "", city: "" });
    setLocationSearchQuery("");
    setLocationSuggestions([]);
    setShowSuggestions(false);
    if (sortBy === "nearest") {
      setSortBy("recommended");
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("mediconnect_patient_location");
      } catch (_) {}
    }
  };

  const requestUserLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationNotice("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetectingLocation(true);
    setLocationNotice("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = { lat: latitude, lng: longitude, isGps: true, address: "Current GPS Location", city: "Current Location" };
        setUserCoords(coords);
        setLocationSearchQuery("Current GPS Location");
        savePatientLocation(coords);
        setSortBy("nearest");
        setIsDetectingLocation(false);
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
        setLocationNotice("Location permission denied. Please allow location or type an address below.");
        setIsDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    if (newSort === "nearest" && !userCoords.lat) {
      requestUserLocation();
    }
  };
  const [headerData, setHeaderData] = useState({
    title: "TRUSTED DOCTORS",
    heading: "Meet Our Expert Doctors",
    subheading: "Board-certified healthcare professionals ready to provide exceptional care"
  });

  const handleLoginClick = () => {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  };

  const handleSignupClick = () => {
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  };

  const [specialties, setSpecialties] = useState(ALL_SPECIALTIES_FOR_FILTER);

  useEffect(() => {
    async function fetchSpecialties() {
      try {
        const res = await fetch("/api/cms/specialties");
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          const active = json.data
            .filter((s) => s.is_active !== false)
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
          const cmsNames = active.map((s) => s.name?.trim()).filter(Boolean);
          const merged = [
            "All Specialties",
            ...new Set([...ALL_SPECIALTIES_FOR_FILTER.slice(1), ...cmsNames]),
          ];
          setSpecialties(merged);
        } else {
          setSpecialties(ALL_SPECIALTIES_FOR_FILTER);
        }
      } catch (e) {
        setSpecialties(ALL_SPECIALTIES_FOR_FILTER);
      }
    }
    async function fetchHeaders() {
      try {
        const res = await fetch("/api/cms/section-headers?page=specialties");
        const json = await res.json();
        if (json.success && json.data && json.data.heading) {
          setHeaderData({
            title: json.data.title || "TRUSTED DOCTORS",
            heading: json.data.heading,
            subheading: json.data.subheading || ""
          });
        }
      } catch (e) {
        console.error("Failed to load CMS headers", e);
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
    fetchHeaders();
    fetchConditions();
  }, []);

  const loadDoctorsFromApi = async (targetPage = 1, isReset = false) => {
    try {
      if (isReset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError("");

      const res = await getDoctorsAction({
        page: targetPage,
        limit: 12,
        search: searchQuery.trim(),
        specialization: selectedSpecialty,
        appointmentMode: appointmentMode,
        feeFilter: feeFilter,
        experienceFilter: experienceFilter,
        addressSearch: locationSearchQuery.trim(),
        sortBy: sortBy,
        userLat: userCoords?.lat || null,
        userLng: userCoords?.lng || null,
      });

      const rawList = Array.isArray(res?.data) ? res.data : [];

      const mapped = rawList.map((doc) => {
        const details = doc.doctor_details || {};
        
        const clinicVal = details.clinic_consultation_fee ?? details.consultation_fee;
        const videoVal = details.video_consultation_fee;
        const homeVal = details.home_visit_fee;

        const clinicFeeNum = parseModeFeeNum(clinicVal);
        const videoFeeNum = parseModeFeeNum(videoVal);
        const homeFeeNum = parseModeFeeNum(homeVal);

        const modes = [];
        if (clinicFeeNum !== null && clinicFeeNum >= 0) {
          modes.push({
            id: "clinic",
            label: "Clinic",
            fee: clinicFeeNum,
            formatted: clinicFeeNum === 0 ? "Free (₹0)" : `₹${clinicFeeNum.toLocaleString("en-IN")}`,
          });
        }
        if (videoFeeNum !== null && videoFeeNum >= 0) {
          modes.push({
            id: "video",
            label: "Video",
            fee: videoFeeNum,
            formatted: videoFeeNum === 0 ? "Free (₹0)" : `₹${videoFeeNum.toLocaleString("en-IN")}`,
          });
        }
        if (homeFeeNum !== null && homeFeeNum >= 0) {
          modes.push({
            id: "home",
            label: "Home",
            fee: homeFeeNum,
            formatted: homeFeeNum === 0 ? "Free (₹0)" : `₹${homeFeeNum.toLocaleString("en-IN")}`,
          });
        }

        if (modes.length === 0) {
          modes.push({
            id: "clinic",
            label: "Clinic",
            fee: 0,
            formatted: "Available",
          });
        }

        const servedFees = modes.map((m) => m.fee);
        const minFee = servedFees.length > 0 ? Math.min(...servedFees) : null;

        let profileImage = "";
        if (details.passport_photo) {
          profileImage = Array.isArray(details.passport_photo) 
            ? details.passport_photo[0] 
            : details.passport_photo;
        }
        if (!profileImage && doc.profile_picture) {
          profileImage = doc.profile_picture;
        }
        if (profileImage && typeof profileImage === 'string' && profileImage.includes("ui-avatars.com")) {
          profileImage = "";
        }
        if (profileImage && typeof profileImage === 'string' && profileImage.includes("::text")) {
          const match = profileImage.match(/'([^']+)'/);
          profileImage = match ? match[1] : "";
        }

        return {
          id: doc.id,
          name: details.full_name || details.name || "Doctor",
          specialty: normalizeSpecialty(details.specialization),
          rating: typeof details.rating === "number" ? details.rating : null,
          reviews: typeof details.total_reviews === "number" && details.total_reviews > 0 ? details.total_reviews : null,
          location: cleanClinicAddress(details.clinic_address),
          experience: typeof details.experience_years === "number" && details.experience_years > 0 ? details.experience_years : null,
          profileImage: profileImage,
          distanceKm: doc.distanceKm != null ? doc.distanceKm : null,
          modes: modes,
          clinicFee: clinicFeeNum,
          clinicFeeFormatted: formatModeFee(clinicVal),
          videoFee: videoFeeNum,
          videoFeeFormatted: formatModeFee(videoVal),
          homeFee: homeFeeNum,
          homeFeeFormatted: formatModeFee(homeVal),
          minFee: minFee,
          channels: [],
        };
      });

      mapped.sort((a, b) => {
        if (sortBy === "nearest") {
          const distA = a.distanceKm != null ? a.distanceKm : 999999;
          const distB = b.distanceKm != null ? b.distanceKm : 999999;
          if (distA !== distB) return distA - distB;
          return (b.rating || 0) - (a.rating || 0);
        }
        if (sortBy === "rating_high") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "exp_high") return (b.experience || 0) - (a.experience || 0);
        if (sortBy === "fee_low") return (a.minFee ?? 99999) - (b.minFee ?? 99999);
        if (sortBy === "fee_high") return (b.minFee ?? 0) - (a.minFee ?? 0);
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        return 0;
      });

      setHasMore(res?.pagination?.hasNextPage ?? (mapped.length >= 12));
      if (typeof res?.pagination?.totalItems === "number") {
        setTotalDoctorsCount(res.pagination.totalItems);
      }

      if (isReset) {
        setDoctors(mapped);
      } else {
        setDoctors((prev) => [...prev, ...mapped]);
      }
    } catch (err) {
      console.error("Failed to load doctors via Server Action", err);
      setError("Unable to load available doctors right now. Please try again later.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadDoctorsFromApi(1, true);
  }, [searchQuery, selectedSpecialty, appointmentMode, feeFilter, experienceFilter, sortBy, userCoords?.lat, userCoords?.lng]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const preselected = searchParams?.get("selected");
    if (preselected) {
      setSelectedDoctorId(preselected);
    }
    const specialtyParam = searchParams?.get("specialty");
    if (specialtyParam) {
      setSelectedSpecialty(specialtyParam);
    }
    const searchParam = searchParams?.get("search") ?? searchParams?.get("q");
    if (searchParam !== null && searchParam !== undefined) {
      setSearchQuery(searchParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.hash === "#doctors-list" || url.searchParams.get("scroll") === "doctors-list") {
        setTimeout(() => {
          const target = document.getElementById("doctors-list");
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      }
    }
  }, [loading]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Page Header Bar - Matches Hero Section container width */}
      <div className="bg-white border-b border-slate-200/80 py-5 shadow-2xs">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Find & Book Doctors
              </h1>
              {(totalDoctorsCount > 0 || doctors.length > 0) && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#0067A1]/10 text-[#0067A1] px-3 py-0.5 rounded-full border border-[#0067A1]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0067A1] animate-pulse"></span>
                  {totalDoctorsCount > 0 ? totalDoctorsCount : doctors.length} Verified Specialists
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Browse top-rated medical specialists and book online video or in-clinic consultations
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/70 shrink-0">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <FaCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Verified Profiles
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="flex items-center gap-1.5 text-[#0067A1]">
              <FaShieldAlt className="w-3.5 h-3.5 text-[#0067A1]" />
              Zero Convenience Fee
            </span>
          </div>
        </div>
      </div>

      <div id="doctors-list" className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 scroll-mt-6">
        {/* Mobile Toolbar: Search + Quick Filter Drawer Trigger */}
        <div className="lg:hidden space-y-3 mb-6">
          {/* Mobile Search Bar */}
          <div className="relative shadow-2xs rounded-xl bg-white border border-slate-200 focus-within:border-[#0067A1]">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search doctor name, specialty, or clinic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 250);
              }}
              className="w-full pl-9 pr-9 py-2.5 text-xs bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 px-2 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Controls Bar */}
          <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1]/10 text-[#0067A1] rounded-lg text-xs font-bold hover:bg-[#0067A1]/20 transition-colors"
              >
                <FaFilter className="w-3 h-3 text-[#0067A1]" />
                <span>All Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-[#0067A1] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {userCoords?.lat ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 max-w-[200px] truncate">
                  <FaMapMarkerAlt className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">{userCoords.city || userCoords.address || "Near You"}</span>
                  <button
                    type="button"
                    onClick={clearLocation}
                    title="Clear Location"
                    className="text-emerald-700 hover:text-emerald-950 font-bold ml-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={requestUserLocation}
                  disabled={isDetectingLocation}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    sortBy === "nearest"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                  title="Sort doctors closest to your current location"
                >
                  <FaLocationArrow className={`w-2.5 h-2.5 ${isDetectingLocation ? "animate-spin text-[#0067A1]" : sortBy === "nearest" ? "text-emerald-600" : "text-slate-500"}`} />
                  <span>{isDetectingLocation ? "Locating..." : sortBy === "nearest" ? "Near Me (Active)" : "Near Me"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sort:</span>
              <CustomSelect
                options={[
                  { value: "recommended", label: "Recommended" },
                  { value: "nearest", label: "Nearest to Me" },
                  { value: "rating_high", label: "Rating: High" },
                  { value: "exp_high", label: "Exp: High" },
                  { value: "fee_low", label: "Fee: Low to High" },
                  { value: "fee_high", label: "Fee: High to Low" },
                  { value: "name_asc", label: "Name: A-Z" },
                ]}
                value={sortBy}
                onChange={handleSortChange}
                alignRight={true}
              />
            </div>
          </div>
          {locationNotice && (
            <div className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between">
              <span>{locationNotice}</span>
              <button
                onClick={() => setLocationNotice("")}
                className="text-amber-900 font-bold ml-2 text-xs"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 2-Column Responsive Layout for Desktop / Tablet */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left Sidebar Filter Panel (Desktop - Sticky) */}
          <div className="hidden lg:block w-72 shrink-0 self-start sticky top-24">
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                  <FaFilter className="w-3 h-3 text-[#0067A1]" />
                  <span>Filter Doctors</span>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpecialty("All Specialties");
                      setAppointmentMode("all");
                      setFeeFilter("all");
                      setExperienceFilter("all");
                      setSearchQuery("");
                      setSortBy("recommended");
                      clearLocation();
                      router.replace("/doctors", { scroll: false });
                    }}
                    className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Location / Address Search (Google Places API) */}
              <div className="space-y-1" ref={searchContainerRef}>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Location / Address
                  </label>
                  {userCoords?.lat && (
                    <button
                      type="button"
                      onClick={clearLocation}
                      className="text-[10px] font-medium text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Active Location Display */}
                {userCoords?.lat && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg px-2 py-1 flex items-center justify-between gap-1 text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FaMapMarkerAlt className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                      <span className="font-medium truncate text-[11px]">
                        {userCoords.address || userCoords.city || "Current Location"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearLocation}
                      className="text-emerald-700 hover:text-emerald-950 font-bold px-1"
                      title="Remove location filter"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="relative">
                  <div className="relative rounded-lg bg-white border border-slate-200 focus-within:border-[#0067A1] focus-within:ring-1 focus-within:ring-[#0067A1]/20 transition-all">
                    <FaMapMarkerAlt className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                    <input
                      type="text"
                      placeholder="Search city, area, address..."
                      value={locationSearchQuery}
                      onChange={(e) => handleLocationSearch(e.target.value)}
                      onFocus={() => {
                        if (locationSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      className="w-full pl-7.5 pr-13 py-1.5 text-xs bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                    {isSearchingLocation ? (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <div className="w-3 h-3 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={requestUserLocation}
                        disabled={isDetectingLocation}
                        title="Use my current GPS location"
                        className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-[#0067A1] border border-slate-200 rounded text-[10px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <FaLocationArrow className={`w-2 h-2 ${isDetectingLocation ? "animate-spin" : ""}`} />
                        <span>GPS</span>
                      </button>
                    )}
                  </div>

                  {/* Google Places Suggestions Dropdown */}
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      <div className="px-3 py-1 bg-slate-50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Google Places</span>
                        <span className="text-[9px] text-slate-400 font-normal">Select Address</span>
                      </div>
                      {locationSuggestions.map((sug, idx) => (
                        <button
                          key={sug.placeId || idx}
                          type="button"
                          onClick={() => handleSelectLocation(sug)}
                          className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-start gap-2 transition-colors cursor-pointer group"
                        >
                          <FaMapMarkerAlt className="w-2.5 h-2.5 text-[#0067A1] shrink-0 mt-1" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-slate-800 block truncate">
                              {sug.name || sug.text}
                            </span>
                            {(sug.secondaryText || sug.secondary_text) && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                {sug.secondaryText || sug.secondary_text}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Search Box */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Search
                </label>
                <div className="relative rounded-lg bg-white border border-slate-200 focus-within:border-[#0067A1] focus-within:ring-1 focus-within:ring-[#0067A1]/20 transition-all">
                  <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                  <input
                    type="text"
                    placeholder="Doctor, specialty, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7.5 pr-7 py-1.5 text-xs bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Consultation Mode Filter - Single Word Minimal Chips */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Consultation Mode
                  </label>
                  {appointmentMode !== "all" && (
                    <button
                      type="button"
                      onClick={() => setAppointmentMode("all")}
                      className="text-[10px] font-medium text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { value: "all", label: "All", icon: FaUserMd },
                    { value: "clinic", label: "Clinic", icon: FaClinicMedical },
                    { value: "video", label: "Video", icon: FaVideo },
                    { value: "home", label: "Home", icon: FaHome },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = appointmentMode === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setAppointmentMode(m.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-[#0067A1] text-white border-[#0067A1]"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <Icon className={`w-3 h-3 ${isSelected ? "text-white" : "text-[#0067A1]"}`} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specialty Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Medical Specialty
                </label>
                <CustomSelect
                  options={specialties}
                  value={selectedSpecialty}
                  onChange={(val) => setSelectedSpecialty(val)}
                  searchable={true}
                  placeholder="Select Specialty"
                  fullWidth={true}
                />
              </div>

              {/* Consultation Fee Filter with Minimal Segmented Buttons */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Consultation Fee
                  </label>
                  {feeFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setFeeFilter("all")}
                      className="text-[10px] font-medium text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { value: "all", label: "All" },
                    { value: "under_500", label: "< ₹500" },
                    { value: "500_1000", label: "₹500 - 1k" },
                    { value: "above_1000", label: "> ₹1,000" },
                  ].map((pill) => (
                    <button
                      key={pill.value}
                      type="button"
                      onClick={() => setFeeFilter(pill.value)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        feeFilter === pill.value
                          ? "bg-[#0067A1] text-white border-[#0067A1]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor Experience Filter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Experience
                  </label>
                  {experienceFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setExperienceFilter("all")}
                      className="text-[10px] font-medium text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { value: "all", label: "All" },
                    { value: "5", label: "5+ yrs" },
                    { value: "10", label: "10+ yrs" },
                    { value: "15", label: "15+ yrs" },
                  ].map((pill) => (
                    <button
                      key={pill.value}
                      type="button"
                      onClick={() => setExperienceFilter(pill.value)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        experienceFilter === pill.value
                          ? "bg-[#0067A1] text-white border-[#0067A1]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Sort By
                </label>
                <CustomSelect
                  options={[
                    { value: "recommended", label: "Recommended" },
                    { value: "nearest", label: "Nearest to Me" },
                    { value: "rating_high", label: "Rating: High to Low" },
                    { value: "exp_high", label: "Experience: High to Low" },
                    { value: "fee_low", label: "Fee: Low to High" },
                    { value: "fee_high", label: "Fee: High to Low" },
                    { value: "name_asc", label: "Name: A to Z" },
                  ]}
                  value={sortBy}
                  onChange={handleSortChange}
                  fullWidth={true}
                />
              </div>

              {/* Trust Badge at bottom of sidebar - Ultra Minimal */}
              <div className="pt-2 border-t border-slate-100">
                <div className="bg-slate-50/70 rounded-lg p-2 border border-slate-100 text-slate-600 text-xs flex items-center gap-2">
                  <FaShieldAlt className="w-3.5 h-3.5 text-[#0067A1] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-700 block text-[11px] leading-tight">100% Verified Profiles</span>
                    <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">Medical council registrations verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Content Column */}
          <div className="flex-1 min-w-0 space-y-4">
            {!searchQuery && (
              <ConditionsStrip
                conditions={conditions}
                onSelectCondition={(slug) => router.push(`/problem/${slug}`)}
              />
            )}

            <div id="doctors-list" className="relative">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3.5 sm:gap-4 mb-6">
                  {[...Array(6)].map((_, i) => (
                    <DoctorCardSkeleton key={i} />
                  ))}
                </div>
              ) : error ? (
                <p className="text-center text-red-500 py-8 text-sm font-medium bg-white rounded-xl border border-slate-200">{error}</p>
              ) : doctors.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center my-2 shadow-2xs">
                  <FaUserMd className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-800">No doctors match your criteria</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Try adjusting your search query or clear active filters to see all available verified doctors.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedSpecialty("All Specialties");
                      setAppointmentMode("all");
                      setFeeFilter("all");
                      setExperienceFilter("all");
                      setSearchQuery("");
                      setSortBy("recommended");
                      clearLocation();
                      router.replace("/doctors", { scroll: false });
                      setPage(1);
                      loadDoctorsFromApi(1, true);
                    }}
                    className="mt-4 px-4 py-2 bg-[#0067A1] text-white text-xs font-semibold rounded-lg hover:bg-[#004F7C] transition-all shadow-2xs"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Responsive Grid of Doctor Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3.5 sm:gap-4 mb-6">
                    {doctors.map((doctor, index) => (
                      <DoctorCard
                        key={doctor.id || index}
                        doctor={doctor}
                        activeMode={appointmentMode}
                        feeFilter={feeFilter}
                        isHighlighted={selectedDoctorId && String(selectedDoctorId) === String(doctor.id)}
                        onSelect={() => setSelectedDoctorId(doctor.id)}
                        onOpenProfile={(chosenMode) => {
                          const modeQuery = chosenMode && chosenMode !== "all" ? `?mode=${chosenMode}` : "";
                          if (typeof window !== "undefined" && chosenMode && chosenMode !== "all") {
                            try {
                              sessionStorage.setItem("preferred_consultation_mode", chosenMode);
                            } catch {}
                          }
                          router.push(`/doctor/${doctor.id}${modeQuery}`);
                        }}
                      />
                    ))}
                  </div>

                  {/* Load More Button via API */}
                  {hasMore && (
                    <div className="text-center mb-12">
                      <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() => {
                          const nextPage = page + 1;
                          setPage(nextPage);
                          loadDoctorsFromApi(nextPage, false);
                        }}
                        className="px-6 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2"
                      >
                        {loadingMore ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading...</span>
                          </>
                        ) : (
                          <span>Load More {totalDoctorsCount > doctors.length ? `(${totalDoctorsCount - doctors.length} more)` : ""}</span>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Up Bottom Sheet Filter Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center lg:hidden bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-t-2xl max-h-[85vh] p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-bottom-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FaFilter className="w-3.5 h-3.5 text-[#0067A1]" />
                <h3 className="font-semibold text-slate-900 text-sm">Filter & Sort Doctors</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-semibold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Filter Content Scrollable */}
            <div className="space-y-4 overflow-y-auto py-3 pr-1">
              {/* Location / Address Search (Google Places API) */}
              <div className="space-y-1.5" ref={mobileSearchContainerRef}>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                    Location / Address
                  </label>
                  {userCoords?.lat && (
                    <button
                      type="button"
                      onClick={clearLocation}
                      className="text-[10px] font-medium text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Active Location Display in Mobile */}
                {userCoords?.lat && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-1 text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FaMapMarkerAlt className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="font-medium truncate text-[11px]">
                        {userCoords.address || userCoords.city || "Current Location"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearLocation}
                      className="text-emerald-700 hover:text-emerald-950 font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="relative">
                  <div className="relative rounded-lg bg-slate-50 border border-slate-200 focus-within:border-[#0067A1] focus-within:ring-2 focus-within:ring-[#0067A1]/15 transition-all">
                    <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                    <input
                      type="text"
                      placeholder="Search city, area, address..."
                      value={locationSearchQuery}
                      onChange={(e) => handleLocationSearch(e.target.value)}
                      onFocus={() => {
                        if (locationSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      className="w-full pl-8 pr-16 py-2 text-xs bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                    {isSearchingLocation ? (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <div className="w-3.5 h-3.5 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={requestUserLocation}
                        disabled={isDetectingLocation}
                        title="Use GPS"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-white hover:bg-slate-100 text-[#0067A1] border border-slate-200 rounded text-[10px] font-semibold flex items-center gap-1"
                      >
                        <FaLocationArrow className={`w-2.5 h-2.5 ${isDetectingLocation ? "animate-spin" : ""}`} />
                        <span>GPS</span>
                      </button>
                    )}
                  </div>

                  {/* Google Places Suggestions Dropdown in Mobile */}
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Google Places</span>
                        <span className="text-[9px] text-slate-400 font-normal">Select Address</span>
                      </div>
                      {locationSuggestions.map((sug, idx) => (
                        <button
                          key={sug.placeId || idx}
                          type="button"
                          onClick={() => handleSelectLocation(sug)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer group"
                        >
                          <FaMapMarkerAlt className="w-3 h-3 text-[#0067A1] shrink-0 mt-1" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-slate-800 block truncate">
                              {sug.name || sug.text}
                            </span>
                            {(sug.secondaryText || sug.secondary_text) && (
                              <span className="text-[10px] text-slate-500 block truncate">
                                {sug.secondaryText || sug.secondary_text}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Consultation Mode Filter in Mobile */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Consultation Mode
                  </label>
                  {appointmentMode !== "all" && (
                    <button
                      type="button"
                      onClick={() => setAppointmentMode("all")}
                      className="text-[10px] font-medium text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { value: "all", label: "All", icon: FaUserMd },
                    { value: "clinic", label: "Clinic", icon: FaClinicMedical },
                    { value: "video", label: "Video", icon: FaVideo },
                    { value: "home", label: "Home", icon: FaHome },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = appointmentMode === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setAppointmentMode(m.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-[#0067A1] text-white border-[#0067A1]"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className={`w-3 h-3 ${isSelected ? "text-white" : "text-[#0067A1]"}`} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specialty Custom Select with Search */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Medical Specialty
                </label>
                <CustomSelect
                  options={specialties}
                  value={selectedSpecialty}
                  onChange={(val) => setSelectedSpecialty(val)}
                  searchable={true}
                  fullWidth={true}
                  placeholder="Select Specialty"
                />
              </div>

              {/* Consultation Fee Custom Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Consultation Fee
                </label>
                <CustomSelect
                  options={[
                    { value: "all", label: "All Fees" },
                    { value: "under_500", label: "< ₹500" },
                    { value: "500_1000", label: "₹500 - 1k" },
                    { value: "above_1000", label: "> ₹1,000" },
                  ]}
                  value={feeFilter}
                  onChange={(val) => setFeeFilter(val)}
                  fullWidth={true}
                />
              </div>

              {/* Experience Custom Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Doctor Experience
                </label>
                <CustomSelect
                  options={[
                    { value: "all", label: "All Experience" },
                    { value: "5", label: "5+ Years" },
                    { value: "10", label: "10+ Years" },
                    { value: "15", label: "15+ Years" },
                  ]}
                  value={experienceFilter}
                  onChange={(val) => setExperienceFilter(val)}
                  fullWidth={true}
                />
              </div>

              {/* Sort By Custom Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Sort By
                </label>
                <CustomSelect
                  options={[
                    { value: "recommended", label: "Recommended" },
                    { value: "nearest", label: "Nearest to Me" },
                    { value: "rating_high", label: "Rating: High to Low" },
                    { value: "exp_high", label: "Experience: High to Low" },
                    { value: "fee_low", label: "Fee: Low to High" },
                    { value: "fee_high", label: "Fee: High to Low" },
                    { value: "name_asc", label: "Name: A to Z" },
                  ]}
                  value={sortBy}
                  onChange={handleSortChange}
                  fullWidth={true}
                />
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedSpecialty("All Specialties");
                  setAppointmentMode("all");
                  setFeeFilter("all");
                  setExperienceFilter("all");
                  setSearchQuery("");
                  setSortBy("recommended");
                  clearLocation();
                  router.replace("/doctors", { scroll: false });
                  setIsMobileFilterOpen(false);
                }}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-white bg-[#0067A1] hover:bg-[#004F7C] rounded-lg transition-colors shadow-xs"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Section - Animated Lottie & Interactive Steps */}
      <HowItWorksSteps />

      {/* CTA Section - Home page aligned */}
      <section className="w-full bg-[#0B3A5B] py-10 sm:py-14 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            When You&apos;re Ready to Consult
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mb-6 leading-relaxed">
            Organise your healthcare journey with verified doctors and continuing care support on MediConnect.fit.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={handleSignupClick}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-white text-[#0B3A5B] hover:bg-slate-100 text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              Sign Up
            </button>
            <button
              onClick={handleLoginClick}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl border border-white/40 text-white hover:bg-white/10 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>
      </section>

      {/* Modals */}
      {isLoginOpen && (
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onSignupClick={handleSignupClick}
        />
      )}
      {isSignupOpen && (
        <SignupModal
          isOpen={isSignupOpen}
          onClose={() => setIsSignupOpen(false)}
          onLoginClick={handleLoginClick}
        />
      )}
    </div>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading doctors...</div>}>
      <DoctorsContent />
    </Suspense>
  );
}
