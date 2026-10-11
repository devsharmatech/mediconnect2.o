"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ClipboardList,
  FlaskConical,
  Search,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Calendar,
  IndianRupee,
  RefreshCw,
  BadgeCheck,
  Activity,
  Home,
  Building2,
  User,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowRight,
  X,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  TestTube2,
} from "lucide-react";
import { getLoggedInUser } from "@/lib/authHelpers";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

// ─── Status Configurations & Colors ─────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: "Pending Review",
    color: "amber",
    icon: Clock,
    next: ["approved", "rejected"],
    nextActionLabel: "Approve",
    nextActionStatus: "approved",
  },
  sent_to_lab: {
    label: "Sent to Lab",
    color: "cyan",
    icon: Clock,
    next: ["approved", "rejected"],
    nextActionLabel: "Approve",
    nextActionStatus: "approved",
  },
  approved: {
    label: "Approved & Scheduled",
    color: "blue",
    icon: CheckCircle2,
    next: ["sample_collected", "rejected"],
    nextActionLabel: "Collect Sample",
    nextActionStatus: "sample_collected",
  },
  sample_collected: {
    label: "Sample Collected",
    color: "indigo",
    icon: TestTube2,
    next: ["processing"],
    nextActionLabel: "Process",
    nextActionStatus: "processing",
  },
  processing: {
    label: "In Diagnostic Analysis",
    color: "purple",
    icon: Activity,
    next: ["completed"],
    nextActionLabel: "Complete",
    nextActionStatus: "completed",
  },
  completed: {
    label: "Completed & Ready",
    color: "emerald",
    icon: BadgeCheck,
    next: [],
  },
  rejected: {
    label: "Rejected / Cancelled",
    color: "red",
    icon: XCircle,
    next: [],
  },
  cancelled: {
    label: "Cancelled",
    color: "gray",
    icon: XCircle,
    next: [],
  },
};

const COLOR_MAP = {
  amber: { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  blue: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  cyan: { bg: "bg-cyan-50 dark:bg-cyan-950/20", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-200 dark:border-cyan-800" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/20", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/20", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  red: { bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800" },
  gray: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700" },
};

function StatusBadge({ status }) {
  const normStatus = (status || "").toLowerCase();
  const cfg = STATUS_CONFIG[normStatus] || {
    label: (status || "Unknown").replace(/_/g, " ").toUpperCase(),
    color: "gray",
    icon: Clock,
  };
  const colors = COLOR_MAP[cfg.color] || COLOR_MAP.gray;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{cfg.label}</span>
    </span>
  );
}

