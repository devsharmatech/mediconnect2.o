"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  IndianRupee,
  RefreshCw,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ReceiptText,
  X,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  CreditCard,
  FileText,
  ChevronDown
} from "lucide-react";

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    badge: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50",
    dot: "bg-amber-500",
    icon: Clock,
  },
  PROCESSING: {
    label: "Processing",
    badge: "bg-sky-50 text-[#0067A1] border-sky-200/80 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800/50",
    dot: "bg-[#0067A1] animate-pulse",
    icon: AlertCircle,
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Failed",
    badge: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50",
    dot: "bg-rose-500",
    icon: XCircle,
  },
};

const REASON_CATEGORIES = [
  "Patient Cancellation (Within Window)",
  "Doctor Unavailable / Clinic Cancellation",
  "Teleconsultation Technical Glitch",
  "Prescription Out of Stock / Chemist Cancellation",
  "Diagnostic Lab Test Cancelled",
  "Billing Correction / Overcharged",
  "Administrative / Exceptional Approval",
  "Other Reason"
];

function formatPatientUnId(unId) {
  if (!unId && unId !== 0) return "PAT-0000";
  const clean = String(unId).replace(/\D/g, "");
  return `PAT-${clean.padStart(4, "0")}`;
}

function SoftStatCard({ label, value, sub, icon: Icon, tone = "default" }) {
  const toneMap = {
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
    sky: "bg-sky-50 text-[#0067A1] dark:bg-sky-950/40 dark:text-sky-400 border-sky-100 dark:border-sky-900/50",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50",
    default: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-100 dark:border-slate-700",
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {Icon && (
          <div className={`p-2 rounded-md border shadow-2xs ${toneMap[tone] || toneMap.default}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Issue Refund Modal (Professional 2-Step Transaction Selector)
// ─────────────────────────────────────────────────────────────────────────────
function IssueRefundModal({ onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState("select"); // "select" | "manual"
  const [searchTerm, setSearchTerm] = useState("");
  const [txns, setTxns] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Form State
  const [refundType, setRefundType] = useState("full"); // "full" | "partial"
  const [customAmount, setCustomAmount] = useState("");
  const [reasonCategory, setReasonCategory] = useState(REASON_CATEGORIES[0]);
  const [notes, setNotes] = useState("");
  const [channel, setChannel] = useState("GATEWAY"); // "GATEWAY" | "OFFLINE_BANK"
  const [offlineUtr, setOfflineUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Manual fallback fields
  const [manualPatientId, setManualPatientId] = useState("");
  const [manualPaymentId, setManualPaymentId] = useState("");
  const [manualAmount, setManualAmount] = useState("");

  // Search transactions from AWS RDS
  const fetchTxns = useCallback(async (query = "") => {
    setLoadingTxns(true);
    try {
      const p = new URLSearchParams({ limit: "25", ...(query && { search: query }) });
      const res = await fetch(`/api/admin/refunds/eligible?${p}`);
      const json = await res.json();
      if (json.success) {
        setTxns(json.data || []);
      }
    } catch (e) {
      console.warn("Error fetching eligible transactions:", e);
    } finally {
      setLoadingTxns(false);
    }
  }, []);

  useEffect(() => {
    fetchTxns();
  }, [fetchTxns]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTxns(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchTxns]);

  const targetAmount = useMemo(() => {
    if (activeTab === "select" && selectedTxn) {
      if (refundType === "full") return parseFloat(selectedTxn.amount || 0);
      return parseFloat(customAmount || 0);
    }
    return parseFloat(manualAmount || 0);
  }, [activeTab, selectedTxn, refundType, customAmount, manualAmount]);

  const handleSubmit = async () => {
    let patient_id = "";
    let original_payment_id = "";
    let care_episode_id = null;
    let consultation_id = null;
    let finalAmount = targetAmount;

    if (activeTab === "select") {
      if (!selectedTxn) {
        toast.error("Please select a transaction to refund");
        return;
      }
      patient_id = selectedTxn.patient_id;
      original_payment_id = selectedTxn.payment_gateway_id || selectedTxn.id;
      care_episode_id = selectedTxn.care_episode_id || null;
      consultation_id = selectedTxn.reference_id || null;

      const maxAllowed = parseFloat(selectedTxn.amount || 0);
      if (refundType === "partial") {
        if (!finalAmount || finalAmount <= 0) {
          toast.error("Enter a valid partial refund amount");
          return;
        }
        if (finalAmount > maxAllowed) {
          toast.error(`Refund amount cannot exceed ₹${maxAllowed}`);
          return;
        }
      }
    } else {
      if (!manualPaymentId.trim() || !manualPatientId.trim() || !manualAmount) {
        toast.error("All manual transaction fields are required");
        return;
      }
      patient_id = manualPatientId.trim();
      original_payment_id = manualPaymentId.trim();
    }

    if (!finalAmount || finalAmount <= 0) {
      toast.error("Invalid refund amount");
      return;
    }

    if (channel === "OFFLINE_BANK" && !offlineUtr.trim()) {
      toast.error("Please provide Bank UTR / Reference Number");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patient_id,
        care_episode_id,
        consultation_id,
        original_payment_id,
        amount: finalAmount,
        reason: reasonCategory,
        notes: notes.trim(),
        channel,
        offline_reference: offlineUtr.trim(),
        admin_id: "admin"
      };

      const res = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`Refund of ₹${finalAmount.toLocaleString("en-IN")} initiated!`);
        onSuccess();
        onClose();
      } else {
        throw new Error(json.message || "Failed to initiate refund");
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#0067A1]/10 text-[#0067A1] rounded-md shadow-2xs">
              <IndianRupee size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Issue Refund
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select authentic transaction or enter reference
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 pt-3 pb-2 flex gap-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => { setActiveTab("select"); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "select"
                ? "bg-[#0067A1] text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Select from Transactions
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("manual"); setSelectedTxn(null); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "manual"
                ? "bg-[#0067A1] text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Manual Reference
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === "select" ? (
            <div>
              {!selectedTxn ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search by patient, UNID, payment reference..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1] shadow-2xs"
                    />
                  </div>

                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Eligible Successful Transactions ({txns.length})
                  </p>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {loadingTxns ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-[#0067A1]" />
                        Loading verified transactions...
                      </div>
                    ) : txns.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-md">
                        No transactions found matching search.
                      </div>
                    ) : (
                      txns.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTxn(t);
                            setCustomAmount(t.amount);
                          }}
                          className="p-3 rounded-md border border-slate-200/80 dark:border-slate-700 hover:border-[#0067A1] hover:bg-[#0067A1]/5 dark:hover:bg-[#0067A1]/10 cursor-pointer transition-all flex items-center justify-between text-xs shadow-2xs hover:shadow-sm"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {t.patient_name || "Patient"}
                              </span>
                              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                {formatPatientUnId(t.patient_un_id)}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/40 text-[#0067A1]">
                                {t.service_type || "service"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {t.payment_gateway_id || "Offline / System ID"} • {new Date(t.created_at).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">
                              ₹{Number(t.amount || 0).toLocaleString("en-IN")}
                            </p>
                            <span className="text-[10px] text-[#0067A1] font-semibold flex items-center gap-0.5 justify-end">
                              Select <ArrowRight size={10} />
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* Selected Transaction Banner */
                <div className="p-3.5 rounded-md border border-[#0067A1]/30 bg-[#0067A1]/5 dark:bg-[#0067A1]/10 flex items-center justify-between shadow-2xs">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {selectedTxn.patient_name}
                      </span>
                      <span className="font-mono text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200 dark:border-slate-700">
                        {formatPatientUnId(selectedTxn.patient_un_id)}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-[#0067A1]">
                        {selectedTxn.service_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Ref: {selectedTxn.payment_gateway_id || selectedTxn.id}
                    </p>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Paid: ₹{Number(selectedTxn.amount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTxn(null)}
                    className="text-xs text-[#0067A1] hover:underline font-semibold"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Manual Tab Inputs */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Patient User ID (UUID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. c9295209-57ff-422f-91c7-36992a4330fc"
                  value={manualPatientId}
                  onChange={(e) => setManualPatientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-[#0067A1] shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Payment / Gateway Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. pay_TnIu21Z9MJ5nIE"
                  value={manualPaymentId}
                  onChange={(e) => setManualPaymentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-[#0067A1] shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Refund Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-[#0067A1] shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* Refund Terms Configuration (Only when ready) */}
          {(selectedTxn || activeTab === "manual") && (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Refund Type */}
              {activeTab === "select" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Refund Amount
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRefundType("full")}
                      className={`p-2.5 rounded-md border text-xs font-semibold text-left transition-all shadow-2xs ${
                        refundType === "full"
                          ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Full Refund (₹{Number(selectedTxn?.amount || 0).toLocaleString("en-IN")})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundType("partial")}
                      className={`p-2.5 rounded-md border text-xs font-semibold text-left transition-all shadow-2xs ${
                        refundType === "partial"
                          ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Partial Refund
                    </button>
                  </div>
                  {refundType === "partial" && (
                    <div className="mt-2">
                      <input
                        type="number"
                        placeholder={`Enter amount (max ₹${selectedTxn?.amount})`}
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-[#0067A1] shadow-2xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Settlement Channel */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Refund Channel
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChannel("GATEWAY")}
                    className={`p-2.5 rounded-md border text-xs font-semibold text-left transition-all shadow-2xs ${
                      channel === "GATEWAY"
                        ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <p>Gateway Reversal</p>
                    <span className="text-[10px] text-slate-400 font-normal">Reverses to card/UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel("OFFLINE_BANK")}
                    className={`p-2.5 rounded-md border text-xs font-semibold text-left transition-all shadow-2xs ${
                      channel === "OFFLINE_BANK"
                        ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <p>Bank Transfer / NEFT</p>
                    <span className="text-[10px] text-slate-400 font-normal">Direct manual payout</span>
                  </button>
                </div>
                {channel === "OFFLINE_BANK" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Bank UTR / Transaction Reference Number *"
                      value={offlineUtr}
                      onChange={(e) => setOfflineUtr(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-[#0067A1] shadow-2xs"
                    />
                  </div>
                )}
              </div>

              {/* Reason Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Reason Category
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-[#0067A1] shadow-2xs"
                >
                  {REASON_CATEGORIES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audit Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Internal Remarks / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add notes for clinical or accounting audit..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-[#0067A1] shadow-2xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <p className="text-xs text-slate-500 font-mono">
            {targetAmount > 0 && `Total: ₹${targetAmount.toLocaleString("en-IN")}`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || (!selectedTxn && activeTab === "select")}
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#0067A1] hover:bg-[#005585] text-white text-xs font-semibold rounded-md transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Refund"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Refund Detail Drawer / Modal
// ─────────────────────────────────────────────────────────────────────────────
function RefundDetailModal({ item, onClose, onRefresh }) {
  const [resolving, setResolving] = useState(false);
  const [utr, setUtr] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);

  if (!item) return null;

  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;

  const handleMarkResolved = async () => {
    if (!utr.trim()) {
      toast.error("Please provide UTR or Payment Reference");
      return;
    }
    setResolving(true);
    try {
      const res = await fetch("/api/admin/refunds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refund_id: item.id,
          status: "COMPLETED",
          utr_reference: utr.trim(),
          notes: "Manually marked resolved with bank UTR"
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Refund marked as COMPLETED");
        onRefresh();
        onClose();
      } else {
        throw new Error(json.message);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              #{item.id.slice(0, 8)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Amount Box */}
          <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Refund Amount
              </p>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                ₹{Number(item.amount || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-400 space-y-0.5">
              <p>Initiated: {item.initiated_by || "admin"}</p>
              <p>{item.created_at ? new Date(item.created_at).toLocaleString("en-IN") : "—"}</p>
            </div>
          </div>

          {/* Patient Details */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Patient Information
            </p>
            <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-2xs">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.patient_name || "Patient"}
                </p>
                <p className="font-mono text-slate-400 text-[11px]">
                  {formatPatientUnId(item.patient_un_id)} {item.patient_phone && `• ${item.patient_phone}`}
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                UUID: {item.patient_id?.slice(0, 8)}...
              </span>
            </div>
          </div>

          {/* Transaction References */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Original Payment ID</p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                {item.original_payment_id || "—"}
              </p>
            </div>
            <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Gateway Refund / UTR</p>
              <p className="font-mono font-bold text-[#0067A1] mt-1 truncate">
                {item.razorpay_refund_id || item.gateway_response?.utr_reference || "—"}
              </p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Refund Reason
            </p>
            <p className="p-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40">
              {item.reason || "No reason recorded"}
            </p>
          </div>

          {/* Failure Resolution Form */}
          {item.status === "FAILED" && (
            <div className="p-3.5 rounded-md bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 space-y-2 shadow-2xs">
              <p className="font-semibold text-rose-800 dark:text-rose-300 text-xs">
                Gateway Reversal Failed
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                {item.gateway_response?.error || "Transaction was rejected or not recognized by payment gateway."}
              </p>
              {!showManualForm ? (
                <button
                  type="button"
                  onClick={() => setShowManualForm(true)}
                  className="mt-1 text-xs text-[#0067A1] font-semibold hover:underline"
                >
                  Mark as Resolved via Offline Bank UTR
                </button>
              ) : (
                <div className="pt-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Enter Bank Transfer UTR / Ref Number"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none shadow-2xs"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowManualForm(false)}
                      className="px-2.5 py-1 text-xs text-slate-500 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={resolving}
                      onClick={handleMarkResolved}
                      className="px-3 py-1 bg-[#0067A1] text-white text-xs font-semibold rounded-md hover:bg-[#005585] shadow-xs"
                    >
                      {resolving ? "Saving..." : "Confirm Settlement"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-150 dark:border-slate-800 flex justify-end bg-slate-50/70 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Refunds Page
// ─────────────────────────────────────────────────────────────────────────────
export default function RefundsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(status && { status }),
        ...(search.trim() && { search: search.trim() }),
        ...(dateFilter && dateFilter !== "all" && { date_filter: dateFilter }),
      });
      const res = await fetch(`/api/admin/refunds?${p}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.message);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, status, search, dateFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced search
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <main className="flex-1 overflow-auto bg-slate-50/60 dark:bg-slate-950/60 min-h-screen text-slate-800 dark:text-slate-200">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0067A1] rounded-lg text-white shadow-sm">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Refunds
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live payment reversals, gateway settlement tracking, and patient dispute resolution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              title="Refresh Records"
              className="p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-sm hover:shadow"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowIssueModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0067A1] hover:bg-[#005585] text-white rounded-md font-semibold text-xs transition-all shadow-sm hover:shadow"
            >
              <Plus size={15} />
              Issue Refund
            </button>
          </div>
        </div>

        {/* Soft Metrics Row */}
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <SoftStatCard
              label="Pending Approval"
              value={data.summary.pending || 0}
              sub="Awaiting review"
              icon={Clock}
              tone="amber"
            />
            <SoftStatCard
              label="In Processing"
              value={data.summary.processing || 0}
              sub="Queued with gateway"
              icon={RefreshCw}
              tone="sky"
            />
            <SoftStatCard
              label="Settled"
              value={data.summary.completed || 0}
              sub="Successfully reversed"
              icon={CheckCircle2}
              tone="emerald"
            />
            <SoftStatCard
              label="Total Disbursed"
              value={`₹${Number(data.summary.total_refunded || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
              sub="Cumulative volume"
              icon={IndianRupee}
              tone="indigo"
            />
          </div>
        )}

        {/* Search, Filter & Segmentation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-sm">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "", label: "All" },
              { id: "PENDING", label: "Pending" },
              { id: "PROCESSING", label: "Processing" },
              { id: "COMPLETED", label: "Completed" },
              { id: "FAILED", label: "Failed" },
            ].map((tab) => {
              const active = status === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatus(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#0067A1] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search & Date Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search patient, payment ID..."
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-[#0067A1] focus:bg-white transition-all shadow-2xs"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setPage(1); }}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none shadow-2xs"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-24 text-center">
              <RefreshCw size={22} className="animate-spin mx-auto text-[#0067A1] mb-2" />
              <p className="text-xs text-slate-400">Loading ledger records...</p>
            </div>
          ) : !data?.items || data.items.length === 0 ? (
            <div className="py-20 px-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 dark:bg-slate-800 shadow-2xs flex items-center justify-center text-slate-400 mb-3">
                <ShieldCheck size={24} className="text-[#0067A1]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Refund Records Found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {status || search
                  ? "No refund records match your selected filter or search keyword."
                  : "All patient transactions and provider settlements are in good standing with zero active disputes."}
              </p>
              <button
                type="button"
                onClick={() => setShowIssueModal(true)}
                className="mt-4 px-3.5 py-1.5 bg-[#0067A1] text-white rounded-md text-xs font-semibold hover:bg-[#005585] transition-all shadow-sm hover:shadow inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                Issue Refund
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Payment Reference</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {data.items.map((item) => {
                    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => setActiveItem(item)}
                      >
                        {/* Date */}
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                          <span className="block text-[10px] text-slate-400">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.patient_name || "Patient"}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {formatPatientUnId(item.patient_un_id)}
                          </div>
                        </td>

                        {/* Payment ID */}
                        <td className="px-4 py-3 font-mono">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="truncate max-w-[130px]" title={item.original_payment_id}>
                              {item.original_payment_id || "—"}
                            </span>
                            {item.original_payment_id && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(item.original_payment_id);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                title="Copy ID"
                              >
                                <Copy size={11} />
                              </button>
                            )}
                          </div>
                          {item.razorpay_refund_id && (
                            <span className="text-[10px] text-[#0067A1] block truncate max-w-[130px]">
                              Refund: {item.razorpay_refund_id}
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 font-mono whitespace-nowrap">
                          ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                        </td>

                        {/* Reason */}
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-slate-600 dark:text-slate-300 truncate font-medium">
                            {item.reason || "—"}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            By: {item.initiated_by || "System"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${cfg.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveItem(item);
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#0067A1] hover:bg-[#0067A1]/10 transition-colors"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <p>{data.pagination.total} records total</p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <span className="font-mono">
                  Page {page} of {data.pagination.totalPages}
                </span>
                <button
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showIssueModal && (
        <IssueRefundModal
          onClose={() => setShowIssueModal(false)}
          onSuccess={fetchData}
        />
      )}

      {activeItem && (
        <RefundDetailModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onRefresh={fetchData}
        />
      )}
    </main>
  );
}
