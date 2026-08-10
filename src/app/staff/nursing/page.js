"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Heart, Users, Clock, CheckCircle2, AlertTriangle,
  Phone, RefreshCw, Eye, Timer, Shield, BarChart3, ArrowRight
} from "lucide-react";

const STATUS_LABELS = {
  NEW: { label: "New", color: "bg-blue-100 text-[#004F7C]" },
  CONTACTED: { label: "Contacted", color: "bg-yellow-100 text-yellow-700" },
  QUALIFIED: { label: "Qualified", color: "bg-purple-100 text-purple-700" },
  SHARED_WITH_PARTNER: { label: "Shared", color: "bg-indigo-100 text-indigo-700" },
  SERVICE_STARTED: { label: "Service Started", color: "bg-green-100 text-green-700" },
  NOT_CONVERTED: { label: "Not Converted", color: "bg-red-100 text-red-700" },
  CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700" },
};

const SLA_COLORS = {
  green: { bg: "bg-green-100", text: "text-green-700" },
  amber: { bg: "bg-amber-100", text: "text-amber-700" },
  red: { bg: "bg-red-100", text: "text-red-700" },
};

export default function StaffNursingDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [staffUser, setStaffUser] = useState(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("staffUser") || "null");
      setStaffUser(user);
    } catch { /* */ }
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const token = localStorage.getItem("staffToken");
      if (!token) return;
      const res = await fetch("/api/nursing/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setMetrics(data.data);
    } catch { /* */ }
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("staffToken");
      if (!token) { setLoading(false); return; }

      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      // No need to pass assigned_staff_id — the API uses nursing_lead_assignments
      // based on the authenticated staff from the Bearer token
      params.set("page", String(page));
      params.set("limit", "15");

      const res = await fetch(`/api/nursing/leads?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLeads(data.data.leads || []);
        setTotal(data.data.total || 0);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, [statusFilter, search, page]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);
  useEffect(() => { if (staffUser) loadLeads(); }, [loadLeads, staffUser]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); loadLeads(); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#0067A1]" />
            Nursing Care Leads
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage assigned nursing/home care requests</p>
        </div>
        <button
          onClick={() => { loadMetrics(); loadLeads(); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Quick Stats */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Total Leads</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.total_leads}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">SLA Compliance</p>
            <p className={`text-2xl font-bold mt-1 ${metrics.sla_compliance_rate >= 80 ? "text-green-600" : "text-amber-600"}`}>
              {metrics.sla_compliance_rate}%
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">New Leads</p>
            <p className="text-2xl font-bold text-[#0067A1] mt-1">{metrics.status_counts?.NEW || 0}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Qualified</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{metrics.status_counts?.QUALIFIED || 0}</p>
          </motion.div>
        </div>
      )}

      {/* Urgent Leads */}
      {metrics?.urgent_leads?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Awaiting First Call
          </h3>
          <div className="space-y-2">
            {metrics.urgent_leads.slice(0, 5).map((lead) => (
              <div key={lead.id} onClick={() => router.push(`/staff/nursing/${lead.id}`)}
                className="flex items-center justify-between bg-white rounded-lg p-3 cursor-pointer hover:shadow-sm">
                <div>
                  <p className="text-sm font-medium text-gray-800">{lead.name}</p>
                  <p className="text-xs text-gray-500">{lead.lead_id} • {lead.city}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${SLA_COLORS[lead.sla]?.bg} ${SLA_COLORS[lead.sla]?.text}`}>
                  {lead.minutes_since_created}m ago
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {["ALL", ...Object.keys(STATUS_LABELS)].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              statusFilter === s ? "bg-[#0067A1] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {s === "ALL" ? "All" : STATUS_LABELS[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, lead ID..."
            className="w-full md:w-80 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" /> Loading...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No leads found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Lead ID</th>
                  <th className="text-left px-4 py-3 font-medium">Patient</th>
                  <th className="text-left px-4 py-3 font-medium">City</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">SLA</th>
                  <th className="text-left px-4 py-3 font-medium">Intent</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-[#0067A1]">{lead.lead_id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{lead.patient_name || lead.name}</p>
                      <p className="text-xs text-gray-400">{lead.patient_phone || lead.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.city}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${STATUS_LABELS[lead.lead_status]?.color || "bg-gray-100"}`}>
                        {STATUS_LABELS[lead.lead_status]?.label || lead.lead_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${SLA_COLORS[lead.sla]?.bg} ${SLA_COLORS[lead.sla]?.text}`}>
                        <Clock className="w-3 h-3 inline mr-1" />{lead.minutes_since_created}m
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.lead_intent ? (
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                          lead.lead_intent === "HIGH" ? "bg-red-100 text-red-700" :
                          lead.lead_intent === "MEDIUM" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"
                        }`}>{lead.lead_intent}</span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => router.push(`/staff/nursing/${lead.id}`)}
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

        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {Math.ceil(total / 15)}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer">Previous</button>
              <button disabled={page * 15 >= total} onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Compliance Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="font-bold text-amber-700 text-xs mb-2 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Staff Call Boundaries
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-amber-700">
          <span>• No medical advice</span>
          <span>• No provider recommendations</span>
          <span>• No price quotes</span>
          <span>• No outcome promises</span>
          <span>• No payment collection</span>
        </div>
      </div>
    </div>
  );
}
