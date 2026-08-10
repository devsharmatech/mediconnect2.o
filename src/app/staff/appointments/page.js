"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search, Eye, RefreshCw, User, Phone, ChevronLeft, ChevronRight,
  X, Calendar, Clock, Stethoscope, Loader2, CheckCircle, XCircle, IndianRupee
} from "lucide-react";

const STATUS_COLORS = {
  booked: "bg-blue-100 text-[#004F7C]",
  approved: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
};

// Safe text helper — prevents rendering raw objects as React children
function toDisplayText(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(toDisplayText).filter(Boolean).join(", ");
  if (typeof val === "object") {
    // For assistive analysis objects, extract the summary field if available
    if (val.summary) return String(val.summary);
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${toDisplayText(v)}`)
      .join("; ");
  }
  return String(val);
}

export default function StaffAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewAppointment, setViewAppointment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [summary, setSummary] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10
  });

  const fetchAppointments = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(), limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(dateFilter && { date: dateFilter }),
      });
      const res = await fetch(`/api/appointment/web?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setAppointments(data.data.appointments || data.data || []);
      // Convert summary object { total, booked, approved, ... } to array
      const rawSummary = data.data.summary || {};
      if (typeof rawSummary === 'object' && !Array.isArray(rawSummary)) {
        const summaryArr = Object.entries(rawSummary).map(([key, val]) => ({
          label: key.charAt(0).toUpperCase() + key.slice(1),
          status: key,
          count: val || 0,
        }));
        setSummary(summaryArr);
      } else {
        setSummary(rawSummary);
      }
      const pg = data.data.pagination || {};
      setPagination({
        currentPage: pg.currentPage || pg.page || 1,
        totalPages: pg.totalPages || 1,
        totalItems: pg.total || pg.totalItems || 0,
        itemsPerPage: pg.perPage || pg.itemsPerPage || 10,
      });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchAppointments(1), 400);
    return () => clearTimeout(t);
  }, [searchTerm, statusFilter, dateFilter]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#0067A1]" /> Appointments
          </h1>
          <p className="text-sm text-gray-500 mt-1">View all appointments</p>
        </div>
        <button onClick={() => fetchAppointments(pagination.currentPage)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {summary.map((s, i) => {
            let Icon = Calendar;
            let iconColor = "text-[#0067A1]";
            let bg = "bg-blue-50 border-blue-100";
            switch ((s.status || s.label || "").toLowerCase()) {
              case "approved":
                Icon = CheckCircle; iconColor = "text-green-600"; bg = "bg-green-50 border-green-100"; break;
              case "completed":
                Icon = CheckCircle; iconColor = "text-emerald-600"; bg = "bg-emerald-50 border-emerald-100"; break;
              case "rejected":
                Icon = XCircle; iconColor = "text-red-600"; bg = "bg-red-50 border-red-100"; break;
              case "cancelled":
                Icon = X; iconColor = "text-gray-500"; bg = "bg-gray-50 border-gray-100"; break;
              case "pending":
                Icon = Clock; iconColor = "text-yellow-600"; bg = "bg-yellow-50 border-yellow-100"; break;
              case "booked":
                Icon = Calendar; iconColor = "text-[#0067A1]"; bg = "bg-blue-50 border-blue-100"; break;
              default:
                Icon = Calendar; iconColor = "text-[#0067A1]"; bg = "bg-blue-50 border-blue-100";
            }
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`rounded-xl border p-4 shadow-sm text-center flex flex-col items-center ${bg}`}>
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full mb-2 ${bg}`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </span>
                <p className="text-xs text-gray-500 capitalize font-semibold tracking-wide">{s.status || s.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{s.count}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patient or doctor..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
            <option value="all">All Status</option>
            <option value="booked">Booked</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading...</div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No appointments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Patient</th>
                  <th className="text-left px-4 py-3 font-medium">Doctor</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  {/* Removed Type column */}
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{a.patient?.full_name || a.patient_name || "—"}</p>
                      <p className="text-xs text-gray-400">{a.patient?.phone_number || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.doctor?.full_name || a.doctor_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{a.appointment_date || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{a.appointment_time || "—"}</td>
                    {/* Removed Type column */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg capitalize ${STATUS_COLORS[a.status] || "bg-gray-100 text-gray-600"}`}>
                        {a.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setViewAppointment(a)}
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

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {pagination.currentPage} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={pagination.currentPage <= 1} onClick={() => fetchAppointments(pagination.currentPage - 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => fetchAppointments(pagination.currentPage + 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {viewAppointment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setViewAppointment(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">Appointment Details</h2>
                <button onClick={() => setViewAppointment(null)} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                {[
                  { icon: User, label: "Patient", value: viewAppointment.patient?.full_name || viewAppointment.patient_name },
                  { icon: Phone, label: "Patient Phone", value: viewAppointment.patient?.phone_number },
                  { icon: Stethoscope, label: "Doctor", value: viewAppointment.doctor?.full_name || viewAppointment.doctor_name },
                  { icon: Calendar, label: "Date", value: viewAppointment.appointment_date },
                  { icon: Clock, label: "Time", value: viewAppointment.appointment_time },
                  { icon: Calendar, label: "Type", value: toDisplayText(viewAppointment.disease_info) || viewAppointment.appointment_type },
                  { icon: IndianRupee, label: "Fee", value: viewAppointment.doctor?.consultation_fee ? `\u20B9${viewAppointment.doctor.consultation_fee}` : (viewAppointment.fee ? `\u20B9${viewAppointment.fee}` : null) },
                  { icon: viewAppointment.status === "approved" ? CheckCircle : XCircle, label: "Status", value: viewAppointment.status },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <item.icon className="w-4 h-4 text-[#0067A1] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-sm text-gray-800 capitalize">{item.value || "—"}</p>
                    </div>
                  </div>
                ))}
                {viewAppointment.disease_info && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mt-2">
                    <p className="text-xs text-gray-400 mb-1">Disease Info / Notes</p>
                    {typeof viewAppointment.disease_info === "object" ? (
                      <div className="space-y-2">
                        {viewAppointment.disease_info.summary && <p><span className="font-medium">Summary:</span> {viewAppointment.disease_info.summary}</p>}
                        {viewAppointment.disease_info.urgency && <p><span className="font-medium">Urgency:</span> <span className="capitalize">{viewAppointment.disease_info.urgency}</span></p>}
                        {Array.isArray(viewAppointment.disease_info.probable_diagnoses) && viewAppointment.disease_info.probable_diagnoses.length > 0 && (
                          <p><span className="font-medium">Probable Diagnoses:</span> {viewAppointment.disease_info.probable_diagnoses.join(", ")}</p>
                        )}
                        {Array.isArray(viewAppointment.disease_info.recommended_specialties) && viewAppointment.disease_info.recommended_specialties.length > 0 && (
                          <p><span className="font-medium">Specialties:</span> {viewAppointment.disease_info.recommended_specialties.join(", ")}</p>
                        )}
                        {Array.isArray(viewAppointment.disease_info.recommended_lab_tests) && viewAppointment.disease_info.recommended_lab_tests.length > 0 && (
                          <p><span className="font-medium">Lab Tests:</span> {viewAppointment.disease_info.recommended_lab_tests.join(", ")}</p>
                        )}
                        {Array.isArray(viewAppointment.disease_info.recommended_medicines) && viewAppointment.disease_info.recommended_medicines.length > 0 && (
                          <p><span className="font-medium">Medicines:</span> {viewAppointment.disease_info.recommended_medicines.join(", ")}</p>
                        )}
                      </div>
                    ) : (
                      toDisplayText(viewAppointment.disease_info)
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
