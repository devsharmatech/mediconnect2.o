"use client";

import { useEffect, useState } from "react";
import {
  FaFlask,
  FaMicroscope,
  FaSearch,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaFileMedical,
  FaEye,
  FaLock,
  FaExternalLinkAlt,
  FaShieldAlt,
  FaBuilding,
  FaUserNurse,
  FaDownload,
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";
import MedicalDocumentViewerModal from "@/components/public-site/ui/MedicalDocumentViewerModal";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-50 text-amber-700 border-amber-200/80",
    icon: FaClock,
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    icon: FaCheckCircle,
  },
  technician_assigned: {
    label: "Technician Assigned",
    color: "bg-sky-50 text-[#0067A1] border-sky-200/80",
    icon: FaUserNurse,
  },
  sent_to_lab: {
    label: "Sent to Lab",
    color: "bg-sky-50 text-sky-700 border-sky-200/80",
    icon: FaFlask,
  },
  sample_collected: {
    label: "Sample Collected",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    icon: FaMicroscope,
  },
  collected: {
    label: "Sample Collected",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    icon: FaMicroscope,
  },
  processing: {
    label: "Processing",
    color: "bg-purple-50 text-purple-700 border-purple-200/80",
    icon: FaMicroscope,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    icon: FaCheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-rose-50 text-rose-700 border-rose-200/80",
    icon: FaTimes,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-rose-50 text-rose-700 border-rose-200/80",
    icon: FaTimes,
  },
};

function formatOrderUnid(unid) {
  if (unid == null) return "-";
  const num = Number(unid);
  if (Number.isNaN(num)) return String(unid);
  return `MED${String(num).padStart(5, "0")}`;
}

