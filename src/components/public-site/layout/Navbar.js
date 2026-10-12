"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FaUser,
  FaChevronDown,
  FaUserPlus,
  FaHeartbeat,
  FaUserMd,
  FaFlask,
  FaPills,
  FaBars,
  FaTimes,
  FaCalendarAlt,
  FaUsers,
  FaCog,
  FaSignOutAlt,
  FaChevronRight,
  FaCheckCircle,
  FaSearch,
  FaTruck,
  FaBriefcaseMedical,
  FaBookOpen,
  FaInfoCircle,
  FaPhoneAlt,
  FaWheelchair,
} from "react-icons/fa";
import { TbLungsFilled } from "react-icons/tb";
import Link from "next/link";
import { logoutUser } from "@/lib/authHelpers";
import { useScroll } from "@/hooks/useScroll";
import dynamic from "next/dynamic";
import ProfileDropdown from "./ProfileDropdown";

const SignupModal = dynamic(
  () => import("@/components/public-site/auth/SignupModal"),
  {
    ssr: false,
  }
);

const LoginModal = dynamic(
  () => import("@/components/public-site/auth/LoginModal"),
  {
    ssr: false,
  }
);

const GlobalSearchModal = dynamic(
  () => import("@/components/public-site/ui/GlobalSearchModal"),
  {
    ssr: false,
  }
);

