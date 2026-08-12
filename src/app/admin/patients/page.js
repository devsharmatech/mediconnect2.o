"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  Eye,
  Trash2,
  Download,
  Plus,
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
  Sparkles,
  Venus,
  Mars,
  Activity,
  CheckCircle,
  XCircle,
  Check,
} from "lucide-react";

const formatPatientUnId = (unId) => {
  if (!unId && unId !== 0) return "N/A";
  const clean = String(unId).replace(/\D/g, "");
  return `PAT-${clean.padStart(4, "0")}`;
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

  // Global stats (totals across all patients, not just current page)
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
    } catch {}
  };

  // In your fetchPatients function
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

  // Fetch stats on mount (global totals independent of pagination)
  useEffect(() => {
    fetchStats();
  }, []);

  // Debounced filter/search — fetch paginated list
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(1, searchTerm, statusFilter, genderFilter, verificationFilter, pagination.itemsPerPage);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, genderFilter, verificationFilter, pagination.itemsPerPage]);

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
      } else {
        toast.error(result.error || "Failed to delete patients");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchPatients(newPage);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      pagination.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(
      pagination.totalPages,
      startPage + maxVisiblePages - 1
    );

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "P";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "P";
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

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
      default:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
    hover: {
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
      },
    },
  };

  const formatAddress = (val) => {
    if (!val) return "Not provided";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      const parts = [val.street, val.city, val.state, val.pincode || val.zip].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : JSON.stringify(val);
    }
    return String(val);
  };

  const formatEmergencyContact = (val) => {
    if (!val) return "Not provided";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      const name = val.name || val.contact_name || "";
      const phone = val.phone || val.phone_number || val.mobile || "";
      const relation = val.relation || val.relationship || "";
      const parts = [name, relation ? `(${relation})` : "", phone].filter(Boolean);
      return parts.length > 0 ? parts.join(" ") : JSON.stringify(val);
    }
    return String(val);
  };

  return (
    <>
      <main className="flex-1 overflow-auto relative z-0">
        <div className="p-4 md:p-4 lg:p-4 bg-transparent">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 rounded-2xl to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 lg:p-6">
              {/* Header Section */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <motion.h4
                      className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Patient Management
                    </motion.h4>
                    <motion.p
                      className="text-gray-600 dark:text-gray-400 mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      Showing {pagination.totalItems} patients
                    </motion.p>
                  </div>
                </div>
              </motion.div>

              {/* Stats Cards */}
              {(() => {
                const stats = [
                  {
                    label: "Total Registered",
                    onClick: () => setStatusFilter("all"),
                    value: globalStats.total,
                    sub: "All time patients",
                    Icon: Users,
                    accent: "bg-blue-50 border-blue-100",
                    valueColor: "text-[#004F7C]",
                    subColor: "text-blue-400",
                    iconBg: "bg-blue-100",
                    iconColor: "text-[#0067A1]",
                  },
                  {
                    label: "Active Patients",
                    onClick: () => setStatusFilter("1"),
                    value: globalStats.active,
                    sub: `${globalStats.total > 0 ? Math.round((globalStats.active / globalStats.total) * 100) : 0}% of all patients`,
                    Icon: UserCheck,
                    accent: "bg-emerald-50 border-emerald-100",
                    valueColor: "text-emerald-700",
                    subColor: "text-emerald-400",
                    iconBg: "bg-emerald-100",
                    iconColor: "text-emerald-600",
                  },
                  {
                    label: "Gender Split",
                    onClick: () => setGenderFilter(prev => prev === 'all' ? 'male' : prev === 'male' ? 'female' : 'all'),
                    value: `${globalStats.male}M / ${globalStats.female}F`,
                    sub: "Click to toggle (Male/Female/All)",
                    Icon: Activity,
                    accent: "bg-violet-50 border-violet-100",
                    valueColor: "text-violet-700",
                    subColor: "text-violet-400",
                    iconBg: "bg-violet-100",
                    iconColor: "text-violet-600",
                  },
                  {
                    label: "Joined This Month",
                    onClick: () => { setStatusFilter('all'); setGenderFilter('all'); setSearchTerm(''); },
                    value: globalStats.thisMonth,
                    sub: "Click to clear all filters",
                    Icon: CalendarPlus,
                    accent: "bg-amber-50 border-amber-100",
                    valueColor: "text-amber-700",
                    subColor: "text-amber-400",
                    iconBg: "bg-amber-100",
                    iconColor: "text-amber-600",
                  },
                ];

                return (
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {stats.map((stat) => (
                      <motion.div
                        key={stat.label}
                        variants={cardVariants}
                        whileHover="hover"
                        onClick={stat.onClick}
                        className={`rounded-2xl border p-5 flex items-start gap-4 ${stat.accent} shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer`}
                      >
                        <div className={`p-3 rounded-xl ${stat.iconBg} shrink-0`}>
                          <stat.Icon className={`w-5 h-5 ${stat.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                          <p className={`text-2xl font-bold leading-tight ${stat.valueColor}`}>{stat.value}</p>
                          <p className={`text-xs mt-1 ${stat.subColor}`}>{stat.sub}</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                );
              })()}


              {/* Controls Section */}
              <motion.div
                className="bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Search Bar */}
                  <motion.div
                    className="relative flex-1 max-w-md"
                    whileFocus={{ scale: 1.02 }}
                  >
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search patients by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-300 cursor-text"
                    />
                  </motion.div>

                  {/* Filters and Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <motion.select
                      whileFocus={{ scale: 1.05 }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-300 cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </motion.select>

                    <motion.select
                      whileFocus={{ scale: 1.05 }}
                      value={verificationFilter}
                      onChange={(e) => setVerificationFilter(e.target.value)}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-300 cursor-pointer"
                    >
                      <option value="all">All Verification</option>
                      <option value="verified">Verified</option>
                      <option value="unverified">Unverified</option>
                    </motion.select>

                    <motion.select
                      whileFocus={{ scale: 1.05 }}
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value)}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-300 cursor-pointer"
                    >
                      <option value="all">All Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </motion.select>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchPatients(1)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 cursor-pointer"
                    >
                      <Filter size={20} />
                    </motion.button>

                  
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchPatients(pagination.currentPage)}
                      disabled={loading}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <RefreshCw
                        size={20}
                        className={loading ? "animate-spin" : ""}
                      />
                    </motion.button>
                  </div>
                </div>

                {/* Bulk Actions */}
                <AnimatePresence>
                  {selectedIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800/50"
                    >
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <span className="text-red-800 dark:text-red-300 font-medium">
                          {selectedIds.length} patient(s) selected
                        </span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setConfirmOpen(true)}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium rounded-lg transition-all duration-300 cursor-pointer"
                      >
                        <Trash2 size={18} className="mr-2" />
                        Delete Selected
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Patients Table */}
              <motion.div
                className="bg-white/80 dark:bg-gray-800/80 rounded-2xl  border border-gray-200/50 dark:border-gray-700/50 overflow-hidden mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {loading ? (
                  <motion.div
                    className="flex items-center justify-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <RefreshCw
                        size={32}
                        className="text-gray-800 dark:text-gray-200"
                      />
                    </motion.div>
                  </motion.div>
                ) : patients.length === 0 ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <User className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No patients found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {searchTerm ||
                      statusFilter !== "all" ||
                      genderFilter !== "all"
                        ? "Try adjusting your search criteria"
                        : "Get started by adding your first patient"}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-900 hover:to-gray-700 text-white font-medium rounded-lg transition-all duration-300 cursor-pointer"
                    >
                      <Plus size={20} className="mr-2" />
                      Add New Patient
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              onChange={(e) =>
                                setSelectedIds(
                                  e.target.checked
                                    ? patients.map((p) => p.id)
                                    : []
                                )
                              }
                              checked={
                                patients.length > 0 &&
                                selectedIds.length === patients.length
                              }
                              className="rounded border-gray-300 text-gray-800 focus:ring-gray-800 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Patient
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Gender
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {patients.map((patient, index) => (
                          <motion.tr
                            key={patient.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all duration-300"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(patient.id)}
                                onChange={() => toggleSelect(patient.id)}
                                className="rounded border-gray-300 text-gray-800 focus:ring-gray-800 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="relative flex-shrink-0 h-10 w-10">
                                  {normalizeAvatarUrl(patient.profile_picture) ? (
                                    <motion.img
                                      whileHover={{ scale: 1.05 }}
                                      className="h-10 w-10 rounded-full object-cover shadow-xs border border-slate-200"
                                      src={normalizeAvatarUrl(patient.profile_picture)}
                                      alt=""
                                    />
                                  ) : (
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                      className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0067A1] to-[#004F7C] flex items-center justify-center text-white font-bold text-xs shadow-xs"
                                    >
                                      {getInitials(patient.patient_details?.full_name)}
                                    </motion.div>
                                  )}
                                  {patient.is_verified && (
                                    <div
                                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-xs"
                                      title="Verified Account"
                                    >
                                      <Check size={10} className="text-white stroke-[3.5]" />
                                    </div>
                                  )}
                                </div>
                                <div className="ml-3.5">
                                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                                    {patient.patient_details?.full_name || "Unknown"}
                                  </div>
                                  <div className="text-xs font-mono text-slate-400 dark:text-slate-400">
                                    ID: {formatPatientUnId(patient.un_id)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {patient.patient_details?.email || "No email"}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-0.5 gap-1 font-mono">
                                <Phone size={12} className="text-slate-400" />
                                {patient.phone_number || "No phone"}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 capitalize">
                                {patient.patient_details?.gender || "Unknown"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {(patient.status === 1 || patient.status === null || patient.status === '1' || patient.status === 'active') ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
                                  <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span> Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setViewPatient(patient)}
                                  className="p-2 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 transition-all duration-300 cursor-pointer"
                                  title="View Details"
                                >
                                  <Eye size={18} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => toggleSelect(patient.id)}
                                  className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-all duration-300 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>

              {/* Pagination Component */}
              {patients.length > 0 && (
                <motion.div
                  className="bg-white/80 dark:bg-gray-800/80 rounded-2xl  border border-gray-200/50 dark:border-gray-700/50 p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing{" "}
                      {(pagination.currentPage - 1) * pagination.itemsPerPage +
                        1}{" "}
                      to{" "}
                      {Math.min(
                        pagination.currentPage * pagination.itemsPerPage,
                        pagination.totalItems
                      )}{" "}
                      of {pagination.totalItems} patients
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* First Page */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePageChange(1)}
                        disabled={!pagination.hasPrevPage}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                      >
                        <ChevronsLeft size={16} />
                      </motion.button>

                      {/* Previous Page */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          handlePageChange(pagination.currentPage - 1)
                        }
                        disabled={!pagination.hasPrevPage}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                      >
                        <ChevronLeft size={16} />
                      </motion.button>

                      {/* Page Numbers */}
                      {getPageNumbers().map((pageNum) => (
                        <motion.button
                          key={pageNum}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-300 cursor-pointer ${
                            pageNum === pagination.currentPage
                              ? "bg-gradient-to-r from-gray-800 to-gray-600 border-transparent text-white shadow-sm"
                              : "border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                          }`}
                        >
                          {pageNum}
                        </motion.button>
                      ))}

                      {/* Next Page */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          handlePageChange(pagination.currentPage + 1)
                        }
                        disabled={!pagination.hasNextPage}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                      >
                        <ChevronRight size={16} />
                      </motion.button>

                      {/* Last Page */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePageChange(pagination.totalPages)}
                        disabled={!pagination.hasNextPage}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                      >
                        <ChevronsRight size={16} />
                      </motion.button>
                    </div>

                    {/* Items Per Page Selector */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>Show:</span>
                      <select
                        value={pagination.itemsPerPage}
                        onChange={(e) => {
                          const newLimit = parseInt(e.target.value);
                          setPagination((prev) => ({
                            ...prev,
                            itemsPerPage: newLimit,
                            currentPage: 1,
                          }));
                        }}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-800 focus:border-transparent cursor-pointer"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                      </select>
                      <span>per page</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
      {/* Fixed Confirm Delete Modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all border border-gray-200/50 dark:border-gray-700/50"
            >
              <div className="p-6 text-center">
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Confirm Deletion
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete {selectedIds.length}{" "}
                  patient(s)? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setConfirmOpen(false)}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg transition-all duration-300 font-medium cursor-pointer"
                  >
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Patient Details Modal */}
      <AnimatePresence>
        {viewPatient && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all max-h-[90vh] overflow-hidden border border-gray-200/50 dark:border-gray-700/50"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Patient Details
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setViewPatient(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-300 cursor-pointer"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </motion.button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="flex items-start space-x-6 mb-6">
                  <div className="relative flex-shrink-0">
                    {viewPatient.profile_picture ? (
                      <motion.img
                        whileHover={{ scale: 1.05 }}
                        className="h-20 w-20 rounded-full object-cover shadow-sm border-2 border-slate-200"
                        src={viewPatient.profile_picture}
                        alt=""
                      />
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="h-20 w-20 rounded-full bg-gradient-to-br from-[#0067A1] to-[#004F7C] flex items-center justify-center text-white font-bold text-2xl shadow-sm"
                      >
                        {getInitials(viewPatient.patient_details?.full_name)}
                      </motion.div>
                    )}
                    {viewPatient.is_verified && (
                      <div
                        className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm"
                        title="Verified Patient"
                      >
                        <Check size={14} className="text-white stroke-[3.5]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {viewPatient.patient_details?.full_name || "Unknown"}
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 dark:from-amber-900/40 dark:to-orange-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Patient ID: {formatPatientUnId(viewPatient.un_id)}
                      </span>
                      {viewPatient.is_verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle size={12} /> Verified Patient
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <XCircle size={12} /> Unverified Account
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center text-sm">
                      <Mail className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Email:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {viewPatient.patient_details?.email || "Not provided"}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Phone:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {viewPatient.phone_number || "Not provided"}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <User className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Gender:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white capitalize">
                        {typeof viewPatient.patient_details?.gender === "string" ? viewPatient.patient_details.gender : "Not provided"}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Date of Birth:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {viewPatient.patient_details?.date_of_birth ||
                          "Not provided"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center text-sm">
                      <Droplets className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Blood Group:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {viewPatient.patient_details?.blood_group ||
                          "Not provided"}
                      </span>
                    </div>
                    <div className="flex items-start text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Address:
                        </span>
                        <div className="ml-2 text-gray-900 dark:text-white">
                          {formatAddress(viewPatient.patient_details?.address)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm">
                      <AlertTriangle className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Emergency Contact:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatEmergencyContact(viewPatient.patient_details?.emergency_contact)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                <div className="flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewPatient(null)}
                    className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-900 hover:to-gray-700 text-white font-medium rounded-lg transition-all duration-300 cursor-pointer"
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