export default function LabOrdersPage() {
  const router = useRouter();

  const [lab, setLab] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    rejected: 0,
    revenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState("all"); // "all" | "pending" | "in_progress" | "completed" | "rejected"
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Auth on mount
  useEffect(() => {
    const u = getLoggedInUser("lab");
    if (u) setLab(u);
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(
    async (page = 1, silent = false) => {
      if (!lab?.id) return;
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      try {
        const effectiveStatus =
          activeTab !== "all" ? activeTab : statusFilter !== "all" ? statusFilter : "all";

        const params = new URLSearchParams({
          lab_id: lab.id,
          page: String(page),
          limit: String(pagination.limit),
        });

        if (search.trim()) params.set("search", search.trim());
        if (effectiveStatus !== "all") params.set("status", effectiveStatus);

        const res = await fetch(`/api/lab/order/get?${params.toString()}`);
        const json = await res.json();

        if (json.status) {
          setOrders(json.orders || []);
          if (json.stats) setStats(json.stats);
          setPagination({
            currentPage: page,
            limit: pagination.limit,
            total: json.total || 0,
            totalPages: Math.ceil((json.total || 0) / pagination.limit),
          });
        }
      } catch (error) {
        console.error("Error fetching lab orders:", error);
      } finally {
        if (!silent) setLoading(false);
        setIsRefreshing(false);
      }
    },
    [lab?.id, activeTab, statusFilter, search, pagination.limit]
  );

  // Initial fetch on lab change or tab change
  useEffect(() => {
    if (lab?.id) {
      fetchOrders(1);
    }
  }, [lab?.id, activeTab, statusFilter]);

  // Real-time Auto-Refresh Polling (every 5 seconds)
  useEffect(() => {
    if (!lab?.id) return;
    const interval = setInterval(() => {
      fetchOrders(pagination.currentPage, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [lab?.id, pagination.currentPage, fetchOrders]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (lab?.id) fetchOrders(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle Tab Switch
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setStatusFilter(tab);
  };

  // Step-by-Step Status Advance
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setActionLoadingId(orderId);
      const res = await fetch("/api/lab/order/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: newStatus }),
      });
      const data = await res.json();
      if (data.status) {
        const nextLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
        toast.success(`Order moved to: ${nextLabel}`);
        await fetchOrders(pagination.currentPage, true);
      } else {
        toast.error(data.message || "Failed to update order status");
      }
    } catch {
      toast.error("Network error updating order status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Sorting
  const sortedOrders = [...orders].sort((a, b) => {
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    if (sortConfig.key === "created_at") {
      return (new Date(a.created_at) - new Date(b.created_at)) * direction;
    }
    if (sortConfig.key === "total_amount") {
      return ((Number(a.total_amount) || 0) - (Number(b.total_amount) || 0)) * direction;
    }
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ChevronDown className="w-3.5 h-3.5 opacity-40" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-[#0067A1]" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-[#0067A1]" />
    );
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchOrders(page);
    }
  };

  const generatePageNumbers = () => {
    const pages = [];
    const total = pagination.totalPages;
    const current = pagination.currentPage;
    if (total <= 1) return [1];

    pages.push(1);
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    if (current <= 3) end = Math.min(5, total - 1);
    if (current >= total - 2) start = Math.max(2, total - 4);

    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push("...");
    if (total > 1) pages.push(total);

    return pages;
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0067A1] text-white shrink-0 shadow-xs">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Diagnostic Lab Orders
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Review patient test bookings, manage sample collections, track diagnostic processing, and issue reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => fetchOrders(pagination.currentPage, false)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin text-[#0067A1]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics / Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Pending Orders */}
        <div
          onClick={() => handleTabChange("pending")}
          className={`p-4 sm:p-5 rounded-2xl border bg-white dark:bg-slate-900 transition-all cursor-pointer shadow-xs ${
            activeTab === "pending"
              ? "border-amber-500 ring-2 ring-amber-500/20"
              : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Action Required</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.pending}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending Review
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Card 2: Active In-Progress */}
        <div
          onClick={() => handleTabChange("in_progress")}
          className={`p-4 sm:p-5 rounded-2xl border bg-white dark:bg-slate-900 transition-all cursor-pointer shadow-xs ${
            activeTab === "in_progress"
              ? "border-[#0067A1] ring-2 ring-[#0067A1]/20"
              : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Processing</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.in_progress}
              </p>
              <p className="text-xs text-[#0067A1] dark:text-sky-400 font-medium mt-1">
                Sample & Lab Testing
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-[#0067A1] dark:text-sky-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Card 3: Completed Orders */}
        <div
          onClick={() => handleTabChange("completed")}
          className={`p-4 sm:p-5 rounded-2xl border bg-white dark:bg-slate-900 transition-all cursor-pointer shadow-xs ${
            activeTab === "completed"
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed Orders</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.completed}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                Reports Ready & Issued
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
              <BadgeCheck className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Card 4: Revenue */}
        <div
          onClick={() => handleTabChange("all")}
          className={`p-4 sm:p-5 rounded-2xl border bg-white dark:bg-slate-900 transition-all cursor-pointer shadow-xs ${
            activeTab === "all"
              ? "border-[#0067A1] ring-2 ring-[#0067A1]/20"
              : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                ₹{Number(stats.revenue || 0).toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                {stats.total} Total Bookings
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter Tab Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: "all", label: "All Orders", icon: ClipboardList, count: stats.total },
          { key: "pending", label: "Pending", icon: Clock, count: stats.pending },
          { key: "in_progress", label: "In Progress", icon: Activity, count: stats.in_progress },
          { key: "completed", label: "Completed", icon: BadgeCheck, count: stats.completed },
          { key: "rejected", label: "Rejected", icon: XCircle, count: stats.rejected },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-[#0067A1] text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700"
              }`}
            >
              <TabIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Controls Card */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row gap-3.5">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              className="w-full pl-11 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl 
                       bg-slate-50/60 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm
                       focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] outline-none transition-all"
              placeholder="Search patient name, phone number, or order UNID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Specific Status filter */}
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Filter className="w-4 h-4" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                if (e.target.value === "all") setActiveTab("all");
                else if (["approved", "sample_collected", "processing"].includes(e.target.value)) setActiveTab("in_progress");
                else setActiveTab(e.target.value);
              }}
              className="w-full lg:w-56 pl-10 pr-9 py-2.5 border border-slate-200 dark:border-slate-700 
                       rounded-xl bg-slate-50/60 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm
                       focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] appearance-none cursor-pointer outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="sample_collected">Sample Collected</option>
              <option value="processing">In Diagnostic Analysis</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort selector */}
          <div className="relative">
            <select
              value={sortConfig.key}
              onChange={(e) => handleSort(e.target.value)}
              className="w-full lg:w-44 pl-3.5 pr-9 py-2.5 border border-slate-200 dark:border-slate-700 
                       rounded-xl bg-slate-50/60 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm
                       focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] appearance-none cursor-pointer outline-none"
            >
              <option value="created_at">Sort: Order Date</option>
              <option value="total_amount">Sort: Amount</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm font-medium">
            Loading diagnostic orders...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedOrders.length === 0 && (
        <div className="bg-white dark:bg-slate-900 p-10 md:p-14 rounded-2xl text-center shadow-xs border border-slate-200/80 dark:border-slate-800">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">
            No Orders Found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1.5 max-w-md mx-auto">
            No diagnostic orders match your current tab or search criteria.
          </p>
          {(search || activeTab !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setActiveTab("all");
                setStatusFilter("all");
              }}
              className="mt-4 px-4 py-2 bg-[#0067A1] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#005585] transition-all"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Orders Table */}
      {!loading && sortedOrders.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          {/* Table Header Strip */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
                Orders List
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Showing {sortedOrders.length} of {pagination.total} orders
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Auto-refresh:</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-700">
                <tr>
                  <th className="p-3.5 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("unid")}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <span>Order ID</span>
                      <SortIcon columnKey="unid" />
                    </button>
                  </th>
                  <th className="p-3.5 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Patient Details
                  </th>
                  <th className="p-3.5 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Tests
                  </th>
                  <th className="p-3.5 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="p-3.5 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("total_amount")}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <span>Amount</span>
                      <SortIcon columnKey="total_amount" />
                    </button>
                  </th>
                  <th className="p-3.5 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("created_at")}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <span>Order Date</span>
                      <SortIcon columnKey="created_at" />
                    </button>
                  </th>
                  <th className="p-3.5 px-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedOrders.map((o) => {
                  const normStatus = (o.status || "").toLowerCase();
                  const cfg = STATUS_CONFIG[normStatus] || {
                    next: [],
                    nextActionLabel: null,
                    nextActionStatus: null,
                  };
                  const isHomeCollection =
                    (o.collection_type || "").toLowerCase().includes("home");
                  const isUpdatingThis = actionLoadingId === o.id;

                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Column 1: Order UNID & Collection Type */}
                      <td className="p-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          #{o.unid}
                        </div>
                        <div className="mt-1">
                          {isHomeCollection ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <Home className="w-3 h-3" />
                              <span>Home Pickup</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <Building2 className="w-3 h-3" />
                              <span>Lab Visit</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 2: Patient Info */}
                      <td className="p-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0067A1]/10 dark:bg-[#0067A1]/20 text-[#0067A1] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                              {o.patient?.patient_details?.full_name || "Patient"}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {o.patient?.phone_number || "No contact"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Tests summary */}
                      <td className="p-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 text-xs font-semibold border border-teal-200 dark:border-teal-800">
                          <FlaskConical className="w-3.5 h-3.5" />
                          <span>{o.items_count || 1} Tests</span>
                        </span>
                      </td>

                      {/* Column 4: Status Badge */}
                      <td className="p-3.5 px-4">
                        <StatusBadge status={o.status} />
                      </td>

                      {/* Column 5: Amount */}
                      <td className="p-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          ₹{Number(o.total_amount || 0).toLocaleString()}
                        </div>
                        {o.payment_status && (
                          <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                            {o.payment_status}
                          </div>
                        )}
                      </td>

                      {/* Column 6: Date */}
                      <td className="p-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(o.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(o.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Column 7: Quick Actions */}
                      <td className="p-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Next Status Action button if applicable */}
                          {cfg.nextActionStatus && (
                            <button
                              onClick={() =>
                                handleUpdateOrderStatus(o.id, cfg.nextActionStatus)
                              }
                              disabled={isUpdatingThis}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isUpdatingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>{cfg.nextActionLabel}</span>
                            </button>
                          )}

                          {/* Quick Reject button if pending */}
                          {(normStatus === "pending" || normStatus === "sent_to_lab") && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, "rejected")}
                              disabled={isUpdatingThis}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}

                          {/* View details button */}
                          <button
                            onClick={() => router.push(`/lab/orders/${o.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0067A1] hover:bg-[#005585] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Strip */}
          <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Page {pagination.currentPage} of {pagination.totalPages || 1} • {pagination.total} total orders
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => goToPage(1)}
                  disabled={pagination.currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsLeft size={16} />
                </button>

                <button
                  onClick={() => goToPage(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center space-x-1">
                  {generatePageNumbers().map((page, i) =>
                    page === "..." ? (
                      <span key={i} className="px-2 text-xs text-slate-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={i}
                        onClick={() => goToPage(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                          page === pagination.currentPage
                            ? "bg-[#0067A1] text-white shadow-xs"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => goToPage(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages || pagination.totalPages === 0}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>

                <button
                  onClick={() => goToPage(pagination.totalPages)}
                  disabled={pagination.currentPage === pagination.totalPages || pagination.totalPages === 0}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
