"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoggedInUser } from "@/lib/authHelpers";
import {
  Users,
  Calendar,
  DollarSign,
  Stethoscope,
  Pill,
  Activity,
  TrendingUp,
  Filter,
  Download,
  Eye,
  Clock,
  UserCheck,
  Plus,
  FlaskRoundIcon as LabIcon,
  ShoppingCart,
  UserCog,
  RefreshCw,
  IndianRupee,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Inbox,
  FlaskConical,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { motion, AnimatePresence } from "framer-motion";
export default function AdminDashboard() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState("week");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = getLoggedInUser("admin");
    if (!user) router.push("/admin/login");

    // Set default dates
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
    fetchHealthData();
  }, [dateRange, startDate, endDate]);

  const fetchHealthData = async () => {
    try {
      const res = await fetch(`/api/admin/queue-health?_t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setHealthData(json.data);
    } catch (err) {
      console.error("Failed to fetch health data:", err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setError(null);
      setLoading(true);

      const params = new URLSearchParams({
        dateRange,
        ...(dateRange === "custom" && { startDate, endDate }),
      });

      const response = await fetch(`/api/admin/dashboard?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError(error.message);
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Stats Data based on real data
  const stats = dashboardData
    ? [
        {
          title: "Total Patients",
          value: dashboardData.stats.totalPatients?.toLocaleString() || "0",
          change: "+12%",
          icon: <Users className="w-6 h-6" />,
          color: "bg-[#0067A1]",
          trend: "up",
          link: "/admin/patients",
        },
        {
          title: "Total Doctors",
          value: dashboardData.stats.totalDoctors?.toLocaleString() || "0",
          change: "+5%",
          icon: <Stethoscope className="w-6 h-6" />,
          color: "bg-[#0E6E67]",
          trend: "up",
          link: "/admin/doctors",
        },
        {
          title: "Appointments",
          value: dashboardData.stats.totalAppointments?.toLocaleString() || "0",
          change: "+8%",
          icon: <Calendar className="w-6 h-6" />,
          color: "bg-[#148F86]",
          trend: "up",
          link: "/admin/appointments",
        },
        {
          title: "Revenue",
          value: `₹${(dashboardData.stats.totalRevenue || 0).toLocaleString()}`,
          change: "+23%",
          icon: <IndianRupee className="w-6 h-6" />,
          color: "bg-[#0080C6]",
          trend: "up",
          link: "/admin/ledger",
        },
        {
          title: "Labs",
          value: dashboardData.stats.totalLabs?.toLocaleString() || "0",
          change: "+3%",
          icon: <LabIcon className="w-6 h-6" />,
          color: "bg-[#0067A1]",
          trend: "up",
          link: "/admin/labs",
        },
        {
          title: "Chemists",
          value: dashboardData.stats.totalChemists?.toLocaleString() || "0",
          change: "+7%",
          icon: <ShoppingCart className="w-6 h-6" />,
          color: "bg-[#0E6E67]",
          trend: "up",
          link: "/admin/chemists",
        },
      ]
    : [];

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-800 dark:text-gray-200">
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}:{" "}
              {entry.name.toLowerCase().includes("revenue")
                ? `₹${entry.value.toLocaleString()}`
                : entry.value}
              {entry.name.toLowerCase().includes("growth") && "%"}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-auto relative z-0">
        <div className="p-4 md:p-4 lg:p-4 bg-transparent">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl shadow-md border border-gray-200/50 dark:border-gray-700/50 p-4 md:p-6 space-y-6">
            
            {/* Header Skeleton */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 animate-pulse">
              <div className="space-y-3">
                <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </div>

            {/* Live System Health Widget Skeleton */}
            <div className="rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Filter Bar Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
              <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <div className="space-y-3">
                    <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                </div>
              ))}
            </div>

            {/* Charts Section Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-44 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="h-72 w-full bg-gray-100 dark:bg-gray-750/30 rounded-lg flex items-end p-4 space-x-4">
                    {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                      <div key={bar} className="flex-1 bg-gray-200 dark:bg-gray-700 rounded" style={{ height: `${Math.random() * 60 + 30}%` }}></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
              {/* Age Distribution Skeleton */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
                <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-72 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-8 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-transparent"></div>
                  </div>
                </div>
              </div>

              {/* Quick Stats Skeleton */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div key={idx} className="flex justify-between items-center py-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                      <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="flex items-center space-x-4 py-1">
                    <div className="w-2.5 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 overflow-auto relative z-0">
        <div className="p-4 md:p-4 lg:p-4 bg-transparent">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl shadow-md border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="text-red-500 text-lg mb-2">Error</div>
                <div className="text-gray-600 dark:text-gray-400 mb-4">
                  {error}
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="px-4 py-2 bg-[#0067A1] text-white rounded-lg hover:bg-[#073834] transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto relative z-0">
      <div className="p-4 md:p-4 lg:p-4 bg-transparent">
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl shadow-md border border-gray-200/50 dark:border-gray-700/50">
          <div className="space-y-6 p-2 md:p-4">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h4 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                  Medical Dashboard
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Comprehensive overview of your healthcare facility
                </p>
              </div>
            </div>

            {/* System Health Widget */}
            {healthData && (
              <div
                onClick={() => router.push("/admin/operations?tab=health")}
                className={`transition-all duration-300 cursor-pointer rounded-2xl p-6 shadow-md border-2 hover:scale-[1.01] ${
                  healthData.status === "HEALTHY"
                    ? "bg-gradient-to-br from-emerald-500/10 via-teal-500/[0.03] to-transparent border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-emerald-500/10 dark:border-emerald-500/20 dark:hover:border-emerald-500/40"
                    : "bg-gradient-to-br from-rose-500/10 via-amber-500/[0.03] to-transparent border-rose-500/30 hover:border-rose-500/60 hover:shadow-rose-500/10 dark:border-rose-500/20 dark:hover:border-rose-500/40"
                }`}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        healthData.status === "HEALTHY" ? "bg-emerald-400" : "bg-rose-400"
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${
                        healthData.status === "HEALTHY" ? "bg-emerald-500" : "bg-rose-500"
                      }`}></span>
                    </span>
                    <Zap size={20} className={healthData.status === "HEALTHY" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
                    <span className="font-extrabold tracking-tight text-[#0067A1] dark:text-[#0080C6]">Live System Health</span>
                  </h3>
                  <span className={`px-4 py-1.5 text-xs font-black tracking-wider rounded-full shadow-sm text-white ${
                    healthData.status === "HEALTHY" ? "bg-emerald-600" : "bg-rose-600"
                  }`}>
                    {healthData.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Outbox Pending */}
                  <div className="p-4 rounded-xl transition-all duration-200 border bg-[#0080C6]/[0.06] border-[#0067A1]/20 hover:bg-[#0080C6]/[0.1] dark:bg-teal-950/20 dark:border-teal-800/30 flex flex-col gap-1">
                    <span className="text-xs font-bold text-[#004F7C] dark:text-[#0080C6] uppercase tracking-wider flex items-center gap-1.5">
                      <Inbox size={13} className="text-[#0067A1] dark:text-[#0080C6]"/> Outbox Pending
                    </span>
                    <span className="text-2xl font-black text-[#004F7C] dark:text-teal-200">
                      {healthData.outbox.pending}
                    </span>
                  </div>

                  {/* P1 Incidents */}
                  <div className={`p-4 rounded-xl transition-all duration-200 border flex flex-col gap-1 ${
                    healthData.incidents.p1_open > 0
                      ? "bg-rose-500/[0.08] border-rose-500/30 hover:bg-rose-500/[0.12] dark:bg-rose-950/30 dark:border-rose-800/40 animate-pulse"
                      : "bg-emerald-500/[0.06] border-emerald-500/20 hover:bg-emerald-500/[0.1] dark:bg-emerald-950/20 dark:border-emerald-800/30"
                  }`}>
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      healthData.incidents.p1_open > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
                    }`}>
                      <AlertTriangle size={13} className={healthData.incidents.p1_open > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}/> P1 Incidents
                    </span>
                    <span className={`text-2xl font-black ${
                      healthData.incidents.p1_open > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-800 dark:text-emerald-200"
                    }`}>
                      {healthData.incidents.p1_open}
                    </span>
                  </div>

                  {/* DLQ Items */}
                  <div className={`p-4 rounded-xl transition-all duration-200 border flex flex-col gap-1 ${
                    healthData.dead_letter_queue.unreplayed > 0
                      ? "bg-amber-500/[0.08] border-amber-500/30 hover:bg-amber-500/[0.12] dark:bg-amber-950/30 dark:border-amber-800/40"
                      : "bg-emerald-500/[0.06] border-emerald-500/20 hover:bg-emerald-500/[0.1] dark:bg-emerald-950/20 dark:border-emerald-800/30"
                  }`}>
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      healthData.dead_letter_queue.unreplayed > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                    }`}>
                      <AlertTriangle size={13} className={healthData.dead_letter_queue.unreplayed > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}/> DLQ Items
                    </span>
                    <span className={`text-2xl font-black ${
                      healthData.dead_letter_queue.unreplayed > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-800 dark:text-emerald-200"
                    }`}>
                      {healthData.dead_letter_queue.unreplayed}
                    </span>
                  </div>

                  {/* Worker Failed */}
                  <div className={`p-4 rounded-xl transition-all duration-200 border flex flex-col gap-1 ${
                    (healthData.worker_logs?.[0]?.items_failed || 0) > 0
                      ? "bg-rose-500/[0.08] border-rose-500/30 hover:bg-rose-500/[0.12] dark:bg-rose-950/30 dark:border-rose-800/40"
                      : "bg-emerald-500/[0.06] border-emerald-500/20 hover:bg-emerald-500/[0.1] dark:bg-emerald-950/20 dark:border-emerald-800/30"
                  }`}>
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      (healthData.worker_logs?.[0]?.items_failed || 0) > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
                    }`}>
                      <XCircle size={13} className={(healthData.worker_logs?.[0]?.items_failed || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}/> Worker Failed
                    </span>
                    <span className={`text-2xl font-black ${
                      (healthData.worker_logs?.[0]?.items_failed || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-800 dark:text-emerald-200"
                    }`}>
                      {healthData.worker_logs?.[0]?.items_failed || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                    <Filter size={20} />
                    <span>Filters</span>
                  </h2>

                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  {dateRange === "custom" && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={fetchDashboardData}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#0067A1] hover:bg-[#073834] text-white rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw size={18} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  onClick={() => stat.link && router.push(stat.link)}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-2">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-xl text-white`}>
                      {stat.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Diagnostic Lab Analytics Card */}
            {dashboardData?.labAnalytics && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6 mt-6">
                <div className="flex items-center justify-between border-b pb-4 border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-[#0067A1]" />
                    <span>Diagnostic Lab Analytics Dashboard</span>
                  </h3>
                  <span className="text-xs bg-[#0067A1]/10 text-[#0067A1] px-2.5 py-1 rounded-full font-bold">
                    Real-time Metrics
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Total Orders */}
                  <div className="bg-[#0067A1]/5 dark:bg-[#0067A1]/10 p-4 rounded-xl border border-[#0067A1]/10 text-center">
                    <p className="text-xs text-gray-500 font-medium">Total Lab Orders</p>
                    <p className="text-3xl font-black text-[#0067A1] dark:text-[#0080C6] mt-1">
                      {dashboardData.labAnalytics.totalOrders || 0}
                    </p>
                  </div>
                  {/* Home collection ratio */}
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100/50 dark:border-blue-900/30 text-center">
                    <p className="text-xs text-gray-500 font-medium">Home Collections</p>
                    <p className="text-3xl font-black text-[#0067A1] dark:text-blue-400 mt-1">
                      {dashboardData.labAnalytics.homeCollectionCount || 0}
                    </p>
                  </div>
                  {/* Walk-in ratio */}
                  <div className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100/50 dark:border-green-900/30 text-center">
                    <p className="text-xs text-gray-500 font-medium">Walk-in Bookings</p>
                    <p className="text-3xl font-black text-green-600 dark:text-green-400 mt-1">
                      {dashboardData.labAnalytics.walkInCount || 0}
                    </p>
                  </div>
                  {/* Lab revenue */}
                  <div className="bg-[#0080C6]/5 dark:bg-[#0080C6]/10 p-4 rounded-xl border border-[#0080C6]/10 text-center">
                    <p className="text-xs text-gray-500 font-medium">Diagnostic Revenue</p>
                    <p className="text-3xl font-black text-[#0080C6] dark:text-[#38efdf] mt-1">
                      ₹{(dashboardData.labAnalytics.revenue || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Popular tests list */}
                {dashboardData.labAnalytics.popularTests && dashboardData.labAnalytics.popularTests.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-gray-150 dark:border-gray-800">
                    <h4 className="text-sm font-bold text-gray-850 dark:text-gray-250 mb-3">🔥 Most Frequently Booked Tests</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                      {dashboardData.labAnalytics.popularTests.map((t, idx) => (
                        <div key={idx} className="flex flex-col bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                          <span className="text-[10px] uppercase font-bold text-gray-400">Rank #{idx+1}</span>
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1 truncate" title={t.name}>{t.name}</span>
                          <span className="text-sm font-black text-[#0067A1] dark:text-[#0080C6] mt-0.5">{t.count} bookings</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                    <Calendar size={20} />
                    <span>Weekly Appointments</span>
                  </h3>
                  <span className="text-sm text-green-600 font-medium">
                    +18% growth
                  </span>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardData?.charts.appointmentChart || []}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />
                      <XAxis
                        dataKey="day"
                        className="text-sm"
                        tick={{ fill: "#6B7280" }}
                      />
                      <YAxis className="text-sm" tick={{ fill: "#6B7280" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="appointments"
                        name="Total Appointments"
                        fill="#0067A1"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="completed"
                        name="Completed"
                        fill="#148F86"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                    <IndianRupee size={20} />
                    <span>Revenue Trend</span>
                  </h3>
                  <span className="text-sm text-green-600 font-medium">
                    +23% growth
                  </span>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dashboardData?.charts.monthlyRevenue || []}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />
                      <XAxis
                        dataKey="month"
                        className="text-sm"
                        tick={{ fill: "#6B7280" }}
                      />
                      <YAxis
                        className="text-sm"
                        tick={{ fill: "#6B7280" }}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#0067A1"
                        strokeWidth={3}
                        dot={{ fill: "#0067A1", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "#073834" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Additional Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Patient Age Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                    <UserCheck size={20} />
                    <span>Patient Age Distribution</span>
                  </h3>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData?.charts.ageDistribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) =>
                          `${name} (${percentage}%)`
                        }
                        outerRadius={80}
                        fill="#0067A1"
                        dataKey="value"
                      >
                        {dashboardData?.charts.ageDistribution?.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                [
                                  "#0067A1",
                                  "#0E6E67",
                                  "#148F86",
                                  "#1BAFA5",
                                  "#43D2CA",
                                ][index]
                              }
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} patients`, name]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6 flex items-center space-x-2">
                  <Activity size={20} />
                  <span>Quick Stats</span>
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      label: "Today's Appointments",
                      value: dashboardData?.stats.todayAppointments || 0,
                      icon: <Clock size={16} />,
                    },
                    {
                      label: "Patient Satisfaction",
                      value:
                        dashboardData?.quickStats?.patientSatisfaction || "92%",
                      icon: <Eye size={16} />,
                    },
                    {
                      label: "Follow-up Rate",
                      value: dashboardData?.quickStats?.followUpRate || "76%",
                      icon: <UserCheck size={16} />,
                    },
                    {
                      label: "Emergency Cases",
                      value: dashboardData?.quickStats?.emergencyCases || "8",
                      icon: <Activity size={16} />,
                    },
                    {
                      label: "Lab Tests Today",
                      value: dashboardData?.stats.todayLabReports || 0,
                      icon: <LabIcon size={16} />,
                    },
                    {
                      label: "Pending Prescriptions",
                      value: dashboardData?.stats.pendingPrescriptions || 0,
                      icon: <Pill size={16} />,
                    },
                  ].map((stat, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          {stat.icon}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {stat.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Recent Activity
                </h3>
                <button
                  onClick={() => router.push("/admin/audit-logs")}
                  className="text-xs font-bold text-[#0067A1] hover:text-[#073834] dark:text-[#0080C6] dark:hover:text-teal-300 transition-colors cursor-pointer"
                >
                  View All Logs
                </button>
              </div>
              <div className="space-y-4">
                {dashboardData?.activity?.slice(0, 5).map((activity, index) => (
                  <div
                    key={index}
                    onClick={() => activity.link && router.push(activity.link)}
                    className="flex items-center space-x-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors cursor-pointer"
                    title={`Click to view details in ${activity.link?.replace('/admin/', '') || 'logs'}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.status === "completed"
                          ? "bg-green-500"
                          : activity.status === "booked"
                          ? "bg-[#0080C6]"
                          : activity.status === "cancelled"
                          ? "bg-red-500"
                          : "bg-gray-500"
                      }`}
                    ></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        by {activity.user}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {activity.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
