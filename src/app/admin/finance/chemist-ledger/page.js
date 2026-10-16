"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Pill,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  FileText,
  AlertCircle,
  Play,
  Building,
  CreditCard,
  ShoppingBag,
  Copy,
  ExternalLink,
  Layers,
  ShieldCheck,
  Tag,
} from "lucide-react";
import toast from "react-hot-toast";

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

function formatCurrency(val) {
  const num = Number(val || 0);
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function ChemistLedgerAdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [executingId, setExecutingId] = useState(null);

  // Filters
  const [selectedChemistId, setSelectedChemistId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("batches"); // 'batches' | 'orders'
  const [page, setPage] = useState(1);

  // Payout Execution Modal with Proof
  const [selectedBatchForPay, setSelectedBatchForPay] = useState(null);
  const [payoutUtr, setPayoutUtr] = useState("");
  const [payoutMode, setPayoutMode] = useState("NEFT");
  const [payoutProofUrl, setPayoutProofUrl] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");

  // Bulk Settlement Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkUtr, setBulkUtr] = useState("");
  const [bulkMode, setBulkMode] = useState("NEFT");
  const [bulkProofUrl, setBulkProofUrl] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkExecuting, setBulkExecuting] = useState(false);

  // Order Itemized Audit Modal
  const [selectedOrderAudit, setSelectedOrderAudit] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(selectedChemistId && { chemist_id: selectedChemistId }),
        ...(statusFilter && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const res = await fetch(`/api/admin/finance/chemist-ledger?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load chemist ledger data");
      setData(json.data);
    } catch (e) {
      console.error("Chemist ledger fetch error:", e);
      toast.error(e.message || "Failed to load chemist ledger");
    } finally {
      setLoading(false);
    }
  }, [selectedChemistId, statusFilter, searchQuery, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run 10-day settlement batch
  const handleGenerateBatch = async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/admin/finance/chemist-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(selectedChemistId && { chemist_id: selectedChemistId }),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to generate batch");
      toast.success(json.message || `Reconciled ${json.batchesCreated || 0} chemist settlement batches`);
      fetchData();
    } catch (e) {
      toast.error(e.message || "Failed to generate chemist settlement batch");
    } finally {
      setGenerating(false);
    }
  };

  // Mark single payout as executed with mandatory proof
  const handleExecutePayout = async () => {
    if (!selectedBatchForPay) return;
    const cleanUtr = payoutUtr.trim();
    if (!cleanUtr) {
      toast.error("Please enter a valid Bank UTR / Transaction ID proof.");
      return;
    }

    try {
      setExecutingId(selectedBatchForPay.id);
      const res = await fetch(`/api/admin/finance/chemist-batches/${selectedBatchForPay.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utr_number: cleanUtr,
          payout_reference: cleanUtr,
          payment_mode: payoutMode,
          proof_url: payoutProofUrl.trim() || null,
          notes: payoutNotes.trim() || `Pharmacy payout disbursed via ${payoutMode}. UTR: ${cleanUtr}`,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to execute payout");
      toast.success("Pharmacy settlement verified and marked as paid!");
      setSelectedBatchForPay(null);
      setPayoutUtr("");
      setPayoutProofUrl("");
      setPayoutNotes("");
      fetchData();
    } catch (e) {
      toast.error(e.message || "Failed to execute payout");
    } finally {
      setExecutingId(null);
    }
  };

  // Bulk Settlement Execution
  const handleBulkSettlement = async () => {
    const cleanUtr = bulkUtr.trim();
    if (!cleanUtr) {
      toast.error("Please enter a valid Master Bank UTR / Transaction ID proof.");
      return;
    }

    try {
      setBulkExecuting(true);
      const res = await fetch("/api/admin/finance/bulk-settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "chemist",
          utr_number: cleanUtr,
          payment_mode: bulkMode,
          proof_url: bulkProofUrl.trim() || null,
          notes: bulkNotes.trim() || `Bulk pharmacy disbursement via ${bulkMode}. Master UTR: ${cleanUtr}`,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to execute bulk settlement");
      toast.success(json.message || "Bulk pharmacy settlements executed successfully!");
      setIsBulkModalOpen(false);
      setBulkUtr("");
      setBulkProofUrl("");
      setBulkNotes("");
      fetchData();
    } catch (e) {
      toast.error(e.message || "Failed to execute bulk settlement");
    } finally {
      setBulkExecuting(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const metrics = data?.metrics || {};
  const chemists = data?.chemists || [];
  const batches = data?.batches || [];
  const orders = data?.orders || [];
  const cycle = data?.currentCycle;

  const reconciledBatchesCount = batches.filter((b) => b.status === "reconciled").length;

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0067A1]">
            <Pill className="w-4 h-4" />
            <span>Finance Master</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-gray-500 font-normal normal-case">Chemist Ledger & Audit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Pharmacy Chemist Ledger & Settlements
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Medicine order audits (10% platform fee, 1% Section 194-O TDS), itemized calculations, and verified disbursement proof.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-200 text-xs font-medium px-3.5 py-2 rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleGenerateBatch}
            disabled={generating}
            className="inline-flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-medium px-3.5 py-2 rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{generating ? "Reconciling..." : "Run Batch"}</span>
          </button>

          {reconciledBatchesCount > 0 && (
            <button
              onClick={() => {
                setBulkUtr(`UTR-CHEM-${Date.now().toString().slice(-8)}`);
                setIsBulkModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3.5 py-2 rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Settle ({reconciledBatchesCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── METRICS OVERALL SUMMARY ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
            Gross Medicine Volume
          </span>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(metrics.gross_volume)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {metrics.completed_orders || 0} completed orders
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
            Platform Retained Fee (10%)
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#0067A1] mt-1">
            {formatCurrency(metrics.platform_revenue)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            GST on comm (18%): {formatCurrency(Number(metrics.platform_revenue || 0) * 0.18)}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
            Total Disbursed Paid
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatCurrency(metrics.total_settled_paid)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Verified bank disbursements
          </span>
        </div>

        <div className="bg-[#0067A1] p-4 rounded-xl text-white shadow-sm border border-[#005a8e]">
          <span className="text-[11px] font-medium text-sky-200 uppercase tracking-wider block">
            Pending Chemist Payout
          </span>
          <div className="text-xl sm:text-2xl font-bold mt-1">
            {formatCurrency(metrics.pending_payout_balance)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-sky-100 mt-1">
            <span>Payable: {formatCurrency(metrics.chemist_payable)}</span>
            <span>{cycle?.batchPeriod ? `Cycle ${cycle.cycle}` : "10-day cycle"}</span>
          </div>
        </div>
      </div>

      {/* ── CHEMIST AUDIT & TAX RULES REFERENCE STRIP ─────────────────── */}
      <div className="bg-slate-50 dark:bg-gray-850 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0067A1]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Pharmacy Financial Rules & E-Commerce Audit Structure
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-gray-400">
            Audit standard applied across all prescription and OTC deliveries
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-800 dark:text-gray-200">Platform Commission</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px]">10.00%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Standard digital order brokerage</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-800 dark:text-gray-200">Section 194-O TDS</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px]">1.00%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">E-commerce operator statutory deduction</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-800 dark:text-gray-200">GST on Commission</span>
              <span className="font-mono font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded text-[11px]">18.00%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">GST invoice on MediConnect service fee</p>
          </div>
        </div>
      </div>

      {/* ── CONTROLS & FILTER TOOLBAR ─────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chemist Partner Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Pharmacy:</span>
            <select
              value={selectedChemistId}
              onChange={(e) => { setSelectedChemistId(e.target.value); setPage(1); }}
              className="border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium max-w-[200px]"
            >
              <option value="">All Pharmacies ({chemists.length})</option>
              {chemists.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.pharmacy_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="delivered">Delivered / Completed</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order / Pharmacy / Patient..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-7 pr-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 w-48"
            />
          </div>

          {(selectedChemistId || statusFilter || searchQuery) && (
            <button
              onClick={() => { setSelectedChemistId(""); setStatusFilter(""); setSearchQuery(""); setPage(1); }}
              className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 text-xs font-medium cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Tabs toggle */}
        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md p-0.5 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={() => setActiveTab("batches")}
            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
              activeTab === "batches"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs font-semibold"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Settlement Batches ({batches.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
              activeTab === "orders"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs font-semibold"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Medicine Orders ({orders.length})
          </button>
        </div>
      </div>

      {/* ── TAB 1: CHEMIST SETTLEMENT BATCHES ──────────────────────────── */}
      {activeTab === "batches" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                10-Day Pharmacy Settlement Batches
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Automated batch reconciliation with mandatory bank transaction ID proof</p>
            </div>
            <span className="text-[11px] text-gray-500">
              Disbursed within 3 business days of cycle close
            </span>
          </div>

          {batches.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 space-y-2">
              <AlertCircle className="w-6 h-6 text-gray-300 mx-auto" />
              <p className="font-medium text-gray-700 dark:text-gray-300">No pharmacy settlement batches found.</p>
              <p className="text-gray-400">Click &quot;Run Batch&quot; above to reconcile eligible completed orders.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4">Pharmacy</th>
                    <th className="py-2.5 px-4">Date Range</th>
                    <th className="py-2.5 px-4 text-center">Orders</th>
                    <th className="py-2.5 px-4 text-right">Gross Amount</th>
                    <th className="py-2.5 px-4 text-right">Commission (10%)</th>
                    <th className="py-2.5 px-4 text-right">TDS (1%)</th>
                    <th className="py-2.5 px-4 text-right">Net Payout</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Disbursement Proof</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {batches.map((b) => {
                    const isPaid = b.status === "paid";
                    const utr = b.utr_number || b.payout_reference;
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-gray-900 dark:text-white block">{b.batch_period}</span>
                          <span className="text-[10px] text-gray-400 font-mono">#{String(b.id).slice(0, 8)}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-gray-800 dark:text-gray-200 block">{b.pharmacy_name || "Pharmacy"}</span>
                          <span className="text-[10px] text-gray-400">{b.chemist_phone || "—"}</span>
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap text-[11px]">
                          {formatDate(b.period_start)} – {formatDate(b.period_end)}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-gray-700 dark:text-gray-300 font-semibold">
                          {b.total_orders}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(b.gross_orders_amount)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-amber-700 font-medium tabular-nums">
                          -{formatCurrency(b.total_platform_commission)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-gray-600 dark:text-gray-300 tabular-nums">
                          -{formatCurrency(b.total_tds)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(b.net_payout)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-sky-50 text-[#0067A1] border-sky-200 dark:bg-sky-950/40 dark:text-sky-300"
                          }`}>
                            {isPaid ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                            <span>{isPaid ? "Paid" : "Reconciled"}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {isPaid ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] bg-slate-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-slate-800 dark:text-gray-200 font-semibold">
                                  {b.payment_mode || "NEFT"}
                                </span>
                                <span className="font-mono text-[11px] text-gray-700 dark:text-gray-300 truncate max-w-[120px]" title={utr}>
                                  {utr || "Verified"}
                                </span>
                                {utr && (
                                  <button
                                    onClick={() => copyToClipboard(utr)}
                                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                    title="Copy UTR"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {b.proof_url && (
                                <a
                                  href={b.proof_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#0067A1] hover:underline flex items-center gap-0.5"
                                >
                                  <span>View Proof</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">Proof pending</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          {isPaid ? (
                            <span className="text-[11px] text-emerald-600 font-medium">Settled</span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedBatchForPay(b);
                                setPayoutUtr(`UTR${Date.now().toString().slice(-8)}`);
                                setPayoutMode("NEFT");
                                setPayoutProofUrl("");
                                setPayoutNotes("");
                              }}
                              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-2.5 py-1 rounded transition cursor-pointer"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Settle</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MEDICINE ORDERS (WITH ITEMIZED AUDIT BREAKDOWN) ─────── */}
      {activeTab === "orders" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                Medicine Orders Itemized Ledger
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Itemized medicines, 10% platform fee, 1% TDS, and net pharmacy payout breakdown</p>
            </div>
            <span className="text-[11px] text-gray-500 font-mono">
              {orders.length} orders shown
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500">
              No medicine orders found.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-4">Order ID</th>
                    <th className="py-2.5 px-4">Pharmacy & Patient</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Ordered Medicines</th>
                    <th className="py-2.5 px-4 text-right">Order Total</th>
                    <th className="py-2.5 px-4 text-center">Comm. (10%)</th>
                    <th className="py-2.5 px-4 text-right">TDS (1%)</th>
                    <th className="py-2.5 px-4 text-right">Net Pharmacy</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-center">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {orders.map((o) => {
                    const totalAmt = Number(o.calculated_gross ?? o.total_amount ?? 0);
                    const commAmt = Number(o.commission_amount ?? (totalAmt * 0.10));
                    const tdsAmt = Number(o.tds_amount ?? (totalAmt * 0.01));
                    const chemistShare = Number(o.calculated_chemist_payout ?? (totalAmt - commAmt - tdsAmt));
                    const items = o.items || [];

                    return (
                      <tr key={o.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                          #{String(o.id).slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-medium text-gray-800 dark:text-gray-200 block">{o.pharmacy_name || "Pharmacy"}</span>
                          <span className="text-[10px] text-gray-400">Pt: {o.patient_name || "Patient"}</span>
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap text-[11px]">
                          {formatDate(o.created_at)}
                        </td>
                        <td className="py-2.5 px-4 max-w-[240px]">
                          {items.length > 0 ? (
                            <div className="space-y-1">
                              {items.slice(0, 2).map((it, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]" title={it.medicine_name}>
                                    {it.medicine_name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Qty: {it.quantity || 1}
                                  </span>
                                </div>
                              ))}
                              {items.length > 2 && (
                                <span className="text-[10px] text-gray-400">+{items.length - 2} more medicines</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600 dark:text-gray-300">Prescription Medicines</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(totalAmt)}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-amber-700 font-medium tabular-nums text-[11px]">
                          -{formatCurrency(commAmt)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-gray-600 dark:text-gray-300 tabular-nums">
                          -{formatCurrency(tdsAmt)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(chemistShare)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {o.status || "Pending"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedOrderAudit(o)}
                            className="text-[11px] font-medium text-[#0067A1] hover:underline cursor-pointer"
                          >
                            Audit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SETTLEMENT PAYOUT MODAL WITH MANDATORY PROOF ───────────────── */}
      {selectedBatchForPay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Execute Pharmacy Settlement Payout</h3>
              </div>
              <button
                onClick={() => setSelectedBatchForPay(null)}
                className="text-gray-400 hover:text-gray-600 text-xs font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-lg space-y-1.5 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pharmacy:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedBatchForPay.pharmacy_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cycle:</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">{selectedBatchForPay.batch_period}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Net Disbursable:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    {formatCurrency(selectedBatchForPay.net_payout)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Bank UTR / Transaction ID <span className="text-red-500">* (Mandatory Proof)</span>:
                </label>
                <input
                  type="text"
                  value={payoutUtr}
                  onChange={(e) => setPayoutUtr(e.target.value)}
                  placeholder="e.g. UTR982348923 or CMS001892"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#0067A1]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Payment Mode:</label>
                  <select
                    value={payoutMode}
                    onChange={(e) => setPayoutMode(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                  >
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI</option>
                    <option value="Direct Transfer">Direct Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Proof URL / Slip:</label>
                  <input
                    type="text"
                    value={payoutProofUrl}
                    onChange={(e) => setPayoutProofUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Audit Notes:</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Approved & transferred via Finance Master"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setSelectedBatchForPay(null)}
                className="px-3.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePayout}
                disabled={executingId !== null || !payoutUtr.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {executingId ? "Processing..." : "Confirm Payout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK CHEMIST SETTLEMENT MODAL ─────────────────────────────── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0067A1]" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Bulk Pharmacy Disbursement</h3>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-sky-50 dark:bg-sky-950/30 p-3 rounded-lg border border-sky-100 dark:border-sky-800 text-slate-700 dark:text-slate-300 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Eligible Reconciled Batches:</span>
                  <span>{reconciledBatchesCount} batches</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gray-400">
                  All reconciled pharmacy batches will be settled under a single bank transfer batch reference.
                </p>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Master Bank UTR / Batch Ref <span className="text-red-500">* (Mandatory Proof)</span>:
                </label>
                <input
                  type="text"
                  value={bulkUtr}
                  onChange={(e) => setBulkUtr(e.target.value)}
                  placeholder="e.g. CHEM-BATCH-982348"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#0067A1]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Payment Mode:</label>
                  <select
                    value={bulkMode}
                    onChange={(e) => setBulkMode(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                  >
                    <option value="NEFT">NEFT Batch</option>
                    <option value="RTGS">RTGS Batch</option>
                    <option value="IMPS">IMPS Bulk</option>
                    <option value="Bank File">Bank File Upload</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Proof URL / Slip:</label>
                  <input
                    type="text"
                    value={bulkProofUrl}
                    onChange={(e) => setBulkProofUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Disbursement Remarks:</label>
                <input
                  type="text"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Bulk pharmacy disbursement via Admin Finance Master"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="px-3.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSettlement}
                disabled={bulkExecuting || !bulkUtr.trim()}
                className="px-4 py-1.5 bg-[#0067A1] hover:bg-[#005a8e] text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {bulkExecuting ? "Disbursing..." : "Confirm Bulk"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ORDER ITEMIZED AUDIT BREAKDOWN MODAL ───────────────────────── */}
      {selectedOrderAudit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#0067A1]" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Medicine Order Itemized Audit</h3>
              </div>
              <button
                onClick={() => setSelectedOrderAudit(null)}
                className="text-gray-400 hover:text-gray-600 text-xs font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-gray-750 p-3 rounded-lg border border-slate-100 dark:border-gray-700 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order ID:</span>
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">#{selectedOrderAudit.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pharmacy:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedOrderAudit.pharmacy_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Patient:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedOrderAudit.patient_name || "Patient"}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] block mb-2">
                  Prescription & OTC Medicines:
                </span>
                <div className="space-y-2 border border-slate-100 dark:border-gray-700 rounded-lg p-2.5 max-h-52 overflow-y-auto">
                  {(selectedOrderAudit.items || []).map((it, idx) => (
                    <div key={idx} className="p-2 bg-slate-50/70 dark:bg-gray-700/50 rounded space-y-1 border border-slate-100 dark:border-gray-700">
                      <div className="flex justify-between font-semibold text-slate-900 dark:text-white">
                        <span>{it.medicine_name}</span>
                        <span className="font-mono">{formatCurrency(it.price || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-gray-300">
                        <span>Dosage: <strong>{it.dosage || "Standard"}</strong></span>
                        <span className="text-slate-700 dark:text-gray-200 font-medium">Qty: {it.quantity || 1}</span>
                      </div>
                      {it.frequency && (
                        <div className="text-[10px] text-slate-400">
                          {it.frequency} {it.duration ? `· ${it.duration}` : ""}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!selectedOrderAudit.items || selectedOrderAudit.items.length === 0) && (
                    <div className="p-3 text-center text-slate-400 text-xs italic">
                      Standard prescription medicine order
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1.5 font-bold">
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span>Gross Order Amount:</span>
                  <span className="font-mono">{formatCurrency(selectedOrderAudit.calculated_gross || selectedOrderAudit.total_amount)}</span>
                </div>
                <div className="flex justify-between text-xs text-amber-700">
                  <span>Platform Retained Fee (10%):</span>
                  <span className="font-mono">-{formatCurrency(selectedOrderAudit.commission_amount)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-gray-300">
                  <span>Section 194-O TDS (1%):</span>
                  <span className="font-mono">-{formatCurrency(selectedOrderAudit.tds_amount)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-800 dark:text-emerald-200 pt-1 border-t border-emerald-200 dark:border-emerald-800">
                  <span>Net Disbursable to Pharmacy:</span>
                  <span className="font-mono">{formatCurrency(selectedOrderAudit.calculated_chemist_payout)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOrderAudit(null)}
                className="bg-[#0067A1] hover:bg-[#005a8e] text-white text-xs font-medium px-4 py-1.5 rounded transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
