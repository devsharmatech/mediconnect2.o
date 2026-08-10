"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Eye, EyeOff, UserCog } from "lucide-react";

const designations = ["receptionist", "nurse", "accountant", "lab assistant", "pharmacist", "general", "support"];
const genders = ["male", "female", "other"];

export default function EditStaffPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    address: "",
    designation: "general",
    department: "",
    password: "",
    role_id: "",
    is_active: true,
    is_verified: false,
  });

  useEffect(() => {
    Promise.all([fetchStaff(), fetchRoles()]);
  }, [id]);

  const fetchStaff = async () => {
    try {
      const res = await fetch(`/api/admin/staff/${id}`);
      const data = await res.json();
      if (data.success) {
        const s = data.data.staff;
        setForm({
          full_name: s.full_name || "",
          email: s.email || "",
          phone: s.phone || "",
          gender: s.gender || "",
          date_of_birth: s.date_of_birth || "",
          address: s.address || "",
          designation: s.designation || "general",
          department: s.department || "",
          password: "",
          role_id: s.role_id || "",
          is_active: s.is_active,
          is_verified: s.is_verified,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json();
      if (data.success) setRoles(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    const body = { ...form };
    if (!body.password) delete body.password; // Don't update password if empty

    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        setStatus({ type: "success", text: "Staff updated successfully!" });
        setTimeout(() => router.push(`/admin/staff/${id}`), 1500);
      } else {
        setStatus({ type: "error", text: data.message || "Failed to update staff" });
      }
    } catch (err) {
      setStatus({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/20 to-emerald-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="p-2 md:p-4 max-w-4xl mx-auto">
        <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0067A1] to-[#004F7C] flex items-center justify-center shadow-sm shadow-teal-500/20">
              <UserCog className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Staff</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Update staff member details</p>
            </div>
          </div>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Personal */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Personal Information</h3>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                <input value={form.full_name} onChange={(e) => handleChange("full_name", e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
                <input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Gender</label>
                <select value={form.gender} onChange={(e) => handleChange("gender", e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent">
                  <option value="">Select</option>
                  {genders.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Date of Birth</label>
                <input type="date" value={form.date_of_birth} onChange={(e) => handleChange("date_of_birth", e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
                <textarea value={form.address} onChange={(e) => handleChange("address", e.target.value)} rows={2} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent resize-none" />
              </div>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-800" />

          {/* Work */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Work Information</h3>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Designation</label>
                <select value={form.designation} onChange={(e) => handleChange("designation", e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent">
                  {designations.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Department</label>
                <input value={form.department} onChange={(e) => handleChange("department", e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Assign Role</label>
                <select value={form.role_id} onChange={(e) => handleChange("role_id", e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent">
                  <option value="">No role</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange("is_active", e.target.checked)} className="w-4 h-4 text-[#0067A1] rounded focus:ring-[#0067A1]" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_verified} onChange={(e) => handleChange("is_verified", e.target.checked)} className="w-4 h-4 text-[#0067A1] rounded focus:ring-[#0067A1]" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Verified</span>
                </label>
              </div>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-800" />

          {/* Password */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Change Password</h3>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Password (leave blank to keep current)</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {status && (
            <div className={`rounded-xl p-4 ${
              status.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200"
                : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200"
            }`}>{status.text}</div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 font-medium">
              Cancel
            </button>
            <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-[#0067A1] to-[#004F7C] text-white font-semibold rounded-lg shadow-sm shadow-teal-500/25 disabled:opacity-50">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Saving..." : "Save Changes"}
            </motion.button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
