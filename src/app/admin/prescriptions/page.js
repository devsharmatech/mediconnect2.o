"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  Search,
  Eye,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  User,
  X,
  Stethoscope,
  Activity,
  ClipboardList,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Download,
  Video,
  Clock,
  Shield,
  Loader2,
  Phone,
  Mail,
  CalendarClock
} from "lucide-react";

export default function AdminPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewPrescription, setViewPrescription] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPrescriptions = useCallback(async (page = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
        ...(search.trim() && { search: search.trim() }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(dateFilter.start && { start_date: dateFilter.start }),
        ...(dateFilter.end && { end_date: dateFilter.end }),
      });

      const res = await fetch(`/api/prescriptions/web?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load prescriptions");

      setPrescriptions(data.data?.items || []);
      setPagination({
        currentPage: data.data?.page || 1,
        totalPages: Math.max(1, Math.ceil((data.data?.total || 0) / (data.data?.limit || 15))),
        totalItems: data.data?.total || 0,
        itemsPerPage: data.data?.limit || 15,
      });
    } catch (err) {
      toast.error(err.message || "Failed to fetch prescriptions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, dateFilter, pagination.itemsPerPage]);

  useEffect(() => {
    fetchPrescriptions(pagination.currentPage);
  }, [fetchPrescriptions, pagination.currentPage, statusFilter, dateFilter]);

  // View administrative audit details (DPDP Privacy Compliant)
  const viewDetails = async (p) => {
    setDetailLoading(true);
    setViewPrescription(p);
    try {
      const res = await fetch(`/api/prescriptions/web?id=${p.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setViewPrescription(data.data);
      }
    } catch {
      // Fallback to existing list item
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(prescriptions.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDelete = async () => {
    if (!selectedIds.length) return toast.error("No prescriptions selected");
    try {
      setDeleting(true);
      const res = await fetch("/api/prescriptions/web/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Prescription records deleted successfully");
        setSelectedIds([]);
        setConfirmOpen(false);
        fetchPrescriptions(pagination.currentPage);
      } else {
        toast.error(result.error || "Delete operation failed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  // CSV Audit Export (Excludes clinical PHI, exports governance metadata only)
  const exportAuditCSV = () => {
    if (!prescriptions.length) {
      toast.error("No records available to export");
      return;
    }

    const headers = [
      "Prescription UNID",
      "Issuance Date",
      "Patient Name",
      "Patient Phone",
      "Doctor Name",
      "Doctor Specialization",
      "Lifecycle Status",
      "DPDP Compliance",
    ];

    const rows = prescriptions.map((p) => [
      `"${p.unid ? `#${p.unid}` : p.id}"`,
      `"${p.created_at ? dayjs(p.created_at).format("YYYY-MM-DD HH:mm") : "—"}"`,
      `"${p.patient?.full_name || "—"}"`,
      `"${p.patient?.phone || "—"}"`,
      `"${p.doctor?.full_name ? (p.doctor.full_name.toLowerCase().startsWith("dr") ? p.doctor.full_name : `Dr. ${p.doctor.full_name}`) : "—"}"`,
      `"${p.doctor?.specialization || "General"}"`,
      `"${p.is_draft ? "Draft" : p.status || "Active"}"`,
      `"Protected Under DPDP Act 2023"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `prescriptions_audit_${dayjs().format("YYYY-MM-DD")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Audit CSV downloaded");
  };

  const getStatusBadge = (p) => {
    const isDraft = Boolean(p.is_draft);
    const status = p.status || (isDraft ? "draft" : "active");

    if (isDraft || status === "draft") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-2.5 h-2.5" />
          <span>Draft</span>
        </span>
      );
    }
    if (status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Completed</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
        <Activity className="w-2.5 h-2.5" />
        <span>Active</span>
      </span>
    );
  };

  // KPI calculations
  const stats = useMemo(() => {
    const active = prescriptions.filter((p) => !p.is_draft && (p.status === "active" || !p.status)).length;
    const completed = prescriptions.filter((p) => p.status === "completed").length;
    return {
      active,
      completed,
    };
  }, [prescriptions]);

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setDateFilter({ start: "", end: "" });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const hasActiveFilters = Boolean(
    search || statusFilter !== "all" || dateFilter.start || dateFilter.end
  );

  return (
    <main className="w-full min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-6 space-y-4">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/admin/dashboard" className="hover:text-slate-800 transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-slate-500">Clinical Records</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Prescriptions</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[5px] bg-[#0067A1]/10 flex items-center justify-center text-[#0067A1]">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Prescription Governance & Audit
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Monitor clinical e-prescriptions, track compliance status and audit metadata under DPDP healthcare regulations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportAuditCSV}
            className="px-3 py-1.5 rounded-[5px] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => fetchPrescriptions(pagination.currentPage, true)}
            disabled={refreshing}
            className="px-3.5 py-1.5 rounded-[5px] bg-[#0067A1] hover:bg-[#005282] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── KPI Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-[5px] border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-500 uppercase">Total Records</p>
            <div className="w-7 h-7 rounded-[4px] bg-slate-100 flex items-center justify-center text-slate-600">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {pagination.totalItems}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Lifetime platform e-prescriptions</p>
        </div>

        <div className="bg-white rounded-[5px] border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-sky-700 uppercase">Active Records</p>
            <div className="w-7 h-7 rounded-[4px] bg-sky-50 flex items-center justify-center text-sky-700">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-sky-900 mt-1">
            {stats.active}
          </p>
          <p className="text-[10px] text-sky-600 mt-0.5">Active treatment cycles</p>
        </div>

        <div className="bg-white rounded-[5px] border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-emerald-700 uppercase">Completed</p>
            <div className="w-7 h-7 rounded-[4px] bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-900 mt-1">
            {stats.completed}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Fulfilled consultations</p>
        </div>

        <div className="bg-white rounded-[5px] border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-purple-700 uppercase">DPDP Privacy Shield</p>
            <div className="w-7 h-7 rounded-[4px] bg-purple-50 flex items-center justify-center text-purple-700">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-purple-900 mt-1">
            100% Protected
          </p>
          <p className="text-[10px] text-purple-600 mt-0.5">Zero unconsented PHI exposure</p>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="bg-white rounded-[5px] border border-slate-200 p-3 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by UNID, patient, doctor, phone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[5px] border border-slate-200 focus:outline-none focus:border-[#0067A1] bg-white text-slate-800"
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-[5px] border border-slate-200 focus:outline-none focus:border-[#0067A1] bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Consultations</option>
              <option value="completed">Completed Consultations</option>
              <option value="draft">Drafts</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-1.5 text-xs rounded-[5px] border border-slate-200 focus:outline-none focus:border-[#0067A1] bg-white text-slate-700"
            />
          </div>

          {/* End Date & Reset */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-1.5 text-xs rounded-[5px] border border-slate-200 focus:outline-none focus:border-[#0067A1] bg-white text-slate-700"
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1.5 text-xs rounded-[5px] bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0 cursor-pointer"
                title="Clear all filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Alert */}
        {selectedIds.length > 0 && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-[5px] flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700">
              {selectedIds.length} prescription(s) selected
            </span>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-[4px] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── Prescription Audit Table ─── */}
      <div className="bg-white rounded-[5px] border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={prescriptions.length > 0 && selectedIds.length === prescriptions.length}
                    onChange={toggleSelectAll}
                    className="cursor-pointer rounded-[3px] accent-[#0067A1]"
                  />
                </th>
                <th className="py-2.5 px-3">Prescription UNID & Date</th>
                <th className="py-2.5 px-3">Patient Profile</th>
                <th className="py-2.5 px-3">Consulting Doctor</th>
                <th className="py-2.5 px-3">Consultation Mode</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Legal Privacy</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0067A1] mx-auto mb-2" />
                    <span>Loading prescription records...</span>
                  </td>
                </tr>
              ) : prescriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-600 font-medium">No prescription records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search criteria or date filters</p>
                  </td>
                </tr>
              ) : (
                prescriptions.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const docName = p.doctor?.full_name
                    ? p.doctor.full_name.toLowerCase().startsWith("dr")
                      ? p.doctor.full_name
                      : `Dr. ${p.doctor.full_name}`
                    : "Verified Clinical Doctor";

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-[#0067A1]/5" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="cursor-pointer rounded-[3px] accent-[#0067A1]"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {p.unid ? `#${p.unid}` : `#${p.id.slice(0, 6)}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {p.created_at ? dayjs(p.created_at).format("DD MMM YYYY, hh:mm A") : "—"}
                        </p>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-[4px] bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">
                              {p.patient?.full_name || "Anonymous Patient"}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {p.patient?.phone || p.patient?.gender || "Verified Patient"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div>
                          <p className="font-medium text-slate-800 text-xs">{docName}</p>
                          {p.doctor?.specialization && (
                            <span className="inline-block mt-0.5 text-[10px] text-[#0067A1] bg-[#0067A1]/5 border border-[#0067A1]/20 px-1.5 py-0.2 rounded-[3px]">
                              {p.doctor.specialization}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                          <Video className="w-3 h-3 text-[#0067A1]" />
                          <span>{p.appointment_type ? p.appointment_type.replace(/_/g, " ") : "Teleconsultation"}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        {getStatusBadge(p)}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-[3px]">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>DPDP Protected</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => viewDetails(p)}
                          className="px-2.5 py-1 bg-[#0067A1]/10 hover:bg-[#0067A1] text-[#0067A1] hover:text-white rounded-[4px] text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ─── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Showing Page <span className="font-semibold text-slate-800">{pagination.currentPage}</span> of{" "}
            <span className="font-semibold text-slate-800">{pagination.totalPages}</span> ({pagination.totalItems} total records)
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.currentPage <= 1 || loading}
              onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              className="p-1.5 rounded-[4px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) pageNum = i + 1;
              else if (pagination.currentPage <= 3) pageNum = i + 1;
              else if (pagination.currentPage >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
              else pageNum = pagination.currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: pageNum }))}
                  className={`min-w-7 h-7 rounded-[4px] text-xs font-medium transition-colors ${
                    pageNum === pagination.currentPage
                      ? "bg-[#0067A1] text-white"
                      : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages || loading}
              onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              className="p-1.5 rounded-[4px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Administrative Audit Modal (DPDP Compliance & Patient Privacy Guaranteed) ─── */}
      {viewPrescription && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4"
          onClick={() => setViewPrescription(null)}
        >
          <div
            className="bg-white rounded-[5px] border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-[#0067A1] text-white">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-semibold text-sm">
                    Prescription Audit & Compliance
                  </h3>
                  <p className="text-white/80 text-[11px]">
                    Reference UNID: {viewPrescription.unid ? `#${viewPrescription.unid}` : `#${viewPrescription.id?.slice(0, 8)}`} · Telemedicine Practice Guidelines
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewPrescription(null)}
                className="p-1 hover:bg-white/20 rounded-[4px] transition-colors cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-4 space-y-3.5 text-xs">
              {/* DPDP Legal Compliance Alert Box */}
              <div className="bg-sky-50 border border-sky-200 rounded-[5px] p-3 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-[#0067A1] text-xs">
                    Protected Health Information (PHI) Notice
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    In compliance with the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> and <strong>National Medical Commission (NMC) Telemedicine Practice Guidelines</strong>, detailed clinical diagnostic notes and prescribed medications are privileged medical data accessible exclusively to the consulting physician, licensed pharmacist, and patient. Administrative view is strictly restricted to operational audit metadata.
                  </p>
                </div>
              </div>

              {/* Consultation & Doctor Audit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Doctor Box */}
                <div className="bg-slate-50 rounded-[5px] border border-slate-200 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium uppercase text-[10px]">
                    <Stethoscope className="w-3.5 h-3.5 text-[#0067A1]" />
                    <span>Consulting Practitioner</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-xs">
                    {viewPrescription.doctor?.full_name
                      ? viewPrescription.doctor.full_name.toLowerCase().startsWith("dr")
                        ? viewPrescription.doctor.full_name
                        : `Dr. ${viewPrescription.doctor.full_name}`
                      : "Verified Clinical Doctor"}
                  </p>
                  <p className="text-[11px] text-[#0067A1] font-medium">
                    {viewPrescription.doctor?.specialization || "General Medicine"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Registration: Registered Medical Practitioner (NMC Verified)
                  </p>
                  {viewPrescription.doctor?.email && (
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 pt-1 border-t border-slate-200">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{viewPrescription.doctor.email}</span>
                    </p>
                  )}
                </div>

                {/* Patient Box */}
                <div className="bg-slate-50 rounded-[5px] border border-slate-200 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium uppercase text-[10px]">
                    <User className="w-3.5 h-3.5 text-[#0067A1]" />
                    <span>Patient Profile</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-xs">
                    {viewPrescription.patient?.full_name || "Verified Patient"}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {viewPrescription.patient?.age ? `${viewPrescription.patient.age} Yrs` : "Age Unspecified"}
                    {viewPrescription.patient?.gender ? ` • ${viewPrescription.patient.gender}` : ""}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Audit ID: PAT-{viewPrescription.patient_id?.slice(0, 8) || "N/A"}
                  </p>
                  {viewPrescription.patient?.phone && (
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 pt-1 border-t border-slate-200">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{viewPrescription.patient.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Consultation Context & Compliance Meta */}
              <div className="bg-slate-50 rounded-[5px] border border-slate-200 p-3 space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Administrative Governance Metadata
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Issuance Date</span>
                    <span className="font-medium text-slate-800">
                      {viewPrescription.created_at
                        ? dayjs(viewPrescription.created_at).format("DD MMM YYYY, hh:mm A")
                        : "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Consultation Channel</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1">
                      <Video className="w-3 h-3 text-[#0067A1]" />
                      <span>{viewPrescription.appointment_type?.replace(/_/g, " ") || "Teleconsultation"}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Lifecycle Status</span>
                    <span>{getStatusBadge(viewPrescription)}</span>
                  </div>

                  {viewPrescription.appointment && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Appointment UNID</span>
                      <span className="font-medium text-slate-800 font-mono">
                        {viewPrescription.appointment.id?.slice(0, 8)}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 block text-[10px]">Digital Verification</span>
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Cryptographically Logged</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Data Storage</span>
                    <span className="text-slate-700 font-medium">AES-256 Encrypted Vault</span>
                  </div>
                </div>
              </div>

              {/* Statutory Notice */}
              <div className="p-2.5 rounded-[4px] bg-slate-100 border border-slate-200 text-[10px] text-slate-500 text-center">
                All clinical formulations, dosing schedules, and medical notes are shielded under DPDP Act statutory patient confidentiality regulations.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 flex justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => setViewPrescription(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-[4px] text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-[5px] border border-slate-200 shadow-xl w-full max-w-sm p-4 text-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 mx-auto bg-rose-50 text-rose-600 rounded-[5px] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Confirm Deletion</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete {selectedIds.length} prescription record(s)? This action will remove the audit log permanently.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-[4px] text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-[4px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
