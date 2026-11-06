"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Search,
  User,
  Users,
  Phone,
  Mail,
  History,
  Calendar,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Activity,
  RotateCcw,
  Droplet,
} from "lucide-react";

export default function AdminDoctorPatientsPage() {
  const { id: doctorId } = useParams();
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError("");
      if (!doctorId) {
        setError("Invalid doctor ID");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/doctor/my-patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId }),
      });

      const json = await res.json();
      if (json.success) {
        setPatients(json.data || []);
      } else {
        setError(json.message || "Failed to fetch patients");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("An error occurred while fetching patients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [doctorId]);

  const filteredPatients = useMemo(() => {
    const searchStr = searchTerm.toLowerCase().trim();
    return patients.filter((p) => {
      const matchesSearch =
        !searchStr ||
        (p.full_name || "").toLowerCase().includes(searchStr) ||
        (p.email || "").toLowerCase().includes(searchStr) ||
        (p.phone || "").toLowerCase().includes(searchStr);

      const matchesGender =
        genderFilter === "all" ||
        (p.gender || "").toLowerCase() === genderFilter.toLowerCase();

      return matchesSearch && matchesGender;
    });
  }, [patients, searchTerm, genderFilter]);

  // Reset to page 1 on search / filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, genderFilter]);

  const totalPatients = patients.length;
  const totalVisits = patients.reduce(
    (acc, p) => acc + (p.visit_count || 0),
    0
  );
  const returningPatients = patients.filter(
    (p) => (p.visit_count || 0) > 1
  ).length;
  const verifiedCount = patients.filter((p) => p.is_identity_verified).length;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPatients.length / itemsPerPage)
  );
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isFilterActive = searchTerm.trim() !== "" || genderFilter !== "all";

  const handleResetFilters = () => {
    setSearchTerm("");
    setGenderFilter("all");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "—";
    const [h, m] = String(timeString).split(":");
    if (!h || !m) return timeString;
    const date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10), 0);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "PT"
    );
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
              <button
                onClick={() => router.push("/admin/booking-attempts")}
                className="hover:underline cursor-pointer"
              >
                Consultations Tracker
              </button>
              <span>/</span>
              <span className="text-slate-500">Doctor Patient Directory</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/admin/booking-attempts")}
                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
                title="Back to consultations tracker"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                Doctor Patient Directory
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0067A1]/10 text-[#0067A1] border border-[#0067A1]/20">
                  {totalPatients} Total Patients
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Audit all clinical patient records, visit histories, and demographic details treated under this doctor profile.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPatients}
              disabled={loading}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Refresh patient records"
            >
              <RotateCcw
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
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-blue-50 text-[#0067A1]">
                <Users className="w-4 h-4 text-[#0067A1]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#0067A1]">
                Cohort
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {totalPatients}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Unique treated patients
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <Activity className="w-4 h-4 text-emerald-700" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Completed
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {totalVisits}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Total consultations conducted
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                <History className="w-4 h-4 text-indigo-700" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Retention
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {returningPatients}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Returning patients (&gt;1 visit)
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                Verified
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {verifiedCount}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Identity verified patients
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search patient by name, phone, or email..."
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

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="py-2 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>

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
                {paginatedPatients.length}
              </strong>{" "}
              of {filteredPatients.length} patients
            </span>
            {isFilterActive && (
              <span className="text-[#0067A1] font-semibold flex items-center gap-1">
                Filters active
              </span>
            )}
          </div>
        </div>

        {/* Patient Table Container */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin"></div>
              <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                Loading patient directory...
              </p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-600 font-medium px-4">
              <p className="text-sm">{error}</p>
              <button
                onClick={fetchPatients}
                className="mt-3 px-3 py-1.5 bg-[#0067A1] text-white text-xs font-semibold rounded-lg hover:bg-[#004F7C] cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center max-w-sm mx-auto px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <User className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No Patients Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {isFilterActive
                  ? "No patient records match your active search criteria."
                  : "No patients have been recorded under this doctor yet."}
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
                {paginatedPatients.map((patient, idx) => (
                  <div key={patient.id || idx} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold text-xs flex items-center justify-center shrink-0 border border-[#0067A1]/20">
                          {getInitials(patient.full_name)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {patient.full_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span>{patient.gender || "Unknown"}</span>
                            {patient.age && <span>• {patient.age} yrs</span>}
                            {patient.blood_group && (
                              <span className="font-semibold text-rose-600">
                                • {patient.blood_group}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        {patient.visit_count} {patient.visit_count === 1 ? "visit" : "visits"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{patient.phone || "No phone provided"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{patient.email || "No email provided"}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Last: {formatDate(patient.last_visit_date)}
                      </span>
                      {patient.is_identity_verified && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 uppercase text-[10.5px] font-bold tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Patient Info</th>
                      <th className="px-5 py-3.5">Contact Details</th>
                      <th className="px-5 py-3.5 text-center">Total Visits</th>
                      <th className="px-5 py-3.5">Last Consultation</th>
                      <th className="px-5 py-3.5 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {paginatedPatients.map((patient, idx) => (
                      <tr
                        key={patient.id || idx}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold text-xs flex items-center justify-center shrink-0 border border-[#0067A1]/20">
                              {getInitials(patient.full_name)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                {patient.full_name}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span>{patient.gender || "Unknown"}</span>
                                {patient.age && <span>• {patient.age} yrs</span>}
                                {patient.blood_group && (
                                  <span className="inline-flex items-center gap-0.5 text-rose-600 font-semibold">
                                    <Droplet className="w-2.5 h-2.5" />
                                    {patient.blood_group}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{patient.phone || "—"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[200px]">
                                {patient.email || "—"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {patient.visit_count}
                            </span>
                            {patient.visit_count > 1 && (
                              <span className="text-[9.5px] font-bold uppercase tracking-wider text-teal-700 mt-1">
                                Returning
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex flex-col text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-semibold flex items-center gap-1.5 text-slate-900 dark:text-white">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {formatDate(patient.last_visit_date)}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <History className="w-3 h-3 text-slate-400" />
                              {formatTime(patient.last_visit_time)}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          {patient.is_identity_verified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Unverified
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {filteredPatients.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div>
                Showing{" "}
                <strong className="text-slate-900 dark:text-white">
                  {(currentPage - 1) * itemsPerPage + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-slate-900 dark:text-white">
                  {Math.min(currentPage * itemsPerPage, filteredPatients.length)}
                </strong>{" "}
                of {filteredPatients.length} patients
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
