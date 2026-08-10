"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Navbar from "@/components/admin/Navbar";
import { Toaster } from "react-hot-toast";
import { getLoggedInUser } from "@/lib/authHelpers";
import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({ children }) {
  // null = unknown (checking), true = logged in, false = not logged in
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const user = getLoggedInUser("admin");
    const loggedIn = !!user;
    setIsLoggedIn(loggedIn);

    // If not on the login page AND not authenticated → redirect to login
    if (!pathname.includes("/admin/login") && !loggedIn) {
      router.replace("/admin/login");
    }
  }, [pathname]);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMobileSidebarToggle = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  // Let the login page render without layout chrome (no auth check needed)
  if (pathname === "/admin/login") {
    return (
      <div className="admin-root">
        <style jsx global>{`
          .admin-root * {
            font-family: var(--font-poppins), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
        `}</style>
        {children}
      </div>
    );
  }

  // isLoggedIn === null → still checking localStorage (SSR hydration)
  // isLoggedIn === false → not authenticated, redirect in progress
  // Both cases: show spinner, NEVER show page content
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-semibold text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Only render full layout for authenticated admins
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 cursor-default relative admin-root">
      <style jsx global>{`
        .admin-root * {
          font-family: var(--font-poppins), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        .admin-content button, 
        .admin-content a, 
        .admin-content select, 
        .admin-content input[type="checkbox"],
        .admin-content [role="button"] {
          cursor: pointer !important;
        }
      `}</style>
      <Sidebar
        open={sidebarOpen}
        mobileOpen={mobileSidebarOpen}
        onToggle={handleSidebarToggle}
        onMobileToggle={handleMobileSidebarToggle}
        onCloseMobile={closeMobileSidebar}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 admin-content ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-16"
        }`}
      >
        <Navbar
          onMenuClick={handleMobileSidebarToggle}
          sidebarOpen={sidebarOpen}
        />

        {children}
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1f2937",
            color: "#fff",
            backdropFilter: "blur(10px)",
          },
        }}
      />
    </div>
  );
}
