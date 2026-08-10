"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    FaArrowLeft, FaShoppingCart, FaMapMarkerAlt, FaHome, FaWalking,
    FaCheckCircle, FaLock, FaFlask, FaTimes, FaShieldAlt, FaFileContract,
    FaSearch
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";

function PrescriptionLabBookingInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const consultation_id = searchParams.get("consultation_id");

    const [step, setStep] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [patientId, setPatientId] = useState(null);

    // Data
    const [prescription, setPrescription] = useState(null);
    const [labs, setLabs] = useState([]);
    const [selectedLab, setSelectedLab] = useState(null);
    const [labTests, setLabTests] = useState([]);
    const [matchedTests, setMatchedTests] = useState([]);

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
        if (!consultation_id) {
            toast.error("No consultation ID provided.");
            router.push("/website/dashboard/lab-booking");
            return;
        }

        const userId = localStorage.getItem("userId");
        const userRole = localStorage.getItem("userRole");
        if (!userId || userRole !== "patient") {
            toast.error("Please login as a patient");
            router.push("/website");
            return;
        }
        setPatientId(userId);

        fetchPrescription(consultation_id);
        fetchLabs();

        // Load Razorpay
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        return () => { if (document.body.contains(script)) document.body.removeChild(script); };
    }, [consultation_id]);

    const fetchPrescription = async (appId) => {
        try {
            const res = await fetch(`/api/patients/prescriptions/by-appointment?appointment_id=${appId}`);
            const data = await res.json();
            if (data.success && data.data) {
                setPrescription(data.data);
                if (!data.data.lab_tests || data.data.lab_tests.length === 0) {
                    toast.error("No lab tests found in this prescription.");
                    router.push("/website/dashboard/lab-booking");
                }
            } else {
                toast.error("Prescription not found.");
                router.push("/website/dashboard/lab-booking");
            }
        } catch (err) {
            console.error("Failed to fetch prescription:", err);
        }
    };

    const fetchLabs = async () => {
        try {
            const res = await fetch(`/api/patient/lab/labs?limit=50`);
            const data = await res.json();
            if (data.success) {
                setLabs(data.data?.labs || []);
            }
        } catch (err) {
            console.error("Failed to fetch labs:", err);
        }
    };

    const handleLabSelect = async (lab) => {
        setSelectedLab(lab);
        try {
            setProcessing(true);
            const res = await fetch(`/api/patient/lab/labs/${lab.id}/tests`);
            const data = await res.json();
            if (data.success) {
                const availableTests = data.data?.tests || [];
                setLabTests(availableTests);
                
                // Auto-match tests from prescription
                const prescribed = prescription?.lab_tests || [];
                const matched = [];
                
                prescribed.forEach(pt => {
                    const ptName = (pt.name || pt.test_name || pt).toString().toLowerCase();
                    const match = availableTests.find(at => 
                        at.test_name.toLowerCase().includes(ptName) || 
                        ptName.includes(at.test_name.toLowerCase())
                    );
                    if (match && !matched.find(m => m.id === match.id)) {
                        matched.push(match);
                    }
                });

                if (matched.length === 0) {
                    toast.error("This lab doesn't offer the prescribed tests.");
                } else {
                    setMatchedTests(matched);
                    setStep(2);
                }
            }
        } catch (err) {
            toast.error("Failed to fetch lab tests.");
        } finally {
            setProcessing(false);
        }
    };

    const totalAmount = matchedTests.reduce((s, t) => s + parseFloat(t.price), 0);
    const allConsentsGiven = Object.values(consents).every(Boolean);

    const handlePayment = async () => {
        if (!address.full_address || !address.city || !address.pincode) {
            toast.error("Please fill in all required address fields");
            setStep(3);
            return;
        }
        if (!allConsentsGiven) {
            toast.error("All consents are mandatory under Indian medical regulations");
            setStep(4);
            return;
        }

        setProcessing(true);
        try {
            const testsPayload = matchedTests.map(t => ({ test_id: t.id, test_name: t.test_name, price: t.price, notes: "" }));
            
            // Initiate order
            const initRes = await fetch("/api/patient/lab/orders/initiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patient_id: patientId,
                    prescription_id: prescription.id,
                    lab_id: selectedLab.id,
                    tests: testsPayload,
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

            // Open Razorpay Checkout
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
                            toast.success("Payment successful! Order placed.");
                            router.push("/website/dashboard/lab-reports");
                        } else {
                            toast.error(verifyData.message || "Payment verification failed.");
                        }
                    } catch {
                        toast.error("Payment verification failed. Your payment is safe.");
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
                toast.error("Payment failed.");
            });
            rzp.open();
        } catch (error) {
            toast.error(error.message || "Checkout failed");
            setProcessing(false);
        }
    };

    if (!prescription) return <LoadingScreen message="Loading Prescription..." />;

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
                            <FaFlask className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Prescription Checkout</h1>
                            <p className="text-white/60 text-sm">Book lab tests directly from your recent consultation</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
                {[
                    { n: 1, label: "Select Lab" },
                    { n: 2, label: "Review Tests" },
                    { n: 3, label: "Address" },
                    { n: 4, label: "Consent" },
                    { n: 5, label: "Pay" },
                ].map((s, i) => (
                    <div key={s.n} className="flex items-center">
                        <button onClick={() => s.n <= step && setStep(s.n)}
                            disabled={s.n > step}
                            className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${step === s.n
                                ? "bg-[#0067A1] text-white shadow-lg"
                                : step > s.n
                                    ? "bg-green-50 text-green-700 border border-green-200 cursor-pointer"
                                    : "bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
                                }`}>
                            {step > s.n ? <FaCheckCircle className="w-3.5 h-3.5" /> : <span className="w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full bg-white/20">{s.n}</span>}
                            <span className="hidden sm:inline">{s.label}</span>
                        </button>
                        {i < 4 && <div className={`w-3 sm:w-6 h-0.5 mx-1 rounded ${step > s.n ? "bg-green-300" : "bg-gray-200"}`} />}
                    </div>
                ))}
            </div>

            <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                    {/* Step 1 — Select Lab */}
                    {step === 1 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Select a Laboratory</h2>
                            <p className="text-gray-500 text-sm mb-6">Choose a lab to process your prescribed tests.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {labs.map(lab => (
                                    <div key={lab.id} onClick={() => handleLabSelect(lab)}
                                         className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedLab?.id === lab.id ? 'border-[#0067A1] bg-[#0067A1]/5' : 'border-gray-100 hover:border-gray-300'}`}>
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                                <FaFlask className="text-gray-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{lab.lab_name}</h3>
                                                <p className="text-xs text-gray-500">{lab.address?.city || 'City'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {processing && <p className="text-sm text-[#0067A1] mt-4 font-semibold text-center">Checking catalog match...</p>}
                        </motion.div>
                    )}

                    {/* Step 2 — Review Tests */}
                    {step === 2 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FaShoppingCart className="w-4 h-4 text-[#0067A1]" /> Auto-Matched Tests
                            </h2>
                            <p className="text-gray-500 text-sm mb-4">We matched {matchedTests.length} tests from your prescription at <b>{selectedLab.lab_name}</b>.</p>
                            <div className="space-y-3">
                                {matchedTests.map(t => (
                                    <div key={t.id} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-green-200">
                                        <div className="flex items-center gap-3">
                                            <FaCheckCircle className="text-green-500" />
                                            <p className="text-sm font-medium text-gray-900">{t.test_name}</p>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">₹{t.price}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setStep(3)}
                                    className="px-6 py-3 bg-[#0067A1] text-white rounded-xl font-semibold hover:bg-[#004F7C] transition-colors shadow-md">
                                    Continue to Address →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3 — Address */}
                    {step === 3 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FaMapMarkerAlt className="w-4 h-4 text-[#0067A1]" /> Sample Collection Details
                            </h2>

                            <div className="flex gap-4 mb-6">
                                <button onClick={() => setVisitType("home_collection")}
                                    className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-colors ${visitType === "home_collection"
                                        ? "bg-[#0067A1]/5 border-[#0067A1] text-[#0067A1]"
                                        : "bg-gray-50 border-gray-200 text-gray-500"
                                        }`}>
                                    <FaHome /> Home Collection
                                </button>
                                <button onClick={() => setVisitType("lab_visit")}
                                    className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-colors ${visitType === "lab_visit"
                                        ? "bg-[#0067A1]/5 border-[#0067A1] text-[#0067A1]"
                                        : "bg-gray-50 border-gray-200 text-gray-500"
                                        }`}>
                                    <FaWalking /> Visit Lab Centre
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Address</label>
                                    <textarea value={address.full_address} onChange={(e) => setAddress({ ...address, full_address: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20"
                                        rows={2} placeholder="House/Flat No, Street, Area" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">City</label>
                                        <input type="text" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20"
                                            placeholder="City" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pincode</label>
                                        <input type="text" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20"
                                            placeholder="Pincode" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Landmark (Optional)</label>
                                    <input type="text" value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20"
                                        placeholder="Near..." />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-between">
                                <button onClick={() => setStep(2)} className="px-6 py-3 text-gray-500 font-semibold hover:bg-gray-50 rounded-xl">Back</button>
                                <button onClick={() => {
                                    if (!address.full_address || !address.city || !address.pincode) toast.error("Please fill required address fields");
                                    else setStep(4);
                                }}
                                    className="px-6 py-3 bg-[#0067A1] text-white rounded-xl font-semibold hover:bg-[#004F7C] transition-colors shadow-md">
                                    Continue to Consent →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4 — Consent */}
                    {step === 4 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FaShieldAlt className="w-4 h-4 text-[#0067A1]" /> Required Legal Consents
                            </h2>
                            <div className="space-y-4">
                                {[
                                    { key: "data_sharing_consent", label: "I explicitly consent to the collection, processing, and sharing of my health data with the laboratory", sub: "Required under the Digital Personal Data Protection (DPDP) Act 2023 and NDHM framework" },
                                    { key: "sample_collection_consent", label: "I authorize the laboratory personnel to collect and process my biological samples for diagnostic evaluation", sub: "Required under the Clinical Establishments Act and ICMR guidelines" },
                                    { key: "terms_accepted", label: "I accept the Terms & Conditions and Privacy Policy for laboratory services", sub: "Mandatory to proceed with the booking" }
                                ].map((c) => (
                                    <label key={c.key} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${consents[c.key] ? "bg-green-50/50 border-green-200" : "bg-gray-50 border-gray-200 hover:bg-gray-100"}`}>
                                        <div className="mt-1">
                                            <input type="checkbox" checked={consents[c.key]}
                                                onChange={(e) => setConsents({ ...consents, [c.key]: e.target.checked })}
                                                className="w-4 h-4 text-[#0067A1] rounded border-gray-300 focus:ring-[#0067A1]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{c.label}</p>
                                            <p className="text-xs text-gray-500 mt-1">{c.sub}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-between">
                                <button onClick={() => setStep(3)} className="px-6 py-3 text-gray-500 font-semibold hover:bg-gray-50 rounded-xl">Back</button>
                                <button onClick={() => {
                                    if (allConsentsGiven) setStep(5);
                                    else toast.error("All consents are mandatory");
                                }}
                                    className={`px-6 py-3 rounded-xl font-semibold shadow-md transition-colors ${allConsentsGiven ? "bg-[#0067A1] text-white hover:bg-[#004F7C]" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                                    Continue to Payment →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 5 — Payment */}
                    {step === 5 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaCheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Ready for Payment</h2>
                            <p className="text-gray-500 mb-6">Click the button below to securely process your payment of <b>₹{totalAmount}</b> via Razorpay.</p>
                            <div className="flex gap-4 justify-center">
                                <button onClick={() => setStep(4)} disabled={processing} className="px-6 py-3 text-gray-500 font-semibold hover:bg-gray-50 rounded-xl">Back</button>
                                <button onClick={handlePayment} disabled={processing}
                                    className="px-8 py-3 bg-[#0067A1] text-white rounded-xl font-semibold hover:bg-[#004F7C] transition-all shadow-lg flex items-center gap-2">
                                    {processing ? "Processing..." : `Pay ₹${totalAmount}`}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Sidebar Summary */}
                {step > 1 && (
                    <div className="lg:w-80 shrink-0">
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-6">
                            <h3 className="font-bold text-gray-900 mb-4 border-b pb-4">Booking Summary</h3>
                            <div className="space-y-3 text-sm border-b border-gray-100 pb-4 mb-4">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal ({matchedTests.length} tests)</span>
                                    <span>₹{totalAmount}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Home Collection</span>
                                    <span className="text-green-600 font-medium">Free</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Taxes & Fees</span>
                                    <span>₹0</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold text-gray-900">Total Amount</span>
                                <span className="text-xl font-bold text-[#0067A1]">₹{totalAmount}</span>
                            </div>
                            <div className="bg-[#0067A1]/5 rounded-xl p-3 flex items-start gap-3">
                                <FaShieldAlt className="text-[#0067A1] w-4 h-4 shrink-0 mt-0.5" />
                                <p className="text-xs text-[#0067A1] font-medium leading-tight">Safe and secure payments powered by Razorpay</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PrescriptionLabBookingFlow() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <PrescriptionLabBookingInner />
        </Suspense>
    );
}
