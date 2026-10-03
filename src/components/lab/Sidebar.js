"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  Beaker,
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Microscope,
} from "lucide-react";
import { getLoggedInUser, logoutUser } from "@/lib/authHelpers";

export default function LabSidebar({
  open,
  mobileOpen,
  onToggle,
  onCloseMobile,
}) {
  const [labName, setLabName] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const user = getLoggedInUser("lab");
    if (user) {
      (async () => {
        try {
          const nameRes = await fetch("/api/lab/my-name", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id }),
          });
          const nameData = await nameRes.json();
          if (nameData.success && nameData.lab_name) {
            setLabName(nameData.lab_name);
          } else {
            setLabName(user.details?.lab_name || user.details?.full_name || "Diagnostic Lab");
          }
        } catch {
          setLabName(user.details?.lab_name || user.details?.full_name || "Diagnostic Lab");
        }
      })();
    }
  }, []);

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/lab/dashboard",
    },
    {
      name: "Test Orders",
      icon: ClipboardList,
      path: "/lab/orders",
    },
    {
      name: "Test Catalog",
      icon: Beaker,
      path: "/lab/tests",
    },
    {
      name: "Lab Profile",
      icon: Building2,
      path: "/lab/profile",
    },
  ];

  const handleLogout = () => {
    logoutUser("lab");
    router.push("/lab/login");
  };

  const getInitials = (name) => {
    if (!name) return "LB";
    const parts = String(name).trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const isActive = (path) => {
    if (path === "/lab/dashboard") return pathname === "/lab/dashboard" || pathname === "/lab";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Mobile Offcanvas Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden cursor-pointer transition-opacity duration-300 animate-in fade-in"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar / Mobile Offcanvas */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          w-64 max-w-[85vw] sm:max-w-none
          bg-[#003358] border-r border-[#002847]
          h-screen transition-transform duration-300 ease-in-out flex flex-col
          shadow-2xl lg:shadow-[4px_0_24px_rgba(0,0,0,0.15)]
          overflow-hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${open ? "lg:translate-x-0 lg:pointer-events-auto" : "lg:-translate-x-full lg:pointer-events-none"}
        `}
      >
        {/* Brand Header */}
        <div className="p-4 h-20 flex items-center justify-between shrink-0 border-b border-white/10">
          <Link
            href="/lab/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden group"
          >
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0 group-hover:bg-white/20 transition-all">
              <Microscope className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold text-white tracking-wide whitespace-nowrap">
                MediConnect
              </span>
              <span className="text-[11px] font-medium text-sky-300 tracking-wider uppercase">
                Diagnostic Portal
              </span>
            </div>
          </Link>

          {/* Desktop Minimize/Close Button */}
          <button
            onClick={onToggle}
            className="hidden lg:flex p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Minimize sidebar"
            aria-label="Minimize sidebar"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Mobile Offcanvas Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close navigation"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5 custom-scrollbar min-h-0">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onCloseMobile}
                className={`relative w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                  active
                    ? "bg-white text-[#0067A1] shadow-md font-semibold"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    active ? "text-[#0067A1]" : "text-white/70 group-hover:text-white"
                  }`}
                />
                <span className="whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Lab Profile & Sign Out */}
        <div className="p-4 shrink-0 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-xl border border-white/10 mb-3 overflow-hidden">
            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-[#0067A1] to-[#0095E8] flex items-center justify-center text-white font-bold text-xs shadow-md border border-white/10">
              {getInitials(labName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {labName || "Diagnostic Lab"}
              </p>
              <p className="text-[11px] text-sky-200 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                Online • Verified Lab
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 w-full text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 font-medium border border-transparent hover:border-rose-500/30 cursor-pointer"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
