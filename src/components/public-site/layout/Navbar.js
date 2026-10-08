"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [loginUserType, setLoginUserType] = useState("patient");
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState(null);

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

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    if (activeModal || isMenuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.position = "";
      document.body.style.width = "";
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
      <nav className="sticky top-0 z-[999] border-b border-gray-100 bg-white">
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
              <div className="flex items-center space-x-1">
                <NavLink href="/" active={pathname === "/"}>
                  Home
                </NavLink>
                <NavLink href="/services" active={pathname === "/services"}>
                  Services
                </NavLink>
                <NavLink href="/resources" active={pathname === "/resources"}>
                  Resources
                </NavLink>
                <NavLink href="/doctors" active={pathname === "/doctors"}>
                  Doctors
                </NavLink>
                <NavLink href="/about" active={pathname === "/about"}>
                  About
                </NavLink>
                <NavLink href="/contact" active={pathname === "/contact"}>
                  Contact Us
                </NavLink>
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
                        className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0067A1] whitespace-nowrap transition-colors shadow-sm"
                      >
                        <FaUser className="mr-2 h-4 w-4 text-white" />
                        Login / Register
                        <FaChevronDown
                          className={`ml-2 h-3 w-3 transition-transform duration-200 ${
                            isLoginMenuOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isLoginMenuOpen && (
                        <div className="absolute right-0 mt-3 w-[260px] rounded-2xl shadow-2xl bg-white border border-gray-100 z-50 overflow-hidden">
                          <div className="p-3">
                            <button
                              onClick={(e) => {
                                setIsLoginMenuOpen(false);
                                handleOpenSignup(e);
                              }}
                              className="flex items-center gap-3 w-full px-3 py-3 text-left text-sm text-[#0067A1] bg-[#f0fdfa] border border-[#ccfbf1] hover:bg-[#ccfbf1] rounded-xl transition-colors mb-3 shadow-sm"
                            >
                              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <FaUserPlus className="w-3.5 h-3.5 text-[#0067A1]" />
                              </div>
                              <div className="font-bold">Register New Account</div>
                            </button>

                            <p className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-2">
                              Login to Dashboard
                            </p>
                            <button
                              onClick={() => handleRoleLogin("patient")}
                              className="flex items-center gap-3 w-full px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FaUser className="w-4 h-4 text-[#0067A1]" />
                              </div>
                              <div>
                                <div className="font-medium">Patient</div>
                                <div className="text-xs text-gray-400">Book appointments</div>
                              </div>
                            </button>
                            <button
                              onClick={() => handleRoleLogin("doctor")}
                              className="flex items-center gap-3 w-full px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FaUserMd className="w-4 h-4 text-[#0067A1]" />
                              </div>
                              <div>
                                <div className="font-medium">Doctor</div>
                                <div className="text-xs text-gray-400">Manage patients</div>
                              </div>
                            </button>
                            <button
                              onClick={() => handleRoleLogin("chemist")}
                              className="flex items-center gap-3 w-full px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FaPills className="w-4 h-4 text-[#0067A1]" />
                              </div>
                              <div>
                                <div className="font-medium">Chemist</div>
                                <div className="text-xs text-gray-400">Manage pharmacy</div>
                              </div>
                            </button>
                            <button
                              onClick={() => handleRoleLogin("lab")}
                              className="flex items-center gap-3 w-full px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FaFlask className="w-4 h-4 text-[#0067A1]" />
                              </div>
                              <div>
                                <div className="font-medium">Lab</div>
                                <div className="text-xs text-gray-400">Manage tests</div>
                              </div>
                            </button>
                            <button
                              onClick={() => handleRoleLogin("nursing")}
                              className="flex items-center gap-3 w-full px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FaHeartbeat className="w-4 h-4 text-[#0067A1]" />
                              </div>
                              <div>
                                <div className="font-medium">Nursing Care</div>
                                <div className="text-xs text-gray-400">Request homecare</div>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* MOBILE CONTROLS (Profile Dropdown + Hamburger) */}
            <div className="flex items-center gap-2 lg:hidden">
              {mounted && isLoggedIn && (
                <ProfileDropdown user={user} userRole={userRole} onLogout={handleLogout} />
              )}
              <MobileMenuButton isOpen={isMenuOpen} onClick={toggleSideBar} />
            </div>
          </div>
        </div>

        {/* Mobile navigation menu drawer */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 pt-3 pb-6 space-y-2">
              {/* LOGGED IN USER CARD (MOBILE) */}
              {mounted && isLoggedIn && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/90 via-sky-50/40 to-slate-50 border border-sky-100 shadow-sm mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full bg-[#0067A1] text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 overflow-hidden ring-2 ring-white">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{getInitials(displayName)}</span>
                      )}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{displayName}</h4>
                        {isDoctor && (
                          <FaCheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" title="Verified Doctor" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{displayEmail}</p>
                      <div className="mt-1">
                        {isDoctor ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-800">
                            <FaUserMd className="w-2.5 h-2.5" /> Doctor
                          </span>
                        ) : isChemist ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                            Chemist
                          </span>
                        ) : isLab ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                            Lab
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-800">
                            Patient
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <Link
                    href={isDoctor ? "/doctor" : isChemist ? "/chemist/dashboard" : isLab ? "/lab/dashboard" : "/website/dashboard"}
                    onClick={toggleSideBar}
                    className="mt-3.5 flex items-center justify-between w-full py-2.5 px-4 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold text-xs rounded-xl shadow-md transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2">
                      {isDoctor ? <FaUserMd className="w-4 h-4" /> : <FaUser className="w-4 h-4" />}
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
                <MobileNavLink href="/services" active={pathname === "/services"} onClick={toggleSideBar}>
                  Services
                </MobileNavLink>
                <MobileNavLink href="/resources" active={pathname === "/resources"} onClick={toggleSideBar}>
                  Resources
                </MobileNavLink>
                <MobileNavLink href="/doctors" active={pathname === "/doctors"} onClick={toggleSideBar}>
                  Doctors
                </MobileNavLink>
                <MobileNavLink href="/about" active={pathname === "/about"} onClick={toggleSideBar}>
                  About
                </MobileNavLink>
                <MobileNavLink href="/contact" active={pathname === "/contact"} onClick={toggleSideBar}>
                  Contact Us
                </MobileNavLink>
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
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full mt-2 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <FaSignOutAlt className="w-4 h-4" />
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
    className={`${
      active
        ? "text-[#0067A1] font-semibold border-b-2 border-[#0067A1]"
        : "text-gray-600 hover:text-[#0067A1]"
    } px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap`}
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
