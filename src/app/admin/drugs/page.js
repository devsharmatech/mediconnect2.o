"use client";

import React, { useState, useEffect } from "react";
import {
  Pill, Plus, Search, Filter, Download, Upload,
  Edit2, Trash2, CheckCircle, XCircle, MoreVertical,
  FileText, Activity, AlertTriangle, ArrowUpDown, ChevronRight,
  Database, RefreshCw
} from "lucide-react";
import { toast } from "react-hot-toast";
import Papa from "papaparse";
import { getLoggedInUser } from "@/lib/authHelpers";

export default function DrugMasterPage() {
  const [drugs, setDrugs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [currentDrug, setCurrentDrug] = useState(null);
  const [formData, setFormData] = useState({ name: "", salt: "", power: "", category: "O", is_active: true });

  const adminId = getLoggedInUser("admin")?.id;

  useEffect(() => {
    fetchDrugs();
    fetchCategories();
  }, [pagination.page, categoryFilter]);

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/drugs/categories");
    const data = await res.json();
    if (data.success) setCategories(data.data);
  };

  const fetchDrugs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: pagination.page,
        q: search,
        category: categoryFilter,
        limit: 10
      }).toString();

      const res = await fetch(`/api/admin/drugs?${query}`);
      const data = await res.json();
      if (data.success) {
        setDrugs(data.data);
        setPagination(prev => ({ ...prev, totalPages: data.pagination.totalPages }));
      }
    } catch (err) {
      toast.error("Failed to fetch drugs");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!adminId) {
      toast.error("Session expired. Please login again.");
      return;
    }
    const method = currentDrug ? "PATCH" : "POST";
    const payload = { ...formData, admin_id: adminId };
    if (currentDrug) payload.id = currentDrug.id;

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/drugs", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(currentDrug ? "Drug updated" : "Drug added");
        setIsModalOpen(false);
        fetchDrugs();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this drug?")) return;
    const res = await fetch(`/api/admin/drugs?id=${id}&admin_id=${adminId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("Drug deleted");
      fetchDrugs();
    } else {
      toast.error(data.error);
    }
  };

  const handleExport = async () => {
    const res = await fetch("/api/admin/drugs/bulk");
    const data = await res.json();
    if (data.success) {
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `drug_master_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    }
  };

  const downloadCSVTemplate = () => {
    const headers = ["name", "salt", "power", "category", "is_active"];
    const rows = [
      ["PARACETAMOL", "Acetaminophen", "500mg", "O", "true"],
      ["AMOXICILLIN", "Amoxicillin", "250mg", "A", "true"],
      ["DIAZEPAM", "Diazepam", "5mg", "B", "true"]
    ];
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "drug_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isCSV = file.name.endsWith(".csv");
    const isJSON = file.name.endsWith(".json");

    if (!isCSV && !isJSON) {
      toast.error("Please upload a .csv or .json file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let importedData = [];
        
        if (isJSON) {
          importedData = JSON.parse(event.target.result);
        } else {
          const results = Papa.parse(event.target.result, { header: true, skipEmptyLines: true });
          importedData = results.data.map(item => ({
            name: (item.name || item.Name || "").trim(),
            salt: item.salt || item.Salt || "",
            power: item.power || item.Power || "",
            category: (item.category || item.Category || "O").toUpperCase().trim(),
            is_active: String(item.is_active || item.Is_Active || "true").toLowerCase() === "true"
          }));
        }

        if (!Array.isArray(importedData) || importedData.length === 0) {
          throw new Error("No valid data found in file");
        }

        setImportPreview(importedData);
      } catch (err) {
        toast.error("Invalid file format: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!adminId) {
      toast.error("Session expired. Please login again.");
      return;
    }
    if (!importPreview) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/drugs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugs: importPreview, admin_id: adminId })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Imported ${data.count} drugs successfully`);
        setImportPreview(null);
        setIsImportModalOpen(false);
        fetchDrugs();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Import failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-5 mt-10 w-full mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-[#0067A1] rounded-2xl shadow-sm shadow-[#0067A1]/20">
              <Pill className="w-8 h-8 text-white" />
            </div>
            Drug Master Catalog
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            Manage global pharmaceutical database and clinical safety categories
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-750 transition-all shadow-sm"
          >
            <Download size={18} /> Export
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-750 transition-all shadow-sm"
          >
            <Upload size={18} /> Import
          </button>
          <button
            onClick={() => {
              setCurrentDrug(null);
              setFormData({ name: "", salt: "", power: "", category: "O", is_active: true });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0067A1] text-white rounded-xl font-bold hover:bg-[#0067A1]/90 transition-all shadow-sm shadow-[#0067A1]/20"
          >
            <Plus size={18} /> Add New Drug
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Drugs", value: pagination.total || drugs.length * pagination.totalPages, icon: Database, color: "blue" },
          { label: "Categories", value: categories.length, icon: Filter, color: "indigo" },
          { label: "Active Listings", value: drugs.filter(d => d.is_active).length, icon: CheckCircle, color: "emerald" },
          { label: "Restricted", value: drugs.filter(d => d.category === 'PROHIBITED').length, icon: AlertTriangle, color: "amber" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 capitalize tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 rounded-xl`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
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
            placeholder="Search by name, chemical composition..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDrugs()}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all outline-none text-base font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full md:w-48 py-2.5 px-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base font-semibold outline-none focus:ring-2 focus:ring-[#0067A1]"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name} - {c.description?.slice(0, 20)}...</option>)}
          </select>

          <button
            onClick={fetchDrugs}
            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider w-16">S.No</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider">Drug Identity</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider">Composition (Salt)</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider">Power</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider">Category</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider">Status</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="4" className="px-6 py-8"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full"></div></td>
                  </tr>
                ))
              ) : drugs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic">No drugs found in the catalog</td>
                </tr>
              ) : (
                drugs.map((drug, index) => (
                  <tr key={drug.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="text-base font-bold text-gray-400">
                        {(pagination.page - 1) * 10 + (index + 1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${drug.category === 'PROHIBITED' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                          <Pill size={18} />
                        </div>
                        <div>
                          <p className="text-base font-bold text-gray-900 dark:text-white">{drug.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-base font-medium text-gray-700 dark:text-gray-300 italic">{drug.salt || "N/A"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-base font-bold text-gray-900 dark:text-white">{drug.power || "N/A"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold tracking-tight ${drug.category === 'PROHIBITED' ? 'bg-red-100 text-red-700' :
                        drug.category === 'B' ? 'bg-amber-100 text-amber-700' :
                          drug.category === 'A' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-emerald-100 text-emerald-700'
                        }`}>
                        {drug.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {drug.is_active ? (
                        <span className="flex items-center gap-1 text-sm font-bold text-emerald-600 uppercase">
                          <CheckCircle size={14} /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm font-bold text-gray-400 uppercase">
                          <XCircle size={14} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setCurrentDrug(drug);
                            setFormData({ name: drug.name, salt: drug.salt || "", power: drug.power || "", category: drug.category, is_active: drug.is_active });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(drug.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          <p className="text-sm font-bold text-gray-400 capitalize">Page {pagination.page} of {Math.max(1, pagination.totalPages)}</p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              className="px-2 py-1 text-sm font-bold border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-all text-gray-600 dark:text-gray-300"
            >
              &lt;
            </button>
            {(() => {
              const pages = [];
              const maxVisible = 5;
              let start = Math.max(1, pagination.page - 2);
              let end = Math.min(Math.max(1, pagination.totalPages), start + maxVisible - 1);
              if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
              }
              for (let i = start; i <= end; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setPagination(p => ({ ...p, page: i }))}
                    className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                      pagination.page === i 
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
              className="px-2 py-1 text-sm font-bold border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-all text-gray-600 dark:text-gray-300"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 scale-in-center">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize tracking-tight">
                {currentDrug ? "Edit Drug Record" : "Add New Drug"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><XCircle /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Brand Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Paracetamol"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-bold text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Composition (Salt)</label>
                  <input
                    type="text"
                    value={formData.salt}
                    onChange={(e) => setFormData({ ...formData, salt: e.target.value })}
                    placeholder="e.g. Acetaminophen"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-medium text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Power / Strength</label>
                  <input
                    type="text"
                    value={formData.power}
                    onChange={(e) => setFormData({ ...formData, power: e.target.value })}
                    placeholder="e.g. 500mg"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-bold text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Safety Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-bold text-base"
                >
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name} - {c.description?.slice(0, 30)}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                <input
                  type="checkbox"
                  id="active-check"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
                />
                <label htmlFor="active-check" className="text-base font-bold text-gray-700 dark:text-gray-300 select-none">
                  Listing is active and available for prescriptions
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-6 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-2xl font-bold uppercase text-sm tracking-widest hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={processing}
                  className="flex-1 py-3 px-6 bg-[#0067A1] text-white rounded-2xl font-bold uppercase text-sm tracking-widest hover:bg-[#0067A1]/90 transition-all shadow-sm shadow-[#0067A1]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : (currentDrug ? "Save Changes" : "Add Drug")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
          <div className={`bg-white dark:bg-gray-800 w-full rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in duration-300 transition-all flex flex-col ${
            importPreview ? 'max-w-4xl max-h-[90vh]' : 'max-w-lg'
          }`}>
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700 pb-4 shrink-0">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize tracking-tight flex items-center gap-2">
                <Upload size={24} className="text-[#0067A1]" />
                {importPreview ? "Review Import Data" : "Bulk Import Catalog"}
              </h2>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview(null);
                }} 
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <XCircle />
              </button>
            </div>

            {!importPreview ? (
              <>
                <div className="text-center">
                  <p className="text-base text-gray-500 mt-2">Upload a CSV or JSON file containing the drug master list.</p>
                  <button 
                    onClick={downloadCSVTemplate}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#0067A1] hover:underline"
                  >
                    <Download size={14} /> Download CSV Template
                  </button>
                </div>

                <div className="p-12 border-4 border-dashed border-gray-100 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center space-y-4 hover:border-[#0067A1]/50 transition-all cursor-pointer relative group">
                  <input 
                    type="file" 
                    accept=".csv,.json"
                    onChange={handleImport}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileText className="w-16 h-16 text-gray-200 group-hover:text-[#0067A1] transition-colors" />
                  <p className="text-base font-bold text-gray-400 group-hover:text-gray-600 transition-colors"> Drop CSV/JSON file here or click to browse</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col min-h-0 flex-1 space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-start gap-3 shrink-0">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-base text-amber-800 dark:text-amber-400 font-medium">
                    Review the <span className="font-bold">{importPreview.length}</span> records detected in your file. 
                    Clicking "Confirm Import" will update your master catalog. Existing drugs with the same name will be overwritten.
                  </p>
                </div>

                <div className="flex-1 overflow-auto rounded-2xl border border-gray-100 dark:border-gray-700 min-h-[200px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black text-gray-400 capitalize tracking-widest">Name</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-400 capitalize tracking-widest">Salt</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-400 capitalize tracking-widest">Power</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-400 capitalize tracking-widest">Category</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-400 capitalize tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {importPreview.map((item, i) => (
                        <tr key={i} className="text-base">
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{item.name}</td>
                          <td className="px-4 py-3 text-gray-500 italic">{item.salt || "-"}</td>
                          <td className="px-4 py-3 font-medium">{item.power || "-"}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-bold">{item.category}</span></td>
                          <td className="px-4 py-3">
                            {item.is_active ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-gray-300" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4 pt-2 shrink-0">
                  <button 
                    onClick={() => setImportPreview(null)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white rounded-2xl font-black capitalize text-sm tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Clear & Re-upload
                  </button>
                  <button 
                    onClick={handleConfirmImport}
                    disabled={processing}
                    className="flex-[2] py-4 bg-[#0067A1] text-white rounded-2xl font-black capitalize text-xs tracking-widest hover:bg-[#0067A1]/90 transition-all shadow-sm shadow-[#0067A1]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? "Processing..." : `Confirm Import (${importPreview.length} Drugs)`}
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
