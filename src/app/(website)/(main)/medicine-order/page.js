"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FaCheckCircle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaDownload,
  FaQrcode,
  FaExclamationTriangle,
  FaFilePdf,
  FaShoppingBag,
  FaHistory,
  FaFileUpload,
  FaTimesCircle,
  FaUserMd,
  FaPills,
  FaUpload,
  FaExternalLinkAlt,
  FaEye,
  FaShieldAlt,
  FaReceipt
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const STATUS_COLORS = {
  payment_pending: 'bg-amber-50 text-amber-700 border-amber-100',
  payment_submitted: 'bg-blue-50 text-[#004F7C] border-blue-100',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  completed: 'bg-green-50 text-green-700 border-green-100',
  cancelled: 'bg-red-50 text-red-700 border-red-100',
  payment_declined: 'bg-red-50 text-red-700 border-red-100',
  default: 'bg-slate-50 text-slate-700 border-slate-100'
};

const getOrderTotal = (orderObj) => {
  if (!orderObj) return 0;
  const directTotal = Number(orderObj.total_amount || 0);
  if (directTotal > 0) return directTotal;

  const items = orderObj.medicine_order_items || [];
  if (items.length > 0) {
    const sum = items.reduce((acc, item) => {
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 1);
      return acc + (price * qty);
    }, 0);
    if (sum > 0) return sum;
  }
  return 0;
};