export default function LabReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [savingToLocker, setSavingToLocker] = useState(null);
  const [previewReport, setPreviewReport] = useState(null);

  const handleSaveToDigiLocker = async (report, order) => {
    const patientId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!patientId) {
      toast.error("Please log in to save documents to your DigiLocker.");
      return;
    }

    try {
      setSavingToLocker(report.id || order.id);
      const res = await fetch("/api/patients/lab-reports/save-to-digilocker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          report_id: report.id,
          order_id: order.id,
          report_url: report.report_url,
          document_name: `Lab Report: ${order.unid ? `#${order.unid}` : ""} - ${order.lab_name || "Diagnostic Lab"}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Report saved to your MediConnect DigiLocker!");
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id ? { ...o, saved_in_digilocker: true } : o
          )
        );
        if (selectedOrder && selectedOrder.id === order.id) {
          setSelectedOrder((prev) => ({ ...prev, saved_in_digilocker: true }));
        }
      } else {
        toast.error(data.message || "Failed to save to DigiLocker");
      }
    } catch (e) {
      toast.error("Network error saving to DigiLocker");
    } finally {
      setSavingToLocker(null);
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError("");

        const patientId =
          typeof window !== "undefined" ? localStorage.getItem("userId") : null;

        if (!patientId) {
          setOrders([]);
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/patients/orders/lab/get?patient_id=${patientId}`);
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.message || "Failed to load lab reports");
        }

        setOrders(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        console.error("Lab reports fetch error:", e);
        setError(e.message || "Failed to load lab reports");
        toast.error("Failed to load lab reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const getStatusInfo = (status) => {
    if (!status) return STATUS_CONFIG.pending;
    return (
      STATUS_CONFIG[status] || {
        label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        color: "bg-slate-100 text-slate-700 border-slate-200",
        icon: FaClock,
      }
    );
  };

  const filteredOrders = orders.filter((order) => {
    const tests = order.lab_test_order_items || [];
    const query = searchQuery.trim().toLowerCase();

    if (statusFilter !== "all" && order.status !== statusFilter) return false;

    if (!query) return true;

    const rawId = order.unid ?? order.id;
    const formattedId = rawId != null ? formatOrderUnid(rawId).toLowerCase() : "";
    const rawIdStr = rawId != null ? String(rawId).toLowerCase() : "";
    const idMatch =
      !!rawId && (rawIdStr.includes(query) || formattedId.includes(query));
    const anyTestMatch = tests.some((t) =>
      (t.test_name || "").toLowerCase().includes(query)
    );

    return idMatch || anyTestMatch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 sm:py-8">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Lab Reports
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            View and track your lab test orders and verified diagnostic results
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="Search by test name or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl shadow-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] text-xs sm:text-sm text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "technician_assigned", label: "Technician" },
              { id: "approved", label: "Approved" },
              { id: "processing", label: "Processing" },
              { id: "completed", label: "Completed" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-[#0067A1] text-white border-[#0067A1] shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingScreen message="Loading lab reports..." submessage="Fetching your test results" />
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 text-center max-w-lg mx-auto">
            <p className="text-sm font-semibold text-rose-600 mb-1">{error}</p>
            <p className="text-xs text-slate-500">Please try again later.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState hasSearch={!!searchQuery} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredOrders.map((order) => (
              <ReportCard
                key={order.id}
                order={order}
                onView={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <ReportDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSaveToLocker={handleSaveToDigiLocker}
          savingToLocker={savingToLocker}
          onPreviewReport={(rep) => setPreviewReport(rep)}
        />
      )}

      {previewReport && (
        <MedicalDocumentViewerModal
          isOpen={!!previewReport}
          onClose={() => setPreviewReport(null)}
          doc={previewReport}
        />
      )}
    </div>
  );
}

function ReportCard({ order, onView }) {
  const statusInfo = getStatusForOrder(order);
  const tests = order.lab_test_order_items || [];
  const reports = order.reports || [];
  const hasReports = reports.length > 0;
  const visitType = order.visit_type;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#0067A1]/40 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Top Header: Order ID + Status Badge */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center shrink-0">
              <FaFileMedical className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order ID</span>
              <p className="text-sm font-bold text-slate-900 truncate">
                {formatOrderUnid(order.unid)}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 ${statusInfo.color}`}
            >
              <statusInfo.icon className="w-3 h-3" />
              <span>{statusInfo.label}</span>
            </span>
            {hasReports && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <FaShieldAlt className="w-2.5 h-2.5 text-emerald-600" />
                Report Ready
              </span>
            )}
          </div>
        </div>

        {/* Card Details */}
        <div className="pt-3.5 space-y-3 flex-1">
          {/* Date & Visit Type row */}
          <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <FaCalendarAlt className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {order.created_at
                  ? new Date(order.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
            {visitType && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 capitalize">
                {visitType.replace(/_/g, " ")}
              </span>
            )}
          </div>

          {/* Tests List & Count */}
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Prescribed Tests
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0067A1]/10 text-[#0067A1]">
                {tests.length} {tests.length === 1 ? "Test" : "Tests"}
              </span>
            </div>
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
              {tests.length > 0
                ? tests.map((t) => t.test_name).filter(Boolean).join(", ")
                : "No tests specified"}
            </p>
          </div>

          {/* Lab Information */}
          {order.lab_name && (
            <div className="flex items-center gap-2 text-xs text-slate-600 pt-0.5">
              <FaBuilding className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 text-[11px] mr-1">Lab:</span>
                <span className="font-semibold text-slate-800">{order.lab_name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Button */}
        <div className="pt-4 mt-auto border-t border-slate-100">
          <button
            type="button"
            onClick={onView}
            className={`w-full py-2.5 px-4 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-sm ${
              hasReports
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-[#0067A1] hover:bg-[#005282] text-white"
            }`}
          >
            <FaEye className="w-3.5 h-3.5" />
            <span>{hasReports ? "View Report" : "View Details"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function getStatusForOrder(order) {
  const base = (order?.status || "pending").toLowerCase();
  return (
    STATUS_CONFIG[base] || {
      label: base.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      color: "bg-slate-100 text-slate-700 border-slate-200",
      icon: FaClock,
    }
  );
}

function ReportDetailsModal({ order, onClose, onSaveToLocker, savingToLocker, onPreviewReport }) {
  const tests = order.lab_test_order_items || [];
  const reports = order.reports || [];
  const statusInfo = getStatusForOrder(order);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white text-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center shrink-0">
              <FaFileMedical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Order {formatOrderUnid(order.unid)}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${statusInfo.color}`}
                >
                  <statusInfo.icon className="w-2.5 h-2.5" />
                  <span>{statusInfo.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {order.lab_name ? `${order.lab_name} • ` : ""}
                {order.created_at
                  ? new Date(order.created_at).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-5 py-4 flex-1 overflow-y-auto space-y-4">
          {/* Diagnostic Reports Section (if uploaded) */}
          {reports.length > 0 ? (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-emerald-900 flex items-center gap-2">
                  <FaShieldAlt className="w-4 h-4 text-emerald-600" />
                  Diagnostic Reports Available
                </h3>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Verified Lab Results
                </span>
              </div>

              <div className="space-y-3">
                {reports.map((rep, idx) => (
                  <div
                    key={rep.id || idx}
                    className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {rep.test_type || "Diagnostic Test Report"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Issued on: {new Date(rep.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-[#0067A1] border border-sky-100">
                        {rep.report_url?.toLowerCase().endsWith(".pdf") ? "PDF Document" : "Report Image"}
                      </span>
                    </div>

                    {rep.result_summary && (
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <strong>Findings:</strong> {rep.result_summary}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onPreviewReport(rep)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1] hover:bg-[#005282] text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
                      >
                        <FaEye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <a
                        href={rep.report_url}
                        download={rep.test_name || "report"}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-xs hover:shadow-sm transition-all cursor-pointer"
                      >
                        <FaDownload className="w-3 h-3 text-[#0067A1]" />
                        <span>Download</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => onSaveToLocker(rep, order)}
                        disabled={savingToLocker === (rep.id || order.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border shadow-xs hover:shadow-sm cursor-pointer ${
                          order.saved_in_digilocker
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        }`}
                      >
                        <FaLock className="w-3 h-3 text-emerald-600" />
                        <span>
                          {order.saved_in_digilocker
                            ? "Saved ✓"
                            : savingToLocker === (rep.id || order.id)
                            ? "Saving..."
                            : "Save to DigiLocker"}
                        </span>
                      </button>

                      <Link
                        href="/digital-locker"
                        className="text-[11px] text-[#0067A1] hover:underline font-semibold ml-auto flex items-center gap-1"
                      >
                        <span>DigiLocker</span>
                        <FaExternalLinkAlt className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3.5 flex items-center gap-3">
              <FaClock className="w-5 h-5 text-[#0067A1] shrink-0" />
              <div className="text-xs text-sky-950">
                <p className="font-semibold">Lab report is being prepared</p>
                <p className="text-sky-800 mt-0.5">
                  Once {order.lab_name || "the laboratory"} completes testing and uploads your results, you will receive an instant notification and your verified report will be accessible here.
                </p>
              </div>
            </div>
          )}

          {order.patient_notes && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-700">
              <p className="font-bold text-slate-800 mb-0.5">Your Notes</p>
              <p>{order.patient_notes}</p>
            </div>
          )}

          {order.lab_notes && (
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs text-slate-700">
              <p className="font-bold text-slate-800 mb-0.5">Lab Instructions</p>
              <p>{order.lab_notes}</p>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FaMicroscope className="w-3.5 h-3.5 text-[#0067A1]" />
              Tests in this order
            </h3>
            {tests.length === 0 ? (
              <p className="text-xs text-slate-500">No tests added to this order.</p>
            ) : (
              <div className="space-y-1.5">
                {tests.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-slate-50/80 border border-slate-100 rounded-xl px-3.5 py-2.5"
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">
                        {t.test_name || "Lab test"}
                      </p>
                      {t.status && (
                        <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                          Status: {String(t.status).replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                    {t.price != null && (
                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        ₹{Number(t.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <Link
            href="/digital-locker"
            className="text-xs text-[#0067A1] font-semibold hover:underline flex items-center gap-1"
          >
            <FaLock className="w-3 h-3" />
            <span>Open DigiLocker</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasSearch }) {
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-10 text-center max-w-md mx-auto">
      <div className="flex justify-center mb-3">
        <div className="p-4 bg-[#0067A1]/10 rounded-2xl text-[#0067A1]">
          <FaFlask className="h-8 w-8" />
        </div>
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">
        {hasSearch ? "No matching lab reports" : "No lab reports yet"}
      </h3>
      <p className="text-xs text-slate-500">
        {hasSearch
          ? "Try changing your search keywords or filters."
          : "Your diagnostic orders and lab test reports will appear here."}
      </p>
    </div>
  );
}
