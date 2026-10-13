"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/chemist/Sidebar";
import Navbar from "@/components/chemist/Navbar";
import { getLoggedInUser } from "@/lib/authHelpers";
import { usePathname, useRouter } from "next/navigation";
import DpdpConsentModal from "@/components/chemist/DpdpConsentModal";

export default function ChemistLayout({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/chemist/login";
  const isOnboardingPage = pathname?.startsWith("/chemist/onboarding");
  const isPublicPage = isLoginPage || isOnboardingPage;

  const checkLogin = () => {
    const user = getLoggedInUser("chemist");
    setIsLoggedIn(!!user);
    if (user?.id) {
      setUserId(user.id);
    }
    return !!user;
  };

  useEffect(() => {
    setMounted(true);
    const loggedIn = checkLogin();

    // If not logged in and on a protected route → redirect to login
    if (!loggedIn && !isPublicPage) {
      router.replace("/chemist/login");
    }
    // If logged in and on login or onboarding page → redirect to dashboard
    if (loggedIn && (isLoginPage || isOnboardingPage)) {
      router.replace("/chemist/dashboard");
    }
  }, [pathname]);

  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("chemistSidebarOpen", String(next));
        } catch {}
      }
      return next;
    });
  };

  const handleMobileSidebarToggle = () => {
    setMobileSidebarOpen((prev) => !prev);
  };

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileSidebarOpen((prev) => !prev);
    } else {
      handleSidebarToggle();
    }
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  // On public pages (login or onboarding) — render clean (no sidebar/navbar)
  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#003358] rounded-full animate-pulse"></div>
          <div className="text-[#003358] font-bold text-xl">MediConnect</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F8FAFC] overflow-hidden">
      {isLoggedIn && userId && (
        <DpdpConsentModal role="chemist" userId={userId} />
      )}

      <div className="flex h-full">
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
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {isLoggedIn && (
            <Navbar
              onMenuClick={handleToggle}
              sidebarOpen={sidebarOpen}
            />
          )}

          <main className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-6 lg:px-6 lg:py-6 bg-[#F8FAFC]">
            <div className="w-full mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
