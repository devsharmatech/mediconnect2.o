"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  ArrowRight,
  Percent,
  Building2,
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
  const [dateRange, setDateRange] = useState("all");
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
        <div className="p-3 sm:p-4 lg:p-5 bg-transparent">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-5">
            
            {/* Header Skeleton */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 animate-pulse">
              <div className="space-y-2">
                <div className="h-7 w-56 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                <div className="h-4 w-72 sm:w-96 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
              </div>
            </div>

            {/* Live System Health Widget Skeleton */}
            <div className="rounded-lg p-4 sm:p-5 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Filter Bar Skeleton */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200 dark:border-slate-800 animate-pulse flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex items-center space-x-3">
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
              </div>
              <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                  </div>
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                </div>
              ))}
            </div>

            {/* Charts Section Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                  </div>
                  <div className="h-64 w-full bg-slate-100 dark:bg-slate-800/40 rounded-md flex items-end p-3 space-x-3">
                    {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                      <div key={bar} className="flex-1 bg-slate-200 dark:bg-slate-800 rounded" style={{ height: `${Math.random() * 60 + 30}%` }}></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 animate-pulse">
              {/* Age Distribution Skeleton */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                <div className="h-64 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full border-8 border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-transparent"></div>
                  </div>
                </div>
              </div>

              {/* Quick Stats Skeleton */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div key={idx} className="flex justify-between items-center py-1">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                        <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      </div>
                      <div className="h-3.5 w-10 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity Skeleton */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="flex items-center space-x-3 py-1">
                    <div className="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                    <div className="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
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
        <div className="p-3 sm:p-4 lg:p-5 bg-transparent">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-center h-80">
              <div className="text-center p-4">
                <div className="text-rose-500 font-semibold mb-1.5">Error Loading Dashboard</div>
                <div className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  {error}
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="px-4 py-2 bg-[#0067A1] text-white text-xs font-semibold rounded-md hover:bg-[#004F7C] transition-colors cursor-pointer"
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
      <div className="p-3 sm:p-4 lg:p-5 bg-transparent">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="space-y-5 p-3 sm:p-5">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h4 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
                  Medical Dashboard
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                  Comprehensive overview of your healthcare facility
                </p>
              </div>
            </div>

            {/* System Health Widget */}
            {healthData && (
              <div
                onClick={() => router.push("/admin/operations?tab=health")}
                className={`transition-colors cursor-pointer rounded-lg p-4 sm:p-5 border ${
                  healthData.status === "HEALTHY"
                    ? "bg-emerald-500/[0.04] border-emerald-500/30 hover:border-emerald-500/50 dark:border-emerald-500/20 dark:hover:border-emerald-500/40"
                    : "bg-rose-500/[0.04] border-rose-500/30 hover:border-rose-500/50 dark:border-rose-500/20 dark:hover:border-rose-500/40"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        healthData.status === "HEALTHY" ? "bg-emerald-400" : "bg-rose-400"
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        healthData.status === "HEALTHY" ? "bg-emerald-500" : "bg-rose-500"
                      }`}></span>
                    </span>
                    <Zap size={18} className={healthData.status === "HEALTHY" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
                    <span className="font-bold tracking-tight text-[#0067A1] dark:text-[#0080C6]">Live System Health</span>
                  </h3>
                  <span className={`px-3 py-1 text-xs font-bold tracking-wide rounded-md text-white ${
                    healthData.status === "HEALTHY" ? "bg-emerald-600" : "bg-rose-600"
                  }`}>
                    {healthData.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Outbox Pending */}
                  <div className="p-3.5 rounded-md transition-colors border bg-[#0080C6]/[0.05] border-[#0067A1]/20 hover:bg-[#0080C6]/[0.08] dark:bg-teal-950/20 dark:border-teal-800/30 flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-[#004F7C] dark:text-[#0080C6] uppercase tracking-wider flex items-center gap-1.5">
                      <Inbox size={13} className="text-[#0067A1] dark:text-[#0080C6]"/> Outbox Pending
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-[#004F7C] dark:text-teal-200">
                      {healthData.outbox.pending}
                    </span>
                  </div>

                  {/* P1 Incidents */}
                  <div className={`p-3.5 rounded-md transition-colors border flex flex-col gap-1 ${
                    healthData.incidents.p1_open > 0
                      ? "bg-rose-500/[0.06] border-rose-500/30 hover:bg-rose-500/[0.1] dark:bg-rose-950/30 dark:border-rose-800/40 animate-pulse"
                      : "bg-emerald-500/[0.05] border-emerald-500/20 hover:bg-emerald-500/[0.08] dark:bg-emerald-950/20 dark:border-emerald-800/30"
                  }`}>
                    <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      healthData.incidents.p1_open > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
                    }`}>
                      <AlertTriangle size={13} className={healthData.incidents.p1_open > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}/> P1 Incidents
                    </span>
                    <span className={`text-xl sm:text-2xl font-bold ${
                      healthData.incidents.p1_open > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-800 dark:text-emerald-200"
                    }`}>
                      {healthData.incidents.p1_open}
                    </span>
                  </div>

                  {/* DLQ Items */}
                  <div className={`p-3.5 rounded-md transition-colors border flex flex-col gap-1 ${
                    healthData.dead_letter_queue.unreplayed > 0
                      ? "bg-amber-500/[0.06] border-amber-500/30 hover:bg-amber-500/[0.1] dark:bg-amber-950/30 dark:border-amber-800/40"
                      : "bg-emerald-500/[0.05] border-emerald-500/20 hover:bg-emerald-500/[0.08] dark:bg-emerald-950/20 dark:border-emerald-800/30"
                  }`}>
                    <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      healthData.dead_letter_queue.unreplayed > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                    }`}>
                      <AlertTriangle size={13} className={healthData.dead_letter_queue.unreplayed > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}/> DLQ Items
                    </span>
                    <span className={`text-xl sm:text-2xl font-bold ${
                      healthData.dead_letter_queue.unreplayed > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-800 dark:text-emerald-200"
                    }`}>
                      {healthData.dead_letter_queue.unreplayed}
                    </span>
                  </div>

                  {/* Worker Failed */}
                  <div className={`p-3.5 rounded-md transition-colors border flex flex-col gap-1 ${
                    (healthData.worker_logs?.[0]?.items_failed || 0) > 0
                      ? "bg-rose-500/[0.06] border-rose-500/30 hover:bg-rose-500/[0.1] dark:bg-rose-950/30 dark:border-rose-800/40"
                      : "bg-emerald-500/[0.05] border-emerald-500/20 hover:bg-emerald-500/[0.08] dark:bg-emerald-950/20 dark:border-emerald-800/30"
                  }`}>
                    <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      (healthData.worker_logs?.[0]?.items_failed || 0) > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
                    }`}>
                      <XCircle size={13} className={(healthData.worker_logs?.[0]?.items_failed || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}/> Worker Failed
                    </span>
                    <span className={`text-xl sm:text-2xl font-bold ${
                      (healthData.worker_logs?.[0]?.items_failed || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-800 dark:text-emerald-200"
                    }`}>
                      {healthData.worker_logs?.[0]?.items_failed || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mr-1">
                    <Filter size={17} />
                    <span>Filters</span>
                  </h2>

                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  {dateRange === "custom" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                      />
                      <span className="text-slate-500 text-xs">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={fetchDashboardData}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw size={15} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  onClick={() => stat.link && router.push(stat.link)}
                  className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                        {stat.title}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1.5">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`${stat.color} p-2.5 sm:p-3 rounded-md text-white`}>
                      {stat.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Diagnostic Lab Analytics Card */}
            {dashboardData?.labAnalytics && (
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4 sm:space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-md bg-[#0067A1]/10 text-[#0067A1]">
                      <FlaskConical className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>Diagnostic Lab Revenue & Analytics</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Category-based platform commissions (Cat 1: 50%, Cat 2: 40%, Cat 3: 30%, Cat 4: 5%, Packages: 50%)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Link
                      href="/admin/labs/categories"
                      className="text-xs text-slate-600 dark:text-slate-300 hover:text-[#0067A1] font-medium flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>Rates</span>
                    </Link>
                    <Link
                      href="/admin/labs/orders"
                      className="text-xs bg-[#0067A1] text-white px-3.5 py-1.5 rounded-md font-semibold hover:bg-[#004F7C] transition-colors flex items-center gap-1.5"
                    >
                      <span>Manage Lab Orders</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  {/* Total Orders */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Orders</p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {dashboardData.labAnalytics.totalOrders || 0}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {dashboardData.labAnalytics.paidOrdersCount || 0} Paid orders
                    </p>
                  </div>

                  {/* Fulfillment Method */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fulfillment Type</p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {dashboardData.labAnalytics.homeCollectionCount || 0}
                      <span className="text-xs font-normal text-slate-500 ml-1">Home</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {dashboardData.labAnalytics.walkInCount || 0} Walk-in visits
                    </p>
                  </div>

                  {/* Gross Lab Volume */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gross Booking Volume</p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      ₹{(dashboardData.labAnalytics.grossRevenue || 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Total patient billed
                    </p>
                  </div>

                  {/* Admin Net Commission (Platform Revenue) */}
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-3.5 sm:p-4 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold">Admin Lab Revenue</p>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-200 px-1.5 py-0.5 rounded font-bold">Platform Cut</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      ₹{(dashboardData.labAnalytics.revenue || 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      Earned platform commission
                    </p>
                  </div>

                  {/* Lab Partner Payouts */}
                  <div className="bg-blue-50/70 dark:bg-blue-950/20 p-3.5 sm:p-4 rounded-md border border-blue-200 dark:border-blue-900/40">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-blue-800 dark:text-blue-300 font-bold">Lab Partner Payouts</p>
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded font-bold">Partner Cut</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                      ₹{(dashboardData.labAnalytics.labPayouts || 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                      Payable to partner labs
                    </p>
                  </div>
                </div>

                {/* Popular tests list */}
                {dashboardData.labAnalytics.popularTests && dashboardData.labAnalytics.popularTests.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5">🔥 Most Frequently Booked Tests</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
                      {dashboardData.labAnalytics.popularTests.map((t, idx) => (
                        <div key={idx} className="flex flex-col bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-800 text-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Rank #{idx+1}</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate" title={t.name}>{t.name}</span>
                          <span className="text-xs sm:text-sm font-bold text-[#0067A1] dark:text-[#0080C6] mt-0.5">{t.count} bookings</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {/* Appointments Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                    <Calendar size={18} />
                    <span>Weekly Appointments</span>
                  </h3>
                  <span className="text-xs sm:text-sm text-green-600 font-semibold">
                    +18% growth
                  </span>
                </div>
                <div className="h-72 sm:h-80">
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
                        className="text-xs"
                        tick={{ fill: "#6B7280" }}
                      />
                      <YAxis className="text-xs" tick={{ fill: "#6B7280" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="appointments"
                        name="Total Appointments"
                        fill="#0067A1"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="completed"
                        name="Completed"
                        fill="#148F86"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                    <IndianRupee size={18} />
                    <span>Revenue Trend</span>
                  </h3>
                  <span className="text-xs sm:text-sm text-green-600 font-semibold">
                    +23% growth
                  </span>
                </div>
                <div className="h-72 sm:h-80">
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
                        className="text-xs"
                        tick={{ fill: "#6B7280" }}
                      />
                      <YAxis
                        className="text-xs"
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
                        strokeWidth={2.5}
                        dot={{ fill: "#0067A1", strokeWidth: 2, r: 3.5 }}
                        activeDot={{ r: 5, fill: "#073834" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Additional Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {/* Patient Age Distribution */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                    <UserCheck size={18} />
                    <span>Patient Age Distribution</span>
                  </h3>
                </div>
                <div className="h-72 sm:h-80">
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
                        outerRadius={75}
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
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-slate-200 dark:border-slate-800">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center space-x-2">
                  <Activity size={18} />
                  <span>Quick Stats</span>
                </h3>
                <div className="space-y-3">
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
                      className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                          {stat.icon}
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                          {stat.label}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Recent Activity
                </h3>
                <button
                  onClick={() => router.push("/admin/audit-logs")}
                  className="text-xs font-bold text-[#0067A1] hover:text-[#004F7C] dark:text-[#0080C6] dark:hover:text-teal-300 transition-colors cursor-pointer"
                >
                  View All Logs
                </button>
              </div>
              <div className="space-y-2.5">
                {dashboardData?.activity?.slice(0, 5).map((activity, index) => (
                  <div
                    key={index}
                    onClick={() => activity.link && router.push(activity.link)}
                    className="flex items-center space-x-3.5 p-2.5 sm:p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-colors cursor-pointer"
                    title={`Click to view details in ${activity.link?.replace('/admin/', '') || 'logs'}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        activity.status === "completed"
                          ? "bg-green-500"
                          : activity.status === "booked"
                          ? "bg-[#0080C6]"
                          : activity.status === "cancelled"
                          ? "bg-red-500"
                          : "bg-gray-500"
                      }`}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {activity.action}
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                        by {activity.user}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
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
