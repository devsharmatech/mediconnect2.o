"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search, Eye, RefreshCw, User, Phone, Mail, ChevronLeft, ChevronRight,
  X, Stethoscope, Star, Award, Building, Clock, Loader2
} from "lucide-react";

const formatArrayOrString = (value, fallback = "N/A") => {
  if (value == null) return fallback;
  if (Array.isArray(value)) return value.length === 0 ? fallback : value.join(", ");
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return fallback;
    if (t.startsWith("[")) { try { const p = JSON.parse(t); if (Array.isArray(p)) return p.join(", "); } catch {} }
    return t;
  }
  return fallback;
};

export default function StaffDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewDoctor, setViewDoctor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10
  });

  const fetchDoctors = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(), limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const res = await fetch(`/api/doctors/get?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDoctors(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchDoctors(1), 400);
    return () => clearTimeout(t);
  }, [searchTerm, statusFilter]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-[#0067A1]" /> Doctors
          </h1>
          <p className="text-sm text-gray-500 mt-1">View registered doctors</p>
        </div>
        <button onClick={() => fetchDoctors(pagination.currentPage)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, specialization..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading...</div>
        ) : doctors.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No doctors found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Doctor</th>
                  <th className="text-left px-4 py-3 font-medium">Specialization</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-left px-4 py-3 font-medium">Experience</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doctors.map((d) => {
                  const dd = d.doctor_details || {};
                  const statusLabel = d.status === 1 ? "Active" : d.status === 0 ? "Inactive" : (d.status || "—");
                  const statusClass = d.status === 1 ? "bg-green-100 text-green-700" : d.status === 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600";
                  return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{dd.full_name || "—"}</p>
                      <p className="text-xs text-gray-400">{dd.email || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{formatArrayOrString(dd.specialization)}</td>
                    <td className="px-4 py-3 text-gray-600">{d.phone_number || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{dd.experience_years || dd.experience || "—"} yrs</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg ${statusClass}`}>{statusLabel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setViewDoctor(d)}
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
            <p className="text-xs text-gray-500">Page {pagination.currentPage} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={pagination.currentPage <= 1} onClick={() => fetchDoctors(pagination.currentPage - 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => fetchDoctors(pagination.currentPage + 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {viewDoctor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setViewDoctor(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">Doctor Details</h2>
                <button onClick={() => setViewDoctor(null)} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                {(() => { const dd = viewDoctor.doctor_details || {}; return [
                  { icon: User, label: "Name", value: dd.full_name },
                  { icon: Stethoscope, label: "Specialization", value: formatArrayOrString(dd.specialization) },
                  { icon: Award, label: "Qualification", value: formatArrayOrString(dd.qualification) },
                  { icon: Phone, label: "Phone", value: viewDoctor.phone_number },
                  { icon: Mail, label: "Email", value: dd.email },
                  { icon: Clock, label: "Experience", value: dd.experience_years || dd.experience ? `${dd.experience_years || dd.experience} years` : null },
                  { icon: Building, label: "Clinic", value: dd.clinic_name },
                  { icon: Star, label: "License No.", value: dd.license_number },
                ]; })().map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <item.icon className="w-4 h-4 text-[#0067A1] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-sm text-gray-800">{item.value || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
