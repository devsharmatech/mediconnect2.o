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
        if (!userId || userRole !== "patient") {
            toast.error("Please login as a patient");
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

    const totalAmount = cart.tests.reduce((s, t) => s + t.price, 0);
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
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0067A1] via-[#0080C6] to-[#0067A1] rounded-3xl px-5 sm:px-8 pt-6 pb-8 mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                <div className="relative">
                    <button onClick={() => router.back()}
                        className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors">
                        <FaArrowLeft className="w-3 h-3" /> Back
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                            <FaLock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Secure Checkout</h1>
                            <p className="text-white/60 text-sm">{cart.lab_name} • {cart.tests.length} {cart.tests.length === 1 ? "test" : "tests"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
                {[
                    { n: 1, label: "Review" },
                    { n: 2, label: "Address" },
                    { n: 3, label: "Consent" },
                    { n: 4, label: "Pay" },
                ].map((s, i) => (
                    <div key={s.n} className="flex items-center">
                        <button onClick={() => setStep(s.n)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${step === s.n
                                ? "bg-[#0067A1] text-white shadow-lg"
                                : step > s.n
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-gray-50 text-gray-400 border border-gray-200"
                                }`}>
                            {step > s.n ? <FaCheckCircle className="w-3.5 h-3.5" /> : <span className="w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full bg-white/20">{s.n}</span>}
                            <span className="hidden sm:inline">{s.label}</span>
                        </button>
                        {i < 3 && <div className={`w-6 h-0.5 mx-1 rounded ${step > s.n ? "bg-green-300" : "bg-gray-200"}`} />}
                    </div>
                ))}
            </div>

            <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-6">
                {/* Main Content */}
                <div className="flex-1">
                    {/* Step 1 — Review */}
                    {step === 1 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FaShoppingCart className="w-4 h-4 text-[#0067A1]" /> Order Review
                            </h2>
                            <div className="space-y-3">
                                {cart.tests.map(t => (
                                    <div key={t.test_id} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{t.test_name}</p>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">₹{t.price}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setStep(2)}
                                    className="px-6 py-3 bg-[#0067A1] text-white rounded-xl font-semibold hover:bg-[#004F7C] transition-colors shadow-md">
                                    Continue to Address →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2 — Address */}
                    {step === 2 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FaMapMarkerAlt className="w-4 h-4 text-[#0067A1]" /> Address & Visit Type
                            </h2>

                            {/* Visit Type Toggle */}
                            <div className="flex gap-3 mb-6">
                                <button onClick={() => setVisitType("home_collection")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium border-2 transition-all ${visitType === "home_collection"
                                        ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                                        }`}>
                                    <FaHome className="w-4 h-4" /> Home Collection
                                </button>
                                <button onClick={() => setVisitType("walk_in")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium border-2 transition-all ${visitType === "walk_in"
                                        ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                                        }`}>
                                    <FaWalking className="w-4 h-4" /> Visit Lab
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Address *</label>
                                    <textarea value={address.full_address} onChange={(e) => setAddress({ ...address, full_address: e.target.value })}
                                        rows={2} placeholder={visitType === "home_collection" ? "Where should the sample collector come?" : "Your address for records"}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-gray-50" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                        <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                            placeholder="e.g. Mumbai" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-gray-50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                                        <input value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                                            placeholder="e.g. 400001" maxLength={6} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-gray-50" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Landmark (Optional)</label>
                                    <input value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                                        placeholder="e.g. Near Central Hospital" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes for Lab (Optional)</label>
                                    <textarea value={patientNotes} onChange={(e) => setPatientNotes(e.target.value)}
                                        rows={2} placeholder="Any special instructions or preferences..."
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-gray-50" />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-between">
                                <button onClick={() => setStep(1)} className="px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                                    ← Back
                                </button>
                                <button onClick={() => {
                                    if (!address.full_address || !address.city || !address.pincode) {
                                        toast.error("Please fill in all required address fields"); return;
                                    }
                                    setStep(3);
                                }}
                                    className="px-6 py-3 bg-[#0067A1] text-white rounded-xl font-semibold hover:bg-[#004F7C] transition-colors shadow-md">
                                    Continue to Consent →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3 — Consents */}
                    {step === 3 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <FaShieldAlt className="w-4 h-4 text-[#0067A1]" /> Mandatory Consents
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">
                                As per Indian medical laws (IT Act 2000, DPDP Act 2023, and clinical lab regulations), all consents below are mandatory to place your order.
                            </p>

                            <div className="space-y-4">
                                {consentLabels.map(c => (
                                    <label key={c.key}
                                        className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${consents[c.key]
                                            ? "border-green-300 bg-green-50/50"
                                            : "border-gray-200 hover:border-gray-300 bg-white"
                                            }`}>
                                        <input type="checkbox" checked={consents[c.key]}
                                            onChange={(e) => setConsents({ ...consents, [c.key]: e.target.checked })}
                                            className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1] shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{c.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{c.sub}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            <div className="mt-6 flex justify-between">
                                <button onClick={() => setStep(2)} className="px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                                    ← Back
                                </button>
                                <button onClick={() => {
                                    if (!allConsentsGiven) { toast.error("All consents are mandatory"); return; }
                                    setStep(4);
                                }}
                                    className="px-6 py-3 bg-[#0067A1] text-white rounded-xl font-semibold hover:bg-[#004F7C] transition-colors shadow-md">
                                    Continue to Payment →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4 — Payment */}
                    {step === 4 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FaLock className="w-4 h-4 text-[#0067A1]" /> Confirm & Pay
                            </h2>

                            {/* Summary */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Lab</span>
                                    <span className="font-medium text-gray-900">{cart.lab_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Tests</span>
                                    <span className="font-medium text-gray-900">{cart.tests.length} tests</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Visit Type</span>
                                    <span className="font-medium text-gray-900">{visitType === "home_collection" ? "Home Collection" : "Walk-in"}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Address</span>
                                    <span className="font-medium text-gray-900 text-right max-w-[200px] truncate">{address.full_address}, {address.city}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-3 flex justify-between">
                                    <span className="font-bold text-gray-900">Total Amount</span>
                                    <span className="text-2xl font-bold text-[#0067A1]">₹{totalAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 text-[#004F7C] p-3 rounded-xl text-xs flex items-start gap-2 mb-6">
                                <FaLock className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Your payment is secured with Razorpay's end-to-end 256-bit encryption. All consents have been recorded as per Indian medical law.</span>
                            </div>

                            <div className="flex justify-between">
                                <button onClick={() => setStep(3)} className="px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                                    ← Back
                                </button>
                                <button onClick={handlePayment} disabled={processing}
                                    className={`px-8 py-3.5 rounded-xl font-bold text-white shadow-xl transition-all flex items-center gap-2 ${processing
                                        ? "bg-gray-400 cursor-wait"
                                        : "bg-gradient-to-r from-[#0067A1] to-[#0080C6] hover:from-[#094440] hover:to-[#0a5c56] hover:-translate-y-0.5"
                                        }`}>
                                    {processing ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                                    ) : (
                                        <>Pay ₹{totalAmount.toLocaleString()}</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Order Summary Sidebar */}
                <div className="w-full lg:w-72 shrink-0">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                            <FaFlask className="w-3.5 h-3.5 text-[#0067A1]" /> Order Summary
                        </h3>
                        <div className="space-y-2 mb-4">
                            {cart.tests.map(t => (
                                <div key={t.test_id} className="flex justify-between text-xs">
                                    <span className="text-gray-600 truncate flex-1 mr-2">{t.test_name}</span>
                                    <span className="font-semibold text-gray-900 shrink-0">₹{t.price}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-900">Total</span>
                            <span className="text-xl font-bold text-[#0067A1]">₹{totalAmount.toLocaleString()}</span>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400">
                            <FaLock className="w-3 h-3" />
                            <span>Powered by Razorpay</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
