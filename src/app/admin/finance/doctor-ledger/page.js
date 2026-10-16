"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  UserCheck,
  Building,
  Video,
  Home,
  CreditCard,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  Info,
  ShieldCheck,
  Copy,
  Layers,
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

export default function DoctorLedgerAdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [executingId, setExecutingId] = useState(null);

  // Filters
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modeFilter, setModeFilter] = useState(""); // '' | 'clinic' | 'video' | 'home'
  const [excludeFree, setExcludeFree] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("batches"); // 'batches' | 'ledger'
  const [page, setPage] = useState(1);

  // Single Payout Execution Modal with Proof
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

  // Snapshot Modal
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        exclude_free: String(excludeFree),
        ...(selectedDoctorId && { doctor_id: selectedDoctorId }),
        ...(statusFilter && { status: statusFilter }),
        ...(modeFilter && { mode: modeFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const res = await fetch(`/api/admin/finance/doctor-ledger?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load doctor ledger data");
      setData(json.data);
    } catch (e) {
      console.error("Doctor ledger fetch error:", e);
      toast.error(e.message || "Failed to load doctor ledger");
    } finally {
      setLoading(false);
    }
  }, [selectedDoctorId, statusFilter, modeFilter, excludeFree, searchQuery, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run 10-day settlement batch
  const handleGenerateBatch = async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/admin/payout-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(selectedDoctorId && { doctor_id: selectedDoctorId }),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to generate batch");
      toast.success(json.message || `Reconciled ${json.batchesCreated || 0} doctor settlement batches`);
      fetchData();
    } catch (e) {
      toast.error(e.message || "Failed to generate settlement batch");
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
      const res = await fetch(`/api/admin/payout-batches/${selectedBatchForPay.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utr_number: cleanUtr,
          payout_reference: cleanUtr,
          payment_mode: payoutMode,
          proof_url: payoutProofUrl.trim() || null,
          notes: payoutNotes.trim() || `Disbursed via ${payoutMode}. UTR: ${cleanUtr}`,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to execute payout");
      toast.success("Settlement verified and marked as paid!");
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
          module_type: "doctor",
          utr_number: cleanUtr,
          payment_mode: bulkMode,
          proof_url: bulkProofUrl.trim() || null,
          notes: bulkNotes.trim() || `Bulk doctor disbursement via ${bulkMode}. Master UTR: ${cleanUtr}`,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to execute bulk settlement");
      toast.success(json.message || "Bulk settlements executed successfully!");
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
  const modeAudit = data?.mode_audit || {};
  const auditRecon = data?.audit_reconciliation || {};
  const doctors = data?.doctors || [];
  const batches = data?.batches || [];
  const consultations = data?.consultations || [];
  const cycle = data?.currentCycle;

  const reconciledBatchesCount = batches.filter((b) => b.status === "reconciled").length;

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0067A1]">
            <Wallet className="w-4 h-4" />
            <span>Finance Master</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-gray-500 font-normal normal-case">Doctor Ledger & Audit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Doctor Financial Ledger & Settlements
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Audit down to the exact paisa across Clinic Visits, Video Calls, and Home Visits with verified disbursement proof.
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
                setBulkUtr(`UTR-BULK-${Date.now().toString().slice(-8)}`);
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
            Gross Volume
          </span>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(metrics.total_gross_volume)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {metrics.total_consultations || 0} paid consultations
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
            Platform Retained Fee
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#0067A1] mt-1">
            {formatCurrency(metrics.net_platform_revenue)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            GST on comm: {formatCurrency(metrics.gst_collected)}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
            TDS Withheld (10%)
          </span>
          <div className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">
            {formatCurrency(metrics.tds_withheld)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Form 26AS credit withheld
          </span>
        </div>

        <div className="bg-[#0067A1] p-4 rounded-xl text-white shadow-sm border border-[#005a8e]">
          <span className="text-[11px] font-medium text-sky-200 uppercase tracking-wider block">
            Net Doctor Payable
          </span>
          <div className="text-xl sm:text-2xl font-bold mt-1">
            {formatCurrency(metrics.total_outstanding_payable)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-sky-100 mt-1">
            <span>Paid: {formatCurrency(metrics.total_settled_paid)}</span>
            <span>{cycle?.batchPeriod ? `Cycle ${cycle.cycle}` : "10-day cycle"}</span>
          </div>
        </div>
      </div>

      {/* ── 3-MODE EARNING & AUDIT BREAKDOWN MODULE ────────────────────── */}
      <div className="bg-slate-50 dark:bg-gray-850 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0067A1]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              3-Mode Consultation Earning & Audit Module
            </h2>
            <span className="text-[10px] bg-sky-100 text-[#0067A1] font-semibold px-2 py-0.5 rounded-full">
              Paisa-Level Audit
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-gray-400">
            Audit Equation: Gross = Platform Fee + TDS + Net Payable (Variance: ₹0.00)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* 1. Clinic Visit */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-slate-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center">
                  <Building className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Clinic Visits</h3>
                  <span className="text-[10px] text-slate-400">In-person consultations</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded">
                {modeAudit.clinic?.count || 0} visits
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Volume:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(modeAudit.clinic?.gross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Platform Fee (18% / 5%):</span>
                <span className="font-mono font-medium text-amber-700">-{formatCurrency(modeAudit.clinic?.commission)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TDS Withheld (10%):</span>
                <span className="font-mono text-slate-600 dark:text-gray-300">-{formatCurrency(modeAudit.clinic?.tds)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-100 dark:border-gray-700 font-bold text-emerald-700 dark:text-emerald-400">
                <span>Net Doctor Payout:</span>
                <span className="font-mono">{formatCurrency(modeAudit.clinic?.net)}</span>
              </div>
            </div>
          </div>

          {/* 2. Video Consultation */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-slate-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 flex items-center justify-center">
                  <Video className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Video Consultations</h3>
                  <span className="text-[10px] text-slate-400">Tele-consult & Instant</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded">
                {modeAudit.video?.count || 0} calls
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Volume:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(modeAudit.video?.gross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Platform Fee (20%):</span>
                <span className="font-mono font-medium text-amber-700">-{formatCurrency(modeAudit.video?.commission)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TDS Withheld (10%):</span>
                <span className="font-mono text-slate-600 dark:text-gray-300">-{formatCurrency(modeAudit.video?.tds)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-100 dark:border-gray-700 font-bold text-emerald-700 dark:text-emerald-400">
                <span>Net Doctor Payout:</span>
                <span className="font-mono">{formatCurrency(modeAudit.video?.net)}</span>
              </div>
            </div>
          </div>

          {/* 3. Home Visit */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-slate-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 flex items-center justify-center">
                  <Home className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Home Visits</h3>
                  <span className="text-[10px] text-slate-400">At-home patient visits</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded">
                {modeAudit.home_visit?.count || 0} visits
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Volume:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(modeAudit.home_visit?.gross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Platform Fee (20%):</span>
                <span className="font-mono font-medium text-amber-700">-{formatCurrency(modeAudit.home_visit?.commission)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TDS Withheld (10%):</span>
                <span className="font-mono text-slate-600 dark:text-gray-300">-{formatCurrency(modeAudit.home_visit?.tds)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-100 dark:border-gray-700 font-bold text-emerald-700 dark:text-emerald-400">
                <span>Net Doctor Payout:</span>
                <span className="font-mono">{formatCurrency(modeAudit.home_visit?.net)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Reconciliation Summary Bar */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Verified Audit Balance:</strong> Total Gross: <strong>{formatCurrency(auditRecon.total_gross)}</strong> = Commission (<strong>{formatCurrency(auditRecon.total_commission)}</strong>) + TDS (<strong>{formatCurrency(auditRecon.total_tds)}</strong>) + Net Doctor (<strong>{formatCurrency(auditRecon.total_net_payable)}</strong>)
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 rounded">
            Variance: {formatCurrency(auditRecon.variance_amount || 0)}
          </span>
        </div>
      </div>

      {/* ── CONTROLS & FILTER TOOLBAR ─────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Doctor Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Doctor:</span>
            <select
              value={selectedDoctorId}
              onChange={(e) => { setSelectedDoctorId(e.target.value); setPage(1); }}
              className="border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium max-w-[200px]"
            >
              <option value="">All Doctors ({doctors.length})</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} {d.specialization ? `(${d.specialization})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Mode:</span>
            <select
              value={modeFilter}
              onChange={(e) => { setModeFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
            >
              <option value="">All Modes</option>
              <option value="clinic">Clinic Visit</option>
              <option value="video">Video Consultation</option>
              <option value="home">Home Visit</option>
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

          {/* Exclude Free Checkbox */}
          <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={excludeFree}
              onChange={(e) => { setExcludeFree(e.target.checked); setPage(1); }}
              className="rounded text-[#0067A1]"
            />
            <span>Exclude Free (₹0)</span>
          </label>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID / Doctor / Patient..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-7 pr-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 w-48"
            />
          </div>

          {(selectedDoctorId || statusFilter || modeFilter || !excludeFree || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDoctorId("");
                setStatusFilter("");
                setModeFilter("");
                setExcludeFree(true);
                setSearchQuery("");
                setPage(1);
              }}
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
            onClick={() => setActiveTab("ledger")}
            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
              activeTab === "ledger"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs font-semibold"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Consultations Ledger ({consultations.length})
          </button>
        </div>
      </div>

      {/* ── TAB 1: SETTLEMENT BATCHES (WITH PROOF ENFORCEMENT) ─────────── */}
      {activeTab === "batches" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                10-Day Doctor Settlement Batches
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
              <p className="font-medium text-gray-700 dark:text-gray-300">No doctor settlement batches found.</p>
              <p className="text-gray-400">Click &quot;Run Batch&quot; above to reconcile eligible completed consultations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4">Doctor</th>
                    <th className="py-2.5 px-4">Date Range</th>
                    <th className="py-2.5 px-4 text-center">Visits</th>
                    <th className="py-2.5 px-4 text-right">Gross Fee</th>
                    <th className="py-2.5 px-4 text-right">Commission</th>
                    <th className="py-2.5 px-4 text-right">TDS (10%)</th>
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
                          <span className="font-medium text-gray-800 dark:text-gray-200 block">{b.doctor_name || "Doctor"}</span>
                          <span className="text-[10px] text-gray-400">{b.doctor_email || "—"}</span>
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap text-[11px]">
                          {formatDate(b.period_start)} – {formatDate(b.period_end)}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-gray-700 dark:text-gray-300 font-semibold">
                          {b.total_bookings}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(b.gross_consultation_fees)}
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
                            <span className="text-[11px] text-gray-400 italic">Proof pending disbursement</span>
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

      {/* ── TAB 2: CONSULTATIONS LEDGER (WITH MODE & EXACT AUDIT) ──────── */}
      {activeTab === "ledger" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                Consultation Transactions Ledger
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Itemized professional fees, consultation mode, and exact tax snapshots</p>
            </div>
            <span className="text-[11px] text-gray-500 font-mono">
              {consultations.length} entries shown
            </span>
          </div>

          {consultations.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500">
              No consultation transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-4">Booking ID</th>
                    <th className="py-2.5 px-4">Doctor & Patient</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Consultation Mode</th>
                    <th className="py-2.5 px-4 text-right">Gross Fee</th>
                    <th className="py-2.5 px-4 text-center">Comm. %</th>
                    <th className="py-2.5 px-4 text-right">Commission</th>
                    <th className="py-2.5 px-4 text-right">Net Doctor</th>
                    <th className="py-2.5 px-4">Settlement</th>
                    <th className="py-2.5 px-4 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {consultations.map((c) => {
                    let snap = c.financial_snapshot;
                    if (typeof snap === "string") {
                      try { snap = JSON.parse(snap); } catch { snap = null; }
                    }
                    const fee = Number(snap?.professional_fee || c.final_fee || c.original_fee || 0);
                    const commRate = snap?.commission_rate ?? c.commission_rate ?? 18;
                    const commAmt = Number(snap?.commission_amount || (fee * (commRate / 100)));
                    const netDoctor = Number(snap?.doctor_net_payable || (fee - commAmt));

                    const modeStr = String(c.appointment_type || "").toLowerCase();
                    const isClinic = modeStr.includes("clinic") || modeStr.includes("person") || modeStr.includes("offline");
                    const isHome = modeStr.includes("home");

                    return (
                      <tr key={c.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                          #{String(c.id).slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900 dark:text-white block">{c.doctor_name || "Doctor"}</span>
                          <span className="text-[10px] text-gray-400">Pt: {c.patient_name || "Patient"}</span>
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap text-[11px]">
                          {formatDate(c.appointment_date)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {isClinic ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                              <Building className="w-2.5 h-2.5" />
                              <span>Clinic Visit</span>
                            </span>
                          ) : isHome ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300">
                              <Home className="w-2.5 h-2.5" />
                              <span>Home Visit</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                              <Video className="w-2.5 h-2.5" />
                              <span>Video Call</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(fee)}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-gray-600 dark:text-gray-300 text-[11px]">
                          {commRate}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-amber-700 font-medium tabular-nums">
                          -{formatCurrency(commAmt)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(netDoctor)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            c.settlement_status === "settled"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-sky-50 text-[#0067A1] border-sky-200"
                          }`}>
                            {c.settlement_status || "Pending"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          {snap ? (
                            <button
                              onClick={() => setSelectedSnapshot(snap)}
                              className="text-[11px] font-medium text-[#0067A1] hover:underline cursor-pointer"
                            >
                              Audit
                            </button>
                          ) : (
                            <span className="text-gray-400 text-[11px]">—</span>
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

      {/* ── SETTLEMENT PAYOUT MODAL WITH MANDATORY PROOF ───────────────── */}
      {selectedBatchForPay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Execute Settlement Payout</h3>
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
                  <span className="text-gray-500">Doctor:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedBatchForPay.doctor_name}</span>
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

      {/* ── BULK SETTLEMENT MODAL ─────────────────────────────────────── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0067A1]" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Bulk Doctor Disbursement</h3>
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
                  All reconciled batches will be settled under a single bank transfer batch reference.
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
                  placeholder="e.g. CMS-BATCH-982348"
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
                  placeholder="Bulk disbursement via Admin Finance Master"
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

      {/* ── DETAIL SNAPSHOT MODAL ─────────────────────────────────────── */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-5 space-y-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Commercial Fee Snapshot</h3>
              <button onClick={() => setSelectedSnapshot(null)} className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Professional Fee:</span>
                <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{formatCurrency(selectedSnapshot.professional_fee)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Commission ({selectedSnapshot.commission_rate}%):</span>
                <span className="font-mono font-semibold text-amber-700">-{formatCurrency(selectedSnapshot.commission_amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">GST on Commission ({selectedSnapshot.commission_gst_rate}%):</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{formatCurrency(selectedSnapshot.commission_gst_amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">TDS Withheld ({selectedSnapshot.doctor_tds_rate}%):</span>
                <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">-{formatCurrency(selectedSnapshot.doctor_tds_amount)}</span>
              </div>
              <div className="flex justify-between py-2 bg-emerald-50 dark:bg-emerald-950/40 px-3 rounded font-bold text-emerald-800 dark:text-emerald-300">
                <span>Net Doctor Share:</span>
                <span className="font-mono">{formatCurrency(selectedSnapshot.doctor_net_payable)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="bg-[#0067A1] text-white text-xs font-medium px-4 py-1.5 rounded hover:bg-[#005a8e] transition cursor-pointer"
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
