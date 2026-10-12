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
  FaShieldAlt,
  FaHospital,
  FaWheelchair,
  FaIdCard,
  FaSpinner,
} from "react-icons/fa";

// Curated Clinical Database (Public Services & Programs)
const STATIC_PUBLIC_SERVICES = [
  // ─── 1. CLINICAL SPECIALTIES (Redirects to /doctors with specialty filter) ───
  {
    id: "spec-cardio",
    title: "Cardiologist (Heart Specialist)",
    description: "Heart checkups, ECG, blood pressure & cardiovascular care",
    category: "Doctors",
    icon: FaHeartbeat,
    badgeColor: "bg-rose-50 text-rose-600 border-rose-200",
    url: "/doctors?specialty=Cardiologist",
    keywords: ["heart", "cardio", "cardiologist", "blood pressure", "hypertension", "chest pain", "cardiac"],
  },
  {
    id: "spec-general",
    title: "General Physician",
    description: "Primary care, seasonal viral infections, fever, cough & routine checkups",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    url: "/doctors?specialty=General+Physician",
    keywords: ["general physician", "physician", "fever", "cold", "flu", "cough", "headache", "primary care"],
  },
  {
    id: "spec-derma",
    title: "Dermatologist (Skin & Hair)",
    description: "Acne, eczema, rash, hair loss & cosmetic dermatology",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    url: "/doctors?specialty=Dermatologist",
    keywords: ["dermatologist", "skin", "hair", "acne", "allergy", "rash", "itching", "eczema"],
  },
  {
    id: "spec-pedia",
    title: "Pediatrician (Child Specialist)",
    description: "Infant care, childhood vaccines, pediatric growth & wellness",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    url: "/doctors?specialty=Pediatrician",
    keywords: ["pediatrician", "child", "baby", "infant", "kids", "vaccination", "pediatric"],
  },
  {
    id: "spec-ortho",
    title: "Orthopedic (Bone & Joint)",
    description: "Joint pain, fractures, arthritis, back pain & spine care",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    url: "/doctors?specialty=Orthopedic",
    keywords: ["orthopedic", "bone", "joint", "fracture", "arthritis", "back pain", "knee", "spine"],
  },
  {
    id: "spec-gyne",
    title: "Gynecologist & Obstetrician",
    description: "Women's health, pregnancy care, menstrual health & fertility",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200",
    url: "/doctors?specialty=Gynecologist",
    keywords: ["gynecologist", "women", "pregnancy", "period", "pcos", "fertility", "obstetrician"],
  },
  {
    id: "spec-neuro",
    title: "Neurologist (Brain & Nerve)",
    description: "Migraines, epilepsy, nerve disorders & neurological evaluations",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    url: "/doctors?specialty=Neurologist",
    keywords: ["neurologist", "brain", "nerve", "migraine", "headache", "epilepsy", "stroke"],
  },
  {
    id: "spec-ent",
    title: "ENT Specialist (Ear, Nose, Throat)",
    description: "Sinusitis, ear infections, throat pain & hearing issues",
    category: "Doctors",
    icon: FaUserMd,
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    url: "/doctors?specialty=ENT",
    keywords: ["ent", "ear", "nose", "throat", "sinus", "hearing", "tonsils"],
  },

  // ─── 2. MEDICINES & PHARMACY ───
  {
    id: "med-order-online",
    title: "Order Medicines Online",
    description: "Browse 50,000+ certified medicines with doorstep pharmacy delivery",
    category: "Medicines",
    icon: FaPills,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    url: "/medicine-order",
    requiresAuth: true,
    keywords: ["medicine", "medicines", "pharmacy", "order medicine", "chemist", "tablet", "syrup", "capsule", "drug"],
  },
  {
    id: "med-chronic",
    title: "Chronic Care Medicines (BP, Sugar, Thyroid)",
    description: "Regular refills & maintenance therapy for long-term health",
    category: "Medicines",
    icon: FaPills,
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    url: "/medicine-order",
    requiresAuth: true,
    keywords: ["chronic", "diabetes", "blood pressure", "thyroid", "hypertension", "insulin", "metformin", "refill"],
  },

  // ─── 3. CLINICAL SERVICES ───
  {
    id: "srv-cardio-connect",
    title: "CardioConnect — Cardiac Fitness Program",
    description: "Clinical 6-Minute Walk Test, VO2 Max estimate & heart risk tracking",
    category: "Services",
    icon: FaHeartbeat,
    badgeColor: "bg-rose-50 text-rose-600 border-rose-200",
    url: "/cardio-connect",
    requiresAuth: true,
    keywords: ["cardio connect", "cardioconnect", "heart program", "6mwt", "walk test", "cardiac recovery"],
  },
  {
    id: "srv-lung-connect",
    title: "LungConnect — Respiratory Care Program",
    description: "Peak flow monitoring, Asthma control test, Cough & COPD management",
    category: "Services",
    icon: FaLungs,
    badgeColor: "bg-sky-50 text-[#0067A1] border-sky-200",
    url: "/lung-connect",
    requiresAuth: true,
    keywords: ["lung connect", "lungconnect", "lungs", "asthma", "copd", "respiratory", "breathing test"],
  },
  {
    id: "srv-nursing",
    title: "Home Nursing Care & Attendants",
    description: "Qualified clinical nurses for post-op, elderly & attendant care at home",
    category: "Services",
    icon: FaHospital,
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    url: "/nursing-care",
    keywords: ["nurse", "nursing", "home care", "attendant", "elderly care", "icu at home"],
  },
  {
    id: "srv-equipment",
    title: "Medical Equipment (Rent & Buy)",
    description: "Hospital beds, Oxygen concentrators, BiPAP & Wheelchairs",
    category: "Services",
    icon: FaWheelchair,
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    url: "/medical-equipment",
    keywords: ["equipment", "oxygen", "concentrator", "wheelchair", "hospital bed", "bipap", "cpap"],
  },
];

