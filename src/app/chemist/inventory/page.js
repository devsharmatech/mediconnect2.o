"use client";

import { useEffect, useState } from "react";
import {
 Pill,
 Layers,
 Clock,
 AlertCircle,
 Calendar,
 Package,
 Search,
 ChevronLeft,
 ChevronRight,
 ChevronsLeft,
 ChevronsRight,
 Plus,
 Eye,
 RefreshCw,
 Filter,
 XCircle,
 TrendingUp,
 AlertTriangle,
 BarChart3,
 Database,
 ShieldAlert
} from "lucide-react";
import { getLoggedInUser } from "@/lib/authHelpers";
import { toast } from "react-hot-toast";

export default function InventoryPage() {
 const [chemist, setChemist] = useState(null);
 const [inventory, setInventory] = useState([]);
 const [loading, setLoading] = useState(true);
 const [isRefreshing, setIsRefreshing] = useState(false);

 // batch modal
 const [showBatchModal, setShowBatchModal] = useState(false);
 const [selectedMedicine, setSelectedMedicine] = useState(null);
 const [batches, setBatches] = useState([]);
 const [batchesLoading, setBatchesLoading] = useState(false);

 // filters & search
 const [search, setSearch] = useState("");
 const [onlyLowStock, setOnlyLowStock] = useState(false);
 const [onlyNearExpiry, setOnlyNearExpiry] = useState(false);
 const [expandedFilters, setExpandedFilters] = useState(false);

 // pagination
 const [pagination, setPagination] = useState({
 currentPage: 1,
 pageSize: 10,
 totalItems: 0,
 totalPages: 0,
 });

 // stats
 const [stats, setStats] = useState({
 totalMedicines: 0,
 totalBatches: 0,
 expiredItems: 0,
 lowStockCount: 0,
 totalStockValue: 0,
 });

 // load chemist once
 useEffect(() => {
 const u = getLoggedInUser("chemist");
 if (u) {
 setChemist(u);
 }
 }, []);

 // fetch inventory
 const fetchInventory = async (page = 1) => {
 if (!chemist?.id) return;
 setLoading(true);

 try {
 const url = `/api/chemists/inventory?chemist_id=${chemist.id}&page=${page}&limit=${pagination.pageSize}&search=${encodeURIComponent(
 search
 )}`;

 const res = await fetch(url);
 const json = await res.json();

 if (json.success) {
 const data = json.data.data || json.data;
 const pag = json.data?.pagination || json.pagination || {
 page,
 limit: pagination.pageSize,
 total: data.length,
 total_pages: 1,
 };

 // Apply client-side filters if necessary
 let filtered = data;
 if (onlyLowStock) {
 filtered = filtered.filter((m) => Number(m.total_stock || 0) <= Number(m.min_quantity || 0));
 }
 if (onlyNearExpiry) {
 filtered = filtered.filter((m) => Number(m.near_expiry_stock || 0) > 0);
 }

 setInventory(filtered);
 setPagination((p) => ({
 ...p,
 currentPage: pag.page || page,
 totalPages: pag.total_pages || Math.ceil((pag.total || filtered.length) / p.pageSize),
 totalItems: pag.total || filtered.length,
 }));

 // Calculate statistics
 const totalMedicines = pag.total || filtered.length;
 const totalBatches = filtered.reduce((s, m) => s + (m.total_batches || 0), 0);
 const expiredItems = filtered.reduce((s, m) => s + (m.expired_stock || 0), 0);
 const lowStockCount = filtered.filter((m) => Number(m.total_stock || 0) <= Number(m.min_quantity || 0)).length;
 const totalStockValue = filtered.reduce((s, m) => s + (Number(m.total_stock || 0) * Number(m.unit_price || 0)), 0);

 setStats({
 totalMedicines,
 totalBatches,
 expiredItems,
 lowStockCount,
 totalStockValue,
 });
 } else {
 toast.error(json.message || "Failed loading inventory");
 }
 } catch (err) {
 console.error("Fetch inventory error:", err);
 toast.error("Error fetching inventory");
 }

 setLoading(false);
 };

 useEffect(() => {
 if (chemist?.id) fetchInventory(1);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [chemist, onlyLowStock, onlyNearExpiry]);

 // debounce search
 useEffect(() => {
 const t = setTimeout(() => {
 if (chemist?.id) fetchInventory(1);
 }, 450);
 return () => clearTimeout(t);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [search]);

 // view batches for a medicine
 const openBatches = async (medicine) => {
 setSelectedMedicine(medicine);
 setShowBatchModal(true);
 setBatches([]);
 setBatchesLoading(true);

 try {
 const url = `/api/chemists/batches?chemist_id=${chemist.id}&medicine_id=${medicine.medicine_id}&limit=100`;
 const res = await fetch(url);
 const json = await res.json();

 if (json.success) {
 const data = json.data.data || [];
 setBatches(data);
 } else {
 toast.error(json.message || "Failed to load batches");
 }
 } catch (err) {
 console.error("Fetch batches error:", err);
 toast.error("Error fetching batches");
 }

 setBatchesLoading(false);
 };

 const closeBatches = () => {
 setShowBatchModal(false);
 setSelectedMedicine(null);
 setBatches([]);
 };

 // pagination navigation
 const goToPage = (p) => {
 if (p < 1 || p > pagination.totalPages) return;
 fetchInventory(p);
 };

 // format helpers
 const formatDate = (d) => {
 if (!d) return "-";
 const dt = new Date(d);
 return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
 };

 const daysUntil = (d) => {
 if (!d) return Infinity;
 const diff = new Date(d) - new Date();
 return Math.ceil(diff / (1000 * 60 * 60 * 24));
 };

 const formatCurrency = (amount) => {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 minimumFractionDigits: 0,
 }).format(amount);
 };

 const handleRefresh = async () => {
 setIsRefreshing(true);
 await fetchInventory(pagination.currentPage);
 setTimeout(() => setIsRefreshing(false), 500);
 };

 return (
 <div className="p-4 md:p-6 lg:p-8 bg-[#0067A1]/5 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen ">
 
 {/* HEADER */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
 <div className="flex items-center space-x-3 group">
 <div className="w-12 h-12 bg-[#0067A1] text-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
 <Layers size={26} className="group-hover:rotate-12 transition-transform duration-300" />
 </div>
 <div>
 <h1 className="text-2xl sm:text-3xl font-bold text-[#0067A1] dark:text-[#0080C6] animate-pulse-slow">
 Inventory Dashboard
 </h1>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm">
 Real-time inventory tracking and batch management
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <button
 onClick={handleRefresh}
 disabled={isRefreshing || loading}
 className="px-4 py-2.5 bg-[#0067A1] text-white rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl hover:bg-[#004F7C] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
 >
 <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
 <span>Refresh</span>
 </button>
 </div>
 </div>

 {/* STATS CARDS */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-8">
 {/* Total Medicines */}
 <div className="p-5 rounded-2xl bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm font-medium">Total Medicines</p>
 <h2 className="text-2xl md:text-3xl font-bold text-[#003358] dark:text-white mt-1">
 {stats.totalMedicines}
 </h2>
 <p className="text-xs text-[#0067A1] dark:text-[#0080C6] mt-1">Across all batches</p>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0067A1] text-white rounded-xl flex items-center justify-center animate-pulse">
 <Pill size={20} className="md:size-6" />
 </div>
 </div>
 </div>

 {/* Total Batches */}
 <div className="p-5 rounded-2xl bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm font-medium">Total Batches</p>
 <h2 className="text-2xl md:text-3xl font-bold text-[#003358] dark:text-white mt-1">
 {stats.totalBatches}
 </h2>
 <p className="text-xs text-[#0067A1] dark:text-[#0080C6] mt-1">Active inventory</p>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0067A1] text-white rounded-xl flex items-center justify-center animate-bounce-slow">
 <Package size={20} className="md:size-6" />
 </div>
 </div>
 </div>

 {/* Stock Value */}
 <div className="p-5 rounded-2xl bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm font-medium">Stock Value</p>
 <h2 className="text-2xl md:text-3xl font-bold text-[#003358] dark:text-white mt-1">
 {formatCurrency(stats.totalStockValue)}
 </h2>
 <p className="text-xs text-[#0067A1] dark:text-[#0080C6] mt-1">Current inventory</p>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0067A1] text-white rounded-xl flex items-center justify-center">
 <BarChart3 size={20} className="md:size-6" />
 </div>
 </div>
 </div>

 {/* Low Stock */}
 <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-red-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-red-700 dark:text-red-300 text-sm font-medium">Low Stock</p>
 <h2 className="text-2xl md:text-3xl font-bold text-red-900 dark:text-white mt-1">
 {stats.lowStockCount}
 </h2>
 <p className="text-xs text-red-600 dark:text-red-400 mt-1">Need attention</p>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600 text-white rounded-xl flex items-center justify-center animate-pulse">
 <AlertTriangle size={20} className="md:size-6" />
 </div>
 </div>
 </div>

 {/* Expired */}
 <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-amber-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">Expired Stock</p>
 <h2 className="text-2xl md:text-3xl font-bold text-amber-900 dark:text-white mt-1">
 {stats.expiredItems}
 </h2>
 <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Remove from inventory</p>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-600 text-white rounded-xl flex items-center justify-center">
 <ShieldAlert size={20} className="md:size-6" />
 </div>
 </div>
 </div>
 </div>

 {/* SEARCH & FILTERS */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/20 dark:border-gray-700 p-4 md:p-6 mb-6 shadow-lg backdrop-blur-sm bg-opacity-90">
 <div className="flex flex-col lg:flex-row gap-4">
 {/* SEARCH BAR */}
 <div className="relative flex-1 group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0080C6] w-5 h-5 group-focus-within:text-[#004F7C] transition-colors" />
 <input
 type="text"
 placeholder="Search medicines by name, brand, or batch..."
 className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0067A1]/5 dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 focus:ring-2 focus:ring-[#004F7C] focus:border-transparent transition-all shadow-sm"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>

 {/* FILTER BUTTONS */}
 <div className="flex flex-wrap gap-3">
 <button
 onClick={() => setOnlyLowStock(!onlyLowStock)}
 className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 ${onlyLowStock 
 ? 'bg-red-600 text-white shadow-lg' 
 : 'bg-white dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-red-300'}`}
 >
 <AlertCircle className="w-4 h-4" />
 <span className="text-sm font-medium">Low Stock</span>
 {onlyLowStock && (
 <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
 )}
 </button>

 <button
 onClick={() => setOnlyNearExpiry(!onlyNearExpiry)}
 className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 ${onlyNearExpiry 
 ? 'bg-amber-600 text-white shadow-lg' 
 : 'bg-white dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-amber-300'}`}
 >
 <Clock className="w-4 h-4" />
 <span className="text-sm font-medium">Near Expiry</span>
 {onlyNearExpiry && (
 <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
 )}
 </button>

 {/* FILTER TOGGLE */}
 <button
 onClick={() => setExpandedFilters(!expandedFilters)}
 className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 ${expandedFilters 
 ? 'bg-[#0067A1] text-white shadow-lg' 
 : 'bg-white dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
 >
 <Filter className="w-4 h-4" />
 <span className="text-sm font-medium">More Filters</span>
 </button>
 </div>
 </div>

 {/* EXPANDED FILTERS */}
 {expandedFilters && (
 <div className="mt-4 pt-4 border-t border-[#0067A1]/10 dark:border-gray-700 animate-slide-down">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Page Size
 </label>
 <select 
 className="w-full p-2.5 bg-white dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-lg"
 value={pagination.pageSize}
 onChange={(e) => {
 setPagination(p => ({...p, pageSize: parseInt(e.target.value)}));
 fetchInventory(1);
 }}
 >
 <option value="10">10 per page</option>
 <option value="25">25 per page</option>
 <option value="50">50 per page</option>
 <option value="100">100 per page</option>
 </select>
 </div>
 {/* Add more filter options here */}
 </div>
 </div>
 )}
 </div>

 {/* LOADING STATE */}
 {loading && (
 <div className="text-center py-16">
 <div className="w-12 h-12 border-4 border-[#004F7C] border-t-transparent rounded-full animate-spin mx-auto shadow-lg"></div>
 <p className="mt-4 text-lg text-[#004F7C] dark:text-teal-300 font-medium animate-pulse">
 Loading inventory data...
 </p>
 </div>
 )}

 {/* EMPTY STATE */}
 {!loading && inventory.length === 0 && (
 <div className="text-center p-12 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-2xl shadow-lg animate-pulse-slow">
 <Layers className="w-16 h-16 text-[#0080C6] mx-auto mb-4 animate-bounce" />
 <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
 No Inventory Found
 </h3>
 <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
 Try adjusting your filters or add new batches to populate your inventory.
 </p>
 <button
 onClick={handleRefresh}
 className="px-6 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
 >
 Refresh Data
 </button>
 </div>
 )}

 {/* INVENTORY TABLE */}
 {!loading && inventory.length > 0 && (
 <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#0067A1]/20 dark:border-gray-700 shadow-lg overflow-hidden animate-slide-up">
 <div className="overflow-x-auto">
 <table className="w-full min-w-[800px]">
 <thead className="bg-[#0067A1]/5 dark:bg-gray-800">
 <tr>
 <th className="p-4 text-left font-semibold text-[#003358] dark:text-teal-300">Medicine Details</th>
 <th className="p-4 text-left font-semibold text-[#003358] dark:text-teal-300">Stock Status</th>
 <th className="p-4 text-left font-semibold text-[#003358] dark:text-teal-300">Batches</th>
 <th className="p-4 text-left font-semibold text-[#003358] dark:text-teal-300">Expiry Status</th>
 <th className="p-4 text-left font-semibold text-[#003358] dark:text-teal-300">Actions</th>
 </tr>
 </thead>

 <tbody className="divide-y dark:divide-gray-700">
 {inventory.map((item, index) => {
 const totalStock = Number(item.total_stock || 0);
 const nearExpiry = Number(item.near_expiry_stock || 0);
 const expired = Number(item.expired_stock || 0);
 const minQty = Number(item.min_quantity || 0);
 const isLow = minQty > 0 && totalStock <= minQty;
 const stockPercentage = minQty > 0 ? Math.min((totalStock / minQty) * 100, 100) : 100;

 return (
 <tr 
 key={item.medicine_id} 
 className="hover:bg-gradient-to-r hover:bg-[#004F7C]/5 dark:hover:from-gray-800/50 dark:hover:to-gray-900/50 transition-all duration-200 animate-fade-in"
 style={{ animationDelay: `${index * 50}ms` }}
 >
 {/* Medicine Details */}
 <td className="p-4">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-[#0067A1] rounded-lg flex items-center justify-center text-white shadow">
 <Pill size={18} />
 </div>
 <div className="min-w-0">
 <div className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</div>
 <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
 {item.brand || "No brand"} • {item.strength || "N/A"}
 </div>
 {item.category && (
 <span className="inline-block mt-1 px-2 py-0.5 bg-[#0067A1]/10 dark:bg-[#003358]/30 text-[#004F7C] dark:text-teal-300 text-xs rounded-full">
 {item.category}
 </span>
 )}
 </div>
 </div>
 </td>

 {/* Stock Status */}
 <td className="p-4">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className={`font-bold ${isLow ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
 {totalStock} units
 </span>
 {isLow && (
 <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full animate-pulse">
 Low Stock
 </span>
 )}
 </div>
 {minQty > 0 && (
 <div className="w-full bg-[#0067A1]/10 dark:bg-gray-700 rounded-full h-2">
 <div 
 className={`h-2 rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
 style={{ width: `${stockPercentage}%` }}
 ></div>
 </div>
 )}
 {minQty > 0 && (
 <div className="text-xs text-gray-500 dark:text-gray-400">
 Minimum: {minQty} units
 </div>
 )}
 </div>
 </td>

 {/* Batches */}
 <td className="p-4">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 bg-[#0067A1] text-white rounded-lg flex items-center justify-center">
 <Package size={16} />
 </div>
 <div>
 <div className="font-semibold text-gray-900 dark:text-white">{item.total_batches || 0}</div>
 <div className="text-xs text-gray-500 dark:text-gray-400">Active batches</div>
 </div>
 </div>
 </td>

 {/* Expiry Status */}
 <td className="p-4">
 <div className="space-y-2">
 {nearExpiry > 0 && (
 <div className="flex items-center gap-2">
 <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
 <span className="text-amber-700 dark:text-amber-300 font-medium">{nearExpiry}</span>
 <span className="text-xs text-gray-500 dark:text-gray-400">near expiry</span>
 </div>
 )}
 {expired > 0 && (
 <div className="flex items-center gap-2">
 <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
 <span className="text-red-700 dark:text-red-300 font-medium">{expired}</span>
 <span className="text-xs text-gray-500 dark:text-gray-400">expired</span>
 </div>
 )}
 {nearExpiry === 0 && expired === 0 && (
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 bg-green-500 rounded-full"></div>
 <span className="text-sm text-green-600 dark:text-green-400">All good</span>
 </div>
 )}
 </div>
 </td>

 {/* Actions */}
 <td className="p-4">
 <button
 onClick={() => openBatches(item)}
 className="px-4 py-2 bg-[#0067A1] text-white rounded-xl flex items-center gap-2 shadow hover:shadow-lg hover:bg-[#004F7C] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 group"
 >
 <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
 <span className="text-sm font-medium">View Batches</span>
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* PAGINATION */}
 <div className="p-4 border-t dark:border-gray-700 bg-[#0067A1]/5 dark:bg-gray-800/30">
 <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
 {/* Left */}
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Showing {(pagination.currentPage - 1) * pagination.pageSize + 1}–
 {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)}{" "}
 of {pagination.totalItems} items
 </p>

 {/* Center */}
 <div className="flex items-center gap-1">
 <button
 onClick={() => goToPage(1)}
 disabled={pagination.currentPage === 1}
 className="p-2 rounded-lg hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:scale-105 active:scale-95"
 aria-label="First page"
 >
 <ChevronsLeft size={18} />
 </button>
 <button
 onClick={() => goToPage(pagination.currentPage - 1)}
 disabled={pagination.currentPage === 1}
 className="p-2 rounded-lg hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:scale-105 active:scale-95"
 aria-label="Previous page"
 >
 <ChevronLeft size={18} />
 </button>

 <div className="flex items-center gap-1 mx-2">
 <span className="text-sm text-gray-600 dark:text-gray-400">Page</span>
 <span className="px-3 py-1 bg-[#004F7C] text-white rounded-lg font-medium">
 {pagination.currentPage}
 </span>
 <span className="text-sm text-gray-600 dark:text-gray-400">of {pagination.totalPages}</span>
 </div>

 <button
 onClick={() => goToPage(pagination.currentPage + 1)}
 disabled={pagination.currentPage === pagination.totalPages}
 className="p-2 rounded-lg hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:scale-105 active:scale-95"
 aria-label="Next page"
 >
 <ChevronRight size={18} />
 </button>
 <button
 onClick={() => goToPage(pagination.totalPages)}
 disabled={pagination.currentPage === pagination.totalPages}
 className="p-2 rounded-lg hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:scale-105 active:scale-95"
 aria-label="Last page"
 >
 <ChevronsRight size={18} />
 </button>
 </div>

 {/* Right */}
 <select
 value={pagination.pageSize}
 onChange={(e) => {
 setPagination(p => ({...p, pageSize: parseInt(e.target.value)}));
 fetchInventory(1);
 }}
 className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-lg text-sm"
 >
 <option value="10">10 per page</option>
 <option value="25">25 per page</option>
 <option value="50">50 per page</option>
 </select>
 </div>
 </div>
 </div>
 )}

 {/* BATCHES MODAL */}
 {showBatchModal && selectedMedicine && (
 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
 <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
 {/* Modal Header */}
 <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-6 flex justify-between items-center z-10">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-[#0067A1] text-white rounded-lg flex items-center justify-center">
 <Pill size={20} />
 </div>
 <div>
 <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedMedicine.name}</h2>
 <p className="text-sm text-gray-500 dark:text-gray-400">
 {selectedMedicine.brand || ""} • {selectedMedicine.strength || ""} • {selectedMedicine.category || ""}
 </p>
 </div>
 </div>
 <button
 onClick={closeBatches}
 className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors hover:scale-110"
 >
 <XCircle size={24} />
 </button>
 </div>

 {/* Modal Body */}
 <div className="p-6">
 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-[#004F7C] dark:text-teal-300 font-medium">Total Stock</p>
 <h3 className="text-2xl font-bold text-[#003358] dark:text-white mt-1">
 {Number(selectedMedicine.total_stock || 0)}
 </h3>
 </div>
 <Package className="w-8 h-8 text-[#0067A1] dark:text-[#0080C6]" />
 </div>
 </div>

 <div className="p-4 rounded-xl bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-gray-700">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Near Expiry</p>
 <h3 className="text-2xl font-bold text-amber-900 dark:text-white mt-1">
 {Number(selectedMedicine.near_expiry_stock || 0)}
 </h3>
 </div>
 <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
 </div>
 </div>

 <div className="p-4 rounded-xl bg-red-50 dark:bg-gray-800 border border-red-200 dark:border-gray-700">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-red-700 dark:text-red-300 font-medium">Expired</p>
 <h3 className="text-2xl font-bold text-red-900 dark:text-white mt-1">
 {Number(selectedMedicine.expired_stock || 0)}
 </h3>
 </div>
 <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
 </div>
 </div>
 </div>

 {/* Batches Table */}
 <div className="overflow-hidden rounded-xl border border-[#0067A1]/20 dark:border-gray-700">
 <div className="bg-[#0067A1]/5 dark:bg-gray-800 p-4">
 <h3 className="font-semibold text-[#003358] dark:text-teal-300">Batch Details</h3>
 </div>
 
 {batchesLoading ? (
 <div className="text-center py-12">
 <div className="w-8 h-8 border-4 border-[#004F7C] border-t-transparent rounded-full animate-spin mx-auto"></div>
 <p className="mt-4 text-[#004F7C] dark:text-teal-300">Loading batches...</p>
 </div>
 ) : batches.length === 0 ? (
 <div className="text-center py-12">
 <Package className="w-12 h-12 text-[#0080C6] mx-auto mb-4" />
 <p className="text-gray-600 dark:text-gray-400">No batches found for this medicine</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-[#0067A1]/5 dark:bg-gray-800/50">
 <tr>
 <th className="p-3 text-left font-medium text-[#003358] dark:text-teal-300">Batch No</th>
 <th className="p-3 text-left font-medium text-[#003358] dark:text-teal-300">Expiry Date</th>
 <th className="p-3 text-left font-medium text-[#003358] dark:text-teal-300">Status</th>
 <th className="p-3 text-left font-medium text-[#003358] dark:text-teal-300">Stock Qty</th>
 <th className="p-3 text-left font-medium text-[#003358] dark:text-teal-300">Added On</th>
 </tr>
 </thead>
 <tbody className="divide-y dark:divide-gray-700">
 {batches.map((batch, index) => {
 const days = daysUntil(batch.expiry_date);
 const near = days <= 30 && days >= 0;
 const expired = days < 0;
 const statusColor = expired ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
 near ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';

 return (
 <tr 
 key={batch.id} 
 className="hover:bg-[#004F7C]/5 dark:hover:bg-gray-800/30 transition-colors animate-fade-in"
 style={{ animationDelay: `${index * 30}ms` }}
 >
 <td className="p-3 font-medium text-gray-900 dark:text-white">
 {batch.batch_no}
 </td>
 <td className="p-3">
 <div className="space-y-1">
 <div>{formatDate(batch.expiry_date)}</div>
 <div className={`text-xs px-2 py-1 rounded-full ${statusColor} inline-block`}>
 {expired ? 'Expired' : near ? `${days} days left` : `${days} days left`}
 </div>
 </div>
 </td>
 <td className="p-3">
 <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
 {expired ? 'Expired' : near ? 'Near Expiry' : 'Active'}
 </span>
 </td>
 <td className="p-3 font-semibold text-gray-900 dark:text-white">
 {batch.stock_qty} units
 </td>
 <td className="p-3 text-gray-500 dark:text-gray-400">
 {formatDate(batch.created_at)}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Modal Footer */}
 <div className="mt-6 pt-6 border-t dark:border-gray-700 flex justify-end">
 <button
 onClick={closeBatches}
 className="px-5 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all duration-300 hover:scale-105 active:scale-95"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Add custom animation styles */}
 <style jsx global>{`
 @keyframes slideUp {
 from { transform: translateY(10px); opacity: 0; }
 to { transform: translateY(0); opacity: 1; }
 }
 @keyframes slideDown {
 from { transform: translateY(-10px); opacity: 0; }
 to { transform: translateY(0); opacity: 1; }
 }
 @keyframes fadeIn {
 from { opacity: 0; }
 to { opacity: 1; }
 }
 @keyframes gradient {
 0% { background-position: 0% 50%; }
 50% { background-position: 100% 50%; }
 100% { background-position: 0% 50%; }
 }
 @keyframes pulse-slow {
 0%, 100% { opacity: 1; }
 50% { opacity: 0.8; }
 }
 @keyframes bounce-slow {
 0%, 100% { transform: translateY(0); }
 50% { transform: translateY(-5px); }
 }
 . {
 background-size: 200% 200%;
 animation: gradient 15s ease infinite;
 }
 .animate-slide-up {
 animation: slideUp 0.3s ease-out;
 }
 .animate-slide-down {
 animation: slideDown 0.2s ease-out;
 }
 .animate-fade-in {
 animation: fadeIn 0.2s ease-out;
 }
 .animate-pulse-slow {
 animation: pulse-slow 2s ease-in-out infinite;
 }
 .animate-bounce-slow {
 animation: bounce-slow 2s ease-in-out infinite;
 }
 `}</style>
 </div>
 );
}