const Navbar = ({ isMenuOpen, toggleSideBar }) => {
  const pathname = usePathname();
  const router = useRouter();

  const scrolled = useScroll();
  const [activeModal, setActiveModal] = useState(null); // 'login' or 'signup'
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoginMenuOpen, setIsLoginMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // 'lab' | 'nursing' | 'more' | null
  const [isPinned, setIsPinned] = useState(false); // true if opened via click
  const [loginUserType, setLoginUserType] = useState("patient");
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener to open search
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const timeoutRef = useRef(null);
  const navContainerRef = useRef(null);
  const loginMenuRef = useRef(null);

  const handleMenuEnter = (menuKey) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveMenu(menuKey);
  };

  const handleMenuLeave = () => {
    // If user explicitly clicked the menu open, keep it pinned and do NOT auto-hide!
    if (isPinned) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveMenu((prev) => (isPinned ? prev : null));
    }, 350);
  };

  const handleToggleMenu = (menuKey) => {
    if (activeMenu === menuKey && isPinned) {
      // Toggle closed
      setActiveMenu(null);
      setIsPinned(false);
    } else {
      // Pin open
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setActiveMenu(menuKey);
      setIsPinned(true);
    }
  };

  const closeAllMenus = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveMenu(null);
    setIsPinned(false);
    setIsLoginMenuOpen(false);
  };

  // Close menus on route change
  useEffect(() => {
    closeAllMenus();
  }, [pathname]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target)) {
        closeAllMenus();
      }
      if (loginMenuRef.current && !loginMenuRef.current.contains(e.target)) {
        setIsLoginMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetch("/api/cms/settings")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSettings(json.data);
        }
      })
      .catch(console.error);
  }, []);

  // Prevent background scrolling when any modal or mobile menu is open
  useEffect(() => {
    if (activeModal || isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activeModal, isMenuOpen]);

  const refreshAuthState = useCallback(() => {
    if (typeof window === "undefined") return;
    const role = localStorage.getItem("userRole");
    const storedUser = localStorage.getItem("userData");

    if (role && storedUser) {
      try {
        const parsedUser = typeof storedUser === "string" ? JSON.parse(storedUser) : storedUser;
        setUser(parsedUser);
        setUserRole(role);
        setIsLoggedIn(true);

        // Keep localStorage synced for consistent reads across modules
        if (!localStorage.getItem("userId") && parsedUser?.id) {
          localStorage.setItem("userId", String(parsedUser.id));
        }
      } catch {
        setIsLoggedIn(false);
        setUser(null);
        setUserRole(null);
      }
    } else {
      setIsLoggedIn(false);
      setUser(null);
      setUserRole(null);
    }
  }, []);

  useEffect(() => {
    refreshAuthState();
    setMounted(true);

    const handleProfileUpdate = (e) => {
      if (e?.detail) {
        setUser((prev) => ({
          ...prev,
          ...e.detail,
          profile_picture:
            e.detail.profile_picture ||
            e.detail.profile?.profile_picture ||
            e.detail.user?.profile_picture ||
            prev?.profile_picture,
        }));
        if (e.detail.role) {
          setUserRole(e.detail.role);
        }
        setIsLoggedIn(true);
      } else {
        refreshAuthState();
      }
    };

    const handleStorage = () => refreshAuthState();

    window.addEventListener("userProfileUpdated", handleProfileUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("userProfileUpdated", handleProfileUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshAuthState]);

  // Re-check auth when route changes
  useEffect(() => {
    refreshAuthState();
  }, [pathname, refreshAuthState]);

  const handleOpenSignup = useCallback((e) => {
    e?.preventDefault();
    setActiveModal("signup");
    setIsTransitioning(false);
  }, []);

  const handleCloseSignup = useCallback(() => {
    setIsTransitioning(true);
    if (isMenuOpen) toggleSideBar?.();
    setTimeout(() => {
      setActiveModal(null);
      setIsTransitioning(false);
    }, 200);
  }, [isMenuOpen, toggleSideBar]);

  const handleOpenLogin = useCallback((e, userType = "patient") => {
    e?.preventDefault();
    setLoginUserType(userType);
    setActiveModal("login");
    setIsTransitioning(false);
  }, []);

  // Listen for global open-login-modal and open-signup-modal events (from MobileFooterBar, CTA buttons, etc.)
  useEffect(() => {
    const handleOpenLoginModalEvent = (e) => {
      const userType = e?.detail?.userType || "patient";
      handleOpenLogin(null, userType);
    };

    const handleOpenSignupModalEvent = () => {
      handleOpenSignup();
    };

    window.addEventListener("open-login-modal", handleOpenLoginModalEvent);
    window.addEventListener("open-signup-modal", handleOpenSignupModalEvent);

    return () => {
      window.removeEventListener("open-login-modal", handleOpenLoginModalEvent);
      window.removeEventListener("open-signup-modal", handleOpenSignupModalEvent);
    };
  }, [handleOpenLogin, handleOpenSignup]);

  // Handle auto-opening login modal if directed with ?auth=login
  useEffect(() => {
    if (!mounted || typeof window === "undefined" || isLoggedIn) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("auth") === "login") {
        const redirectTarget = params.get("redirect");
        if (redirectTarget) {
          sessionStorage.setItem("post_login_redirect", redirectTarget);
        }
        handleOpenLogin(null, "patient");
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch (_) {}
  }, [mounted, isLoggedIn, handleOpenLogin]);

  // Auto-show Login/Register modal after a few seconds if visitor is not logged in
  useEffect(() => {
    if (!mounted) return;
    if (isLoggedIn) return;
    if (typeof window === "undefined") return;

    // Check if prompt was already shown or dismissed in this browser session
    const hasSeenPrompt = sessionStorage.getItem("mediconnect_auth_prompt_shown");
    if (hasSeenPrompt) return;

    // Don't auto-prompt on standalone auth, verify, or role portals
    const currentPath = pathname || "";
    if (
      currentPath.includes("/verify-otp") ||
      currentPath.includes("/login") ||
      currentPath.includes("/register") ||
      currentPath.startsWith("/doctor") ||
      currentPath.startsWith("/chemist") ||
      currentPath.startsWith("/lab") ||
      currentPath.startsWith("/admin") ||
      currentPath.startsWith("/staff") ||
      currentPath.startsWith("/partner")
    ) {
      return;
    }

    const timer = setTimeout(() => {
      const storedRole = localStorage.getItem("userRole");
      const storedUser = localStorage.getItem("userData");
      const patientUser = localStorage.getItem("patientUser");
      const doctorUser = localStorage.getItem("doctorUser");
      const isCurrentlyLoggedIn = Boolean(storedRole || storedUser || patientUser || doctorUser);

      if (!isCurrentlyLoggedIn && !activeModal) {
        sessionStorage.setItem("mediconnect_auth_prompt_shown", "true");
        setLoginUserType("patient");
        setActiveModal("login");
      }
    }, 3500); // 3.5 seconds

    return () => clearTimeout(timer);
  }, [mounted, isLoggedIn, pathname, activeModal]);

  const handleCloseLogin = useCallback(() => {
    setIsTransitioning(true);
    if (isMenuOpen) toggleSideBar?.();
    setTimeout(() => {
      setActiveModal(null);
      setIsTransitioning(false);
    }, 200);
  }, [isMenuOpen, toggleSideBar]);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setUser(null);
    setUserRole(null);
    if (isMenuOpen) {
      toggleSideBar?.();
    }
    logoutUser(userRole || "patient", "/");
  }, [toggleSideBar, isMenuOpen, userRole]);

  const toggleLoginMenu = useCallback(() => {
    setIsLoginMenuOpen((prev) => !prev);
  }, []);

  const handleRoleLogin = useCallback(
    (role) => {
      setIsLoginMenuOpen(false);

      if (role === "patient") {
        handleOpenLogin(null, "patient");
        return;
      }

      if (role === "doctor") {
        handleOpenLogin(null, "doctor");
        return;
      }

      if (role === "chemist") {
        router.push("/chemist/login");
        return;
      }

      if (role === "lab") {
        router.push("/lab/login");
        return;
      }

      if (role === "nursing") {
        router.push("/website/nursing-care");
        return;
      }
    },
    [router, handleOpenLogin]
  );

  // Derived user details for mobile drawer
  const hasDoctor = userRole === "doctor" || user?.role === "doctor" || (typeof window !== "undefined" && !!localStorage.getItem("doctorUser"));
  const hasChemist = userRole === "chemist" || user?.role === "chemist" || (typeof window !== "undefined" && !!localStorage.getItem("chemistUser"));
  const hasLab = userRole === "lab" || user?.role === "lab" || (typeof window !== "undefined" && !!localStorage.getItem("labUser"));
  const hasAdmin = userRole === "admin" || user?.role === "admin" || (typeof window !== "undefined" && !!localStorage.getItem("adminUser"));
  const isDoctor = hasDoctor;
  const isChemist = hasChemist;
  const isLab = hasLab;
  const isAdmin = hasAdmin;
  const isPatient = !isDoctor && !isChemist && !isLab && !isAdmin;

  const getRawName = () => {
    return (
      user?.details?.full_name ||
      user?.profile?.full_name ||
      user?.user?.details?.full_name ||
      user?.user?.full_name ||
      user?.full_name ||
      user?.name ||
      user?.details?.owner_name ||
      user?.details?.pharmacy_name ||
      user?.details?.lab_name ||
      "User"
    );
  };
  const rawName = getRawName();
  const displayName = isDoctor && !rawName.toLowerCase().startsWith("dr.") && !rawName.toLowerCase().startsWith("dr ")
    ? `Dr. ${rawName}`
    : rawName;

  const displayEmail =
    user?.details?.email ||
    user?.email ||
    (user?.phone_number ? `+91 ${user.phone_number}` : "") ||
    (user?.details?.mobile ? `+91 ${user.details.mobile}` : "") ||
    "user@mediconnect.fit";

  const avatarUrl =
    user?.profile_picture ||
    user?.avatar ||
    user?.image ||
    user?.details?.profile_picture ||
    user?.details?.avatar ||
    null;

  const getInitials = (name) => {
    if (!name) return "U";
    const clean = name.replace(/^Dr\.\s*/i, "").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase() || "U";
  };

  return (
    <>
      <SignupModal
        isOpen={activeModal === "signup"}
        onClose={handleCloseSignup}
        onLoginClick={handleOpenLogin}
      />
      <LoginModal
        isOpen={activeModal === "login"}
        onClose={handleCloseLogin}
        onSignupClick={handleOpenSignup}
        initialUserType={loginUserType}
      />
      <nav ref={navContainerRef} className="sticky top-0 z-[10001] border-b border-gray-100 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* LOGO */}
            <div className="shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <img
                  src={settings?.logo || "/real-logo.png"}
                  alt={settings?.site_name || "MediConnect"}
                  className="h-16 w-auto object-contain"
                />
              </Link>
            </div>

            {/* DESKTOP NAV (Right aligned) */}
            <div className="hidden lg:flex items-center space-x-2 xl:space-x-4">
              {/* Nav Links */}
              <div className="flex items-center gap-1 xl:gap-2" ref={navContainerRef}>
                <NavLink href="/" active={pathname === "/"}>
                  Home
                </NavLink>
                <NavLink href="/doctors" active={pathname === "/doctors"}>
                  Doctors
                </NavLink>

                {/* Lab Tests Dropdown Menu */}
                <div
                  className="relative"
                  onMouseEnter={() => handleMenuEnter("lab")}
                  onMouseLeave={handleMenuLeave}
                >
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => handleToggleMenu("lab")}
                    className={`px-3 py-1.5 text-xs lg:text-[13px] xl:text-sm font-semibold rounded-md transition-all duration-150 whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer ${
                      activeMenu === "lab" || pathname?.startsWith("/services/lab-tests")
                        ? "text-[#0067A1] bg-sky-50 font-bold shadow-2xs ring-1 ring-sky-200/60"
                        : "text-slate-600 hover:text-[#0067A1] hover:bg-slate-50"
                    }`}
                  >
                    <span>Lab Tests</span>
                    <FaChevronDown
                      className={`w-2.5 h-2.5 text-slate-400 group-hover:text-[#0067A1] transition-transform duration-200 ${
                        activeMenu === "lab" ? "rotate-180 text-[#0067A1]" : ""
                      }`}
                    />
                  </button>

                  {activeMenu === "lab" && (
                    <div
                      className="absolute top-full left-0 xl:left-1/2 xl:-translate-x-1/2 pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                      onMouseEnter={() => handleMenuEnter("lab")}
                      onMouseLeave={handleMenuLeave}
                    >
                      <div className="w-64 rounded-xl bg-white border border-slate-200 shadow-xl p-2 relative before:content-[''] before:absolute before:-top-2 before:inset-x-0 before:h-3">
                        <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
                          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            Lab Services
                          </p>
                        </div>

                        <div className="space-y-0.5">
                          <Link
                            href="/services/lab-tests"
                            onClick={closeAllMenus}
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-sky-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center shrink-0 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                              <FaFlask className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors flex items-center justify-between">
                                <span>All Lab Tests</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-[#0067A1]">
                                  500+
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">
                                Blood tests & health checkups
                              </p>
                            </div>
                          </Link>

                          <Link
                            href="/services/lab-tests?home_collection=true"
                            onClick={closeAllMenus}
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-sky-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center shrink-0 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                              <FaTruck className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors flex items-center justify-between">
                                <span>Home Sample Pickup</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-[#0067A1]">
                                  Doorstep
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">
                                Sample collection at home
                              </p>
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nursing Care Dropdown Menu */}
                <div
                  className="relative"
                  onMouseEnter={() => handleMenuEnter("nursing")}
                  onMouseLeave={handleMenuLeave}
                >
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => handleToggleMenu("nursing")}
                    className={`px-3 py-1.5 text-xs lg:text-[13px] xl:text-sm font-semibold rounded-md transition-all duration-150 whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer ${
                      activeMenu === "nursing" || pathname === "/nursing-care" || pathname === "/medical-equipment"
                        ? "text-[#0067A1] bg-sky-50 font-bold shadow-2xs ring-1 ring-sky-200/60"
                        : "text-slate-600 hover:text-[#0067A1] hover:bg-slate-50"
                    }`}
                  >
                    <span>Nursing Care</span>
                    <FaChevronDown
                      className={`w-2.5 h-2.5 text-slate-400 group-hover:text-[#0067A1] transition-transform duration-200 ${
                        activeMenu === "nursing" ? "rotate-180 text-[#0067A1]" : ""
                      }`}
                    />
                  </button>

                  {activeMenu === "nursing" && (
                    <div
                      className="absolute top-full right-0 xl:left-1/2 xl:-translate-x-1/2 pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                      onMouseEnter={() => handleMenuEnter("nursing")}
                      onMouseLeave={handleMenuLeave}
                    >
                      <div className="w-64 rounded-xl bg-white border border-slate-200 shadow-xl p-2 relative before:content-[''] before:absolute before:-top-2 before:inset-x-0 before:h-3">
                        <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
                          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            Home Care
                          </p>
                        </div>

                        <div className="space-y-0.5">
                          <Link
                            href="/nursing-care"
                            onClick={closeAllMenus}
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-sky-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center shrink-0 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                              <FaUserMd className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors flex items-center justify-between">
                                <span>Home Nurse</span>
                                <FaChevronRight className="w-2.5 h-2.5 text-slate-300 group-hover:text-[#0067A1] group-hover:translate-x-0.5 transition-all" />
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">
                                Trained nurses & attendants
                              </p>
                            </div>
                          </Link>

                          <Link
                            href="/medical-equipment"
                            onClick={closeAllMenus}
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-sky-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center shrink-0 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                              <FaWheelchair className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors flex items-center justify-between">
                                <span>Medical Equipment</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-[#0067A1]">
                                  Rent/Buy
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">
                                Oxygen, beds & wheelchairs
                              </p>
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* More Dropdown Menu */}
                <div
                  className="relative"
                  onMouseEnter={() => handleMenuEnter("more")}
                  onMouseLeave={handleMenuLeave}
                >
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => handleToggleMenu("more")}
                    className={`px-3 py-1.5 text-xs lg:text-[13px] xl:text-sm font-semibold rounded-md transition-all duration-150 whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer ${
                      activeMenu === "more" ||
                      pathname === "/services" ||
                      pathname === "/resources" ||
                      pathname === "/about" ||
                      pathname === "/contact"
                        ? "text-[#0067A1] bg-sky-50 font-bold shadow-2xs ring-1 ring-sky-200/60"
                        : "text-slate-600 hover:text-[#0067A1] hover:bg-slate-50"
                    }`}
                  >
                    <span>More</span>
                    <FaChevronDown
                      className={`w-2.5 h-2.5 text-slate-400 group-hover:text-[#0067A1] transition-transform duration-200 ${
                        activeMenu === "more" ? "rotate-180 text-[#0067A1]" : ""
                      }`}
                    />
                  </button>

                  {activeMenu === "more" && (
                    <div
                      className="absolute top-full right-0 pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                      onMouseEnter={() => handleMenuEnter("more")}
                      onMouseLeave={handleMenuLeave}
                    >
                      <div className="w-56 rounded-xl bg-white border border-slate-200 shadow-xl p-2 relative before:content-[''] before:absolute before:-top-2 before:inset-x-0 before:h-3">
                        <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
                          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            More Links
                          </p>
                        </div>

                        <div className="space-y-0.5">
                          <Link
                            href="/services"
                            onClick={closeAllMenus}
                            className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors group ${
                              pathname === "/services" ? "bg-sky-50" : ""
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center shrink-0 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                              <FaBriefcaseMedical className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors">
                                All Services
                              </div>
                            </div>
                          </Link>

                          <Link
                            href="/resources"
                            onClick={closeAllMenus}
                            className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors group ${
                              pathname === "/resources" ? "bg-sky-50" : ""
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center shrink-0 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                              <FaBookOpen className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors">
                                Health Guides
                              </div>
                            </div>
                          </Link>

                          <Link
                            href="/about"
                            onClick={closeAllMenus}
                            className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors group ${
                              pathname === "/about" ? "bg-sky-50" : ""
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center shrink-0 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                              <FaInfoCircle className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors">
                                About Us
                              </div>
                            </div>
                          </Link>

                          <Link
                            href="/contact"
                            onClick={closeAllMenus}
                            className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors group ${
                              pathname === "/contact" ? "bg-sky-50" : ""
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center shrink-0 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                              <FaPhoneAlt className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors">
                                Help & Support
                              </div>
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA & Profile (Desktop) */}
              <div className="flex items-center space-x-2.5 xl:space-x-3 border-l border-gray-200 pl-3 xl:pl-4 ml-1 xl:ml-2" suppressHydrationWarning>
                {/* Global Search Button (Desktop) */}
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setIsSearchOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-500 hover:text-slate-800 text-xs font-medium shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                  title="Search medical services (Ctrl+K)"
                >
                  <FaSearch className="w-3.5 h-3.5 text-[#0067A1]" />
                  <span className="hidden xl:inline">Search...</span>
                  <span className="xl:hidden">Search</span>
                  <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
                    Ctrl K
                  </kbd>
                </button>

                {!mounted ? (
                  <div className="flex items-center space-x-3" suppressHydrationWarning>
                    <div className="w-24 h-10 bg-gray-100 animate-pulse rounded-lg"></div>
                    <div className="w-24 h-10 bg-gray-100 animate-pulse rounded-lg"></div>
                  </div>
                ) : isLoggedIn ? (
                  <ProfileDropdown user={user} userRole={userRole} onLogout={handleLogout} />
                ) : (
                  <div className="relative inline-block text-left" ref={loginMenuRef} suppressHydrationWarning>
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={toggleLoginMenu}
                      aria-expanded={isLoginMenuOpen}
                      aria-haspopup="true"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs xl:text-sm font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#00507c] active:scale-[0.98] focus:outline-none transition-all cursor-pointer shadow-xs hover:shadow-sm"
                    >
                      <FaUser className="h-3.5 w-3.5 text-white shrink-0" />
                      <span>Login</span>
                      <FaChevronDown
                        className={`h-3 w-3 text-sky-100 transition-transform duration-200 ${
                          isLoginMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isLoginMenuOpen && (
                      <div className="absolute right-0 mt-2.5 w-72 rounded-2xl bg-white border border-slate-200/80 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                        {/* Primary: Patient Login (Highlighted for non-tech users) */}
                        <div className="p-0.5">
                          <button
                            type="button"
                            onClick={() => handleRoleLogin("patient")}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-sky-50/70 hover:bg-sky-100/80 border border-sky-100 text-left transition-all group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-[#0067A1] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                <FaUser className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 group-hover:text-[#0067A1] transition-colors">
                                  Patient Login
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  Book doctor & test reports
                                </div>
                              </div>
                            </div>
                            <FaChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0067A1] group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        </div>

                        {/* Healthcare Partners Section */}
                        <div className="mt-1 pt-1.5 border-t border-slate-100 px-0.5">
                          <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Doctors & Partners
                          </div>

                          <div className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() => handleRoleLogin("doctor")}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                  <FaUserMd className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                                    Doctor Portal
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Consultations & OPD
                                  </div>
                                </div>
                              </div>
                              <FaChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRoleLogin("chemist")}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                  <FaPills className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                                    Chemist / Pharmacy
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Medicines & Orders
                                  </div>
                                </div>
                              </div>
                              <FaChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRoleLogin("lab")}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                  <FaFlask className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                                    Diagnostic Lab
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Tests & Pathology
                                  </div>
                                </div>
                              </div>
                              <FaChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRoleLogin("nursing")}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                  <FaHeartbeat className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                                    Nursing Care
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Home Health & Attendants
                                  </div>
                                </div>
                              </div>
                              <FaChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>
                          </div>
                        </div>

                        {/* Registration Footer */}
                        <div className="mt-1 pt-2 border-t border-slate-100 px-2 py-1.5 flex items-center justify-between text-xs bg-slate-50/70 rounded-xl">
                          <span className="text-slate-500 text-[11px]">New to MediConnect?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              setIsLoginMenuOpen(false);
                              handleOpenSignup(e);
                            }}
                            className="font-bold text-[#0067A1] hover:text-[#004f7c] hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                          >
                            <FaUserPlus className="w-3 h-3" />
                            <span>Create Account</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* MOBILE CONTROLS (Search & Hamburger Menu) */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Search medical services"
                aria-label="Global Search"
              >
                <FaSearch className="w-4 h-4 text-[#0067A1]" />
              </button>
              <MobileMenuButton isOpen={isMenuOpen} onClick={toggleSideBar} />
            </div>
          </div>
        </div>

        {/* Mobile navigation menu drawer */}
        {isMenuOpen && (
          <div
            className="lg:hidden fixed inset-x-0 top-20 bottom-0 bg-white z-[10000] overflow-y-auto overscroll-contain shadow-2xl border-t border-slate-200"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="px-4 pt-3 pb-32 space-y-2">
              {/* LOGGED IN USER CARD (MOBILE) */}
              {mounted && isLoggedIn && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 text-[#0067A1] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{getInitials(displayName)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-900 text-xs truncate">{displayName}</h4>
                        {isDoctor && (
                          <FaCheckCircle className="w-3 h-3 text-teal-600 shrink-0" title="Verified Doctor" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{displayEmail}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] font-semibold text-[#0067A1]">
                          {isDoctor ? "Doctor" : isChemist ? "Chemist" : isLab ? "Lab Partner" : "Patient"}
                        </span>
                        <span className="text-slate-300 text-[10px]">•</span>
                        <span className="text-[11px] text-emerald-600 font-medium">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <Link
                    href={isDoctor ? "/doctor" : isChemist ? "/chemist/dashboard" : isLab ? "/lab/dashboard" : "/website/dashboard"}
                    onClick={toggleSideBar}
                    className="mt-3 flex items-center justify-between w-full py-2 px-3 bg-[#0067A1] hover:bg-[#004F7C] text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {isDoctor ? <FaUserMd className="w-3.5 h-3.5" /> : <FaUser className="w-3.5 h-3.5" />}
                      <span>{isDoctor ? "Open Doctor Dashboard" : "Open Dashboard"}</span>
                    </div>
                    <FaChevronRight className="w-3 h-3 opacity-80" />
                  </Link>
                </div>
              )}

              {/* Standard Nav Links */}
              <div className="space-y-1">
                <MobileNavLink href="/" active={pathname === "/"} onClick={toggleSideBar}>
                  Home
                </MobileNavLink>
                <MobileNavLink href="/doctors" active={pathname === "/doctors"} onClick={toggleSideBar}>
                  <div className="flex items-center gap-2.5">
                    <FaUserMd className="w-4 h-4 text-[#0067A1]" />
                    <span>Doctors</span>
                  </div>
                </MobileNavLink>

                {/* Lab Tests Section */}
                <div className="pt-2">
                  <p className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Diagnostic Services
                  </p>
                  <MobileNavLink href="/services/lab-tests" active={pathname === "/services/lab-tests"} onClick={toggleSideBar}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <FaFlask className="w-4 h-4 text-[#0067A1]" />
                        <span>Book Lab Tests & Packages</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-[#0067A1]">500+ Tests</span>
                    </div>
                  </MobileNavLink>
                  <MobileNavLink href="/services/lab-tests?home_collection=true" active={false} onClick={toggleSideBar}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <FaTruck className="w-4 h-4 text-emerald-600" />
                        <span>Home Sample Collection</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Doorstep</span>
                    </div>
                  </MobileNavLink>
                </div>

                {/* Nursing & Medical Equipment Section */}
                <div className="pt-2">
                  <p className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Home Healthcare
                  </p>
                  <MobileNavLink href="/nursing-care" active={pathname === "/nursing-care"} onClick={toggleSideBar}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <FaHeartbeat className="w-4 h-4 text-rose-500" />
                        <span>Home Nursing Support</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">Caregivers</span>
                    </div>
                  </MobileNavLink>
                  <MobileNavLink href="/medical-equipment" active={pathname === "/medical-equipment"} onClick={toggleSideBar}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <FaWheelchair className="w-4 h-4 text-emerald-600" />
                        <span>Nursing & Medical Equipment</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Rent / Buy</span>
                    </div>
                  </MobileNavLink>
                </div>

                {/* Secondary More Links */}
                <div className="pt-2 mt-2 border-t border-slate-100 space-y-0.5">
                  <p className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    More Pages
                  </p>
                  <MobileNavLink href="/services" active={pathname === "/services"} onClick={toggleSideBar}>
                    <div className="flex items-center gap-2.5">
                      <FaBriefcaseMedical className="w-3.5 h-3.5 text-slate-400" />
                      <span>All Services</span>
                    </div>
                  </MobileNavLink>
                  <MobileNavLink href="/resources" active={pathname === "/resources"} onClick={toggleSideBar}>
                    <div className="flex items-center gap-2.5">
                      <FaBookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Health Resources</span>
                    </div>
                  </MobileNavLink>
                  <MobileNavLink href="/about" active={pathname === "/about"} onClick={toggleSideBar}>
                    <div className="flex items-center gap-2.5">
                      <FaInfoCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>About Us</span>
                    </div>
                  </MobileNavLink>
                  <MobileNavLink href="/contact" active={pathname === "/contact"} onClick={toggleSideBar}>
                    <div className="flex items-center gap-2.5">
                      <FaPhoneAlt className="w-3.5 h-3.5 text-slate-400" />
                      <span>Contact Us</span>
                    </div>
                  </MobileNavLink>
                </div>
              </div>

              {/* Quick Account Links in Drawer (When Logged In) */}
              {mounted && isLoggedIn && (
                <div className="pt-3 border-t border-gray-100 mt-2 space-y-1">
                  <p className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Account & Shortcuts
                  </p>
                  {/* Role Specific Shortcuts */}
                  {isDoctor && (
                    <>
                      <MobileNavLink href="/doctor" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaUserMd className="w-4 h-4 text-[#0067A1]" />
                          <span>Doctor Dashboard</span>
                        </div>
                      </MobileNavLink>
                      <MobileNavLink href="/doctor?tab=appointments" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaCalendarAlt className="w-4 h-4 text-[#0067A1]" />
                          <span>Appointments</span>
                        </div>
                      </MobileNavLink>
                      <MobileNavLink href="/doctor/my-patients" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaUsers className="w-4 h-4 text-[#0067A1]" />
                          <span>My Patients</span>
                        </div>
                      </MobileNavLink>
                      <MobileNavLink href="/doctor/profile-settings" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaCog className="w-4 h-4 text-[#0067A1]" />
                          <span>Clinic & Profile Settings</span>
                        </div>
                      </MobileNavLink>
                    </>
                  )}

                  {isChemist && (
                    <>
                      <MobileNavLink href="/chemist/dashboard" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaCog className="w-4 h-4 text-teal-600" />
                          <span>Chemist Dashboard</span>
                        </div>
                      </MobileNavLink>
                      <MobileNavLink href="/chemist/orders" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaCalendarAlt className="w-4 h-4 text-teal-600" />
                          <span>Medicine Orders</span>
                        </div>
                      </MobileNavLink>
                    </>
                  )}

                  {isLab && (
                    <>
                      <MobileNavLink href="/lab/dashboard" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaCog className="w-4 h-4 text-blue-600" />
                          <span>Lab Dashboard</span>
                        </div>
                      </MobileNavLink>
                      <MobileNavLink href="/lab/orders" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaFlask className="w-4 h-4 text-blue-600" />
                          <span>Test Orders</span>
                        </div>
                      </MobileNavLink>
                    </>
                  )}

                  {isAdmin && (
                    <MobileNavLink href="/admin/dashboard" onClick={toggleSideBar}>
                      <div className="flex items-center gap-2.5">
                        <FaCog className="w-4 h-4 text-indigo-600" />
                        <span>Admin Panel</span>
                      </div>
                    </MobileNavLink>
                  )}

                  {/* Patient View for All Users */}
                  <div className={`pt-2 mt-1 ${(isDoctor || isChemist || isLab || isAdmin) ? "border-t border-gray-100" : ""}`}>
                    {(isDoctor || isChemist || isLab || isAdmin) && (
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Patient View
                      </div>
                    )}
                    <MobileNavLink href="/dashboard" onClick={toggleSideBar}>
                      <div className="flex items-center gap-2.5">
                        <FaUser className="w-4 h-4 text-[#0067A1]" />
                        <span>Patient Dashboard</span>
                      </div>
                    </MobileNavLink>
                    <MobileNavLink href="/appointments" onClick={toggleSideBar}>
                      <div className="flex items-center gap-2.5">
                        <FaCalendarAlt className="w-4 h-4 text-[#0067A1]" />
                        <span>My Appointments</span>
                      </div>
                    </MobileNavLink>
                    <MobileNavLink href="/lung-connect" onClick={toggleSideBar}>
                      <div className="flex items-center gap-2.5">
                        <TbLungsFilled className="w-4 h-4 text-teal-600" />
                        <span>LungConnect</span>
                      </div>
                    </MobileNavLink>
                    <MobileNavLink href="/cardio-connect" onClick={toggleSideBar}>
                      <div className="flex items-center gap-2.5">
                        <FaHeartbeat className="w-4 h-4 text-rose-500" />
                        <span>CardioConnect</span>
                      </div>
                    </MobileNavLink>
                    <MobileNavLink href="/lab-reports" onClick={toggleSideBar}>
                      <div className="flex items-center gap-2.5">
                        <FaFlask className="w-4 h-4 text-purple-600" />
                        <span>Lab Reports</span>
                      </div>
                    </MobileNavLink>
                    <MobileNavLink href="/medicine-order" onClick={toggleSideBar}>
                      <div className="flex items-center gap-2.5">
                        <FaCog className="w-4 h-4 text-[#0067A1]" />
                        <span>Medicine Orders</span>
                      </div>
                    </MobileNavLink>
                    <MobileNavLink href="/profile" onClick={toggleSideBar}>
                      <div className="flex items-center gap-2.5">
                        <FaCog className="w-4 h-4 text-[#0067A1]" />
                        <span>My Profile</span>
                      </div>
                    </MobileNavLink>
                  </div>

                  {/* Sign Out Button in Drawer */}
                  <button
                    onClick={() => {
                      toggleSideBar?.();
                      handleLogout();
                    }}
                    className="flex items-center gap-2.5 w-full mt-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <FaSignOutAlt className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}

              {/* Login & Register buttons (When NOT Logged In) */}
              <div suppressHydrationWarning>
                {!mounted ? (
                  <div className="mt-3 flex flex-col gap-2" suppressHydrationWarning>
                    <div className="w-full h-11 bg-gray-100 animate-pulse rounded-xl"></div>
                  </div>
                ) : (
                  !isLoggedIn && (
                    <div className="mt-3 space-y-2" suppressHydrationWarning>
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => {
                          toggleSideBar();
                          handleRoleLogin("patient");
                        }}
                        className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-[#0067A1] hover:bg-[#004F7C] active:scale-[0.98] transition-all cursor-pointer shadow-xs gap-2"
                      >
                        <FaUser className="h-4 w-4" />
                        <span>Login</span>
                      </button>
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={(e) => {
                          toggleSideBar();
                          handleOpenSignup(e);
                        }}
                        className="inline-flex items-center justify-center w-full px-4 py-2 text-xs font-semibold rounded-lg text-[#0067A1] bg-sky-50 hover:bg-sky-100 border border-sky-150 transition-colors cursor-pointer gap-1.5"
                      >
                        <FaUserPlus className="h-3.5 w-3.5" />
                        <span>Create Account</span>
                      </button>

                      {/* Partner login quick links */}
                      <div className="pt-2 text-center">
                        <span className="text-xs text-slate-400">Doctors & Partners: </span>
                        <button
                          type="button"
                          onClick={() => {
                            toggleSideBar();
                            handleRoleLogin("doctor");
                          }}
                          className="text-xs font-semibold text-[#0067A1] hover:underline cursor-pointer"
                        >
                          Doctor
                        </button>
                        <span className="text-slate-300 mx-1.5">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            toggleSideBar();
                            router.push("/lab/login");
                          }}
                          className="text-xs font-semibold text-[#0067A1] hover:underline cursor-pointer"
                        >
                          Lab
                        </button>
                        <span className="text-slate-300 mx-1.5">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            toggleSideBar();
                            router.push("/chemist/login");
                          }}
                          className="text-xs font-semibold text-[#0067A1] hover:underline cursor-pointer"
                        >
                          Chemist
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Global Search Modal */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      </nav>
    </>
  );
};

const MobileMenuButton = ({ isOpen, onClick }) => (
  <div className="flex items-center mr-1">
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-[#003358] hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
    >
      <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
      {isOpen ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
    </button>
  </div>
);

const NavLink = ({ href, active, children }) => (
  <Link
    href={href}
    suppressHydrationWarning
    className={`px-3 py-1.5 text-xs lg:text-[13px] xl:text-sm font-semibold rounded-md transition-all duration-150 whitespace-nowrap inline-flex items-center ${
      active
        ? "text-[#0067A1] bg-sky-50 font-bold shadow-2xs ring-1 ring-sky-200/60"
        : "text-slate-600 hover:text-[#0067A1] hover:bg-slate-50"
    }`}
  >
    {children}
  </Link>
);

const MobileNavLink = ({ href, active, children, onClick }) => (
  <Link
    href={href}
    onClick={onClick}
    className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
      active ? "text-[#003358] bg-sky-50 font-semibold" : "text-gray-700 hover:text-[#003358] hover:bg-gray-50"
    }`}
  >
    {children}
  </Link>
);

export default Navbar;
