"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FaFlask,
  FaSearch,
  FaMapMarkerAlt,
  FaStar,
  FaClock,
  FaArrowRight,
  FaTimes,
  FaPhone,
  FaTruck,
  FaArrowLeft,
  FaCheckCircle,
  FaShieldAlt,
  FaLocationArrow,
  FaBuilding,
  FaFilter,
  FaVial,
  FaHeartbeat,
  FaTint,
  FaBolt,
  FaMicroscope,
} from "react-icons/fa";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

const COMMON_CITIES = [
  "All Cities",
  "New Delhi",
  "Kochi",
  "Rohtak",
  "Mumbai",
  "Bangalore",
  "Hyderabad",
  "Chennai",
];

const POPULAR_QUICK_TESTS = [
  { label: "All Tests", query: "", icon: FaFlask, iconColor: "text-[#0067A1]" },
  { label: "CBC Blood Test", query: "CBC", icon: FaTint, iconColor: "text-rose-500" },
  { label: "Blood Sugar / Diabetes", query: "Sugar", icon: FaHeartbeat, iconColor: "text-red-500" },
  { label: "Thyroid Profile (TSH)", query: "Thyroid", icon: FaVial, iconColor: "text-sky-500" },
  { label: "Lipid / Cholesterol", query: "Lipid", icon: FaHeartbeat, iconColor: "text-rose-600" },
  { label: "Vitamin D & B12", query: "Vitamin", icon: FaBolt, iconColor: "text-amber-500" },
  { label: "Liver (LFT)", query: "Liver", icon: FaFlask, iconColor: "text-emerald-500" },
  { label: "Kidney (KFT)", query: "Kidney", icon: FaMicroscope, iconColor: "text-purple-500" },
];

function getLabLogo(lab) {
  if (!lab) return "/images/labs/default-lab-logo.svg";
  const name = (lab.lab_name || lab.name || "").toLowerCase();
  if (name.includes("medplus")) {
    return "/images/labs/medplus-logo.svg";
  }
  if (name.includes("apex")) {
    return "/images/labs/apex-logo.svg";
  }
  if (name.includes("om sai") || name.includes("omsai")) {
    return "/images/labs/omsai-logo.svg";
  }
  if (name.includes("suburban")) {
    return "/images/labs/suburban-logo.svg";
  }
  if (
    lab.profile_picture &&
    !lab.profile_picture.includes("randomuser.me") &&
    !lab.profile_picture.includes("ui-avatars.com")
  ) {
    return lab.profile_picture;
  }
  return "/images/labs/default-lab-logo.svg";
}


