"use client";

import React, { useState, useEffect } from "react";
import {
  Activity, Plus, Search, Filter, Download, Upload,
  Edit2, Trash2, CheckCircle, XCircle, FileText,
  AlertTriangle, Database, RefreshCw, Stethoscope, Tag
} from "lucide-react";
import toast from "react-hot-toast";
import Papa from "papaparse";
import { getLoggedInUser } from "@/lib/authHelpers";

const SPECIALTIES = [
  "General Physician", "Dermatology", "Gynecology", "Pediatrics",
  "Orthopedics", "Gynecology & Obstetrics", "Ophthalmology", "Cardiology",
  "Neurology", "Endocrinology", "Nephrologist", "Psychiatry",
  "Pulmonology", "Dentistry", "Surgery", "Gastroenterology",
  "ENT", "Urology", "Nephrology", "Oncology", "Rheumatology",
  "Dental", "Physiotherapy", "General Surgery"
];

export default function DiagnosisMasterPage() {
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [currentDiagnosis, setCurrentDiagnosis] = useState(null);
  const [formData, setFormData] = useState({
    name: "", icd_code: "", description: "", category: "", is_active: true
  });

  const adminId = getLoggedInUser("admin")?.id;

  useEffect(() => {
    fetchDiagnoses();
  }, [pagination.page, statusFilter, categoryFilter]);

  const fetchDiagnoses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        q: search,
        limit: 10,
      });
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(`/api/admin/diagnosis?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        let filtered = data.data;
        if (statusFilter === "active") filtered = filtered.filter(d => d.is_active);
        else if (statusFilter === "inactive") filtered = filtered.filter(d => !d.is_active);

        setDiagnoses(filtered);
        setPagination(prev => ({
          ...prev,
          totalPages: data.pagination.totalPages,
          total: data.pagination.total
        }));
      }
    } catch (err) {
      toast.error("Failed to fetch diagnoses catalog");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (pagination.page === 1) fetchDiagnoses();
    else setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Diagnosis name is required");

    const method = currentDiagnosis ? "PATCH" : "POST";
    const payload = { ...formData, admin_id: adminId };
    if (currentDiagnosis) payload.id = currentDiagnosis.id;

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/diagnosis", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(currentDiagnosis ? "Diagnosis updated successfully" : "Diagnosis added successfully");
        setIsModalOpen(false);
        fetchDiagnoses();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("An error occurred while saving");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this diagnosis?")) return;
    try {
      const res = await fetch(`/api/admin/diagnosis?id=${id}&admin_id=${adminId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Diagnosis deleted successfully");
        fetchDiagnoses();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("An error occurred during deletion");
    }
  };

  const handleExport = async () => {
    const params = new URLSearchParams({ limit: 10000 });
    if (categoryFilter) params.set("category", categoryFilter);
    const res = await fetch(`/api/admin/diagnosis?${params.toString()}`);
    const data = await res.json();
    if (data.success) {
      const csv = Papa.unparse(data.data.map(d => ({
        name: d.name,
        category: d.category || "",
        icd_code: d.icd_code || "",
        description: d.description || "",
        is_active: d.is_active
      })));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `diagnosis_master_${categoryFilter || "all"}_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
    }
  };

  const downloadCSVTemplate = () => {
    const headers = ["name", "category", "icd_code", "description", "is_active"];
    const rows = [
      ["Essential Hypertension", "General Physician", "I10", "Primary high blood pressure", "true"],
      ["Type 2 Diabetes (Sugar Disease)", "Endocrinology", "E11.9", "High blood sugar due to insulin resistance", "true"],
      ["Dengue Fever", "General Physician", "A90", "Mosquito-borne viral infection causing high fever", "true"],
      ["Knee Pain (Knee Arthritis)", "Orthopedics", "M17.9", "Pain and stiffness in the knee joint", "true"],
      ["Asthma", "Pulmonology", "J45.40", "Chronic lung condition causing wheezing and breathlessness", "true"],
    ];
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "diagnosis_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const results = Papa.parse(event.target.result, { header: true, skipEmptyLines: true });
        const importedData = results.data.map((item, idx) => ({
          _id: idx,
          name: (item.name || item.Name || item.diagnosis || "").trim(),
          category: (item.category || item.Category || item.specialty || "").trim(),
          icd_code: (item.icd_code || item.Icd_Code || item.icd || "").trim(),
          description: (item.description || item.Description || "").trim(),
          is_active: String(item.is_active || item.Is_Active || "true").toLowerCase() === "true"
        })).filter(row => row.name);

        if (importedData.length === 0) throw new Error("No valid data found in file");
        setImportPreview(importedData);
      } catch (err) {
        toast.error("Invalid file format: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const updatePreviewField = (index, field, value) => {
    setImportPreview(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setProcessing(true);
    try {
      const payload = importPreview.map(({ _id, ...rest }) => rest);
      const res = await fetch("/api/admin/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-id": adminId || "" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Imported ${importPreview.length} diagnoses successfully`);
        setImportPreview(null);
        setIsImportModalOpen(false);
        fetchDiagnoses();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Bulk import failed");
    } finally {
      setProcessing(false);
    }
  };

  // Category badge color map
  const CATEGORY_COLORS = {
    "General Physician": "bg-blue-100 text-[#004F7C]",
    "Cardiology": "bg-red-100 text-red-700",
    "Dermatology": "bg-pink-100 text-pink-700",
    "Gynecology": "bg-purple-100 text-purple-700",
    "Gynecology & Obstetrics": "bg-violet-100 text-violet-700",
    "Pediatrics": "bg-yellow-100 text-yellow-700",
    "Orthopedics": "bg-orange-100 text-orange-700",
    "Ophthalmology": "bg-cyan-100 text-cyan-700",
    "Neurology": "bg-indigo-100 text-indigo-700",
    "Endocrinology": "bg-amber-100 text-amber-700",
    "Psychiatry": "bg-fuchsia-100 text-fuchsia-700",
    "Pulmonology": "bg-sky-100 text-sky-700",
    "Gastroenterology": "bg-lime-100 text-lime-700",
    "ENT": "bg-teal-100 text-[#004F7C]",
    "Urology": "bg-emerald-100 text-emerald-700",
    "Nephrology": "bg-green-100 text-green-700",
    "Nephrologist": "bg-green-100 text-green-700",
    "Oncology": "bg-rose-100 text-rose-700",
    "Rheumatology": "bg-stone-100 text-stone-700",
    "Dentistry": "bg-slate-100 text-slate-700",
    "Dental": "bg-slate-100 text-slate-700",
    "Surgery": "bg-gray-100 text-gray-700",
    "General Surgery": "bg-gray-100 text-gray-700",
    "Physiotherapy": "bg-cyan-100 text-cyan-700",
  };

  return (
    <div className="p-5 w-full mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-[#0067A1] rounded-2xl shadow-sm shadow-[#0067A1]/20">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            Diagnosis Master
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            Manage ICD-10 clinical diagnosis catalog — organized by medical specialty / category
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-750 transition-all shadow-sm cursor-pointer"
          >
            <Download size={18} /> Export
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-750 transition-all shadow-sm cursor-pointer"
          >
            <Upload size={18} /> Bulk Import
          </button>
          <button
            onClick={() => {
              setCurrentDiagnosis(null);
              setFormData({ name: "", icd_code: "", description: "", category: categoryFilter || "", is_active: true });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0067A1] text-white rounded-xl font-bold hover:bg-[#0067A1]/90 transition-all shadow-sm shadow-[#0067A1]/20 cursor-pointer"
          >
            <Plus size={18} /> Add Diagnosis
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { label: "Total Diagnoses", value: pagination.total, icon: Database, bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-[#0067A1] dark:text-blue-400" },
          { label: "Active Autocomplete", value: diagnoses.filter(d => d.is_active).length, icon: CheckCircle, bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400" },
          { label: "With ICD-10 Reference", value: diagnoses.filter(d => d.icd_code).length, icon: Activity, bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-600 dark:text-indigo-400" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:border-gray-200">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2 leading-none">{stat.value}</p>
            </div>
            <div className={`p-4 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-6 h-6 ${stat.text}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by diagnosis name, ICD-10 code or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all outline-none text-base font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Category / Specialty Filter */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="w-full md:w-52 py-2.5 pl-9 pr-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#0067A1] appearance-none"
            >
              <option value="">All Specialties</option>
              {SPECIALTIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-40 py-2.5 px-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#0067A1]"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button
            onClick={handleSearch}
            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Category pills */}
      {categoryFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filtering by:</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${CATEGORY_COLORS[categoryFilter] || "bg-gray-100 text-gray-700"}`}>
            {categoryFilter}
            <button onClick={() => setCategoryFilter("")} className="ml-1 hover:opacity-70 cursor-pointer">×</button>
          </span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <th className="px-5 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider w-12">S.No</th>
                <th className="px-5 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider">Diagnosis Name</th>
                <th className="px-5 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider">Specialty / Category</th>
                <th className="px-5 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider">ICD-10 Code</th>
                <th className="px-5 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider">Description</th>
                <th className="px-5 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider">Status</th>
                <th className="px-5 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="7" className="px-5 py-8">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : diagnoses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Stethoscope className="w-12 h-12 text-gray-200" />
                      <p className="text-gray-400 font-medium">No diagnoses found{categoryFilter ? ` for "${categoryFilter}"` : ""}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                diagnoses.map((diag, index) => (
                  <tr key={diag.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group">
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-gray-400">
                        {(pagination.page - 1) * 10 + (index + 1)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shrink-0">
                          <Stethoscope size={16} />
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{diag.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {diag.category ? (
                        <span
                          onClick={() => { setCategoryFilter(diag.category); setPagination(p => ({ ...p, page: 1 })); }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${CATEGORY_COLORS[diag.category] || "bg-gray-100 text-gray-600"}`}
                        >
                          <Tag size={10} />
                          {diag.category}
                        </span>
                      ) : (
                        <span className="text-gray-300 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {diag.icd_code ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-tight bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/30">
                          {diag.icd_code}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600 italic text-sm">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate" title={diag.description}>
                        {diag.description || "-"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {diag.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/20 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200/20 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setCurrentDiagnosis(diag);
                            setFormData({
                              name: diag.name,
                              icd_code: diag.icd_code || "",
                              description: diag.description || "",
                              category: diag.category || "",
                              is_active: diag.is_active
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(diag.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm font-bold text-gray-400 capitalize">Page {pagination.page} of {Math.max(1, pagination.totalPages)} &nbsp;·&nbsp; {pagination.total} total</p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              className="px-2 py-1 text-sm font-bold border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-all text-gray-600 dark:text-gray-300 cursor-pointer"
            >
              &lt;
            </button>
            {(() => {
              const pages = [];
              const maxVisible = 5;
              let start = Math.max(1, pagination.page - 2);
              let end = Math.min(Math.max(1, pagination.totalPages), start + maxVisible - 1);
              if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
              for (let i = start; i <= end; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setPagination(p => ({ ...p, page: i }))}
                    className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${pagination.page === i
                      ? "bg-[#0067A1] text-white shadow-md border border-[#0067A1]"
                      : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                  >
                    {i}
                  </button>
                );
              }
              return pages;
            })()}
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              className="px-2 py-1 text-sm font-bold border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-all text-gray-600 dark:text-gray-300 cursor-pointer"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {currentDiagnosis ? "Edit Diagnosis" : "Add New Diagnosis"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"><XCircle /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Specialty / Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Specialty / Category *</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-semibold text-sm appearance-none"
                  >
                    <option value="">Select Specialty...</option>
                    {SPECIALTIES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Diagnosis Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dengue Fever"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-bold text-base"
                />
              </div>

              {/* ICD Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">ICD-10 Code (Optional)</label>
                <input
                  type="text"
                  value={formData.icd_code}
                  onChange={(e) => setFormData({ ...formData, icd_code: e.target.value })}
                  placeholder="e.g. A90"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-bold text-base"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Patient-Friendly Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Mosquito-borne viral infection causing high fever, body pain, and rash..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-medium text-base resize-none"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                <input
                  type="checkbox"
                  id="active-check"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
                />
                <label htmlFor="active-check" className="text-base font-bold text-gray-700 dark:text-gray-300 select-none">
                  Available in Doctor Autocomplete
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-6 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-2xl font-bold uppercase text-sm tracking-widest hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 py-3 px-6 bg-[#0067A1] text-white rounded-2xl font-bold uppercase text-sm tracking-widest hover:bg-[#0067A1]/90 transition-all shadow-sm shadow-[#0067A1]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {processing ? "Saving..." : (currentDiagnosis ? "Save Changes" : "Add Diagnosis")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
          <div className={`bg-white dark:bg-gray-800 w-full rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in duration-300 transition-all flex flex-col max-h-[90vh] ${importPreview ? "max-w-6xl" : "max-w-lg"}`}>
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700 pb-4 shrink-0">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <Upload size={24} className="text-[#0067A1]" />
                {importPreview ? "Review & Edit Data" : "Bulk Import Diagnosis"}
              </h2>
              <button
                onClick={() => { setIsImportModalOpen(false); setImportPreview(null); }}
                className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <XCircle />
              </button>
            </div>

            {!importPreview ? (
              <div className="overflow-y-auto flex-1 space-y-6 pr-1">
                <div className="text-center shrink-0">
                  <p className="text-base text-gray-500 mt-2">Upload a CSV file with columns: <span className="font-bold">name, category, icd_code, description, is_active</span></p>
                  <button
                    onClick={downloadCSVTemplate}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#0067A1] hover:underline cursor-pointer"
                  >
                    <Download size={14} /> Download CSV Template
                  </button>
                </div>

                <div className="p-12 border-4 border-dashed border-gray-100 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center space-y-4 hover:border-[#0067A1]/50 transition-all cursor-pointer relative group">
                  <input type="file" accept=".csv" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <FileText className="w-16 h-16 text-gray-200 group-hover:text-[#0067A1] transition-colors" />
                  <p className="text-base font-bold text-gray-400 group-hover:text-gray-600 transition-colors">Drop CSV file here or click to browse</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-0 flex-1 space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-3 shrink-0">
                  <AlertTriangle className="text-[#0067A1] shrink-0 mt-0.5" size={18} />
                  <p className="text-base text-blue-800 dark:text-blue-400 font-medium">
                    Review the <span className="font-bold">{importPreview.length}</span> records detected.
                    <span className="font-bold ml-1">Click any field to edit before saving!</span>
                  </p>
                </div>

                <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-900 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 w-12 text-center">#</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">Diagnosis Name *</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 w-44">Category</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 w-32">ICD-10</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">Description</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 w-20 text-center">Active</th>
                        <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 w-14"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {importPreview.map((item, i) => (
                        <tr key={item._id} className="text-base hover:bg-gray-50 dark:hover:bg-gray-900/50 group transition-colors">
                          <td className="px-4 py-2 text-center text-gray-400 font-medium text-sm">{i + 1}</td>
                          <td className="px-4 py-2">
                            <input type="text" value={item.name} onChange={(e) => updatePreviewField(i, "name", e.target.value)}
                              className="w-full px-2 py-1 bg-transparent hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 border border-transparent hover:border-gray-300 focus:border-[#0067A1] rounded outline-none font-bold text-gray-900 dark:text-white transition-all" />
                          </td>
                          <td className="px-4 py-2">
                            <select value={item.category} onChange={(e) => updatePreviewField(i, "category", e.target.value)}
                              className="w-full px-2 py-1.5 bg-transparent hover:bg-white dark:hover:bg-gray-700 focus:bg-white border border-transparent hover:border-gray-300 focus:border-[#0067A1] rounded-lg outline-none text-sm text-gray-700 dark:text-gray-300 transition-all">
                              <option value="">— Select —</option>
                              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={item.icd_code} onChange={(e) => updatePreviewField(i, "icd_code", e.target.value)}
                              className="w-full px-2 py-1 bg-transparent hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 border border-transparent hover:border-gray-300 focus:border-[#0067A1] rounded outline-none font-bold text-gray-900 dark:text-white transition-all" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={item.description} onChange={(e) => updatePreviewField(i, "description", e.target.value)}
                              className="w-full px-2 py-1 bg-transparent hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 border border-transparent hover:border-gray-300 focus:border-[#0067A1] rounded outline-none text-gray-700 dark:text-gray-300 transition-all"
                              placeholder="Patient-friendly description" />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input type="checkbox" checked={item.is_active} onChange={(e) => updatePreviewField(i, "is_active", e.target.checked)}
                              className="w-5 h-5 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1] cursor-pointer" />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button onClick={() => setImportPreview(prev => prev.filter((_, idx) => idx !== i))}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4 pt-2 shrink-0">
                  <button onClick={() => setImportPreview(null)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white rounded-2xl font-black capitalize text-sm tracking-widest hover:bg-gray-200 transition-all cursor-pointer">
                    Clear & Re-upload
                  </button>
                  <button onClick={handleConfirmImport} disabled={processing || importPreview.length === 0}
                    className="flex-[2] py-4 bg-[#0067A1] text-white rounded-2xl font-black capitalize text-sm tracking-widest hover:bg-[#0067A1]/90 transition-all shadow-sm shadow-[#0067A1]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {processing ? "Processing..." : `Confirm & Save ${importPreview.length} items`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
