"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  Eye,
  Trash2,
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
  Shield,
  Activity,
  IndianRupee,
  CheckCircle2,
  XCircle,
  FileText,
  Video,
  Building2,
  Home,
  RotateCcw,
  Copy,
  X,
  Zap,
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
  const [typeFilter, setTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [summary, setSummary] = useState({});

  const handleStatCardClick = (val) => {
    if (statusFilter === val && val !== "all") {
      setStatusFilter("all");
    } else {
      setStatusFilter(val);
    }
    setTypeFilter("all");
    setPaymentFilter("all");
    setDateFilter("");
    setSearchTerm("");
  };

  // Medical-grade type mapping for all DB values
  const TYPE_META = {
    video_consultation: { label: "Video", full: "Video Consultation", icon: Video, cls: "bg-sky-50 text-[#0067A1] border-sky-200" },
    video: { label: "Video", full: "Video Consultation", icon: Video, cls: "bg-sky-50 text-[#0067A1] border-sky-200" },
    video_call: { label: "Video", full: "Video Consultation", icon: Video, cls: "bg-sky-50 text-[#0067A1] border-sky-200" },
    video_follow_up: { label: "Video Follow-Up", full: "Video Follow-Up", icon: Video, cls: "bg-sky-50 text-[#0067A1] border-sky-200" },
    instant: { label: "Instant Video", full: "Instant Video Consultation", icon: Zap, cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    clinic_visit: { label: "In-Clinic", full: "In-Clinic Visit (OPD)", icon: Building2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    in_person: { label: "In-Clinic", full: "In-Clinic Visit (OPD)", icon: Building2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    clinic: { label: "In-Clinic", full: "In-Clinic Visit (OPD)", icon: Building2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    home_visit: { label: "Home Visit", full: "Home Visit Consultation", icon: Home, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    home_follow_up: { label: "Home Follow-Up", full: "Home Visit Follow-Up", icon: Home, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    consultation: { label: "Consultation", full: "Medical Consultation", icon: Stethoscope, cls: "bg-slate-50 text-slate-700 border-slate-200" },
  };

  const getTypeMeta = (t) => {
    if (!t) return { label: "Consultation", full: "Medical Consultation", icon: Stethoscope, cls: "bg-slate-50 text-slate-700 border-slate-200" };
    const key = String(t).toLowerCase();
    return (
      TYPE_META[key] || {
        label: String(t).replace(/_/g, " "),
        full: String(t).replace(/_/g, " "),
        icon: Stethoscope,
        cls: "bg-slate-50 text-slate-700 border-slate-200",
      }
    );
  };

  // Actual amount charged to patient (final_fee) - never fall back to doctor's list fee
  const getPaidFee = (apt) => {
    const v = apt?.final_fee;
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const formatFee = (apt) => {
    const fee = getPaidFee(apt);
    return fee > 0 ? `₹${fee.toLocaleString("en-IN")}` : "Free (₹0)";
  };

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
    type = typeFilter,
    payment = paymentFilter,
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
        ...(type !== "all" && { type }),
        ...(payment !== "all" && { payment }),
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

  const handleDownloadInvoice = (appointment) => {
    if (!appointment) return;
    const invId = `INV-${(appointment.id || "").slice(0, 8).toUpperCase()}`;
    const dateStr = formatDate(appointment.appointment_date || new Date());
    const timeStr = formatTime(appointment.appointment_time || "");
    const patientName = appointment.patient?.full_name || "Patient";
    const patientPhone = appointment.patient?.phone_number || "—";
    const patientEmail = appointment.patient?.email || "—";
    const doctorName = appointment.doctor?.full_name || "Doctor";
    const doctorSpec = appointment.doctor?.specialization || "General Medicine";
    const clinicName = appointment.doctor?.clinic_name || "MediConnect Partner Clinic";
    const fee = getPaidFee(appointment);
    const mode = getTypeMeta(appointment.appointment_type).full;

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invId}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { background: #f8fafc; padding: 30px; color: #1e293b; }
          .invoice-card { max-width: 750px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #0067A1; margin-bottom: 24px; }
          .brand-title { font-size: 24px; font-weight: 800; color: #0067A1; letter-spacing: -0.5px; }
          .brand-subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
          .inv-meta { text-align: right; }
          .inv-badge { display: inline-block; background: #ecfdf5; color: #059669; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 4px; border: 1px solid #a7f3d0; margin-bottom: 6px; }
          .inv-num { font-size: 14px; font-weight: 700; color: #0f172a; }
          .inv-date { font-size: 12px; color: #64748b; margin-top: 2px; }
          .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; }
          .party-box { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #edf2f7; }
          .party-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0067A1; letter-spacing: 0.5px; margin-bottom: 6px; }
          .party-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .party-detail { font-size: 12px; color: #475569; line-height: 1.5; }
          .service-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .service-table th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
          .service-table td { padding: 14px 12px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
          .totals { margin-left: auto; width: 280px; margin-bottom: 28px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #475569; }
          .totals-row.grand { border-top: 2px solid #0f172a; padding-top: 10px; margin-top: 6px; font-size: 16px; font-weight: 800; color: #0f172a; }
          .footer-note { font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 18px; }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <div class="header">
            <div>
              <div class="brand-title">MediConnect.fit</div>
              <div class="brand-subtitle">Official Consultation Invoice & Payment Receipt</div>
            </div>
            <div class="inv-meta">
              <span class="inv-badge">${fee > 0 ? (appointment.payment_status === "paid" ? "✓ PAYMENT RECEIVED" : "PAYMENT PENDING") : "NO CHARGE"}</span>
              <div class="inv-num">${invId}</div>
              <div class="inv-date">Date: ${dateStr}</div>
            </div>
          </div>

          <div class="parties">
            <div class="party-box">
              <div class="party-title">Billed To (Patient)</div>
              <div class="party-name">${patientName}</div>
              <div class="party-detail">Phone: ${patientPhone}</div>
              <div class="party-detail">Email: ${patientEmail}</div>
            </div>
            <div class="party-box">
              <div class="party-title">Healthcare Provider</div>
              <div class="party-name">Dr. ${doctorName.replace(/^(Dr\.\s*)+/i, "")}</div>
              <div class="party-detail">Specialty: ${doctorSpec}</div>
              <div class="party-detail">Facility: ${clinicName}</div>
            </div>
          </div>

          <table class="service-table">
            <thead>
              <tr>
                <th>Service Description</th>
                <th>Mode</th>
                <th>Schedule</th>
                <th style="text-align: right;">Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Professional Medical Consultation</td>
                <td>${mode}</td>
                <td>${dateStr} ${timeStr}</td>
                <td style="text-align: right; font-weight: 600;">₹${fee.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Consultation Fee:</span>
              <span>₹${fee.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>Platform & Facilitation:</span>
              <span>₹0.00</span>
            </div>
            <div class="totals-row">
              <span>Taxes (GST):</span>
              <span>Included</span>
            </div>
            <div class="totals-row grand">
              <span>${fee > 0 && appointment.payment_status === "paid" ? "Total Paid:" : fee > 0 ? "Total Due:" : "Total Paid:"}</span>
              <span>₹${fee.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer-note">
            This is a computer-generated invoice receipt issued through MediConnect.fit for professional healthcare services. No physical signature is required.
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([invoiceHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      toast.error("Popup blocked. Please allow popups to view receipt.");
    }
  };

  // Debounced search & filter listener
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppointments(1, searchTerm, statusFilter, dateFilter, typeFilter, paymentFilter, pagination.itemsPerPage);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, dateFilter, typeFilter, paymentFilter, pagination.itemsPerPage]);

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

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

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
        .toUpperCase()
        .slice(0, 2) || "PT"
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "booked":
        return "bg-blue-50 text-[#0067A1] border border-blue-200";
      case "approved":
        return "bg-teal-50 text-teal-700 border border-teal-200";
      case "completed":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      case "rejected":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "expired":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "freezed":
        return "bg-slate-100 text-slate-700 border border-slate-300";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  const formatTime = (time) => {
    if (!time) return "—";
    return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isFilterActive = searchTerm || statusFilter !== "all" || dateFilter || typeFilter !== "all" || paymentFilter !== "all";

  return (
    <main className="flex-1 bg-slate-50 dark:bg-slate-900 min-h-screen relative w-full">
      {/* Full width container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0067A1] mb-1">
              <span>Clinical Practice</span>
              <span>/</span>
              <span>Patients & Bookings</span>
              <span>/</span>
              <span className="text-slate-500">Appointments</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              Appointments Management
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0067A1]/10 text-[#0067A1] border border-[#0067A1]/20">
                {pagination.totalItems} {statusFilter !== "all" ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} ` : ""}Appointments
              </span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Monitor, filter, and audit clinical patient bookings across Telemedicine, In-Person OPD, and Home Consultations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAppointments(pagination.currentPage)}
              disabled={loading}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Refresh appointment list"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#0067A1] ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Clinical KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            {
              label: "Total Bookings",
              shortLabel: "Total",
              filterValue: "all",
              value: summary.total || 0,
              icon: Calendar,
              bg: "bg-slate-100",
              iconColor: "text-slate-700",
              badge: "bg-slate-200 text-slate-800",
            },
            {
              label: "Booked",
              shortLabel: "Booked",
              filterValue: "booked",
              value: summary.booked || 0,
              icon: Activity,
              bg: "bg-blue-50",
              iconColor: "text-[#0067A1]",
              badge: "bg-blue-100 text-[#0067A1]",
            },
            {
              label: "Approved",
              shortLabel: "Approved",
              filterValue: "approved",
              value: summary.approved || 0,
              icon: Shield,
              bg: "bg-teal-50",
              iconColor: "text-teal-700",
              badge: "bg-teal-100 text-teal-800",
            },
            {
              label: "Completed",
              shortLabel: "Completed",
              filterValue: "completed",
              value: summary.completed || 0,
              icon: CheckCircle2,
              bg: "bg-emerald-50",
              iconColor: "text-emerald-700",
              badge: "bg-emerald-100 text-emerald-800",
            },
            {
              label: "Cancelled",
              shortLabel: "Cancelled",
              filterValue: "cancelled",
              value: summary.cancelled || 0,
              icon: AlertTriangle,
              bg: "bg-rose-50",
              iconColor: "text-rose-600",
              badge: "bg-rose-100 text-rose-700",
            },
            {
              label: "Rejected",
              shortLabel: "Rejected",
              filterValue: "rejected",
              value: summary.rejected || 0,
              icon: XCircle,
              bg: "bg-orange-50",
              iconColor: "text-orange-600",
              badge: "bg-orange-100 text-orange-700",
            },
          ].map((stat) => {
            const isActive = statusFilter === stat.filterValue;
            const IconComponent = stat.icon;
            return (
              <div
                key={stat.label}
                onClick={() => handleStatCardClick(stat.filterValue)}
                className={`cursor-pointer bg-white dark:bg-slate-800 rounded-xl p-3.5 border transition-all shadow-2xs hover:shadow-md flex flex-col justify-between ${
                  isActive
                    ? "border-[#0067A1] ring-2 ring-[#0067A1]/20 bg-blue-50/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className={`p-1.5 rounded-lg shrink-0 ${stat.bg}`}>
                    <IconComponent className={`w-3.5 h-3.5 ${stat.iconColor}`} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${stat.badge}`}>
                    {stat.shortLabel}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                    {stat.value}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Search Input (Wide, clean, not cut off) */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by patient name, phone, doctor, or booking ID..."
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
              
              {/* Consultation Mode Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="py-2 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
              >
                <option value="all">All Modes</option>
                <option value="video">Video (Telemedicine)</option>
                <option value="clinic">In-Clinic (OPD)</option>
                <option value="home">Home Visit</option>
              </select>

              {/* Payment / Fee Filter */}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="py-2 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
              >
                <option value="all">All Fees</option>
                <option value="paid">Paid Consultations</option>
                <option value="free">Free / No Charge (₹0)</option>
                <option value="unpaid">Unpaid / Due</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="booked">Booked</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Date Filter */}
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="py-1.5 px-2 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter("")}
                    className="p-1 text-xs text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Clear date"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Reset Button */}
              {isFilterActive && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setDateFilter("");
                    setTypeFilter("all");
                    setPaymentFilter("all");
                  }}
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
              Showing <strong className="text-slate-800 dark:text-slate-200">{appointments.length}</strong> of {pagination.totalItems} appointments
            </span>
            {isFilterActive && (
              <span className="text-[#0067A1] font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filters active
              </span>
            )}
          </div>
        </div>

        {/* Bulk Actions Banner */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{selectedIds.length} appointment(s) selected</span>
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
              <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center max-w-sm mx-auto px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No Appointments Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {isFilterActive
                  ? "No appointments match your active filter criteria."
                  : "No patient appointments have been scheduled yet."}
              </p>
              {isFilterActive && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setDateFilter("");
                    setTypeFilter("all");
                    setPaymentFilter("all");
                  }}
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
                {appointments.map((appointment) => {
                  const typeMeta = getTypeMeta(appointment.appointment_type);
                  const TypeIcon = typeMeta.icon;
                  const fee = getPaidFee(appointment);

                  return (
                    <div key={appointment.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(appointment.id)}
                            onChange={() => toggleSelect(appointment.id)}
                            className="rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1] cursor-pointer"
                          />
                          <div className="w-8 h-8 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(appointment.patient?.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {appointment.patient?.full_name || "Unknown Patient"}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{appointment.patient?.phone_number || "—"}</p>
                          </div>
                        </div>

                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[#0067A1]" />
                          {formatDate(appointment.appointment_date)}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {formatTime(appointment.appointment_time)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold">{appointment.doctor?.full_name || "Doctor"}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${typeMeta.cls}`}>
                            <TypeIcon className="w-3 h-3" />
                            {typeMeta.label}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {formatFee(appointment)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          onClick={() => fetchAppointmentDetails(appointment.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button
                          onClick={() => handleDownloadInvoice(appointment)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#0067A1] bg-sky-50 hover:bg-sky-100 rounded flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" /> Receipt
                        </button>
                        <button
                          onClick={() => {
                            setSelectedIds([appointment.id]);
                            setConfirmOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          onChange={(e) =>
                            setSelectedIds(
                              e.target.checked ? appointments.map((a) => a.id) : []
                            )
                          }
                          checked={
                            appointments.length > 0 &&
                            selectedIds.length === appointments.length
                          }
                          className="rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1] cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3">Schedule</th>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Doctor & Specialty</th>
                      <th className="px-4 py-3">Consultation Mode</th>
                      <th className="px-4 py-3">Fee / Charged</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {appointments.map((appointment) => {
                      const typeMeta = getTypeMeta(appointment.appointment_type);
                      const TypeIcon = typeMeta.icon;
                      const fee = getPaidFee(appointment);

                      return (
                        <tr
                          key={appointment.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(appointment.id)}
                              onChange={() => toggleSelect(appointment.id)}
                              className="rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1] cursor-pointer"
                            />
                          </td>

                          {/* Schedule Column */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                <Calendar className="w-4 h-4 text-[#0067A1]" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {formatDate(appointment.appointment_date)}
                                </p>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(appointment.appointment_time)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Patient Column */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {getInitials(appointment.patient?.full_name)}
                              </div>
                              <div className="min-w-0 max-w-[180px]">
                                <p className="font-bold text-slate-900 dark:text-white truncate">
                                  {appointment.patient?.full_name || "Unknown Patient"}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {appointment.patient?.phone_number || "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Doctor Column */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#0067A1] text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {getInitials(appointment.doctor?.full_name)}
                              </div>
                              <div className="min-w-0 max-w-[180px]">
                                <p className="font-bold text-slate-900 dark:text-white truncate">
                                  {appointment.doctor?.full_name || "Doctor"}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                  <Stethoscope className="w-3 h-3 text-[#0067A1]" />
                                  {appointment.doctor?.specialization || "General Medicine"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Consultation Mode Column */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${typeMeta.cls}`}>
                              <TypeIcon className="w-3.5 h-3.5" />
                              {typeMeta.label}
                            </span>
                          </td>

                          {/* Fee & Payment Column */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold ${fee > 0 ? "text-slate-900 dark:text-white" : "text-emerald-700"}`}>
                                {formatFee(appointment)}
                              </span>
                              {fee > 0 && (
                                <span className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                                  appointment.payment_status === "paid"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                  {appointment.payment_status || "pending"}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Column */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${getStatusColor(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </td>

                          {/* Actions Column */}
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1 justify-end">
                              <button
                                onClick={() => fetchAppointmentDetails(appointment.id)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                title="View Appointment Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDownloadInvoice(appointment)}
                                className="p-1.5 text-[#0067A1] hover:text-[#004F7C] hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                                title="Print / Download Invoice"
                              >
                                <FileText className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedIds([appointment.id]);
                                  setConfirmOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Delete Appointment"
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

          {/* Pagination Footer */}
          {appointments.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div>
                Showing <strong className="text-slate-900 dark:text-white">{(pagination.currentPage - 1) * pagination.itemsPerPage + 1}</strong> to <strong className="text-slate-900 dark:text-white">{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}</strong> of {pagination.totalItems} entries
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
            </div>
          )}
        </div>

      </div>

      {/* APPOINTMENT DETAILS MODAL */}
      {viewAppointment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Appointment Details
                </h3>
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(viewAppointment.status)}`}>
                  {viewAppointment.status}
                </span>
                <span className="font-mono text-xs font-bold text-[#0067A1] bg-[#0067A1]/10 px-2 py-0.5 rounded border border-[#0067A1]/20">
                  #APT-{String(viewAppointment.id).slice(0, 8).toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewAppointment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              
              {/* Patient Card */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0067A1] uppercase tracking-wider text-[10px]">Patient Profile</span>
                  <span className="text-slate-400 font-mono text-[10px]">ID: #{viewAppointment.patient?.un_id || "VERIFIED"}</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(viewAppointment.patient?.full_name)}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {viewAppointment.patient?.full_name || "Patient"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 dark:text-slate-400 text-xs">
                      {viewAppointment.patient?.gender && <span className="capitalize">{viewAppointment.patient.gender}</span>}
                      {viewAppointment.patient?.blood_group && <span>🩸 {viewAppointment.patient.blood_group}</span>}
                      {viewAppointment.patient?.phone_number && <span>📞 {viewAppointment.patient.phone_number}</span>}
                      {viewAppointment.patient?.email && <span>✉ {viewAppointment.patient.email}</span>}
                    </div>
                    {viewAppointment.patient?.address && (
                      <p className="text-[11px] text-slate-500 mt-1">📍 {viewAppointment.patient.address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Doctor Card */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0067A1] uppercase tracking-wider text-[10px]">Attending Doctor</span>
                  <span className="text-slate-400 text-[10px]">{viewAppointment.doctor?.specialization}</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(viewAppointment.doctor?.full_name)}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      {viewAppointment.doctor?.full_name || "Doctor"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 dark:text-slate-400 text-xs">
                      {viewAppointment.doctor?.clinic_name && <span>🏥 {viewAppointment.doctor.clinic_name}</span>}
                      {viewAppointment.doctor?.phone_number && <span>📞 {viewAppointment.doctor.phone_number}</span>}
                      {viewAppointment.doctor?.email && <span>✉ {viewAppointment.doctor.email}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Consultation Details Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Date</p>
                  <p className="font-semibold text-slate-800 dark:text-white mt-0.5">{formatDate(viewAppointment.appointment_date)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Time</p>
                  <p className="font-semibold text-slate-800 dark:text-white mt-0.5">{formatTime(viewAppointment.appointment_time)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Mode</p>
                  <p className="font-semibold text-slate-800 dark:text-white mt-0.5">{getTypeMeta(viewAppointment.appointment_type).full}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Fee Charged</p>
                  <p className="font-bold text-[#0067A1] mt-0.5">{formatFee(viewAppointment)}</p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Payment Status: </span>
                  <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold uppercase ${
                    viewAppointment.payment_status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {viewAppointment.payment_status || "not_applicable"}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {Number(viewAppointment.discount_amount) > 0 && (
                    <span className="mr-2 italic text-slate-500">
                      (Original ₹{Number(viewAppointment.original_fee) || 0}, Discount ₹{Number(viewAppointment.discount_amount)})
                    </span>
                  )}
                  <span>Final Fee: <strong className="text-slate-900 dark:text-white">{formatFee(viewAppointment)}</strong></span>
                </div>
              </div>

              {/* Consultation / Disease Notes */}
              {viewAppointment.disease_info && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <p className="font-bold text-[#0067A1] uppercase tracking-wider text-[10px]">Clinical Notes / Reason</p>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {typeof viewAppointment.disease_info === "string"
                      ? viewAppointment.disease_info
                      : JSON.stringify(viewAppointment.disease_info, null, 2)}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setViewAppointment(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadInvoice(viewAppointment)}
                className="px-4 py-1.5 rounded-lg bg-[#0067A1] text-white text-xs font-semibold hover:bg-[#004F7C] flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 max-w-sm w-full border border-slate-200 dark:border-slate-700 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Delete Appointments</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete {selectedIds.length} selected appointment(s)? This action cannot be reversed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
