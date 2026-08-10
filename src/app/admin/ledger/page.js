"use client";

import React, { useState, useEffect } from "react";
import {
  IndianRupee,
  Calendar,
  Filter,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  FileText,
} from "lucide-react";
import { toast } from "react-hot-toast";

const SERVICE_CONFIG = {
  consultation: { label: "Consultation", color: "bg-blue-100 text-[#004F7C]" },
  pharmacy: { label: "Pharmacy", color: "bg-emerald-100 text-emerald-700" },
  lab: { label: "Lab Test", color: "bg-purple-100 text-purple-700" },
  prescription: { label: "Prescription", color: "bg-orange-100 text-orange-700" },
  default: { label: "General", color: "bg-slate-100 text-slate-700" },
};

export default function FinancialLedgerPage() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ total_count: 0, total_revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [serviceType, setServiceType] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [chemistFilter, setChemistFilter] = useState("");
  const LIMIT = 15;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("userId") || localStorage.getItem("adminId"))
        : "";

      const res = await fetch("/api/admin/financial-ledger/export", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify({
          service_type: serviceType || undefined,
          format: "csv",
          admin_id: token || "admin-system",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financial_ledger_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Ledger exported as CSV successfully!");
    } catch (err) {
      toast.error("Export Error: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const fetchLedger = async (p) => {
    try {
      setLoading(true);
      let url = `/api/admin/financial-ledger?page=${p}&limit=${LIMIT}`;
      if (serviceType) url += `&service_type=${serviceType}`;
      if (dateFilter) url += `&date_filter=${dateFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (chemistFilter) url += `&chemist_name=${encodeURIComponent(chemistFilter)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setLogs(data.data.logs);
      setSummary(data.data.summary);
      setTotalPages(Math.ceil(data.data.pagination.total / LIMIT));
    } catch (err) {
      toast.error(err.message || "Failed to load financial ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger(page);
  }, [page, serviceType, dateFilter, searchQuery, chemistFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#0067A1] rounded-xl shadow-xl shadow-[#0067A1]/20">
              <IndianRupee className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Anti-Loss Ledger
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Immutable financial transaction log and revenue integrity audit
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-all text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isExporting ? "Exporting..." : "Export"}
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full shadow-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Audit Active</span>
            </div>
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: "Gross Revenue", value: `₹${summary.total_revenue?.toLocaleString()}`, icon: IndianRupee, color: "bg-[#0067A1]/10 text-[#0067A1]" },
            { label: "Total Entries", value: summary.total_count, icon: FileText, color: "bg-blue-50 text-[#0067A1]" },
            { label: "Ledger Status", value: "Syncing", icon: ShieldCheck, color: "bg-emerald-50 text-emerald-600" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-lg ${stat.color.split(" ")[0]}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color.split(" ")[1]}`} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Real-time</span>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table Container ── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          
          {/* Filters Bar */}
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 bg-slate-50/50">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              {["", "consultation", "pharmacy", "lab"].map((type) => (
                <button
                  key={type}
                  onClick={() => setServiceType(type)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    serviceType === type 
                      ? "bg-[#0067A1] text-white shadow-sm shadow-[#0067A1]/20" 
                      : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {type ? type.toUpperCase() : "ALL TRANSACTIONS"}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select 
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 outline-none focus:ring-2 focus:ring-[#0067A1]/20 cursor-pointer"
              >
                <option value="">All Time</option>
                <option value="days">Last 24 Hours</option>
                <option value="weeks">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
              {serviceType === "pharmacy" && (
                <div className="relative group w-full sm:w-auto">
                  <input 
                    type="text" 
                    value={chemistFilter}
                    onChange={(e) => { setChemistFilter(e.target.value); setPage(1); }}
                    placeholder="Filter by Chemist..."
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0067A1]/20 w-full sm:w-48"
                  />
                </div>
              )}
              <div className="relative group w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0067A1] transition-colors" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  placeholder="Search TxID, Patient, or Tx details..."
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0067A1]/20 w-full sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left">
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Date</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provider / Vendor</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Module</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Flow</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-8 py-4"><div className="h-12 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest">No entries found</td></tr>
                ) : (
                  logs.map((log) => {
                    const svc = SERVICE_CONFIG[log.service_type] || SERVICE_CONFIG.default;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-800">{new Date(log.created_at).toLocaleDateString('en-IN')}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(log.created_at).toLocaleTimeString('en-IN')}</p>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-sm font-bold text-slate-800">{log.patient_details?.full_name || "N/A"}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">ID: {log.patient_id.slice(0, 8)}</p>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-sm font-bold text-slate-800">{log.chemist_name || "—"}</p>
                        </td>
                        <td className="px-4 py-5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${svc.color}`}>
                            {svc.label}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex justify-center">
                            {log.debit_credit === 'credit' ? (
                              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                <ArrowUpRight className="w-3 h-3" />
                                <span className="text-[10px] font-black uppercase">Inflow</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                <ArrowDownLeft className="w-3 h-3" />
                                <span className="text-[10px] font-black uppercase">Outflow</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-right font-black text-slate-900">
                          ₹{Number(log.amount).toLocaleString()}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                            log.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            log.status === 'initiated' ? 'bg-blue-100 text-[#004F7C] animate-pulse' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Showing {logs.length} of {summary.total_count} records</p>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 border border-slate-200 rounded-md hover:bg-white disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button 
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 border border-slate-200 rounded-md hover:bg-white disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Audit Info Footer ── */}
        <div className="bg-[#0067A1] rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-xl font-black tracking-tight">Clinical Integrity Assurance</h3>
              <p className="text-emerald-100/70 text-sm max-w-xl leading-relaxed">
                The Anti-Loss Ledger is an immutable record. Every clinical care episode is bound to a financial transaction entry to ensure structural accountability. Data is secured via end-to-end encryption.
              </p>
            </div>
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0067A1] bg-[#148F86] flex items-center justify-center text-[10px] font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              ))}
            </div>
          </div>
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        </div>

      </div>
    </div>
  );
}
