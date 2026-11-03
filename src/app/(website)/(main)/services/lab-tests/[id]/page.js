"use client";

import { useState, useEffect, use, useRef, useCallback, Suspense } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
    FaSearch, FaArrowLeft, FaMapMarkerAlt, FaShoppingCart,
    FaPlus, FaTrash, FaClock, FaCheckCircle, FaTimes,
    FaVial, FaThermometerHalf, FaClipboardList,
    FaTruck, FaStar, FaShieldAlt, FaThLarge, FaList,
    FaSpinner, FaArrowRight, FaHospital, FaBoxOpen,
    FaChevronLeft, FaChevronRight
} from "react-icons/fa";
import Link from "next/link";
import toast from "react-hot-toast";
import {
    resolveTestCollectionType,
    resolveTestDepartment,
    resolveTestSampleLabel,
    isHealthPackage,
    extractPackageTests
} from "@/lib/labSearchHelper";

import LoginModal from "@/components/public-site/auth/LoginModal";
import SignupModal from "@/components/public-site/auth/SignupModal";

const CART_KEY = "lab_test_cart";
const PAGE_LIMIT = 24;

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
    if (name.includes("prl")) return "/images/labs/prl-logo.svg";
    if (name.includes("medplus")) return "/images/labs/medplus-logo.svg";
    if (name.includes("apex")) return "/images/labs/apex-logo.svg";
    if (name.includes("om sai") || name.includes("omsai")) return "/images/labs/omsai-logo.svg";
    if (name.includes("suburban")) return "/images/labs/suburban-logo.svg";
    if (
        lab.profile_picture &&
        !lab.profile_picture.includes("randomuser.me") &&
        !lab.profile_picture.includes("ui-avatars.com")
    ) {
        return lab.profile_picture;
    }
    return "/images/labs/default-lab-logo.svg";
}

const PRICE_FILTERS = [
    { id: "all", label: "All Prices" },
    { id: "under_500", label: "Under ₹500" },
    { id: "500_1500", label: "₹500 – ₹1,500" },
    { id: "1500_3000", label: "₹1,500 – ₹3,000" },
    { id: "above_3000", label: "Above ₹3,000" },
];

function enrichTestRow(t) {
    return {
        ...t,
        is_pkg: isHealthPackage(t),
        included_tests: extractPackageTests(t),
        resolved_collection: resolveTestCollectionType(t),
        resolved_department: t.department || resolveTestDepartment(t),
        resolved_sample: resolveTestSampleLabel(t),
    };
}

