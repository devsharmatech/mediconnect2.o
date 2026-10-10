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
  Lock,
  CreditCard
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { loadRazorpayScript } from "@/lib/razorpay";

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
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [showDirectUpiSection, setShowDirectUpiSection] = useState(false);

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
    const rxIdParam = searchParams?.get("prescription_id");
    const ordIdParam = searchParams?.get("order_id");
    const pId = patientId || (typeof window !== "undefined" ? (localStorage.getItem("userId") || localStorage.getItem("user_id")) : null);

    if (!pId && !rxIdParam && !ordIdParam) return;

    try {
      if (!silent) setOrdersLoading(true);
      let list = [];

      // 1. If prescription_id or order_id is in URL, fetch it specifically
      if (rxIdParam) {
        try {
          const rxRes = await fetch(`/api/patients/orders/medicine/get?prescription_id=${encodeURIComponent(rxIdParam)}`);
          const rxData = await rxRes.json();
          if (rxData.success && Array.isArray(rxData.data)) {
            list = [...rxData.data];
          }
        } catch (_) {}
      } else if (ordIdParam) {
        try {
          const ordRes = await fetch(`/api/patients/orders/medicine/get?order_id=${encodeURIComponent(ordIdParam)}`);
          const ordData = await ordRes.json();
          if (ordData.success && Array.isArray(ordData.data)) {
            list = [...ordData.data];
          }
        } catch (_) {}
      }

      // 2. If patientId is present, fetch and merge patient orders
      if (pId) {
        try {
          const pRes = await fetch(`/api/patients/orders/medicine/get?patient_id=${encodeURIComponent(pId)}`);
          const pData = await pRes.json();
          if (pData.success && Array.isArray(pData.data)) {
            const existingIds = new Set(list.map((o) => o.id));
            for (const item of pData.data) {
              if (!existingIds.has(item.id)) {
                list.push(item);
              }
            }
          }
        } catch (_) {}
      }

      if (list.length > 0) {
        setOrders(list);
        const target = (rxIdParam || ordIdParam)
          ? list.find((o) => (rxIdParam && o.prescription_id === rxIdParam) || (ordIdParam && o.id === ordIdParam))
          : null;

        if (target) {
          setSelectedOrder(target);
        } else if (!selectedOrder) {
          setSelectedOrder(list[0]);
        } else {
          const updated = list.find((o) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      } else {
        setOrders([]);
      }
    } catch (err) {
      if (!silent) console.error("Error fetching orders:", err);
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 4000);
    return () => clearInterval(interval);
  }, [patientId, searchParams]);

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

  // Online Gateway Payment via Razorpay
  const handlePayOnlineWithRazorpay = async (order) => {
    if (!order?.id) return;
    setPayingOrderId(order.id);
    const tid = toast.loading("Launching secure payment gateway...");
    try {
      let rzOrderId = order.razorpay_order_id;
      let rzKey = order.razorpay_key;
      let amount = order.total_amount;
      let pharmacyName = order.pharmacy_name || order.chemist_details?.pharmacy_name || "Partner Pharmacy";

      if (!rzOrderId || !rzKey) {
        const initRes = await fetch("/api/patients/orders/medicine/initiate-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: order.id }),
        });
        const initData = await initRes.json();
        if (!initRes.ok || !initData?.success) {
          throw new Error(initData?.message || "Failed to initiate online payment");
        }
        rzOrderId = initData.data.razorpay_order_id;
        rzKey = initData.data.razorpay_key;
        amount = initData.data.amount || amount;
        pharmacyName = initData.data.pharmacy_name || pharmacyName;
      }

      await loadRazorpayScript();
      toast.dismiss(tid);

      if (typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Razorpay payment gateway failed to load. Please check your internet connection.");
      }

      const options = {
        key: rzKey,
        amount: Math.round(Number(amount) * 100),
        currency: "INR",
        name: "MediConnect Pharmacy",
        description: `Order #${order.unid || order.id.slice(0, 8)} - ${pharmacyName}`,
        order_id: rzOrderId,
        handler: async function (paymentResponse) {
          const verifyTid = toast.loading("Verifying payment transaction…");
          try {
            const verifyRes = await fetch("/api/patients/orders/medicine/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: order.id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json().catch(() => null);
            toast.dismiss(verifyTid);

            if (verifyRes.ok && verifyData?.success) {
              toast.success("Payment verified successfully! 🎉 Chemist notified to pack medicines.");
              await fetchOrders();
            } else {
              toast.error(verifyData?.message || "Payment signature verification failed");
            }
          } catch (vErr) {
            toast.dismiss(verifyTid);
            toast.error("Payment verification failed. Your funds are safe — contact support.");
          } finally {
            setPayingOrderId(null);
          }
        },
        image: `${typeof window !== "undefined" ? window.location.origin : ""}/real-logo.png`,
        prefill: {
          name: typeof window !== "undefined" ? (localStorage.getItem("userName") || "") : "",
          contact: contactPhone || "",
          email: typeof window !== "undefined" ? (localStorage.getItem("userEmail") || "") : "",
        },
        theme: { color: "#0067A1" },
        modal: {
          ondismiss: () => {
            setPayingOrderId(null);
            toast("Payment not completed. You can pay anytime from the orders tracker.", { icon: "ℹ️" });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setPayingOrderId(null);
        toast.error("Payment failed: " + (response.error?.description || "Transaction declined"));
      });
      rzp.open();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err.message || "Failed to launch payment checkout");
      setPayingOrderId(null);
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
        const order = data.data.order;
        const razorpay_order_id = data.data.razorpay_order_id;
        const razorpay_key = data.data.razorpay_key;
        const amount = data.data.amount || order.total_amount;
        const pharmacy_name = data.data.pharmacy_name || bidToSelect.pharmacy_name;

        setBidToSelect(null);
        setActiveBroadcastId(null);
        setActiveTab("orders");
        await fetchOrders();
        setSelectedOrder(order);

        // If Razorpay gateway credentials exist, launch immediate checkout
        if (razorpay_order_id && razorpay_key) {
          toast.success("Quote Selected! Opening secure payment gateway...");
          await handlePayOnlineWithRazorpay({ ...order, razorpay_order_id, razorpay_key, amount, pharmacy_name });
        } else {
          toast.success("Chemist Selected! Order Created. Proceed with payment.");
        }
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

  // Helper to accurately determine if an order is paid
  const isOrderPaid = (order) => {
    if (!order) return false;
    if (order.payment_status === "paid" || order.payment_status === "completed") return true;
    if (order.payment_verified_at) return true;
    if (["approved", "preparing", "packing", "ready_for_dispatch", "out_for_delivery", "delivered", "completed"].includes(order.status)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50/70 py-2.5 sm:py-5 px-2.5 sm:px-6 lg:px-8 pb-36 sm:pb-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto space-y-3.5 sm:space-y-4">
        {/* Header Banner - Compact & Professional */}
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0067A1]/10 text-[#0067A1] text-[11px] font-semibold">
                <Pill className="w-3 h-3" />
                <span>Pharmacy Care</span>
              </span>
              {selectedOrder && (
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  &bull; Order #{selectedOrder.unid || selectedOrder.id.slice(0, 6).toUpperCase()}
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
              Medicine Orders & Quotes
            </h1>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5 font-normal">
              Compare pharmacy bids, complete instant payments, and track doorstep medicine fulfillment.
            </p>
          </div>

          {/* Segmented Tab Controls */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg shrink-0 border border-slate-200/80 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "orders"
                  ? "bg-[#0067A1] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Active Orders</span>
              {orders.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${activeTab === "orders" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {orders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("new_request")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "new_request"
                  ? "bg-[#0067A1] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Request</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Order Switcher (Visible when multiple orders exist) */}
        {activeTab === "orders" && orders.length > 1 && (
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {orders.map((o) => {
              const isSel = selectedOrder?.id === o.id;
              const isPaid = isOrderPaid(o);
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSel
                      ? "bg-[#0067A1] text-white border-[#0067A1] shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span>#{o.unid || o.id.slice(0, 6).toUpperCase()}</span>
                  <span className={isSel ? "text-white/60" : "text-slate-400"}>&bull;</span>
                  <span>₹{o.total_amount}</span>
                  {isPaid ? (
                    <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${isSel ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                      Paid
                    </span>
                  ) : (
                    <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${isSel ? "bg-amber-300 text-amber-950" : "bg-amber-100 text-amber-800"}`}>
                      Pay Now
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: ACTIVE ORDERS & TRACKING + PAYMENT SCREEN                        */}
        {/* ========================================================================= */}
        {activeTab === "orders" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-start">
            {/* Desktop Left: Orders List Sidebar */}
            <div className="hidden lg:block lg:col-span-4 bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-800 text-xs">Your Orders</span>
                </div>
                <button
                  onClick={() => fetchOrders()}
                  className="p-1.5 text-slate-400 hover:text-[#0067A1] hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                  title="Refresh Orders"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {ordersLoading && orders.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0067A1]" />
                  <p className="text-xs">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-8 px-3 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Pill className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">No active medicine orders</h4>
                  <p className="text-[11px] text-slate-500 font-normal">
                    You haven&apos;t placed any medicine orders yet.
                  </p>
                  <button
                    onClick={() => setActiveTab("new_request")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1] text-white rounded-md text-xs font-semibold hover:bg-[#004F7C] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Request</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[620px] overflow-y-auto pr-0.5">
                  {orders.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    const badge = getStatusBadge(order.status);
                    const StatusIcon = badge.icon;
                    const isPaid = isOrderPaid(order);

                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#0067A1] bg-[#0067A1]/5 shadow-xs"
                            : "border-slate-200/80 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="font-bold text-xs text-slate-900">
                            #{order.unid || order.id.slice(0, 6).toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            ₹{order.total_amount || 0}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-slate-600 truncate mb-2">
                          {order.chemist_details?.pharmacy_name || order.pharmacy_name || "Assigned Pharmacy Partner"}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${badge.className}`}>
                            <StatusIcon className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate max-w-[130px]">{badge.label}</span>
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(order.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </span>
                        </div>

                        {/* Direct Pay button in list item for quick 1-click access */}
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePayOnlineWithRazorpay(order);
                            }}
                            disabled={payingOrderId === order.id}
                            className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay ₹{order.total_amount} Now</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right / Main: Selected Order Detail & Workflows */}
            <div className="lg:col-span-8 space-y-3.5 sm:space-y-4">
              {!selectedOrder ? (
                <div className="bg-white rounded-xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-xs text-slate-400 space-y-3">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs sm:text-sm font-normal text-slate-600">
                    Select an order from the list or create a new request to track medicine fulfillment.
                  </p>
                </div>
              ) : (
                (() => {
                  const orderPaid = isOrderPaid(selectedOrder);
                  const badge = getStatusBadge(selectedOrder.status);
                  const StatusIcon = badge.icon;

                  return (
                    <>
                      {/* Order Overview Card */}
                      <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5 sm:space-y-4">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                                Order #{selectedOrder.unid || selectedOrder.id.slice(0, 8).toUpperCase()}
                              </h2>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${badge.className}`}>
                                <StatusIcon className="w-3 h-3" />
                                <span>{badge.label}</span>
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-normal">
                              Placed on {new Date(selectedOrder.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                            <div className="text-left sm:text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {orderPaid ? "Total Paid" : "Amount Payable"}
                              </p>
                              <p className={`text-base sm:text-lg font-bold ${orderPaid ? "text-emerald-700" : "text-[#0067A1]"}`}>
                                ₹{selectedOrder.total_amount || 0}
                              </p>
                            </div>

                            {/* Prominent Payment Button in Header if not paid */}
                            {!orderPaid ? (
                              <button
                                type="button"
                                disabled={payingOrderId === selectedOrder.id}
                                onClick={() => handlePayOnlineWithRazorpay(selectedOrder)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                              >
                                {payingOrderId === selectedOrder.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Opening...</span>
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>Pay ₹{selectedOrder.total_amount} Now</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1 shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Paid & Confirmed</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Top Payment Pending Action Box (If Not Paid) */}
                        {!orderPaid && (
                          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-amber-50 via-emerald-50/60 to-sky-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <CreditCard className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                    Payment Pending: ₹{selectedOrder.total_amount}
                                  </h4>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    Action Required
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                  Pay securely via UPI (GPay, PhonePe, Paytm), Cards, or NetBanking to initiate medicine packaging and dispatch.
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={payingOrderId === selectedOrder.id}
                              onClick={() => handlePayOnlineWithRazorpay(selectedOrder)}
                              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                            >
                              {payingOrderId === selectedOrder.id ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Opening Gateway...</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Pay ₹{selectedOrder.total_amount} Online Now</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Payment Verified Reassurance Box (If Paid) */}
                        {orderPaid && (
                          <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-xs sm:text-sm text-emerald-900">
                                    Payment Received & Verified (₹{selectedOrder.total_amount})
                                  </h4>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {selectedOrder.razorpay_payment_id ? "Razorpay Gateway" : "Chemist Verified"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-emerald-800 font-normal">
                                  {selectedOrder.razorpay_payment_id || selectedOrder.utr_number ? `Ref: ${selectedOrder.razorpay_payment_id || selectedOrder.utr_number} • ` : ""}
                                  Chemist partner has been notified to pack and dispatch your medicines.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Lifecycle Progress Timeline - Compact 4 Step Bar */}
                        <div className="bg-slate-50/80 rounded-xl p-3 sm:p-3.5 border border-slate-200/60">
                          <div className="flex items-center justify-between mb-2.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Order Lifecycle
                            </p>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {orderPaid ? "Payment Verified • Processing" : "Awaiting Online Payment"}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 text-center">
                            {/* Step 1: Offer Locked */}
                            <div className="flex flex-col items-center">
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-1 shadow-xs">
                                <Check className="w-3 h-3 stroke-[2.5]" />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-800">Confirmed</span>
                              <span className="text-[9px] text-slate-400 hidden sm:inline">Offer Locked</span>
                            </div>

                            {/* Step 2: Payment */}
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center mb-1 shadow-xs ${
                                orderPaid
                                  ? "bg-emerald-500 text-white"
                                  : selectedOrder.payment_declaration_by_patient || selectedOrder.status === "payment_submitted"
                                  ? "bg-blue-500 text-white animate-pulse"
                                  : selectedOrder.status === "payment_declined"
                                  ? "bg-red-500 text-white"
                                  : "bg-amber-500 text-white"
                              }`}>
                                {orderPaid ? (
                                  <Check className="w-3 h-3 stroke-[2.5]" />
                                ) : selectedOrder.status === "payment_declined" ? (
                                  <X className="w-3 h-3 stroke-[2.5]" />
                                ) : (
                                  <CreditCard className="w-3 h-3" />
                                )}
                              </div>
                              <span className="text-[11px] font-semibold text-slate-800">Payment</span>
                              <span className="text-[9px] text-slate-400 hidden sm:inline">
                                {orderPaid ? "Verified" : "Pending"}
                              </span>
                            </div>

                            {/* Step 3: Preparation */}
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center mb-1 shadow-xs ${
                                ["ready_for_dispatch", "out_for_delivery", "delivered", "completed"].includes(selectedOrder.status)
                                  ? "bg-emerald-500 text-white"
                                  : ["approved", "preparing", "packing"].includes(selectedOrder.status)
                                  ? "bg-indigo-600 text-white animate-pulse"
                                  : "bg-slate-200 text-slate-400"
                              }`}>
                                <Package className="w-3 h-3" />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-800">Packing</span>
                              <span className="text-[9px] text-slate-400 hidden sm:inline">Preparing</span>
                            </div>

                            {/* Step 4: Delivery */}
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center mb-1 shadow-xs ${
                                ["delivered", "completed"].includes(selectedOrder.status)
                                  ? "bg-emerald-500 text-white"
                                  : ["out_for_delivery"].includes(selectedOrder.status)
                                  ? "bg-purple-600 text-white animate-bounce"
                                  : "bg-slate-200 text-slate-400"
                              }`}>
                                <Truck className="w-3 h-3" />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-800">Delivery</span>
                              <span className="text-[9px] text-slate-400 hidden sm:inline">
                                {["delivered", "completed"].includes(selectedOrder.status) ? "Delivered" : "To Door"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Assigned Pharmacy Profile Card */}
                        <div className="p-3 sm:p-3.5 rounded-xl bg-sky-50/40 border border-sky-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-white border border-sky-200 flex items-center justify-center text-[#0067A1] shrink-0 shadow-xs">
                              <ShieldCheck className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {selectedOrder.chemist_details?.pharmacy_name || selectedOrder.pharmacy_name || "Apex Healthcare & Chemists"}
                                </h3>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                  <span>{selectedOrder.chemist_details?.rating || selectedOrder.chemist_rating || 4.8}</span>
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                <span className="truncate max-w-xs">{selectedOrder.chemist_details?.address || selectedOrder.chemist_address || "Licensed Pharmacy Partner"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                            {(selectedOrder.chemist_details?.mobile || selectedOrder.chemist_mobile) && (
                              <a
                                href={`tel:${selectedOrder.chemist_details?.mobile || selectedOrder.chemist_mobile}`}
                                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span>Call Chemist</span>
                              </a>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                              <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                              <span>Verified</span>
                            </span>
                          </div>
                        </div>

                        {/* Prescribed Medicines Breakdown */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Prescribed Medicines & Quantities
                            </h4>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {selectedOrder.medicine_order_items?.length || 0} items
                            </span>
                          </div>

                          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                            {(selectedOrder.medicine_order_items && selectedOrder.medicine_order_items.length > 0) ? (
                              selectedOrder.medicine_order_items.map((item, idx) => (
                                <div key={idx} className="p-2.5 sm:p-3 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-800 text-xs">{item.medicine_name}</p>
                                      <p className="text-[10px] text-slate-400">{item.dosage || "Standard Dose"}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-semibold text-slate-700 text-xs">Qty: {item.quantity}</span>
                                    {Number(item.price) > 0 && (
                                      <p className="text-[11px] text-slate-500 font-semibold">₹{Number(item.price).toFixed(2)}</p>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-xs text-slate-500 italic">
                                Order items registered according to prescription record.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="bg-slate-50/80 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-600 text-[11px]">
                            <span>Medicine Subtotal:</span>
                            <span className="font-semibold text-slate-800">
                              ₹{Number(selectedOrder.medicine_subtotal || selectedOrder.total_amount).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600 text-[11px]">
                            <span>Delivery & Handling:</span>
                            <span className="font-semibold text-slate-800">
                              ₹{Number(selectedOrder.delivery_charge || 0).toFixed(2)}
                            </span>
                          </div>
                          {Number(selectedOrder.discount || 0) > 0 && (
                            <div className="flex justify-between text-emerald-600 font-semibold text-[11px]">
                              <span>Special Discount:</span>
                              <span>-₹{Number(selectedOrder.discount).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="pt-2 border-t border-slate-200 flex justify-between text-xs sm:text-sm font-bold text-slate-900">
                            <span>Total Payable:</span>
                            <span className={orderPaid ? "text-emerald-700" : "text-[#0067A1]"}>
                              ₹{Number(selectedOrder.total_amount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Rejection Alert if applicable */}
                      {selectedOrder.status === "payment_declined" && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 sm:p-4 text-red-900 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            <h4 className="font-bold text-xs sm:text-sm">Payment Issue Raised by Chemist</h4>
                          </div>
                          <p className="text-xs text-red-800 leading-relaxed">
                            Reason: &ldquo;{selectedOrder.payment_failed_reason || "Transaction not found or screenshot unreadable"}&rdquo;.
                            Please pay online via Razorpay or re-verify your 12-digit UTR below.
                          </p>
                        </div>
                      )}

                      {/* Direct Chemist UPI & Manual Proof (Collapsible Alternative when Unpaid) */}
                      {!orderPaid && (
                        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setShowDirectUpiSection((prev) => !prev)}
                            className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <QrCode className="w-4 h-4 text-slate-500" />
                              <div>
                                <span className="font-semibold text-xs sm:text-sm text-slate-800">
                                  Prefer Direct Chemist UPI Transfer?
                                </span>
                                <p className="text-[11px] text-slate-500">
                                  Scan chemist QR code or upload manual UTR payment screenshot.
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-[#0067A1]">
                              {showDirectUpiSection ? "Hide QR ▴" : "Show QR ▾"}
                            </span>
                          </button>

                          {showDirectUpiSection && (
                            <div className="p-3.5 sm:p-5 border-t border-slate-100 space-y-4 bg-slate-50/40">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                {/* QR Code */}
                                <div className="md:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 text-center">
                                  {(() => {
                                    const chemistUpi = selectedOrder.chemist_details?.upi_id || selectedOrder.chemist_upi_id || "apexmedicos@upi";
                                    const pharmacyName = selectedOrder.chemist_details?.pharmacy_name || selectedOrder.pharmacy_name || "Partner Pharmacy";
                                    const amount = selectedOrder.total_amount || 0;
                                    const upiLink = `upi://pay?pa=${encodeURIComponent(chemistUpi)}&pn=${encodeURIComponent(pharmacyName)}&am=${amount}&cu=INR&tn=Order-${selectedOrder.unid || selectedOrder.id.slice(0, 8)}`;
                                    const qrUrl = selectedOrder.chemist_details?.payment_qr_url || selectedOrder.chemist_payment_qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;

                                    return (
                                      <>
                                        <img
                                          src={qrUrl}
                                          alt="Chemist UPI QR Code"
                                          className="w-36 h-36 object-contain rounded-lg mb-2"
                                        />
                                        <span className="text-[10px] font-semibold text-slate-500">
                                          Scan via GPay, PhonePe, Paytm, or BHIM
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Chemist UPI ID & Quick App Links */}
                                <div className="md:col-span-7 space-y-3">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                      Chemist UPI ID
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 truncate">
                                        {selectedOrder.chemist_details?.upi_id || selectedOrder.chemist_upi_id || "apexmedicos@upi"}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyUpi(selectedOrder.chemist_details?.upi_id || selectedOrder.chemist_upi_id || "apexmedicos@upi")}
                                        className="px-3 py-1.5 bg-[#0067A1] text-white rounded-lg text-xs font-semibold hover:bg-[#004F7C] transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                      >
                                        {copiedUpi ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
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

                                  {/* Quick 1-Tap App Links */}
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                      1-Tap UPI Launch
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                      {(() => {
                                        const chemistUpi = selectedOrder.chemist_details?.upi_id || selectedOrder.chemist_upi_id || "apexmedicos@upi";
                                        const pharmacyName = selectedOrder.chemist_details?.pharmacy_name || selectedOrder.pharmacy_name || "Partner Pharmacy";
                                        const amount = selectedOrder.total_amount || 0;
                                        const upiLink = `upi://pay?pa=${encodeURIComponent(chemistUpi)}&pn=${encodeURIComponent(pharmacyName)}&am=${amount}&cu=INR&tn=Order-${selectedOrder.unid || selectedOrder.id.slice(0, 8)}`;
                                        return (
                                          <>
                                            <a
                                              href={upiLink}
                                              className="py-1.5 px-2.5 text-center bg-white border border-slate-200 hover:border-[#0067A1] text-slate-700 font-semibold rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1 shadow-xs"
                                            >
                                              <span>Google Pay</span>
                                              <ExternalLink className="w-3 h-3" />
                                            </a>
                                            <a
                                              href={upiLink}
                                              className="py-1.5 px-2.5 text-center bg-white border border-slate-200 hover:border-[#0067A1] text-slate-700 font-semibold rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1 shadow-xs"
                                            >
                                              <span>PhonePe / Paytm</span>
                                              <ExternalLink className="w-3 h-3" />
                                            </a>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Manual UTR Proof Submission Form */}
                              <div className="pt-3 border-t border-slate-200/80 space-y-3">
                                <div>
                                  <h4 className="font-bold text-slate-800 text-xs">Submit Manual UTR Proof</h4>
                                  <p className="text-[11px] text-slate-500">Attach screenshot and 12-digit UTR if paying outside Razorpay.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                                      12-Digit UTR Number <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      maxLength={22}
                                      value={utrNumber}
                                      onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                                      placeholder="e.g. 427819203847"
                                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-900 bg-white"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                                      Receipt Screenshot <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-dashed border-slate-300 hover:border-[#0067A1] bg-white text-slate-700 text-xs font-semibold cursor-pointer transition-colors">
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
                                      <button
                                        type="button"
                                        onClick={startCamera}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                                      >
                                        <Camera className="w-3.5 h-3.5" />
                                        <span>Take Photo</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {proofPreview && (
                                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={proofPreview}
                                        alt="Proof Preview"
                                        className="w-10 h-10 object-cover rounded-md border"
                                      />
                                      <span className="text-xs font-semibold text-slate-800 truncate max-w-xs">{proofFile?.name || "Payment_Proof.jpg"}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewProofModal(proofPreview)}
                                        className="p-1 text-slate-500 hover:text-[#0067A1]"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setProofFile(null);
                                          setProofPreview(null);
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-500"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  disabled={submittingProof || !utrNumber.trim() || !proofFile}
                                  onClick={handleSubmitPaymentProof}
                                  className="w-full py-2 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                                >
                                  {submittingProof ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Submitting Proof...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3.5 h-3.5" />
                                      <span>Submit Proof for Chemist Verification</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: NEW MEDICINE REQUEST & LIVE BIDDING STREAM                        */}
        {/* ========================================================================= */}
        {activeTab === "new_request" && (
          <div className="space-y-4 sm:space-y-5">
            {!activeBroadcastId ? (
              /* Step 1: Create Request Form */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-start">
                {/* Left: Medicine Search & Cart (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">1. Add Prescribed Medicines</h2>
                    <p className="text-xs text-slate-500 font-normal">
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
                      className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-200 text-xs font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] bg-slate-50/50"
                    />

                    {/* Suggestions dropdown */}
                    {medSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {medSuggestions.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleAddMedicine(item)}
                            className="p-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Pill className="w-3.5 h-3.5 text-[#0067A1]" />
                              <div>
                                <span className="font-medium text-slate-800">{item.name}</span>
                                <span className="text-[10px] text-slate-400 block">{item.dosage} &bull; {item.type}</span>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-[#0067A1] flex items-center gap-1">
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
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Or Add Custom Medicine
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        value={customMedName}
                        onChange={(e) => setCustomMedName(e.target.value)}
                        placeholder="Medicine Name (e.g. Telma 40)"
                        className="sm:col-span-6 px-3 py-2 rounded-md border border-slate-200 text-xs font-normal text-slate-900 bg-white"
                      />
                      <input
                        type="text"
                        value={customMedDosage}
                        onChange={(e) => setCustomMedDosage(e.target.value)}
                        placeholder="Dosage (e.g. 40mg)"
                        className="sm:col-span-3 px-3 py-2 rounded-md border border-slate-200 text-xs font-normal text-slate-900 bg-white"
                      />
                      <div className="sm:col-span-3 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={customMedQty}
                          onChange={(e) => setCustomMedQty(e.target.value)}
                          placeholder="Qty"
                          className="w-16 px-2.5 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-900 bg-white text-center"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomMedicine}
                          className="flex-1 py-2 px-3 bg-[#0067A1] text-white rounded-md text-xs font-medium hover:bg-[#004F7C] transition-colors cursor-pointer"
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
                              <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.id, -1)}
                                  className="px-2 py-1 hover:bg-slate-200 font-medium text-slate-600 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-2 py-1 text-xs font-medium text-slate-800 min-w-6 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.id, 1)}
                                  className="px-2 py-1 hover:bg-slate-200 font-medium text-slate-600 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveCartItem(item.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
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
                            <span className="font-medium text-xs text-emerald-900 block">
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
                          className="px-4 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white font-medium text-xs rounded-md flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
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
                        <h3 className="text-sm font-semibold text-slate-900">2. Upload Prescription (Optional / Rx)</h3>
                        <p className="text-xs text-slate-500">Upload doctor prescription image or PDF for verification.</p>
                      </div>
                      {uploadingRx && (
                        <span className="text-xs text-[#0067A1] font-medium flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Uploading...</span>
                        </span>
                      )}
                    </div>

                    {!prescriptionPreview ? (
                      <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-200 hover:border-[#0067A1] rounded-lg bg-slate-50/50 hover:bg-blue-50/20 cursor-pointer transition-colors">
                        <Upload className="w-5 h-5 text-slate-400 mb-1.5" />
                        <span className="text-xs font-medium text-slate-700">Click to upload doctor prescription</span>
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
                            <span className="text-xs font-medium text-slate-800 block truncate max-w-xs">{prescriptionFile?.name}</span>
                            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
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
                <div className="lg:col-span-5 bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">3. Delivery Details</h2>
                      <p className="text-xs text-slate-500">Pharmacies use this to calculate delivery time.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#0067A1]/10 text-[#0067A1]">
                      Step 3 of 3
                    </span>
                  </div>

                  {/* Delivery Address */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
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
                      <label className="text-xs font-medium text-slate-700 block mb-1">
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
                      <label className="text-xs font-medium text-slate-700 block mb-1">
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
                    <label className="text-xs font-medium text-slate-700 block mb-1">
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
                      className="w-full py-3.5 px-4 bg-[#0067A1] hover:bg-[#004F7C] text-white font-medium rounded-md text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
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
                    <div className="flex items-center gap-1.5 font-medium text-[#0067A1]">
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
                <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-md bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-semibold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          Live Chemist Bidding Pool
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {bids.length} Offers Received
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-slate-900 mt-1">
                        Compare Chemist Offers & Select
                      </h2>
                    </div>
                  </div>

                  {/* Window Countdown Timer */}
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-md bg-slate-100 border border-slate-200 text-center">
                      <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">Window Remaining</span>
                      <span className="text-lg font-mono font-semibold text-[#0067A1]">
                        {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, "0")}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveBroadcastId(null)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
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
                      className="w-full pl-10 pr-3 py-2 text-xs rounded-md border border-slate-200 bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                    />
                  </div>

                  {/* Sort Controls */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <span className="text-xs text-slate-400 font-medium shrink-0">Sort By:</span>
                    <select
                      value={bidSortBy}
                      onChange={(e) => {
                        setBidSortBy(e.target.value);
                        setBidPage(1);
                      }}
                      className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="cheapest">Lowest Price (Cheapest)</option>
                      <option value="fastest">Fastest Delivery (ETA)</option>
                      <option value="highest_rated">Highest Rated Chemist</option>
                      <option value="latest">Most Recent Bid</option>
                    </select>

                    <button
                      type="button"
                      onClick={fetchBids}
                      className="p-2 text-slate-500 hover:text-[#0067A1] bg-slate-50 border border-slate-200 rounded-md cursor-pointer"
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
                    <h3 className="text-sm font-semibold text-slate-800">Waiting for pharmacies to quote...</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Your prescription has been sent to nearby pharmacies. As soon as a pharmacist prices your items, their quotation will appear here automatically.
                    </p>
                  </div>
                ) : bids.length === 0 ? (
                  <div className="bg-white rounded-xl p-16 text-center border border-slate-200/80 shadow-sm space-y-3">
                    <Clock className="w-8 h-8 mx-auto text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-800">No Chemist Bids Received Yet</h3>
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
                                <div className="w-10 h-10 rounded-md bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center shrink-0">
                                  <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                                    {bid.pharmacy_name}
                                  </h3>
                                  <p className="text-[11px] text-slate-400 truncate max-w-[170px]">
                                    {bid.address}
                                  </p>
                                </div>
                              </div>

                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-medium shrink-0">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                <span>{bid.rating}</span>
                              </div>
                            </div>

                            {/* Financial Breakdown */}
                            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/60 mb-4 space-y-1.5 text-xs">
                              <div className="flex justify-between text-slate-600">
                                <span>Medicine Cost:</span>
                                <span className="font-medium text-slate-800">₹{bid.medicine_subtotal}</span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>Delivery Charge:</span>
                                <span className="font-medium text-slate-800">
                                  {bid.delivery_charge > 0 ? `₹${bid.delivery_charge}` : "FREE"}
                                </span>
                              </div>
                              {bid.discount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-medium">
                                  <span>Discount:</span>
                                  <span>-₹{bid.discount}</span>
                                </div>
                              )}
                              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm font-semibold text-slate-900">
                                <span>Total Price:</span>
                                <span className="text-lg font-semibold text-[#0067A1]">₹{bid.final_amount}</span>
                              </div>
                            </div>

                            {/* ETA & Badges */}
                            <div className="flex items-center justify-between text-xs mb-4">
                              <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                                <Clock className="w-3.5 h-3.5 text-[#0067A1]" />
                                <span>ETA: {bid.delivery_time_minutes || 30} mins</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium text-[10px]">
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
                            className="w-full py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-md text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
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
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-md text-slate-700 font-medium cursor-pointer"
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            disabled={bidPage >= bidPagination.totalPages}
                            onClick={() => setBidPage((p) => p + 1)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-md text-slate-700 font-medium cursor-pointer"
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
                  <h3 className="font-semibold text-slate-900 text-base">Confirm Chemist Selection</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBidToSelect(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selected Chemist Details */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between font-semibold text-slate-800 text-sm">
                  <span>{bidToSelect.pharmacy_name}</span>
                  <span className="text-[#0067A1]">₹{bidToSelect.final_amount}</span>
                </div>
                <p className="text-slate-500">{bidToSelect.address}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                  <span>Promised Delivery SLA:</span>
                  <span className="font-semibold text-slate-900">{bidToSelect.delivery_time_minutes} minutes</span>
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
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md text-xs transition-colors cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={!consentAgreed || selectingChemist}
                  onClick={handleSelectChemistBid}
                  className="flex-[1.5] py-3 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-slate-300 text-white font-medium rounded-md text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
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
                <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#0067A1]" />
                  <span>Snap Payment Screenshot / Receipt</span>
                </span>
                <button type="button" onClick={stopCamera} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md">
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
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-medium rounded-md text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
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