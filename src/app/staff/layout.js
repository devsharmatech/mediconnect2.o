"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/staff/Sidebar";
import Navbar from "@/components/staff/Navbar";
import { Toaster } from "react-hot-toast";

export default function StaffLayout({ children }) {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    checkLogin();
  }, [pathname]);

  const checkLogin = () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("staffToken");
    const user = localStorage.getItem("staffUser");
    setIsLoggedIn(!!token && !!user);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#0067A1] rounded-full animate-pulse" />
          <div className="text-gray-800 font-bold text-xl">Mediconnect Staff</div>
        </div>
      </div>
    );
  }

  if (pathname === "/staff/login") {
    return <>{children}</>;
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn && typeof window !== "undefined") {
    window.location.href = "/staff/login";
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      {isLoggedIn && (
        <Sidebar
          open={sidebarOpen}
          mobileOpen={mobileSidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}>
        {isLoggedIn && (
          <Navbar
            onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            sidebarOpen={sidebarOpen}
          />
        )}
        {children}
      </div>

      {!pathname.includes("/login") && (
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: "#1f2937", color: "#fff" },
          }}
        />
      )}
    </div>
  );
}
