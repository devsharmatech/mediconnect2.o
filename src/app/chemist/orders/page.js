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
  const [withdrawConfirmItem, setWithdrawConfirmItem] = useState(null);

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

  // ─── Safe Number Sanitizer ──────────────────────────────────────
  const sanitizeNumber = (val, fallback = 0) => {
    if (val === null || val === undefined || val === "") return fallback;
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  };

  // ─── Open Quote Creator Modal ───────────────────────────────────
  const handleOpenQuoteModal = (b) => {
    setQuoteModalBroadcast(b);
    let items = [];
    try {
      items = typeof b.medicines === "string" ? JSON.parse(b.medicines) : b.medicines || [];
    } catch {
      items = [];
    }

    // Check if chemist already submitted a quote for this broadcast
    const prevQuote = b.submitted_quote || null;
    let prevItems = [];
    if (prevQuote?.items_breakdown) {
      try {
        prevItems = typeof prevQuote.items_breakdown === "string"
          ? JSON.parse(prevQuote.items_breakdown)
          : prevQuote.items_breakdown;
      } catch {
        prevItems = [];
      }
    } else if (b.items_breakdown) {
      try {
        prevItems = typeof b.items_breakdown === "string"
          ? JSON.parse(b.items_breakdown)
          : b.items_breakdown;
      } catch {
        prevItems = [];
      }
    }

    if (items.length === 0 && (!prevItems || prevItems.length === 0)) {
      const prevSub = prevQuote ? sanitizeNumber(prevQuote.medicine_subtotal || prevQuote.final_amount, 0) : 0;
      items = [{
        name: "Prescribed Medications Pack",
        quantity: 1,
        dosage: "Complete Rx",
        price: prevSub > 0 ? prevSub : "",
        available: "yes",
      }];
    } else {
      items = items.map((m, idx) => {
        const name = typeof m === "string" ? m : (m.name || m.medicine_name || "Medicine");
        const prevMatch = Array.isArray(prevItems)
          ? prevItems.find((p) => p.name === name) || prevItems[idx]
          : null;

        let priceVal = "";
        if (prevMatch && prevMatch.price !== undefined && prevMatch.price !== null && !isNaN(Number(prevMatch.price))) {
          priceVal = Number(prevMatch.price);
        } else if (m.price !== undefined && m.price !== null && !isNaN(Number(m.price))) {
          priceVal = Number(m.price);
        }

        return {
          name,
          quantity: m.quantity || 1,
          dosage: m.dosage || "",
          price: priceVal !== "" && Number(priceVal) > 0 ? Number(priceVal) : "",
          available: "yes",
        };
      });
    }

    setQuoteMeds(items);
    setQuoteDeliveryFee(prevQuote ? sanitizeNumber(prevQuote.delivery_charge, 0) : 0);
    setQuoteDiscount(prevQuote ? sanitizeNumber(prevQuote.discount, 0) : 0);
    setQuoteEta(prevQuote ? (parseInt(prevQuote.delivery_time_minutes, 10) || 25) : (b.delivery_time_minutes || 25));
    setQuoteNotes(prevQuote?.bid_notes || b.bid_notes || "");
  };

  // Calculate quote totals with full safety against NaN
  const subtotal = quoteMeds.reduce((acc, item) => acc + sanitizeNumber(item.price, 0), 0);
  const netAmount = Math.max(0, subtotal + sanitizeNumber(quoteDeliveryFee, 0) - sanitizeNumber(quoteDiscount, 0));

  // ─── Submit Detailed Quote ───────────────────────────────────────
  const handleSubmitDetailedQuote = async () => {
    if (!quoteModalBroadcast || !chemist?.id) return;

    if (netAmount <= 0) {
      toast.error("Please enter item prices before submitting quotation");
      return;
    }

    try {
      setSubmittingQuote(true);
      const cleanedMeds = quoteMeds.map((item) => ({
        ...item,
        price: sanitizeNumber(item.price, 0),
      }));

      const res = await fetch("/api/chemists/order/submit-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broadcast_id: quoteModalBroadcast.id,
          chemist_id: chemist.id,
          estimated_cost: netAmount,
          medicine_subtotal: subtotal,
          delivery_charge: sanitizeNumber(quoteDeliveryFee, 0),
          discount: sanitizeNumber(quoteDiscount, 0),
          final_amount: netAmount,
          delivery_time_minutes: parseInt(quoteEta || 25, 10),
          items_breakdown: cleanedMeds,
          bid_notes: quoteNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Quotation of ₹${netAmount.toFixed(2)} submitted to patient!`);
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
    try {
      setWithdrawingQuoteId(broadcastId);
      const tid = toast.loading("Withdrawing quotation from pool...");
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
      toast.dismiss(tid);
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
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#0067A1] text-white shrink-0 shadow-xs">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Medicine Orders
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review live patient requests, quote prices, verify UPI proofs, and fulfill orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchBroadcasts();
              fetchOrders(pagination.currentPage);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Stat 1: Live Pool Requests */}
        <div
          onClick={() => setActiveTab("pool")}
          className={`p-4 sm:p-5 rounded-xl border bg-white transition-all cursor-pointer shadow-xs ${
            activeTab === "pool"
              ? "border-[#0067A1] ring-1 ring-[#0067A1]/20"
              : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Live Pool Requests</p>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">{broadcasts.length}</p>
              <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Active Bidding Window
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 shrink-0">
              <Radio className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Stat 2: Payment Verification Queue */}
        <div
          onClick={() => setActiveTab("verification")}
          className={`p-4 sm:p-5 rounded-xl border bg-white transition-all cursor-pointer shadow-xs ${
            activeTab === "verification"
              ? "border-[#0067A1] ring-1 ring-[#0067A1]/20"
              : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Payment Verification</p>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">{verificationQueueOrders.length}</p>
              <p className="text-xs text-[#0067A1] font-medium mt-1">
                {verificationQueueOrders.length > 0 ? "Requires UTR Check" : "Queue Clear"}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 text-[#0067A1] shrink-0 relative">
              <CreditCard className="w-4 h-4" />
              {verificationQueueOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0067A1] text-white text-[9px] font-semibold flex items-center justify-center">
                  {verificationQueueOrders.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat 3: Active Orders */}
        <div
          onClick={() => setActiveTab("active")}
          className={`p-4 sm:p-5 rounded-xl border bg-white transition-all cursor-pointer shadow-xs ${
            activeTab === "active"
              ? "border-[#0067A1] ring-1 ring-[#0067A1]/20"
              : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Active Fulfillment</p>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">{activeProcessingOrders.length}</p>
              <p className="text-xs text-indigo-600 font-medium mt-1">Packing & Dispatch</p>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Stat 4: Revenue */}
        <div
          onClick={() => setActiveTab("all")}
          className={`p-4 sm:p-5 rounded-xl border bg-white transition-all cursor-pointer shadow-xs ${
            activeTab === "all"
              ? "border-[#0067A1] ring-1 ring-[#0067A1]/20"
              : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Completed Orders</p>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">₹{totalRevenue.toLocaleString("en-IN")}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">{completedOrders.length} Delivered</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex items-center gap-6 overflow-x-auto scrollbar-none" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("pool")}
            className={`flex items-center gap-2 py-3 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "pool"
                ? "border-[#0067A1] text-[#0067A1] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Bidding Pool</span>
            {broadcasts.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === "pool" ? "bg-[#0067A1]/10 text-[#0067A1]" : "bg-rose-50 text-rose-600"
              }`}>
                {broadcasts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("verification")}
            className={`flex items-center gap-2 py-3 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "verification"
                ? "border-[#0067A1] text-[#0067A1] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment Verification</span>
            {verificationQueueOrders.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0067A1] text-xs font-medium">
                {verificationQueueOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-2 py-3 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "active"
                ? "border-[#0067A1] text-[#0067A1] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Active Orders</span>
            {activeProcessingOrders.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                {activeProcessingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 py-3 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "all"
                ? "border-[#0067A1] text-[#0067A1] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>All Orders & History</span>
          </button>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE BROADCAST POOL (PATIENT REQUESTS)                             */}
      {/* ========================================================================= */}
      {activeTab === "pool" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Active Patient Medicine Requests</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review prescribed items, check stock, and submit price quotes with delivery SLA.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live polling</span>
            </div>
          </div>

          {broadcastsLoading && broadcasts.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <Loader2 className="w-6 h-6 text-[#0067A1] animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Checking for patient medicine requests in your area...</p>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-dashed border-slate-200 shadow-xs space-y-2">
              <Radio className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800">No Patient Requests in Pool</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When patients in your locality request medicines, they will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Header with Urgency Timer */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-xs font-medium border border-rose-100">
                          <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
                          <span>Live Request</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{b.seconds_remaining ? `${Math.floor(b.seconds_remaining / 60)}m ${b.seconds_remaining % 60}s` : "Open"}</span>
                        </span>
                      </div>

                      {/* Locality (DPDP Shielded) */}
                      <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-100 mb-3 space-y-1">
                        <p className="text-[11px] font-medium text-slate-500">Delivery Zone</p>
                        <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{b.delivery_address || "Local Delivery Area"}</span>
                        </p>
                      </div>

                      {/* Prescribed Items List */}
                      <div className="space-y-1.5 mb-4">
                        <p className="text-[11px] font-medium text-slate-500">
                          Prescribed Medicines ({parsedMeds.length || 1})
                        </p>
                        <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                          {parsedMeds.length > 0 ? (
                            parsedMeds.map((med, idx) => (
                              <div key={idx} className="p-2 text-xs flex items-center justify-between bg-white">
                                <span className="font-medium text-slate-800 truncate max-w-[160px]">
                                  {typeof med === "string" ? med : med.name}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
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
                          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                            <span className="text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Quote Submitted: ₹{b.quote_amount}</span>
                            </span>
                            <span className="text-[11px] text-emerald-600 block mt-0.5">
                              ETA: {b.delivery_time_minutes || 30} mins &bull; Awaiting Patient Selection
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenQuoteModal(b)}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              Edit Offer
                            </button>
                            <button
                              type="button"
                              disabled={withdrawingQuoteId === b.id}
                              onClick={() => setWithdrawConfirmItem(b)}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium rounded-lg text-xs transition-colors cursor-pointer"
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
                          className="w-full py-2.5 bg-[#0067A1] hover:bg-[#005485] text-white rounded-lg text-xs font-medium transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
            <h2 className="text-sm font-semibold text-slate-900">Payment Verification Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify UTR numbers and receipt uploads against your bank statement before approving fulfillment.
            </p>
          </div>

          {verificationQueueOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-dashed border-slate-200 shadow-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800">Verification Queue is Clear</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No orders currently waiting for payment verification. New submissions will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {verificationQueueOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-sm text-slate-900">
                          #{order.unid || order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {order.patient_name || "Patient"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[#0067A1]">
                        ₹{order.total_amount}
                      </span>
                    </div>

                    {/* UTR Box */}
                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-1">
                      <p className="text-[11px] font-medium text-blue-700">
                        Patient Submitted UTR / Ref No.
                      </p>
                      <p className="text-xs font-mono font-semibold text-blue-900 select-all">
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
                        className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100 group cursor-pointer"
                      >
                        <img
                          src={order.payment_proof_url}
                          alt="Payment Receipt"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5">
                          <Eye className="w-4 h-4" />
                          <span>Inspect Full Screenshot</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No screenshot image attached
                      </div>
                    )}
                  </div>

                  {/* Verification Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectModalOrder(order)}
                      className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Reject Proof
                    </button>
                    <button
                      type="button"
                      disabled={verifyingPayment}
                      onClick={() => handleApprovePayment(order.id)}
                      className="flex-[1.5] py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-300"
                    >
                      <Check className="w-3.5 h-3.5" />
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search order ID, patient name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Confirmed</option>
                <option value="packing">Packing</option>
                <option value="ready_for_dispatch">Ready for Dispatch</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          {/* Semantic Responsive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Patient & Delivery Area</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4 text-right">Fulfillment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loadingOrders && orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 text-[#0067A1] animate-spin mx-auto mb-2" />
                      <p className="text-xs">Loading orders...</p>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 space-y-1">
                      <ClipboardList className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-xs font-medium text-slate-600">No orders match this filter</p>
                    </td>
                  </tr>
                ) : (
                  orders
                    .filter((o) => {
                      if (activeTab === "active") {
                        return ["approved", "packing", "ready_for_dispatch", "out_for_delivery"].includes(o.status);
                      }
                      return true;
                    })
                    .map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Order ID */}
                        <td className="py-3.5 px-4 align-middle">
                          <p className="font-semibold text-slate-900">
                            #{order.unid || order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </p>
                        </td>

                        {/* Patient & Address */}
                        <td className="py-3.5 px-4 align-middle">
                          <p className="font-medium text-slate-800">
                            {order.patient_name || "Patient"}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            {order.display_delivery_address || order.raw_patient_address || "Shielded locality"}
                          </p>
                        </td>

                        {/* Items */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="font-medium text-slate-700 flex items-center gap-1.5">
                            <Pill className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>{order.medicine_order_items?.length || 1} items</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 align-middle">
                          <StatusBadge status={order.status} />
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 align-middle font-semibold text-slate-900">
                          ₹{order.total_amount || 0}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-2">
                            {order.status === "approved" && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceOrderStatus(order, "packing")}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                Start Packing
                              </button>
                            )}
                            {order.status === "packing" && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceOrderStatus(order, "ready_for_dispatch")}
                                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                Ready to Dispatch
                              </button>
                            )}
                            {order.status === "ready_for_dispatch" && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceOrderStatus(order, "out_for_delivery")}
                                className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                Out for Delivery
                              </button>
                            )}
                            {order.status === "out_for_delivery" && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceOrderStatus(order, "delivered")}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                              >
                                Mark Delivered
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => router.push(`/chemist/orders/${order.id}`)}
                              className="p-1.5 text-slate-400 hover:text-[#0067A1] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="View Full Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} orders)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => fetchOrders(pagination.currentPage - 1)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!pagination.hasNextPage}
                  onClick={() => fetchOrders(pagination.currentPage + 1)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DETAILED QUOTATION CREATOR MODAL                                */}
      {/* ========================================================================= */}
      {quoteModalBroadcast && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-xl sm:rounded-2xl border-0 sm:border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center shrink-0">
                  <Pill className="w-5 h-5 -rotate-45" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Submit Pharmacy Quotation</h3>
                  <p className="text-xs text-slate-500">Provide item-wise prices and delivery turnaround SLA.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuoteModalBroadcast(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Medicines Pricing List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Item Availability & Price</p>
                  <span className="text-[11px] text-slate-400">{quoteMeds.length} items</span>
                </div>
                <div className="space-y-2">
                  {quoteMeds.map((med, idx) => (
                    <div key={idx} className="p-3 sm:p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3 text-xs transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{med.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200/60 text-[10px] font-semibold text-slate-700">
                            Qty: {med.quantity}
                          </span>
                          {med.dosage && (
                            <span className="text-[11px] text-slate-500 truncate">• {med.dosage}</span>
                          )}
                        </div>
                      </div>

                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={med.price ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setQuoteMeds((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, price: raw === "" ? "" : (parseFloat(raw) || 0) } : item))
                            );
                          }}
                          className="w-full pl-6 pr-2.5 py-1.5 text-xs sm:text-sm font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charges and ETA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/70">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Delivery Fee (₹)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={quoteDeliveryFee ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setQuoteDeliveryFee(raw === "" ? "" : (parseFloat(raw) || 0));
                      }}
                      className="w-full pl-6 pr-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                    />
                  </div>
                </div>

                <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/70">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Discount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={quoteDiscount ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setQuoteDiscount(raw === "" ? "" : (parseFloat(raw) || 0));
                      }}
                      className="w-full pl-6 pr-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                    />
                  </div>
                </div>

                <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/70">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Delivery ETA (Mins)</label>
                  <input
                    type="number"
                    min="5"
                    value={quoteEta}
                    onChange={(e) => setQuoteEta(parseInt(e.target.value, 10) || 25)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                  />
                </div>
              </div>

              {/* Total Net Calculation */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-sky-50/80 via-slate-50/70 to-blue-50/80 rounded-xl border border-sky-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Total Net Amount to Patient:</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Subtotal: ₹{subtotal.toFixed(2)} + Delivery: ₹{sanitizeNumber(quoteDeliveryFee, 0).toFixed(2)} - Discount: ₹{sanitizeNumber(quoteDiscount, 0).toFixed(2)}
                  </span>
                </div>
                <span className="text-base sm:text-lg font-extrabold text-[#0067A1]">
                  ₹{netAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons Sticky Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuoteModalBroadcast(null)}
                className="flex-1 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingQuote || netAmount <= 0}
                onClick={handleSubmitDetailedQuote}
                className="flex-[1.5] py-2.5 bg-[#0067A1] hover:bg-[#005485] text-white font-semibold rounded-lg text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {submittingQuote ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Quotation...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Quote (₹{netAmount.toFixed(2)})</span>
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  Payment Proof &bull; Order #{proofModalOrder.unid || proofModalOrder.id.slice(0, 8).toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Amount: <strong className="text-slate-800 font-semibold">₹{proofModalOrder.total_amount}</strong> &bull; UTR: <strong className="text-[#0067A1] font-mono">{proofModalOrder.utr_number}</strong>
                </p>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
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
                alt="Payment Proof"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                className="max-h-[60vh] object-contain transition-transform duration-150 rounded-lg"
              />
            </div>

            {/* Decision Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setRejectModalOrder(proofModalOrder)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                Reject Proof
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProofModalOrder(null)}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={verifyingPayment}
                  onClick={() => handleApprovePayment(proofModalOrder.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:bg-slate-300"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Verify Payment & Release</span>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Reject Payment Proof</h3>
              <button type="button" onClick={() => setRejectModalOrder(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
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
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
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
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                />
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectingPayment}
                onClick={handleRejectPayment}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs transition-colors shadow-xs cursor-pointer disabled:bg-slate-300"
              >
                {rejectingPayment ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM POPUP CONFIRM: WITHDRAW QUOTATION MODAL                             */}
      {/* ========================================================================= */}
      {withdrawConfirmItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-slate-900">Withdraw Quotation?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to withdraw your quotation of{" "}
                <span className="font-semibold text-slate-800">
                  ₹{withdrawConfirmItem.quote_amount || withdrawConfirmItem.submitted_quote?.final_amount || "0"}
                </span>{" "}
                for this order? This will remove your offer from the patient&apos;s active bidding pool.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setWithdrawConfirmItem(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={withdrawingQuoteId === withdrawConfirmItem.id}
                onClick={async () => {
                  const bId = withdrawConfirmItem.id;
                  const qId = withdrawConfirmItem.quote_id;
                  setWithdrawConfirmItem(null);
                  await handleWithdrawQuote(bId, qId);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:bg-rose-300"
              >
                {withdrawingQuoteId === withdrawConfirmItem.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Withdrawing...</span>
                  </>
                ) : (
                  <span>Yes, Withdraw</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}