"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
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
} from "lucide-react";
import toast from "react-hot-toast";

export default function DoctorSettlementsAdminPage() {
  const [report, setReport] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [executingId, setExecutingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedBatchForPay, setSelectedBatchForPay] = useState(null);
  const [payoutRef, setPayoutRef] = useState("");

  useEffect(() => {
    fetchData();
  }, [statusFilter, selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [repRes, batRes] = await Promise.all([
        fetch("/api/admin/finance/report"),
        fetch(`/api/admin/payout-batches?${new URLSearchParams({
          ...(statusFilter && { status: statusFilter }),
          ...(selectedPeriod && { batch_period: selectedPeriod }),
        })}`),
      ]);

      const repJson = await repRes.json();
      const batJson = await batRes.json();

      if (repJson.success) setReport(repJson.data?.platform_summary || null);
      if (batJson.success) setBatches(batJson.data || []);
    } catch (e) {
      console.error("Failed to load settlements:", e);
      toast.error("Failed to load doctor settlements data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBatch = async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/admin/payout-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to generate batch");
      toast.success(json.message || `Reconciled ${json.batchesCreated} doctor settlement batches`);
      fetchData();
    } catch (e) {
      toast.error(e.message || "Failed to generate settlement batch");
    } finally {
      setGenerating(false);
    }
  };

  const handleExecutePayout = async () => {
    if (!selectedBatchForPay) return;
    try {
      setExecutingId(selectedBatchForPay.id);
      const res = await fetch(`/api/admin/payout-batches/${selectedBatchForPay.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payout_reference: payoutRef || `MANUAL-${Date.now()}`,
          notes: "Approved and settled via Admin Dashboard",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to execute payout");
      toast.success("Settlement batch marked as paid successfully!");
      setSelectedBatchForPay(null);
      setPayoutRef("");
      fetchData();
    } catch (e) {
      toast.error(e.message || "Failed to execute settlement payout");
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0067A1]">
            <Wallet className="w-4 h-4" />
            <span>Doctor Financial Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
            10-Day Settlements & Doctor Payouts
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Automated reconciliation for 1–10, 11–20, and 21–month end cycles. GST 18% and TDS 10% separate ledger accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-200 text-xs font-medium px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleGenerateBatch}
            disabled={generating}
            className="inline-flex items-center gap-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{generating ? "Reconciling..." : "Run Settlement Batch"}</span>
          </button>
        </div>
      </div>

      {/* Platform Economics Stat Cards */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
              Gross Volume
            </span>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
              ₹{Number(report.total_gross_volume || 0).toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-gray-500 mt-1 block">
              {report.total_consultations} completed consultations
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
              Platform Revenue
            </span>
            <div className="text-xl sm:text-2xl font-bold text-[#0067A1] mt-1">
              ₹{Number(report.net_platform_revenue || 0).toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-gray-500 mt-1 block">
              Excluding GST (Audit ledger basis)
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
              TDS Withheld (10%)
            </span>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">
              ₹{Number(report.tds_withheld || 0).toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-gray-500 mt-1 block">
              GST Collected: ₹{Number(report.gst_collected || 0).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="bg-gradient-to-br from-[#0067A1] to-[#004F7C] p-4 rounded-xl text-white shadow-xs">
            <span className="text-[11px] font-medium text-sky-200 uppercase tracking-wider block">
              Doctor Payable
            </span>
            <div className="text-xl sm:text-2xl font-bold mt-1">
              ₹{Number(report.total_doctor_payable || 0).toLocaleString("en-IN")}
            </div>
            <div className="flex items-center justify-between text-[11px] text-sky-100 mt-1">
              <span>Paid: ₹{report.total_settled_paid}</span>
              <span>Due: ₹{report.total_outstanding_payable}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">Filters:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="reconciled">Reconciled</option>
            <option value="paid">Paid</option>
            <option value="draft">Draft</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="text-[11px] text-gray-400">
          Showing {batches.length} doctor settlement batches
        </div>
      </div>

      {/* Payout Batches Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            Reconciled 10-Day Settlement Batches
          </h2>
          <span className="text-[11px] text-gray-500">
            Target disbursement: within 3 business days of cycle close
          </span>
        </div>

        {batches.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No settlement batches found. Click "Run Settlement Batch" to reconcile current cycle completed consultations.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-2.5 px-4">Period</th>
                  <th className="py-2.5 px-4">Doctor</th>
                  <th className="py-2.5 px-4">Date Range</th>
                  <th className="py-2.5 px-4">Visits</th>
                  <th className="py-2.5 px-4">Gross Fee</th>
                  <th className="py-2.5 px-4">Commission</th>
                  <th className="py-2.5 px-4">TDS (10%)</th>
                  <th className="py-2.5 px-4">Net Payout</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {batches.map((b) => {
                  const isPaid = b.status === "paid";
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        {b.batch_period}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {b.doctor_name || "Doctor"}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {b.doctor_email || String(b.doctor_id).slice(0, 8)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {b.period_start} to {b.period_end}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                        {b.total_bookings}
                      </td>
                      <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium">
                        ₹{Number(b.gross_consultation_fees || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-amber-700 font-medium">
                        -₹{Number(b.total_platform_commission || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        -₹{Number(b.total_tds || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700 dark:text-emerald-400">
                        ₹{Number(b.net_payout || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-sky-50 text-[#0067A1] border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300"
                          }`}
                        >
                          {isPaid ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                          <span className="capitalize">{b.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isPaid ? (
                          <span className="text-[11px] text-gray-400 font-medium">Settled</span>
                        ) : (
                          <button
                            onClick={() => setSelectedBatchForPay(b)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-medium px-2.5 py-1 rounded-md transition shadow-2xs cursor-pointer"
                          >
                            Execute Payout
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

      {/* Execute Payout Modal */}
      {selectedBatchForPay && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Execute Doctor Settlement Payout
              </h3>
              <button
                onClick={() => setSelectedBatchForPay(null)}
                className="text-gray-400 hover:text-gray-700 text-xs font-semibold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <p>
                <strong>Doctor:</strong> {selectedBatchForPay.doctor_name || selectedBatchForPay.doctor_id}
              </p>
              <p>
                <strong>Period:</strong> {selectedBatchForPay.batch_period} ({selectedBatchForPay.period_start} to {selectedBatchForPay.period_end})
              </p>
              <p>
                <strong>Total Completed Consultations:</strong> {selectedBatchForPay.total_bookings}
              </p>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 font-bold text-sm flex justify-between">
                <span>Net Transfer Amount:</span>
                <span>₹{Number(selectedBatchForPay.net_payout || 0).toLocaleString("en-IN")}</span>
              </div>

              <div className="pt-2">
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bank Reference / UTR Number:
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR123456789 or NEFT-REF"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedBatchForPay(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePayout}
                disabled={executingId === selectedBatchForPay.id}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {executingId === selectedBatchForPay.id ? "Processing..." : "Confirm Payout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
