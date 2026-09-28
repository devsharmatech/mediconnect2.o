"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Pill,
  Clock,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Eye,
  Filter,
  Download,
  Truck,
  FileText,
  AlertCircle,
  Calendar,
  Activity,
  Package,
  IndianRupee,
  Zap,
  Radio,
  Send,
  Timer,
  ChevronRight,
  ShieldCheck,
  Check,
  MapPin,
  Flame,
  ArrowUpRight,
  User,
  Heart,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { getLoggedInUser } from "@/lib/authHelpers";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Countdown Hook for Live Broadcast Cards ──────────────────────
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

// ─── Live Broadcast Quick-Quote Card ──────────────────────────────
function BroadcastQuickCard({ broadcast, chemistId, onQuoteSubmitted }) {
  const [cost, setCost] = useState("350");
  const [eta, setEta] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const seconds = useCountdown(broadcast.expires_at);

  const urgency = seconds < 60 ? "critical" : seconds < 180 ? "warn" : "ok";
  const urgencyConfig = {
    ok: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
    warn: { badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-500" },
    critical: { badge: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse", bar: "bg-rose-500" },
  }[urgency];

  // Instant 1-Click Accept from Order Pool (No long waiting!)
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

      const result = await res.json();
      if (result.success) {
        toast.success("Order Claimed & Accepted! Moved to your active orders 🎉");
        if (onQuoteSubmitted) onQuoteSubmitted();
      } else {
        toast.error(result.message || "Failed to accept order");
      }
    } catch (err) {
      toast.error("Error accepting order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  const timeFormatted = `${minutes}:${remSec.toString().padStart(2, "0")}`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[5px] border border-blue-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${urgencyConfig.bar}`} />

      <div>
        {/* Header & Countdown */}
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs font-bold bg-[#0067A1]/10 text-[#0067A1] dark:bg-blue-900/30 dark:text-blue-300">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#0067A1]" />
            Live Prescription Pool
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[5px] text-xs font-bold border ${urgencyConfig.badge}`}
          >
            <Timer className="w-3.5 h-3.5" />
            {seconds > 0 ? timeFormatted : "Expired"}
          </span>
        </div>

        {/* Patient Area */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {broadcast.delivery_area || broadcast.delivery_address || "Nearby Patient"}
            </span>
          </div>
        </div>

        {/* Medicines List */}
        <div className="space-y-1.5 mb-4">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Prescribed Medicines ({broadcast.medicines?.length || 0})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {broadcast.medicines && broadcast.medicines.length > 0 ? (
              broadcast.medicines.slice(0, 4).map((med, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[5px] bg-slate-50 dark:bg-gray-700/60 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-gray-600"
                >
                  <Pill className="w-3 h-3 text-[#0067A1]" />
                  {med.name || med.medicine_name || `Medicine #${idx + 1}`}
                  {med.dosage && <span className="text-[10px] text-gray-500">({med.dosage})</span>}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 italic">Prescription attached by patient</span>
            )}
            {broadcast.medicines && broadcast.medicines.length > 4 && (
              <span className="text-xs text-gray-500 font-medium self-center">
                +{broadcast.medicines.length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Instant Action Section */}
      {broadcast.already_quoted ? (
        <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-[5px] border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold">Order Claimed</span>
          </div>
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
            ₹{broadcast.submitted_quote?.estimated_cost || "Confirmed"}
          </span>
        </div>
      ) : seconds <= 0 ? (
        <div className="mt-3 p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-[5px] text-center text-xs text-gray-500 font-medium">
          Inquiry window expired
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
          {/* 1-Click Instant Accept Button (NO WAITING IN POOL) */}
          <button
            type="button"
            onClick={() => handleInstantAccept(cost, eta)}
            disabled={submitting}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-[5px] shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                ⚡ Instant Accept Order (₹{cost || 350})
              </>
            )}
          </button>

          {/* Optional Price & ETA Controls */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">
                Set Price (₹)
              </label>
              <div className="relative">
                <IndianRupee className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  placeholder="350"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full pl-6 pr-2 py-1 text-xs font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-[5px] focus:outline-none focus:border-[#0067A1]"
                  min="1"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">
                Delivery (Mins)
              </label>
              <div className="relative">
                <Clock className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  placeholder="30"
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  className="w-full pl-6 pr-2 py-1 text-xs font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-[5px] focus:outline-none focus:border-[#0067A1]"
                  min="5"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChemistDashboard() {
  const router = useRouter();
  const [chemist, setChemist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [chartType, setChartType] = useState("area");
  const [broadcasts, setBroadcasts] = useState([]);

  // Time & Greeting
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const formatTime12h = (timeStr) => {
    if (!timeStr) return "—";
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // 1. Initial Load of Logged-in Chemist
  useEffect(() => {
    const user = getLoggedInUser("chemist");
    if (!user?.id) {
      toast.error("Chemist session not found. Please log in.");
      router.replace("/chemist/login");
      return;
    }
    setChemist(user);
  }, [router]);

  // 2. Fetch Dashboard & Broadcast Data
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    const user = getLoggedInUser("chemist");
    if (!user?.id) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [dashRes, broadRes] = await Promise.all([
        fetch("/api/chemists/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chemist_id: user.id, time_range: timeRange }),
        }),
        fetch("/api/chemists/order/get-broadcasts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chemist_id: user.id }),
        }),
      ]);

      const dashData = await dashRes.json();
      const broadData = await broadRes.json();

      if (dashData.success) {
        setDashboard(dashData.data);
      } else {
        toast.error(dashData.message || "Failed to load dashboard data");
      }

      if (broadData.success) {
        setBroadcasts(broadData.data || []);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
      toast.error("Network error loading dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (chemist?.id) {
      fetchDashboardData();
      // Poll active broadcasts every 8 seconds
      const interval = setInterval(() => {
        fetch("/api/chemists/order/get-broadcasts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chemist_id: chemist.id }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.success) setBroadcasts(d.data || []);
          })
          .catch(() => {});
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [chemist?.id, fetchDashboardData]);

  // Quick action tiles matching patient dashboard style
  const quickActions = [
    {
      label: "Medicine Orders",
      sub: "Manage & dispatch",
      href: "/chemist/orders",
      icon: ClipboardList,
      gradient: "from-[#0067A1] to-[#0080C6]",
      bg: "bg-teal-50 dark:bg-teal-900/30",
      text: "text-[#0067A1] dark:text-teal-300",
    },
    {
      label: "Prescription Radar",
      sub: "Live bidding",
      onClick: () => {
        const el = document.getElementById("broadcast-radar-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
        else router.push("/chemist/orders");
      },
      icon: Radio,
      gradient: "from-rose-500 to-pink-600",
      bg: "bg-rose-50 dark:bg-rose-900/30",
      text: "text-rose-600 dark:text-rose-300",
      pulse: broadcasts.length > 0,
    },
    {
      label: "Patient Mode",
      sub: "Consult doctors",
      href: "/dashboard",
      icon: Heart,
      gradient: "from-pink-500 to-rose-600",
      bg: "bg-pink-50 dark:bg-pink-900/30",
      text: "text-pink-600 dark:text-pink-300",
    },
    {
      label: "Medicine Inventory",
      sub: "Stock & catalog",
      href: "/chemist/orders",
      icon: Pill,
      gradient: "from-amber-500 to-orange-600",
      bg: "bg-amber-50 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Delivery Status",
      sub: "Rider dispatch",
      href: "/chemist/orders",
      icon: Truck,
      gradient: "from-indigo-500 to-blue-600",
      bg: "bg-indigo-50 dark:bg-indigo-900/30",
      text: "text-indigo-600 dark:text-indigo-300",
    },
    {
      label: "Chemist Profile",
      sub: "KYC & licenses",
      href: "/chemist/profile",
      icon: ShieldCheck,
      gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
    },
  ];

  if (loading && !dashboard) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
          Loading Chemist Workspace...
        </p>
      </div>
    );
  }

  const chemistInfo = dashboard?.chemist || {};
  const stats = dashboard?.stats || {
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
    revenue_30_days: 0,
    revenue_change: 0,
  };
  const recentOrders = dashboard?.recent_orders || [];
  const dailyRevenue = dashboard?.daily_revenue || [];

  return (
    <div className="w-full space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* ─── Hero / Greeting Header (Matching Patient Panel) ─── */}
      <div className="relative overflow-hidden bg-[#0067A1] rounded-[5px] px-4 sm:px-6 pt-6 pb-10 sm:pb-12 shadow-md">
        <div className="relative max-w-full mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-xs sm:text-sm font-medium tracking-wide">
                  {greeting}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-white/20 text-white text-[11px] font-semibold">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Verified Pharmacy
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {chemistInfo?.pharmacy_name || "Apex MediConnect Pharmacy"} 👋
              </h1>
              <p className="text-white/80 text-xs sm:text-sm mt-1">
                {chemistInfo?.address || "Health Square, Sector 62, Noida"} • GST:{" "}
                {chemistInfo?.gstin || "07AAAAA9999A1Z5"}
              </p>
            </div>

            {/* Hero Quick Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-[5px] text-white hover:bg-white/25 transition-all text-xs font-bold"
                title="Refresh latest stats"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>

              <Link
                href="/chemist/orders"
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#0067A1] hover:bg-gray-50 rounded-[5px] text-xs font-bold shadow transition-all"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Orders ({stats.total_orders})</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Engagement CTA Banner (When Broadcasts are Active) ─── */}
      {broadcasts.length > 0 && (
        <section>
          <div className="p-4 sm:p-5 rounded-[5px] bg-gradient-to-r from-blue-700 via-[#0067A1] to-teal-700 text-white shadow-md relative overflow-hidden border border-white/20">
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[5px] bg-white/20 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    Action Required: {broadcasts.length} Prescription Request{broadcasts.length > 1 ? "s" : ""} Live
                  </h2>
                  <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                    Patients nearby are requesting medicine price quotes. Submit quotes before the timer expires!
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById("broadcast-radar-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-5 py-2.5 bg-white text-gray-900 rounded-[5px] font-bold text-xs hover:bg-gray-100 transition-colors shrink-0 shadow self-start sm:self-auto"
              >
                Review & Quote Now
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Quick Actions (Matching Patient Panel) ─── */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => {
            const Wrapper = action.href ? Link : "button";
            const wrapperProps = action.href ? { href: action.href } : { type: "button", onClick: action.onClick };
            return (
              <Wrapper
                key={action.label}
                {...wrapperProps}
                className="group relative bg-white dark:bg-gray-800 rounded-[5px] border border-gray-100 dark:border-gray-700 p-4 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-300 text-left overflow-hidden cursor-pointer"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-t-[5px]`}
                />
                <div
                  className={`w-11 h-11 ${action.bg} rounded-[5px] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                >
                  <action.icon className={`w-5 h-5 ${action.text}`} />
                  {action.pulse && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{action.label}</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{action.sub}</p>
              </Wrapper>
            );
          })}
        </div>
      </section>

      {/* ─── Key Metrics / Stat Cards (Matching Patient Panel) ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Performance Overview</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Period:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[5px] px-2.5 py-1 text-gray-700 dark:text-gray-200 focus:outline-none"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-[5px] border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.total_orders}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-[5px] bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-[#0067A1] dark:text-blue-300" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>Fulfillment rate</span>
              <span className="font-semibold text-emerald-600">
                {stats.total_orders > 0
                  ? `${Math.round((stats.completed_orders / stats.total_orders) * 100)}%`
                  : "100%"}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0067A1] rounded-full transition-all duration-500"
                style={{
                  width: `${
                    stats.total_orders > 0
                      ? Math.min(100, (stats.completed_orders / stats.total_orders) * 100)
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Pending Action */}
          <div className="bg-white dark:bg-gray-800 rounded-[5px] border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Requires Action</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {stats.pending_orders}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-[5px] bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>Status</span>
              <span className="font-semibold text-amber-600">
                {stats.pending_orders > 0 ? "Dispatch pending" : "All clear"}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    stats.total_orders > 0
                      ? Math.min(100, (stats.pending_orders / stats.total_orders) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Completed Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-[5px] border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Delivered</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.completed_orders}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-[5px] bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>Delivered successfully</span>
              <span className="font-semibold text-emerald-600">
                {stats.completed_orders} orders
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white dark:bg-gray-800 rounded-[5px] border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {formatCurrency(stats.revenue_30_days)}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-[5px] bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-purple-600 dark:text-purple-300" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" /> +14.5%
              </span>
              <span>vs previous period</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: "85%" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Live Prescription Broadcast Radar Section ─── */}
      <section id="broadcast-radar-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Live Prescription Radar
            </h2>
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-[#0067A1] dark:text-blue-300 rounded-[5px] font-bold">
              {broadcasts.length} Active
            </span>
          </div>
          <Link
            href="/chemist/orders"
            className="text-xs text-[#0067A1] dark:text-[#0080C6] hover:underline font-bold flex items-center gap-1"
          >
            <span>All Broadcasts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {broadcasts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {broadcasts.map((broadcast) => (
              <BroadcastQuickCard
                key={broadcast.id}
                broadcast={broadcast}
                chemistId={chemist?.id}
                onQuoteSubmitted={() => fetchDashboardData(true)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-[5px] border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center shadow-sm">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-[#0067A1] rounded-full flex items-center justify-center mx-auto mb-3">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
              Radar Active — Listening for Nearby Prescriptions
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
              When a verified patient in your delivery vicinity broadcasts a prescription request, it will appear here immediately for instant quoting.
            </p>
          </div>
        )}
      </section>

      {/* ─── Recent Orders & Dispensing Table ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Recent Orders & Dispensing
          </h2>
          <Link
            href="/chemist/orders"
            className="text-xs text-[#0067A1] dark:text-[#0080C6] hover:underline font-bold flex items-center gap-1"
          >
            <span>View All ({stats.total_orders})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-[5px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750/50 border-b border-gray-100 dark:border-gray-700 text-gray-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentOrders.map((order) => {
                    const st = order.status || "pending";
                    const isCompleted = ["completed", "delivered", "fulfilment_released"].includes(st);
                    const isVerified = ["payment_verified", "ready_for_pickup"].includes(st);

                    const statusBadgeClass = isCompleted
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                      : isVerified
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200";

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-[#0067A1] dark:text-blue-400">
                          {order.unid || `RX-${order.id.slice(0, 6).toUpperCase()}`}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-800 dark:text-gray-200">
                            {order.patient_name || "Verified Patient"}
                          </p>
                          <p className="text-[11px] text-gray-400">{order.patient_phone || "Protected"}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          <span className="font-semibold">{order.items_count || 1}</span> medicine item
                          {(order.items_count || 1) > 1 ? "s" : ""}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })
                            : "Today"}{" "}
                          • {formatTime12h(order.created_at)}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[11px] font-bold border ${statusBadgeClass}`}
                          >
                            {st.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href="/chemist/orders"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0067A1]/10 hover:bg-[#0067A1]/20 text-[#0067A1] rounded-[5px] font-bold text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Manage
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 text-xs">
              No orders found for this period. Active orders will appear here.
            </div>
          )}
        </div>
      </section>

      {/* ─── Revenue & Performance Trends ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-[5px] border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0067A1]" />
                Dispensing Revenue Trend
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Daily medicine order settlements ({timeRange})
              </p>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-[5px] self-start sm:self-auto">
              <button
                onClick={() => setChartType("area")}
                className={`px-2.5 py-1 text-xs font-bold rounded-[5px] transition-colors ${
                  chartType === "area"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setChartType("bar")}
                className={`px-2.5 py-1 text-xs font-bold rounded-[5px] transition-colors ${
                  chartType === "bar"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Bar
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={dailyRevenue}>
                  <defs>
                    <linearGradient id="chemRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0067A1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0067A1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    formatter={(v) => [`₹${v}`, "Revenue"]}
                    contentStyle={{
                      borderRadius: "5px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#0067A1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#chemRevGrad)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    formatter={(v) => [`₹${v}`, "Revenue"]}
                    contentStyle={{
                      borderRadius: "5px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  />
                  <Bar dataKey="amount" fill="#0067A1" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pharmacy Quick Status & Rating Card */}
        <div className="bg-white dark:bg-gray-800 rounded-[5px] border border-gray-100 dark:border-gray-700 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">
              Pharmacy Compliance & Rating
            </h2>
            <div className="p-4 bg-teal-50/60 dark:bg-teal-950/20 rounded-[5px] border border-teal-100 dark:border-teal-900/30 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Rating</span>
                <span className="text-base font-extrabold text-[#0067A1] flex items-center gap-1">
                  ★ {chemistInfo?.rating || "4.9"}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Based on {chemistInfo?.total_reviews || 36} verified patient dispensing reviews
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Drug License No:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {chemistInfo?.drug_license_no || "DL-UP-2026-99991"}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">DPDP Verification:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <ShieldCheck className="w-3.5 h-3.5" /> Compliant
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Store Timings:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">08:00 AM – 11:00 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Digital Consent:</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Link
              href="/chemist/orders"
              className="w-full py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-bold rounded-[5px] shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Truck className="w-3.5 h-3.5" />
              Manage All Deliveries
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}