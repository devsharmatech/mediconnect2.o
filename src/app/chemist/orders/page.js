"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ClipboardList,
  Search,
  User,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Download,
  Truck,
  Package,
  AlertCircle,
  TrendingUp,
  MoreVertical,
  Calendar,
  IndianRupee,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
  Pill,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  Timer,
  Send,
  Check,
  X,
  Loader2,
  BadgeCheck,
  Flame,
  Radio,
  Activity,
  PackageCheck,
  Bike,
  QrCode,
  CreditCard,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  SlidersHorizontal,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { getLoggedInUser } from "@/lib/authHelpers";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

// ─── Status Config ──────────────────────────────────────────────
const STATUS_CONFIG = {
  payment_pending: { color: "amber", icon: Clock, label: "Awaiting UPI Payment", next: ["rejected"] },
  payment_submitted: { color: "blue", icon: RefreshCw, label: "Payment Verification Pending", next: ["approved", "payment_declined"] },
  payment_declined: { color: "red", icon: AlertTriangle, label: "Payment Verification Rejected", next: ["approved"] },
  pending: { color: "amber", icon: Clock, label: "Pending", next: ["approved", "rejected"] },
  sent_to_chemist: { color: "blue", icon: Package, label: "Sent to Chemist", next: ["approved", "rejected"] },
  approved: { color: "green", icon: CheckCircle2, label: "Payment Verified / Confirmed", next: ["packing", "rejected"] },
  packing: { color: "indigo", icon: PackageCheck, label: "Packing Medicines", next: ["ready_for_dispatch"] },
  ready_for_dispatch: { color: "violet", icon: ShieldCheck, label: "Ready to Dispatch", next: ["out_for_delivery"] },
  out_for_delivery: { color: "orange", icon: Bike, label: "Out for Delivery", next: ["delivered"] },
  delivered: { color: "teal", icon: Truck, label: "Delivered", next: ["completed"] },
  completed: { color: "emerald", icon: BadgeCheck, label: "Completed", next: [] },
  rejected: { color: "red", icon: XCircle, label: "Rejected", next: [] },
  cancelled: { color: "gray", icon: X, label: "Cancelled", next: [] },
};

