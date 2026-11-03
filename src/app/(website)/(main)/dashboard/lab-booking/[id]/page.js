"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
    FaFlask, FaSearch, FaArrowLeft, FaMapMarkerAlt, FaShoppingCart,
    FaPlus, FaTrash, FaClock, FaHome, FaCheckCircle, FaTimes,
    FaInfoCircle, FaVial, FaPhone,
    FaTruck, FaStar,
    FaThLarge, FaList, FaSpinner, FaArrowRight, FaLock,
    FaHospital, FaBoxOpen, FaChevronLeft, FaChevronRight
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
    resolveTestCollectionType,
    resolveTestDepartment,
    resolveTestSampleLabel,
    isHealthPackage,
    extractPackageTests
} from "@/lib/labSearchHelper";

const CART_KEY = "lab_test_cart";
const PAGE_LIMIT = 24;

const PRICE_OPTIONS = [
    { key: "all", label: "All Prices" },
    { key: "under500", label: "Under ₹500" },
    { key: "500to1500", label: "₹500 – ₹1,500" },
    { key: "1500to3000", label: "₹1,500 – ₹3,000" },
    { key: "above3000", label: "Above ₹3,000" },
];

const SORT_OPTIONS = [
    { key: "name_asc", label: "Sort: Name (A–Z)" },
    { key: "price_asc", label: "Price: Low to High" },
    { key: "price_desc", label: "Price: High to Low" },
];

function getCart() {
    if (typeof window === "undefined") return null;
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || "null");
    } catch { return null; }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function enrichTestRow(t) {
    return {
        ...t,
        _isPkg: isHealthPackage(t),
        _includedTests: extractPackageTests(t),
        _collectionMode: resolveTestCollectionType(t),
        _deptLabel: t.department || resolveTestDepartment(t),
        _sampleLabel: resolveTestSampleLabel(t),
    };
}

