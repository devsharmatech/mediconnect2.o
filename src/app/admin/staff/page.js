"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye,
  ShieldCheck, ShieldOff, UserCheck, UserX, RefreshCw, ChevronDown,
  Mail, Phone, Building2, Badge, X, AlertCircle
} from "lucide-react";

const designations = ["receptionist", "nurse", "accountant", "lab assistant", "pharmacist", "general", "support"];

export default function StaffListPage() {
  const router = useRouter();
  const [staff, setStaff] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/staff?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStaff(data.data.staff || []);
        setTotal(data.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load staff", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => loadStaff(), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleStatus = async (staffMember) => {
    try {
      const res = await fetch(`/api/admin/staff/${staffMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !staffMember.is_active }),
      });
      const data = await res.json();
      if (data.success) loadStaff();
    } catch (err) {
      console.error("Toggle failed", err);
    }
    setConfirmDialog(null);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) loadStaff();
    } catch (err) {
      console.error("Delete failed", err);
    }
    setConfirmDialog(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/20 to-emerald-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="p-2 md:p-4">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0067A1] to-[#004F7C] flex items-center justify-center shadow-sm shadow-teal-500/20">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  Staff Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {total} staff members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadStaff}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                <RefreshCw className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/admin/staff/create")}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0067A1] to-[#004F7C] text-white font-semibold rounded-xl shadow-sm shadow-teal-500/25"
              >
                <Plus className="w-5 h-5" />
                Add Staff
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          className="mb-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, employee code..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {["all", "active", "disabled"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    statusFilter === s
                      ? "bg-[#0067A1] text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Staff Table */}
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Designation</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-500">Loading staff...</span>
                      </div>
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No staff members found</p>
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0067A1]/10 flex items-center justify-center text-[#0067A1] font-bold text-sm">
                            {s.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.full_name}</p>
                            <p className="text-xs text-gray-500">{s.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">{s.email}</div>
                        <div className="text-xs text-gray-500">{s.phone || "—"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 dark:bg-[#003358]/30 text-[#004F7C] dark:text-teal-300 capitalize">
                          {s.designation || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {s.staff_roles?.name || "No Role"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          s.is_active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                          {s.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {s.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/staff/${s.id}`)}
                            className="p-2 text-gray-500 hover:text-[#0067A1] hover:bg-teal-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/staff/${s.id}/edit`)}
                            className="p-2 text-gray-500 hover:text-[#0067A1] hover:bg-teal-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDialog({
                                type: "toggle",
                                staff: s,
                                title: s.is_active ? "Disable Staff" : "Enable Staff",
                                message: `Are you sure you want to ${s.is_active ? "disable" : "enable"} ${s.full_name}?`,
                              })
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              s.is_active
                                ? "text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                                : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={s.is_active ? "Disable" : "Enable"}
                          >
                            {s.is_active ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDialog({
                                type: "delete",
                                staff: s,
                                title: "Delete Staff",
                                message: `Are you sure you want to delete ${s.full_name}? This action cannot be undone.`,
                              })
                            }
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmDialog.type === "delete" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {confirmDialog.title}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {confirmDialog.message}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDialog.type === "delete") {
                      handleDelete(confirmDialog.staff.id);
                    } else {
                      handleToggleStatus(confirmDialog.staff);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-white font-medium ${
                    confirmDialog.type === "delete"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-[#0067A1] hover:bg-[#004F7C]"
                  }`}
                >
                  {confirmDialog.type === "delete" ? "Delete" : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
