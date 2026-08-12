"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import PatientSidebar from "@/components/public-site/dashboard/PatientSidebar";
import PatientHeader from "@/components/public-site/dashboard/PatientHeader";
import AIDoctorChat from "@/components/AIDoctorChat";
import { FaUserMd } from "react-icons/fa";
import toast from "react-hot-toast";

const PatientDashboardLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is logged in
    const userId = localStorage.getItem("userId");
    const userRole = localStorage.getItem("userRole");
    const userData = localStorage.getItem("userData");

    if (!userId || userRole !== "patient") {
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

    // Register FCM device token + foreground listener
    initNotifications(userId);
  }, [router]);

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
    setIsSidebarOpen(!isSidebarOpen);
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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <PatientSidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        user={user}
        onOpenAssistant={() => setShowChat(true)}
      />

      {/* Main Content Area */}
      <div className={`${isCollapsed ? "lg:pl-20" : "lg:pl-64"} transition-all duration-300`}>
        {/* Header */}
        <PatientHeader user={user} onMenuClick={toggleSidebar} />

        {/* Mandatory Patient UI Disclaimer */}
        {showDisclaimer && (
          <div className="sticky top-16 z-20 bg-white/80 backdrop-blur-md border-b border-[#0067A1]/10 px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2 mx-auto">
              <div className="p-1 bg-[#0067A1]/5 rounded-lg shrink-0">
                <FaUserMd className="w-3.5 h-3.5 text-[#0067A1]" />
              </div>
              <span className="text-xs font-semibold text-gray-700 tracking-wide text-center">
                All diagnoses and prescriptions are provided by your consulting doctor.
              </span>
            </div>
            <button 
              onClick={() => setShowDisclaimer(false)}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 p-1.5 rounded-full shrink-0 transition-all duration-200"
              aria-label="Dismiss disclaimer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>

      {/* AI Screening Chatbot - Modal + Floating Button */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-4 sm:pb-20 sm:pr-6 bg-black/30 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none">
          <div className="w-full sm:w-[380px] bg-white sm:rounded-xl sm:shadow-2xl sm:border sm:border-slate-200 flex flex-col overflow-hidden" style={{height: '520px', maxHeight: '90vh'}}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0067A1] flex items-center justify-center shrink-0">
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

      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setShowChat(true)}
          className="w-11 h-11 rounded-lg bg-[#0067A1] text-white shadow-lg hover:shadow-xl flex items-center justify-center hover:bg-[#004F7C] transition-colors"
          aria-label="Open Dr. Mediconnect assistant"
        >
          <FaUserMd className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PatientDashboardLayout;
