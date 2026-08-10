"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
      className={`group w-full text-left cursor-pointer rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white border ${isHighlighted ? "border-[#0067A1] ring-1 ring-[#0067A1]" : "border-gray-200"
        } flex flex-col h-full overflow-hidden relative`}
    >
      <div className="p-6 md:p-7 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex gap-4 md:gap-5 mb-5">
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 flex items-center justify-center">
              <img
                src={doctor.profileImage || "/dr.png"}
                alt={doctor.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden absolute inset-0 bg-[#0067A1]/10 items-center justify-center text-xl font-bold text-[#0067A1]">
                {doctor.name.charAt(0)}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-[2px] shadow-sm">
              <FaCheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 truncate tracking-tight">
              {doctor.name}
            </h3>
            <p className="text-[15px] font-semibold text-[#0067A1] truncate mt-0.5">
              {doctor.specialty}
            </p>
            <div className="mt-1.5 flex items-center">
              {typeof doctor.rating === "number" && doctor.rating > 0 && typeof doctor.reviews === "number" && doctor.reviews > 0 ? (
                <div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                  <FaStar className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs font-bold text-yellow-700">
                    {doctor.rating.toFixed(1)} <span className="font-medium opacity-80">({doctor.reviews})</span>
                  </span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  <HiOutlineBadgeCheck className="h-4 w-4" />
                  DMC Specialist
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info List */}
        <div className="mb-6 space-y-3 px-1 flex-1">
          <div className="flex items-center gap-3">
            <div className="bg-[#0067A1]/10 p-1.5 rounded-lg shrink-0">
              <FaClock className="h-3.5 w-3.5 text-[#0067A1]" />
            </div>
            <span className="text-[15px] text-gray-600 truncate">
              {typeof doctor.experience === "number" && doctor.experience > 0
                ? <><span className="font-semibold text-gray-800">{doctor.experience}+</span> Years Experience</>
                : "Experience verified"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#0067A1]/10 p-1.5 rounded-lg shrink-0">
              <FaCalendarAlt className="h-3.5 w-3.5 text-[#0067A1]" />
            </div>
            <span className="text-[15px] font-medium text-emerald-600">Available Today</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-auto grid grid-cols-[1fr,auto] gap-3 items-center border-t border-gray-100 pt-5">
          <div className="flex flex-col">
            <span className="text-[11px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Consultation Fee</span>
            {doctor.fee ? (
              <div className="text-lg font-bold text-gray-900 mt-0.5">
                ₹{doctor.fee}
              </div>
            ) : (
              <div className="text-sm font-semibold text-gray-600 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis pr-2" title="Shared upon booking">
                TBD
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile();
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#0067A1] px-4 md:px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0067A1]/20 hover:bg-[#004F7C] transition-all group-hover:shadow-lg active:scale-95 whitespace-nowrap"
          >
            <FaVideo className="h-4 w-4 shrink-0" />
            <span>Book Now</span>
          </button>
        </div>
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
  const [error, setError] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(9);
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

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/doctors/get?limit=100");
        const json = await res.json();
        const allDocs = Array.isArray(json?.data) ? json.data : [];

        const mapped = allDocs
          .filter((doc) => {
            const details = doc.doctor_details || {};
            // Check if doctor has any availability slots configured
            const hasHomeSlots = details.home_slots && Object.keys(details.home_slots).length > 0 && JSON.stringify(details.home_slots) !== '{}';
            const hasClinicSlots = details.clinic_slots && Object.keys(details.clinic_slots).length > 0 && JSON.stringify(details.clinic_slots) !== '{}';
            const hasAvailability = hasHomeSlots || hasClinicSlots;

            return (details.onboarding_status === "approved" || doc.status === 1) && hasAvailability;
          })
          .map((doc) => {
            const details = doc.doctor_details || {};
            const rawFee = details.clinic_consultation_fee || details.video_consultation_fee || details.home_visit_fee;
            const numericFee =
              typeof rawFee === "number" ? rawFee : rawFee ? Number(rawFee) : NaN;

            // Fix malformed profile image from DB (e.g. "'url'::text")
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
              reviews:
                typeof details.total_reviews === "number" && details.total_reviews > 0
                  ? details.total_reviews
                  : null,
              location: cleanClinicAddress(details.clinic_address),
              experience:
                typeof details.experience_years === "number" && details.experience_years > 0
                  ? details.experience_years
                  : null,
              fee: Number.isFinite(numericFee) && numericFee > 0 ? numericFee : null,
              profileImage: profileImage,
              channels: [],
            };
          });

        setDoctors(mapped);
      } catch (err) {
        console.error("Failed to load doctors", err);
        setError(
          "Unable to load available doctors right now. Please try again later.",
        );
      } finally {
        setLoading(false);
      }
    };


    fetchDoctors();
  }, []);

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
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Hero Section - compact with primary background */}
      <div className="mb-10  bg-[#0067A1] px-6 py-10 md:px-10 md:py-12 text-center text-white">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <FaUserMd className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
          Find the Right Doctor for Your Need
        </h1>
        <p className="mt-2 text-sm md:text-base text-white/80 max-w-2xl mx-auto">
          Browse verified specialists across key departments and book online or
          in-clinic consultations in a few simple steps.
        </p>
      </div>
      <div className="relative overflow-visible">
        <div className={`relative container mx-auto px-4 sm:px-4 lg:px-4 ${searchQuery ? "pb-4" : "pb-12 md:pb-16"}`}>
          

          {/* Filter Section */}
          <div className={`${searchQuery ? "mb-0" : "mb-8"} w-full`}>
            {/* Search Input Bar */}
            <div className={`w-full max-w-2xl mx-auto px-4 ${searchQuery ? "mb-0" : "mb-8"}`}>
              <div className="relative shadow-md rounded-2xl">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search doctors by name, specialty, or clinic location..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(9);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const target = document.getElementById("doctors-list");
                      if (target) {
                        target.scrollIntoView({ behavior: "smooth" });
                      }
                    }
                  }}
                  className="w-full pl-12 pr-10 py-4 text-base border border-gray-150 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setVisibleCount(9);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-medium text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {!searchQuery && (
              <>
                <div className="w-full max-w-full mx-auto relative px-6 mt-4">
                  <ConditionsStrip
                    conditions={conditions}
                    onSelectCondition={(slug) => router.push(`/website/problem/${slug}`)}
                  />
                </div>

                <div className="flex flex-col items-center justify-center space-y-4 w-full max-w-full mx-auto relative px-4 mt-8">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Choose a Specialty
                  </h3>
                  <SpecialtyFilter
                    specialties={specialties}
                    selectedSpecialty={selectedSpecialty}
                    onSelect={(s) => {
                      setSelectedSpecialty(s);
                      setVisibleCount(9);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Featured Doctors Section */}
      <div id="doctors-list" className="relative container mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className={`text-center ${searchQuery ? "mb-6 mt-4" : "mb-12"}`}>
          <div className="mb-4 inline-block rounded-full bg-[#0067A1]/5 px-6 py-2">
            <span className="text-sm font-semibold text-[#0067A1]">
              {headerData.title}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {headerData.heading.replace('Expert Doctors', '')} <span className="text-[#0067A1]">Expert Doctors</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {headerData.subheading}
          </p>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">
            Loading available doctors...
          </p>
        ) : error ? (
          <p className="text-center text-red-500 py-8">{error}</p>
        ) : doctors.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No doctors are available at the moment. Please check again later.
          </p>
        ) : (
          (() => {
            const filteredDoctors = doctors.filter((doctor) => {
              if (searchQuery.trim() !== "") {
                const query = searchQuery.toLowerCase().trim();
                const name = (doctor.name || "").toLowerCase();
                const specialty = (doctor.specialty || "").toLowerCase();
                const location = (doctor.location || "").toLowerCase();
                
                // Escape regex characters
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedQuery}`, 'i');
                
                const isSpecialtyMatch = regex.test(specialty);
                const isLocationMatch = regex.test(location);

                if (!name.includes(query) && !isSpecialtyMatch && !isLocationMatch) {
                  return false;
                }
              }

              // 2. Filter by Selected Specialty
              if (selectedSpecialty === "All Specialties") return true;

              const docSpec = (doctor.specialty || "").toLowerCase();
              const target = selectedSpecialty.toLowerCase();

              const checkWordMatch = (sourceStr, searchWord) => {
                const escaped = searchWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escaped}\\b`, 'i');
                return regex.test(sourceStr);
              };

              // Direct whole-word match for multiple specialties
              if (checkWordMatch(docSpec, target) || checkWordMatch(target, docSpec)) return true;

              // Advanced synonym matching to bridge CMS vs Onboarding discrepancies
              // Creates conceptual "clusters" of words. If both the selected filter AND 
              // the doctor's specialty contain a word from the same cluster, they match.
              const clusters = [
                ["dentistry", "dentist", "dental", "teeth"],
                ["general physician", "general medicine", "family physician", "gp", "physician"],
                ["gynecology", "gynaecology", "gynecologist", "obstetrics", "obgyn"],
                ["pediatrics", "paediatrics", "pediatrician", "child", "children"],
                ["orthopedics", "orthopaedics", "orthopedic", "bone", "joints"],
                ["ent", "ear nose throat", "otolaryngology", "ear, nose"],
                ["cardiology", "cardiologist", "heart", "cardio"],
                ["ophthalmology", "eye", "ophthalmologist", "vision"],
                ["dermatology", "skin", "dermatologist", "hair"],
                ["psychiatry", "mental health", "psychiatrist", "psychology"],
                ["nephrology", "nephrologist", "kidney", "renal"],
                ["surgery", "surgeon", "general surgery", "surgical"]
              ];

              for (const cluster of clusters) {
                // 1. Does the selected filter match any word in this cluster (whole-word)?
                const isFilterInCluster = cluster.some(word => checkWordMatch(target, word) || checkWordMatch(word, target));

                if (isFilterInCluster) {
                  // 2. Does the doctor's string match any word in this cluster (whole-word)?
                  const isDoctorInCluster = cluster.some(word => checkWordMatch(docSpec, word));
                  if (isDoctorInCluster) return true;
                }
              }

              return false;
            });

            if (filteredDoctors.length === 0) {
              return (
                <p className="text-center text-gray-500 py-8">
                  No doctors found for this specialty.
                </p>
              );
            }

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {filteredDoctors.slice(0, visibleCount).map((doctor, index) => (
                    <DoctorCard
                      key={doctor.id || index}
                      doctor={doctor}
                      isHighlighted={selectedDoctorId && String(selectedDoctorId) === String(doctor.id)}
                      onSelect={() => setSelectedDoctorId(doctor.id)}
                      onOpenProfile={() => router.push(`/website/doctor/${doctor.id}`)}
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {visibleCount < filteredDoctors.length && (
                  <div className="text-center mt-12">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 9)}
                      className="px-8 py-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-[#0067A1] font-semibold rounded-full border-2 border-[#0067A1]/30 transition-colors shadow-sm"
                    >
                      Load More Doctors
                    </button>
                  </div>
                )}
              </>
            );
          })()
        )}
      </div>

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
