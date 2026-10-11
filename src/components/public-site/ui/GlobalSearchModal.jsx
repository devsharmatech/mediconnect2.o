"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  FaSearch,
  FaTimes,
  FaUserMd,
  FaPills,
  FaFlask,
  FaHeartbeat,
  FaLungs,
  FaFolderOpen,
  FaCalendarAlt,
  FaArrowRight,
  FaHistory,
  FaFire,
  FaShieldAlt,
  FaHospital,
  FaAmbulance,
  FaWheelchair,
  FaIdCard,
} from "react-icons/fa";

// Comprehensive Medical Search Database
const SEARCH_DATABASE = [
  // ─── 1. DOCTORS & SPECIALTIES ───
  {
    id: "doc-find-all",
    title: "Find Doctors & Specialists",
    description: "Browse verified doctors across all clinical specialties",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-sky-50 text-[#0067A1] border-sky-200",
    url: "/find-doctors",
    keywords: ["doctor", "physician", "specialist", "consultation", "clinic", "hospital", "dr", "appointment"],
  },
  {
    id: "doc-cardio",
    title: "Cardiologist (Heart Specialist)",
    description: "Heart checkups, ECG, blood pressure & cardiovascular care",
    category: "Doctors",
    icon: FaHeartbeat,
    badgeColor: "bg-rose-50 text-rose-600 border-rose-200",
    url: "/find-doctors?specialty=Cardiologist",
    keywords: ["heart", "cardio", "cardiologist", "blood pressure", "hypertension", "chest pain", "cardiac"],
  },
  {
    id: "doc-general",
    title: "General Physician",
    description: "Primary care, seasonal viral infections, fever, cough & routine checkups",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    url: "/find-doctors?specialty=General+Physician",
    keywords: ["general physician", "physician", "fever", "cold", "flu", "cough", "headache", "primary care"],
  },
  {
    id: "doc-derma",
    title: "Dermatologist (Skin & Hair)",
    description: "Acne, eczema, rash, hair loss & cosmetic dermatology",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    url: "/find-doctors?specialty=Dermatologist",
    keywords: ["dermatologist", "skin", "hair", "acne", "allergy", "rash", "itching", "eczema"],
  },
  {
    id: "doc-pedia",
    title: "Pediatrician (Child Specialist)",
    description: "Infant care, childhood vaccines, pediatric growth & wellness",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    url: "/find-doctors?specialty=Pediatrician",
    keywords: ["pediatrician", "child", "baby", "infant", "kids", "vaccination", "pediatric"],
  },
  {
    id: "doc-ortho",
    title: "Orthopedic Surgeon (Bone & Joint)",
    description: "Joint pain, fractures, arthritis, back pain & spine care",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    url: "/find-doctors?specialty=Orthopedic",
    keywords: ["orthopedic", "bone", "joint", "fracture", "arthritis", "back pain", "knee", "spine"],
  },
  {
    id: "doc-gyne",
    title: "Gynecologist & Obstetrician",
    description: "Women's health, pregnancy care, menstrual health & fertility",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200",
    url: "/find-doctors?specialty=Gynecologist",
    keywords: ["gynecologist", "women", "pregnancy", "period", "pcos", "fertility", "obstetrician"],
  },
  {
    id: "doc-neuro",
    title: "Neurologist (Brain & Nerve)",
    description: "Migraines, epilepsy, nerve disorders & neurological evaluations",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    url: "/find-doctors?specialty=Neurologist",
    keywords: ["neurologist", "brain", "nerve", "migraine", "headache", "epilepsy", "stroke"],
  },
  {
    id: "doc-ent",
    title: "ENT Specialist (Ear, Nose, Throat)",
    description: "Sinusitis, ear infections, throat pain & hearing problems",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    url: "/find-doctors?specialty=ENT",
    keywords: ["ent", "ear", "nose", "throat", "sinus", "hearing", "tonsils"],
  },

  // ─── 2. MEDICINES & PHARMACY ───
  {
    id: "med-order-online",
    title: "Order Medicines Online",
    description: "Search 50,000+ certified medicines with doorstep delivery",
    category: "Medicines",
    icon: FaPills,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    url: "/medicine-order",
    keywords: ["medicine", "medicines", "pharmacy", "order medicine", "chemist", "tablet", "syrup", "capsule", "drug"],
  },
  {
    id: "med-upload-rx",
    title: "Upload Prescription for Quick Order",
    description: "Pharmacist verifies your prescription & delivers medicines",
    category: "Medicines",
    icon: FaPills,
    badgeColor: "bg-sky-50 text-[#0067A1] border-sky-200",
    url: "/medicine-order",
    keywords: ["upload prescription", "rx", "doctor prescription", "pharmacist", "order by prescription"],
  },
  {
    id: "med-chronic",
    title: "Chronic Care & Daily Medicines",
    description: "Monthly refills for BP, Diabetes, Thyroid & Heart medicines",
    category: "Medicines",
    icon: FaPills,
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    url: "/medicine-order",
    keywords: ["chronic", "diabetes", "blood pressure", "thyroid", "hypertension", "insulin", "metformin", "refill"],
  },
  {
    id: "med-otc",
    title: "Vitamins & Health Supplements",
    description: "Immunity boosters, Calcium, Vitamin D3, Omega-3 & Zinc",
    category: "Medicines",
    icon: FaPills,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    url: "/medicine-order",
    keywords: ["vitamin", "supplement", "calcium", "vitamin d", "immunity", "protein", "zinc", "multivitamin"],
  },

  // ─── 3. LAB TESTS & DIAGNOSTICS ───
  {
    id: "lab-all-tests",
    title: "Book Lab Tests & Health Packages",
    description: "NABL certified diagnostic tests with home sample collection",
    category: "Lab Tests",
    icon: FaFlask,
    badgeColor: "bg-sky-50 text-[#0067A1] border-sky-200",
    url: "/services/lab-tests",
    keywords: ["lab test", "blood test", "diagnostic", "pathology", "test", "checkup", "nabl", "sample"],
  },
  {
    id: "lab-cbc",
    title: "Complete Blood Count (CBC)",
    description: "Checks Hemoglobin, Platelets, WBC, RBC & overall blood health",
    category: "Lab Tests",
    icon: FaFlask,
    badgeColor: "bg-rose-50 text-rose-600 border-rose-200",
    url: "/services/lab-tests",
    keywords: ["cbc", "complete blood count", "hemoglobin", "platelet", "infection", "rbc", "wbc", "anemia"],
  },
  {
    id: "lab-lipid",
    title: "Lipid Profile (Cholesterol Test)",
    description: "Total Cholesterol, HDL, LDL, Triglycerides & heart risk",
    category: "Lab Tests",
    icon: FaFlask,
    badgeColor: "bg-rose-50 text-rose-600 border-rose-200",
    url: "/services/lab-tests",
    keywords: ["lipid", "cholesterol", "triglycerides", "ldl", "hdl", "heart risk", "lipid profile"],
  },
  {
    id: "lab-thyroid",
    title: "Thyroid Profile (T3, T4, TSH)",
    description: "Detects hypothyroidism, hyperthyroidism & hormonal balance",
    category: "Lab Tests",
    icon: FaFlask,
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    url: "/services/lab-tests",
    keywords: ["thyroid", "tsh", "t3", "t4", "hormone", "weight", "metabolism"],
  },
  {
    id: "lab-diabetes",
    title: "HbA1c & Blood Sugar Test",
    description: "Fasting blood sugar, Postprandial & 3-month HbA1c glucose level",
    category: "Lab Tests",
    icon: FaFlask,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    url: "/services/lab-tests",
    keywords: ["sugar", "diabetes", "glucose", "hba1c", "fasting sugar", "ppbs"],
  },
  {
    id: "lab-liver-kidney",
    title: "LFT & KFT (Liver & Kidney Function)",
    description: "SGPT, Bilirubin, Creatinine, Urea, Uric Acid & Electrolytes",
    category: "Lab Tests",
    icon: FaFlask,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    url: "/services/lab-tests",
    keywords: ["lft", "kft", "liver", "kidney", "creatinine", "sgpt", "bilirubin", "urea", "uric acid"],
  },
  {
    id: "lab-full-body",
    title: "Full Body Health Checkup Package",
    description: "85+ vital diagnostic parameters covering Heart, Liver, Kidney & Blood",
    category: "Lab Tests",
    icon: FaFlask,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    url: "/services/lab-tests",
    keywords: ["full body checkup", "executive checkup", "health package", "annual checkup", "preventive checkup"],
  },

  // ─── 4. CLINICAL PROGRAMS & SERVICES ───
  {
    id: "srv-cardio-connect",
    title: "CardioConnect — Cardiac Fitness Program",
    description: "Clinical 6-Minute Walk Test, VO2 Max estimate & heart risk tracking",
    category: "Services",
    icon: FaHeartbeat,
    badgeColor: "bg-rose-50 text-rose-600 border-rose-200",
    url: "/cardio-connect",
    keywords: ["cardio connect", "cardioconnect", "heart program", "6mwt", "walk test", "cardiac recovery"],
  },
  {
    id: "srv-lung-connect",
    title: "LungConnect — Respiratory Health Program",
    description: "Peak flow monitoring, Asthma control test, Cough & COPD management",
    category: "Services",
    icon: FaLungs,
    badgeColor: "bg-sky-50 text-[#0067A1] border-sky-200",
    url: "/lung-connect",
    keywords: ["lung connect", "lungconnect", "lungs", "asthma", "copd", "respiratory", "breathing test", "peak flow"],
  },
  {
    id: "srv-nursing",
    title: "Home Nursing Care & Attendants",
    description: "Certified clinical nurses for post-operative, elderly & ICU care at home",
    category: "Services",
    icon: FaHospital,
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    url: "/nursing-care",
    keywords: ["nurse", "nursing", "home care", "attendant", "elderly care", "icu at home", "injection"],
  },
  {
    id: "srv-equipment",
    title: "Medical Equipment (Rent & Buy)",
    description: "Hospital beds, Oxygen concentrators, CPAP/BiPAP & Wheelchairs",
    category: "Services",
    icon: FaWheelchair,
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    url: "/medical-equipment",
    keywords: ["equipment", "oxygen", "concentrator", "wheelchair", "hospital bed", "bipap", "cpap", "cylinder"],
  },
  {
    id: "srv-symptom-check",
    title: "Guided Symptom Checker (AI)",
    description: "Interactive clinical questionnaire to assess health symptoms",
    category: "Services",
    icon: FaShieldAlt,
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    url: "/guided-symptom-check",
    keywords: ["symptom", "symptom checker", "ai triage", "diagnosis", "health check", "illness"],
  },

  // ─── 5. MY RECORDS & PATIENT PORTAL ───
  {
    id: "rec-digital-locker",
    title: "Digital Locker — Medical Records Storage",
    description: "End-to-end encrypted storage for prescriptions, reports & IDs",
    category: "Records",
    icon: FaFolderOpen,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    url: "/digital-locker",
    keywords: ["digital locker", "locker", "document", "prescription upload", "records", "files", "pdf viewer"],
  },
  {
    id: "rec-lab-reports",
    title: "My Lab Reports & Test Results",
    description: "View, download and track diagnostic lab test history",
    category: "Records",
    icon: FaFlask,
    badgeColor: "bg-sky-50 text-[#0067A1] border-sky-200",
    url: "/lab-reports",
    keywords: ["lab report", "test result", "my reports", "diagnostic report", "blood report"],
  },
  {
    id: "rec-appointments",
    title: "My Doctor Appointments",
    description: "Upcoming and past consultations, video call links & rescheduling",
    category: "Records",
    icon: FaCalendarAlt,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    url: "/appointments",
    keywords: ["appointments", "my appointments", "bookings", "video call", "consultation history"],
  },
  {
    id: "rec-abha",
    title: "ABHA Health ID (Ayushman Bharat)",
    description: "Link & create 14-digit national digital healthcare account",
    category: "Records",
    icon: FaIdCard,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    url: "/abha",
    keywords: ["abha", "health id", "ayushman bharat", "ndhm", "abdhm", "govt id"],
  },
  {
    id: "rec-profile",
    title: "Patient Profile & Emergency Contacts",
    description: "Personal medical details, blood group, allergies & emergency info",
    category: "Records",
    icon: FaShieldAlt,
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    url: "/profile",
    keywords: ["profile", "patient profile", "blood group", "emergency contact", "allergies", "account"],
  },
];

// Quick trending queries shown when input is blank
const TRENDING_QUERIES = [
  "Cardiologist",
  "Complete Blood Count (CBC)",
  "Order Medicines",
  "Digital Locker",
  "Full Body Checkup",
  "Lipid Profile",
  "CardioConnect",
  "Home Nursing",
  "General Physician",
  "Dermatologist",
];

const CATEGORIES = ["All", "Doctors", "Medicines", "Lab Tests", "Services", "Records"];

export default function GlobalSearchModal({ isOpen, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Mount detection for React Portal
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("mediconnect_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch (_) {}
  }, []);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      // Prevent background scrolling
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  // Filter search database based on query & category
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEARCH_DATABASE.filter((item) => {
      // Category filter
      if (selectedCategory !== "All" && item.category !== selectedCategory) {
        return false;
      }
      // Query filter
      if (!q) return true;
      const titleMatch = item.title.toLowerCase().includes(q);
      const descMatch = item.description.toLowerCase().includes(q);
      const keywordMatch = item.keywords.some((k) => k.toLowerCase().includes(q));
      const categoryMatch = item.category.toLowerCase().includes(q);
      return titleMatch || descMatch || keywordMatch || categoryMatch;
    });
  }, [query, selectedCategory]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  // Save query to recent searches
  const saveRecentSearch = (searchTerm) => {
    if (!searchTerm.trim()) return;
    try {
      const updated = [
        searchTerm.trim(),
        ...recentSearches.filter((s) => s.toLowerCase() !== searchTerm.trim().toLowerCase()),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("mediconnect_recent_searches", JSON.stringify(updated));
    } catch (_) {}
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("mediconnect_recent_searches");
    } catch (_) {}
  };

  // Navigate to target URL
  const handleSelectResult = (item) => {
    if (!item?.url) return;
    saveRecentSearch(query.trim() || item.title);
    onClose();
    router.push(item.url);
  };

  // Keyboard navigation (Arrow keys, Enter, Escape)
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelectResult(filteredResults[selectedIndex]);
      } else if (query.trim()) {
        saveRecentSearch(query.trim());
        onClose();
        router.push(`/find-doctors?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  // Highlight matching characters in title
  const highlightMatch = (text, highlight) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={i} className="text-[#0067A1] font-extrabold underline decoration-[#0067A1]/40">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/75 sm:backdrop-blur-xs flex flex-col sm:items-center sm:justify-start sm:pt-16 md:pt-20 p-0 sm:p-4 overflow-hidden"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Dialog (Full screen on mobile, elegant centered card on desktop) */}
      <div
        className="w-full h-full flex-1 sm:flex-initial sm:h-auto sm:max-h-[82vh] sm:max-w-3xl bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl border-0 sm:border sm:border-slate-200 overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* ── SEARCH INPUT HEADER ── */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-white border-b border-slate-200 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0067A1] flex items-center justify-center shrink-0 border border-sky-100 shadow-2xs">
            <FaSearch className="w-4 h-4" />
          </div>

          <div className="flex-1 relative min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search doctors, medicines, lab tests, digital locker..."
              className="w-full bg-transparent text-slate-900 text-sm sm:text-base font-medium placeholder-slate-400 outline-none pr-8"
              autoComplete="off"
              spellCheck="false"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Clear input"
              >
                <FaTimes className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            Close
          </button>
        </div>

        {/* ── CATEGORY FILTER TABS ── */}
        <div className="px-4 sm:px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 select-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? "bg-[#0067A1] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ── SEARCH RESULTS / SUGGESTIONS BODY ── */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-4">
          {/* Recent Searches (if available and no query typed) */}
          {!query.trim() && recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                <span className="flex items-center gap-1.5">
                  <FaHistory className="w-3 h-3 text-slate-400" />
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-slate-400 hover:text-rose-600 lowercase font-medium transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-sky-50 hover:text-[#0067A1] border border-slate-200 rounded-lg text-xs text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches (when query is blank) */}
          {!query.trim() && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                <FaFire className="w-3 h-3 text-amber-500" />
                Trending Medical Searches
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING_QUERIES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setQuery(t);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-[#0067A1]/5 border border-slate-200 hover:border-[#0067A1]/40 rounded-lg text-xs text-slate-700 hover:text-[#0067A1] font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result List */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
              <span>
                {query.trim() ? `Search Results (${filteredResults.length})` : "All Healthcare Portals"}
              </span>
              <span className="text-[11px] font-normal text-slate-400 hidden sm:inline">
                Use ↑ ↓ to navigate, Enter to select
              </span>
            </div>

            {filteredResults.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <FaSearch className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  No medical results found for &quot;{query}&quot;
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try checking your spelling or search for <span className="font-semibold text-slate-700">Cardiologist</span>, <span className="font-semibold text-slate-700">Blood Test</span>, <span className="font-semibold text-slate-700">Medicines</span>, or <span className="font-semibold text-slate-700">Digital Locker</span>.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredResults.map((item, idx) => {
                  const Icon = item.icon;
                  const isHighlighted = idx === selectedIndex;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isHighlighted
                          ? "bg-sky-50/80 border-[#0067A1] shadow-xs"
                          : "bg-white border-slate-200/90 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                            isHighlighted
                              ? "bg-[#0067A1] text-white border-[#0067A1]"
                              : "bg-slate-50 text-[#0067A1] border-slate-200 group-hover:bg-sky-50"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {highlightMatch(item.title, query)}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${item.badgeColor}`}
                            >
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-[#0067A1] transition-colors">
                        <span className="text-[11px] font-semibold hidden sm:inline group-hover:underline">
                          Go
                        </span>
                        <FaArrowRight className={`w-3 h-3 transition-transform ${isHighlighted ? "translate-x-1" : ""}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── MODAL FOOTER ── */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0 mt-auto pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold truncate mr-2">
            <FaShieldAlt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">
              MediConnect 2.0 Global Clinical Search
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">
              ESC to close
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
