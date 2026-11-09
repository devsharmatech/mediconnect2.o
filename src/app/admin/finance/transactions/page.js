"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  User,
  Users,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Printer,
  X,
  Stethoscope,
  FlaskConical,
  Building,
  ShieldCheck,
  ArrowUpDown,
  FileCheck,
  Check,
} from "lucide-react";
import { MEDICONNECT_LOGO_BASE64 } from "@/lib/prescriptionAssets";

const formatPatientUnId = (unId) => {
  if (!unId && unId !== 0) return "N/A";
  const clean = String(unId).replace(/\D/g, "");
  return `PAT-${clean.padStart(4, "0")}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (timeString) => {
  if (!timeString) return "";
  const str = String(timeString).trim();
  if (str === "" || str === "null" || str === "undefined") return "";

  // 1. If it's a date or ISO string
  if (str.includes("-") || str.includes("T") || str.includes("/")) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  // 2. If it's already "10:30 AM" or "7:00 AM"
  if (/(am|pm)/i.test(str)) {
    return str;
  }

  // 3. If it's "14:30" or "09:15:00" or "10:00"
  const parts = str.split(":");
  if (parts.length >= 1) {
    const h = parseInt(parts[0], 10);
    const rawM = parts.length >= 2 ? parts[1].replace(/\D/g, "") : "00";
    const m = (rawM || "00").slice(0, 2).padStart(2, "0");
    if (!isNaN(h)) {
      const suffix = h >= 12 ? "PM" : "AM";
      const hour12 = ((h + 11) % 12) + 1;
      return `${hour12}:${m} ${suffix}`;
    }
  }

  return str;
};

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function PatientTransactionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialPatientId = searchParams.get("patient_id") || "";

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_count: 0,
    total_volume: 0,
    appointments_count: 0,
    appointments_volume: 0,
    labs_count: 0,
    labs_volume: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Patients list for dropdown filter
  const [patientsList, setPatientsList] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Selected transaction for invoice modal
  const [invoiceTransaction, setInvoiceTransaction] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // View details modal
  const [viewDetailsTransaction, setViewDetailsTransaction] = useState(null);

  // Load patients list for filter dropdown
  useEffect(() => {
    let isMounted = true;
    async function loadPatients() {
      try {
        setLoadingPatients(true);
        const res = await fetch("/api/patients?limit=100");
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          setPatientsList(json.data);
        }
      } catch (e) {
        console.error("Failed to load patients for filter:", e);
      } finally {
        if (isMounted) setLoadingPatients(false);
      }
    }
    loadPatients();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch transactions from API
  const fetchTransactions = useCallback(
    async (
      page = 1,
      patient = selectedPatientId,
      type = serviceTypeFilter,
      status = paymentStatusFilter,
      search = searchTerm,
      from = fromDate,
      to = toDate
    ) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "15",
          ...(patient && { patient_id: patient }),
          ...(type !== "all" && { service_type: type }),
          ...(status !== "all" && { payment_status: status }),
          ...(search.trim() && { search: search.trim() }),
          ...(from && { from_date: from }),
          ...(to && { to_date: to }),
        });

        const res = await fetch(`/api/admin/transactions?${params.toString()}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch transactions");
        }

        setTransactions(data.transactions || []);
        if (data.stats) setStats(data.stats);
        if (data.pagination) setPagination(data.pagination);
      } catch (err) {
        console.error("Fetch transactions error:", err);
        toast.error(err.message || "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    },
    [
      selectedPatientId,
      serviceTypeFilter,
      paymentStatusFilter,
      searchTerm,
      fromDate,
      toDate,
    ]
  );

  useEffect(() => {
    fetchTransactions(
      pagination.page,
      selectedPatientId,
      serviceTypeFilter,
      paymentStatusFilter,
      searchTerm,
      fromDate,
      toDate
    );
  }, [
    pagination.page,
    selectedPatientId,
    serviceTypeFilter,
    paymentStatusFilter,
    fromDate,
    toDate,
    fetchTransactions,
  ]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedPatientId("");
    setServiceTypeFilter("all");
    setPaymentStatusFilter("all");
    setFromDate("");
    setToDate("");
    fetchTransactions(1, "", "all", "all", "", "", "");
  };

  // Generate & Download PDF Invoice via html2canvas & jsPDF
  const handleDownloadInvoicePdf = async (tx) => {
    const el = document.getElementById("admin-invoice-print-area");
    if (!el) {
      window.print();
      return;
    }

    try {
      setIsGeneratingPdf(true);

      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default || jsPDFModule;

      let html2canvas;
      try {
        const mod = await import("html2canvas-pro");
        html2canvas = mod.default || mod;
      } catch {
        const fallback = await import("html2canvas");
        html2canvas = fallback.default || fallback;
      }

      const canvas = await html2canvas(el, {
        scale: 2.2, // High resolution (300 DPI)
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const contentWidth = pdfWidth;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight <= pdfHeight * 1.15) {
        const scaleFactor = Math.min(1, (pdfHeight - 12) / contentHeight);
        const fittedW = contentWidth * scaleFactor;
        const fittedH = contentHeight * scaleFactor;
        const xOffset = (pdfWidth - fittedW) / 2;
        pdf.addImage(imgData, "PNG", xOffset, 6, fittedW, fittedH, undefined, "FAST");
      } else {
        pdf.addImage(imgData, "PNG", 0, 0, contentWidth, contentHeight, undefined, "FAST");
      }

      const refId = tx?.reference_id?.split("-")[0]?.toUpperCase() || "TX";
      const filename = `MediConnect_Tax_Invoice_${tx?.service_type === "lab" ? "Lab" : "Consultation"}_${refId}.pdf`;

      pdf.save(filename);

      try {
        const blobUrl = pdf.output("bloburl");
        window.open(blobUrl, "_blank");
      } catch (err) {
        console.warn("Could not open PDF in new tab:", err);
      }
      toast.success("Invoice PDF generated & downloaded!");
    } catch (err) {
      console.error("PDF generation failed, triggering browser print:", err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Helper for status badge styling
  const getStatusBadge = (status, amount) => {
    const s = String(status || "").toLowerCase();
    const isFree = s === "free" || Number(amount) === 0;

    if (isFree) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-[#0067A1] border border-sky-200">
          <CheckCircle className="w-3 h-3 text-[#0067A1]" />
          <span>Free (₹0)</span>
        </span>
      );
    }
    if (s === "paid" || s === "completed" || s === "success") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          <span>Paid</span>
        </span>
      );
    }
    if (s === "pending" || s === "booked" || s === "unpaid") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Pending</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
        <AlertCircle className="w-3 h-3 text-rose-600" />
        <span className="capitalize">{s || "Failed"}</span>
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Finance & Accounts / Patient Transactions
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Patient Transactions & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Unified billing records for Doctor Consultations and Diagnostic Lab Orders with official invoice generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTransactions(pagination.page)}
            disabled={loading}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {paymentStatusFilter === "pending"
                ? "Pending Volume"
                : paymentStatusFilter === "paid"
                ? "Paid Volume"
                : paymentStatusFilter === "free"
                ? "Free Volume"
                : "Total Volume"}
            </span>
            <CreditCard className="w-4 h-4 text-[#0067A1]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{stats.total_volume.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {paymentStatusFilter === "paid"
              ? `Across ${stats.total_count} paid transactions`
              : paymentStatusFilter === "free"
              ? `Across ${stats.total_count} free consultations`
              : paymentStatusFilter === "pending"
              ? `Across ${stats.total_count} pending transactions`
              : `₹${stats.labs_volume.toLocaleString("en-IN")} Labs + ₹${stats.appointments_volume.toLocaleString("en-IN")} Consultations`}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Doctor Appointments</span>
            <Stethoscope className="w-4 h-4 text-[#0067A1]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{stats.appointments_volume.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.appointments_count} consultations {stats.appointments_volume === 0 ? "(Free OPD / ₹0)" : "booked"}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lab Test Orders</span>
            <FlaskConical className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{stats.labs_volume.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.labs_count} diagnostic test orders
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Filtered Patient</span>
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white truncate">
            {selectedPatientId
              ? patientsList.find((p) => p.id === selectedPatientId)?.patient_details?.full_name ||
                patientsList.find((p) => p.id === selectedPatientId)?.full_name ||
                "Filtered Patient"
              : "All Patients"}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {selectedPatientId ? "Click Reset to clear filter" : "Select patient in dropdown below"}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, phone, UHID, doctor, lab, or ref ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#0067A1]"
            />
          </div>

          {/* Patient Selector Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0067A1]"
            >
              <option value="">All Patients ({patientsList.length})</option>
              {patientsList.map((p) => {
                const name = p.patient_details?.full_name || p.full_name || "Patient";
                const phone = p.phone_number || "";
                const uhid = p.un_id ? formatPatientUnId(p.un_id) : "";
                return (
                  <option key={p.id} value={p.id}>
                    {name} {phone ? `(${phone})` : ""} {uhid ? `[${uhid}]` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Service Type Filter */}
          <div className="w-full md:w-44">
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0067A1]"
            >
              <option value="all">All Services</option>
              <option value="appointment">Doctor Consultation</option>
              <option value="lab">Diagnostic Lab Test</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="w-full md:w-36">
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0067A1]"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="free">Free (₹0)</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed / Refunded</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-3.5 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </form>

        {/* Active Filter Chips */}
        {(selectedPatientId || serviceTypeFilter !== "all" || paymentStatusFilter !== "all" || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <span className="text-slate-400 font-medium">Active Filters:</span>
            {selectedPatientId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0067A1] border border-blue-200 font-semibold">
                Patient:{" "}
                {patientsList.find((p) => p.id === selectedPatientId)?.patient_details?.full_name ||
                  patientsList.find((p) => p.id === selectedPatientId)?.full_name ||
                  "Selected"}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-blue-900"
                  onClick={() => setSelectedPatientId("")}
                />
              </span>
            )}
            {serviceTypeFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                Service: {serviceTypeFilter === "appointment" ? "Doctor Consultation" : "Lab Test"}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-slate-900"
                  onClick={() => setServiceTypeFilter("all")}
                />
              </span>
            )}
            {paymentStatusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                Status: {paymentStatusFilter.toUpperCase()}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-slate-900"
                  onClick={() => setPaymentStatusFilter("all")}
                />
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                Keyword: &quot;{searchTerm}&quot;
                <X
                  className="w-3 h-3 cursor-pointer hover:text-slate-900"
                  onClick={() => setSearchTerm("")}
                />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Transactions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Date & Time</th>
                <th className="px-4 py-3.5">Patient Details</th>
                <th className="px-4 py-3.5">Service Type</th>
                <th className="px-4 py-3.5">Provider / Facility</th>
                <th className="px-4 py-3.5">Reference ID</th>
                <th className="px-4 py-3.5 text-right">Amount (₹)</th>
                <th className="px-4 py-3.5 text-center">Payment Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0067A1]" />
                    <span>Loading patient transactions...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No transactions found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try resetting filters or searching for another patient.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isApt = tx.service_type === "appointment";
                  const refShort = tx.reference_id?.split("-")[0]?.toUpperCase() || "TX";
                  const amt = Number(tx.amount || 0);

                  return (
                    <tr
                      key={tx.transaction_id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      {/* Date & Time */}
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <div className="text-slate-900 dark:text-white font-semibold">
                          {formatDate(tx.created_at)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatTime(tx.created_at)}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold text-xs flex items-center justify-center shrink-0 border border-[#0067A1]/20">
                            {tx.patient_name?.charAt(0)?.toUpperCase() || "P"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {tx.patient_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>{tx.patient_phone || "No phone"}</span>
                              {tx.patient_un_id && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  {formatPatientUnId(tx.patient_un_id)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Service / Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          {isApt ? (
                            <Stethoscope className="w-3.5 h-3.5 text-[#0067A1]" />
                          ) : (
                            <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>{tx.service_label}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-400 capitalize pl-5">
                          Mode: {tx.sub_type || "Standard"}
                        </div>
                      </td>

                      {/* Provider / Facility */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                          {tx.provider_name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {tx.facility_name || tx.provider_specialty}
                        </div>
                      </td>

                      {/* Reference ID & Gateway */}
                      <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          #{refShort}
                        </div>
                        {tx.razorpay_payment_id ? (
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={tx.razorpay_payment_id}>
                            Pay: {tx.razorpay_payment_id.slice(-8)}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">Free / OPD</div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-bold whitespace-nowrap text-slate-900 dark:text-white">
                        {amt === 0 ? "₹0 (Free)" : `₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {getStatusBadge(tx.payment_status, amt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInvoiceTransaction(tx)}
                            className="px-2.5 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                            title="Generate and view invoice"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Invoice</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewDetailsTransaction(tx)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 text-xs">
          <div className="text-slate-500">
            Showing{" "}
            <b>{transactions.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</b> to{" "}
            <b>{Math.min(pagination.page * pagination.limit, pagination.totalCount)}</b> of{" "}
            <b>{pagination.totalCount}</b> transactions
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchTransactions(1)}
              disabled={!pagination.hasPrevPage}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fetchTransactions(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-300">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchTransactions(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fetchTransactions(pagination.totalPages)}
              disabled={!pagination.hasNextPage}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal Preview with Canvas & jsPDF Download */}
      {invoiceTransaction && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="absolute inset-0" onClick={() => setInvoiceTransaction(null)} />
          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#0067A1]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Official Medical Tax Invoice
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200">
                  #INV-{invoiceTransaction.reference_id?.split("-")[0]?.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setInvoiceTransaction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Content: Preview of Invoice */}
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Service</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {invoiceTransaction.service_label}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Payment Status</span>
                  {getStatusBadge(invoiceTransaction.payment_status, invoiceTransaction.amount)}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10.5px]">Amount Paid</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    ₹{Number(invoiceTransaction.amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 2-Column Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-2">
                  <div className="font-bold uppercase text-[10.5px] text-[#0067A1]">
                    Provider & Facility Details
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {invoiceTransaction.provider_name}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    {invoiceTransaction.facility_name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    License / Reg: {invoiceTransaction.provider_license}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Address: {invoiceTransaction.facility_address}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-2">
                  <div className="font-bold uppercase text-[10.5px] text-[#0067A1]">
                    Patient Information
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {invoiceTransaction.patient_name}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Phone: {invoiceTransaction.patient_phone || "N/A"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    UHID: {invoiceTransaction.patient_un_id ? formatPatientUnId(invoiceTransaction.patient_un_id) : "N/A"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Date: {formatDateTime(invoiceTransaction.created_at)}
                  </div>
                </div>
              </div>

              {/* Order Items Table (If Lab) */}
              {invoiceTransaction.service_type === "lab" && Array.isArray(invoiceTransaction.order_items) && invoiceTransaction.order_items.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Included Diagnostic Tests ({invoiceTransaction.order_items.length})
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-3 py-2">Test Name</th>
                          <th className="px-3 py-2 text-right">Price (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {invoiceTransaction.order_items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-1.5 font-medium">{it.name}</td>
                            <td className="px-3 py-1.5 text-right font-bold text-slate-900 dark:text-white">
                              ₹{Number(it.price || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
              <span className="text-[11px] text-slate-400">
                Official GST-exempt medical invoice under SAC 9993.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoicePdf(invoiceTransaction)}
                  disabled={isGeneratingPdf}
                  className="px-3.5 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <Download className={`w-3.5 h-3.5 ${isGeneratingPdf ? "animate-spin" : ""}`} />
                  <span>{isGeneratingPdf ? "Invoice" : "Invoice"}</span>
                </button>
                <button
                  onClick={() => setInvoiceTransaction(null)}
                  className="px-4 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Drawer / Modal */}
      {viewDetailsTransaction && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setViewDetailsTransaction(null)} />
          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                Transaction Details
              </div>
              <button
                onClick={() => setViewDetailsTransaction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs overflow-y-auto max-h-[70vh]">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Transaction ID</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {viewDetailsTransaction.transaction_id}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Service</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewDetailsTransaction.service_label} ({viewDetailsTransaction.sub_type})
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Patient</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewDetailsTransaction.patient_name}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Phone</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewDetailsTransaction.patient_phone || "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Provider</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewDetailsTransaction.provider_name}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Payment Gateway Ref</span>
                <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                  {viewDetailsTransaction.razorpay_payment_id || "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Total Amount</span>
                <span className="font-bold text-[#0067A1] text-sm">
                  ₹{Number(viewDetailsTransaction.amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Payment Status</span>
                <span>{getStatusBadge(viewDetailsTransaction.payment_status, viewDetailsTransaction.amount)}</span>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => setViewDetailsTransaction(null)}
                className="px-4 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice Container for html2canvas & jsPDF */}
      {invoiceTransaction && (
        <div
          className="admin-invoice-wrapper"
          style={{
            position: "fixed",
            top: "-9999px",
            left: "0px",
            width: "794px",
            zIndex: -9999,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <div
            id="admin-invoice-print-area"
            style={{
              width: "794px",
              minWidth: "794px",
              maxWidth: "794px",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              padding: "36px 40px",
              fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              boxSizing: "border-box",
              lineHeight: "1.45",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "16px", borderBottom: "2px solid #0067A1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <img
                  src={MEDICONNECT_LOGO_BASE64}
                  alt="MediConnect Logo"
                  style={{ width: "56px", height: "56px", objectFit: "contain", borderRadius: "50%" }}
                />
                <div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#0067A1", letterSpacing: "-0.3px" }}>
                    MediConnect Healthcare
                  </div>
                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px", fontWeight: "500" }}>
                    National Telehealth & Diagnostic Clinical Services Network
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                    CIN: U85110DL2024PTC123456 • New Delhi, India • support@mediconnect.com
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {invoiceTransaction.service_type === "lab" ? "Diagnostic Lab Order Receipt" : "Consultation Receipt"}
                </div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#0067A1", textTransform: "uppercase", letterSpacing: "1px", marginTop: "1px" }}>
                  Official Tax Invoice
                </div>
                <div style={{ fontSize: "11px", color: "#334155", marginTop: "6px" }}>
                  <span style={{ color: "#64748b" }}>Invoice No:</span> <b>INV-{invoiceTransaction.reference_id?.split("-")[0]?.toUpperCase() || "MC-001"}</b>
                </div>
                <div style={{ fontSize: "11px", color: "#334155" }}>
                  <span style={{ color: "#64748b" }}>Date of Issue:</span> <b>{formatDate(invoiceTransaction.created_at)}</b>
                </div>
              </div>
            </div>

            {/* 2-Column Clinical Credentials Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
              {/* Provider Column */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px", backgroundColor: "#f8fafc" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#0067A1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  {invoiceTransaction.service_type === "lab" ? "Laboratory & Facility Details" : "Practitioner & Clinic Details"}
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                  {invoiceTransaction.provider_name}
                </div>
                <div style={{ fontSize: "12px", color: "#334155", fontWeight: "600", marginTop: "2px" }}>
                  {invoiceTransaction.provider_specialty || "General Medicine"}
                </div>
                {invoiceTransaction.provider_qualification && (
                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
                    <b>Qualification:</b> {invoiceTransaction.provider_qualification}
                  </div>
                )}
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                  <b>Reg. / License No:</b> {invoiceTransaction.provider_license || "N/A"}
                </div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                  <b>Facility:</b> {invoiceTransaction.facility_name}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  <b>Location:</b> {invoiceTransaction.facility_address}
                </div>
              </div>

              {/* Patient Column */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px", backgroundColor: "#f8fafc" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#0067A1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Patient & Booking Information
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                  {invoiceTransaction.patient_name}
                </div>
                <div style={{ fontSize: "12px", color: "#334155", marginTop: "2px" }}>
                  <b>Contact Phone:</b> {invoiceTransaction.patient_phone || "N/A"}
                </div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "6px" }}>
                  <b>Patient UHID:</b> {invoiceTransaction.patient_un_id ? formatPatientUnId(invoiceTransaction.patient_un_id) : "N/A"}
                </div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                  <b>Service Category:</b> {invoiceTransaction.service_label}
                </div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                  <b>Booking Mode:</b> {invoiceTransaction.sub_type || "Standard"}
                </div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                  <b>Scheduled Time:</b> {formatDate(invoiceTransaction.created_at)} at {formatTime(invoiceTransaction.created_at)}
                </div>
              </div>
            </div>

            {/* Itemized Billing Table */}
            <div style={{ marginTop: "20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "9px 12px", fontWeight: "700", color: "#1e293b", width: "45px" }}>#</th>
                    <th style={{ padding: "9px 12px", fontWeight: "700", color: "#1e293b" }}>Description</th>
                    <th style={{ padding: "9px 12px", fontWeight: "700", color: "#1e293b", width: "140px" }}>Service Mode</th>
                    <th style={{ padding: "9px 12px", fontWeight: "700", color: "#1e293b", width: "85px" }}>SAC Code</th>
                    <th style={{ padding: "9px 12px", fontWeight: "700", color: "#1e293b", width: "100px", textAlign: "right" }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceTransaction.service_type === "lab" && Array.isArray(invoiceTransaction.order_items) && invoiceTransaction.order_items.length > 0 ? (
                    invoiceTransaction.order_items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "9px 12px", color: "#64748b" }}>{idx + 1}</td>
                        <td style={{ padding: "9px 12px", color: "#0f172a", fontWeight: "600" }}>{it.name}</td>
                        <td style={{ padding: "9px 12px", color: "#334155" }}>{invoiceTransaction.sub_type || "Diagnostic Lab"}</td>
                        <td style={{ padding: "9px 12px", color: "#64748b", fontFamily: "monospace" }}>999316</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: "700", color: "#0f172a" }}>
                          {Number(it.price || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>1</td>
                      <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: "600" }}>
                        {invoiceTransaction.service_label} & Professional Clinical Evaluation
                      </td>
                      <td style={{ padding: "10px 12px", color: "#334155" }}>
                        {invoiceTransaction.sub_type || "Standard"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748b", fontFamily: "monospace" }}>
                        {invoiceTransaction.service_type === "lab" ? "999316" : "999312"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "700", color: "#0f172a" }}>
                        {Number(invoiceTransaction.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "9px 12px", color: "#64748b" }}>•</td>
                    <td style={{ padding: "9px 12px", color: "#0f172a" }}>
                      Digital Health Platform Access & Electronic Health Record Archive
                    </td>
                    <td style={{ padding: "9px 12px", color: "#334155" }}>Digital Network</td>
                    <td style={{ padding: "9px 12px", color: "#64748b", fontFamily: "monospace" }}>998314</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: "600", color: "#0f172a" }}>0.00</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals Summary */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "16px", padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>
                      Payment Status:
                    </span>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      backgroundColor: invoiceTransaction.payment_status === "paid" || invoiceTransaction.payment_status === "completed" ? "#d1fae5" : "#fef3c7",
                      color: invoiceTransaction.payment_status === "paid" || invoiceTransaction.payment_status === "completed" ? "#065f46" : "#92400e",
                      border: `1px solid ${invoiceTransaction.payment_status === "paid" || invoiceTransaction.payment_status === "completed" ? "#a7f3d0" : "#fde68a"}`
                    }}>
                      {invoiceTransaction.payment_status}
                    </span>
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "6px" }}>
                    GST Exemption: Notification No. 12/2017-Central Tax (Rate)
                  </div>
                  {invoiceTransaction.razorpay_payment_id && (
                    <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px", fontFamily: "monospace" }}>
                      Gateway ID: {invoiceTransaction.razorpay_payment_id}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "right", minWidth: "220px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#475569", marginBottom: "4px" }}>
                    <span>Gross Amount:</span>
                    <span>₹{Number(invoiceTransaction.amount || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#475569", marginBottom: "6px" }}>
                    <span>Taxes (Healthcare Exempt):</span>
                    <span>₹0.00</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "800", color: "#0067A1", borderTop: "1.5px solid #cbd5e1", paddingTop: "6px" }}>
                    <span>Total Paid:</span>
                    <span>{Number(invoiceTransaction.amount || 0) === 0 ? "Free (₹0.00)" : `₹${Number(invoiceTransaction.amount || 0).toFixed(2)}`}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Compliance & Digital Signature */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "32px", paddingTop: "14px", borderTop: "1px dashed #cbd5e1" }}>
              <div style={{ maxWidth: "460px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "2px" }}>
                  Clinical Practice & Telemedicine Compliance
                </div>
                <div style={{ fontSize: "9.5px", color: "#64748b", lineHeight: "1.4" }}>
                  This document is an electronically generated consultation receipt & tax invoice issued under the Clinical Establishments Act and Telemedicine Practice Guidelines, 2020 by the Ministry of Health and Family Welfare (MoHFW), Govt. of India. Healthcare diagnosis and medical consultations are exempt from GST under SAC 9993.
                </div>
              </div>

              <div style={{ textAlign: "center", minWidth: "180px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#0067A1" }}>
                  MediConnect Healthcare
                </div>
                <div style={{ fontSize: "10px", color: "#059669", fontWeight: "600", marginTop: "2px" }}>
                  ✓ Digitally Authenticated
                </div>
                <div style={{ fontSize: "9.5px", color: "#94a3b8", marginTop: "4px" }}>
                  Authorized Financial Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for Native Print fallback */}
      <style>{`
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body > * {
            visibility: hidden !important;
          }
          .admin-invoice-wrapper {
            position: static !important;
            top: auto !important;
            left: auto !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            visibility: visible !important;
            z-index: 999999 !important;
          }
          #admin-invoice-print-area,
          #admin-invoice-print-area * {
            visibility: visible !important;
          }
          #admin-invoice-print-area {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            padding: 10mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

