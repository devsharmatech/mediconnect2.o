"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FaUser,
  FaSearch,
  FaBell,
  FaChevronDown,
  FaUserPlus,
  FaSignInAlt,
  FaHeartbeat,
  FaUserMd,
  FaFlask,
  FaPills,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const role = localStorage.getItem("userRole");
    const storedUser = localStorage.getItem("userData");

    if (role && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setUserRole(role);
        setIsLoggedIn(true);
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

    setMounted(true);
  }, []);

  const handleOpenSignup = useCallback((e) => {
    e?.preventDefault();
    setActiveModal("signup");
    setIsTransitioning(false);
  }, []);

  const handleCloseSignup = useCallback(() => {
    setIsTransitioning(true);
    // Close the mobile menu if it's open
    toggleSideBar?.()
    // Small delay to allow the modal close animation to complete
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
    // Close the mobile menu if it's open
    toggleSideBar?.()
    // Small delay to allow the modal close animation to complete
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
      localStorage.removeItem("authToken");
      localStorage.removeItem("userId");
    }
    // Close mobile menu if open
    if (isMenuOpen) {
      toggleSideBar?.();
    }
    // Redirect to home
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
      <nav
        className="sticky top-0 z-[999] border-b border-gray-100 bg-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* LOGO */}
            <div className="shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <img src={settings?.logo || "/real-logo.png"} alt={settings?.site_name || "MediConnect"} className="h-16 w-auto object-contain" />
              </Link>
            </div>

            {/* DESKTOP NAV (Right aligned) */}
            <div className="hidden lg:flex items-center space-x-2 xl:space-x-4">
              {/* Nav Links */}
              <div className="flex items-center space-x-1">
                <NavLink href="/" active={pathname === "/"}>
                  Home
                </NavLink>
                <NavLink
                  href="/services"
                  active={pathname === "/services"}
                >
                  Services
                </NavLink>
                <NavLink
                  href="/resources"
                  active={pathname === "/resources"}
                >
                  Resources
                </NavLink>
                <NavLink
                  href="/doctors"
                  active={pathname === "/doctors"}
                >
                  Doctors
                </NavLink>

                <NavLink
                  href="/about"
                  active={pathname === "/about"}
                >
                  About
                </NavLink>
                <NavLink
                  href="/contact"
                  active={pathname === "/contact"}
                >
                  Contact Us
                </NavLink>
              </div>
              
              {/* CTA & Profile */}
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
                      className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0067A1] whitespace-nowrap transition-colors"
                    >
                      <FaUser className="mr-2 h-4 w-4 text-white" />
                      Login / Register
                      <FaChevronDown className={`ml-2 h-3 w-3 transition-transform duration-200 ${isLoginMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isLoginMenuOpen && (
                      <div className="absolute right-0 mt-3 w-[260px] rounded-2xl shadow-2xl bg-white border border-gray-100 z-50 overflow-hidden">
                        <div className="p-3">
                          <button
                            onClick={(e) => { setIsLoginMenuOpen(false); handleOpenSignup(e); }}
                            className="flex items-center gap-3 w-full px-3 py-3 text-left text-sm text-[#0067A1] bg-[#f0fdfa] border border-[#ccfbf1] hover:bg-[#ccfbf1] rounded-xl transition-colors mb-3 shadow-sm"
                          >
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                              <FaUserPlus className="w-3.5 h-3.5 text-[#0067A1]" />
                            </div>
                            <div className="font-bold">Register New Account</div>
                          </button>
                          
                          <p className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-2">Login to Dashboard</p>
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

            {/* MOBILE MENU BUTTON */}
            <MobileMenuButton
              isOpen={isMenuOpen}
              onClick={toggleSideBar}
            />
          </div>
        </div>
        
        {/* Mobile navigation menu (shown on small screens) */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white shadow-lg">
            <div className="px-4 pt-2 pb-4 space-y-1">
              <MobileNavLink
                href="/"
                active={pathname === "/"}
                onClick={toggleSideBar}
              >
                Home
              </MobileNavLink>
              <MobileNavLink
                href="/services"
                active={pathname === "/services"}
                onClick={toggleSideBar}
              >
                Services
              </MobileNavLink>
              <MobileNavLink
                href="/resources"
                active={pathname === "/resources"}
                onClick={toggleSideBar}
              >
                Resources
              </MobileNavLink>
              <MobileNavLink
                href="/doctors"
                active={pathname === "/doctors"}
                onClick={toggleSideBar}
              >
                Doctors
              </MobileNavLink>

              <MobileNavLink
                href="/about"
                active={pathname === "/about"}
                onClick={toggleSideBar}
              >
                About
              </MobileNavLink>
              <MobileNavLink
                href="/contact"
                active={pathname === "/contact"}
                onClick={toggleSideBar}
              >
                Contact Us
              </MobileNavLink>

              {!mounted ? (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="w-full h-11 bg-gray-100 animate-pulse rounded-lg"></div>
                  <div className="w-full h-11 bg-gray-100 animate-pulse rounded-lg"></div>
                </div>
              ) : !isLoggedIn && (
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
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

const MobileMenuButton = ({ isOpen, onClick }) => (
  <div className="flex items-center lg:hidden mr-2">
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-[#003358] focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
    >
      <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
      {isOpen ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
    </button>
  </div>
);

const NavLink = ({ href, active, children }) => (
  <Link
    href={href}
    className={`${active
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
    className={`block rounded-md px-3 py-2 text-sm font-medium ${active
      ? "text-[#003358] bg-gray-50"
      : "text-gray-600 hover:text-[#003358] hover:bg-gray-50"
      }`}
  >
    {children}
  </Link>
);

const IconButton = ({ icon, className = "", ...props }) => (
  <button
    className={`p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
    {...props}
  >
    {icon}
  </button>
);
export default Navbar;