const MedicineOrderPage = () => {
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get('prescription_id');

  const [patientId, setPatientId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState('');

  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [paymentUploading, setPaymentUploading] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);

  const [invoice, setInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const [chemistInfo, setChemistInfo] = useState(null);
  const [chemistLoading, setChemistLoading] = useState(false);
  const [chemistError, setChemistError] = useState('');

  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [showLargeQR, setShowLargeQR] = useState(false);
  const [showPaymentNotice, setShowPaymentNotice] = useState(false);

  // Load patient id from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = localStorage.getItem('userId');
    if (id) setPatientId(id);
  }, []);

  // Fetch all medicine orders for this patient
  const fetchAllOrders = async (silent = false) => {
    if (!patientId) return;

    try {
      if (!silent) setOrdersLoading(true);
      setOrdersError('');

      const res = await fetch(`/api/patients/orders/medicine/get?patient_id=${patientId}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch your medicine orders');
      }

      const list = Array.isArray(data.data) ? data.data : [];
      setOrders(list);

      if (list.length > 0) {
        if (!currentOrder) {
          setCurrentOrder(list[0]);
        } else {
          const updated = list.find((o) => o.id === currentOrder.id);
          if (updated && JSON.stringify(updated) !== JSON.stringify(currentOrder)) {
            setCurrentOrder(updated);
          }
        }
      }
    } catch (err) {
      if (!silent) {
        console.error('Fetch patient medicine orders error:', err);
        setOrdersError(err.message || 'Failed to fetch your medicine orders');
      }
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!patientId) return;
    fetchAllOrders();
    const interval = setInterval(() => {
      fetchAllOrders(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [patientId]);

  // If opened with a prescription_id, load latest order for that prescription
  useEffect(() => {
    const fetchByPrescription = async () => {
      if (!prescriptionId || !patientId) return;

      try {
        setOrderLoading(true);
        setOrderError('');

        const res = await fetch('/api/patients/orders/medicine/by-prescription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prescription_id: prescriptionId,
            patient_id: patientId
          })
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch existing orders');
        }

        const list = Array.isArray(data.data) ? data.data : [];
        if (list.length > 0) {
          const sorted = [...list].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          setCurrentOrder(sorted[0]);
        }
      } catch (err) {
        console.error('Fetch existing medicine order error:', err);
        setOrderError(err.message || 'Failed to fetch existing orders');
      } finally {
        setOrderLoading(false);
      }
    };

    fetchByPrescription();
  }, [prescriptionId, patientId]);

  // Handle QR loading state when URL changes
  useEffect(() => {
    if ((currentOrder?.payment_qr_url || chemistInfo?.payment_qr_url)) {
      setQrLoading(true);
      setQrError('');
      const t = setTimeout(() => setQrLoading(false), 400);
      return () => clearTimeout(t);
    }
    setQrLoading(false);
  }, [(currentOrder?.payment_qr_url || chemistInfo?.payment_qr_url)]);

  // Fetch chemist details when order chemist changes
  useEffect(() => {
    const fetchChemistInfo = async () => {
      if (!currentOrder || !currentOrder.chemist_id) {
        setChemistInfo(null);
        setChemistError('');
        return;
      }

      try {
        setChemistLoading(true);
        setChemistError('');

        const res = await fetch(`/api/chemists/web/${currentOrder.chemist_id}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch chemist details');
        }

        setChemistInfo(data.data || null);
      } catch (err) {
        console.error('Fetch chemist info error:', err);
        setChemistError(err.message || 'Failed to fetch chemist details');
      } finally {
        setChemistLoading(false);
      }
    };

    fetchChemistInfo();
  }, [currentOrder?.chemist_id]);

  const handlePaymentProofSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      toast.error('Only JPG, PNG, or PDF files are allowed');
      return;
    }

    setPaymentProofFile(file);
  };

  const handleConfirmPayment = async () => {
    if (!currentOrder) {
      toast.error('No order selected.');
      return;
    }

    if (!(currentOrder?.payment_qr_url || chemistInfo?.payment_qr_url) && !currentOrder.payment_qr_payload) {
      toast.error('No active payment request for this order.');
      return;
    }

    try {
      setPaymentUploading(true);

      const res = await fetch('/api/patients/orders/medicine/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: currentOrder.id })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to confirm payment');
      }

      toast.success('Payment confirmed successfully.');

      setCurrentOrder((prev) => (prev ? { ...prev, status: 'payment_submitted' } : prev));
      setOrders((prev) =>
        Array.isArray(prev)
          ? prev.map((order) =>
              order.id === currentOrder.id
                ? { ...order, status: 'payment_submitted' }
                : order
            )
          : prev
      );
    } catch (err) {
      console.error('Confirm payment error:', err);
      toast.error(err.message || 'Failed to confirm payment.');
    } finally {
      setPaymentUploading(false);
    }
  };

  const handleDeclinePayment = async () => {
    if (!currentOrder) return;

    if (!declineReason.trim()) {
      toast.error('Please provide a reason to decline.');
      return;
    }

    try {
      setIsDeclining(true);
      const id =
        patientId || (typeof window !== 'undefined' ? localStorage.getItem('userId') : null);

      if (!id) {
        toast.error('Please login as a patient to update payment.');
        return;
      }

      const res = await fetch('/api/patients/orders/medicine/decline-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: currentOrder.id,
          patient_id: id,
          reason: declineReason
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to decline payment');
      }

      toast.success('Payment request declined.');
      setDeclineReason('');

      setCurrentOrder((prev) => (prev ? { ...prev, status: 'payment_declined' } : prev));
      setOrders((prev) =>
        Array.isArray(prev)
          ? prev.map((order) =>
              order.id === currentOrder.id
                ? { ...order, status: 'payment_declined' }
                : order
            )
          : prev
      );
    } catch (err) {
      console.error('Decline payment error:', err);
      toast.error(err.message || 'Failed to decline payment.');
    } finally {
      setIsDeclining(false);
    }
  };

  const handleFetchInvoice = async () => {
    if (!currentOrder) return;

    try {
      setInvoiceLoading(true);
      const id =
        patientId || (typeof window !== 'undefined' ? localStorage.getItem('userId') : null);

      const res = await fetch('/api/patients/orders/medicine/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: currentOrder.id, user_id: id })
      });

      const data = await res.json();
      if (!data.success) {
        if (data.message === 'Invoice not found' || res.status === 404) {
          toast.info('Invoice has not been generated by the pharmacy yet. Please check back later.');
          return;
        }
        throw new Error(data.message || 'Invoice not available yet');
      }

      setInvoice(data.data);
      toast.success('Invoice loaded successfully!');
    } catch (err) {
      console.error('Fetch invoice error:', err);
      toast.error(err.message || 'Failed to fetch invoice.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!(currentOrder?.payment_qr_url || chemistInfo?.payment_qr_url)) {
      toast.error('QR code not available for download');
      return;
    }

    const link = document.createElement('a');
    link.href = (currentOrder?.payment_qr_url || chemistInfo?.payment_qr_url);
    link.download = `payment-qr-order-${currentOrder.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded successfully!');
  };

  const formatOrderId = (order) => {
    if (!order) return '';
    const raw = order.unid ?? order.id;
    if (raw === undefined || raw === null) return '';
    const numeric = parseInt(raw, 10);
    if (Number.isNaN(numeric)) return String(raw);
    return `MED0C${numeric.toString().padStart(5, '0')}`;
  };

  const copyOrderId = () => {
    if (!currentOrder) return;
    const displayId = formatOrderId(currentOrder) || currentOrder.unid || currentOrder.id;
    navigator.clipboard.writeText(displayId.toString());
    toast.success('Order ID copied to clipboard!');
  };

  const formatStatus = (status) => {
    if (!status) return 'Pending';
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.default;

  const hasQr = Boolean((currentOrder?.payment_qr_url || chemistInfo?.payment_qr_url));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-[#F0F7F6]">
      {/* Page Header */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Chemist Orders</h1>
            <p className="text-sm text-slate-600 mt-1">
              View and track your medicine orders with chemists, payments, and invoices.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full mx-auto pb-6">
        {orderLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0067A1]/10 mb-4">
              <div className="w-6 h-6 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Loading Order</h3>
            <p className="text-sm text-slate-500">Fetching your order details...</p>
          </div>
        ) : orderError ? (
          <div className="bg-red-50 rounded-xl border border-red-100 p-4 mb-6">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800">Error loading order</p>
                <p className="text-sm text-red-600 mt-1">{orderError}</p>
              </div>
            </div>
          </div>
        ) : currentOrder ? (
          <div className="space-y-6">
            {/* Order Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-5 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FaShoppingBag className="w-5 h-5 text-[#0067A1]" />
                      <h2 className="text-lg font-bold text-slate-800">
                        Order #{formatOrderId(currentOrder)}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          currentOrder.status
                        )}`}
                      >
                        {formatStatus(currentOrder.status)}
                      </span>
                      {currentOrder.created_at && (
                        <span className="text-sm text-slate-500">
                          {new Date(currentOrder.created_at).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Total Amount</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      ₹{getOrderTotal(currentOrder).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chemist Info */}
              {chemistLoading ? (
                <div className="p-5 text-sm text-slate-500">Loading chemist details...</div>
              ) : chemistError ? (
                <div className="p-5 text-sm text-red-600">{chemistError}</div>
              ) : chemistInfo ? (
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-[#0067A1] flex items-center justify-center">
                      <FaUserMd className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800">{chemistInfo.pharmacy_name}</h3>
                      {chemistInfo.address && (
                        <div className="flex items-start gap-2 mt-2">
                          <FaMapMarkerAlt className="w-4 h-4 text-slate-400 mt-0.5" />
                          <p className="text-sm text-slate-600">{chemistInfo.address}</p>
                        </div>
                      )}
                      {chemistInfo.mobile && (
                        <div className="flex items-center gap-2 mt-2">
                          <FaPhoneAlt className="w-4 h-4 text-slate-400" />
                          <p className="text-sm text-slate-600">{chemistInfo.mobile}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Medicines in Order */}
              {Array.isArray(currentOrder.medicine_order_items) &&
                currentOrder.medicine_order_items.length > 0 && (
                  <div className="p-5 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FaPills className="w-5 h-5 text-[#0067A1]" />
                        <h3 className="font-semibold text-slate-800">Medicines in this order</h3>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                        {currentOrder.medicine_order_items.length} items
                      </span>
                    </div>

                    <div className="space-y-3">
                      {currentOrder.medicine_order_items.map((item, index) => {
                        const quantity = item.quantity ?? 1;
                        const price = item.price ?? 0;
                        const lineTotal = price * quantity;

                        return (
                          <div
                            key={item.id ?? index}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
                          >
                            <div>
                              <p className="font-medium text-slate-800">
                                {item.medicine_name || 'Medicine'}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {(item.dosage || '').trim() || 'Dosage as prescribed'}
                                {item.frequency ? ` • ${item.frequency}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 sm:text-right">
                              <div>
                                <p className="text-xs text-slate-500">Qty</p>
                                <p className="text-sm font-medium text-slate-800">{quantity}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Price</p>
                                <p className="text-sm font-medium text-slate-800">
                                  {price ? `₹${price.toFixed(2)}` : '₹0.00'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Total</p>
                                <p className="text-sm font-semibold text-emerald-700">
                                  {lineTotal ? `₹${lineTotal.toFixed(2)}` : '₹0.00'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Waiting For Bill Banner */}
              {currentOrder.status === 'waiting_for_bill' && (
                <div className="p-5 border-b border-slate-100">
                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto animate-pulse">
                      <FaReceipt className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Pharmacy is Generating Final Bill</h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto">
                      You have selected <span className="font-semibold text-slate-900">{chemistInfo?.pharmacy_name || 'the pharmacy'}</span>. They are currently reviewing your prescription and preparing the final bill.
                    </p>
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-100/80 px-3.5 py-1.5 rounded-full shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                      <span>Auto-refreshing status in real-time...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Proceed to Pay CTA for Final Bill */}
              {['payment_pending', 'waiting_for_payment'].includes(currentOrder.status) && (
                <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">Final Bill Ready for Review</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Pharmacy has finalized the bill for ₹{getOrderTotal(currentOrder).toFixed(2)}. Proceed to make your payment directly.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPaymentNotice(true)}
                      className="px-6 py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold rounded-xl text-sm transition-all shadow-md shrink-0 flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Pay</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Section (QR Code / UPI Details & Proof Upload) */}
              {['payment_pending', 'waiting_for_payment', 'payment_submitted', 'payment_declined'].includes(currentOrder.status) && (
                <div id="payment-qr-section" className="p-5">
                  <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl border border-blue-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <FaQrcode className="w-5 h-5 text-[#0067A1]" />
                      <h3 className="text-lg font-semibold text-slate-800">Complete Direct Payment</h3>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Payment Methods Card */}
                      <div className="flex-1">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <div className="text-center pb-3 border-b border-slate-100">
                            <p className="text-sm font-medium text-slate-600">
                              Pay Directly to <span className="font-bold text-slate-800">{chemistInfo?.pharmacy_name || 'Selected Pharmacy'}</span>
                            </p>
                            <p className="text-2xl font-black text-emerald-700 mt-1">
                              ₹{getOrderTotal(currentOrder).toFixed(2)}
                            </p>
                          </div>

                          {hasQr ? (
                            <div className="relative text-center">
                              {qrLoading ? (
                                <div className="w-full h-64 flex items-center justify-center">
                                  <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                              ) : (
                                <>
                                  <img
                                    src={(currentOrder?.payment_qr_url || chemistInfo?.payment_qr_url)}
                                    alt="Payment QR Code"
                                    onError={() =>
                                      setQrError(
                                        'Unable to load QR image. You can still use the "Open in New Tab" button below.'
                                      )
                                    }
                                    className="w-full max-w-sm mx-auto border-4 border-white rounded-lg shadow-lg"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowLargeQR(true)}
                                    className="absolute top-2 right-2 p-2 bg-white/80 rounded-lg hover:bg-white"
                                    title="View larger"
                                  >
                                    <FaEye className="w-4 h-4 text-slate-600" />
                                  </button>
                                </>
                              )}

                              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                                <button
                                  type="button"
                                  onClick={downloadQRCode}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C] text-sm font-semibold"
                                >
                                  <FaDownload className="w-4 h-4" />
                                  Download QR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => window.open((currentOrder?.payment_qr_url || chemistInfo?.payment_qr_url), '_blank')}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
                                >
                                  <FaExternalLinkAlt className="w-4 h-4" />
                                  Open QR
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center space-y-3">
                              <p className="text-xs text-slate-600 font-medium">
                                Pharmacy UPI ID: <span className="font-mono font-bold text-slate-900 text-sm">{currentOrder?.payment_qr_payload || chemistInfo?.upi_id || (chemistInfo?.mobile ? `${chemistInfo.mobile}@upi` : 'Mediconnect Pharmacy')}</span>
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPaymentNotice(true);
                                }}
                                className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                              >
                                <span>Proceed to Pay via UPI</span>
                              </button>
                            </div>
                          )}

                          {qrError && (
                            <p className="mt-3 text-sm text-red-600 text-center">{qrError}</p>
                          )}
                        </div>
                      </div>

                      {/* Instructions & Upload */}
                      <div className="flex-1 space-y-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                          <h4 className="font-semibold text-slate-800 mb-3">Payment Instructions</h4>
                          <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                              <FaCheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                              Open any UPI app (Google Pay, PhonePe, Paytm)
                            </li>
                            <li className="flex items-start gap-2">
                              <FaCheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                              Tap on "Scan QR Code" in the app
                            </li>
                            <li className="flex items-start gap-2">
                              <FaCheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                              Point camera at the QR code above
                            </li>
                            <li className="flex items-start gap-2">
                              <FaCheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                              Pay ₹{getOrderTotal(currentOrder).toFixed(2)}
                            </li>
                            <li className="flex items-start gap-2">
                              <FaCheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                              Confirm your payment below
                            </li>
                          </ul>
                          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 italic">
                            Disclaimer: This transaction is made directly to the pharmacy. Please ensure the recipient name matches the pharmacy name provided.
                          </div>
                        </div>

                        {/* Confirm Payment & Decline */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                            <h4 className="font-semibold text-slate-800 mb-2">Confirm Payment</h4>
                            <p className="text-sm text-slate-600 mb-3">
                              Did you successfully complete the payment via your UPI app?
                            </p>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={handleConfirmPayment}
                                disabled={paymentUploading}
                                className="flex-1 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold rounded-lg transition-colors text-sm"
                              >
                                {paymentUploading ? 'Confirming...' : 'Yes, Payment Successful'}
                              </button>
                            </div>

                          <div className="pt-2 border-t border-slate-100 mt-2">
                            <p className="text-xs text-slate-500 mb-1">
                              Want to decline this payment request?
                            </p>
                            <textarea
                              className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                              rows={2}
                              placeholder="Reason for declining"
                              value={declineReason}
                              onChange={(e) => setDeclineReason(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={handleDeclinePayment}
                              disabled={isDeclining}
                              className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs"
                            >
                              {isDeclining ? 'Declining...' : 'Decline Payment Request'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Other Statuses */}
            {currentOrder.status === 'payment_submitted' && (
              <div className="p-5">
                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                  <div className="flex items-center gap-3">
                    <FaFileUpload className="w-5 h-5 text-[#0067A1]" />
                    <div>
                      <h4 className="font-semibold text-slate-800">Payment Proof Submitted</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Your payment receipt has been submitted. The chemist will verify and update
                        your order status.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice visibility */}
            {['payment_verified', 'shipped', 'out_for_delivery', 'completed'].includes(currentOrder.status) && (
              <div className="p-5">
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                  <div className="flex items-center gap-3">
                    <FaCheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="font-semibold text-slate-800">
                        {currentOrder.status === 'completed' ? 'Order Completed' : 'Payment Verified'}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {currentOrder.status === 'completed'
                          ? 'Your medicine order has been successfully delivered.'
                          : 'Your payment was successfully verified by the pharmacy.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleFetchInvoice}
                      disabled={invoiceLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C]"
                    >
                      <FaFilePdf className="w-4 h-4" />
                      {invoiceLoading ? 'Loading...' : 'View Invoice'}
                    </button>

                    {invoice && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-slate-600">
                          Invoice #{invoice.invoice_number}
                        </p>
                        {invoice.download_url && (
                          <a
                            href={invoice.download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-[#0067A1] hover:text-[#004F7C]"
                          >
                            <FaDownload className="w-4 h-4" />
                            Download Invoice PDF
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FaHistory className="w-5 h-5 text-[#0067A1]" />
                  <h3 className="font-semibold text-slate-800">Recent Orders</h3>
                </div>
              </div>

              <div className="p-5">
                {ordersLoading ? (
                  <div className="text-center py-4">
                    <div className="inline-block w-6 h-6 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : ordersError ? (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">
                    {ordersError}
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No previous orders found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setCurrentOrder(order)}
                        className={`w-full text-left p-4 rounded-lg border transition-colors ${
                          currentOrder?.id === order.id
                            ? 'border-[#0067A1] bg-[#0067A1]/5'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-800">
                              Order #{formatOrderId(order)}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              {new Date(order.created_at).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-800">
                              ₹{getOrderTotal(order).toFixed(2)}
                            </p>
                            <span
                              className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {formatStatus(order.status)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FaShoppingBag className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Active Order</h3>
            <p className="text-sm text-slate-500 mb-6">
              Select an order from your recent orders or use a prescription link.
            </p>
          </div>
        )}
      </div>

      {/* Large QR Modal */}
      {showLargeQR && (currentOrder?.payment_qr_url || chemistInfo?.payment_qr_url) && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Payment QR Code</h3>
              <button
                type="button"
                onClick={() => setShowLargeQR(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <FaTimesCircle className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 text-center">
              <div className="bg-white p-4 rounded-xl inline-block">
                <img
                  src={(currentOrder?.payment_qr_url || chemistInfo?.payment_qr_url)}
                  alt="Payment QR Code"
                  onError={() =>
                    setQrError(
                      'Unable to load QR image. You can still use the "Open in New Tab" button on the main page.'
                    )
                  }
                  className="w-64 h-64"
                />
              </div>

              <div className="mt-6 space-y-3">
                  <p className="text-sm text-slate-600">
                    Scan to pay{' '}
                    <span className="font-bold text-emerald-700">
                      ₹{getOrderTotal(currentOrder).toFixed(2)}
                    </span>
                  </p>

                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={downloadQRCode}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C]"
                  >
                    <FaDownload className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLargeQR(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT NOTICE MODAL */}
      {showPaymentNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <FaShieldAlt className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">PAYMENT NOTICE</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                You are about to make a payment directly to the selected pharmacy.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700 leading-relaxed">
              <p className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>MediConnect facilitates your connection with the pharmacy but <span className="font-semibold text-slate-900">does not receive, process, or hold your payment</span>.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>The selected pharmacy (<span className="font-bold text-slate-900">{chemistInfo?.pharmacy_name || 'Partner Pharmacy'}</span>) is responsible for payment confirmation and order fulfilment.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>Please verify the pharmacy details and amount (<span className="font-bold text-emerald-700">₹{getOrderTotal(currentOrder).toFixed(2)}</span>) before proceeding.</span>
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentNotice(false);
                  const upiId = chemistInfo?.upi_id;
                  if (upiId) {
                    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(chemistInfo?.pharmacy_name || 'Pharmacy')}&am=${getOrderTotal(currentOrder)}&tr=${currentOrder?.unid || ''}&tn=${encodeURIComponent('Medicine Order #' + (currentOrder?.unid || ''))}`;
                    window.location.href = upiUrl;
                  }
                  document.getElementById('payment-qr-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Proceed to Pay</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentNotice(false)}
                className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs transition-colors"
              >
                Cancel (Return to Bill)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineOrderPage;