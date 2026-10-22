"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TestTube,
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
  Microscope,
  Copy,
  ExternalLink,
  Layers,
  ChevronRight,
  ShieldCheck,
  Tag,
  Printer,
  Plus,
  Trash2,
  UserCheck,
  Building2,
  Download,
  Settings,
  FileSpreadsheet,
  Upload,
  FileCheck,
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

export default function LabLedgerAdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [executingId, setExecutingId] = useState(null);

  // Filters
  const [selectedLabId, setSelectedLabId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("batches"); // 'batches' | 'orders' | 'policies'
  const [page, setPage] = useState(1);

  // Maker-Checker state
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Settlement Statement / Voucher Modal
  const [selectedVoucherBatchId, setSelectedVoucherBatchId] = useState(null);
  const [voucherData, setVoucherData] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  // Commercial Policies State
  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [isAddPolicyModalOpen, setIsAddPolicyModalOpen] = useState(false);
  const [newPolicyLabId, setNewPolicyLabId] = useState("");
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyCategory, setNewPolicyCategory] = useState("all");
  const [newPolicyCommission, setNewPolicyCommission] = useState("20");
  const [newPolicyAgreementRef, setNewPolicyAgreementRef] = useState("");
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Payout Execution Modal with Proof
  const [selectedBatchForPay, setSelectedBatchForPay] = useState(null);
  const [payoutUtr, setPayoutUtr] = useState("");
  const [payoutMode, setPayoutMode] = useState("NEFT");
  const [payoutProofUrl, setPayoutProofUrl] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [uploadingSingleProof, setUploadingSingleProof] = useState(false);

  // Bulk Settlement Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkUtr, setBulkUtr] = useState("");
  const [bulkMode, setBulkMode] = useState("NEFT");
  const [bulkProofUrl, setBulkProofUrl] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkExecuting, setBulkExecuting] = useState(false);
  const [uploadingBulkProof, setUploadingBulkProof] = useState(false);

  // Order Itemized Audit Modal
  const [selectedOrderAudit, setSelectedOrderAudit] = useState(null);

  // Tally ERP State
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [selectedBatchForTally, setSelectedBatchForTally] = useState(null);
  const [tallyFormat, setTallyFormat] = useState("XML"); // 'XML' | 'CSV'
  const [tallyLoading, setTallyLoading] = useState(false);
  const [tallyExportData, setTallyExportData] = useState(null);
  const [isTallyConfigOpen, setIsTallyConfigOpen] = useState(false);
  const [tallyConfig, setTallyConfig] = useState({
    company_name: "MediConnect Healthtech Solutions Pvt Ltd",
    lab_payable_ledger: "PRL Laboratory / Diagnostic Payables",
    commission_income_ledger: "MediConnect Platform Commission",
    tds_ledger: "TDS Payable u/s 194C/194J",
    bank_ledger: "HDFC Bank Ltd - Main Disbursal",
    journal_voucher_type: "Journal",
    payment_voucher_type: "Payment",
  });
  const [savingTallyConfig, setSavingTallyConfig] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(selectedLabId && { lab_id: selectedLabId }),
        ...(statusFilter && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const res = await fetch(`/api/admin/finance/lab-ledger?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load lab ledger data");
      setData(json.data);
    } catch (e) {
      console.error("Lab ledger fetch error:", e);
      toast.error(e.message || "Failed to load lab ledger");
    } finally {
      setLoading(false);
    }
  }, [selectedLabId, statusFilter, searchQuery, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run 10-day settlement batch
  const handleGenerateBatch = async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/admin/finance/lab-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(selectedLabId && { lab_id: selectedLabId }),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to generate batch");
      toast.success(json.message || `Reconciled ${json.batchesCreated || 0} lab settlement batches`);
      fetchData();
    } catch (e) {
      toast.error(e.message || "Failed to generate lab settlement batch");
    } finally {
      setGenerating(false);
    }
  };

  // Upload payment proof document (slip/PDF/image)
  const handleProofUpload = async (file, isBulk = false) => {
    if (!file) return;
    try {
      if (isBulk) setUploadingBulkProof(true);
      else setUploadingSingleProof(true);

      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/settlement-proof", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to upload proof");
      const url = json.url || json.publicUrl;
      if (isBulk) {
        setBulkProofUrl(url);
      } else {
        setPayoutProofUrl(url);
      }
      toast.success("Payment proof uploaded successfully!");
    } catch (e) {
      toast.error(e.message || "Failed to upload payment proof");
    } finally {
      if (isBulk) setUploadingBulkProof(false);
      else setUploadingSingleProof(false);
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
    const cleanProof = payoutProofUrl.trim();
    if (!cleanProof) {
      toast.error("Mandatory proof required: Please upload the bank transfer slip / receipt.");
      return;
    }

    try {
      setExecutingId(selectedBatchForPay.id);
      const res = await fetch(`/api/admin/finance/lab-batches/${selectedBatchForPay.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utr_number: cleanUtr,
          payout_reference: cleanUtr,
          payment_mode: payoutMode,
          proof_url: cleanProof,
          notes: payoutNotes.trim() || `Lab payout disbursed via ${payoutMode}. UTR: ${cleanUtr}`,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to execute lab payout");
      toast.success("Lab settlement verified and marked as paid!");
      setSelectedBatchForPay(null);
      setPayoutUtr("");
      setPayoutProofUrl("");
      setPayoutNotes("");
      fetchData();
    } catch (e) {
      toast.error(e.message || "Failed to execute lab payout");
    } finally {
      setExecutingId(null);
    }
  };

  // Bulk Settlement Execution with mandatory proof
  const handleBulkSettlement = async () => {
    const cleanUtr = bulkUtr.trim();
    if (!cleanUtr) {
      toast.error("Please enter a valid Master Bank UTR / Transaction ID proof.");
      return;
    }
    const cleanProof = bulkProofUrl.trim();
    if (!cleanProof) {
      toast.error("Mandatory proof required: Please upload the bank transfer advice / slip before bulk settlement.");
      return;
    }

    try {
      setBulkExecuting(true);
      const res = await fetch("/api/admin/finance/bulk-settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "lab",
          utr_number: cleanUtr,
          payment_mode: bulkMode,
          proof_url: cleanProof,
          notes: bulkNotes.trim() || `Bulk lab disbursement via ${bulkMode}. Master UTR: ${cleanUtr}`,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to execute bulk lab settlement");
      toast.success(json.message || "Bulk lab settlements executed successfully!");
      setIsBulkModalOpen(false);
      setBulkUtr("");
      setBulkProofUrl("");
      setBulkNotes("");
      fetchData();
    } catch (e) {
      toast.error(e.message || "Failed to execute bulk lab settlement");
    } finally {
      setBulkExecuting(false);
    }
  };

  // Maker: Review batch
  const handleReviewBatch = async (batchId) => {
    try {
      setActionLoadingId(batchId);
      const res = await fetch(`/api/admin/finance/lab-batches/${batchId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_name: "Finance Maker Admin" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to review batch");
      toast.success("Batch marked as Reviewed (Maker step completed)");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to review batch");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Checker: Authorize / Approve batch
  const handleApproveBatch = async (batchId) => {
    try {
      setActionLoadingId(batchId);
      const res = await fetch(`/api/admin/finance/lab-batches/${batchId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approver_name: "Super Admin Checker" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to approve batch");
      toast.success("Batch marked as Approved (Checker step completed)");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to approve batch");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Settlement Statement / Voucher
  const handleOpenVoucher = async (batchId) => {
    try {
      setSelectedVoucherBatchId(batchId);
      setVoucherLoading(true);
      const res = await fetch(`/api/admin/finance/lab-batches/${batchId}/statement`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch statement voucher");
      setVoucherData(json.data);
    } catch (err) {
      toast.error(err.message || "Failed to load settlement voucher");
      setSelectedVoucherBatchId(null);
    } finally {
      setVoucherLoading(false);
    }
  };

  // Fetch Commercial Policies
  const fetchPolicies = useCallback(async () => {
    try {
      setLoadingPolicies(true);
      const params = new URLSearchParams({
        ...(selectedLabId && { lab_id: selectedLabId }),
      });
      const res = await fetch(`/api/admin/finance/lab-commercial-policies?${params}`);
      const json = await res.json();
      if (json.success) {
        setPolicies(json.data || []);
      }
    } catch (e) {
      console.error("Failed to load commercial policies:", e);
    } finally {
      setLoadingPolicies(false);
    }
  }, [selectedLabId]);

  useEffect(() => {
    if (activeTab === "policies") {
      fetchPolicies();
    }
  }, [activeTab, fetchPolicies]);

  // Create Commercial Policy
  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    if (!newPolicyLabId || !newPolicyName || !newPolicyCommission) {
      toast.error("Please fill all required policy fields.");
      return;
    }
    try {
      setSavingPolicy(true);
      const res = await fetch("/api/admin/finance/lab-commercial-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lab_id: newPolicyLabId,
          policy_name: newPolicyName.trim(),
          category_key: newPolicyCategory,
          commission_percentage: Number(newPolicyCommission),
          agreement_reference: newPolicyAgreementRef.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create policy");
      toast.success("Commercial policy created!");
      setIsAddPolicyModalOpen(false);
      setNewPolicyName("");
      setNewPolicyAgreementRef("");
      fetchPolicies();
    } catch (err) {
      toast.error(err.message || "Failed to save policy");
    } finally {
      setSavingPolicy(false);
    }
  };

  // Deactivate Policy
  const handleDeactivatePolicy = async (policyId) => {
    try {
      const res = await fetch(`/api/admin/finance/lab-commercial-policies?id=${policyId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to deactivate policy");
      toast.success("Policy deactivated");
      fetchPolicies();
    } catch (err) {
      toast.error(err.message || "Failed to deactivate policy");
    }
  };

  // Fetch Tally Config
  const fetchTallyConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/finance/tally/config");
      const json = await res.json();
      if (json.success && json.data) {
        setTallyConfig(json.data);
      }
    } catch (e) {
      console.error("Failed to load Tally config:", e);
    }
  }, []);

  useEffect(() => {
    fetchTallyConfig();
  }, [fetchTallyConfig]);

  // Save Tally Config
  const handleSaveTallyConfig = async (e) => {
    e.preventDefault();
    try {
      setSavingTallyConfig(true);
      const res = await fetch("/api/admin/finance/tally/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tallyConfig),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save Tally configuration");
      toast.success("Tally configuration saved!");
      setIsTallyConfigOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to save Tally configuration");
    } finally {
      setSavingTallyConfig(false);
    }
  };

  // Open Tally Export for a batch
  const handleOpenTallyExport = async (batch, format = "XML") => {
    try {
      setSelectedBatchForTally(batch);
      setTallyFormat(format);
      setIsTallyModalOpen(true);
      setTallyLoading(true);
      const res = await fetch("/api/admin/finance/tally/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batch.id, format }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to generate Tally export");
      setTallyExportData(json.data);
    } catch (err) {
      toast.error(err.message || "Failed to generate Tally export");
    } finally {
      setTallyLoading(false);
    }
  };

  // Switch Tally Format in Modal
  const handleSwitchTallyFormat = async (format) => {
    if (!selectedBatchForTally) return;
    setTallyFormat(format);
    try {
      setTallyLoading(true);
      const res = await fetch("/api/admin/finance/tally/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: selectedBatchForTally.id, format }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to generate export");
      setTallyExportData(json.data);
    } catch (err) {
      toast.error(err.message || "Failed to generate export");
    } finally {
      setTallyLoading(false);
    }
  };

  // Download Tally File
  const handleDownloadTallyFile = () => {
    if (!tallyExportData || !tallyExportData.content) return;
    const blob = new Blob([tallyExportData.content], { type: tallyExportData.mimeType || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tallyExportData.filename || `Tally_${Date.now()}.${tallyFormat.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${tallyExportData.filename}`);
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const metrics = data?.metrics || {};
  const labs = data?.labs || [];
  const batches = data?.batches || [];
  const orders = data?.orders || [];
  const categories = data?.categories || [];
  const cycle = data?.currentCycle;

  const reconciledBatchesCount = batches.filter((b) => b.status === "reconciled").length;

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0067A1]">
            <Microscope className="w-4 h-4" />
            <span>Finance Master</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-gray-500 font-normal normal-case">Lab Ledger & Audit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Diagnostic Lab Ledger & Settlements
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Test category audits (Cat 1: 50%, Cat 2: 40%, Cat 3: 30%, Cat 4: 5%), itemized calculations, and verified disbursement proof.
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
            onClick={() => {
              fetchTallyConfig();
              setIsTallyConfigOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-200 text-xs font-medium px-3 py-2 rounded-md shadow-2xs transition-colors cursor-pointer"
            title="Tally ERP Ledger Configuration"
          >
            <Settings className="w-3.5 h-3.5 text-amber-600" />
            <span>Tally Config</span>
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
                setBulkUtr(`UTR-LAB-${Date.now().toString().slice(-8)}`);
                setIsBulkModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3.5 py-2 rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Pay</span>
            </button>
          )}
        </div>
      </div>

      {/* ── METRICS OVERALL SUMMARY ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
            Gross Lab Volume
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
            Platform Retained Share
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#0067A1] mt-1">
            {formatCurrency(metrics.platform_revenue)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Category commission tier revenue
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
            Pending Lab Payout
          </span>
          <div className="text-xl sm:text-2xl font-bold mt-1">
            {formatCurrency(metrics.pending_payout_balance)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-sky-100 mt-1">
            <span>Payable: {formatCurrency(metrics.lab_payable)}</span>
            <span>{cycle?.batchPeriod ? `Cycle ${cycle.cycle}` : "10-day cycle"}</span>
          </div>
        </div>
      </div>

      {/* ── LAB CATEGORY COMMISSION REFERENCE STRIP ────────────────────── */}
      <div className="bg-slate-50 dark:bg-gray-850 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-[#0067A1]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Official Diagnostic Test Commission Categories
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-gray-400">
            Audit standard applied across all diagnostic investigations
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-gray-200">Category 1</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px]">50%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Routine & basic biochemistry</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-gray-200">Category 2</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px]">40%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Specialized diagnostics</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-gray-200">Category 3</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px]">30%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Advanced immunology / radiology</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-gray-200">Category 4</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[11px]">5%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">High-cost genetic & rare tests</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-gray-200">Packages</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px]">50%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Bundled preventive checkups</p>
          </div>
        </div>
      </div>

      {/* ── CONTROLS & FILTER TOOLBAR ─────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Lab Partner Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Lab:</span>
            <select
              value={selectedLabId}
              onChange={(e) => { setSelectedLabId(e.target.value); setPage(1); }}
              className="border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium max-w-[200px]"
            >
              <option value="">All Labs ({labs.length})</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lab_name}
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
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order / Lab / Patient..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-7 pr-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 w-48"
            />
          </div>

          {(selectedLabId || statusFilter || searchQuery) && (
            <button
              onClick={() => { setSelectedLabId(""); setStatusFilter(""); setSearchQuery(""); setPage(1); }}
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
            Batches ({batches.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
              activeTab === "orders"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs font-semibold"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
              activeTab === "policies"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs font-semibold"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Policies ({policies.length})
          </button>
        </div>
      </div>

      {/* ── TAB 1: LAB SETTLEMENT BATCHES ─────────────────────────────── */}
      {activeTab === "batches" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                10-Day Diagnostic Lab Settlement Batches
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
              <p className="font-medium text-gray-700 dark:text-gray-300">No lab settlement batches found.</p>
              <p className="text-gray-400">Click &quot;Run Batch&quot; above to reconcile eligible completed orders.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4">Lab Partner</th>
                    <th className="py-2.5 px-4">Date Range</th>
                    <th className="py-2.5 px-4 text-center">Orders</th>
                    <th className="py-2.5 px-4 text-right">Gross Amount</th>
                    <th className="py-2.5 px-4 text-right">Commission</th>
                    <th className="py-2.5 px-4 text-right">TDS (Exempt)</th>
                    <th className="py-2.5 px-4 text-right">Net Payout</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Disbursement Proof</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {batches.map((b) => {
                    const isPaid = b.status === "paid";
                    const isApproved = b.status === "approved";
                    const isReviewed = b.status === "reviewed";
                    const isReconciled = !b.status || b.status === "reconciled";
                    const utr = b.utr_number || b.payout_reference;

                    return (
                      <tr key={b.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-gray-900 dark:text-white block">{b.batch_period}</span>
                          <span className="text-[10px] text-gray-400 font-mono">#{String(b.id).slice(0, 8)}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-gray-800 dark:text-gray-200 block">{b.lab_name || "Diagnostic Lab"}</span>
                          <span className="text-[10px] text-gray-400">{b.lab_email || b.lab_phone || "—"}</span>
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
                        <td className="py-2.5 px-4 text-right font-mono text-gray-400 tabular-nums">
                          {Number(b.total_tds) > 0 ? `-${formatCurrency(b.total_tds)}` : "₹0"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(b.net_payout)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {isPaid && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Paid</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              <span>Approved</span>
                            </span>
                          )}
                          {isReviewed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Reviewed</span>
                            </span>
                          )}
                          {isReconciled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border bg-sky-50 text-[#0067A1] border-sky-200 dark:bg-sky-950/40 dark:text-sky-300">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Reconciled</span>
                            </span>
                          )}
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
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Statement Voucher Button */}
                            <button
                              onClick={() => handleOpenVoucher(b.id)}
                              className="inline-flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 text-gray-700 dark:text-gray-200 text-xs font-medium px-2 py-1 rounded transition cursor-pointer"
                              title="Official Settlement Voucher"
                            >
                              <FileText className="w-3 h-3 text-[#0067A1]" />
                              <span>Voucher</span>
                            </button>

                            {/* Tally ERP Export Button */}
                            <button
                              onClick={() => handleOpenTallyExport(b, "XML")}
                              className="inline-flex items-center gap-1 bg-white dark:bg-gray-700 border border-amber-200 dark:border-amber-800 hover:bg-amber-50 text-amber-700 dark:text-amber-300 text-xs font-medium px-2 py-1 rounded transition cursor-pointer"
                              title="Export to Tally ERP"
                            >
                              <Download className="w-3 h-3" />
                              <span>Tally</span>
                            </button>

                            {/* Maker Step: Review */}
                            {isReconciled && (
                              <button
                                onClick={() => handleReviewBatch(b.id)}
                                disabled={actionLoadingId === b.id}
                                className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-2 py-1 rounded transition cursor-pointer disabled:opacity-50"
                                title="Maker Review"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>{actionLoadingId === b.id ? "..." : "Review"}</span>
                              </button>
                            )}

                            {/* Checker Step: Approve */}
                            {isReviewed && (
                              <button
                                onClick={() => handleApproveBatch(b.id)}
                                disabled={actionLoadingId === b.id}
                                className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium px-2 py-1 rounded transition cursor-pointer disabled:opacity-50"
                                title="Checker Approval"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>{actionLoadingId === b.id ? "..." : "Approve"}</span>
                              </button>
                            )}

                            {/* Disbursal: Settle */}
                            {isApproved && (
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

                            {isPaid && (
                              <span className="text-[11px] text-emerald-600 font-semibold px-1">Settled</span>
                            )}
                          </div>
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

      {/* ── TAB 2: DIAGNOSTIC ORDERS (WITH TEST CATEGORY & COMMISSION %) ─ */}
      {activeTab === "orders" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                Diagnostic Orders Itemized Ledger
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Test categories, applied commission percentage, and exact lab payout breakdown</p>
            </div>
            <span className="text-[11px] text-gray-500 font-mono">
              {orders.length} orders shown
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500">
              No diagnostic test orders found.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-4">Order ID</th>
                    <th className="py-2.5 px-4">Lab Partner & Patient</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Tests & Category</th>
                    <th className="py-2.5 px-4 text-center">Comm. %</th>
                    <th className="py-2.5 px-4 text-right">Order Gross</th>
                    <th className="py-2.5 px-4 text-right">Commission</th>
                    <th className="py-2.5 px-4 text-right">Net Lab Share</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-center">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {orders.map((o) => {
                    const gross = o.calculated_gross || Number(o.total_amount || 0);
                    const comm = o.calculated_commission || gross * 0.20;
                    const labShare = o.calculated_lab_share || (gross - comm);
                    const items = o.items || [];

                    return (
                      <tr key={o.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                          #{String(o.id).slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-medium text-gray-800 dark:text-gray-200 block">{o.lab_name || "Diagnostic Lab"}</span>
                          <span className="text-[10px] text-gray-400">Pt: {o.patient_name || "Patient"}</span>
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap text-[11px]">
                          {formatDate(o.created_at)}
                        </td>
                        <td className="py-2.5 px-4 max-w-[260px]">
                          {items.length > 0 ? (
                            <div className="space-y-1">
                              {items.slice(0, 2).map((it, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]" title={it.test_name}>
                                    {it.test_name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-sky-50 text-[#0067A1] border border-sky-200">
                                    {it.category_name}
                                  </span>
                                </div>
                              ))}
                              {items.length > 2 && (
                                <span className="text-[10px] text-gray-400">+{items.length - 2} more tests</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600 dark:text-gray-300">Diagnostic Investigation</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                            {o.effective_commission_rate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(gross)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-amber-700 font-medium tabular-nums">
                          -{formatCurrency(comm)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(labShare)}
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

      {/* ── TAB 3: COMMERCIAL POLICIES & COMMISSION SCHEDULE ─────────── */}
      {activeTab === "policies" && (
        <div className="space-y-6">
          {/* Top Info Banner with Short "Add Policy" button */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0067A1]">
                <Tag className="w-4 h-4" />
                <span>Commercial Schedule</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                Diagnostic Category Commission Matrix & Partner Overrides
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                PRL Partner Commission Tiers (Cat 1: 50%, Cat 2: 40%, Cat 3: 30%, Cat 4: 5%) & Custom Lab Commercial Agreements.
              </p>
            </div>
            <div>
              <button
                onClick={() => {
                  setNewPolicyLabId(selectedLabId || (labs[0]?.id || ""));
                  setNewPolicyName("");
                  setNewPolicyCategory("all");
                  setNewPolicyCommission("20");
                  setNewPolicyAgreementRef("");
                  setIsAddPolicyModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#0067A1] hover:bg-[#005a8e] text-white text-xs font-medium px-3.5 py-2 rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Policy</span>
              </button>
            </div>
          </div>

          {/* Diagnostic Categories Grid (All 11+ Registered Categories) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {categories.map((cat, idx) => {
              const comm = Number(cat.commission_percentage || 0);
              const colorBadge = comm >= 50 
                ? "text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40"
                : comm >= 40
                ? "text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/40"
                : comm >= 30
                ? "text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40"
                : comm >= 20
                ? "text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40"
                : "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40";

              return (
                <div
                  key={cat.id || idx}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs flex flex-col justify-between hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${colorBadge}`}>
                        {cat.name}
                      </span>
                      <span className="text-base font-extrabold text-gray-900 dark:text-white">
                        {comm}%
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">
                      {cat.description || "Diagnostic tests & investigations catalog"}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Tests Cataloged:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">
                      {(cat.test_count ?? 0).toLocaleString()} tests
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Partner-Specific Commercial Policies Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                  Partner-Specific Commercial Overrides
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Contractual commission agreements linked to Partner Agreement IDs
                </p>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">
                {policies.length} policies registered
              </span>
            </div>

            {loadingPolicies ? (
              <div className="p-12 text-center text-xs text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-400 mb-2" />
                Loading commercial policies...
              </div>
            ) : policies.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500 space-y-2">
                <AlertCircle className="w-6 h-6 text-gray-300 mx-auto" />
                <p className="font-medium text-gray-700 dark:text-gray-300">No partner commercial overrides active.</p>
                <p className="text-gray-400">Default Category Tiers (50% / 40% / 30% / 5%) apply to all labs.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="py-2.5 px-4">Lab Partner</th>
                      <th className="py-2.5 px-4">Policy Name</th>
                      <th className="py-2.5 px-4">Category Scope</th>
                      <th className="py-2.5 px-4 text-center">Comm. %</th>
                      <th className="py-2.5 px-4">Effective Range</th>
                      <th className="py-2.5 px-4">Agreement Ref</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {policies.map((pol) => (
                      <tr key={pol.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-gray-900 dark:text-white block">{pol.lab_name || "All Labs"}</span>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">
                          {pol.policy_name}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-mono text-[11px] bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded text-slate-700 dark:text-gray-300 uppercase">
                            {pol.category_key || "all"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-[#0067A1]">
                          {pol.commission_percentage}%
                        </td>
                        <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap text-[11px]">
                          {formatDate(pol.effective_from)} – {formatDate(pol.effective_to) || "Ongoing"}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-gray-600 dark:text-gray-400">
                          {pol.agreement_reference || "—"}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            pol.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}>
                            {pol.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          {pol.is_active && (
                            <button
                              onClick={() => handleDeactivatePolicy(pol.id)}
                              className="text-red-600 hover:text-red-700 text-xs font-medium cursor-pointer"
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SETTLEMENT PAYOUT MODAL WITH MANDATORY PROOF ───────────────── */}
      {selectedBatchForPay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Execute Lab Settlement Payout</h3>
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
                  <span className="text-gray-500">Lab Partner:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedBatchForPay.lab_name}</span>
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
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Audit Notes:</label>
                  <input
                    type="text"
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    placeholder="Approved via Finance Master"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Payment Proof Document <span className="text-red-500">* (Mandatory)</span>:
                </label>
                {payoutProofUrl ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium truncate">
                        Proof Uploaded
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={payoutProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#0067A1] hover:underline font-medium inline-flex items-center gap-0.5"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setPayoutProofUrl("")}
                        className="text-[11px] text-red-500 hover:text-red-700 font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-md cursor-pointer transition ${
                      uploadingSingleProof
                        ? "border-sky-300 bg-sky-50 dark:bg-sky-950/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-[#0067A1] bg-gray-50 dark:bg-gray-800/60"
                    }`}>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={uploadingSingleProof}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProofUpload(file, false);
                        }}
                      />
                      <Upload className={`w-4 h-4 mb-1 ${uploadingSingleProof ? "animate-bounce text-[#0067A1]" : "text-gray-400"}`} />
                      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                        {uploadingSingleProof ? "Uploading proof..." : "Upload Bank Transfer Slip (PDF or Image)"}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={payoutProofUrl}
                      onChange={(e) => setPayoutProofUrl(e.target.value)}
                      placeholder="Or paste proof URL directly (https://...)"
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-1.5 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                    />
                  </div>
                )}
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
                disabled={executingId !== null || !payoutUtr.trim() || !payoutProofUrl.trim() || uploadingSingleProof}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {executingId ? "Processing..." : "Disburse"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK LAB SETTLEMENT MODAL ─────────────────────────────────── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0067A1]" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Bulk Lab Disbursement</h3>
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
                  All reconciled diagnostic lab batches will be settled under a single bank transfer batch reference.
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
                  placeholder="e.g. LAB-BATCH-982348"
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
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Disbursement Remarks:</label>
                  <input
                    type="text"
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    placeholder="Bulk lab disbursement via Finance Master"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Master Transfer Slip / Proof Document <span className="text-red-500">* (Mandatory)</span>:
                </label>
                {bulkProofUrl ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium truncate">
                        Proof Uploaded
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={bulkProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#0067A1] hover:underline font-medium inline-flex items-center gap-0.5"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setBulkProofUrl("")}
                        className="text-[11px] text-red-500 hover:text-red-700 font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-md cursor-pointer transition ${
                      uploadingBulkProof
                        ? "border-sky-300 bg-sky-50 dark:bg-sky-950/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-[#0067A1] bg-gray-50 dark:bg-gray-800/60"
                    }`}>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={uploadingBulkProof}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProofUpload(file, true);
                        }}
                      />
                      <Upload className={`w-4 h-4 mb-1 ${uploadingBulkProof ? "animate-bounce text-[#0067A1]" : "text-gray-400"}`} />
                      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                        {uploadingBulkProof ? "Uploading proof..." : "Upload Bank Transfer Slip / NEFT Advice (PDF/Image)"}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={bulkProofUrl}
                      onChange={(e) => setBulkProofUrl(e.target.value)}
                      placeholder="Or paste proof URL directly (https://...)"
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-1.5 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                    />
                  </div>
                )}
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
                disabled={bulkExecuting || !bulkUtr.trim() || !bulkProofUrl.trim() || uploadingBulkProof}
                className="px-4 py-1.5 bg-[#0067A1] hover:bg-[#005a8e] text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {bulkExecuting ? "Disbursing..." : "Disburse"}
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
                <Microscope className="w-4 h-4 text-[#0067A1]" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Order Itemized Commission Audit</h3>
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
                  <span className="text-gray-500">Lab Partner:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedOrderAudit.lab_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Patient:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedOrderAudit.patient_name || "Patient"}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] block mb-2">
                  Tests & Category Calculation:
                </span>
                <div className="space-y-2 border border-slate-100 dark:border-gray-700 rounded-lg p-2.5 max-h-52 overflow-y-auto">
                  {(selectedOrderAudit.items || []).map((it, idx) => (
                    <div key={idx} className="p-2 bg-slate-50/70 dark:bg-gray-700/50 rounded space-y-1 border border-slate-100 dark:border-gray-700">
                      <div className="flex justify-between font-semibold text-slate-900 dark:text-white">
                        <span>{it.test_name}</span>
                        <span className="font-mono">{formatCurrency(it.price)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-gray-300">
                        <span>Category: <strong className="text-slate-700 dark:text-gray-200">{it.category_name}</strong></span>
                        <span className="text-amber-700 font-semibold">Comm: {it.commission_percentage}% (-{formatCurrency(it.commission_amount)})</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold pt-0.5 border-t border-slate-200/60 dark:border-gray-600">
                        <span>Lab Net Take-Home:</span>
                        <span className="font-mono">{formatCurrency(it.lab_share)}</span>
                      </div>
                    </div>
                  ))}
                  {(!selectedOrderAudit.items || selectedOrderAudit.items.length === 0) && (
                    <div className="p-3 text-center text-slate-400 text-xs italic">
                      Standard diagnostic investigation (20% platform commission)
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1.5 font-bold">
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span>Total Order Gross:</span>
                  <span className="font-mono">{formatCurrency(selectedOrderAudit.calculated_gross || selectedOrderAudit.total_amount)}</span>
                </div>
                <div className="flex justify-between text-xs text-amber-700">
                  <span>Platform Retained Fee:</span>
                  <span className="font-mono">-{formatCurrency(selectedOrderAudit.calculated_commission)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-800 dark:text-emerald-200 pt-1 border-t border-emerald-200 dark:border-emerald-800">
                  <span>Net Disbursable to Lab:</span>
                  <span className="font-mono">{formatCurrency(selectedOrderAudit.calculated_lab_share)}</span>
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

      {/* ── SETTLEMENT STATEMENT / VOUCHER MODAL ───────────────────────── */}
      {selectedVoucherBatchId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full p-5 sm:p-6 border border-gray-200 dark:border-gray-700 space-y-5 my-8">
            {voucherLoading ? (
              <div className="p-12 text-center text-xs text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0067A1] mb-2" />
                <p>Generating official settlement voucher...</p>
              </div>
            ) : !voucherData ? (
              <div className="p-8 text-center text-xs text-red-500">
                Failed to load voucher statement.
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0067A1] text-white flex items-center justify-center font-bold text-xs">
                        MC
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                          MediConnect Settlement Voucher
                        </h3>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Diagnostic Laboratory Reconciliation & Disbursement Certificate
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0067A1] bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded border border-sky-200 dark:border-sky-800">
                      {voucherData.batch?.batch_period}
                    </span>
                    <span className={`capitalize text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      voucherData.batch?.status === "paid"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : voucherData.batch?.status === "approved"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : voucherData.batch?.status === "reviewed"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-sky-50 text-sky-700 border-sky-200"
                    }`}>
                      {voucherData.batch?.status || "Reconciled"}
                    </span>
                  </div>
                </div>

                {/* Partner and Settlement Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700 space-y-1">
                    <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] block mb-1">
                      Partner Laboratory
                    </span>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">
                      {voucherData.batch?.lab_name}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-[11px]">
                      Operating Site: {voucherData.batch?.operating_address || voucherData.batch?.address || "Dwarka Sector 19, New Delhi"}
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-3 pt-1 border-t border-gray-200/50 dark:border-gray-700">
                      <span>CIN: <strong>{voucherData.batch?.cin || "—"}</strong></span>
                      <span>PAN: <strong>{voucherData.batch?.pan_number || "—"}</strong></span>
                    </div>
                    {voucherData.batch?.partner_agreement_id && (
                      <div className="text-[10px] text-[#0067A1] font-mono">
                        Agreement Ref: {voucherData.batch?.partner_agreement_id}
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700 space-y-1">
                    <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] block mb-1">
                      Settlement Details
                    </span>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Period:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {formatDate(voucherData.batch?.period_start)} – {formatDate(voucherData.batch?.period_end)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Total Orders:</span>
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                        {voucherData.batch?.total_orders} orders
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Payment Mode / UTR:</span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[150px]">
                        {voucherData.batch?.payment_mode || "NEFT"} • {voucherData.batch?.utr_number || voucherData.batch?.payout_reference || "Pending"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Completed Date:</span>
                      <span className="text-gray-800 dark:text-gray-200">
                        {voucherData.batch?.completed_at ? formatDate(voucherData.batch?.completed_at) : "Pending Disbursement"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary Card */}
                <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                  <div className="flex justify-between font-medium text-gray-700 dark:text-gray-300">
                    <span>Gross Diagnostic Order Volume:</span>
                    <span className="font-mono font-semibold">{formatCurrency(voucherData.batch?.gross_orders_amount)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 font-medium">
                    <span>MediConnect Platform Commission:</span>
                    <span className="font-mono">-{formatCurrency(voucherData.batch?.total_platform_commission)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400 font-medium">
                    <span>TDS & GST Withholding:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{Number(voucherData.batch?.total_tds) > 0 ? `-${formatCurrency(voucherData.batch?.total_tds)}` : "Exempt (0%)"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                    <span>Net Disbursed / Disbursable Payout:</span>
                    <span className="font-mono text-base">{formatCurrency(voucherData.batch?.net_payout)}</span>
                  </div>
                </div>

                {/* Maker-Checker Signatures (Section 6 & 7) */}
                <div className="space-y-1.5">
                  <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] block">
                    Maker-Checker Audit Signatures
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-50 dark:bg-gray-750 border border-slate-200 dark:border-gray-700">
                      <span className="text-gray-400 block text-[9px] uppercase">1. Reconciled</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 block truncate">Financial Engine</span>
                      <span className="text-[10px] text-gray-500">{formatDate(voucherData.batch?.created_at)}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-50 dark:bg-gray-750 border border-slate-200 dark:border-gray-700">
                      <span className="text-gray-400 block text-[9px] uppercase">2. Maker Reviewed</span>
                      <span className="font-semibold text-purple-700 dark:text-purple-400 block truncate">
                        {voucherData.batch?.reviewed_by || "Pending"}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {voucherData.batch?.reviewed_at ? formatDate(voucherData.batch?.reviewed_at) : "—"}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-50 dark:bg-gray-750 border border-slate-200 dark:border-gray-700">
                      <span className="text-gray-400 block text-[9px] uppercase">3. Checker Approved</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-400 block truncate">
                        {voucherData.batch?.approved_by || "Pending"}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {voucherData.batch?.approved_at ? formatDate(voucherData.batch?.approved_at) : "—"}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-50 dark:bg-gray-750 border border-slate-200 dark:border-gray-700">
                      <span className="text-gray-400 block text-[9px] uppercase">4. Bank Disbursed</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 block truncate">
                        {voucherData.batch?.settled_by || (voucherData.batch?.status === "paid" ? "Settled" : "Pending")}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {voucherData.batch?.completed_at ? formatDate(voucherData.batch?.completed_at) : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itemized Orders Table inside Voucher */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                      Itemized Orders In Batch ({voucherData.orders?.length || 0})
                    </span>
                    <span className="text-[10px] text-gray-400">Section 6 compliant ledger snapshot</span>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 sticky top-0 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="py-1.5 px-3">Order ID</th>
                          <th className="py-1.5 px-3">Patient</th>
                          <th className="py-1.5 px-3">Date</th>
                          <th className="py-1.5 px-3 text-right">Amount</th>
                          <th className="py-1.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {(voucherData.orders || []).map((ord) => (
                          <tr key={ord.id} className="hover:bg-gray-50/50">
                            <td className="py-1.5 px-3 font-mono text-[10px]">#{String(ord.id).slice(0, 8)}</td>
                            <td className="py-1.5 px-3">{ord.patient_name || "Patient"}</td>
                            <td className="py-1.5 px-3 text-gray-500">{formatDate(ord.created_at)}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold">{formatCurrency(ord.total_amount)}</td>
                            <td className="py-1.5 px-3 text-center">
                              <span className="capitalize px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300">
                                {ord.settlement_status || ord.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(!voucherData.orders || voucherData.orders.length === 0) && (
                          <tr>
                            <td colSpan={5} className="py-3 px-3 text-center text-gray-400 italic">
                              No orders listed in this batch snapshot.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      const matchedBatch = batches.find((b) => b.id === voucherData.batch?.id) || voucherData.batch;
                      handleOpenTallyExport(matchedBatch, "XML");
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded text-xs font-medium cursor-pointer border border-amber-200 dark:border-amber-800/40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tally XML</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded text-xs font-medium cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedVoucherBatchId(null);
                      setVoucherData(null);
                    }}
                    className="px-4 py-1.5 bg-[#0067A1] hover:bg-[#005a8e] text-white rounded text-xs font-medium cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ADD COMMERCIAL POLICY MODAL ─────────────────────────────────── */}
      {isAddPolicyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#0067A1]" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Add Lab Commercial Policy</h3>
              </div>
              <button
                onClick={() => setIsAddPolicyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Partner Lab:
                </label>
                <select
                  value={newPolicyLabId}
                  onChange={(e) => setNewPolicyLabId(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                  required
                >
                  <option value="">Select Lab...</option>
                  {labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lab_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Policy Name:
                </label>
                <input
                  type="text"
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  placeholder="e.g. PRL Preferred Partner Contract 2026"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Category Scope:
                  </label>
                  <select
                    value={newPolicyCategory}
                    onChange={(e) => setNewPolicyCategory(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                  >
                    <option value="all">All Categories (Global Override)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug || c.id}>
                        {c.name} ({Number(c.commission_percentage || 0)}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Commission %:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={newPolicyCommission}
                    onChange={(e) => setNewPolicyCommission(e.target.value)}
                    placeholder="20.00"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Partner Agreement Ref:
                </label>
                <input
                  type="text"
                  value={newPolicyAgreementRef}
                  onChange={(e) => setNewPolicyAgreementRef(e.target.value)}
                  placeholder="e.g. PRL-AGR-2026-DL01"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsAddPolicyModalOpen(false)}
                  className="px-3.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="px-4 py-1.5 bg-[#0067A1] hover:bg-[#005a8e] text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  {savingPolicy ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── TALLY ERP EXPORT MODAL ────────────────────────────────────────── */}
      {isTallyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Tally ERP Integration & Export
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Voucher ID: {selectedBatchForTally?.batch_period || "Batch"} • {selectedBatchForTally?.lab_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsTallyModalOpen(false);
                  setTallyExportData(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-xs font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Format Switcher */}
            <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-900/60 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchTallyFormat("XML")}
                  className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition ${
                    tallyFormat === "XML"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  Tally XML
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTallyFormat("CSV")}
                  className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition ${
                    tallyFormat === "CSV"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  Tally CSV
                </button>
              </div>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[260px]">
                Company: <span className="font-semibold text-gray-700 dark:text-gray-300">{tallyConfig.company_name}</span>
              </div>
            </div>

            {/* Financial Summary Strip */}
            {selectedBatchForTally && (
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase block">Gross Volume</span>
                  <span className="font-bold text-gray-800 dark:text-white">
                    {formatCurrency(selectedBatchForTally.total_order_amount)}
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase block">Commission</span>
                  <span className="font-bold text-[#0067A1]">
                    {formatCurrency(selectedBatchForTally.total_commission_amount)}
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase block">TDS 2%</span>
                  <span className="font-bold text-amber-600">
                    {formatCurrency(selectedBatchForTally.tds_amount)}
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase block">Net Disbursal</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(selectedBatchForTally.net_payable_amount)}
                  </span>
                </div>
              </div>
            )}

            {/* Code / XML / CSV Preview */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  Payload Preview ({tallyExportData?.filename || `${tallyFormat} payload`})
                </span>
                {tallyExportData?.content && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tallyExportData.content)}
                    className="inline-flex items-center gap-1 text-[11px] text-[#0067A1] hover:underline cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-auto bg-gray-900 text-gray-100 font-mono text-[11px] p-3 rounded-lg border border-gray-800 leading-relaxed max-h-[300px]">
                {tallyLoading ? (
                  <div className="flex items-center justify-center h-full py-12 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    <span>Generating Tally voucher...</span>
                  </div>
                ) : (
                  <pre className="whitespace-pre">{tallyExportData?.content || "No data generated"}</pre>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  fetchTallyConfig();
                  setIsTallyConfigOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded text-xs font-medium cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsTallyModalOpen(false);
                    setTallyExportData(null);
                  }}
                  className="px-3.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTallyFile}
                  disabled={tallyLoading || !tallyExportData}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TALLY ERP LEDGER CONFIG MODAL ─────────────────────────────────── */}
      {isTallyConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Tally ERP Ledger Mapping
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTallyConfigOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTallyConfig} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Company Name (as registered in Tally):
                </label>
                <input
                  type="text"
                  value={tallyConfig.company_name}
                  onChange={(e) => setTallyConfig({ ...tallyConfig, company_name: e.target.value })}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Lab Payables Ledger:
                  </label>
                  <input
                    type="text"
                    value={tallyConfig.lab_payable_ledger}
                    onChange={(e) => setTallyConfig({ ...tallyConfig, lab_payable_ledger: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Commission Income Ledger:
                  </label>
                  <input
                    type="text"
                    value={tallyConfig.commission_income_ledger}
                    onChange={(e) => setTallyConfig({ ...tallyConfig, commission_income_ledger: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    TDS Section 194C/J Ledger:
                  </label>
                  <input
                    type="text"
                    value={tallyConfig.tds_ledger}
                    onChange={(e) => setTallyConfig({ ...tallyConfig, tds_ledger: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Bank Disbursal Ledger:
                  </label>
                  <input
                    type="text"
                    value={tallyConfig.bank_ledger}
                    onChange={(e) => setTallyConfig({ ...tallyConfig, bank_ledger: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Journal Voucher Type:
                  </label>
                  <input
                    type="text"
                    value={tallyConfig.journal_voucher_type}
                    onChange={(e) => setTallyConfig({ ...tallyConfig, journal_voucher_type: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Payment Voucher Type:
                  </label>
                  <input
                    type="text"
                    value={tallyConfig.payment_voucher_type}
                    onChange={(e) => setTallyConfig({ ...tallyConfig, payment_voucher_type: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsTallyConfigOpen(false)}
                  className="px-3.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTallyConfig}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  {savingTallyConfig ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
