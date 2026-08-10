"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  User,
  Phone,
  Mail,
  History,
  Calendar,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function AdminDoctorPatientsPage() {
  const { id: doctorId } = useParams();
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        if (!doctorId) {
          setError("Invalid doctor ID");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/doctor/my-patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctor_id: doctorId })
        });
        
        const json = await res.json();
        if (json.success) {
          setPatients(json.data);
        } else {
          setError(json.message || "Failed to fetch patients");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("An error occurred while fetching patients.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatients();
  }, [doctorId]);

  const filteredPatients = patients.filter(p => {
    const searchStr = searchTerm.toLowerCase();
    return (
      (p.full_name || "").toLowerCase().includes(searchStr) ||
      (p.email || "").toLowerCase().includes(searchStr) ||
      (p.phone || "").toLowerCase().includes(searchStr)
    );
  });

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    const [h, m] = timeString.split(':');
    if (!h || !m) return timeString;
    const date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10), 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
                <div className="flex items-center gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push("/admin/booking-attempts")}
                    className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-600 dark:text-gray-300"
                    title="Go back"
                  >
                    <ArrowLeft size={20} />
                  </motion.button>
                  <div>
                    <motion.h4
                      className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Patient Directory
                    </motion.h4>
                    <motion.p
                      className="text-gray-600 dark:text-gray-400 mt-1 text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      Detailed list of patients treated by this doctor
                    </motion.p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Controls Section */}
            <motion.div
              className="bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <motion.div className="relative w-full lg:w-96" whileFocus={{ scale: 1.02 }}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-300 cursor-text"
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* Data Table */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-hidden flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {loading ? (
                <div className="p-16 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-4 border-gray-800 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">Loading patient records...</p>
                </div>
              ) : error ? (
                <div className="p-12 text-center text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/10">
                  {error}
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-16 text-center text-gray-500 dark:text-gray-400">
                  <User className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="font-medium text-lg">No patients found</p>
                  <p className="text-sm mt-1">Try adjusting your search criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Patient Info</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4 text-center">Total Visits</th>
                        <th className="px-6 py-4">Last Visit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                      {paginatedPatients.map((patient, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold">
                                {patient.full_name?.charAt(0) || 'P'}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{patient.full_name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex gap-2">
                                  <span>{patient.gender || 'Unknown'}</span>
                                  {patient.blood_group && (
                                    <span className="text-red-500 font-medium">Blood: {patient.blood_group}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-600 dark:text-gray-300 space-y-1">
                              <div className="flex items-center gap-2">
                                <Phone className="text-gray-400 w-3 h-3" />
                                <span>{patient.phone || 'No phone'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <Mail className="text-gray-400 w-3 h-3" />
                                <span>{patient.email || 'No email'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-lg font-bold text-gray-900 dark:text-white">{patient.visit_count}</span>
                              {patient.visit_count > 1 && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-[#004F7C] dark:text-blue-300 px-2 py-0.5 rounded-full mt-1">Returning</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-gray-600 dark:text-gray-300">
                              <span className="font-medium flex items-center gap-1.5">
                                <Calendar className="text-gray-400 w-3 h-3" /> 
                                {formatDate(patient.last_visit_date)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                                <History className="text-gray-400 w-3 h-3" />
                                {formatTime(patient.last_visit_time)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {filteredPatients.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing <span className="font-semibold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredPatients.length)}</span> of <span className="font-semibold text-gray-900 dark:text-white">{filteredPatients.length}</span> entries
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </motion.button>
                    <div className="px-4 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Page {currentPage} of {totalPages}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
