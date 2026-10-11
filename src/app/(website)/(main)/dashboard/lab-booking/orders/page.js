"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    FaFlask, FaArrowLeft, FaClock, FaCheckCircle, FaTimesCircle,
    FaWalking, FaReceipt, FaPhoneAlt, FaFileInvoice,
    FaCreditCard, FaHospital, FaHashtag, FaMapMarkerAlt,
    FaChevronDown, FaVial, FaTruck, FaFileAlt, FaDownload,
    FaShieldAlt, FaUserNurse, FaEye
} from "react-icons/fa";
import toast from "react-hot-toast";
import MedicalDocumentViewerModal from "@/components/public-site/ui/MedicalDocumentViewerModal";

const statusConfig = {
    pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "Confirmed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    technician_assigned: { label: "Technician Assigned", color: "bg-sky-50 text-[#0067A1] border-sky-200" },
    sent_to_lab: { label: "Sent to Lab", color: "bg-sky-50 text-sky-700 border-sky-200" },
    sample_collected: { label: "Sample Collected", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    collected: { label: "Sample Collected", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    processing: { label: "Processing", color: "bg-purple-50 text-purple-700 border-purple-200" },
    completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    report_uploaded: { label: "Report Ready", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    cancelled: { label: "Cancelled", color: "bg-rose-50 text-rose-700 border-rose-200" },
    failed: { label: "Failed", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

const paymentConfig = {
    paid: { label: "Paid", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: FaCheckCircle },
    pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: FaClock },
    failed: { label: "Failed", color: "text-rose-700", bg: "bg-rose-50 border-rose-200", icon: FaTimesCircle },
    refunded: { label: "Refunded", color: "text-[#0067A1]", bg: "bg-sky-50 border-sky-200", icon: FaReceipt },
};

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [orderDetails, setOrderDetails] = useState({});
    const [previewReport, setPreviewReport] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, [page]);

    const fetchOrders = async () => {
        setLoading(true);
        const patientId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
        if (!patientId) {
            toast.error("Please login first");
            router.push("/");
            return;
        }
        try {
            const res = await fetch(`/api/patient/lab/orders?patient_id=${patientId}&page=${page}&limit=10`);
            const data = await res.json();
            if (data.success) {
                setOrders(data.data?.orders || []);
                setTotalPages(data.data?.pagination?.totalPages || 1);
            }
        } catch {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderDetail = async (orderId) => {
        if (orderDetails[orderId]) return;
        const patientId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
        try {
            const res = await fetch(`/api/patient/lab/orders/${orderId}?patient_id=${patientId}`);
            const data = await res.json();
            if (data.success) {
                setOrderDetails(prev => ({ ...prev, [orderId]: data.data }));
            }
        } catch {
            toast.error("Failed to load order details");
        }
    };

    const toggleOrder = (orderId) => {
        if (expandedOrder === orderId) {
            setExpandedOrder(null);
        } else {
            setExpandedOrder(orderId);
            fetchOrderDetail(orderId);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric"
        });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    const formatOrderUnid = (unid) => {
        if (unid == null) return "—";
        const num = Number(unid);
        if (Number.isNaN(num)) return String(unid);
        return `MED${String(num).padStart(5, "0")}`;
    };

    // Download/Print Invoice
    const downloadInvoice = (order, detail) => {
        const labName = detail.lab_name || detail.lab_details?.lab_name || detail.order?.lab_name || detail.order?.lab_details?.lab_name || order.lab_details?.lab_name || "Diagnostic Laboratory";
        const labPhone = detail.lab_phone || detail.lab_details?.phone_number || detail.order?.lab_phone || detail.order?.lab_details?.phone_number || "";
        const labAddress = detail.lab_address || detail.lab_details?.address || detail.order?.lab_address || detail.order?.lab_details?.address || "";
        const orderId = formatOrderUnid(detail.unid || detail.order?.unid || order.unid);
        const invoiceDate = formatDate(detail.created_at || detail.order?.created_at || order.created_at);
        const total = detail.items?.reduce((sum, item) => sum + Number(item.price || 0), 0) || Number(detail.total_amount || order.total_amount || 0);
        const paymentStatus = (detail.payment_status || detail.order?.payment_status || order.payment_status || "pending").toUpperCase();
        const visitType = (detail.visit_type || detail.order?.visit_type || order.visit_type || "walk_in").replace(/_/g, " ").toUpperCase();

        const itemsRows = (detail.items || []).map((item, i) => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:13px">${i + 1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;font-size:13px">${item.test_name}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:12px">
              <span style="padding:3px 10px;border-radius:20px;font-weight:600;font-size:11px;background:${item.status === 'completed' ? '#dcfce7;color:#15803d' : item.status === 'rejected' ? '#fee2e2;color:#b91c1c' : '#fef3c7;color:#92400e'}">${(item.status || 'pending').replace(/_/g, ' ').toUpperCase()}</span>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;font-size:13px">₹${Number(item.price || 0).toLocaleString()}</td>
          </tr>
        `).join('');

        const html = `<!DOCTYPE html>
        <html><head><title>Tax Invoice - ${labName} - Order #${orderId}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI', Arial, sans-serif; color:#0f172a; background:#fff; line-height: 1.4; font-size: 13px; }
          @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .no-print { display:none!important; } }
          .container { max-width: 800px; margin: 0 auto; padding: 40px; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0067A1; padding-bottom: 20px; margin-bottom: 28px; }
          .lab-name { font-size: 22px; font-weight: 800; color: #0067A1; text-transform: uppercase; }
          .lab-contact { font-size: 13px; color: #475569; margin-top: 4px; }
          .invoice-title { font-size: 24px; font-weight: 800; color: #0f172a; text-align: right; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; rounded-xl; border-radius: 8px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .meta-row:last-child { margin-bottom: 0; }
          .meta-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .meta-value { font-size: 13px; font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 28px; border: 1px solid #e2e8f0; border-radius: 8px; }
          th { background: #f8fafc; padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; text-align: left; }
          .totals { margin-left: auto; width: 280px; margin-bottom: 30px; }
          .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
          .total-row.final { font-size: 16px; font-weight: 800; color: #0067A1; border-top: 2px solid #0067A1; border-bottom: none; padding-top: 10px; }
          .btn-print { background: #0067A1; color: #fff; padding: 10px 20px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; }
        </style>
        </head><body>
        <div class="container">
          <div class="header">
            <div>
              <div class="lab-name">${labName}</div>
              <div class="lab-contact">${labAddress || "Accredited Diagnostic Partner"}</div>
              ${labPhone ? `<div class="lab-contact">Phone: ${labPhone}</div>` : ""}
            </div>
            <div>
              <div class="invoice-title">TAX INVOICE</div>
              <div style="text-align:right;color:#64748b;font-size:12px;margin-top:4px;">#${orderId}</div>
            </div>
          </div>
          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-row"><span class="meta-label">Invoice Date</span><span class="meta-value">${invoiceDate}</span></div>
              <div class="meta-row"><span class="meta-label">Order Ref</span><span class="meta-value">${orderId}</span></div>
            </div>
            <div class="meta-box">
              <div class="meta-row"><span class="meta-label">Payment Status</span><span class="meta-value" style="color:${paymentStatus === 'PAID' ? '#16a34a' : '#d97706'}">${paymentStatus}</span></div>
              <div class="meta-row"><span class="meta-label">Collection Method</span><span class="meta-value">${visitType}</span></div>
            </div>
          </div>
          <table>
            <thead><tr><th style="width:40px;text-align:center">#</th><th>Test Description</th><th style="text-align:center">Status</th><th style="text-align:right">Price</th></tr></thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <div class="totals">
            <div class="total-row"><span>Total Payable</span><span style="font-weight:700">₹${total.toLocaleString()}</span></div>
            <div class="total-row final"><span>Grand Total</span><span>₹${total.toLocaleString()}</span></div>
          </div>
          <div class="no-print" style="text-align:center;margin-top:30px;">
            <button onclick="window.print()" class="btn-print">Print Invoice</button>
          </div>
        </div>
        </body></html>`;

        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); }
        else { toast.error("Please allow pop-ups to print invoice"); }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-6 sm:py-8">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
                {/* Page Navigation & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                    <div>
                        <button
                            type="button"
                            onClick={() => router.push("/dashboard/lab-booking")}
                            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#0067A1] text-xs font-bold transition-colors cursor-pointer mb-2 group"
                        >
                            <FaArrowLeft className="w-2.5 h-2.5 group-hover:-translate-x-1 transition-transform" />
                            <span>Browse Labs</span>
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            My Lab Orders
                        </h1>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">
                            Track order lifecycle, diagnostic processing, test results & official tax invoices
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.push("/lab-reports")}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-[#0067A1] hover:border-[#0067A1]/40 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                    >
                        <FaShieldAlt className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lab Reports Hub</span>
                    </button>
                </div>

                {/* Metrics Summary Strip */}
                {!loading && orders.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Placed</span>
                            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{orders.length}</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-xs bg-emerald-50/20">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Paid Orders</span>
                            <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
                                {orders.filter(o => o.payment_status === "paid").length}
                            </p>
                        </div>
                        <div className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-xs bg-amber-50/20">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Active / In-Transit</span>
                            <p className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">
                                {orders.filter(o => ["pending", "processing", "approved", "sent_to_lab", "sample_collected", "technician_assigned"].includes(o.status)).length}
                            </p>
                        </div>
                    </div>
                )}

                {/* Orders Content */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                                    <div className="space-y-2">
                                        <div className="h-4 bg-slate-200 rounded w-32" />
                                        <div className="h-3 bg-slate-100 rounded w-24" />
                                    </div>
                                </div>
                                <div className="h-5 bg-slate-200 rounded w-20" />
                            </div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 sm:p-14 text-center max-w-md mx-auto">
                        <div className="w-14 h-14 bg-[#0067A1]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#0067A1]">
                            <FaFlask className="w-6 h-6" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">No Orders Found</h3>
                        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                            You have not placed any diagnostic test orders yet. Browse our verified partner laboratories to schedule your tests.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push("/dashboard/lab-booking")}
                            className="mt-5 px-5 py-2.5 bg-[#0067A1] hover:bg-[#005282] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                            Browse Labs
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {orders.map((order) => {
                            const status = statusConfig[order.status] || statusConfig.pending;
                            const payment = paymentConfig[order.payment_status] || paymentConfig.pending;
                            const PayIcon = payment.icon;
                            const isExpanded = expandedOrder === order.id;
                            const detail = orderDetails[order.id];

                            return (
                                <div
                                    key={order.id}
                                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                                        isExpanded
                                            ? "border-[#0067A1] shadow-md ring-2 ring-[#0067A1]/10"
                                            : "border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm"
                                    }`}
                                >
                                    {/* Order Row Trigger */}
                                    <button
                                        type="button"
                                        onClick={() => toggleOrder(order.id)}
                                        className="w-full text-left p-4 sm:p-5 cursor-pointer flex items-center justify-between gap-3 sm:gap-4 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                                            {/* Order Icon */}
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                isExpanded ? "bg-[#0067A1] text-white shadow-xs" : "bg-[#0067A1]/10 text-[#0067A1]"
                                            }`}>
                                                <FaFlask className="w-5 h-5" />
                                            </div>

                                            {/* Meta Details */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="text-xs font-bold text-slate-900">
                                                        {formatOrderUnid(order.unid)}
                                                    </span>
                                                    <span className="text-slate-300">•</span>
                                                    <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                                                        {order.lab?.lab_name || order.lab_details?.lab_name || "Diagnostic Laboratory"}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${payment.bg} ${payment.color}`}>
                                                        <PayIcon className="w-2.5 h-2.5" />
                                                        <span>{payment.label}</span>
                                                    </span>
                                                    {order.visit_type && (
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 flex items-center gap-1 capitalize">
                                                            {order.visit_type === "home_collection" ? (
                                                                <><FaTruck className="w-2.5 h-2.5 text-slate-400" /> Home</>
                                                            ) : (
                                                                <><FaWalking className="w-2.5 h-2.5 text-slate-400" /> Walk-in</>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                    <FaClock className="w-2.5 h-2.5 text-slate-400" />
                                                    <span>{formatDate(order.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Total & Chevron */}
                                        <div className="flex items-center gap-3 shrink-0 pl-2">
                                            <div className="text-right">
                                                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total</span>
                                                <p className="text-sm sm:text-base font-extrabold text-slate-900">
                                                    ₹{Number(order.total_amount || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                                isExpanded ? "bg-[#0067A1] text-white rotate-180" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                            }`}>
                                                <FaChevronDown className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded Order Details */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 space-y-4">
                                            {!detail ? (
                                                <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-500">
                                                    <div className="w-4 h-4 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                                                    <span>Loading order details...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Top Info Grid */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {/* Order Metadata */}
                                                        <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2 text-xs">
                                                            <div className="flex items-center gap-1.5 font-bold text-slate-800 pb-2 border-b border-slate-100">
                                                                <FaHashtag className="w-3 h-3 text-[#0067A1]" />
                                                                <span>Order Specifications</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Order ID</span>
                                                                <span className="font-bold text-slate-900 font-mono">
                                                                    {formatOrderUnid(detail.order?.unid || order.unid)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Date Placed</span>
                                                                <span className="font-semibold text-slate-800">
                                                                    {formatDate(detail.order?.created_at || order.created_at)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Collection Type</span>
                                                                <span className="font-semibold text-slate-800">
                                                                    {(detail.order?.visit_type || order.visit_type) === "home_collection"
                                                                        ? "Home Sample Collection"
                                                                        : "Diagnostic Center Walk-in"}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Lab Details */}
                                                        {detail.order?.lab_details && (
                                                            <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2 text-xs">
                                                                <div className="flex items-center gap-1.5 font-bold text-slate-800 pb-2 border-b border-slate-100">
                                                                    <FaHospital className="w-3 h-3 text-[#0067A1]" />
                                                                    <span>Diagnostic Partner</span>
                                                                </div>
                                                                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                                                                    {detail.order.lab_details.lab_name}
                                                                </p>
                                                                {detail.order.lab_details.phone_number && (
                                                                    <p className="text-slate-600 flex items-center gap-1.5">
                                                                        <FaPhoneAlt className="w-2.5 h-2.5 text-slate-400" />
                                                                        <span>{detail.order.lab_details.phone_number}</span>
                                                                    </p>
                                                                )}
                                                                {detail.order.lab_details.address && (
                                                                    <p className="text-slate-600 flex items-start gap-1.5 leading-relaxed">
                                                                        <FaMapMarkerAlt className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                                                        <span>{detail.order.lab_details.address}</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Tests Ordered List */}
                                                    {detail.items?.length > 0 && (
                                                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                                                    <FaVial className="w-3 h-3 text-[#0067A1]" />
                                                                    <span>Tests Ordered ({detail.items.length})</span>
                                                                </h4>
                                                                {detail.reports?.length > 0 && (
                                                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold flex items-center gap-1">
                                                                        <FaCheckCircle className="w-2.5 h-2.5" /> {detail.reports.length} Report Ready
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="divide-y divide-slate-100 text-xs">
                                                                {detail.items.map((item, i) => {
                                                                    const itemReport = (item.reports && item.reports.length > 0) ? item.reports[0] : null;
                                                                    return (
                                                                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-2">
                                                                            <div className="flex items-center gap-2.5">
                                                                                <span className="w-5 h-5 bg-slate-100 rounded text-[10px] font-bold text-slate-600 flex items-center justify-center shrink-0">
                                                                                    {i + 1}
                                                                                </span>
                                                                                <div>
                                                                                    <span className="font-semibold text-slate-800">{item.test_name}</span>
                                                                                    {item.sample_type && (
                                                                                        <span className="text-[10px] text-slate-400 ml-2">
                                                                                            • {item.sample_type}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-3 self-end sm:self-auto">
                                                                                {itemReport ? (
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setPreviewReport(itemReport)}
                                                                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0067A1] hover:bg-[#005282] text-white rounded-lg text-[11px] font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                                                                                        >
                                                                                            <FaEye className="w-2.5 h-2.5" />
                                                                                            <span>View</span>
                                                                                        </button>
                                                                                        <a
                                                                                            href={itemReport.report_url}
                                                                                            download={itemReport.test_name || "report"}
                                                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 shadow-xs hover:shadow-sm transition-all cursor-pointer"
                                                                                            title="Download Report"
                                                                                        >
                                                                                            <FaDownload className="w-2.5 h-2.5 text-[#0067A1]" />
                                                                                        </a>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                                                                                        Processing
                                                                                    </span>
                                                                                )}
                                                                                <span className="font-bold text-slate-900 min-w-[70px] text-right">
                                                                                    ₹{Number(item.price || 0).toLocaleString()}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                <div className="flex items-center justify-between pt-3 font-bold">
                                                                    <span className="text-slate-600">Subtotal</span>
                                                                    <span className="text-[#0067A1] text-sm">
                                                                        ₹{detail.items.reduce((sum, item) => sum + Number(item.price || 0), 0).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Reports Download Card */}
                                                    {detail.reports && detail.reports.length > 0 && (
                                                        <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-4 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                                                                        <FaFileAlt className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xs font-bold text-slate-900">
                                                                            Delivered Test Reports ({detail.reports.length})
                                                                        </h4>
                                                                        <p className="text-[11px] text-slate-500">
                                                                            Verified reports synced to your MediConnect account
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => router.push("/digital-locker")}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-xs hover:shadow-sm transition-colors cursor-pointer"
                                                                >
                                                                    <FaShieldAlt className="w-2.5 h-2.5" />
                                                                    <span>DigiLocker</span>
                                                                </button>
                                                            </div>

                                                            <div className="space-y-2">
                                                                {detail.reports.map((rep, rIdx) => (
                                                                    <div
                                                                        key={rep.id || rIdx}
                                                                        className="bg-white rounded-xl border border-emerald-100 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs"
                                                                    >
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-bold text-slate-900">
                                                                                    {rep.test_type || rep.test_name || "Diagnostic Report"}
                                                                                </span>
                                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-50 text-[#0067A1] font-bold uppercase">
                                                                                    {rep.report_url?.toLowerCase().includes(".pdf") ? "PDF" : "Report"}
                                                                                </span>
                                                                            </div>
                                                                            {rep.result_summary && (
                                                                                <p className="text-[11px] text-slate-600 mt-0.5">
                                                                                    <strong>Findings:</strong> {rep.result_summary}
                                                                                </p>
                                                                            )}
                                                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                                                Delivered on {formatDateTime(rep.created_at)}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setPreviewReport(rep)}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1] hover:bg-[#005282] text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                                                                            >
                                                                                <FaEye className="w-3 h-3" />
                                                                                <span>View</span>
                                                                            </button>
                                                                            <a
                                                                                href={rep.report_url}
                                                                                download={rep.test_name || "report"}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-xs hover:shadow-sm transition-all cursor-pointer"
                                                                            >
                                                                                <FaDownload className="w-3 h-3 text-[#0067A1]" />
                                                                                <span>Download</span>
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Payment Details */}
                                                    <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                                            <FaCreditCard className="w-3 h-3 text-[#0067A1]" />
                                                            <span>Payment Information</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                            <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-100">
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Total</p>
                                                                <p className="text-sm sm:text-base font-extrabold text-[#0067A1]">
                                                                    ₹{Number(detail.total_amount || detail.order?.total_amount || order.total_amount || 0).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-100">
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Status</p>
                                                                <div className={`inline-flex items-center gap-1 font-bold text-xs mt-0.5 ${payment.color}`}>
                                                                    <PayIcon className="w-3 h-3" /> {payment.label}
                                                                </div>
                                                            </div>
                                                            <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-100">
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Method</p>
                                                                <p className="font-semibold text-slate-800 mt-0.5">Online Payment</p>
                                                            </div>
                                                            <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-100">
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Transaction ID</p>
                                                                <p className="font-mono text-[11px] text-slate-700 truncate mt-0.5" title={detail.razorpay_payment_id || detail.order?.razorpay_payment_id || order.razorpay_payment_id || ""}>
                                                                    {detail.razorpay_payment_id || detail.order?.razorpay_payment_id || order.razorpay_payment_id || "—"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Delivery / Visit Address */}
                                                    {(detail.delivery_address || detail.order?.delivery_address || order.delivery_address) && (
                                                        <div className="bg-white rounded-xl border border-slate-200 p-3 text-xs space-y-1">
                                                            <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                                                <FaMapMarkerAlt className="w-3 h-3 text-[#0067A1]" />
                                                                <span>Collection / Visit Address</span>
                                                            </p>
                                                            <p className="text-slate-600 leading-relaxed pl-4">
                                                                {(() => {
                                                                    const addr = detail.delivery_address || detail.order?.delivery_address || order.delivery_address;
                                                                    return typeof addr === "object"
                                                                        ? `${addr.full_address || ""}, ${addr.city || ""} ${addr.pincode ? "- " + addr.pincode : ""}`
                                                                        : addr;
                                                                })()}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Actions: Print Invoice */}
                                                    <div className="pt-2 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => downloadInvoice(order, detail)}
                                                            className="px-4 py-2 bg-[#0067A1] hover:bg-[#005282] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                                                        >
                                                            <FaFileInvoice className="w-3.5 h-3.5" />
                                                            <span>Print Invoice</span>
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs hover:shadow-sm"
                                >
                                    Previous
                                </button>
                                <span className="text-xs text-slate-500 font-semibold px-2">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(page + 1)}
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs hover:shadow-sm"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

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
