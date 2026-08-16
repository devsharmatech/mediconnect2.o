"use client";

import React, { useState, useEffect, Suspense } from "react";
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
} from "react-icons/fa";
import { HiOutlineBadgeCheck } from "react-icons/hi";
import dynamic from "next/dynamic";


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

const DoctorCard = ({ doctor, isHighlighted, onSelect, onOpenProfile }) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(); }}
      className={`group w-full text-left cursor-pointer rounded-xl transition-all bg-white border ${
        isHighlighted ? "border-[#0067A1] ring-2 ring-[#0067A1]/20" : "border-slate-200 hover:border-[#0067A1] hover:shadow-sm"
      } flex flex-col h-full overflow-hidden p-4 shadow-xs`}
    >
      {/* Doctor Header Info */}
      <div className="flex gap-3 items-start mb-3">
        <div className="relative shrink-0">
          <div className="h-16 w-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
            <img
              src={doctor.profileImage || "/dr.png"}
              alt={doctor.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden absolute inset-0 bg-[#0067A1]/10 items-center justify-center text-[#0067A1] font-bold text-base">
              {doctor.name ? doctor.name.charAt(0) : "D"}
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
            <FaCheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-[#0067A1] transition-colors">
            {doctor.name}
          </h3>
          <p className="text-xs font-semibold text-[#0067A1] truncate mt-0.5">
            {doctor.specialty}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            {typeof doctor.rating === "number" && doctor.rating > 0 ? (
              <div className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold text-amber-800 border border-amber-200/60">
                <FaStar className="h-3 w-3 text-amber-500" />
                <span>{doctor.rating.toFixed(1)}</span>
                {doctor.reviews && <span className="text-amber-700/70 font-normal">({doctor.reviews})</span>}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                <HiOutlineBadgeCheck className="h-3.5 w-3.5" />
                Verified Specialist
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Doctor Meta Details */}
      <div className="space-y-1.5 border-t border-slate-100 pt-3 mb-3 text-xs text-slate-600 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Experience</span>
          <span className="font-semibold text-slate-800">
            {doctor.experience ? `${doctor.experience}+ Years` : "Verified"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Location</span>
          <span className="font-semibold text-slate-800 truncate max-w-[130px]" title={doctor.location}>
            {doctor.location || "India"}
          </span>
        </div>
      </div>

      {/* Footer Fee & CTA */}
      <div className="border-t border-slate-100 pt-3 flex items-center justify-between mt-auto">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Consultation</span>
          <span className="text-sm font-bold text-slate-900">
            {doctor.fee ? `₹${doctor.fee}` : "TBD"}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenProfile();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0067A1] text-white text-xs font-semibold rounded-lg hover:bg-[#004F7C] transition-colors shadow-xs"
        >
          <FaVideo className="h-3 w-3" />
          <span>Book Slot</span>
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
        className={`px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold focus:outline-none focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all flex items-center justify-between gap-2 shadow-2xs ${
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
        <div className={`absolute ${alignRight ? "right-0 left-auto" : "left-0"} mt-1.5 ${fullWidth ? "w-full" : "w-56"} max-h-64 overflow-hidden bg-white border border-slate-200 rounded-xl shadow-2xl z-[10001] p-2 animate-in fade-in slide-in-from-top-1 duration-150`}>
          {searchable && (
            <div className="p-1 mb-1.5 border-b border-slate-100">
              <div className="relative">
                <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                <input
                  type="text"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0067A1]"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="space-y-0.5 max-h-48 overflow-y-auto hide-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2.5 text-slate-400 text-center italic text-xs">No matching options</div>
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
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between font-semibold text-xs transition-colors ${
                      isSelected
                        ? "bg-[#0067A1]/10 text-[#0067A1]"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate">{optLabel}</span>
                    {isSelected && <FaCheckCircle className="w-3.5 h-3.5 text-[#0067A1] shrink-0 ml-2" />}
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
  const [searchQuery, setSearchQuery] = useState("");
  
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
  const [totalDoctorsCount, setTotalDoctorsCount] = useState(0);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const activeFilterCount = (selectedSpecialty !== "All Specialties" ? 1 : 0) + (feeFilter !== "all" ? 1 : 0) + (searchQuery.trim() !== "" ? 1 : 0);
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
        feeFilter: feeFilter,
        sortBy: sortBy,
      });

      const rawList = Array.isArray(res?.data) ? res.data : [];

      const mapped = rawList.map((doc) => {
        const details = doc.doctor_details || {};
        const rawFee = details.clinic_consultation_fee || details.video_consultation_fee || details.home_visit_fee;
        const numericFee = typeof rawFee === "number" ? rawFee : rawFee ? Number(rawFee) : NaN;

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
          fee: Number.isFinite(numericFee) && numericFee > 0 ? numericFee : null,
          profileImage: profileImage,
          channels: [],
        };
      });

      mapped.sort((a, b) => {
        if (sortBy === "rating_high") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "exp_high") return (b.experience || 0) - (a.experience || 0);
        if (sortBy === "fee_low") return (a.fee || 99999) - (b.fee || 99999);
        if (sortBy === "fee_high") return (b.fee || 0) - (a.fee || 0);
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
  }, [searchQuery, selectedSpecialty, feeFilter, sortBy]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const preselected = url.searchParams.get("selected");
    if (preselected) {
      setSelectedDoctorId(preselected);
    }
    const specialtyParam = url.searchParams.get("specialty");
    if (specialtyParam) {
      setSelectedSpecialty(specialtyParam);
    }
  }, []);

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
      {/* Top Page Header Bar (No Hero Section) */}
      <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>Find & Book Doctors</span>
              {(totalDoctorsCount > 0 || doctors.length > 0) && (
                <span className="text-xs font-semibold bg-[#0067A1]/10 text-[#0067A1] px-2.5 py-0.5 rounded-full">
                  {totalDoctorsCount > 0 ? totalDoctorsCount : doctors.length} Verified
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Browse specialists and book online or in-clinic consultations
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sort:</span>
              <CustomSelect
                options={[
                  { value: "recommended", label: "Recommended" },
                  { value: "rating_high", label: "Rating: High" },
                  { value: "exp_high", label: "Exp: High" },
                  { value: "fee_low", label: "Fee: Low to High" },
                  { value: "fee_high", label: "Fee: High to Low" },
                  { value: "name_asc", label: "Name: A-Z" },
                ]}
                value={sortBy}
                onChange={(val) => setSortBy(val)}
                alignRight={true}
              />
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout for Desktop / Tablet */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar Filter Panel (Desktop) */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs sticky top-20 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <FaFilter className="w-3.5 h-3.5 text-[#0067A1]" />
                  <span>Filter Doctors</span>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpecialty("All Specialties");
                      setFeeFilter("all");
                      setSearchQuery("");
                      setSortBy("recommended");
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Search Box */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Search Query
                </label>
                <div className="relative rounded-lg bg-slate-50 border border-slate-200 focus-within:border-[#0067A1]">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                  <input
                    type="text"
                    placeholder="Doctor, specialty, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 text-xs bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 hover:text-slate-700"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Specialty Select */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Specialty
                </label>
                <CustomSelect
                  options={specialties}
                  value={selectedSpecialty}
                  onChange={(val) => setSelectedSpecialty(val)}
                  searchable={true}
                  placeholder="Select Specialty"
                />
              </div>

              {/* Fee Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Consultation Fee
                </label>
                <CustomSelect
                  options={[
                    { value: "all", label: "All Fees" },
                    { value: "under_500", label: "Under ₹500" },
                    { value: "500_1000", label: "₹500 - ₹1,000" },
                    { value: "above_1000", label: "Above ₹1,000" },
                  ]}
                  value={feeFilter}
                  onChange={(val) => setFeeFilter(val)}
                />
              </div>

              {/* Sort By Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Sort By
                </label>
                <CustomSelect
                  options={[
                    { value: "recommended", label: "Recommended" },
                    { value: "rating_high", label: "Rating: High to Low" },
                    { value: "exp_high", label: "Experience: High to Low" },
                    { value: "fee_low", label: "Fee: Low to High" },
                    { value: "fee_high", label: "Fee: High to Low" },
                    { value: "name_asc", label: "Name: A to Z" },
                  ]}
                  value={sortBy}
                  onChange={(val) => setSortBy(val)}
                />
              </div>
            </div>
          </div>

          {/* Right Main Content Column */}
          <div className="flex-1 space-y-4">
            {!searchQuery && (
              <ConditionsStrip
                conditions={conditions}
                onSelectCondition={(slug) => router.push(`/website/problem/${slug}`)}
              />
            )}

            <div id="doctors-list" className="relative">
              {loading ? (
                <div className="text-center text-slate-500 py-12 space-y-2 bg-white rounded-xl border border-slate-200">
                  <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm font-medium">Loading verified medical specialists...</p>
                </div>
              ) : error ? (
                <p className="text-center text-red-500 py-8 text-sm font-medium bg-white rounded-xl border border-slate-200">{error}</p>
              ) : doctors.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center my-2">
                  <FaUserMd className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No doctors match your criteria</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Try adjusting your search query or clear the active filters to see available doctors.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedSpecialty("All Specialties");
                      setFeeFilter("all");
                      setSearchQuery("");
                      setSortBy("recommended");
                      setPage(1);
                      loadDoctorsFromApi(1, true);
                    }}
                    className="mt-4 px-4 py-2 bg-[#0067A1] text-white text-xs font-semibold rounded-lg hover:bg-[#004F7C] transition-colors"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Grid of Doctor Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4.5 mb-8">
                    {doctors.map((doctor, index) => (
                      <DoctorCard
                        key={doctor.id || index}
                        doctor={doctor}
                        isHighlighted={selectedDoctorId && String(selectedDoctorId) === String(doctor.id)}
                        onSelect={() => setSelectedDoctorId(doctor.id)}
                        onOpenProfile={() => router.push(`/website/doctor/${doctor.id}`)}
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
                        className="px-6 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs inline-flex items-center gap-2"
                      >
                        {loadingMore ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading More Doctors...</span>
                          </>
                        ) : (
                          <span>Load More Doctors</span>
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
                <h3 className="font-bold text-slate-900 text-sm">Filter & Sort Doctors</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Filter Content Scrollable */}
            <div className="space-y-5 overflow-y-auto py-4 pr-1">
              {/* Specialty Custom Select with Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
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
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Consultation Fee
                </label>
                <CustomSelect
                  options={[
                    { value: "all", label: "All Fees" },
                    { value: "under_500", label: "Under ₹500" },
                    { value: "500_1000", label: "₹500 - ₹1,000" },
                    { value: "above_1000", label: "Above ₹1,000" },
                  ]}
                  value={feeFilter}
                  onChange={(val) => setFeeFilter(val)}
                  fullWidth={true}
                />
              </div>

              {/* Sort By Custom Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Sort By
                </label>
                <CustomSelect
                  options={[
                    { value: "recommended", label: "Recommended" },
                    { value: "rating_high", label: "Rating: High to Low" },
                    { value: "exp_high", label: "Experience: High to Low" },
                    { value: "fee_low", label: "Fee: Low to High" },
                    { value: "fee_high", label: "Fee: High to Low" },
                    { value: "name_asc", label: "Name: A to Z" },
                  ]}
                  value={sortBy}
                  onChange={(val) => setSortBy(val)}
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
                  setFeeFilter("all");
                  setSearchQuery("");
                  setSortBy("recommended");
                  setIsMobileFilterOpen(false);
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-[#0067A1] hover:bg-[#004F7C] rounded-lg transition-colors shadow-xs"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It <span className="text-[#0067A1]">Works</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started with doctor consultations in 3 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0067A1] shadow-sm">
                  <FaFilter className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0067A1] bg-white text-sm font-bold text-[#0067A1]">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Choose Doctor Specialty
              </h3>
              <p className="text-gray-600">
                Select the medical specialty relevant to your health concern
              </p>
            </div>

            <div className="text-center">
              <div className="relative mb-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0067A1] shadow-sm">
                  <FaUserMd className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0067A1] bg-white text-sm font-bold text-[#0067A1]">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Choose Your Doctor
              </h3>
              <p className="text-gray-600">
                Browse verified doctors and pick the one that suits your needs
              </p>
            </div>

            <div className="text-center">
              <div className="relative mb-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0067A1] shadow-sm">
                  <FaCalendarCheck className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0067A1] bg-white text-sm font-bold text-[#0067A1]">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Choose Time & Book Appointment
              </h3>
              <p className="text-gray-600">
                Pick a convenient time slot and book your appointment instantly
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#003358] py-5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div>
            <h2 className="mb-4 text-3xl md:text-4xl font-bold text-white">
              When You&apos;re Ready to Consult
            </h2>
            <p className="mb-8 max-w-2xl mx-auto text-base text-gray-200">
              You can use mediconnect.fit to organise consultations responsibly.
              Availability of doctors and services may vary by location and over
              time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleSignupClick}
                className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#0067A1]"
              >
                Sign Up Now
              </button>
              <button
                onClick={handleLoginClick}
                className="rounded-full border border-white/70 px-8 py-3 text-sm font-semibold text-white"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>

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
