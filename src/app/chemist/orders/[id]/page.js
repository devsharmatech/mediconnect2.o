"use client";

import { useEffect, useState } from "react";
import {
 ArrowLeft,
 User,
 Phone,
 MapPin,
 ClipboardList,
 CheckCircle2,
 XCircle,
 Clock,
 PackageSearch,
 Edit,
 Save,
 CircleSlash,
 Beaker,
 Pill,
 Calendar,
 DollarSign,
 FileText,
 Truck,
 ShieldCheck,
 AlertCircle,
 Home,
 Mail,
 ChevronRight,
 Stethoscope,
 BriefcaseMedical,
 FileSignature,
 Clock4,
 Activity,
 Microscope,
 QrCode,
 Upload,
 CreditCard,
 Receipt,
 Shield,
 Download,
 Eye,
 CheckCircle,
 X,
 Camera,
 FileDown,
 ShieldX,
 History,
 Printer,
 Package,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import { getLoggedInUser } from "@/lib/authHelpers";
import { buildPrescriptionHtml } from "@/lib/buildPrescriptionHtml";
import dayjs from "dayjs";


export default function OrderDetailsPage() {
 const router = useRouter();
 const { id } = useParams();

 const [order, setOrder] = useState(null);
 const [loading, setLoading] = useState(true);
 const [updating, setUpdating] = useState(false);
 const [notes, setNotes] = useState("");
 const [activeTab, setActiveTab] = useState("details");

 // Payment request states
 const [showPaymentRequest, setShowPaymentRequest] = useState(false);
 const [qrFile, setQrFile] = useState(null);
 const [qrPreview, setQrPreview] = useState(null);
 const [paymentQrPayload, setPaymentQrPayload] = useState("");
 const [qrLabel, setQrLabel] = useState("UPI");
 const [useSavedQr, setUseSavedQr] = useState(false);
 const [saveForFuture, setSaveForFuture] = useState(true);
 const [savedQr, setSavedQr] = useState(null);

 // Invoice states
 const [invoice, setInvoice] = useState(null);
 const [showInvoice, setShowInvoice] = useState(false);
 const [invoiceModalInfo, setInvoiceModalInfo] = useState({
 show: false,
 message: "",
 existingInvoice: null,
 });

 // Payment proof states
 const [paymentProofs, setPaymentProofs] = useState([]);
 const [showPaymentProofs, setShowPaymentProofs] = useState(false);

 const chemist = getLoggedInUser("chemist");

 useEffect(() => {
 if (id) {
 fetchOrder();
 fetchSavedQr();
 }
 }, [id]);

 const fetchOrder = async () => {
 try {
 setLoading(true);

 const res = await fetch("/api/chemists/order/details", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ order_id: id }),
 });

 const result = await res.json();

 console.log("Order API response:", result);

 if (!result.success) {
 toast.error(result.message || "Failed to load order");
 return;
 }

 setOrder(result.data);
 setNotes(result.data.chemist_notes || "");

 // Check if invoice exists
 if (result.data.invoice) {
 setInvoice(result.data.invoice);
 }

 // Check for payment proofs from patient
 if (result.data.payment?.proofs) {
 setPaymentProofs(result.data.payment.proofs);
 }

 toast.success("Order details loaded successfully");
 } catch (err) {
 console.error(err);
 toast.error("Something went wrong while fetching order details");
 }
 setLoading(false);
 };

 const fetchSavedQr = async () => {
 try {
 const res = await fetch("/api/chemists/qr-details", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ chemist_id: chemist?.id }),
 });
 const result = await res.json();
 if (result.success && result.data) {
 setSavedQr(result.data);
 if (result.data.payment_qr_payload) {
   setPaymentQrPayload(result.data.payment_qr_payload);
 }
 if (result.data.payment_qr_label) {
   setQrLabel(result.data.payment_qr_label);
 }
 }
 } catch (err) {
 console.error("Failed to fetch saved QR:", err);
 }
 };

 const updateItem = async (item) => {
 setUpdating(true);
 try {
 const res = await fetch("/api/chemists/order/update-item", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 item_id: item.id,
 status: item.status,
 price: Number(item.price) || 0,
 quantity: Number(item.quantity) || 1,
 }),
 });

 const result = await res.json();

 if (result.success) {
 toast.success("Medicine item updated successfully");
 await fetchOrder();
 } else {
 toast.error(result.message || "Failed to update item");
 }
 } catch (e) {
 toast.error("Error updating item");
 }
 setUpdating(false);
 };

 const updateOrderStatus = async (status) => {
 setUpdating(true);
 try {
 const res = await fetch("/api/chemists/order/update-status", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 order_id: order.id,
 status,
 chemist_notes: notes,
 }),
 });

 const result = await res.json();

 if (result.success) {
 toast.success("Order status updated successfully");
 await fetchOrder();
 } else {
 toast.error(result.message || "Failed to update status");
 }
 } catch (e) {
 toast.error("Update failed. Please try again.");
 }
 setUpdating(false);
 };

 // Payment Request Functions
 const handleQrUpload = (e) => {
 const file = e.target.files[0];
 if (file) {
 setQrFile(file);
 const previewUrl = URL.createObjectURL(file);
 setQrPreview(previewUrl);
 }
 };

 const sendPaymentRequest = async () => {
 if (!useSavedQr && !qrFile && !paymentQrPayload) {
   toast.error("Please upload a QR code image or enter a UPI payload");
   return;
 }

 try {
 setUpdating(true);
 const formData = new FormData();
 formData.append("order_id", order.id);
 formData.append("chemist_id", chemist?.id);
 formData.append("use_saved_qr", useSavedQr);
 formData.append("save_qr", saveForFuture);
 formData.append("payment_qr_payload", paymentQrPayload);
 formData.append("qr_label", qrLabel);
 formData.append("chemist_notes", notes);

 if (!useSavedQr && qrFile) {
 formData.append("qr_image", qrFile);
 }

 const res = await fetch("/api/chemists/order/send-payment-request", {
 method: "POST",
 body: formData,
 });

 const result = await res.json();

 if (result.success) {
 toast.success("Payment request sent successfully!");
 setShowPaymentRequest(false);
 await fetchOrder();
 // Reset form
 setQrFile(null);
 setQrPreview(null);
 setPaymentQrPayload("");
 } else {
 toast.error(result.message || "Failed to send payment request");
 }
 } catch (err) {
 toast.error("Error sending payment request");
 console.error(err);
 } finally {
 setUpdating(false);
 }
 };

 const verifyPayment = async () => {
 try {
 setUpdating(true);
 const res = await fetch("/api/chemists/order/verify-payment", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ order_id: order.id, chemist_id: chemist?.id }),
 });

 const result = await res.json();

 if (result.success) {
 toast.success("Payment verified successfully!");
 await fetchOrder();
 } else {
 toast.error(result.message || "Failed to verify payment");
 }
 } catch (err) {
 toast.error("Error verifying payment");
 console.error(err);
 } finally {
 setUpdating(false);
 }
 };

 const declinePayment = async () => {
 if (!confirm("Are you sure you want to decline this payment?")) return;

 try {
 setUpdating(true);
 const res = await fetch("/api/chemists/order/decline-payment", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 order_id: order.id,
 chemist_id: chemist?.id,
 reason: "Payment verification failed",
 }),
 });

 const result = await res.json();

 if (result.success) {
 toast.success("Payment declined");
 await fetchOrder();
 } else {
 toast.error(result.message || "Failed to decline payment");
 }
 } catch (err) {
 toast.error("Error declining payment");
 console.error(err);
 } finally {
 setUpdating(false);
 }
 };

 const checkAndGenerateInvoice = async () => {
 try {
 // First check if invoice already exists
 const checkRes = await fetch("/api/chemists/order/get-invoice", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 order_id: order.id,
 chemist_id: chemist?.id,
 }),
 });

 const checkResult = await checkRes.json();

 if (checkResult.success && checkResult.data) {
 // Invoice already exists, show info modal
 setInvoiceModalInfo({
 show: true,
 message: "An invoice has already been generated for this order.",
 existingInvoice: checkResult.data,
 });
 setInvoice(checkResult.data);
 } else {
 // No invoice exists, generate new one
 await generateInvoice();
 }
 } catch (err) {
 toast.error("Error checking invoice status");
 console.error(err);
 }
 };

 const generateInvoice = async () => {
 try {
 setUpdating(true);
 const res = await fetch("/api/chemists/order/generate-invoice", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 order_id: order.id,
 chemist_id: chemist?.id,
 }),
 });

 const result = await res.json();

 if (result.success) {
 toast.success("Invoice generated successfully!");
 setInvoice(result.data);
 setShowInvoice(true);
 await fetchOrder();
 } else {
 toast.error(result.message || "Failed to generate invoice");
 }
 } catch (err) {
 toast.error("Error generating invoice");
 console.error(err);
 } finally {
 setUpdating(false);
 }
 };

 const downloadInvoice = async () => {
 if (!invoice?.download_url) {
 toast.error("Download URL not available");
 return;
 }

 try {
 // Create a temporary anchor element
 const link = document.createElement("a");
 link.href = invoice.download_url;
 link.download = `invoice_${invoice.invoice_number}.pdf`;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);

 toast.success("Invoice download started");
 } catch (err) {
 console.error("Error downloading invoice:", err);
 toast.error("Failed to download invoice");
 }
 };

  const statusConfig = {
    waiting_for_bill: {
      color: "bg-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      textColor: "text-purple-800 dark:text-purple-400",
      icon: <FileText className="w-4 h-4" />,
      text: "Waiting for Bill",
    },
    payment_pending: {
      color: "bg-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      textColor: "text-amber-800 dark:text-amber-400",
      icon: <Clock className="w-4 h-4" />,
      text: "Waiting for Payment",
    },
    waiting_for_payment: {
      color: "bg-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      textColor: "text-amber-800 dark:text-amber-400",
      icon: <Clock className="w-4 h-4" />,
      text: "Waiting for Payment",
    },
    payment_submitted: {
      color: "bg-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
      textColor: "text-cyan-800 dark:text-cyan-400",
      icon: <Clock className="w-4 h-4" />,
      text: "Payment Declared",
    },
    payment_verified: {
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      textColor: "text-emerald-800 dark:text-emerald-400",
      icon: <CheckCircle2 className="w-4 h-4" />,
      text: "Payment Verified",
    },
    approved: {
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      textColor: "text-emerald-800 dark:text-emerald-400",
      icon: <CheckCircle2 className="w-4 h-4" />,
      text: "Approved & Preparing",
    },
    partially_approved: {
      color: "bg-[#0080C6]",
      bgColor: "bg-teal-50 dark:bg-[#003358]/20",
      textColor: "text-[#004F7C] dark:text-[#0080C6]",
      icon: <CheckCircle2 className="w-4 h-4" />,
      text: "Partially Approved",
    },
    ready_for_pickup: {
      color: "bg-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
      textColor: "text-indigo-800 dark:text-indigo-400",
      icon: <Package className="w-4 h-4" />,
      text: "Ready for Pickup",
    },
    payment_verification_failed: {
      color: "bg-rose-500",
      bgColor: "bg-rose-50 dark:bg-rose-900/20",
      textColor: "text-rose-800 dark:text-rose-400",
      icon: <XCircle className="w-4 h-4" />,
      text: "Verification Failed",
    },
    out_for_delivery: {
      color: "bg-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      textColor: "text-orange-800 dark:text-orange-400",
      icon: <Truck className="w-4 h-4" />,
      text: "Out for Delivery",
    },
    completed: {
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      textColor: "text-emerald-800 dark:text-emerald-400",
      icon: <CheckCircle2 className="w-4 h-4" />,
      text: "Delivered",
    },
    rejected: {
      color: "bg-red-500",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      textColor: "text-red-800 dark:text-red-400",
      icon: <XCircle className="w-4 h-4" />,
      text: "Rejected",
    },
    cancelled: {
      color: "bg-gray-500",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      textColor: "text-gray-800 dark:text-gray-400",
      icon: <XCircle className="w-4 h-4" />,
      text: "Cancelled",
    },
  };

 if (loading)
 return (
 <div className="p-10 text-center min-h-screen dark:bg-gray-900">
 <div className="w-12 h-12 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin mx-auto"></div>
 <p className="mt-4 text-[#004F7C] dark:text-teal-300 text-lg font-medium">
 Loading order details...
 </p>
 <p className="text-[#0067A1] dark:text-[#0080C6] text-sm mt-2">
 Please wait while we fetch the order information
 </p>
 </div>
 );

 if (!order)
 return (
 <div className="p-10 text-center min-h-screen dark:bg-gray-900">

 <div className="w-20 h-20 bg-[#0067A1]/10 dark:bg-[#003358]/30 rounded-full flex items-center justify-center mx-auto mb-4">
 <ClipboardList className="w-10 h-10 text-teal-500 dark:text-[#0080C6]" />
 </div>
 <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
 Order not found
 </h3>
 <p className="text-gray-600 dark:text-gray-400 mb-6">
 The order you're looking for doesn't exist or you don't have access to
 it.
 </p>
 <button
 onClick={() => router.push("/chemist/orders")}
 className="px-6 py-3 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all duration-200 shadow-lg"
 >
 Back to Orders
 </button>
 </div>
 );

 const totalAmount = order.medicine_order_items?.reduce((sum, item) => {
 return sum + (item.price || 0) * (item.quantity || 1);
 }, 0);

 // Format medicines from prescription
 const formatMedicines = () => {
 if (!order.prescription?.medicines) return [];

 try {
 if (typeof order.prescription.medicines === "string") {
 return JSON.parse(order.prescription.medicines);
 }
 return order.prescription.medicines || [];
 } catch (e) {
 return [];
 }
 };

 const prescriptionMedicines = formatMedicines();

 return (
 <div className=" dark:bg-gray-900 min-h-screen">

 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
 <div className="flex items-center space-x-3 mb-4 md:mb-0">
 <button
 onClick={() => router.push("/chemist/orders")}
 className="p-2 rounded-xl bg-[#0067A1]/10 dark:bg-gray-800 text-[#0067A1] dark:text-[#0080C6] hover:bg-[#004F7C]/20 dark:hover:bg-gray-700 transition-all duration-200"
 >
 <ArrowLeft className="w-5 h-5" />
 </button>
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-[#0067A1] rounded-xl flex items-center justify-center shadow-lg">
 <ClipboardList className="w-6 h-6 text-white" />
 </div>
 <div>
 <h1 className="text-xl md:text-2xl font-bold text-[#003358] dark:text-white">
 Order #{order.unid}
 </h1>
 <p className="text-[#004F7C] dark:text-teal-300 text-sm">
 View and manage order details
 </p>
 </div>
 </div>
 </div>

 <div className="flex flex-wrap gap-3 items-center">
 <div
 className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-full ${statusConfig[order.status]?.bgColor || "bg-gray-100"
 }`}
 >
 {statusConfig[order.status]?.icon}
 <span
 className={`font-medium ${statusConfig[order.status]?.textColor || "text-gray-700"
 }`}
 >
 {statusConfig[order.status]?.text ||
 order.status.replace(/_/g, " ")}
 </span>
 </div>

  {/* Action Buttons based on status */}
  {!invoice && ['approved', 'payment_pending', 'payment_submitted', 'payment_verified', 'waiting_for_bill', 'out_for_delivery', 'completed'].includes(order.status) && (
    <button
      onClick={checkAndGenerateInvoice}
      disabled={updating}
      className="px-4 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all duration-200 shadow-lg flex items-center space-x-2 disabled:opacity-50 font-bold"
    >
      <Receipt className="w-4 h-4" />
      <span>{updating ? "Generating Bill..." : "Generate Final Bill"}</span>
    </button>
  )}

  {order.status === "payment_submitted" && (
    <>
      <button
        onClick={verifyPayment}
        disabled={updating}
        className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-lg flex items-center space-x-2 disabled:opacity-50 font-bold"
      >
        <ShieldCheck className="w-4 h-4" />
        <span>{updating ? "Verifying..." : "Verify Payment Received"}</span>
      </button>
      <button
        onClick={declinePayment}
        disabled={updating}
        className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 shadow-lg flex items-center space-x-2 disabled:opacity-50 font-bold"
      >
        <XCircle className="w-4 h-4" />
        <span>Payment Not Received</span>
      </button>
    </>
  )}

  {order.status === "payment_verified" && (
    <button
      onClick={() => updateOrderStatus("out_for_delivery")}
      disabled={updating}
      className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-lg flex items-center space-x-2 disabled:opacity-50 font-bold"
    >
      <Truck className="w-4 h-4" />
      <span>{updating ? "Updating..." : "Mark Out for Delivery"}</span>
    </button>
  )}

  {order.status === "out_for_delivery" && (
    <button
      onClick={() => updateOrderStatus("completed")}
      disabled={updating}
      className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-lg flex items-center space-x-2 disabled:opacity-50 font-bold"
    >
      <CheckCircle2 className="w-4 h-4" />
      <span>{updating ? "Completing..." : "Mark Delivered"}</span>
    </button>
  )}

  {invoice && (
    <button
      onClick={() => setShowInvoice(true)}
      className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-lg flex items-center space-x-2 font-bold"
    >
      <Eye className="w-4 h-4" />
      <span>View Invoice</span>
    </button>
  )}
 </div>
 </div>

 {/* Tabs */}
 <div className="flex border-b border-[#0067A1]/20 dark:border-gray-700 mb-8 overflow-x-auto">
 <button
 onClick={() => setActiveTab("details")}
 className={`px-4 py-3 font-medium text-sm transition-all duration-200 flex-shrink-0 ${activeTab === "details"
 ? "text-[#0067A1] dark:text-[#0080C6] border-b-2 border-[#0067A1] dark:border-teal-400"
 : "text-gray-600 dark:text-gray-400 hover:text-[#0067A1] dark:hover:text-[#0080C6]"
 }`}
 >
 <div className="flex items-center space-x-2">
 <ClipboardList className="w-4 h-4" />
 <span>Order Details</span>
 </div>
 </button>
 <button
 onClick={() => setActiveTab("medicines")}
 className={`px-4 py-3 font-medium text-sm transition-all duration-200 flex-shrink-0 ${activeTab === "medicines"
 ? "text-[#0067A1] dark:text-[#0080C6] border-b-2 border-[#0067A1] dark:border-teal-400"
 : "text-gray-600 dark:text-gray-400 hover:text-[#0067A1] dark:hover:text-[#0080C6]"
 }`}
 >
 <div className="flex items-center space-x-2">
 <Pill className="w-4 h-4" />
 <span>Medicines ({order.medicine_order_items?.length || 0})</span>
 </div>
 </button>
 <button
 onClick={() => setActiveTab("prescription")}
 className={`px-4 py-3 font-medium text-sm transition-all duration-200 flex-shrink-0 ${activeTab === "prescription"
 ? "text-[#0067A1] dark:text-[#0080C6] border-b-2 border-[#0067A1] dark:border-teal-400"
 : "text-gray-600 dark:text-gray-400 hover:text-[#0067A1] dark:hover:text-[#0080C6]"
 }`}
 >
 <div className="flex items-center space-x-2">
 <FileText className="w-4 h-4" />
 <span>Prescription</span>
 </div>
 </button>
 <button
 onClick={() => setActiveTab("billing")}
 className={`px-4 py-3 font-medium text-sm transition-all duration-200 flex-shrink-0 ${activeTab === "billing"
 ? "text-[#0067A1] dark:text-[#0080C6] border-b-2 border-[#0067A1] dark:border-teal-400"
 : "text-gray-600 dark:text-gray-400 hover:text-[#0067A1] dark:hover:text-[#0080C6]"
 }`}
 >
 <div className="flex items-center space-x-2">
 <DollarSign className="w-4 h-4" />
 <span>Billing & Payment</span>
 </div>
 </button>
 <button
 onClick={() => setActiveTab("actions")}
 className={`px-4 py-3 font-medium text-sm transition-all duration-200 flex-shrink-0 ${activeTab === "actions"
 ? "text-[#0067A1] dark:text-[#0080C6] border-b-2 border-[#0067A1] dark:border-teal-400"
 : "text-gray-600 dark:text-gray-400 hover:text-[#0067A1] dark:hover:text-[#0080C6]"
 }`}
 >
 <div className="flex items-center space-x-2">
 <Edit className="w-4 h-4" />
 <span>Actions</span>
 </div>
 </button>
 </div>

 {/* Content based on active tab */}
 {activeTab === "details" && (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Left Column - Patient Info & Order Details */}
 <div className="lg:col-span-2 space-y-8">
 {/* Patient Information Card */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/10 dark:border-gray-700 shadow-lg p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-lg font-bold text-[#003358] dark:text-white flex items-center">
 <User className="w-5 h-5 mr-2 text-teal-500" />
 Patient Information
 </h2>
 <div className="px-3 py-1 bg-[#0067A1]/10 dark:bg-[#003358]/30 text-[#004F7C] dark:text-[#0080C6] rounded-full text-sm">
 Patient
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <div className="flex items-start space-x-3">
 <div className="w-10 h-10 bg-[#0080C6] rounded-full flex items-center justify-center flex-shrink-0">
 <User className="w-5 h-5 text-white" />
 </div>
 <div>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Full Name
 </p>
 <p className="font-semibold text-gray-800 dark:text-white">
 {order.patient?.patient_details?.full_name ||
 "Unknown Patient"}
 </p>
 </div>
 </div>

 <div className="flex items-start space-x-3">
 <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
 <Phone className="w-5 h-5 text-white" />
 </div>
 <div>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Phone Number
 </p>
 <p className="font-semibold text-gray-800 dark:text-white">
 {order.patient?.phone_number || "Not provided"}
 </p>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <div className="flex items-start space-x-3">
 <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
 <Home className="w-5 h-5 text-white" />
 </div>
 <div>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Address
 </p>
 <p className="font-semibold text-gray-800 dark:text-white">
 {order.patient?.patient_details?.address ||
 "Address not available"}
 </p>
 </div>
 </div>

 <div className="flex items-start space-x-3">
 <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
 <Calendar className="w-5 h-5 text-white" />
 </div>
 <div>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Order Date
 </p>
 <p className="font-semibold text-gray-800 dark:text-white">
 {new Date(order.created_at).toLocaleDateString(
 "en-IN",
 {
 day: "numeric",
 month: "long",
 year: "numeric",
 }
 )}
 </p>
 <p className="text-sm text-gray-500 dark:text-gray-500">
 {new Date(order.created_at).toLocaleTimeString(
 "en-IN",
 {
 hour: "2-digit",
 minute: "2-digit",
 }
 )}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Order Summary Card */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/10 dark:border-gray-700 shadow-lg p-6">
 <h2 className="text-lg font-bold text-[#003358] dark:text-white mb-6 flex items-center">
 <ClipboardList className="w-5 h-5 mr-2 text-teal-500" />
 Order Summary
 </h2>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Order ID
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {order.unid}
 </span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Status
 </span>
 <span
 className={`font-semibold ${statusConfig[order.status]?.textColor || "text-gray-700"
 }`}
 >
 {statusConfig[order.status]?.text}
 </span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Order Type
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {order.order_type || "Regular"}
 </span>
 </div>
 </div>

 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Created
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {new Date(order.created_at).toLocaleDateString("en-IN")}
 </span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Last Updated
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {new Date(
 order.updated_at || order.created_at
 ).toLocaleDateString("en-IN")}
 </span>
 </div>

 <div className="pt-3 border-t border-[#0067A1]/10 dark:border-gray-700">
 <div className="flex items-center justify-between">
 <span className="text-lg font-bold text-gray-800 dark:text-white">
 Total Items
 </span>
 <span className="text-xl font-bold text-[#0067A1] dark:text-[#0080C6]">
 {order.medicine_order_items?.length || 0}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Right Column - Quick Stats */}
 <div className="space-y-8">
 {/* Order Stats */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/10 dark:border-gray-700 shadow-lg p-6">
 <h2 className="text-lg font-bold text-[#003358] dark:text-white mb-6 flex items-center">
 <DollarSign className="w-5 h-5 mr-2 text-emerald-500" />
 Financial Summary
 </h2>

 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Subtotal
 </span>
 <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
 ₹{totalAmount.toLocaleString()}
 </span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Delivery Charges
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 ₹{order.delivery_charge || 0}
 </span>
 </div>

 <div className="pt-3 border-t border-[#0067A1]/10 dark:border-gray-700">
 <div className="flex items-center justify-between">
 <span className="text-lg font-bold text-gray-800 dark:text-white">
 Grand Total
 </span>
 <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
 ₹
 {(
 totalAmount + (order.delivery_charge || 0)
 ).toLocaleString()}
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Prescription Status */}
 {order.prescription_id && (
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/10 dark:border-gray-700 shadow-lg p-6">
 <h2 className="text-lg font-bold text-[#003358] dark:text-white mb-4 flex items-center">
 <FileText className="w-5 h-5 mr-2 text-purple-500" />
 Prescription
 </h2>

 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Prescription ID
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {order.prescription_id.slice(0, 8)}...
 </span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Status
 </span>
 <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-xs">
 Attached
 </span>
 </div>
 </div>

 <button
 onClick={() => setActiveTab("prescription")}
 className="mt-4 w-full px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg "
 >
 <FileText className="w-4 h-4" />
 <span>View Prescription</span>
 </button>
 </div>
 )}
 </div>
 </div>
 )}

 {activeTab === "medicines" && (
 <div className="space-y-8">
 {/* Medicines Card */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/10 dark:border-gray-700 shadow-lg p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-lg font-bold text-[#003358] dark:text-white flex items-center">
 <Pill className="w-5 h-5 mr-2 text-purple-500" />
 Order Medicines
 </h2>
 <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm">
 {order.medicine_order_items?.length || 0} items
 </div>
 </div>

 <div className="space-y-6">
 {order.medicine_order_items?.map((item, index) => (
 <div
 key={item.id}
 className="border border-[#0067A1]/10 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800/50"
 >
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center space-x-3">
 <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
 <Pill className="w-4 h-4 text-white" />
 </div>
 <div>
 <h3 className="font-bold text-gray-800 dark:text-white">
 {item.medicine_name || `Medicine ${index + 1}`}
 </h3>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 {item.dosage || "Standard dosage"} |{" "}
 {item.frequency || "As prescribed"}
 </p>
 </div>
 </div>
 <div
 className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${statusConfig[item.status]?.bgColor || "bg-gray-100"
 }`}
 >
 {statusConfig[item.status]?.icon}
 <span
 className={`text-xs font-medium ${statusConfig[item.status]?.textColor ||
 "text-gray-700"
 }`}
 >
 {statusConfig[item.status]?.text ||
 item.status.replace(/_/g, " ")}
 </span>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1 block">
 Quantity
 </label>
 <input
 type="number"
 value={item.quantity ?? 1}
 min="1"
 onChange={(e) => {
 const updatedItems = [...order.medicine_order_items];
 updatedItems[index] = {
 ...updatedItems[index],
 quantity: Number(e.target.value),
 };
 setOrder({
 ...order,
 medicine_order_items: updatedItems,
 });
 }}
 className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-gray-800 dark:text-gray-200"
 />
 </div>

 <div>
 <label className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1 block">
 Price (₹)
 </label>
 <input
 type="number"
 value={item.price ?? 0}
 min="0"
 step="0.01"
 onChange={(e) => {
 const updatedItems = [...order.medicine_order_items];
 updatedItems[index] = {
 ...updatedItems[index],
 price: Number(e.target.value),
 };
 setOrder({
 ...order,
 medicine_order_items: updatedItems,
 });
 }}
 className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-gray-800 dark:text-gray-200"
 />
 </div>

 <div>
 <label className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1 block">
 Status
 </label>
 <select
 value={item.status}
 onChange={(e) => {
 const updatedItems = [...order.medicine_order_items];
 updatedItems[index] = {
 ...updatedItems[index],
 status: e.target.value,
 };
 setOrder({
 ...order,
 medicine_order_items: updatedItems,
 });
 }}
 className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-gray-800 dark:text-gray-200"
 >
 <option value="pending">Pending</option>
 <option value="approved">Approved</option>
 <option value="available">Available</option>
 <option value="not_available">Not Available</option>
 <option value="rejected">Rejected</option>
 </select>
 </div>
 </div>

 <button
 onClick={() => updateItem(item)}
 disabled={updating}
 className="mt-4 w-full px-4 py-2.5 bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <Save className="w-4 h-4" />
 <span>{updating ? "Updating..." : "Update Item"}</span>
 </button>
 </div>
 ))}
 </div>

 {order.medicine_order_items?.length > 0 && (
 <div className="mt-6 pt-6 border-t border-[#0067A1]/10 dark:border-gray-700">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Subtotal
 </p>
 <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
 ₹{totalAmount.toLocaleString()}
 </p>
 </div>
 <div className="text-right">
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Total Items
 </p>
 <p className="text-xl font-bold text-gray-800 dark:text-white">
 {order.medicine_order_items.length}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {activeTab === "prescription" && (
 <div className="space-y-8">
 {/* Prescription Details Card */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/10 dark:border-gray-700 shadow-lg p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-lg font-bold text-[#003358] dark:text-white flex items-center">
 <FileText className="w-5 h-5 mr-2 text-purple-500" />
 Prescription Details
 </h2>
 <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm">
 Rx#
 {order.prescription?.pid ||
 order.prescription?.id?.slice(0, 8) ||
 "PRESCRIPTION"}
 </div>
 </div>

 {order.prescription ? (
 <>
 {/* Iframe for HTML Prescription */}
 <div className="mb-8 border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
 <iframe
 srcDoc={buildPrescriptionHtml({
 ...order.prescription,
 // Ensure all required fields are present
 pid:
 order.prescription.pid ||
 order.prescription.id?.slice(0, 8) ||
 "N/A",
 created_at: order.prescription.created_at,
 // Transform medicines structure if needed
 medicines: Array.isArray(order.prescription.medicines)
 ? order.prescription.medicines.map((med) => ({
 name: med.name || med.medicine_name || "-",
 dose: med.dosage || med.dose || "-",
 frequency: med.frequency || "",
 duration: med.duration || "",
 quantity: med.quantity || med.qty || "",
 notes: med.instructions || med.notes || "",
 }))
 : [],
 chief_complaints: null,
 diagnosis: null,
 lab_tests: [],
 investigations: [],
 special_message: "",
 ai_analysis: null,
 doctor_details: order.prescription.doctor_details || null,
 patient_details:
 order.prescription.patient_details || null,
 appointments: order.prescription.appointments || null,
 }, { hideClinicDetails: true, isChemistView: true })}
 title="Prescription"
 className="w-full h-[800px]"
 sandbox="allow-same-origin"
 />
 </div>

 {/* Action Buttons */}
 <div className="flex flex-wrap gap-3 justify-end">
 {/* Print Button */}
 <button
 onClick={() => {
 const printWindow = window.open("", "_blank");
 const prescriptionData = {
 ...order.prescription,
 pid:
 order.prescription.pid ||
 order.prescription.id?.slice(0, 8) ||
 "N/A",
 created_at: order.prescription.created_at,
 medicines: Array.isArray(order.prescription.medicines)
 ? order.prescription.medicines.map((med) => ({
 name: med.name || med.medicine_name || "-",
 dose: med.dosage || med.dose || "-",
 frequency: med.frequency || "",
 duration: med.duration || "",
 quantity: med.quantity || med.qty || "",
 notes: med.instructions || med.notes || "",
 }))
 : [],
 lab_tests: order.prescription.lab_tests || [],
 investigations: order.prescription.investigations || [],
 special_message:
 order.prescription.special_message || "",
 ai_analysis: order.prescription.ai_analysis || null,
 doctor_details:
 order.prescription.doctor_details || null,
 patient_details:
 order.prescription.patient_details || null,
 appointments: order.prescription.appointments || null,
 };

 printWindow.document.write(`
 <!DOCTYPE html>
 <html>
 <head>
 <title>Prescription #${prescriptionData.pid}</title>
 <style>
 body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
 iframe { width: 100%; height: 100vh; border: none; }
 </style>
 </head>
 <body>
 ${buildPrescriptionHtml(prescriptionData, { hideClinicDetails: true, isChemistView: true })}
 <script>
 window.onload = function() {
 setTimeout(() => {
 window.print();
 setTimeout(() => window.close(), 1000);
 }, 500);
 }
 </script>
 </body>
 </html>
 `);
 }}
 className="px-4 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all duration-200 flex items-center space-x-2"
 >
 <Printer className="w-4 h-4" />
 <span>Print Prescription</span>
 </button>

 {/* Download as HTML Button */}
 <button
 onClick={() => {
 const prescriptionData = {
 ...order.prescription,
 pid:
 order.prescription.pid ||
 order.prescription.id?.slice(0, 8) ||
 "N/A",
 created_at: order.prescription.created_at,
 medicines: Array.isArray(order.prescription.medicines)
 ? order.prescription.medicines.map((med) => ({
 name: med.name || med.medicine_name || "-",
 dose: med.dosage || med.dose || "-",
 frequency: med.frequency || "",
 duration: med.duration || "",
 quantity: med.quantity || med.qty || "",
 notes: med.instructions || med.notes || "",
 }))
 : [],
 lab_tests: order.prescription.lab_tests || [],
 investigations: order.prescription.investigations || [],
 special_message:
 order.prescription.special_message || "",
 ai_analysis: order.prescription.ai_analysis || null,
 doctor_details:
 order.prescription.doctor_details || null,
 patient_details:
 order.prescription.patient_details || null,
 appointments: order.prescription.appointments || null,
 };

 const htmlContent =
 buildPrescriptionHtml(prescriptionData, { hideClinicDetails: true, isChemistView: true });
 const blob = new Blob([htmlContent], {
 type: "text/html",
 });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.download = `Prescription_${prescriptionData.pid
 }_${dayjs().format("YYYY-MM-DD")}.html`;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
 }}
 className="px-4 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-all duration-200 flex items-center space-x-2"
 >
 <Download className="w-4 h-4" />
 <span>Download HTML</span>
 </button>


 </div>

 {/* Prescription Metadata */}
 <div className="mt-8 pt-8 border-t border-[#0067A1]/10 dark:border-gray-700">
 <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
 Prescription Information
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
 <div className="flex items-center space-x-2 mb-2">
 <Calendar className="w-4 h-4 text-teal-500" />
 <span className="text-sm text-gray-600 dark:text-gray-400">
 Prescribed Date
 </span>
 </div>
 <p className="font-semibold text-gray-800 dark:text-white">
 {dayjs(order.prescription.created_at).format(
 "DD MMM YYYY, hh:mm A"
 )}
 </p>
 </div>

 <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
 <div className="flex items-center space-x-2 mb-2">
 <Stethoscope className="w-4 h-4 text-teal-500" />
 <span className="text-sm text-gray-600 dark:text-gray-400">
 Prescribing Doctor
 </span>
 </div>
 <p className="font-semibold text-gray-800 dark:text-white">
 {order.prescription.doctor_details?.full_name ||
 "Not Available"}
 </p>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 {order.prescription.doctor_details?.specialization ||
 ""}
 </p>
 </div>

 <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
 <div className="flex items-center space-x-2 mb-2">
 <Pill className="w-4 h-4 text-teal-500" />
 <span className="text-sm text-gray-600 dark:text-gray-400">
 Total Medicines
 </span>
 </div>
 <p className="font-semibold text-gray-800 dark:text-white">
 {Array.isArray(order.prescription.medicines)
 ? order.prescription.medicines.length
 : 0}
 </p>
 </div>
 </div>

    </div>
 </>
 ) : (
 <div className="text-center py-8">
 <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
 <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
 No Prescription Found
 </h3>
 <p className="text-gray-600 dark:text-gray-400">
 This order doesn't have a prescription attached.
 </p>
 </div>
 )}
 </div>
 </div>
 )}
 {activeTab === "billing" && (
 <div className="space-y-8">
 {/* Payment Status Card */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/10 dark:border-gray-700 shadow-lg p-6">
 <h2 className="text-lg font-bold text-[#003358] dark:text-white mb-6 flex items-center">
 <DollarSign className="w-5 h-5 mr-2 text-emerald-500" />
 Billing & Payment
 </h2>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Amount Summary */}
 <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6">
 <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center">
 <DollarSign className="w-4 h-4 mr-2 text-emerald-500" />
 Amount Summary
 </h3>
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Subtotal
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 ₹{totalAmount.toLocaleString()}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Delivery
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 ₹{order.delivery_charge || 0}
 </span>
 </div>
 <div className="pt-3 border-t border-emerald-200 dark:border-emerald-700">
 <div className="flex items-center justify-between">
 <span className="font-bold text-gray-800 dark:text-white">
 Total
 </span>
 <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
 ₹
 {(
 totalAmount + (order.delivery_charge || 0)
 ).toLocaleString()}
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Payment Status */}
 <div className="bg-[#0067A1]/5 dark:bg-[#003358]/20 rounded-xl p-6">
 <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center">
 <CreditCard className="w-4 h-4 mr-2 text-teal-500" />
 Payment Status
 </h3>
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Status
 </span>
 <span
 className={`font-semibold ${statusConfig[order.status]?.textColor
 }`}
 >
 {statusConfig[order.status]?.text}
 </span>
 </div>

 {order.payment_requested_at && (
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Requested On
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {new Date(
 order.payment_requested_at
 ).toLocaleDateString("en-IN")}
 </span>
 </div>
 )}

 {order.payment_qr_url && (
 <div className="pt-3 border-t border-[#0067A1]/20 dark:border-[#004F7C]">
 <button
 onClick={() =>
 window.open(order.payment_qr_url, "_blank")
 }
 className="w-full px-4 py-2 bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-all duration-200 flex items-center justify-center space-x-2"
 >
 <Eye className="w-4 h-4" />
 <span>View Payment QR</span>
 </button>
 </div>
 )}
 </div>
 </div>

 {/* Invoice Status */}
 <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
 <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center">
 <Receipt className="w-4 h-4 mr-2 text-purple-500" />
 Invoice
 </h3>
 <div className="space-y-3">
 {invoice ? (
 <>
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Invoice No
 </span>
 <span className="font-semibold text-gray-800 dark:text-white uppercase">
 {invoice.invoice_number}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Generated On
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {new Date(invoice.created_at).toLocaleDateString(
 "en-IN"
 )}
 </span>
 </div>
 <div className="pt-3 border-t border-purple-200 dark:border-purple-700 space-y-2">
 <button
 onClick={() => setShowInvoice(true)}
 className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
 >
 <Eye className="w-4 h-4" />
 <span>View Invoice</span>
 </button>
 {invoice.download_url && (
 <button
 onClick={downloadInvoice}
 className="w-full px-4 py-2 bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-all duration-200 flex items-center justify-center space-x-2"
 >
 <FileDown className="w-4 h-4" />
 <span>Download PDF</span>
 </button>
 )}
 </div>
 </>
 ) : ['approved', 'payment_pending', 'payment_submitted', 'payment_verified', 'waiting_for_bill', 'out_for_delivery', 'completed'].includes(order.status) ? (
 <div className="text-center py-4">
 <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
 <p className="text-gray-600 dark:text-gray-400 mb-3">
 No invoice generated yet
 </p>
 <button
 onClick={checkAndGenerateInvoice}
 disabled={updating}
 className="w-full px-4 py-2.5 bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
 >
 <Receipt className="w-4 h-4" />
 <span>
 {updating ? "Checking..." : "Generate Invoice"}
 </span>
 </button>
 </div>
 ) : (
 <div className="text-center py-4">
 <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
 <p className="text-gray-600 dark:text-gray-400">
 Invoice will be available after payment verification
 </p>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Payment Actions & History */}
 <div className="mt-8 pt-6 border-t border-[#0067A1]/10 dark:border-gray-700">
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-bold text-gray-800 dark:text-white">
 Payment Actions
 </h3>
 {paymentProofs.length > 0 && (
 <button
 onClick={() => setShowPaymentProofs(true)}
 className="px-4 py-2 bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-all duration-200 flex items-center space-x-2"
 >
 <History className="w-4 h-4" />
 <span>View Payment Proofs ({paymentProofs.length})</span>
 </button>
 )}
 </div>
 <div className="flex flex-wrap gap-3">
 {(order.status === "approved" ||
 order.status === "partially_approved" ||
 order.status === "payment_declined") && (
 <button
 onClick={() => setShowPaymentRequest(true)}
 className="px-4 py-2.5 bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-all duration-200 shadow-lg flex items-center space-x-2"
 >
 <CreditCard className="w-4 h-4" />
 <span>Send Payment Request</span>
 </button>
 )}

 {order.status === "payment_submitted" && (
 <>
 <button
 onClick={verifyPayment}
 disabled={updating}
 className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-lg flex items-center space-x-2 disabled:opacity-50"
 >
 <ShieldCheck className="w-4 h-4" />
 <span>
 {updating ? "Verifying..." : "Verify Payment"}
 </span>
 </button>
 <button
 onClick={declinePayment}
 disabled={updating}
 className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg flex items-center space-x-2 disabled:opacity-50"
 >
 <ShieldX className="w-4 h-4" />
 <span>Decline Payment</span>
 </button>
 </>
 )}
 </div>
 </div>

 {/* Payment Timeline */}
 {(order.payment_requested_at ||
 order.payment_qr_url ||
 paymentProofs.length > 0) && (
 <div className="mt-6 pt-6 border-t border-[#0067A1]/10 dark:border-gray-700">
 <h3 className="font-bold text-gray-800 dark:text-white mb-4">
 Payment Timeline
 </h3>
 <div className="space-y-4">
 {order.payment_requested_at && (
 <div className="flex items-start space-x-3">
 <div className="w-8 h-8 bg-[#0067A1]/10 dark:bg-[#003358]/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
 <CreditCard className="w-4 h-4 text-teal-500" />
 </div>
 <div>
 <p className="font-medium text-gray-800 dark:text-white">
 Payment Request Sent
 </p>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 {new Date(order.payment_requested_at).toLocaleString(
 "en-IN"
 )}
 </p>
 </div>
 </div>
 )}
 {order.payment_qr_url && (
 <div className="flex items-start space-x-3">
 <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
 <QrCode className="w-4 h-4 text-green-500" />
 </div>
 <div>
 <p className="font-medium text-gray-800 dark:text-white">
 QR Code Generated
 </p>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 UPI payment QR available
 </p>
 </div>
 </div>
 )}
 {paymentProofs.length > 0 && (
 <div className="flex items-start space-x-3">
 <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
 <History className="w-4 h-4 text-purple-500" />
 </div>
 <div>
 <p className="font-medium text-gray-800 dark:text-white">
 Payment Proofs Submitted
 </p>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 {paymentProofs.length} proof(s) uploaded by patient
 </p>
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {activeTab === "actions" && (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Actions Column */}
 <div className="lg:col-span-2 space-y-8">
 {/* Quick Actions */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/10 dark:border-gray-700 shadow-lg p-6">
 <h2 className="text-lg font-bold text-[#003358] dark:text-white mb-6 flex items-center">
 <Edit className="w-5 h-5 mr-2 text-teal-500" />
 Update Order Status
 </h2>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {[
 "approved",
 "payment_verified",
 "out_for_delivery",
 "completed",
 "rejected",
 "cancelled",
 ].map((status) => (
 <button
 key={status}
 onClick={() => updateOrderStatus(status)}
 disabled={updating}
 className={`px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 ${statusConfig[status]?.bgColor || "bg-gray-100"
 } hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 <div className="flex items-center space-x-3">
 {statusConfig[status]?.icon}
 <span
 className={`font-medium ${statusConfig[status]?.textColor || "text-gray-700"
 }`}
 >
 {statusConfig[status]?.text}
 </span>
 </div>
 <ChevronRight className="w-4 h-4 opacity-50" />
 </button>
 ))}
 </div>

 <div className="mt-6 pt-6 border-t border-[#0067A1]/10 dark:border-gray-700">
 <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
 Current Status:{" "}
 <span
 className={`font-semibold ${statusConfig[order.status]?.textColor || "text-gray-700"
 }`}
 >
 {statusConfig[order.status]?.text}
 </span>
 </p>
 <p className="text-xs text-gray-500 dark:text-gray-500">
 Last updated:{" "}
 {new Date(
 order.updated_at || order.created_at
 ).toLocaleString("en-IN")}
 </p>
 </div>
 </div>

 {/* Chemist Notes */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/10 dark:border-gray-700 shadow-lg p-6">
 <h2 className="text-lg font-bold text-[#003358] dark:text-white mb-4 flex items-center">
 <FileText className="w-5 h-5 mr-2 text-amber-500" />
 Chemist Notes
 </h2>

 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full h-40 px-3 py-2 bg-[#0067A1]/5 dark:bg-gray-700 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-gray-800 dark:text-gray-200 resize-none"
 placeholder="Add your notes here (instructions, special handling, customer communication, etc.)..."
 />

 <div className="flex items-center space-x-3 mt-4">
 <button
 onClick={() => updateOrderStatus(order.status)} // This will save notes too
 disabled={updating}
 className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <Save className="w-4 h-4" />
 <span>{updating ? "Saving..." : "Save Notes"}</span>
 </button>

 <button
 onClick={() => setNotes("")}
 className="px-4 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-200"
 >
 Clear
 </button>
 </div>
 </div>
 </div>

 {/* Right Column - Order Tools */}
 <div className="space-y-8">
 {/* Order Tools */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/10 dark:border-gray-700 shadow-lg p-6">
 <h2 className="text-lg font-bold text-[#003358] dark:text-white mb-6 flex items-center">
 <ClipboardList className="w-5 h-5 mr-2 text-teal-500" />
 Order Tools
 </h2>

 <div className="space-y-3">
 {invoice ? (
 <button
 onClick={() => setShowInvoice(true)}
 className="w-full px-4 py-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl flex items-center justify-between hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 transition-all duration-200"
 >
 <div className="flex items-center space-x-3">
 <Receipt className="w-4 h-4 text-teal-500" />
 <span className="font-medium text-gray-800 dark:text-white">
 View Invoice
 </span>
 </div>
 <ChevronRight className="w-4 h-4 opacity-50" />
 </button>
 ) : (
 ['approved', 'payment_pending', 'payment_submitted', 'payment_verified', 'waiting_for_bill', 'out_for_delivery', 'completed'].includes(order.status) && (
 <button
 onClick={checkAndGenerateInvoice}
 disabled={updating}
 className="w-full px-4 py-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl flex items-center justify-between hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50"
 >
 <div className="flex items-center space-x-3">
 <Receipt className="w-4 h-4 text-green-500" />
 <span className="font-medium text-gray-800 dark:text-white">
 Generate Invoice
 </span>
 </div>
 <ChevronRight className="w-4 h-4 opacity-50" />
 </button>
 )
 )}

 <button className="w-full px-4 py-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl flex items-center justify-between hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 transition-all duration-200">
 <div className="flex items-center space-x-3">
 <Truck className="w-4 h-4 text-orange-500" />
 <span className="font-medium text-gray-800 dark:text-white">
 Arrange Delivery
 </span>
 </div>
 <ChevronRight className="w-4 h-4 opacity-50" />
 </button>

 <button className="w-full px-4 py-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl flex items-center justify-between hover:bg-[#004F7C]/10 dark:hover:bg-gray-700 transition-all duration-200">
 <div className="flex items-center space-x-3">
 <Phone className="w-4 h-4 text-purple-500" />
 <span className="font-medium text-gray-800 dark:text-white">
 Contact Patient
 </span>
 </div>
 <ChevronRight className="w-4 h-4 opacity-50" />
 </button>
 </div>
 </div>

 {/* Order Summary */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#0067A1]/10 dark:border-gray-700 shadow-lg p-6">
 <h2 className="text-lg font-bold text-[#003358] dark:text-white mb-4 flex items-center">
 <DollarSign className="w-5 h-5 mr-2 text-emerald-500" />
 Financial Summary
 </h2>

 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Order ID
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {order.unid}
 </span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Order Date
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {new Date(order.created_at).toLocaleDateString("en-IN")}
 </span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Total Items
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {order.medicine_order_items?.length || 0}
 </span>
 </div>

 <div className="pt-3 border-t border-[#0067A1]/10 dark:border-gray-700">
 <div className="flex items-center justify-between">
 <span className="text-lg font-bold text-gray-800 dark:text-white">
 Total Amount
 </span>
 <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
 ₹{totalAmount.toLocaleString()}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Payment Request Modal */}
 {showPaymentRequest && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
 <div className="p-6">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
 <CreditCard className="w-5 h-5 mr-2 text-emerald-500" />
 Send Payment Request
 </h3>
 <button
 onClick={() => setShowPaymentRequest(false)}
 className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
 >
 <X className="w-5 h-5 text-gray-500" />
 </button>
 </div>

 <div className="space-y-4">
 {/* Use Saved QR Option */}
 {savedQr && (
 <div className="mb-4">
 <label className="flex items-center space-x-2 cursor-pointer">
 <input
 type="checkbox"
 checked={useSavedQr}
 onChange={(e) => setUseSavedQr(e.target.checked)}
 className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-400"
 />
 <span className="text-gray-700 dark:text-gray-300">
 Use saved QR code
 </span>
 </label>
 {useSavedQr && savedQr.payment_qr_url && (
 <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
 <div className="flex items-center space-x-3 mb-2">
 <QrCode className="w-4 h-4 text-emerald-500" />
 <span className="font-medium text-gray-700 dark:text-gray-300">
 Saved QR ({savedQr.payment_qr_label || "UPI"})
 </span>
 </div>
 <div className="w-32 h-32 mx-auto bg-white p-2 rounded-lg">
 <img
 src={savedQr.payment_qr_url}
 alt="Saved QR Code"
 className="w-full h-full object-contain"
 />
 </div>
 </div>
 )}
 </div>
 )}

 {/* QR Upload Section */}
 {!useSavedQr && (
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 Upload QR Code
 </label>
 <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer">
 <input
 type="file"
 accept="image/*"
 onChange={handleQrUpload}
 className="hidden"
 id="qr-upload"
 />
 <label htmlFor="qr-upload" className="cursor-pointer">
 {qrPreview ? (
 <div className="space-y-3">
 <div className="w-40 h-40 mx-auto bg-white p-2 rounded-lg">
 <img
 src={qrPreview}
 alt="QR Preview"
 className="w-full h-full object-contain"
 />
 </div>
 <button
 type="button"
 onClick={() => {
 setQrFile(null);
 setQrPreview(null);
 }}
 className="text-sm text-red-500 hover:text-red-600"
 >
 Remove
 </button>
 </div>
 ) : (
 <div className="space-y-2">
 <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
 <Upload className="w-5 h-5 text-emerald-500" />
 </div>
 <p className="text-gray-600 dark:text-gray-400">
 Click to upload QR code image
 </p>
 <p className="text-xs text-gray-500">
 PNG, JPG up to 5MB
 </p>
 </div>
 )}
 </label>
 </div>
 </div>
 )}

 {/* UPI Payment Payload */}
 {!useSavedQr && (
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 UPI Payment Payload
 </label>
 <input
 type="text"
 value={paymentQrPayload}
 onChange={(e) => setPaymentQrPayload(e.target.value)}
 placeholder="upi://pay?pa=example@upi"
 className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-gray-800 dark:text-gray-200"
 />
 </div>
 )}

 {/* QR Label */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 QR Label (Optional)
 </label>
 <input
 type="text"
 value={qrLabel}
 onChange={(e) => setQrLabel(e.target.value)}
 placeholder="e.g., UPI, Google Pay, PhonePe"
 className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-gray-800 dark:text-gray-200"
 />
 </div>

 {/* Save for Future Option */}
 {!useSavedQr && (
 <div className="flex items-center space-x-2">
 <input
 type="checkbox"
 id="save-for-future"
 checked={saveForFuture}
 onChange={(e) => setSaveForFuture(e.target.checked)}
 className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-400"
 />
 <label
 htmlFor="save-for-future"
 className="text-sm text-gray-700 dark:text-gray-300"
 >
 Save this QR code for future use
 </label>
 </div>
 )}

 {/* Amount Display */}
 <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
 <div className="flex items-center justify-between">
 <span className="text-gray-700 dark:text-gray-300">
 Amount to Request
 </span>
 <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
 ₹
 {(
 totalAmount + (order.delivery_charge || 0)
 ).toLocaleString()}
 </span>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex space-x-3 pt-4">
 <button
 onClick={() => setShowPaymentRequest(false)}
 className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
 >
 Cancel
 </button>
 <button
 onClick={sendPaymentRequest}
 disabled={updating}
 className="flex-1 px-4 py-2.5 bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-all duration-200 shadow-lg disabled:opacity-50"
 >
 {updating ? "Sending..." : "Send Request"}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Invoice Modal */}
 {showInvoice && invoice && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
 <div className="p-6">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center uppercase">
 <Receipt className="w-5 h-5 mr-2 text-purple-500" />
 Invoice #{invoice.invoice_number}
 </h3>
 <div className="flex items-center space-x-2">
 {invoice.download_url && (
 <button
 onClick={downloadInvoice}
 className="px-4 py-2 bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-all duration-200 flex items-center space-x-2"
 >
 <FileDown className="w-4 h-4" />
 <span>Download PDF</span>
 </button>
 )}
 <button
 onClick={() => setShowInvoice(false)}
 className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
 >
 <X className="w-5 h-5 text-gray-500" />
 </button>
 </div>
 </div>

 <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
 {/* Invoice Header */}
 <div className="flex justify-between items-start mb-8">
 <div>
 <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
 TAX INVOICE
 </h2>
 <p className="text-gray-600 dark:text-gray-400">
 Original for Recipient
 </p>
 </div>
 <div className="text-right">
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Invoice #
 </p>
 <p className="text-lg font-bold text-gray-800 dark:text-white uppercase">
 {invoice.invoice_number}
 </p>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Date:{" "}
 {new Date(invoice.created_at).toLocaleDateString("en-IN")}
 </p>
 </div>
 </div>

 {/* Seller and Buyer Info */}
 <div className="grid grid-cols-2 gap-8 mb-8">
 <div>
 <h3 className="font-bold text-gray-800 dark:text-white mb-2">
 Sold By
 </h3>
 <p className="font-semibold text-gray-800 dark:text-white">
 {invoice.invoice_data?.seller?.pharmacy_name}
 </p>
 <p className="text-gray-600 dark:text-gray-400">
 {invoice.invoice_data?.seller?.address}
 </p>
 <p className="text-gray-600 dark:text-gray-400">
 GSTIN: {invoice.invoice_data?.seller?.gstin || "N/A"}
 </p>
 </div>
 <div>
 <h3 className="font-bold text-gray-800 dark:text-white mb-2">
 Billed To
 </h3>
 <p className="font-semibold text-gray-800 dark:text-white">
 {invoice.invoice_data?.buyer?.patient_name}
 </p>
 <p className="text-gray-600 dark:text-gray-400">
 {invoice.invoice_data?.buyer?.address}
 </p>
 <p className="text-gray-600 dark:text-gray-400">
 Phone: {invoice.invoice_data?.buyer?.phone}
 </p>
 </div>
 </div>

 {/* Items Table */}
 <div className="mb-8">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 dark:bg-gray-800">
 <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
 Description
 </th>
 <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
 Qty
 </th>
 <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
 Unit Price
 </th>
 <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
 Total
 </th>
 </tr>
 </thead>
 <tbody>
 {invoice.invoice_data?.items?.map((item, index) => (
 <tr
 key={index}
 className="border-b border-gray-200 dark:border-gray-700"
 >
 <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
 {item.name}
 </td>
 <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
 {item.quantity}
 </td>
 <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
 ₹{Number(item.unit_price || 0).toFixed(2)}
 </td>
 <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
 ₹{Number(item.total || 0).toFixed(2)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Total Section */}
 <div className="flex justify-end">
 <div className="w-64">
 <div className="flex justify-between mb-2">
 <span className="text-gray-600 dark:text-gray-400">
 Subtotal
 </span>
 <span className="font-medium text-gray-800 dark:text-white">
 ₹{Number(invoice.subtotal || 0).toFixed(2)}
 </span>
 </div>
 <div className="flex justify-between mb-2">
 <span className="text-gray-600 dark:text-gray-400">
 Tax (GST)
 </span>
 <span className="font-medium text-gray-800 dark:text-white">
 ₹{Number(invoice.tax_amount || 0).toFixed(2)}
 </span>
 </div>
 <div className="flex justify-between pt-4 border-t border-gray-300 dark:border-gray-600">
 <span className="text-lg font-bold text-gray-800 dark:text-white">
 Grand Total
 </span>
 <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
 ₹{Number(invoice.total_amount || 0).toFixed(2)}
 </span>
 </div>
 </div>
 </div>

 {/* Footer Notes */}
 <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
 <p className="mb-2">
 Payment Mode:{" "}
 {invoice.invoice_data?.invoice?.payment_mode || "UPI"}
 </p>
 <p>
 This is a computer generated invoice, no signature required.
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Invoice Already Generated Info Modal */}
 {invoiceModalInfo.show && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
 <div className="p-6">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
 <Receipt className="w-5 h-5 mr-2 text-purple-500" />
 Invoice Information
 </h3>
 <button
 onClick={() =>
 setInvoiceModalInfo({
 show: false,
 message: "",
 existingInvoice: null,
 })
 }
 className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
 >
 <X className="w-5 h-5 text-gray-500" />
 </button>
 </div>

 <div className="space-y-4">
 <div className="bg-[#0067A1]/5 dark:bg-[#003358]/20 rounded-xl p-4">
 <p className="text-gray-700 dark:text-gray-300">
 {invoiceModalInfo.message}
 </p>
 </div>

 {invoiceModalInfo.existingInvoice && (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Invoice Number:
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {invoiceModalInfo.existingInvoice.invoice_number}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Generated On:
 </span>
 <span className="font-semibold text-gray-800 dark:text-white">
 {new Date(
 invoiceModalInfo.existingInvoice.created_at
 ).toLocaleDateString("en-IN")}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-600 dark:text-gray-400">
 Total Amount:
 </span>
 <span className="font-semibold text-emerald-600 dark:text-emerald-400">
 ₹
 {Number(invoiceModalInfo.existingInvoice.total_amount || 0).toFixed(2)}
 </span>
 </div>
 </div>
 )}

 <div className="flex space-x-3 pt-4">
 <button
 onClick={() =>
 setInvoiceModalInfo({
 show: false,
 message: "",
 existingInvoice: null,
 })
 }
 className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
 >
 Close
 </button>
 {invoiceModalInfo.existingInvoice && (
 <button
 onClick={() => {
 setShowInvoice(true);
 setInvoiceModalInfo({
 show: false,
 message: "",
 existingInvoice: null,
 });
 }}
 className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 shadow-lg "
 >
 View Invoice
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Payment Proofs Modal */}
 {showPaymentProofs && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
 <div className="p-6">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
 <History className="w-5 h-5 mr-2 text-teal-500" />
 Payment Proofs ({paymentProofs.length})
 </h3>
 <button
 onClick={() => setShowPaymentProofs(false)}
 className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
 >
 <X className="w-5 h-5 text-gray-500" />
 </button>
 </div>

 <div className="space-y-4">
 {paymentProofs.length > 0 ? (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {paymentProofs.map((proof, index) => (
 <div
 key={index}
 className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
 >
 <div className="flex items-center justify-between mb-3">
 <div>
 <p className="font-medium text-gray-800 dark:text-white">
 Proof #{index + 1}
 </p>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Submitted:{" "}
 {new Date(proof.created_at).toLocaleString(
 "en-IN"
 )}
 </p>
 </div>
 <span
 className={`px-2 py-1 rounded text-xs ${proof.status === "verified"
 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
 : proof.status === "declined"
 ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
 : "bg-[#0067A1]/10 text-[#004F7C] dark:bg-[#003358]/30 dark:text-[#0080C6]"
 }`}
 >
 {proof.status || "pending"}
 </span>
 </div>
 <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2">
 <img
 src={proof.payment_proof_url}
 alt={`Payment Proof ${index + 1}`}
 className="w-full h-48 object-contain rounded"
 />
 </div>
 {proof.notes && (
 <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
 Notes: {proof.notes}
 </p>
 )}
 <div className="mt-3 flex justify-end">
 <button
 onClick={() =>
 window.open(proof.payment_proof_url, "_blank")
 }
 className="px-3 py-1.5 bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-all duration-200 text-sm flex items-center space-x-1"
 >
 <Eye className="w-3 h-3" />
 <span>View Full Size</span>
 </button>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-8">
 <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
 <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
 No Payment Proofs
 </h3>
 <p className="text-gray-600 dark:text-gray-400">
 No payment proofs have been submitted for this order yet.
 </p>
 </div>
 )}

 <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
 <button
 onClick={() => setShowPaymentProofs(false)}
 className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
