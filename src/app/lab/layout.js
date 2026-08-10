"use client";

import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/lab/Sidebar";
import Navbar from "@/components/lab/Navbar";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { getLoggedInUser } from "@/lib/authHelpers";
import { usePathname } from "next/navigation";
import DpdpConsentModal from "@/components/lab/DpdpConsentModal";

export default function LabLayout({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const foregroundListenerRef = useRef(false);

  const checkLogin = () => {
    const user = getLoggedInUser("lab");
    setIsLoggedIn(!!user);
    if (user?.id) {
      setUserId(user.id);
    }
  };

  /** Initialize FCM push notifications for lab panel */
  const initLabFCM = async (userId) => {
    try {
      // Register service worker
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker
          .register("/firebase-messaging-sw.js")
          .catch(() => { });
        await navigator.serviceWorker.ready;
      }

      const { generateDeviceToken, onForegroundMessage } = await import(
        "@/lib/firebaseClient"
      );

      // Get token & save
      const token = await generateDeviceToken();
      if (token) {
        await fetch("/api/save-fcm-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, fcm_token: token }),
        });
        console.log("[FCM] Lab device token saved");
      }

      // Foreground listener
      if (!foregroundListenerRef.current) {
        foregroundListenerRef.current = true;
        onForegroundMessage((payload) => {
          console.log("[FCM] Lab foreground push:", payload);
          const title = payload?.notification?.title || "Notification";
          const body = payload?.notification?.body || "";

          toast(body || title, { duration: 6000, icon: "🔔" });

          // Tell navbar to refresh notification count
          window.dispatchEvent(new Event("refresh-lab-notifications"));
        });
      }
    } catch (err) {
      console.warn("[FCM] Lab notification init failed:", err.message);
    }
  };

  useEffect(() => {
    setMounted(true);
    checkLogin();

    // Init FCM for lab
    const user = getLoggedInUser("lab");
    if (user?.id) {
      initLabFCM(user.id);
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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-800 rounded-full animate-pulse"></div>
          <div className="text-gray-800 font-bold text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  // Check for both login routes - lab
  if (pathname === "/lab/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 cursor-default relative">
      <Toaster position="top-right" />
      
      {isLoggedIn && userId && (
        <DpdpConsentModal role="lab" userId={userId} />
      )}

      {isLoggedIn && (
        <Sidebar
          open={sidebarOpen}
          mobileOpen={mobileSidebarOpen}
          onToggle={handleSidebarToggle}
          onMobileToggle={handleMobileSidebarToggle}
          onCloseMobile={closeMobileSidebar}
        />
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isLoggedIn ? (sidebarOpen ? "lg:ml-64" : "lg:ml-16") : ""
          }`}
      >
        {isLoggedIn && (
          <Navbar
            onMenuClick={handleMobileSidebarToggle}
            sidebarOpen={sidebarOpen}
          />
        )}

        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          {children}
        </main>
      </div>

    </div>
  );
}

