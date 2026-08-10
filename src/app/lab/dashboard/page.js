"use client";

import { useEffect, useState, useRef } from "react";
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
  const didFetch = useRef(false);

  useEffect(() => {
    if (!lab?.id) {
      toast.error("Lab not found. Please login again.");
      router.push("/auth/login");
      return;
    }

    if (!didFetch.current) {
      didFetch.current = true;
      fetchDashboard();
    }
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
      <div className="min-h-screen  dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 border-4 border-emerald-200 dark:border-emerald-800 border-t-[#0067A1] dark:border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Loading your dashboard...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Fetching latest lab insights
          </p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen dark:from-gray-900 dark:to-gray-800">
        <div className="mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              Dashboard Unavailable
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We couldn't load your dashboard data.
            </p>
            <button
              onClick={fetchDashboard}
              className="px-6 py-3 bg-gradient-to-r from-[#0067A1] to-emerald-700 dark:from-[#004F7C] dark:to-emerald-800 text-white rounded-xl font-medium hover:opacity-90 transition-opacity duration-200 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
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
    "#4f46e5",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
  ];

  return (
    <div className="min-h-screen dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#fff",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid #334155",
          },
        }}
      />

      {/* HEADER */}
      <div className="mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-[#0067A1] via-[#0067A1] to-[#0067A1] dark:from-[#004F7C] dark:via-[#004F7C] dark:to-[#004F7C] text-white rounded-2xl flex items-center justify-center shadow-xl">
                <FlaskConical className="w-8 h-8" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
                <Zap className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                Lab Dashboard
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-gray-600 dark:text-gray-400">
                  Welcome back,{" "}
                  <span className="font-semibold text-[#0067A1] dark:text-emerald-400">
                    {labInfo?.lab_name}
                  </span>
                </p>
                <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-[#0067A1] dark:text-emerald-300 rounded-full">
                  {labInfo?.onboarding_status === "approved"
                    ? "✓ Approved"
                    : "Pending"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-transparent font-medium text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer"
                >
                  {timeRanges.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={fetchDashboard}
              className="px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium shadow-sm transition-colors duration-200 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="px-4 py-2.5 bg-gradient-to-r from-[#0067A1] to-emerald-700 dark:from-[#004F7C] dark:to-emerald-800 text-white rounded-xl font-medium hover:opacity-90 transition-opacity duration-200 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Orders */}
          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl">
                <ClipboardList className="w-6 h-6 text-[#0067A1] dark:text-emerald-400" />
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Orders
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {timeRanges.find((r) => r.id === timeRange)?.label}
                </div>
              </div>
            </div>
            <h3 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {stats.total_orders}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0067A1] to-emerald-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (stats.total_orders / 1000) * 100
                    )}%`,
                  }}
                />
              </div>
              <Activity className="w-4 h-4 text-[#0067A1] dark:text-emerald-400" />
            </div>
          </div>

          {/* Pending Orders */}
          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pending
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Requires action
                </div>
              </div>
            </div>
            <h3 className="text-4xl font-bold text-amber-600 dark:text-amber-500 mb-2">
              {stats.pending_orders}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (stats.pending_orders / stats.total_orders) * 100 || 0
                    )}%`,
                  }}
                />
              </div>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-500">
                {stats.pending_orders > 0 ? "Action required" : "All clear"}
              </span>
            </div>
          </div>

          {/* Completed Orders */}
          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Completed
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Success rate
                </div>
              </div>
            </div>
            <h3 className="text-4xl font-bold text-emerald-600 dark:text-emerald-500 mb-2">
              {stats.completed_orders}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (stats.completed_orders / stats.total_orders) * 100 || 0
                    )}%`,
                  }}
                />
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                {Math.round(
                  (stats.completed_orders / stats.total_orders) * 100 || 0
                )}
                %
              </span>
            </div>
          </div>

          {/* Revenue */}
          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/30 dark:to-violet-800/30 rounded-xl">
                <DollarSign className="w-6 h-6 text-violet-600 dark:text-violet-500" />
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Revenue
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Last {timeRanges.find((r) => r.id === timeRange)?.label}
                </div>
              </div>
            </div>
            <h3 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {formatCurrency(stats.revenue_30_days)}
            </h3>
            <div className="flex items-center gap-2">
              {stats.revenue_change >= 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-500">
                    +{stats.revenue_change}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-500">
                    {stats.revenue_change}%
                  </span>
                </>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                vs previous period
              </span>
            </div>
          </div>
        </div>

        {/* MAIN CHART SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* REVENUE CHART */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#0067A1] dark:text-emerald-400" />
                  Revenue Trend
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Daily revenue over time
                </p>
              </div>

              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex">
                  {chartTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setChartType(type.id)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${chartType === type.id
                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                        }`}
                    >
                      {type.icon}
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {daily_revenue.length > 0 ? (
                  chartType === "line" ? (
                    <LineChart data={daily_revenue}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#374151"
                        strokeOpacity={0.1}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#4b5563" }}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#4b5563" }}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        name="Revenue"
                        stroke="#4f46e5"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  ) : chartType === "area" ? (
                    <AreaChart data={daily_revenue}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#374151"
                        strokeOpacity={0.1}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#4b5563" }}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#4b5563" }}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        name="Revenue"
                        stroke="#4f46e5"
                        fill="url(#colorRevenue)"
                        strokeWidth={2}
                      />
                      <defs>
                        <linearGradient
                          id="colorRevenue"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#4f46e5"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#4f46e5"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  ) : (
                    <BarChart data={daily_revenue}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#374151"
                        strokeOpacity={0.1}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#4b5563" }}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#4b5563" }}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="amount"
                        name="Revenue"
                        fill="#4f46e5"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <BarChart3 className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No revenue data available
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Complete orders will appear here
                    </p>
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* TEST DISTRIBUTION PIE CHART */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Test Distribution
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  By category
                </p>
              </div>
              <Users className="w-5 h-5 text-gray-400 dark:text-gray-600" />
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {test_distribution && test_distribution.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={test_distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) =>
                        `${name}: ${percentage}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
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
                  <div className="flex flex-col items-center justify-center h-full">
                    <PieChartIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No test data available
                    </p>
                  </div>
                )}
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {test_distribution?.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {item.name}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-auto">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RECENT ORDERS & STATUS DISTRIBUTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* RECENT ORDERS */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0067A1] dark:text-emerald-400" />
                Recent Orders
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  Last 10 orders
                </span>
              </h2>
              <button
                onClick={() => router.push("/lab/orders")}
                className="text-[#0067A1] dark:text-emerald-400 hover:text-[#004F7C] dark:hover:text-emerald-300 font-medium text-sm flex items-center gap-1 group"
              >
                View All
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="space-y-4">
              {recent_orders?.length > 0 ? (
                recent_orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20 transition-all duration-200 cursor-pointer"
                    onClick={() => router.push(`/lab/orders/${order.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg ${order.status === "completed"
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : "bg-amber-100 dark:bg-amber-900/30"
                            }`}
                        >
                          {order.status === "completed" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900 dark:text-gray-100">
                              #{order.id?.substring(0, 8)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                order.status
                              )} text-white`}
                            >
                              {getStatusText(order.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <User className="w-3 h-3" />
                            {order.patient_details?.full_name ||
                              "Unknown Patient"}
                            {order.tests_count > 0 && (
                              <span className="ml-2 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                                {order.tests_count} test
                                {order.tests_count !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(order.total_amount || 0)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No recent orders
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Orders will appear here when received
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ORDER STATUS DISTRIBUTION */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-xl p-6 text-white">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-300" />
              Order Status Distribution
            </h2>

            <div className="space-y-6">
              {Object.entries(status_distribution || {}).map(
                ([status, count], index) => {
                  if (count === 0) return null;

                  const percentage =
                    stats.total_orders > 0
                      ? (count / stats.total_orders) * 100
                      : 0;
                  const colors = {
                    completed: "from-emerald-400 to-emerald-500",
                    processing: "from-blue-400 to-blue-500",
                    sample_collected: "from-indigo-400 to-indigo-500",
                    pending: "from-amber-400 to-amber-500",
                    sent_to_lab: "from-cyan-400 to-cyan-500",
                    approved: "from-green-400 to-green-500",
                    rejected: "from-red-400 to-red-500",
                    cancelled: "from-gray-400 to-gray-500",
                  };

                  return (
                    <div key={status}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300 capitalize">
                          {status.replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{count}</span>
                          <span className="text-sm text-gray-400">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${colors[status] || "from-gray-400 to-gray-500"
                            } rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Completion Rate</p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      (stats.completed_orders / stats.total_orders) * 100 || 0
                    )}
                    %
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Avg. Processing Time</p>
                  <p className="text-lg font-bold text-green-400">24h</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 mb-8 hidden">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push("/lab/orders/new")}
              className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:shadow-md transition-shadow duration-200 text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                  <Package className="w-5 h-5 text-[#0067A1] dark:text-emerald-400" />
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                New Order
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Create manual order
              </p>
            </button>

            <button
              onClick={() => router.push("/lab/reports")}
              className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:shadow-md transition-shadow duration-200 text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                View Reports
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Test reports & history
              </p>
            </button>

            <button
              onClick={() => router.push("/lab/inventory")}
              className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-xl hover:shadow-md transition-shadow duration-200 text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                  <FlaskConical className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Inventory
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage test kits & supplies
              </p>
            </button>

            <button
              onClick={() => router.push("/lab/settings")}
              className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow duration-200 text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-gray-100 dark:bg-gray-900/40 rounded-lg">
                  <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Settings
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configure lab preferences
              </p>
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last updated:{" "}
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-gray-800 dark:text-gray-300 font-medium">
                {stats.total_orders > 0
                  ? "All systems operational"
                  : "Ready for orders"}{" "}
                • Next data refresh in 5 minutes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDashboard}
                className="px-4 py-2.5 bg-gradient-to-r from-[#0067A1] to-emerald-700 dark:from-[#004F7C] dark:to-emerald-800 text-white rounded-xl font-medium hover:opacity-90 transition-opacity duration-200 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Dashboard
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium shadow-sm transition-colors duration-200"
              >
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
