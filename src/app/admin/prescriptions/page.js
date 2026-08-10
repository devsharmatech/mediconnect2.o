"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search, Filter, Eye, Trash2, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight, Calendar, FileText, User,
  X, Stethoscope, Pill, Heart, Clipboard, Clock,
  Activity, FlaskConical, Loader2, ClipboardList
} from "lucide-react";

/* ---------- safe-render helpers ---------- */
const toDisplayText = (value) => {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (value.every((v) => typeof v === "string" || typeof v === "number"))
      return value.join(", ");
    return value
      .map((v) => (typeof v === "object" ? v.name || v.test_name || JSON.stringify(v) : String(v)))
      .join(", ");
  }
  if (typeof value === "object") {
    if (typeof value.primary === "string" && value.primary.trim()) return value.primary;
    if (typeof value.notes === "string" && value.notes.trim()) return value.notes;
    if (typeof value.name === "string" && value.name.trim()) return value.name;
    return JSON.stringify(value);
  }
  return "—";
};

const getMedicinesCountLabel = (medicines) => {
  if (Array.isArray(medicines)) return medicines.length > 0 ? `${medicines.length} medicines` : "—";
  if (medicines && typeof medicines === "object") return "1 medicine";
  return "—";
};

const STATUS_COLORS = {
  active: "bg-blue-100 text-[#004F7C] border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  draft: "bg-yellow-100 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export default function AdminPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewPrescription, setViewPrescription] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10,
  });

  const fetchPrescriptions = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(dateFilter.start && { start_date: dateFilter.start }),
        ...(dateFilter.end && { end_date: dateFilter.end }),
      });
      const res = await fetch(`/api/prescriptions/web?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load");
      setPrescriptions(data.data.items || []);
      setPagination({
        currentPage: data.data.page || 1,
        totalPages: Math.ceil((data.data.total || 0) / (data.data.limit || 10)),
        totalItems: data.data.total || 0,
        itemsPerPage: data.data.limit || 10,
      });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchPrescriptions(1), 400);
    return () => clearTimeout(timer);
  }, [searchTerm, dateFilter]);

  const viewDetails = async (p) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/prescriptions/web?id=${p.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setViewPrescription(data.data);
      } else {
        setViewPrescription(p);
      }
    } catch {
      setViewPrescription(p);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    if (!selectedIds.length) return toast.error("No prescriptions selected");
    try {
      const res = await fetch("/api/prescriptions/web/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Deleted successfully");
        setSelectedIds([]);
        fetchPrescriptions(pagination.currentPage);
      } else {
        toast.error(result.error || "Delete failed");
      }
    } catch (err) { toast.error(err.message); }
  };

  const handlePageChange = (p) => {
    if (p >= 1 && p <= pagination.totalPages) fetchPrescriptions(p);
  };

  return (
    <>
    <main className="flex-1 overflow-auto relative z-0">
      <div className="p-2 md:p-4">
        <div className="max-w-full mx-auto space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#0067A1] to-[#0080C6] rounded-xl flex items-center justify-center shadow-sm">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                Prescription Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">
                {pagination.totalItems} total prescriptions
              </p>
            </div>
            <button onClick={() => fetchPrescriptions(pagination.currentPage)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white rounded-xl hover:shadow-lg transition-all cursor-pointer">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total", count: pagination.totalItems, icon: FileText, gradient: "from-blue-500 to-blue-600", bg: "bg-blue-50" },
              { label: "Active", count: prescriptions.filter(p => p.status === "active" || !p.status).length, icon: Activity, gradient: "from-green-500 to-green-600", bg: "bg-green-50" },
              { label: "Completed", count: prescriptions.filter(p => p.status === "completed").length, icon: Clipboard, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50" },
              { label: "Drafts", count: prescriptions.filter(p => p.is_draft).length, icon: Clock, gradient: "from-amber-500 to-amber-600", bg: "bg-amber-50" },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stat.count}</p>
                  </div>
                  <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Search by patient name, doctor, diagnosis..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
              </div>
              <div className="flex items-center gap-2">
                <input type="date" value={dateFilter.start}
                  onChange={(e) => setDateFilter((p) => ({ ...p, start: e.target.value }))}
                  className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                <span className="text-gray-400 text-sm">to</span>
                <input type="date" value={dateFilter.end}
                  onChange={(e) => setDateFilter((p) => ({ ...p, end: e.target.value }))}
                  className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="mt-4 flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700">
                <span className="text-red-700 dark:text-red-300 text-sm font-medium">
                  {selectedIds.length} prescription(s) selected
                </span>
                <button onClick={() => setConfirmOpen(true)}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm cursor-pointer">
                  <Trash2 size={14} /> Delete Selected
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#0067A1] mb-3" />
                <p className="text-gray-500 text-sm">Loading prescriptions...</p>
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No prescriptions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr className="text-left text-gray-600 dark:text-gray-300">
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox"
                          onChange={(e) => setSelectedIds(e.target.checked ? prescriptions.map((p) => p.id) : [])}
                          checked={prescriptions.length > 0 && selectedIds.length === prescriptions.length}
                          className="cursor-pointer rounded" />
                      </th>
                      <th className="px-4 py-3 font-medium">Patient</th>
                      <th className="px-4 py-3 font-medium">Doctor</th>
                      
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {prescriptions.map((p, i) => {
                      const statusStr = p.is_draft ? "draft" : (p.status || "active");
                      return (
                      <motion.tr key={p.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.includes(p.id)}
                            onChange={() => toggleSelect(p.id)} className="cursor-pointer rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-[#0067A1] dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 dark:text-gray-100">{p.patient?.full_name || "—"}</p>
                              <p className="text-xs text-gray-400">{p.patient?.phone || p.patient?.gender || ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-gray-700 dark:text-gray-200">{p.doctor?.full_name || "—"}</p>
                            <p className="text-xs text-gray-400">{
                              (() => {
                                const val = p.doctor?.specialization;
                                if (typeof val === "string" && val.trim().startsWith("[")) {
                                  try {
                                    const arr = JSON.parse(val);
                                    if (Array.isArray(arr)) return arr.join(", ");
                                  } catch {}
                                }
                                return toDisplayText(val);
                              })()
                            }</p>
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[statusStr] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                            {statusStr}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => viewDetails(p)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#0067A1]/10 text-[#0067A1] rounded hover:bg-[#0067A1]/20 text-xs font-medium cursor-pointer transition-colors">
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        </td>
                      </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500">
                  Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total)
                </p>
                <div className="flex items-center gap-1">
                  <button disabled={pagination.currentPage <= 1} onClick={() => handlePageChange(pagination.currentPage - 1)}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 disabled:opacity-50 cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) pageNum = i + 1;
                    else if (pagination.currentPage <= 3) pageNum = i + 1;
                    else if (pagination.currentPage >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                    else pageNum = pagination.currentPage - 2 + i;
                    return (
                      <button key={pageNum} onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          pageNum === pagination.currentPage
                            ? "bg-[#0067A1] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 hover:bg-gray-200"
                        }`}>{pageNum}</button>
                    );
                  })}
                  <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => handlePageChange(pagination.currentPage + 1)}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 disabled:opacity-50 cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
 {/* Delete Confirmation */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-xl w-full max-w-md mx-4">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Deletion</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Are you sure you want to delete {selectedIds.length} prescription(s)? This action cannot be undone.
                </p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => setConfirmOpen(false)}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer">Cancel</button>
                  <button onClick={handleDelete}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm cursor-pointer">Delete</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prescription Detail Modal */}
      <AnimatePresence>
        {(viewPrescription || detailLoading) && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setViewPrescription(null); setDetailLoading(false); }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col z-[1100]"
              onClick={(e) => e.stopPropagation()}>

              {detailLoading && !viewPrescription ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0067A1]" />
                </div>
              ) : viewPrescription && (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5" />
                      <div>
                        <h3 className="font-bold text-lg">Prescription Details</h3>
                        <p className="text-white/70 text-xs">ID: {viewPrescription.id?.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <button onClick={() => setViewPrescription(null)}
                      className="p-2 hover:bg-white/20 rounded-lg cursor-pointer transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="overflow-y-auto p-5 space-y-5">
                    {/* Patient & Doctor Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-[#0067A1]" />
                          <p className="text-xs font-semibold text-[#0067A1] uppercase tracking-wide">Patient</p>
                        </div>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{viewPrescription.patient?.full_name || "—"}</p>
                        {viewPrescription.patient?.phone && <p className="text-xs text-gray-500 mt-0.5">Phone: {viewPrescription.patient.phone}</p>}
                        {viewPrescription.patient?.gender && <p className="text-xs text-gray-500">Gender: {viewPrescription.patient.gender}</p>}
                        {viewPrescription.patient?.age && <p className="text-xs text-gray-500">Age: {viewPrescription.patient.age}</p>}
                      </div>
                      <div className="bg-teal-50 dark:bg-[#003358]/20 rounded-xl p-4 border border-teal-100 dark:border-teal-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Stethoscope className="w-4 h-4 text-[#0067A1]" />
                          <p className="text-xs font-semibold text-[#0067A1] uppercase tracking-wide">Doctor</p>
                        </div>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{viewPrescription.doctor?.full_name || "—"}</p>
                        {viewPrescription.doctor?.specialization && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {(() => {
                              const val = viewPrescription.doctor.specialization;
                              if (typeof val === "string" && val.trim().startsWith("[")) {
                                try {
                                  const arr = JSON.parse(val);
                                  if (Array.isArray(arr)) return arr.join(", ");
                                } catch {}
                              }
                              return Array.isArray(val) ? val.join(", ") : val;
                            })()}
                          </p>
                        )}
                        {viewPrescription.doctor?.email && <p className="text-xs text-gray-500">{viewPrescription.doctor.email}</p>}
                      </div>
                    </div>

                    {/* Appointment Info */}
                    {viewPrescription.appointment && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Appointment</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div><p className="text-xs text-gray-400">Date</p><p className="text-gray-800 dark:text-gray-100">{viewPrescription.appointment.appointment_date || "—"}</p></div>
                          <div><p className="text-xs text-gray-400">Time</p><p className="text-gray-800 dark:text-gray-100">{viewPrescription.appointment.appointment_time || "—"}</p></div>
                          <div><p className="text-xs text-gray-400">Status</p><p className="text-gray-800 dark:text-gray-100 capitalize">{viewPrescription.appointment.status || "—"}</p></div>
                        </div>
                      </div>
                    )}

                    {/* Diagnosis */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5" /> Diagnosis
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                        <p className="text-sm text-gray-800 dark:text-gray-200">{toDisplayText(viewPrescription.diagnosis)}</p>
                      </div>
                    </div>

                    {/* Vital Signs */}
                    {viewPrescription.vital_signs && Object.keys(viewPrescription.vital_signs).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" /> Vital Signs
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(viewPrescription.vital_signs).map(([key, val]) => (
                            val && <div key={key} className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-100 dark:border-red-800">
                              <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, " ")}</p>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{toDisplayText(val)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medicines */}
                    {Array.isArray(viewPrescription.medicines) && viewPrescription.medicines.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5" /> Medicines ({viewPrescription.medicines.length})
                        </p>
                        <div className="space-y-2">
                          {viewPrescription.medicines.map((m, i) => (
                            <div key={i} className="bg-white dark:bg-gray-700 rounded-xl p-3 border border-gray-200 dark:border-gray-600 shadow-sm">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 bg-purple-100 dark:bg-purple-900/40 text-purple-600 rounded-lg flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                  <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{m.name || m.medicine_name || m.drug_name || "Medicine"}</p>
                                </div>
                                {m.type && <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-500 rounded-full">{m.type}</span>}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                {m.dosage && <span>Dosage: <b className="text-gray-700 dark:text-gray-300">{m.dosage}</b></span>}
                                {m.frequency && <span>Frequency: <b className="text-gray-700 dark:text-gray-300">{m.frequency}</b></span>}
                                {m.duration && <span>Duration: <b className="text-gray-700 dark:text-gray-300">{m.duration}</b></span>}
                                {m.route && <span>Route: <b className="text-gray-700 dark:text-gray-300">{m.route}</b></span>}
                                {m.timing && <span>Timing: <b className="text-gray-700 dark:text-gray-300">{m.timing}</b></span>}
                              </div>
                              {m.instructions && <p className="text-xs text-gray-400 mt-1 italic">{m.instructions}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lab Tests */}
                    {Array.isArray(viewPrescription.lab_tests) && viewPrescription.lab_tests.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <FlaskConical className="w-3.5 h-3.5" /> Lab Tests ({viewPrescription.lab_tests.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {viewPrescription.lab_tests.map((t, i) => (
                            <span key={i} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium border border-indigo-100 dark:border-indigo-800">
                              {typeof t === "string" ? t : t.test_name || t.name || JSON.stringify(t)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up */}
                    {viewPrescription.follow_up && Object.keys(viewPrescription.follow_up).length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> Follow-up
                        </p>
                        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {Object.entries(viewPrescription.follow_up).map(([key, val]) => (
                            val && <p key={key}><span className="text-gray-400 capitalize">{key.replace(/_/g, " ")}:</span> {toDisplayText(val)}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Special Instructions */}
                    {viewPrescription.special_instructions && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-100 dark:border-orange-800">
                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Special Instructions</p>
                        {typeof viewPrescription.special_instructions === "object" && !Array.isArray(viewPrescription.special_instructions) ? (
                          <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc pl-5 space-y-1">
                            {Object.entries(viewPrescription.special_instructions).map(([k, v]) => (
                              <li key={k}><span className="font-semibold capitalize">{k.replace(/_/g, " ")}:</span> {toDisplayText(v)}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-700 dark:text-gray-300">{toDisplayText(viewPrescription.special_instructions)}</p>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {viewPrescription.notes && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{toDisplayText(viewPrescription.notes)}</p>
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div><p className="text-gray-400">Created</p><p className="text-gray-700 dark:text-gray-300">{viewPrescription.created_at ? new Date(viewPrescription.created_at).toLocaleString("en-IN") : "—"}</p></div>
                      <div><p className="text-gray-400">Type</p><p className="text-gray-700 dark:text-gray-300 capitalize">{viewPrescription.appointment_type?.replace(/_/g, " ") || "—"}</p></div>
                      <div><p className="text-gray-400">Status</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[viewPrescription.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {viewPrescription.is_draft ? "Draft" : (viewPrescription.status || "active")}
                        </span>
                      </div>
                      {viewPrescription.signed_at && <div><p className="text-gray-400">Signed At</p><p className="text-gray-700 dark:text-gray-300">{new Date(viewPrescription.signed_at).toLocaleString("en-IN")}</p></div>}
                      {viewPrescription.completed_at && <div><p className="text-gray-400">Completed</p><p className="text-gray-700 dark:text-gray-300">{new Date(viewPrescription.completed_at).toLocaleString("en-IN")}</p></div>}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button onClick={() => setViewPrescription(null)}
                      className="px-5 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 text-sm cursor-pointer">Close</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
