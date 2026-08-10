"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Eye,
  X,
  Clock,
  Filter,
  RefreshCw,
  TrendingUp,
  Activity,
  Shield,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-hot-toast";

const SEVERITY_CONFIG = {
  HIGH: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    dot: "bg-red-400",
    badge: "bg-red-100 text-red-700",
  },
  MEDIUM: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
  },
  LOW: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
    badge: "bg-blue-100 text-[#004F7C]",
  },
};

function StatCard({ label, value, icon: Icon, color, subtext }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl ${color.bg}`}>
          <Icon className={`w-5 h-5 ${color.icon}`} />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${color.badge}`}>
          {label}
        </span>
      </div>
      <div>
        <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
        {subtext && <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-widest">{subtext}</p>}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.LOW;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {severity}
    </span>
  );
}

function StatusPill({ resolved }) {
  if (resolved) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700">
        <CheckCircle className="w-3 h-3" />
        Resolved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700">
      <AlertTriangle className="w-3 h-3" />
      Pending
    </span>
  );
}

export default function ClinicalRiskQueuePage() {
  const [flags, setFlags] = useState([]);
  const [summary, setSummary] = useState({ total: 0, unresolved: 0, high: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("unresolved");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);

  // Resolution Modal State
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState("RESOLVED_SAFE");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const RESOLUTION_OPTIONS = [
    { value: "RESOLVED_SAFE", label: "Mark as Safe / Normal", icon: CheckCircle, color: "text-emerald-500 bg-emerald-50" },
    { value: "REQUIRES_FOLLOWUP", label: "Require Follow-up Interview", icon: RefreshCw, color: "text-blue-500 bg-blue-50" },
    { value: "ESCALATED", label: "Escalate to Medical Board", icon: ShieldAlert, color: "text-red-500 bg-red-50" },
  ];

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, severityFilter]);

  const fetchQueue = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      let url = "/api/admin/clinical-risk-queue?limit=50";
      if (statusFilter === "unresolved") url += "&resolved=false";
      else if (statusFilter === "resolved") url += "&resolved=true";
      if (severityFilter !== "ALL") url += `&severity=${severityFilter}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setFlags(data.data.flags || []);
        if (data.data.summary) setSummary(data.data.summary);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load clinical risk queue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleResolveClick = (flag) => {
    setSelectedFlag(flag);
    setResolutionStatus("RESOLVED_SAFE");
    setResolutionNotes("");
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const submitResolution = async () => {
    if (!selectedFlag) return;
    try {
      setUpdating(true);
      const adminId =
        localStorage.getItem("userId") || localStorage.getItem("adminId");

      const res = await fetch("/api/admin/clinical-risk-queue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flag_id: selectedFlag.id,
          resolution_status: resolutionStatus,
          reviewed_by: adminId || "system-admin",
          notes: resolutionNotes,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(`Risk flag marked as ${resolutionStatus}`);
      setIsModalOpen(false);
      fetchQueue();
    } catch (err) {
      toast.error(err.message || "Failed to update risk flag");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#0067A1] rounded-2xl shadow-xl shadow-[#0067A1]/20">
              <ShieldAlert className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Clinical Risk Arbitration
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Review and resolve safety flags triggered during consultations
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchQueue(true)}
            disabled={refreshing}
            className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm text-sm active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            label="Unresolved"
            value={summary.unresolved ?? 0}
            icon={AlertTriangle}
            color={{ bg: "bg-red-50", icon: "text-red-500", badge: "bg-red-100 text-red-600" }}
            subtext="Require Action"
          />
          <StatCard
            label="High Severity"
            value={summary.high ?? 0}
            icon={TrendingUp}
            color={{ bg: "bg-orange-50", icon: "text-orange-500", badge: "bg-orange-100 text-orange-600" }}
            subtext="Critical Flags"
          />
          <StatCard
            label="Total Flags"
            value={summary.total ?? 0}
            icon={Activity}
            color={{ bg: "bg-[#0067A1]/10", icon: "text-[#0067A1]", badge: "bg-[#0067A1]/10 text-[#0067A1]" }}
            subtext="All Time"
          />
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex items-center gap-2 shrink-0 mb-1">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filters</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {/* Status Filter */}
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 appearance-none cursor-pointer"
                  >
                    <option value="unresolved">Unresolved</option>
                    <option value="resolved">Resolved</option>
                    <option value="all">All Flags</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Severity Filter */}
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Severity
                </label>
                <div className="relative">
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Risk Flags Table ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-xl border border-red-100">
                <Shield className="text-red-500 w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Risk Flag Queue</h2>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 border border-slate-200 rounded bg-slate-50">
              <Clock className="w-3 h-3" />
              Live
            </span>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk Detail</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Override Reason</th>
                  <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-8 py-4">
                        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : flags.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No flags match your filters</p>
                    </td>
                  </tr>
                ) : (
                  flags.map((flag) => (
                    <tr
                      key={flag.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
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
                        <StatusPill resolved={flag.resolved} />
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-col gap-1.5">
                          <SeverityBadge severity={flag.severity} />
                          <p className="text-sm font-semibold text-slate-800">{flag.risk_type}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {flag.consultation_id?.slice(0, 12)}...
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-5 max-w-xs">
                        <p className="text-sm text-slate-500 italic line-clamp-2 leading-relaxed">
                          "{flag.consultations?.override_reason || "No explicit reason provided"}"
                        </p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {!flag.resolved ? (
                          <button
                            onClick={() => handleResolveClick(flag)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0067A1] text-white font-bold text-sm rounded-lg hover:bg-[#0080C6] transition-all active:scale-95 shadow-md shadow-[#0067A1]/10"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <CheckCircle className="w-3 h-3" />
                            {flag.resolution_status?.replace(/_/g, " ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
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
            ) : flags.length === 0 ? (
              <div className="py-16 text-center">
                <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No flags match your filters</p>
              </div>
            ) : (
              flags.map((flag) => (
                <div key={flag.id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={flag.severity} />
                      <StatusPill resolved={flag.resolved} />
                    </div>
                    <p className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                      {new Date(flag.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-1">{flag.risk_type}</p>
                  <p className="text-xs font-mono text-slate-400 mb-2">
                    {flag.consultation_id?.slice(0, 16)}...
                  </p>
                  <p className="text-xs text-slate-500 italic line-clamp-2 leading-relaxed mb-4">
                    "{flag.consultations?.override_reason || "No explicit reason provided"}"
                  </p>
                  {!flag.resolved ? (
                    <button
                      onClick={() => handleResolveClick(flag)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0067A1] text-white font-bold text-sm rounded-lg hover:bg-[#0080C6] active:scale-95 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Review Flag
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {flag.resolution_status?.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Resolution Modal ── */}
      {isModalOpen && selectedFlag && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Resolve Risk Flag</h3>
                  <p className="text-xs text-slate-400">Admin arbitration required</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Risk Summary Card */}
              <div className={`rounded-xl p-4 border ${
                selectedFlag.severity === "HIGH"
                  ? "bg-red-50 border-red-100"
                  : selectedFlag.severity === "MEDIUM"
                  ? "bg-amber-50 border-amber-100"
                  : "bg-blue-50 border-blue-100"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <SeverityBadge severity={selectedFlag.severity} />
                  <span className="text-sm font-bold text-slate-800">{selectedFlag.risk_type}</span>
                </div>
                {selectedFlag.consultations?.override_reason && (
                  <p className="text-xs text-slate-600 italic leading-relaxed">
                    "{selectedFlag.consultations.override_reason}"
                  </p>
                )}
                <p className="text-[11px] font-mono text-slate-400 mt-2">
                  Consultation: {selectedFlag.consultation_id?.slice(0, 20)}...
                </p>
              </div>

              {/* Resolution Action */}
              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Resolution Action
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 transition-all text-left"
                  >
                    <span className="flex items-center gap-2">
                      {React.createElement(
                        RESOLUTION_OPTIONS.find(o => o.value === resolutionStatus)?.icon || ShieldAlert,
                        { className: `w-4 h-4 ${RESOLUTION_OPTIONS.find(o => o.value === resolutionStatus)?.color.split(" ")[0]}` }
                      )}
                      {RESOLUTION_OPTIONS.find(o => o.value === resolutionStatus)?.label}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden py-1">
                      {RESOLUTION_OPTIONS.map((opt) => {
                        const OptIcon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setResolutionStatus(opt.value);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-left font-semibold transition-colors hover:bg-slate-50 ${
                              resolutionStatus === opt.value
                                ? "bg-[#0067A1]/5 text-[#0067A1]"
                                : "text-slate-700"
                            }`}
                          >
                            <span className={`p-1 rounded-md ${opt.color}`}>
                              <OptIcon className="w-4 h-4" />
                            </span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Admin Notes{" "}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe the reason for your decision..."
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 resize-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitResolution}
                disabled={updating}
                className="px-6 py-2.5 bg-[#0067A1] text-white text-sm font-bold rounded-lg hover:bg-[#0080C6] transition-all active:scale-95 disabled:opacity-60 shadow-md shadow-[#0067A1]/10 flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Confirm Resolution
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
