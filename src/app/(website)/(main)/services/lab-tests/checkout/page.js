"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    FaArrowLeft, FaShoppingCart, FaMapMarkerAlt, FaHome, FaWalking,
    FaCheckCircle, FaLock, FaFlask, FaShieldAlt
} from "react-icons/fa";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";

const CART_KEY = "lab_test_cart";

function getCart() {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "null"); } catch { return null; }
}

export default function PublicCheckoutPage() {
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
            router.push("/website/services/lab-tests");
            return;
        }
        setCart(c);

        // Get patient ID
        const userId = localStorage.getItem("userId");
        const userRole = localStorage.getItem("userRole");
        if (!userId || userRole !== "patient") {
            toast.error("Please login to proceed with checkout.");
            router.push("/website"); // Or wherever the central login handles public flow
            return;
        }
        setPatientId(userId);

        // Load Razorpay
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        return () => { if (document.body.contains(script)) document.body.removeChild(script); };
    }, [router]);

    if (!cart) return <LoadingScreen message="Preparing checkout..." submessage="Loading your order" />;

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
                            // Send them to their dashboard to track the order
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
        <div className="min-h-[85vh] bg-gray-50/50 pb-16 pt-6">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">

                {/* Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#0067A1] via-[#0080C6] to-[#0067A1] rounded-3xl px-6 sm:px-10 pt-8 pb-10 mb-8 shadow-md">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                    <div className="relative z-10">
                        <button onClick={() => router.back()}
                            className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-6 transition-colors w-fit">
                            <FaArrowLeft className="w-3.5 h-3.5" /> Back to Tests
                        </button>
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shrink-0">
                                <FaLock className="w-6 h-6 text-white" />
                            </div>
                            <div className="pt-1">
                                <h1 className="text-3xl font-extrabold text-white tracking-tight">Secure Checkout</h1>
                                <p className="text-white/80 text-sm mt-1.5 font-medium">{cart.lab_name} • {cart.tests.length} item{cart.tests.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-10 max-w-3xl mx-auto">
                    {[
                        { n: 1, label: "Review" },
                        { n: 2, label: "Address" },
                        { n: 3, label: "Consent" },
                        { n: 4, label: "Checkout" },
                    ].map((s, i) => (
                        <div key={s.n} className="flex items-center">
                            <button onClick={() => setStep(s.n)}
                                className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${step === s.n
                                    ? "bg-[#0067A1] text-white shadow-lg shadow-[#0067A1]/20 scale-105"
                                    : step > s.n
                                        ? "bg-green-50 text-green-700 border border-green-200"
                                        : "bg-white text-gray-400 border border-gray-200"
                                    }`}>
                                {step > s.n ? <FaCheckCircle className="w-4 h-4" /> : <span className="w-5 h-5 flex items-center justify-center text-[11px] rounded-full bg-current/20">{s.n}</span>}
                                <span className={step === s.n ? "inline" : "hidden sm:inline"}>{s.label}</span>
                            </button>
                            {i < 3 && <div className={`w-4 sm:w-12 h-1 mx-1 sm:mx-2 rounded-full transition-colors ${step > s.n ? "bg-green-400 font-bold shadow-sm" : "bg-gray-200"}`} />}
                        </div>
                    ))}
                </div>

                <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Step 1 — Review */}
                        {step === 1 && (
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
                                    <div className="w-10 h-10 bg-[#0067A1]/10 rounded-xl flex items-center justify-center">
                                        <FaShoppingCart className="w-5 h-5 text-[#0067A1]" />
                                    </div>
                                    Review Your Order
                                </h2>
                                <div className="space-y-4">
                                    {cart.tests.map(t => (
                                        <div key={t.test_id} className="flex items-center justify-between bg-gray-50/80 px-5 py-4 rounded-xl border border-gray-100">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 mt-0.5 border border-gray-100">
                                                    <FaFlask className="w-4 h-4 text-[#0067A1]" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 leading-tight">{t.test_name}</p>
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                                        <span>₹{t.price}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-lg font-black text-[#0067A1]">₹{t.price}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button onClick={() => setStep(2)}
                                        className="px-8 py-4 bg-[#0067A1] text-white rounded-xl font-bold hover:bg-[#004F7C] transition-all shadow-xl shadow-[#0067A1]/20 hover:-translate-y-0.5 text-sm flex items-center gap-2">
                                        Continue to Address →
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2 — Address */}
                        {step === 2 && (
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
                                    <div className="w-10 h-10 bg-[#0067A1]/10 rounded-xl flex items-center justify-center">
                                        <FaMapMarkerAlt className="w-5 h-5 text-[#0067A1]" />
                                    </div>
                                    Delivery Details
                                </h2>

                                {/* Visit Type Toggle */}
                                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                    <button onClick={() => setVisitType("home_collection")}
                                        className={`flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all ${visitType === "home_collection"
                                            ? "border-[#0067A1] bg-[#0067A1]/[0.02] shadow-sm"
                                            : "border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                                            }`}>
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${visitType === 'home_collection' ? 'bg-[#0067A1] text-white shadow-md shadow-[#0067A1]/20' : 'bg-gray-100 text-gray-400'}`}>
                                            <FaHome className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className={`block font-bold mb-0.5 ${visitType === 'home_collection' ? 'text-[#0067A1]' : 'text-gray-900'}`}>Home Collection</span>
                                            <span className="text-xs text-gray-500 font-medium">Sample collected at home</span>
                                        </div>
                                    </button>
                                    <button onClick={() => setVisitType("walk_in")}
                                        className={`flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all ${visitType === "walk_in"
                                            ? "border-[#0067A1] bg-[#0067A1]/[0.02] shadow-sm"
                                            : "border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                                            }`}>
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${visitType === 'walk_in' ? 'bg-[#0067A1] text-white shadow-md shadow-[#0067A1]/20' : 'bg-gray-100 text-gray-400'}`}>
                                            <FaWalking className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className={`block font-bold mb-0.5 ${visitType === 'walk_in' ? 'text-[#0067A1]' : 'text-gray-900'}`}>Visit Lab</span>
                                            <span className="text-xs text-gray-500 font-medium">Walk-in for testing</span>
                                        </div>
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Full Address *</label>
                                        <textarea value={address.full_address} onChange={(e) => setAddress({ ...address, full_address: e.target.value })}
                                            rows={2} placeholder={visitType === "home_collection" ? "Where should the sample collector come?" : "Your address for generation of accurate records & invoices"}
                                            className="w-full rounded-xl border border-gray-200 px-5 py-4 text-sm text-gray-900 focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-gray-50/50 resize-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">City *</label>
                                            <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                                placeholder="e.g. Mumbai" className="w-full rounded-xl border border-gray-200 px-5 py-3.5 text-sm text-gray-900 focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-gray-50/50" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Pincode *</label>
                                            <input value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                                                placeholder="e.g. 400001" maxLength={6} className="w-full rounded-xl border border-gray-200 px-5 py-3.5 text-sm text-gray-900 focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-gray-50/50" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Landmark (Optional)</label>
                                        <input value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                                            placeholder="e.g. Near Central Hospital" className="w-full rounded-xl border border-gray-200 px-5 py-3.5 text-sm text-gray-900 focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-gray-50/50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Notes for Lab (Optional)</label>
                                        <textarea value={patientNotes} onChange={(e) => setPatientNotes(e.target.value)}
                                            rows={2} placeholder="Any special instructions or preferences for the collection agent..."
                                            className="w-full rounded-xl border border-gray-200 px-5 py-4 text-sm text-gray-900 focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] bg-gray-50/50 resize-none" />
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                                    <button onClick={() => setStep(1)} className="px-6 py-3.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                                        ← Back to Cart
                                    </button>
                                    <button onClick={() => {
                                        if (!address.full_address || !address.city || !address.pincode) {
                                            toast.error("Please fill in all required address fields"); return;
                                        }
                                        setStep(3);
                                    }}
                                        className="px-8 py-3.5 bg-[#0067A1] text-white rounded-xl font-bold hover:bg-[#004F7C] transition-all shadow-xl shadow-[#0067A1]/20 hover:-translate-y-0.5 text-sm">
                                        Continue to Consents →
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3 — Consents */}
                        {step === 3 && (
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <h2 className="text-xl font-bold text-gray-900 mb-2 items-center gap-3 border-b border-gray-100 pb-4 flex">
                                    <div className="w-10 h-10 bg-[#0067A1]/10 rounded-xl flex items-center justify-center">
                                        <FaShieldAlt className="w-5 h-5 text-[#0067A1]" />
                                    </div>
                                    Mandatory Patient Consents
                                </h2>
                                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm font-medium mb-8 border border-amber-100/50">
                                    As per Indian medical laws (IT Act 2000, DPDP Act 2023, and clinical lab regulations), all consents below are securely recorded and legally mandatory to place your order.
                                </div>

                                <div className="space-y-4">
                                    {consentLabels.map(c => (
                                        <label key={c.key}
                                            className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${consents[c.key]
                                                ? "border-green-400/50 bg-green-50/50 shadow-sm"
                                                : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                                                }`}>
                                            <input type="checkbox" checked={consents[c.key]}
                                                onChange={(e) => setConsents({ ...consents, [c.key]: e.target.checked })}
                                                className="mt-1 w-5 h-5 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1] shrink-0" />
                                            <div>
                                                <p className="text-[15px] font-bold text-gray-900 leading-snug mb-1">{c.label}</p>
                                                <p className="text-sm text-gray-500 font-medium">{c.sub}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                                    <button onClick={() => setStep(2)} className="px-6 py-3.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                                        ← Back to Address
                                    </button>
                                    <button onClick={() => {
                                        if (!allConsentsGiven) { toast.error("All consents are mandatory to proceed with healthcare services"); return; }
                                        setStep(4);
                                    }}
                                        className="px-8 py-3.5 bg-[#0067A1] text-white rounded-xl font-bold hover:bg-[#004F7C] transition-all shadow-xl shadow-[#0067A1]/20 hover:-translate-y-0.5 text-sm flex items-center gap-2">
                                        <FaLock className="w-3.5 h-3.5" /> Continue to Secure Payment
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4 — Payment */}
                        {step === 4 && (
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center">

                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <FaCheckCircle className="w-10 h-10 text-green-500" />
                                </div>

                                <h2 className="text-2xl font-black text-gray-900 mb-2">Order Ready to Process</h2>
                                <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">You are about to make a secure payment to {cart.lab_name}.</p>

                                <div className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100 max-w-md mx-auto text-left mb-8">
                                    <div className="flex justify-between text-sm mb-3">
                                        <span className="text-gray-500 font-medium">Lab Selected</span>
                                        <span className="font-bold text-gray-900">{cart.lab_name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-3">
                                        <span className="text-gray-500 font-medium">Collection Mode</span>
                                        <span className="font-bold text-gray-900">{visitType === "home_collection" ? "Home Collection" : "Walk-in"}</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between items-center">
                                        <span className="font-bold text-gray-900">Total payable</span>
                                        <span className="text-3xl font-black text-[#0067A1]">₹{totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center max-w-lg mx-auto border-t border-gray-100 pt-8 mt-4 whitespace-nowrap gap-4">
                                    <button onClick={() => setStep(3)} className="px-6 py-4 text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors w-full sm:w-auto text-center shrink-0">
                                        ← Back
                                    </button>
                                    <button onClick={handlePayment} disabled={processing}
                                        className={`px-8 w-full sm:w-auto py-4 rounded-2xl font-extrabold text-[#0067A1] hover:bg-[#004F7C] hover:text-white border-2 border-[#0067A1] bg-[#0067A1] text-white shadow-xl shadow-[#0067A1]/20 transition-all flex items-center justify-center gap-3 text-lg ${processing ? "opacity-75 cursor-wait" : "hover:-translate-y-1"}`}>
                                        {processing ? (
                                            <><div className="w-5 h-5 border-2 border-white/50 border-t-white text-white rounded-full animate-spin" /> Processing...</>
                                        ) : (
                                            <><FaLock className="w-4 h-4" /> Pay ₹{totalAmount.toLocaleString()}</>
                                        )}
                                    </button>
                                </div>

                                <p className="text-xs text-center text-gray-400 mt-8 flex items-center justify-center gap-1.5 font-medium">
                                    <FaLock className="w-3 h-3 text-green-500" />
                                    Secured via 256-bit encryption • PCI-DSS Certified
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="w-full lg:w-80 shrink-0">
                        <div className="bg-white rounded-3xl border border-gray-200 p-6 sticky top-28 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                            <h3 className="font-extrabold text-gray-900 mb-6 text-base items-center gap-2 flex pb-4 border-b border-gray-100">
                                <div className="w-8 h-8 rounded-full bg-[#0067A1]/10 flex items-center justify-center">
                                    <FaShoppingCart className="w-3.5 h-3.5 text-[#0067A1]" />
                                </div>
                                Your Cart
                            </h3>

                            <div className="space-y-4 mb-6">
                                {cart.tests.map(t => (
                                    <div key={t.test_id} className="flex justify-between items-start pt-1">
                                        <div className="flex-1 pr-4">
                                            <h4 className="text-[13px] font-bold text-gray-900 leading-snug">{t.test_name}</h4>
                                        </div>
                                        <span className="font-extrabold text-gray-900 text-sm whitespace-nowrap">₹{t.price}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-[#0067A1]/[0.02] -mx-6 mb-6 px-6 py-4 border-y border-gray-100 flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-900">Total Balance</span>
                                <span className="text-2xl font-black text-[#0067A1]">₹{totalAmount.toLocaleString()}</span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3 text-xs text-gray-500 font-medium">
                                    <FaCheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                    100% Secure Checkout guaranteed
                                </div>
                                <div className="flex items-start gap-3 text-xs text-gray-500 font-medium">
                                    <FaLock className="w-4 h-4 text-[#0067A1] shrink-0 mt-0.5" />
                                    Payments processed securely by Razorpay
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
