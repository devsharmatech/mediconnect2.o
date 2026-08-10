"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search, Eye, RefreshCw, User, Phone, Mail, Calendar,
  Droplets, MapPin, ChevronLeft, ChevronRight, X, Users, Loader2
} from "lucide-react";

export default function StaffPatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewPatient, setViewPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10
  });

  const fetchPatients = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(), limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(genderFilter !== "all" && { gender: genderFilter }),
      });
      const res = await fetch(`/api/patients?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPatients(data.data || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchPatients(1), 400);
    return () => clearTimeout(t);
  }, [searchTerm, statusFilter, genderFilter]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0067A1]" /> Patients
          </h1>
          <p className="text-sm text-gray-500 mt-1">View registered patients</p>
        </div>
        <button onClick={() => fetchPatients(pagination.currentPage)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, email..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
            <option value="all">All Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading...
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No patients found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Patient</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Gender</th>
                  <th className="text-left px-4 py-3 font-medium">Blood</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{p.patient_details?.full_name || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.phone_number || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.patient_details?.email || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{p.patient_details?.gender || "—"}</td>
                    <td className="px-4 py-3">
                      {p.patient_details?.blood_group ? (
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg">{p.patient_details.blood_group}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                        p.status === "active" || p.status === 1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>{p.status === "active" || p.status === 1 ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setViewPatient(p)}
                        className="p-2 bg-[#0067A1]/10 text-[#0067A1] rounded-lg hover:bg-[#0067A1]/20 cursor-pointer">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total)
            </p>
            <div className="flex gap-2">
              <button disabled={pagination.currentPage <= 1} onClick={() => fetchPatients(pagination.currentPage - 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => fetchPatients(pagination.currentPage + 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {viewPatient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setViewPatient(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">Patient Details</h2>
                <button onClick={() => setViewPatient(null)} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { icon: User, label: "Name", value: viewPatient.patient_details?.full_name },
                  { icon: Phone, label: "Phone", value: viewPatient.phone_number },
                  { icon: Mail, label: "Email", value: viewPatient.patient_details?.email },
                  { icon: Calendar, label: "DOB", value: viewPatient.patient_details?.date_of_birth ? new Date(viewPatient.patient_details.date_of_birth).toLocaleDateString("en-IN") : null },
                  { icon: User, label: "Gender", value: viewPatient.patient_details?.gender },
                  { icon: Droplets, label: "Blood Group", value: viewPatient.patient_details?.blood_group },
                  { icon: MapPin, label: "Address", value: viewPatient.patient_details?.address },
                  { icon: Phone, label: "Emergency Contact", value: viewPatient.patient_details?.emergency_contact },
                  { icon: Calendar, label: "Registered", value: viewPatient.created_at ? new Date(viewPatient.created_at).toLocaleDateString("en-IN") : null },
                ].map((item, i) => (
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
