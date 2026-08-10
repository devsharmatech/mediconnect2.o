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
  Phone,
  Mail,
  Calendar,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Stethoscope,
  DollarSign,
  Shield,
  Activity,
  IndianRupee,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewAppointment, setViewAppointment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [summary, setSummary] = useState([]);

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Fetch appointments function
  const fetchAppointments = async (
    page = 1,
    search = searchTerm,
    status = statusFilter,
    date = dateFilter,
    limit = pagination.itemsPerPage || 10
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(status !== "all" && { status }),
        ...(date && { date }),
      });

      const res = await fetch(`/api/appointment/web?${params}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setAppointments(data.data.appointments || []);
      setSummary(data.data.summary || []);
      setPagination(
        data.data.pagination
          ? {
              currentPage: data.data.pagination.currentPage || 1,
              totalPages: data.data.pagination.totalPages || 1,
              totalItems: data.data.pagination.total || 0,
              itemsPerPage: data.data.pagination.perPage || 10,
              hasNextPage:
                data.data.pagination.currentPage <
                data.data.pagination.totalPages,
              hasPrevPage: data.data.pagination.currentPage > 1,
            }
          : {
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

  // Fetch single appointment details
  const fetchAppointmentDetails = async (id) => {
    try {
      const res = await fetch(`/api/appointment/web/${id}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setViewAppointment(data.data.appointment);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Debounced search and filter
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppointments(1, searchTerm, statusFilter, dateFilter, pagination.itemsPerPage);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, dateFilter, pagination.itemsPerPage]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    if (selectedIds.length === 0)
      return toast.error("No appointments selected!");

    try {
      const res = await fetch("/api/appointment/web/delete-multiple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Appointments deleted successfully!");
        setSelectedIds([]);
        fetchAppointments(pagination.currentPage);
      } else {
        toast.error(result.error || "Failed to delete appointments");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchAppointments(newPage);
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
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "booked":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300 border border-gray-200 dark:border-gray-800";
      case "approved":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800";
      case "rejected":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800";
      case "freezed":
        return "bg-teal-100 text-[#004F7C] dark:bg-[#003358]/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800";
      default:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
    }
  };

  const formatTime = (time) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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

  return (
    <>
      <main className="flex-1 overflow-auto relative z-0">
        <div className="p-4 md:p-4 lg:p-4 bg-transparent">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 rounded-2xl to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6">
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
                      Appointments Management
                    </motion.h4>
                    <motion.p
                      className="text-gray-600 dark:text-gray-400 mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      Showing {pagination.totalItems} appointments
                    </motion.p>
                  </div>
                </div>
              </motion.div>

              {/* Stats Cards */}
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-6 gap-3 mb-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {[
                  {
                    label: "Total",
                    filterValue: "all",
                    value: summary.total || 0,
                    icon: Calendar,
                    bg: "bg-slate-100",
                    iconColor: "text-slate-600",
                    badge: "bg-slate-200 text-slate-700",
                  },
                  {
                    label: "Booked",
                    filterValue: "booked",
                    value: summary.booked || 0,
                    icon: Activity,
                    bg: "bg-teal-50",
                    iconColor: "text-[#0067A1]",
                    badge: "bg-teal-100 text-[#004F7C]",
                  },
                  {
                    label: "Approved",
                    filterValue: "approved",
                    value: summary.approved || 0,
                    icon: Shield,
                    bg: "bg-emerald-50",
                    iconColor: "text-emerald-600",
                    badge: "bg-emerald-100 text-emerald-700",
                  },
                  {
                    label: "Cancelled",
                    filterValue: "cancelled",
                    value: summary.cancelled || 0,
                    icon: AlertTriangle,
                    bg: "bg-red-50",
                    iconColor: "text-red-500",
                    badge: "bg-red-100 text-red-600",
                  },
                  {
                    label: "Completed",
                    filterValue: "completed",
                    value: summary.completed || 0,
                    icon: CheckCircle,
                    bg: "bg-[#0067A1]/10",
                    iconColor: "text-[#0067A1]",
                    badge: "bg-[#0067A1]/10 text-[#0067A1]",
                  },
                  {
                    label: "Rejected",
                    filterValue: "rejected",
                    value: summary.rejected || 0,
                    icon: XCircle,
                    bg: "bg-orange-50",
                    iconColor: "text-orange-500",
                    badge: "bg-orange-100 text-orange-600",
                  },
                ].map((stat) => (
                  <motion.div
                    key={stat.label}
                    variants={cardVariants}
                    whileHover="hover"
                    onClick={() => setStatusFilter(stat.filterValue)}
                    className="cursor-pointer bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex flex-col gap-2 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className={`p-1.5 rounded-xl flex-shrink-0 ${stat.bg}`}>
                        <stat.icon className={`w-3.5 h-3.5 ${stat.iconColor}`} />
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full truncate max-w-[70px] text-center ${stat.badge}`}>
                        {stat.label}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">{stat.label}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>


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
                      placeholder="Search appointments by patient, doctor, or contact..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 cursor-text"
                    />
                  </motion.div>

                  {/* Filters and Actions */}
                  <div className="flex flex-wrap items-center justify-start lg:justify-end gap-3 mt-4 lg:mt-0">
                    <motion.select
                      whileFocus={{ scale: 1.05 }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="booked">Booked</option>
                      <option value="approved">Approved</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="rejected">Rejected</option>
                    </motion.select>

                    <motion.input
                      whileFocus={{ scale: 1.05 }}
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 cursor-pointer"
                    />

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchAppointments(1)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 cursor-pointer"
                    >
                      <Filter size={20} />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchAppointments(pagination.currentPage)}
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
                          {selectedIds.length} appointment(s) selected
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

              {/* Appointments Table */}
              <motion.div
                className="bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden mb-6"
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
                ) : appointments.length === 0 ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No appointments found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {searchTerm || statusFilter !== "all" || dateFilter
                        ? "Try adjusting your search criteria"
                        : "No appointments scheduled yet"}
                    </p>
                  </motion.div>
                ) : (
                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full whitespace-nowrap min-w-[900px]">
                      <thead className="bg-gray-50/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              onChange={(e) =>
                                setSelectedIds(
                                  e.target.checked
                                    ? appointments.map((a) => a.id)
                                    : []
                                )
                              }
                              checked={
                                appointments.length > 0 &&
                                selectedIds.length === appointments.length
                              }
                              className="rounded border-gray-300 text-gray-600 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Appointment
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Patient
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Doctor
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {appointments.map((appointment, index) => (
                          <motion.tr
                            key={appointment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all duration-300"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(appointment.id)}
                                onChange={() => toggleSelect(appointment.id)}
                                className="rounded border-gray-300 text-gray-600 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
                                  <Calendar size={16} />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatDate(appointment.appointment_date)}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                    <Clock size={14} className="mr-1" />
                                    {formatTime(appointment.appointment_time)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {getInitials(appointment.patient?.full_name)}
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {appointment.patient?.full_name ||
                                      "Unknown Patient"}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {appointment.patient?.phone_number}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-br from-[#0067A1] to-[#004F7C] rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {getInitials(appointment.doctor?.full_name)}
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {appointment.doctor?.full_name ||
                                      "Unknown Doctor"}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {appointment.doctor?.specialization}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                  appointment.status
                                )}`}
                              >
                                {appointment.status.charAt(0).toUpperCase() +
                                  appointment.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() =>
                                    fetchAppointmentDetails(appointment.id)
                                  }
                                  className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 transition-all duration-300 cursor-pointer"
                                  title="View Details"
                                >
                                  <Eye size={18} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => toggleSelect(appointment.id)}
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
              {appointments.length > 0 && (
                <motion.div
                  className="bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6"
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
                      of {pagination.totalItems} appointments
                    </div>

                    <div className="flex flex-wrap justify-center items-center gap-1 mt-4 sm:mt-0">
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
                              ? "bg-gradient-to-r from-gray-600 to-gray-700 border-transparent text-white shadow-sm"
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
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent cursor-pointer"
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
                  appointment(s)? This action cannot be undone.
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

      {/* Fixed Appointment Details Modal */}
      <AnimatePresence>
        {viewAppointment && (
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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl transform transition-all max-h-[90vh] overflow-hidden border border-gray-200/50 dark:border-gray-700/50 flex flex-col"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Appointment Details
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setViewAppointment(null)}
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

              <div className="p-6 overflow-y-auto  flex-1">
                {/* Appointment Overview */}
                <div className="flex items-start space-x-6 mb-8">
                  <div className="flex-shrink-0">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="h-20 w-20 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white font-medium text-2xl shadow-sm"
                    >
                      <Calendar size={32} />
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Appointment #{viewAppointment.id.slice(0, 8)}
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900/40 dark:to-gray-800/40 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                        {formatDate(viewAppointment.appointment_date)} at{" "}
                        {formatTime(viewAppointment.appointment_time)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          viewAppointment.status
                        )}`}
                      >
                        {viewAppointment.status.charAt(0).toUpperCase() +
                          viewAppointment.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Patient Information */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Patient Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Full Name
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {viewAppointment.patient?.full_name}
                        </p>
                      </div>
                      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Email
                          </label>
                          <p className="text-gray-900 dark:text-white break-all">
                            {viewAppointment.patient?.email || "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Phone
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {viewAppointment.patient?.phone_number}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Gender
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {viewAppointment.patient?.gender || "N/A"}
                        </p>
                      </div>
                      {viewAppointment.patient?.date_of_birth && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Date of Birth
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {formatDate(viewAppointment.patient.date_of_birth)}
                          </p>
                        </div>
                      )}
                      {viewAppointment.patient?.address && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Address
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {viewAppointment.patient.address}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doctor Information */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Stethoscope className="w-5 h-5 mr-2" />
                      Doctor Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Full Name
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {viewAppointment.doctor?.full_name}
                        </p>
                      </div>
                      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Email
                          </label>
                          <p className="text-gray-900 dark:text-white break-all">
                            {viewAppointment.doctor?.email || "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Phone
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {viewAppointment.doctor?.phone_number}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Specialization
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {viewAppointment.doctor?.specialization}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Clinic
                        </label>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {viewAppointment.doctor?.clinic_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {viewAppointment.doctor?.clinic_address}
                        </p>
                        {viewAppointment.appointment_type === 'clinic_visit' && viewAppointment.doctor?.latitude && viewAppointment.doctor?.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${viewAppointment.doctor.latitude},${viewAppointment.doctor.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center mt-2 text-sm text-[#0067A1] hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          >
                            <MapPin className="w-4 h-4 mr-1" />
                            View on Map
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Experience
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {viewAppointment.doctor?.experience_years} years
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Consultation Fee
                          </label>
                          <p className="text-gray-900 dark:text-white flex items-center">
                            <IndianRupee size={14} className="mr-1" />
                            {viewAppointment.doctor?.consultation_fee}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Disease Information */}
                <div className="space-y-4">
                  {/* 🧠 Disease Information Section */}
                  {viewAppointment?.disease_info ? (
                    typeof viewAppointment.disease_info === "string" ? (
                      <div className="p-4 bg-white/60 dark:bg-gray-800/40 rounded-xl shadow-sm border border-gray-200/30 dark:border-gray-700/30">
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <Activity className="w-5 h-5 mr-2 text-[#0067A1] dark:text-blue-400" />
                          Consultation Details
                        </h4>
                        <ul className="space-y-3">
                          {viewAppointment.disease_info.split("|").map((line, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-[#0067A1] dark:text-blue-400 text-xs font-bold mr-3 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">
                                {line.trim()}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(viewAppointment.disease_info).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="p-3 bg-white/60 dark:bg-gray-800/40 rounded-lg shadow-sm border border-gray-200/30 dark:border-gray-700/30"
                            >
                              <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-100 capitalize mb-1">
                                {key.replace(/_/g, " ")}
                              </h5>
  
                              {/* 🧩 Auto-format structured content */}
                              {Array.isArray(value) ? (
                                <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                                  {value.map((item, i) => (
                                    <li key={i}>
                                      {typeof item === "object"
                                        ? Object.entries(item).map(([k, v]) => (
                                            <span key={k} className="block">
                                              <strong className="capitalize">
                                                {k.replace(/_/g, " ")}:
                                              </strong>{" "}
                                              {String(v)}
                                            </span>
                                          ))
                                        : String(item)}
                                    </li>
                                  ))}
                                </ul>
                              ) : typeof value === "object" ? (
                                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                  {Object.entries(value).map(([k, v]) => (
                                    <div key={k}>
                                      <strong className="capitalize">
                                        {k.replace(/_/g, " ")}:
                                      </strong>{" "}
                                      {String(v)}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {value || "N/A"}
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )
                  ) : (
                    <p className="text-gray-500 text-sm italic">
                      No disease information available.
                    </p>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                <div className="flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewAppointment(null)}
                    className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium rounded-lg transition-all duration-300 cursor-pointer"
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
