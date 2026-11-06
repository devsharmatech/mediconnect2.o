"use client";

import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  User,
  Users,
  UserCheck,
  Phone,
  Mail,
  Calendar,
  CalendarPlus,
  Droplets,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Activity,
  ShieldCheck,
  RotateCcw,
  X,
  Check,
  CreditCard,
} from "lucide-react";

const formatPatientUnId = (unId) => {
  if (!unId && unId !== 0) return "N/A";
  const clean = String(unId).replace(/\D/g, "");
  return `PAT-${clean.padStart(4, "0")}`;
};

const calculateAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewPatient, setViewPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");

  // Global stats (totals across all patients from server)
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    active: 0,
    male: 0,
    female: 0,
    thisMonth: 0,
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/patients/stats");
      const data = await res.json();
      if (data.success) setGlobalStats(data.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchPatients = async (
    page = 1,
    search = searchTerm,
    status = statusFilter,
    gender = genderFilter,
    verification = verificationFilter,
    limit = pagination.itemsPerPage || 10
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(status !== "all" && { status }),
        ...(gender !== "all" && { gender }),
        ...(verification !== "all" && { verification }),
      });

      const res = await fetch(`/api/patients?${params}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setPatients(data.data || []);
      setPagination(
        data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
        }
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Debounced search and filter listener
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(
        1,
        searchTerm,
        statusFilter,
        genderFilter,
        verificationFilter,
        pagination.itemsPerPage
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [
    searchTerm,
    statusFilter,
    genderFilter,
    verificationFilter,
    pagination.itemsPerPage,
  ]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    if (selectedIds.length === 0) return toast.error("No patients selected!");

    try {
      const res = await fetch("/api/patients/delete-multiple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Patients deleted successfully!");
        setSelectedIds([]);
        fetchPatients(pagination.currentPage);
        fetchStats();
      } else {
        toast.error(result.error || "Failed to delete patients");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchPatients(
        newPage,
        searchTerm,
        statusFilter,
        genderFilter,
        verificationFilter,
        pagination.itemsPerPage
      );
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(pagination.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "PT";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "PT";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const normalizeAvatarUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== "string") return "";
    let url = rawUrl.trim();
    url = url.replace(/^['"]+|['"]+$/g, "");
    if (url.startsWith("https:/") && !url.startsWith("https://")) {
      url = url.replace("https:/", "https://");
    }
    url = url.replace(/%3A%3Atext/gi, "").replace(/::text/gi, "");
    return url;
  };

  const parseAddress = (val) => {
    if (!val) return null;
    let data = val;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          data = JSON.parse(trimmed);
        } catch {
          data = trimmed;
        }
      } else {
        data = trimmed;
      }
    }

    if (typeof data === "object" && data !== null) {
      const parts = [data.street, data.city, data.state, data.pincode || data.zip].filter(
        (p) => p && typeof p === "string" && p.trim() !== ""
      );
      if (parts.length === 0) return null;
      return parts.join(", ");
    }

    if (typeof data === "string") {
      const cleaned = data.trim();
      if (!cleaned || cleaned === "{}" || cleaned === '{"address":""}') return null;
      return cleaned;
    }

    return null;
  };

  const parseEmergencyContact = (val) => {
    if (!val) return null;
    let data = val;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          data = JSON.parse(trimmed);
        } catch {
          data = trimmed;
        }
      } else {
        data = trimmed;
      }
    }

    if (typeof data === "object" && data !== null) {
      const name = (data.name || data.contact_name || data.fullName || "").trim();
      const phone = (data.phone || data.phone_number || data.mobile || "").trim();
      const relation = (data.relation || data.relationship || "").trim();

      if (!name && !phone && !relation) {
        return null;
      }

      return { name, phone, relation };
    }

    if (typeof data === "string") {
      const cleaned = data.trim();
      if (
        !cleaned ||
        cleaned === "{}" ||
        cleaned === '{"name":"","phone":""}' ||
        cleaned.replace(/[{}\s,"':]/g, "") === "namephone"
      ) {
        return null;
      }
      return { name: "", phone: cleaned, relation: "" };
    }

    return null;
  };

  const isFilterActive =
    searchTerm.trim() !== "" ||
    statusFilter !== "all" ||
    genderFilter !== "all" ||
    verificationFilter !== "all";

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setGenderFilter("all");
    setVerificationFilter("all");
  };

  const getGenderBadge = (gender) => {
    const g = String(gender || "").toLowerCase();
    if (g === "male") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#0067A1] border border-blue-200">
          Male
        </span>
      );
    }
    if (g === "female") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-pink-50 text-pink-700 border border-pink-200">
          Female
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {gender || "Unknown"}
      </span>
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
              <span className="text-slate-500">All Patients</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              Patient Management
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0067A1]/10 text-[#0067A1] border border-[#0067A1]/20">
                {pagination.totalItems} Registered Patients
              </span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Monitor clinical patient registries, demographic records, identity verifications, and account activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchPatients(pagination.currentPage);
                fetchStats();
              }}
              disabled={loading}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Refresh patient records"
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
          {/* Card 1: Total Registered */}
          <div
            onClick={handleResetFilters}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-[#0067A1] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-blue-50 text-[#0067A1]">
                <Users className="w-4 h-4 text-[#0067A1]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#0067A1]">
                Total
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {globalStats.total}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                All-time registered patients
              </p>
            </div>
          </div>

          {/* Card 2: Active Patients */}
          <div
            onClick={() => setStatusFilter("1")}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-emerald-600 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <UserCheck className="w-4 h-4 text-emerald-700" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {globalStats.active}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                {globalStats.total > 0
                  ? Math.round((globalStats.active / globalStats.total) * 100)
                  : 100}
                % active patient rate
              </p>
            </div>
          </div>

          {/* Card 3: Gender Distribution */}
          <div
            onClick={() =>
              setGenderFilter((prev) =>
                prev === "all" ? "male" : prev === "male" ? "female" : "all"
              )
            }
            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-teal-600 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                <Activity className="w-4 h-4 text-teal-700" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                Demographics
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {globalStats.male}M • {globalStats.female}F
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Tap to cycle (Male / Female / All)
              </p>
            </div>
          </div>

          {/* Card 4: Joined This Month */}
          <div
            onClick={handleResetFilters}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-indigo-600 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                <CalendarPlus className="w-4 h-4 text-indigo-700" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                This Month
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-none">
                {globalStats.thisMonth}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                New clinical registrations
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
                placeholder="Search patients by name, email, phone, or PAT ID..."
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
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>

              {/* Verification Filter */}
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="py-2 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>

              {/* Gender Filter */}
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
                {patients.length}
              </strong>{" "}
              of {pagination.totalItems} patients
            </span>
            {isFilterActive && (
              <span className="text-[#0067A1] font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filters active
              </span>
            )}
          </div>
        </div>

        {/* Bulk Action Banner */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{selectedIds.length} patient(s) selected</span>
            </div>
            <button
              onClick={() => setConfirmOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
          </div>
        )}

        {/* Main Records Container */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin"></div>
              <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                Loading clinical patient records...
              </p>
            </div>
          ) : patients.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center max-w-sm mx-auto px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <User className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No Patients Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {isFilterActive
                  ? "No patients match your active search or filter criteria."
                  : "No clinical patient accounts are registered yet."}
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
                {patients.map((patient) => {
                  const pName = patient.patient_details?.full_name || "Unknown Patient";
                  const avatarUrl = normalizeAvatarUrl(patient.profile_picture);
                  const age = calculateAge(patient.patient_details?.date_of_birth);
                  const isVerified = Boolean(patient.is_verified);
                  const isActive =
                    patient.status === 1 ||
                    patient.status === "1" ||
                    patient.status === null ||
                    patient.status === "active";

                  return (
                    <div key={patient.id} className="p-4 space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(patient.id)}
                            onChange={() => toggleSelect(patient.id)}
                            className="rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1] cursor-pointer mt-0.5"
                          />
                          <div className="relative">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={pName}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold text-xs flex items-center justify-center border border-[#0067A1]/20">
                                {getInitials(pName)}
                              </div>
                            )}
                            {isVerified && (
                              <div
                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-600 rounded-full border border-white flex items-center justify-center"
                                title="Verified Patient"
                              >
                                <Check size={8} className="text-white stroke-[3.5]" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {pName}
                            </h4>
                            <span className="text-[11px] font-mono text-slate-500">
                              {formatPatientUnId(patient.un_id)}
                            </span>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                          </span>
                        )}
                      </div>

                      {/* Clinical demographics */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {getGenderBadge(patient.patient_details?.gender)}
                        {age !== null && (
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            • {age} yrs
                          </span>
                        )}
                        {patient.patient_details?.blood_group && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <Droplets className="w-2.5 h-2.5" />
                            {patient.patient_details.blood_group}
                          </span>
                        )}
                      </div>

                      {/* Contacts */}
                      <div className="grid grid-cols-1 gap-1 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{patient.phone_number || "No phone provided"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">
                            {patient.patient_details?.email || "No email provided"}
                          </span>
                        </div>
                      </div>

                      {/* Bottom action row */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(patient.created_at)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewPatient(patient)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#0067A1] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIds([patient.id]);
                              setConfirmOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          onChange={(e) =>
                            setSelectedIds(
                              e.target.checked ? patients.map((p) => p.id) : []
                            )
                          }
                          checked={
                            patients.length > 0 &&
                            selectedIds.length === patients.length
                          }
                          className="rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1] cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3">Patient Record</th>
                      <th className="px-4 py-3">Demographics</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Registered</th>
                      <th className="px-4 py-3">Verification</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {patients.map((patient) => {
                      const pName = patient.patient_details?.full_name || "Unknown Patient";
                      const avatarUrl = normalizeAvatarUrl(patient.profile_picture);
                      const age = calculateAge(patient.patient_details?.date_of_birth);
                      const isVerified = Boolean(patient.is_verified);
                      const isActive =
                        patient.status === 1 ||
                        patient.status === "1" ||
                        patient.status === null ||
                        patient.status === "active";

                      return (
                        <tr
                          key={patient.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(patient.id)}
                              onChange={() => toggleSelect(patient.id)}
                              className="rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1] cursor-pointer"
                            />
                          </td>

                          {/* Patient Column */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={pName}
                                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold text-xs flex items-center justify-center border border-[#0067A1]/20">
                                    {getInitials(pName)}
                                  </div>
                                )}
                                {isVerified && (
                                  <div
                                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-600 rounded-full border border-white flex items-center justify-center"
                                    title="Verified Patient"
                                  >
                                    <Check size={8} className="text-white stroke-[3.5]" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                  {pName}
                                </p>
                                <p className="text-[11px] font-mono text-slate-400">
                                  {formatPatientUnId(patient.un_id)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Demographics Column */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                {getGenderBadge(patient.patient_details?.gender)}
                                {patient.patient_details?.blood_group && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <Droplets className="w-2.5 h-2.5" />
                                    {patient.patient_details.blood_group}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500">
                                {age !== null ? `${age} yrs` : "Age N/A"}
                                {patient.patient_details?.date_of_birth && (
                                  <span className="text-slate-400">
                                    {" "}
                                    ({formatDate(patient.patient_details.date_of_birth)})
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>

                          {/* Contact Column */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 font-mono">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{patient.phone_number || "—"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span className="truncate max-w-[180px]">
                                  {patient.patient_details?.email || "No email"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Registered Date */}
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              {formatDate(patient.created_at)}
                            </span>
                          </td>

                          {/* Verification Column */}
                          <td className="px-4 py-3">
                            {isVerified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Unverified
                              </span>
                            )}
                          </td>

                          {/* Status Column */}
                          <td className="px-4 py-3">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                              </span>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1 justify-end">
                              <button
                                onClick={() => setViewPatient(patient)}
                                className="p-1.5 text-[#0067A1] hover:text-[#004F7C] hover:bg-sky-50 rounded transition-colors cursor-pointer"
                                title="View Patient Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedIds([patient.id]);
                                  setConfirmOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete Patient"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
          {patients.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div>
                Showing{" "}
                <strong className="text-slate-900 dark:text-white">
                  {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-slate-900 dark:text-white">
                  {Math.min(
                    pagination.currentPage * pagination.itemsPerPage,
                    pagination.totalItems
                  )}
                </strong>{" "}
                of {pagination.totalItems} patients
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={!pagination.hasPrevPage}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {getPageNumbers().map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePageChange(num)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      num === pagination.currentPage
                        ? "bg-[#0067A1] text-white shadow-xs"
                        : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {num}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={!pagination.hasNextPage}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Items Per Page Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span>Show:</span>
                <select
                  value={pagination.itemsPerPage}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value, 10);
                    setPagination((prev) => ({
                      ...prev,
                      itemsPerPage: newLimit,
                      currentPage: 1,
                    }));
                  }}
                  className="py-1 px-1.5 rounded border border-slate-200 bg-white text-slate-700 cursor-pointer"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
                <span>/ page</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Delete Patient Records
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Are you sure you want to delete {selectedIds.length} selected patient account(s)? This action cannot be reversed.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medical-Grade Patient Details Modal */}
      {viewPatient && (() => {
        const parsedAddress = parseAddress(viewPatient.patient_details?.address);
        const parsedEmergency = parseEmergencyContact(
          viewPatient.patient_details?.emergency_contact
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-8">
              {/* Header */}
              <div className="px-6 py-4 bg-[#0067A1] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/15 text-white font-bold text-sm flex items-center justify-center border border-white/20">
                    {getInitials(viewPatient.patient_details?.full_name)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {viewPatient.patient_details?.full_name || "Unknown Patient"}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-white/80 font-mono">
                      <span>{formatPatientUnId(viewPatient.un_id)}</span>
                      <span>•</span>
                      <span>{viewPatient.phone_number || "No phone"}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setViewPatient(null)}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Badges Bar */}
                <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                  {viewPatient.is_verified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Patient
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      Unverified Account
                    </span>
                  )}

                  {viewPatient.patient_details?.blood_group && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <Droplets className="w-3 h-3 text-rose-600" />
                      Blood Group: {viewPatient.patient_details.blood_group}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-[#0067A1] border border-blue-200">
                    Enrolled: {formatDate(viewPatient.created_at)}
                  </span>
                </div>

                {/* 2-Column Clinical Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  {/* Section 1: Demographics */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0067A1]">
                      Clinical Demographics
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Gender:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize text-right">
                          {viewPatient.patient_details?.gender || "Not specified"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Date of Birth:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {formatDate(viewPatient.patient_details?.date_of_birth)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Age:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {calculateAge(viewPatient.patient_details?.date_of_birth) !==
                          null
                            ? `${calculateAge(
                                viewPatient.patient_details?.date_of_birth
                              )} years`
                            : "Not provided"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Blood Group:</span>
                        <span className="font-semibold text-rose-600 text-right">
                          {viewPatient.patient_details?.blood_group || "Not provided"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Contact Information */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0067A1]">
                      Contact & Communication
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Phone Number:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-right">
                          {viewPatient.phone_number || "Not provided"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Email Address:</span>
                        <span
                          className="font-semibold text-slate-800 dark:text-slate-200 truncate text-right max-w-[200px]"
                          title={viewPatient.patient_details?.email || ""}
                        >
                          {viewPatient.patient_details?.email || "Not provided"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Account Status:</span>
                        <span className="font-semibold text-emerald-700 text-right">
                          {viewPatient.status === 0 ? "Inactive" : "Active"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Identity Status:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {viewPatient.is_verified ? "Verified" : "Unverified"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Address & Emergency Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0067A1] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Residential Address
                    </h4>
                    {parsedAddress ? (
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {parsedAddress}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">Not provided</p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0067A1] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Emergency Contact
                    </h4>
                    {parsedEmergency ? (
                      <div className="space-y-1">
                        {parsedEmergency.name && (
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span>{parsedEmergency.name}</span>
                            {parsedEmergency.relation && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                {parsedEmergency.relation}
                              </span>
                            )}
                          </div>
                        )}
                        {parsedEmergency.phone && (
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono text-xs">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{parsedEmergency.phone}</span>
                          </div>
                        )}
                        {!parsedEmergency.name && parsedEmergency.relation && (
                          <span className="text-slate-500 font-medium">
                            {parsedEmergency.relation}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">Not provided</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <a
                  href={`/admin/finance/transactions?patient_id=${viewPatient.id}`}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Transactions</span>
                </a>
                <button
                  onClick={() => setViewPatient(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
