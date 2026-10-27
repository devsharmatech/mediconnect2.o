"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import {
  FileText,
  Search,
  Download,
  Eye,
  Copy,
  RefreshCw,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  FileSpreadsheet,
  Stethoscope,
  Pill,
  Microscope,
  Hospital,
  User,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  LayoutGrid,
  List,
  ShieldCheck,
  Building2,
  Calendar,
  Phone,
  Mail,
  BadgeAlert,
  Info,
} from "lucide-react";
import PdfJsViewer from "@/components/public-site/ui/PdfJsViewer";

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    doctor: 0,
    chemist: 0,
    lab: 0,
    hospital: 0,
  });

  // Filters
  const [activeRole, setActiveRole] = useState("all");
  const [category, setCategory] = useState("all");
  const [fileType, setFileType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Modal Preview
  const [previewDoc, setPreviewDoc] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showModalSidebar, setShowModalSidebar] = useState(true);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        role: activeRole,
        category,
        fileType,
        status,
        search,
        sortBy,
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(`/api/admin/documents?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setDocuments(json.data || []);
        if (json.summary) setSummary(json.summary);
        if (json.pagination) setPagination(json.pagination);
      } else {
        toast.error(json.error || "Failed to load documents");
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      toast.error("Network error while loading documents");
    } finally {
      setLoading(false);
    }
  }, [activeRole, category, fileType, status, search, sortBy, page, limit]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle Search Input submit / debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const handleRoleChange = (role) => {
    setActiveRole(role);
    setPage(1);
  };

  const handleResetFilters = () => {
    setActiveRole("all");
    setCategory("all");
    setFileType("all");
    setStatus("all");
    setSearch("");
    setSearchInput("");
    setSortBy("newest");
    setPage(1);
  };

  const copyUrlToClipboard = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success("Document link copied!");
  };

  const triggerDownload = (doc) => {
    if (!doc?.url) return;
    const downloadName = `${doc.entity_name}_${doc.doc_title}`.replace(/\s+/g, "_");
    const downloadUrl = `/api/admin/documents/download?url=${encodeURIComponent(
      doc.url
    )}&name=${encodeURIComponent(downloadName)}`;
    
    // Trigger download via anchor
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${downloadName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started");
  };

  const handleExportCSV = () => {
    if (documents.length === 0) {
      toast.error("No documents to export");
      return;
    }

    const headers = [
      "Role",
      "Entity Name",
      "Specialty/Subtitle",
      "Phone",
      "Email",
      "License/Reg No",
      "Document Title",
      "Category",
      "File Format",
      "Status",
      "Date",
      "URL",
    ];

    const rows = documents.map((d) => [
      d.role,
      `"${(d.entity_name || "").replace(/"/g, '""')}"`,
      `"${(d.entity_subtitle || "").replace(/"/g, '""')}"`,
      d.entity_phone || "",
      d.entity_email || "",
      `"${(d.license_or_reg_no || "").replace(/"/g, '""')}"`,
      `"${(d.doc_title || "").replace(/"/g, '""')}"`,
      `"${(d.category || "").replace(/"/g, '""')}"`,
      d.file_type || "",
      d.onboarding_status || "",
      d.created_at ? new Date(d.created_at).toLocaleDateString() : "",
      d.url || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `mediconnect_documents_page_${page}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported");
  };

  const openPreview = (doc) => {
    setPreviewDoc(doc);
    setZoomLevel(1);
    setRotation(0);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setShowModalSidebar(false);
    } else {
      setShowModalSidebar(true);
    }
  };

  const closePreview = () => {
    setPreviewDoc(null);
    setZoomLevel(1);
    setRotation(0);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "doctor":
        return {
          label: "Doctor",
          bg: "bg-[#0067A1] text-white",
          icon: <Stethoscope className="w-3 h-3" />,
        };
      case "chemist":
        return {
          label: "Chemist",
          bg: "bg-[#D97706] text-white",
          icon: <Pill className="w-3 h-3" />,
        };
      case "lab":
        return {
          label: "Lab",
          bg: "bg-[#7C3AED] text-white",
          icon: <Microscope className="w-3 h-3" />,
        };
      case "hospital":
        return {
          label: "Hospital",
          bg: "bg-[#059669] text-white",
          icon: <Hospital className="w-3 h-3" />,
        };
      case "patient":
        return {
          label: "Patient",
          bg: "bg-[#0284C7] text-white",
          icon: <User className="w-3 h-3" />,
        };
      default:
        return {
          label: "Partner",
          bg: "bg-[#475569] text-white",
          icon: <Building2 className="w-3 h-3" />,
        };
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "approved" || s === "verified") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          Verified
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
          <XCircle className="w-3 h-3 text-rose-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        <Clock className="w-3 h-3 text-amber-600" />
        Pending
      </span>
    );
  };

  const getFormatBadge = (fileType) => {
    if (fileType === "pdf") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-rose-600 text-white uppercase">
          PDF
        </span>
      );
    }
    if (fileType === "image") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-blue-600 text-white uppercase">
          IMG
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-slate-600 text-white uppercase">
        DOC
      </span>
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#1E293B] dark:text-[#E2E8F0] p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0067A1] text-white flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-[#003358] dark:text-white">
                  Documents Vault
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  DPDP Act 2023 Compliant
                </span>
              </div>
              <p className="text-xs md:text-sm text-[#64748B] dark:text-[#94A3B8]">
                Centralized credential & compliance repository for Doctors, Labs, Chemists, and Hospitals (Partner KYC & Regulatory Vault)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155] text-[#334155] dark:text-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#005282] transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          {
            label: "Total Documents",
            count: summary.total,
            icon: <FileText className="w-4 h-4 text-[#0067A1]" />,
            borderColor: "border-[#0067A1]",
            role: "all",
          },
          {
            label: "Doctors",
            count: summary.doctor,
            icon: <Stethoscope className="w-4 h-4 text-[#0067A1]" />,
            borderColor: "border-[#0067A1]",
            role: "doctor",
          },
          {
            label: "Chemists",
            count: summary.chemist,
            icon: <Pill className="w-4 h-4 text-[#D97706]" />,
            borderColor: "border-[#D97706]",
            role: "chemist",
          },
          {
            label: "Diagnostic Labs",
            count: summary.lab,
            icon: <Microscope className="w-4 h-4 text-[#7C3AED]" />,
            borderColor: "border-[#7C3AED]",
            role: "lab",
          },
          {
            label: "Hospitals",
            count: summary.hospital,
            icon: <Hospital className="w-4 h-4 text-[#059669]" />,
            borderColor: "border-[#059669]",
            role: "hospital",
          },
        ].map((card, idx) => (
          <button
            key={idx}
            onClick={() => handleRoleChange(card.role)}
            className={`p-3.5 rounded-xl bg-white dark:bg-[#1E293B] border text-left transition-all hover:shadow-sm ${
              activeRole === card.role
                ? `${card.borderColor} ring-2 ring-[#0067A1]/20 shadow-sm`
                : "border-[#E2E8F0] dark:border-[#334155]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                {card.label}
              </span>
              <div className="p-1 rounded-md bg-[#F1F5F9] dark:bg-[#0F172A]">
                {card.icon}
              </div>
            </div>
            <div className="text-xl font-bold text-[#003358] dark:text-white">
              {card.count}
            </div>
          </button>
        ))}
      </div>

      {/* Role Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#CBD5E1] dark:border-[#334155]">
        {[
          { id: "all", label: "All Partners", count: summary.total },
          { id: "doctor", label: "Doctors", count: summary.doctor },
          { id: "chemist", label: "Chemists", count: summary.chemist },
          { id: "lab", label: "Diagnostic Labs", count: summary.lab },
          { id: "hospital", label: "Hospitals", count: summary.hospital },
        ].map((tab) => {
          const isActive = activeRole === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleRoleChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-[#0067A1] text-[#0067A1] dark:text-sky-400 bg-white dark:bg-[#1E293B]"
                  : "border-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#003358] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]/60"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-[#0067A1] text-white"
                    : "bg-[#E2E8F0] dark:bg-[#334155] text-[#475569] dark:text-[#CBD5E1]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filters Bar */}
      <div className="p-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, phone, email, license, document title..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[#CBD5E1] dark:border-[#475569] bg-[#F8FAFC] dark:bg-[#0F172A] text-[#1E293B] dark:text-white focus:outline-none focus:border-[#0067A1]"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#334155]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs rounded-lg border border-[#CBD5E1] dark:border-[#475569] bg-[#F8FAFC] dark:bg-[#0F172A] text-[#1E293B] dark:text-white focus:outline-none focus:border-[#0067A1]"
            >
              <option value="all">All Categories</option>
              <option value="License & Registration">License & Registration</option>
              <option value="Identity Proof">Identity Proof</option>
              <option value="Tax & Compliance">Tax & Compliance</option>
              <option value="Financial & Banking">Financial & Banking</option>
              <option value="Establishment Proof">Establishment Proof</option>
              <option value="Medical & Clinical">Medical & Clinical</option>
              <option value="Signature & Consent">Signature & Consent</option>
            </select>
          </div>

          {/* File Format Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={fileType}
              onChange={(e) => {
                setFileType(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs rounded-lg border border-[#CBD5E1] dark:border-[#475569] bg-[#F8FAFC] dark:bg-[#0F172A] text-[#1E293B] dark:text-white focus:outline-none focus:border-[#0067A1]"
            >
              <option value="all">All Formats</option>
              <option value="pdf">PDF Documents</option>
              <option value="image">Images (JPG/PNG)</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs rounded-lg border border-[#CBD5E1] dark:border-[#475569] bg-[#F8FAFC] dark:bg-[#0F172A] text-[#1E293B] dark:text-white focus:outline-none focus:border-[#0067A1]"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Verified / Approved</option>
              <option value="pending">Pending Review</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Controls: Reset, View Mode */}
          <div className="lg:col-span-2 flex items-center justify-between sm:justify-end gap-2">
            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              className="px-2.5 py-2 text-xs font-semibold rounded-lg bg-[#F1F5F9] dark:bg-[#0F172A] text-[#475569] dark:text-[#CBD5E1] hover:bg-[#E2E8F0] transition-colors"
            >
              Reset
            </button>
            <div className="flex items-center rounded-lg border border-[#CBD5E1] dark:border-[#475569] p-0.5 bg-[#F8FAFC] dark:bg-[#0F172A]">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded ${
                  viewMode === "table"
                    ? "bg-[#0067A1] text-white"
                    : "text-[#64748B] hover:text-[#003358]"
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${
                  viewMode === "grid"
                    ? "bg-[#0067A1] text-white"
                    : "text-[#64748B] hover:text-[#003358]"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Count & Items Per Page */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9] dark:border-[#334155] text-xs text-[#64748B] dark:text-[#94A3B8]">
          <div>
            Showing{" "}
            <span className="font-semibold text-[#003358] dark:text-white">
              {pagination.totalItems > 0 ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-[#003358] dark:text-white">
              {Math.min(page * limit, pagination.totalItems)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[#003358] dark:text-white">
              {pagination.totalItems}
            </span>{" "}
            documents
          </div>
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="py-1 px-2 rounded border border-[#CBD5E1] dark:border-[#475569] bg-[#F8FAFC] dark:bg-[#0F172A] text-xs"
            >
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Loading documents from vault...
          </p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-12 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#F1F5F9] dark:bg-[#0F172A] flex items-center justify-center text-[#94A3B8]">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#003358] dark:text-white">
            No Documents Found
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto">
            No files matched your current role, search or filter criteria. Try resetting filters to view all documents.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#005282] transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-[#CBD5E1] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Entity & Role</th>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">License / Reg No</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#334155]">
                {documents.map((doc) => {
                  const roleBadge = getRoleBadge(doc.role);
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A]/50 transition-colors"
                    >
                      {/* Entity & Role */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${roleBadge.bg}`}
                          >
                            {roleBadge.icon}
                            {roleBadge.label}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#003358] dark:text-white truncate max-w-[180px]">
                              {doc.entity_name}
                            </p>
                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate max-w-[180px]">
                              {doc.entity_subtitle || doc.entity_phone || doc.entity_email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Document Title */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#1E293B] dark:text-white max-w-[220px] truncate" title={doc.doc_title}>
                          {doc.doc_title}
                        </div>
                        <div className="text-[10px] text-[#94A3B8] truncate max-w-[220px]" title={doc.file_name}>
                          {doc.file_name}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F5F9] dark:bg-[#0F172A] text-[#475569] dark:text-[#CBD5E1]">
                          {doc.category}
                        </span>
                      </td>

                      {/* Format */}
                      <td className="py-3 px-4">
                        {getFormatBadge(doc.file_type)}
                      </td>

                      {/* License/Reg No */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#475569] dark:text-[#CBD5E1]">
                        {doc.license_or_reg_no || "—"}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(doc.onboarding_status)}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-[#64748B] dark:text-[#94A3B8] text-[11px] whitespace-nowrap">
                        {doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openPreview(doc)}
                            title="View Document"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#0067A1] text-white hover:bg-[#005282] transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                          <button
                            onClick={() => triggerDownload(doc)}
                            title="Download Document"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#059669] text-white hover:bg-[#047857] transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                          <button
                            onClick={() => copyUrlToClipboard(doc.url)}
                            title="Copy Direct URL"
                            className="p-1 rounded text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A] transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc) => {
            const roleBadge = getRoleBadge(doc.role);
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div>
                  {/* Top Bar with Role & Format */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${roleBadge.bg}`}
                    >
                      {roleBadge.icon}
                      {roleBadge.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getFormatBadge(doc.file_type)}
                      {getStatusBadge(doc.onboarding_status)}
                    </div>
                  </div>

                  {/* Document Title & Category */}
                  <div className="mb-3">
                    <h4 className="text-sm font-bold text-[#003358] dark:text-white line-clamp-1" title={doc.doc_title}>
                      {doc.doc_title}
                    </h4>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] dark:bg-[#0F172A] text-[#64748B] dark:text-[#CBD5E1]">
                      {doc.category}
                    </span>
                  </div>

                  {/* Entity Details */}
                  <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#334155] space-y-1 mb-4 text-xs">
                    <p className="font-semibold text-[#1E293B] dark:text-white truncate">
                      {doc.entity_name}
                    </p>
                    {doc.entity_subtitle && (
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                        {doc.entity_subtitle}
                      </p>
                    )}
                    {doc.license_or_reg_no && (
                      <p className="text-[10px] font-mono text-[#475569] dark:text-[#94A3B8] truncate">
                        Reg: {doc.license_or_reg_no}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-[#F1F5F9] dark:border-[#334155] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openPreview(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-[#0067A1] text-white hover:bg-[#005282] transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <button
                      onClick={() => triggerDownload(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-[#059669] text-white hover:bg-[#047857] transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                  <button
                    onClick={() => copyUrlToClipboard(doc.url)}
                    title="Copy Link"
                    className="p-1.5 rounded text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#CBD5E1] dark:border-[#334155]">
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Page <span className="font-semibold text-[#003358] dark:text-white">{page}</span> of{" "}
            <span className="font-semibold text-[#003358] dark:text-white">{pagination.totalPages}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="p-1.5 rounded border border-[#CBD5E1] dark:border-[#475569] text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-[#CBD5E1] dark:border-[#475569] text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>

            {/* Page number buttons (up to 5 buttons around current page) */}
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                return (
                  <span key={p} className="flex items-center">
                    {prev && p - prev > 1 && (
                      <span className="px-1 text-xs text-[#94A3B8]">...</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={`min-w-[28px] h-7 text-xs font-semibold rounded ${
                        page === p
                          ? "bg-[#0067A1] text-white"
                          : "text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}

            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-[#CBD5E1] dark:border-[#475569] text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(pagination.totalPages)}
              disabled={page >= pagination.totalPages}
              className="p-1.5 rounded border border-[#CBD5E1] dark:border-[#475569] text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* In-App Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-[#CBD5E1] dark:border-[#334155] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between gap-3 bg-[#F8FAFC] dark:bg-[#0F172A]">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    getRoleBadge(previewDoc.role).bg
                  }`}
                >
                  {getRoleBadge(previewDoc.role).label}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm md:text-base font-bold text-[#003358] dark:text-white truncate">
                    {previewDoc.doc_title}
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate">
                    {previewDoc.entity_name} &bull; {previewDoc.category}
                  </p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Details Sidebar Toggle */}
                <button
                  type="button"
                  onClick={() => setShowModalSidebar((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                    showModalSidebar
                      ? "bg-[#0067A1] text-white border-[#0067A1]"
                      : "bg-[#F1F5F9] dark:bg-[#1E293B] border-[#CBD5E1] dark:border-[#475569] text-[#334155] dark:text-[#CBD5E1] hover:bg-[#E2E8F0]"
                  }`}
                  title="Toggle Document Details"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Details</span>
                </button>

                {previewDoc.file_type === "image" && (
                  <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#475569] rounded-lg p-0.5">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      title="Zoom Out"
                      className="p-1 rounded text-[#64748B] hover:text-[#003358]"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono px-1">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      title="Zoom In"
                      className="p-1 rounded text-[#64748B] hover:text-[#003358]"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      title="Rotate"
                      className="p-1 rounded text-[#64748B] hover:text-[#003358]"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#475569] text-[#334155] dark:text-[#CBD5E1] hover:bg-[#E2E8F0] transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="hidden sm:inline">Open Tab</span>
                </a>

                <button
                  onClick={() => triggerDownload(previewDoc)}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded bg-[#059669] text-white hover:bg-[#047857] transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>

                <button
                  onClick={closePreview}
                  className="p-1.5 text-[#64748B] hover:text-[#003358] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body & Sidebar Layout */}
            {(() => {
              const isPdf =
                previewDoc.file_type === "pdf" ||
                (typeof previewDoc.url === "string" &&
                  previewDoc.url.toLowerCase().split("?")[0].endsWith(".pdf"));

              return (
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0F172A] relative">
                  {/* Document Display Area */}
                  <div
                    className={`h-full overflow-hidden flex flex-col bg-[#020617]/50 relative transition-all duration-200 ${
                      showModalSidebar ? "flex-1 md:w-[72%] lg:w-[76%]" : "w-full"
                    }`}
                  >
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col overflow-hidden bg-slate-100">
                        <PdfJsViewer
                          url={previewDoc.url}
                          fileName={`${(previewDoc.entity_name || "Document").replace(/\s+/g, "_")}_${(previewDoc.doc_title || "Report").replace(/\s+/g, "_")}.pdf`}
                          className="w-full h-full"
                        />
                      </div>
                    ) : previewDoc.file_type === "image" ? (
                      <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
                        <img
                          src={previewDoc.url}
                          alt={previewDoc.doc_title}
                          style={{
                            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                            transition: "transform 0.15s ease",
                          }}
                          className="max-h-[75vh] object-contain rounded shadow-lg"
                        />
                      </div>
                    ) : (
                      <div className="text-center p-8 text-white space-y-3 m-auto">
                        <FileText className="w-12 h-12 mx-auto text-[#94A3B8]" />
                        <p className="text-sm font-semibold">Preview not available for this file type</p>
                        <button
                          onClick={() => triggerDownload(previewDoc)}
                          className="px-4 py-2 text-xs font-semibold rounded bg-[#0067A1] text-white hover:bg-[#005282] transition-colors"
                        >
                          Download File
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Document Metadata Sidebar */}
                  {showModalSidebar && (
                    <div className="w-full md:w-80 lg:w-88 border-t md:border-t-0 md:border-l border-[#334155] p-5 bg-[#0F172A] text-white overflow-y-auto space-y-4 text-xs shrink-0">
                      <div>
                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                          Document Information
                        </span>
                        <p className="text-sm font-bold text-white mt-1">
                          {previewDoc.doc_title}
                        </p>
                        <p className="text-[#94A3B8] text-[11px] mt-0.5">
                          Category: {previewDoc.category}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#334155] space-y-2">
                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                          Entity Details
                        </span>
                        <div>
                          <span className="text-[#94A3B8] block text-[10px]">Name</span>
                          <span className="font-semibold">{previewDoc.entity_name}</span>
                        </div>
                        {previewDoc.entity_subtitle && (
                          <div>
                            <span className="text-[#94A3B8] block text-[10px]">Title / Role</span>
                            <span>{previewDoc.entity_subtitle}</span>
                          </div>
                        )}
                        {previewDoc.license_or_reg_no && (
                          <div>
                            <span className="text-[#94A3B8] block text-[10px]">License / Reg No</span>
                            <span className="font-mono">{previewDoc.license_or_reg_no}</span>
                          </div>
                        )}
                        {previewDoc.entity_phone && (
                          <div>
                            <span className="text-[#94A3B8] block text-[10px]">Phone</span>
                            <span>{previewDoc.entity_phone}</span>
                          </div>
                        )}
                        {previewDoc.entity_email && (
                          <div>
                            <span className="text-[#94A3B8] block text-[10px]">Email</span>
                            <span className="truncate block">{previewDoc.entity_email}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#334155] space-y-2">
                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                          Compliance Status
                        </span>
                        <div>{getStatusBadge(previewDoc.onboarding_status)}</div>
                        <div>
                          <span className="text-[#94A3B8] block text-[10px]">Uploaded / Added</span>
                          <span>
                            {previewDoc.created_at
                              ? new Date(previewDoc.created_at).toLocaleString("en-IN")
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#334155] space-y-2">
                        <button
                          onClick={() => copyUrlToClipboard(previewDoc.url)}
                          className="w-full py-2 px-3 text-xs font-semibold rounded bg-[#1E293B] hover:bg-[#334155] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          Copy Link
                        </button>
                        <button
                          onClick={() => triggerDownload(previewDoc)}
                          className="w-full py-2 px-3 text-xs font-semibold rounded bg-[#059669] hover:bg-[#047857] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
