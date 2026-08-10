"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, Calendar, ClipboardList, Stethoscope, Pill,
  Microscope, Shield, Activity, TrendingUp, Clock, CheckCircle2,
  Building2, Heart, Loader2
} from "lucide-react";

const moduleMap = {
  view_patients: { label: "Patients", icon: Users, color: "from-blue-500 to-blue-600", api: "/api/patients?page=1&limit=1" },
  view_doctors: { label: "Doctors", icon: Stethoscope, color: "from-teal-500 to-teal-600", api: "/api/doctors/get?page=1&limit=1" },
  view_appointments: { label: "Appointments", icon: Calendar, color: "from-purple-500 to-purple-600", api: "/api/appointment/web?page=1&limit=1" },
  view_prescriptions: { label: "Prescriptions", icon: ClipboardList, color: "from-orange-500 to-orange-600", api: "/api/prescriptions/web?page=1&limit=1" },
  view_chemists: { label: "Chemists", icon: Pill, color: "from-pink-500 to-pink-600", api: "/api/chemists/web?page=1&limit=1" },
  view_labs: { label: "Labs", icon: Microscope, color: "from-indigo-500 to-indigo-600", api: "/api/lab/web?page=1&limit=1" },
  view_hospitals: { label: "Hospitals", icon: Building2, color: "from-cyan-500 to-cyan-600", api: "/api/hospital/web?page=1&limit=1" },
  view_insurance: { label: "Insurance", icon: Shield, color: "from-emerald-500 to-emerald-600" },
  view_nursing: { label: "Nursing", icon: Heart, color: "from-rose-500 to-rose-600" },
};

export default function StaffDashboardPage() {
  const [staffUser, setStaffUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [moduleCounts, setModuleCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("staffUser") || "null");
      const perms = JSON.parse(localStorage.getItem("staffPermissions") || "[]");
      setStaffUser(user);
      setPermissions(perms);
    } catch { /* ignore */ }

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real-time counts for accessible modules
  useEffect(() => {
    if (permissions.length === 0) return;
    const fetchCounts = async () => {
      setLoadingCounts(true);
      const counts = {};
      const fetchPromises = Object.entries(moduleMap)
        .filter(([key]) => permissions.includes(key))
        .filter(([, val]) => val.api)
        .map(async ([key, val]) => {
          try {
            const res = await fetch(val.api);
            const data = await res.json();
            if (data.success) {
              const pg = data.pagination || data.data?.pagination || {};
              counts[key] = pg.totalItems || pg.total || pg.totalCount || data.data?.total || 0;
            }
          } catch { /* ignore */ }
        });
      await Promise.all(fetchPromises);
      setModuleCounts(counts);
      setLoadingCounts(false);
    };
    fetchCounts();
  }, [permissions]);

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Show module cards only for permissions the staff has
  const accessibleModules = Object.entries(moduleMap)
    .filter(([key]) => permissions.includes(key))
    .map(([key, val]) => ({ key, ...val }));

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#0067A1] to-[#0080C6] rounded-2xl p-6 lg:p-8 text-white shadow-xl"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              {greeting()}, {staffUser?.full_name || "Staff"} 👋
            </h1>
            <p className="text-white/70 mt-2 text-sm lg:text-base">
              {staffUser?.designation || "Staff Member"} • {staffUser?.department || "General"}
            </p>
            <p className="text-white/50 text-xs mt-1">
              Employee Code: {staffUser?.employee_code || "—"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-white/80">
            <Clock className="w-5 h-5" />
            <span className="text-sm">
              {currentTime.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200 mt-1">{staffUser?.role_name || "—"}</p>
            </div>
            <div className="w-10 h-10 bg-[#0067A1]/10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#0067A1]" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Access Modules</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200 mt-1">{accessibleModules.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#0067A1] dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">Active</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200 mt-1 truncate">{staffUser?.department || "—"}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Accessible Modules */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Your Accessible Modules</h2>
        {accessibleModules.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
            <p className="text-yellow-700 dark:text-yellow-400 text-sm">
              No modules have been assigned to your account yet. Please contact your administrator.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {accessibleModules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <motion.a
                  key={mod.key}
                  href={`/staff/${mod.label.toLowerCase()}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  className="group bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-[#0067A1]/30 transition-all duration-300 cursor-pointer"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${mod.color} rounded-xl flex items-center justify-center shadow mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">{mod.label}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {moduleCounts[mod.key] !== undefined
                      ? <span className="text-[#0067A1] font-semibold">{moduleCounts[mod.key]} records</span>
                      : loadingCounts
                        ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</span>
                        : `View & manage ${mod.label.toLowerCase()}`
                    }
                  </p>
                </motion.a>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Your Permissions</h2>
        <div className="flex flex-wrap gap-2">
          {permissions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No permissions assigned.</p>
          ) : (
            permissions.map((perm) => (
              <span
                key={perm}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#0067A1]/10 text-[#0067A1] dark:bg-[#0067A1]/20 dark:text-[#5eead4] text-xs font-medium"
              >
                {perm.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
