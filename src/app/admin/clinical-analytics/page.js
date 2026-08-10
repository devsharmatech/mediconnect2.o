"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Activity, ShieldCheck, Heart, Download,
  AlertTriangle, CheckCircle, TrendingUp, Users, Clock, RefreshCw, ShieldAlert, ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";

const COLORS = ["#0067A1", "#10b981", "#f59e0b", "#ef4444"];

function StatCard({ label, value, icon: Icon, color, subtext }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-2xl ${color.bg}`}>
          <Icon className={`w-5 h-5 ${color.icon}`} />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${color.badge}`}>
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

export default function ClinicalAnalyticsPage() {
  const [efficacyData, setEfficacyData] = useState(null);
  const [boardReport, setBoardReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveRisks, setLiveRisks] = useState([]);
  const [risksLoading, setRisksLoading] = useState(true);

  useEffect(() => { fetchData(); fetchLiveRisks(); }, []);

  const fetchLiveRisks = async () => {
    try {
      setRisksLoading(true);
      const res = await fetch("/api/admin/clinical-risk-queue?severity=HIGH&resolved=false&limit=50");
      const data = await res.json();
      if (data.success) setLiveRisks(data.data?.flags || []);
    } catch {
      // non-fatal — analytics page still works without live risks
    } finally {
      setRisksLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [effRes, boardRes] = await Promise.all([
        fetch("/api/admin/analytics/clinical-efficacy"),
        fetch("/api/admin/reports/board-audit"),
      ]);
      const effData = await effRes.json();
      const bData = await boardRes.json();
      if (effData.success) setEfficacyData(effData.data);
      if (bData.success) setBoardReport(bData.data);
    } catch {
      toast.error("Failed to load clinical analytics");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSVReport = () => {
    if (!boardReport) return;
    const headers = ["Consultation ID", "Doctor", "Reason", "Timestamp"];
    const rows = boardReport.safety_audit.override_list.map((o) => [
      o.consultation_id, o.doctor, `"${o.reason}"`, o.timestamp,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `medical_board_audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const severityData = efficacyData
    ? Object.entries(efficacyData.raw_stats.by_initial_severity).map(([name, data]) => ({
        name,
        improvement_rate: data.total > 0 ? Math.round((data.better / data.total) * 100) : 0,
        total: data.total,
      }))
    : [];

  const qualityData = boardReport
    ? [
        { name: "Standard (High/Med)", value: boardReport.quality_audit.total_sessions - boardReport.quality_audit.low_quality_count },
        { name: "Quick Mode (Low)", value: boardReport.quality_audit.low_quality_count },
      ]
    : [];

  const overrides = boardReport?.safety_audit.override_list ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#0067A1] rounded-2xl shadow-xl shadow-[#0067A1]/20">
              <Activity className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Clinical Excellence
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Platform-wide Medical Efficacy &amp; Safety Audit
              </p>
            </div>
          </div>
          <button
            onClick={downloadCSVReport}
            disabled={!boardReport}
            className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm text-sm active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export Board Audit
          </button>
        </div>

        {/* ── Live HIGH Risk Alerts ── */}
        {!risksLoading && liveRisks.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100 rounded-2xl">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-red-900">Live HIGH Risk Alerts</h2>
                  <p className="text-xs text-red-600 font-medium mt-0.5">
                    {liveRisks.length} unresolved flag{liveRisks.length !== 1 ? "s" : ""} — blocking consultation completion
                  </p>
                </div>
              </div>
              <a
                href="/admin/clinical-risks"
                className="flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-900 border border-red-300 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors"
              >
                Resolve All
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveRisks.slice(0, 6).map((flag, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-red-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold uppercase tracking-wide">
                      {flag.flag_type || "HIGH RISK"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {flag.created_at ? new Date(flag.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 line-clamp-2">{flag.description || flag.flag_type}</p>
                  <p className="text-xs text-slate-400 mt-1">Consultation: #{String(flag.consultation_id || "").slice(-8)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Patient Impact"
            value={loading ? "—" : (efficacyData?.efficacy_index || "0%")}
            icon={Heart}
            color={{ bg: "bg-red-50", icon: "text-red-500", badge: "bg-red-100 text-red-600" }}
            subtext="Medical Efficacy Index"
          />
          <StatCard
            label="Legal State"
            value={loading ? "—" : (boardReport?.quality_audit.compliance_rate || "100%")}
            icon={ShieldCheck}
            color={{ bg: "bg-emerald-50", icon: "text-emerald-500", badge: "bg-emerald-100 text-emerald-600" }}
            subtext="Documentation Compliance"
          />
          <StatCard
            label="Audit Alert"
            value={loading ? "—" : (boardReport?.safety_audit.total_high_risk_overrides || 0)}
            icon={AlertTriangle}
            color={{ bg: "bg-amber-50", icon: "text-amber-500", badge: "bg-amber-100 text-amber-600" }}
            subtext="High-Severity Overrides (7d)"
          />
          <StatCard
            label="Sample Size"
            value={loading ? "—" : (efficacyData?.raw_stats.total_outcomes || 0)}
            icon={Users}
            color={{ bg: "bg-indigo-50", icon: "text-indigo-500", badge: "bg-indigo-100 text-indigo-600" }}
            subtext="Feedback Responses"
          />
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0067A1]" />
              Improvement Rate by Initial Severity
            </h3>
            {loading ? (
              <div className="h-[280px] bg-slate-100 rounded-2xl animate-pulse" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis unit="%" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    />
                    <Bar dataKey="improvement_rate" fill="#0067A1" radius={[8, 8, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-4 text-center italic">
              * Correlation between baseline severity and "Better" outcomes after 7 days.
            </p>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Documentation Quality Distribution
            </h3>
            {loading ? (
              <div className="h-[280px] bg-slate-100 rounded-2xl animate-pulse" />
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityData}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={6}
                      dataKey="value"
                    >
                      {qualityData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── Critical Overrides Table (White) ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Section Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-xl border border-red-100">
                <AlertTriangle className="text-red-500 w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Critical Overrides Audit
              </h2>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1.5 border border-slate-200 rounded-full bg-slate-50">
              <Clock className="w-3 h-3" />
              Recent 5
            </span>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Doctor</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Override Reason</th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
                  <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-8 py-4">
                        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : overrides.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center">
                      <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                        No critical overrides in the last 7 days
                      </p>
                    </td>
                  </tr>
                ) : (
                  overrides.slice(0, 5).map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 text-slate-500" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">Dr. {log.doctor}</p>
                        </div>
                      </td>
                      <td className="px-4 py-5 max-w-sm">
                        <p className="text-sm text-slate-500 italic line-clamp-2 leading-relaxed">
                          "{log.reason}"
                        </p>
                      </td>
                      <td className="px-4 py-5 whitespace-nowrap">
                        <p className="text-sm text-slate-700 font-medium">
                          {new Date(log.timestamp).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(log.timestamp).toLocaleTimeString("en-IN", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                          Awaiting Review
                        </span>
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
            ) : overrides.length === 0 ? (
              <div className="py-16 text-center">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No critical overrides</p>
              </div>
            ) : (
              overrides.slice(0, 5).map((log, idx) => (
                <div key={idx} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-slate-800">Dr. {log.doctor}</p>
                    <p className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</p>
                  </div>
                  <p className="text-xs text-slate-500 italic line-clamp-2 leading-relaxed mb-3">"{log.reason}"</p>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                    Awaiting Review
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
