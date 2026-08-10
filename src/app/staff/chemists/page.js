"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search, Eye, RefreshCw, ChevronLeft, ChevronRight,
  X, Pill, MapPin, Phone, Loader2
} from "lucide-react";

const STATUS_COLORS = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const getStatusLabel = (c) => {
  if (c.onboarding_status) return c.onboarding_status;
  const s = c.users?.status;
  if (s === 1) return "active";
  if (s === 0) return "inactive";
  return s || "pending";
};

export default function StaffChemistsPage() {
  const [chemists, setChemists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewChemist, setViewChemist] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10
  });

  const fetchChemists = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(), limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/chemists/web?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load");
      setChemists(data.data.data || []);
      const pg = data.data.pagination || {};
      setPagination({
        currentPage: pg.currentPage || pg.page || 1,
        totalPages: pg.totalPages || 1,
        totalItems: pg.totalItems || pg.total || 0,
        itemsPerPage: pg.itemsPerPage || pg.limit || 10,
      });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchChemists(1), 400);
    return () => clearTimeout(t);
  }, [searchTerm, statusFilter]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Pill className="w-6 h-6 text-[#0067A1]" /> Chemists
          </h1>
          <p className="text-sm text-gray-500 mt-1">View all registered chemists</p>
        </div>
        <button onClick={() => fetchChemists(pagination.currentPage)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by chemist name or shop..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading...</div>
        ) : chemists.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No chemists found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Shop</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-left px-4 py-3 font-medium">Location</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {chemists.map((c) => {
                  const statusLabel = getStatusLabel(c);
                  return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.owner_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.pharmacy_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.mobile || c.users?.phone_number || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{c.address || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[statusLabel] || "bg-gray-100 text-gray-600"}`}>
                        {statusLabel || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setViewChemist(c)}
                        className="p-2 bg-[#0067A1]/10 text-[#0067A1] rounded-lg hover:bg-[#0067A1]/20 cursor-pointer">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total)</p>
            <div className="flex gap-2">
              <button disabled={pagination.currentPage <= 1} onClick={() => fetchChemists(pagination.currentPage - 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => fetchChemists(pagination.currentPage + 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {viewChemist && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setViewChemist(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">Chemist Details</h2>
                <button onClick={() => setViewChemist(null)} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div><p className="text-xs text-gray-400">Owner Name</p><p className="text-sm font-medium text-gray-800">{viewChemist.owner_name || "—"}</p></div>
                <div><p className="text-xs text-gray-400">Pharmacy Name</p><p className="text-sm text-gray-800">{viewChemist.pharmacy_name || "—"}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-400">Phone</p><p className="text-sm text-gray-800 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {viewChemist.mobile || viewChemist.users?.phone_number || "—"}</p></div>
                  <div><p className="text-xs text-gray-400">Email</p><p className="text-sm text-gray-800">{viewChemist.email || "—"}</p></div>
                </div>
                <div><p className="text-xs text-gray-400">Drug License No.</p><p className="text-sm text-gray-800">{viewChemist.drug_license_no || "—"}</p></div>
                <div><p className="text-xs text-gray-400">GSTIN</p><p className="text-sm text-gray-800">{viewChemist.gstin || "—"}</p></div>
                <div><p className="text-xs text-gray-400">Registration No.</p><p className="text-sm text-gray-800">{viewChemist.registration_no || "—"}</p></div>
                <div><p className="text-xs text-gray-400">Address</p><p className="text-sm text-gray-800 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {viewChemist.address || "—"}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-400">WhatsApp</p><p className="text-sm text-gray-800">{viewChemist.whatsapp || "—"}</p></div>
                  <div><p className="text-xs text-gray-400">Status</p>
                    {(() => { const sl = getStatusLabel(viewChemist); return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[sl] || "bg-gray-100 text-gray-600"}`}>
                      {sl || "—"}
                    </span>
                    ); })()}
                  </div>
                </div>
                <div><p className="text-xs text-gray-400">Joined</p><p className="text-sm text-gray-800">{viewChemist.created_at ? new Date(viewChemist.created_at).toLocaleDateString("en-IN") : "—"}</p></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
