"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    FaFlask, FaArrowLeft, FaClock, FaCheckCircle, FaTimesCircle,
    FaHome, FaWalking, FaReceipt, FaPhoneAlt, FaFileInvoice,
    FaCreditCard, FaHospital, FaHashtag, FaMapMarkerAlt,
    FaChevronDown, FaChevronUp, FaVial, FaTrash, FaTruck
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const statusConfig = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
    approved: { label: "Confirmed", color: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
    sent_to_lab: { label: "Sent to Lab", color: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
    sample_collected: { label: "Sample Collected", color: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500" },
    processing: { label: "Processing", color: "bg-purple-100 text-purple-800", dot: "bg-purple-500" },
    completed: { label: "Completed", color: "bg-green-100 text-green-800", dot: "bg-green-500" },
    report_uploaded: { label: "Report Ready", color: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", dot: "bg-red-500" },
    failed: { label: "Failed", color: "bg-red-100 text-red-800", dot: "bg-red-500" },
};

const paymentConfig = {
    paid: { label: "Paid", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: FaCheckCircle },
    pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: FaClock },
    failed: { label: "Failed", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: FaTimesCircle },
    refunded: { label: "Refunded", color: "text-[#004F7C]", bg: "bg-blue-50 border-blue-200", icon: FaReceipt },
};

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [orderDetails, setOrderDetails] = useState({});

    useEffect(() => {
        fetchOrders();
    }, [page]);

    const fetchOrders = async () => {
        setLoading(true);
        const patientId = localStorage.getItem("userId");
        if (!patientId) {
            toast.error("Please login first");
            router.push("/website");
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
        const patientId = localStorage.getItem("userId");
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
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric"
        });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    // Download/Print Invoice
    const downloadInvoice = (order, detail) => {
        const labName = detail.lab_name || detail.lab_details?.lab_name || detail.order?.lab_name || detail.order?.lab_details?.lab_name || order.lab_details?.lab_name || "Laboratory";
        const labPhone = detail.lab_phone || detail.lab_details?.phone_number || detail.order?.lab_phone || detail.order?.lab_details?.phone_number || "";
        const labAddress = detail.lab_address || detail.lab_details?.address || detail.order?.lab_address || detail.order?.lab_details?.address || "";
        const orderId = detail.unid || detail.order?.unid || order.unid || order.id?.slice(0, 8);
        const invoiceDate = formatDate(detail.created_at || detail.order?.created_at || order.created_at);
        const total = detail.items?.reduce((sum, item) => sum + Number(item.price || 0), 0) || Number(detail.total_amount || order.total_amount || 0);
        const paymentStatus = (detail.payment_status || detail.order?.payment_status || order.payment_status || "pending").toUpperCase();
        const razorpayId = detail.razorpay_payment_id || detail.order?.razorpay_payment_id || order.razorpay_payment_id || "";
        const visitType = (detail.visit_type || detail.order?.visit_type || order.visit_type || "walk_in").replace(/_/g, " ").toUpperCase();

        const itemsRows = (detail.items || []).map((item, i) => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px">${i + 1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:500;color:#111827;font-size:13px">${item.test_name}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px">
              <span style="padding:3px 10px;border-radius:20px;font-weight:600;font-size:11px;background:${item.status === 'completed' ? '#dcfce7;color:#15803d' : item.status === 'rejected' ? '#fee2e2;color:#b91c1c' : '#fef3c7;color:#92400e'}">${(item.status || 'pending').replace(/_/g, ' ').toUpperCase()}</span>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;font-size:13px">₹${Number(item.price || 0).toLocaleString()}</td>
          </tr>
        `).join('');        const html = `<!DOCTYPE html>
        <html><head><title>Tax Invoice - ${labName} - Order #${orderId}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Helvetica Neue', 'Arial', sans-serif; color:#1f2937; background:#fff; line-height: 1.4; font-size: 13px; }
          @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .no-print { display:none!important; } }
          
          .container { max-width: 800px; margin: 0 auto; padding: 40px; background: #fff; min-height: 100vh; position: relative; }
          
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 24px; margin-bottom: 32px; gap: 30px; }
          .lab-info { display: flex; flex-direction: column; gap: 6px; max-width: 60%; }
          .lab-name { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; text-transform: uppercase; line-height: 1.25; word-break: break-word; }
          .lab-contact { font-size: 13px; color: #4b5563; line-height: 1.5; }
          .invoice-title { font-size: 28px; font-weight: 300; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; text-align: right; min-width: 150px; }
          
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px; }
          .meta-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 6px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .meta-row:last-child { margin-bottom: 0; }
          .meta-label { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-value { font-size: 13px; font-weight: 600; color: #111827; text-align: right; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 32px; border: 1px solid #e5e7eb; }
          th { background: #111827; color: #ffffff; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 14px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #374151; vertical-align: middle; }
          tr:nth-child(even) td { background: #f9fafb; }
          
          .totals-wrapper { display: flex; justify-content: flex-end; }
          .totals { width: 320px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 6px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; color: #4b5563; }
          .total-row.final { border-top: 2px solid #111827; padding-top: 12px; margin-top: 12px; font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 0; }
          
          .auth-sign { margin-top: 60px; text-align: right; float: right; width: 220px; }
          .sign-line { width: 100%; border-top: 1px solid #111827; margin-bottom: 10px; }
          .sign-title { font-size: 12px; font-weight: 700; color: #111827; }
          .sign-sub { font-size: 11px; color: #6b7280; margin-top: 4px; word-break: break-word; line-height: 1.3; }
          
          .clear { clear: both; }
          .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 11px; color: #6b7280; text-align: center; line-height: 1.6; }
          
          .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 100px; font-weight: 900; color: rgba(17, 24, 39, 0.03); white-space: nowrap; z-index: -1; pointer-events: none; }
          
          .btn-print { padding: 12px 32px; background: #111827; color: #fff; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: opacity 0.2s; }
          .btn-print:hover { opacity: 0.9; }
        </style>
        </head><body>
        <div class="watermark">PAID IN FULL</div>
        <div class="container">
          <div class="header">
            <div class="lab-info">
              <div class="lab-name">${labName}</div>
              ${labAddress ? `<div class="lab-contact">📍 ${labAddress}</div>` : ''}
              ${labPhone ? `<div class="lab-contact">📞 ${labPhone}</div>` : ''}
              <div class="lab-contact">✉️ support@${labName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'lab'}.com</div>
            </div>
            <div class="invoice-title">Tax Invoice</div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-row">
                <div class="meta-label">Invoice Number</div>
                <div class="meta-value">INV-${orderId.toUpperCase()}</div>
              </div>
              <div class="meta-row">
                <div class="meta-label">Date of Issue</div>
                <div class="meta-value">${invoiceDate}</div>
              </div>
            </div>
            <div class="meta-box">
              <div class="meta-row">
                <div class="meta-label">Payment Status</div>
                <div class="meta-value" style="color: ${paymentStatus === 'PAID' ? '#059669' : '#dc2626'}">${paymentStatus}</div>
              </div>
              <div class="meta-row">
                <div class="meta-label">Collection Type</div>
                <div class="meta-value">${visitType}</div>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Description of Service / Test</th>
                <th style="text-align: center; width: 120px;">Status</th>
                <th style="text-align: right; width: 140px;">Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          
          <div class="totals-wrapper">
            <div class="totals">
              <div class="total-row">
                <span>Subtotal</span>
                <span style="font-weight: 600;">₹${total.toLocaleString()}</span>
              </div>
              <div class="total-row">
                <span>IGST (0% Medical Exemption)</span>
                <span style="font-weight: 600;">₹0</span>
              </div>
              <div class="total-row final">
                <span>Grand Total</span>
                <span>₹${total.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div class="auth-sign">
            <div class="sign-line"></div>
            <div class="sign-title">Authorized Signatory</div>
            <div class="sign-sub">${labName}</div>
          </div>
          <div class="clear"></div>
          
          <div class="footer">
            <p style="font-weight: 600; color: #374151;">Thank you for choosing ${labName}.</p>
            <p>This is a computer-generated invoice and does not require a physical signature.</p>
            <p style="margin-top: 8px;">Generated by ${labName}</p>
          </div>
          
          <div class="no-print" style="text-align:center; margin-top:40px;">
            <button onclick="window.print()" class="btn-print">
              🖨️ PRINT OFFICIAL INVOICE
            </button>
          </div>
        </div>
        </body></html>`;

        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); }
        else { toast.error("Please allow pop-ups to download invoice"); }
    };

    return (
        <div className="min-h-screen pb-20 pt-2 sm:pt-4">
            {/* Header Banner - Solid #0067A1, rounded-xl, no gradients, no heavy shadow */}
            <div className="bg-[#0067A1] text-white rounded-xl px-4 sm:px-6 py-4 sm:py-5 mb-5 border border-[#005585]">
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => router.push("/website/dashboard/lab-booking")}
                        className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer w-fit group"
                    >
                        <FaArrowLeft className="w-2.5 h-2.5 group-hover:-translate-x-1 transition-transform" />
                        Back to Labs
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 rounded-lg border border-white/20 flex items-center justify-center shrink-0">
                            <FaVial className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-tight truncate">
                                My Lab Orders
                            </h1>
                            <p className="text-white/80 text-xs mt-0.5 font-normal truncate">
                                Track orders, view payment status & download invoices
                            </p>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    {!loading && orders.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-white/15 text-center sm:text-left sm:flex sm:items-center sm:gap-8">
                            <div className="bg-white/10 sm:bg-transparent rounded-lg py-1.5 sm:py-0">
                                <p className="text-base sm:text-xl font-bold text-white">{orders.length}</p>
                                <p className="text-white/70 text-[10px] sm:text-xs font-normal">Total Orders</p>
                            </div>
                            <div className="hidden sm:block w-px h-7 bg-white/20" />
                            <div className="bg-white/10 sm:bg-transparent rounded-lg py-1.5 sm:py-0">
                                <p className="text-base sm:text-xl font-bold text-emerald-200">
                                    {orders.filter(o => o.payment_status === "paid").length}
                                </p>
                                <p className="text-white/70 text-[10px] sm:text-xs font-normal">Paid</p>
                            </div>
                            <div className="hidden sm:block w-px h-7 bg-white/20" />
                            <div className="bg-white/10 sm:bg-transparent rounded-lg py-1.5 sm:py-0">
                                <p className="text-base sm:text-xl font-bold text-amber-200">
                                    {orders.filter(o => ["pending", "processing", "approved", "sent_to_lab", "sample_collected"].includes(o.status)).length}
                                </p>
                                <p className="text-white/70 text-[10px] sm:text-xs font-normal">In Progress</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                                </div>
                                <div className="h-4 bg-slate-200 rounded w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
                    <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                        <FaFlask className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">No Orders Yet</h3>
                    <p className="text-gray-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                        You have not placed any lab test orders yet. Browse our verified partner laboratories to get started.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push("/website/dashboard/lab-booking")}
                        className="mt-5 px-5 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                        Browse Labs
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order, idx) => {
                        const status = statusConfig[order.status] || statusConfig.pending;
                        const payment = paymentConfig[order.payment_status] || paymentConfig.pending;
                        const PayIcon = payment.icon;
                        const isExpanded = expandedOrder === order.id;
                        const detail = orderDetails[order.id];

                        return (
                            <div
                                key={order.id}
                                className={`bg-white rounded-xl border transition-colors overflow-hidden ${
                                    isExpanded ? "border-[#0067A1] ring-1 ring-[#0067A1]/20" : "border-slate-200 hover:border-slate-300"
                                }`}
                            >
                                {/* Order Card Header / Trigger */}
                                <button
                                    type="button"
                                    onClick={() => toggleOrder(order.id)}
                                    className="w-full text-left p-4 sm:p-4.5 cursor-pointer flex items-center justify-between gap-3"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {/* Lab Flask Icon */}
                                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                            isExpanded ? "bg-[#0067A1] text-white" : "bg-[#0067A1]/10 text-[#0067A1]"
                                        }`}>
                                            <FaFlask className="w-4 h-4" />
                                        </div>

                                        {/* Lab & Meta Info */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                                    {order.lab?.lab_name || order.lab_details?.lab_name || "Diagnostic Lab"}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${status.color}`}>
                                                    {status.label}
                                                </span>
                                                <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${payment.bg} ${payment.color}`}>
                                                    <PayIcon className="w-2.5 h-2.5" /> {payment.label}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-normal">
                                                <span className="flex items-center gap-1">
                                                    <FaClock className="w-2.5 h-2.5 text-gray-400" />
                                                    {formatDate(order.created_at)}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    {order.visit_type === "home_collection" ? (
                                                        <><FaTruck className="w-2.5 h-2.5 text-gray-400" /> Home</>
                                                    ) : (
                                                        <><FaWalking className="w-2.5 h-2.5 text-gray-400" /> Walk-in</>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Price & Chevron */}
                                    <div className="flex items-center gap-2.5 shrink-0 pl-2">
                                        <div className="text-right">
                                            <p className="text-sm sm:text-base font-semibold text-gray-900">
                                                ₹{Number(order.total_amount || 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform ${
                                            isExpanded ? "bg-[#0067A1] text-white rotate-180" : "bg-slate-100 text-slate-500"
                                        }`}>
                                            <FaChevronDown className="w-3 h-3" />
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Order Details */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-white px-4 sm:px-5 py-4 space-y-4">
                                        {!detail ? (
                                            <div className="flex items-center justify-center py-6 gap-2 text-xs text-gray-500">
                                                <div className="w-4 h-4 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                                                <span>Loading order details...</span>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Info Grid: Order Info & Lab Info */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {/* Order Info */}
                                                    <div className="bg-slate-50/70 rounded-lg border border-slate-200 p-3.5 space-y-2 text-xs">
                                                        <div className="flex items-center gap-1.5 font-semibold text-gray-700 pb-1.5 border-b border-slate-200">
                                                            <FaHashtag className="w-3 h-3 text-[#0067A1]" />
                                                            Order Information
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Order ID</span>
                                                            <span className="font-mono font-medium text-gray-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                                                #{detail.order?.unid || order.id?.slice(0, 8)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Date Placed</span>
                                                            <span className="font-medium text-gray-800">
                                                                {formatDate(detail.order?.created_at || order.created_at)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Collection Type</span>
                                                            <span className="font-medium text-gray-800">
                                                                {(detail.order?.visit_type || order.visit_type) === "home_collection"
                                                                    ? "Home Sample Collection"
                                                                    : "Diagnostic Center Walk-in"}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-500">Status</span>
                                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${status.color}`}>
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Lab Details */}
                                                    {detail.order?.lab_details && (
                                                        <div className="bg-slate-50/70 rounded-lg border border-slate-200 p-3.5 space-y-2 text-xs">
                                                            <div className="flex items-center gap-1.5 font-semibold text-gray-700 pb-1.5 border-b border-slate-200">
                                                                <FaHospital className="w-3 h-3 text-[#0067A1]" />
                                                                Diagnostic Laboratory
                                                            </div>
                                                            <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                                                                {detail.order.lab_details.lab_name}
                                                            </p>
                                                            {detail.order.lab_details.phone_number && (
                                                                <p className="text-gray-600 flex items-center gap-1.5">
                                                                    <FaPhoneAlt className="w-3 h-3 text-[#0067A1]" />
                                                                    {detail.order.lab_details.phone_number}
                                                                </p>
                                                            )}
                                                            {detail.order.lab_details.address && (
                                                                <p className="text-gray-600 flex items-start gap-1.5 leading-relaxed">
                                                                    <FaMapMarkerAlt className="w-3 h-3 text-[#0067A1] shrink-0 mt-0.5" />
                                                                    <span>{detail.order.lab_details.address}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Tests Ordered List */}
                                                {detail.items?.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                                            <FaVial className="w-3 h-3 text-[#0067A1]" /> Tests Ordered ({detail.items.length})
                                                        </h4>
                                                        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
                                                            {detail.items.map((item, i) => (
                                                                <div key={item.id} className="flex items-center justify-between px-3.5 py-2.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-5 h-5 bg-slate-100 rounded text-[10px] font-medium text-slate-600 flex items-center justify-center">
                                                                            {i + 1}
                                                                        </span>
                                                                        <span className="font-normal text-gray-800">{item.test_name}</span>
                                                                    </div>
                                                                    <span className="font-semibold text-gray-900">
                                                                        ₹{Number(item.price || 0).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 font-semibold">
                                                                <span className="text-gray-700">Subtotal</span>
                                                                <span className="text-[#0067A1] text-sm font-bold">
                                                                    ₹{detail.items.reduce((sum, item) => sum + Number(item.price || 0), 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Payment Summary Box */}
                                                <div className="bg-slate-50/70 rounded-lg border border-slate-200 p-3.5 space-y-2.5">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                                                        <FaCreditCard className="w-3 h-3 text-[#0067A1]" /> Payment Details
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                        <div className="bg-white rounded-lg border border-slate-200 p-2.5 text-center">
                                                            <p className="text-[11px] text-gray-500 mb-0.5">Total Amount</p>
                                                            <p className="text-sm sm:text-base font-semibold text-[#0067A1]">
                                                                ₹{Number(detail.total_amount || detail.order?.total_amount || order.total_amount || 0).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white rounded-lg border border-slate-200 p-2.5 text-center">
                                                            <p className="text-[11px] text-gray-500 mb-0.5">Payment Status</p>
                                                            <div className={`inline-flex items-center gap-1 font-medium text-xs ${payment.color}`}>
                                                                <PayIcon className="w-3 h-3" /> {payment.label}
                                                            </div>
                                                        </div>
                                                        <div className="bg-white rounded-lg border border-slate-200 p-2.5 text-center">
                                                            <p className="text-[11px] text-gray-500 mb-0.5">Gateway</p>
                                                            <p className="font-medium text-gray-800">Razorpay</p>
                                                        </div>
                                                        <div className="bg-white rounded-lg border border-slate-200 p-2.5 text-center">
                                                            <p className="text-[11px] text-gray-500 mb-0.5">Payment ID</p>
                                                            <p className="font-mono text-[11px] text-gray-700 truncate" title={detail.razorpay_payment_id || detail.order?.razorpay_payment_id || order.razorpay_payment_id || ""}>
                                                                {detail.razorpay_payment_id || detail.order?.razorpay_payment_id || order.razorpay_payment_id || "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Delivery / Collection Address */}
                                                {(detail.delivery_address || detail.order?.delivery_address || order.delivery_address) && (
                                                    <div className="bg-slate-50/70 rounded-lg border border-slate-200 p-3 text-xs space-y-1">
                                                        <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                                                            <FaMapMarkerAlt className="w-3 h-3 text-[#0067A1]" /> Collection Address
                                                        </p>
                                                        <p className="text-gray-600 leading-relaxed pl-4">
                                                            {(() => {
                                                                const addr = detail.delivery_address || detail.order?.delivery_address || order.delivery_address;
                                                                return typeof addr === "object"
                                                                    ? `${addr.full_address || ""}, ${addr.city || ""} ${addr.pincode ? "- " + addr.pincode : ""}`
                                                                    : addr;
                                                            })()}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Action Bar: Download Invoice */}
                                                <div className="pt-1 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadInvoice(order, detail)}
                                                        className="px-4 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                                    >
                                                        <FaFileInvoice className="w-3.5 h-3.5" />
                                                        Print Invoice
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
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                Previous
                            </button>
                            <span className="text-xs text-gray-500 font-medium px-2">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
