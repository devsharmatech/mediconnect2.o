"use client";

import { useState, useEffect, use } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
    FaFlask, FaSearch, FaArrowLeft, FaMapMarkerAlt, FaShoppingCart,
    FaPlus, FaTrash, FaClock, FaCheckCircle, FaTimes,
    FaInfoCircle, FaVial, FaThermometerHalf, FaClipboardList,
    FaTruck, FaChevronDown, FaChevronUp, FaStar, FaCalendarAlt,
    FaSignInAlt, FaUserPlus, FaLock, FaShieldAlt, FaThLarge, FaList,
    FaSpinner, FaArrowRight
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

import LoginModal from "@/components/public-site/auth/LoginModal";
import SignupModal from "@/components/public-site/auth/SignupModal";

const CART_KEY = "lab_test_cart";

function getCart() {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "null"); } catch { return null; }
}
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

function getLoggedInUser() {
    if (typeof window === "undefined") return null;
    const role = localStorage.getItem("userRole");
    const userId = localStorage.getItem("userId");
    if (userId) return { id: userId, role: role || "patient" };
    return null;
}

function getLabLogo(lab) {
    if (!lab) return "/images/labs/default-lab-logo.svg";
    if (lab.logo_url) return lab.logo_url;
    const name = (lab.lab_name || lab.name || "").toLowerCase();
    if (name.includes("medplus")) {
        return "/images/labs/medplus-logo.svg";
    }
    if (name.includes("apex")) {
        return "/images/labs/apex-logo.svg";
    }
    if (name.includes("om sai") || name.includes("omsai")) {
        return "/images/labs/omsai-logo.svg";
    }
    if (name.includes("suburban")) {
        return "/images/labs/suburban-logo.svg";
    }
    if (
        lab.profile_picture &&
        !lab.profile_picture.includes("randomuser.me") &&
        !lab.profile_picture.includes("ui-avatars.com")
    ) {
        return lab.profile_picture;
    }
    return "/images/labs/default-lab-logo.svg";
}


