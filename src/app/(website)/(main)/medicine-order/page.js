"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Pill,
  Search,
  Plus,
  Trash2,
  Upload,
  FileText,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Star,
  QrCode,
  Copy,
  Check,
  Camera,
  Image as ImageIcon,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  X,
  Send,
  Truck,
  Package,
  Calendar,
  IndianRupee,
  RefreshCw,
  ExternalLink,
  Info,
  Radio,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ShoppingBag,
  History,
  FileCheck,
  Eye,
  SlidersHorizontal,
  Lock
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

// Common OTC & prescription medicines for autocomplete assistance
const POPULAR_MEDICINES = [
  { name: "Paracetamol 650mg (Dolo 650)", defaultQty: 10, dosage: "650mg", type: "Tablet" },
  { name: "Azithromycin 500mg", defaultQty: 3, dosage: "500mg", type: "Tablet" },
  { name: "Pantoprazole 40mg (Pan 40)", defaultQty: 10, dosage: "40mg", type: "Capsule" },
  { name: "Amoxicillin & Potassium Clavulanate 625mg (Augmentin)", defaultQty: 6, dosage: "625mg", type: "Tablet" },
  { name: "Cetirizine 10mg", defaultQty: 10, dosage: "10mg", type: "Tablet" },
  { name: "Montelukast & Levocetirizine (Montair LC)", defaultQty: 10, dosage: "10mg/5mg", type: "Tablet" },
  { name: "Metformin 500mg (Glycomet)", defaultQty: 30, dosage: "500mg", type: "Tablet" },
  { name: "Atorvastatin 10mg (Atorva 10)", defaultQty: 15, dosage: "10mg", type: "Tablet" },
  { name: "Telmisartan 40mg (Telma 40)", defaultQty: 15, dosage: "40mg", type: "Tablet" },
  { name: "ORS Electrolyte Powder", defaultQty: 4, dosage: "Sachet", type: "Powder" },
  { name: "Vitamin C + Zinc Chewable", defaultQty: 15, dosage: "500mg", type: "Tablet" },
  { name: "Cough Syrup (Ascoril LS)", defaultQty: 1, dosage: "100ml", type: "Syrup" },
];

