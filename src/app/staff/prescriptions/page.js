"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search, Eye, RefreshCw, User, ChevronLeft, ChevronRight,
  X, Calendar, FileText, Loader2, Stethoscope, Pill, Heart,
  Activity, FlaskConical, Clock
} from "lucide-react";

const toDisplayText = (value) => {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (value.every((item) => typeof item === "string" || typeof item === "number")) {
      return value.join(", ");
    }
    return value
      .map((v) => (typeof v === "object" ? v.name || v.test_name || JSON.stringify(v) : String(v)))
      .join(", ");
  }
  if (typeof value === "object") {
    if (typeof value.primary === "string" && value.primary.trim()) return value.primary;
    if (typeof value.notes === "string" && value.notes.trim()) return value.notes;
    if (typeof value.name === "string" && value.name.trim()) return value.name;
    return JSON.stringify(value);
  }
  return "—";
};

const getMedicinesCountLabel = (medicines) => {
  if (Array.isArray(medicines)) return medicines.length > 0 ? `${medicines.length} medicines` : "—";
  if (medicines && typeof medicines === "object") return "1 medicine";
  return "—";
};

const STATUS_COLORS = {
  active: "bg-blue-100 text-[#004F7C] border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  draft: "bg-yellow-100 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export default function StaffPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewPrescription, setViewPrescription] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10
  });

  const fetchPrescriptions = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(), limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(dateFilter.start && { start_date: dateFilter.start }),
        ...(dateFilter.end && { end_date: dateFilter.end }),
      });
      const res = await fetch(`/api/prescriptions/web?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load");
      setPrescriptions(data.data.items || []);
      setPagination({
        currentPage: data.data.page || 1,
        totalPages: Math.ceil((data.data.total || 0) / (data.data.limit || 10)),
        totalItems: data.data.total || 0,
        itemsPerPage: data.data.limit || 10,
      });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const viewDetails = async (p) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/prescriptions/web?id=${p.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setViewPrescription(data.data);
      } else {
        setViewPrescription(p);
      }
    } catch {
      setViewPrescription(p);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchPrescriptions(1), 400);
    return () => clearTimeout(t);
  }, [searchTerm, dateFilter]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#0067A1]" /> Prescriptions
          </h1>
          <p className="text-sm text-gray-500 mt-1">View all prescriptions • {pagination.totalItems} total</p>
        </div>
        <button onClick={() => fetchPrescriptions(pagination.currentPage)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient or doctor name..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
          </div>
          <input type="date" value={dateFilter.start} onChange={(e) => setDateFilter(p => ({ ...p, start: e.target.value }))}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="Start date" />
          <input type="date" value={dateFilter.end} onChange={(e) => setDateFilter(p => ({ ...p, end: e.target.value }))}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="End date" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading...</div>
        ) : prescriptions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No prescriptions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Patient</th>
                  <th className="text-left px-4 py-3 font-medium">Doctor</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                   {/* Removed Diagnosis and Medicines columns */}
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prescriptions.map((p) => {
                  const statusStr = p.is_draft ? "draft" : (p.status || "active");
                  return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-[#0067A1]" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{p.patient?.full_name || "—"}</p>
                          <p className="text-xs text-gray-400">{p.patient?.phone || p.patient?.gender || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{p.doctor?.full_name || "—"}</p>
                       <p className="text-xs text-gray-400">{
                         (() => {
                           const val = p.doctor?.specialization;
                           if (typeof val === "string" && val.trim().startsWith("[")) {
                             try {
                               const arr = JSON.parse(val);
                               if (Array.isArray(arr)) return arr.join(", ");
                             } catch {}
                           }
                           return Array.isArray(val) ? val.join(", ") : (val || "");
                         })()
                       }</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[statusStr] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {statusStr}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => viewDetails(p)}
                        className="p-2 bg-[#0067A1]/10 text-[#0067A1] rounded-lg hover:bg-[#0067A1]/20 cursor-pointer">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total)</p>
            <div className="flex gap-2">
              <button disabled={pagination.currentPage <= 1} onClick={() => fetchPrescriptions(pagination.currentPage - 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => fetchPrescriptions(pagination.currentPage + 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* View Prescription Detail Modal */}
      <AnimatePresence>
        {(viewPrescription || detailLoading) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => { setViewPrescription(null); setDetailLoading(false); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}>

              {detailLoading && !viewPrescription ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0067A1]" />
                </div>
              ) : viewPrescription && (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5" />
                      <div>
                        <h2 className="text-lg font-bold">Prescription Details</h2>
                        <p className="text-white/70 text-xs">ID: {viewPrescription.id?.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <button onClick={() => setViewPrescription(null)} className="p-2 hover:bg-white/20 rounded-lg cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="overflow-y-auto p-5 space-y-5">
                    {/* Patient & Doctor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-[#0067A1]" />
                          <p className="text-xs font-semibold text-[#0067A1] uppercase tracking-wide">Patient</p>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{viewPrescription.patient?.full_name || "—"}</p>
                        {viewPrescription.patient?.phone && <p className="text-xs text-gray-500 mt-0.5">Phone: {viewPrescription.patient.phone}</p>}
                        {viewPrescription.patient?.gender && <p className="text-xs text-gray-500">Gender: {viewPrescription.patient.gender}</p>}
                        {viewPrescription.patient?.age && <p className="text-xs text-gray-500">Age: {viewPrescription.patient.age}</p>}
                      </div>
                      <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Stethoscope className="w-4 h-4 text-[#0067A1]" />
                          <p className="text-xs font-semibold text-[#0067A1] uppercase tracking-wide">Doctor</p>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{viewPrescription.doctor?.full_name || "—"}</p>
                        {viewPrescription.doctor?.specialization && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {(() => {
                              const val = viewPrescription.doctor.specialization;
                              if (typeof val === "string" && val.trim().startsWith("[")) {
                                try {
                                  const arr = JSON.parse(val);
                                  if (Array.isArray(arr)) return arr.join(", ");
                                } catch {}
                              }
                              return Array.isArray(val) ? val.join(", ") : val;
                            })()}
                          </p>
                        )}
                        {viewPrescription.doctor?.email && <p className="text-xs text-gray-500">{viewPrescription.doctor.email}</p>}
                      </div>
                    </div>

                    {/* Appointment */}
                    {viewPrescription.appointment && (
                      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Appointment</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div><p className="text-xs text-gray-400">Date</p><p className="text-gray-800">{viewPrescription.appointment.appointment_date || "—"}</p></div>
                          <div><p className="text-xs text-gray-400">Time</p><p className="text-gray-800">{viewPrescription.appointment.appointment_time || "—"}</p></div>
                          <div><p className="text-xs text-gray-400">Status</p><p className="text-gray-800 capitalize">{viewPrescription.appointment.status || "—"}</p></div>
                        </div>
                      </div>
                    )}

                    {/* Diagnosis */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5" /> Diagnosis
                      </p>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-sm text-gray-800">{toDisplayText(viewPrescription.diagnosis)}</p>
                      </div>
                    </div>

                    {/* Vital Signs */}
                    {viewPrescription.vital_signs && Object.keys(viewPrescription.vital_signs).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" /> Vital Signs
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(viewPrescription.vital_signs).map(([key, val]) => (
                            val && <div key={key} className="bg-red-50 rounded-lg p-3 border border-red-100">
                              <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, " ")}</p>
                              <p className="text-sm font-semibold text-gray-800">{toDisplayText(val)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medicines */}
                    {Array.isArray(viewPrescription.medicines) && viewPrescription.medicines.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5" /> Medicines ({viewPrescription.medicines.length})
                        </p>
                        <div className="space-y-2">
                          {viewPrescription.medicines.map((m, i) => (
                            <div key={i} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                  <p className="font-medium text-gray-800 text-sm">{m.name || m.medicine_name || m.drug_name || "Medicine"}</p>
                                </div>
                                {m.type && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{m.type}</span>}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                {m.dosage && <span>Dosage: <b className="text-gray-700">{m.dosage}</b></span>}
                                {m.frequency && <span>Frequency: <b className="text-gray-700">{m.frequency}</b></span>}
                                {m.duration && <span>Duration: <b className="text-gray-700">{m.duration}</b></span>}
                                {m.route && <span>Route: <b className="text-gray-700">{m.route}</b></span>}
                                {m.timing && <span>Timing: <b className="text-gray-700">{m.timing}</b></span>}
                              </div>
                              {m.instructions && <p className="text-xs text-gray-400 mt-1 italic">{m.instructions}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lab Tests */}
                    {Array.isArray(viewPrescription.lab_tests) && viewPrescription.lab_tests.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <FlaskConical className="w-3.5 h-3.5" /> Lab Tests ({viewPrescription.lab_tests.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {viewPrescription.lab_tests.map((t, i) => (
                            <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100">
                              {typeof t === "string" ? t : t.test_name || t.name || JSON.stringify(t)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up */}
                    {viewPrescription.follow_up && Object.keys(viewPrescription.follow_up).length > 0 && (
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> Follow-up
                        </p>
                        <div className="text-sm text-gray-700 space-y-1">
                          {Object.entries(viewPrescription.follow_up).map(([key, val]) => (
                            val && <p key={key}><span className="text-gray-400 capitalize">{key.replace(/_/g, " ")}:</span> {toDisplayText(val)}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Special Instructions */}
                    {viewPrescription.special_instructions && (
                      <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Special Instructions</p>
                        {typeof viewPrescription.special_instructions === "object" && !Array.isArray(viewPrescription.special_instructions) ? (
                          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                            {Object.entries(viewPrescription.special_instructions).map(([k, v]) => (
                              <li key={k}><span className="font-semibold capitalize">{k.replace(/_/g, " ")}:</span> {toDisplayText(v)}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-700">{toDisplayText(viewPrescription.special_instructions)}</p>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {viewPrescription.notes && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm text-gray-700">{toDisplayText(viewPrescription.notes)}</p>
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-gray-100">
                      <div><p className="text-gray-400">Created</p><p className="text-gray-700">{viewPrescription.created_at ? new Date(viewPrescription.created_at).toLocaleString("en-IN") : "—"}</p></div>
                      <div><p className="text-gray-400">Type</p><p className="text-gray-700 capitalize">{viewPrescription.appointment_type?.replace(/_/g, " ") || "—"}</p></div>
                      <div><p className="text-gray-400">Status</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[viewPrescription.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {viewPrescription.is_draft ? "Draft" : (viewPrescription.status || "active")}
                        </span>
                      </div>
                      {viewPrescription.signed_at && <div><p className="text-gray-400">Signed At</p><p className="text-gray-700">{new Date(viewPrescription.signed_at).toLocaleString("en-IN")}</p></div>}
                      {viewPrescription.completed_at && <div><p className="text-gray-400">Completed</p><p className="text-gray-700">{new Date(viewPrescription.completed_at).toLocaleString("en-IN")}</p></div>}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-gray-100 flex justify-end">
                    <button onClick={() => setViewPrescription(null)}
                      className="px-5 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 text-sm cursor-pointer">Close</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
