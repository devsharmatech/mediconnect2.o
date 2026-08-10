"use client";

import { useEffect, useState } from "react";
import {
 Layers,
 Pill,
 Calendar,
 Plus,
 Edit3,
 Trash2,
 XCircle,
 Search,
 AlertCircle,
 Clock,
 ChevronLeft,
 ChevronRight,
 ChevronsLeft,
 ChevronsRight,
 Filter,
 RefreshCw,
 Package,
 TrendingUp,
 BarChart3,
 ShieldAlert,
 ArrowRight,
 Download,
 Upload
} from "lucide-react";

import { getLoggedInUser } from "@/lib/authHelpers";
import toast from "react-hot-toast";

export default function BatchesPage() {
 const [chemist, setChemist] = useState(null);
 const [batches, setBatches] = useState([]); // Array of batches with medicine info
 const [search, setSearch] = useState("");
 const [filterExpired, setFilterExpired] = useState(false);
 const [filterNearExpiry, setFilterNearExpiry] = useState(false);
 const [expandedFilters, setExpandedFilters] = useState(false);
 const [loading, setLoading] = useState(true);
 const [isRefreshing, setIsRefreshing] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);

 const [pagination, setPagination] = useState({
 currentPage: 1,
 pageSize: 10,
 totalItems: 0,
 totalPages: 0,
 });

 // Modal States
 const [showModal, setShowModal] = useState(false);
 const [showMedicineSelectModal, setShowMedicineSelectModal] = useState(false);
 const [medicinesList, setMedicinesList] = useState([]);
 const [isEdit, setIsEdit] = useState(false);
 const [selectedMedicine, setSelectedMedicine] = useState(null);
 const [batchForm, setBatchForm] = useState({
 id: null,
 batch_no: "",
 expiry_date: "",
 stock_qty: "",
 purchase_price: "",
 selling_price: "",
 });

 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [deleteBatchId, setDeleteBatchId] = useState(null);
 const [stats, setStats] = useState({
 totalBatches: 0,
 totalStock: 0,
 expiredBatches: 0,
 nearExpiryBatches: 0,
 });

 // --------------------------------------------
 // Load logged-in chemist
 // --------------------------------------------
 useEffect(() => {
 const u = getLoggedInUser("chemist");
 if (u) setChemist(u);
 }, []);

 // --------------------------------------------
 // Group batches by medicine for display
 // --------------------------------------------
 const groupBatchesByMedicine = (batchesData) => {
 const grouped = {};
 
 batchesData.forEach(batch => {
 const medicineId = batch.medicine_id;
 if (!grouped[medicineId]) {
 grouped[medicineId] = {
 medicine_id: medicineId,
 medicine: batch.medicine || {},
 batches: []
 };
 }
 grouped[medicineId].batches.push(batch);
 });
 
 return Object.values(grouped);
 };

 // --------------------------------------------
 // Fetch Medicines List for Selection
 // --------------------------------------------
 const fetchMedicinesList = async () => {
 if (!chemist?.id) return;
 
 try {
 const res = await fetch(`/api/chemists/medicines?chemist_id=${chemist.id}&limit=100`);
 const json = await res.json();
 if (json.success) {
 setMedicinesList(json.data.data || []);
 } else {
 toast.error(json.message || "Failed to load medicines");
 }
 } catch (err) {
 console.error("Fetch medicines error:", err);
 toast.error("Error loading medicines");
 }
 };

 // --------------------------------------------
 // Get Medicine ID from batch or medicine object
 // --------------------------------------------
 const getMedicineId = (item) => {
 // If it's a batch, get medicine_id
 if (item?.medicine_id) return item.medicine_id;
 // If it's a medicine object, get id
 if (item?.id) return item.id;
 return null;
 };

 // --------------------------------------------
 // Fetch Batches
 // --------------------------------------------
 const fetchBatches = async (page = 1) => {
 if (!chemist?.id) return;

 setLoading(true);

 try {
 const url = `/api/chemists/batches?chemist_id=${
 chemist.id
 }&page=${page}&limit=${pagination.pageSize}&search=${encodeURIComponent(
 search
 )}`;

 const res = await fetch(url);
 const json = await res.json();

 console.log("Batches API Response:", json); // Debug log

 if (json.success) {
 const batchesData = json.data.data || [];
 
 // Apply client-side filters
 let filteredBatches = batchesData;
 
 if (filterExpired) {
 filteredBatches = filteredBatches.filter(batch => {
 const expiry = new Date(batch.expiry_date);
 return expiry < new Date();
 });
 }
 
 if (filterNearExpiry) {
 filteredBatches = filteredBatches.filter(batch => {
 const expiry = new Date(batch.expiry_date);
 const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
 return daysLeft <= 30 && daysLeft >= 0;
 });
 }

 setBatches(filteredBatches);

 setPagination({
 currentPage: json.data.pagination?.page || page,
 pageSize: json.data.pagination?.limit || pagination.pageSize,
 totalItems: json.data.pagination?.total || 0,
 totalPages: json.data.pagination?.total_pages || 1,
 });

 // Calculate statistics from ALL batches (not filtered)
 const now = new Date();
 
 const totalBatches = batchesData.length;
 const totalStock = batchesData.reduce((sum, b) => sum + (Number(b.stock_qty) || 0), 0);
 const expiredBatches = batchesData.filter(b => {
 const expiry = new Date(b.expiry_date);
 return expiry < now;
 }).length;
 const nearExpiryBatches = batchesData.filter(b => {
 const expiry = new Date(b.expiry_date);
 const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
 return daysLeft <= 30 && daysLeft >= 0;
 }).length;

 setStats({
 totalBatches,
 totalStock,
 expiredBatches,
 nearExpiryBatches,
 });
 } else {
 toast.error(json.message || "Error loading batches");
 }
 } catch (err) {
 console.error("Fetch batches error:", err);
 toast.error("Error loading batches");
 }

 setLoading(false);
 };

 useEffect(() => {
 if (chemist?.id) {
 fetchBatches(1);
 fetchMedicinesList();
 }
 }, [chemist, filterExpired, filterNearExpiry]);

 // Debounced search
 useEffect(() => {
 const t = setTimeout(() => {
 if (chemist?.id) fetchBatches(1);
 }, 400);
 return () => clearTimeout(t);
 }, [search]);

 const handleRefresh = async () => {
 setIsRefreshing(true);
 await fetchBatches(pagination.currentPage);
 setTimeout(() => setIsRefreshing(false), 500);
 };

 // --------------------------------------------
 // Open Add Batch Modal (Global Button)
 // --------------------------------------------
 const openGlobalAddModal = async () => {
 await fetchMedicinesList();
 if (medicinesList.length === 0) {
 toast.error("No medicines found. Please add medicines first.");
 return;
 }
 setShowMedicineSelectModal(true);
 };

 // --------------------------------------------
 // Modal: Add / Edit Batch
 // --------------------------------------------
 const openAddModal = (medicine) => {
 console.log("Opening add modal for medicine:", medicine); // Debug log
 
 if (!medicine?.id) {
 toast.error("Invalid medicine selected - missing medicine ID");
 return;
 }
 
 setSelectedMedicine(medicine);
 setIsEdit(false);
 setBatchForm({
 id: null,
 batch_no: "",
 expiry_date: "",
 stock_qty: "",
 purchase_price: "",
 selling_price: "",
 });
 setShowModal(true);
 };

 const openEditModal = (batch) => {
 console.log("Opening edit modal for batch:", batch); // Debug log
 
 if (!batch?.id) {
 toast.error("Invalid batch selected");
 return;
 }
 
 setSelectedMedicine(batch.medicine || { id: batch.medicine_id });
 setIsEdit(true);
 setBatchForm({
 id: batch.id,
 batch_no: batch.batch_no || "",
 expiry_date: batch.expiry_date ? new Date(batch.expiry_date).toISOString().split('T')[0] : "",
 stock_qty: batch.stock_qty || "",
 purchase_price: batch.purchase_price || "",
 selling_price: batch.selling_price || "",
 });
 setShowModal(true);
 };

 const saveBatch = async () => {
 console.log("Saving batch with form:", batchForm); // Debug log
 console.log("Selected medicine:", selectedMedicine); // Debug log
 
 if (!batchForm.batch_no?.trim()) {
 toast.error("Batch number is required");
 return;
 }
 
 if (!batchForm.expiry_date) {
 toast.error("Expiry date is required");
 return;
 }
 
 if (!batchForm.stock_qty || Number(batchForm.stock_qty) <= 0) {
 toast.error("Valid stock quantity is required");
 return;
 }

 const medicineId = selectedMedicine?.id || selectedMedicine?.medicine_id;
 console.log("Medicine ID for saving:", medicineId); // Debug log
 
 if (!medicineId) {
 toast.error("No medicine selected or invalid medicine ID");
 return;
 }

 setIsSubmitting(true);

 const payload = {
 ...batchForm,
 chemist_id: chemist.id,
 medicine_id: medicineId,
 stock_qty: Number(batchForm.stock_qty),
 purchase_price: batchForm.purchase_price ? Number(batchForm.purchase_price) : null,
 selling_price: batchForm.selling_price ? Number(batchForm.selling_price) : null,
 };

 console.log("Payload being sent:", payload); // Debug log

 const method = isEdit ? "PUT" : "POST";

 try {
 const res = await fetch("/api/chemists/batches", {
 method,
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(payload),
 });

 const json = await res.json();
 console.log("Save batch response:", json); // Debug log

 if (json.success) {
 toast.success(isEdit ? "Batch updated successfully!" : "Batch added successfully!");
 setShowModal(false);
 fetchBatches(pagination.currentPage);
 } else {
 toast.error(json.message || "Failed to save batch");
 }
 } catch (err) {
 console.error("Save batch error:", err);
 toast.error("Error saving batch");
 } finally {
 setIsSubmitting(false);
 }
 };

 // --------------------------------------------
 // Delete Batch
 // --------------------------------------------
 const confirmDelete = (batchId) => {
 setDeleteBatchId(batchId);
 setShowDeleteConfirm(true);
 };

 const deleteBatch = async () => {
 if (!deleteBatchId) return;

 try {
 const res = await fetch(`/api/chemists/batches?id=${deleteBatchId}`, {
 method: "DELETE",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ chemist_id: chemist.id }),
 });

 const json = await res.json();

 if (json.success) {
 toast.success("Batch deleted successfully!");
 fetchBatches(pagination.currentPage);
 } else {
 toast.error(json.message || "Failed to delete batch");
 }
 } catch (err) {
 console.error("Delete batch error:", err);
 toast.error("Error deleting batch");
 }

 setShowDeleteConfirm(false);
 setDeleteBatchId(null);
 };

 // --------------------------------------------
 // Helpers
 // --------------------------------------------
 const formatDate = (d) => {
 if (!d) return "-";
 try {
 return new Date(d).toLocaleDateString("en-IN", {
 day: "numeric",
 month: "short",
 year: "numeric",
 });
 } catch {
 return "-";
 }
 };

 const daysLeft = (exp) => {
 if (!exp) return Infinity;
 try {
 return Math.ceil((new Date(exp) - new Date()) / (1000 * 60 * 60 * 24));
 } catch {
 return Infinity;
 }
 };

 const formatCurrency = (amount) => {
 if (!amount) return "₹0";
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 minimumFractionDigits: 0,
 maximumFractionDigits: 2,
 }).format(amount);
 };

 const paginate = (p) => {
 if (p >= 1 && p <= pagination.totalPages) {
 fetchBatches(p);
 }
 };

 const generatePageNumbers = () => {
 const pages = [];
 const total = pagination.totalPages;
 const current = pagination.currentPage;

 if (total <= 7) {
 for (let i = 1; i <= total; i++) pages.push(i);
 } else {
 pages.push(1);
 let start = Math.max(2, current - 1);
 let end = Math.min(total - 1, current + 1);

 if (start > 2) pages.push("...");
 for (let i = start; i <= end; i++) pages.push(i);
 if (end < total - 1) pages.push("...");
 if (total > 1) pages.push(total);
 }

 return pages;
 };

 // Group batches by medicine for display
 const groupedBatches = groupBatchesByMedicine(batches);

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
 Batch Management
 </h1>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm">
 Manage medicine batches, expiry, and stock quantities
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <button
 onClick={openGlobalAddModal}
 className="px-4 py-2.5 bg-[#0067A1] text-white rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl hover:bg-[#004F7C] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 group"
 >
 <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
 <span>Add Batch</span>
 </button>
 
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
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
 <div className="p-5 rounded-2xl bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm font-medium">Total Batches</p>
 <h2 className="text-2xl md:text-3xl font-bold text-[#003358] dark:text-white mt-1">
 {stats.totalBatches}
 </h2>
 <p className="text-xs text-[#0067A1] dark:text-[#0080C6] mt-1">Active batches</p>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0067A1] text-white rounded-xl flex items-center justify-center animate-pulse">
 <Package size={20} className="md:size-6" />
 </div>
 </div>
 </div>

 <div className="p-5 rounded-2xl bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm font-medium">Total Stock</p>
 <h2 className="text-2xl md:text-3xl font-bold text-[#003358] dark:text-white mt-1">
 {stats.totalStock}
 </h2>
 <p className="text-xs text-[#0067A1] dark:text-[#0080C6] mt-1">Units across batches</p>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0067A1] text-white rounded-xl flex items-center justify-center animate-bounce-slow">
 <BarChart3 size={20} className="md:size-6" />
 </div>
 </div>
 </div>

 <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-amber-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">Near Expiry</p>
 <h2 className="text-2xl md:text-3xl font-bold text-amber-900 dark:text-white mt-1">
 {stats.nearExpiryBatches}
 </h2>
 <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Within 30 days</p>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-600 text-white rounded-xl flex items-center justify-center">
 <Clock size={20} className="md:size-6" />
 </div>
 </div>
 </div>

 <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-red-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-red-700 dark:text-red-300 text-sm font-medium">Expired</p>
 <h2 className="text-2xl md:text-3xl font-bold text-red-900 dark:text-white mt-1">
 {stats.expiredBatches}
 </h2>
 <p className="text-xs text-red-600 dark:text-red-400 mt-1">Remove from inventory</p>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600 text-white rounded-xl flex items-center justify-center">
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
 className="w-full pl-12 pr-4 py-3 bg-[#0067A1]/5 dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#004F7C] focus:border-transparent transition-all shadow-sm"
 placeholder="Search medicines, batch numbers, or brands..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>

 {/* FILTER BUTTONS */}
 <div className="flex flex-wrap gap-3">
 <button
 onClick={() => setFilterExpired(!filterExpired)}
 className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 ${filterExpired 
 ? 'bg-red-600 text-white shadow-lg' 
 : 'bg-white dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-red-300'}`}
 >
 <AlertCircle className="w-4 h-4" />
 <span className="text-sm font-medium">Expired Only</span>
 {filterExpired && (
 <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
 )}
 </button>

 <button
 onClick={() => setFilterNearExpiry(!filterNearExpiry)}
 className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 ${filterNearExpiry 
 ? 'bg-amber-600 text-white shadow-lg' 
 : 'bg-white dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-amber-300'}`}
 >
 <Clock className="w-4 h-4" />
 <span className="text-sm font-medium">Near Expiry</span>
 {filterNearExpiry && (
 <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
 )}
 </button>

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
 fetchBatches(1);
 }}
 >
 <option value="10">10 per page</option>
 <option value="25">25 per page</option>
 <option value="50">50 per page</option>
 <option value="100">100 per page</option>
 </select>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* LOADING STATE */}
 {loading && (
 <div className="text-center py-16">
 <div className="w-12 h-12 border-4 border-[#004F7C] border-t-transparent rounded-full animate-spin mx-auto shadow-lg"></div>
 <p className="mt-4 text-lg text-[#004F7C] dark:text-teal-300 font-medium animate-pulse">
 Loading batches...
 </p>
 </div>
 )}

 {/* EMPTY STATE */}
 {!loading && batches.length === 0 && (
 <div className="text-center p-12 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-2xl shadow-lg animate-pulse-slow">
 <Package className="w-16 h-16 text-[#0080C6] mx-auto mb-4 animate-bounce" />
 <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
 No Batches Found
 </h3>
 <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
 Try adjusting your filters or add new batches to manage your inventory.
 </p>
 <div className="flex flex-col sm:flex-row gap-3 justify-center">
 <button
 onClick={openGlobalAddModal}
 className="px-6 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
 >
 Add Your First Batch
 </button>
 <button
 onClick={handleRefresh}
 className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 text-[#004F7C] dark:text-teal-300 rounded-xl hover:bg-[#004F7C]/5 dark:hover:bg-gray-700 transition-all duration-300"
 >
 Refresh Data
 </button>
 </div>
 </div>
 )}

 {/* BATCHES TABLE VIEW (Changed from grouped view) */}
 {!loading && batches.length > 0 && (
 <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#0067A1]/20 dark:border-gray-700 shadow-lg overflow-hidden animate-slide-up">
 <div className="overflow-x-auto">
 <table className="w-full min-w-[1000px]">
 <thead className="bg-[#0067A1]/5 dark:bg-gray-800">
 <tr>
 <th className="p-4 text-left font-semibold text-[#003358] dark:text-teal-300">Medicine</th>
 <th className="p-4 text-left font-semibold text-[#003358] dark:text-teal-300">Batch Details</th>
 <th className="p-4 text-left font-semibold text-[#003358] dark:text-teal-300">Stock</th>
 <th className="p-4 text-left font-semibold text-[#003358] dark:text-teal-300">Price</th>
 <th className="p-4 text-left font-semibold text-[#003358] dark:text-teal-300">Expiry Status</th>
 <th className="p-4 text-left font-semibold text-[#003358] dark:text-teal-300">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y dark:divide-gray-700">
 {batches.map((batch, index) => {
 const left = daysLeft(batch.expiry_date);
 const expired = left < 0;
 const near = left <= 30 && left >= 0;
 const statusColor = expired 
 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
 : near 
 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
 : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';

 return (
 <tr 
 key={batch.id}
 className="hover:bg-gradient-to-r hover:bg-[#004F7C]/5 dark:hover:from-gray-800/50 dark:hover:to-gray-900/50 transition-all duration-200 animate-fade-in"
 style={{ animationDelay: `${index * 30}ms` }}
 >
 {/* Medicine */}
 <td className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-[#0067A1] rounded-lg flex items-center justify-center text-white shadow">
 <Pill size={18} />
 </div>
 <div className="min-w-0">
 <div className="font-semibold text-gray-900 dark:text-white truncate">
 {batch.medicine?.name || "Unknown Medicine"}
 </div>
 <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
 {batch.medicine?.brand || "No brand"} • {batch.medicine?.strength || "N/A"}
 </div>
 {batch.medicine?.category && (
 <span className="inline-block mt-1 px-2 py-0.5 bg-[#0067A1]/10 dark:bg-[#003358]/30 text-[#004F7C] dark:text-teal-300 text-xs rounded-full">
 {batch.medicine.category}
 </span>
 )}
 </div>
 </div>
 </td>

 {/* Batch Details */}
 <td className="p-4">
 <div>
 <div className="font-semibold text-gray-900 dark:text-white">
 {batch.batch_no || "N/A"}
 </div>
 <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
 Added: {formatDate(batch.created_at)}
 </div>
 </div>
 </td>

 {/* Stock */}
 <td className="p-4">
 <div className="font-bold text-gray-900 dark:text-white">
 {batch.stock_qty || 0}
 </div>
 <div className="text-xs text-gray-500 dark:text-gray-400">
 units
 </div>
 </td>

 {/* Price */}
 <td className="p-4">
 <div className="space-y-1">
 <div className="text-sm">
 <span className="text-gray-500 dark:text-gray-400">Buy: </span>
 <span className="font-medium">
 {formatCurrency(batch.purchase_price)}
 </span>
 </div>
 <div className="text-sm">
 <span className="text-gray-500 dark:text-gray-400">Sell: </span>
 <span className="font-medium text-green-600 dark:text-green-400">
 {formatCurrency(batch.selling_price)}
 </span>
 </div>
 </div>
 </td>

 {/* Expiry Status */}
 <td className="p-4">
 <div className="space-y-2">
 <div>{formatDate(batch.expiry_date)}</div>
 <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor} inline-flex items-center gap-1`}>
 {expired ? (
 <>
 <AlertCircle size={12} /> Expired
 </>
 ) : near ? (
 <>
 <Clock size={12} /> {left} days left
 </>
 ) : (
 "Active"
 )}
 </div>
 </div>
 </td>

 {/* Actions */}
 <td className="p-4">
 <div className="flex gap-2">
 <button
 onClick={() => openEditModal(batch)}
 className="p-2 bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-all duration-300 transform hover:scale-105 active:scale-95 group"
 title="Edit"
 >
 <Edit3 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
 </button>
 <button
 onClick={() => confirmDelete(batch.id)}
 className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 active:scale-95 group"
 title="Delete"
 >
 <Trash2 className="w-4 h-4 group-hover:shake" />
 </button>
 </div>
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
 of {pagination.totalItems} batches
 </p>

 {/* Center */}
 <div className="flex items-center gap-1">
 <button
 onClick={() => paginate(1)}
 disabled={pagination.currentPage === 1}
 className="p-2 rounded-lg hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:scale-105 active:scale-95"
 aria-label="First page"
 >
 <ChevronsLeft size={18} />
 </button>
 <button
 onClick={() => paginate(pagination.currentPage - 1)}
 disabled={pagination.currentPage === 1}
 className="p-2 rounded-lg hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:scale-105 active:scale-95"
 aria-label="Previous page"
 >
 <ChevronLeft size={18} />
 </button>

 {generatePageNumbers().map((n, i) =>
 n === "..." ? (
 <span key={i} className="px-2 text-gray-400">…</span>
 ) : (
 <button
 key={i}
 onClick={() => paginate(n)}
 className={`w-8 h-8 md:w-10 md:h-10 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
 n === pagination.currentPage
 ? "bg-[#0067A1] text-white shadow-lg"
 : "hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
 }`}
 >
 {n}
 </button>
 )
 )}

 <button
 onClick={() => paginate(pagination.currentPage + 1)}
 disabled={pagination.currentPage === pagination.totalPages}
 className="p-2 rounded-lg hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:scale-105 active:scale-95"
 aria-label="Next page"
 >
 <ChevronRight size={18} />
 </button>
 <button
 onClick={() => paginate(pagination.totalPages)}
 disabled={pagination.currentPage === pagination.totalPages}
 className="p-2 rounded-lg hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:scale-105 active:scale-95"
 aria-label="Last page"
 >
 <ChevronsRight size={18} />
 </button>
 </div>

 {/* Right */}
 <div className="text-sm text-gray-600 dark:text-gray-400">
 Page {pagination.currentPage} of {pagination.totalPages}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* MEDICINE SELECTION MODAL */}
 {showMedicineSelectModal && (
 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
 <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto animate-slide-up">
 {/* Modal Header */}
 <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-6 flex justify-between items-center z-10">
 <div>
 <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
 Select Medicine
 </h2>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
 Choose a medicine to add batch
 </p>
 </div>
 <button
 className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors hover:scale-110"
 onClick={() => setShowMedicineSelectModal(false)}
 >
 <XCircle size={24} />
 </button>
 </div>

 {/* Modal Body */}
 <div className="p-6">
 {medicinesList.length === 0 ? (
 <div className="text-center py-12">
 <Package className="w-16 h-16 text-[#0080C6] mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
 No Medicines Found
 </h3>
 <p className="text-gray-600 dark:text-gray-400 mb-6">
 Add medicines first before creating batches.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {medicinesList.map((medicine) => {
 return (
 <button
 key={medicine.id}
 onClick={() => {
 console.log("Selected medicine from list:", medicine); // Debug
 setSelectedMedicine(medicine);
 setShowMedicineSelectModal(false);
 setShowModal(true);
 }}
 className="p-5 text-left rounded-xl border border-[#0067A1]/20 dark:border-gray-700 hover:bg-gradient-to-r hover:bg-[#004F7C]/5 dark:hover:from-gray-800 dark:hover:to-gray-900 hover:border-teal-300 dark:hover:border-[#0067A1] transition-all duration-300 hover:scale-[1.02] group"
 >
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-[#0067A1] text-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
 <Pill size={18} />
 </div>
 <div>
 <div className="font-bold text-gray-900 dark:text-white group-hover:text-[#004F7C] dark:group-hover:text-[#0080C6]">
 {medicine.name}
 </div>
 <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
 {medicine.brand || "No brand"} • {medicine.strength || "N/A"}
 </div>
 {medicine.category && (
 <span className="inline-block mt-2 px-2 py-1 bg-[#0067A1]/10 dark:bg-[#003358]/30 text-[#004F7C] dark:text-teal-300 text-xs rounded-full">
 {medicine.category}
 </span>
 )}
 </div>
 </div>
 <ArrowRight className="w-5 h-5 text-[#0080C6] opacity-0 group-hover:opacity-100 transition-opacity" />
 </div>
 </button>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* ADD / EDIT BATCH MODAL */}
 {showModal && (
 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
 <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
 {/* Modal Header */}
 <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-6 flex justify-between items-center z-10">
 <div>
 <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
 {isEdit ? "Edit Batch" : "Add New Batch"}
 </h2>
 <div className="flex items-center gap-2 mt-1">
 <div className="w-6 h-6 bg-[#0067A1] text-white rounded flex items-center justify-center">
 <Pill size={12} />
 </div>
 <p className="text-sm text-gray-500 dark:text-gray-400">
 {selectedMedicine?.name || "Unknown Medicine"} • {selectedMedicine?.strength || "N/A"}
 </p>
 </div>
 {selectedMedicine && (
 <div className="mt-1 text-xs text-[#0067A1] dark:text-[#0080C6]">
 Medicine ID: {selectedMedicine.id}
 </div>
 )}
 </div>
 <button
 className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors hover:scale-110"
 onClick={() => setShowModal(false)}
 >
 <XCircle size={24} />
 </button>
 </div>

 {/* Modal Body */}
 <div className="p-6">
 <div className="space-y-6">
 {/* Batch Number */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Batch Number *
 </label>
 <input
 type="text"
 className="w-full p-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#004F7C] focus:border-transparent transition-all"
 placeholder="Enter batch number (e.g., BATCH-001)"
 value={batchForm.batch_no}
 onChange={(e) =>
 setBatchForm((f) => ({ ...f, batch_no: e.target.value }))
 }
 />
 </div>

 {/* Expiry Date */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Expiry Date *
 </label>
 <input
 type="date"
 className="w-full p-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#004F7C] focus:border-transparent transition-all"
 value={batchForm.expiry_date}
 onChange={(e) =>
 setBatchForm((f) => ({ ...f, expiry_date: e.target.value }))
 }
 />
 </div>

 {/* Stock Quantity */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Stock Quantity *
 </label>
 <input
 type="number"
 min="1"
 className="w-full p-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#004F7C] focus:border-transparent transition-all"
 placeholder="Enter stock quantity"
 value={batchForm.stock_qty}
 onChange={(e) =>
 setBatchForm((f) => ({ ...f, stock_qty: e.target.value }))
 }
 />
 </div>

 {/* Prices */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Purchase Price (₹)
 </label>
 <input
 type="number"
 min="0"
 step="0.01"
 className="w-full p-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#004F7C] focus:border-transparent transition-all"
 placeholder="Enter purchase price"
 value={batchForm.purchase_price}
 onChange={(e) =>
 setBatchForm((f) => ({
 ...f,
 purchase_price: e.target.value,
 }))
 }
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Selling Price (₹)
 </label>
 <input
 type="number"
 min="0"
 step="0.01"
 className="w-full p-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#004F7C] focus:border-transparent transition-all"
 placeholder="Enter selling price"
 value={batchForm.selling_price}
 onChange={(e) =>
 setBatchForm((f) => ({
 ...f,
 selling_price: e.target.value,
 }))
 }
 />
 </div>
 </div>
 </div>

 {/* Modal Footer */}
 <div className="flex justify-end gap-3 mt-6 pt-6 border-t dark:border-gray-700">
 <button
 type="button"
 onClick={() => setShowModal(false)}
 className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors hover:scale-105 active:scale-95"
 >
 Cancel
 </button>
 <button
 onClick={saveBatch}
 disabled={isSubmitting}
 className="px-6 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 {isSubmitting && (
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
 )}
 {isEdit ? "Update Batch" : "Add Batch"}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* DELETE CONFIRM MODAL */}
 {showDeleteConfirm && (
 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
 <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md animate-bounce-in">
 <div className="p-6">
 <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4 animate-pulse">
 <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
 </div>
 
 <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
 Confirm Deletion
 </h3>
 
 <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
 Are you sure you want to delete this batch? This action cannot be undone.
 </p>

 <div className="flex justify-center gap-3">
 <button
 onClick={() => setShowDeleteConfirm(false)}
 className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors hover:scale-105 active:scale-95 flex-1"
 >
 Cancel
 </button>
 <button
 onClick={deleteBatch}
 className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 hover:scale-105 active:scale-95 flex-1 shadow-lg"
 >
 Delete
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
 @keyframes shake {
 0%, 100% { transform: translateX(0); }
 25% { transform: translateX(-2px); }
 75% { transform: translateX(2px); }
 }
 @keyframes bounce-in {
 0% { transform: scale(0.9); opacity: 0; }
 50% { transform: scale(1.05); opacity: 0.7; }
 100% { transform: scale(1); opacity: 1; }
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
 .animate-bounce-in {
 animation: bounce-in 0.3s ease-out;
 }
 .shake {
 animation: shake 0.3s ease-in-out;
 }
 `}</style>
 </div>
 );
}