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
  FaEye 
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-50 text-amber-800 border-amber-200",
    icon: FaClock,
  },
  sent_to_lab: {
    label: "Sent to Lab",
    color: "bg-sky-50 text-sky-800 border-sky-200",
    icon: FaFlask,
  },
  sample_collected: {
    label: "Sample Collected",
    color: "bg-indigo-50 text-indigo-800 border-indigo-200",
    icon: FaMicroscope,
  },
  processing: {
    label: "Processing",
    color: "bg-purple-50 text-purple-800 border-purple-200",
    icon: FaMicroscope,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: FaCheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-50 text-red-800 border-red-200",
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
    return STATUS_CONFIG[status] || {
      label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: FaClock,
    };
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
    <div className="min-h-screen bg-[#F6F8FA] py-5">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
              Lab Reports
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              View and track your lab test orders and results
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by test name or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white rounded-xl shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1] text-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "processing", label: "Processing" },
              { id: "completed", label: "Completed" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                  statusFilter === f.id
                    ? "bg-[#0067A1] text-white border-[#0067A1]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-[#0067A1]/60"
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
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <p className="text-xs text-gray-500">
              Please try again later.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState hasSearch={!!searchQuery} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
        />
      )}
    </div>
  );
}

function ReportCard({ order, onView }) {
  const statusInfo = getStatusForOrder(order);
  const tests = order.lab_test_order_items || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      <div className="h-1.5 bg-[#0067A1]" />
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#0067A1]/10 text-[#0067A1]">
              <FaFileMedical className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Order ID</p>
              <p className="text-sm font-semibold text-gray-900">{formatOrderUnid(order.unid)}</p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${statusInfo.color}`}
          >
            <statusInfo.icon className="w-3 h-3" />
            <span>{statusInfo.label}</span>
          </span>
        </div>

        <div className="mb-3 space-y-1">
          <div className="flex items-center text-xs text-gray-600">
            <FaCalendarAlt className="w-3 h-3 mr-2 text-[#0067A1]" />
            <span>
              {order.created_at
                ? new Date(order.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "-"}
            </span>
          </div>
          <p className="text-xs text-gray-600">
            {tests.length > 0
              ? `${tests.length} test${tests.length > 1 ? "s" : ""}`
              : "No tests added"}
          </p>
          {order.lab_notes && (
            <p className="text-[11px] text-gray-500 line-clamp-2">
              Lab notes: {order.lab_notes}
            </p>
          )}
        </div>

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onView}
            className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C] transition-colors flex items-center justify-center gap-1.5"
          >
            <FaEye className="w-3 h-3" />
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function getStatusForOrder(order) {
  const base = (order?.status || "pending").toLowerCase();
  return getStatusInfo(base);
}

function getStatusInfo(status) {
  if (!status) return STATUS_CONFIG.pending;
  const info = STATUS_CONFIG[status];
  if (info) return info;
  return {
    label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: FaClock,
  };
}

function ReportDetailsModal({ order, onClose }) {
  const tests = order.lab_test_order_items || [];
  const statusInfo = getStatusForOrder(order);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#0067A1] text-white">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FaFileMedical className="w-5 h-5" />
              Lab Test Order {formatOrderUnid(order.unid)}
            </h2>
            <p className="text-xs text-emerald-100 mt-0.5">
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

          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${statusInfo.color}`}
          >
            <statusInfo.icon className="w-3 h-3" />
            <span>{statusInfo.label}</span>
          </span>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
          {order.patient_notes && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">Your notes</p>
              <p>{order.patient_notes}</p>
            </div>
          )}

          {order.lab_notes && (
            <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">Lab notes</p>
              <p>{order.lab_notes}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FaMicroscope className="w-4 h-4 text-[#0067A1]" />
              Tests in this order
            </h3>
            {tests.length === 0 ? (
              <p className="text-xs text-gray-500">No tests added to this order.</p>
            ) : (
              <div className="space-y-2">
                {tests.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t.test_name || "Lab test"}
                      </p>
                      {t.status && (
                        <p className="text-[11px] text-gray-500 mt-0.5 capitalize">
                          Status: {String(t.status).replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                    {t.price != null && (
                      <p className="text-sm font-semibold text-gray-800">
                        ₹{Number(t.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100"
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
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 p-10 text-center">
      <div className="flex justify-center mb-4">
        <div className="p-5 bg-[#0067A1]/5 rounded-full">
          <FaFlask className="h-10 w-10 text-[#0067A1]" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {hasSearch ? "No matching lab reports" : "No lab reports yet"}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {hasSearch
          ? "Try changing your search or filters."
          : "Your lab test results will appear here once they are ready."}
      </p>
    </div>
  );
}
