"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  FaWallet,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaInfoCircle,
  FaBuilding,
  FaVideo,
  FaHome,
  FaUniversity,
  FaSearch,
  FaFileInvoiceDollar,
  FaCheck,
  FaUserMd,
  FaChevronDown,
  FaSpinner,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

function formatDate(val) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(val);
  }
}

function formatDateRange(start, end) {
  if (!start && !end) return "—";
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatBatchPeriod(period) {
  if (!period) return "—";
  const match = String(period).match(/^(\d{4})-(\d{2})-CYCLE-(\d+)$/i);
  if (match) {
    const [, yr, mo, cyc] = match;
    const moName = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString("en-IN", { month: "short" });
    return `Cycle ${cyc} · ${moName} ${yr}`;
  }
  return period;
}

function formatCurrency(val, prefix = "₹") {
  const num = Number(val || 0);
  return `${prefix}${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function getSettlementLabel(status) {
  if (status === "settled") return { label: "Settled", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "check" };
  if (status === "queued") return { label: "In Queue", color: "bg-sky-50 text-[#0067A1] border-sky-200", icon: "clock" };
  return { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", icon: "clock" };
}

export default function DoctorRevenuePage() {
  // Summary data (metrics, bank, batches, ledger)
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error, setError] = useState("");

  // Bookings (API paginated)
  const [bookings, setBookings] = useState([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsHasMore, setBookingsHasMore] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingMoreBookings, setLoadingMoreBookings] = useState(false);

  // Ledger pagination (client-side from summary fetch)
  const [visibleLedgerCount, setVisibleLedgerCount] = useState(15);

  const [activeTab, setActiveTab] = useState("bookings");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState("all");
  const [ledgerFlowFilter, setLedgerFlowFilter] = useState("all");
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  const searchDebounceRef = useRef(null);
  const doctorIdRef = useRef(null);
  const tokenRef = useRef(null);

  // Resolve auth refs once
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      doctorIdRef.current = urlParams.get("doctor_id") || localStorage.getItem("userId");
      tokenRef.current = localStorage.getItem("token") || localStorage.getItem("userId");
    }
  }, []);

  const buildHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    const token = tokenRef.current;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["x-user-id"] = token;
    }
    return headers;
  };

  // Fetch summary (metrics, bank, ledger, batches)
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setError("");
      const doctorId = doctorIdRef.current;
      const res = await fetch(
        `/api/doctor/revenue/summary${doctorId ? `?doctor_id=${doctorId}` : ""}`,
        { headers: buildHeaders() }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load revenue");
      setSummaryData(json.data);
    } catch (e) {
      console.error("Revenue summary fetch error:", e);
      setError(e.message || "Failed to load revenue data");
      toast.error("Failed to load revenue details");
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Fetch bookings page from API
  const fetchBookings = useCallback(async ({ page = 1, filter = "all", search = "", append = false } = {}) => {
    try {
      if (append) setLoadingMoreBookings(true);
      else setLoadingBookings(true);

      const doctorId = doctorIdRef.current;
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        filter,
        ...(search && { search }),
        ...(doctorId && { doctor_id: doctorId }),
      });

      const res = await fetch(`/api/doctor/revenue/bookings?${params}`, { headers: buildHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load bookings");

      const { bookings: newBookings, pagination } = json.data;

      setBookings((prev) => append ? [...prev, ...newBookings] : newBookings);
      setBookingsTotal(pagination.total);
      setBookingsHasMore(pagination.hasMore);
      setBookingsPage(page);
    } catch (e) {
      console.error("Bookings fetch error:", e);
      toast.error("Failed to load bookings");
    } finally {
      setLoadingBookings(false);
      setLoadingMoreBookings(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    // Wait for auth refs to be set
    const init = setTimeout(() => {
      fetchSummary();
      fetchBookings({ page: 1, filter: bookingFilter, search: searchQuery });
    }, 50);
    return () => clearTimeout(init);
  }, []);

  // On filter/search change — reset bookings, page 1
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchBookings({ page: 1, filter: bookingFilter, search: searchQuery, append: false });
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [bookingFilter, searchQuery]);

  const handleLoadMoreBookings = () => {
    fetchBookings({ page: bookingsPage + 1, filter: bookingFilter, search: searchQuery, append: true });
  };

  const metrics = summaryData?.metrics || {
    gross_consultation_fees: 0,
    total_platform_commission: 0,
    total_tds_withheld: 0,
    total_gst_on_platform_fee: 0,
    net_accrued_balance: 0,
    total_settled_paid: 0,
    pending_payout_balance: 0,
    total_completed_consultations: 0,
  };

  const doctor = summaryData?.doctor || {};
  const bank = doctor.bank_details || {};
  const batches = summaryData?.payout_batches || [];
  const ledgerEntries = summaryData?.recent_ledger_entries || [];
  const totalLedgerCount = summaryData?.total_ledger_count || ledgerEntries.length;

  // Filter ledger transactions (client-side)
  const filteredLedgerEntries = useMemo(() => {
    return ledgerEntries.filter((l) => {
      const type = String(l.entry_type || "").toLowerCase();
      const desc = String(l.description || "").toLowerCase();
      const acc = String(l.account_code || "").toLowerCase();
      const bookingId = String(l.booking_id || "").toLowerCase();
      const q = ledgerSearchQuery.toLowerCase().trim();

      if (q && !desc.includes(q) && !acc.includes(q) && !bookingId.includes(q) && !type.includes(q)) return false;
      if (ledgerFilter === "fee" && type !== "consultation_fee") return false;
      if (ledgerFilter === "commission" && type !== "platform_commission") return false;
      if (ledgerFilter === "tax" && !type.includes("gst") && !type.includes("tds") && !acc.includes("gst") && !acc.includes("tds")) return false;
      if (ledgerFilter === "payout" && !type.includes("payout") && !type.includes("settlement") && !type.includes("disbursement")) return false;

      const debit = Number(l.debit || 0);
      const credit = Number(l.credit || 0);
      if (ledgerFlowFilter === "credit" && credit <= 0) return false;
      if (ledgerFlowFilter === "debit" && debit <= 0) return false;
      return true;
    });
  }, [ledgerEntries, ledgerFilter, ledgerFlowFilter, ledgerSearchQuery]);

  const visibleLedger = useMemo(() => filteredLedgerEntries.slice(0, visibleLedgerCount), [filteredLedgerEntries, visibleLedgerCount]);

  // Payout cycle label
  const today = new Date();
  const currentDay = today.getDate();
  let currentCycleLabel = "Cycle 2 · Days 11–20";
  let payoutDateEstimate = `Est. 23 ${today.toLocaleDateString("en-IN", { month: "short" })}`;
  if (currentDay <= 10) {
    currentCycleLabel = "Cycle 1 · Days 1–10";
    payoutDateEstimate = "Est. 13th of month";
  } else if (currentDay > 20) {
    currentCycleLabel = "Cycle 3 · Days 21–End";
    payoutDateEstimate = "Est. 3rd next month";
  }

  const rawAcc = String(bank.account_no || "");
  const maskedAcc = rawAcc.length >= 4
    ? `•••• ${rawAcc.slice(-4)}`
    : rawAcc ? `•••• ${rawAcc}` : "Not Registered";

  const rawDoctorName = doctor.full_name || "Doctor";
  const cleanDoctorName = rawDoctorName.replace(/^Dr\.?\s+/i, "");

  const loading = loadingSummary;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto bg-slate-50/60 min-h-screen">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-lg border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0067A1] uppercase tracking-wider">
            <FaUserMd className="w-3.5 h-3.5" />
            <span>Practice Finance & Settlements</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-normal normal-case">Dr. {cleanDoctorName}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            Earnings & Payout Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consultation fees, commission, TDS (Form 26AS) and 10-day direct bank deposits.
          </p>
        </div>
        <button
          onClick={() => { fetchSummary(); fetchBookings({ page: 1, filter: bookingFilter, search: searchQuery }); }}
          disabled={loading || loadingBookings}
          className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3.5 py-2 rounded-md transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto shrink-0"
        >
          {(loading || loadingBookings) ? <FaSpinner className="w-3 h-3 animate-spin text-slate-400" /> : <FaClock className="w-3 h-3 text-slate-400" />}
          <span>Refresh</span>
        </button>
      </div>

      {/* ── EARNING CARD + BANK CARD ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Earning Card */}
        <div className="lg:col-span-2 bg-[#0067A1] text-white rounded-lg p-5 sm:p-6 border border-[#005a8e] flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-white tracking-wide uppercase">Net Take-Home</span>
                <span className="text-white/40">•</span>
                <span className="text-xs text-sky-100 font-medium">{currentCycleLabel}</span>
              </div>
              <span className="text-[11px] font-semibold bg-white/15 border border-white/20 text-white px-2.5 py-0.5 rounded">
                {payoutDateEstimate}
              </span>
            </div>

            <div className="my-4">
              <span className="text-[11px] text-sky-100/90 font-medium uppercase tracking-wider block">
                Pending Bank Disbursement
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white mt-1 tracking-tight">
                {formatCurrency(metrics.pending_payout_balance)}
              </div>
              <p className="text-xs text-sky-100/70 mt-1">
                Net professional fee accrued from completed consultations, ready for NEFT/IMPS.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/15 text-xs">
            <div className="bg-white/10 rounded-md p-2.5 border border-white/10">
              <span className="text-[10px] text-sky-200 uppercase block">Gross Fees</span>
              <span className="text-sm font-bold font-mono text-white mt-0.5 block">{formatCurrency(metrics.gross_consultation_fees)}</span>
              <span className="text-[10px] text-sky-200/80">{metrics.total_completed_consultations} visits</span>
            </div>
            <div className="bg-white/10 rounded-md p-2.5 border border-white/10">
              <span className="text-[10px] text-sky-200 uppercase block">Platform Fee</span>
              <span className="text-sm font-bold font-mono text-amber-200 mt-0.5 block">-{formatCurrency(metrics.total_platform_commission)}</span>
              <span className="text-[10px] text-sky-200/80">20% video / 18% clinic</span>
            </div>
            <div className="bg-white/10 rounded-md p-2.5 border border-white/10">
              <span className="text-[10px] text-sky-200 uppercase block">TDS (10%)</span>
              <span className="text-sm font-bold font-mono text-sky-100 mt-0.5 block">-{formatCurrency(metrics.total_tds_withheld)}</span>
              <span className="text-[10px] text-sky-200/80">Form 26AS credit</span>
            </div>
            <div className="bg-white/10 rounded-md p-2.5 border border-white/10">
              <span className="text-[10px] text-sky-200 uppercase block">GST</span>
              <span className="text-sm font-bold font-mono text-white mt-0.5 block">{formatCurrency(metrics.total_gst_on_platform_fee)}</span>
              <span className="text-[10px] text-sky-200/80">18% on commission</span>
            </div>
          </div>
        </div>

        {/* Bank Card */}
        <div className="bg-white rounded-lg p-5 sm:p-6 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-sky-50 text-[#0067A1] border border-sky-100 flex items-center justify-center">
                  <FaUniversity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">{bank.bank_name || "Punjab National Bank"}</h3>
                  <p className="text-[10px] text-slate-500">Registered Bank</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FaCheck className="w-2 h-2" /> Verified
              </span>
            </div>

            <div className="mt-4">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">Settlement A/C</span>
              <div className="font-mono text-base font-bold text-slate-800 mt-0.5 tracking-wider">{maskedAcc}</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">Beneficiary:</span>
              <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[140px]">
                {bank.account_name || doctor.full_name || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">IFSC:</span>
              <span className="font-mono font-semibold text-slate-800 text-[11px]">{bank.ifsc || "—"}</span>
            </div>
            {bank.branch && (
              <div className="text-[10px] text-slate-400 pt-0.5 truncate">Branch: {bank.branch}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── SETTLEMENT POLICY BANNER ──────────────────────────────────── */}
      <div className="bg-sky-50 border border-sky-100 rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <FaInfoCircle className="w-3.5 h-3.5 text-[#0067A1] shrink-0 mt-0.5" />
          <span className="text-slate-700 leading-relaxed">
            <strong className="text-slate-900 font-semibold">10-Day Auto Settlement:</strong>{" "}
            Batches are reconciled every 10 days (Cycles 1–3) and disbursed to your bank within 3 business days of cycle close.
          </span>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 bg-white border border-sky-200 px-2.5 py-1 rounded text-[11px] font-semibold text-[#0067A1]">
          {currentCycleLabel}
        </span>
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-1">
        {[
          { key: "bookings", label: "Consultations", count: bookingsTotal },
          { key: "settlements", label: "Settlements", count: batches.length },
          { key: "ledger", label: "Ledger", count: totalLedgerCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === tab.key
                ? "border-[#0067A1] text-[#0067A1]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? "bg-sky-100 text-[#0067A1]" : "bg-slate-100 text-slate-600"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: CONSULTATIONS ─────────────────────────────────────── */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Consultations
                </h2>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {bookingsTotal} total
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Fee breakdown per consultation</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <FaSearch className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ID / date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs pl-7 pr-3 py-1.5 rounded-md border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-[#0067A1] w-36 sm:w-40"
                />
              </div>

              <div className="flex items-center border border-slate-200 rounded-md p-0.5 bg-slate-50 text-[11px]">
                <button
                  onClick={() => setBookingFilter("all")}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                    bookingFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setBookingFilter("paid")}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                    bookingFilter === "paid" ? "bg-white text-emerald-700 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Paid
                </button>
              </div>

              {(bookingFilter !== "all" || searchQuery) && (
                <button
                  onClick={() => { setBookingFilter("all"); setSearchQuery(""); }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded cursor-pointer transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {loadingBookings ? (
            <div className="p-12 text-center">
              <FaSpinner className="w-5 h-5 text-[#0067A1] animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading consultations...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-700">No consultations found.</p>
              <p className="text-slate-400 text-[11px]">Completed and paid appointments will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-28">Booking ID</th>
                    <th className="py-2.5 px-4 w-36">Date & Time</th>
                    <th className="py-2.5 px-4 w-32">Mode</th>
                    <th className="py-2.5 px-4 text-right w-20">Gross</th>
                    <th className="py-2.5 px-4 text-center w-16">Comm.</th>
                    <th className="py-2.5 px-4 text-right w-20">Deducted</th>
                    <th className="py-2.5 px-4 text-right w-24">Net Share</th>
                    <th className="py-2.5 px-4 w-28">Status</th>
                    <th className="py-2.5 px-4 text-center w-16">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((bk) => {
                    let snap = bk.financial_snapshot;
                    if (typeof snap === "string") {
                      try { snap = JSON.parse(snap); } catch { snap = null; }
                    }
                    const mode = String(bk.appointment_type || "").toLowerCase();
                    const fee = Number(snap?.professional_fee || bk.final_fee || bk.original_fee || 0);
                    const commRate = snap?.commission_rate ?? bk.commission_rate ?? 18;
                    const commAmt = Number(snap?.commission_amount || (fee * (commRate / 100)));
                    const netDoctor = Number(snap?.doctor_net_payable || (fee - commAmt));
                    const { label: settlementLabel, color: settlementColor, icon: settlementIcon } = getSettlementLabel(bk.settlement_status);

                    return (
                      <tr key={bk.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                          #{String(bk.id).slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 whitespace-nowrap text-[11px]">
                          {formatDate(bk.appointment_date)}{" "}
                          <span className="text-slate-400 font-normal">
                            ({bk.appointment_time?.slice(0, 5)})
                          </span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {mode.includes("video") ? (
                              <FaVideo className="text-sky-600 w-2.5 h-2.5" />
                            ) : mode.includes("home") ? (
                              <FaHome className="text-amber-600 w-2.5 h-2.5" />
                            ) : (
                              <FaBuilding className="text-emerald-600 w-2.5 h-2.5" />
                            )}
                            <span className="capitalize">{mode.replace(/_/g, " ")}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(fee)}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-600 tabular-nums text-[11px]">
                          {commRate}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-amber-700 font-medium tabular-nums">
                          -{formatCurrency(commAmt)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(netDoctor)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${settlementColor}`}>
                            {settlementIcon === "check"
                              ? <FaCheckCircle className="w-2.5 h-2.5" />
                              : <FaClock className="w-2.5 h-2.5" />
                            }
                            <span>{settlementLabel}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          {snap ? (
                            <button
                              onClick={() => setSelectedSnapshot(snap)}
                              className="text-[11px] font-medium text-[#0067A1] hover:text-[#004F7C] bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {bookings.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-medium">
                Showing {bookings.length} of {bookingsTotal}
              </span>
              {bookingsHasMore ? (
                <button
                  onClick={handleLoadMoreBookings}
                  disabled={loadingMoreBookings}
                  className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-[#0067A1] text-slate-700 hover:text-[#0067A1] text-xs font-semibold px-4 py-1.5 rounded-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingMoreBookings ? (
                    <><FaSpinner className="w-3 h-3 animate-spin" /><span>Loading...</span></>
                  ) : (
                    <><FaChevronDown className="w-2.5 h-2.5" /><span>Load More</span></>
                  )}
                </button>
              ) : bookings.length > 0 ? (
                <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1">
                  <FaCheck className="w-2.5 h-2.5 text-emerald-600" />
                  <span>All loaded</span>
                </span>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SETTLEMENTS ───────────────────────────────────────── */}
      {activeTab === "settlements" && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Settlement Cycles</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">10-day auto-reconciliation batches</p>
            </div>
            <span className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
              Disbursed within 3 days of cycle close
            </span>
          </div>

          {batches.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-700">No settlement batches yet.</p>
              <p className="text-slate-400 text-[11px]">Completed appointments are batched at close of every 10-day cycle.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-40">Period</th>
                    <th className="py-2.5 px-4 w-40">Date Range</th>
                    <th className="py-2.5 px-4 text-center w-16">Visits</th>
                    <th className="py-2.5 px-4 text-right w-24">Gross</th>
                    <th className="py-2.5 px-4 text-right w-24">Commission</th>
                    <th className="py-2.5 px-4 text-right w-20">TDS</th>
                    <th className="py-2.5 px-4 text-right w-24">Net Payout</th>
                    <th className="py-2.5 px-4 w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => {
                    const isPaid = b.status === "paid";
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{formatBatchPeriod(b.batch_period)}</div>
                          <div className="font-mono text-[10px] text-slate-400 font-normal mt-0.5">{b.batch_period}</div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 font-medium whitespace-nowrap text-[11px]">
                          {formatDateRange(b.period_start, b.period_end)}
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-700 font-mono">{b.total_bookings}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(b.gross_consultation_fees)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-amber-700 font-medium tabular-nums">
                          -{formatCurrency(b.total_platform_commission)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600 tabular-nums">
                          -{formatCurrency(b.total_tds)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(b.net_payout)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-sky-50 text-[#0067A1] border-sky-200"
                          }`}>
                            {isPaid ? <FaCheckCircle className="w-2.5 h-2.5" /> : <FaClock className="w-2.5 h-2.5" />}
                            <span>{isPaid ? "Paid" : "Processing"}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: LEDGER ───────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Transaction Ledger
                  </h2>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {filteredLedgerEntries.length} entries
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Double-entry journal: fees, commissions, and taxes</p>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Showing {visibleLedger.length} of {filteredLedgerEntries.length}
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <FaSearch className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={ledgerSearchQuery}
                  onChange={(e) => { setLedgerSearchQuery(e.target.value); setVisibleLedgerCount(15); }}
                  className="text-xs pl-7 pr-3 py-1.5 rounded-md border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-[#0067A1] w-40"
                />
              </div>

              <div className="flex items-center border border-slate-200 rounded-md p-0.5 bg-slate-50 text-[11px]">
                {[
                  { key: "all", label: "All" },
                  { key: "fee", label: "Fees" },
                  { key: "commission", label: "Platform" },
                  { key: "tax", label: "TDS/GST" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => { setLedgerFilter(f.key); setVisibleLedgerCount(15); }}
                    className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors whitespace-nowrap ${
                      ledgerFilter === f.key ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center border border-slate-200 rounded-md p-0.5 bg-slate-50 text-[11px]">
                {[
                  { key: "all", label: "All" },
                  { key: "credit", label: "Credits" },
                  { key: "debit", label: "Debits" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => { setLedgerFlowFilter(f.key); setVisibleLedgerCount(15); }}
                    className={`px-2 py-1 rounded font-medium cursor-pointer transition-colors ${
                      ledgerFlowFilter === f.key ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {(ledgerFilter !== "all" || ledgerFlowFilter !== "all" || ledgerSearchQuery) && (
                <button
                  onClick={() => { setLedgerFilter("all"); setLedgerFlowFilter("all"); setLedgerSearchQuery(""); setVisibleLedgerCount(15); }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded cursor-pointer transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {filteredLedgerEntries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-700">No transactions found.</p>
              <p className="text-slate-400 text-[11px]">Fees, commissions, and tax entries will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-36">Date</th>
                    <th className="py-2.5 px-4 w-32">Type</th>
                    <th className="py-2.5 px-4 w-32">Account</th>
                    <th className="py-2.5 px-4 text-right w-24">Debit</th>
                    <th className="py-2.5 px-4 text-right w-24">Credit</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-center w-16">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleLedger.map((l) => {
                    const linkedBooking = summaryData?.recent_bookings?.find((b) => b.id === l.booking_id) || bookings.find((b) => b.id === l.booking_id);
                    let snap = linkedBooking?.financial_snapshot;
                    if (typeof snap === "string") { try { snap = JSON.parse(snap); } catch { snap = null; } }

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {formatDate(l.created_at)}{" "}
                          <span className="text-slate-400 font-normal">
                            ({new Date(l.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            l.entry_type === "consultation_fee"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : l.entry_type === "platform_commission"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : l.entry_type === "gst_on_commission"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {l.entry_type?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          <div>{l.account_code}</div>
                          {l.booking_id && (
                            <div className="text-[10px] text-slate-400 mt-0.5">#{String(l.booking_id).slice(0, 8)}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-rose-600 font-semibold whitespace-nowrap tabular-nums">
                          {Number(l.debit) > 0 ? `-${formatCurrency(l.debit)}` : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-semibold whitespace-nowrap tabular-nums">
                          {Number(l.credit) > 0 ? `+${formatCurrency(l.credit)}` : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 text-[11px]">{l.description}</td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          {snap ? (
                            <button
                              onClick={() => setSelectedSnapshot(snap)}
                              className="text-[11px] font-medium text-[#0067A1] hover:text-[#004F7C] bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Ledger Load More */}
          {filteredLedgerEntries.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-medium">
                Showing {visibleLedger.length} of {filteredLedgerEntries.length}
              </span>
              {visibleLedgerCount < filteredLedgerEntries.length ? (
                <button
                  onClick={() => setVisibleLedgerCount((prev) => prev + 15)}
                  className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-[#0067A1] text-slate-700 hover:text-[#0067A1] text-xs font-semibold px-4 py-1.5 rounded-md transition-all cursor-pointer"
                >
                  <FaChevronDown className="w-2.5 h-2.5" />
                  <span>Load More</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1">
                  <FaCheck className="w-2.5 h-2.5 text-emerald-600" />
                  <span>All loaded</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SNAPSHOT MODAL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSnapshot && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-3.5 border border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <FaFileInvoiceDollar className="w-4 h-4 text-[#0067A1]" />
                  <h3 className="text-sm font-bold text-slate-900">Fee Breakdown</h3>
                </div>
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mode:</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedSnapshot.service_mode?.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Professional Fee:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedSnapshot.professional_fee)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Commission ({selectedSnapshot.commission_rate}%):</span>
                  <span className="font-mono font-semibold text-amber-700">-{formatCurrency(selectedSnapshot.commission_amount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">GST on Commission ({selectedSnapshot.commission_gst_rate}%):</span>
                  <span className="font-mono text-slate-700">{formatCurrency(selectedSnapshot.commission_gst_amount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">TDS Withheld ({selectedSnapshot.doctor_tds_rate}%):</span>
                  <span className="font-mono font-semibold text-slate-700">-{formatCurrency(selectedSnapshot.doctor_tds_amount)}</span>
                </div>
                <div className="flex justify-between py-2 bg-emerald-50 px-3 rounded-md font-bold text-emerald-800 text-sm">
                  <span>Net Doctor Share:</span>
                  <span className="font-mono text-base">{formatCurrency(selectedSnapshot.doctor_net_payable)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>Rule: {selectedSnapshot.rule_version}</span>
                  <span>{formatDate(selectedSnapshot.snapshot_created_at)}</span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="bg-[#0067A1] text-white text-xs font-medium px-4 py-1.5 rounded-md hover:bg-[#005a8e] transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
