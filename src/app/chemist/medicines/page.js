"use client";

import { useEffect, useState } from "react";
import { 
 Search, Plus, Edit, Trash2, Pill, ClipboardList, 
 ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight,
 ChevronLeft, ChevronRight, XCircle, RefreshCw, Layers, Tag,
 AlertTriangle, Filter, SortAsc, SortDesc, Upload
} from "lucide-react";
import { getLoggedInUser } from "@/lib/authHelpers";
import { toast } from "react-hot-toast";

// Predefined options for dropdowns
const STRENGTH_OPTIONS = [
 "50mg", "100mg", "250mg", "500mg", "1g", 
 "5mg", "10mg", "25mg", "50mg/5ml", "100mg/5ml",
 "125mg", "200mg", "400mg", "Other"
];

const TYPE_OPTIONS = [
 "Tablet", "Capsule", "Syrup", "Injection", "Ointment",
 "Cream", "Drops", "Inhaler", "Powder", "Suspension",
 "Other"
];

const CATEGORY_OPTIONS = [
 "Antibiotic", "Analgesic", "Antihistamine", "Antidepressant",
 "Antidiabetic", "Antihypertensive", "Antiviral", "Cardiac",
 "Gastrointestinal", "Hormonal", "Vitamin", "Dermatological",
 "Ophthalmic", "Respiratory", "Other"
];

