"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity, Users, Clock, CheckCircle2, AlertTriangle,
  Phone, TrendingUp, Shield, RefreshCw, ArrowRight,
  Eye, ChevronDown, BarChart3, Timer, Heart
} from "lucide-react";

const STATUS_LABELS = {
  NEW: { label: "New", color: "bg-blue-100 text-[#004F7C]", dot: "bg-blue-500" },
  CONTACTED: { label: "Contacted", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  QUALIFIED: { label: "Qualified", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  SHARED_WITH_PARTNER: { label: "Shared", color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  SERVICE_STARTED: { label: "Service Started", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  NOT_CONVERTED: { label: "Not Converted", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700", dot: "bg-gray-500" },
};

const SLA_COLORS = {
  green: { bg: "bg-green-100", text: "text-green-700", label: "< 60 min" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", label: "60-120 min" },
  red: { bg: "bg-red-100", text: "text-red-700", label: "> 120 min" },
};

const formatRelativeTime = (minutes) => {
  if (!minutes && minutes !== 0) return "—";
  const mins = Number(minutes);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "hr" : "hrs"} ago`;
  const days = Math.round(mins / 1440);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
};

const formatCompactDuration = (minutes) => {
  if (!minutes && minutes !== 0) return "—";
  const mins = Number(minutes);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(mins / 1440);
  return `${days}d`;
};

export default function AdminNursingDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/nursing/metrics");
      const data = await res.json();
      if (data.success) setMetrics(data.data);
    } catch (err) {
      console.error("Failed to load metrics", err);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "15");

      const res = await fetch(`/api/nursing/leads?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data.leads || []);
        setTotal(data.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load leads", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadLeads();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const funnelPercent = (val, total) => (total > 0 ? Math.round((val / total) * 100) : 0);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Heart className="w-7 h-7 text-[#0067A1]" />
            Nursing Care Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track nursing/home care requests</p>
        </div>
        <button
          onClick={() => { loadMetrics(); loadLeads(); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ─── Metric Cards ────────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Leads</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.total_leads}</p>
              </div>
              <div className="w-10 h-10 bg-[#0067A1]/10 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-[#0067A1]" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">SLA Compliance</p>
                <p className={`text-2xl font-bold mt-1 ${metrics.sla_compliance_rate >= 80 ? "text-green-600" : metrics.sla_compliance_rate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {metrics.sla_compliance_rate}%
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Timer className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Median Time to Call</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.median_time_to_call} min</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Phone className="w-5 h-5 text-[#0067A1]" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Consent Integrity</p>
                <p className={`text-2xl font-bold mt-1 ${metrics.consent_integrity?.missing === 0 ? "text-green-600" : "text-red-600"}`}>
                  {metrics.consent_integrity?.missing === 0 ? "✓ Clean" : `${metrics.consent_integrity?.missing} Missing`}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── Conversion Funnel ────────────────────────────── */}
      {metrics && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0067A1]" />
            Conversion Funnel
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: "New", value: metrics.total_leads, color: "bg-blue-500" },
              { label: "Contacted", value: metrics.funnel?.contacted || 0, color: "bg-yellow-500" },
              { label: "Qualified", value: metrics.funnel?.qualified || 0, color: "bg-purple-500" },
              { label: "Service Started", value: metrics.funnel?.service_started || 0, color: "bg-green-500" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">{step.value}</p>
                  <div className={`h-2 rounded-full ${step.color} mt-1`} style={{ width: `${Math.max(funnelPercent(step.value, metrics.total_leads), 10)}px`, minWidth: 40 }} />
                  <p className="text-xs text-gray-500 mt-1">{step.label}</p>
                </div>
                {i < 3 && <ArrowRight className="w-5 h-5 text-gray-300 mx-1" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Urgent Leads (SLA) ───────────────────────────── */}
      {metrics?.urgent_leads?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            NEW Leads Awaiting First Call
          </h3>
          <div className="space-y-2">
            {metrics.urgent_leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => router.push(`/admin/nursing/${lead.id}`)}
                className="flex items-center justify-between bg-white rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${SLA_COLORS[lead.sla]?.bg || "bg-gray-300"}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{lead.name}</p>
                    <p className="text-xs text-gray-500">{lead.lead_id} • {lead.city}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${SLA_COLORS[lead.sla]?.bg} ${SLA_COLORS[lead.sla]?.text}`}>
                  {formatRelativeTime(lead.minutes_since_created)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Status Filter Tabs ──────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {["ALL", ...Object.keys(STATUS_LABELS)].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              statusFilter === s
                ? "bg-[#0067A1] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s === "ALL" ? "All" : STATUS_LABELS[s]?.label || s}
            {metrics && s !== "ALL" && (
              <span className="ml-1 opacity-70">({metrics.status_counts?.[s] || 0})</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Search + Leads Table ─────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, lead ID, or city..."
            className="w-full md:w-80 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
            Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No leads found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Lead ID</th>
                  <th className="text-left px-4 py-3 font-medium">Patient</th>
                  <th className="text-left px-4 py-3 font-medium">City</th>
                  <th className="text-left px-4 py-3 font-medium">Care Types</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">SLA</th>
                  <th className="text-left px-4 py-3 font-medium">Intent</th>
                  <th className="text-left px-4 py-3 font-medium">Assigned</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#0067A1]">{lead.lead_id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{lead.patient_name || lead.name}</p>
                      <p className="text-xs text-gray-400">{lead.patient_phone || lead.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.city}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(lead.care_types || []).slice(0, 2).map((ct, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {ct.split(" ").slice(0, 2).join(" ")}
                          </span>
                        ))}
                        {(lead.care_types || []).length > 2 && (
                          <span className="text-xs text-gray-400">+{lead.care_types.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${STATUS_LABELS[lead.lead_status]?.color || "bg-gray-100 text-gray-700"}`}>
                        {STATUS_LABELS[lead.lead_status]?.label || lead.lead_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${SLA_COLORS[lead.sla]?.bg} ${SLA_COLORS[lead.sla]?.text}`}>
                        <Clock className="w-3 h-3" />
                        {formatCompactDuration(lead.minutes_since_created)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.lead_intent ? (
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                          lead.lead_intent === "HIGH" ? "bg-red-100 text-red-700" :
                          lead.lead_intent === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {lead.lead_intent}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {lead.staffs?.full_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/nursing/${lead.id}`)}
                        className="p-2 bg-[#0067A1]/10 text-[#0067A1] rounded-lg hover:bg-[#0067A1]/20 transition-colors cursor-pointer"
                        title="View Lead"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page * 15 >= total}
                onClick={() => setPage(page + 1)}
                className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Partner Stats ────────────────────────────────── */}
      {metrics && Object.keys(metrics.partner_stats || {}).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Partner-wise Conversion</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(metrics.partner_stats).map(([name, stats]) => (
              <div key={name} className="p-4 bg-gray-50 rounded-xl">
                <p className="font-medium text-gray-800">{name}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-xs text-gray-500">Shared</p>
                    <p className="text-lg font-bold text-gray-800">{stats.shared}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                  <div>
                    <p className="text-xs text-gray-500">Converted</p>
                    <p className="text-lg font-bold text-green-600">{stats.converted}</p>
                  </div>
                  <div className="ml-auto">
                    <p className="text-xs text-gray-500">Rate</p>
                    <p className="text-lg font-bold text-[#0067A1]">
                      {stats.shared > 0 ? Math.round((stats.converted / stats.shared) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