function PublicLabTestsContent({ labId }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialSearch = searchParams?.get("search") || "";

    const [lab, setLab] = useState(null);
    const [tests, setTests] = useState([]);
    const [packages, setPackages] = useState([]);
    const [collectionCounts, setCollectionCounts] = useState({ all: 0, home: 0, lab: 0, packages: 0 });
    const [departmentOptions, setDepartmentOptions] = useState([]);

    const [initialLoading, setInitialLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalTests, setTotalTests] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    const [searchInput, setSearchInput] = useState(initialSearch);
    const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
    const [collectionFilter, setCollectionFilter] = useState("all"); // "all" | "packages" | "home" | "lab"
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [sortBy, setSortBy] = useState("name_asc"); // "name_asc" | "price_asc" | "price_desc"

    const [cart, setCart] = useState([]);
    const [visitType, setVisitType] = useState("home_collection");
    const [showCartDrawer, setShowCartDrawer] = useState(false);
    const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
    const [selectedDetailTest, setSelectedDetailTest] = useState(null);
    const [addingId, setAddingId] = useState(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState(false);
    const [mounted, setMounted] = useState(false);

    const modeScrollRef = useRef(null);
    const deptScrollRef = useRef(null);
    const pkgSliderRef = useRef(null);
    const hasLoadedOnceRef = useRef(false);

    const scrollHorizontal = (ref, amount) => {
        if (ref?.current) {
            ref.current.scrollBy({ left: amount, behavior: "smooth" });
        }
    };

    useEffect(() => {
        setMounted(true);
        const existingCart = getCart();
        if (existingCart && existingCart.lab_id === labId) {
            setCart(existingCart.tests || []);
            if (existingCart.visit_type) setVisitType(existingCart.visit_type);
        }
    }, [labId]);

    // Debounce search input by 250ms only when value actually changes
    useEffect(() => {
        const trimmed = searchInput.trim();
        if (trimmed === debouncedSearch) return;
        const timer = setTimeout(() => {
            setDebouncedSearch(trimmed);
        }, 250);
        return () => clearTimeout(timer);
    }, [searchInput, debouncedSearch]);

    // Fetch paginated tests (and lab profile on first load in parallel to prevent multi-stage layout blink)
    const fetchTestsPage = useCallback(async (targetPage, append = false) => {
        if (append) {
            setLoadingMore(true);
        } else if (!hasLoadedOnceRef.current) {
            setInitialLoading(true);
        } else {
            setIsFiltering(true);
        }

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

            if (!hasLoadedOnceRef.current) {
                const [labRes, testsRes] = await Promise.all([
                    fetch(`/api/patient/lab/labs/${labId}`).then(r => r.json()).catch(() => null),
                    fetch(`/api/patient/lab/labs/${labId}/tests?${qs.toString()}`).then(r => r.json())
                ]);

                if (labRes?.success) {
                    setLab(labRes.data);
                }
                if (testsRes?.success) {
                    const incomingTests = (testsRes.data?.tests || []).map(enrichTestRow);
                    setTests(incomingTests);
                    setTotalTests(testsRes.data?.total || 0);
                    setHasMore(Boolean(testsRes.data?.pagination?.hasMore));
                    setPage(targetPage);
                    if (testsRes.data?.counts) setCollectionCounts(testsRes.data.counts);
                    if (testsRes.data?.departments) setDepartmentOptions(testsRes.data.departments);
                    if (testsRes.data?.packages) {
                        setPackages(testsRes.data.packages.map(enrichTestRow));
                    }
                }
                hasLoadedOnceRef.current = true;
            } else {
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
            }
        } catch {
            toast.error("Failed to load tests");
        } finally {
            setInitialLoading(false);
            setIsFiltering(false);
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

    // Only lock vertical scroll for the slide-over cart drawer to avoid body layout shift/blink on info popups
    useEffect(() => {
        if (showCartDrawer) {
            document.body.style.overflowY = "hidden";
        } else {
            document.body.style.overflowY = "";
        }
        return () => {
            document.body.style.overflowY = "";
        };
    }, [showCartDrawer]);

    const hasActiveFilters =
        Boolean(searchInput.trim()) ||
        collectionFilter !== "all" ||
        departmentFilter !== "all" ||
        priceFilter !== "all" ||
        sortBy !== "name_asc";

    const resetFilters = () => {
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
        await new Promise(r => setTimeout(r, 150));
        const colType = test.resolved_collection || resolveTestCollectionType(test);
        const newCart = [
            ...cart,
            {
                test_id: test.id,
                test_name: test.test_name,
                price: parseFloat(test.price),
                category_name: test.resolved_department || test.category?.name || test.category_name,
                specimen_type: test.resolved_sample || test.specimen_type,
                collection_type: colType,
                test_code: test.test_code
            }
        ];
        const nextVisitType = colType === "lab" ? "walk_in" : visitType;
        if (colType === "lab" && visitType !== "walk_in") {
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
        if (newCart.length === 0) localStorage.removeItem(CART_KEY);
        else saveCart({ lab_id: labId, lab_name: lab?.lab_name || "Lab", tests: newCart, visit_type: visitType });
    };

    const totalAmount = cart.reduce((s, t) => s + t.price, 0);
    const hasLabOnlyItemInCart = cart.some(item => item.collection_type === "lab");

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

    const showPackageSlider =
        packages.length > 0 &&
        collectionFilter !== "packages" &&
        (departmentFilter === "all" || departmentFilter === "Health Packages");

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
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

            {/* ─── Minimal Lab Identity Header ─── */}
            <div className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
                    <Link href="/services/lab-tests"
                        className="inline-flex items-center gap-1 text-[#0067A1] hover:text-[#0B3A5B] text-[11px] font-medium mb-2 transition-colors">
                        <FaArrowLeft className="w-2.5 h-2.5" />
                        <span>All Labs</span>
                    </Link>

                    {lab ? (
                        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden p-1">
                                <img
                                    src={getLabLogo(lab)}
                                    alt={lab.lab_name}
                                    className="w-full h-full object-contain"
                                    onError={e => { e.target.src = "/images/labs/default-lab-logo.svg"; }}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h1 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 truncate">
                                        {lab.lab_name}
                                    </h1>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-[4px] border border-emerald-200 shrink-0">
                                        <FaShieldAlt className="w-2 h-2 text-emerald-600" /> Verified
                                    </span>
                                </div>
                                {lab.address && (
                                    <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5 truncate font-normal">
                                        <FaMapMarkerAlt className="w-2.5 h-2.5 text-[#0067A1] shrink-0" />
                                        <span className="truncate">{lab.address}</span>
                                    </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto flex-nowrap no-scrollbar">
                                    {lab.rating && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-[4px] border border-amber-200/80 shrink-0">
                                            <FaStar className="w-2 h-2 text-amber-500" /> {lab.rating}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-[4px] border border-emerald-200 shrink-0">
                                        <FaTruck className="w-2 h-2" /> {collectionCounts.home} Home
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-sky-50 text-[#0067A1] px-1.5 py-0.5 rounded-[4px] border border-sky-200 shrink-0">
                                        <FaHospital className="w-2 h-2" /> {collectionCounts.lab} Lab
                                    </span>
                                    {collectionCounts.packages > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-[4px] border border-amber-200 shrink-0">
                                            <FaBoxOpen className="w-2 h-2 text-amber-600" /> {collectionCounts.packages} Packages
                                        </span>
                                    )}
                                    {lab.opening_hours && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-normal bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded-[4px] border border-slate-200 shrink-0">
                                            <FaClock className="w-2 h-2 text-slate-400" /> {formatOpeningHours(lab.opening_hours)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2.5 sm:gap-3.5 h-[58px]">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-slate-100 shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-4 bg-slate-100 rounded w-40" />
                                <div className="h-3 bg-slate-100 rounded w-56" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
                {/* ─── MINIMAL, COMPACT FILTER BAR ─── */}
                <div className="bg-white rounded-md border border-slate-200 p-2.5 sm:p-3 mb-3.5 space-y-2">
                    {/* Row 1: Search + Compact Selects */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder="Search tests or packages (e.g. CBC, Vitamin D, Thyroid, X-Ray)..."
                                className="w-full pl-8 pr-7 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0067A1] focus:outline-none text-xs font-normal transition-colors"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => setSearchInput("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                                    title="Clear search"
                                >
                                    <FaTimes className="w-2.5 h-2.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <select
                                value={priceFilter}
                                onChange={e => setPriceFilter(e.target.value)}
                                className="flex-1 sm:w-32 px-2 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-normal focus:outline-none focus:border-[#0067A1] cursor-pointer"
                            >
                                {PRICE_FILTERS.map(pf => (
                                    <option key={pf.id} value={pf.id}>{pf.label}</option>
                                ))}
                            </select>

                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="flex-1 sm:w-36 px-2 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-normal focus:outline-none focus:border-[#0067A1] cursor-pointer"
                            >
                                <option value="name_asc">Sort: Name (A–Z)</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                            </select>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
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
                            className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar flex-1 min-w-0"
                        >
                            <button
                                type="button"
                                onClick={() => setCollectionFilter("all")}
                                className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 border whitespace-nowrap ${
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
                                    className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 border whitespace-nowrap ${
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
                                className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 border whitespace-nowrap ${
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
                                className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 border whitespace-nowrap ${
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
                                className={`p-1 rounded-[3px] text-xs transition-colors cursor-pointer ${
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
                                className={`p-1 rounded-[3px] text-xs transition-colors cursor-pointer ${
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
                                className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar flex-1 min-w-0"
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
                            className="flex items-stretch gap-2.5 overflow-x-auto flex-nowrap no-scrollbar snap-x snap-mandatory pb-0.5"
                        >
                            {packages.map(pkg => {
                                const inCart = isInCart(pkg.id);
                                const colType = pkg.resolved_collection || resolveTestCollectionType(pkg);
                                const included = pkg.included_tests || [];

                                return (
                                    <div
                                        key={pkg.id}
                                        className={`w-[210px] sm:w-[230px] shrink-0 snap-start rounded-md border border-t-2 p-2.5 flex flex-col justify-between transition-colors ${
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
                                                    colType === "home"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                                        : "bg-sky-50 text-[#0067A1] border-sky-200/80"
                                                }`}>
                                                    {colType === "home" ? "Home" : "Lab"}
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
                    <div className="flex items-center gap-2">
                        <h2 className="text-xs sm:text-[13px] font-semibold text-slate-700">
                            {collectionFilter === "packages" || departmentFilter === "Health Packages"
                                ? "Health Checkup Packages"
                                : "Diagnostic Tests"}
                        </h2>
                        {isFiltering && (
                            <FaSpinner className="w-3 h-3 text-[#0067A1] animate-spin" />
                        )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-normal">
                        Showing <span className="font-medium text-slate-800">{tests.length}</span> of {totalTests}
                    </span>
                </div>

                {/* ─── PAGINATED TEST LISTING ─── */}
                {initialLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-md border border-slate-200 p-3 h-32 flex flex-col justify-between">
                                <div className="flex justify-between">
                                    <div className="h-3.5 bg-slate-100 rounded w-20" />
                                    <div className="h-3.5 bg-slate-100 rounded w-12" />
                                </div>
                                <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                                <div className="h-7 bg-slate-100 rounded" />
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
                                onClick={resetFilters}
                                className="mt-3 px-3 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-medium rounded-[5px] transition-colors cursor-pointer"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={`transition-opacity duration-150 ${isFiltering ? "opacity-60" : "opacity-100"}`}>
                        {viewMode === "grid" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                {tests.map((test) => {
                                    const inCart = isInCart(test.id);
                                    const colType = test.resolved_collection || resolveTestCollectionType(test);
                                    const sampleLabel = test.resolved_sample || resolveTestSampleLabel(test);
                                    const deptLabel = test.resolved_department || resolveTestDepartment(test);

                                    return (
                                        <div
                                            key={test.id}
                                            className={`bg-white rounded-md border p-2.5 sm:p-3 flex flex-col justify-between transition-colors ${
                                                inCart
                                                    ? "border-emerald-500 bg-emerald-50/10"
                                                    : "border-slate-200 hover:border-[#0067A1]/50"
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                                    {colType === "home" ? (
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

                                                {test.is_pkg && test.included_tests?.length > 0 ? (
                                                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">
                                                        Includes: {test.included_tests.join(", ")}
                                                    </p>
                                                ) : (
                                                    <div className="mt-1.5 flex items-center justify-between gap-1.5 text-[10px] text-slate-500">
                                                        <span className="flex items-center gap-1 truncate">
                                                            <FaVial className="w-2 h-2 text-[#0067A1] shrink-0" />
                                                            <span className="truncate">{sampleLabel}</span>
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 truncate max-w-[105px]">
                                                            {deptLabel}
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
                                                        title="View Details"
                                                    >
                                                        Info
                                                    </button>

                                                    {inCart ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFromCart(test.id)}
                                                            className="px-2.5 py-1 rounded-[4px] text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
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
                                                            className="px-2.5 py-1 rounded-[4px] text-[10px] font-medium bg-[#0067A1] text-white hover:bg-[#004F7C] transition-colors flex items-center gap-1 cursor-pointer"
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
                                    const colType = test.resolved_collection || resolveTestCollectionType(test);
                                    const sampleLabel = test.resolved_sample || resolveTestSampleLabel(test);
                                    const deptLabel = test.resolved_department || resolveTestDepartment(test);

                                    return (
                                        <div
                                            key={test.id}
                                            className={`bg-white rounded-md border px-3 py-2 flex items-center justify-between gap-2.5 transition-colors ${
                                                inCart
                                                    ? "border-emerald-500 bg-emerald-50/10"
                                                    : "border-slate-200 hover:border-[#0067A1]/50"
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded-[3px] border ${
                                                        colType === "home"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : "bg-sky-50 text-[#0067A1] border-sky-200"
                                                    }`}>
                                                        {colType === "home" ? "Home" : "Lab"}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 truncate">
                                                        {sampleLabel} • {deptLabel}
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
                    </div>
                )}
            </div>

            {/* ─── FLOATING CART BUTTON (FAB) ─── */}
            {cart.length > 0 && (
                <div className="fixed bottom-18 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-auto z-40">
                    <button
                        type="button"
                        onClick={() => setShowCartDrawer(true)}
                        className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 bg-[#0067A1] text-white px-3.5 py-2 rounded-md shadow-lg border border-white/20 cursor-pointer hover:bg-[#005585] transition-colors"
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
                </div>
            )}

            {/* ─── TEST / PACKAGE DETAILS POPUP MODAL (PORTALED, ZERO LAYOUT SHIFT OR BLINK) ─── */}
            {mounted && typeof document !== "undefined" && selectedDetailTest && createPortal(
                <div
                    className="fixed inset-0 bg-slate-900/60 z-[999999] flex items-center justify-center p-3 sm:p-4 touch-none overscroll-contain"
                    onClick={() => setSelectedDetailTest(null)}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden border border-slate-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-[#0067A1] p-3.5 sm:p-4 text-white flex items-start justify-between gap-3">
                            <div>
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                    {selectedDetailTest.is_pkg && (
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
                                        {(selectedDetailTest.resolved_collection || resolveTestCollectionType(selectedDetailTest)) === "lab"
                                            ? "Lab Visit"
                                            : "Home & Lab Collection"}
                                    </span>
                                </div>
                                <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">
                                    {selectedDetailTest.test_name}
                                </h3>
                                <p className="text-base font-semibold text-white mt-0.5">
                                    ₹{Number(selectedDetailTest.price || 0).toLocaleString()}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDetailTest(null)}
                                className="p-1.5 bg-white/15 hover:bg-white/25 rounded-md text-white cursor-pointer transition-colors"
                            >
                                <FaTimes className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="p-3.5 sm:p-4 space-y-3 max-h-[60vh] overflow-y-auto overscroll-contain">
                            {selectedDetailTest.is_pkg && selectedDetailTest.included_tests?.length > 0 ? (
                                <div className="bg-sky-50/70 border border-sky-200/80 rounded-md p-2.5">
                                    <p className="text-[11px] font-semibold text-[#0067A1] mb-1.5 flex items-center gap-1.5">
                                        <FaBoxOpen className="w-3 h-3" />
                                        <span>Included Tests ({selectedDetailTest.included_tests.length} Parameters)</span>
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                        {selectedDetailTest.included_tests.map((param, idx) => (
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
                                <div className="bg-slate-50 rounded-md p-2 border border-slate-200/80">
                                    <p className="text-[10px] text-slate-400 font-medium uppercase">Collection Mode</p>
                                    <p className="font-medium text-slate-800 mt-0.5">
                                        {(selectedDetailTest.resolved_collection || resolveTestCollectionType(selectedDetailTest)) === "lab"
                                            ? "Lab Visit Required"
                                            : "Home / Lab Visit"}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-md p-2 border border-slate-200/80">
                                    <p className="text-[10px] text-slate-400 font-medium uppercase">Sample / Modality</p>
                                    <p className="font-medium text-slate-800 mt-0.5">
                                        {selectedDetailTest.specimen_type || resolveTestSampleLabel(selectedDetailTest)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-md p-2 border border-slate-200/80">
                                    <p className="text-[10px] text-slate-400 font-medium uppercase">Department</p>
                                    <p className="font-medium text-slate-800 mt-0.5">
                                        {selectedDetailTest.resolved_department || resolveTestDepartment(selectedDetailTest)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-md p-2 border border-slate-200/80">
                                    <p className="text-[10px] text-slate-400 font-medium uppercase">Report Time</p>
                                    <p className="font-medium text-slate-800 mt-0.5">
                                        {selectedDetailTest.reporting_schedule || selectedDetailTest.turnaround_time || "Same / Next Day"}
                                    </p>
                                </div>
                                {selectedDetailTest.container && (
                                    <div className="bg-slate-50 rounded-md p-2 border border-slate-200/80">
                                        <p className="text-[10px] text-slate-400 font-medium uppercase">Container</p>
                                        <p className="font-medium text-slate-800 mt-0.5">{selectedDetailTest.container}</p>
                                    </div>
                                )}
                                {selectedDetailTest.temperature && (
                                    <div className="bg-slate-50 rounded-md p-2 border border-slate-200/80">
                                        <p className="text-[10px] text-slate-400 font-medium uppercase">Storage</p>
                                        <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1">
                                            <FaThermometerHalf className="text-rose-500 w-2.5 h-2.5 shrink-0" />
                                            <span className="truncate">{selectedDetailTest.temperature}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {selectedDetailTest.clinical_history_required && (
                                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center gap-2 text-xs text-amber-800 font-normal">
                                    <FaClipboardList className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Clinical history required at sample collection.</span>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
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
                                    onClick={() => {
                                        removeFromCart(selectedDetailTest.id);
                                        setSelectedDetailTest(null);
                                    }}
                                    className="px-3.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-[5px] text-xs font-medium hover:bg-rose-100 cursor-pointer transition-colors"
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
                                    className="px-3.5 py-1.5 bg-[#0067A1] text-white rounded-[5px] text-xs font-medium hover:bg-[#004F7C] cursor-pointer transition-colors flex items-center gap-1.5"
                                >
                                    <FaPlus className="w-2.5 h-2.5" /> Add
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─── SLIDE-OVER CART DRAWER (PORTALED, NO BLUR COMPOSITING BLINK) ─── */}
            {mounted && typeof document !== "undefined" && showCartDrawer && createPortal(
                <div className="fixed inset-0 z-[9999999] flex justify-end overscroll-contain">
                    <div
                        className="fixed inset-0 bg-slate-900/60 cursor-pointer"
                        onClick={() => setShowCartDrawer(false)}
                    />

                    <div
                        className="relative z-10 w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
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
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm("Empty your cart?")) {
                                                setCart([]);
                                                localStorage.removeItem(CART_KEY);
                                                toast.success("Cart cleared");
                                            }
                                        }}
                                        className="px-2 py-1 rounded-[4px] text-white/80 hover:text-white hover:bg-white/15 text-[11px] font-medium transition-colors cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowCartDrawer(false)}
                                    className="w-7 h-7 rounded-[5px] bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
                                    aria-label="Close Cart"
                                >
                                    <FaTimes className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 space-y-2.5 bg-slate-50/70">
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
                                        {hasLabOnlyItemInCart && (
                                            <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-[4px] px-2 py-1 font-normal">
                                                Cart includes an In-Lab test that requires a Lab Visit.
                                            </p>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setVisitType("home_collection");
                                                    saveCart({ lab_id: labId, lab_name: lab?.lab_name || "Lab", tests: cart, visit_type: "home_collection" });
                                                }}
                                                className={`p-2 rounded-[5px] border text-left transition-colors cursor-pointer flex items-center gap-2 ${
                                                    visitType === "home_collection"
                                                        ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
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
                                                className={`p-2 rounded-[5px] border text-left transition-colors cursor-pointer flex items-center gap-2 ${
                                                    visitType === "walk_in"
                                                        ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                                }`}
                                            >
                                                <FaHospital className="w-3 h-3 shrink-0" />
                                                <div>
                                                    <p className="text-[11px] font-medium leading-tight">Lab Visit</p>
                                                    <p className="text-[9px] text-slate-500 font-normal">Walk-in Center</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {cart.map((item) => {
                                            const colType = item.collection_type || "home";
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
                                                                colType === "lab"
                                                                    ? "bg-sky-50 text-[#0067A1]"
                                                                    : "bg-emerald-50 text-emerald-700"
                                                            }`}>
                                                                {colType === "lab" ? "Lab" : "Home"}
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
                                                            ₹{Number(item.price || 0).toLocaleString()}
                                                        </span>
                                                        <button
                                                            type="button"
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
                                    type="button"
                                    onClick={handleProceed}
                                    className="w-full py-2 bg-[#0067A1] hover:bg-[#005585] text-white rounded-[5px] font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span>Proceed to Checkout</span>
                                    <FaArrowRight className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default function PublicLabTestsPage({ params }) {
    const { id: labId } = use(params);
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3 text-slate-500 text-xs">
                        <div className="w-7 h-7 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                        <span>Loading tests...</span>
                    </div>
                </div>
            }
        >
            <PublicLabTestsContent labId={labId} />
        </Suspense>
    );
}
