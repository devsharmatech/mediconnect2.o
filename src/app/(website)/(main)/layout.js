"use client";

import "../../website-globals.css";
import Navbar from "@/components/public-site/layout/Navbar";
import Footer from "@/components/public-site/layout/footer";
import ComplianceStrip from "@/components/public-site/ui/ComplianceStrip";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { FaWifi } from "react-icons/fa";
import { AlertCircle } from "lucide-react";

// Routes that use their own dashboard layout (no Navbar/Footer)
const dashboardRoutes = [
  "/dashboard",
  "/appointments",
  "/lab-reports",
  "/digital-locker",
  "/profile",
  "/settings",
  "/heart-health",
  "/heart-health-result",
  "/heart-health-statistics",
  "/lung-assessment",
  "/lung-health-result",
  "/lung-health-statistics",
  "/medicine-order",
  "/nursing-care/status",
  "/find-doctors",
];

export default function MainLayout({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleSideBar = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (!navigator.onLine) setIsOffline(true);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check if current route is a dashboard route
  const isDashboardRoute = dashboardRoutes.some((route) =>
    pathname?.startsWith(route)
  );

  const OfflineBanner = () => (
    isOffline ? (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-3 shadow-lg animate-in slide-in-from-top duration-300">
        <AlertCircle className="w-5 h-5 animate-pulse" />
        <p className="text-sm font-bold tracking-wide">
          OFFLINE MODE — Your changes will be synced once connection is restored.
        </p>
      </div>
    ) : null
  );

  // If it's a dashboard route, render children without Navbar/Footer
  if (isDashboardRoute) {
    return (
      <>
        <OfflineBanner />
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <OfflineBanner />
      <Navbar isMenuOpen={isMenuOpen} toggleSideBar={toggleSideBar} />
      <main className="flex-1 overflow-y-auto ">
        {children}
      </main>
      <ComplianceStrip />
      <Footer />
    </div>
  );
}
