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

  const timeoutRef = useRef(null);
  const navContainerRef = useRef(null);

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
    let role = localStorage.getItem("userRole");
    let storedUser = localStorage.getItem("userData");

    // Fallback: check role-specific keys if userRole/userData is not directly set
    if (!role || !storedUser) {
      const doctorUser = localStorage.getItem("doctorUser");
      const patientUser = localStorage.getItem("patientUser");
      const chemistUser = localStorage.getItem("chemistUser");
      const labUser = localStorage.getItem("labUser");
      const adminUser = localStorage.getItem("adminUser");

      if (doctorUser) {
        role = "doctor";
        storedUser = doctorUser;
      } else if (patientUser) {
        role = "patient";
        storedUser = patientUser;
      } else if (chemistUser) {
        role = "chemist";
        storedUser = chemistUser;
      } else if (labUser) {
        role = "lab";
        storedUser = labUser;
      } else if (adminUser) {
        role = "admin";
        storedUser = adminUser;
      }
    }

    if (role && storedUser) {
      try {
        const parsedUser = typeof storedUser === "string" ? JSON.parse(storedUser) : storedUser;
        setUser(parsedUser);
        setUserRole(role);
        setIsLoggedIn(true);

        // Keep localStorage synced for consistent reads across modules
        if (!localStorage.getItem("userRole")) localStorage.setItem("userRole", role);
        if (!localStorage.getItem("userData")) localStorage.setItem("userData", JSON.stringify(parsedUser));
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
    toggleSideBar?.();
    setTimeout(() => {
      setActiveModal(null);
      setIsTransitioning(false);
    }, 200);
  }, [toggleSideBar]);

  const handleOpenLogin = useCallback((e, userType = "patient") => {
    e?.preventDefault();
    setLoginUserType(userType);
    setActiveModal("login");
    setIsTransitioning(false);
  }, []);

  const handleCloseLogin = useCallback(() => {
    setIsTransitioning(true);
    toggleSideBar?.();
    setTimeout(() => {
      setActiveModal(null);
      setIsTransitioning(false);
    }, 200);
  }, [toggleSideBar]);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setUser(null);
    setUserRole(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
      localStorage.removeItem("userData");
      localStorage.removeItem("doctorUser");
      localStorage.removeItem("patientUser");
      localStorage.removeItem("chemistUser");
      localStorage.removeItem("labUser");
      localStorage.removeItem("adminUser");
      localStorage.removeItem("authToken");
      localStorage.removeItem("userId");
      document.cookie = "session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("userProfileUpdated"));
    }
    if (isMenuOpen) {
      toggleSideBar?.();
    }
    router.push("/");
  }, [toggleSideBar, isMenuOpen, router]);

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
  const isPatient = userRole === "patient" || user?.role === "patient";
  const isDoctor = !isPatient && (userRole === "doctor" || user?.role === "doctor");
  const isChemist = !isPatient && (userRole === "chemist" || user?.role === "chemist");
  const isLab = !isPatient && (userRole === "lab" || user?.role === "lab");

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
      <nav className="sticky top-0 z-[10001] border-b border-gray-100 bg-white">
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
              <div className="flex items-center space-x-3 border-l border-gray-200 pl-4 ml-2">
                {!mounted ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-24 h-10 bg-gray-100 animate-pulse rounded-lg"></div>
                    <div className="w-24 h-10 bg-gray-100 animate-pulse rounded-lg"></div>
                  </div>
                ) : isLoggedIn ? (
                  <ProfileDropdown user={user} userRole={userRole} onLogout={handleLogout} />
                ) : (
                  <>
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={toggleLoginMenu}
                        className="inline-flex items-center justify-center px-4 py-2 text-xs xl:text-sm font-semibold rounded-xl bg-[#0067A1] text-white hover:bg-[#004F7C] focus:outline-none transition-colors cursor-pointer shadow-xs gap-1.5"
                      >
                        <FaUser className="h-3.5 w-3.5 text-white" />
                        <span>Login / Register</span>
                        <FaChevronDown
                          className={`h-3 w-3 transition-transform duration-200 ${
                            isLoginMenuOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isLoginMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-xl p-1.5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                          <div className="space-y-0.5">
                            <button
                              onClick={(e) => {
                                setIsLoginMenuOpen(false);
                                handleOpenSignup(e);
                              }}
                              className="flex items-center gap-2 w-full px-2.5 py-2 text-left text-xs font-bold text-[#0067A1] bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <FaUserPlus className="w-3.5 h-3.5 text-[#0067A1] shrink-0" />
                              <span>Register Account</span>
                            </button>

                            <p className="px-2.5 pt-2 pb-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100">
                              Login to Portal
                            </p>
                            <button
                              onClick={() => handleRoleLogin("patient")}
                              className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:text-[#0067A1] hover:bg-slate-50 rounded-lg transition-colors group cursor-pointer"
                            >
                              <FaUser className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                              <span className="font-medium">Patient</span>
                            </button>
                            <button
                              onClick={() => handleRoleLogin("doctor")}
                              className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:text-[#0067A1] hover:bg-slate-50 rounded-lg transition-colors group cursor-pointer"
                            >
                              <FaUserMd className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                              <span className="font-medium">Doctor</span>
                            </button>
                            <button
                              onClick={() => handleRoleLogin("chemist")}
                              className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:text-[#0067A1] hover:bg-slate-50 rounded-lg transition-colors group cursor-pointer"
                            >
                              <FaPills className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                              <span className="font-medium">Chemist / Pharmacy</span>
                            </button>
                            <button
                              onClick={() => handleRoleLogin("lab")}
                              className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:text-[#0067A1] hover:bg-slate-50 rounded-lg transition-colors group cursor-pointer"
                            >
                              <FaFlask className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                              <span className="font-medium">Diagnostic Lab</span>
                            </button>
                            <button
                              onClick={() => handleRoleLogin("nursing")}
                              className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:text-[#0067A1] hover:bg-slate-50 rounded-lg transition-colors group cursor-pointer"
                            >
                              <FaHeartbeat className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                              <span className="font-medium">Nursing Care</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* MOBILE CONTROLS (Hamburger Menu - Profile is located in mobile bottom navigation) */}
            <div className="flex items-center gap-2 lg:hidden">
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
                  {isDoctor ? (
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
                      <div className="pt-2 mt-1 border-t border-gray-100">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Patient View
                        </div>
                        <MobileNavLink href="/website/dashboard" onClick={toggleSideBar}>
                          <div className="flex items-center gap-2.5">
                            <FaUser className="w-4 h-4 text-[#0067A1]" />
                            <span>Patient Dashboard</span>
                          </div>
                        </MobileNavLink>
                        <MobileNavLink href="/website/appointments" onClick={toggleSideBar}>
                          <div className="flex items-center gap-2.5">
                            <FaCalendarAlt className="w-4 h-4 text-[#0067A1]" />
                            <span>My Consultations</span>
                          </div>
                        </MobileNavLink>
                      </div>
                    </>
                  ) : (
                    <>
                      <MobileNavLink href="/website/dashboard" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaUser className="w-4 h-4 text-[#0067A1]" />
                          <span>Patient Dashboard</span>
                        </div>
                      </MobileNavLink>
                      <MobileNavLink href="/website/appointments" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaCalendarAlt className="w-4 h-4 text-[#0067A1]" />
                          <span>My Appointments</span>
                        </div>
                      </MobileNavLink>
                      <MobileNavLink href="/website/lung-connect" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <TbLungsFilled className="w-4 h-4 text-teal-600" />
                          <span>LungConnect</span>
                        </div>
                      </MobileNavLink>
                      <MobileNavLink href="/website/cardio-connect" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaHeartbeat className="w-4 h-4 text-rose-500" />
                          <span>CardioConnect</span>
                        </div>
                      </MobileNavLink>
                      <MobileNavLink href="/website/lab-reports" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaFlask className="w-4 h-4 text-purple-600" />
                          <span>Lab Reports</span>
                        </div>
                      </MobileNavLink>
                      <MobileNavLink href="/website/profile" onClick={toggleSideBar}>
                        <div className="flex items-center gap-2.5">
                          <FaCog className="w-4 h-4 text-[#0067A1]" />
                          <span>My Profile</span>
                        </div>
                      </MobileNavLink>
                    </>
                  )}

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

              {/* Login / Register buttons (When NOT Logged In) */}
              {!mounted ? (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="w-full h-11 bg-gray-100 animate-pulse rounded-lg"></div>
                  <div className="w-full h-11 bg-gray-100 animate-pulse rounded-lg"></div>
                </div>
              ) : (
                !isLoggedIn && (
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        toggleSideBar();
                        handleOpenSignup(e);
                      }}
                      className="inline-flex items-center justify-center w-full px-4 py-2.5 border border-[#0067A1] text-sm font-semibold rounded-lg text-[#0067A1] bg-white hover:bg-[#F6F8FA] focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                    >
                      <FaUserPlus className="mr-2 h-4 w-4" />
                      Register
                    </button>
                    <button
                      onClick={() => {
                        toggleSideBar();
                        handleRoleLogin("patient");
                      }}
                      className="inline-flex items-center justify-center w-full px-4 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-[#0067A1] hover:bg-[#004F7C] focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                    >
                      <FaUser className="mr-2 h-4 w-4" />
                      Login
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}
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
