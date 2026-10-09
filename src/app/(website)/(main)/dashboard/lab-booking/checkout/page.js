"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    FaArrowLeft, FaShoppingCart, FaMapMarkerAlt, FaHome, FaWalking,
    FaCheckCircle, FaLock, FaFlask, FaTimes, FaShieldAlt, FaFileContract
} from "react-icons/fa";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";

const CART_KEY = "lab_test_cart";

function getCart() {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "null"); } catch { return null; }
}

export default function CheckoutPage() {
    const router = useRouter();
    const [cart, setCart] = useState(null);
    const [step, setStep] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [patientId, setPatientId] = useState(null);
    const [showMobileSummary, setShowMobileSummary] = useState(false);

    // Address form
    const [address, setAddress] = useState({ full_address: "", city: "", pincode: "", landmark: "" });
    const [visitType, setVisitType] = useState("home_collection");
    const [patientNotes, setPatientNotes] = useState("");

    // Consents
    const [consents, setConsents] = useState({
        data_sharing_consent: false,
        sample_collection_consent: false,
        terms_accepted: false,
    });

    useEffect(() => {
        const c = getCart();
        if (!c || !c.tests?.length) {
            toast.error("Your cart is empty");
            router.push("/website/dashboard/lab-booking");
            return;
        }
        setCart(c);

        // Get patient ID
        const userId = localStorage.getItem("userId");
        const userRole = localStorage.getItem("userRole");
        if (!userId) {
            toast.error("Please login to proceed");
            router.push("/website");
            return;
        }
        setPatientId(userId);

        // Load Razorpay
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        return () => { if (document.body.contains(script)) document.body.removeChild(script); };
    }, []);

    if (!cart) return <LoadingScreen message="Preparing checkout..." submessage="Loading your order details" />;

    const testsTotal = cart.tests.reduce((s, t) => s + (parseFloat(t.price) || 0), 0);
    const collectionFee = visitType === "home_collection" ? 150 : 0;
    const totalAmount = testsTotal + collectionFee;
    const allConsentsGiven = Object.values(consents).every(Boolean);

    const handlePayment = async () => {
        if (!address.full_address || !address.city || !address.pincode) {
            toast.error("Please fill in all required address fields");
            setStep(2);
            return;
        }
        if (!allConsentsGiven) {
            toast.error("All consents are mandatory under Indian medical regulations");
            setStep(3);
            return;
        }

        setProcessing(true);
        try {
            // Step 1 — Initiate order on our backend
            const initRes = await fetch("/api/patient/lab/orders/initiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patient_id: patientId,
                    lab_id: cart.lab_id,
                    tests: cart.tests,
                    address,
                    visit_type: visitType,
                    patient_notes: patientNotes,
                    consents,
                    device_type: "web",
                }),
            });
            const initData = await initRes.json();

            if (!initRes.ok || !initData.success) {
                throw new Error(initData.message || "Failed to create order");
            }

            const { order_id, razorpay_order_id, razorpay_key, amount, lab_name } = initData.data;

            // Step 2 — Open Razorpay Checkout
            const userData = JSON.parse(localStorage.getItem("userData") || "{}");
            const options = {
                key: razorpay_key,
                amount: amount * 100,
                currency: "INR",
                name: "MediConnect Labs",
                description: `Lab Tests - ${lab_name}`,
                image: `${window.location.origin}/real-logo.png`,
                order_id: razorpay_order_id,
                handler: async function (response) {
                    try {
                        // Step 3 — Verify payment
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
                            toast.success("Payment successful! Order placed.");
                            router.push("/website/dashboard/lab-booking/orders");
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
            toast.error(error.message || "Checkout failed");
            setProcessing(false);
        }
    };

    const consentLabels = [
        { key: "data_sharing_consent", label: "I explicitly consent to the collection, processing, and sharing of my health data with the laboratory", sub: "Required under the Digital Personal Data Protection (DPDP) Act 2023 and NDHM framework" },
        { key: "sample_collection_consent", label: "I authorize the laboratory personnel to collect and process my biological samples for diagnostic evaluation", sub: "Required under the Clinical Establishments Act and ICMR guidelines" },
        { key: "terms_accepted", label: "I accept the Terms & Conditions and Privacy Policy for laboratory services", sub: "Mandatory to proceed with the booking" },
    ];

    return (
        <div className="min-h-screen pb-12">
            {/* Header */}
            <div className="bg-[#0067A1] text-white rounded-xl sm:rounded-2xl px-5 sm:px-6 py-4 sm:py-5 mb-6 border border-[#005585]">
                <button onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold mb-3 transition-colors cursor-pointer">
                    <FaArrowLeft className="w-3 h-3" /> Back
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/15 rounded-lg border border-white/20 flex items-center justify-center shrink-0">
                        <FaLock className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">Secure Checkout</h1>
                        <p className="text-white/80 text-xs mt-0.5 font-medium">{cart.lab_name} • {cart.tests.length} {cart.tests.length === 1 ? "test" : "tests"}</p>
                    </div>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6 max-w-xl mx-auto overflow-x-auto py-1">
                {[
                    { n: 1, label: "Review" },
                    { n: 2, label: "Address" },
                    { n: 3, label: "Consent" },
                    { n: 4, label: "Pay" },
                ].map((s, i) => (
                    <div key={s.n} className="flex items-center">
                        <button onClick={() => setStep(s.n)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${step === s.n
                                ? "bg-[#0067A1] text-white border-[#0067A1]"
                                : step > s.n
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                                }`}>
                            {step > s.n ? <FaCheckCircle className="w-3.5 h-3.5 text-green-600" /> : <span className={`w-4 h-4 flex items-center justify-center text-[10px] rounded-md ${step === s.n ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>{s.n}</span>}
                            <span className={step === s.n ? "inline" : "hidden sm:inline"}>{s.label}</span>
                        </button>
                        {i < 3 && <div className={`w-3 sm:w-6 h-0.5 mx-1 transition-colors ${step > s.n ? "bg-green-400" : "bg-gray-200"}`} />}
                    </div>
                ))}
            </div>

            <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-6">
                {/* Mobile Order Summary Collapsible (Mobile Only: lg:hidden) */}
                <div className="lg:hidden bg-white rounded-lg border border-gray-200 overflow-hidden mb-1">
                    <button
                        type="button"
                        onClick={() => setShowMobileSummary(!showMobileSummary)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-800 bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded bg-[#0067A1]/10 flex items-center justify-center text-[#0067A1] shrink-0">
                                <FaShoppingCart className="w-2.5 h-2.5" />
                            </div>
                            <span className="truncate">Order Summary ({cart.tests.length} {cart.tests.length === 1 ? 'test' : 'tests'})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-[#0067A1]">₹{totalAmount.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-500 font-normal">
                                {showMobileSummary ? "Hide ▲" : "View ▼"}
                            </span>
                        </div>
                    </button>
                    {showMobileSummary && (
                        <div className="p-3.5 border-t border-gray-100 space-y-2.5 text-xs bg-white">
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {cart.tests.map(t => (
                                    <div key={t.test_id} className="flex justify-between items-start text-xs">
                                        <span className="font-medium text-gray-700 truncate pr-2">{t.test_name}</span>
                                        <span className="font-bold text-gray-900 shrink-0">₹{t.price}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-gray-100 pt-2 space-y-1 text-[11px]">
                                <div className="flex justify-between text-gray-500">
                                    <span>Tests Subtotal</span>
                                    <span className="font-medium text-gray-800">₹{testsTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                    <span>Collection ({visitType === "home_collection" ? "Home Collection" : "Walk-in"})</span>
                                    <span className="font-medium text-gray-800">{visitType === "home_collection" ? "₹150" : "Free"}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-1.5 flex justify-between items-center text-xs font-bold">
                                    <span className="text-gray-900">Total</span>
                                    <span className="text-sm font-extrabold text-[#0067A1]">₹{totalAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    {/* Step 1 — Review */}
                    {step === 1 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 pb-3 border-b border-gray-100">
                                <div className="w-8 h-8 bg-[#0067A1]/10 rounded-lg flex items-center justify-center text-[#0067A1]">
                                    <FaShoppingCart className="w-4 h-4" />
                                </div>
                                Order Review
                            </h2>
                            <div className="space-y-2.5">
                                {cart.tests.map(t => (
                                    <div key={t.test_id} className="flex items-center justify-between bg-slate-50/80 px-4 py-3 rounded-lg border border-gray-200/80">
                                        <div>
                                            <p className="text-xs sm:text-sm font-bold text-gray-900">{t.test_name}</p>
                                        </div>
                                        <span className="text-sm sm:text-base font-extrabold text-[#0067A1]">₹{t.price}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-5 flex justify-end">
                                <button onClick={() => setStep(2)}
                                    className="px-4 py-2 bg-[#0067A1] text-white rounded-lg font-semibold hover:bg-[#004F7C] transition-colors text-xs flex items-center gap-1.5 cursor-pointer">
                                    Next →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2 — Address */}
                    {step === 2 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 pb-3 border-b border-gray-100">
                                <div className="w-8 h-8 bg-[#0067A1]/10 rounded-lg flex items-center justify-center text-[#0067A1]">
                                    <FaMapMarkerAlt className="w-4 h-4" />
                                </div>
                                Address & Visit Type
                            </h2>

                            {/* Visit Type Toggle */}
                            <div className="flex gap-3 mb-5">
                                <button onClick={() => setVisitType("home_collection")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs sm:text-sm font-bold border transition-all cursor-pointer ${visitType === "home_collection"
                                        ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        }`}>
                                    <FaHome className="w-4 h-4" /> Home Collection
                                </button>
                                <button onClick={() => setVisitType("walk_in")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs sm:text-sm font-bold border transition-all cursor-pointer ${visitType === "walk_in"
                                        ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        }`}>
                                    <FaWalking className="w-4 h-4" /> Visit Lab
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Full Address *</label>
                                    <textarea value={address.full_address} onChange={(e) => setAddress({ ...address, full_address: e.target.value })}
                                        rows={2} placeholder={visitType === "home_collection" ? "Where should the sample collector come?" : "Your address for records"}
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] bg-gray-50/50" />
                                </div>
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
                                        <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                            placeholder="e.g. Mumbai" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] bg-gray-50/50" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Pincode *</label>
                                        <input value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                                            placeholder="e.g. 400001" maxLength={6} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] bg-gray-50/50" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Landmark (Optional)</label>
                                    <input value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                                        placeholder="e.g. Near Central Hospital" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] bg-gray-50/50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Notes for Lab (Optional)</label>
                                    <textarea value={patientNotes} onChange={(e) => setPatientNotes(e.target.value)}
                                        rows={2} placeholder="Any special instructions or preferences..."
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] bg-gray-50/50" />
                                </div>
                            </div>

                            <div className="mt-5 flex justify-between items-center">
                                <button onClick={() => setStep(1)} className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
                                    ← Back
                                </button>
                                <button onClick={() => {
                                    if (!address.full_address || !address.city || !address.pincode) {
                                        toast.error("Please fill in all required address fields"); return;
                                    }
                                    setStep(3);
                                }}
                                    className="px-4 py-2 bg-[#0067A1] text-white rounded-lg font-semibold hover:bg-[#004F7C] transition-colors text-xs flex items-center gap-1.5 cursor-pointer">
                                    Next →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3 — Consents */}
                    {step === 3 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2 pb-3 border-b border-gray-100">
                                <div className="w-8 h-8 bg-[#0067A1]/10 rounded-lg flex items-center justify-center text-[#0067A1]">
                                    <FaShieldAlt className="w-4 h-4" />
                                </div>
                                Mandatory Consents
                            </h2>
                            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                                As per Indian medical laws (IT Act 2000, DPDP Act 2023, and clinical lab regulations), all consents below are mandatory to place your order.
                            </p>

                            <div className="space-y-3">
                                {consentLabels.map(c => (
                                    <label key={c.key}
                                        className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${consents[c.key]
                                            ? "border-emerald-300 bg-emerald-50/40"
                                            : "border-gray-200 hover:border-gray-300 bg-white"
                                            }`}>
                                        <input type="checkbox" checked={consents[c.key]}
                                            onChange={(e) => setConsents({ ...consents, [c.key]: e.target.checked })}
                                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1] shrink-0 cursor-pointer" />
                                        <div>
                                            <p className="text-xs sm:text-sm font-bold text-gray-900">{c.label}</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{c.sub}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            <div className="mt-5 flex justify-between items-center">
                                <button onClick={() => setStep(2)} className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
                                    ← Back
                                </button>
                                <button onClick={() => {
                                    if (!allConsentsGiven) { toast.error("All consents are mandatory"); return; }
                                    setStep(4);
                                }}
                                    className="px-4 py-2 bg-[#0067A1] text-white rounded-lg font-semibold hover:bg-[#004F7C] transition-colors text-xs flex items-center gap-1.5 cursor-pointer">
                                    Next →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4 — Payment */}
                    {step === 4 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 pb-3 border-b border-gray-100">
                                <div className="w-8 h-8 bg-[#0067A1]/10 rounded-lg flex items-center justify-center text-[#0067A1]">
                                    <FaLock className="w-4 h-4" />
                                </div>
                                Confirm & Pay
                            </h2>

                            {/* Summary */}
                            <div className="bg-gray-50/80 rounded-lg border border-gray-200 p-4 space-y-2.5 mb-5">
                                <div className="flex justify-between text-xs sm:text-sm">
                                    <span className="text-gray-600 font-medium">Lab</span>
                                    <span className="font-bold text-gray-900">{cart.lab_name}</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm">
                                    <span className="text-gray-600 font-medium">Tests Total</span>
                                    <span className="font-bold text-gray-900">₹{testsTotal.toLocaleString()} ({cart.tests.length} test{cart.tests.length !== 1 ? 's' : ''})</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm">
                                    <span className="text-gray-600 font-medium">Collection Mode ({visitType === "home_collection" ? "Home Collection" : "Walk-in"})</span>
                                    <span className="font-bold text-gray-900">{visitType === "home_collection" ? "₹150" : "Free"}</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm">
                                    <span className="text-gray-600 font-medium">Address</span>
                                    <span className="font-bold text-gray-900 text-right max-w-[200px] truncate">{address.full_address}, {address.city}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2.5 flex justify-between items-center">
                                    <span className="font-bold text-gray-900 text-sm">Total Amount</span>
                                    <span className="text-xl font-black text-[#0067A1]">₹{totalAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50/70 border border-blue-100 text-[#004F7C] p-3 rounded-lg text-xs flex items-start gap-2 mb-6">
                                <FaLock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#0067A1]" />
                                <span>Your payment is secured with Razorpay&apos;s end-to-end 256-bit encryption. All consents have been recorded as per Indian medical law.</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <button onClick={() => setStep(3)} className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
                                    ← Back
                                </button>
                                <button onClick={handlePayment} disabled={processing}
                                    className={`px-5 py-2 rounded-lg font-semibold text-white transition-all flex items-center gap-1.5 text-xs cursor-pointer ${processing
                                        ? "bg-gray-400 cursor-wait"
                                        : "bg-[#0067A1] hover:bg-[#004F7C]"
                                        }`}>
                                    {processing ? (
                                        <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                                    ) : (
                                        <>Pay ₹{totalAmount.toLocaleString()}</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Order Summary Sidebar - Desktop Only (hidden on mobile to prevent bottom stacking) */}
                <div className="hidden lg:block lg:w-72 shrink-0">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24">
                        <h3 className="font-bold text-gray-900 mb-3 text-xs sm:text-sm flex items-center gap-2 pb-2.5 border-b border-gray-100">
                            <FaFlask className="w-3.5 h-3.5 text-[#0067A1]" /> Order Summary
                        </h3>
                        <div className="space-y-2 mb-4">
                            {cart.tests.map(t => (
                                <div key={t.test_id} className="flex justify-between text-xs">
                                    <span className="text-gray-600 truncate flex-1 mr-2">{t.test_name}</span>
                                    <span className="font-bold text-gray-900 shrink-0">₹{t.price}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-900">Total</span>
                            <span className="text-lg font-black text-[#0067A1]">₹{totalAmount.toLocaleString()}</span>
                        </div>

                        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-gray-400">
                            <FaLock className="w-3 h-3 text-gray-400" />
                            <span>Powered by Razorpay</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