// Private / Authenticated Records (Shown ONLY when user is logged in)
const AUTHENTICATED_PATIENT_RECORDS = [
  {
    id: "rec-digital-locker",
    title: "Digital Locker — Medical Records",
    description: "Encrypted storage for your prescriptions, lab reports & IDs",
    category: "Records",
    icon: FaFolderOpen,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    url: "/digital-locker",
    keywords: ["digital locker", "locker", "document", "prescription", "records", "files"],
  },
  {
    id: "rec-lab-reports",
    title: "My Lab Reports & Test Results",
    description: "View and download your completed diagnostic test reports",
    category: "Records",
    icon: FaFlask,
    badgeColor: "bg-sky-50 text-[#0067A1] border-sky-200",
    url: "/lab-reports",
    keywords: ["lab report", "test result", "my reports", "diagnostic report"],
  },
  {
    id: "rec-appointments",
    title: "My Doctor Appointments",
    description: "Upcoming and past consultations, video call links & follow-ups",
    category: "Records",
    icon: FaCalendarAlt,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    url: "/appointments",
    keywords: ["appointments", "my appointments", "bookings", "video call"],
  },
  {
    id: "rec-abha",
    title: "ABHA Health ID (Ayushman Bharat)",
    description: "Your 14-digit national digital health ID account",
    category: "Records",
    icon: FaIdCard,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    url: "/abha",
    keywords: ["abha", "health id", "ayushman bharat", "ndhm"],
  },
];

