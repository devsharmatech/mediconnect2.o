"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
    FaFlask, FaSearch, FaArrowLeft, FaMapMarkerAlt, FaShoppingCart,
    FaPlus, FaTrash, FaClock, FaCheckCircle, FaTimes,
    FaInfoCircle, FaVial, FaThermometerHalf, FaClipboardList, FaPhone,
    FaTruck, FaChevronDown, FaChevronUp, FaStar, FaCalendarAlt,
    FaSignInAlt, FaUserPlus, FaLock
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

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
    if (role === "patient" && userId) return { id: userId, role };
    return null;
}

export default function PublicLabTestsPage({ params }) {
    const { id: labId } = use(params);
    const router = useRouter();

    const [lab, setLab] = useState(null);
    const [tests, setTests] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [expandedTest, setExpandedTest] = useState(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const user = getLoggedInUser();
        setIsLoggedIn(!!user);
        fetchLabAndTests();
        const existingCart = getCart();
        if (existingCart && existingCart.lab_id === labId) {
            setCart(existingCart.tests || []);
        }
    }, [labId]);

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
                setCategories(testsData.data?.categories || []);
            }
        } catch {
            toast.error("Failed to load lab details");
        } finally {
            setLoading(false);
        }
    };

    const filtered = tests.filter(t => {
        const matchSearch = t.test_name?.toLowerCase().includes(search.toLowerCase()) ||
            (t.test_code && t.test_code.toLowerCase().includes(search.toLowerCase()));
        const matchCat = activeCategory === "all" || t.category?.id === activeCategory;
        return matchSearch && matchCat;
    });

    const isInCart = (testId) => cart.some(t => t.test_id === testId);

    const addToCart = (test) => {
        // Check login first
        const user = getLoggedInUser();
        if (!user) {
            setShowLoginPrompt(true);
            return;
        }
        if (isInCart(test.id)) return;
        const newCart = [...cart, { test_id: test.id, test_name: test.test_name, price: parseFloat(test.price) }];
        setCart(newCart);
        saveCart({ lab_id: labId, lab_name: lab?.lab_name || "Lab", tests: newCart });
        toast.success(`${test.test_name} added to cart`);
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
        // Redirect to the public checkout page
        router.push("/website/services/lab-tests/checkout");
    };

    const formatOpeningHours = (hours) => {
        if (!hours) return null;
        if (typeof hours === "object") return `${hours.open || ""} - ${hours.close || ""}`;
        return hours;
    };

    const hasTestDetails = (test) => test.remarks || test.clinical_history_required || test.container || test.temperature || test.schedule || test.reporting_schedule;

    return (
        <div className="min-h-screen bg-[#F6F8FA] pb-28">
            {/* Login Prompt Modal */}
            <AnimatePresence>
                {showLoginPrompt && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowLoginPrompt(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-br from-[#0067A1] to-[#0080C6] px-8 py-8 text-center">
                                <div className="w-16 h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <FaLock className="w-7 h-7 text-white" />
                                </div>
                                <h2 className="text-2xl font-extrabold text-white">Login Required</h2>
                                <p className="text-white/60 text-sm mt-2">Please login or register as a patient to book lab tests</p>
                            </div>
                            <div className="p-8 space-y-4">
                                <p className="text-gray-500 text-sm text-center leading-relaxed">
                                    You need a patient account to add tests to cart and place orders. Your selections will be saved.
                                </p>
                                <div className="flex gap-3">
                                    <Link href="/website?action=login"
                                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#0067A1] text-white rounded-xl font-bold hover:bg-[#004F7C] transition-colors">
                                        <FaSignInAlt className="w-4 h-4" /> Login
                                    </Link>
                                    <Link href="/website?action=register"
                                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white text-[#0067A1] rounded-xl font-bold border-2 border-[#0067A1] hover:bg-[#0067A1]/5 transition-colors">
                                        <FaUserPlus className="w-4 h-4" /> Register
                                    </Link>
                                </div>
                                <button onClick={() => setShowLoginPrompt(false)}
                                    className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2 cursor-pointer">
                                    Continue Browsing
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="bg-gradient-to-br from-[#0067A1] via-[#0080C6] to-[#127a72] px-6 sm:px-10 pt-8 pb-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-40 -mt-40" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
                <div className="relative container mx-auto max-w-7xl">
                    <Link href="/website/services/lab-tests"
                        className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-5 transition-colors group">
                        <FaArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Back to Labs
                    </Link>

                    {lab ? (
                        <>
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                                    <FaFlask className="w-7 h-7 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{lab.lab_name}</h1>
                                    {lab.address && (
                                        <p className="text-white/50 text-sm flex items-center gap-1.5 mt-1">
                                            <FaMapMarkerAlt className="w-3 h-3 shrink-0" /> {lab.address}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        {lab.accepts_home_collection && (
                                            <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-400/20">
                                                <FaTruck className="w-3 h-3" /> Home Collection
                                            </span>
                                        )}
                                        {lab.opening_hours && (
                                            <span className="text-[11px] font-medium bg-white/10 text-white/80 px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                                                <FaClock className="w-3 h-3" /> {formatOpeningHours(lab.opening_hours)}
                                            </span>
                                        )}
                                        {lab.rating && (
                                            <span className="text-[11px] font-medium bg-amber-500/20 text-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-400/20">
                                                <FaStar className="w-3 h-3" /> {lab.rating}
                                            </span>
                                        )}
                                        {lab.phone_number && (
                                            <span className="text-[11px] font-medium bg-white/10 text-white/70 px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                                                <FaPhone className="w-3 h-3" /> {lab.phone_number}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : <div className="h-16 animate-pulse bg-white/10 rounded-xl" />}

                    <div className="mt-5 relative max-w-2xl">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search tests by name or code..."
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-4 focus:ring-white/30 focus:outline-none text-sm shadow-xl" />
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Categories */}
                    <div className="w-full lg:w-56 shrink-0">
                        <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-24 shadow-sm">
                            <h3 className="font-bold text-gray-900 text-sm mb-3 px-1">Categories</h3>
                            <div className="space-y-1">
                                <button onClick={() => setActiveCategory("all")}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left cursor-pointer ${activeCategory === "all" ? "bg-[#0067A1] text-white font-semibold shadow-md" : "text-gray-600 hover:bg-gray-50"}`}>
                                    <FaFlask className="w-3.5 h-3.5" /> All Tests
                                    <span className="ml-auto text-[10px] opacity-60">{tests.length}</span>
                                </button>
                                {categories.map(cat => {
                                    const catCount = tests.filter(t => t.category?.id === cat.id).length;
                                    return (
                                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left truncate cursor-pointer ${activeCategory === cat.id ? "bg-[#0067A1] text-white font-semibold shadow-md" : "text-gray-600 hover:bg-gray-50"}`}>
                                            <span className="truncate">{cat.name}</span>
                                            <span className="ml-auto text-[10px] opacity-60 shrink-0">{catCount}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Tests */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">
                                {activeCategory === "all" ? "All Tests" : categories.find(c => c.id === activeCategory)?.name || "Tests"}
                            </h2>
                            <span className="text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                {filtered.length} {filtered.length === 1 ? "test" : "tests"}
                            </span>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-48 animate-pulse">
                                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" /><div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                                        <div className="h-10 bg-gray-200 rounded-xl" />
                                    </div>
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                                <FaSearch className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-900">No Tests Found</h3>
                                <p className="text-gray-500 text-sm mt-1">Try a different search or category filter.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filtered.map((test, idx) => {
                                    const inCart = isInCart(test.id);
                                    const isExpanded = expandedTest === test.id;
                                    const hasDetails = hasTestDetails(test);

                                    return (
                                        <motion.div key={test.id}
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className={`bg-white rounded-2xl border overflow-hidden transition-all ${inCart ? "border-green-200 shadow-md ring-1 ring-green-100" : "border-gray-100 hover:shadow-md hover:border-gray-200"}`}>
                                            <div className="p-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        {test.test_code && <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded inline-block mb-1">{test.test_code}</span>}
                                                        <h3 className="text-sm font-bold text-gray-900 leading-snug">{test.test_name}</h3>
                                                        {test.category?.name && <span className="text-[11px] text-[#0067A1] font-medium mt-1 block">{test.category.name}</span>}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-lg font-extrabold text-gray-900">₹{test.price}</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                                    {test.turnaround_time && (
                                                        <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                                            <FaClock className="w-3 h-3 text-gray-400" /> {test.turnaround_time}
                                                        </span>
                                                    )}
                                                    {test.specimen_type && (
                                                        <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                                            <FaVial className="w-3 h-3 text-gray-400" /> {test.specimen_type}
                                                        </span>
                                                    )}
                                                    {test.clinical_history_required && (
                                                        <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg font-medium">
                                                            <FaClipboardList className="w-3 h-3" /> Clinical History Required
                                                        </span>
                                                    )}
                                                </div>

                                                {hasDetails && (
                                                    <button onClick={() => setExpandedTest(isExpanded ? null : test.id)}
                                                        className="flex items-center gap-1.5 text-[11px] text-[#0067A1] font-semibold mt-3 hover:underline cursor-pointer">
                                                        <FaInfoCircle className="w-3 h-3" />
                                                        {isExpanded ? "Hide Details" : "View Instructions & Details"}
                                                        {isExpanded ? <FaChevronUp className="w-2.5 h-2.5" /> : <FaChevronDown className="w-2.5 h-2.5" />}
                                                    </button>
                                                )}

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
                                                                {test.remarks && (
                                                                    <div className="bg-blue-50 rounded-xl px-4 py-3">
                                                                        <p className="text-[10px] font-bold text-[#0067A1] uppercase tracking-wider mb-1">Instructions / Notes</p>
                                                                        <p className="text-xs text-blue-800 leading-relaxed">{test.remarks}</p>
                                                                    </div>
                                                                )}
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {test.container && (
                                                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                                                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Container</p>
                                                                            <p className="text-xs text-gray-700 font-medium mt-0.5">{test.container}</p>
                                                                        </div>
                                                                    )}
                                                                    {test.temperature && (
                                                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                                                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Temperature</p>
                                                                            <p className="text-xs text-gray-700 font-medium mt-0.5 flex items-center gap-1">
                                                                                <FaThermometerHalf className="w-3 h-3 text-red-400" /> {test.temperature}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    {test.schedule && (
                                                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                                                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Schedule</p>
                                                                            <p className="text-xs text-gray-700 font-medium mt-0.5 flex items-center gap-1">
                                                                                <FaCalendarAlt className="w-3 h-3 text-[#0067A1]" /> {test.schedule}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    {test.reporting_schedule && (
                                                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                                                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Report In</p>
                                                                            <p className="text-xs text-gray-700 font-medium mt-0.5">{test.reporting_schedule}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <div className="mt-4">
                                                    {inCart ? (
                                                        <button onClick={() => removeFromCart(test.id)}
                                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all group cursor-pointer">
                                                            <FaCheckCircle className="w-3.5 h-3.5 group-hover:hidden" />
                                                            <FaTrash className="w-3.5 h-3.5 hidden group-hover:block" />
                                                            <span className="group-hover:hidden">Added to Cart</span>
                                                            <span className="hidden group-hover:block">Remove</span>
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => addToCart(test)}
                                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[#0067A1] text-white hover:bg-[#004F7C] transition-all shadow-sm cursor-pointer">
                                                            <FaPlus className="w-3 h-3" /> Add to Cart
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Cart Bar */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl px-4 sm:px-6 py-4">
                        <div className="container mx-auto max-w-5xl flex items-center justify-between gap-4">
                            <button onClick={() => setShowCart(!showCart)}
                                className="flex items-center gap-3 bg-[#0067A1]/5 px-4 py-2.5 rounded-xl border border-[#0067A1]/10 hover:bg-[#0067A1]/10 transition-colors cursor-pointer">
                                <div className="relative">
                                    <FaShoppingCart className="w-5 h-5 text-[#0067A1]" />
                                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#0067A1] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cart.length}</span>
                                </div>
                                <div className="text-left">
                                    <span className="text-sm font-bold text-gray-900">{cart.length} {cart.length === 1 ? "test" : "tests"}</span>
                                    <span className="text-xs text-gray-500 block">₹{totalAmount.toLocaleString()}</span>
                                </div>
                            </button>
                            <button onClick={handleProceed}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-[#0067A1]/25 transition-all cursor-pointer">
                                Proceed to Checkout
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        <AnimatePresence>
                            {showCart && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden mt-3 border-t border-gray-100 pt-3">
                                    <div className="container mx-auto max-w-5xl space-y-2 max-h-48 overflow-y-auto">
                                        {cart.map(item => (
                                            <div key={item.test_id} className="flex items-center justify-between bg-gray-50 px-4 py-2.5 rounded-xl">
                                                <span className="text-sm text-gray-900 font-medium truncate flex-1">{item.test_name}</span>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-sm font-bold text-gray-900">₹{item.price}</span>
                                                    <button onClick={() => removeFromCart(item.test_id)}
                                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                                                        <FaTimes className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
