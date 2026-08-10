"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch,
  FaUserMd,
  FaStar,
  FaMapMarkerAlt,
  FaClock,
  FaVideo,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaFilter,
  FaTimes,
  FaStethoscope,
} from "react-icons/fa";
import { HiOutlineBadgeCheck } from "react-icons/hi";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const normalizeSpecialty = (value) => {
  if (!value) return "General Physician";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "General Physician";
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.join(", ");
      if (typeof parsed === "string") return parsed;
    } catch { /* not JSON */ }
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith("(") && trimmed.endsWith(")"))) {
      const inner = trimmed.slice(1, -1);
      const parts = inner.split(",").map((p) => p.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      if (parts.length) return parts.join(", ");
    }
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

// ─────────────────────────────────────────────────────────────────────────────
// Specialty Filter Pill Row
// ─────────────────────────────────────────────────────────────────────────────
const SpecialtyFilter = ({ specialties, selected, onSelect }) => {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });

  return (
    <div className="relative w-full group">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-1.5 shadow text-gray-500 hover:text-[#0067A1] hover:border-[#0067A1] transition hidden md:flex opacity-0 group-hover:opacity-100"
      >
        <FaChevronLeft className="w-3 h-3" />
      </button>

      <div ref={ref} className="flex overflow-x-auto gap-2 py-1 px-1 hide-scrollbar scroll-smooth">
        {specialties.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              selected === s
                ? "bg-[#0067A1] text-white shadow-md"
                : "border border-gray-200 bg-white text-gray-600 hover:border-[#0067A1]/50 hover:bg-gray-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-1.5 shadow text-gray-500 hover:text-[#0067A1] hover:border-[#0067A1] transition hidden md:flex opacity-0 group-hover:opacity-100"
      >
        <FaChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Card
// ─────────────────────────────────────────────────────────────────────────────
const DoctorCard = ({ doctor, onBook }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group"
    >
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#0067A1] to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 flex-1 flex flex-col">
        {/* Header row */}
        <div className="flex gap-4 mb-4">
          <div className="relative shrink-0">
            <div className="h-16 w-16 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
              {doctor.profileImage ? (
                <img
                  src={doctor.profileImage}
                  alt={doctor.name}
                  className="h-full w-full object-cover"
                  onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                />
              ) : null}
              <div
                className="hidden w-full h-full bg-[#0067A1]/10 items-center justify-center text-xl font-bold text-[#0067A1]"
                style={doctor.profileImage ? {} : { display: "flex" }}
              >
                {doctor.name.charAt(0)}
              </div>
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full p-[2px] shadow-sm">
              <FaCheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate">{doctor.name}</h3>
            <p className="text-sm font-semibold text-[#0067A1] truncate mt-0.5">{doctor.specialty}</p>
            <div className="mt-1.5">
              {doctor.rating > 0 && doctor.reviews > 0 ? (
                <span className="inline-flex items-center gap-1 bg-yellow-50 border border-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  <FaStar className="h-3 w-3 text-yellow-500" />
                  {doctor.rating.toFixed(1)} <span className="font-medium opacity-80">({doctor.reviews})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <HiOutlineBadgeCheck className="h-3.5 w-3.5" />
                  DMC Specialist
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 mb-4 flex-1">
          <div className="flex items-center gap-2.5 text-sm text-gray-500">
            <FaClock className="h-3.5 w-3.5 text-[#0067A1]/60 shrink-0" />
            <span>
              {doctor.experience > 0
                ? <><span className="font-semibold text-gray-700">{doctor.experience}+</span> yrs experience</>
                : "Experience verified"}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-emerald-600 font-medium">
            <FaCalendarAlt className="h-3.5 w-3.5 shrink-0" />
            <span>Available for booking</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-50 pt-4">
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Consultation</p>
            {doctor.fee ? (
              <p className="text-lg font-bold text-gray-900">₹{doctor.fee}</p>
            ) : (
              <p className="text-sm font-semibold text-gray-500">TBD</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onBook(doctor.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0067A1] text-white text-sm font-semibold shadow-md shadow-[#0067A1]/20 hover:bg-[#004F7C] transition-all active:scale-95"
          >
            <FaVideo className="h-3.5 w-3.5" />
            Book Now
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Card
// ─────────────────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
    <div className="flex gap-4 mb-4">
      <div className="h-16 w-16 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-5 bg-gray-100 rounded w-20" />
      </div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
    <div className="flex justify-between border-t border-gray-50 pt-4">
      <div className="space-y-1">
        <div className="h-2 bg-gray-100 rounded w-16" />
        <div className="h-5 bg-gray-100 rounded w-12" />
      </div>
      <div className="h-9 bg-gray-100 rounded-xl w-24" />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Specialty clusters for fuzzy matching
// ─────────────────────────────────────────────────────────────────────────────
const CLUSTERS = [
  ["dentistry", "dentist", "dental", "teeth"],
  ["general physician", "general medicine", "family physician", "gp", "physician"],
  ["gynecology", "gynaecology", "gynecologist", "obstetrics", "obgyn"],
  ["pediatrics", "paediatrics", "pediatrician", "child", "children"],
  ["orthopedics", "orthopaedics", "orthopedic", "bone", "joints"],
  ["ent", "ear nose throat", "otolaryngology"],
  ["cardiology", "cardiologist", "heart", "cardio"],
  ["ophthalmology", "eye", "ophthalmologist", "vision"],
  ["dermatology", "skin", "dermatologist", "hair"],
  ["psychiatry", "mental health", "psychiatrist", "psychology"],
  ["nephrology", "nephrologist", "kidney", "renal"],
  ["surgery", "surgeon", "general surgery", "surgical"],
];

const matchesSpecialty = (docSpecialty, filter) => {
  const docSpec = (docSpecialty || "").toLowerCase();
  const target = filter.toLowerCase();
  if (filter === "All Specialties") return true;

  const hasWord = (str, word) => {
    const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(str);
  };

  if (docSpec === target) return true;

  for (const cluster of CLUSTERS) {
    const inFilter = cluster.some((w) => {
      if (w.length <= 3) {
        return hasWord(target, w);
      }
      return target.includes(w) || w.includes(target);
    });

    if (inFilter) {
      const inDoc = cluster.some((w) => {
        if (w.length <= 3) {
          return hasWord(docSpec, w);
        }
        return docSpec.includes(w);
      });
      if (inDoc) return true;
    }
  }

  if (target.length <= 3) {
    return hasWord(docSpec, target);
  }
  if (target === "urology" && docSpec.includes("neurology")) return false;
  if (target === "neurology" && docSpec.includes("urology") && !docSpec.includes("neurology")) return false;
  return docSpec.includes(target) || target.includes(docSpec);
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SPECIALTIES = [
  "All Specialties",
  "General Physician",
  "Cardiology",
  "Dermatology",
  "Pediatrics",
  "Orthopedics",
  "Gynecology",
  "Neurology",
  "Psychiatry",
  "ENT",
  "Ophthalmology",
  "Dentistry",
];

const PAGE_SIZE = 9;

export default function FindDoctorsPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState(DEFAULT_SPECIALTIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All Specialties");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("default"); // default | fee_asc | fee_desc | exp_desc

  // ── Parse URL params on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const spec = params.get("specialty");
      const q = params.get("search");
      if (spec) {
        const matched = DEFAULT_SPECIALTIES.find(
          (s) => s.toLowerCase() === spec.toLowerCase()
        );
        if (matched) {
          setSelectedSpecialty(matched);
        }
      }
      if (q) {
        setSearch(q);
      }
    }
  }, []);

  // ── Fetch doctors ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/doctors/get?limit=200");
        const json = await res.json();
        const allDocs = Array.isArray(json?.data) ? json.data : [];

        const mapped = allDocs
          .filter((doc) => {
            const d = doc.doctor_details || {};
            const hasHome = d.home_slots && Object.keys(d.home_slots).length > 0 && JSON.stringify(d.home_slots) !== "{}";
            const hasClinic = d.clinic_slots && Object.keys(d.clinic_slots).length > 0 && JSON.stringify(d.clinic_slots) !== "{}";
            return (d.onboarding_status === "approved" || doc.status === 1) && (hasHome || hasClinic);
          })
          .map((doc) => {
            const d = doc.doctor_details || {};
            const rawFee = d.clinic_consultation_fee || d.video_consultation_fee || d.home_visit_fee;
            const fee = typeof rawFee === "number" ? rawFee : rawFee ? Number(rawFee) : NaN;
            let profileImage = "";
            if (d.passport_photo) {
              profileImage = Array.isArray(d.passport_photo) 
                ? d.passport_photo[0] 
                : d.passport_photo;
            }
            if (!profileImage && doc.profile_picture) {
              profileImage = doc.profile_picture;
            }
            if (profileImage && typeof profileImage === 'string' && profileImage.includes("ui-avatars.com")) {
              profileImage = "";
            }
            if (profileImage && typeof profileImage === 'string' && profileImage.includes("::text")) {
              const m = profileImage.match(/'([^']+)'/);
              profileImage = m ? m[1] : "";
            }
            return {
              id: doc.id,
              name: d.full_name || d.name || "Doctor",
              specialty: normalizeSpecialty(d.specialization),
              rating: typeof d.rating === "number" ? d.rating : 0,
              reviews: typeof d.total_reviews === "number" && d.total_reviews > 0 ? d.total_reviews : 0,
              location: cleanClinicAddress(d.clinic_address),
              experience: typeof d.experience_years === "number" ? d.experience_years : 0,
              fee: Number.isFinite(fee) && fee > 0 ? fee : null,
              profileImage,
            };
          });

        setDoctors(mapped);

        // Build specialty list from actual doctors + defaults
        const docSpecialties = [...new Set(mapped.map((d) => {
          const s = d.specialty.split(",")[0].trim();
          return s;
        }))];
        const merged = ["All Specialties", ...new Set([...docSpecialties, ...DEFAULT_SPECIALTIES.slice(1)])];
        setSpecialties(merged);
      } catch (err) {
        console.error("Failed to load doctors:", err);
        setError("Unable to load doctors right now. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  // ── Filter + Sort ──────────────────────────────────────────────────────────
  const filtered = doctors
    .filter((doc) => {
      const q = search.toLowerCase().trim();
      if (q) {
        const match = [doc.name, doc.specialty, doc.location].some((f) =>
          (f || "").toLowerCase().includes(q)
        );
        if (!match) return false;
      }
      return matchesSpecialty(doc.specialty, selectedSpecialty);
    })
    .sort((a, b) => {
      if (sortBy === "fee_asc") return (a.fee ?? Infinity) - (b.fee ?? Infinity);
      if (sortBy === "fee_desc") return (b.fee ?? -Infinity) - (a.fee ?? -Infinity);
      if (sortBy === "exp_desc") return b.experience - a.experience;
      return 0;
    });

  const visible = filtered.slice(0, visibleCount);

  const handleBook = (id) => router.push(`/website/doctor/${id}`);

  const resetFilters = () => {
    setSearch("");
    setSelectedSpecialty("All Specialties");
    setSortBy("default");
    setVisibleCount(PAGE_SIZE);
  };

  const hasActiveFilters = search || selectedSpecialty !== "All Specialties" || sortBy !== "default";

  return (
    <div className="min-h-screen">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#0067A1] via-[#0080C6] to-[#0067A1] rounded-2xl px-5 py-8 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <FaStethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Find Doctors</h1>
              <p className="text-white/60 text-sm">Browse and book verified specialists</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              id="doctor-search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
              placeholder="Search by name, specialty, or location..."
              className="w-full pl-11 pr-10 py-3.5 rounded-xl bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Controls Row ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {/* Specialty pills */}
        <div className="flex-1 min-w-0">
          <SpecialtyFilter
            specialties={specialties}
            selected={selectedSpecialty}
            onSelect={(s) => { setSelectedSpecialty(s); setVisibleCount(PAGE_SIZE); }}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Sort */}
          <select
            id="doctor-sort"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setVisibleCount(PAGE_SIZE); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 cursor-pointer"
          >
            <option value="default">Sort: Relevance</option>
            <option value="fee_asc">Fee: Low to High</option>
            <option value="fee_desc">Fee: High to Low</option>
            <option value="exp_desc">Experience: Most</option>
          </select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-700 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition px-3 py-2 rounded-xl font-medium"
            >
              <FaTimes className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results header ───────────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-800">{Math.min(visibleCount, filtered.length)}</span> of{" "}
            <span className="font-semibold text-gray-800">{filtered.length}</span> doctor{filtered.length !== 1 ? "s" : ""}
            {selectedSpecialty !== "All Specialties" && (
              <> in <span className="text-[#0067A1] font-semibold">{selectedSpecialty}</span></>
            )}
          </p>
        </div>
      )}

      {/* ── Doctor Grid ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <FaUserMd className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Failed to load doctors</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-[#0067A1] text-white text-sm font-semibold hover:bg-[#004F7C] transition"
          >
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <FaUserMd className="w-7 h-7 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-1">No doctors found</h3>
          <p className="text-sm text-gray-400 mb-4">Try adjusting your search or filters.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((doctor, i) => (
              <DoctorCard key={doctor.id || i} doctor={doctor} onBook={handleBook} />
            ))}
          </div>

          {/* Load more */}
          {filtered.length > visibleCount && (
            <div className="flex justify-center mt-8">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-7 py-3 rounded-xl border-2 border-[#0067A1] text-[#0067A1] font-semibold text-sm hover:bg-[#0067A1] hover:text-white transition-all"
              >
                Load More ({filtered.length - visibleCount} remaining)
              </motion.button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
