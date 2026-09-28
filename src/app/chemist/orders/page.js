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
} from "lucide-react";
import { getLoggedInUser } from "@/lib/authHelpers";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

// ─── Countdown Hook ─────────────────────────────────────────────
function useCountdown(expiresAt) {
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt) - new Date()) / 1000))
  );
  const initialSeconds = useState(() =>
    Math.max(1, Math.floor((new Date(expiresAt) - new Date()) / 1000))
  )[0];

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 0) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return seconds;
}

// ─── Broadcast Card Component ─────────────────────────────────────
function BroadcastCard({ broadcast, chemistId, onQuoteSubmitted }) {
  const [cost, setCost] = useState("");
  const [eta, setEta] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const seconds = useCountdown(broadcast.expires_at);
  // Approximate total window from seconds_remaining at mount
  const totalSeconds = useRef(
    Math.max(1, Math.floor((new Date(broadcast.expires_at) - new Date()) / 1000) + 1)
  ).current;
  const pct = Math.max(0, Math.min(100, (seconds / totalSeconds) * 100));

  const urgency = seconds < 30 ? "critical" : seconds < 60 ? "warn" : "ok";

  const urgencyColor = {
    ok: { ring: "border-emerald-400", bar: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    warn: { ring: "border-amber-400", bar: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
    critical: { ring: "border-red-400 animate-pulse", bar: "bg-red-500", text: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  }[urgency];

  const handleInstantAccept = async (orderCost, deliveryMins) => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/chemists/order/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broadcast_id: broadcast.id,
          chemist_id: chemistId,
          estimated_cost: parseFloat(orderCost || cost || 350),
          delivery_time_minutes: parseInt(deliveryMins || eta || 30, 10),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Order Claimed & Accepted! Moved to your active orders 🎉");
        onQuoteSubmitted();
      } else {
        toast.error(data.message || "Failed to accept order");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    await handleInstantAccept(cost, eta);
  };

  if (seconds === 0 && !broadcast.already_quoted) return null;

  return (
    <div
      className={`relative bg-white dark:bg-gray-900 rounded-2xl border-2 ${urgencyColor.ring} overflow-hidden transition-all duration-300 shadow-lg hover:shadow-xl`}
    >
      {/* Progress Bar */}
      <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full transition-all duration-1000 ${urgencyColor.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Live badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
        LIVE POOL
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#0067A1]/10 dark:bg-[#003358]/40 flex items-center justify-center">
                <Radio className="w-5 h-5 text-[#0067A1]" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{broadcast.patient_name || "Patient"}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span className="truncate max-w-[180px]">{broadcast.delivery_address}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Countdown */}
          <div className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl ${urgencyColor.bg}`}>
            <Timer className={`w-4 h-4 ${urgencyColor.text} mb-0.5`} />
            <span className={`text-lg font-bold tabular-nums ${urgencyColor.text}`}>
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Medicines List */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Prescribed Medicines</p>
          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
            {(broadcast.medicines || []).map((med, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                    {med.name} {med.strength ? `(${med.strength})` : ""}
                  </span>
                </div>
                <span className="text-gray-500 dark:text-gray-400 font-semibold ml-2 flex-shrink-0">×{med.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Section */}
        {broadcast.already_quoted ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <BadgeCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Order Claimed & Accepted</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-500">
                ₹{broadcast.submitted_quote?.estimated_cost || "Confirmed"} &bull; Moved to active orders
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1-Click Instant Accept & Claim Button */}
            <button
              onClick={() => handleInstantAccept(cost || "350", eta || "30")}
              disabled={submitting || seconds === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl text-sm font-bold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Claiming Order...</>
              ) : seconds === 0 ? (
                <><XCircle className="w-4 h-4" />Window Closed</>
              ) : (
                <><Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />⚡ Accept & Claim Order (₹{cost || "350"})</>
              )}
            </button>

            {/* Price & ETA Customization */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Custom Cost (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 350"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0067A1] focus:border-transparent outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  ETA (Mins)
                </label>
                <div className="relative">
                  <Timer className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="number"
                    min="5"
                    placeholder="e.g. 30"
                    value={eta}
                    onChange={(e) => setEta(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0067A1] focus:border-transparent outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status Config ──────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { color: "amber", icon: Clock, label: "Pending", next: ["approved", "rejected"] },
  sent_to_chemist: { color: "blue", icon: Package, label: "Sent to Chemist", next: ["approved", "partially_approved", "rejected"] },
  approved: { color: "green", icon: CheckCircle2, label: "Approved", next: ["packing", "rejected"] },
  partially_approved: { color: "purple", icon: AlertCircle, label: "Partial Approval", next: ["packing", "rejected"] },
  packing: { color: "indigo", icon: PackageCheck, label: "Packing", next: ["ready_for_dispatch"] },
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
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <span className="text-xs text-gray-500">{status}</span>;
  const colors = COLOR_MAP[cfg.color];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

// ─── Order Status Updater ─────────────────────────────────────────
function StatusUpdater({ order, onUpdated }) {
  const cfg = STATUS_CONFIG[order.status];
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const nextStatuses = cfg?.next || [];
  if (nextStatuses.length === 0) return null;

  const handleUpdate = async (newStatus) => {
    try {
      setUpdating(true);
      setOpen(false);
      const res = await fetch("/api/chemists/order/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order moved to: ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        onUpdated();
      } else {
        toast.error(data.message || "Failed to update");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={updating}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1]/10 hover:bg-[#0067A1]/20 text-[#0067A1] dark:text-[#0080C6] rounded-lg text-xs font-semibold transition-all"
      >
        {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
        Update Status
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 min-w-[180px] overflow-hidden">
          {nextStatuses.map((s) => {
            const c = STATUS_CONFIG[s];
            const colors = COLOR_MAP[c.color];
            const Icon = c.icon;
            return (
              <button
                key={s}
                onClick={() => handleUpdate(s)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <Icon className={`w-4 h-4 ${colors.text}`} />
                <span className="text-gray-700 dark:text-gray-300">{c.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function OrdersPage() {
  const [chemist, setChemist] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [broadcasts, setBroadcasts] = useState([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0,
    hasNextPage: false, hasPrevPage: false,
  });
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, revenue: 0 });
  const broadcastIntervalRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const u = getLoggedInUser("chemist");
    if (u) setChemist(u);
  }, []);

  // ── Broadcasts polling ─────────────────────────────────────────
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
      if (result.success) setBroadcasts(result.data || []);
    } catch {}
    if (!silent) setBroadcastsLoading(false);
  }, [chemist]);

  useEffect(() => {
    if (!chemist?.id) return;
    fetchBroadcasts();
    broadcastIntervalRef.current = setInterval(() => fetchBroadcasts(true), 5000);
    return () => clearInterval(broadcastIntervalRef.current);
  }, [chemist, fetchBroadcasts]);

  // ── Orders ─────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (page = 1) => {
    if (!chemist?.id) return;
    setLoading(true);
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
        setOrders(data);
        setPagination(pg);
        // Stats from data
        const total = pg.totalItems;
        const pending = data.filter((o) => ["pending", "sent_to_chemist"].includes(o.status)).length;
        const active = data.filter((o) => ["approved", "packing", "ready_for_dispatch", "out_for_delivery"].includes(o.status)).length;
        const revenue = data.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total_amount || 0), 0);
        setStats({ total, pending, active, revenue });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [chemist, pagination.pageSize, search, statusFilter]);

  useEffect(() => {
    if (chemist?.id) fetchOrders(1);
  }, [chemist]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (chemist?.id) fetchOrders(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const formatTime = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const goToPage = (page) => {
    setPagination((p) => ({ ...p, currentPage: page }));
    fetchOrders(page);
  };

  const liveCount = broadcasts.filter((b) => !b.already_quoted).length;

  return (
    <div className="min-h-screen dark:bg-gray-950">
      <Toaster position="top-right" toastOptions={{ className: "!font-medium !text-sm" }} />

      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 bg-[#0067A1] rounded-xl flex items-center justify-center shadow-lg">
              <ClipboardList className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Medicine Orders</h1>
              <p className="text-sm text-[#0067A1] dark:text-[#0080C6]">Manage patient medication requests</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOrders(pagination.currentPage)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all text-sm font-medium shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Orders", value: pagination.totalItems, sub: "All time", icon: ClipboardList, color: "blue" },
          { label: "Pending Action", value: stats.pending, sub: "Needs attention", icon: Flame, color: "amber" },
          { label: "Active Orders", value: stats.active, sub: "In progress", icon: Activity, color: "indigo" },
          { label: "Revenue (Page)", value: `₹${stats.revenue.toLocaleString()}`, sub: "Completed orders", icon: IndianRupee, color: "emerald" },
        ].map((s) => {
          const colors = COLOR_MAP[s.color];
          return (
            <div key={s.label} className={`p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                  <s.icon className={`w-5 h-5 ${colors.text}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Live Broadcast Panel ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-md">
                <Radio className="w-5 h-5 text-white" />
              </div>
              {liveCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {liveCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-base">Live Patient Requests</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {liveCount > 0 ? `${liveCount} new request${liveCount > 1 ? "s" : ""} — respond before timer expires` : "No active requests right now"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Auto-refreshing every 5s
          </div>
        </div>

        {broadcastsLoading && broadcasts.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
            <Loader2 className="w-8 h-8 text-[#0067A1] animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Listening for patient requests...</p>
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
            <Radio className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400 text-sm">No active broadcasts</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Incoming patient requests will appear here in real time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            {broadcasts.map((b) => (
              <BroadcastCard
                key={b.id}
                broadcast={b}
                chemistId={chemist?.id}
                onQuoteSubmitted={fetchBroadcasts}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Orders Section ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, patient name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#0067A1] outline-none text-gray-800 dark:text-gray-200 appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-800/50 grid grid-cols-[1.5fr_1.5fr_1fr_1.5fr_1fr_auto] gap-4 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
          <span>Order</span>
          <span>Patient</span>
          <span>Items</span>
          <span>Status</span>
          <span>Amount</span>
          <span>Actions</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-[#0067A1] animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading orders...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && orders.length === 0 && (
          <div className="py-20 flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="font-semibold text-gray-600 dark:text-gray-400">No orders found</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs text-center">
              {search || statusFilter !== "all" ? "Try changing your filters" : "Orders will appear here when patients place them"}
            </p>
          </div>
        )}

        {/* Orders List */}
        {!loading && orders.length > 0 && (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {orders.map((order) => (
              <div key={order.id} className="px-5 py-4 grid grid-cols-[1.5fr_1.5fr_1fr_1.5fr_1fr_auto] gap-4 items-center hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors group">
                {/* Order ID */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#0067A1]/10 dark:bg-[#003358]/40 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4.5 h-4.5 text-[#0067A1]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{order.unid || order.id?.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[10px] text-gray-400">{formatDate(order.created_at)} · {formatTime(order.created_at)}</p>
                  </div>
                </div>

                {/* Patient */}
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {order.patient?.full_name || order.patient?.patient_details?.full_name || "Unknown Patient"}
                  </p>
                  {order.patient?.phone_number && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{order.patient.phone_number}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {order.medicine_order_items?.length || 0} items
                  </span>
                </div>

                {/* Status */}
                <StatusBadge status={order.status} />

                {/* Amount */}
                <div>
                  {order.total_amount ? (
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(order.total_amount).toLocaleString()}
                    </p>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/chemist/orders/${order.id}`)}
                    className="p-2 rounded-lg bg-[#0067A1]/10 hover:bg-[#0067A1] text-[#0067A1] hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <StatusUpdater order={order} onUpdated={() => fetchOrders(pagination.currentPage)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-800 dark:text-white">{(pagination.currentPage - 1) * pagination.pageSize + 1}</span>–
              <span className="font-semibold text-gray-800 dark:text-white">{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)}</span> of{" "}
              <span className="font-semibold text-gray-800 dark:text-white">{pagination.totalItems}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => goToPage(1)} disabled={!pagination.hasPrevPage} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30 transition-colors"><ChevronsLeft className="w-4 h-4" /></button>
              <button onClick={() => goToPage(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === pagination.currentPage ? "bg-[#0067A1] text-white shadow-md" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button onClick={() => goToPage(pagination.currentPage + 1)} disabled={!pagination.hasNextPage} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
              <button onClick={() => goToPage(pagination.totalPages)} disabled={!pagination.hasNextPage} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30 transition-colors"><ChevronsRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}