// Haversine formula to compute distance in km between two GPS coordinates
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const p1 = parseFloat(lat1);
  const p2 = parseFloat(lon1);
  const p3 = parseFloat(lat2);
  const p4 = parseFloat(lon2);
  if (isNaN(p1) || isNaN(p2) || isNaN(p3) || isNaN(p4)) return null;

  const R = 6371; // Earth's radius in km
  const dLat = ((p3 - p1) * Math.PI) / 180;
  const dLon = ((p4 - p2) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1 * Math.PI) / 180) *
      Math.cos((p3 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

export default function PublicLabsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialHomeCollection = searchParams?.get("home_collection") === "true";
  const initialCity = searchParams?.get("city") || "";
  const initialSearch = searchParams?.get("search") || "";

  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [city, setCity] = useState(initialCity);
  const [area, setArea] = useState("");
  const [homeCollection, setHomeCollection] = useState(initialHomeCollection);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Geolocation state
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    fetchLabs();
  }, [page, homeCollection, city, area]);

  const fetchLabs = async (override = {}) => {
    setLoading(true);
    try {
      const p = override.page !== undefined ? override.page : page;
      const s = override.search !== undefined ? override.search : search;
      const c = override.city !== undefined ? override.city : city;
      const a = override.area !== undefined ? override.area : area;
      const h = override.homeCollection !== undefined ? override.homeCollection : homeCollection;

      const params = new URLSearchParams({ page: p.toString(), limit: "24" });
      if (s.trim()) params.set("search", s.trim());
      if (c.trim() && c !== "All Cities") params.set("city", c.trim());
      if (a.trim()) params.set("area", a.trim());
      if (h) params.set("home_collection", "true");

      const res = await fetch(`/api/patient/lab/labs?${params}`);
      const data = await res.json();

      if (data.success) {
        setLabs(data.data?.labs || []);
        setTotalPages(data.data?.pagination?.totalPages || 1);
      }
    } catch {
      toast.error("Failed to load labs");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLabs({ page: 1 });
  };

  const handleQuickFilter = (query) => {
    const nextQuery = search.toLowerCase() === query.toLowerCase() ? "" : query;
    setSearch(nextQuery);
    setPage(1);
    fetchLabs({ search: nextQuery, page: 1 });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let detectedArea = "";
        let detectedCity = "";
        let displayName = "";

        try {
          const geoRes = await fetch(`/api/common/reverse-geocode?lat=${lat}&lng=${lng}`);
          const geoData = await geoRes.json();
          if (geoData.success && geoData.data) {
            detectedArea = geoData.data.area || "";
            detectedCity = geoData.data.city || "";
            displayName = geoData.data.displayName || "";
          }
        } catch (e) {
          console.warn("Reverse geocode fetch failed:", e);
        }

        setUserLocation({
          lat,
          lng,
          area: detectedArea,
          city: detectedCity,
          displayName: displayName || "Current Location",
        });
        setIsLocating(false);
        if (displayName) {
          toast.success(`Area detected: ${displayName} (Nearest labs first)`);
        } else {
          toast.success("Location detected! Labs sorted by nearest distance.");
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn("Geolocation error:", error);
        toast.error("Could not fetch location. Please enable GPS permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClearLocation = () => {
    setUserLocation(null);
    toast.success("Location filter cleared");
  };

  const handleResetFilters = () => {
    setSearch("");
    setCity("");
    setArea("");
    setHomeCollection(false);
    setUserLocation(null);
    setPage(1);
    fetchLabs({ search: "", city: "", area: "", homeCollection: false, page: 1 });
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      (city && city !== "All Cities") ||
      area.trim() ||
      homeCollection ||
      userLocation
  );

  // Compute distances & sort labs if userLocation is enabled
  const processedLabs = useMemo(() => {
    let list = labs.map((lab) => {
      let distance = null;
      if (userLocation && lab.latitude && lab.longitude) {
        distance = calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          lab.latitude,
          lab.longitude
        );
      }
      return { ...lab, distance };
    });

    if (userLocation) {
      list.sort((a, b) => {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return 0;
      });
    }

    return list;
  }, [labs, userLocation]);

  const formatOpeningHours = (hours) => {
    if (!hours) return null;
    if (typeof hours === "object") return `${hours.open || ""} - ${hours.close || ""}`;
    return hours;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* 1. COMPACT, FRIENDLY HERO & SEARCH (DESIGNED FOR FIRST SCREEN ACCESSIBILITY) */}
      <section className="bg-white border-b border-slate-200/80 pt-3 pb-4 sm:pt-6 sm:pb-6 px-3 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Top Back Link & Trust Badge */}
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
            <Link
              href="/services"
              className="inline-flex items-center text-xs font-semibold text-[#0067A1] hover:text-[#004F7C] transition-colors"
            >
              <FaArrowLeft className="mr-1.5 w-3 h-3" /> Back to Services
            </Link>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100/80 border border-sky-200/60 text-[#0067A1] text-[11px] font-bold">
              <FaShieldAlt className="w-3 h-3 text-[#0067A1]" />
              <span>NABL Certified Labs</span>
            </div>
          </div>

          {/* Clean, Friendly Title */}
          <div className="text-left sm:text-center max-w-2xl mx-auto mb-3">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Book Lab Tests & Health Checkups
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Search tests, compare lab prices, or get samples collected at home.
            </p>
          </div>

          {/* SEARCH & FILTER BOX (IMMEDIATELY VISIBLE ON FIRST SCREEN) */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4 max-w-4xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Search Input */}
                <div className="sm:col-span-5 relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search test (e.g. CBC, Sugar, Thyroid) or Lab..."
                    className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm rounded-lg bg-slate-50/90 border border-slate-200 focus:bg-white focus:border-[#0067A1] focus:ring-2 focus:ring-sky-100 text-slate-900 placeholder-slate-400 outline-none transition-all font-medium"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        fetchLabs({ search: "", page: 1 });
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* City Selector */}
                <div className="sm:col-span-3 relative">
                  <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                  <select
                    value={city}
                    onChange={(e) => {
                      const newCity = e.target.value;
                      setCity(newCity);
                      setPage(1);
                      fetchLabs({ city: newCity, page: 1 });
                    }}
                    className="w-full pl-8 pr-7 py-2.5 text-xs sm:text-sm rounded-lg bg-slate-50/90 border border-slate-200 focus:bg-white focus:border-[#0067A1] focus:ring-2 focus:ring-sky-100 text-slate-900 outline-none transition-all cursor-pointer appearance-none font-medium"
                  >
                    <option value="">All Cities</option>
                    <option value="New Delhi">New Delhi</option>
                    <option value="Kochi">Kochi</option>
                    <option value="Rohtak">Rohtak</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Bangalore">Bangalore</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                    ▼
                  </div>
                </div>

                {/* Search Button */}
                <div className="sm:col-span-4">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <FaSearch className="w-3.5 h-3.5" />
                    <span>Find Tests & Labs</span>
                  </button>
                </div>
              </div>

              {/* Quick Action Badges: Near Me & Home Collection */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* GPS Near Me */}
                  {userLocation ? (
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                      title="Click to clear location filter"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <FaMapMarkerAlt className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                      <span>{userLocation.displayName || "Near Me"} (Nearest First)</span>
                      <FaTimes className="w-2.5 h-2.5 ml-1 text-emerald-700 hover:text-emerald-950" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-[#0067A1] transition-colors cursor-pointer"
                    >
                      <FaLocationArrow className={`w-2.5 h-2.5 text-[#0067A1] ${isLocating ? "animate-spin" : ""}`} />
                      <span>{isLocating ? "Detecting Area & GPS..." : "Labs Near Me"}</span>
                    </button>
                  )}

                  {/* Home Sample Collection Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !homeCollection;
                      setHomeCollection(next);
                      setPage(1);
                      fetchLabs({ homeCollection: next, page: 1 });
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                      homeCollection
                        ? "bg-sky-50 text-[#0067A1] border-sky-300 font-bold"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <FaTruck className="w-3 h-3 text-[#0067A1]" />
                    <span>Home Sample Pickup</span>
                    {homeCollection && <FaTimes className="w-2.5 h-2.5 ml-0.5" />}
                  </button>

                  {/* Reset Filters */}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline px-1.5 py-1 cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  <strong className="text-slate-900 font-bold">{processedLabs.length}</strong> labs found
                </div>
              </div>
            </form>
          </div>

          {/* QUICK TAP TEST CATEGORY PILLS (Designed specifically for non-tech users) */}
          <div className="mt-2.5 max-w-4xl mx-auto">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                Quick Search:
              </span>
              {POPULAR_QUICK_TESTS.map((test) => {
                const isActive = (test.query === "" && !search) || (test.query !== "" && search.toLowerCase() === test.query.toLowerCase());
                const IconComponent = test.icon;
                return (
                  <button
                    key={test.label}
                    type="button"
                    onClick={() => handleQuickFilter(test.query)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#0067A1] text-white font-bold shadow-xs"
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 font-medium shadow-2xs"
                    }`}
                  >
                    {IconComponent && (
                      <IconComponent
                        className={`w-3 h-3 ${isActive ? "text-white" : test.iconColor}`}
                      />
                    )}
                    <span>{test.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. SMALL LAB CARDS GRID */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-16">
        {loading ? (
          /* Loading skeleton */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-4 h-48 animate-pulse flex flex-col justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-1.5" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
                <div className="h-8 bg-slate-100 rounded-lg w-full" />
              </div>
            ))}
          </div>
        ) : processedLabs.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-16 h-16 bg-sky-50 text-[#0067A1] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-100">
              <FaFlask className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">No Labs Match Your Search</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              We couldn't find any diagnostic labs matching your current filters. Try changing your city, area, or search term.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-[#0067A1] text-white text-xs font-semibold rounded-lg hover:bg-[#004F7C] transition-colors cursor-pointer"
            >
              Reset Filters & Show All Labs
            </button>
          </div>
        ) : (
          <>
            {/* Small Lab Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {processedLabs.map((lab, idx) => {
                const labName = lab.lab_name || lab.name || "MediConnect Partner Lab";
                const ownerName = lab.owner_name ? `By ${lab.owner_name}` : null;
                const hours = formatOpeningHours(lab.opening_hours);
                const labLogo = getLabLogo(lab);

                return (
                  <motion.div
                    key={lab.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                    onClick={() => router.push(`/services/lab-tests/${lab.id}`)}
                    className="bg-white rounded-xl border border-slate-200 hover:border-[#0067A1]/50 hover:shadow-md transition-all duration-200 p-3.5 flex flex-col justify-between group cursor-pointer relative shadow-2xs"
                  >
                    <div>
                      {/* Top Row: Logo + Name + Verified Badge */}
                      <div className="flex items-start gap-2.5 mb-2.5">
                        <div className="w-11 h-11 rounded-xl bg-white text-[#0067A1] flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs overflow-hidden p-0.5">
                          {labLogo ? (
                            <img
                              src={labLogo}
                              alt={labName}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full rounded-lg bg-sky-50 flex items-center justify-center text-[#0067A1]">
                              <FaFlask className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-[#0067A1] transition-colors truncate leading-snug">
                              {labName}
                            </h3>
                            <FaCheckCircle
                              className="w-3 h-3 text-[#0067A1] shrink-0"
                              title="Verified Diagnostic Lab"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {ownerName && (
                              <p className="text-[11px] text-slate-500 truncate">
                                {ownerName}
                              </p>
                            )}
                            {lab.rating && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                                <FaStar className="w-2.5 h-2.5 text-amber-500" />
                                {lab.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Location & Distance Row */}
                      {lab.address && (
                        <div className="mb-2 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 flex items-center justify-between gap-1 text-[11px] text-slate-600">
                          <span className="truncate flex items-center gap-1">
                            <FaMapMarkerAlt className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{lab.address}</span>
                          </span>
                          {lab.distance !== null && (
                            <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                              {lab.distance} km
                            </span>
                          )}
                        </div>
                      )}

                      {/* Matched Test Snippet (if user searched for a specific test) */}
                      {lab.matched_tests &&
                        Array.isArray(lab.matched_tests) &&
                        lab.matched_tests.length > 0 && (
                          <div className="mb-2 p-1.5 bg-sky-50/70 border border-sky-100 rounded-lg">
                            <div className="flex items-center justify-between text-[11px] text-slate-800">
                              <span className="truncate font-semibold text-[#0067A1]">
                                • {lab.matched_tests[0].test_name}
                              </span>
                              <span className="font-bold text-emerald-700 shrink-0 ml-1">
                                ₹{lab.matched_tests[0].price}
                              </span>
                            </div>
                          </div>
                        )}

                      {/* Badges Row (Home collection, Hours, Turnaround) */}
                      <div className="flex flex-wrap items-center gap-1 mb-2.5">
                        {lab.accepts_home_collection && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <FaTruck className="w-2.5 h-2.5" /> Home Pickup
                          </span>
                        )}

                        {hours && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            <FaClock className="w-2.5 h-2.5 text-slate-400" />
                            {hours}
                          </span>
                        )}

                        {lab.general_turnaround && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                            <FaVial className="w-2.5 h-2.5 text-purple-500" />
                            {lab.general_turnaround}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                        <FaShieldAlt className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Verified Lab</span>
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0067A1] group-hover:text-[#004F7C] transition-colors">
                        View Tests <FaArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* 4. HOW IT WORKS IN 3 STEPS (Cleanly placed at the bottom so it never crowds the first screen) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200/80 mt-2 mb-6">
        <div className="text-center max-w-xl mx-auto mb-6">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            How It Works in 3 Simple Steps
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quick, reliable, and completely cashless health testing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center font-bold text-xs shrink-0 border border-sky-100">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Choose Test or Lab</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Search standard tests or select the nearest verified lab in your city.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Sample Collection</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Certified phlebotomist collects sample at home or visit the lab directly.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Smart Online Reports</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Receive NABL-verified digital reports directly on your phone within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
