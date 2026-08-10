"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User, ArrowLeft, Edit, ShieldCheck, ShieldOff, Mail, Phone,
  Building2, Badge, Calendar, Clock, MapPin, Shield, Key, Activity
} from "lucide-react";

export default function StaffDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, [id]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/staff/${id}`);
      const data = await res.json();
      if (data.success) {
        setStaff(data.data.staff);
        setPermissions(data.data.permissions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Staff member not found</p>
      </div>
    );
  }

  const groupedPermissions = {};
  permissions.forEach((p) => {
    if (!groupedPermissions[p.module]) groupedPermissions[p.module] = [];
    groupedPermissions[p.module].push(p);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/20 to-emerald-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="p-2 md:p-4 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/admin/staff")}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0067A1] to-[#004F7C] flex items-center justify-center shadow-sm text-white text-xl font-bold">
                {staff.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{staff.full_name}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{staff.employee_code} • {staff.designation}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/admin/staff/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => router.push(`/admin/staff/${id}/permissions`)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-[#0067A1] to-[#004F7C] text-white rounded-lg shadow-sm shadow-teal-500/25"
              >
                <Key className="w-4 h-4" />
                Permissions
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Info Card */}
          <motion.div
            className="md:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Personal Details</h3>
            <div className="grid md:grid-cols-2 gap-y-5 gap-x-8">
              {[
                { icon: Mail, label: "Email", value: staff.email },
                { icon: Phone, label: "Phone", value: staff.phone || "—" },
                { icon: User, label: "Gender", value: staff.gender ? staff.gender.charAt(0).toUpperCase() + staff.gender.slice(1) : "—" },
                { icon: Calendar, label: "Date of Birth", value: staff.date_of_birth || "—" },
                { icon: Building2, label: "Department", value: staff.department || "—" },
                { icon: Badge, label: "Designation", value: staff.designation || "—" },
                { icon: Shield, label: "Role", value: staff.staff_roles?.name || "No Role" },
                { icon: MapPin, label: "Address", value: staff.address || "—" },
                { icon: Clock, label: "Last Login", value: staff.last_login_at ? new Date(staff.last_login_at).toLocaleString() : "Never" },
                { icon: Calendar, label: "Joined", value: new Date(staff.created_at).toLocaleDateString() },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <item.icon className="w-5 h-5 text-[#0067A1] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Status Card */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Account</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    staff.is_active
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  }`}>
                    {staff.is_active ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                    {staff.is_active ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Verified</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    staff.is_verified
                      ? "bg-teal-100 text-[#004F7C] dark:bg-[#003358]/30 dark:text-teal-300"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {staff.is_verified ? "Verified" : "Unverified"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Permissions Overview */}
        <motion.div
          className="mt-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            <Key className="inline w-5 h-5 mr-2 text-[#0067A1]" />
            Effective Permissions
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <div key={module} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 capitalize mb-2">{module.replace(/_/g, " ")}</h4>
                <div className="space-y-1.5">
                  {perms.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${p.effective.can_view ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span className="text-gray-600 dark:text-gray-400">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
