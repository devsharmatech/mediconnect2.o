"use client";

import { useEffect, useState } from "react";
import { getLoggedInUser } from "@/lib/authHelpers";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  Truck,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  ShieldCheck,
  Clock,
  Briefcase,
  AlertCircle,
  Loader2,
  X,
  Plus,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function LabCollectorsPage() {
  const router = useRouter();
  const [labUser, setLabUser] = useState(null);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollector, setEditingCollector] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    vehicle_info: "",
    employee_id: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    const user = getLoggedInUser("lab");
    if (!user) {
      router.push("/lab/login");
      return;
    }
    setLabUser(user);
    fetchCollectors(user.id);
  }, []);

  const fetchCollectors = async (labId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/lab/collectors?lab_id=${labId}`);
      const data = await res.json();
      if (data.status) {
        setCollectors(data.data || []);
      } else {
        toast.error(data.message || "Failed to load collectors");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load sample collectors");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCollector(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      vehicle_info: "",
      employee_id: "",
      notes: "",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (collector) => {
    setEditingCollector(collector);
    setFormData({
      name: collector.name || "",
      phone: collector.phone || "",
      email: collector.email || "",
      vehicle_info: collector.vehicle_info || "",
      employee_id: collector.employee_id || "",
      notes: collector.notes || "",
      is_active: collector.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter employee name");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Please enter mobile number");
      return;
    }

    try {
      setSubmitting(true);
      if (editingCollector) {
        // Update
        const res = await fetch("/api/lab/collectors", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCollector.id,
            lab_id: labUser.id,
            ...formData,
          }),
        });
        const data = await res.json();
        if (data.status) {
          toast.success("Sample collector updated!");
          setIsModalOpen(false);
          fetchCollectors(labUser.id);
        } else {
          toast.error(data.message || "Update failed");
        }
      } else {
        // Create
        const res = await fetch("/api/lab/collectors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lab_id: labUser.id,
            ...formData,
          }),
        });
        const data = await res.json();
        if (data.status) {
          toast.success("Employee added for sample collection!");
          setIsModalOpen(false);
          fetchCollectors(labUser.id);
        } else {
          toast.error(data.message || "Failed to add collector");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (collector) => {
    try {
      const nextStatus = !collector.is_active;
      const res = await fetch("/api/lab/collectors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: collector.id,
          lab_id: labUser.id,
          is_active: nextStatus,
        }),
      });
      const data = await res.json();
      if (data.status) {
        toast.success(`Collector marked as ${nextStatus ? "Active" : "Inactive"}`);
        fetchCollectors(labUser.id);
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Status update error");
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to remove ${name} from sample collectors?`)) return;

    try {
      const res = await fetch(`/api/lab/collectors?id=${id}&lab_id=${labUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.status) {
        toast.success("Collector removed successfully");
        fetchCollectors(labUser.id);
      } else {
        toast.error(data.message || "Failed to remove collector");
      }
    } catch (err) {
      console.error(err);
      toast.error("Delete error");
    }
  };

  const filteredCollectors = collectors.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.vehicle_info?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? c.is_active
        : !c.is_active;

    return matchesSearch && matchesStatus;
  });

  const totalCount = collectors.length;
  const activeCount = collectors.filter((c) => c.is_active).length;
  const activeAssignments = collectors.reduce((acc, c) => acc + (c.active_assignments_count || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#0067A1]" />
            <span>Sample Collection Staff</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your in-house phlebotomists and align employees for home sample collection orders.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Sample Collector</span>
        </button>
      </div>

      {/* Stats Quick Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Staff</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalCount}</p>
          </div>
          <div className="p-2.5 rounded-md bg-blue-50 text-[#0067A1] dark:bg-slate-800">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active for Alignment</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="p-2.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-slate-800">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Currently Assigned Orders</p>
            <p className="text-2xl font-bold text-[#0067A1] mt-1">{activeAssignments}</p>
          </div>
          <div className="p-2.5 rounded-md bg-sky-50 text-[#0067A1] dark:bg-slate-800">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search collector by name, phone, vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#0067A1]" />
          <p className="text-xs">Loading sample collection staff...</p>
        </div>
      ) : filteredCollectors.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <div className="w-12 h-12 rounded-full bg-sky-50 text-[#0067A1] flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Sample Collectors Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {search
              ? "No collectors match your search query."
              : "You haven't added any sample collection staff yet. Add your phlebotomists to easily align them with patient orders."}
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Collector</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCollectors.map((collector) => (
            <div
              key={collector.id}
              className={`bg-white dark:bg-slate-900 rounded-lg border transition-colors p-4 flex flex-col justify-between gap-4 ${
                collector.is_active
                  ? "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  : "border-slate-200 dark:border-slate-800 opacity-70 bg-slate-50/50"
              }`}
            >
              <div>
                {/* Card Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center font-bold text-sm shrink-0">
                      {collector.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "SC"}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                        {collector.name}
                      </h3>
                      {collector.employee_id && (
                        <span className="text-[11px] text-slate-500 font-mono">
                          ID: {collector.employee_id}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    onClick={() => handleToggleStatus(collector)}
                    title="Click to toggle active status"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors border ${
                      collector.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        collector.is_active ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {collector.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Info List */}
                <div className="mt-3.5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${collector.phone}`}
                      className="hover:underline font-mono text-slate-800 dark:text-slate-200"
                    >
                      {collector.phone}
                    </a>
                  </div>

                  {collector.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{collector.email}</span>
                    </div>
                  )}

                  {collector.vehicle_info && (
                    <div className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{collector.vehicle_info}</span>
                    </div>
                  )}

                  {collector.notes && (
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded text-[11px] text-slate-500 line-clamp-2">
                      {collector.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {collector.active_assignments_count || 0}
                  </span>{" "}
                  active orders
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(collector)}
                    title="Edit staff details"
                    className="p-1.5 rounded text-slate-600 hover:text-[#0067A1] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(collector.id, collector.name)}
                    title="Remove staff member"
                    className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#0067A1]" />
                <span>{editingCollector ? "Edit Sample Collector" : "Add Sample Collection Staff"}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Employee / Staff ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LAB-EMP-01"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle / Transit Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Honda Activa (DL-4S-CD-5678)"
                  value={formData.vehicle_info}
                  onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="ramesh@lab.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Certifications
                </label>
                <textarea
                  rows={2}
                  placeholder="Phlebotomy certified, emergency kit trained..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active_toggle"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#0067A1] rounded cursor-pointer"
                />
                <label htmlFor="is_active_toggle" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Available for sample collection alignments
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingCollector ? "Update Staff" : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