export default function MedicinesPage() {
 const [chemist, setChemist] = useState(null);
 const [medicines, setMedicines] = useState([]);
 const [loading, setLoading] = useState(true);
 const [isRefreshing, setIsRefreshing] = useState(false);

 // Search + Filters
 const [search, setSearch] = useState("");
 const [categoryFilter, setCategoryFilter] = useState("all");

 // Sorting
 const [sortConfig, setSortConfig] = useState({
 key: "created_at",
 direction: "desc",
 });

 // Pagination
 const [pagination, setPagination] = useState({
 currentPage: 1,
 pageSize: 10,
 totalItems: 0,
 totalPages: 0,
 });

 const [stats, setStats] = useState({
 total: 0,
 categories: 0,
 strengths: 0,
 });

 // Modals
 const [showModal, setShowModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [medicineToDelete, setMedicineToDelete] = useState(null);

 // Form state with custom input handling
 const initialForm = {
 id: null,
 chemist_id: "",
 name: "",
 brand: "",
 category: "",
 categoryCustom: "",
 strength: "",
 strengthCustom: "",
 type: "",
 typeCustom: "",
 description: "",
 };

 const [form, setForm] = useState(initialForm);
 const [isSubmitting, setIsSubmitting] = useState(false);

 /* -----------------------------------------
 LOAD CHEMIST
 ----------------------------------------- */
 useEffect(() => {
 const u = getLoggedInUser("chemist");
 if (u) {
 setChemist(u);
 setForm((f) => ({ ...f, chemist_id: u.id }));
 }
 }, []);

 /* -----------------------------------------
 FETCH MEDICINES
 ----------------------------------------- */
 const fetchMedicines = async (page = 1) => {
 if (!chemist?.id) return;

 setLoading(true);

 try {
 const url = `/api/chemists/medicines?chemist_id=${chemist.id}&page=${page}&limit=${pagination.pageSize}&search=${search}`;

 const res = await fetch(url);
 const json = await res.json();

 if (json.success) {
 const data = json.data.data;
 const pag = json.data.pagination;

 setMedicines(data);
 setPagination((p) => ({
 ...p,
 currentPage: page,
 totalPages: pag.total_pages,
 totalItems: pag.total,
 }));
 // console.log("Fetched medicines:", data, "Pagination:", pag);
 calculateStats(data,pag?.total);
 } else {
 toast.error(json.message);
 }
 } catch (err) {
 console.error(err);
 toast.error("Failed to fetch medicines");
 }

 setLoading(false);
 };

  const handleDownloadTemplate = () => {
    const headers = ["Name *", "Brand", "Category", "Strength", "Type", "Description"];
    const rows = [
      ["Paracetamol", "Calpol", "Analgesic", "500mg", "Tablet", "Used for fever and mild pain relief"],
      ["Amoxicillin", "Moxikind", "Antibiotic", "250mg", "Capsule", "Common antibiotic prescription"],
      ["Cough Syrup", "Benadryl", "Respiratory", "100ml", "Syrup", "For dry cough and throat irritation"]
    ];
    
    // Add BOM for proper Excel compatibility in case of special characters
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "mediconnect_medicines_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a valid CSV file (.csv)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          toast.error("CSV file is empty or missing headers");
          return;
        }

        // Parse CSV headers (strip BOM, quotes and spaces)
        const headers = lines[0].replace(/^\uFEFF/, "").split(",").map(h => h.replace(/^["']|["']$/g, "").trim().toLowerCase());
        
        // Find header indexes (support flexible header names like Name / Name *)
        const nameIdx = headers.findIndex(h => h.includes("name"));
        const brandIdx = headers.findIndex(h => h.includes("brand"));
        const categoryIdx = headers.findIndex(h => h.includes("category"));
        const strengthIdx = headers.findIndex(h => h.includes("strength"));
        const typeIdx = headers.findIndex(h => h.includes("type"));
        const descIdx = headers.findIndex(h => h.includes("description") || h.includes("desc"));

        if (nameIdx === -1) {
          toast.error("CSV must contain a 'Name' or 'Name *' column");
          return;
        }

        const parsedMedicines = [];
        
        // Parse rows
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV line parser that respects quotes
          const values = [];
          let currentVal = "";
          let insideQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"' || char === "'") {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              values.push(currentVal.trim().replace(/^["']|["']$/g, ""));
              currentVal = "";
            } else {
              currentVal += char;
            }
          }
          values.push(currentVal.trim().replace(/^["']|["']$/g, ""));

          const name = values[nameIdx];
          if (!name) continue; // Skip rows without name

          parsedMedicines.push({
            name,
            brand: brandIdx !== -1 ? values[brandIdx] || "" : "",
            category: categoryIdx !== -1 ? values[categoryIdx] || "" : "",
            strength: strengthIdx !== -1 ? values[strengthIdx] || "" : "",
            type: typeIdx !== -1 ? values[typeIdx] || "" : "",
            description: descIdx !== -1 ? values[descIdx] || "" : "",
          });
        }

        if (parsedMedicines.length === 0) {
          toast.error("No valid medicine rows found in the CSV");
          return;
        }

        // Upload to bulk endpoint
        const uploadToast = toast.loading(`Uploading ${parsedMedicines.length} medicines...`);
        
        const res = await fetch("/api/chemists/medicines/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chemist_id: chemist.id,
            medicines: parsedMedicines
          })
        });

        const json = await res.json();
        
        if (json.success) {
          toast.success(`Successfully uploaded ${json.data.count} medicines!`, { id: uploadToast });
          fetchMedicines(1); // Reload list
        } else {
          toast.error(json.message || "Failed to upload bulk medicines", { id: uploadToast });
        }
      } catch (parseErr) {
        console.error("CSV parse error:", parseErr);
        toast.error("Failed to parse CSV file. Please check format.");
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be uploaded again
    e.target.value = "";
  };

 // Initial fetch
 useEffect(() => {
 if (chemist?.id) fetchMedicines(1);
 }, [chemist]);

 // Debounced search
 useEffect(() => {
 const t = setTimeout(() => {
 if (chemist?.id) fetchMedicines(1);
 }, 500);
 return () => clearTimeout(t);
 }, [search]);

 /* -----------------------------------------
 CALCULATE STATS
 ----------------------------------------- */
 const calculateStats = (data,pageItems) => {
 const categories = new Set(data.map((d) => d.category));
 const strengths = new Set(data.map((d) => d.strength));

 setStats({
 total: pageItems,
 categories: categories.size,
 strengths: strengths.size,
 });
 };

 /* -----------------------------------------
 SORTING
 ----------------------------------------- */
 const sortedMedicines = [...medicines].sort((a, b) => {
 const { key, direction } = sortConfig;

 if (key === "name") {
 return direction === "asc"
 ? a.name.localeCompare(b.name)
 : b.name.localeCompare(a.name);
 }

 if (key === "category") {
 return direction === "asc"
 ? a.category.localeCompare(b.category)
 : b.category.localeCompare(a.category);
 }

 if (key === "created_at") {
 const dA = new Date(a.created_at);
 const dB = new Date(b.created_at);
 return direction === "asc" ? dA - dB : dB - dA;
 }

 return 0;
 });

 const toggleSort = (key) => {
 setSortConfig((prev) => ({
 key,
 direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
 }));
 };

 const SortIcon = ({ columnKey }) => {
 if (sortConfig.key !== columnKey)
 return <ChevronDown className="w-4 h-4 opacity-30 group-hover:opacity-70 transition-opacity" />;

 return sortConfig.direction === "asc" ? (
 <ChevronUp className="w-4 h-4 text-[#0067A1] dark:text-[#0080C6]" />
 ) : (
 <ChevronDown className="w-4 h-4 text-[#0067A1] dark:text-[#0080C6]" />
 );
 };

 /* -----------------------------------------
 OPEN MODAL FOR EDIT
 ----------------------------------------- */
 const editMedicine = (m) => {
 // Check if values are in predefined options or custom
 const isCustomStrength = !STRENGTH_OPTIONS.includes(m.strength);
 const isCustomType = !TYPE_OPTIONS.includes(m.type);
 const isCustomCategory = !CATEGORY_OPTIONS.includes(m.category);

 setForm({
 id: m.id,
 chemist_id: m.chemist_id,
 name: m.name,
 brand: m.brand,
 category: isCustomCategory ? "Other" : m.category,
 categoryCustom: isCustomCategory ? m.category : "",
 strength: isCustomStrength ? "Other" : m.strength,
 strengthCustom: isCustomStrength ? m.strength : "",
 type: isCustomType ? "Other" : m.type,
 typeCustom: isCustomType ? m.type : "",
 description: m.description,
 });
 setShowModal(true);
 };

 /* -----------------------------------------
 HANDLE DELETE CONFIRMATION
 ----------------------------------------- */
 const confirmDelete = (medicine) => {
 setMedicineToDelete(medicine);
 setShowDeleteModal(true);
 };

 const deleteMedicine = async () => {
 if (!medicineToDelete) return;

 try {
 const res = await fetch("/api/chemists/medicines", {
 method: "DELETE",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ id: medicineToDelete.id, chemist_id: chemist.id }),
 });

 const json = await res.json();

 if (json.success) {
 toast.success("Medicine deleted successfully");
 fetchMedicines(pagination.currentPage);
 } else {
 toast.error(json.message);
 }
 } catch (err) {
 toast.error("Failed to delete medicine");
 } finally {
 setShowDeleteModal(false);
 setMedicineToDelete(null);
 }
 };

 /* -----------------------------------------
 HANDLE SELECT CHANGES
 ----------------------------------------- */
 const handleSelectChange = (field, value) => {
 setForm((prev) => ({
 ...prev,
 [field]: value,
 // Clear custom field if not "Other"
 ...(value !== "Other" && { [`${field}Custom`]: "" })
 }));
 };

 /* -----------------------------------------
 SAVE MEDICINE (CREATE/UPDATE)
 ----------------------------------------- */
 const submitForm = async (e) => {
 e.preventDefault();
 setIsSubmitting(true);

 // Prepare final data with custom values
 const finalData = {
 ...form,
 strength: form.strength === "Other" ? form.strengthCustom : form.strength,
 type: form.type === "Other" ? form.typeCustom : form.type,
 category: form.category === "Other" ? form.categoryCustom : form.category,
 };

 // Remove custom fields from submission
 delete finalData.strengthCustom;
 delete finalData.typeCustom;
 delete finalData.categoryCustom;

 const method = form.id ? "PUT" : "POST";

 try {
 const res = await fetch("/api/chemists/medicines", {
 method,
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(finalData),
 });

 const json = await res.json();

 if (json.success) {
 toast.success(form.id ? "Medicine updated!" : "Medicine created!");
 setShowModal(false);
 resetForm();
 fetchMedicines(1);
 } else {
 toast.error(json.message);
 }
 } catch (err) {
 toast.error("Failed to save medicine");
 } finally {
 setIsSubmitting(false);
 }
 };

 /* -----------------------------------------
 RESET FORM
 ----------------------------------------- */
 const resetForm = () =>
 setForm({
 id: null,
 chemist_id: chemist?.id || "",
 name: "",
 brand: "",
 category: "",
 categoryCustom: "",
 strength: "",
 strengthCustom: "",
 type: "",
 typeCustom: "",
 description: "",
 });

 /* -----------------------------------------
 PAGINATION FUNCTIONS
 ----------------------------------------- */
 const goToPage = (p) => {
 if (p >= 1 && p <= pagination.totalPages) {
 fetchMedicines(p);
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

 const handleRefresh = async () => {
 setIsRefreshing(true);
 await fetchMedicines(pagination.currentPage);
 setTimeout(() => setIsRefreshing(false), 500);
 };

 return (
 <div className="p-4 md:p-6 lg:p-8 bg-[#0067A1]/5 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen ">
 
 {/* HEADER */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
 <div className="flex items-center space-x-3 group">
 <div className="w-12 h-12 bg-[#0067A1] text-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
 <Pill size={26} className="group-hover:rotate-12 transition-transform duration-300" />
 </div>
 <div>
 <h1 className="text-2xl sm:text-3xl font-bold text-[#0067A1] dark:text-[#0080C6] animate-pulse-slow">
 Medicines Manager
 </h1>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm">
 Manage your pharmacy inventory efficiently
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3">
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="p-2.5 bg-white dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl text-[#0067A1] dark:text-[#0080C6] hover:bg-[#004F7C]/5 dark:hover:bg-gray-700 transition-all duration-300 hover:scale-105 disabled:opacity-50"
      title="Refresh"
    >
      <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
    </button>
    <button
      onClick={handleDownloadTemplate}
      className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 text-[#0067A1] dark:text-[#0080C6] rounded-xl flex items-center space-x-2 shadow hover:shadow-md transition-all duration-300 active:scale-95"
      title="Download Sample CSV Template"
    >
      <ChevronDown className="w-4 h-4" />
      <span>Download Template</span>
    </button>
    <button
      onClick={() => document.getElementById("bulk-csv-input").click()}
      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
      title="Upload Medicines via CSV"
    >
      <Upload className="w-4 h-4" />
      <span>Bulk Upload</span>
    </button>
    <input
      id="bulk-csv-input"
      type="file"
      accept=".csv"
      onChange={handleBulkUpload}
      className="hidden"
    />
    <button
      onClick={() => {
        resetForm();
        setShowModal(true);
      }}
      className="px-4 py-2.5 bg-[#0067A1] text-white rounded-xl flex items-center space-x-2 shadow-lg hover:shadow-xl hover:bg-[#004F7C] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 group"
    >
      <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
      <span>Add Medicine</span>
    </button>
 </div>
 </div>

 {/* STATS CARDS */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
 <div className="p-5 md:p-6 rounded-2xl bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm font-medium">
 Total Medicines
 </p>
 <h2 className="text-2xl md:text-3xl font-bold text-[#003358] dark:text-white mt-1">
 {stats.total}
 </h2>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0067A1] text-white rounded-xl flex items-center justify-center animate-bounce-slow">
 <ClipboardList size={20} className="md:size-6" />
 </div>
 </div>
 </div>

 <div className="p-5 md:p-6 rounded-2xl bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm font-medium">
 Categories
 </p>
 <h2 className="text-2xl md:text-3xl font-bold text-[#003358] dark:text-white mt-1">
 {stats.categories}
 </h2>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0067A1] text-white rounded-xl flex items-center justify-center animate-pulse">
 <Layers size={20} className="md:size-6" />
 </div>
 </div>
 </div>

 <div className="p-5 md:p-6 rounded-2xl bg-green-100 dark:bg-gray-800 border border-green-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-green-800 dark:text-green-300 text-sm font-medium">
 Strength Types
 </p>
 <h2 className="text-2xl md:text-3xl font-bold text-green-900 dark:text-white mt-1">
 {stats.strengths}
 </h2>
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 bg-green-600 text-white rounded-xl flex items-center justify-center animate-bounce-slow">
 <Tag size={20} className="md:size-6" />
 </div>
 </div>
 </div>
 </div>

 {/* SEARCH & FILTER BAR */}
 <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 mb-6 shadow-lg backdrop-blur-sm bg-opacity-90">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
 {/* SEARCH */}
 <div className="relative flex-1 group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0080C6] w-5 h-5 group-focus-within:text-[#0067A1] transition-colors" />
 <input
 placeholder="Search medicines..."
 className="w-full pl-10 pr-4 py-2.5 bg-[#0067A1]/5 dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all duration-200 shadow-sm"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>

 {/* FILTERS */}
 <div className="flex gap-3">
 <div className="relative group">
 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0080C6] w-4 h-4 pointer-events-none" />
 <select
 value={categoryFilter}
 onChange={(e) => {
 setCategoryFilter(e.target.value);
 // Add your filter logic here
 }}
 className="pl-10 pr-8 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
 >
 <option value="all">All Categories</option>
 {CATEGORY_OPTIONS.map((cat) => (
 <option key={cat} value={cat} className="dark:bg-gray-800 dark:text-white">
 {cat}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
 </div>

 {/* PAGE SIZE */}
 <div className="relative group">
 <select
 value={pagination.pageSize}
 onChange={(e) => {
 setPagination((p) => ({
 ...p,
 pageSize: parseInt(e.target.value),
 }));
 fetchMedicines(1);
 }}
 className="pl-3 pr-8 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
 >
 <option value="10" className="dark:bg-gray-800 dark:text-white">10/page</option>
 <option value="25" className="dark:bg-gray-800 dark:text-white">25/page</option>
 <option value="50" className="dark:bg-gray-800 dark:text-white">50/page</option>
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
 </div>
 </div>
 </div>
 </div>

 {/* LOADING STATE */}
 {loading && (
 <div className="text-center py-16">
 <div className="w-12 h-12 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin mx-auto shadow-lg"></div>
 <p className="mt-4 text-lg text-[#004F7C] dark:text-teal-300 font-medium animate-pulse">
 Loading medicines...
 </p>
 </div>
 )}

 {/* TABLE */}
 {!loading && medicines.length > 0 && (
 <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-slide-up">
 <div className="overflow-x-auto">
 <table className="w-full min-w-[600px]">
 <thead className="bg-[#0067A1]/5 dark:bg-gray-800">
 <tr>
 <th className="p-4 text-left">
 <button
 onClick={() => toggleSort("name")}
 className="flex items-center space-x-1 font-semibold text-[#004F7C] dark:text-teal-300 hover:text-[#003358] dark:hover:text-[#0067A1]/20 transition-colors group"
 >
 <span>Name</span>
 <SortIcon columnKey="name" />
 </button>
 </th>
 <th className="p-4 text-left">Brand</th>
 <th className="p-4 text-left">
 <button
 onClick={() => toggleSort("category")}
 className="flex items-center space-x-1 font-semibold text-[#004F7C] dark:text-teal-300 hover:text-[#003358] dark:hover:text-[#0067A1]/20 transition-colors group"
 >
 <span>Category</span>
 <SortIcon columnKey="category" />
 </button>
 </th>
 <th className="p-4 text-left">Strength</th>
 <th className="p-4 text-left">Type</th>
 <th className="p-4 text-left">Actions</th>
 </tr>
 </thead>

 <tbody className="divide-y dark:divide-gray-700">
 {sortedMedicines.map((m, index) => (
 <tr 
 key={m.id} 
 className="hover:bg-gradient-to-r hover:bg-[#004F7C]/5 dark:hover:from-gray-800/50 dark:hover:to-gray-900/50 transition-all duration-200 animate-fade-in"
 style={{ animationDelay: `${index * 50}ms` }}
 >
 <td className="p-4 font-medium text-gray-900 dark:text-white">
 <div className="flex items-center space-x-3">
 <div className="w-8 h-8 bg-[#0067A1]/10 dark:bg-[#003358]/30 rounded-lg flex items-center justify-center">
 <Pill size={16} className="text-[#0067A1] dark:text-[#0080C6]" />
 </div>
 <span>{m.name}</span>
 </div>
 </td>
 <td className="p-4 text-gray-600 dark:text-gray-300">{m.brand}</td>
 <td className="p-4">
 <span className="px-3 py-1 bg-[#0067A1]/10 dark:bg-[#003358]/30 text-[#004F7C] dark:text-teal-300 rounded-full text-sm font-medium">
 {m.category}
 </span>
 </td>
 <td className="p-4">
 <span className="px-3 py-1 bg-[#0067A1]/10 dark:bg-[#003358]/30 text-[#004F7C] dark:text-teal-300 rounded-full text-sm font-medium">
 {m.strength}
 </span>
 </td>
 <td className="p-4">
 <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
 {m.type}
 </span>
 </td>
 <td className="p-4">
 <div className="flex gap-2">
 <button
 onClick={() => editMedicine(m)}
 className="p-2 bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg group"
 title="Edit"
 >
 <Edit size={16} className="group-hover:rotate-12 transition-transform" />
 </button>
 <button
 onClick={() => confirmDelete(m)}
 className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg group"
 title="Delete"
 >
 <Trash2 size={16} className="group-hover:shake" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* PAGINATION */}
 <div className="p-4 border-t dark:border-gray-700 bg-[#0067A1]/5 dark:bg-gray-800/30">
 <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
 {/* Left */}
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Showing {(pagination.currentPage - 1) * pagination.pageSize + 1}–
 {Math.min(
 pagination.currentPage * pagination.pageSize,
 pagination.totalItems
 )}{" "}
 of {pagination.totalItems}
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

 {generatePageNumbers().map((n, i) =>
 n === "..." ? (
 <span key={i} className="px-2 text-gray-400">…</span>
 ) : (
 <button
 key={i}
 onClick={() => goToPage(n)}
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
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Page {pagination.currentPage} of {pagination.totalPages}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* NO RESULTS */}
 {!loading && medicines.length === 0 && (
 <div className="text-center p-12 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl shadow-lg animate-pulse-slow">
 <Pill className="w-16 h-16 text-[#0080C6] mx-auto mb-4 animate-bounce" />
 <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
 No Medicines Found
 </h3>
 <p className="text-gray-600 dark:text-gray-400 mb-6">
 Try adjusting your search or add a new medicine.
 </p>
 <button
 onClick={() => {
 resetForm();
 setShowModal(true);
 }}
 className="px-6 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
 >
 Add Your First Medicine
 </button>
 </div>
 )}

 {/* ADD/EDIT MEDICINE MODAL */}
 {showModal && (
 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
 <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
 {/* Modal Header */}
 <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-6 flex justify-between items-center z-10">
 <h2 className="text-2xl font-bold text-[#0067A1] dark:text-[#0080C6]">
 {form.id ? "Edit Medicine" : "Add New Medicine"}
 </h2>
 <button
 onClick={() => setShowModal(false)}
 className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors hover:scale-110"
 >
 <XCircle size={24} />
 </button>
 </div>

 {/* Modal Body */}
 <form onSubmit={submitForm} className="p-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Name */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Medicine Name *
 </label>
 <input
 type="text"
 value={form.name}
 onChange={(e) => setForm({ ...form, name: e.target.value })}
 required
 placeholder="Enter medicine name"
 className="w-full p-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
 />
 </div>

 {/* Brand */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Brand
 </label>
 <input
 type="text"
 value={form.brand}
 onChange={(e) => setForm({ ...form, brand: e.target.value })}
 placeholder="Enter brand name"
 className="w-full p-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
 />
 </div>

 {/* Category */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Category *
 </label>
 <div className="relative">
 <select
 value={form.category}
 onChange={(e) => handleSelectChange("category", e.target.value)}
 required
 className="w-full p-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all appearance-none pr-10"
 >
 <option value="">Select Category</option>
 {CATEGORY_OPTIONS.map((cat) => (
 <option key={cat} value={cat} className="dark:bg-gray-800 dark:text-white">
 {cat}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
 </div>
 {form.category === "Other" && (
 <input
 type="text"
 value={form.categoryCustom}
 onChange={(e) => setForm({ ...form, categoryCustom: e.target.value })}
 required
 placeholder="Enter custom category"
 className="w-full p-3 mt-2 bg-white dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all animate-slide-down"
 />
 )}
 </div>

 {/* Strength */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Strength *
 </label>
 <div className="relative">
 <select
 value={form.strength}
 onChange={(e) => handleSelectChange("strength", e.target.value)}
 required
 className="w-full p-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all appearance-none pr-10"
 >
 <option value="">Select Strength</option>
 {STRENGTH_OPTIONS.map((strength) => (
 <option key={strength} value={strength} className="dark:bg-gray-800 dark:text-white">
 {strength}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
 </div>
 {form.strength === "Other" && (
 <input
 type="text"
 value={form.strengthCustom}
 onChange={(e) => setForm({ ...form, strengthCustom: e.target.value })}
 required
 placeholder="Enter custom strength"
 className="w-full p-3 mt-2 bg-white dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all animate-slide-down"
 />
 )}
 </div>

 {/* Type */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Type *
 </label>
 <div className="relative">
 <select
 value={form.type}
 onChange={(e) => handleSelectChange("type", e.target.value)}
 required
 className="w-full p-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all appearance-none pr-10"
 >
 <option value="">Select Type</option>
 {TYPE_OPTIONS.map((type) => (
 <option key={type} value={type} className="dark:bg-gray-800 dark:text-white">
 {type}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
 </div>
 {form.type === "Other" && (
 <input
 type="text"
 value={form.typeCustom}
 onChange={(e) => setForm({ ...form, typeCustom: e.target.value })}
 required
 placeholder="Enter custom type"
 className="w-full p-3 mt-2 bg-white dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all animate-slide-down"
 />
 )}
 </div>

 {/* Description */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Description
 </label>
 <textarea
 value={form.description}
 onChange={(e) => setForm({ ...form, description: e.target.value })}
 placeholder="Enter description"
 rows="3"
 className="w-full p-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all resize-none"
 />
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
 type="submit"
 disabled={isSubmitting}
 className="px-6 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 {isSubmitting && (
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
 )}
 {form.id ? "Update Medicine" : "Save Medicine"}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* DELETE CONFIRMATION MODAL */}
 {showDeleteModal && (
 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
 <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md animate-bounce-in">
 <div className="p-6">
 <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4 animate-pulse">
 <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
 </div>
 
 <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
 Confirm Deletion
 </h3>
 
 <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
 Are you sure you want to delete{" "}
 <span className="font-semibold text-[#004F7C] dark:text-teal-300">
 {medicineToDelete?.name}
 </span>
 ? This action cannot be undone.
 </p>

 <div className="flex justify-center gap-3">
 <button
 onClick={() => {
 setShowDeleteModal(false);
 setMedicineToDelete(null);
 }}
 className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors hover:scale-105 active:scale-95 flex-1"
 >
 Cancel
 </button>
 <button
 onClick={deleteMedicine}
 className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 hover:scale-105 active:scale-95 flex-1 shadow-lg"
 >
 Delete
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Add these styles for animations */}
 <style jsx global>{`
 @keyframes shake {
 0%, 100% { transform: translateX(0); }
 25% { transform: translateX(-2px); }
 75% { transform: translateX(2px); }
 }
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
 @keyframes bounceIn {
 0% { transform: scale(0.9); opacity: 0; }
 50% { transform: scale(1.05); opacity: 0.7; }
 100% { transform: scale(1); opacity: 1; }
 }
 @keyframes pulse-slow {
 0%, 100% { opacity: 1; }
 50% { opacity: 0.7; }
 }
 @keyframes bounce-slow {
 0%, 100% { transform: translateY(0); }
 50% { transform: translateY(-5px); }
 }
 @keyframes gradient {
 0% { background-position: 0% 50%; }
 50% { background-position: 100% 50%; }
 100% { background-position: 0% 50%; }
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
 .animate-bounce-in {
 animation: bounceIn 0.3s ease-out;
 }
 .animate-pulse-slow {
 animation: pulse-slow 2s ease-in-out infinite;
 }
 .animate-bounce-slow {
 animation: bounce-slow 2s ease-in-out infinite;
 }
 .shake {
 animation: shake 0.3s ease-in-out;
 }
 select option {
 background: white;
 color: black;
 }
 .dark select option {
 background: #1f2937;
 color: white;
 }
 `}</style>
 </div>
 );
}