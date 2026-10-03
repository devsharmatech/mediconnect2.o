"use client";

import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/lab/Sidebar";
import Navbar from "@/components/lab/Navbar";
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

  const handleNavMenuClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileSidebarOpen((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-3 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin"></div>
          <div className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Initializing Portal...</div>
        </div>
      </div>
    );
  }

  // Check for both login routes - lab
  if (pathname === "/lab/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 cursor-default relative">
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
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isLoggedIn ? (sidebarOpen ? "lg:ml-64" : "lg:ml-0") : ""
        }`}
      >
        {isLoggedIn && (
          <Navbar
            onMenuClick={handleNavMenuClick}
            sidebarOpen={sidebarOpen}
          />
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-auto">
          {children}
        </main>
      </div>

    </div>
  );
}

