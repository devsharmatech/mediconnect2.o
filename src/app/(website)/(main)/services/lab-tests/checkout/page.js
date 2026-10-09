"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    FaArrowLeft, FaShoppingCart, FaMapMarkerAlt, FaHome, FaWalking,
    FaCheckCircle, FaLock, FaFlask, FaShieldAlt, FaFileUpload,
    FaFilePdf, FaTrash, FaEye, FaCreditCard,
    FaSignInAlt, FaUserPlus, FaSpinner
} from "react-icons/fa";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";
import LoginModal from "@/components/public-site/auth/LoginModal";
import SignupModal from "@/components/public-site/auth/SignupModal";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";

const CART_KEY = "lab_test_cart";

function getCart() {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "null"); } catch { return null; }
}

export default function PublicCheckoutPage() {
    const router = useRouter();
    const [cart, setCart] = useState(null);
    const [step, setStep] = useState(1); // 1: Review & Rx, 2: Address, 3: Consent, 4: Payment, 5: Success
    const [processing, setProcessing] = useState(false);
    const [patientId, setPatientId] = useState(null);
    const [userLoggedIn, setUserLoggedIn] = useState(false);

    // Auth Modals
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState(false);

    // Prescription State
    const [prescriptionFile, setPrescriptionFile] = useState(null);
    const [prescriptionUrl, setPrescriptionUrl] = useState("");
    const [uploadingRx, setUploadingRx] = useState(false);
    const [hasNoPrescription, setHasNoPrescription] = useState(false);
    const fileInputRef = useRef(null);

    // Address form
    const [address, setAddress] = useState({ full_address: "", city: "", pincode: "", landmark: "" });
    const [visitType, setVisitType] = useState("home_collection");
    const [patientNotes, setPatientNotes] = useState("");

    // Payment Method - Fixed to instant online payment via Razorpay
    const paymentMethod = "razorpay";

    // Completed Order Details (for Step 5 Success)
    const [completedOrder, setCompletedOrder] = useState(null);
    const [showMobileSummary, setShowMobileSummary] = useState(false);

    // Consents
    const [consents, setConsents] = useState({
        sample_collection_consent: false,
        testing_and_reporting_consent: false,
        data_sharing_consent: false,
        terms_accepted: false,
    });

    const checkAuthStatus = () => {
        if (typeof window === "undefined") return false;
        const userId = localStorage.getItem("userId") || localStorage.getItem("user_id");
        if (userId) {
            setPatientId(userId);
            setUserLoggedIn(true);
            return true;
        } else {
            setPatientId(null);
            setUserLoggedIn(false);
            return false;
        }
    };

    const goToStep = (newStep) => {
        setStep(newStep);
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    useEffect(() => {
        const c = getCart();
        if (!c || !c.tests?.length) {
            toast.error("Your cart is empty");
            router.push("/services/lab-tests");
            return;
        }
        setCart(c);

        // Check authentication
        const isAuthed = checkAuthStatus();
        if (!isAuthed) {
            setShowLoginModal(true);
        }

        // Load Razorpay SDK
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        return () => { if (document.body.contains(script)) document.body.removeChild(script); };
    }, [router]);

    // Handle Login/Register Success
    const handleAuthSuccess = () => {
        const isAuthed = checkAuthStatus();
        if (isAuthed) {
            setShowLoginModal(false);
            setShowSignupModal(false);
            toast.success("Logged in successfully!");
        }
    };

    // Prescription File Upload Handler
    const handlePrescriptionSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Please upload a JPG, PNG, WEBP, or PDF file");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error("Prescription file size must be less than 10MB");
            return;
        }

        setPrescriptionFile(file);
        setUploadingRx(true);
        setHasNoPrescription(false);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload/prescription", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.success && data.data?.url) {
                setPrescriptionUrl(data.data.url);
                toast.success("Prescription uploaded successfully!");
            } else {
                throw new Error(data.message || "Upload failed");
            }
        } catch (err) {
            console.error("Prescription upload error:", err);
            toast.error("Failed to upload prescription. Please try again.");
            setPrescriptionFile(null);
            setPrescriptionUrl("");
        } finally {
            setUploadingRx(false);
        }
    };

    const handleRemovePrescription = () => {
        setPrescriptionFile(null);
        setPrescriptionUrl("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    if (!cart) return <LoadingScreen message="Preparing checkout..." submessage="Loading your order" />;

    const testsTotal = cart.tests.reduce((s, t) => s + (parseFloat(t.price) || 0), 0);
    const collectionFee = visitType === "home_collection" ? 150 : 0;
    const totalAmount = testsTotal + collectionFee;
    const allConsentsGiven = Object.values(consents).every(Boolean);

    // Toggle All Consents
    const handleToggleAllConsents = () => {
        const targetVal = !allConsentsGiven;
        setConsents({
            sample_collection_consent: targetVal,
            testing_and_reporting_consent: targetVal,
            data_sharing_consent: targetVal,
            terms_accepted: targetVal,
        });
    };

    // Place Order & Pay Handler
    const handlePlaceOrder = async () => {
        if (!userLoggedIn || !patientId) {
            setShowLoginModal(true);
            toast.error("Please login before payment");
            return;
        }

        if (!address.full_address || !address.city || !address.pincode) {
            toast.error("Please fill address details");
            goToStep(2);
            return;
        }

        if (!allConsentsGiven) {
            toast.error("Please grant all medical consents");
            goToStep(3);
            return;
        }

        setProcessing(true);

        try {
            // Initiate order on our backend
            const initRes = await fetch("/api/patient/lab/orders/initiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patient_id: patientId,
                    lab_id: cart.lab_id,
                    tests: cart.tests,
                    prescription_url: prescriptionUrl || null,
                    address,
                    visit_type: visitType,
                    payment_method: "razorpay",
                    patient_notes: patientNotes,
                    consents,
                    device_type: "web",
                }),
            });

            const initData = await initRes.json();

            if (!initRes.ok || !initData.success) {
                throw new Error(initData.message || "Failed to create order");
            }

            const { order_id, order_unid, razorpay_order_id, razorpay_key, amount, lab_name } = initData.data;

            // Online Payment via Razorpay
            if (!window.Razorpay) {
                throw new Error("Razorpay gateway failed to load. Please refresh and try again.");
            }

            const userData = JSON.parse(localStorage.getItem("userData") || "{}");
            const options = {
                key: razorpay_key,
                amount: Math.round(amount * 100),
                currency: "INR",
                name: "MediConnect Labs",
                description: `Lab Tests - ${lab_name}`,
                image: `${window.location.origin}/images/labs/default-lab-logo.svg`,
                order_id: razorpay_order_id,
                handler: async function (response) {
                    try {
                        const verifyRes = await fetch("/api/patient/lab/orders/verify-payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                order_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });
                        const verifyData = await verifyRes.json();

                        if (verifyData.success) {
                            localStorage.removeItem(CART_KEY);
                            setCompletedOrder({
                                order_id,
                                order_unid,
                                lab_name,
                                amount: totalAmount,
                                payment_method: "Online Payment (Razorpay)",
                                payment_status: "Paid",
                                visit_type: visitType,
                                address: address.full_address,
                                prescription_url: prescriptionUrl,
                                tests: cart.tests,
                            });
                            goToStep(5);
                            toast.success("Payment verified! Order confirmed.");
                        } else {
                            toast.error(verifyData.message || "Payment verification failed. Please contact support.");
                        }
                    } catch {
                        toast.error("Payment verification failed. Your payment is safe — contact support if needed.");
                    } finally {
                        setProcessing(false);
                    }
                },
                prefill: {
                    name: userData?.details?.full_name || userData?.full_name || "Patient",
                    contact: userData?.phone_number || "",
                    email: userData?.details?.email || userData?.email || "",
                },
                theme: { color: "#0067A1" },
                modal: {
                    ondismiss: () => {
                        setProcessing(false);
                        toast.error("Payment cancelled");
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", (response) => {
                setProcessing(false);
                toast.error("Payment failed: " + (response.error?.description || "Unknown error"));
            });
            rzp.open();

        } catch (error) {
            toast.error(error.message || "Order placement failed");
            setProcessing(false);
        }
    };

    const consentList = [
        {
            key: "sample_collection_consent",
            title: "Biological Sample Collection Consent",
            desc: `I authorize certified phlebotomist from ${cart.lab_name} to collect biological samples adhering to standard clinical safety protocols.`,
            mandate: "Mandatory under Clinical Establishments Act & ICMR Guidelines",
        },
        {
            key: "testing_and_reporting_consent",
            title: "Diagnostic Testing & Reporting Consent",
            desc: `I grant consent to ${cart.lab_name} to process samples and generate verified laboratory reports.`,
            mandate: "Mandatory for clinical diagnostic validity",
        },
        {
            key: "data_sharing_consent",
            title: "Health Data Privacy & DPDP Act 2023",
            desc: "I consent to secure processing and storage of my diagnostic records under the DPDP Act 2023.",
            mandate: "Mandatory under Indian Digital Health Regulations",
        },
        {
            key: "terms_accepted",
            title: "Terms of Service & Lab Conditions",
            desc: "I accept the laboratory turnaround guidelines and sample handling policies.",
            mandate: "Mandatory agreement to service policy",
        },
    ];

    return (
        <div className="min-h-[85vh] bg-[#F6F8FA] pb-16 pt-5">
            {/* Auth Modals */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onSignupClick={() => {
                    setShowLoginModal(false);
                    setShowSignupModal(true);
                }}
                onSuccess={handleAuthSuccess}
                initialUserType="patient"
            />

            <SignupModal
                isOpen={showSignupModal}
                onClose={() => setShowSignupModal(false)}
                onLoginClick={() => {
                    setShowSignupModal(false);
                    setShowLoginModal(true);
                }}
                onSuccess={handleAuthSuccess}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6">

                {/* Header Banner */}
                <div className="bg-[#0067A1] text-white rounded-xl px-4 sm:px-6 py-4 mb-4 border border-[#005585]">
                    <div className="flex flex-col gap-1.5">
                        {step !== 5 && (
                            <button
                                type="button"
                                onClick={() => router.push(`/services/lab-tests/${cart.lab_id}`)}
                                className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer w-fit group"
                            >
                                <FaArrowLeft className="w-2.5 h-2.5 group-hover:-translate-x-1 transition-transform" />
                                Back to Lab
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/15 rounded-lg border border-white/20 flex items-center justify-center shrink-0">
                                <FaLock className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-xl font-black text-white tracking-tight leading-tight truncate">
                                    {step === 5 ? "Booking Confirmed" : "Complete Lab Test Order"}
                                </h1>
                                <p className="text-white/80 text-[11px] sm:text-xs font-medium truncate">
                                    {cart.lab_name} • {cart.tests.length} {cart.tests.length === 1 ? "test" : "tests"} in cart
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Login Prompt Banner (if not logged in) */}
                {!userLoggedIn && step !== 5 && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-3.5 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                                <FaSignInAlt className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-xs sm:text-sm">Login Required</h3>
                                <p className="text-[11px] text-gray-600">Please sign in to complete payment and place your order.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setShowLoginModal(true)}
                                className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#0067A1] text-white text-xs font-bold rounded-lg hover:bg-[#004F7C] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                <FaSignInAlt className="w-3 h-3" /> Login
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowSignupModal(true)}
                                className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-white text-[#0067A1] border border-[#0067A1] text-xs font-bold rounded-lg hover:bg-[#0067A1]/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                <FaUserPlus className="w-3 h-3" /> Register
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Step Indicator (Steps 1 to 4) */}
                {step !== 5 && (
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-5 max-w-2xl mx-auto overflow-x-auto py-1">
                        {[
                            { n: 1, label: "Review & Rx" },
                            { n: 2, label: "Address" },
                            { n: 3, label: "Consent" },
                            { n: 4, label: "Payment" },
                        ].map((s, i) => (
                            <div key={s.n} className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (s.n === 4 && (!userLoggedIn || !patientId)) {
                                            toast.error("Please login before payment");
                                            setShowLoginModal(true);
                                            return;
                                        }
                                        if (s.n > 2 && (!address.full_address || !address.city || !address.pincode)) {
                                            toast.error("Please enter address first");
                                            return;
                                        }
                                        if (s.n > 3 && !allConsentsGiven) {
                                            toast.error("Please grant consents first");
                                            return;
                                        }
                                        goToStep(s.n);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                        step === s.n
                                            ? "bg-[#0067A1] text-white border-[#0067A1]"
                                            : step > s.n
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    {step > s.n ? (
                                        <FaCheckCircle className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                        <span className={`w-3.5 h-3.5 flex items-center justify-center text-[10px] rounded ${step === s.n ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{s.n}</span>
                                    )}
                                    <span className={step === s.n ? "inline" : "hidden sm:inline"}>{s.label}</span>
                                </button>
                                {i < 3 && (
                                    <div className={`w-2 sm:w-6 h-0.5 mx-1 transition-colors ${step > s.n ? "bg-emerald-400" : "bg-slate-200"}`} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ─── STEP 5: SUCCESS CONFIRMATION ─── */}
                {step === 5 && completedOrder && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6 sm:p-8 text-center"
                    >
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                            <FaCheckCircle className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Order Confirmed!</h2>
                        <p className="text-gray-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                            Your lab test booking has been placed with <span className="font-bold text-gray-900">{completedOrder.lab_name}</span>.
                        </p>

                        <div className="bg-slate-50/70 rounded-lg p-4 sm:p-5 border border-slate-200 text-left my-5 space-y-2.5 text-xs sm:text-sm">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                <span className="text-gray-500 font-medium">Order ID</span>
                                <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                                    {completedOrder.order_unid || completedOrder.order_id?.slice(0, 8)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">Laboratory</span>
                                <span className="font-bold text-gray-900">{completedOrder.lab_name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">Collection Mode</span>
                                <span className="font-bold text-[#0067A1]">
                                    {completedOrder.visit_type === "home_collection" ? "Home Sample Collection" : "Walk-in at Lab"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">Payment Mode</span>
                                <span className="font-bold text-gray-900">{completedOrder.payment_method}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">Status</span>
                                <span className="font-extrabold px-2 py-0.5 rounded text-[11px] bg-green-100 text-green-700">
                                    {completedOrder.payment_status}
                                </span>
                            </div>
                            {completedOrder.prescription_url && (
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                    <span className="text-gray-500 font-medium">Prescription</span>
                                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                                        <FaCheckCircle className="w-3 h-3" /> Attached
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                <span className="font-bold text-gray-900">Total Paid</span>
                                <span className="text-lg font-black text-[#0067A1]">₹{completedOrder.amount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            <Link
                                href="/website/dashboard/lab-booking/orders"
                                className="w-full sm:w-auto px-5 py-2 bg-[#0067A1] text-white rounded-lg font-bold hover:bg-[#004F7C] transition-colors text-xs"
                            >
                                View Orders
                            </Link>
                            <Link
                                href="/services/lab-tests"
                                className="w-full sm:w-auto px-5 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-bold transition-colors text-xs"
                            >
                                Book Tests
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* ─── MAIN CHECKOUT FLOW (STEPS 1 - 4) ─── */}
                {step !== 5 && (
                    <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-5 lg:gap-7">
                        
                        {/* Mobile Order Summary Collapsible (Top of mobile) */}
                        <div className="lg:hidden bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <button
                                type="button"
                                onClick={() => setShowMobileSummary(!showMobileSummary)}
                                className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-semibold text-gray-800 bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-md bg-[#0067A1]/10 flex items-center justify-center text-[#0067A1] shrink-0">
                                        <FaShoppingCart className="w-3 h-3" />
                                    </div>
                                    <span className="font-bold text-gray-800 truncate">
                                        Order Summary ({cart.tests.length} {cart.tests.length === 1 ? 'test' : 'tests'})
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-extrabold text-[#0067A1] text-sm">₹{totalAmount.toLocaleString()}</span>
                                    <span className="text-[11px] text-gray-500 font-medium">
                                        {showMobileSummary ? "Hide ▲" : "Details ▼"}
                                    </span>
                                </div>
                            </button>
                            {showMobileSummary && (
                                <div className="p-3.5 border-t border-slate-100 space-y-2 text-xs bg-white">
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                        {cart.tests.map(t => (
                                            <div key={t.test_id} className="flex justify-between items-start text-xs">
                                                <span className="font-medium text-gray-700 truncate pr-2">{t.test_name}</span>
                                                <span className="font-bold text-gray-900 shrink-0">₹{t.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-slate-100 pt-2 space-y-1 text-[11px]">
                                        <div className="flex justify-between text-gray-500">
                                            <span>Tests Subtotal</span>
                                            <span className="font-medium text-gray-800">₹{testsTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>Sample Collection ({visitType === "home_collection" ? "Home Visit" : "Walk-in"})</span>
                                            <span className="font-medium text-gray-800">{visitType === "home_collection" ? "₹150" : "Free"}</span>
                                        </div>
                                        <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center text-xs font-bold">
                                            <span className="text-gray-900">Total Payable</span>
                                            <span className="text-sm font-extrabold text-[#0067A1]">₹{totalAmount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Main Step Area */}
                        <div className="flex-1">

                            {/* ─── STEP 1: REVIEW & PRESCRIPTION UPLOAD ─── */}
                            {step === 1 && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 space-y-5">
                                    
                                    {/* Test items list */}
                                    <div>
                                        <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                                            <div className="w-7 h-7 bg-[#0067A1]/10 rounded-lg flex items-center justify-center text-[#0067A1]">
                                                <FaShoppingCart className="w-3.5 h-3.5" />
                                            </div>
                                            Selected Lab Tests
                                        </h2>
                                        <div className="space-y-2">
                                            {cart.tests.map(t => (
                                                <div key={t.test_id} className="flex items-center justify-between bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
                                                    <div className="flex items-start gap-2.5 min-w-0 flex-1 pr-3">
                                                        <div className="w-6 h-6 bg-white rounded flex items-center justify-center border border-slate-200 shrink-0 mt-0.5">
                                                            <FaFlask className="w-3 h-3 text-[#0067A1]" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-gray-900 leading-snug text-xs sm:text-sm break-words">{t.test_name}</p>
                                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">Code: {t.test_id?.slice(0, 8)}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs sm:text-sm font-extrabold text-[#0067A1] shrink-0">₹{t.price}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Prescription Upload Section */}
                                    <div className="border-t border-slate-100 pt-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <div className="w-6 h-6 bg-emerald-50 rounded flex items-center justify-center text-emerald-600 border border-emerald-100">
                                                    <FaFileUpload className="w-3 h-3" />
                                                </div>
                                                Doctor&apos;s Prescription
                                            </h3>
                                            <span className="text-[10px] font-semibold bg-sky-50 text-[#0067A1] px-2 py-0.5 rounded border border-sky-100">
                                                Optional
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mb-3">
                                            Upload prescription for the laboratory pathologist to review if available.
                                        </p>

                                        {/* Upload Container */}
                                        {!prescriptionUrl ? (
                                            <div className="space-y-2">
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                                                        uploadingRx
                                                            ? "border-sky-300 bg-sky-50/30 cursor-wait"
                                                            : "border-slate-200 hover:border-[#0067A1] hover:bg-slate-50/50"
                                                    }`}
                                                >
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                                                        onChange={handlePrescriptionSelect}
                                                        className="hidden"
                                                    />

                                                    {uploadingRx ? (
                                                        <div className="py-2 space-y-1">
                                                            <FaSpinner className="w-5 h-5 text-[#0067A1] animate-spin mx-auto" />
                                                            <p className="text-xs font-bold text-gray-700">Uploading...</p>
                                                        </div>
                                                    ) : (
                                                        <div className="py-1 space-y-1">
                                                            <div className="w-8 h-8 bg-sky-50 rounded-lg border border-sky-100 flex items-center justify-center mx-auto text-[#0067A1]">
                                                                <FaFileUpload className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-800">
                                                                    Upload Prescription
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                                    JPG, PNG, WEBP, or PDF (Max 10MB)
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100/60 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={hasNoPrescription}
                                                        onChange={(e) => setHasNoPrescription(e.target.checked)}
                                                        className="w-3.5 h-3.5 rounded text-[#0067A1] focus:ring-[#0067A1]"
                                                    />
                                                    <span className="text-xs text-gray-600 font-medium">
                                                        Routine checkup (Prescription not required)
                                                    </span>
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 flex items-center justify-between gap-2.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-9 h-9 rounded bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 overflow-hidden">
                                                        {prescriptionUrl.toLowerCase().endsWith(".pdf") ? (
                                                            <FaFilePdf className="w-4 h-4 text-red-500" />
                                                        ) : (
                                                            <img src={prescriptionUrl} alt="Prescription" className="w-full h-full object-cover" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 truncate">
                                                            {prescriptionFile?.name || "Prescription Attached"}
                                                        </p>
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                                            <FaCheckCircle className="w-2.5 h-2.5" /> Uploaded
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    <a
                                                        href={prescriptionUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-gray-600 hover:text-[#0067A1] rounded transition-colors"
                                                        title="View"
                                                    >
                                                        <FaEye className="w-3.5 h-3.5" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={handleRemovePrescription}
                                                        className="p-1.5 text-red-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                                        title="Remove"
                                                    >
                                                        <FaTrash className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex justify-end pt-2 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => goToStep(2)}
                                            className="px-4 py-2 bg-[#0067A1] text-white rounded-lg font-semibold hover:bg-[#004F7C] transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 2: ADDRESS & SAMPLE COLLECTION ─── */}
                            {step === 2 && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 space-y-5">
                                    <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                                        <div className="w-7 h-7 bg-[#0067A1]/10 rounded-lg flex items-center justify-center text-[#0067A1]">
                                            <FaMapMarkerAlt className="w-3.5 h-3.5" />
                                        </div>
                                        Sample Collection Mode & Address
                                    </h2>

                                    {/* Collection Mode Selection */}
                                    <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setVisitType("home_collection")}
                                            className={`flex-1 flex items-center gap-2.5 p-3 rounded-lg border-2 transition-colors cursor-pointer text-left ${
                                                visitType === "home_collection"
                                                    ? "border-[#0067A1] bg-[#0067A1]/[0.03]"
                                                    : "border-slate-200 text-gray-600 hover:border-slate-300"
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${visitType === 'home_collection' ? 'bg-[#0067A1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                <FaHome className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <span className={`block font-bold text-xs sm:text-sm ${visitType === 'home_collection' ? 'text-[#0067A1]' : 'text-gray-900'}`}>
                                                    Home Sample Collection
                                                </span>
                                                <span className="text-[11px] text-gray-500">Technician visits home (+₹150)</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setVisitType("walk_in")}
                                            className={`flex-1 flex items-center gap-2.5 p-3 rounded-lg border-2 transition-colors cursor-pointer text-left ${
                                                visitType === "walk_in"
                                                    ? "border-[#0067A1] bg-[#0067A1]/[0.03]"
                                                    : "border-slate-200 text-gray-600 hover:border-slate-300"
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${visitType === 'walk_in' ? 'bg-[#0067A1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                <FaWalking className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <span className={`block font-bold text-xs sm:text-sm ${visitType === 'walk_in' ? 'text-[#0067A1]' : 'text-gray-900'}`}>
                                                    Walk-in at Lab
                                                </span>
                                                <span className="text-[11px] text-gray-500">Visit lab directly (Free)</span>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Address Input Form */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                                {visitType === "home_collection" ? "Sample Collection Address *" : "Residential Address *"}
                                            </label>
                                            <textarea
                                                value={address.full_address}
                                                onChange={(e) => setAddress({ ...address, full_address: e.target.value })}
                                                rows={2}
                                                placeholder={visitType === "home_collection" ? "Flat/House number, street, area..." : "Your address"}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-[#0067A1] bg-slate-50/50 resize-none outline-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
                                                <input
                                                    value={address.city}
                                                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                                    placeholder="City name"
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-[#0067A1] bg-slate-50/50 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Pincode *</label>
                                                <input
                                                    value={address.pincode}
                                                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                                                    placeholder="6-digit pincode"
                                                    maxLength={6}
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-[#0067A1] bg-slate-50/50 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Landmark (Optional)</label>
                                            <input
                                                value={address.landmark}
                                                onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                                                placeholder="Nearby landmark"
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-[#0067A1] bg-slate-50/50 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Technician Notes (Optional)</label>
                                            <textarea
                                                value={patientNotes}
                                                onChange={(e) => setPatientNotes(e.target.value)}
                                                rows={2}
                                                placeholder="e.g. Fasting sample required, ring doorbell..."
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-[#0067A1] bg-slate-50/50 resize-none outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Navigation */}
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
                                        <button
                                            type="button"
                                            onClick={() => goToStep(1)}
                                            className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!address.full_address || !address.city || !address.pincode) {
                                                    toast.error("Please fill address details");
                                                    return;
                                                }
                                                goToStep(3);
                                            }}
                                            className="px-4 py-2 bg-[#0067A1] text-white rounded-lg font-semibold hover:bg-[#004F7C] transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 3: MANDATORY MEDICAL CONSENTS ─── */}
                            {step === 3 && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-[#0067A1]/10 rounded-lg flex items-center justify-center text-[#0067A1]">
                                                <FaShieldAlt className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                                                    Mandatory Patient Consents
                                                </h2>
                                                <p className="text-[11px] text-gray-500">DPDP Act 2023 & Clinical Governance</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleToggleAllConsents}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                                                allConsentsGiven
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                                    : "bg-slate-50 text-gray-700 border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            {allConsentsGiven ? "✓ Consents Granted" : "Grant All"}
                                        </button>
                                    </div>

                                    {/* Consent Checkbox List */}
                                    <div className="space-y-2">
                                        {consentList.map((c) => (
                                            <label
                                                key={c.key}
                                                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                    consents[c.key]
                                                        ? "border-emerald-500 bg-emerald-50/20"
                                                        : "border-slate-200 hover:border-slate-300"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={consents[c.key]}
                                                    onChange={(e) => setConsents({ ...consents, [c.key]: e.target.checked })}
                                                    className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1] shrink-0"
                                                />
                                                <div className="flex-1 text-xs">
                                                    <p className="font-bold text-gray-900 leading-snug">{c.title}</p>
                                                    <p className="text-gray-600 mt-0.5 text-[11px] leading-relaxed">{c.desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>

                                    {/* Navigation */}
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
                                        <button
                                            type="button"
                                            onClick={() => goToStep(2)}
                                            className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!allConsentsGiven) {
                                                    toast.error("Please grant all required consents");
                                                    return;
                                                }
                                                const isAuthed = checkAuthStatus();
                                                if (!isAuthed) {
                                                    toast.error("Please login before proceeding to payment");
                                                    setShowLoginModal(true);
                                                    return;
                                                }
                                                goToStep(4);
                                            }}
                                            className="px-4 py-2 bg-[#0067A1] text-white rounded-lg font-semibold hover:bg-[#004F7C] transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 4: INSTANT ONLINE PAYMENT ─── */}
                            {step === 4 && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
                                    <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                                        <div className="w-7 h-7 bg-[#0067A1]/10 rounded-lg flex items-center justify-center text-[#0067A1]">
                                            <FaLock className="w-3.5 h-3.5" />
                                        </div>
                                        Instant Online Payment
                                    </h2>

                                    {/* Online Payment Method Card */}
                                    <div className="p-3.5 sm:p-4 rounded-xl border-2 border-[#0067A1] bg-[#0067A1]/[0.02] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-[#0067A1] text-white flex items-center justify-center shrink-0">
                                                    <FaCreditCard className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-900 text-xs sm:text-sm block">
                                                        Razorpay Secure Online Payment
                                                    </span>
                                                    <span className="text-[11px] text-gray-500">
                                                        UPI (GPay, PhonePe, Paytm), Cards & NetBanking
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-200">
                                                INSTANT
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70 text-[11px] text-gray-600">
                                            <span className="flex items-center gap-1 font-medium">
                                                <FaShieldAlt className="w-3 h-3 text-[#0067A1]" /> 256-bit Encrypted
                                            </span>
                                            <span>•</span>
                                            <span>Instant Confirmation</span>
                                            <span>•</span>
                                            <span>Direct Lab Order Dispatch</span>
                                        </div>
                                    </div>

                                    {/* Compact Total Row */}
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">Total Payable</p>
                                            <p className="text-[11px] text-gray-500">
                                                {cart.tests.length} {cart.tests.length === 1 ? "test" : "tests"} • {visitType === "home_collection" ? "Home Collection (₹150)" : "Free Walk-in"}
                                            </p>
                                        </div>
                                        <span className="text-base sm:text-lg font-black text-[#0067A1]">
                                            ₹{totalAmount.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Auth Check Warning */}
                                    {!userLoggedIn && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-2.5 text-xs">
                                            <span className="text-amber-800 font-medium text-[11px]">Please login before paying</span>
                                            <button
                                                type="button"
                                                onClick={() => setShowLoginModal(true)}
                                                className="px-3 py-1 bg-[#0067A1] text-white rounded text-xs font-bold hover:bg-[#004F7C] cursor-pointer"
                                            >
                                                Login
                                            </button>
                                        </div>
                                    )}

                                    {/* Action Navigation */}
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
                                        <button
                                            type="button"
                                            onClick={() => goToStep(3)}
                                            className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                        >
                                            Back
                                        </button>

                                        {!userLoggedIn ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowLoginModal(true)}
                                                className="px-4 py-2 bg-[#0067A1] hover:bg-[#005585] text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                                            >
                                                <FaSignInAlt className="w-3 h-3" />
                                                Login to Pay
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handlePlaceOrder}
                                                disabled={processing}
                                                className={`px-4 py-2 bg-[#0067A1] hover:bg-[#005585] text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 text-xs cursor-pointer ${
                                                    processing ? "opacity-75 cursor-wait" : ""
                                                }`}
                                            >
                                                {processing ? (
                                                    <>
                                                        <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaLock className="w-3 h-3" />
                                                        Pay ₹{totalAmount.toLocaleString()}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                        </div>

                        {/* Order Summary Sidebar - Desktop Only */}
                        <div className="hidden lg:block lg:w-80 shrink-0">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-24 space-y-3.5">
                                <h3 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-2 pb-2.5 border-b border-slate-100">
                                    <div className="w-6 h-6 rounded bg-[#0067A1]/10 flex items-center justify-center text-[#0067A1]">
                                        <FaShoppingCart className="w-3 h-3" />
                                    </div>
                                    Order Summary
                                </h3>

                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {cart.tests.map(t => (
                                        <div key={t.test_id} className="flex justify-between items-start text-xs">
                                            <span className="font-medium text-gray-800 flex-1 pr-2 truncate">{t.test_name}</span>
                                            <span className="font-bold text-gray-900 shrink-0">₹{t.price}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-slate-100 pt-2.5 space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-500">
                                        <span>Tests Subtotal</span>
                                        <span className="font-semibold text-gray-900">₹{testsTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <span>Sample Collection</span>
                                        <span className="font-semibold text-gray-900">{visitType === "home_collection" ? "₹150" : "Free"}</span>
                                    </div>
                                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-xs">
                                        <span className="font-extrabold text-gray-900">Total Payable</span>
                                        <span className="text-base font-black text-[#0067A1]">₹{totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="bg-sky-50/80 rounded-lg p-2.5 border border-sky-100 space-y-0.5 text-[11px] text-[#0067A1]">
                                    <div className="flex items-center gap-1 font-bold">
                                        <FaShieldAlt className="w-3 h-3" /> Verified Diagnostic Lab
                                    </div>
                                    <p className="text-slate-600 leading-relaxed text-[10px]">
                                        Accredited labs with certified clinical protocols.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
