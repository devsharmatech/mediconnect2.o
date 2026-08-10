"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaFlask, FaSearch, FaMapMarkerAlt, FaStar, FaClock,
  FaArrowRight, FaTimes, FaPhone, FaVial, FaTruck, FaArrowLeft
} from "react-icons/fa";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

export default function PublicLabsPage() {
  const router = useRouter();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [homeCollection, setHomeCollection] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLabs();
  }, [page, homeCollection]);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "12" });
      if (search.trim()) params.set("search", search.trim());
      if (homeCollection) params.set("home_collection", "true");

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

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLabs();
  };

  const formatOpeningHours = (hours) => {
    if (!hours) return null;
    if (typeof hours === "object") return `${hours.open || ""} - ${hours.close || ""}`;
    return hours;
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0067A1] via-[#0080C6] to-[#127a72] px-6 py-8 md:px-10 md:py-10 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-[100px]" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="mb-4 mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-xl">
            <FaFlask className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold mb-3 tracking-tight">Book Lab Tests</h1>
          <p className="mt-2 text-sm md:text-base text-white/80 max-w-2xl mx-auto font-light leading-relaxed">
            Browse accredited partner laboratories, compare test prices, and book online with home sample collection.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-8 max-w-2xl mx-auto flex gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search labs by name or city..."
                className="w-full pl-11 pr-4 py-3 md:py-3.5 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-4 focus:ring-white/30 focus:outline-none text-sm shadow-xl" />
            </div>
            <button type="submit" className="px-5 py-3 md:py-3.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-colors border border-white/20 cursor-pointer hidden sm:block text-sm">
              Search
            </button>
          </form>

          {/* Filters */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button onClick={() => { setHomeCollection(!homeCollection); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${homeCollection
                ? "bg-white text-[#0067A1] border-white shadow-lg"
                : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"}`}>
              <FaTruck className="w-3.5 h-3.5" />
              Home Collection
              {homeCollection && <FaTimes className="w-3 h-3 ml-1" />}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Back */}
        <div className="mb-8">
          <Link href="/website/services" className="inline-flex items-center text-sm font-medium text-[#0067A1] hover:text-[#004F7C] hover:underline">
            <FaArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to Services
          </Link>
        </div>

        {/* Stats */}
        {!loading && labs.length > 0 && (
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm text-gray-500"><strong className="text-gray-900">{labs.length}</strong> labs found</span>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-500"><strong className="text-emerald-600">{labs.filter(l => l.accepts_home_collection).length}</strong> with home collection</span>
          </div>
        )}

        {/* Lab Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 h-64 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-xl" />
                  <div className="flex-1"><div className="h-5 bg-gray-200 rounded w-3/4 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div>
                </div>
                <div className="space-y-2"><div className="h-3 bg-gray-100 rounded w-full" /><div className="h-3 bg-gray-100 rounded w-2/3" /></div>
                <div className="mt-4 h-10 bg-gray-200 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : labs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-14 text-center shadow-sm">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <FaFlask className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Labs Found</h3>
            <p className="text-gray-500 max-w-md mx-auto">{search ? "Try a different search term." : "No labs available at the moment."}</p>
            {search && (
              <button onClick={() => { setSearch(""); setHomeCollection(false); fetchLabs(); }}
                className="mt-4 text-[#0067A1] font-semibold hover:underline cursor-pointer">Clear Filters</button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {labs.map((lab, idx) => (
                <motion.div
                  key={lab.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => router.push(`/website/services/lab-tests/${lab.id}`)}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:shadow-[#0067A1]/5 hover:border-[#0067A1]/30 transition-all duration-300 cursor-pointer group flex flex-col h-full relative shadow-sm"
                >
                  {/* Decorative top border */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#0067A1] via-[#0080C6] to-[#127a72] opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 left-0" />

                  <div className="p-6 flex-1 flex flex-col">
                    {/* Lab Header Info */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#0067A1]/10 to-[#0067A1]/5 rounded-2xl flex items-center justify-center shrink-0 border border-[#0067A1]/10 group-hover:bg-[#0067A1] group-hover:text-white transition-colors shadow-sm overflow-hidden">
                        <FaFlask className="w-7 h-7 text-[#0067A1] group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#0067A1] transition-colors leading-tight truncate">
                          {lab.lab_name || lab.name || "MediConnect Partner Lab"}
                        </h3>
                        {lab.owner_name && (
                          <p className="text-xs text-gray-500 mt-1 font-medium">By {lab.owner_name}</p>
                        )}
                        {lab.phone_number && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 mt-2">
                            <FaPhone className="w-3 h-3 text-gray-400" />
                            {lab.phone_number}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Address block */}
                    {lab.address && (
                      <p className="text-xs text-gray-600 mb-4 flex items-start gap-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <FaMapMarkerAlt className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                        <span className="leading-relaxed line-clamp-2">{lab.address}</span>
                      </p>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {lab.rating && (
                        <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100/50">
                          <FaStar className="w-4 h-4 text-amber-500" />
                          <div>
                            <p className="text-xs font-bold text-amber-900 leading-none">{lab.rating}</p>
                            {lab.total_reviews > 0 && <p className="text-[9px] text-amber-700 mt-0.5">{lab.total_reviews} reviews</p>}
                          </div>
                        </div>
                      )}
                      {lab.opening_hours && (
                        <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2 border border-blue-100/50">
                          <FaClock className="w-4 h-4 text-blue-500" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-[#0067A1] font-semibold uppercase tracking-wider leading-none mb-0.5">Hours</p>
                            <p className="text-xs font-bold text-blue-900 truncate">{formatOpeningHours(lab.opening_hours)}</p>
                          </div>
                        </div>
                      )}
                      {lab.general_turnaround && (
                        <div className="flex items-center gap-2 bg-purple-50 rounded-xl px-3 py-2 border border-purple-100/50 col-span-2">
                          <FaVial className="w-4 h-4 text-purple-500" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider leading-none mb-0.5">Avg Turnaround</p>
                            <p className="text-xs font-bold text-purple-900 truncate">{lab.general_turnaround}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Badges / Services */}
                    <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
                      {lab.accepts_home_collection && (
                        <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-green-200">
                          <FaTruck className="w-3 h-3" /> Home Collection
                        </span>
                      )}

                      {/* Show services */}
                      {lab.services && Array.isArray(lab.services) && lab.services.slice(0, 3).map((svc, i) => (
                        <span key={i} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-full truncate max-w-[140px] border border-gray-200">
                          {typeof svc === "object" ? svc.service_name : svc}
                        </span>
                      ))}
                      {lab.services && Array.isArray(lab.services) && lab.services.length > 3 && (
                        <span className="text-[10px] font-bold bg-gray-50 text-gray-500 px-2 py-1.5 rounded-full border border-gray-200">
                          +{lab.services.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer action */}
                  <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between group-hover:bg-[#0067A1]/5 transition-colors">
                    <span className="text-sm font-bold text-[#0067A1]">View tests & book</span>
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-[#0067A1] group-hover:text-white transition-all">
                      <FaArrowRight className="w-3.5 h-3.5 text-[#0067A1] group-hover:text-white" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm">Previous</button>
                <span className="text-sm text-gray-400 font-medium">Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
