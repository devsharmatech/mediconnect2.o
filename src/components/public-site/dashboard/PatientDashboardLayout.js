"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import PatientSidebar from "@/components/public-site/dashboard/PatientSidebar";
import PatientHeader from "@/components/public-site/dashboard/PatientHeader";
import AIDoctorChat from "@/components/AIDoctorChat";
import { FaUserMd, FaHome, FaCalendarAlt, FaPills, FaUser } from "react-icons/fa";
import toast from "react-hot-toast";

const PatientDashboardLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Hydration-safe initial check for collapsed sidebar preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("patient_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch (e) {}
  }, []);

  const handleSetCollapsed = (val) => {
    setIsCollapsed((prev) => {
      const nextVal = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem("patient_sidebar_collapsed", nextVal ? "true" : "false");
      } catch (e) {}
      return nextVal;
    });
  };

  useEffect(() => {
    // Check if disclaimer was previously dismissed
    const isDismissed = localStorage.getItem("mediconnect_doctor_disclaimer_dismissed");
    if (!isDismissed) {
      setShowDisclaimer(true);
    }

    // Check if user is logged in (Any authenticated user can access patient dashboard)
    const userId = localStorage.getItem("userId");
    const userRole = localStorage.getItem("userRole");
    const userData = localStorage.getItem("userData");

    if (!userId) {
      router.push("/website");
      return;
    }

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }
    setLoading(false);

    // Fetch fresh user profile in background to ensure latest profile_picture & details are synced
    if (userId) {
      fetch(`/api/patient/profile?id=${userId}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            const freshUser = res.data;
            setUser((prev) => ({
              ...prev,
              ...freshUser,
              profile_picture:
                freshUser.profile_picture ||
                freshUser.profile?.profile_picture ||
                freshUser.user?.profile_picture ||
                prev?.profile_picture,
            }));
            try {
              const current = JSON.parse(localStorage.getItem("userData") || "{}");
              localStorage.setItem(
                "userData",
                JSON.stringify({
                  ...current,
                  ...freshUser,
                  profile_picture:
                    freshUser.profile_picture ||
                    freshUser.profile?.profile_picture ||
                    freshUser.user?.profile_picture ||
                    current.profile_picture,
                })
              );
            } catch (e) {}
          }
        })
        .catch((err) => console.warn("Background profile fetch:", err));
    }

    // Register FCM device token + foreground listener
    initNotifications(userId);
  }, [router]);

  // Listen for user profile updates from EditProfileModal or ProfilePage
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      if (e?.detail) {
        setUser((prev) => ({
          ...prev,
          ...e.detail,
          profile_picture:
            e.detail.profile_picture ||
            e.detail.profile?.profile_picture ||
            e.detail.user?.profile_picture ||
            prev?.profile_picture,
        }));
      } else {
        const stored = localStorage.getItem("userData");
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch (err) {}
        }
      }
    };

    window.addEventListener("userProfileUpdated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);

    return () => {
      window.removeEventListener("userProfileUpdated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const handleDismissDisclaimer = () => {
    localStorage.setItem("mediconnect_doctor_disclaimer_dismissed", "true");
    setShowDisclaimer(false);
  };

  /** Tracks whether foreground listener is already attached */
  const foregroundListenerRef = useRef(false);

  /**
   * 1. Register service-worker
   * 2. Request notification permission
   * 3. Generate & persist FCM device token
   * 4. Attach foreground push listener (toast)
   */
  const initNotifications = async (uid) => {
    try {
      // Ensure service-worker is registered (required before getToken)
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker
          .register("/firebase-messaging-sw.js")
          .catch(() => {});
        await navigator.serviceWorker.ready;
      }

      const { generateDeviceToken, onForegroundMessage } = await import(
        "@/lib/firebaseClient"
      );

      // Ask permission + get token
      const token = await generateDeviceToken();
      if (token) {
        await fetch("/api/save-fcm-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: uid, fcm_token: token }),
        });
        console.log("[FCM] Patient device token saved");
      }

      // Foreground listener — show incoming push as toast
      if (!foregroundListenerRef.current) {
        foregroundListenerRef.current = true;
        onForegroundMessage((payload) => {
          console.log("[FCM] Foreground push:", payload);
          const title = payload?.notification?.title || "Notification";
          const body = payload?.notification?.body || "";
          const type = payload?.data?.type;
          const appointmentId = payload?.data?.appointment_id;

          if (type === "video_call_started" && appointmentId) {
            toast(
              (t) => (
                <div
                  className="flex flex-col gap-1 cursor-pointer"
                  onClick={() => {
                    toast.dismiss(t.id);
                    window.location.href = `/appointments/${appointmentId}/video?userId=${uid}&role=patient`;
                  }}
                >
                  <span className="font-semibold text-sm">{title}</span>
                  <span className="text-xs text-gray-600">{body}</span>
                  <span className="text-xs text-[#0067A1] font-medium mt-0.5">Tap to join call →</span>
                </div>
              ),
              { duration: 15000, icon: "📞" }
            );
          } else {
            toast(body || title, {
              duration: 6000,
              icon: "🔔",
            });
          }

          // Refresh header notifications list
          window.dispatchEvent(new Event("refresh-notifications"));
        });
      }
    } catch (err) {
      console.warn("[FCM] Notification init failed:", err.message);
    }
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Allow other components (e.g., dashboard Start Chat button) to open the chat modal
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => setShowChat(true);
    window.addEventListener("open-dr-mediconnect-chat", handler);
    return () => {
      window.removeEventListener("open-dr-mediconnect-chat", handler);
    };
  }, []);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      handleSetCollapsed((prev) => !prev);
    } else {
      setIsSidebarOpen((prev) => !prev);
    }
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0067A1] mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}>
      {/* Sidebar */}
      <PatientSidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isCollapsed}
        setIsCollapsed={handleSetCollapsed}
        user={user}
        onOpenAssistant={() => setShowChat(true)}
      />

      {/* Main Content Area */}
      <div 
        className={`${isCollapsed ? "lg:pl-0" : "lg:pl-64"} transition-all duration-300 min-h-screen flex flex-col`}
        style={{
          "--patient-sidebar-width": isCollapsed ? "0rem" : "16rem",
        }}
      >
        {/* Header */}
        <PatientHeader 
          user={user} 
          onMenuClick={toggleSidebar} 
          isSidebarCollapsed={isCollapsed}
        />

        {/* Professional Persona Banner (when Doctor, Chemist, Lab or Admin is viewing Patient Panel) */}
        {typeof window !== "undefined" && localStorage.getItem("userRole") && localStorage.getItem("userRole") !== "patient" && (
          <div className="bg-gradient-to-r from-teal-50 via-sky-50 to-indigo-50 border-b border-teal-200/80 px-4 py-2 flex items-center justify-between text-xs font-medium text-gray-700 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span>
                You are in <strong>Patient View</strong> (Logged in as {localStorage.getItem("userRole").toUpperCase()})
              </span>
            </div>
            <Link
              href={
                localStorage.getItem("userRole") === "doctor"
                  ? "/doctor"
                  : localStorage.getItem("userRole") === "chemist"
                  ? "/chemist/dashboard"
                  : localStorage.getItem("userRole") === "lab"
                  ? "/lab/dashboard"
                  : "/admin"
              }
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-teal-700 hover:bg-teal-700 hover:text-white rounded-lg border border-teal-300 font-semibold transition-all shadow-xs"
            >
              <span>Return to {localStorage.getItem("userRole").charAt(0).toUpperCase() + localStorage.getItem("userRole").slice(1)} Dashboard →</span>
            </Link>
          </div>
        )}

        {/* Mandatory Patient UI Disclaimer */}
        {showDisclaimer && (
          <div className="sticky top-16 z-20 bg-white/80 backdrop-blur-md border-b border-[#0067A1]/10 px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2 mx-auto">
              <div className="p-1 bg-[#0067A1]/5 rounded-[5px] shrink-0">
                <FaUserMd className="w-3.5 h-3.5 text-[#0067A1]" />
              </div>
              <span className="text-xs font-semibold text-gray-700 tracking-wide text-center">
                All diagnoses and prescriptions are provided by your consulting doctor.
              </span>
            </div>
            <button 
              onClick={handleDismissDisclaimer}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 p-1.5 rounded-[5px] shrink-0 transition-all duration-200 cursor-pointer"
              aria-label="Dismiss disclaimer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className={`flex-1 pb-20 lg:pb-0 ${
          pathname?.includes("/lung-connect") || 
          pathname?.includes("/lung-activities") || 
          pathname?.includes("/lung-assessment") || 
          pathname?.includes("/lung-health") || 
          pathname?.includes("/respiratory-history") || 
          pathname?.includes("/cardio-connect") || 
          pathname?.includes("/heart-health-statistics") ||
          pathname?.includes("/heart-health-result") ||
          pathname?.includes("/heart-health-history") ||
          pathname?.includes("/heart-health")
            ? "p-0" 
            : "p-4 md:p-6"
        }`}>{children}</main>

        {/* ── Mobile Footer Navigation Bar (Patient Panel) ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around">
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              pathname === "/dashboard" || pathname === "/website/dashboard"
                ? "text-[#0067A1] font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname === "/dashboard" || pathname === "/website/dashboard" ? "bg-[#0067A1]/10 text-[#0067A1]" : ""}`}>
              <FaHome className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Home</span>
          </Link>

          <Link
            href="/appointments"
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              pathname?.startsWith("/appointments") || pathname?.startsWith("/website/appointments")
                ? "text-[#0067A1] font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname?.startsWith("/appointments") || pathname?.startsWith("/website/appointments") ? "bg-[#0067A1]/10 text-[#0067A1]" : ""}`}>
              <FaCalendarAlt className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Appts</span>
          </Link>

          <Link
            href="/website/find-doctors"
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              pathname?.startsWith("/website/find-doctors") || pathname?.startsWith("/find-doctors")
                ? "text-[#0067A1] font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname?.startsWith("/website/find-doctors") || pathname?.startsWith("/find-doctors") ? "bg-[#0067A1]/10 text-[#0067A1]" : ""}`}>
              <FaUserMd className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Doctors</span>
          </Link>

          <Link
            href="/website/medicine-order"
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              pathname?.startsWith("/website/medicine-order") || pathname?.startsWith("/medicine-order")
                ? "text-[#0067A1] font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname?.startsWith("/website/medicine-order") || pathname?.startsWith("/medicine-order") ? "bg-[#0067A1]/10 text-[#0067A1]" : ""}`}>
              <FaPills className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Medicines</span>
          </Link>

          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              pathname?.startsWith("/profile") || pathname?.startsWith("/website/profile")
                ? "text-[#0067A1] font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="relative">
              <div className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-all ${
                pathname?.startsWith("/profile") || pathname?.startsWith("/website/profile")
                  ? "border-[#0067A1] ring-2 ring-[#0067A1]/20"
                  : "border-slate-300"
              }`}>
                {user?.profile_picture || user?.avatar ? (
                  <img
                    src={user.profile_picture || user.avatar}
                    alt={user?.full_name || "Profile"}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full bg-[#0067A1] text-white flex items-center justify-center text-[10px] font-bold uppercase">
                    {(user?.full_name || user?.name || "P").slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white"></div>
            </div>
            <span className="text-[10px] mt-0.5">Profile</span>
          </Link>
        </nav>
      </div>

      {/* AI Screening Chatbot - Modal + Floating Button */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4 sm:pb-20 sm:pr-6 bg-black/40 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none">
          <div className="w-full h-full sm:h-[520px] sm:w-[380px] bg-white rounded-none sm:rounded-[5px] sm:shadow-2xl sm:border sm:border-slate-200 flex flex-col overflow-hidden max-h-none sm:max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[5px] bg-[#0067A1] flex items-center justify-center shrink-0">
                  <FaUserMd className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 leading-none">Dr. Mediconnect</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Health Assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChat(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <AIDoctorChat />
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-20 lg:bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setShowChat(true)}
          className="w-11 h-11 rounded-[5px] bg-[#0067A1] text-white shadow-lg hover:shadow-xl flex items-center justify-center hover:bg-[#004F7C] transition-colors"
          aria-label="Open Dr. Mediconnect assistant"
        >
          <FaUserMd className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PatientDashboardLayout;
