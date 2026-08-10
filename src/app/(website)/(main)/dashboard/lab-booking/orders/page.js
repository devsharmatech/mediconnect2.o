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
        const labName = detail.order?.lab_details?.lab_name || "Laboratory";
        const labPhone = detail.order?.lab_details?.phone_number || "";
        const labAddress = detail.order?.lab_details?.address || "";
        const orderId = detail.order?.unid || order.id?.slice(0, 8);
        const invoiceDate = formatDate(detail.order?.created_at || order.created_at);
        const total = detail.items?.reduce((sum, item) => sum + Number(item.price || 0), 0) || Number(order.total_amount || 0);
        const paymentStatus = (detail.order?.payment_status || order.payment_status || "pending").toUpperCase();
        const razorpayId = detail.order?.razorpay_payment_id || "";
        const visitType = (detail.order?.visit_type || order.visit_type || "walk_in").replace(/_/g, " ").toUpperCase();

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
        <div className="min-h-screen pb-12">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0067A1] via-[#0080C6] to-[#127a72] rounded-3xl px-6 sm:px-10 pt-8 pb-10 mb-8 shadow-xl shadow-[#0067A1]/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-40 -mt-40" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full -ml-28 -mb-28" />
                <div className="absolute top-1/2 right-10 w-24 h-24 bg-white/5 rounded-full hidden sm:block" />
                <div className="relative">
                    <button onClick={() => router.push("/website/dashboard/lab-booking")}
                        className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-5 transition-colors group cursor-pointer">
                        <FaArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Browse Labs
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                            <FaVial className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">My Lab Orders</h1>
                            <p className="text-white/50 text-sm mt-1">Track your test orders, payments & download invoices</p>
                        </div>
                    </div>
                    {/* Stats bar */}
                    {!loading && orders.length > 0 && (
                        <div className="flex items-center gap-6 mt-6 pt-5 border-t border-white/10">
                            <div>
                                <p className="text-2xl font-bold text-white">{orders.length}</p>
                                <p className="text-white/40 text-xs">Total Orders</p>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div>
                                <p className="text-2xl font-bold text-emerald-300">{orders.filter(o => o.payment_status === "paid").length}</p>
                                <p className="text-white/40 text-xs">Paid</p>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div>
                                <p className="text-2xl font-bold text-amber-300">{orders.filter(o => o.status === "pending" || o.status === "processing").length}</p>
                                <p className="text-white/40 text-xs">In Progress</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                                <div className="flex-1">
                                    <div className="h-5 bg-gray-200 rounded w-2/5 mb-2" />
                                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                                </div>
                                <div className="text-right">
                                    <div className="h-5 bg-gray-200 rounded w-16 mb-2 ml-auto" />
                                    <div className="h-4 bg-gray-100 rounded w-20 ml-auto" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-14 text-center shadow-sm">
                    <div className="w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <FaFlask className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">No Orders Yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto leading-relaxed">You haven't placed any lab test orders yet. Browse labs and book your first test to get started!</p>
                    <button onClick={() => router.push("/website/dashboard/lab-booking")}
                        className="mt-6 px-8 py-3.5 bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#0067A1]/25 transition-all cursor-pointer">
                        Browse Labs
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order, idx) => {
                        const status = statusConfig[order.status] || statusConfig.pending;
                        const payment = paymentConfig[order.payment_status] || paymentConfig.pending;
                        const PayIcon = payment.icon;
                        const isExpanded = expandedOrder === order.id;
                        const detail = orderDetails[order.id];
                        const testCount = detail?.items?.length || 0;

                        return (
                            <motion.div key={order.id}
                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04, duration: 0.3 }}
                                className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${isExpanded ? "shadow-lg border-[#0067A1]/20 ring-1 ring-[#0067A1]/10" : "shadow-sm border-gray-100 hover:shadow-md hover:border-gray-200"}`}>

                                {/* Order Card */}
                                <button onClick={() => toggleOrder(order.id)}
                                    className="w-full text-left p-5 sm:p-6 cursor-pointer">
                                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                                        {/* Icon */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-1 sm:mt-0 transition-colors ${isExpanded ? "bg-[#0067A1] shadow-lg shadow-[#0067A1]/25" : "bg-gradient-to-br from-[#0067A1]/10 to-[#0067A1]/5"}`}>
                                            <FaFlask className={`w-5 h-5 ${isExpanded ? "text-white" : "text-[#0067A1]"}`} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                                                    {order.lab?.lab_name || order.lab_details?.lab_name || "Lab Order"}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>
                                                    {status.label}
                                                </span>
                                                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${payment.bg} ${payment.color}`}>
                                                    <PayIcon className="w-2.5 h-2.5" /> {payment.label}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-400">
                                                <span className="flex items-center gap-1 shrink-0">
                                                    <FaClock className="w-3 h-3" />
                                                    {formatDate(order.created_at)}
                                                </span>
                                                {order.visit_type && (
                                                    <span className="flex items-center gap-1 shrink-0">
                                                        {order.visit_type === "home_collection"
                                                            ? <><FaTruck className="w-3 h-3" /> Home</>
                                                            : <><FaWalking className="w-3 h-3" /> Walk-in</>}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right side */}
                                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 shrink-0 mt-1 sm:mt-0">
                                            <div className="text-right">
                                                <p className="text-base sm:text-lg font-extrabold text-gray-900">₹{Number(order.total_amount || 0).toLocaleString()}</p>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isExpanded ? "bg-[#0067A1] rotate-180" : "bg-gray-100"}`}>
                                                <FaChevronDown className={`w-3 h-3 transition-colors ${isExpanded ? "text-white" : "text-gray-400"}`} />
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden">
                                            <div className="px-5 sm:px-6 pb-6 space-y-5 border-t border-gray-100 pt-5">
                                                {!detail ? (
                                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                                        <div className="w-8 h-8 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                                                        <p className="text-xs text-gray-400">Loading order details...</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Info Grid */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {/* Order Summary */}
                                                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-5">
                                                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                    <FaHashtag className="w-3 h-3 text-[#0067A1]" /> Order Info
                                                                </h4>
                                                                <div className="space-y-3 text-sm">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Order ID</span>
                                                                        <span className="font-bold text-gray-800 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">#{detail.order?.unid || order.id?.slice(0, 8)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Date</span>
                                                                        <span className="font-medium text-gray-700">{formatDate(detail.order?.created_at || order.created_at)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Collection</span>
                                                                        <span className="font-medium text-gray-700 flex items-center gap-1.5">
                                                                            {(detail.order?.visit_type || order.visit_type) === "home_collection"
                                                                                ? <><FaTruck className="w-3 h-3 text-[#0067A1]" /> Home Collection</>
                                                                                : <><FaWalking className="w-3 h-3 text-[#0067A1]" /> Walk-in Visit</>}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-gray-400">Status</span>
                                                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${status.color}`}>
                                                                            {status.label}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Lab Info */}
                                                            {detail.order?.lab_details && (
                                                                <div className="bg-gradient-to-br from-[#0067A1]/5 to-white rounded-2xl border border-[#0067A1]/10 p-5">
                                                                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                        <FaHospital className="w-3 h-3 text-[#0067A1]" /> Lab Details
                                                                    </h4>
                                                                    <div className="space-y-3 text-sm">
                                                                        <p className="font-bold text-gray-900 text-base">{detail.order.lab_details.lab_name}</p>
                                                                        {detail.order.lab_details.phone_number && (
                                                                            <p className="text-gray-600 flex items-center gap-2">
                                                                                <span className="w-7 h-7 bg-[#0067A1]/10 rounded-lg flex items-center justify-center shrink-0">
                                                                                    <FaPhoneAlt className="w-3 h-3 text-[#0067A1]" />
                                                                                </span>
                                                                                {detail.order.lab_details.phone_number}
                                                                            </p>
                                                                        )}
                                                                        {detail.order.lab_details.address && (
                                                                            <p className="text-gray-600 flex items-start gap-2">
                                                                                <span className="w-7 h-7 bg-[#0067A1]/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                                                                    <FaMapMarkerAlt className="w-3 h-3 text-[#0067A1]" />
                                                                                </span>
                                                                                <span className="leading-relaxed">{detail.order.lab_details.address}</span>
                                                                            </p>
                                                                        )}
                                                                        {detail.order.lab_details.opening_hours && (
                                                                            <p className="text-gray-500 flex items-center gap-2 text-xs">
                                                                                <span className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                                                                    <FaClock className="w-3 h-3 text-gray-400" />
                                                                                </span>
                                                                                {typeof detail.order.lab_details.opening_hours === "object"
                                                                                    ? `${detail.order.lab_details.opening_hours.open || ""} - ${detail.order.lab_details.opening_hours.close || ""}`
                                                                                    : detail.order.lab_details.opening_hours}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Test Items */}
                                                        {detail.items?.length > 0 && (
                                                            <div>
                                                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                    <FaVial className="w-3 h-3 text-[#0067A1]" /> Tests Ordered ({detail.items.length})
                                                                </h4>
                                                                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                                                                    {detail.items.map((item, i) => (
                                                                        <div key={item.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="w-7 h-7 bg-[#0067A1]/8 rounded-lg flex items-center justify-center text-[10px] font-bold text-[#0067A1]">{i + 1}</span>
                                                                                <span className="text-sm font-semibold text-gray-800">{item.test_name}</span>
                                                                            </div>
                                                                            <span className="text-sm font-bold text-gray-900">₹{Number(item.price || 0).toLocaleString()}</span>
                                                                        </div>
                                                                    ))}
                                                                    {/* Total row */}
                                                                    <div className="flex items-center justify-between px-5 py-3.5 bg-[#0067A1]/5">
                                                                        <span className="text-sm font-bold text-[#0067A1]">Total</span>
                                                                        <span className="text-base font-extrabold text-[#0067A1]">
                                                                            ₹{detail.items.reduce((sum, item) => sum + Number(item.price || 0), 0).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Payment Card */}
                                                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-5">
                                                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                <FaCreditCard className="w-3 h-3 text-[#0067A1]" /> Payment Details
                                                            </h4>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                                <div className="bg-white rounded-xl border border-gray-100 p-3.5 text-center">
                                                                    <p className="text-xs text-gray-400 mb-1">Amount</p>
                                                                    <p className="text-xl font-extrabold text-[#0067A1]">₹{Number(detail.order?.total_amount || order.total_amount || 0).toLocaleString()}</p>
                                                                </div>
                                                                <div className="bg-white rounded-xl border border-gray-100 p-3.5 text-center">
                                                                    <p className="text-xs text-gray-400 mb-1">Status</p>
                                                                    <div className={`inline-flex items-center gap-1.5 font-bold text-sm ${payment.color}`}>
                                                                        <PayIcon className="w-4 h-4" /> {payment.label}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-white rounded-xl border border-gray-100 p-3.5 text-center">
                                                                    <p className="text-xs text-gray-400 mb-1">Method</p>
                                                                    <p className="text-sm font-bold text-gray-700">Razorpay</p>
                                                                </div>
                                                                <div className="bg-white rounded-xl border border-gray-100 p-3.5 text-center">
                                                                    <p className="text-xs text-gray-400 mb-1">Transaction</p>
                                                                    <p className="text-xs font-mono text-gray-600 truncate">
                                                                        {detail.order?.razorpay_payment_id || "—"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Address */}
                                                        {detail.order?.delivery_address && (
                                                            <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-2xl border border-blue-100/50 p-5">
                                                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                    <FaMapMarkerAlt className="w-3 h-3 text-blue-500" /> Delivery Address
                                                                </h4>
                                                                <p className="text-sm text-gray-700 leading-relaxed">
                                                                    {typeof detail.order.delivery_address === "object"
                                                                        ? `${detail.order.delivery_address.full_address}, ${detail.order.delivery_address.city} - ${detail.order.delivery_address.pincode}`
                                                                        : detail.order.delivery_address}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Payment Timeline */}
                                                        {detail.payment_history?.length > 0 && (
                                                            <div>
                                                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Timeline</h4>
                                                                <div className="relative pl-4 border-l-2 border-gray-200 space-y-3">
                                                                    {detail.payment_history.map(log => (
                                                                        <div key={log.id} className="relative">
                                                                            <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white ${log.status === "success" ? "bg-green-500" : log.status === "failed" ? "bg-red-500" : "bg-amber-500"}`} />
                                                                            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-xs flex items-center justify-between">
                                                                                <div>
                                                                                    <span className="font-semibold text-gray-800">{log.source}</span>
                                                                                    {log.amount && <span className="ml-2 text-gray-500">₹{log.amount}</span>}
                                                                                </div>
                                                                                <span className="text-gray-400">{formatDateTime(log.created_at)}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Action Button */}
                                                        <div className="flex items-center gap-3 pt-1">
                                                            <button
                                                                onClick={() => downloadInvoice(order, detail)}
                                                                className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-[#0067A1]/25 transition-all cursor-pointer"
                                                            >
                                                                <FaFileInvoice className="w-4 h-4" />
                                                                Download Invoice
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-8">
                            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm">
                                Previous
                            </button>
                            <span className="text-sm text-gray-400 font-medium">Page {page} of {totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm">
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
