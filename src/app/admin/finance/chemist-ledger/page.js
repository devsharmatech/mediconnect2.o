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

  // Payout Execution Modal
  const [selectedBatchForPay, setSelectedBatchForPay] = useState(null);
  const [payoutRef, setPayoutRef] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");

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

  // Mark payout as executed
  const handleExecutePayout = async () => {
    if (!selectedBatchForPay) return;
    try {
      setExecutingId(selectedBatchForPay.id);
      const res = await fetch(`/api/admin/finance/chemist-batches/${selectedBatchForPay.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payout_reference: payoutRef || `CHEM-NEFT-${Date.now()}`,
          notes: payoutNotes || "Approved and disbursed via Finance Master",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to execute payout");
      toast.success("Chemist settlement marked as paid!");
      setSelectedBatchForPay(null);
      setPayoutRef("");
      setPayoutNotes("");
      fetchData();
    } catch (e) {
      toast.error(e.message || "Failed to execute chemist payout");
    } finally {
      setExecutingId(null);
    }
  };

  const metrics = data?.metrics || {};
  const chemists = data?.chemists || [];
  const batches = data?.batches || [];
  const orders = data?.orders || [];
  const cycle = data?.currentCycle;

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0067A1]">
            <Pill className="w-4 h-4" />
            <span>Finance Master</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-gray-500 font-normal normal-case">Chemist Ledger & Settlements</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Pharmacy & Chemist Ledger & Settlements
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Prescription medicine orders, 10-day cycle settlements, and direct pharmacy bank transfers.
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
            className="inline-flex items-center gap-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-medium px-3.5 py-2 rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{generating ? "Reconciling..." : "Run Batch"}</span>
          </button>
        </div>
      </div>

      {/* ── METRICS STAT CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
            Gross Pharmacy Volume
          </span>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(metrics.gross_volume)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {metrics.completed_orders || 0} completed orders
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
            Platform Retained Cut
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#0067A1] mt-1">
            {formatCurrency(metrics.platform_revenue)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Medicine commission cut (10%)
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
            Total Settled (Paid)
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatCurrency(metrics.total_settled_paid)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Disbursed to pharmacies
          </span>
        </div>

        <div className="bg-gradient-to-br from-[#0067A1] to-[#004F7C] p-4 rounded-lg text-white shadow-xs">
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

      {/* ── CONTROLS & FILTER TOOLBAR ─────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chemist Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Pharmacy:</span>
            <select
              value={selectedChemistId}
              onChange={(e) => { setSelectedChemistId(e.target.value); setPage(1); }}
              className="border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium max-w-[220px]"
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
              <option value="reconciled">Reconciled</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order / Chemist..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-7 pr-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 w-44"
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

      {/* ── TAB 1: SETTLEMENT BATCHES ─────────────────────────────────── */}
      {activeTab === "batches" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                10-Day Pharmacy Settlement Batches
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Automated batch reconciliation with direct pharmacy bank disbursement</p>
            </div>
            <span className="text-[11px] text-gray-500">
              Disbursed within 3 business days of cycle close
            </span>
          </div>

          {batches.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 space-y-2">
              <AlertCircle className="w-6 h-6 text-gray-300 mx-auto" />
              <p className="font-medium text-gray-700 dark:text-gray-300">No chemist settlement batches found.</p>
              <p className="text-gray-400">Click &quot;Run Batch&quot; above to reconcile eligible delivered medicine orders.</p>
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
                    <th className="py-2.5 px-4 text-right">Gross Sales</th>
                    <th className="py-2.5 px-4 text-right">Commission (10%)</th>
                    <th className="py-2.5 px-4 text-right">TDS (1%)</th>
                    <th className="py-2.5 px-4 text-right">Net Payout</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {batches.map((b) => {
                    const isPaid = b.status === "paid";
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-gray-900 dark:text-white block">{b.batch_period}</span>
                          <span className="text-[10px] text-gray-400 font-mono">#{String(b.id).slice(0, 8)}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-gray-800 dark:text-gray-200 block">{b.pharmacy_name || "Chemist"}</span>
                          <span className="text-[10px] text-gray-400">{b.chemist_phone || b.pharmacist_name || "—"}</span>
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
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          {isPaid ? (
                            <span className="text-[11px] font-mono text-gray-500" title={`Ref: ${b.payout_reference}`}>
                              {b.payout_reference || "Settled"}
                            </span>
                          ) : (
                            <button
                              onClick={() => { setSelectedBatchForPay(b); setPayoutRef(`CHEM-NEFT-${Date.now().toString().slice(-8)}`); }}
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

      {/* ── TAB 2: ORDERS LEDGER ─────────────────────────────────────── */}
      {activeTab === "orders" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                Prescription Medicine Orders Ledger
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Itemized medicine order sales, 10% platform fee, and settlement status</p>
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
                    <th className="py-2.5 px-4">Pharmacy</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Delivery</th>
                    <th className="py-2.5 px-4 text-right">Order Total</th>
                    <th className="py-2.5 px-4 text-right">Platform Fee (10%)</th>
                    <th className="py-2.5 px-4 text-right">Chemist Share</th>
                    <th className="py-2.5 px-4">Order Status</th>
                    <th className="py-2.5 px-4">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {orders.map((o) => {
                    const totalAmt = Number(o.total_amount || 0);
                    const comm = Number(o.platform_commission_amount || (totalAmt * 0.10));
                    const chemistShare = Number(o.chemist_payout_amount || (totalAmt - comm));

                    return (
                      <tr key={o.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                          #{String(o.id).slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                          {o.pharmacy_name || "Pharmacy"}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap text-[11px]">
                          {formatDate(o.created_at)}
                        </td>
                        <td className="py-2.5 px-4 capitalize whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {o.delivery_type || "Standard"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(totalAmt)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-amber-700 font-medium tabular-nums">
                          -{formatCurrency(comm)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(chemistShare)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {o.status || "Pending"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            o.settlement_status === "settled"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-sky-50 text-[#0067A1] border-sky-200"
                          }`}>
                            {o.settlement_status || "Pending"}
                          </span>
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

      {/* ── SETTLEMENT PAYOUT MODAL ───────────────────────────────────── */}
      {selectedBatchForPay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
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
              <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-md space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pharmacy:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedBatchForPay.pharmacy_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Period:</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">{selectedBatchForPay.batch_period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Net Payable:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    {formatCurrency(selectedBatchForPay.net_payout)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Bank Reference / UTR Number:
                </label>
                <input
                  type="text"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  placeholder="e.g. CHEM-CMS982348923 or NEFT001"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Settlement Remarks / Notes:
                </label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="e.g. Approved and settled via Admin Finance Master"
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
                disabled={executingId !== null}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {executingId ? "Processing..." : "Confirm Payout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
