"use client";

import { useEffect, useState } from "react";
import {
  FlaskConical,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  BarChart3,
  User,
  Loader2,
  ClipboardList,
  DollarSign,
  Calendar,
  AlertCircle,
  ChevronRight,
  Activity,
  RefreshCw,
  Users,
  Target,
  Zap,
  AlertTriangle,
  Package,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Filter,
  Download,
  Eye,
  MoreVertical,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getLoggedInUser } from "@/lib/authHelpers";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function LabDashboard() {
  const router = useRouter();
  const lab = getLoggedInUser("lab");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [chartType, setChartType] = useState("line");

  useEffect(() => {
    if (!lab?.id) {
      toast.error("Lab not found. Please login again.");
      router.push("/auth/login");
      return;
    }
    fetchDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lab?.id, timeRange]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/lab/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lab_id: lab.id,
          time_range: timeRange,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setDashboard(result.data);
      } else {
        toast.error(result.message || "Failed to load dashboard");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: "bg-emerald-500 dark:bg-emerald-600",
      processing: "bg-blue-500 dark:bg-[#0067A1]",
      sample_collected: "bg-indigo-500 dark:bg-indigo-600",
      pending: "bg-amber-500 dark:bg-amber-600",
      sent_to_lab: "bg-cyan-500 dark:bg-cyan-600",
      approved: "bg-green-500 dark:bg-green-600",
      rejected: "bg-red-500 dark:bg-red-600",
      cancelled: "bg-gray-500 dark:bg-gray-600",
    };
    return colors[status] || "bg-gray-500 dark:bg-gray-600";
  };

  const getStatusText = (status) => {
    const texts = {
      completed: "Completed",
      processing: "Processing",
      sample_collected: "Sample Collected",
      pending: "Pending",
      sent_to_lab: "Sent to Lab",
      approved: "Approved",
      rejected: "Rejected",
      cancelled: "Cancelled",
    };
    return texts[status] || status;
  };

  const timeRanges = [
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "90d", label: "90 Days" },
    { id: "1y", label: "1 Year" },
  ];

  const chartTypes = [
    { id: "line", label: "Line", icon: <LineChartIcon className="w-4 h-4" /> },
    { id: "area", label: "Area", icon: <AreaChart className="w-4 h-4" /> },
    { id: "bar", label: "Bar", icon: <BarChartIcon className="w-4 h-4" /> },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {label}
          </p>
          {payload.map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 mb-1"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {entry.dataKey}:
                </span>
              </div>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {entry.dataKey === "amount" ? "₹" : ""}
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.value} tests ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Loading Diagnostic Dashboard...
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fetching latest laboratory operational metrics
          </p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="py-12">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Dashboard Unavailable
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            We couldn't load your laboratory insights right now.
          </p>
          <button
            onClick={fetchDashboard}
            className="px-5 py-2.5 bg-[#0067A1] hover:bg-[#005585] text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 mx-auto cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    lab: labInfo,
    stats,
    recent_orders,
    daily_revenue,
    test_distribution,
    status_distribution,
  } = dashboard;

  const COLORS = [
    "#0067A1",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
  ];

  const nowFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#003358",
            color: "#fff",
            borderRadius: "12px",
            padding: "14px 18px",
            fontSize: "13px",
            fontWeight: 500,
          },
        }}
      />

      {/* Hero Banner (Same as Doctor Dashboard) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0067A1] via-[#0080C6] to-[#0067A1] rounded-3xl px-6 sm:px-8 py-7 sm:py-8 shadow-sm">
        {/* Subtle decorative geometry */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-28 -mt-28 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full -mb-24 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full border border-white/20 text-white text-xs font-medium mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Diagnostic Portal Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {labInfo?.lab_name || "Diagnostic Center"}
            </h1>
            <p className="text-white/80 text-sm mt-1.5 max-w-xl">
              Operational dashboard and diagnostic test order management for {nowFormatted}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time Filter */}
            <div className="bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-white flex items-center gap-2 text-xs font-medium">
              <Calendar className="w-3.5 h-3.5 text-white/80" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer [&>option]:text-slate-800"
              >
                {timeRanges.map((range) => (
                  <option key={range.id} value={range.id}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchDashboard}
              className="px-3.5 py-2 bg-white text-[#0067A1] rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Orders */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#0067A1]/10 text-[#0067A1] dark:bg-[#0067A1]/20 dark:text-sky-300 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {stats.total_orders}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {timeRanges.find((r) => r.id === timeRange)?.label}
            </span>
            <span>activity recorded</span>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Action Required
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
            {stats.pending_orders}
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium text-slate-600 dark:text-slate-400">
              {stats.pending_orders > 0 ? "Awaiting processing / collection" : "All orders cleared"}
            </span>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Completed
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {stats.completed_orders}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.total_orders > 0
                ? `${Math.round((stats.completed_orders / stats.total_orders) * 100)}%`
                : "100%"}
            </span>
            <span>fulfillment rate</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Gross Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0067A1] dark:bg-sky-950/40 dark:text-sky-300 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {formatCurrency(stats.revenue_30_days || 0)}
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            {stats.revenue_change >= 0 ? (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  +{stats.revenue_change}%
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {stats.revenue_change}%
                </span>
              </>
            )}
            <span className="text-slate-400">vs prev period</span>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => router.push("/lab/orders")}
          className="group p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-[#0067A1]/40 hover:shadow-md transition-all text-left cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0067A1]/10 text-[#0067A1] dark:bg-[#0067A1]/20 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <ClipboardList className="w-5 h-5" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
            Manage Test Orders
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Process patient specimens
          </p>
        </button>

        <button
          onClick={() => router.push("/lab/tests")}
          className="group p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-[#0067A1]/40 hover:shadow-md transition-all text-left cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <FlaskConical className="w-5 h-5" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
            Test Catalog
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Bulk upload CSV & prices
          </p>
        </button>

        <button
          onClick={() => router.push("/lab/profile")}
          className="group p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-[#0067A1]/40 hover:shadow-md transition-all text-left cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Target className="w-5 h-5" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
            Lab Profile
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Operating hours & details
          </p>
        </button>

        <button
          onClick={() => router.push("/lab/orders")}
          className="group p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-[#0067A1]/40 hover:shadow-md transition-all text-left cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
            Pending Orders
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.pending_orders} awaiting report
          </p>
        </button>
      </div>

      {/* MAIN CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* REVENUE CHART */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0067A1]" />
                Revenue Analytics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Financial performance from processed laboratory tests
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
              {chartTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setChartType(type.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    chartType === type.id
                      ? "bg-white dark:bg-slate-800 text-[#0067A1] dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {daily_revenue.length > 0 ? (
                chartType === "line" ? (
                  <LineChart data={daily_revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="Revenue"
                      stroke="#0067A1"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#0067A1" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                ) : chartType === "area" ? (
                  <AreaChart data={daily_revenue}>
                    <defs>
                      <linearGradient id="labRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0067A1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0067A1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name="Revenue"
                      stroke="#0067A1"
                      fill="url(#labRevenueGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={daily_revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" name="Revenue" fill="#0067A1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">No revenue data available</p>
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* TEST DISTRIBUTION PIE */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#0067A1]" />
                  Test Distribution
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ordered tests by diagnostic category
                </p>
              </div>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                {test_distribution && test_distribution.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={test_distribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={42}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {test_distribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <PieChartIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-500">No test data recorded</p>
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 max-h-40 overflow-y-auto">
            {test_distribution?.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                    {item.name}
                  </span>
                </div>
                <span className="font-bold text-slate-800 dark:text-white ml-2">
                  {item.value} tests
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT ORDERS & STATUS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT ORDERS LIST */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0067A1]" />
                Recent Test Orders
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Latest orders received for processing
              </p>
            </div>
            <button
              onClick={() => router.push("/lab/orders")}
              className="text-xs font-bold text-[#0067A1] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recent_orders?.length > 0 ? (
              recent_orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/lab/orders/${order.id}`)}
                  className="p-3.5 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {order.patient_details?.full_name
                        ? order.patient_details.full_name.slice(0, 2).toUpperCase()
                        : "PT"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-white">
                          #{order.id?.substring(0, 8)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5">
                        {order.patient_details?.full_name || "Patient"}
                        {order.tests_count > 0 && (
                          <span className="text-slate-400 font-normal ml-1.5">
                            • {order.tests_count} test{order.tests_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(order.total_amount || 0)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No test orders received yet</p>
              </div>
            )}
          </div>
        </div>

        {/* ORDER STATUS DISTRIBUTION */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-[#0067A1]" />
            Pipeline Status
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Diagnostic processing workflow breakdown
          </p>

          <div className="space-y-4">
            {Object.entries(status_distribution || {}).map(([status, count]) => {
              if (count === 0) return null;
              const percentage =
                stats.total_orders > 0 ? (count / stats.total_orders) * 100 : 0;

              return (
                <div key={status}>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                      {status.replace(/_/g, " ")}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {count}{" "}
                      <span className="text-[11px] font-normal text-slate-400">
                        ({percentage.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getStatusColor(status)} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-400">Completion Rate</p>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {stats.total_orders > 0
                  ? `${Math.round((stats.completed_orders / stats.total_orders) * 100)}%`
                  : "100%"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-400">Avg TAT</p>
              <p className="text-lg font-extrabold text-[#0067A1] mt-0.5">
                24 - 48h
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
