"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wind,
  Footprints,
  Activity,
  Calendar,
  Clock,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  X,
  ExternalLink,
  CheckCircle2,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
  MapPin,
} from "lucide-react";
import RealGpsMap from "@/components/public-site/health/RealGpsMap";

// Helper: Format readable date and time
function formatReadableDateTime(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}, ${timeStr}`;
  } catch (_) {
    return isoString;
  }
}

function LungActivitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // User state
  const [userId, setUserId] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("user") || localStorage.getItem("userData");
        if (storedUser) {
          const u = JSON.parse(storedUser);
          return u.id || u.user_id || u.user?.id || null;
        }
      } catch (_) {}
    }
    return null;
  });

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState(null);

  // Filter States
  const [dateFilter, setDateFilter] = useState("all"); // 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'assessment' | '6mwt' | 'move' | 'breathing'
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest' | 'duration_desc' | 'duration_asc'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch activities from API
  const fetchActivities = async () => {
    setLoading(true);
    try {
      const targetUser = userId || "usr_guest";
      const res = await fetch(`/api/v1/lung/activity-sessions?user_id=${targetUser}&limit=200`);
      const json = await res.json();
      if (json.success && json.data?.sessions) {
        setActivities(json.data.sessions);
      }
    } catch (err) {
      console.warn("Could not fetch lung activity sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [userId]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, customStartDate, customEndDate, typeFilter, searchQuery, sortBy, itemsPerPage]);

  // Filter & Sort Engine
  const filteredActivities = useMemo(() => {
    let result = [...activities];

    // 1. Date Filter
    if (dateFilter !== "all") {
      const now = new Date();
      now.setHours(23, 59, 59, 999);

      if (dateFilter === "today") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        result = result.filter((a) => {
          const d = new Date(a.created_at);
          return d >= todayStart && d <= now;
        });
      } else if (dateFilter === "yesterday") {
        const yStart = new Date();
        yStart.setDate(yStart.getDate() - 1);
        yStart.setHours(0, 0, 0, 0);
        const yEnd = new Date(yStart);
        yEnd.setHours(23, 59, 59, 999);
        result = result.filter((a) => {
          const d = new Date(a.created_at);
          return d >= yStart && d <= yEnd;
        });
      } else if (dateFilter === "7d") {
        const past7 = new Date();
        past7.setDate(past7.getDate() - 7);
        past7.setHours(0, 0, 0, 0);
        result = result.filter((a) => {
          const d = new Date(a.created_at);
          return d >= past7 && d <= now;
        });
      } else if (dateFilter === "30d") {
        const past30 = new Date();
        past30.setDate(past30.getDate() - 30);
        past30.setHours(0, 0, 0, 0);
        result = result.filter((a) => {
          const d = new Date(a.created_at);
          return d >= past30 && d <= now;
        });
      } else if (dateFilter === "this_month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter((a) => {
          const d = new Date(a.created_at);
          return d >= monthStart && d <= now;
        });
      } else if (dateFilter === "custom") {
        if (customStartDate) {
          const s = new Date(customStartDate);
          s.setHours(0, 0, 0, 0);
          result = result.filter((a) => new Date(a.created_at) >= s);
        }
        if (customEndDate) {
          const e = new Date(customEndDate);
          e.setHours(23, 59, 59, 999);
          result = result.filter((a) => new Date(a.created_at) <= e);
        }
      }
    }

    // 2. Type Filter
    if (typeFilter !== "all") {
      result = result.filter((a) => {
        const t = (a.activity_type || "").toLowerCase();
        const title = (a.title || "").toLowerCase();

        if (typeFilter === "assessment") {
          return t === "lung_assessment" || t === "assessment" || title.includes("assessment");
        }
        if (typeFilter === "6mwt") {
          return t === "lung_walk" || t === "6mwt" || title.includes("6mwt") || title.includes("walk test");
        }
        if (typeFilter === "move") {
          return t === "lung_move" || t === "walk" || t === "jog" || t === "run" || title.includes("move");
        }
        if (typeFilter === "breathing") {
          return t === "lung_breathing" || t === "breathing" || title.includes("breath");
        }
        return true;
      });
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => {
        const title = (a.title || a.activity_type || "").toLowerCase();
        const notes = (a.notes || "").toLowerCase();
        return title.includes(q) || notes.includes(q);
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      const durA = Number(a.duration_seconds || 0);
      const durB = Number(b.duration_seconds || 0);

      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "duration_desc") return durB - durA;
      if (sortBy === "duration_asc") return durA - durB;
      return dateB - dateA; // default 'newest'
    });

    return result;
  }, [activities, dateFilter, customStartDate, customEndDate, typeFilter, searchQuery, sortBy]);

  // Overall Statistics from all activities
  const stats = useMemo(() => {
    const totalCount = activities.length;
    const totalSecs = activities.reduce((acc, a) => acc + (Number(a.duration_seconds) || 0), 0);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.round((totalSecs % 3600) / 60);
    const timeDisplay = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    const completedCount = activities.filter(
      (a) => a.status === "completed" || a.state === "COMPLETED" || (Number(a.duration_seconds) || 0) > 0
    ).length;

    return {
      totalCount,
      timeDisplay,
      completedCount,
    };
  }, [activities]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedActivities = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredActivities.slice(start, start + itemsPerPage);
  }, [filteredActivities, safeCurrentPage, itemsPerPage]);

  const hasActiveFilters =
    dateFilter !== "all" ||
    typeFilter !== "all" ||
    searchQuery.trim() !== "" ||
    sortBy !== "newest";

  const handleResetFilters = () => {
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setTypeFilter("all");
    setSearchQuery("");
    setSortBy("newest");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/lung-connect" className="hover:text-slate-900 transition-colors">
              LungConnect
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900">All Activities</span>
          </div>

          <Link
            href="/lung-connect?tab=my-activities"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0067A1] hover:text-[#005280] bg-white border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-[5px] shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to LungConnect Hub</span>
          </Link>
        </div>

        {/* Page Title & Subtitle */}
        <div className="bg-white border border-slate-200 rounded-[6px] p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0067A1] bg-sky-50 px-2 py-0.5 rounded-[4px] border border-sky-200">
                  Authoritative Health Telemetry
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  LC-14 Activity Registry
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#003358]">
                Recorded Activities & Telemetry
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Complete longitudinal activity log. Filter Move sessions, 6-Minute Walk Tests, and Respiratory Wellness Assessments with custom date intervals and pagination.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchActivities}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-[5px] transition-colors self-start md:self-auto cursor-pointer shrink-0"
              title="Refresh telemetry"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Records</span>
            </button>
          </div>

          {/* Stat Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                Total Sessions
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#003358] mt-0.5">
                {stats.totalCount}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                Total Duration
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#003358] mt-0.5">
                {stats.timeDisplay}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                Completed
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 mt-0.5">
                {stats.completedCount}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                Filtered Results
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#0067A1] mt-0.5">
                {filteredActivities.length}
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTERS & SEARCH CONTROL PANEL ── */}
        <div className="bg-white border border-slate-200 rounded-[6px] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0067A1]" />
              <h2 className="text-sm font-bold text-slate-950">Filters & Controls</h2>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          {/* Quick Date Tabs */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Date Filter
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "7d", label: "Last 7 Days" },
                { id: "30d", label: "Last 30 Days" },
                { id: "this_month", label: "This Month" },
                { id: "custom", label: "Custom Range" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDateFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer ${
                    dateFilter === tab.id
                      ? "bg-[#003358] text-white shadow-2xs font-bold"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Custom Range Date Pickers */}
            {dateFilter === "custom" && (
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-600 font-semibold shrink-0">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-[4px] px-2.5 py-1.5 font-medium text-slate-900 cursor-pointer w-full sm:w-auto focus:outline-[#0067A1]"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-600 font-semibold shrink-0">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-[4px] px-2.5 py-1.5 font-medium text-slate-900 cursor-pointer w-full sm:w-auto focus:outline-[#0067A1]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Secondary Controls: Type, Sort, Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            {/* Activity Type Dropdown */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Activity Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-[5px] px-3 py-2 font-medium text-slate-900 cursor-pointer focus:outline-[#0067A1]"
              >
                <option value="all">All Activities</option>
                <option value="assessment">Respiratory Wellness Assessment</option>
                <option value="6mwt">6-Minute Walk Test (6MWT)</option>
                <option value="move">Move: Walk / Jog / Run</option>
                <option value="breathing">Guided Breathing Studio</option>
              </select>
            </div>

            {/* Sort Order Dropdown */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Sort Order
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-[5px] px-3 py-2 font-medium text-slate-900 cursor-pointer focus:outline-[#0067A1]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="duration_desc">Duration (Longest First)</option>
                <option value="duration_asc">Duration (Shortest First)</option>
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search activity name or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-[5px] pl-8 pr-3 py-2 font-medium text-slate-900 placeholder:text-slate-400 focus:outline-[#0067A1]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── ACTIVITIES LIST TABLE / CARDS ── */}
        <div className="bg-white border border-slate-200 rounded-[6px] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-950">Activity Log</span>
              <span className="text-xs font-mono font-bold text-[#0067A1] bg-sky-50 px-2 py-0.5 rounded-[4px] border border-sky-200">
                {filteredActivities.length} items
              </span>
            </div>

            {/* Items Per Page Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="hidden sm:inline">Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 rounded-[4px] px-2 py-1 text-xs font-semibold cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold">Loading recorded activities from AWS RDS...</p>
            </div>
          ) : paginatedActivities.length > 0 ? (
            <div className="space-y-2.5">
              {paginatedActivities.map((item) => {
                const isBreathing =
                  item.activity_type === "breathing" ||
                  item.activity_type === "lung_breathing" ||
                  String(item.title || "").toLowerCase().includes("breath");
                const is6MWT =
                  item.activity_type === "lung_walk" ||
                  item.activity_type === "6mwt" ||
                  String(item.title || "").toLowerCase().includes("6mwt");
                const isAssessment =
                  item.activity_type === "lung_assessment" ||
                  item.activity_type === "assessment" ||
                  String(item.title || "").toLowerCase().includes("assessment");

                const rawDistance = item.distance_km ?? (item.distance_m ? (item.distance_m / 1000).toFixed(2) : null);
                const hasDistance = rawDistance && Number(rawDistance) > 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedActivityDetail(item)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[5px] border border-slate-200 hover:border-[#0067A1] bg-white hover:bg-slate-50/70 transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon */}
                      <div
                        className={`w-9 h-9 rounded-[5px] flex items-center justify-center shrink-0 font-bold text-xs ${
                          isBreathing
                            ? "bg-blue-50 text-[#0067A1] border border-blue-200"
                            : is6MWT
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : isAssessment
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {isBreathing ? (
                          <Wind className="w-4 h-4" />
                        ) : is6MWT ? (
                          <Activity className="w-4 h-4" />
                        ) : isAssessment ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Footprints className="w-4 h-4" />
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-950 group-hover:text-[#0067A1] transition-colors">
                            {item.title || item.activity_type?.replace("lung_", "")}
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Completed
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                          <span>{formatReadableDateTime(item.created_at)}</span>
                          {hasDistance && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[#0067A1] font-semibold">
                                {Number(rawDistance).toFixed(2)} km
                              </span>
                            </>
                          )}
                          {item.steps > 0 && (
                            <>
                              <span>•</span>
                              <span>{item.steps} steps</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Duration & Arrow */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className="text-xs font-bold font-mono text-[#003358] bg-slate-100 px-2.5 py-1 rounded-[4px] border border-slate-200">
                        {item.duration_seconds
                          ? item.duration_seconds < 60
                            ? `${item.duration_seconds}s`
                            : `${Math.round(item.duration_seconds / 60)} min`
                          : "Completed"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0067A1] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-[5px] bg-slate-50/60 p-6">
              <Footprints className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">No activities match your filters</div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                Try selecting a different date range or resetting your filters to see past activities.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#0067A1] hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          )}

          {/* ── PAGINATION CONTROLS BAR ── */}
          {filteredActivities.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs">
              <div className="text-slate-600 font-medium">
                Showing <strong className="text-slate-950 font-bold">{(safeCurrentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                <strong className="text-slate-950 font-bold">
                  {Math.min(safeCurrentPage * itemsPerPage, filteredActivities.length)}
                </strong>{" "}
                of <strong className="text-slate-950 font-bold">{filteredActivities.length}</strong> recorded sessions
              </div>

              <div className="flex items-center gap-1 self-center sm:self-auto">
                {/* Previous Button */}
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] border border-slate-200 font-bold transition-colors cursor-pointer ${
                    safeCurrentPage <= 1
                      ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400"
                      : "bg-white hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                {/* Numbered Page Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const hasGap = prev && p - prev > 1;

                    return (
                      <React.Fragment key={p}>
                        {hasGap && <span className="px-1 text-slate-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-[4px] text-xs font-bold transition-colors cursor-pointer ${
                            safeCurrentPage === p
                              ? "bg-[#003358] text-white shadow-2xs"
                              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                {/* Next Button */}
                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] border border-slate-200 font-bold transition-colors cursor-pointer ${
                    safeCurrentPage >= totalPages
                      ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400"
                      : "bg-white hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── ACTIVITY DETAIL MODAL (Google Maps + Metrics HUD) ── */}
        <AnimatePresence>
          {selectedActivityDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white w-full max-h-[92vh] max-w-md rounded-[6px] shadow-2xl border border-slate-300 flex flex-col overflow-hidden font-sans text-slate-900"
              >
                {(() => {
                  const isBreathing =
                    selectedActivityDetail.activity_type === "breathing" ||
                    selectedActivityDetail.activity_type === "lung_breathing" ||
                    String(selectedActivityDetail.title || "").toLowerCase().includes("breath");

                  const durationSec = Number(selectedActivityDetail.duration_seconds || 0);
                  const durationLabel =
                    durationSec > 0
                      ? durationSec < 60
                        ? `${durationSec}s`
                        : `${Math.round(durationSec / 60)} min`
                      : "Completed";

                  const rawDistance =
                    selectedActivityDetail.distance_km ??
                    (selectedActivityDetail.distance_m
                      ? (selectedActivityDetail.distance_m / 1000).toFixed(2)
                      : null);
                  const distanceLabel =
                    rawDistance !== null ? `${Number(rawDistance).toFixed(2)} km` : isBreathing ? "0 km" : "—";

                  const paceLabel =
                    selectedActivityDetail.avg_pace ||
                    (selectedActivityDetail.pace_kmh ? `${selectedActivityDetail.pace_kmh} km/h` : "—");
                  const stepsCount =
                    selectedActivityDetail.steps !== undefined && selectedActivityDetail.steps !== null
                      ? Number(selectedActivityDetail.steps).toLocaleString()
                      : rawDistance && !isBreathing
                      ? Math.round(Number(rawDistance) * 1300).toLocaleString()
                      : isBreathing
                      ? "0"
                      : "—";

                  return (
                    <>
                      {/* Modal Header */}
                      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-100 shrink-0">
                        <div className="flex items-center gap-2">
                          {isBreathing ? (
                            <Wind className="w-4 h-4 text-[#0067A1]" />
                          ) : (
                            <Footprints className="w-4 h-4 text-[#0067A1]" />
                          )}
                          <span className="text-xs font-bold text-slate-950">Activity Detail</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedActivityDetail(null)}
                          className="p-1.5 hover:bg-slate-200 rounded-[5px] transition-colors cursor-pointer text-slate-800"
                          aria-label="Close modal"
                        >
                          <X className="w-4 h-4 text-slate-800" />
                        </button>
                      </div>

                      {/* Modal Body */}
                      <div className="p-4 sm:p-5 space-y-4 text-xs flex-1 overflow-y-auto">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-extrabold text-sm text-slate-950 capitalize">
                              {selectedActivityDetail.title || selectedActivityDetail.activity_type}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {formatReadableDateTime(selectedActivityDetail.created_at)}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Verified
                          </span>
                        </div>

                        {/* Metric Grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-2.5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">
                              Duration
                            </span>
                            <strong className="text-sm font-mono font-bold text-[#003358]">{durationLabel}</strong>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-2.5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">
                              Distance
                            </span>
                            <strong className="text-sm font-mono font-bold text-[#003358]">{distanceLabel}</strong>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-2.5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">
                              Steps
                            </span>
                            <strong className="text-sm font-mono font-bold text-[#003358]">{stepsCount}</strong>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-2.5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">
                              Avg Pace / Speed
                            </span>
                            <strong className="text-sm font-mono font-bold text-[#003358]">{paceLabel}</strong>
                          </div>
                        </div>

                        {/* Google Maps Route Display */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                            Location & Google Maps Telemetry
                          </label>
                          <RealGpsMap
                            isLiveTracking={false}
                            distanceKm={distanceLabel !== "—" ? distanceLabel : "0 km"}
                            activity={selectedActivityDetail.activity_type || "ACTIVITY"}
                            height="h-44"
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedActivityDetail(null)}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[5px] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Close Activity Detail
                        </button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function LungActivitiesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading activities...</div>}>
      <LungActivitiesContent />
    </Suspense>
  );
}
