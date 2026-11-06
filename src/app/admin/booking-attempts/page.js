"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  UserCheck,
  Activity,
  RefreshCw,
  Stethoscope,
  Eye,
  Filter,
  TrendingUp,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Building2,
} from "lucide-react";

export default function AdminPatientVisitsPage() {
  const router = useRouter();
  const [doctorGroups, setDoctorGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [sortBy, setSortBy] = useState("visits_desc");

  // Client Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchVisits = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/booking-attempts", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setDoctorGroups(json.data || []);
      } else {
        setError(json.message || "Failed to fetch consultation records");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message || "An error occurred while loading consultations data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  // Distinct Specializations for filter dropdown
  const specializations = useMemo(() => {
    const list = doctorGroups
      .map((g) => g.doctor?.specialization?.trim())
      .filter(Boolean);
    return ["all", ...Array.from(new Set(list))];
  }, [doctorGroups]);

  // Filtered & Sorted Groups
  const filteredGroups = useMemo(() => {
    return doctorGroups
      .filter((g) => {
        const docName = (g.doctor?.name || "").toLowerCase();
        const spec = (g.doctor?.specialization || "").toLowerCase();
        const email = (g.doctor?.email || "").toLowerCase();
        const phone = (g.doctor?.phone || "").toLowerCase();

        // Search match
        const matchesSearch =
          !searchTerm.trim() ||
          docName.includes(searchTerm.toLowerCase()) ||
          spec.includes(searchTerm.toLowerCase()) ||
          email.includes(searchTerm.toLowerCase()) ||
          phone.includes(searchTerm.toLowerCase());

        // Specialty filter
        const matchesSpecialty =
          specialtyFilter === "all" ||
          (g.doctor?.specialization || "").toLowerCase() ===
            specialtyFilter.toLowerCase();

        return matchesSearch && matchesSpecialty;
      })
      .sort((a, b) => {
        if (sortBy === "visits_desc") {
          return (b.total_visits || 0) - (a.total_visits || 0);
        }
        if (sortBy === "visits_asc") {
          return (a.total_visits || 0) - (b.total_visits || 0);
        }
        if (sortBy === "patients_desc") {
          return (b.unique_patients_count || 0) - (a.unique_patients_count || 0);
        }
        if (sortBy === "name_asc") {
          return (a.doctor?.name || "").localeCompare(b.doctor?.name || "");
        }
        return 0;
      });
  }, [doctorGroups, searchTerm, specialtyFilter, sortBy]);

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, specialtyFilter, sortBy]);

  // Overall KPI Metrics
  const totalDoctors = doctorGroups.length;
  const totalPatients = doctorGroups.reduce(
    (acc, g) => acc + (g.unique_patients_count || 0),
    0
  );
  const totalVisits = doctorGroups.reduce(
    (acc, g) => acc + (g.total_visits || 0),
    0
  );
  const avgVisits =
    totalDoctors > 0 ? (totalVisits / totalDoctors).toFixed(1) : "0";

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / itemsPerPage));
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isFilterActive =
    searchTerm.trim() !== "" ||
    specialtyFilter !== "all" ||
    sortBy !== "visits_desc";

  const handleResetFilters = () => {
    setSearchTerm("");
    setSpecialtyFilter("all");
    setSortBy("visits_desc");
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "DR"
    );
  };

  return (
    <main className="flex-1 bg-slate-50 dark:bg-slate-900 min-h-screen relative w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0067A1] mb-1">
              <span>Clinical Practice</span>
              <span>/</span>
              <span>Patients & Bookings</span>
              <span>/</span>
              <span className="text-slate-500">Consultations Tracker</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              Consultations Tracker
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0067A1]/10 text-[#0067A1] border border-[#0067A1]/20">
                {totalDoctors} Active Doctors
              </span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Track doctor clinical activity, unique patient volume, and total consultation throughput across all departments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchVisits}
              disabled={loading}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Refresh consultations data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#0067A1] ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Clinical KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Active Doctors */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-blue-50 text-[#0067A1]">
                <UserCheck className="w-4 h-4 text-[#0067A1]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#0067A1]">
                Doctors
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {totalDoctors}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Active clinicians with consultations
              </p>
            </div>
          </div>

          {/* Card 2: Unique Patients */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                <Users className="w-4 h-4 text-teal-700" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                Patients
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {totalPatients}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Unique individuals treated
              </p>
            </div>
          </div>

          {/* Card 3: Total Consultations */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <Activity className="w-4 h-4 text-emerald-700" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Sessions
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {totalVisits}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Total completed & scheduled visits
              </p>
            </div>
          </div>

          {/* Card 4: Average Workload */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                <TrendingUp className="w-4 h-4 text-indigo-700" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Avg. Load
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {avgVisits}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Consultations per clinician
              </p>
            </div>
          </div>
        </div>

        {/* Clinical Search & Filter Toolbar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search doctor by name, specialty, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Specialization Filter */}
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="py-2 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
              >
                <option value="all">All Specialties</option>
                {specializations
                  .filter((s) => s !== "all")
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>

              {/* Sort By Filter */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="py-2 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
              >
                <option value="visits_desc">Most Consultations</option>
                <option value="visits_asc">Least Consultations</option>
                <option value="patients_desc">Most Unique Patients</option>
                <option value="name_asc">Doctor Name (A-Z)</option>
              </select>

              {/* Reset Button */}
              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500">
            <span>
              Showing{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {paginatedGroups.length}
              </strong>{" "}
              of {filteredGroups.length} doctors
            </span>
            {isFilterActive && (
              <span className="text-[#0067A1] font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filters active
              </span>
            )}
          </div>
        </div>

        {/* Main Records Container */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin"></div>
              <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                Loading consultations tracker...
              </p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-600 font-medium px-4">
              <p className="text-sm">{error}</p>
              <button
                onClick={fetchVisits}
                className="mt-3 px-3 py-1.5 bg-[#0067A1] text-white text-xs font-semibold rounded-lg hover:bg-[#004F7C] cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center max-w-sm mx-auto px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <Stethoscope className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No Doctors Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {isFilterActive
                  ? "No doctor activity matches your search or filter criteria."
                  : "No doctor consultation records are currently logged."}
              </p>
              {isFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C] transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Responsive Mobile Cards View (md:hidden) */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedGroups.map((group, idx) => {
                  const docName = group.doctor?.name || "Dr. Medical Practitioner";
                  const spec = group.doctor?.specialization || "General Medicine";
                  const patientsCount = group.unique_patients_count || 0;
                  const visitsCount = group.total_visits || 0;
                  const ratio = (visitsCount / (patientsCount || 1)).toFixed(1);

                  return (
                    <div key={group.doctor?.id || idx} className="p-4 space-y-3">
                      {/* Doctor header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold text-xs flex items-center justify-center shrink-0 border border-[#0067A1]/20">
                            {getInitials(docName)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {docName}
                            </h4>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-[#0067A1] border border-sky-200">
                              {spec}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Micro KPI stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                          <span className="text-teal-700 dark:text-teal-300 font-medium">
                            Patients
                          </span>
                          <span className="font-bold text-teal-900 dark:text-teal-100">
                            {patientsCount}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                            Sessions
                          </span>
                          <span className="font-bold text-emerald-900 dark:text-emerald-100">
                            {visitsCount}
                          </span>
                        </div>
                      </div>

                      {/* Bottom action */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500">
                          Avg: {ratio} visits / pt
                        </span>
                        <button
                          onClick={() =>
                            router.push(`/admin/booking-attempts/${group.doctor.id}`)
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-[#0067A1] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Patients
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Professional Table (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 uppercase text-[10.5px] font-bold tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Doctor</th>
                      <th className="px-5 py-3.5">Specialization</th>
                      <th className="px-5 py-3.5 text-center">Unique Patients</th>
                      <th className="px-5 py-3.5 text-center">Total Consultations</th>
                      <th className="px-5 py-3.5 text-center">Avg. Visits / Patient</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {paginatedGroups.map((group, idx) => {
                      const docName = group.doctor?.name || "Dr. Medical Practitioner";
                      const spec = group.doctor?.specialization || "General Medicine";
                      const patientsCount = group.unique_patients_count || 0;
                      const visitsCount = group.total_visits || 0;
                      const ratio = (visitsCount / (patientsCount || 1)).toFixed(1);

                      return (
                        <tr
                          key={group.doctor?.id || idx}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          {/* Doctor column */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold text-xs flex items-center justify-center shrink-0 border border-[#0067A1]/20">
                                {getInitials(docName)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                  {docName}
                                </p>
                                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Building2 className="w-3 h-3" />
                                  <span>Verified Clinician</span>
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Specialization column */}
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-[#0067A1] border border-sky-200">
                              {spec}
                            </span>
                          </td>

                          {/* Unique Patients column */}
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200 font-bold text-xs border border-teal-200 dark:border-teal-800">
                              <Users className="w-3.5 h-3.5 text-teal-600" />
                              {patientsCount}
                            </span>
                          </td>

                          {/* Total Consultations column */}
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                              <Activity className="w-3.5 h-3.5 text-emerald-600" />
                              {visitsCount}
                            </span>
                          </td>

                          {/* Ratio column */}
                          <td className="px-5 py-3.5 text-center">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              {ratio} <span className="text-[11px] text-slate-400">sessions/pt</span>
                            </span>
                          </td>

                          {/* Actions column */}
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() =>
                                router.push(`/admin/booking-attempts/${group.doctor.id}`)
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0067A1] bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              title="View patient list"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Patients
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {filteredGroups.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div>
                Showing{" "}
                <strong className="text-slate-900 dark:text-white">
                  {(currentPage - 1) * itemsPerPage + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-slate-900 dark:text-white">
                  {Math.min(currentPage * itemsPerPage, filteredGroups.length)}
                </strong>{" "}
                of {filteredGroups.length} doctors
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {getPageNumbers().map((num) => (
                  <button
                    key={num}
                    onClick={() => setCurrentPage(num)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      num === currentPage
                        ? "bg-[#0067A1] text-white shadow-xs"
                        : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {num}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
