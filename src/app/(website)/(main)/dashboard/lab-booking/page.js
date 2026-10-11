"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    FaFlask, FaSearch, FaMapMarkerAlt, FaStar, FaClock,
    FaArrowRight, FaTimes, FaPhone, FaVial, FaTruck,
    FaBuilding, FaCheckCircle, FaReceipt
} from "react-icons/fa";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function BrowseLabsPage() {
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
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "12",
            });
            if (search.trim()) params.set("search", search.trim());
            if (homeCollection) params.set("home_collection", "true");

            const res = await fetch(`/api/patient/lab/labs?${params}`);
            const data = await res.json();

            if (data.success) {
                setLabs(data.data?.labs || []);
                setTotalPages(data.data?.pagination?.totalPages || 1);
            } else {
                toast.error(data.message || "Failed to load labs");
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
        <div className="min-h-screen bg-[#F8FAFC] py-6 sm:py-8">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Book Lab Tests
                        </h1>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">
                            Browse verified diagnostic laboratories, compare test catalog & schedule investigations
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/lab-booking/orders")}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-[#0067A1] hover:border-[#0067A1]/40 shadow-xs hover:shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                    >
                        <FaReceipt className="w-3.5 h-3.5 text-[#0067A1]" />
                        <span>My Lab Orders</span>
                    </button>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 mb-6 sm:mb-8">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        <div className="relative flex-1">
                            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search diagnostic labs by name, test or city..."
                                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] text-xs sm:text-sm transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => { setHomeCollection(!homeCollection); setPage(1); }}
                                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                                    homeCollection
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs hover:shadow-sm"
                                }`}
                            >
                                <FaTruck className="w-3 h-3 text-emerald-600" />
                                <span>Home Collection</span>
                                {homeCollection && <FaTimes className="w-2.5 h-2.5 ml-1 text-emerald-700" />}
                            </button>

                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-[#0067A1] hover:bg-[#005282] text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs hover:shadow-sm"
                            >
                                Search
                            </button>
                        </div>
                    </form>

                    {/* Stats Summary */}
                    {!loading && labs.length > 0 && (
                        <div className="flex items-center gap-4 text-xs pt-3 mt-3 border-t border-slate-100 flex-wrap">
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <span className="font-bold text-slate-900">{labs.length}</span>
                                <span>Accredited Labs Found</span>
                            </div>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <span className="font-bold text-emerald-700">
                                    {labs.filter(l => l.accepts_home_collection).length}
                                </span>
                                <span>Offer Home Sample Collection</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Lab Cards Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-72 animate-pulse flex flex-col justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="space-y-2 my-4">
                                    <div className="h-3 bg-slate-100 rounded w-full" />
                                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                                </div>
                                <div className="h-10 bg-slate-200 rounded-xl w-full" />
                            </div>
                        ))}
                    </div>
                ) : labs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 sm:p-14 text-center max-w-md mx-auto">
                        <div className="w-14 h-14 bg-[#0067A1]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#0067A1]">
                            <FaFlask className="w-6 h-6" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">No Diagnostic Labs Found</h3>
                        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                            {search ? "No labs matched your search keywords. Try adjusting your search." : "There are currently no active labs matching the selected filters."}
                        </p>
                        {(search || homeCollection) && (
                            <button
                                type="button"
                                onClick={() => { setSearch(""); setHomeCollection(false); setPage(1); fetchLabs(); }}
                                className="mt-5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {labs.map((lab, idx) => (
                                <motion.div
                                    key={lab.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    onClick={() => router.push(`/dashboard/lab-booking/${lab.id}`)}
                                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#0067A1]/50 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between overflow-hidden"
                                >
                                    <div className="p-5 flex-1 flex flex-col">
                                        {/* Lab Header */}
                                        <div className="flex items-start gap-3.5 pb-3.5 border-b border-slate-100">
                                            <div className="w-12 h-12 bg-[#0067A1]/10 text-[#0067A1] rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                                                <FaBuilding className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0067A1] transition-colors leading-snug truncate">
                                                        {lab.lab_name || lab.name || "MediConnect Partner Lab"}
                                                    </h3>
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded-full shrink-0">
                                                        <FaCheckCircle className="w-2.5 h-2.5" />
                                                        Verified
                                                    </span>
                                                </div>
                                                {lab.owner_name && (
                                                    <p className="text-xs text-slate-500 mt-0.5">By {lab.owner_name}</p>
                                                )}
                                                {lab.phone_number && (
                                                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                                                        <FaPhone className="w-2.5 h-2.5 text-slate-400" />
                                                        <span>{lab.phone_number}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Location */}
                                        {lab.address && (
                                            <div className="my-3 flex items-start gap-2 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                                                <FaMapMarkerAlt className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                                                <span className="leading-relaxed line-clamp-2">{lab.address}</span>
                                            </div>
                                        )}

                                        {/* Medical Metrics Badges */}
                                        <div className="grid grid-cols-2 gap-2 my-2">
                                            {lab.rating && (
                                                <div className="flex items-center gap-1.5 bg-amber-50/80 rounded-xl px-2.5 py-2 border border-amber-200/60">
                                                    <FaStar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-amber-900 leading-none">{lab.rating}</p>
                                                        {lab.total_reviews > 0 && <p className="text-[9px] text-amber-700 mt-0.5">{lab.total_reviews} reviews</p>}
                                                    </div>
                                                </div>
                                            )}
                                            {lab.opening_hours && (
                                                <div className="flex items-center gap-1.5 bg-sky-50/80 rounded-xl px-2.5 py-2 border border-sky-200/60">
                                                    <FaClock className="w-3.5 h-3.5 text-[#0067A1] shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-bold text-[#0067A1] uppercase tracking-wider leading-none mb-0.5">Hours</p>
                                                        <p className="text-xs font-bold text-sky-900 truncate">{formatOpeningHours(lab.opening_hours)}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {lab.general_turnaround && (
                                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2.5 py-2 border border-slate-200/80 col-span-2">
                                                    <FaVial className="w-3.5 h-3.5 text-[#0067A1] shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-0.5">Avg Turnaround</p>
                                                        <p className="text-xs font-bold text-slate-800 truncate">{lab.general_turnaround}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Home Collection & Services */}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2">
                                            {lab.accepts_home_collection && (
                                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.8 rounded-md flex items-center gap-1">
                                                    <FaTruck className="w-2.5 h-2.5 text-emerald-600" />
                                                    Home Collection
                                                </span>
                                            )}
                                            {lab.services && Array.isArray(lab.services) && lab.services.slice(0, 2).map((svc, i) => (
                                                <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.8 rounded-md truncate max-w-[130px] border border-slate-200">
                                                    {typeof svc === "object" ? svc.service_name : svc}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action CTA */}
                                    <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between group-hover:bg-[#0067A1]/5 transition-colors">
                                        <span className="text-xs font-bold text-[#0067A1]">Select Lab</span>
                                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center group-hover:bg-[#0067A1] group-hover:text-white group-hover:border-[#0067A1] transition-all">
                                            <FaArrowRight className="w-3 h-3 text-[#0067A1] group-hover:text-white" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-8">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs hover:shadow-sm"
                                >
                                    Previous
                                </button>
                                <span className="text-xs text-slate-500 font-semibold">Page {page} of {totalPages}</span>
                                <button
                                    type="button"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(page + 1)}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs hover:shadow-sm"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
