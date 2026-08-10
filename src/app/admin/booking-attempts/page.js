"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  User,
  Activity,
  RefreshCw,
  Stethoscope,
  Eye,
  Filter
} from "lucide-react";

export default function AdminPatientVisitsPage() {
  const router = useRouter();
  const [doctorGroups, setDoctorGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/booking-attempts", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setDoctorGroups(json.data);
      } else {
        setError(json.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const filteredGroups = doctorGroups.filter(g => {
    const searchStr = searchTerm.toLowerCase();
    const docName = g.doctor?.name?.toLowerCase() || "";
    const spec = g.doctor?.specialization?.toLowerCase() || "";
    return docName.includes(searchStr) || spec.includes(searchStr);
  });

  const totalDoctors = doctorGroups.length;
  const totalPatients = doctorGroups.reduce((acc, g) => acc + g.unique_patients_count, 0);
  const totalVisits = doctorGroups.reduce((acc, g) => acc + g.total_visits, 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 100 } },
    hover: { scale: 1.02, transition: { type: "spring", stiffness: 400 } },
  };

  return (
    <main className="flex-1 overflow-auto relative z-0">
      <div className="p-4 md:p-4 lg:p-4 bg-transparent">
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="min-h-screen bg-gradient-to-br from-gray-50 rounded-2xl to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 lg:p-6">
            
            {/* Header Section */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <motion.h4
                    className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Consultations Tracker
                  </motion.h4>
                  <motion.p
                    className="text-gray-600 dark:text-gray-400 mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Track doctor activity, unique patients, and total consultations.
                  </motion.p>
                </div>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {[
                {
                  label: "Active Doctors",
                  onClick: () => setSearchTerm(""),
                  value: totalDoctors,
                  sub: "Doctors with consultations",
                  icon: User,
                  color: "from-blue-500 to-blue-600 dark:from-gray-800 dark:to-gray-900 text-gray-50",
                },
                {
                  label: "Total Unique Patients",
                  onClick: () => setSearchTerm(""),
                  value: totalPatients,
                  sub: "Across all tracked doctors",
                  icon: Users,
                  color: "from-purple-500 to-purple-600 dark:from-gray-800 dark:to-gray-900 text-gray-50",
                },
                {
                  label: "Total Consultations",
                  onClick: () => setSearchTerm(""),
                  value: totalVisits,
                  sub: "All time completed sessions",
                  icon: Stethoscope,
                  color: "from-emerald-500 to-emerald-600 dark:from-gray-800 dark:to-gray-900 text-gray-50",
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  variants={cardVariants}
                  whileHover="hover"
                  onClick={stat.onClick}
                  className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700/50 hover:shadow-sm transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 tracking-wider">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {stat.sub}
                      </p>
                    </div>
                    <div className={`p-3 bg-gradient-to-r ${stat.color} rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Controls Section */}
            <motion.div
              className="bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <motion.div className="relative flex-1 max-w-md" whileFocus={{ scale: 1.02 }}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search doctor or specialization..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-300 cursor-text"
                  />
                </motion.div>
                <div className="flex flex-wrap items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={fetchVisits}
                    disabled={loading}
                    className="p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Data Table */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {loading ? (
                <div className="p-16 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-4 border-gray-800 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">Loading tracking data...</p>
                </div>
              ) : error ? (
                <div className="p-12 text-center text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/10">
                  {error}
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="p-16 text-center text-gray-500 dark:text-gray-400">
                  <Activity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="font-medium text-lg">No doctors match your search.</p>
                  <p className="text-sm mt-1">Try adjusting your filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Doctor</th>
                        <th className="px-6 py-4">Specialization</th>
                        <th className="px-6 py-4 text-center">Unique Patients</th>
                        <th className="px-6 py-4 text-center">Total Consultations</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                      {filteredGroups.map((group, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold">
                                {group.doctor?.name?.charAt(0) || 'D'}
                              </div>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {group.doctor?.name || 'Unknown Doctor'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                            {group.doctor?.specialization || 'General'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[#004F7C] dark:text-blue-300 font-semibold text-xs border border-blue-100 dark:border-blue-800">
                              {group.unique_patients_count}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-100 dark:border-emerald-800">
                              {group.total_visits}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => router.push(`/admin/booking-attempts/${group.doctor.id}`)}
                              className="flex items-center gap-2 ml-auto px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                            >
                              <Eye size={16} />
                              View Patients
                            </motion.button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
