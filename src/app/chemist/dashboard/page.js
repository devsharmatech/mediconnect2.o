"use client";

import { useEffect, useState, useRef } from "react";
import {
 ClipboardList,
 Pill,
 Clock,
 CheckCircle2,
 TrendingUp,
 TrendingDown,
 RefreshCw,
 Eye,
 Filter,
 Download,
 Plus,
 ShoppingCart,
 FileText,
 Truck,
 Users,
 Beaker,
 ChevronRight,
 AlertCircle,
 Calendar,
 BarChart3,
 LineChart as LineChartIcon,
 PieChart as PieChartIcon,
 BarChart as BarChartIcon,
 Activity,
 Package,
 AlertTriangle,
 DollarSign,
 Target,
 Zap,
 MoreVertical,
 AlertOctagon,
 MapPin
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { getLoggedInUser } from "@/lib/authHelpers";
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

export default function ChemistDashboard() {
 const router = useRouter();
 const chemist = getLoggedInUser("chemist");
 const [loading, setLoading] = useState(true);
 const [dashboard, setDashboard] = useState(null);
 const [timeRange, setTimeRange] = useState("30d");
 const [chartType, setChartType] = useState("line");
 const didFetch = useRef(false);

  // Broadcasts state
  const [broadcasts, setBroadcasts] = useState([]);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  const fetchBroadcasts = async () => {
    if (!chemist?.id) return;
    try {
      const res = await fetch("/api/chemists/order/get-broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chemist_id: chemist.id }),
      });
      const result = await res.json();
      if (result.success) {
        setBroadcasts(result.data);
      }
    } catch (err) {
      console.error("Error fetching broadcasts:", err);
    }
  };

  useEffect(() => {
    if (chemist?.id) {
      fetchBroadcasts();
      const interval = setInterval(fetchBroadcasts, 5000); // Poll active broadcasts every 5 seconds
      return () => clearInterval(interval);
    }
  }, [chemist?.id]);

  const handleSubmitQuote = async (broadcastId) => {
    if (!estimatedCost || !deliveryTime) {
      toast.error("Please enter both cost and estimated delivery time");
      return;
    }
    try {
      setIsSubmittingQuote(true);
      const res = await fetch("/api/chemists/order/submit-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broadcast_id: broadcastId,
          chemist_id: chemist.id,
          estimated_cost: parseFloat(estimatedCost),
          delivery_time_minutes: parseInt(deliveryTime, 10),
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Quote submitted successfully!");
        setEstimatedCost("");
        setDeliveryTime("");
        fetchBroadcasts();
      } else {
        toast.error(result.message || "Failed to submit quote");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting quote");
    } finally {
      setIsSubmittingQuote(false);
    }
  };

 useEffect(() => {
 if (!chemist?.id) {
 toast.error("Chemist not found. Please login again.");
 router.push("/auth/login");
 return;
 }

 if (!didFetch.current) {
 didFetch.current = true;
 fetchDashboard();
 }
 }, [chemist?.id, timeRange]);

 const fetchDashboard = async () => {
 try {
 setLoading(true);
 const res = await fetch("/api/chemists/dashboard", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 chemist_id: chemist.id,
 time_range: timeRange
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
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 minimumFractionDigits: 0,
 maximumFractionDigits: 0
 }).format(amount);
 };

 const formatDate = (dateString) => {
 return new Date(dateString).toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 year: 'numeric'
 });
 };

 const getStatusColor = (status) => {
 const colors = {
 'completed': 'bg-emerald-500 dark:bg-emerald-600',
 'ready_for_pickup': 'bg-[#0080C6] dark:bg-[#0067A1]',
 'out_for_delivery': 'bg-indigo-500 dark:bg-indigo-600',
 'pending': 'bg-amber-500 dark:bg-amber-600',
 'sent_to_chemist': 'bg-cyan-500 dark:bg-cyan-600',
 'approved': 'bg-green-500 dark:bg-green-600',
 'rejected': 'bg-red-500 dark:bg-red-600',
 'cancelled': 'bg-gray-500 dark:bg-gray-600'
 };
 return colors[status] || 'bg-gray-500 dark:bg-gray-600';
 };

 const getStatusText = (status) => {
 const texts = {
 'completed': 'Completed',
 'ready_for_pickup': 'Ready for Pickup',
 'out_for_delivery': 'Out for Delivery',
 'pending': 'Pending',
 'sent_to_chemist': 'Sent to Chemist',
 'approved': 'Approved',
 'rejected': 'Rejected',
 'cancelled': 'Cancelled'
 };
 return texts[status] || status.replace(/_/g, ' ');
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
 <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
 {payload.map((entry, index) => (
 <div key={index} className="flex items-center justify-between gap-4 mb-1">
 <div className="flex items-center gap-2">
 <div
 className="w-3 h-3 rounded-full"
 style={{ backgroundColor: entry.color }}
 />
 <span className="text-sm text-gray-600 dark:text-gray-400">{entry.dataKey}:</span>
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
 <p className="font-semibold text-gray-900 dark:text-gray-100">{data.name}</p>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 {data.value} items ({data.percentage}%)
 </p>
 </div>
 );
 }
 return null;
 };

 if (loading) {
 return (
 <div className="min-h-screen dark:bg-gray-900 p-6 flex items-center justify-center">
 <div className="text-center">
 <div className="flex justify-center mb-6">
 <div className="w-16 h-16 border-4 border-[#0067A1]/20 dark:border-[#0067A1]/40 border-t-[#0067A1] dark:border-t-teal-400 rounded-full animate-spin"></div>
 </div>
 <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Loading your dashboard...</p>
 <p className="text-sm text-gray-500 dark:text-gray-400">Fetching latest chemist insights</p>
 </div>
 </div>
 );
 }

 if (!dashboard) {
 return (
 <div className="min-h-screen dark:bg-gray-900 p-6">
 <div className="mx-auto">
 <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
 <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
 <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Dashboard Unavailable</h2>
 <p className="text-gray-600 dark:text-gray-400 mb-6">We couldn't load your dashboard data.</p>
 <button
 onClick={fetchDashboard}
 className="px-6 py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-xl font-medium transition-colors duration-200 flex items-center gap-2 mx-auto"
 >
 <RefreshCw className="w-4 h-4" />
 Try Again
 </button>
 </div>
 </div>
 </div>
 );
 }

 const { chemist: chemistInfo, stats, recent_orders, daily_revenue, medicine_distribution, status_distribution, low_stock_medicines } = dashboard;
 const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#84cc16', '#ef4444'];

 return (
 <div className="min-h-screen dark:bg-gray-900 p-4 md:p-6 transition-colors duration-200">


 {/* HEADER */}
 <div className="mx-auto">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
 <div className="flex items-center gap-4">
 <div className="relative">
 <div className="w-16 h-16 bg-[#0067A1] text-white rounded-2xl flex items-center justify-center shadow-xl">
 <Beaker className="w-8 h-8" />
 </div>
 <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
 <Zap className="w-3 h-3 text-white" />
 </div>
 </div>
 <div>
 <h1 className="text-3xl md:text-4xl font-bold text-[#0067A1] dark:text-[#0080C6]">
 Chemist Dashboard
 </h1>
 <div className="flex items-center gap-2 mt-1">
 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
 <p className="text-[#0067A1]/80 dark:text-teal-300">
 Welcome back, <span className="font-semibold">{chemistInfo?.pharmacy_name || chemistInfo?.store_name || "Your Pharmacy"}</span>
 </p>
 {chemistInfo?.gstin && (
 <span className="text-xs px-2 py-1 bg-[#0067A1]/10 dark:bg-[#0067A1]/30 text-[#0067A1] dark:text-teal-300 rounded-full">
 GST: {chemistInfo.gstin}
 </span>
 )}
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
 <option key={range.id} value={range.id}>{range.label}</option>
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
 <button className="px-4 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-xl font-medium transition-colors duration-200 flex items-center gap-2">
 <Download className="w-4 h-4" />
 Export
 </button>
 </div>
 </div>

 {/* STATS GRID */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 {/* Total Orders */}
 <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-[#0067A1]/10 dark:bg-[#0067A1]/30 rounded-xl">
 <ClipboardList className="w-6 h-6 text-[#0067A1] dark:text-[#0080C6]" />
 </div>
 <div className="text-right">
 <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</div>
 <div className="text-xs text-gray-400 dark:text-gray-500">{timeRanges.find(r => r.id === timeRange)?.label}</div>
 </div>
 </div>
 <h3 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">{stats.total_orders}</h3>
 <div className="flex items-center gap-2">
 <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
 <div
 className="h-full bg-[#0067A1] rounded-full transition-all duration-500"
 style={{ width: `${Math.min(100, (stats.total_orders / 1000) * 100)}%` }}
 />
 </div>
 <Activity className="w-4 h-4 text-[#0067A1] dark:text-[#0080C6]" />
 </div>
 </div>

 {/* Pending Orders */}
 <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
 <Clock className="w-6 h-6 text-amber-600 dark:text-amber-500" />
 </div>
 <div className="text-right">
 <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</div>
 <div className="text-xs text-gray-400 dark:text-gray-500">Requires action</div>
 </div>
 </div>
 <h3 className="text-4xl font-bold text-amber-600 dark:text-amber-500 mb-2">{stats.pending_orders}</h3>
 <div className="flex items-center gap-2">
 <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
 <div
 className="h-full bg-amber-400 rounded-full transition-all duration-500"
 style={{ width: `${Math.min(100, (stats.pending_orders / stats.total_orders) * 100 || 0)}%` }}
 />
 </div>
 <span className="text-xs font-medium text-amber-600 dark:text-amber-500">
 {stats.pending_orders > 0 ? "Action required" : "All clear"}
 </span>
 </div>
 </div>

 {/* Completed Orders */}
 <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
 <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
 </div>
 <div className="text-right">
 <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</div>
 <div className="text-xs text-gray-400 dark:text-gray-500">Success rate</div>
 </div>
 </div>
 <h3 className="text-4xl font-bold text-emerald-600 dark:text-emerald-500 mb-2">{stats.completed_orders}</h3>
 <div className="flex items-center gap-2">
 <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
 <div
 className="h-full bg-emerald-400 rounded-full transition-all duration-500"
 style={{ width: `${Math.min(100, (stats.completed_orders / stats.total_orders) * 100 || 0)}%` }}
 />
 </div>
 <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
 {Math.round((stats.completed_orders / stats.total_orders) * 100 || 0)}%
 </span>
 </div>
 </div>

 {/* Revenue */}
 <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
 <DollarSign className="w-6 h-6 text-violet-600 dark:text-violet-500" />
 </div>
 <div className="text-right">
 <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue</div>
 <div className="text-xs text-gray-400 dark:text-gray-500">Last {timeRanges.find(r => r.id === timeRange)?.label}</div>
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
 <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">vs previous period</span>
 </div>
 </div>
 </div>

 {/* MAIN CHART SECTION */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
 {/* REVENUE CHART */}
 <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
 <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
 <div>
 <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
 <TrendingUp className="w-5 h-5 text-[#0067A1] dark:text-[#0080C6]" />
 Revenue Trend
 </h2>
 <p className="text-gray-500 dark:text-gray-400 text-sm">Daily revenue over time</p>
 </div>

 <div className="flex items-center gap-2 mt-4 md:mt-0">
 <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex">
 {chartTypes.map((type) => (
 <button
 key={type.id}
 onClick={() => setChartType(type.id)}
 className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${chartType === type.id
 ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
 : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
 }`}
 >
 {type.icon}
 {type.label}
 </button>
 ))}
 </div>
 </div>
 </div>

 <div className="h-80 flex items-center justify-center">
    {daily_revenue?.length > 0 ? (
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "line" ? (
          <LineChart data={daily_revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.1} />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#4b5563' }}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#4b5563' }}
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
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.1} />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#4b5563' }}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#4b5563' }}
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
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1} />
              </linearGradient>
            </defs>
          </AreaChart>
        ) : (
          <BarChart data={daily_revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.1} />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#4b5563' }}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#4b5563' }}
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
        )}
      </ResponsiveContainer>
    ) : (
      <div className="flex flex-col items-center justify-center">
        <BarChart3 className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">No revenue data available</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Complete orders will appear here</p>
      </div>
    )}
  </div>
 </div>

 {/* MEDICINE DISTRIBUTION PIE CHART */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
 <Pill className="w-5 h-5 text-purple-600 dark:text-purple-400" />
 Medicine Distribution
 </h2>
 <p className="text-gray-500 dark:text-gray-400 text-sm">By category</p>
 </div>
 <Users className="w-5 h-5 text-gray-400 dark:text-gray-600" />
 </div>

 <div className="h-64 flex items-center justify-center">
    {medicine_distribution && medicine_distribution.length > 0 ? (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 20, right: 120, bottom: 20, left: 120 }}>
          <Pie
            data={medicine_distribution}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, percentage }) => `${name} (${percentage}%)`}
            outerRadius={65}
            fill="#8884d8"
            dataKey="value"
          >
            {medicine_distribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    ) : (
      <div className="flex flex-col items-center justify-center">
        <PieChartIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No medicine data available</p>
      </div>
    )}
  </div>

 <div className="grid grid-cols-2 gap-3 mt-4">
 {medicine_distribution?.slice(0, 4).map((item, index) => (
 <div key={index} className="flex items-center gap-2">
 <div
 className="w-3 h-3 rounded-full"
 style={{ backgroundColor: COLORS[index % COLORS.length] }}
 />
 <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
 <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-auto">
 {item.value}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>

  {/* Incoming Broadcast Requests (Active Searches) */}
  {broadcasts && broadcasts.length > 0 && (
    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-teal-100 dark:border-teal-900/50 p-6 mb-8 shadow-md">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-[#0067A1] rounded-xl flex items-center justify-center animate-pulse">
          <Pill className="text-white w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#003358] dark:text-[#0080C6]">
            Incoming Broadcast Requests (Active Searches)
          </h2>
          <p className="text-[#004F7C] dark:text-teal-300 text-xs">
            Submit a quote to participate in the order selection window.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {broadcasts.map((b) => (
          <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-teal-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-800 dark:text-white text-sm">
                    {b.patient_name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-[#004F7C] dark:bg-[#003358]/40 dark:text-teal-300 font-medium">
                    2m Window
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{b.seconds_remaining}s left</span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-start space-x-2 text-xs">
                  <MapPin className="w-4 h-4 text-[#0067A1] mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                    {b.delivery_address}
                  </span>
                </div>

                <div className="bg-teal-50/50 dark:bg-gray-700/30 rounded-lg p-3 mt-3">
                  <p className="text-[11px] font-bold text-[#003358] dark:text-[#0080C6] uppercase tracking-wider mb-2">
                    Prescribed Medicines
                  </p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {b.medicines.map((med, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{med.name} {med.strength ? `(${med.strength})` : ""}</span>
                        <span className="text-gray-500 dark:text-gray-400 font-semibold">Qty: {med.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
              {b.already_quoted ? (
                <div className="flex items-center justify-center p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submitted Quote: ₹{b.submitted_quote?.estimated_cost} • Delivery: {b.submitted_quote?.delivery_time_minutes} mins</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Estimated Cost (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 620"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Delivery ETA (Mins)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 30"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    disabled={isSubmittingQuote}
                    onClick={() => handleSubmitQuote(b.id)}
                    className="px-4 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-1 shadow-sm h-[34px] disabled:opacity-50"
                  >
                    <span>Submit Quote</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

 {/* RECENT ORDERS & LOW STOCK MEDICINES */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
 {/* RECENT ORDERS */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
 <Package className="w-5 h-5 text-[#0067A1] dark:text-[#0080C6]" />
 Recent Orders
 <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
 Last 10 orders
 </span>
 </h2>
 <button
 onClick={() => router.push('/chemist/orders')}
 className="text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300 font-medium text-sm flex items-center gap-1 group"
 >
 View All
 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
 </button>
 </div>

 <div className="space-y-4">
 {recent_orders?.length > 0 ? (
 recent_orders.slice(0, 5).map((order) => (
 <div
 key={order.id}
 className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#0067A1]/30 dark:hover:border-teal-700 hover:bg-[#004F7C]/5 dark:hover:bg-[#003358]/20 transition-all duration-200 cursor-pointer"
 onClick={() => router.push(`/chemist/orders/${order.id}`)}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className={`p-2 rounded-lg ${order.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
 {order.status === 'completed' ? (
 <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
 ) : (
 <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
 )}
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="font-bold text-gray-900 dark:text-gray-100">#{order.id?.substring(0, 8)}</span>
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)} text-white`}>
 {getStatusText(order.status)}
 </span>
 </div>
 <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
 <Users className="w-3 h-3" />
 {order.patient_details?.full_name || "Unknown Customer"}
 {order.items_count > 0 && (
 <span className="ml-2 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded">
 {order.items_count} item{order.items_count !== 1 ? 's' : ''}
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
 <p className="text-gray-500 dark:text-gray-400">No recent orders</p>
 <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Orders will appear here when received</p>
 </div>
 )}
 </div>
 </div>

 {/* LOW STOCK MEDICINES */}
 <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl shadow-xl p-6 border border-amber-200 dark:border-amber-800">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
 Low Stock Alert
 {stats.low_stock_count > 0 && (
 <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs rounded-full">
 {stats.low_stock_count} items
 </span>
 )}
 </h2>
 <button
 onClick={() => router.push('/chemist/inventory')}
 className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium text-sm flex items-center gap-1 group"
 >
 Manage
 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
 </button>
 </div>

 {low_stock_medicines?.length > 0 ? (
 <div className="space-y-4">
 {low_stock_medicines.slice(0, 5).map((medicine, index) => (
 <div key={index} className="flex items-center justify-between p-3 bg-white/50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
 <Pill className="w-4 h-4 text-amber-600 dark:text-amber-400" />
 </div>
 <div>
 <p className="font-medium text-gray-900 dark:text-amber-100">
 {medicine.medicine?.name || 'Unknown Medicine'}
 </p>
 <p className="text-xs text-gray-600 dark:text-amber-300">
 {medicine.medicine?.brand || 'No brand'}
 </p>
 </div>
 </div>
 <div className="text-right">
 <div className={`text-lg font-bold ${medicine.total_stock <= 5 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
 {medicine.total_stock}
 </div>
 <div className="text-xs text-gray-500 dark:text-amber-400">in stock</div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-8">
 <CheckCircle2 className="w-12 h-12 text-emerald-400 dark:text-emerald-500 mx-auto mb-3" />
 <p className="text-gray-700 dark:text-gray-300 font-medium">All medicines in stock</p>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No low stock alerts</p>
 </div>
 )}

 <div className="mt-6 pt-4 border-t border-amber-200 dark:border-amber-700">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-amber-700 dark:text-amber-300">Total Medicines</p>
 <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
 {stats.total_medicines}
 </p>
 </div>
 <div className="text-right">
 <p className="text-sm text-amber-700 dark:text-amber-300">Stock Health</p>
 <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
 {stats.low_stock_count === 0 ? 'Excellent' : 'Needs Attention'}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* QUICK ACTIONS */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8 hidden">
 <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
 <Zap className="w-5 h-5 text-amber-600 dark:text-amber-500" />
 Quick Actions
 </h2>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <button
 onClick={() => router.push('/chemist/orders/new')}
 className="p-4 bg-[#0067A1]/5 dark:bg-[#0067A1]/20 border border-[#0067A1]/10 dark:border-[#0067A1]/30 rounded-xl hover:shadow-md transition-shadow duration-200 text-left group"
 >
 <div className="flex items-center justify-between mb-2">
 <div className="p-2 bg-[#0067A1]/10 dark:bg-[#0067A1]/40 rounded-lg">
 <Plus className="w-5 h-5 text-[#0067A1] dark:text-[#0080C6]" />
 </div>
 <ChevronRight className="w-4 h-4 text-[#0067A1]/60 group-hover:translate-x-1 transition-transform" />
 </div>
 <h3 className="font-semibold text-gray-900 dark:text-gray-100">New Order</h3>
 <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Create manual order</p>
 </button>

 <button
 onClick={() => router.push('/chemist/inventory')}
 className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:shadow-md transition-shadow duration-200 text-left group"
 >
 <div className="flex items-center justify-between mb-2">
 <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
 <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
 </div>
 <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
 </div>
 <h3 className="font-semibold text-gray-900 dark:text-gray-100">Restock</h3>
 <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage inventory</p>
 </button>

 <button
 onClick={() => router.push('/chemist/invoices')}
 className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl hover:shadow-md transition-shadow duration-200 text-left group"
 >
 <div className="flex items-center justify-between mb-2">
 <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
 <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
 </div>
 <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
 </div>
 <h3 className="font-semibold text-gray-900 dark:text-gray-100">Invoices</h3>
 <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">View & manage bills</p>
 </button>

 <button
 onClick={() => router.push('/chemist/delivery')}
 className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl hover:shadow-md transition-shadow duration-200 text-left group"
 >
 <div className="flex items-center justify-between mb-2">
 <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
 <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
 </div>
 <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
 </div>
 <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delivery</h3>
 <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track shipments</p>
 </button>
 </div>
 </div>

 {/* FOOTER */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <p className="text-sm text-gray-500 dark:text-gray-400">
 Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </p>
 <p className="text-gray-800 dark:text-gray-300 font-medium">
 {stats.total_orders > 0 ? 'All systems operational' : 'Ready for orders'} • Next data refresh in 5 minutes
 </p>
 </div>
 <div className="mt-6 flex justify-end">
 <button
 onClick={fetchDashboard}
 className="px-4 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-xl font-medium transition-colors duration-200 flex items-center gap-2"
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