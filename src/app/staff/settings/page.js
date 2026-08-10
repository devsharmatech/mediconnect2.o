"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Settings, User, Building2, Shield, Mail, Phone, BadgeCheck,
  Briefcase, Loader2, Save
} from "lucide-react";

export default function StaffSettingsPage() {
  const [staffUser, setStaffUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "", email: "", phone: "", address: ""
  });

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("staffUser") || "{}");
      setStaffUser(user);
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const handleSave = async () => {
    if (!staffUser?.id) return;
    try {
      setSaving(true);
      const token = localStorage.getItem("staffToken");
      const res = await fetch("/api/staff/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update profile");
      const updated = { ...staffUser, ...formData };
      localStorage.setItem("staffUser", JSON.stringify(updated));
      setStaffUser(updated);
      toast.success("Profile updated successfully");
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0067A1]" />
      </div>
    );
  }

  const permissions = JSON.parse(localStorage.getItem("staffPermissions") || "[]");

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#0067A1]" /> Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">View your profile and permissions</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#0067A1] to-[#0080C6] p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
              {(staffUser?.full_name || "S")[0].toUpperCase()}
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">{staffUser?.full_name || "Staff Member"}</h2>
              <p className="text-white/80 text-sm">{staffUser?.designation || "Staff"} • {staffUser?.department || "General"}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1 mb-1"><User className="w-3.5 h-3.5" /> Full Name</label>
              <input type="text" value={formData.full_name} onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
            </div>
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Mail className="w-3.5 h-3.5" /> Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
            </div>
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Phone className="w-3.5 h-3.5" /> Phone</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
            </div>
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Building2 className="w-3.5 h-3.5" /> Address</label>
              <input type="text" value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] disabled:opacity-50 cursor-pointer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Staff Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-[#0067A1]" /> Employment Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Employee Code", value: staffUser?.employee_code, icon: Briefcase },
            { label: "Department", value: staffUser?.department, icon: Building2 },
            { label: "Designation", value: staffUser?.designation, icon: BadgeCheck },
            { label: "Role", value: staffUser?.role_name, icon: Shield },
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 flex items-center gap-1"><item.icon className="w-3 h-3" /> {item.label}</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{item.value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#0067A1]" /> Your Permissions
        </h3>
        {permissions.length === 0 ? (
          <p className="text-sm text-gray-400">No permissions assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {permissions.map((perm, i) => (
              <span key={i} className="px-3 py-1.5 bg-[#0067A1]/10 text-[#0067A1] rounded-lg text-xs font-medium">
                {perm.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
