"use client";

import React, { useState, useEffect } from "react";
import {
  Microscope, Plus, Search, Filter, Download, Upload,
  Edit2, Trash2, CheckCircle, XCircle, FileText, 
  Activity, AlertTriangle, Database, RefreshCw,
  Percent, Coins, ShieldAlert, Sparkles, Save
} from "lucide-react";
import toast from "react-hot-toast";
import Papa from "papaparse";
import { getLoggedInUser } from "@/lib/authHelpers";

export default function LabTestsMasterPage() {
  const [labTests, setLabTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedLab, setSelectedLab] = useState("");
  const [labsList, setLabsList] = useState([]);
  const [selectedLabDetails, setSelectedLabDetails] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, activeTotal: 0 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [commissionSettings, setCommissionSettings] = useState([]);
  const [savingCommission, setSavingCommission] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [currentTest, setCurrentTest] = useState(null);
  const [formData, setFormData] = useState({
    test_code: "",
    test_name: "",
    category: "Category 1",
    mrp: "",
    sample_type: "",
    container: "",
    temp: "",
    remarks: "",
    schedule: "",
    reporting_schedule: "",
    instructions: "",
    is_active: true
  });

  const adminId = getLoggedInUser("admin")?.id;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const labParam = params.get("lab_id");
      if (labParam) {
        setSelectedLab(labParam);
      }
      if (params.get("tab") === "commissions") {
        setIsCommissionModalOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    fetchLabTests();
    fetchCategories();
    fetchCommissionSettings();
  }, [pagination.page, categoryFilter, selectedLab]);

  const fetchCommissionSettings = async () => {
    try {
      const res = await fetch("/api/admin/labs/commission-settings");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCommissionSettings(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch commission settings");
    }
  };

  const handleSaveCommission = async () => {
    setSavingCommission(true);
    try {
      const res = await fetch("/api/admin/labs/commission-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: commissionSettings })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Commission settings updated successfully");
        setIsCommissionModalOpen(false);
        fetchLabTests();
      } else {
        toast.error(data.error || "Failed to update commission settings");
      }
    } catch (err) {
      toast.error("Failed to save commission settings");
    } finally {
      setSavingCommission(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/labs/categories");
      const data = await res.json();
      if (data.success) setCategories(data.data || []);
    } catch (e) {
      console.error("Failed to fetch categories");
    }
  };

  const fetchLabTests = async () => {
    setLoading(true);
    try {
      const queryParams = {
        page: pagination.page,
        q: search,
        category: categoryFilter,
        limit: 10
      };
      if (selectedLab) queryParams.lab_id = selectedLab;

      const query = new URLSearchParams(queryParams).toString();

      const res = await fetch(`/api/admin/lab-tests?${query}`);
      const data = await res.json();
      if (data.success) {
        setLabTests(data.data || []);
        if (data.labs && Array.isArray(data.labs)) {
          setLabsList(data.labs);
        }
        setSelectedLabDetails(data.selectedLab || null);
        setPagination(prev => ({ 
          ...prev, 
          totalPages: data.pagination?.totalPages || 1,
          total: data.pagination?.total || 0,
          activeTotal: data.pagination?.activeTotal !== undefined ? data.pagination.activeTotal : (data.pagination?.total || 0)
        }));
      }
    } catch (err) {
      toast.error("Failed to fetch lab tests");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.test_name) return toast.error("Test Name is required");

    const method = currentTest ? "PUT" : "POST";
    const payload = { ...formData };
    if (currentTest) payload.id = currentTest.id;

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/lab-tests", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(currentTest ? "Lab test updated" : "Lab test added");
        setIsModalOpen(false);
        fetchLabTests();
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
    if (!confirm("Are you sure you want to delete this lab test?")) return;
    const res = await fetch(`/api/admin/lab-tests?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("Lab test deleted");
      fetchLabTests();
    } else {
      toast.error(data.error);
    }
  };

  const handleExport = async () => {
    // Fetch all pages of lab-tests to circumvent the 1000-row limit of Supabase
    try {
      const res1 = await fetch("/api/admin/lab-tests?page=1&limit=1000");
      const json1 = await res1.json();
      if (!json1.success || !Array.isArray(json1.data)) {
        toast.error("Failed to export: invalid data format");
        return;
      }
      let allData = [...json1.data];
      const total = json1.pagination?.total || 0;
      const totalPages = Math.ceil(total / 1000);

      if (totalPages > 1) {
        const fetchPromises = [];
        for (let p = 2; p <= totalPages; p++) {
          fetchPromises.push(
            fetch(`/api/admin/lab-tests?page=${p}&limit=1000`)
              .then(r => r.json())
              .then(j => j.success && Array.isArray(j.data) ? j.data : [])
              .catch(() => [])
          );
        }
        const results = await Promise.all(fetchPromises);
        for (const pageData of results) {
          allData = allData.concat(pageData);
        }
      }

      const csv = Papa.unparse(allData.map(t => ({
        test_code: t.test_code || "",
        test_name: t.test_name || "",
        category: t.category || "",
        mrp: t.mrp !== undefined ? t.mrp : 0,
        commission_percentage: t.commission_percentage !== undefined ? t.commission_percentage : 0,
        sample_type: t.sample_type || "",
        container: t.container || "",
        temp: t.temp || "",
        remarks: t.remarks || "",
        schedule: t.schedule || "",
        reporting_schedule: t.reporting_schedule || "",
        is_active: t.is_active
      })));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lab_tests_master_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (err) {
      toast.error("Export failed: " + err.message);
    }
  };

  const downloadCSVTemplate = () => {
    const headers = [
      "test_code",
      "test_name",
      "category",
      "mrp",
      "commission_percentage",
      "sample_type",
      "container",
      "temp",
      "remarks",
      "schedule",
      "reporting_schedule",
      "is_active"
    ];
    const rows = [
      [
        "MGR0712",
        "Complete Blood Count (CBC)",
        "Category 1",
        "350",
        "50",
        "Whole blood EDTA",
        "Lavender top",
        "R",
        "Do not freeze",
        "Daily by 3:00 PM",
        "Same day",
        "true"
      ],
      [
        "MGR0381",
        "HbA1c",
        "Category 1",
        "500",
        "50",
        "Whole blood EDTA",
        "Lavender top",
        "R",
        "Fasting not required",
        "Daily by 3:00 PM",
        "Same day",
        "true"
      ]
    ];
    const csvContent = Papa.unparse({ fields: headers, data: rows });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "lab_test_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isCSV = file.name.endsWith(".csv");
    if (!isCSV) {
      toast.error("Please upload a .csv file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const results = Papa.parse(event.target.result, { header: true, skipEmptyLines: true });
        const importedData = results.data.map((item, idx) => ({
          _id: idx, // temporary id for editing
          test_code: (item.test_code || item.Test_Code || item['Test Code'] || item.code || "").trim(),
          test_name: (item.test_name || item.Test_Name || item['Test Name'] || item.name || "").trim(),
          category: (item.category || item.Category || "Category 1").trim(),
          mrp: parseFloat(item.mrp || item.MRP || item.price || item.Price || 0) || 0,
          commission_percentage: parseFloat(item.commission_percentage || item['Commission %'] || item.commission || 0) || 0,
          sample_type: (item.sample_type || item.Sample_Type || item['Sample Type'] || "").trim(),
          container: (item.container || item.Container || "").trim(),
          temp: (item.temp || item.Temp || item.temperature || item.Temperature || "").trim(),
          remarks: (item.remarks || item.Remarks || "").trim(),
          schedule: (item.schedule || item.Schedule || "").trim(),
          reporting_schedule: (item.reporting_schedule || item.Reporting_Schedule || item['Reporting Schedule'] || "").trim(),
          instructions: (item.remarks || item.Remarks || item.instructions || item.Instructions || "").trim(),
          is_active: String(item.is_active || item.Is_Active || item.Active || item.active || "true").toLowerCase() === "true"
        })).filter(row => row.test_name);

        if (importedData.length === 0) {
          throw new Error("No valid data found in file");
        }

        setImportPreview(importedData);
      } catch (err) {
        toast.error("Invalid file format: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  // Inline editing in the preview modal
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
      // Remove the temporary _id field before sending to API
      const payload = importPreview.map(({ _id, ...rest }) => rest);
      
      const res = await fetch("/api/admin/lab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Imported ${importPreview.length} lab tests successfully`);
        setImportPreview(null);
        setIsImportModalOpen(false);
        fetchLabTests();
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
              <Microscope className="w-8 h-8 text-white" />
            </div>
            Lab Tests Master
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            Manage the standard catalog of lab tests, categories, and instructions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              fetchCommissionSettings();
              setIsCommissionModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg font-bold hover:brightness-110 transition-all shadow-md shadow-emerald-700/20"
            title="Configure admin/system commission percentages per test category"
          >
            <Percent size={18} /> Commission Tiers
          </button>
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
            <Upload size={18} /> Bulk Import
          </button>
          <button
            onClick={() => {
              setCurrentTest(null);
              setFormData({
                test_code: "",
                test_name: "",
                category: "Category 1",
                mrp: "",
                sample_type: "",
                container: "",
                temp: "",
                remarks: "",
                schedule: "",
                reporting_schedule: "",
                instructions: "",
                is_active: true
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0067A1] text-white rounded-xl font-bold hover:bg-[#0067A1]/90 transition-all shadow-sm shadow-[#0067A1]/20"
          >
            <Plus size={18} /> Add New Test
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { 
            label: selectedLabDetails ? `Total Tests (${selectedLabDetails.lab_name})` : "Total Lab Tests", 
            value: pagination.total, 
            icon: Database, 
            color: "blue" 
          },
          { 
            label: "Lab Categories", 
            value: categories.length, 
            icon: Filter, 
            color: "indigo" 
          },
          { 
            label: selectedLabDetails ? `Active Tests (${selectedLabDetails.lab_name})` : "Active Tests", 
            value: pagination.activeTotal || pagination.total, 
            icon: CheckCircle, 
            color: "emerald" 
          },
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
            placeholder="Search lab tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLabTests()}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all outline-none text-base font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Lab Filter Dropdown */}
          <select
            value={selectedLab}
            onChange={(e) => {
              setSelectedLab(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="w-full md:w-64 py-2.5 px-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#0067A1]"
          >
            <option value="">All Labs (Master Catalog)</option>
            {labsList.map(lab => (
              <option key={lab.id} value={lab.id}>
                🏥 {lab.lab_name}
              </option>
            ))}
          </select>

          {/* Category Filter Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="w-full md:w-56 py-2.5 px-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#0067A1]"
          >
            <option value="">All Tiers & Categories</option>
            <option value="Category 1">Category 1 (50% Comm.)</option>
            <option value="Category 2">Category 2 (40% Comm.)</option>
            <option value="Category 3">Category 3 (30% Comm.)</option>
            <option value="Category 4">Category 4 (5% Comm.)</option>
            <option value="Package">Package (50% Comm.)</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>

          <button
            onClick={fetchLabTests}
            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            title="Refresh Tests"
          >
            <RefreshCw size={20} className={loading ? "animate-spin text-[#0067A1]" : ""} />
          </button>
        </div>
      </div>

      {/* Active Lab Partner Filter Banner */}
      {selectedLabDetails && (
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-[#0067A1] dark:text-sky-400 shrink-0">
              <Microscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0067A1] dark:text-sky-300">
                  Viewing Tests For Lab Partner
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#0067A1] text-white">
                  {pagination.total} Tests Configured
                </span>
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                {selectedLabDetails.lab_name}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedLab("");
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#0067A1] bg-white dark:bg-gray-800 hover:bg-sky-50 border border-[#0067A1]/20 transition-all shadow-sm shrink-0"
          >
            Reset to Master Catalog
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider w-14">S.No</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider w-28">Test Code</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider">Test Name</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider w-24">MRP (₹)</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider w-36">Commission Tier</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider">Container</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider">Status</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-400 capitalize tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="8" className="px-6 py-8"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full"></div></td>
                  </tr>
                ))
              ) : labTests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500 italic">No lab tests found</td>
                </tr>
              ) : (
                labTests.map((test, index) => (
                  <tr key={test.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="text-base font-bold text-gray-400">
                        {(pagination.page - 1) * 10 + (index + 1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">
                        {test.test_code || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          <Microscope size={18} />
                        </div>
                        <div>
                          <p className="text-base font-bold text-gray-900 dark:text-white">{test.test_name}</p>
                          {test.sample_type && (
                            <p className="text-xs text-gray-400 mt-0.5">{test.sample_type}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ₹{test.mrp ? Number(test.mrp).toLocaleString('en-IN') : "0"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight ${
                        test.category === "Category 1"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : test.category === "Category 2"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          : test.category === "Category 3"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                          : test.category === "Category 4"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"
                      }`} title="Internal commission tier — not visible to patients">
                        {test.category || "Cat 1"} ({test.category === "Category 1" ? "50%" : test.category === "Category 2" ? "40%" : test.category === "Category 3" ? "30%" : test.category === "Category 4" ? "5%" : "50%"})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-400 max-w-xs truncate" title={test.container}>
                        {test.container || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {test.is_active ? (
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
                            setCurrentTest(test);
                            setFormData({ 
                              test_code: test.test_code || "",
                              test_name: test.test_name, 
                              category: test.category || "Category 1", 
                              mrp: test.mrp || "",
                              sample_type: test.sample_type || "",
                              container: test.container || "",
                              temp: test.temp || "",
                              remarks: test.remarks || "",
                              schedule: test.schedule || "",
                              reporting_schedule: test.reporting_schedule || "",
                              instructions: test.instructions || "", 
                              is_active: test.is_active 
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(test.id)}
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
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 scale-in-center">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize tracking-tight">
                {currentTest ? "Edit Lab Test" : "Add New Test"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><XCircle /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Test Code</label>
                  <input
                    type="text"
                    value={formData.test_code || ""}
                    onChange={(e) => setFormData({ ...formData, test_code: e.target.value })}
                    placeholder="e.g. MGR0712"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-bold text-base text-gray-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Test Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.test_name}
                    onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                    placeholder="e.g. Complete Blood Count"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-bold text-base text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">MRP / Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.mrp || ""}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-bold text-base text-gray-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Commission Tier (Admin Only) *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-bold text-base text-gray-900 dark:text-white"
                  >
                    <option value="Category 1">Category 1 (50% Commission)</option>
                    <option value="Category 2">Category 2 (40% Commission)</option>
                    <option value="Category 3">Category 3 (30% Commission)</option>
                    <option value="Category 4">Category 4 (5% Commission)</option>
                    <option value="Package">Package (50% Commission)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Sample Type</label>
                  <input
                    type="text"
                    value={formData.sample_type || ""}
                    onChange={(e) => setFormData({ ...formData, sample_type: e.target.value })}
                    placeholder="e.g. Whole blood EDTA"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-medium text-base text-gray-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Container</label>
                  <input
                    type="text"
                    value={formData.container || ""}
                    onChange={(e) => setFormData({ ...formData, container: e.target.value })}
                    placeholder="e.g. Lavender top"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-medium text-base text-gray-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Temperature</label>
                  <input
                    type="text"
                    value={formData.temp || ""}
                    onChange={(e) => setFormData({ ...formData, temp: e.target.value })}
                    placeholder="e.g. R, F, A"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-medium text-base text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Schedule</label>
                  <input
                    type="text"
                    value={formData.schedule || ""}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    placeholder="e.g. Daily by 3:00 PM"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-medium text-base text-gray-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Reporting Schedule</label>
                  <input
                    type="text"
                    value={formData.reporting_schedule || ""}
                    onChange={(e) => setFormData({ ...formData, reporting_schedule: e.target.value })}
                    placeholder="e.g. Same day"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-medium text-base text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 capitalize tracking-widest">Remarks / Instructions</label>
                <textarea
                  value={formData.remarks || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, remarks: val, instructions: val });
                  }}
                  placeholder="e.g. Fasting preferred"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] transition-all font-medium text-base resize-none text-gray-900 dark:text-white"
                />
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
                  Available for prescriptions
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
                  {processing ? "Saving..." : (currentTest ? "Save Changes" : "Add Test")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
          <div className={`bg-white dark:bg-gray-800 w-full rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in duration-300 transition-all flex flex-col ${
            importPreview ? 'max-w-6xl max-h-[90vh]' : 'max-w-lg'
          }`}>
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700 pb-4 shrink-0">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize tracking-tight flex items-center gap-2">
                <Upload size={24} className="text-[#0067A1]" />
                {importPreview ? "Review & Edit Data" : "Bulk Import Lab Tests"}
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
                <div className="text-center shrink-0">
                  <p className="text-base text-gray-500 mt-2">Upload a CSV file containing your lab tests. You will be able to review and edit the data before confirming.</p>
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
                    accept=".csv"
                    onChange={handleImport}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileText className="w-16 h-16 text-gray-200 group-hover:text-[#0067A1] transition-colors" />
                  <p className="text-base font-bold text-gray-400 group-hover:text-gray-600 transition-colors"> Drop CSV file here or click to browse</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col min-h-0 flex-1 space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-3 shrink-0">
                  <AlertTriangle className="text-[#0067A1] shrink-0 mt-0.5" size={18} />
                  <p className="text-base text-blue-800 dark:text-blue-400 font-medium">
                    Review the <span className="font-bold">{importPreview.length}</span> records detected in your file. 
                    <span className="font-bold ml-1">You can click on any field below to edit it directly!</span>
                  </p>
                </div>

                <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-900 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 w-16 text-center">#</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">Code</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">Test Name *</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">Category</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">Sample Type</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">Container</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">Temp</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">Remarks</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 w-24 text-center">Active</th>
                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {importPreview.map((item, i) => (
                        <tr key={item._id} className="text-base hover:bg-gray-50 dark:hover:bg-gray-900/50 group transition-colors">
                          <td className="px-4 py-2 text-center text-gray-400 font-medium text-sm">
                            {i + 1}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.test_code || ''}
                              onChange={(e) => updatePreviewField(i, 'test_code', e.target.value)}
                              className="w-24 px-2 py-1 bg-transparent hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 border border-transparent hover:border-gray-300 focus:border-[#0067A1] rounded outline-none font-mono text-xs transition-all text-gray-900 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.test_name || ''}
                              onChange={(e) => updatePreviewField(i, 'test_name', e.target.value)}
                              className="w-full min-w-[150px] px-2 py-1 bg-transparent hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 border border-transparent hover:border-gray-300 focus:border-[#0067A1] rounded outline-none font-bold text-gray-900 dark:text-white transition-all text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                             <select
                              value={item.category || ''}
                              onChange={(e) => updatePreviewField(i, 'category', e.target.value)}
                              className="w-full px-2 py-1 bg-transparent hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 border border-transparent hover:border-gray-300 focus:border-[#0067A1] rounded outline-none text-gray-700 dark:text-gray-300 transition-all font-medium appearance-none text-sm"
                            >
                              <option value="">None</option>
                              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.sample_type || ''}
                              onChange={(e) => updatePreviewField(i, 'sample_type', e.target.value)}
                              className="w-full min-w-[120px] px-2 py-1 bg-transparent hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 border border-transparent hover:border-gray-300 focus:border-[#0067A1] rounded outline-none text-gray-700 dark:text-gray-300 transition-all text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.container || ''}
                              onChange={(e) => updatePreviewField(i, 'container', e.target.value)}
                              className="w-full min-w-[120px] px-2 py-1 bg-transparent hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 border border-transparent hover:border-gray-300 focus:border-[#0067A1] rounded outline-none text-gray-700 dark:text-gray-300 transition-all text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.temp || ''}
                              onChange={(e) => updatePreviewField(i, 'temp', e.target.value)}
                              className="w-12 px-2 py-1 bg-transparent hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 border border-transparent hover:border-gray-300 focus:border-[#0067A1] rounded outline-none text-gray-700 dark:text-gray-300 text-center font-bold text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.remarks || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updatePreviewField(i, 'remarks', val);
                                updatePreviewField(i, 'instructions', val);
                              }}
                              className="w-full min-w-[150px] px-2 py-1 bg-transparent hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 border border-transparent hover:border-gray-300 focus:border-[#0067A1] rounded outline-none text-gray-700 dark:text-gray-300 transition-all text-sm"
                              placeholder="e.g. Fasting 10 hrs"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                             <input
                              type="checkbox"
                              checked={item.is_active}
                              onChange={(e) => updatePreviewField(i, 'is_active', e.target.checked)}
                              className="w-5 h-5 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1] cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => {
                                setImportPreview(prev => prev.filter((_, idx) => idx !== i));
                              }}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove row"
                            >
                              <Trash2 size={16} />
                            </button>
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
                    disabled={processing || importPreview.length === 0}
                    className="flex-[2] py-4 bg-[#0067A1] text-white rounded-2xl font-black capitalize text-sm tracking-widest hover:bg-[#0067A1]/90 transition-all shadow-sm shadow-[#0067A1]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? "Processing..." : `Confirm & Save ${importPreview.length} Tests`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Commission Configuration Modal */}
      {isCommissionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-md">
                  <Percent size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Commission Tiers</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Configure platform commission percentages</p>
                </div>
              </div>
              <button onClick={() => setIsCommissionModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                  <strong>Backend Calculation Only:</strong> These commission percentages are strictly used to compute system commission revenue and lab payout settlements. They are <strong>never</strong> displayed to patients or anywhere on the public-facing marketplace.
                </p>
              </div>

              <div className="space-y-3">
                {commissionSettings.map((item, idx) => (
                  <div key={item.id || item.category_key} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {item.category_label || item.category_key}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-full font-mono">
                          {item.category_key}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{item.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={item.commission_percentage}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setCommissionSettings(prev => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], commission_percentage: val };
                            return copy;
                          });
                        }}
                        className="w-20 px-3 py-2 text-center text-base font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white font-mono"
                      />
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsCommissionModalOpen(false)}
                className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCommission}
                disabled={savingCommission}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 text-sm"
              >
                <Save size={16} /> {savingCommission ? "Saving..." : "Save Commission Rates"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
