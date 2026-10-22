"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  IndianRupee,
  Receipt,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  TestTube,
  Pill,
  Stethoscope,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Copy,
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";

function formatCurrency(val) {
  const num = Number(val || 0);
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(val) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(val);
  }
}

export default function CAProfitGstPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        module: moduleFilter,
        ...(customFrom && { date_from: customFrom }),
        ...(customTo && { date_to: customTo }),
      });

      const res = await fetch(`/api/admin/finance/profit-gst?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load CA Profit & GST data");
      setData(json.data);
    } catch (err) {
      console.error("Fetch profit-gst error:", err);
      toast.error(err.message || "Failed to load Profit & GST reports");
    } finally {
      setLoading(false);
    }
  }, [period, moduleFilter, customFrom, customTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Export full CA audit sheet as CSV
  const handleExportCSV = () => {
    if (!data) return;
    const txns = data.transactions || [];
    if (txns.length === 0) {
      toast.error("No transactions to export for the selected period.");
      return;
    }

    const headers = [
      "Transaction ID",
      "Module",
      "Date",
      "Partner Name",
      "Patient Name",
      "Gross GMV (INR)",
      "Platform Profit/Commission (INR)",
      "GST Output Rate",
      "GST Total (INR)",
      "CGST 9% (INR)",
      "SGST 9% (INR)",
      "TDS Section",
      "TDS Withheld (INR)",
      "Net Partner Share (INR)",
      "Settlement Status",
    ];

    const rows = txns.map((t) => [
      `"${t.id}"`,
      `"${t.module}"`,
      `"${formatDate(t.date)}"`,
      `"${(t.partner_name || "").replace(/"/g, '""')}"`,
      `"${(t.patient_name || "").replace(/"/g, '""')}"`,
      t.gross_gmv,
      t.platform_profit,
      t.module === "Doctor" ? "18%" : "0% (Exempt)",
      t.gst_on_profit,
      t.cgst_9,
      t.sgst_9,
      `"${t.tds_section}"`,
      t.tds_withheld,
      t.net_partner_share,
      `"${t.settlement_status}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CA_Profit_GST_Audit_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CA Audit CSV exported!");
  };

  const kpis = data?.kpis || {};
  const caTax = data?.ca_tax_summary || {};
  const modules = data?.module_breakdown || {};
  const transactions = (data?.transactions || []).filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.partner_name && t.partner_name.toLowerCase().includes(q)) ||
      (t.module && t.module.toLowerCase().includes(q)) ||
      (t.patient_name && t.patient_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-4 md:p-8 space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#0067A1] to-[#008de4] text-white shadow-md shadow-sky-500/10">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  CA Profit & GST Ledger
                </h1>
                <span className="text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  GSTR-1 & 3B Ready
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Statutory Compliance • Platform Revenue • 18% GST Output Liability • TDS Section 194J / 194C / 194-O
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium cursor-pointer transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={loading || !data}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0067A1] hover:bg-[#005a8e] text-white rounded-lg text-xs font-medium cursor-pointer transition shadow-xs shadow-sky-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── FILTER BAR ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-200 dark:border-gray-700/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Preset Periods */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Period:
          </span>
          {[
            { id: "all", label: "All Time" },
            { id: "this_month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "this_quarter", label: "This Quarter" },
            { id: "fy_current", label: "Current FY" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPeriod(p.id);
                setCustomFrom("");
                setCustomTo("");
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                period === p.id
                  ? "bg-[#0067A1] text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Module Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Module:</span>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#0067A1]"
          >
            <option value="all">All Modules (Doctor + Lab + Chemist)</option>
            <option value="doctor">Doctor Consultations Only</option>
            <option value="lab">Diagnostic Labs Only</option>
            <option value="chemist">Pharmacy Chemists Only</option>
          </select>
        </div>
      </div>

      {/* ── TOP KPI METRIC CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Platform Profit */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/30 dark:border-emerald-800/60 border border-emerald-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Total Platform Profit
            </span>
            <div className="p-2 bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-950 dark:text-emerald-200 mt-2 font-mono">
            {formatCurrency(kpis.total_platform_profit)}
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400/80 mt-1">
            Net commission earned across 3 modules
          </p>
        </div>

        {/* GST Output Liability */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-950/30 dark:border-indigo-800/60 border border-indigo-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
              GST Output Liability (18%)
            </span>
            <div className="p-2 bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-950 dark:text-indigo-200 mt-2 font-mono">
            {formatCurrency(kpis.total_gst_liability)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-400/80 mt-1 font-mono">
            <span>CGST (9%): {formatCurrency(kpis.total_cgst)}</span>
            <span>SGST (9%): {formatCurrency(kpis.total_sgst)}</span>
          </div>
          <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/60 mt-1">
            Taxable on Doctor fee; Labs & Chemist exempt
          </p>
        </div>

        {/* Gross GMV Facilitated */}
        <div className="bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent dark:from-sky-950/30 dark:border-sky-800/60 border border-sky-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
              Gross Platform GMV
            </span>
            <div className="p-2 bg-sky-500/15 dark:bg-sky-500/20 text-[#0067A1] dark:text-sky-400 rounded-lg">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-sky-950 dark:text-sky-200 mt-2 font-mono">
            {formatCurrency(kpis.total_gross_gmv)}
          </div>
          <p className="text-[11px] text-sky-700 dark:text-sky-400/80 mt-1">
            Total bookings across {kpis.total_transactions || 0} transactions
          </p>
        </div>

        {/* TDS Withheld */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:border-amber-800/60 border border-amber-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              Total TDS Withheld
            </span>
            <div className="p-2 bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-950 dark:text-amber-200 mt-2 font-mono">
            {formatCurrency(kpis.total_tds_withheld)}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400/80 mt-1">
            Section 194J (10% Doctor Fees); Labs & Chemist exempt
          </p>
        </div>
      </div>

      {/* ── STATUTORY CA FILING BOX (GSTR-1 & 3B SUMMARY) ──────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#0067A1]" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Chartered Accountant Statutory Audit & GSTR Summary (Indian Law)
            </h3>
          </div>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            SAC Code: <strong className="text-gray-800 dark:text-gray-200">{caTax.sac_code || "998399"}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-gray-750 p-3 rounded-lg border border-slate-100 dark:border-gray-700">
            <span className="text-gray-500 block mb-1">GSTR-1 Taxable Turnover:</span>
            <span className="text-base font-bold font-mono text-gray-900 dark:text-white">
              {formatCurrency(caTax.taxable_turnover)}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Doctor Intermediation</span>
          </div>

          <div className="bg-slate-50 dark:bg-gray-750 p-3 rounded-lg border border-slate-100 dark:border-gray-700">
            <span className="text-gray-500 block mb-1">Exempt Healthcare/Retail:</span>
            <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {formatCurrency(caTax.exempt_turnover ?? kpis.total_exempt_turnover)}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">SAC 9993 & Retail Supply</span>
          </div>

          <div className="bg-slate-50 dark:bg-gray-750 p-3 rounded-lg border border-slate-100 dark:border-gray-700">
            <span className="text-gray-500 block mb-1">Central Tax (CGST @ 9%):</span>
            <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {formatCurrency(caTax.cgst_amount)}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">On Taxable Turnover</span>
          </div>

          <div className="bg-slate-50 dark:bg-gray-750 p-3 rounded-lg border border-slate-100 dark:border-gray-700">
            <span className="text-gray-500 block mb-1">State Tax (SGST @ 9%):</span>
            <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {formatCurrency(caTax.sgst_amount)}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">On Taxable Turnover</span>
          </div>

          <div className="bg-slate-50 dark:bg-gray-750 p-3 rounded-lg border border-slate-100 dark:border-gray-700">
            <span className="text-gray-500 block mb-1">Total Output GST Payable:</span>
            <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(caTax.total_output_gst)}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">GSTR-3B Table 3.1</span>
          </div>
        </div>

        {/* TDS Section Breakdown */}
        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-lg border border-amber-100 dark:border-amber-900/40 text-xs space-y-2">
          <span className="font-semibold text-amber-900 dark:text-amber-200 block">
            Partner TDS Deductions Breakdown for Form 26Q / ITNS 281 Filing:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
            <div className="bg-white dark:bg-gray-800 p-2.5 rounded border border-amber-200/60 dark:border-amber-800/40">
              <span className="text-gray-500 block text-[11px]">Doctor (Section 194J - 10%):</span>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {formatCurrency(caTax.tds_breakdown?.section_194J_doctor?.tds)}
              </span>
              <span className="text-[10px] text-emerald-600 block mt-0.5 font-sans">Active (Professional Fee)</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2.5 rounded border border-gray-200/60 dark:border-gray-700">
              <span className="text-gray-500 block text-[11px]">Lab Tests (Exempt):</span>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                ₹0.00
              </span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 block mt-0.5 font-sans">Exempt (SAC 9993 / Notif 12/2017)</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2.5 rounded border border-gray-200/60 dark:border-gray-700">
              <span className="text-gray-500 block text-[11px]">Chemist Orders (Exempt):</span>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                ₹0.00
              </span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 block mt-0.5 font-sans">Exempt (Retail Medicine Supply)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-0.5">
            <p>• <strong>Diagnostic Labs Exemption:</strong> Notification No. 12/2017-Central Tax (Rate) Entry 74, Heading 9993 (Health care services by clinical establishments are 100% EXEMPT from GST & TDS).</p>
            <p>• <strong>Chemist Pharmacy Supply:</strong> Supply of medicines is covered by manufacturer/retailer GST at MRP. Payout disbursements are exempt from platform GST and TDS.</p>
            <p>• <strong>Doctor Consultations:</strong> Subject to Section 194J (10% TDS) on professional fees. Platform technology intermediation fee is subject to 18% GST (SAC 998399).</p>
          </div>
        </div>
      </div>

      {/* ── MODULE-WISE PROFIT & GST BREAKDOWN ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Doctor Module */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4.5 border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
                <Stethoscope className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Doctor Module</h4>
            </div>
            <span className="text-[11px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
              {modules.doctor?.count || 0} Consults
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Gross Consultation GMV:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">{formatCurrency(modules.doctor?.gmv)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-600 font-medium">Platform Profit (Commission):</span>
              <span className="font-mono font-bold text-emerald-600">{formatCurrency(modules.doctor?.profit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-600 font-medium">GST on Commission (18%):</span>
              <span className="font-mono font-bold text-indigo-600">{formatCurrency(modules.doctor?.gst)}</span>
            </div>
            <div className="flex justify-between text-gray-500 text-[11px]">
              <span>CGST (9%) / SGST (9%):</span>
              <span className="font-mono">{formatCurrency(modules.doctor?.cgst)} each</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-600 font-medium">TDS Withheld (10% u/s 194J):</span>
              <span className="font-mono font-semibold text-amber-600">{formatCurrency(modules.doctor?.tds)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700 font-medium">
              <span className="text-gray-700 dark:text-gray-300">Doctor Net Payable:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(modules.doctor?.net_payable)}</span>
            </div>
          </div>
        </div>

        {/* Lab Module */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4.5 border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-lg">
                <TestTube className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Diagnostic Labs</h4>
            </div>
            <span className="text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Exempt SAC 9993
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Gross Lab Test GMV:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">{formatCurrency(modules.lab?.gmv)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-600 font-medium">Platform Profit (Commission):</span>
              <span className="font-mono font-bold text-emerald-600">{formatCurrency(modules.lab?.profit)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">GST Output Liability:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Exempt (0%)</span>
            </div>
            <div className="flex justify-between text-gray-400 text-[11px]">
              <span>Statutory Citation:</span>
              <span className="font-mono text-[10px]">Notif 12/2017 Heading 9993</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">TDS Withholding:</span>
              <span className="font-semibold text-gray-600 dark:text-gray-300">Exempt (0%)</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700 font-medium">
              <span className="text-gray-700 dark:text-gray-300">Lab Net Payable:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(modules.lab?.net_payable)}</span>
            </div>
          </div>
        </div>

        {/* Chemist Module */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4.5 border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Pill className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Pharmacy Chemists</h4>
            </div>
            <span className="text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Retail Medicine Supply
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Gross Pharmacy GMV:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">{formatCurrency(modules.chemist?.gmv)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-600 font-medium">Platform Profit (Commission):</span>
              <span className="font-mono font-bold text-emerald-600">{formatCurrency(modules.chemist?.profit)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">GST Output Liability:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">0% (Pre-paid at MRP)</span>
            </div>
            <div className="flex justify-between text-gray-400 text-[11px]">
              <span>Disbursement Nature:</span>
              <span className="text-[10px]">Retail Prescription Supply</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">TDS Withholding:</span>
              <span className="font-semibold text-gray-600 dark:text-gray-300">Exempt (0%)</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700 font-medium">
              <span className="text-gray-700 dark:text-gray-300">Chemist Net Payable:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(modules.chemist?.net_payable)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ITEMIZED AUDIT TRANSACTIONS REGISTER ───────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0067A1]" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Itemized CA Audit Register ({transactions.length} Records)
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search partner, ID, patient..."
              className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#0067A1]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-750/50 text-gray-500 border-b border-gray-100 dark:border-gray-700 font-medium">
                <th className="p-3">Date</th>
                <th className="p-3">Reference ID</th>
                <th className="p-3">Module</th>
                <th className="p-3">Partner Name</th>
                <th className="p-3 text-right">Gross GMV</th>
                <th className="p-3 text-right text-emerald-600 dark:text-emerald-400">Profit (Commission)</th>
                <th className="p-3 text-right text-indigo-600 dark:text-indigo-400">GST (18%)</th>
                <th className="p-3 text-right text-amber-600 dark:text-amber-400">TDS Withheld</th>
                <th className="p-3 text-right">Net Share</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    No transactions found for the selected period and filters.
                  </td>
                </tr>
              ) : (
                transactions.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/30 transition">
                    <td className="p-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {formatDate(t.date)}
                    </td>
                    <td className="p-3 font-mono font-medium text-gray-900 dark:text-gray-200">
                      <button
                        onClick={() => copyToClipboard(t.id)}
                        className="hover:text-[#0067A1] inline-flex items-center gap-1 cursor-pointer"
                        title="Click to copy full ID"
                      >
                        #{String(t.id).slice(0, 8)}
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          t.module === "Doctor"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : t.module === "Diagnostic Lab"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        }`}
                      >
                        {t.module}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-gray-900 dark:text-white max-w-[180px] truncate">
                      {t.partner_name}
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-gray-900 dark:text-white">
                      {formatCurrency(t.gross_gmv)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(t.platform_profit)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {t.gst_on_profit > 0 ? (
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(t.gst_on_profit)}</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">Exempt (0%)</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {t.tds_withheld > 0 ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(t.tds_withheld)}</span>
                      ) : (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-sans">₹0 (Exempt)</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-gray-800 dark:text-gray-200">
                      {formatCurrency(t.net_partner_share)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          t.settlement_status === "settled"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : t.settlement_status === "queued"
                            ? "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                        }`}
                      >
                        {t.settlement_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