// 4 Clean Quick Actions for Initial State
const QUICK_ACTIONS = [
  {
    title: "Consult Doctors",
    subtitle: "Verified Specialists & OPD",
    icon: FaUserMd,
    url: "/doctors",
    iconBg: "bg-sky-50 text-[#0067A1]",
  },
  {
    title: "Book Lab Tests",
    subtitle: "Pathology & Home Pickup",
    icon: FaFlask,
    url: "/services/lab-tests",
    iconBg: "bg-purple-50 text-purple-600",
  },
  {
    title: "Order Medicines",
    subtitle: "Doorstep Pharmacy Delivery",
    icon: FaPills,
    url: "/medicine-order",
    requiresAuth: true,
    iconBg: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Cardio & Lung Care",
    subtitle: "Cardiac & Respiratory Programs",
    icon: FaHeartbeat,
    url: "/cardio-connect",
    requiresAuth: true,
    iconBg: "bg-rose-50 text-rose-600",
  },
];

// Top Clinical Specialties (Clean minimal chips)
const TOP_SPECIALTIES = [
  "Cardiologist",
  "General Physician",
  "Dermatologist",
  "Pediatrician",
  "Orthopedic",
];

export default function GlobalSearchModal({ isOpen, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Live Database Search State
  const [dbDoctors, setDbDoctors] = useState([]);
  const [dbTests, setDbTests] = useState([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Mount detection & Auth check
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const logged = Boolean(
        localStorage.getItem("userData") ||
        localStorage.getItem("userRole") ||
        localStorage.getItem("patientUser")
      );
      setIsLoggedIn(logged);

      try {
        const stored = localStorage.getItem("mediconnect_recent_searches");
        if (stored) {
          const parsed = JSON.parse(stored);
          // If not logged in, filter out legacy/prescription/locker queries
          const sanitized = parsed.filter((term) => {
            if (!logged) {
              const lower = term.toLowerCase();
              if (lower.includes("prescription") || lower.includes("locker") || lower.includes("record")) {
                return false;
              }
            }
            return true;
          });
          setRecentSearches(sanitized.slice(0, 4));
        }
      } catch (_) {}
    }
  }, [isOpen]);

  // Dynamic categories based on auth state
  const availableCategories = useMemo(() => {
    const cats = ["All", "Doctors", "Medicines", "Lab Tests", "Services"];
    if (isLoggedIn) {
      cats.push("Records");
    }
    return cats;
  }, [isLoggedIn]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setSelectedCategory("All");
      setDbDoctors([]);
      setDbTests([]);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);

      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  // Live Search Query against AWS RDS Database (Debounced)
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setDbDoctors([]);
      setDbTests([]);
      setIsLoadingDb(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoadingDb(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/metadata?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDbDoctors(json.data.doctors || []);
          setDbTests(json.data.tests || []);
        } else {
          setDbDoctors([]);
          setDbTests([]);
        }
      } catch (err) {
        console.error("Live search fetch error:", err);
      } finally {
        setIsLoadingDb(false);
      }
    }, 220);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // Compile combined results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results = [];

    // 1. Real Doctors from AWS RDS
    if (selectedCategory === "All" || selectedCategory === "Doctors") {
      dbDoctors.forEach((doc) => {
        results.push({
          id: `db-doc-${doc.id}`,
          title: doc.full_name?.startsWith("Dr.") ? doc.full_name : `Dr. ${doc.full_name}`,
          description: `${doc.specialization || "Doctor"} • ${doc.clinic_name || "Consultation"} • ${doc.experience_years ? doc.experience_years + " yrs exp" : "Verified"}`,
          category: "Doctors",
          icon: FaUserMd,
          badgeColor: "bg-sky-50 text-[#0067A1] border-sky-200",
          url: `/doctors?search=${encodeURIComponent(doc.full_name)}`,
        });
      });
    }

    // 2. Real Lab Tests from AWS RDS
    if (selectedCategory === "All" || selectedCategory === "Lab Tests") {
      dbTests.forEach((t) => {
        results.push({
          id: `db-test-${t.id}`,
          title: t.name,
          description: `₹${t.price || "Contact for fee"} • ${t.specimen_type || "Diagnostic Test"}${t.turnaround_time ? " • " + t.turnaround_time : ""}`,
          category: "Lab Tests",
          icon: FaFlask,
          badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
          url: `/services/lab-tests?q=${encodeURIComponent(t.name)}`,
        });
      });
    }

    // 3. Static Clinical Programs & Services
    const matchedStatic = STATIC_PUBLIC_SERVICES.filter((item) => {
      if (selectedCategory !== "All" && item.category !== selectedCategory) return false;
      const titleMatch = item.title.toLowerCase().includes(q);
      const descMatch = item.description.toLowerCase().includes(q);
      const kwMatch = item.keywords.some((k) => k.toLowerCase().includes(q));
      return titleMatch || descMatch || kwMatch;
    });
    results.push(...matchedStatic);

    // 4. Authenticated Patient Records (ONLY if logged in)
    if (isLoggedIn && (selectedCategory === "All" || selectedCategory === "Records")) {
      const matchedRecords = AUTHENTICATED_PATIENT_RECORDS.filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(q);
        const descMatch = item.description.toLowerCase().includes(q);
        const kwMatch = item.keywords.some((k) => k.toLowerCase().includes(q));
        return titleMatch || descMatch || kwMatch;
      });
      results.push(...matchedRecords);
    }

    return results;
  }, [query, selectedCategory, dbDoctors, dbTests, isLoggedIn]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  const saveRecentSearch = (searchTerm) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    try {
      const updated = [
        trimmed,
        ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, 4);
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

  const handleSelectResult = (item) => {
    if (!item?.url) return;
    saveRecentSearch(query.trim() || item.title);
    onClose();

    const requiresAuth =
      item.requiresAuth ||
      item.url.startsWith("/medicine-order") ||
      item.url.startsWith("/cardio-connect") ||
      item.url.startsWith("/lung-connect") ||
      item.url.startsWith("/lung-") ||
      item.url.startsWith("/heart-") ||
      item.url.startsWith("/digital-locker") ||
      item.url.startsWith("/appointments") ||
      item.url.startsWith("/lab-reports") ||
      item.url.startsWith("/dashboard") ||
      item.url.startsWith("/profile") ||
      item.url.startsWith("/settings");

    if (requiresAuth && !isLoggedIn) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("post_login_redirect", item.url);
        window.dispatchEvent(
          new CustomEvent("open-login-modal", { detail: { userType: "patient" } })
        );
      }
      return;
    }

    router.push(item.url);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredResults.length > 0) {
        setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredResults.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredResults.length > 0 && filteredResults[selectedIndex]) {
        handleSelectResult(filteredResults[selectedIndex]);
      } else if (query.trim()) {
        saveRecentSearch(query.trim());
        onClose();
        router.push(`/doctors?search=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const highlightMatch = (text, highlight) => {
    if (!highlight || !highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={i} className="text-[#0067A1] font-bold underline decoration-[#0067A1]/40">
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
      className="fixed inset-0 z-[99999] bg-slate-950/70 sm:backdrop-blur-xs flex flex-col sm:items-center sm:justify-start sm:pt-16 md:pt-20 p-0 sm:p-4 overflow-hidden"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Dialog */}
      <div
        className="w-full h-full flex-1 sm:flex-initial sm:h-auto sm:max-h-[82vh] sm:max-w-2xl bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl border-0 sm:border sm:border-slate-200/90 overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* ── SEARCH INPUT HEADER ── */}
        <div className="px-4 sm:px-5 py-3.5 bg-white border-b border-slate-150 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center shrink-0 border border-sky-100 shadow-2xs">
            {isLoadingDb ? (
              <FaSpinner className="w-4 h-4 animate-spin text-[#0067A1]" />
            ) : (
              <FaSearch className="w-4 h-4" />
            )}
          </div>

          <div className="flex-1 relative min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search doctors, clinical tests, medicines, programs..."
              className="w-full bg-transparent text-slate-900 text-sm sm:text-base font-medium placeholder-slate-400 outline-none pr-7"
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
                title="Clear query"
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
          {availableCategories.map((cat) => {
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

        {/* ── MODAL CONTENT BODY ── */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          {/* ════ STATE A: INITIAL / EMPTY STATE ════ */}
          {!query.trim() && (
            <div className="space-y-4">
              {/* Recent Searches (Filtered) */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-0.5">
                    <span className="flex items-center gap-1.5">
                      <FaHistory className="w-3 h-3 text-slate-400" />
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-slate-400 hover:text-rose-600 font-medium lowercase text-xs transition-colors cursor-pointer"
                    >
                      clear
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-sky-50 hover:text-[#0067A1] border border-slate-200/90 rounded-lg text-xs text-slate-700 font-medium transition-colors cursor-pointer"
                      >
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4 Clean Quick Actions (2x2 Grid) */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-0.5">
                  Quick Healthcare Services
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    const needsLogin = action.requiresAuth && !isLoggedIn;

                    return (
                      <button
                        key={action.title}
                        type="button"
                        onClick={() => {
                          onClose();
                          if (needsLogin) {
                            if (typeof window !== "undefined") {
                              sessionStorage.setItem("post_login_redirect", action.url);
                              window.dispatchEvent(
                                new CustomEvent("open-login-modal", { detail: { userType: "patient" } })
                              );
                            }
                            return;
                          }
                          router.push(action.url);
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/90 hover:border-[#0067A1]/40 hover:bg-sky-50/40 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform ${action.iconBg}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-[#0067A1] transition-colors truncate">
                              {action.title}
                            </span>
                            {needsLogin && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                Login needed
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {action.subtitle}
                          </div>
                        </div>
                        <FaArrowRight className="w-3 h-3 text-slate-300 group-hover:text-[#0067A1] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Top Specialties (Clean minimal chips) */}
              <div className="pt-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-0.5">
                  Top Medical Specialties
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TOP_SPECIALTIES.map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => {
                        setQuery(spec);
                        inputRef.current?.focus();
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-[#0067A1]/5 border border-slate-200 hover:border-[#0067A1]/50 rounded-lg text-xs text-slate-700 hover:text-[#0067A1] font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ STATE B: LIVE SEARCH RESULTS ════ */}
          {query.trim() && (
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-0.5">
                <span>
                  Results ({filteredResults.length})
                </span>
                <span className="text-[11px] font-normal text-slate-400 hidden sm:inline lowercase">
                  press Enter to search &quot;{query}&quot;
                </span>
              </div>

              {filteredResults.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <FaSearch className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    No results found for &quot;{query}&quot;
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try searching for <span className="font-semibold text-slate-700">Cardiologist</span>, <span className="font-semibold text-slate-700">General Physician</span>, <span className="font-semibold text-slate-700">Blood Test</span>, or <span className="font-semibold text-slate-700">CBC</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`/doctors?search=${encodeURIComponent(query.trim())}`);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#00507c] transition-colors cursor-pointer"
                  >
                    <span>Search all doctors for &quot;{query}&quot;</span>
                    <FaArrowRight className="w-3 h-3" />
                  </button>
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
                        className={`group flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                          isHighlighted
                            ? "bg-sky-50/80 border-[#0067A1] shadow-xs"
                            : "bg-white border-slate-200/90 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
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
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0 ${item.badgeColor}`}
                              >
                                {item.category}
                              </span>
                              {item.requiresAuth && !isLoggedIn && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                  Login needed
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-[#0067A1] transition-colors">
                          <span className="text-[11px] font-semibold hidden sm:inline group-hover:underline">
                            {item.requiresAuth && !isLoggedIn ? "Login" : "View"}
                          </span>
                          <FaArrowRight
                            className={`w-3 h-3 transition-transform ${
                              isHighlighted ? "translate-x-1" : ""
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── MODAL FOOTER ── */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0 mt-auto pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2 text-slate-600 font-medium truncate mr-2">
            <FaShieldAlt className="w-3.5 h-3.5 text-[#0067A1] shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">
              Verified Doctors, Diagnostic Labs & Healthcare Services
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400">
              ESC to close
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
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