export default function LabTestsPage({ params }) {
    const { id: labId } = use(params);
    const router = useRouter();

    const [lab, setLab] = useState(null);
    const [tests, setTests] = useState([]);
    const [packages, setPackages] = useState([]);
    const [collectionCounts, setCollectionCounts] = useState({ all: 0, home: 0, lab: 0, packages: 0 });
    const [departmentOptions, setDepartmentOptions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalTests, setTotalTests] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [collectionFilter, setCollectionFilter] = useState("all"); // "all" | "packages" | "home" | "lab"
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [sortBy, setSortBy] = useState("name_asc");

    const [cart, setCart] = useState([]);
    const [visitType, setVisitType] = useState("home_collection");
    const [showCart, setShowCart] = useState(false);
    const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
    const [selectedDetailTest, setSelectedDetailTest] = useState(null);
    const [addingId, setAddingId] = useState(null);
    const [mounted, setMounted] = useState(false);

    const modeScrollRef = useRef(null);
    const deptScrollRef = useRef(null);
    const pkgSliderRef = useRef(null);

    const scrollHorizontal = (ref, amount) => {
        if (ref?.current) {
            ref.current.scrollBy({ left: amount, behavior: "smooth" });
        }
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
        }, 250);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        fetch(`/api/patient/lab/labs/${labId}`)
            .then(r => r.json())
            .then(res => {
                if (res.success) setLab(res.data);
            })
            .catch(() => {});

        const existingCart = getCart();
        if (existingCart && existingCart.lab_id === labId) {
            setCart(existingCart.tests || []);
            if (existingCart.visit_type) setVisitType(existingCart.visit_type);
        }
    }, [labId]);

    const fetchTestsPage = useCallback(async (targetPage, append = false) => {
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const qs = new URLSearchParams({
                page: String(targetPage),
                limit: String(PAGE_LIMIT),
                collection: collectionFilter,
                department: departmentFilter,
                price: priceFilter,
                sort: sortBy,
            });
            if (debouncedSearch) qs.set("search", debouncedSearch);
            if (collectionFilter !== "packages" && departmentFilter !== "Health Packages") {
                qs.set("exclude_packages", "true");
            }

            const res = await fetch(`/api/patient/lab/labs/${labId}/tests?${qs.toString()}`);
            const data = await res.json();

            if (data.success) {
                const incomingTests = (data.data?.tests || []).map(enrichTestRow);
                setTests(prev => (append ? [...prev, ...incomingTests] : incomingTests));
                setTotalTests(data.data?.total || 0);
                setHasMore(Boolean(data.data?.pagination?.hasMore));
                setPage(targetPage);

                if (targetPage === 1) {
                    if (data.data?.counts) setCollectionCounts(data.data.counts);
                    if (data.data?.departments) setDepartmentOptions(data.data.departments);
                    if (data.data?.packages) {
                        setPackages(data.data.packages.map(enrichTestRow));
                    }
                }
            }
        } catch {
            toast.error("Failed to load tests");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [labId, debouncedSearch, collectionFilter, departmentFilter, priceFilter, sortBy]);

    useEffect(() => {
        fetchTestsPage(1, false);
    }, [fetchTestsPage]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchTestsPage(page + 1, true);
        }
    };

    useEffect(() => {
        if (showCart) {
            document.body.style.overflowY = "hidden";
        } else {
            document.body.style.overflowY = "";
        }
        return () => {
            document.body.style.overflowY = "";
        };
    }, [showCart]);

    const hasActiveFilters =
        Boolean(searchInput.trim()) ||
        collectionFilter !== "all" ||
        departmentFilter !== "all" ||
        priceFilter !== "all" ||
        sortBy !== "name_asc";

    const resetAllFilters = () => {
        setSearchInput("");
        setDebouncedSearch("");
        setCollectionFilter("all");
        setDepartmentFilter("all");
        setPriceFilter("all");
        setSortBy("name_asc");
    };

    const isInCart = (testId) => cart.some(t => t.test_id === testId);

    const addToCart = async (test) => {
        if (isInCart(test.id) || addingId === test.id) return;
        setAddingId(test.id);
        await new Promise(r => setTimeout(r, 180));
        const mode = test._collectionMode || resolveTestCollectionType(test);
        const newCart = [
            ...cart,
            {
                test_id: test.id,
                test_name: test.test_name,
                price: parseFloat(test.price),
                category_name: test.category_name || test._deptLabel,
                specimen_type: test.specimen_type || test._sampleLabel,
                test_code: test.test_code,
                collection_type: mode,
            }
        ];
        const hasLabOnly = newCart.some(item => item.collection_type === "lab");
        const nextVisitType = hasLabOnly ? "walk_in" : visitType;
        if (hasLabOnly && visitType !== "walk_in") {
            setVisitType("walk_in");
        }
        setCart(newCart);
        saveCart({ lab_id: labId, lab_name: lab?.lab_name || "Lab", tests: newCart, visit_type: nextVisitType });
        toast.success(`${test.test_name} added`);
        setAddingId(null);
    };

    const removeFromCart = (testId) => {
        const newCart = cart.filter(t => t.test_id !== testId);
        setCart(newCart);
        if (newCart.length === 0) {
            localStorage.removeItem(CART_KEY);
        } else {
            saveCart({ lab_id: labId, lab_name: lab?.lab_name || "Lab", tests: newCart, visit_type: visitType });
        }
    };

    const totalAmount = cart.reduce((s, t) => s + t.price, 0);
    const cartHasLabOnlyTest = cart.some(item => item.collection_type === "lab");

    const handleProceed = () => {
        if (cart.length === 0) {
            toast.error("Please add at least one test to proceed");
            return;
        }
        router.push("/website/dashboard/lab-booking/checkout");
    };

    const formatOpeningHours = (hours) => {
        if (!hours) return null;
        if (typeof hours === "object") return `${hours.open || ""} - ${hours.close || ""}`;
        return hours;
    };

    const showPackageSlider =
        packages.length > 0 &&
        collectionFilter !== "packages" &&
        (departmentFilter === "all" || departmentFilter === "Health Packages");

    return (
        <div className="min-h-screen pb-24">
            {/* ─── Minimal Lab Identity Header ─── */}
            <div className="bg-[#0067A1] text-white rounded-md px-3.5 sm:px-4 py-2.5 sm:py-3 mb-3 border border-[#005585]">
                <button
                    onClick={() => router.push("/website/dashboard/lab-booking")}
                    className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] font-medium mb-1.5 transition-colors cursor-pointer"
                >
                    <FaArrowLeft className="w-2.5 h-2.5" /> Back to Labs
                </button>

                {lab ? (
                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 bg-white/15 rounded-md flex items-center justify-center shrink-0 border border-white/15">
                            <FaFlask className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-sm sm:text-base md:text-lg font-semibold text-white truncate">
                                {lab.lab_name}
                            </h1>
                            {lab.address && (
                                <p className="text-white/75 text-[11px] flex items-center gap-1 mt-0.5 truncate font-normal">
                                    <FaMapMarkerAlt className="w-2.5 h-2.5 shrink-0" /> {lab.address}
                                </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto flex-nowrap no-scrollbar">
                                <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-100 px-1.5 py-0.5 rounded-[4px] flex items-center gap-1 border border-emerald-300/30 shrink-0">
                                    <FaTruck className="w-2 h-2" /> {collectionCounts.home} Home
                                </span>
                                <span className="text-[10px] font-medium bg-white/15 text-white px-1.5 py-0.5 rounded-[4px] flex items-center gap-1 border border-white/20 shrink-0">
                                    <FaHospital className="w-2 h-2" /> {collectionCounts.lab} Lab
                                </span>
                                {collectionCounts.packages > 0 && (
                                    <span className="text-[10px] font-medium bg-amber-400/25 text-amber-100 px-1.5 py-0.5 rounded-[4px] flex items-center gap-1 border border-amber-300/40 shrink-0">
                                        <FaBoxOpen className="w-2 h-2" /> {collectionCounts.packages} Packages
                                    </span>
                                )}
                                {lab.opening_hours && (
                                    <span className="text-[10px] font-normal bg-white/10 text-white/90 px-1.5 py-0.5 rounded-[4px] flex items-center gap-1 border border-white/15 shrink-0">
                                        <FaClock className="w-2 h-2" /> {formatOpeningHours(lab.opening_hours)}
                                    </span>
                                )}
                                {lab.rating && (
                                    <span className="text-[10px] font-medium bg-amber-500/20 text-amber-100 px-1.5 py-0.5 rounded-[4px] flex items-center gap-1 border border-amber-300/30 shrink-0">
                                        <FaStar className="w-2 h-2" /> {lab.rating}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-12 animate-pulse bg-white/10 rounded-md" />
                )}
            </div>

            <div className="w-full">
                {/* ─── MINIMAL, COMPACT FILTER BAR ─── */}
                <div className="bg-white rounded-md border border-slate-200 p-2.5 sm:p-3 mb-3.5 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3 pointer-events-none" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search tests or packages (e.g. CBC, Vitamin D, Thyroid, X-Ray)..."
                                className="w-full pl-8 pr-7 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0067A1] text-xs font-normal transition-all"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => setSearchInput("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                    title="Clear search"
                                >
                                    <FaTimes className="w-2.5 h-2.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <select
                                value={priceFilter}
                                onChange={(e) => setPriceFilter(e.target.value)}
                                aria-label="Filter by price range"
                                className="flex-1 sm:w-32 px-2 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-[11px] font-normal text-slate-700 focus:outline-none focus:border-[#0067A1] cursor-pointer"
                            >
                                {PRICE_OPTIONS.map(opt => (
                                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                                ))}
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                aria-label="Sort tests"
                                className="flex-1 sm:w-36 px-2 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-[11px] font-normal text-slate-700 focus:outline-none focus:border-[#0067A1] cursor-pointer"
                            >
                                {SORT_OPTIONS.map(opt => (
                                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                                ))}
                            </select>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetAllFilters}
                                    className="px-2.5 py-1.5 rounded-[5px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-medium transition-colors cursor-pointer shrink-0"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Mode Scrollable Row + View Toggle */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div
                            ref={modeScrollRef}
                            onWheel={e => {
                                if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
                            }}
                            className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar scroll-smooth flex-1 min-w-0"
                        >
                            <button
                                type="button"
                                onClick={() => setCollectionFilter("all")}
                                className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 shrink-0 border whitespace-nowrap ${
                                    collectionFilter === "all"
                                        ? "bg-[#0067A1] text-white border-[#0067A1]"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                <span>All</span>
                                <span className={`text-[10px] px-1 rounded-[3px] font-normal ${
                                    collectionFilter === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                }`}>
                                    {collectionCounts.all}
                                </span>
                            </button>

                            {collectionCounts.packages > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCollectionFilter(collectionFilter === "packages" ? "all" : "packages");
                                        setDepartmentFilter("all");
                                    }}
                                    className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 shrink-0 border whitespace-nowrap ${
                                        collectionFilter === "packages"
                                            ? "bg-amber-600 text-white border-amber-600"
                                            : "bg-amber-50/80 text-amber-800 border-amber-200 hover:bg-amber-100/80"
                                    }`}
                                >
                                    <FaBoxOpen className="w-2.5 h-2.5 shrink-0" />
                                    <span>Packages</span>
                                    <span className={`text-[10px] px-1 rounded-[3px] font-normal ${
                                        collectionFilter === "packages" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                                    }`}>
                                        {collectionCounts.packages}
                                    </span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setCollectionFilter("home")}
                                className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 shrink-0 border whitespace-nowrap ${
                                    collectionFilter === "home"
                                        ? "bg-[#059669] text-white border-[#059669]"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                                }`}
                            >
                                <FaTruck className="w-2.5 h-2.5 shrink-0" />
                                <span>Home</span>
                                <span className={`text-[10px] px-1 rounded-[3px] font-normal ${
                                    collectionFilter === "home" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                                }`}>
                                    {collectionCounts.home}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setCollectionFilter("lab")}
                                className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 shrink-0 border whitespace-nowrap ${
                                    collectionFilter === "lab"
                                        ? "bg-[#0067A1] text-white border-[#0067A1]"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-[#0067A1]"
                                }`}
                            >
                                <FaHospital className="w-2.5 h-2.5 shrink-0" />
                                <span>Lab Visit</span>
                                <span className={`text-[10px] px-1 rounded-[3px] font-normal ${
                                    collectionFilter === "lab" ? "bg-white/20 text-white" : "bg-sky-50 text-[#0067A1]"
                                }`}>
                                    {collectionCounts.lab}
                                </span>
                            </button>
                        </div>

                        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-[5px] border border-slate-200 shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewMode("grid")}
                                className={`p-1 rounded-[3px] text-xs transition-all cursor-pointer ${
                                    viewMode === "grid"
                                        ? "bg-white text-[#0067A1] shadow-2xs"
                                        : "text-slate-400 hover:text-slate-700"
                                }`}
                                title="Grid View"
                            >
                                <FaThLarge className="w-2.5 h-2.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("list")}
                                className={`p-1 rounded-[3px] text-xs transition-all cursor-pointer ${
                                    viewMode === "list"
                                        ? "bg-white text-[#0067A1] shadow-2xs"
                                        : "text-slate-400 hover:text-slate-700"
                                }`}
                                title="List View"
                            >
                                <FaList className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    </div>

                    {/* Row 3: Department Scrollable Row */}
                    {departmentOptions.length > 0 && (
                        <div className="flex items-center gap-1 pt-2 border-t border-slate-100 min-w-0">
                            <button
                                type="button"
                                onClick={() => scrollHorizontal(deptScrollRef, -200)}
                                className="hidden sm:flex w-5 h-5 rounded-[4px] bg-slate-100 hover:bg-slate-200 text-slate-600 items-center justify-center shrink-0 cursor-pointer"
                                title="Scroll left"
                            >
                                <FaChevronLeft className="w-2 h-2" />
                            </button>
                            <div
                                ref={deptScrollRef}
                                onWheel={e => {
                                    if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
                                }}
                                className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar scroll-smooth flex-1 min-w-0"
                            >
                                <button
                                    type="button"
                                    onClick={() => setDepartmentFilter("all")}
                                    className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-colors cursor-pointer shrink-0 border whitespace-nowrap ${
                                        departmentFilter === "all"
                                            ? "bg-slate-800 text-white border-slate-800"
                                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                    }`}
                                >
                                    All Depts
                                </button>
                                {departmentOptions.map(dept => {
                                    const isPkgDept = dept.name === "Health Packages";
                                    const isSelected = departmentFilter === dept.name;
                                    return (
                                        <button
                                            key={dept.name}
                                            type="button"
                                            onClick={() => setDepartmentFilter(dept.name)}
                                            className={`px-2.5 py-1 rounded-[5px] text-[11px] transition-colors cursor-pointer shrink-0 border flex items-center gap-1 whitespace-nowrap ${
                                                isSelected
                                                    ? isPkgDept
                                                        ? "bg-amber-600 text-white border-amber-600 font-medium"
                                                        : "bg-[#0067A1] text-white border-[#0067A1] font-medium"
                                                    : isPkgDept
                                                        ? "bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100/70 font-medium"
                                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-normal"
                                            }`}
                                        >
                                            {isPkgDept && <FaBoxOpen className="w-2.5 h-2.5 shrink-0" />}
                                            <span>{dept.name}</span>
                                            <span className={`text-[10px] px-1 rounded-[3px] ${
                                                isSelected
                                                    ? "bg-white/20 text-white"
                                                    : isPkgDept
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-slate-100 text-slate-500"
                                            }`}>
                                                {dept.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                onClick={() => scrollHorizontal(deptScrollRef, 200)}
                                className="hidden sm:flex w-5 h-5 rounded-[4px] bg-slate-100 hover:bg-slate-200 text-slate-600 items-center justify-center shrink-0 cursor-pointer"
                                title="Scroll right"
                            >
                                <FaChevronRight className="w-2 h-2" />
                            </button>
                        </div>
                    )}
                </div>

                {/* ─── COMPACT HORIZONTAL HEALTH PACKAGES SLIDER ─── */}
                {showPackageSlider && (
                    <div className="mb-4 bg-white rounded-md border border-slate-200 p-2.5 sm:p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-5 h-5 rounded-[4px] bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                                    <FaBoxOpen className="w-2.5 h-2.5" />
                                </span>
                                <h2 className="text-xs sm:text-[13px] font-semibold text-slate-800 truncate">
                                    Health Packages
                                </h2>
                                <span className="text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-[4px] shrink-0">
                                    {packages.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setCollectionFilter("packages")}
                                    className="text-[11px] font-medium text-[#0067A1] hover:underline mr-1 cursor-pointer"
                                >
                                    View All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollHorizontal(pkgSliderRef, -240)}
                                    className="w-6 h-6 rounded-[4px] bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                                    title="Previous packages"
                                >
                                    <FaChevronLeft className="w-2.5 h-2.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollHorizontal(pkgSliderRef, 240)}
                                    className="w-6 h-6 rounded-[4px] bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                                    title="Next packages"
                                >
                                    <FaChevronRight className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        </div>

                        <div
                            ref={pkgSliderRef}
                            onWheel={e => {
                                if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
                            }}
                            className="flex items-stretch gap-2.5 overflow-x-auto flex-nowrap no-scrollbar scroll-smooth snap-x snap-mandatory pb-0.5"
                        >
                            {packages.map(pkg => {
                                const inCart = isInCart(pkg.id);
                                const mode = pkg._collectionMode || resolveTestCollectionType(pkg);
                                const included = pkg._includedTests || [];

                                return (
                                    <div
                                        key={pkg.id}
                                        className={`w-[210px] sm:w-[230px] shrink-0 snap-start rounded-md border border-t-2 p-2.5 flex flex-col justify-between transition-all ${
                                            inCart
                                                ? "bg-emerald-50/20 border-emerald-500 border-t-emerald-600"
                                                : "bg-slate-50/40 border-slate-200 border-t-[#0067A1] hover:bg-white hover:border-[#0067A1]/50"
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-[3px] bg-amber-50 text-amber-800 border border-amber-200/80">
                                                    {included.length || "Multi"} Tests
                                                </span>
                                                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-[3px] border ${
                                                    mode === "home"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                                        : "bg-sky-50 text-[#0067A1] border-sky-200/80"
                                                }`}>
                                                    {mode === "home" ? "Home" : "Lab"}
                                                </span>
                                            </div>

                                            <h3
                                                onClick={() => setSelectedDetailTest(pkg)}
                                                className="text-xs font-semibold text-slate-800 leading-snug line-clamp-1 hover:text-[#0067A1] cursor-pointer"
                                                title={pkg.test_name}
                                            >
                                                {pkg.test_name}
                                            </h3>

                                            {included.length > 0 && (
                                                <p
                                                    className="text-[10px] text-slate-500 font-normal line-clamp-1 mt-0.5"
                                                    title={included.join(", ")}
                                                >
                                                    {included.join(", ")}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center justify-between gap-1.5">
                                            <span className="text-xs sm:text-[13px] font-semibold text-[#0067A1]">
                                                ₹{Number(pkg.price || 0).toLocaleString()}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedDetailTest(pkg)}
                                                    className="px-1.5 py-1 rounded-[4px] text-[10px] font-medium text-slate-600 hover:text-[#0067A1] bg-white border border-slate-200 cursor-pointer"
                                                    title="Package Details"
                                                >
                                                    Info
                                                </button>
                                                {inCart ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFromCart(pkg.id)}
                                                        className="px-2 py-1 rounded-[4px] text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                                    >
                                                        Added
                                                    </button>
                                                ) : addingId === pkg.id ? (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="px-2 py-1 rounded-[4px] text-[10px] font-medium bg-[#0067A1]/80 text-white cursor-wait"
                                                    >
                                                        ...
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => addToCart(pkg)}
                                                        className="px-2 py-1 rounded-[4px] text-[10px] font-medium bg-[#0067A1] text-white hover:bg-[#004F7C] cursor-pointer"
                                                    >
                                                        + Add
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── DIAGNOSTIC TESTS HEADER ─── */}
                <div className="flex items-center justify-between mb-2 px-0.5">
                    <h2 className="text-xs sm:text-[13px] font-semibold text-slate-700">
                        {collectionFilter === "packages" || departmentFilter === "Health Packages"
                            ? "Health Checkup Packages"
                            : "Diagnostic Tests"}
                    </h2>
                    <span className="text-[11px] text-slate-500 font-normal">
                        Showing <span className="font-medium text-slate-800">{tests.length}</span> of {totalTests}
                    </span>
                </div>

                {/* ─── PAGINATED TEST CATALOG ─── */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="bg-white rounded-md border border-slate-200 p-3 h-32 animate-pulse flex flex-col justify-between">
                                <div className="flex justify-between">
                                    <div className="h-3.5 bg-slate-200 rounded w-20" />
                                    <div className="h-3.5 bg-slate-200 rounded w-12" />
                                </div>
                                <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                                <div className="h-7 bg-slate-200 rounded" />
                            </div>
                        ))}
                    </div>
                ) : tests.length === 0 ? (
                    <div className="bg-white rounded-md border border-slate-200 p-8 text-center">
                        <FaSearch className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                        <h3 className="font-medium text-slate-800 text-xs sm:text-sm">No Matching Tests Found</h3>
                        <p className="text-slate-500 text-[11px] mt-0.5 font-normal">
                            Try adjusting your search query, mode, or department filter.
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetAllFilters}
                                className="mt-3 px-3 py-1.5 bg-[#0067A1] text-white rounded-[5px] text-xs font-medium hover:bg-[#005282] transition-colors cursor-pointer"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {viewMode === "grid" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                {tests.map((test) => {
                                    const inCart = isInCart(test.id);
                                    const mode = test._collectionMode;

                                    return (
                                        <div
                                            key={test.id}
                                            className={`bg-white rounded-md border p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-150 ${
                                                inCart
                                                    ? "border-emerald-500 bg-emerald-50/10"
                                                    : "border-slate-200 hover:border-[#0067A1]/50"
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                                    {mode === "home" ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-[3px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                                                            <FaTruck className="w-2 h-2 text-emerald-600" />
                                                            <span>Home</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-[3px] bg-sky-50 text-[#0067A1] border border-sky-200/80 shrink-0">
                                                            <FaHospital className="w-2 h-2 text-[#0067A1]" />
                                                            <span>Lab Visit</span>
                                                        </span>
                                                    )}

                                                    {test.test_code && (
                                                        <span className="text-[10px] font-mono font-normal text-slate-400 truncate max-w-[85px]">
                                                            #{test.test_code}
                                                        </span>
                                                    )}
                                                </div>

                                                <h3
                                                    onClick={() => setSelectedDetailTest(test)}
                                                    className="text-xs sm:text-[13px] font-medium text-slate-800 leading-snug line-clamp-2 hover:text-[#0067A1] cursor-pointer transition-colors"
                                                    title={test.test_name}
                                                >
                                                    {test.test_name}
                                                </h3>

                                                {test._isPkg && test._includedTests?.length > 0 ? (
                                                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">
                                                        Includes: {test._includedTests.join(", ")}
                                                    </p>
                                                ) : (
                                                    <div className="mt-1.5 flex items-center justify-between gap-1.5 text-[10px] text-slate-500">
                                                        <span className="flex items-center gap-1 truncate">
                                                            <FaVial className="w-2 h-2 text-[#0067A1] shrink-0" />
                                                            <span className="truncate">{test._sampleLabel}</span>
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 truncate max-w-[105px]">
                                                            {test._deptLabel}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                                <span className="text-[13px] sm:text-sm font-semibold text-[#0067A1] leading-none">
                                                    ₹{Number(test.price || 0).toLocaleString()}
                                                </span>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedDetailTest(test)}
                                                        className="px-2 py-1 rounded-[4px] text-[10px] font-medium text-slate-600 hover:text-[#0067A1] bg-slate-50 hover:bg-sky-50 border border-slate-200 transition-colors cursor-pointer"
                                                    >
                                                        Info
                                                    </button>

                                                    {inCart ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFromCart(test.id)}
                                                            className="px-2.5 py-1 rounded-[4px] text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <FaCheckCircle className="w-2 h-2" />
                                                            <span>Added</span>
                                                        </button>
                                                    ) : addingId === test.id ? (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="px-2.5 py-1 rounded-[4px] text-[10px] font-medium bg-[#0067A1]/85 text-white flex items-center gap-1 cursor-wait"
                                                        >
                                                            <FaSpinner className="w-2 h-2 animate-spin" />
                                                            <span>Adding</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => addToCart(test)}
                                                            className="px-2.5 py-1 rounded-[4px] text-[10px] font-medium bg-[#0067A1] text-white hover:bg-[#004F7C] transition-all flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <FaPlus className="w-2 h-2" />
                                                            <span>Add</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {tests.map((test) => {
                                    const inCart = isInCart(test.id);
                                    const mode = test._collectionMode;

                                    return (
                                        <div
                                            key={test.id}
                                            className={`bg-white rounded-md border px-3 py-2 flex items-center justify-between gap-2.5 transition-all ${
                                                inCart
                                                    ? "border-emerald-500 bg-emerald-50/10"
                                                    : "border-slate-200 hover:border-[#0067A1]/50"
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded-[3px] border ${
                                                        mode === "home"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : "bg-sky-50 text-[#0067A1] border-sky-200"
                                                    }`}>
                                                        {mode === "home" ? "Home" : "Lab"}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 truncate">
                                                        {test._sampleLabel} • {test._deptLabel}
                                                    </span>
                                                </div>
                                                <h3
                                                    onClick={() => setSelectedDetailTest(test)}
                                                    className="text-xs font-medium text-slate-800 hover:text-[#0067A1] cursor-pointer truncate"
                                                >
                                                    {test.test_name}
                                                </h3>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs sm:text-[13px] font-semibold text-[#0067A1]">
                                                    ₹{Number(test.price || 0).toLocaleString()}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedDetailTest(test)}
                                                    className="px-2 py-1 rounded-[4px] text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 cursor-pointer"
                                                >
                                                    Info
                                                </button>
                                                {inCart ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFromCart(test.id)}
                                                        className="px-2.5 py-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[4px] cursor-pointer"
                                                    >
                                                        Added
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => addToCart(test)}
                                                        className="px-2.5 py-1 text-[10px] font-medium bg-[#0067A1] text-white hover:bg-[#004F7C] rounded-[4px] cursor-pointer"
                                                    >
                                                        + Add
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ─── API-BASED LOAD MORE PAGINATION ─── */}
                        {hasMore && (
                            <div className="mt-5 flex flex-col items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="px-5 py-2 rounded-[5px] bg-white hover:bg-[#0067A1] text-[#0067A1] hover:text-white border border-[#0067A1] text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
                                >
                                    {loadingMore ? (
                                        <>
                                            <FaSpinner className="w-3 h-3 animate-spin" />
                                            <span>Loading...</span>
                                        </>
                                    ) : (
                                        <span>Load More ({totalTests - tests.length} remaining)</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ─── TEST / PACKAGE DETAILS MODAL (PORTALED, NO BLUR COMPOSITING BLINK) ─── */}
            {mounted && typeof document !== "undefined" && selectedDetailTest && createPortal(
                <div
                    className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 touch-none overscroll-contain"
                    onClick={() => setSelectedDetailTest(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden border border-slate-200"
                    >
                        <div className="p-3.5 sm:p-4 bg-[#0067A1] text-white flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    {selectedDetailTest._isPkg && (
                                        <span className="text-[10px] font-medium bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-[3px] flex items-center gap-1">
                                            <FaBoxOpen className="w-2.5 h-2.5" /> Health Package
                                        </span>
                                    )}
                                    {selectedDetailTest.test_code && (
                                        <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded-[3px]">
                                            #{selectedDetailTest.test_code}
                                        </span>
                                    )}
                                    <span className="text-[10px] font-medium bg-white/20 px-1.5 py-0.5 rounded-[3px]">
                                        {(selectedDetailTest._collectionMode || resolveTestCollectionType(selectedDetailTest)) === "lab"
                                            ? "Lab Visit"
                                            : "Home & Lab Collection"}
                                    </span>
                                </div>
                                <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">
                                    {selectedDetailTest.test_name}
                                </h3>
                                <p className="text-base font-semibold text-white mt-0.5">
                                    ₹{Number(selectedDetailTest.price).toLocaleString()}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDetailTest(null)}
                                className="p-1.5 rounded-md text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
                            >
                                <FaTimes className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="p-3.5 sm:p-4 max-h-[60vh] overflow-y-auto space-y-3">
                            {selectedDetailTest._isPkg && selectedDetailTest._includedTests?.length > 0 ? (
                                <div className="bg-sky-50/70 border border-sky-200/80 rounded-md p-2.5">
                                    <p className="text-[11px] font-semibold text-[#0067A1] mb-1.5 flex items-center gap-1.5">
                                        <FaBoxOpen className="w-3 h-3" />
                                        <span>Included Tests ({selectedDetailTest._includedTests.length} Parameters)</span>
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                        {selectedDetailTest._includedTests.map((param, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-white border border-slate-200/80 rounded-[4px] px-2 py-1 text-[11px] text-slate-700 flex items-center gap-1.5"
                                            >
                                                <FaCheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                                <span className="truncate" title={param}>{param}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : selectedDetailTest.remarks ? (
                                <div className="bg-sky-50 border border-sky-100 rounded-md p-2.5">
                                    <p className="text-[10px] font-medium text-[#0067A1] uppercase tracking-wider mb-0.5">
                                        Instructions & Notes
                                    </p>
                                    <p className="text-xs text-slate-700 leading-relaxed font-normal">
                                        {selectedDetailTest.remarks}
                                    </p>
                                </div>
                            ) : null}

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase">Collection Mode</p>
                                    <p className="font-medium text-slate-800 mt-0.5">
                                        {(selectedDetailTest._collectionMode || resolveTestCollectionType(selectedDetailTest)) === "lab"
                                            ? "Lab Visit Required"
                                            : "Home / Lab Visit"}
                                    </p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase">Sample / Modality</p>
                                    <p className="font-medium text-slate-800 mt-0.5">
                                        {selectedDetailTest._sampleLabel || resolveTestSampleLabel(selectedDetailTest)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase">Department</p>
                                    <p className="font-medium text-slate-800 mt-0.5">
                                        {selectedDetailTest._deptLabel || resolveTestDepartment(selectedDetailTest)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase">Report Time</p>
                                    <p className="font-medium text-slate-800 mt-0.5">
                                        {selectedDetailTest.turnaround_time || selectedDetailTest.reporting_schedule || "Same / Next Day"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setSelectedDetailTest(null)}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                                Close
                            </button>
                            {isInCart(selectedDetailTest.id) ? (
                                <button
                                    type="button"
                                    onClick={() => { removeFromCart(selectedDetailTest.id); setSelectedDetailTest(null); }}
                                    className="px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-[5px] text-xs font-medium hover:bg-rose-100 transition-colors cursor-pointer"
                                >
                                    Remove
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await addToCart(selectedDetailTest);
                                        setSelectedDetailTest(null);
                                    }}
                                    className="px-3.5 py-1.5 bg-[#0067A1] text-white rounded-[5px] text-xs font-medium hover:bg-[#005282] transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                    <FaPlus className="w-2.5 h-2.5" /> Add
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─── FLOATING CART BUTTON (FAB) ─── */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="fixed bottom-18 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-auto z-50"
                    >
                        <button
                            type="button"
                            onClick={() => setShowCart(true)}
                            className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 bg-[#0067A1] text-white px-3.5 py-2 rounded-md shadow-lg border border-white/20 cursor-pointer hover:bg-[#005282] transition-all"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="relative">
                                    <div className="w-7 h-7 rounded-[4px] bg-white/20 flex items-center justify-center">
                                        <FaShoppingCart className="w-3 h-3 text-white" />
                                    </div>
                                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-semibold px-1 rounded-full min-w-3.5 h-3.5 flex items-center justify-center">
                                        {cart.length}
                                    </span>
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-normal text-white/80 leading-none">
                                        {cart.length} {cart.length === 1 ? "Test" : "Tests"}
                                    </p>
                                    <p className="text-xs sm:text-sm font-semibold text-white leading-tight mt-0.5">
                                        ₹{totalAmount.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-[4px] flex items-center gap-1 text-[11px] font-medium text-white transition-colors">
                                <span>View Cart</span>
                                <FaArrowRight className="w-2.5 h-2.5" />
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── SLIDE-OVER CART DRAWER ─── */}
            {mounted && typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                    {showCart && (
                        <div className="fixed inset-0 z-[9999999] flex justify-end">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
                                onClick={() => setShowCart(false)}
                            />

                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                                className="relative z-10 w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="px-4 py-3 bg-[#0067A1] text-white flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-[5px] bg-white/20 flex items-center justify-center border border-white/25 shrink-0">
                                            <FaShoppingCart className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-white text-sm leading-tight">Your Cart</h3>
                                                <span className="px-1.5 py-0.2 rounded-[3px] bg-white/20 text-white text-[10px] font-medium shrink-0">
                                                    {cart.length} {cart.length === 1 ? "Item" : "Items"}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-white/80 font-normal truncate max-w-[220px]">
                                                {lab?.lab_name || "Diagnostic Laboratory"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {cart.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm("Empty your cart?")) {
                                                        setCart([]);
                                                        localStorage.removeItem(CART_KEY);
                                                        toast.success("Cart cleared");
                                                    }
                                                }}
                                                className="px-2 py-1 rounded-[4px] text-white/80 hover:text-white hover:bg-white/15 text-[11px] font-medium transition-all cursor-pointer"
                                            >
                                                Clear
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowCart(false)}
                                            className="w-7 h-7 rounded-[5px] bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer"
                                            aria-label="Close Cart"
                                        >
                                            <FaTimes className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/70">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                                            <div className="w-12 h-12 rounded-md bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0067A1] mb-2.5">
                                                <FaShoppingCart className="w-5 h-5 text-[#0067A1]/40" />
                                            </div>
                                            <h4 className="text-xs sm:text-sm font-semibold text-slate-800">Your Cart is Empty</h4>
                                            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed font-normal">
                                                Browse the test catalog and add tests to schedule your booking.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-white border border-slate-200 rounded-md p-2.5 space-y-2">
                                                <p className="text-[11px] font-medium text-slate-800">Select Collection Mode</p>
                                                {cartHasLabOnlyTest && (
                                                    <p className="text-[10px] font-normal text-amber-800 bg-amber-50 border border-amber-200 rounded-[4px] px-2 py-1">
                                                        Cart includes an In-Lab test that requires a Lab Visit.
                                                    </p>
                                                )}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={cartHasLabOnlyTest}
                                                        onClick={() => {
                                                            setVisitType("home_collection");
                                                            saveCart({ lab_id: labId, lab_name: lab?.lab_name || "Lab", tests: cart, visit_type: "home_collection" });
                                                        }}
                                                        className={`p-2 rounded-[5px] border text-left transition-all flex items-center gap-2 ${
                                                            cartHasLabOnlyTest
                                                                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                                                                : visitType === "home_collection"
                                                                    ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1] cursor-pointer"
                                                                    : "border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                                        }`}
                                                    >
                                                        <FaTruck className="w-3 h-3 shrink-0" />
                                                        <div>
                                                            <p className="text-[11px] font-medium leading-tight">Home Collection</p>
                                                            <p className="text-[9px] text-emerald-600 font-normal">Free Doorstep</p>
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setVisitType("walk_in");
                                                            saveCart({ lab_id: labId, lab_name: lab?.lab_name || "Lab", tests: cart, visit_type: "walk_in" });
                                                        }}
                                                        className={`p-2 rounded-[5px] border text-left transition-all cursor-pointer flex items-center gap-2 ${
                                                            visitType === "walk_in"
                                                                ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                                                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                    >
                                                        <FaHome className="w-3 h-3 shrink-0" />
                                                        <div>
                                                            <p className="text-[11px] font-medium leading-tight">Lab Visit</p>
                                                            <p className="text-[9px] text-slate-500 font-normal">Walk-in Center</p>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {cart.map((item) => {
                                                    const mode = item.collection_type || "home";
                                                    const specimen = item.specimen_type;
                                                    const code = item.test_code;

                                                    return (
                                                        <div
                                                            key={item.test_id}
                                                            className="bg-white rounded-md p-2.5 border border-slate-200 flex items-center justify-between gap-2.5"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="text-xs font-medium text-slate-800 truncate">
                                                                    {item.test_name}
                                                                </h4>
                                                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                                                    <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded-[3px] ${
                                                                        mode === "lab"
                                                                            ? "bg-sky-50 text-[#0067A1]"
                                                                            : "bg-emerald-50 text-emerald-700"
                                                                    }`}>
                                                                        {mode === "lab" ? "Lab" : "Home"}
                                                                    </span>
                                                                    {specimen && (
                                                                        <span className="text-[9px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-[3px]">
                                                                            {specimen}
                                                                        </span>
                                                                    )}
                                                                    {code && (
                                                                        <span className="text-[9px] font-mono text-slate-400">
                                                                            #{code}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-xs font-semibold text-[#0067A1]">
                                                                    ₹{item.price.toLocaleString()}
                                                                </span>
                                                                <button
                                                                    onClick={() => removeFromCart(item.test_id)}
                                                                    className="w-6 h-6 rounded-[4px] bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                                                    title="Remove"
                                                                >
                                                                    <FaTrash className="w-2.5 h-2.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {cart.length > 0 && (
                                    <div className="border-t border-slate-200 bg-white p-3.5 space-y-2.5 shrink-0">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-600">
                                                Total ({cart.length} {cart.length === 1 ? "item" : "items"})
                                            </span>
                                            <span className="text-sm font-semibold text-[#0067A1]">
                                                ₹{totalAmount.toLocaleString()}
                                            </span>
                                        </div>

                                        <button
                                            onClick={handleProceed}
                                            className="w-full py-2 bg-[#0067A1] hover:bg-[#005282] text-white rounded-[5px] font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <span>Proceed to Checkout</span>
                                            <FaArrowRight className="w-2.5 h-2.5" />
                                        </button>
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