export default function PublicLabTestsPage({ params }) {
    const { id: labId } = use(params);
    const router = useRouter();

    const [lab, setLab] = useState(null);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState([]);
    const [showCartDrawer, setShowCartDrawer] = useState(false);
    const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
    const [selectedDetailTest, setSelectedDetailTest] = useState(null);
    const [expandedTest, setExpandedTest] = useState(null);
    const [addingId, setAddingId] = useState(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const user = getLoggedInUser();
        setIsLoggedIn(!!user);
        fetchLabAndTests();
        const existingCart = getCart();
        if (existingCart && existingCart.lab_id === labId) {
            setCart(existingCart.tests || []);
        }
    }, [labId]);

    // Lock body scroll when cart drawer is open
    useEffect(() => {
        if (showCartDrawer) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [showCartDrawer]);

    const fetchLabAndTests = async () => {
        setLoading(true);
        try {
            const [labRes, testsRes] = await Promise.all([
                fetch(`/api/patient/lab/labs/${labId}`),
                fetch(`/api/patient/lab/labs/${labId}/tests`),
            ]);
            const labData = await labRes.json();
            const testsData = await testsRes.json();
            if (labData.success) setLab(labData.data);
            if (testsData.success) {
                setTests(testsData.data?.tests || []);
            }
        } catch {
            toast.error("Failed to load lab details");
        } finally {
            setLoading(false);
        }
    };

    const filtered = tests.filter(t =>
        t.test_name?.toLowerCase().includes(search.toLowerCase()) ||
        (t.test_code && t.test_code.toLowerCase().includes(search.toLowerCase()))
    );

    const isInCart = (testId) => cart.some(t => t.test_id === testId);

    const addToCart = async (test) => {
        if (isInCart(test.id) || addingId === test.id) return;
        setAddingId(test.id);
        await new Promise(r => setTimeout(r, 350));
        const newCart = [
            ...cart,
            {
                test_id: test.id,
                test_name: test.test_name,
                price: parseFloat(test.price),
                category_name: test.category_name,
                specimen_type: test.specimen_type,
                test_code: test.test_code
            }
        ];
        setCart(newCart);
        saveCart({ lab_id: labId, lab_name: lab?.lab_name || "Lab", tests: newCart });
        toast.success(`${test.test_name} added to cart`);
        setAddingId(null);
    };

    const removeFromCart = (testId) => {
        const newCart = cart.filter(t => t.test_id !== testId);
        setCart(newCart);
        if (newCart.length === 0) localStorage.removeItem(CART_KEY);
        else saveCart({ lab_id: labId, lab_name: lab?.lab_name || "Lab", tests: newCart });
    };

    const totalAmount = cart.reduce((s, t) => s + t.price, 0);

    const handleProceed = () => {
        if (cart.length === 0) { toast.error("Please add at least one test"); return; }
        const user = getLoggedInUser();
        if (!user) {
            setShowCartDrawer(false);
            setShowLoginModal(true);
            return;
        }
        router.push("/services/lab-tests/checkout");
    };

    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setShowSignupModal(false);
        toast.success("Logged in successfully!");
        router.push("/services/lab-tests/checkout");
    };

    const formatOpeningHours = (hours) => {
        if (!hours) return null;
        if (typeof hours === "object") return `${hours.open || ""} - ${hours.close || ""}`;
        return hours;
    };

    const hasTestDetails = (test) => test.remarks || test.clinical_history_required || test.container || test.temperature || test.schedule || test.reporting_schedule;

    return (
        <div className="min-h-screen bg-[#F6F8FA] pb-28">
            {/* Real Login & Signup Modals */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onSignupClick={() => {
                    setShowLoginModal(false);
                    setShowSignupModal(true);
                }}
                onSuccess={handleLoginSuccess}
                initialUserType="patient"
            />

            <SignupModal
                isOpen={showSignupModal}
                onClose={() => setShowSignupModal(false)}
                onLoginClick={() => {
                    setShowSignupModal(false);
                    setShowLoginModal(true);
                }}
                onSuccess={handleLoginSuccess}
            />

            {/* ─── Lab Identity Card (Compact & Responsive on Mobile) ─── */}
            <div className="bg-white border-b border-gray-100 shadow-2xs">
                <div className="container mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-4">
                    <Link href="/services/lab-tests"
                        className="inline-flex items-center gap-1.5 text-[#0067A1] text-xs sm:text-sm font-semibold hover:underline group">
                        <FaArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:-translate-x-1 transition-transform" />
                        All Diagnostic Labs
                    </Link>
                </div>
                <div className="container mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8 py-3 sm:py-5">
                    {lab ? (
                        <div className="flex items-center gap-3 sm:gap-5">
                            {/* Logo */}
                            <div className="w-13 h-13 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gray-50 rounded-xl sm:rounded-2xl border border-gray-200/80 flex items-center justify-center shrink-0 overflow-hidden p-1.5 sm:p-2 shadow-2xs">
                                <img
                                    src={getLabLogo(lab)}
                                    alt={lab.lab_name}
                                    className="w-full h-full object-contain"
                                    onError={e => { e.target.src = "/images/labs/default-lab-logo.svg"; }}
                                />
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
                                    <h1 className="text-base sm:text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-snug truncate max-w-[220px] sm:max-w-none">
                                        {lab.lab_name}
                                    </h1>
                                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full border border-emerald-200/70 shrink-0">
                                        <FaShieldAlt className="w-2.5 h-2.5 text-emerald-600" /> Verified
                                    </span>
                                </div>
                                {lab.address && (
                                    <p className="text-gray-500 text-[11px] sm:text-sm flex items-center gap-1 mb-1.5 sm:mb-2.5 truncate">
                                        <FaMapMarkerAlt className="w-3 h-3 text-[#0067A1] shrink-0" />
                                        <span className="truncate">{lab.address}</span>
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                    {lab.rating && (
                                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 sm:py-1 rounded-lg border border-amber-200/60">
                                            <FaStar className="w-2.5 h-2.5 text-amber-500" /> {lab.rating}
                                        </span>
                                    )}
                                    {lab.accepts_home_collection && (
                                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold bg-sky-50 text-[#0067A1] px-2 py-0.5 sm:py-1 rounded-lg border border-sky-100">
                                            <FaTruck className="w-2.5 h-2.5" /> <span>Home Collection</span>
                                        </span>
                                    )}
                                    {lab.opening_hours && (
                                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium bg-gray-50 text-gray-600 px-2 py-0.5 sm:py-1 rounded-lg border border-gray-100">
                                            <FaClock className="w-2.5 h-2.5 text-gray-400" /> {formatOpeningHours(lab.opening_hours)}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium bg-gray-50 text-gray-600 px-2 py-0.5 sm:py-1 rounded-lg border border-gray-100">
                                        <FaFlask className="w-2.5 h-2.5 text-[#0067A1]" /> {tests.length} Tests
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 sm:gap-5 animate-pulse">
                            <div className="w-13 h-13 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-gray-200 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-5 bg-gray-200 rounded w-44" />
                                <div className="h-3.5 bg-gray-200 rounded w-32" />
                                <div className="flex gap-1.5">
                                    <div className="h-4 bg-gray-200 rounded-full w-20" />
                                    <div className="h-4 bg-gray-200 rounded-full w-24" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="container mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6">
                {/* Search */}
                <div className="relative mb-3.5 sm:mb-5">
                    <FaSearch className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search tests by name or code..."
                        className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3.5 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-4 focus:ring-[#0067A1]/10 focus:border-[#0067A1] focus:outline-none text-xs sm:text-sm shadow-xs transition-all" />
                </div>

                {/* Header Row: Count & View Switcher */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-none">
                            {search ? `Results for "${search}"` : "All Tests"}
                        </h2>
                        <span className="text-[11px] text-gray-400 font-medium mt-1 inline-block">
                            {filtered.length} {filtered.length === 1 ? "test" : "tests"} available
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === "grid"
                                    ? "bg-white text-[#0067A1] shadow-xs"
                                    : "text-gray-400 hover:text-gray-700"
                            }`}
                            title="Grid View (Compact Cards)"
                        >
                            <FaThLarge className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === "list"
                                    ? "bg-white text-[#0067A1] shadow-xs"
                                    : "text-gray-400 hover:text-gray-700"
                            }`}
                            title="List View (Ultra Compact)"
                        >
                            <FaList className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3.5 h-36 animate-pulse">
                                <div className="flex justify-between mb-2">
                                    <div className="h-3 bg-gray-200 rounded w-12" />
                                    <div className="h-4 bg-gray-200 rounded w-10" />
                                </div>
                                <div className="h-3.5 bg-gray-200 rounded w-full mb-1.5" />
                                <div className="h-3.5 bg-gray-200 rounded w-2/3 mb-3" />
                                <div className="h-6 bg-gray-200 rounded-lg mt-auto" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                        <FaSearch className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-bold text-gray-900 text-sm">No Tests Found</h3>
                        <p className="text-gray-500 text-xs mt-1">
                            {search ? `No tests match "${search}". Try searching another name.` : "No tests available for this lab."}
                        </p>
                        {search && (
                            <button onClick={() => setSearch("")}
                                className="mt-3 text-[#0067A1] text-xs font-semibold hover:underline cursor-pointer">
                                Clear search
                            </button>
                        )}
                    </div>
                ) : viewMode === "grid" ? (
                    /* ─── COMPACT GRID VIEW (2 cols mobile, 4 cols desktop) ─── */
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                        {filtered.map((test, idx) => {
                            const inCart = isInCart(test.id);
                            const hasDetails = hasTestDetails(test);

                            return (
                                <motion.div
                                    key={test.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                                    className={`bg-white rounded-2xl border p-3 sm:p-3.5 flex flex-col justify-between transition-all ${
                                        inCart
                                            ? "border-green-300 shadow-sm ring-1.5 ring-green-100 bg-green-50/20"
                                            : "border-gray-100 hover:border-gray-200 hover:shadow-md"
                                    }`}
                                >
                                    <div>
                                        {/* Top row: Code + Price */}
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                            {test.test_code ? (
                                                <span className="text-[9px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded truncate max-w-[70px]">
                                                    {test.test_code}
                                                </span>
                                            ) : <span />}
                                            <span className="text-sm sm:text-base font-extrabold text-[#0067A1]">
                                                ₹{test.price}
                                            </span>
                                        </div>

                                        {/* Test Name */}
                                        <h3
                                            className="text-[11px] sm:text-xs font-bold text-gray-900 leading-snug break-words min-h-[28px] sm:min-h-[32px]"
                                            title={test.test_name}
                                        >
                                            {test.test_name}
                                        </h3>

                                        {/* Specimen / Turnaround */}
                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                            {test.specimen_type && (
                                                <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                                    {test.specimen_type}
                                                </span>
                                            )}
                                            {test.turnaround_time && (
                                                <span className="text-[10px] text-gray-400 hidden sm:inline-block">
                                                    • {test.turnaround_time}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action row */}
                                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-1.5">
                                        {hasDetails ? (
                                            <button
                                                onClick={() => setSelectedDetailTest(test)}
                                                className="text-[10px] sm:text-[11px] text-[#0067A1] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                                            >
                                                <FaInfoCircle className="w-2.5 h-2.5" />
                                                <span>Info</span>
                                            </button>
                                        ) : <span />}

                                        {inCart ? (
                                            <button
                                                onClick={() => removeFromCart(test.id)}
                                                className="px-2 sm:px-3 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-1 cursor-pointer ml-auto"
                                                title="Remove from cart"
                                            >
                                                <FaCheckCircle className="w-2.5 h-2.5" />
                                                <span className="text-[11px]">Added</span>
                                            </button>
                                        ) : addingId === test.id ? (
                                            <button
                                                disabled
                                                className="px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold bg-[#0067A1]/85 text-white flex items-center gap-1.5 cursor-wait ml-auto shadow-xs"
                                            >
                                                <FaSpinner className="w-2.5 h-2.5 animate-spin" />
                                                <span className="text-[11px]">Adding...</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => addToCart(test)}
                                                className="px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold bg-[#0067A1] text-white hover:bg-[#004F7C] shadow-xs transition-all flex items-center gap-1 cursor-pointer ml-auto active:scale-95"
                                            >
                                                <FaPlus className="w-2.5 h-2.5" />
                                                <span className="text-[11px]">Add</span>
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    /* ─── ULTRA COMPACT LIST VIEW ─── */
                    <div className="space-y-2">
                        {filtered.map((test, idx) => {
                            const inCart = isInCart(test.id);
                            const hasDetails = hasTestDetails(test);

                            return (
                                <motion.div
                                    key={test.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(idx * 0.01, 0.2) }}
                                    className={`bg-white rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 transition-all ${
                                        inCart
                                            ? "border-green-300 ring-1 ring-green-100 bg-green-50/20"
                                            : "border-gray-100 hover:border-gray-200 hover:shadow-xs"
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xs sm:text-sm font-bold text-gray-900 break-words">
                                                {test.test_name}
                                            </h3>
                                            {test.test_code && (
                                                <span className="text-[9px] font-mono text-gray-400 bg-gray-50 px-1 rounded shrink-0">
                                                    {test.test_code}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                                            {test.specimen_type && <span>{test.specimen_type}</span>}
                                            {test.turnaround_time && <span>• {test.turnaround_time}</span>}
                                            {hasDetails && (
                                                <button
                                                    onClick={() => setSelectedDetailTest(test)}
                                                    className="text-[#0067A1] font-semibold hover:underline ml-1 cursor-pointer"
                                                >
                                                    View Details
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-xs sm:text-sm font-black text-gray-900">
                                            ₹{test.price}
                                        </span>
                                        {inCart ? (
                                            <button
                                                onClick={() => removeFromCart(test.id)}
                                                className="px-2.5 py-1 text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                                            >
                                                Added ✓
                                            </button>
                                        ) : addingId === test.id ? (
                                            <button
                                                disabled
                                                className="px-3 py-1 text-[11px] font-bold bg-[#0067A1]/85 text-white rounded-lg flex items-center gap-1.5 cursor-wait shadow-xs"
                                            >
                                                <FaSpinner className="w-2.5 h-2.5 animate-spin" />
                                                <span>Adding...</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => addToCart(test)}
                                                className="px-3 py-1 text-[11px] font-bold bg-[#0067A1] text-white hover:bg-[#004F7C] rounded-lg shadow-xs cursor-pointer transition-colors active:scale-95"
                                            >
                                                + Add
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── TEST DETAILS POPUP MODAL ─── */}
            <AnimatePresence>
                {selectedDetailTest && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedDetailTest(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-xl shadow-lg max-w-lg w-full overflow-hidden border border-slate-200"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-[#0067A1] p-5 text-white flex items-start justify-between">
                                <div>
                                    {selectedDetailTest.test_code && (
                                        <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
                                            {selectedDetailTest.test_code}
                                        </span>
                                    )}
                                    <h3 className="text-base font-extrabold text-white leading-tight">
                                        {selectedDetailTest.test_name}
                                    </h3>
                                    <p className="text-xl font-black text-white mt-1">₹{selectedDetailTest.price}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedDetailTest(null)}
                                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer transition-colors"
                                >
                                    <FaTimes className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                                {selectedDetailTest.remarks && (
                                    <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5">
                                        <p className="text-[10px] font-bold text-[#0067A1] uppercase tracking-wider mb-1">
                                            Instructions & Notes
                                        </p>
                                        <p className="text-xs text-blue-900 leading-relaxed">
                                            {selectedDetailTest.remarks}
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2.5 text-xs">
                                    {selectedDetailTest.specimen_type && (
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Specimen</p>
                                            <p className="font-semibold text-gray-800 mt-0.5">{selectedDetailTest.specimen_type}</p>
                                        </div>
                                    )}
                                    {selectedDetailTest.turnaround_time && (
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Turnaround</p>
                                            <p className="font-semibold text-gray-800 mt-0.5">{selectedDetailTest.turnaround_time}</p>
                                        </div>
                                    )}
                                    {selectedDetailTest.container && (
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Container</p>
                                            <p className="font-semibold text-gray-800 mt-0.5">{selectedDetailTest.container}</p>
                                        </div>
                                    )}
                                    {selectedDetailTest.temperature && (
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Storage Temperature</p>
                                            <p className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1">
                                                <FaThermometerHalf className="text-red-400 w-3 h-3" />
                                                {selectedDetailTest.temperature}
                                            </p>
                                        </div>
                                    )}
                                    {selectedDetailTest.schedule && (
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Schedule</p>
                                            <p className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1">
                                                <FaCalendarAlt className="text-[#0067A1] w-3 h-3" />
                                                {selectedDetailTest.schedule}
                                            </p>
                                        </div>
                                    )}
                                    {selectedDetailTest.reporting_schedule && (
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Report In</p>
                                            <p className="font-semibold text-gray-800 mt-0.5">{selectedDetailTest.reporting_schedule}</p>
                                        </div>
                                    )}
                                </div>

                                {selectedDetailTest.clinical_history_required && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-800 font-medium">
                                        <FaClipboardList className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>Clinical patient history required at time of sample collection.</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
                                <button
                                    onClick={() => setSelectedDetailTest(null)}
                                    className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                                >
                                    Close
                                </button>
                                {isInCart(selectedDetailTest.id) ? (
                                    <button
                                        onClick={() => {
                                            removeFromCart(selectedDetailTest.id);
                                            setSelectedDetailTest(null);
                                        }}
                                        className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 cursor-pointer transition-colors"
                                    >
                                        Remove from Cart
                                    </button>
                                ) : addingId === selectedDetailTest.id ? (
                                    <button
                                        disabled
                                        className="px-6 py-2.5 bg-[#0067A1]/85 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-wait"
                                    >
                                        <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                                        <span>Adding...</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            await addToCart(selectedDetailTest);
                                            setSelectedDetailTest(null);
                                        }}
                                        className="px-6 py-2.5 bg-[#0067A1] text-white rounded-xl text-xs font-bold hover:bg-[#004F7C] cursor-pointer shadow-sm transition-colors flex items-center gap-1.5"
                                    >
                                        <FaPlus className="w-3 h-3" /> Add to Cart (₹{selectedDetailTest.price})
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── FLOATING CART BUTTON (FAB) ─── */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-8 sm:bottom-8 sm:w-auto z-50"
                    >
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setShowCartDrawer(true)}
                            className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 bg-[#0067A1] text-white px-4 py-3 rounded-2xl sm:rounded-full shadow-lg shadow-[#0067A1]/30 border border-white/20 cursor-pointer hover:bg-[#005585] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                                        <FaShoppingCart className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-4.5 h-4.5 flex items-center justify-center shadow-md animate-pulse">
                                        {cart.length}
                                    </span>
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-bold text-white/80 leading-none uppercase tracking-wider">
                                        {cart.length} {cart.length === 1 ? "Test" : "Tests"} Added
                                    </p>
                                    <p className="text-sm font-extrabold text-white leading-tight mt-0.5">
                                        ₹{totalAmount.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider transition-colors">
                                <span>View Cart</span>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── SLIDE-OVER CART DRAWER (Portaled to document.body) ─── */}
            {mounted && typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                    {showCartDrawer && (
                        <div className="fixed inset-0 z-[9999999] flex justify-end">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
                                onClick={() => setShowCartDrawer(false)}
                            />

                            {/* Slide Drawer Panel */}
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                                className="relative z-10 w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Drawer Header */}
                                <div className="px-5 py-4 bg-[#0067A1] text-white flex items-center justify-between shrink-0 shadow-sm">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-inner shrink-0">
                                            <FaShoppingCart className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-extrabold text-white text-base sm:text-lg leading-tight tracking-tight">Your Cart</h3>
                                                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold shrink-0">
                                                    {cart.length} {cart.length === 1 ? "Test" : "Tests"}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-white/80 font-medium truncate max-w-[210px] sm:max-w-[250px] mt-0.5">
                                                {lab?.lab_name || "Diagnostic Laboratory"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {cart.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm("Empty your cart?")) {
                                                        setCart([]);
                                                        localStorage.removeItem(CART_KEY);
                                                        toast.success("Cart cleared");
                                                    }
                                                }}
                                                className="px-2.5 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 text-xs font-semibold transition-all cursor-pointer"
                                                title="Clear Cart"
                                            >
                                                Clear All
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowCartDrawer(false)}
                                            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer border border-white/20 active:scale-95"
                                            aria-label="Close Cart"
                                        >
                                            <FaTimes className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Drawer Item List */}
                                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/70">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                                            <div className="w-16 h-16 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0067A1] mb-3">
                                                <FaShoppingCart className="w-7 h-7 text-[#0067A1]/40" />
                                            </div>
                                            <h4 className="text-base font-extrabold text-slate-800">Your Cart is Empty</h4>
                                            <p className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                                                Browse the test catalog and select tests to schedule an appointment.
                                            </p>
                                            <button
                                                onClick={() => setShowCartDrawer(false)}
                                                className="mt-4 px-4 py-2 bg-[#0067A1] text-white text-xs font-bold rounded-lg hover:bg-[#005282] transition-colors cursor-pointer"
                                            >
                                                Browse Available Tests
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Home Collection Notice (Accurate: Available, Selectable at checkout) */}
                                            <div className="bg-sky-50/90 border border-sky-100/90 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs">
                                                <div className="w-8 h-8 rounded-xl bg-[#0067A1]/10 flex items-center justify-center shrink-0 text-[#0067A1] mt-0.5">
                                                    <FaTruck className="w-4 h-4" />
                                                </div>
                                                <div className="text-xs flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-extrabold text-slate-900">Home Sample Collection</p>
                                                        <span className="text-[10px] font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">Available</span>
                                                    </div>
                                                    <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                                                        Certified phlebotomists can collect samples at your doorstep. Choose between Home Collection or Lab Visit at checkout.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Test Item Cards */}
                                            <div className="space-y-2.5">
                                                {cart.map((item) => {
                                                    const testDetails = tests.find(t => t.id === item.test_id);
                                                    const category = item.category_name || testDetails?.category_name;
                                                    const specimen = item.specimen_type || testDetails?.specimen_type;
                                                    const code = item.test_code || testDetails?.test_code;

                                                    return (
                                                        <div
                                                            key={item.test_id}
                                                            className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 hover:border-[#0067A1]/40 shadow-xs hover:shadow-md transition-all flex flex-col gap-2.5"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0067A1] flex items-center justify-center shrink-0 mt-0.5 border border-sky-100">
                                                                        <FaFlask className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug break-words">
                                                                            {item.test_name}
                                                                        </h4>
                                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                                            {code && (
                                                                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                                    #{code}
                                                                                </span>
                                                                            )}
                                                                            {category && (
                                                                                <span className="text-[10px] font-semibold text-[#0067A1] bg-sky-50 px-1.5 py-0.5 rounded">
                                                                                    {category}
                                                                                </span>
                                                                            )}
                                                                            {specimen && (
                                                                                <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                                                                                    {specimen}
                                                                                </span>
                                                                            )}
                                                                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                                                Digital Report
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => removeFromCart(item.test_id)}
                                                                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-200/60 hover:border-rose-200 active:scale-95"
                                                                    title="Remove test"
                                                                >
                                                                    <FaTrash className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                                <span className="text-[11px] font-medium text-slate-400">Test Fee</span>
                                                                <span className="text-sm sm:text-base font-black text-[#0067A1]">
                                                                    ₹{item.price.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Trust badge */}
                                            <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-500 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <FaShieldAlt className="text-emerald-500 w-3 h-3" /> NABL Certified
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FaCheckCircle className="text-sky-500 w-3 h-3" /> Verified Reports
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Drawer Footer & Checkout Action */}
                                {cart.length > 0 && (
                                    <div className="border-t border-slate-200/90 bg-white p-4 sm:p-5 space-y-3.5 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] pb-[max(1.25rem,env(safe-area-inset-bottom,16px))] shrink-0">
                                        {/* Breakdown */}
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between items-center text-slate-600">
                                                <span>Item Total ({cart.length} {cart.length === 1 ? "test" : "tests"})</span>
                                                <span className="font-semibold text-slate-900">₹{totalAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-600">
                                                <span>Digital Smart Report</span>
                                                <span className="font-bold text-emerald-600">Included</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-600">
                                                <span>Sample Collection</span>
                                                <span className="font-medium text-slate-600">Selected at checkout</span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-extrabold text-slate-900">Total Tests Amount</p>
                                                    <p className="text-[10px] text-slate-400">Collection fee (if chosen) calculated at checkout</p>
                                                </div>
                                                <span className="text-2xl font-black text-[#0067A1]">
                                                    ₹{totalAmount.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action button */}
                                        <div className="space-y-2">
                                            <button
                                                onClick={handleProceed}
                                                className="w-full py-3 bg-[#0067A1] hover:bg-[#005585] text-white rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <span>Proceed to Checkout</span>
                                                <FaArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                            <p className="text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
                                                <FaLock className="w-3 h-3 text-slate-400 shrink-0" />
                                                <span>100% Secure Checkout • Confidential Medical Data</span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
