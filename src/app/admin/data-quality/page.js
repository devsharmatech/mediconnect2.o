"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle,
  AlertCircle,
  Pill,
  RefreshCw,
  TrendingDown,
  Database,
  ClipboardList,
  ArrowUpCircle,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { toast } from "react-hot-toast";

/* ── helpers ── */
function StatCard({ label, value, icon: Icon, color, subtext }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-2xl ${color.bg}`}>
          <Icon className={`w-5 h-5 ${color.icon}`} />
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${color.badge}`}
        >
          {label}
        </span>
      </div>
      <div>
        <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
        {subtext && (
          <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-widest">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

function SkeletonRow({ cols = 4 }) {
  return (
    <tr>
      <td colSpan={cols} className="px-8 py-4">
        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
      </td>
    </tr>
  );
}

function MobileSkeletonCard() {
  return (
    <div className="p-5">
      <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
        <ShieldCheck className="w-8 h-8 text-emerald-500" />
      </div>
      <p className="text-slate-700 font-bold text-sm uppercase tracking-widest">
        All Clear
      </p>
      <p className="text-slate-400 text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}

/* ── main component ── */
export default function DataQualityQueuePage() {
  const [qualityFlags, setQualityFlags] = useState([]);
  const [unstructuredMeds, setUnstructuredMeds] = useState([]);
  const [summary, setSummary] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("flags"); // 'flags' | 'meds'
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchQueue();
  }, [activeTab]);

  const fetchQueue = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const typeParam =
        activeTab === "flags" ? "quality_flag" : "unstructured_med";
      const res = await fetch(
        `/api/admin/data-quality-queue?type=${typeParam}&status=pending&limit=50`
      );
      const data = await res.json();

      if (data.success) {
        if (activeTab === "flags") {
          setQualityFlags(data.data.quality_flags || []);
        } else {
          setUnstructuredMeds(data.data.unstructured_meds || []);
        }
        if (data.data.pagination)
          setSummary({ total: data.data.pagination.total });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data quality queue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleResolveMed = async (medId) => {
    if (!window.confirm("Mark this unstructured medication as reviewed/resolved?")) return;
    setActionLoading(medId);
    try {
      const adminId =
        localStorage.getItem("userId") || localStorage.getItem("adminId");
      const res = await fetch("/api/admin/data-quality-queue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: medId,
          table: "data_quality_queue",
          action: "resolve",
          resolved_by: adminId || "system-admin",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Medication issue resolved");
      fetchQueue();
    } catch (err) {
      toast.error(err.message || "Failed to resolve issue");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpgradeFlag = async (consultId) => {
    if (!window.confirm("Upgrade this consultation quality flag from LOW to MEDIUM?")) return;
    setActionLoading(consultId);
    try {
      const adminId =
        localStorage.getItem("userId") || localStorage.getItem("adminId");
      const res = await fetch("/api/admin/data-quality-queue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: consultId,
          table: "consultation_quality_flag",
          action: "upgrade",
          resolved_by: adminId || "system-admin",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Consultation quality flag upgraded to MEDIUM");
      fetchQueue();
    } catch (err) {
      toast.error(err.message || "Failed to edit flag");
    } finally {
      setActionLoading(null);
    }
  };

  const currentItems =
    activeTab === "flags" ? qualityFlags : unstructuredMeds;
  const isEmpty = !loading && currentItems.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#0067A1] rounded-2xl shadow-xl shadow-[#0067A1]/20">
              <Database className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Data Quality Dashboard
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Identify and correct poor clinical documentation &amp; unstructured medical data
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchQueue(true)}
            disabled={refreshing}
            className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm text-sm active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            label="Pending Issues"
            value={summary.total ?? 0}
            icon={AlertCircle}
            color={{
              bg: "bg-red-50",
              icon: "text-red-500",
              badge: "bg-red-100 text-red-600",
            }}
            subtext="In Current Queue"
          />
          <StatCard
            label="Low Quality"
            value={qualityFlags.length}
            icon={TrendingDown}
            color={{
              bg: "bg-amber-50",
              icon: "text-amber-500",
              badge: "bg-amber-100 text-amber-600",
            }}
            subtext="Consultations Flagged"
          />
          <StatCard
            label="Unstructured"
            value={unstructuredMeds.length}
            icon={Pill}
            color={{
              bg: "bg-[#0067A1]/10",
              icon: "text-[#0067A1]",
              badge: "bg-[#0067A1]/10 text-[#0067A1]",
            }}
            subtext="Medication Entries"
          />
        </div>

        {/* ── Tab Switcher ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-slate-100 rounded-2xl p-1 gap-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("flags")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  activeTab === "flags"
                    ? "bg-white text-[#0067A1] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                Low Quality Consults
              </button>
              <button
                onClick={() => setActiveTab("meds")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  activeTab === "meds"
                    ? "bg-white text-[#0067A1] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Pill className="w-4 h-4" />
                Unstructured Data
              </button>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <Activity className="w-3.5 h-3.5" />
              {summary.total} pending in queue
            </span>
          </div>
        </div>

        {/* ── White Queue Table ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Table Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${
                activeTab === "flags"
                  ? "bg-amber-50 border-amber-100"
                  : "bg-emerald-50 border-emerald-100"
              }`}>
                {activeTab === "flags" ? (
                  <ClipboardList className="w-4 h-4 text-amber-500" />
                ) : (
                  <Pill className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {activeTab === "flags"
                  ? "Low Quality Consultations"
                  : "Unstructured Medications Log"}
              </h2>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1.5 border border-slate-200 rounded-full bg-slate-50">
              <Clock className="w-3 h-3" />
              Live
            </span>
          </div>

          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reference ID</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {activeTab === "flags" ? "Quality Level" : "Issue Type"}
                  </th>
                  <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                ) : isEmpty ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        message={
                          activeTab === "flags"
                            ? "No low-quality consultations pending review."
                            : "No unstructured medication entries pending resolution."
                        }
                      />
                    </td>
                  </tr>
                ) : activeTab === "flags" ? (
                  qualityFlags.map((flag) => (
                    <tr key={flag.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <p className="text-sm font-bold text-slate-800">
                          {new Date(flag.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(flag.created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-5">
                        <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {flag.consultation_id?.substring(0, 12)}...
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {flag.quality_level} QUALITY
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => handleUpgradeFlag(flag.consultation_id)}
                          disabled={actionLoading === flag.consultation_id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0067A1] text-white font-bold text-xs rounded-xl hover:bg-[#0080C6] transition-all active:scale-95 shadow-sm shadow-[#0067A1]/30 disabled:opacity-50"
                        >
                          {actionLoading === flag.consultation_id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                          )}
                          Mark Adjusted
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  unstructuredMeds.map((med) => (
                    <tr key={med.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <p className="text-sm font-bold text-slate-800">
                          {new Date(med.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(med.created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-5">
                        <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {med.consultation_id?.substring(0, 12)}...
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <p className="text-sm font-semibold text-slate-800">{med.issue_type}</p>
                        {med.status === "pending" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 mt-1.5">
                            Review Required
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => handleResolveMed(med.id)}
                          disabled={actionLoading === med.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-sm shadow-emerald-900/40 disabled:opacity-50"
                        >
                          {actionLoading === med.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          Resolve Issue
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              [...Array(3)].map((_, i) => <MobileSkeletonCard key={i} />)
            ) : isEmpty ? (
              <EmptyState
                message={
                  activeTab === "flags"
                    ? "No low-quality consultations pending review."
                    : "No unstructured medication entries pending."
                }
              />
            ) : activeTab === "flags" ? (
              qualityFlags.map((flag) => (
                <div key={flag.id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {flag.quality_level} QUALITY
                    </span>
                    <p className="text-xs text-slate-400">
                      {new Date(flag.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-mono text-slate-500 mb-4">
                    Consult: {flag.consultation_id?.substring(0, 16)}...
                  </p>
                  <button
                    onClick={() => handleUpgradeFlag(flag.consultation_id)}
                    disabled={actionLoading === flag.consultation_id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0067A1] text-white font-bold text-xs rounded-xl hover:bg-[#0080C6] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {actionLoading === flag.consultation_id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                    )}
                    Mark as Adjusted
                  </button>
                </div>
              ))
            ) : (
              unstructuredMeds.map((med) => (
                <div key={med.id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-slate-800">{med.issue_type}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(med.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-xs font-mono text-slate-500">
                      Consult: {med.consultation_id?.substring(0, 16)}...
                    </p>
                    {med.status === "pending" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        Pending
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleResolveMed(med.id)}
                    disabled={actionLoading === med.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {actionLoading === med.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Resolve Issue
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
