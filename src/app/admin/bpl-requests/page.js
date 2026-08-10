"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle,
  XCircle,
  FileText,
  Upload,
  X,
} from "lucide-react";

const STATUS_OPTIONS = ["pending", "approved", "rejected"];

function formatDate(dt) {
  if (!dt) return "N/A";
  try {
    return new Date(dt).toLocaleDateString();
  } catch {
    return dt;
  }
}

/* -------------------- View Modal -------------------- */
function BplViewModal({ isOpen, onClose, request }) {
  if (!isOpen || !request) return null;

  const docs = [
    { label: "Aadhaar", url: request.aadhaar_card_url },
    { label: "Ration Card", url: request.ration_card_url },
    { label: "Income Certificate", url: request.income_certificate_url },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">BPL Request Details</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Request ID: {request.id}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow icon={<User size={16} />} label="Name" value={request.name} />
            <InfoRow icon={<Calendar size={16} />} label="DOB" value={formatDate(request.dob)} />
            <InfoRow icon={<User size={16} />} label="Gender" value={request.gender} />
            <InfoRow icon={<Phone size={16} />} label="Mobile" value={request.mobile} />
            <InfoRow icon={<FileText size={16} />} label="Aadhaar No" value={request.aadhaar_no} />
            <InfoRow icon={<FileText size={16} />} label="Ration Card No" value={request.ration_card_no} />
            <InfoRow icon={<User size={16} />} label="Household Size" value={String(request.household_size || "N/A")} />
            <InfoRow icon={<User size={16} />} label="Head of Household" value={request.head_of_household} />
            <InfoRow icon={<FileText size={16} />} label="Monthly Income" value={request.monthly_income ? `₹${request.monthly_income}` : "N/A"} />
            <InfoRow icon={<FileText size={16} />} label="Employment Status" value={request.employment_status} />
            <InfoRow icon={<FileText size={16} />} label="Government Benefits" value={request.government_benefits} />
            <InfoRow icon={<FileText size={16} />} label="Disability" value={request.disability ? "Yes" : "No"} />
            <InfoRow icon={<CheckCircle size={16} />} label="Status" value={request.status} />
            <InfoRow icon={<Calendar size={16} />} label="Submitted" value={formatDate(request.created_at)} />
          </div>

          <div className="border-t dark:border-gray-700 pt-6">
            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={18} />
              Documents
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {docs.map((d) => (
                <div key={d.label} className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 flex items-center justify-between group">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{d.label}</div>
                    <div className={`text-xs ${d.url ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                      {d.url ? "✓ Uploaded" : "⏳ Pending"}
                    </div>
                  </div>
                  {d.url ? (
                    <a 
                      href={d.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[#0067A1] hover:text-[#004F7C] font-medium px-3 py-1 rounded-lg bg-teal-50 dark:bg-[#003358]/30 hover:bg-teal-100 dark:hover:bg-[#003358]/50 transition-all duration-200 group-hover:scale-105"
                    >
                      View
                    </a>
                  ) : (
                    <div className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      N/A
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
          <button 
            onClick={onClose} 
            className="px-8 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-105 hover:shadow-lg"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200">
      <div className="text-gray-500 dark:text-gray-400 mt-0.5">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{value || "—"}</div>
      </div>
    </div>
  );
}

/* -------------------- Main Page Component -------------------- */
export default function BplRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Fetch paginated admin list
  const fetchRequests = async (page = 1, limit = pagination.limit, search = searchTerm, status = statusFilter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", limit);
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/admin/bpl-requests?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch");

      const data = json.data || json.data?.data || json.data?.labs || json.data;
      
      let list = [];
      let total = 0;
      let pageResp = page;
      let limitResp = limit;

      if (Array.isArray(json.data)) {
        list = json.data;
        total = json.meta?.total || json.count || json.total || json?.data?.length || 0;
      } else if (json.data && Array.isArray(json.data.data)) {
        list = json.data.data;
        total = json.data.meta?.total || json.data.count || 0;
        pageResp = json.data.meta?.page || page;
        limitResp = json.data.meta?.limit || limit;
      } else if (Array.isArray(data)) {
        list = data;
        total = json.meta?.total || json.count || 0;
      } else if (json.data && json.data.length >= 0) {
        list = json.data;
        total = json.meta?.total || json.count || 0;
      } else {
        // fallback
        list = json.data || [];
        total = json.meta?.total || json.count || (Array.isArray(list) ? list.length : 0);
      }

      const totalPages = Math.max(1, Math.ceil((total || 0) / limitResp));

      setRequests(list);
      setPagination({ page: pageResp, limit: limitResp, total, totalPages });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(1);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((p) => ({ ...p, page: newPage }));
    fetchRequests(newPage, pagination.limit);
  };

  useEffect(() => {
    fetchRequests(1, pagination.limit);
  }, [pagination.limit]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchRequests(1, pagination.limit, searchTerm, statusFilter);
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm, statusFilter]);

  const toggleSelect = (id) => {
    setSelectedIds((s) => (s.includes(id) ? s.filter((i) => i !== id) : [...s, id]));
  };

  const selectAllVisible = () => {
    const ids = requests.map((r) => r.id);
    setSelectedIds(ids);
  };

  const clearSelection = () => setSelectedIds([]);

  const bulkDelete = async () => {
    if (!selectedIds.length) return toast.error("No selected requests");
    if (!confirm(`Delete ${selectedIds.length} selected requests?`)) return;

    try {
      const res = await fetch("/api/admin/bpl-requests/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Bulk delete failed");
      toast.success("Deleted successfully");
      setSelectedIds([]);
      fetchRequests(pagination.page);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete");
    }
  };

  const updateStatus = async (request_id, status) => {
    if (!["approved", "rejected", "pending"].includes(status)) return;
    try {
      const res = await fetch("/api/admin/bpl-requests/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id, status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Status update failed");
      toast.success("Status updated successfully");
      fetchRequests(pagination.page);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update status");
    }
  };

  const bulkUpdateStatus = async (status) => {
    if (!selectedIds.length) return toast.error("No selected requests");
    try {
      await Promise.all(selectedIds.map((id) => updateStatus(id, status)));
      setSelectedIds([]);
      fetchRequests(pagination.page);
    } catch (err) {
      // updateStatus shows toast on fail
    }
  };

  const openView = async (id) => {
    try {
      const res = await fetch(`/api/admin/bpl-requests/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch");
      setDetailItem(json.data || json.data?.data || json.data?.result || json);
      setViewOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load details");
    }
  };

  return (
    <>
      <main className="flex-1 p-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                BPL Requests
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Manage BPL Requests</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors" size={18} />
                <input 
                  placeholder="Search name, mobile, aadhaar..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all duration-200" 
                />
              </div>

              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className="px-4 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all duration-200"
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <button 
                onClick={() => fetchRequests(1)} 
                className="p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Bulk actions */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={22} />
                  <div>
                    <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">{selectedIds.length} requests selected</div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-400">You can perform bulk actions on selected requests</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => bulkUpdateStatus("approved")} 
                    className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Approve Selected
                  </button>
                  <button 
                    onClick={() => bulkUpdateStatus("pending")} 
                    className="px-5 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Set Pending
                  </button>
                  <button 
                    onClick={() => bulkUpdateStatus("rejected")} 
                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                  >
                    <XCircle size={16} />
                    Reject Selected
                  </button>
                  <button 
                    onClick={bulkDelete} 
                    className="px-5 py-2.5 bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-900 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Selected
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table */}
          <div className="overflow-x-auto ">
            <table className="w-full text-left">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-sm text-gray-700 dark:text-gray-300 uppercase">
                <tr>
                  <th className="p-4 rounded-tl-xl">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length > 0 && selectedIds.length === requests.length} 
                      onChange={(e) => e.target.checked ? selectAllVisible() : clearSelection()} 
                      className="rounded-lg border-2 border-gray-300 text-[#0067A1] focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                    />
                  </th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Contact</th>
                  <th className="p-4 font-semibold">Aadhaar / Ration</th>
                  <th className="p-4 font-semibold">Household</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex justify-center items-center gap-2">
                        <RefreshCw className="animate-spin" size={20} />
                        <span>Loading requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={40} className="text-gray-300 dark:text-gray-600" />
                        <span>No requests found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 group">
                      <td className="p-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(r.id)} 
                          onChange={() => toggleSelect(r.id)} 
                          className="rounded-lg border-2 border-gray-300 text-[#0067A1] focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-900 dark:text-white group-hover:text-[#0067A1] dark:group-hover:text-[#0080C6] transition-colors">
                          {r.name || "—"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">User: {r.user_id}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{r.mobile || "—"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(r.dob)}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{r.aadhaar_no || "—"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.ration_card_no || "—"}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Household: {r.household_size ?? "—"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Head: {r.head_of_household || "—"}</div>
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                          r.status === "approved" 
                            ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/40 dark:to-green-800/40 dark:text-green-300" 
                            : r.status === "rejected" 
                            ? "bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/40 dark:to-red-800/40 dark:text-red-300" 
                            : "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/40 dark:to-yellow-800/40 dark:text-yellow-300"
                        }`}>
                          {r.status === "approved" && <CheckCircle size={12} />}
                          {r.status === "rejected" && <XCircle size={12} />}
                          {r.status || "pending"}
                        </div>
                        <div className="mt-2">
                          <select 
                            value={r.status || "pending"} 
                            onChange={(e) => updateStatus(r.id, e.target.value)} 
                            className="text-sm px-2 py-1 border-2 border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all duration-200"
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            title="View Details" 
                            onClick={() => openView(r.id)} 
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-[#0067A1] dark:hover:text-[#0080C6] hover:bg-teal-50 dark:hover:bg-[#003358]/30 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-md"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            title="Delete" 
                            onClick={() => toggleSelect(r.id)} 
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-md"
                          >
                            <Trash2 size={18} />
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
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} requests
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Rows per page:</span>
                <select 
                  value={pagination.limit} 
                  onChange={(e) => setPagination((p) => ({ ...p, limit: parseInt(e.target.value), page: 1 }))} 
                  className="px-2 py-1 border-2 border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all duration-200"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePageChange(1)} 
                  disabled={pagination.page === 1} 
                  className="p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <ChevronsLeft size={18} />
                </button>
                <button 
                  onClick={() => handlePageChange(pagination.page - 1)} 
                  disabled={pagination.page === 1} 
                  className="p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold min-w-[100px] text-center">
                  {pagination.page} / {pagination.totalPages}
                </div>

                <button 
                  onClick={() => handlePageChange(pagination.page + 1)} 
                  disabled={pagination.page === pagination.totalPages} 
                  className="p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <ChevronRight size={18} />
                </button>
                <button 
                  onClick={() => handlePageChange(pagination.totalPages)} 
                  disabled={pagination.page === pagination.totalPages} 
                  className="p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <ChevronsRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BplViewModal isOpen={viewOpen} onClose={() => setViewOpen(false)} request={detailItem} />
    </>
  );
}