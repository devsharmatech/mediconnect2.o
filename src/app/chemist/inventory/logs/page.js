"use client";

import { useEffect, useState } from "react";
import {
 ClipboardList,
 Search,
 Filter,
 RefreshCw,
 ArrowUpCircle,
 ArrowDownCircle,
 MinusCircle,
 AlertTriangle,
 ClipboardCheck,
 Calendar,
 ChevronsLeft,
 ChevronsRight,
 ChevronLeft,
 ChevronRight,
 Info,
} from "lucide-react";

import { getLoggedInUser } from "@/lib/authHelpers";
import toast from "react-hot-toast";

export default function LogsPage() {
 const [chemist, setChemist] = useState(null);

 const [logs, setLogs] = useState([]);
 const [loading, setLoading] = useState(true);

 const [search, setSearch] = useState("");
 const [typeFilter, setTypeFilter] = useState("all");
 const [fromDate, setFromDate] = useState("");
 const [toDate, setToDate] = useState("");

 const [pagination, setPagination] = useState({
 page: 1,
 limit: 20,
 total: 0,
 total_pages: 0,
 });

 // TYPE CONFIG
 const typeConfig = {
 stock_in: {
 label: "Stock In",
 icon: <ArrowUpCircle className="w-4 h-4" />,
 badge: "bg-green-100 text-green-700",
 },
 stock_out: {
 label: "Stock Out",
 icon: <ArrowDownCircle className="w-4 h-4" />,
 badge: "bg-red-100 text-red-700",
 },
 order_used: {
 label: "Order Used",
 icon: <ClipboardCheck className="w-4 h-4" />,
 badge: "bg-[#0067A1]/10 text-[#004F7C]",
 },
 expired: {
 label: "Expired",
 icon: <AlertTriangle className="w-4 h-4" />,
 badge: "bg-orange-100 text-orange-700",
 },
 adjustment: {
 label: "Adjustment",
 icon: <MinusCircle className="w-4 h-4" />,
 badge: "bg-gray-200 text-gray-700",
 },
 };

 // Load chemist
 useEffect(() => {
 const u = getLoggedInUser("chemist");
 if (u) setChemist(u);
 }, []);

 // Fetch logs
 const fetchLogs = async (page = 1) => {
 if (!chemist?.id) return;

 setLoading(true);

 const params = new URLSearchParams({
 chemist_id: chemist.id,
 page,
 limit: pagination.limit,
 });

 if (typeFilter !== "all") params.set("change_type", typeFilter);
 if (search) params.set("search", search);
 if (fromDate) params.set("from_date", fromDate);
 if (toDate) params.set("to_date", toDate);

 try {
 const res = await fetch(`/api/chemists/logs?${params.toString()}`);
 const json = await res.json();

 if (json.status || json.success) {
 setLogs(json.data.logs);
 setPagination(json.data.pagination);
 } else {
 toast.error(json.message || "Failed to load logs");
 }
 } catch (err) {
 console.log(err);
 toast.error("Error fetching logs");
 }

 setLoading(false);
 };

 useEffect(() => {
 if (chemist?.id) fetchLogs(1);
 }, [chemist]);

 // Debounce Search + Filters
 useEffect(() => {
 const delay = setTimeout(() => {
 fetchLogs(1);
 }, 400);
 return () => clearTimeout(delay);
 }, [search, typeFilter, fromDate, toDate]);

 // Helpers
 const formatDate = (d) =>
 new Date(d).toLocaleDateString("en-IN", {
 day: "numeric",
 month: "short",
 year: "numeric",
 });

 const formatTime = (d) =>
 new Date(d).toLocaleTimeString("en-IN", {
 hour: "2-digit",
 minute: "2-digit",
 });

 // Pagination Controls
 const goToPage = (p) => {
 if (p < 1 || p > pagination.total_pages) return;
 fetchLogs(p);
 };

 return (
 <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
 {/* HEADER */}
 <div className="flex justify-between items-center mb-8">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-[#0067A1] text-white rounded-xl flex items-center justify-center shadow-xl">
 <ClipboardList size={24} />
 </div>
 <div>
 <h1 className="text-3xl font-bold text-[#003358] dark:text-white">
 Stock Logs
 </h1>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm">
 View complete history of inventory changes
 </p>
 </div>
 </div>

 <button
 onClick={() => fetchLogs(pagination.page)}
 className="px-4 py-2 bg-[#0067A1] text-white rounded-xl flex items-center gap-2 shadow-lg"
 >
 <RefreshCw className="w-4 h-4" />
 Refresh
 </button>
 </div>

 {/* FILTERS BOX */}
 <div className="bg-white dark:bg-gray-800 border border-[#0067A1]/10 dark:border-gray-700 rounded-xl p-6 shadow mb-8">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 {/* Search */}
 <div className="relative col-span-1">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0080C6]" />
 <input
 type="text"
 placeholder="Search medicine, batch..."
 className="w-full pl-12 pr-4 py-3 bg-[#0067A1]/5 dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>

 {/* Type Filter */}
 <select
 value={typeFilter}
 onChange={(e) => setTypeFilter(e.target.value)}
 className="px-4 py-3 bg-[#0067A1]/5 dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl"
 >
 <option value="all">All Types</option>
 {Object.keys(typeConfig).map((t) => (
 <option key={t} value={t}>
 {typeConfig[t].label}
 </option>
 ))}
 </select>

 {/* From Date */}
 <div className="flex items-center gap-2">
 <Calendar className="w-5 h-5 text-teal-500" />
 <input
 type="date"
 value={fromDate}
 onChange={(e) => setFromDate(e.target.value)}
 className="flex-1 px-3 py-2 bg-[#0067A1]/5 dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl"
 />
 </div>

 {/* To Date */}
 <div className="flex items-center gap-2">
 <Calendar className="w-5 h-5 text-teal-500" />
 <input
 type="date"
 value={toDate}
 onChange={(e) => setToDate(e.target.value)}
 className="flex-1 px-3 py-2 bg-[#0067A1]/5 dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl"
 />
 </div>
 </div>
 </div>

 {/* LOADING */}
 {loading && (
 <div className="text-center py-20">
 <div className="w-12 h-12 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin mx-auto"></div>
 <p className="mt-4 text-[#004F7C] dark:text-teal-300">Loading logs…</p>
 </div>
 )}

 {/* NO DATA */}
 {!loading && logs.length === 0 && (
 <div className="bg-white dark:bg-gray-800 p-10 rounded-xl border border-[#0067A1]/10 dark:border-gray-700 text-center shadow">
 <Info className="w-12 h-12 text-teal-500 mx-auto mb-4" />
 <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
 No logs found
 </h2>
 <p className="text-gray-500 dark:text-gray-400 mt-2">
 Try changing filters or search terms.
 </p>
 </div>
 )}

 {/* TABLE */}
 {!loading && logs.length > 0 && (
 <div className="bg-white dark:bg-gray-900 rounded-xl border border-[#0067A1]/10 dark:border-gray-700 shadow overflow-hidden">
 <table className="w-full">
 <thead className="bg-[#0067A1]/5 dark:bg-gray-800 border-b dark:border-gray-700">
 <tr>
 <th className="p-4 text-left text-sm font-semibold">Type</th>
 <th className="p-4 text-left text-sm font-semibold">
 Medicine
 </th>
 <th className="p-4 text-left text-sm font-semibold">Batch</th>
 <th className="p-4 text-left text-sm font-semibold">Qty</th>
 <th className="p-4 text-left text-sm font-semibold">Reason</th>
 <th className="p-4 text-left text-sm font-semibold">Date</th>
 </tr>
 </thead>

 <tbody className="divide-y dark:divide-gray-700">
 {logs.map((log) => {
 const type = typeConfig[log.change_type];

 return (
 <tr
 key={log.id}
 className="hover:bg-[#004F7C]/5 dark:hover:bg-gray-800 transition"
 >
 {/* Type */}
 <td className="p-4">
 <span
 className={`px-3 py-1 rounded-full inline-flex items-center gap-2 text-sm ${type.badge}`}
 >
 {type.icon}
 {type.label}
 </span>
 </td>

 {/* Medicine */}
 <td className="p-4">
 <p className="font-medium text-gray-800 dark:text-white">
 {log.medicine?.name || "Unknown"}
 </p>
 <p className="text-xs text-gray-500">
 {log.medicine?.brand} • {log.medicine?.strength}
 </p>
 </td>

 {/* Batch */}
 <td className="p-4">
 {log.batch ? (
 <>
 <p className="font-semibold">{log.batch.batch_no}</p>
 <p className="text-xs text-gray-500">
 Exp: {log.batch.expiry_date}
 </p>
 </>
 ) : (
 <span className="text-gray-500 text-sm">N/A</span>
 )}
 </td>

 {/* Qty */}
 <td className="p-4">
 <span
 className={`font-bold ${
 log.change_type === "stock_in"
 ? "text-green-600"
 : log.change_type === "stock_out" ||
 log.change_type === "order_used"
 ? "text-red-600"
 : "text-gray-600"
 }`}
 >
 {log.change_type === "stock_in" ? "+" : "-"}
 {log.qty_changed}
 </span>
 </td>

 {/* Reason */}
 <td className="p-4 text-gray-700 dark:text-gray-300">
 {log.reason || "—"}
 </td>

 {/* DATE */}
 <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">
 {formatDate(log.created_at)}{" "}
 <span className="text-xs">
 {formatTime(log.created_at)}
 </span>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}

 {/* PAGINATION */}
 {!loading && pagination.total_pages > 1 && (
 <div className="flex justify-center items-center gap-3 mt-8">
 <button
 onClick={() => goToPage(1)}
 disabled={pagination.page === 1}
 className="p-2 rounded-lg bg-[#0067A1]/10 dark:bg-gray-700 disabled:opacity-40"
 >
 <ChevronsLeft className="w-4 h-4" />
 </button>

 <button
 onClick={() => goToPage(pagination.page - 1)}
 disabled={pagination.page === 1}
 className="p-2 rounded-lg bg-[#0067A1]/10 dark:bg-gray-700 disabled:opacity-40"
 >
 <ChevronLeft className="w-4 h-4" />
 </button>

 <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
 Page {pagination.page} of {pagination.total_pages}
 </div>

 <button
 onClick={() => goToPage(pagination.page + 1)}
 disabled={pagination.page === pagination.total_pages}
 className="p-2 rounded-lg bg-[#0067A1]/10 dark:bg-gray-700 disabled:opacity-40"
 >
 <ChevronRight className="w-4 h-4" />
 </button>

 <button
 onClick={() => goToPage(pagination.total_pages)}
 disabled={pagination.page === pagination.total_pages}
 className="p-2 rounded-lg bg-[#0067A1]/10 dark:bg-gray-700 disabled:opacity-40"
 >
 <ChevronsRight className="w-4 h-4" />
 </button>
 </div>
 )}
 </div>
 );
}