const COLOR_MAP = {
  amber: { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  blue: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  green: { bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/20", text: "text-purple-700 dark:text-purple-400", dot: "bg-purple-500" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/20", text: "text-indigo-700 dark:text-indigo-400", dot: "bg-indigo-500" },
  violet: { bg: "bg-violet-50 dark:bg-violet-950/20", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-500" },
  orange: { bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
  teal: { bg: "bg-teal-50 dark:bg-teal-950/20", text: "text-teal-700 dark:text-teal-400", dot: "bg-teal-500" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  red: { bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  gray: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", dot: "bg-gray-500" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: "gray", icon: Clock, label: status };
  const colors = COLOR_MAP[cfg.color] || COLOR_MAP.gray;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

// ─── Countdown Hook ─────────────────────────────────────────────
function useCountdown(expiresAt) {
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt) - new Date()) / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 0) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return seconds;
}

// ─── Main Page ────────────────────────────────────────────────────
export default function ChemistOrdersPage() {
  const [chemist, setChemist] = useState(null);
  const router = useRouter();

  // Active view tab: "pool" | "verification" | "active" | "all"
  const [activeTab, setActiveTab] = useState("pool");

  // Orders and Bids state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [broadcasts, setBroadcasts] = useState([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    currentPage: 1, pageSize: 15, totalItems: 0, totalPages: 0,
    hasNextPage: false, hasPrevPage: false,
  });

  // Modal 1: Quotation Creator Modal state
  const [quoteModalBroadcast, setQuoteModalBroadcast] = useState(null);
  const [quoteMeds, setQuoteMeds] = useState([]);
  const [quoteDeliveryFee, setQuoteDeliveryFee] = useState(0);
  const [quoteDiscount, setQuoteDiscount] = useState(0);
  const [quoteEta, setQuoteEta] = useState(30);
  const [quoteNotes, setQuoteNotes] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Modal 2: Payment Proof Viewer state
  const [proofModalOrder, setProofModalOrder] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Modal 3: Payment Rejection Dialog state
  const [rejectModalOrder, setRejectModalOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState("UTR number not matching bank statement");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [rejectingPayment, setRejectingPayment] = useState(false);

  // Withdrawal state
  const [withdrawingQuoteId, setWithdrawingQuoteId] = useState(null);

  // Auth
  useEffect(() => {
    const u = getLoggedInUser("chemist");
    if (u) setChemist(u);
  }, []);

  // ─── Fetch Live Broadcasts ──────────────────────────────────────
  const fetchBroadcasts = useCallback(async (silent = false) => {
    if (!chemist?.id) return;
    if (!silent) setBroadcastsLoading(true);
    try {
      const res = await fetch("/api/chemists/order/get-broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chemist_id: chemist.id }),
      });
      const result = await res.json();
      if (result.success) {
        setBroadcasts(result.data || []);
      }
    } catch (e) {
      console.error("Error fetching broadcasts:", e);
    } finally {
      if (!silent) setBroadcastsLoading(false);
    }
  }, [chemist]);

  useEffect(() => {
    if (!chemist?.id) return;
    fetchBroadcasts();
    const interval = setInterval(() => fetchBroadcasts(true), 4000);
    return () => clearInterval(interval);
  }, [chemist, fetchBroadcasts]);

  // ─── Fetch Orders ──────────────────────────────────────────────
  const fetchOrders = useCallback(async (page = 1, silent = false) => {
    if (!chemist?.id) return;
    if (!silent) setLoadingOrders(true);
    try {
      const res = await fetch("/api/chemists/order/get-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chemist_id: chemist.id,
          page,
          pageSize: pagination.pageSize,
          search,
          status: statusFilter !== "all" ? statusFilter : "",
        }),
      });
      const result = await res.json();
      if (result.success) {
        const { orders: data, pagination: pg } = result.data;
        setOrders(data || []);
        if (pg) setPagination(pg);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      if (!silent) setLoadingOrders(false);
    }
  }, [chemist, pagination.pageSize, search, statusFilter]);

  useEffect(() => {
    if (!chemist?.id) return;
    fetchOrders(1);
    const interval = setInterval(() => fetchOrders(pagination.currentPage, true), 5000);
    return () => clearInterval(interval);
  }, [chemist, fetchOrders]);

  // Quick stats
  const verificationQueueOrders = orders.filter((o) =>
    ["payment_submitted", "payment_verification_pending"].includes(o.status)
  );
  const activeProcessingOrders = orders.filter((o) =>
    ["approved", "packing", "ready_for_dispatch", "out_for_delivery"].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ["delivered", "completed"].includes(o.status)
  );
  const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // ─── Open Quote Creator Modal ───────────────────────────────────
  const handleOpenQuoteModal = (b) => {
    setQuoteModalBroadcast(b);
    let items = [];
    try {
      items = typeof b.medicines === "string" ? JSON.parse(b.medicines) : b.medicines || [];
    } catch {
      items = [];
    }

    if (items.length === 0) {
      items = [{ name: "Prescribed Medications Pack", quantity: 1, dosage: "Complete Rx", price: 350, available: "yes" }];
    } else {
      items = items.map((m) => ({
        name: typeof m === "string" ? m : (m.name || m.medicine_name || "Medicine"),
        quantity: m.quantity || 1,
        dosage: m.dosage || "",
        price: m.price || 120,
        available: "yes",
      }));
    }

    setQuoteMeds(items);
    setQuoteDeliveryFee(0);
    setQuoteDiscount(0);
    setQuoteEta(25);
    setQuoteNotes("");
  };

  // Calculate quote totals
  const subtotal = quoteMeds.reduce((acc, item) => acc + (Number(item.price || 0) * (item.quantity || 1)), 0);
  const netAmount = Math.max(0, subtotal + Number(quoteDeliveryFee || 0) - Number(quoteDiscount || 0));

  // ─── Submit Detailed Quote ───────────────────────────────────────
  const handleSubmitDetailedQuote = async () => {
    if (!quoteModalBroadcast || !chemist?.id) return;

    try {
      setSubmittingQuote(true);
      const res = await fetch("/api/chemists/order/submit-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broadcast_id: quoteModalBroadcast.id,
          chemist_id: chemist.id,
          estimated_cost: netAmount,
          medicine_subtotal: subtotal,
          delivery_charge: Number(quoteDeliveryFee || 0),
          discount: Number(quoteDiscount || 0),
          final_amount: netAmount,
          delivery_time_minutes: parseInt(quoteEta || 30, 10),
          items_breakdown: quoteMeds,
          bid_notes: quoteNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Quotation of ₹${netAmount} submitted to patient!`);
        setQuoteModalBroadcast(null);
        await fetchBroadcasts();
      } else {
        toast.error(data.message || "Failed to submit quote");
      }
    } catch (err) {
      toast.error("Network error while submitting quote");
    } finally {
      setSubmittingQuote(false);
    }
  };

  // ─── Withdraw Submitted Quote ────────────────────────────────────
  const handleWithdrawQuote = async (broadcastId, quoteId) => {
    if (!confirm("Are you sure you want to withdraw your quotation for this order?")) return;

    try {
      setWithdrawingQuoteId(broadcastId);
      const res = await fetch("/api/chemists/order/withdraw-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broadcast_id: broadcastId,
          chemist_id: chemist.id,
          quote_id: quoteId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Quotation withdrawn from the pool");
        await fetchBroadcasts();
      } else {
        toast.error(data.message || "Failed to withdraw quotation");
      }
    } catch {
      toast.error("Error withdrawing quotation");
    } finally {
      setWithdrawingQuoteId(null);
    }
  };

  // ─── Approve Payment ─────────────────────────────────────────────
  const handleApprovePayment = async (orderId) => {
    try {
      setVerifyingPayment(true);
      const res = await fetch("/api/chemists/order/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          chemist_id: chemist.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Payment verified! Order confirmed and unlocked for preparation.");
        setProofModalOrder(null);
        await fetchOrders(pagination.currentPage);
      } else {
        toast.error(data.message || "Failed to verify payment");
      }
    } catch {
      toast.error("Network error while approving payment");
    } finally {
      setVerifyingPayment(false);
    }
  };

  // ─── Reject Payment ──────────────────────────────────────────────
  const handleRejectPayment = async () => {
    if (!rejectModalOrder) return;
    const finalReason = rejectReason === "Other reason (specify)" ? customRejectReason.trim() : rejectReason;

    if (!finalReason) {
      toast.error("Please select or enter a rejection reason");
      return;
    }

    try {
      setRejectingPayment(true);
      const res = await fetch("/api/chemists/order/decline-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: rejectModalOrder.id,
          chemist_id: chemist.id,
          reason: finalReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.error("Payment rejected. Notification sent to patient to resubmit.");
        setRejectModalOrder(null);
        setProofModalOrder(null);
        await fetchOrders(pagination.currentPage);
      } else {
        toast.error(data.message || "Failed to reject payment");
      }
    } catch {
      toast.error("Network error while rejecting payment");
    } finally {
      setRejectingPayment(false);
    }
  };

  // ─── Step-by-Step Status Advance ─────────────────────────────────
  const handleAdvanceOrderStatus = async (order, nextStatus) => {
    try {
      const res = await fetch("/api/chemists/order/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order moved to: ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`);
        await fetchOrders(pagination.currentPage);
      } else {
        toast.error(data.message || "Failed to update order status");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-6">
      <Toaster position="top-right" />

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0067A1]/10 text-[#0067A1] text-xs font-bold mb-3">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Pharmacy Bidding & Order Management Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Chemist Bidding & Fulfillment Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Quote for incoming patient orders, verify UPI payments with proof scrutiny, and manage step-by-step medicine fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchBroadcasts();
              fetchOrders(pagination.currentPage);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all text-xs font-bold shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Dashboard</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Live Pool Requests */}
        <div
          onClick={() => setActiveTab("pool")}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === "pool"
              ? "bg-red-50/60 border-red-200 shadow-sm"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Pool Requests</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{broadcasts.length}</p>
              <p className="text-[11px] text-red-500 font-bold mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                Active Bidding Window
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-red-100 text-red-600">
              <Radio className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Stat 2: Payment Verification Queue */}
        <div
          onClick={() => setActiveTab("verification")}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === "verification"
              ? "bg-blue-50/60 border-blue-200 shadow-sm"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Verification</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{verificationQueueOrders.length}</p>
              <p className="text-[11px] text-blue-600 font-bold mt-0.5">
                {verificationQueueOrders.length > 0 ? "Requires Bank UTR Check" : "Queue Clear"}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-100 text-blue-600 relative">
              <CreditCard className="w-5 h-5" />
              {verificationQueueOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center animate-bounce">
                  {verificationQueueOrders.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat 3: Active Orders */}
        <div
          onClick={() => setActiveTab("active")}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === "active"
              ? "bg-indigo-50/60 border-indigo-200 shadow-sm"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Fulfillment</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{activeProcessingOrders.length}</p>
              <p className="text-[11px] text-indigo-600 font-bold mt-0.5">Packing & Dispatch</p>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-600">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Stat 4: Revenue */}
        <div
          onClick={() => setActiveTab("all")}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-emerald-50/60 border-emerald-200 shadow-sm"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Orders</p>
              <p className="text-2xl font-black text-slate-900 mt-1">₹{totalRevenue.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{completedOrders.length} Delivered</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation Buttons */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("pool")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "pool"
              ? "bg-[#0067A1] text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Live Bidding Pool</span>
          {broadcasts.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "pool" ? "bg-white/20 text-white" : "bg-red-100 text-red-700"}`}>
              {broadcasts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("verification")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "verification"
              ? "bg-[#0067A1] text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payment Verification Queue</span>
          {verificationQueueOrders.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px] font-bold">
              {verificationQueueOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "active"
              ? "bg-[#0067A1] text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <PackageCheck className="w-3.5 h-3.5" />
          <span>Active Orders & Dispatch</span>
          {activeProcessingOrders.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
              {activeProcessingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-[#0067A1] text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>All Orders & History</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE BROADCAST POOL (PATIENT REQUESTS)                             */}
      {/* ========================================================================= */}
      {activeTab === "pool" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Patient Medicine Requests</h2>
              <p className="text-xs text-slate-500">
                Review prescribed items, check inventory, and submit competitive price quotes with delivery SLA.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time polling active</span>
            </div>
          </div>

          {broadcastsLoading && broadcasts.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm space-y-3">
              <Loader2 className="w-8 h-8 text-[#0067A1] animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Listening for patient medicine requests in your delivery zone...</p>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-slate-200 shadow-sm space-y-3">
              <Radio className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Patient Requests in Pool</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When patients in your locality broadcast a medicine order request, it will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {broadcasts.map((b) => {
                let parsedMeds = [];
                try {
                  parsedMeds = typeof b.medicines === "string" ? JSON.parse(b.medicines) : b.medicines || [];
                } catch {
                  parsedMeds = [];
                }

                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-[#0067A1]/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Header with Urgency Timer */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
                          <Radio className="w-3 h-3 animate-ping" />
                          <span>Live Request</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{b.seconds_remaining ? `${Math.floor(b.seconds_remaining / 60)}m ${b.seconds_remaining % 60}s` : "Open"}</span>
                        </span>
                      </div>

                      {/* Locality (DPDP Shielded) */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-3 space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Zone</p>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{b.delivery_address || "Local Delivery Area"}</span>
                        </p>
                      </div>

                      {/* Prescribed Items List */}
                      <div className="space-y-1.5 mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Prescribed Medicines ({parsedMeds.length || 1})
                        </p>
                        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                          {parsedMeds.length > 0 ? (
                            parsedMeds.map((med, idx) => (
                              <div key={idx} className="p-2 text-xs flex items-center justify-between bg-white">
                                <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                                  {typeof med === "string" ? med : med.name}
                                </span>
                                <span className="text-[11px] text-slate-500 font-bold">
                                  Qty: {med.quantity || 1}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-2 text-xs text-slate-500 italic">Prescription Document Attached</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quotation Action */}
                    <div className="pt-3 border-t border-slate-100">
                      {b.already_quoted ? (
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                            <span className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Quote Submitted: ₹{b.quote_amount}</span>
                            </span>
                            <span className="text-[10px] text-emerald-600 block mt-0.5">
                              ETA: {b.delivery_time_minutes || 30} mins &bull; Awaiting Patient Selection
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenQuoteModal(b)}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              Edit Offer
                            </button>
                            <button
                              type="button"
                              disabled={withdrawingQuoteId === b.id}
                              onClick={() => handleWithdrawQuote(b.id, b.quote_id)}
                              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                              title="Withdraw Quote"
                            >
                              Withdraw
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenQuoteModal(b)}
                          className="w-full py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Pill className="w-3.5 h-3.5" />
                          <span>Create & Submit Quotation</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PAYMENT VERIFICATION QUEUE (PROOF SCRUTINY)                        */}
      {/* ========================================================================= */}
      {activeTab === "verification" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Payment Verification Queue</h2>
            <p className="text-xs text-slate-500">
              Patients have declared UPI payments and uploaded receipts. Scrutinize UTR numbers against your bank credit before approving.
            </p>
          </div>

          {verificationQueueOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-slate-200 shadow-sm space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Verification Queue is Clear</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No orders currently waiting for payment proof review. When patients submit UTR details, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {verificationQueueOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-5 border-2 border-blue-200 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-extrabold text-sm text-slate-900">
                          #{order.unid || order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          {order.patient_name || "Patient"}
                        </p>
                      </div>
                      <span className="text-base font-black text-[#0067A1]">
                        ₹{order.total_amount}
                      </span>
                    </div>

                    {/* UTR Pill */}
                    <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-1">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                        Patient Submitted UTR / Ref No.
                      </p>
                      <p className="text-sm font-mono font-black text-blue-900 select-all">
                        {order.utr_number || "Not provided"}
                      </p>
                    </div>

                    {/* Proof Screenshot Thumbnail */}
                    {order.payment_proof_url ? (
                      <div
                        onClick={() => {
                          setProofModalOrder(order);
                          setZoomLevel(1);
                        }}
                        className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 group cursor-pointer"
                      >
                        <img
                          src={order.payment_proof_url}
                          alt="Payment Receipt"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                          <Eye className="w-4 h-4" />
                          <span>Inspect Full Screenshot</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No screenshot image attached
                      </div>
                    )}
                  </div>

                  {/* Verification Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectModalOrder(order)}
                      className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Reject Proof
                    </button>
                    <button
                      type="button"
                      disabled={verifyingPayment}
                      onClick={() => handleApprovePayment(order.id)}
                      className="flex-[1.5] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-300"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Verify & Release</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3 & 4: ACTIVE & ALL ORDERS TABLE                                      */}
      {/* ========================================================================= */}
      {["active", "all"].includes(activeTab) && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
          {/* Search & Filter Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search order ID, patient name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
              />
            </div>
          </div>

          {/* Table Header */}
          <div className="px-5 py-3 bg-slate-50/70 grid grid-cols-[1.5fr_1.5fr_1fr_1.5fr_1fr_auto] gap-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <span>Order ID</span>
            <span>Patient & Address</span>
            <span>Items</span>
            <span>Status</span>
            <span>Total</span>
            <span>Fulfillment Action</span>
          </div>

          {/* Orders Rows */}
          {loadingOrders && orders.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-8 h-8 text-[#0067A1] animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-1">
              <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No orders match this filter</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders
                .filter((o) => {
                  if (activeTab === "active") {
                    return ["approved", "packing", "ready_for_dispatch", "out_for_delivery"].includes(o.status);
                  }
                  return true;
                })
                .map((order) => (
                  <div
                    key={order.id}
                    className="px-5 py-4 grid grid-cols-[1.5fr_1.5fr_1fr_1.5fr_1fr_auto] gap-4 items-center hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Order ID */}
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">
                        #{order.unid || order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(order.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </p>
                    </div>

                    {/* Patient & Address */}
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {order.patient_name || "Patient"}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">
                        {order.display_delivery_address || order.raw_patient_address || "Shielded locality"}
                      </p>
                    </div>

                    {/* Items */}
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Pill className="w-3.5 h-3.5 text-purple-600" />
                      <span>{order.medicine_order_items?.length || 1} items</span>
                    </div>

                    {/* Status */}
                    <div>
                      <StatusBadge status={order.status} />
                    </div>

                    {/* Amount */}
                    <div className="text-xs font-black text-slate-900">
                      ₹{order.total_amount || 0}
                    </div>

                    {/* Quick Step Buttons */}
                    <div className="flex items-center gap-2">
                      {order.status === "approved" && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceOrderStatus(order, "packing")}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Start Packing
                        </button>
                      )}
                      {order.status === "packing" && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceOrderStatus(order, "ready_for_dispatch")}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Ready to Dispatch
                        </button>
                      )}
                      {order.status === "ready_for_dispatch" && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceOrderStatus(order, "out_for_delivery")}
                          className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Out for Delivery
                        </button>
                      )}
                      {order.status === "out_for_delivery" && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceOrderStatus(order, "delivered")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                        >
                          Mark Delivered
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => router.push(`/chemist/orders/${order.id}`)}
                        className="p-2 text-slate-400 hover:text-[#0067A1] hover:bg-white rounded-xl transition-colors cursor-pointer"
                        title="View Full Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DETAILED QUOTATION CREATOR MODAL                                */}
      {/* ========================================================================= */}
      {quoteModalBroadcast && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Submit Pharmacy Quotation</h3>
                <p className="text-xs text-slate-500">Provide item-wise prices and delivery turnaround SLA.</p>
              </div>
              <button
                type="button"
                onClick={() => setQuoteModalBroadcast(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Medicines Pricing List */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Item Availability & Price</p>
              {quoteMeds.map((med, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{med.name}</p>
                    <span className="text-[10px] text-slate-400">Qty: {med.quantity} &bull; {med.dosage || "Standard"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-24">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={med.price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setQuoteMeds((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, price: val } : item))
                          );
                        }}
                        className="w-full pl-6 pr-2 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charges and ETA */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Delivery Charge</label>
                <input
                  type="number"
                  min="0"
                  value={quoteDeliveryFee}
                  onChange={(e) => setQuoteDeliveryFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={quoteDiscount}
                  onChange={(e) => setQuoteDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">ETA (Mins)</label>
                <input
                  type="number"
                  min="5"
                  value={quoteEta}
                  onChange={(e) => setQuoteEta(parseInt(e.target.value, 10) || 30)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                />
              </div>
            </div>

            {/* Total Net Calculation */}
            <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Total Net Amount to Patient:</span>
              <span className="text-base font-black text-[#0067A1]">₹{netAmount.toFixed(2)}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setQuoteModalBroadcast(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingQuote}
                onClick={handleSubmitDetailedQuote}
                className="flex-[1.5] py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300"
              >
                {submittingQuote ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Quotation...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Quote to Patient (₹{netAmount.toFixed(2)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: HIGH-RESOLUTION ZOOMABLE PAYMENT PROOF VIEWER                   */}
      {/* ========================================================================= */}
      {proofModalOrder && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Scrutinize Payment Proof &bull; Order #{proofModalOrder.unid || proofModalOrder.id.slice(0, 8).toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500">
                  Amount: <strong className="text-slate-800">₹{proofModalOrder.total_amount}</strong> &bull; UTR: <strong className="text-[#0067A1] font-mono">{proofModalOrder.utr_number}</strong>
                </p>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setProofModalOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Viewport */}
            <div className="flex-1 overflow-auto bg-slate-900 p-4 flex items-center justify-center min-h-[350px]">
              <img
                src={proofModalOrder.payment_proof_url}
                alt="Enlarged Payment Proof"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                className="max-h-[60vh] object-contain transition-transform duration-150 rounded-lg"
              />
            </div>

            {/* Decision Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setRejectModalOrder(proofModalOrder)}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Reject Proof
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProofModalOrder(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={verifyingPayment}
                  onClick={() => handleApprovePayment(proofModalOrder.id)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:bg-slate-300"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Verify Payment & Release Fulfillment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PAYMENT PROOF REJECTION DIALOG                                  */}
      {/* ========================================================================= */}
      {rejectModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Reject Payment Proof</h3>
              <button type="button" onClick={() => setRejectModalOrder(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select the reason why this payment cannot be confirmed. The patient will be notified to correct and resubmit.
            </p>

            <div className="space-y-2">
              {[
                "UTR number not matching bank statement",
                "Incorrect / partial amount credited",
                "Receipt screenshot unreadable or blurry",
                "Duplicate / invalid transaction reference",
                "Other reason (specify)"
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                    rejectReason === reason
                      ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    checked={rejectReason === reason}
                    onChange={() => setRejectReason(reason)}
                    className="text-[#0067A1] focus:ring-[#0067A1]"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              {rejectReason === "Other reason (specify)" && (
                <textarea
                  rows={2}
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  placeholder="Specify reason for patient..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                />
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectingPayment}
                onClick={handleRejectPayment}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:bg-slate-300"
              >
                {rejectingPayment ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}