export default function MedicineOrderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Active view: "orders" | "new_request"
  const [activeTab, setActiveTab] = useState("orders");

  // User state
  const [patientId, setPatientId] = useState(null);

  // Active Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // --- Step 1: New Order Creation state ---
  const [medQuery, setMedQuery] = useState("");
  const [medSuggestions, setMedSuggestions] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [customMedName, setCustomMedName] = useState("");


  const [customMedQty, setCustomMedQty] = useState(1);
  const [customMedDosage, setCustomMedDosage] = useState("");

  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState(null);
  const [uploadingRx, setUploadingRx] = useState(false);
  const [uploadedRxUrl, setUploadedRxUrl] = useState("");

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPincode, setDeliveryPincode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [patientNotes, setPatientNotes] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  // --- Step 2: Live Bids Stream & Comparison state ---
  const [activeBroadcastId, setActiveBroadcastId] = useState(null);
  const [broadcastData, setBroadcastData] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidSearch, setBidSearch] = useState("");
  const [bidSortBy, setBidSortBy] = useState("cheapest"); // cheapest | fastest | highest_rated | latest
  const [bidPage, setBidPage] = useState(1);
  const [bidPagination, setBidPagination] = useState({ total: 0, totalPages: 1 });
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Selected bid for confirmation modal
  const [bidToSelect, setBidToSelect] = useState(null);
  const [selectingChemist, setSelectingChemist] = useState(false);
  const [consentAgreed, setConsentAgreed] = useState(false);

  // --- Step 3: Payment & Proof Submission state ---
  const [utrNumber, setUtrNumber] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [previewProofModal, setPreviewProofModal] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Live Camera capture state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Load user from localStorage & profile
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = localStorage.getItem("userId");
    if (id) {
      setPatientId(id);
      fetch(`/api/profile/get?id=${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            const u = data.user;
            if (u.address) setDeliveryAddress((prev) => prev || u.address);
            if (u.pincode) setDeliveryPincode((prev) => prev || u.pincode);
            if (u.phone) setContactPhone((prev) => prev || u.phone);
          }
        })
        .catch(() => {});
    }
    const phone = localStorage.getItem("userPhone") || localStorage.getItem("phoneNumber");
    if (phone) setContactPhone((prev) => prev || phone);
    const savedAddress = localStorage.getItem("userAddress") || localStorage.getItem("deliveryAddress");
    if (savedAddress) setDeliveryAddress((prev) => prev || savedAddress);
  }, []);

  // Fetch all orders for this patient
  const fetchOrders = async (silent = false) => {
    if (!patientId) return;
    try {
      if (!silent) setOrdersLoading(true);
      const res = await fetch(`/api/patients/orders/medicine/get?patient_id=${patientId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
        if (data.data.length > 0) {
          if (!selectedOrder) {
            setSelectedOrder(data.data[0]);
          } else {
            const updated = data.data.find((o) => o.id === selectedOrder.id);
            if (updated) setSelectedOrder(updated);
          }
        }
      }
    } catch (err) {
      if (!silent) console.error("Error fetching orders:", err);
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!patientId) return;
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 4000);
    return () => clearInterval(interval);
  }, [patientId]);

  // Autocomplete medicine filter querying live AWS RDS clinical repository
  useEffect(() => {
    if (!medQuery.trim()) {
      setMedSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clinical/search?type=medicine&query=${encodeURIComponent(medQuery.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const formatted = data.data.map((m) => ({
            id: m.medicine_id,
            name: `${m.generic_name}${m.strength ? ` ${m.strength}` : ""}${m.dosage_form ? ` (${m.dosage_form})` : ""}`,
            dosage: m.strength || "Standard",
            type: m.dosage_form || "Tablet",
            defaultQty: 10,
          }));
          setMedSuggestions(formatted);
        } else {
          // If no direct clinical master record, fallback to filtering OTC common list
          const q = medQuery.toLowerCase();
          const matches = POPULAR_MEDICINES.filter((m) =>
            m.name.toLowerCase().includes(q)
          );
          setMedSuggestions(matches);
        }
      } catch (err) {
        const q = medQuery.toLowerCase();
        const matches = POPULAR_MEDICINES.filter((m) =>
          m.name.toLowerCase().includes(q)
        );
        setMedSuggestions(matches);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [medQuery]);


  // Countdown timer for active broadcast pool
  useEffect(() => {
    if (!activeBroadcastId || secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeBroadcastId, secondsRemaining]);

  // Poll bids for the active broadcast
  const fetchBids = async () => {
    if (!activeBroadcastId) return;
    try {
      setBidsLoading(true);
      const query = new URLSearchParams({
        broadcast_id: activeBroadcastId,
        search: bidSearch,
        sortBy: bidSortBy,
        page: String(bidPage),
        pageSize: "15"
      });
      const res = await fetch(`/api/patients/orders/medicine/broadcast/responses?${query}`);
      const data = await res.json();
      if (data.success) {
        setBids(data.data.quotes || []);
        setBroadcastData(data.data.broadcast);
        if (data.data.pagination) {
          setBidPagination({
            total: data.data.pagination.total,
            totalPages: data.data.pagination.totalPages
          });
        }
        if (data.data.broadcast?.seconds_remaining !== undefined) {
          setSecondsRemaining(data.data.broadcast.seconds_remaining);
        }
      }
    } catch (err) {
      console.error("Error fetching bids:", err);
    } finally {
      setBidsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeBroadcastId) return;
    fetchBids();
    const interval = setInterval(fetchBids, 3500);
    return () => clearInterval(interval);
  }, [activeBroadcastId, bidSearch, bidSortBy, bidPage]);

  // Handle adding medicine item to request list
  const handleAddMedicine = (medObj) => {
    const newItem = {
      id: Date.now(),
      name: medObj.name,
      quantity: medObj.defaultQty || 1,
      dosage: medObj.dosage || "",
      instructions: medObj.type || ""
    };
    setCartItems((prev) => [...prev, newItem]);
    setMedQuery("");
    setMedSuggestions([]);
  };

  const handleAddCustomMedicine = () => {
    if (!customMedName.trim()) {
      toast.error("Please enter a medicine name");
      return;
    }
    const newItem = {
      id: Date.now(),
      name: customMedName.trim(),
      quantity: Math.max(1, parseInt(customMedQty, 10) || 1),
      dosage: customMedDosage.trim(),
      instructions: ""
    };
    setCartItems((prev) => [...prev, newItem]);
    setCustomMedName("");
    setCustomMedQty(1);
    setCustomMedDosage("");
  };

  const handleRemoveCartItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItemQty = (id, delta) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  // Prescription upload handler
  const handlePrescriptionSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Prescription file must be under 8MB");
      return;
    }

    setPrescriptionFile(file);
    setPrescriptionPreview(URL.createObjectURL(file));

    // Upload to S3
    try {
      setUploadingRx(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/prescription", {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setUploadedRxUrl(data.data.url);
        toast.success("Prescription attached successfully");
      } else {
        toast.error(data.message || "Failed to upload prescription");
      }
    } catch (err) {
      toast.error("Failed to upload prescription to cloud");
    } finally {
      setUploadingRx(false);
    }
  };

  // Submit Order Broadcast to Chemist Pool
  const handleBroadcastOrder = async () => {
    if (!patientId) {
      toast.error("Please sign in to order medicines");
      return;
    }

    if (cartItems.length === 0 && !uploadedRxUrl) {
      toast.error("Please add at least one medicine or attach a prescription");
      return;
    }

    if (!deliveryAddress.trim()) {
      toast.error("Please enter your complete delivery address");
      return;
    }

    try {
      setBroadcasting(true);
      const res = await fetch("/api/patients/orders/medicine/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          medicines: cartItems,
          prescription_url: uploadedRxUrl || undefined,
          delivery_address: deliveryAddress.trim(),
          delivery_pincode: deliveryPincode.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
          patient_notes: patientNotes.trim() || undefined,
          window_minutes: 30
        })
      });

      const data = await res.json();
      if (data.success && data.data?.broadcast) {
        toast.success("Request Broadcasted! Receiving Chemist Bids...");
        setActiveBroadcastId(data.data.broadcast.id);
        setSecondsRemaining(1800); // 30 mins
      } else {
        toast.error(data.message || "Failed to broadcast order request");
      }
    } catch (err) {
      toast.error("Network error while submitting request");
    } finally {
      setBroadcasting(false);
    }
  };

  // Select Chemist & Lock Order
  const handleSelectChemistBid = async () => {
    if (!bidToSelect || !activeBroadcastId) return;

    if (!consentAgreed) {
      toast.error("Please review and check the disclosure consent to proceed");
      return;
    }

    try {
      setSelectingChemist(true);
      const res = await fetch("/api/patients/orders/medicine/select-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broadcast_id: activeBroadcastId,
          quote_id: bidToSelect.id
        })
      });

      const data = await res.json();
      if (data.success && data.data?.order) {
        toast.success("Chemist Selected! Order Created. Proceed with UPI Payment.");
        setBidToSelect(null);
        setActiveBroadcastId(null);
        setActiveTab("orders");
        await fetchOrders();
        setSelectedOrder(data.data.order);
      } else {
        toast.error(data.message || "Failed to select chemist");
      }
    } catch (err) {
      toast.error("Error locking chemist bid");
    } finally {
      setSelectingChemist(false);
    }
  };

  // Copy UPI ID
  const handleCopyUpi = (upiId) => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    toast.success("Chemist UPI ID copied to clipboard!");
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // Start Device Live Camera
  const startCamera = async () => {
    try {
      setShowCameraModal(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Camera access denied or unavailable. Please use file upload.");
      setShowCameraModal(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `proof-${Date.now()}.jpg`, { type: "image/jpeg" });
        setProofFile(file);
        setProofPreview(URL.createObjectURL(file));
        stopCamera();
        toast.success("Payment screenshot captured successfully!");
      }
    }, "image/jpeg", 0.9);
  };

  // Submit Payment Proof & UTR
  const handleSubmitPaymentProof = async () => {
    if (!selectedOrder) {
      toast.error("Please select an order");
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      toast.error("Please enter the 12-digit UTR / UPI Reference Number");
      return;
    }

    if (cleanUtr.length < 8) {
      toast.error("UTR number must be at least 8-12 digits");
      return;
    }

    if (!proofFile) {
      toast.error("Please upload or take a screenshot photograph of your payment confirmation");
      return;
    }

    try {
      setSubmittingProof(true);
      const fd = new FormData();
      fd.append("order_id", selectedOrder.id);
      fd.append("payment_proof", proofFile);
      fd.append("utr_number", cleanUtr);

      const res = await fetch("/api/patients/orders/medicine/upload-payment-proof", {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Payment Proof Submitted! The Chemist is verifying your transaction.");
        setUtrNumber("");
        setProofFile(null);
        setProofPreview(null);
        await fetchOrders();
      } else {
        toast.error(data.message || "Failed to submit payment proof");
      }
    } catch (err) {
      toast.error("Network error while submitting proof");
    } finally {
      setSubmittingProof(false);
    }
  };

  // Order status badge helper
  const getStatusBadge = (status) => {
    switch (status) {
      case "payment_pending":
      case "waiting_for_payment":
      case "awaiting_payment":
        return {
          label: "Awaiting UPI Payment",
          className: "bg-amber-50 text-amber-800 border-amber-200",
          icon: Clock
        };
      case "payment_submitted":
      case "payment_verification_pending":
        return {
          label: "Payment Verification Pending",
          className: "bg-blue-50 text-[#0067A1] border-blue-200",
          icon: RefreshCw
        };
      case "payment_declined":
      case "payment_verification_failed":
      case "payment_rejected":
        return {
          label: "Payment Verification Rejected",
          className: "bg-red-50 text-red-700 border-red-200",
          icon: AlertTriangle
        };
      case "approved":
      case "preparing":
      case "packing":
        return {
          label: "Payment Verified • Preparing Medicines",
          className: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: Package
        };
      case "ready_for_dispatch":
      case "out_for_delivery":
        return {
          label: "Out for Delivery",
          className: "bg-purple-50 text-purple-700 border-purple-200",
          icon: Truck
        };
      case "delivered":
      case "completed":
        return {
          label: "Delivered & Completed",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2
        };
      case "cancelled":
        return {
          label: "Order Cancelled",
          className: "bg-gray-100 text-gray-700 border-gray-300",
          icon: XCircle
        };
      default:
        return {
          label: "Order Processing",
          className: "bg-slate-50 text-slate-700 border-slate-200",
          icon: Info
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0067A1]/10 text-[#0067A1] text-xs font-bold mb-3">
              <Pill className="w-3.5 h-3.5" />
              <span>Patient Medicine Ordering & Competitive Bidding Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Medicine Orders & Pharmacy Quotes
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Broadcast your medicine order to licensed pharmacies, compare quotes with transparent pricing and delivery SLAs, pay via UPI, and track order fulfillment.
            </p>
          </div>

          {/* Tab Navigation Controls */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-lg shrink-0 self-start md:self-auto border border-slate-200">
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "orders"
                  ? "bg-[#0067A1] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Active Orders & Tracking</span>
              {orders.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "orders" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {orders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("new_request")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "new_request"
                  ? "bg-[#0067A1] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Create New Medicine Request</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: ACTIVE ORDERS & TRACKING + PAYMENT SCREEN                        */}
        {/* ========================================================================= */}
        {activeTab === "orders" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Orders List Sidebar */}
            <div className="lg:col-span-4 bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-800 text-sm">Your Orders</span>
                </div>
                <button
                  onClick={() => fetchOrders()}
                  className="p-1.5 text-slate-400 hover:text-[#0067A1] hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  title="Refresh Orders"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {ordersLoading && orders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0067A1]" />
                  <p className="text-xs">Loading medicine orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Pill className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No active medicine orders</h4>
                  <p className="text-xs text-slate-500">
                    You haven&apos;t placed any medicine orders yet. Create a request to get competitive bids from pharmacies!
                  </p>
                  <button
                    onClick={() => setActiveTab("new_request")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0067A1] text-white rounded-xl text-xs font-bold hover:bg-[#004F7C] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Request</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {orders.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    const badge = getStatusBadge(order.status);
                    const StatusIcon = badge.icon;
                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#0067A1] bg-[#0067A1]/5 shadow-sm"
                            : "border-slate-200/80 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-extrabold text-xs text-slate-900">
                            #{order.unid || order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[11px] font-bold text-slate-900">
                            ₹{order.total_amount || 0}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-700 truncate mb-1">
                          {order.chemist_details?.pharmacy_name || "Assigned Pharmacy Partner"}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badge.className}`}>
                            <StatusIcon className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate max-w-[130px]">{badge.label}</span>
                          </span>
                          <span className="text-slate-400">
                            {new Date(order.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Selected Order Detail & Interactive Workflows */}
            <div className="lg:col-span-8 space-y-6">
              {!selectedOrder ? (
                <div className="bg-white rounded-xl p-12 text-center border border-slate-200/80 shadow-sm text-slate-400 space-y-3">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">Select an order from the list to view tracking, payment details, and verification status.</p>
                </div>
              ) : (
                <>
                  {/* Order Overview Card */}
                  <div className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-900">
                            Order #{selectedOrder.unid || selectedOrder.id.slice(0, 8).toUpperCase()}
                          </h2>
                          {(() => {
                            const badge = getStatusBadge(selectedOrder.status);
                            const StatusIcon = badge.icon;
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${badge.className}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                <span>{badge.label}</span>
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Placed on {new Date(selectedOrder.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Payable</p>
                          <p className="text-2xl font-black text-[#0067A1]">₹{selectedOrder.total_amount || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Timeline */}
                    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200/60">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">
                        Order & Fulfillment Lifecycle
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        {/* Step 1: Selected */}
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-1.5 shadow-sm">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">Chemist Selected</span>
                          <span className="text-[10px] text-slate-400">Offer Locked</span>
                        </div>

                        {/* Step 2: Payment */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 shadow-sm ${
                            selectedOrder.payment_verified_at || ["approved", "preparing", "ready_for_dispatch", "out_for_delivery", "delivered", "completed"].includes(selectedOrder.status)
                              ? "bg-emerald-500 text-white"
                              : selectedOrder.payment_declaration_by_patient || selectedOrder.status === "payment_submitted"
                              ? "bg-blue-500 text-white animate-pulse"
                              : selectedOrder.status === "payment_declined"
                              ? "bg-red-500 text-white"
                              : "bg-amber-500 text-white"
                          }`}>
                            {selectedOrder.payment_verified_at || ["approved", "preparing", "ready_for_dispatch", "out_for_delivery", "delivered", "completed"].includes(selectedOrder.status) ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : selectedOrder.status === "payment_declined" ? (
                              <X className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <QrCode className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-800">Payment & UTR</span>
                          <span className="text-[10px] text-slate-400">
                            {selectedOrder.payment_verified_at ? "Verified by Chemist" : selectedOrder.payment_declaration_by_patient ? "Verification Pending" : "Awaiting Payment"}
                          </span>
                        </div>

                        {/* Step 3: Preparation */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 shadow-sm ${
                            ["ready_for_dispatch", "out_for_delivery", "delivered", "completed"].includes(selectedOrder.status)
                              ? "bg-emerald-500 text-white"
                              : ["approved", "preparing", "packing"].includes(selectedOrder.status)
                              ? "bg-indigo-600 text-white animate-pulse"
                              : "bg-slate-200 text-slate-400"
                          }`}>
                            <Package className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">Preparation</span>
                          <span className="text-[10px] text-slate-400">Pack & Label</span>
                        </div>

                        {/* Step 4: Delivery */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 shadow-sm ${
                            ["delivered", "completed"].includes(selectedOrder.status)
                              ? "bg-emerald-500 text-white"
                              : ["out_for_delivery"].includes(selectedOrder.status)
                              ? "bg-purple-600 text-white animate-bounce"
                              : "bg-slate-200 text-slate-400"
                          }`}>
                            <Truck className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">Delivery</span>
                          <span className="text-[10px] text-slate-400">
                            {["delivered", "completed"].includes(selectedOrder.status) ? "Delivered" : "To Your Door"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Pharmacy Profile Card */}
                    <div className="p-4 rounded-lg bg-[#0067A1]/5 border border-[#0067A1]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-white border border-[#0067A1]/20 flex items-center justify-center text-[#0067A1] shrink-0 shadow-sm">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">
                              {selectedOrder.chemist_details?.pharmacy_name || "Apex Healthcare & Medicos"}
                            </h3>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                              <span>{selectedOrder.chemist_details?.rating || 4.8}</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>{selectedOrder.chemist_details?.address || "Licensed Pharmacy Partner"}</span>
                          </p>
                          {selectedOrder.chemist_details?.mobile && (
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{selectedOrder.chemist_details?.mobile}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          <span>Verified Chemist</span>
                        </span>
                      </div>
                    </div>

                    {/* Medicines Breakdown */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Prescribed Medicines & Quantities
                      </h4>
                      <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg overflow-hidden bg-white">
                        {(selectedOrder.medicine_order_items && selectedOrder.medicine_order_items.length > 0) ? (
                          selectedOrder.medicine_order_items.map((item, idx) => (
                            <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-[10px]">
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800">{item.medicine_name}</p>
                                  <p className="text-[11px] text-slate-400">{item.dosage || "Standard Dose"}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-700">Qty: {item.quantity}</span>
                                {item.price > 0 && (
                                  <p className="text-[11px] text-slate-500 font-semibold">₹{Number(item.price).toFixed(2)}</p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-xs text-slate-500 italic">
                            Order items registered per prescription record.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Medicine Subtotal:</span>
                        <span className="font-semibold text-slate-800">
                          ₹{Number(selectedOrder.medicine_subtotal || selectedOrder.total_amount).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery & Handling:</span>
                        <span className="font-semibold text-slate-800">
                          ₹{Number(selectedOrder.delivery_charge || 0).toFixed(2)}
                        </span>
                      </div>
                      {Number(selectedOrder.discount || 0) > 0 && (
                        <div className="flex justify-between text-emerald-600 font-semibold">
                          <span>Special Discount:</span>
                          <span>-₹{Number(selectedOrder.discount).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                        <span>Net Payable Amount:</span>
                        <span className="text-[#0067A1]">₹{Number(selectedOrder.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Rejection Alert if applicable */}
                  {selectedOrder.status === "payment_declined" && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 text-red-900 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                        <h4 className="font-bold text-sm">Payment Verification Issue Raised by Chemist</h4>
                      </div>
                      <p className="text-xs text-red-800 leading-relaxed">
                        Reason: &ldquo;{selectedOrder.payment_failed_reason || "Transaction not found or screenshot unreadable"}&rdquo;.
                        Please re-verify your 12-digit UTR number or upload a fresh screenshot below.
                      </p>
                    </div>
                  )}

                  {/* ================================================================= */}
                  {/* SELECTED CHEMIST UPI & DYNAMIC QR PAYMENT SECTION                */}
                  {/* ================================================================= */}
                  {["payment_pending", "waiting_for_payment", "awaiting_payment", "payment_declined", "payment_submitted"].includes(selectedOrder.status) && (
                    <div className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0067A1]/10 text-[#0067A1] text-xs font-bold mb-1">
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Direct Chemist UPI Payment</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">Pay Selected Chemist via UPI / QR</h3>
                          <p className="text-xs text-slate-500">
                            Scan the chemist&apos;s dynamic QR or transfer directly to their registered UPI ID.
                          </p>
                        </div>
                        <span className="text-xl font-black text-[#0067A1]">
                          ₹{selectedOrder.total_amount}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* QR Code Card */}
                        <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
                          {(() => {
                            const chemistUpi = selectedOrder.chemist_details?.upi_id || "pay@mediconnect.fit";
                            const pharmacyName = selectedOrder.chemist_details?.pharmacy_name || "Partner Pharmacy";
                            const amount = selectedOrder.total_amount || 0;
                            const upiLink = `upi://pay?pa=${encodeURIComponent(chemistUpi)}&pn=${encodeURIComponent(pharmacyName)}&am=${amount}&cu=INR&tn=Order-${selectedOrder.unid || selectedOrder.id.slice(0, 8)}`;
                            const qrUrl = selectedOrder.chemist_details?.payment_qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiLink)}`;

                            return (
                              <>
                                <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-200 mb-3">
                                  <img
                                    src={qrUrl}
                                    alt="Chemist UPI QR Code"
                                    className="w-48 h-48 object-contain rounded-xl"
                                  />
                                </div>
                                <span className="text-[11px] font-bold text-slate-500">
                                  Scan using GPay, PhonePe, Paytm, or BHIM
                                </span>
                              </>
                            );
                          })()}
                        </div>

                        {/* Chemist UPI Details & Copy */}
                        <div className="md:col-span-7 space-y-4">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Chemist Registered UPI ID
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800 truncate">
                                {selectedOrder.chemist_details?.upi_id || "apexmedicos@upi"}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyUpi(selectedOrder.chemist_details?.upi_id || "apexmedicos@upi")}
                                className="px-4 py-2.5 bg-[#0067A1] text-white rounded-xl text-xs font-bold hover:bg-[#004F7C] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                              >
                                {copiedUpi ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy UPI</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Quick 1-Tap UPI Launch Buttons (Mobile friendly) */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                              1-Tap Open in App
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {(() => {
                                const chemistUpi = selectedOrder.chemist_details?.upi_id || "apexmedicos@upi";
                                const pharmacyName = selectedOrder.chemist_details?.pharmacy_name || "Partner Pharmacy";
                                const amount = selectedOrder.total_amount || 0;
                                const upiLink = `upi://pay?pa=${encodeURIComponent(chemistUpi)}&pn=${encodeURIComponent(pharmacyName)}&am=${amount}&cu=INR&tn=Order-${selectedOrder.unid || selectedOrder.id.slice(0, 8)}`;
                                return (
                                  <>
                                    <a
                                      href={upiLink}
                                      className="py-2 px-3 text-center bg-white border border-slate-300 hover:border-[#0067A1] hover:text-[#0067A1] text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                      <span>Google Pay</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <a
                                      href={upiLink}
                                      className="py-2 px-3 text-center bg-white border border-slate-300 hover:border-[#0067A1] hover:text-[#0067A1] text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                      <span>PhonePe / Paytm</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Mandatory Service Disclosure */}
                          <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Important Payment Notice:</span>
                            </div>
                            <p className="text-[11px] text-amber-800/90 leading-relaxed">
                              UPI QR codes do not independently confirm receipt of funds. After transferring, please enter your 12-digit UTR reference number and upload the payment screenshot below so the chemist can manually verify the bank credit and release your medicines.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ============================================================= */}
                      {/* PAYMENT PROOF & UTR SUBMISSION FORM                          */}
                      {/* ============================================================= */}
                      <div className="pt-6 border-t border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">Step 2: Submit Payment Proof</h4>
                            <p className="text-xs text-slate-500">Enter the UTR reference number and attach your payment receipt screenshot.</p>
                          </div>
                          {selectedOrder.status === "payment_submitted" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-[#0067A1] text-xs font-bold">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Proof Under Verification</span>
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* UTR Input */}
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              12-Digit UTR / Transaction Reference No. <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              maxLength={22}
                              value={utrNumber}
                              onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                              placeholder="e.g. 427819203847"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent bg-slate-50/50"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                              Found in your UPI payment app receipt (e.g. UPI Ref / UTR / Transaction ID).
                            </p>
                          </div>

                          {/* Screenshot Upload Options */}
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              Payment Screenshot / Receipt <span className="text-rose-500">*</span>
                            </label>

                            <div className="flex items-center gap-2">
                              {/* File picker */}
                              <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-[#0067A1] bg-slate-50/50 text-slate-700 hover:text-[#0067A1] text-xs font-bold cursor-pointer transition-colors">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload File</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setProofFile(file);
                                      setProofPreview(URL.createObjectURL(file));
                                    }
                                  }}
                                />
                              </label>

                              {/* Live Device Camera button */}
                              <button
                                type="button"
                                onClick={startCamera}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-300 hover:border-[#0067A1] bg-white text-slate-700 hover:text-[#0067A1] text-xs font-bold cursor-pointer transition-colors shadow-sm"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Take Photo</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Screenshot Preview */}
                        {proofPreview && (
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={proofPreview}
                                alt="Proof Preview"
                                className="w-14 h-14 object-cover rounded-xl border border-slate-200"
                              />
                              <div>
                                <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{proofFile?.name || "Payment_Screenshot.jpg"}</p>
                                <p className="text-[10px] text-slate-400">{(proofFile?.size ? (proofFile.size / 1024).toFixed(1) : 120)} KB &bull; Ready to verify</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewProofModal(proofPreview)}
                                className="p-2 text-slate-500 hover:text-[#0067A1] hover:bg-white rounded-lg transition-colors cursor-pointer"
                                title="Zoom Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setProofFile(null);
                                  setProofPreview(null);
                                }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                title="Remove File"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Submit Action */}
                        <div className="pt-2">
                          <button
                            type="button"
                            disabled={submittingProof || !utrNumber.trim() || !proofFile}
                            onClick={handleSubmitPaymentProof}
                            className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                          >
                            {submittingProof ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Submitting Proof to Chemist...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Submit Payment Proof for Verification</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Verified Banner */}
                  {selectedOrder.payment_verified_at && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-emerald-900 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Payment Verified by Pharmacy</h4>
                        <p className="text-xs text-emerald-800">
                          Your payment of ₹{selectedOrder.total_amount} (UTR: {selectedOrder.utr_number || "Verified"}) has been credited. The pharmacy has prepared your medicine package for delivery.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: NEW MEDICINE REQUEST & LIVE BIDDING STREAM                        */}
        {/* ========================================================================= */}
        {activeTab === "new_request" && (
          <div className="space-y-6">
            {!activeBroadcastId ? (
              /* Step 1: Create Request Form */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Medicine Search & Cart (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">1. Add Prescribed Medicines</h2>
                    <p className="text-xs text-slate-500">
                      Search medicines or type custom items with dosage and required quantities.
                    </p>
                  </div>

                  {/* Autocomplete Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={medQuery}
                      onChange={(e) => setMedQuery(e.target.value)}
                      placeholder="Search medicine by name (e.g. Paracetamol, Augmentin, Cetirizine)..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent bg-slate-50/50"
                    />

                    {/* Suggestions dropdown */}
                    {medSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {medSuggestions.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleAddMedicine(item)}
                            className="p-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Pill className="w-3.5 h-3.5 text-[#0067A1]" />
                              <div>
                                <span className="font-bold text-slate-800">{item.name}</span>
                                <span className="text-[10px] text-slate-400 block">{item.dosage} &bull; {item.type}</span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-[#0067A1] flex items-center gap-1">
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Custom item quick add row */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Or Add Custom Medicine
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        value={customMedName}
                        onChange={(e) => setCustomMedName(e.target.value)}
                        placeholder="Medicine Name (e.g. Telma 40)"
                        className="sm:col-span-6 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                      />
                      <input
                        type="text"
                        value={customMedDosage}
                        onChange={(e) => setCustomMedDosage(e.target.value)}
                        placeholder="Dosage (e.g. 40mg)"
                        className="sm:col-span-3 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                      />
                      <div className="sm:col-span-3 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={customMedQty}
                          onChange={(e) => setCustomMedQty(e.target.value)}
                          placeholder="Qty"
                          className="w-16 px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white text-center"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomMedicine}
                          className="flex-1 py-2 px-3 bg-[#0067A1] text-white rounded-xl text-xs font-bold hover:bg-[#004F7C] transition-colors cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Medicines Cart List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                      <span>Order Medicines ({cartItems.length})</span>
                      {cartItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCartItems([])}
                          className="text-red-500 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {cartItems.length === 0 ? (
                      <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 space-y-1">
                        <Pill className="w-5 h-5 mx-auto text-slate-300" />
                        <p className="text-xs">No medicines added yet. Search above or attach a prescription.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {cartItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0067A1] flex items-center justify-center">
                                <Pill className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-800">{item.name}</span>
                                {item.dosage && <span className="text-[11px] text-slate-400 block">{item.dosage}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.id, -1)}
                                  className="px-2 py-1 hover:bg-slate-200 font-bold text-slate-600 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-2 py-1 text-xs font-bold text-slate-800 min-w-6 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.id, 1)}
                                  className="px-2 py-1 hover:bg-slate-200 font-bold text-slate-600 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveCartItem(item.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Instant Order to Chemist Banner when items added */}
                    {cartItems.length > 0 && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Send className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-emerald-900 block">
                              {cartItems.length} {cartItems.length === 1 ? "Medicine" : "Medicines"} Ready to Order
                            </span>
                            <span className="text-[11px] text-emerald-700">
                              Send to nearby licensed chemists for quotes & fast delivery.
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!deliveryAddress.trim()) {
                              toast.error("Please enter delivery address to send order to chemist");
                              const el = document.getElementById("delivery-address-input");
                              if (el) {
                                el.focus();
                                el.scrollIntoView({ behavior: "smooth", block: "center" });
                              }
                              return;
                            }
                            handleBroadcastOrder();
                          }}
                          className="px-4 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold text-xs rounded-md flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Order & Send to Chemist</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Prescription Upload Section */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">2. Upload Prescription (Optional / Rx)</h3>
                        <p className="text-xs text-slate-500">Upload doctor prescription image or PDF for verification.</p>
                      </div>
                      {uploadingRx && (
                        <span className="text-xs text-[#0067A1] font-bold flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Uploading...</span>
                        </span>
                      )}
                    </div>

                    {!prescriptionPreview ? (
                      <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-200 hover:border-[#0067A1] rounded-lg bg-slate-50/50 hover:bg-blue-50/20 cursor-pointer transition-colors">
                        <Upload className="w-5 h-5 text-slate-400 mb-1.5" />
                        <span className="text-xs font-bold text-slate-700">Click to upload doctor prescription</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, WEBP, PDF (Max 8MB)</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={handlePrescriptionSelect}
                        />
                      </label>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={prescriptionPreview}
                            alt="Prescription Preview"
                            className="w-12 h-12 object-cover rounded-md border border-slate-200"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block truncate max-w-xs">{prescriptionFile?.name}</span>
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Prescription Attached</span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setPrescriptionFile(null);
                            setPrescriptionPreview(null);
                            setUploadedRxUrl("");
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Delivery Address & Submit Request (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">3. Delivery Details</h2>
                      <p className="text-xs text-slate-500">Pharmacies use this to calculate delivery time.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0067A1]/10 text-[#0067A1]">
                      Step 3 of 3
                    </span>
                  </div>

                  {/* Delivery Address */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Full Delivery Address <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="delivery-address-input"
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Flat / House No., Building Name, Street, Landmark, City..."
                      className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent bg-slate-50/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* PIN Code */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        PIN Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={deliveryPincode}
                        onChange={(e) => setDeliveryPincode(e.target.value.replace(/\D/g, ""))}
                        placeholder="e.g. 110001"
                        className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent bg-slate-50/50"
                      />
                    </div>

                    {/* Contact Phone */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        maxLength={12}
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Patient Notes */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Delivery Instructions / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={patientNotes}
                      onChange={(e) => setPatientNotes(e.target.value)}
                      placeholder="e.g. Call before delivery, ring doorbell..."
                      className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent bg-slate-50/50"
                    />
                  </div>

                  {/* PRIMARY ORDER & SEND TO CHEMIST BUTTON */}
                  <div className="pt-1 space-y-2">
                    <button
                      type="button"
                      disabled={broadcasting}
                      onClick={() => {
                        if (cartItems.length === 0 && !uploadedRxUrl) {
                          toast.error("Please add at least one medicine or attach a prescription");
                          return;
                        }
                        if (!deliveryAddress.trim()) {
                          toast.error("Please enter your delivery address to send order to chemist");
                          const el = document.getElementById("delivery-address-input");
                          if (el) {
                            el.focus();
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                          return;
                        }
                        handleBroadcastOrder();
                      }}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-[#0067A1] to-[#005282] hover:from-[#005282] hover:to-[#003d61] text-white font-extrabold rounded-lg text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {broadcasting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending Order to Chemist Pool...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Order & Send to Chemist Now</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-slate-500">
                      Sent to nearby licensed pharmacies &bull; Free home delivery & quotes
                    </p>
                  </div>

                  {/* How Bidding Works Card */}
                  <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-xs space-y-1.5 text-slate-700">
                    <div className="flex items-center gap-1.5 font-bold text-[#0067A1]">
                      <Radio className="w-3.5 h-3.5" />
                      <span>How Chemist Ordering & Quotes Work:</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-600 list-disc list-inside">
                      <li>Your order is sent to licensed pharmacies in your vicinity.</li>
                      <li>Pharmacies review stock and submit real-time price & delivery quotes.</li>
                      <li>Select the best quote, pay via UPI, and receive delivery at home.</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Live Bids Stream & Dynamic Comparison Interface */
              <div className="space-y-6">
                {/* Live Pool Status Banner */}
                <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          Live Chemist Bidding Pool
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {bids.length} Offers Received
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-1">
                        Compare Chemist Offers & Select
                      </h2>
                    </div>
                  </div>

                  {/* Window Countdown Timer */}
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Window Remaining</span>
                      <span className="text-lg font-mono font-bold text-[#0067A1]">
                        {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, "0")}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveBroadcastId(null)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Exit Pool
                    </button>
                  </div>
                </div>

                {/* Filter & Sorting Controls */}
                <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                  {/* Search bids */}
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={bidSearch}
                      onChange={(e) => {
                        setBidSearch(e.target.value);
                        setBidPage(1);
                      }}
                      placeholder="Search chemist or area..."
                      className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                    />
                  </div>

                  {/* Sort Controls */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <span className="text-xs text-slate-400 font-bold shrink-0">Sort By:</span>
                    <select
                      value={bidSortBy}
                      onChange={(e) => {
                        setBidSortBy(e.target.value);
                        setBidPage(1);
                      }}
                      className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="cheapest">Lowest Price (Cheapest)</option>
                      <option value="fastest">Fastest Delivery (ETA)</option>
                      <option value="highest_rated">Highest Rated Chemist</option>
                      <option value="latest">Most Recent Bid</option>
                    </select>

                    <button
                      type="button"
                      onClick={fetchBids}
                      className="p-2 text-slate-500 hover:text-[#0067A1] bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                      title="Refresh Bids"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${bidsLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Unlimited Chemist Bids List */}
                {bidsLoading && bids.length === 0 ? (
                  <div className="bg-white rounded-xl p-16 text-center border border-slate-200/80 shadow-sm space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0067A1]" />
                    <h3 className="text-sm font-bold text-slate-800">Waiting for pharmacies to quote...</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Your prescription has been sent to nearby pharmacies. As soon as a pharmacist prices your items, their quotation will appear here automatically.
                    </p>
                  </div>
                ) : bids.length === 0 ? (
                  <div className="bg-white rounded-xl p-16 text-center border border-slate-200/80 shadow-sm space-y-3">
                    <Clock className="w-8 h-8 mx-auto text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-800">No Chemist Bids Received Yet</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Pharmacies are currently reviewing your medicine list. Bids will dynamically refresh every 3 seconds.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {bids.map((bid) => (
                        <div
                          key={bid.id}
                          className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#0067A1]/40 transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Pharmacy Name & Rating */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center shrink-0">
                                  <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                                    {bid.pharmacy_name}
                                  </h3>
                                  <p className="text-[11px] text-slate-400 truncate max-w-[170px]">
                                    {bid.address}
                                  </p>
                                </div>
                              </div>

                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold shrink-0">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                <span>{bid.rating}</span>
                              </div>
                            </div>

                            {/* Financial Breakdown */}
                            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/60 mb-4 space-y-1.5 text-xs">
                              <div className="flex justify-between text-slate-600">
                                <span>Medicine Cost:</span>
                                <span className="font-semibold text-slate-800">₹{bid.medicine_subtotal}</span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>Delivery Charge:</span>
                                <span className="font-semibold text-slate-800">
                                  {bid.delivery_charge > 0 ? `₹${bid.delivery_charge}` : "FREE"}
                                </span>
                              </div>
                              {bid.discount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-semibold">
                                  <span>Discount:</span>
                                  <span>-₹{bid.discount}</span>
                                </div>
                              )}
                              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm font-bold text-slate-900">
                                <span>Total Price:</span>
                                <span className="text-lg font-black text-[#0067A1]">₹{bid.final_amount}</span>
                              </div>
                            </div>

                            {/* ETA & Badges */}
                            <div className="flex items-center justify-between text-xs mb-4">
                              <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                                <Clock className="w-3.5 h-3.5 text-[#0067A1]" />
                                <span>ETA: {bid.delivery_time_minutes || 30} mins</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>In Stock</span>
                              </span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setBidToSelect(bid);
                              setConsentAgreed(false);
                            }}
                            className="w-full py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Select This Chemist</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Pagination (Unlimited Bids Support) */}
                    {bidPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200 text-xs">
                        <span className="text-slate-500 font-medium">
                          Showing page {bidPage} of {bidPagination.totalPages} ({bidPagination.total} Total Bids)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={bidPage <= 1}
                            onClick={() => setBidPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 font-bold cursor-pointer"
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            disabled={bidPage >= bidPagination.totalPages}
                            onClick={() => setBidPage((p) => p + 1)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 font-bold cursor-pointer"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: CHEMIST SELECTION CONFIRMATION & CONSENT MODAL                  */}
        {/* ========================================================================= */}
        {bidToSelect && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0067A1]" />
                  <h3 className="font-bold text-slate-900 text-base">Confirm Chemist Selection</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBidToSelect(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selected Chemist Details */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between font-bold text-slate-800 text-sm">
                  <span>{bidToSelect.pharmacy_name}</span>
                  <span className="text-[#0067A1]">₹{bidToSelect.final_amount}</span>
                </div>
                <p className="text-slate-500">{bidToSelect.address}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                  <span>Promised Delivery SLA:</span>
                  <span className="font-bold text-slate-900">{bidToSelect.delivery_time_minutes} minutes</span>
                </div>
              </div>

              {/* DPDP Consent Checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-lg bg-blue-50/50 border border-blue-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#0067A1] focus:ring-[#0067A1] cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-relaxed select-none">
                  I agree to award this order exclusively to <strong>{bidToSelect.pharmacy_name}</strong> for ₹{bidToSelect.final_amount}. I will transfer the exact amount via UPI and submit my payment proof for verification.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBidToSelect(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={!consentAgreed || selectingChemist}
                  onClick={handleSelectChemistBid}
                  className="flex-[1.5] py-3 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {selectingChemist ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Locking Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Proceed to Payment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: LIVE CAMERA CAPTURE MODAL                                       */}
        {/* ========================================================================= */}
        {showCameraModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#0067A1]" />
                  <span>Snap Payment Screenshot / Receipt</span>
                </span>
                <button type="button" onClick={stopCamera} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capture Photo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: SCREENSHOT ZOOM / LIGHTBOX VIEWER                               */}
        {/* ========================================================================= */}
        {previewProofModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="relative max-w-3xl w-full flex flex-col items-center">
              {/* Controls */}
              <div className="absolute -top-12 right-0 flex items-center gap-3 text-white">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewProofModal(null);
                    setZoomLevel(1);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Image */}
              <div className="max-h-[80vh] overflow-auto rounded-lg bg-black/40 p-2">
                <img
                  src={previewProofModal}
                  alt="Enlarged Payment Proof"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                  className="max-h-[75vh] object-contain transition-transform duration-150 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sticky Floating Bottom Bar: Always visible when cart has items */}
        {activeTab === "new_request" && !activeBroadcastId && (cartItems.length > 0 || uploadedRxUrl) && (
          <div className="fixed bottom-0 left-0 lg:left-[var(--patient-sidebar-width,16rem)] right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 sm:px-6 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-all duration-300">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {cartItems.length} {cartItems.length === 1 ? "Medicine" : "Medicines"} in Order
                    </span>
                    {uploadedRxUrl && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Rx Attached
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                    {deliveryAddress ? `Deliver to: ${deliveryAddress}` : "Enter delivery address above to send to chemist"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={broadcasting}
                onClick={() => {
                  if (cartItems.length === 0 && !uploadedRxUrl) {
                    toast.error("Please add at least one medicine or attach a prescription");
                    return;
                  }
                  if (!deliveryAddress.trim()) {
                    toast.error("Please enter your delivery address to send order to chemist");
                    const el = document.getElementById("delivery-address-input");
                    if (el) {
                      el.focus();
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                    return;
                  }
                  handleBroadcastOrder();
                }}
                className="px-5 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold rounded-md text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
              >
                {broadcasting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending to Chemist...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Order & Send to Chemist</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}