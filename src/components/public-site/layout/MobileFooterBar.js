"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaUserMd, FaFlask, FaHeartbeat, FaUser } from "react-icons/fa";

export default function MobileFooterBar() {
  const pathname = usePathname() || "";

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
    refreshAuthState();

    window.addEventListener("auth-change", refreshAuthState);
    window.addEventListener("storage", refreshAuthState);

    return () => {
      window.removeEventListener("auth-change", refreshAuthState);
      window.removeEventListener("storage", refreshAuthState);
    };
  }, [refreshAuthState]);

  // Hide mobile bottom navigation on checkout pages to prevent accidental tab navigation and UI occlusion
  if (pathname.includes("/checkout")) {
    return null;
  }

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
      user?.details?.lab_owner_name ||
      "User"
    );
  };

  const rawName = getRawName();
  const displayName =
    userRole === "doctor" && !rawName.toLowerCase().startsWith("dr.") && !rawName.toLowerCase().startsWith("dr ")
      ? `Dr. ${rawName}`
      : rawName;

  const getInitials = (name) => {
    if (!name) return "U";
    const clean = name.replace(/^Dr\.\s*/i, "").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase() || "U";
  };

  const avatarUrl =
    user?.profile_picture ||
    user?.avatar ||
    user?.image ||
    user?.details?.profile_picture ||
    user?.details?.avatar ||
    user?.user?.profile_picture ||
    user?.user?.avatar ||
    user?.profile?.profile_picture ||
    user?.profile?.avatar ||
    null;

  // Determine role-based destination for any role
  const getDashboardHref = () => {
    if (!isLoggedIn) return "/";
    if (userRole === "doctor") return "/doctor";
    if (userRole === "chemist") return "/chemist/dashboard";
    if (userRole === "lab") return "/lab/dashboard";
    if (userRole === "admin") return "/admin";
    return "/website/dashboard";
  };

  const getDashboardLabel = () => {
    if (!isLoggedIn) return "Login";
    if (userRole === "doctor") return "Doctor";
    if (userRole === "chemist") return "Chemist";
    if (userRole === "lab") return "Lab";
    if (userRole === "admin") return "Admin";
    return "Dashboard";
  };

  const isDashboardActive = () => {
    if (!isLoggedIn) return false;
    if (userRole === "doctor") return pathname.startsWith("/doctor");
    if (userRole === "chemist") return pathname.startsWith("/chemist");
    if (userRole === "lab") return pathname.startsWith("/lab");
    if (userRole === "admin") return pathname.startsWith("/admin");
    return pathname.startsWith("/website/dashboard") || pathname.startsWith("/dashboard");
  };

  const handleProfileClick = (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent("open-login-modal", { detail: { userType: "patient" } })
      );
    }
  };

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: FaHome,
      isActive: pathname === "/",
    },
    {
      label: "Doctors",
      href: "/doctors",
      icon: FaUserMd,
      isActive: pathname.startsWith("/doctors"),
    },
    {
      label: "Lab Tests",
      href: "/services/lab-tests",
      icon: FaFlask,
      isActive: pathname.startsWith("/services/lab-tests"),
    },
    {
      label: "Home Care",
      href: "/nursing-care",
      icon: FaHeartbeat,
      isActive: pathname.startsWith("/nursing-care") || pathname.startsWith("/medical-equipment"),
    },
  ];

  const dashboardActive = isDashboardActive();

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[9990] bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around transition-all"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.isActive;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              active
                ? "text-[#0067A1] font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                active
                  ? "bg-sky-50 text-[#0067A1]"
                  : "text-slate-500"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span
              className={`text-[10px] mt-0.5 tracking-tight ${
                active ? "font-bold text-[#0067A1]" : "font-medium text-slate-500"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* 5th Tab: Role-Based Profile / Dashboard */}
      <Link
        href={getDashboardHref()}
        onClick={handleProfileClick}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
          dashboardActive
            ? "text-[#0067A1] font-bold"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <div className="relative">
          {mounted && isLoggedIn ? (
            <div
              className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-all flex items-center justify-center ${
                dashboardActive
                  ? "border-[#0067A1] ring-2 ring-[#0067A1]/20"
                  : "border-slate-300"
              }`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#0067A1] text-white flex items-center justify-center text-[10px] font-bold">
                  {getInitials(displayName)}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`p-1 rounded-lg transition-colors ${
                dashboardActive ? "bg-sky-50 text-[#0067A1]" : "text-slate-500"
              }`}
            >
              <FaUser className="w-4 h-4" />
            </div>
          )}

          {/* Active online green dot when logged in */}
          {mounted && isLoggedIn && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
          )}
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            dashboardActive
              ? "font-bold text-[#0067A1]"
              : "font-medium text-slate-500"
          }`}
        >
          {mounted ? getDashboardLabel() : "Dashboard"}
        </span>
      </Link>
    </nav>
  );
}
