"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Calendar,
  FileOutput,
  Trash2,
  ShieldOff,
  ChevronRight,
  ChevronLeft,
  Clock,
  Lock,
  RefreshCw,
  Eye,
  Info,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

const ACTION_CONFIG = {
  export: {
    icon: FileOutput,
    label: "Data Export Requested",
    bg: "bg-blue-50",
    iconColor: "text-[#0067A1]",
    badge: "bg-blue-100 text-[#004F7C]",
  },
  withdraw: {
    icon: ShieldOff,
    label: "Consent Withdrawn",
    bg: "bg-red-50",
    iconColor: "text-red-600",
    badge: "bg-red-100 text-red-700",
  },
  anonymize: {
    icon: Trash2,
    label: "Records Anonymized",
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
  },
  default: {
    icon: ShieldCheck,
    label: "Compliance Event",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
  },
};

function getConfig(type) {
  const t = type?.toLowerCase() || "";
  if (t.includes("export")) return ACTION_CONFIG.export;
  if (t.includes("withdraw")) return ACTION_CONFIG.withdraw;
  if (t.includes("anonymize")) return ACTION_CONFIG.anonymize;
  return ACTION_CONFIG.default;
}

const formatPatientUnId = (unId) => {
  if (!unId && unId !== 0) return "N/A";
  const clean = String(unId).replace(/\D/g, "");
  return `PAT-${clean.padStart(4, "0")}`;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const LIMIT = 15;

  const fetchLogs = async (p) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/audit-logs?page=${p}&limit=${LIMIT}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setLogs(data.data.logs);
      setTotal(data.data.pagination.total);
    } catch (err) {
      toast.error(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#0067A1] rounded-2xl shadow-xl shadow-[#0067A1]/20">
              <ShieldCheck className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Privacy Audit Logs
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                DPDP Compliance &amp; Patient Data Access History
              </p>
            </div>
          </div>
          <div className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Live Audit Trail</span>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: "Total Events", value: total, icon: ShieldCheck, color: { bg: "bg-[#0067A1]/10", icon: "text-[#0067A1]", badge: "bg-[#0067A1]/10 text-[#0067A1]" } },
            { label: "Current Page", value: `${page} / ${totalPages || 1}`, icon: Calendar, color: { bg: "bg-blue-50", icon: "text-blue-500", badge: "bg-blue-100 text-[#0067A1]" } },
            { label: "Per Page", value: LIMIT, icon: Lock, color: { bg: "bg-slate-100", icon: "text-slate-500", badge: "bg-slate-200 text-slate-600" } },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${color.bg}`}>
                  <Icon className={`w-5 h-5 ${color.icon}`} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${color.badge}`}>
                  {label}
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Audit Table ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Table Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                <ShieldCheck className="text-emerald-600 w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Compliance Events</h2>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 border border-slate-200 rounded bg-slate-50">
              <Clock className="w-3 h-3" />
              Immutable
            </span>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Event Type</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient / User</th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-8 py-4">
                        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No audit events recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const cfg = getConfig(log.action_type);
                    const IconComp = cfg.icon;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <p className="text-sm font-bold text-slate-800">
                            {new Date(log.created_at).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(log.created_at).toLocaleTimeString("en-IN", {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${cfg.bg} border border-slate-100`}>
                              <IconComp className={`w-4 h-4 ${cfg.iconColor}`} />
                            </div>
                            <span className="text-sm font-bold text-slate-800 tracking-tight">
                              {cfg.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-sm font-bold text-slate-800">
                            {log.patient?.full_name || "Unknown Patient"}
                          </p>
                          <p className="text-[11px] text-slate-500 font-semibold font-mono mt-0.5">
                            {log.patient?.un_id ? formatPatientUnId(log.patient.un_id) : "System / NA"}
                          </p>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verified Legal
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#0067A1] hover:bg-[#0080C6] text-white font-bold text-xs rounded transition-all active:scale-95 shadow-md shadow-[#0067A1]/10"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-5">
                  <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
                </div>
              ))
            ) : logs.length === 0 ? (
              <div className="py-16 text-center">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No audit events yet</p>
              </div>
            ) : (
              logs.map((log) => {
                const cfg = getConfig(log.action_type);
                const IconComp = cfg.icon;
                return (
                  <div key={log.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                          <IconComp className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                        </div>
                        <span className="text-sm font-bold text-slate-800">{cfg.label}</span>
                      </div>
                      <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">{log.patient?.full_name || "Unknown Patient"}</p>
                    <p className="text-xs font-mono text-slate-500 font-semibold mb-3">
                      {log.patient?.un_id ? formatPatientUnId(log.patient.un_id) : "System / NA"}
                    </p>
                    <div className="flex items-center justify-between gap-4 mt-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Legal
                      </span>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-[#0067A1] text-white text-xs font-bold rounded hover:bg-[#0080C6] active:scale-95 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <div className="px-6 sm:px-8 py-5 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Page {page} of {totalPages || 1} &bull; {total} total events
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Compliance Info Card ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#0067A1]/10 rounded-xl shrink-0">
              <Lock className="text-[#0067A1] w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1 tracking-tight">Immutable Compliance Ledger</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                These logs fulfill legal requirements under medical privacy laws (GDPR / DPDP Act 2023).
                Every data access event is permanently recorded to provide an auditable clinical chain of custody.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ── Details Modal ── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedLog(null)}
          />
          <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Compliance Event Details</h3>
                  <p className="text-xs text-slate-400">DPDP Verification Trail</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Event Meta summary */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event ID</p>
                  <p className="text-xs font-mono text-slate-800 break-all select-all mt-0.5">{selectedLog.id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timestamp</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {new Date(selectedLog.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Scope Card */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event Scope</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500 font-medium">Action Key</span>
                    <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {selectedLog.action_type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500 font-medium">Performed By (User)</span>
                    <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded select-all max-w-[200px] truncate" title={selectedLog.requested_by}>
                      {selectedLog.requested_by || "System / Automated"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500 font-medium">IP Address</span>
                    <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded">
                      {selectedLog.ip_address || "Not Recorded"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500 font-medium">Legal Verification</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Compliance
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient Details (If exists) */}
              {selectedLog.patient_id ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject Patient Details</h4>
                  <div className="p-4 bg-[#0067A1]/5 border border-[#0067A1]/10 rounded-xl space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Name</span>
                      <span className="font-bold text-[#0067A1]">
                        {selectedLog.patient?.full_name || "Unknown Patient"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Email</span>
                      <span className="font-semibold text-slate-700 select-all">
                        {selectedLog.patient?.email || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Patient Code</span>
                      <span className="font-mono text-xs text-slate-600 select-all truncate max-w-[200px]" title={selectedLog.patient?.un_id ? formatPatientUnId(selectedLog.patient.un_id) : "N/A"}>
                        {selectedLog.patient?.un_id ? formatPatientUnId(selectedLog.patient.un_id) : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject Patient Details</h4>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-center">
                    <p className="text-xs text-slate-400 font-medium italic">
                      No specific single patient subject (System-wide event)
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata Details (If exists) */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Parameters (Metadata)</h4>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-[11px] text-slate-300 overflow-x-auto space-y-1">
                    {Object.entries(selectedLog.metadata).map(([key, val]) => (
                      <div key={key} className="flex gap-2 py-0.5">
                        <span className="text-amber-400 font-bold shrink-0">{key}:</span>
                        <span className="text-emerald-400 break-all select-all">
                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#0067A1] hover:bg-[#0080C6] text-white font-bold text-sm rounded-lg transition-all active:scale-95 shadow-md shadow-[#0067A1]/10 flex items-center justify-center gap-2"
              >
                Close Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
