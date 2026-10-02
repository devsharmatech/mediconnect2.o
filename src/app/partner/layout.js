"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import {
  LayoutDashboard, Package, ClipboardList, Users,
  LogOut, Menu, X, ChevronRight, RefreshCw,
  Phone, Building2, Bell, Heart, ShieldCheck,
  ExternalLink, UserCheck
} from "lucide-react";

function getPartner() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("partnerUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function PartnerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [partner, setPartner] = useState(null);
  const [checked, setChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const isLoginPage = pathname === "/partner/login";
    const p = getPartner();

    if (!p && !isLoginPage) {
      router.replace("/partner/login");
    } else {
      setPartner(p);
      setChecked(true);
    }
  }, [pathname, router]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("partnerUser");
    router.replace("/partner/login");
  }, [router]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new Event("partner-refresh-leads"));
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Skip layout chrome for login page
  if (pathname === "/partner/login") {
    return (
      <>
        <Toaster position="top-right" />
        {children}
      </>
    );
  }

  // Auth checking state
  if (!checked || !partner) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-[#0067A1] rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">Loading Partner Portal...</p>
        </div>
      </div>
    );
  }

  const partnerServices = Array.isArray(partner.services) ? partner.services : [];
  const serviceLabel = partnerServices.includes("nursing") && partnerServices.includes("equipment")
    ? "Equipment & Nursing Bureau"
    : partnerServices.includes("equipment")
    ? "Medical Equipment Partner"
    : "Home Nursing Care Partner";

  // Sidebar navigation items requested by user
  const navItems = [
    {
      href: "/partner/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      description: "Overview & Quick Dispatch",
    },
    {
      href: "/partner/equipment-requests",
      label: "Equipment Requests",
      icon: Package,
      description: "Machines & Device Orders",
      highlight: partnerServices.includes("equipment"),
    },
    {
      href: "/partner/assigned-leads",
      label: "Assigned Leads",
      icon: ClipboardList,
      description: "Nursing & Equipment Care",
    },
    {
      href: "/partner/patient-information",
      label: "Patient Information",
      icon: Users,
      description: "Patient Identity & Location",
    },
  ];

  const isActive = (href) => {
    if (href === "/partner/dashboard") {
      return pathname === "/partner/dashboard" || pathname === "/partner";
    }
    return pathname.startsWith(href);
  };

  const getPageTitle = () => {
    if (pathname.includes("/equipment-requests")) return "Equipment Requests";
    if (pathname.includes("/assigned-leads")) return "Assigned Leads Directory";
    if (pathname.includes("/patient-information")) return "Patient Information & Location";
    return "Partner Operations Dashboard";
  };

  const getInitials = (name) => {
    if (!name) return "PT";
    const parts = String(name).trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Toaster position="top-right" />

      {/* ========================================================================= */}
      {/* 1. DESKTOP SIDEBAR (Deep MediConnect Navy #003358, Doctor & Admin theme)  */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex md:flex-col w-64 lg:w-72 bg-[#003358] border-r border-[#002642] shadow-[4px_0_24px_rgba(0,0,0,0.12)] shrink-0 z-40 select-none">
        
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between h-20 shrink-0 border-b border-white/10">
          <Link href="/partner/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 group-hover:bg-white/20 transition-all shadow-sm">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-white tracking-wide">
                  MediConnect
                </span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  Partner
                </span>
              </div>
              <p className="text-[11px] text-sky-200/70 font-medium">Healthcare Operations</p>
            </div>
          </Link>
        </div>

        {/* Partner Badge Card */}
        <div className="mx-4 mt-4 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0067A1] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
              {getInitials(partner.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate" title={partner.name}>
                {partner.name}
              </p>
              <p className="text-[11px] text-sky-300 truncate font-medium">
                {serviceLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            Portal Navigation
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                  active
                    ? "bg-white text-[#0067A1] shadow-lg shadow-black/10 font-semibold"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${
                  active ? "bg-[#0067A1]/10 text-[#0067A1]" : "text-white/60 group-hover:text-white"
                }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-[#0067A1]" />}
                  </div>
                  <p className={`text-[10px] truncate ${active ? "text-[#0067A1]/70" : "text-white/40"}`}>
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info & Logout */}
        <div className="p-4 shrink-0 border-t border-white/10 bg-black/15">
          <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl border border-white/10 mb-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {partner.contact_person || partner.name}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Verified Partner</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-white/50 block">ID: {partner.phone?.slice(-4)}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 w-full text-rose-300 hover:bg-rose-500/20 hover:text-white border border-rose-500/20 hover:border-rose-500/40 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Portal</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE SIDEBAR DRAWER (Slide-over with Backdrop Blur)                   */}
      {/* ========================================================================= */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="relative w-72 max-w-[85vw] bg-[#003358] flex flex-col h-full shadow-2xl z-50">
            {/* Header */}
            <div className="p-5 flex items-center justify-between h-20 shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-base font-bold text-white tracking-wide">
                    MediConnect
                  </span>
                  <p className="text-[11px] text-sky-200/70 font-medium">Partner Portal</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav */}
            <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                      active
                        ? "bg-white text-[#0067A1] shadow-md font-semibold"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="p-4 shrink-0 border-t border-white/10 bg-black/15">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold w-full text-rose-300 hover:bg-rose-500/20 hover:text-white border border-rose-500/20"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN PORTAL WRAPPER (Top Header + Page Content)                        */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Header Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-xs">
          
          {/* Left: Mobile Toggle & Page Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span>Partner Portal</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-[#0067A1] font-semibold">{getPageTitle()}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          {/* Right: Actions & User Info */}
          <div className="flex items-center gap-2.5">
            {/* Refresh Leads button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              title="Refresh lead assignments"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#0067A1] ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Direct Logout on Header */}
            <button
              onClick={handleLogout}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>

            {/* Partner Avatar Profile Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-[#0067A1] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {getInitials(partner.name)}
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <p className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                  {partner.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  +91 {partner.phone}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60">
          {children}
        </main>
      </div>

    </div>
  );
}
