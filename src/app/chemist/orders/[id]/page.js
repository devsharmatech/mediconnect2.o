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

      // If order is paid, make sure active tab is not 'medicines'
      const isOrderPaid =
        result.data?.payment_status === "paid" ||
        [
          "packing",
          "ready_for_dispatch",
          "out_for_delivery",
          "completed",
          "delivered",
          "payment_verified",
          "fulfilment_confirmed",
          "fulfilment_released",
        ].includes(String(result.data?.status).toLowerCase());

      if (isOrderPaid) {
        setActiveTab((prev) => (prev === "medicines" ? "details" : prev));
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while fetching order details");
    } finally {
      setLoading(false);
    }
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
        toast.success("Medicine item updated");
        await fetchOrder();
      } else {
        toast.error(result.message || "Failed to update item");
      }
    } catch (e) {
      toast.error("Error updating item");
    } finally {
      setUpdating(false);
    }
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
        toast.success("Order status updated");
        await fetchOrder();
      } else {
        toast.error(result.message || "Failed to update status");
      }
    } catch (e) {
      toast.error("Update failed. Please try again.");
    } finally {
      setUpdating(false);
    }
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
        toast.success("Payment request sent");
        setShowPaymentRequest(false);
        await fetchOrder();
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
        toast.success("Payment verified");
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
        setInvoiceModalInfo({
          show: true,
          message: "An invoice has already been generated for this order.",
          existingInvoice: checkResult.data,
        });
        setInvoice(checkResult.data);
      } else {
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
        toast.success("Invoice generated");
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
      const link = document.createElement("a");
      link.href = invoice.download_url;
      link.download = `invoice_${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Downloading invoice");
    } catch (err) {
      console.error("Error downloading invoice:", err);
      toast.error("Failed to download invoice");
    }
  };

  const statusConfig = {
    waiting_for_bill: {
      color: "bg-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      textColor: "text-purple-700 dark:text-purple-400",
      icon: <FileText className="w-3.5 h-3.5" />,
      text: "Waiting for Bill",
    },
    payment_pending: {
      color: "bg-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      textColor: "text-amber-700 dark:text-amber-400",
      icon: <Clock className="w-3.5 h-3.5" />,
      text: "Awaiting Payment",
    },
    waiting_for_payment: {
      color: "bg-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      textColor: "text-amber-700 dark:text-amber-400",
      icon: <Clock className="w-3.5 h-3.5" />,
      text: "Awaiting Payment",
    },
    payment_submitted: {
      color: "bg-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      textColor: "text-blue-700 dark:text-blue-400",
      icon: <Clock className="w-3.5 h-3.5" />,
      text: "Payment Submitted",
    },
    fulfilment_released: {
      color: "bg-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      textColor: "text-blue-700 dark:text-blue-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      text: "Fulfilment Released",
    },
    fulfilment_confirmed: {
      color: "bg-teal-600",
      bgColor: "bg-teal-50 dark:bg-teal-950/20",
      textColor: "text-teal-700 dark:text-teal-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      text: "Fulfilment Confirmed",
    },
    packing: {
      color: "bg-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      textColor: "text-amber-700 dark:text-amber-400",
      icon: <Package className="w-3.5 h-3.5" />,
      text: "Packing Medicines",
    },
    ready_for_dispatch: {
      color: "bg-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      textColor: "text-purple-700 dark:text-purple-400",
      icon: <Package className="w-3.5 h-3.5" />,
      text: "Ready for Dispatch",
    },
    delivered: {
      color: "bg-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      textColor: "text-emerald-700 dark:text-emerald-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      text: "Delivered",
    },
    payment_verified: {
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      textColor: "text-emerald-700 dark:text-emerald-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      text: "Payment Verified",
    },
    approved: {
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      textColor: "text-emerald-700 dark:text-emerald-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      text: "Approved",
    },
    partially_approved: {
      color: "bg-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      textColor: "text-blue-700 dark:text-blue-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      text: "Partially Approved",
    },
    ready_for_pickup: {
      color: "bg-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
      textColor: "text-indigo-700 dark:text-indigo-400",
      icon: <Package className="w-3.5 h-3.5" />,
      text: "Ready for Pickup",
    },
    payment_verification_failed: {
      color: "bg-rose-500",
      bgColor: "bg-rose-50 dark:bg-rose-950/20",
      textColor: "text-rose-700 dark:text-rose-400",
      icon: <XCircle className="w-3.5 h-3.5" />,
      text: "Verification Failed",
    },
    out_for_delivery: {
      color: "bg-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      textColor: "text-orange-700 dark:text-orange-400",
      icon: <Truck className="w-3.5 h-3.5" />,
      text: "Out for Delivery",
    },
    completed: {
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      textColor: "text-emerald-700 dark:text-emerald-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      text: "Delivered",
    },
    rejected: {
      color: "bg-red-500",
      bgColor: "bg-red-50 dark:bg-red-950/20",
      textColor: "text-red-700 dark:text-red-400",
      icon: <XCircle className="w-3.5 h-3.5" />,
      text: "Rejected",
    },
    cancelled: {
      color: "bg-gray-500",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      textColor: "text-gray-700 dark:text-gray-400",
      icon: <XCircle className="w-3.5 h-3.5" />,
      text: "Cancelled",
    },
  };

  if (loading) {
    return (
      <div className="p-8 sm:p-12 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-slate-800 dark:text-slate-200 text-sm font-semibold">
          Loading order details...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 sm:p-12 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-3">
          <ClipboardList className="w-7 h-7 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
          Order not found
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-5 max-w-sm">
          The requested medicine order does not exist or you do not have permission to view it.
        </p>
        <button
          onClick={() => router.push("/chemist/orders")}
          className="px-4 py-2 bg-[#0067A1] text-white rounded-md hover:bg-[#005585] text-xs font-semibold transition-colors cursor-pointer"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const isPaid =
    order.payment_status === "paid" ||
    [
      "packing",
      "ready_for_dispatch",
      "out_for_delivery",
      "completed",
      "delivered",
      "payment_verified",
      "fulfilment_confirmed",
      "fulfilment_released",
    ].includes(String(order.status).toLowerCase());

  const rawMedicineSubtotal = Number(order.medicine_subtotal);
  const rawTotalAmount = Number(order.total_amount);
  const deliveryCharge = Number(order.delivery_charge) || 0;
  const discountAmount = Number(order.discount) || 0;

  const itemsSubtotal =
    order.medicine_order_items?.reduce((sum, item) => {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
    }, 0) || 0;

  const medicineSubtotal =
    rawMedicineSubtotal > 0
      ? rawMedicineSubtotal
      : itemsSubtotal > 0
      ? itemsSubtotal
      : rawTotalAmount > 0
      ? Math.max(0, rawTotalAmount - deliveryCharge + discountAmount)
      : 0;

  const grandTotal =
    rawTotalAmount > 0
      ? rawTotalAmount
      : Math.max(0, medicineSubtotal + deliveryCharge - discountAmount);

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/chemist/orders")}
            className="p-2 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-[#0067A1] text-white rounded-md flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Order #{order.unid}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                    statusConfig[order.status]?.bgColor || "bg-slate-100"
                  } ${statusConfig[order.status]?.textColor || "text-slate-700"} border border-current/20`}
                >
                  {statusConfig[order.status]?.icon}
                  <span>{statusConfig[order.status]?.text || order.status.replace(/_/g, " ")}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                View and manage order fulfillment
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons based on status */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {order.status === "fulfilment_released" && (
            <button
              onClick={() => updateOrderStatus("fulfilment_confirmed")}
              disabled={updating}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{updating ? "Confirming..." : "Confirm"}</span>
            </button>
          )}

          {order.status === "fulfilment_confirmed" && (
            <button
              onClick={() => updateOrderStatus("packing")}
              disabled={updating}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{updating ? "Packing..." : "Start Packing"}</span>
            </button>
          )}

          {order.status === "packing" && (
            <button
              onClick={() => updateOrderStatus("ready_for_dispatch")}
              disabled={updating}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{updating ? "Updating..." : "Ready to Dispatch"}</span>
            </button>
          )}

          {["ready_for_dispatch", "payment_verified"].includes(order.status) && (
            <button
              onClick={() => updateOrderStatus("out_for_delivery")}
              disabled={updating}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{updating ? "Updating..." : "Out for Delivery"}</span>
            </button>
          )}

          {order.status === "out_for_delivery" && (
            <button
              onClick={() => updateOrderStatus("completed")}
              disabled={updating}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{updating ? "Completing..." : "Mark Delivered"}</span>
            </button>
          )}

          {order.status === "payment_submitted" && (
            <>
              <button
                onClick={verifyPayment}
                disabled={updating}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{updating ? "Verifying..." : "Verify Payment"}</span>
              </button>
              <button
                onClick={declinePayment}
                disabled={updating}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Decline</span>
              </button>
            </>
          )}

          {/* Dispensing Copy */}
          <button
            onClick={() => {
              const url = `/api/chemists/order/dispensing-copy?order_id=${order.id}&chemist_id=${order.chemist_id || chemist?.id}&format=html`;
              window.open(url, "_blank");
            }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Dispensing Copy"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Dispensing Copy</span>
          </button>

          {!invoice &&
            [
              "approved",
              "payment_pending",
              "payment_submitted",
              "payment_verified",
              "waiting_for_bill",
              "out_for_delivery",
              "completed",
            ].includes(order.status) && (
              <button
                onClick={checkAndGenerateInvoice}
                disabled={updating}
                className="px-3.5 py-1.5 bg-[#0067A1] hover:bg-[#005585] text-white rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{updating ? "Generating..." : "Generate Bill"}</span>
              </button>
            )}

          {invoice && (
            <button
              onClick={() => setShowInvoice(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* SLA Live Status Indicator Banner */}
      {order.sla_status === "SLA_BREACHED" && (
        <div className="p-3 sm:p-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-xs sm:text-sm text-rose-800 dark:text-rose-300">
                Delivery SLA Breached
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                The promised delivery time ({order.promised_delivery_at ? dayjs(order.promised_delivery_at).format("hh:mm A, DD MMM") : "Expired"}) has been missed. Please expedite delivery.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-rose-600 text-white font-bold text-[10px] rounded uppercase self-start sm:self-center">
            Breached
          </span>
        </div>
      )}

      {order.sla_status === "SLA_AT_RISK" && (
        <div className="p-3 sm:p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                Delivery Commitment Approaching (SLA at Risk)
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                80% of the delivery window has elapsed. Promised by {order.promised_delivery_at ? dayjs(order.promised_delivery_at).format("hh:mm A") : "soon"}.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-amber-600 text-white font-bold text-[10px] rounded uppercase self-start sm:self-center">
            At Risk
          </span>
        </div>
      )}

      {order.sla_status === "ON_TRACK" && order.promised_delivery_at && (
        <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>
              Promised delivery by{" "}
              <strong className="font-semibold">{dayjs(order.promised_delivery_at).format("hh:mm A, DD MMM")}</strong>
            </span>
          </div>
          <span className="px-2 py-0.5 bg-teal-600 text-white font-semibold text-[10px] rounded">
            On Track
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none gap-1">
        {[
          { id: "details", label: "Order Details", icon: ClipboardList },
          ...(!isPaid
            ? [
                {
                  id: "medicines",
                  label: `Medicines (${order.medicine_order_items?.length || 0})`,
                  icon: Pill,
                },
              ]
            : []),
          { id: "prescription", label: "Prescription", icon: FileText },
          { id: "billing", label: "Billing & Payment", icon: DollarSign },
          { id: "actions", label: "Actions", icon: Edit },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer border-b-2 -mb-px ${
                isActive
                  ? "text-[#0067A1] dark:text-sky-400 border-[#0067A1] dark:border-sky-400"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content based on active tab */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Patient Info & Order Details */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Patient Information Card */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0067A1]" />
                  <span>Patient Information</span>
                </h2>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-[#0067A1] dark:text-blue-400 rounded text-xs font-semibold">
                  Patient
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-[#0067A1] dark:text-blue-400 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Full Name</p>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate mt-0.5">
                      {order.patient?.patient_details?.full_name || "Unknown Patient"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Phone Number</p>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate mt-0.5">
                      {order.patient?.phone_number || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Delivery Address</p>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate mt-0.5">
                      {order.patient?.patient_details?.address || "Address not available"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Order Date</p>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      •{" "}
                      {new Date(order.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ordered Medicines Card */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Pill className="w-4 h-4 text-purple-600" />
                  <span>Ordered Medicines</span>
                </h2>
                <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold">
                  {order.medicine_order_items?.length || 0} items
                </span>
              </div>

              <div className="space-y-2.5">
                {order.medicine_order_items && order.medicine_order_items.length > 0 ? (
                  order.medicine_order_items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                            {item.medicine_name || `Medicine ${idx + 1}`}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{item.dosage || "Standard dose"}</span>
                            {item.frequency && <span>• {item.frequency}</span>}
                            {item.duration && <span>• {item.duration}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700/60">
                        <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
                          Qty: {item.quantity || 1}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle className="w-3 h-3" />
                          <span>Included</span>
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center">No medicines attached to this order.</p>
                )}
              </div>
            </div>

            {/* Order Summary Card */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#0067A1]" />
                <span>Order Summary</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Order UNID</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      #{order.unid}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Status</span>
                    <span className={`font-semibold ${statusConfig[order.status]?.textColor || "text-slate-700"}`}>
                      {statusConfig[order.status]?.text}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Order Type</span>
                    <span className="font-semibold text-slate-900 dark:text-white capitalize">
                      {order.order_type || "Regular"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Created At</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {new Date(order.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Last Updated</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {new Date(order.updated_at || order.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Total Items</span>
                    <span className="font-bold text-[#0067A1] dark:text-sky-400">
                      {order.medicine_order_items?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Financial Summary & Prescription Card */}
          <div className="space-y-4 sm:space-y-6">
            {/* Financial Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Financial Summary</span>
                </h2>
                {isPaid ? (
                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                    Paid
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded text-[11px] font-bold border border-amber-200 dark:border-amber-800">
                    Unpaid
                  </span>
                )}
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Medicines Subtotal</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ₹{medicineSubtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Delivery Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ₹{deliveryCharge.toLocaleString()}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span className="font-semibold">-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm block">
                      Grand Total
                    </span>
                    {order.payment_method && (
                      <span className="text-[10px] text-slate-400 capitalize block">
                        via {order.payment_method}
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Prescription Status */}
            {order.prescription_id && (
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Prescription Attached</span>
                </h2>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Rx ID:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {order.prescription?.pid || order.prescription?.formatted_id || `${order.prescription_id.slice(0, 8)}...`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Status:</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold text-[11px]">
                      Verified
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("prescription")}
                  className="mt-4 w-full px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Prescription</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Medicines Tab (Unpaid orders only) */}
      {!isPaid && activeTab === "medicines" && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Pill className="w-4 h-4 text-purple-600" />
              <span>Order Medicines</span>
            </h2>
            <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 rounded-md text-xs font-semibold">
              {order.medicine_order_items?.length || 0} items
            </span>
          </div>

          <div className="space-y-3.5">
            {order.medicine_order_items?.map((item, index) => (
              <div
                key={item.id}
                className="border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-800/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-purple-100 dark:bg-purple-900/40 text-purple-600 rounded-md flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {item.medicine_name || `Medicine ${index + 1}`}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.dosage || "Standard dose"} • {item.frequency || "As prescribed"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold self-start sm:self-auto ${
                      statusConfig[item.status]?.bgColor || "bg-slate-100"
                    } ${statusConfig[item.status]?.textColor || "text-slate-700"}`}
                  >
                    {statusConfig[item.status]?.icon}
                    <span>{statusConfig[item.status]?.text || item.status.replace(/_/g, " ")}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium mb-1 block">Quantity</label>
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
                        setOrder({ ...order, medicine_order_items: updatedItems });
                      }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#0067A1]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 font-medium mb-1 block">Price (₹)</label>
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
                        setOrder({ ...order, medicine_order_items: updatedItems });
                      }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#0067A1]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 font-medium mb-1 block">Status</label>
                    <select
                      value={item.status}
                      onChange={(e) => {
                        const updatedItems = [...order.medicine_order_items];
                        updatedItems[index] = {
                          ...updatedItems[index],
                          status: e.target.value,
                        };
                        setOrder({ ...order, medicine_order_items: updatedItems });
                      }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#0067A1]"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="available">Available</option>
                      <option value="not_available">Not Available</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => updateItem(item)}
                    disabled={updating}
                    className="px-3.5 py-1.5 bg-[#0067A1] hover:bg-[#005585] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{updating ? "Saving..." : "Update"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {order.medicine_order_items?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Subtotal</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{medicineSubtotal.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Items</p>
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {order.medicine_order_items.length}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prescription Tab */}
      {activeTab === "prescription" && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Digital Prescription</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 rounded-md text-xs font-mono font-semibold">
                Rx #{order.prescription?.pid || order.prescription?.formatted_id || "Rx"}
              </span>
            </div>
          </div>

          {order.prescription ? (
            <>
              {/* Iframe */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={buildPrescriptionHtml(
                    {
                      ...order.prescription,
                      pid:
                        order.prescription.pid ||
                        order.prescription.formatted_id ||
                        order.prescription.id?.slice(0, 8) ||
                        "N/A",
                      created_at: order.prescription.created_at,
                      signed_at: order.prescription.signed_at || order.prescription.created_at,
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
                      patient_details: order.prescription.patient_details || null,
                      appointments: order.prescription.appointments || null,
                    },
                    { hideClinicDetails: true, isChemistView: true }
                  )}
                  title="Prescription"
                  className="w-full h-[550px] sm:h-[700px] md:h-[800px]"
                  sandbox="allow-same-origin"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-end pt-2">
                <button
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    const prescriptionData = {
                      ...order.prescription,
                      pid: order.prescription.pid || order.prescription.formatted_id || "N/A",
                      created_at: order.prescription.created_at,
                      signed_at: order.prescription.signed_at || order.prescription.created_at,
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
                      special_message: order.prescription.special_message || "",
                      ai_analysis: order.prescription.ai_analysis || null,
                      doctor_details: order.prescription.doctor_details || null,
                      patient_details: order.prescription.patient_details || null,
                      appointments: order.prescription.appointments || null,
                    };

                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Prescription #${prescriptionData.pid}</title>
                        <style>body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }</style>
                      </head>
                      <body>
                        ${buildPrescriptionHtml(prescriptionData, { hideClinicDetails: true, isChemistView: true })}
                        <script>
                          window.onload = function() {
                            setTimeout(() => { window.print(); setTimeout(() => window.close(), 1000); }, 500);
                          }
                        </script>
                      </body>
                      </html>
                    `);
                  }}
                  className="px-3.5 py-1.5 bg-[#0067A1] hover:bg-[#005585] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => {
                    const prescriptionData = {
                      ...order.prescription,
                      pid: order.prescription.pid || order.prescription.formatted_id || "N/A",
                      created_at: order.prescription.created_at,
                      signed_at: order.prescription.signed_at || order.prescription.created_at,
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
                      special_message: order.prescription.special_message || "",
                      ai_analysis: order.prescription.ai_analysis || null,
                      doctor_details: order.prescription.doctor_details || null,
                      patient_details: order.prescription.patient_details || null,
                      appointments: order.prescription.appointments || null,
                    };

                    const htmlContent = buildPrescriptionHtml(prescriptionData, {
                      hideClinicDetails: true,
                      isChemistView: true,
                    });
                    const blob = new Blob([htmlContent], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `Prescription_${prescriptionData.pid}_${dayjs().format("YYYY-MM-DD")}.html`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">No Prescription Found</h3>
              <p className="text-xs text-slate-500 mt-1">This order does not have a prescription attached.</p>
            </div>
          )}
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Amount Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-3 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Amount Summary</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ₹{medicineSubtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ₹{deliveryCharge.toLocaleString()}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount:</span>
                    <span className="font-semibold">-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold text-sm">
                  <span className="text-slate-900 dark:text-white">Total:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ₹{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-3 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#0067A1]" />
                <span>Payment Status</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status:</span>
                  <span className={`font-semibold ${isPaid ? "text-emerald-600 dark:text-emerald-400" : (statusConfig[order.status]?.textColor || "text-slate-700")}`}>
                    {isPaid ? "Paid" : (statusConfig[order.status]?.text || order.status)}
                  </span>
                </div>
                {order.payment_method && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Method:</span>
                    <span className="font-semibold text-slate-900 dark:text-white uppercase">
                      {order.payment_method}
                    </span>
                  </div>
                )}
                {order.razorpay_payment_id && (
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                    <span className="text-slate-500">Payment ID: </span>
                    <span className="font-bold text-slate-900 dark:text-white break-all">{order.razorpay_payment_id}</span>
                  </div>
                )}
                {order.utr_number && (
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                    <span className="text-slate-500">UTR: </span>
                    <span className="font-bold text-slate-900 dark:text-white">{order.utr_number}</span>
                  </div>
                )}
                {order.payment?.proofs?.[0]?.payment_proof_url && (
                  <button
                    onClick={() => window.open(order.payment.proofs[0].payment_proof_url, "_blank")}
                    className="w-full mt-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0067A1] border border-blue-200 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Proof</span>
                  </button>
                )}
              </div>
            </div>

            {/* Invoice Status */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-3 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-purple-600" />
                <span>Invoice</span>
              </h3>
              <div className="space-y-2 text-xs">
                {invoice ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoice No:</span>
                      <span className="font-mono font-semibold uppercase">{invoice.invoice_number}</span>
                    </div>
                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => setShowInvoice(true)}
                        className="flex-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      {invoice.download_url && (
                        <button
                          onClick={downloadInvoice}
                          className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 text-xs py-2">No invoice generated yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Actions */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-3">
              Payment Actions
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {!isPaid &&
                (order.status === "approved" ||
                  order.status === "partially_approved" ||
                  order.status === "payment_declined") && (
                <button
                  onClick={() => setShowPaymentRequest(true)}
                  className="px-3.5 py-2 bg-[#0067A1] hover:bg-[#005585] text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Request Payment</span>
                </button>
              )}

              {paymentProofs.length > 0 && (
                <button
                  onClick={() => setShowPaymentProofs(true)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View Proofs ({paymentProofs.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions Tab */}
      {activeTab === "actions" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Status Advance */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                <Edit className="w-4 h-4 text-[#0067A1]" />
                <span>Update Order Status</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    className={`px-3 py-2 rounded-md flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 ${
                      statusConfig[status]?.bgColor || "bg-slate-50"
                    } hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-2">
                      {statusConfig[status]?.icon}
                      <span className={statusConfig[status]?.textColor}>{statusConfig[status]?.text}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  </button>
                ))}
              </div>
            </div>

            {/* Chemist Notes */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Chemist Notes</span>
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white resize-none outline-none focus:border-[#0067A1]"
                placeholder="Enter internal instructions or patient communication notes..."
              />
              <div className="flex gap-2 mt-3 justify-end">
                <button
                  onClick={() => setNotes("")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={() => updateOrderStatus(order.status)}
                  disabled={updating}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{updating ? "Saving..." : "Save Notes"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Order Details</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-mono font-bold">#{order.unid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Items:</span>
                  <span className="font-bold">{order.medicine_order_items?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="font-bold text-emerald-600">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Request Modal */}
      {showPaymentRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-full max-w-md max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Send Payment Request</span>
              </h3>
              <button
                onClick={() => setShowPaymentRequest(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Use Saved QR Option */}
              {savedQr && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={useSavedQr}
                      onChange={(e) => setUseSavedQr(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#0067A1]"
                    />
                    <span>Use saved QR code</span>
                  </label>
                  {useSavedQr && savedQr.payment_qr_url && (
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-center">
                      <img
                        src={savedQr.payment_qr_url}
                        alt="Saved QR"
                        className="w-28 h-28 object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Upload QR */}
              {!useSavedQr && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Upload QR Code Image
                  </label>
                  <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrUpload}
                      className="hidden"
                      id="qr-upload"
                    />
                    <label htmlFor="qr-upload" className="cursor-pointer block">
                      {qrPreview ? (
                        <div className="space-y-2">
                          <img src={qrPreview} alt="Preview" className="w-28 h-28 mx-auto object-contain" />
                          <button
                            type="button"
                            onClick={() => {
                              setQrFile(null);
                              setQrPreview(null);
                            }}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-5 h-5 mx-auto text-slate-400" />
                          <p className="text-slate-600 dark:text-slate-400 font-medium text-xs">Click to upload QR image</p>
                          <p className="text-[10px] text-slate-400">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* UPI Payload */}
              {!useSavedQr && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    UPI Payload (String)
                  </label>
                  <input
                    type="text"
                    value={paymentQrPayload}
                    onChange={(e) => setPaymentQrPayload(e.target.value)}
                    placeholder="upi://pay?pa=example@upi"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#0067A1]"
                  />
                </div>
              )}

              {/* Amount Display */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between font-bold text-xs">
                <span className="text-emerald-900 dark:text-emerald-300">Amount:</span>
                <span className="text-emerald-700 dark:text-emerald-400 text-sm">
                  ₹{grandTotal.toLocaleString()}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowPaymentRequest(false)}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={sendPaymentRequest}
                  disabled={updating}
                  className="flex-1 px-3 py-2 bg-[#0067A1] hover:bg-[#005585] text-white rounded-md text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {updating ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && invoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600" />
                <span>Invoice #{invoice.invoice_number}</span>
              </h3>
              <div className="flex items-center gap-2">
                {invoice.download_url && (
                  <button
                    onClick={downloadInvoice}
                    className="px-2.5 py-1 bg-[#0067A1] text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                )}
                <button
                  onClick={() => setShowInvoice(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Sold By</p>
                  <p className="text-slate-600 dark:text-slate-300">{invoice.invoice_data?.seller?.pharmacy_name}</p>
                  <p className="text-slate-500">{invoice.invoice_data?.seller?.address}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Billed To</p>
                  <p className="text-slate-600 dark:text-slate-300">{invoice.invoice_data?.buyer?.patient_name}</p>
                  <p className="text-slate-500">{invoice.invoice_data?.buyer?.address}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">Price</th>
                      <th className="py-2 px-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoice.invoice_data?.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{item.quantity}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">₹{Number(item.unit_price || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">₹{Number(item.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <div className="w-56 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-semibold">₹{Number(invoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax:</span>
                    <span className="font-semibold">₹{Number(invoice.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm">
                    <span>Grand Total:</span>
                    <span className="text-emerald-600">₹{Number(invoice.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Info Modal */}
      {invoiceModalInfo.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-full max-w-md p-4 sm:p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Invoice Info</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">{invoiceModalInfo.message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setInvoiceModalInfo({ show: false, message: "", existingInvoice: null })}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              {invoiceModalInfo.existingInvoice && (
                <button
                  onClick={() => {
                    setShowInvoice(true);
                    setInvoiceModalInfo({ show: false, message: "", existingInvoice: null });
                  }}
                  className="px-3.5 py-1.5 bg-purple-600 text-white rounded-md text-xs font-semibold cursor-pointer"
                >
                  View Bill
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Proofs Modal */}
      {showPaymentProofs && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Payment Proofs ({paymentProofs.length})</span>
              </h3>
              <button
                onClick={() => setShowPaymentProofs(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {paymentProofs.map((proof, index) => (
                  <div key={index} className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/40">
                    <p className="font-semibold text-xs text-slate-800 dark:text-white mb-2">Proof #{index + 1}</p>
                    <img
                      src={proof.payment_proof_url}
                      alt="Proof"
                      className="w-full h-44 object-contain rounded bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => window.open(proof.payment_proof_url, "_blank")}
                        className="px-2.5 py-1 bg-[#0067A1] text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        Open Full
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
