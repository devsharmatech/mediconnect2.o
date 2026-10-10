"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ClipboardList,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";
import { getLoggedInUser, logoutUser } from "@/lib/authHelpers";

const getInitials = (name) => {
  if (!name || typeof name !== "string") return "CH";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0] ? parts[0].slice(0, 2) : "CH").toUpperCase();
};

export default function ChemistSidebar({ open, mobileOpen, onToggle, onCloseMobile }) {
  const [chemistName, setChemistName] = useState("Pharmacist");
  const [pharmacyName, setPharmacyName] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const user = getLoggedInUser("chemist");
    if (user?.details?.pharmacist_name) {
      setChemistName(user.details.pharmacist_name);
    } else if (user?.name) {
      setChemistName(user.name);
    }
    if (user?.details?.pharmacy_name) {
      setPharmacyName(user.details.pharmacy_name);
    }
  }, []);

  const menuItems = [
    {
      name: "Dashboard",
      icon: Home,
      path: "/chemist/dashboard",
    },
    {
      name: "Medicine Orders",
      icon: ClipboardList,
      path: "/chemist/orders",
    },
    {
      name: "Profile Settings",
      icon: User,
      path: "/chemist/profile",
    },
  ];

  const isActive = (path) => {
    if (path === "/chemist/dashboard") {
      return pathname === "/chemist/dashboard";
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const handleLogout = () => {
    logoutUser("chemist");
    router.push("/chemist/login");
  };

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileOpen) {
        onCloseMobile?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {/* ── Mobile Offcanvas Drawer ── */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 md:hidden ${
          mobileOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop overlay */}
        <div
          className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onCloseMobile}
        />

        {/* Offcanvas Drawer Content */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#003358] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between h-16 shrink-0 border-b border-white/10">
            <Link
              href="/chemist/dashboard"
              onClick={onCloseMobile}
              className="flex items-center gap-3 overflow-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md border border-white/20 shrink-0 overflow-hidden">
                <img
                  src="/real-logo.png"
                  alt="MediConnect"
                  className="w-full h-full object-cover scale-[1.38] -translate-y-1"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold text-white tracking-wide leading-tight whitespace-nowrap">
                  MediConnect
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-300 whitespace-nowrap">
                  Chemist Portal
                </span>
              </div>
            </Link>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onCloseMobile}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                    active
                      ? "bg-white text-[#0067A1] shadow-md font-semibold"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-[#0067A1]" : "text-white/60"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Profile & Logout */}
          <div className="p-3 shrink-0 border-t border-white/10 bg-black/10">
            <div className="flex items-center gap-2.5 px-3 py-2 bg-white/5 rounded-xl border border-white/10 mb-2 overflow-hidden">
              <div className="w-8 h-8 shrink-0 rounded-full bg-[#0067A1] text-white flex items-center justify-center font-bold text-xs shadow-md overflow-hidden border border-white/20">
                {getInitials(chemistName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {chemistName || "Pharmacist"}
                </p>
                {pharmacyName && (
                  <p className="text-[11px] text-white/60 truncate">
                    {pharmacyName}
                  </p>
                )}
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 w-full text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 font-medium border border-transparent hover:border-rose-500/30 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex md:flex-col h-full min-h-0 bg-[#003358] shrink-0 transition-all duration-300 ease-in-out relative z-40 ${
          open
            ? "w-72 border-r border-[#003358] shadow-[4px_0_24px_rgba(0,0,0,0.1)]"
            : "w-0 overflow-hidden border-0 shadow-none pointer-events-none"
        }`}
      >
        <div className="w-72 flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="p-4 flex items-center h-16 shrink-0 border-b border-white/10 justify-between">
            <Link
              href="/chemist/dashboard"
              className="flex items-center gap-3 overflow-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md border border-white/20 shrink-0 overflow-hidden">
                <img
                  src="/real-logo.png"
                  alt="MediConnect"
                  className="w-full h-full object-cover scale-[1.38] -translate-y-1"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold text-white tracking-wide whitespace-nowrap leading-tight">
                  MediConnect
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-300 whitespace-nowrap">
                  Chemist Portal
                </span>
              </div>
            </Link>

            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimize Sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium ${
                    active
                      ? "bg-white text-[#0067A1] shadow-md font-semibold"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`flex-shrink-0 transition-colors ${
                      active ? "text-[#0067A1]" : "text-white/60 group-hover:text-white"
                    } w-4 h-4`}
                  />
                  <span className="whitespace-nowrap">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Profile & Logout */}
          <div className="p-3 shrink-0 border-t border-white/10 bg-black/10">
            <div className="flex items-center gap-2.5 px-3 py-2 bg-white/5 rounded-xl border border-white/10 mb-2 overflow-hidden">
              <div className="w-8 h-8 shrink-0 rounded-full bg-[#0067A1] text-white flex items-center justify-center font-bold text-xs shadow-md overflow-hidden border border-white/20">
                {getInitials(chemistName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {chemistName || "Pharmacist"}
                </p>
                {pharmacyName && (
                  <p className="text-[11px] text-white/60 truncate">
                    {pharmacyName}
                  </p>
                )}
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 w-full text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 font-medium border border-transparent hover:border-rose-500/30 cursor-pointer"
            >
              <LogOut className="flex-shrink-0 w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}