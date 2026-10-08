"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FaUserMd,
  FaHome,
  FaCalendarAlt,
  FaVideo,
  FaClock,
  FaFileMedical,
  FaUser,
  FaUsers,
  FaSignOutAlt,
  FaBars,
  FaChevronRight,
  FaChevronLeft,
  FaBell,

  FaSearch,
  FaCog,
  FaEnvelope,
  FaCalendarCheck,
  FaExclamationCircle,
  FaChevronDown,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaFolderOpen,
  FaShareAlt,
  FaExternalLinkAlt,
  FaFileAlt,
  FaDownload,
  FaPhoneAlt,
  FaPhoneSlash,
  FaTimes,
  FaCheck,
  FaCheckDouble,
} from "react-icons/fa";
import api from "@/utils/websiteApi";

const formatMessageText = (message) => {
  if (!message) return "";
  try {
    let formattedMessage = message;

    // 0. Shorten raw UUIDs (e.g. #af0013e4-3e51-9485-f0e6d2475f98 -> #af0013e4)
    formattedMessage = formattedMessage.replace(
      /#?([a-f0-9]{8})-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi,
      "#$1"
    );

    // 1. Match YYYY-MM-DD
    const dateRegex = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
    formattedMessage = formattedMessage.replace(dateRegex, (match, y, m, d) => {
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      if (isNaN(date.getTime())) return match;
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    });

    // 2. Match HH:MM or HH:MM:SS (24-hour format) avoiding already formatted times
    const timeRegex = /\b(\d{2}):(\d{2})(?::(\d{2}))?(?!\s*(?:AM|PM|am|pm))\b/g;
    formattedMessage = formattedMessage.replace(timeRegex, (match, hh, mm, ss) => {
      let hours = Number(hh);
      const minutes = mm;
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = hours < 10 ? `0${hours}` : hours;
      return `${formattedHours}:${minutes} ${ampm}`;
    });

    // 3. Clean up any trailing seconds/colons after AM/PM indicators (e.g. PM:00 or PM:30)
    formattedMessage = formattedMessage
      .replace(/(AM|PM|am|pm):(\d{2})/g, '$1')
      .replace(/(AM|PM|am|pm):00/g, '$1');

    return formattedMessage;
  } catch (err) {
    console.error("Error formatting message text:", err);
    return message;
  }
};

const getInitials = (name) => {
  if (!name || typeof name !== "string") return "DR";
  const parts = name.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0] ? parts[0].slice(0, 2) : "DR").toUpperCase();
};

export default function DoctorDashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorId, setDoctorId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("doctorSidebarCollapsed") === "true";
    }
    return false;
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("doctorSidebarCollapsed", String(next));
      return next;
    });
  };

  const [doctorImage, setDoctorImage] = useState(null);
  const [notificationTab, setNotificationTab] = useState("all"); // 'all' | 'unread'
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [modalNotifications, setModalNotifications] = useState([]);
  const [modalPage, setModalPage] = useState(1);
  const [modalHasMore, setModalHasMore] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // --- Shared Documents (Layer-111 Digital Locker Sharing) ---
  const [showSharedDocsModal, setShowSharedDocsModal] = useState(false);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [sharedDocsLoading, setSharedDocsLoading] = useState(false);

  const fetchDoctorProfile = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const res = await fetch(`/api/doctor/profile?doctor_id=${uid}`);
      if (res.ok) {
        const data = await res.json();
        const prof = data?.profile || data?.data;
        if (prof?.profile_picture) {
          setDoctorImage(prof.profile_picture);
        }
        if (prof?.name && prof.name !== "Doctor") {
          setDoctorName(prof.name.replace(/^Dr\.\s*/i, ""));
        }
      }
    } catch (err) {
      console.warn("Failed to load doctor profile:", err);
    }
  }, []);

  const fetchSharedDocs = useCallback(async () => {
    if (!doctorId) return;
    try {
      setSharedDocsLoading(true);
      const res = await fetch(`/api/digital-locker/doctor/shares?doctor_id=${doctorId}`);
      const data = await res.json();
      if (data.success) {
        setSharedDocs(data.shares);
      }
    } catch (error) {
      console.error("Failed to fetch shared docs", error);
    } finally {
      setSharedDocsLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (showSharedDocsModal) {
      fetchSharedDocs();
    }
  }, [showSharedDocsModal, fetchSharedDocs]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Session Agreement Gate (Layer-111 Phase 4H) ──
  // Prompts doctor to agree to session terms on first login each day.
  // Stored in sessionStorage — resets on each new browser session.
  const [sessionAgreed, setSessionAgreed] = useState(true); // default true to avoid flash

  useEffect(() => {
    if (typeof window === "undefined") return;

    const role = localStorage.getItem("userRole");
    const storedUser = localStorage.getItem("userData");
    const storedUserId = localStorage.getItem("userId");

    // Allow doctors to access onboarding/KYC without an active session
    const isOnboardingPath = pathname.startsWith("/doctor/onboarding");

    if (role !== "doctor" && !isOnboardingPath) {
      router.replace("/website");
      return;
    }

    if (storedUserId) {
      setDoctorId(storedUserId);
      fetchDoctorProfile(storedUserId);
      // Register FCM device token + foreground listener
      initNotifications(storedUserId);
    }

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const name =
          parsed?.details?.full_name || parsed?.full_name || parsed?.name;
        if (name) {
          // Remove "Dr." prefix if present
          const cleanedName = name.replace(/^Dr\.\s*/i, "");
          setDoctorName(cleanedName);
        }

        // Extract profile picture from stored userData
        let pic = parsed?.profile_picture || parsed?.avatar || parsed?.details?.profile_picture;
        if (!pic && parsed?.details?.passport_photo) {
          if (Array.isArray(parsed.details.passport_photo) && parsed.details.passport_photo.length > 0) {
            pic = parsed.details.passport_photo[0];
          } else if (typeof parsed.details.passport_photo === "string") {
            try {
              const arr = JSON.parse(parsed.details.passport_photo);
              if (Array.isArray(arr) && arr.length > 0) pic = arr[0];
              else if (typeof arr === "string") pic = arr;
            } catch {
              if (parsed.details.passport_photo.startsWith("http")) pic = parsed.details.passport_photo;
            }
          }
        }
        if (pic && typeof pic === "string") {
          pic = pic.replace(/^'+|'+$/g, "").replace(/::text$/i, "").trim();
          if (pic.startsWith("http") && !pic.includes("::text")) {
            setDoctorImage(pic);
          }
        }
      } catch {
        // ignore parsing errors, keep default name
      }
    }

    // Check if session agreement has been confirmed today
    const todayKey = `session_agreed_${new Date().toISOString().split("T")[0]}`;
    const alreadyAgreed = sessionStorage.getItem(todayKey) === "yes";
    setSessionAgreed(alreadyAgreed);
  }, [pathname, router, fetchDoctorProfile]);

  // Synchronize doctor image on profile update events
  useEffect(() => {
    const handleSyncProfile = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("userData");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const pic = parsed?.profile_picture || parsed?.avatar || parsed?.details?.profile_picture;
            if (pic && typeof pic === "string" && pic.startsWith("http")) {
              setDoctorImage(pic);
            }
          } catch {}
        }
        if (doctorId) {
          fetchDoctorProfile(doctorId);
        }
      }
    };

    window.addEventListener("userProfileUpdated", handleSyncProfile);
    window.addEventListener("storage", handleSyncProfile);
    return () => {
      window.removeEventListener("userProfileUpdated", handleSyncProfile);
      window.removeEventListener("storage", handleSyncProfile);
    };
  }, [doctorId, fetchDoctorProfile]);

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
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker
          .register("/firebase-messaging-sw.js")
          .catch(() => {});
        await navigator.serviceWorker.ready;
      }

      const { generateDeviceToken, onForegroundMessage } = await import(
        "@/lib/firebaseClient"
      );

      const token = await generateDeviceToken();
      if (token) {
        await fetch("/api/save-fcm-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: uid, fcm_token: token }),
        });
        console.log("[FCM] Doctor device token saved");
      }

      // Foreground listener — show incoming push as toast
      if (!foregroundListenerRef.current) {
        foregroundListenerRef.current = true;
        onForegroundMessage((payload) => {
          console.log("[FCM] Foreground push:", payload);
          const title = payload?.notification?.title || "Notification";
          const body = payload?.notification?.body || "";
          toast(body || title, {
            duration: 6000,
            icon: "🔔",
          });

          // Trigger a re-fetch of the notification list in the header
          fetchNotifications(uid);
        });
      }
    } catch (err) {
      console.warn("[FCM] Notification init failed:", err.message);
    }
  };

  const fetchNotifications = useCallback(async (userId) => {
    if (!userId) return;
    try {
      setNotificationsLoading(true);
      const res = await api.post("/notifications/get", {
        user_id: userId,
        unread: false,
        page: 1,
      });

      if (res?.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!doctorId || unreadCount === 0) return;
    try {
      await api.post("/notifications/read", {
        user_id: doctorId,
      });

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
        }))
      );
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  }, [doctorId, unreadCount]);

  useEffect(() => {
    if (doctorId) {
      fetchNotifications(doctorId);
    }
  }, [doctorId, fetchNotifications]);

  const loadModalPage = useCallback(
    async (page) => {
      if (!doctorId) return;
      try {
        setModalLoading(true);
        const res = await api.post("/notifications/get", {
          user_id: doctorId,
          unread: false,
          page,
        });
        const list = Array.isArray(res?.data) ? res.data : [];
        setModalNotifications(list);
        setModalPage(page);
        setModalHasMore(list.length === 15);
      } catch (error) {
        console.error("Failed to load notifications page", error);
      } finally {
        setModalLoading(false);
      }
    },
    [doctorId]
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return "DR";
    const parts = String(name).trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const handleLogout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
      localStorage.removeItem("userData");
      localStorage.removeItem("authToken");
      localStorage.removeItem("userId");
    }
    router.replace("/website");
  }, [router]);

  const getNotificationIcon = (type, title = "", message = "") => {
    const combined = `${type || ""} ${title || ""} ${message || ""}`.toLowerCase();

    if (
      combined.includes("slot") ||
      combined.includes("time") ||
      combined.includes("consumed") ||
      combined.includes("schedule")
    ) {
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
          <FaClock className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (
      combined.includes("consultation") ||
      combined.includes("video") ||
      combined.includes("teleconsult") ||
      combined.includes("call")
    ) {
      return (
        <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-[#0067A1] shadow-sm shrink-0">
          <FaVideo className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (
      combined.includes("prescription") ||
      combined.includes("rx") ||
      combined.includes("medication") ||
      combined.includes("medicine")
    ) {
      return (
        <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shadow-sm shrink-0">
          <FaFileMedical className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (
      combined.includes("appointment") ||
      combined.includes("booked") ||
      combined.includes("booking")
    ) {
      return (
        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
          <FaCalendarCheck className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-sm shrink-0">
        <FaBell className="w-3.5 h-3.5" />
      </div>
    );
  };

  const formatNotificationTime = (createdAt) => {
    if (!createdAt) return "";
    try {
      const date = new Date(createdAt);
      if (isNaN(date.getTime())) return "";

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);

      if (diffSecs < 60) {
        return "Just now";
      }

      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) {
        return `${diffMins} ${diffMins === 1 ? "min" : "mins"} ago`;
      }

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        const isToday = now.getDate() === date.getDate() &&
                        now.getMonth() === date.getMonth() &&
                        now.getFullYear() === date.getFullYear();
        if (isToday) {
          const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
          return `Today at ${timeStr}`;
        }
      }

      // Check yesterday
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = yesterday.getDate() === date.getDate() &&
                          yesterday.getMonth() === date.getMonth() &&
                          yesterday.getFullYear() === date.getFullYear();
      if (isYesterday) {
        const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
        return `Yesterday at ${timeStr}`;
      }

      // Otherwise show elegant formatted date
      const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      return `${dateStr} • ${timeStr}`;
    } catch (err) {
      console.error("Error formatting notification date:", err);
      return "";
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    if (!doctorId || !notificationId) return;
    try {
      await api.post("/notifications/read", {
        user_id: doctorId,
        notification_ids: [notificationId],
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                read: true,
              }
            : n
        )
      );
      setModalNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                read: true,
              }
            : n
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!doctorId || !notificationId) return;
    try {
      await api.post("/notifications/delete", {
        user_id: doctorId,
        notification_ids: [notificationId],
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setModalNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  };

  // Handle notification click — mark read + route to relevant page
  const handleNotificationClick = (notification, closeDropdown = false) => {
    // Mark as read if unread
    if (!notification.read) {
      handleMarkNotificationRead(notification.id);
    }

    // Close dropdown/modal
    if (closeDropdown) {
      setShowNotifications(false);
    } else {
      setShowNotificationsModal(false);
    }

    // Try metadata action_url first
    let actionUrl = null;
    try {
      const meta = typeof notification.metadata === "string"
        ? JSON.parse(notification.metadata)
        : notification.metadata;
      actionUrl = meta?.action_url || meta?.redirect_url || null;
    } catch { }
    actionUrl = actionUrl || notification.action_url || notification.redirect_url || null;

    if (actionUrl) {
      router.push(actionUrl);
      return;
    }

    let metaObj = null;
    try {
      metaObj = typeof notification.metadata === "string"
        ? JSON.parse(notification.metadata)
        : notification.metadata;
    } catch { }

    const appointmentId = metaObj?.appointment_id || metaObj?.id || metaObj?.consultation_id || notification.appointment_id;

    // Route by notification type
    const type = (notification.type || "").toLowerCase();
    if (
      type === "appointment" ||
      type === "appointment_status" ||
      type === "appointment_reminder" ||
      type === "appointment_reschedule" ||
      type === "appointment_booked"
    ) {
      if (appointmentId) {
        router.push(`/doctor/appointments?id=${appointmentId}&date=all&status=all`);
      } else {
        router.push("/doctor/appointments?date=all&status=all");
      }
    } else if (
      type === "instant_call" ||
      type === "instant_request" ||
      type === "instant"
    ) {
      router.push("/doctor/appointments?date=all&status=all");
    } else if (
      type === "consultation" ||
      type === "teleconsultation" ||
      type === "video_call_started"
    ) {
      if (appointmentId) {
        router.push(`/doctor/appointments?id=${appointmentId}&date=all&status=all`);
      } else {
        router.push("/doctor/appointments?date=all&status=all");
      }
    } else if (type === "prescription") {
      router.push("/doctor/prescriptions");
    } else {
      // Default fallback — go to dashboard
      router.push("/doctor");
    }
  };

  const openNotificationsModal = () => {
    if (!doctorId) return;
    setShowNotificationsModal(true);
    setModalNotifications(notifications);
    setModalPage(1);
    setModalHasMore(notifications.length === 15);
  };

  const navItems = [
    {
      href: "/doctor",
      label: "Overview",
      icon: FaUserMd,
      description: "Dashboard overview",
    },

    {
      href: "/doctor/appointments",
      label: "Appointments",
      icon: FaCalendarAlt,
      description: "Booked consultations",
    },
    {
      href: "/doctor/manage-slots",
      label: "Manage Slots",
      icon: FaClock,
      description: "Schedule management",
    },
    {
      href: "/doctor/prescriptions",
      label: "Prescriptions",
      icon: FaFileMedical,
      description: "Patient prescriptions",
    },
    {
      href: "/doctor/my-patients",
      label: "My Patients",
      icon: FaUsers,
      description: "Patient directory & visits",
    },
    {
      href: "/doctor/profile-settings",
      label: "Profile Settings",
      icon: FaUser,
      description: "Account settings",
    },
  ];

  const isActive = (href) => {
    if (href === "/doctor") {
      return pathname === "/doctor";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Onboarding pages are accessed by unauthenticated doctors via invite links.
  // Render them without the dashboard shell (no sidebar, no session gate).
  if (pathname.startsWith("/doctor/onboarding")) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen bg-[#F8FAFC] overflow-hidden">
      {/* ── Session Agreement Gate Modal ── */}
      {!sessionAgreed && (
        <div className="fixed inset-0 z-[9999] flex sm:items-center sm:justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm overflow-hidden">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-md p-6 sm:p-8 flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200 pb-safe">
            <div className="space-y-6 my-auto">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#0067A1] flex items-center justify-center mx-auto shadow-xl">
                <FaUserMd className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-slate-900">Daily Session Agreement</h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  By proceeding, you confirm that:
                </p>
              </div>
              <div className="text-left space-y-3">
                {[
                  "All AI suggestions are assistive only — final clinical decisions are yours alone.",
                  "You are practising under a valid and current medical registration.",
                  "You will not complete consultations with unresolved HIGH clinical risk flags without documented justification.",
                  "Patient data accessed today is solely for the clinical purpose of this session.",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#0067A1]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[#0067A1] text-xs font-bold">{i + 1}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-2">
              <button
                onClick={() => {
                  const todayKey = `session_agreed_${new Date().toISOString().split("T")[0]}`;
                  sessionStorage.setItem(todayKey, "yes");
                  setSessionAgreed(true);
                  // MC-3: Persist to DB for medico-legal audit trail (non-blocking)
                  fetch("/api/doctor/session-agreement", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${typeof window !== "undefined" ? localStorage.getItem("userId") : ""}`,
                    },
                    body: JSON.stringify({}),
                  }).catch(() => {});
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white font-bold text-sm shadow-lg shadow-[#0067A1]/20 hover:shadow-xl transition-all cursor-pointer"
              >
                I Understand &amp; Agree — Start Session
              </button>
              <p className="text-[10px] text-slate-400">This prompt appears once per browser session per day.</p>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#003358] flex flex-col transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 flex items-center justify-between h-20 shrink-0 border-b border-white/10">
              <Link
                href="/doctor"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md border border-white/20 shrink-0 overflow-hidden">
                  <img
                    src="/real-logo.png"
                    alt="MediConnect"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-bold text-white tracking-wide leading-tight">
                    MediConnect
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-300">
                    Doctor Portal
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                      active
                        ? "bg-white text-[#0067A1] shadow-md"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`flex-shrink-0 transition-colors ${
                        active ? "text-[#0067A1]" : "text-white/60 group-hover:text-white"
                      } w-5 h-5`}
                    />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          active ? "bg-[#0067A1]/10 text-[#0067A1]" : "bg-white/20 text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Footer actions */}
            <div className="p-4 shrink-0 border-t border-white/10 bg-black/10">
              <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#0067A1] text-white flex items-center justify-center font-bold text-sm shadow-md overflow-hidden border border-white/20 shrink-0">
                  {doctorImage ? (
                    <img
                      src={doctorImage}
                      alt={doctorName}
                      className="w-full h-full object-cover"
                      onError={() => setDoctorImage(null)}
                    />
                  ) : (
                    getInitials(doctorName)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {doctorName || "Doctor"}
                  </p>
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm transition-all duration-200 w-full text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 font-medium border border-transparent hover:border-rose-500/30"
              >
                <FaSignOutAlt className="flex-shrink-0 w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </>
      )}


      <div className="flex h-full">
        {/* Desktop Sidebar */}
        <aside className={`hidden md:flex md:flex-col h-full min-h-0 bg-[#003358] border-r border-[#003358] shadow-[4px_0_24px_rgba(0,0,0,0.1)] shrink-0 transition-all duration-300 relative z-40 ${isSidebarCollapsed ? "w-20" : "w-72"}`}>
          {/* Header */}
          <div className={`p-5 flex items-center h-20 shrink-0 border-b border-white/10 ${isSidebarCollapsed ? "justify-center relative" : "justify-between"}`}>
            <Link
              href="/doctor"
              className="flex items-center gap-3 overflow-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md border border-white/20 shrink-0 overflow-hidden">
                <img
                  src="/real-logo.png"
                  alt="MediConnect"
                  className="w-full h-full object-contain"
                />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-bold text-white tracking-wide whitespace-nowrap leading-tight">
                    MediConnect
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-300 whitespace-nowrap">
                    Doctor Portal
                  </span>
                </div>
              )}
            </Link>

            <button
              onClick={toggleSidebarCollapse}
              className={`hidden md:flex p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors ${
                isSidebarCollapsed 
                  ? "absolute -right-3.5 top-1/2 -translate-y-1/2 bg-[#003358] border border-white/20 shadow-lg rounded-full z-10 w-7 h-7 items-center justify-center hover:scale-110" 
                  : ""
              }`}
            >
              {isSidebarCollapsed ? (
                <FaChevronRight className="w-3 h-3" />
              ) : (
                <FaChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5 custom-scrollbar min-h-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`relative w-full flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                    active
                      ? "bg-white text-[#0067A1] shadow-md"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Icon
                    className={`flex-shrink-0 transition-colors ${
                      active ? "text-[#0067A1]" : "text-white/60 group-hover:text-white"
                    } ${isSidebarCollapsed ? "w-6 h-6" : "w-5 h-5"}`}
                  />
                  {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                  {!isSidebarCollapsed && item.badge && (
                    <span
                      className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        active ? "bg-[#0067A1]/10 text-[#0067A1]" : "bg-white/20 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer actions */}
          <div className="p-4 shrink-0 border-t border-white/10 bg-black/10">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10 mb-3 overflow-hidden">
                <div className="w-10 h-10 shrink-0 rounded-full bg-[#0067A1] text-white flex items-center justify-center font-bold text-sm shadow-md overflow-hidden border border-white/20">
                  {doctorImage ? (
                    <img
                      src={doctorImage}
                      alt={doctorName}
                      className="w-full h-full object-cover"
                      onError={() => setDoctorImage(null)}
                    />
                  ) : (
                    getInitials(doctorName)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {doctorName || "Doctor"}
                  </p>
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              title={isSidebarCollapsed ? "Logout" : undefined}
              className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm transition-all duration-200 w-full text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 font-medium border border-transparent hover:border-rose-500/30 ${isSidebarCollapsed ? "justify-center" : "justify-center"}`}
            >
              <FaSignOutAlt className={`flex-shrink-0 ${isSidebarCollapsed ? "w-6 h-6" : "w-4 h-4"}`} />
              {!isSidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>


        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          
          {/* Header */}
          <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-5 sm:px-6 lg:px-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-4">

              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-center justify-center"
              >
                <FaBars className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 sm:gap-5">
              {/* Notifications Dropdown */}
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  className="relative w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center justify-center shadow-xs cursor-pointer"
                  title="Notifications"
                >
                  <FaBell className="w-4 h-4 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Menu */}
                {showNotifications && (
                  <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-1rem)] sm:w-[430px] max-w-[450px] max-h-[82vh] sm:max-h-[580px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.06)] border border-slate-200 overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            Notifications
                          </h3>
                          {unreadCount > 0 ? (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-bold rounded-full">
                              {unreadCount} unread
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[11px] font-semibold rounded-full">
                              All caught up
                            </span>
                          )}
                        </div>

                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllNotificationsRead}
                            className="inline-flex items-center gap-1.5 text-xs text-[#0067A1] hover:text-[#004f7c] font-semibold px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
                            title="Mark all as read"
                          >
                            <FaCheckDouble className="w-3 h-3" />
                            <span>Mark all read</span>
                          </button>
                        )}
                      </div>

                      {/* Filter Tabs */}
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setNotificationTab("all")}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            notificationTab === "all"
                              ? "bg-[#0067A1] text-white shadow-xs"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
                          }`}
                        >
                          All ({notifications.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotificationTab("unread")}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            notificationTab === "unread"
                              ? "bg-[#0067A1] text-white shadow-xs"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
                          }`}
                        >
                          Unread ({unreadCount})
                        </button>
                      </div>
                    </div>

                    {/* Notification Items */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                      {notificationsLoading ? (
                        <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                          <div className="w-6 h-6 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin mx-auto" />
                          <p>Loading alerts...</p>
                        </div>
                      ) : (notificationTab === "unread" ? notifications.filter(n => !n.read) : notifications).length > 0 ? (
                        (notificationTab === "unread" ? notifications.filter(n => !n.read) : notifications).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3.5 sm:p-4 transition-colors cursor-pointer flex items-start gap-3 group ${
                              !notification.read
                                ? "bg-sky-50/35 hover:bg-sky-50/60 border-l-[3px] border-l-[#0067A1]"
                                : "bg-white hover:bg-slate-50 border-l-[3px] border-l-transparent"
                            }`}
                            onClick={() => handleNotificationClick(notification, true)}
                          >
                            <div className="mt-0.5 shrink-0">
                              {getNotificationIcon(notification.type, notification.title, notification.message)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider truncate">
                                  {notification.title || "Alert"}
                                </p>
                                {!notification.read && (
                                  <span className="w-2 h-2 rounded-full bg-[#0067A1] shrink-0" title="Unread" />
                                )}
                              </div>
                              <p className="text-xs sm:text-[13px] text-slate-800 font-medium leading-relaxed break-words">
                                {formatMessageText(notification.message)}
                              </p>
                              <div className="flex items-center justify-between gap-2 mt-2">
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {formatNotificationTime(notification.created_at)}
                                </span>
                                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                  {!notification.read && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkNotificationRead(notification.id);
                                      }}
                                      className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                      title="Mark as read"
                                    >
                                      <FaCheck className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notification.id);
                                    }}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Delete notification"
                                  >
                                    <FaTrash className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 px-6 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                            <FaBell className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-semibold text-slate-700">
                            {notificationTab === "unread" ? "No unread alerts" : "No alerts yet"}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                            {notificationTab === "unread"
                              ? "You are all caught up with your consultation activity."
                              : "New appointments, consultation updates, and slot activity will appear here."}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-500 font-medium">
                        Showing {notifications.length} alert{notifications.length === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotifications(false);
                          openNotificationsModal();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0067A1] text-white font-semibold hover:bg-[#004F7C] transition-colors shadow-xs"
                      >
                        <span>View all</span>
                        <FaChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile logout */}
              <button
                onClick={handleLogout}
                className="md:hidden inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
              >
                <FaSignOutAlt className="w-3 h-3 mr-1.5" />
                Logout
              </button>

              {/* Desktop Profile Dropdown */}
              <div className="hidden md:block relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-[#0067A1] text-white flex items-center justify-center text-xs font-bold shadow-xs overflow-hidden border border-slate-200 shrink-0">
                      {doctorImage ? (
                        <img
                          src={doctorImage}
                          alt={doctorName}
                          className="w-full h-full object-cover"
                          onError={() => setDoctorImage(null)}
                        />
                      ) : (
                        getInitials(doctorName)
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-500/20"></div>
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
                      {doctorName || "Doctor"}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-medium">Online</p>
                  </div>
                  <FaChevronDown
                    className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#0067A1] text-white flex items-center justify-center text-lg font-bold overflow-hidden border border-slate-200 shadow-xs shrink-0">
                          {doctorImage ? (
                            <img
                              src={doctorImage}
                              alt={doctorName}
                              className="w-full h-full object-cover"
                              onError={() => setDoctorImage(null)}
                            />
                          ) : (
                            getInitials(doctorName)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {doctorName || "Doctor"}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            Attending Physician
                          </p>
                          <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                            Active now
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="py-2">
                      <Link
                        href="/doctor/profile-settings"
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <FaEdit className="w-4 h-4 text-slate-500" />
                        <span>Edit Profile</span>
                      </Link>
                     
                      <div className="border-t border-slate-100 my-2"></div>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <FaSignOutAlt className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                      <p className="text-xs text-slate-500">
                        Last login: Today, 09:42 AM
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Assistive Tool Disclaimer Banner */}
          <div className="bg-gradient-to-r from-[#0067A1]/5 to-[#14B8A6]/5 border-b border-[#0067A1]/10 px-5 py-2 text-center backdrop-blur-md">
            <p className="text-[10px] sm:text-xs font-bold text-[#0067A1] flex items-center justify-center gap-2 tracking-wide uppercase">
              <FaUserMd className="w-3.5 h-3.5 text-[#14B8A6] animate-pulse" />
              <span>AI Clinical Assistant Enabled — Final clinical decisions are made by the attending physician</span>
            </p>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto px-3 py-3 sm:px-2 sm:py-6 lg:px-4 lg:py-4 bg-[#F8FAFC] pb-20 md:pb-4">
            <div className="w-full mx-auto">
              <div className=" md:min-h-[calc(100vh-12rem)] p-2 sm:p-2 lg:p-2">
                {children}
              </div>
            </div>
          </main>

          {/* Desktop Footer */}
          <footer className="hidden md:flex relative z-10 h-12 bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(15,23,42,0.04)] items-center justify-between px-5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-slate-600">
                mediconnect.fit® Doctor Panel v2.1
              </span>
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-slate-500">
                  System operational
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </footer>

          {/* ── Mobile Footer Navigation Bar (Doctor Panel) ── */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around">
            <Link
              href="/doctor"
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                pathname === "/doctor"
                  ? "text-[#0067A1] font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div className={`p-1 rounded-lg ${pathname === "/doctor" ? "bg-[#0067A1]/10 text-[#0067A1]" : ""}`}>
                <FaHome className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">Home</span>
            </Link>

            <Link
              href="/doctor/appointments"
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                pathname?.startsWith("/doctor/appointments")
                  ? "text-[#0067A1] font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div className={`p-1 rounded-lg ${pathname?.startsWith("/doctor/appointments") ? "bg-[#0067A1]/10 text-[#0067A1]" : ""}`}>
                <FaCalendarAlt className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">Appts</span>
            </Link>

            <Link
              href="/doctor/prescriptions"
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                pathname?.startsWith("/doctor/prescriptions")
                  ? "text-[#0067A1] font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div className={`p-1 rounded-lg ${pathname?.startsWith("/doctor/prescriptions") ? "bg-[#0067A1]/10 text-[#0067A1]" : ""}`}>
                <FaFileMedical className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">Rx</span>
            </Link>

            <Link
              href="/doctor/my-patients"
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                pathname?.startsWith("/doctor/my-patients")
                  ? "text-[#0067A1] font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div className={`p-1 rounded-lg ${pathname?.startsWith("/doctor/my-patients") ? "bg-[#0067A1]/10 text-[#0067A1]" : ""}`}>
                <FaUsers className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">Patients</span>
            </Link>

            <Link
              href="/doctor/profile-settings"
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                pathname?.startsWith("/doctor/profile-settings")
                  ? "text-[#0067A1] font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div className="relative">
                <div className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-all ${
                  pathname?.startsWith("/doctor/profile-settings")
                    ? "border-[#0067A1] ring-2 ring-[#0067A1]/20"
                    : "border-slate-300"
                }`}>
                  {doctorImage ? (
                    <img
                      src={doctorImage}
                      alt={doctorName || "Profile"}
                      className="w-full h-full object-cover"
                      onError={() => setDoctorImage(null)}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#0067A1] text-white flex items-center justify-center text-[10px] font-bold">
                      {getInitials(doctorName)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white"></div>
              </div>
              <span className="text-[10px] mt-0.5">Profile</span>
            </Link>
          </nav>
        </div>
      </div>
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center bg-black/60 p-0 sm:px-4 overflow-hidden">
          <div className="w-full h-full sm:h-auto sm:max-w-lg sm:max-w-2xl bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 sm:max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0067A1] flex items-center justify-center text-white">
                  <FaBell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    All Notifications
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Review your recent alerts with pagination
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {modalLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Loading notifications...
                </div>
              ) : modalNotifications.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {modalNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 sm:px-6 py-3.5 flex items-start gap-3 sm:gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors ${
                        !n.read ? "bg-[#0067A1]/5" : "bg-white"
                      }`}
                      onClick={() => handleNotificationClick(n, false)}
                    >
                      <div className="mt-0.5">
                        {getNotificationIcon(n.type, n.title, n.message)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          {n.type || "Notification"}
                        </p>
                        <p className="text-sm font-medium text-slate-800 break-words">
                          {formatMessageText(n.title || n.message)}
                        </p>
                        {n.message && n.title && (
                          <p className="text-xs text-slate-600 break-words">
                            {formatMessageText(n.message)}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <FaCalendarAlt className="w-3 h-3" />
                          {formatNotificationTime(n.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-1">
                        {!n.read && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMarkNotificationRead(n.id); }}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                          >
                            <FaCheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteNotification(n.id); }}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                        >
                          <FaTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <FaBell className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    No notifications found
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Appointment updates, instant call alerts and other
                    activity will appear here.
                  </p>
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">
                Page {modalPage}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={modalPage === 1 || modalLoading}
                  onClick={() => loadModalPage(Math.max(1, modalPage - 1))}
                  className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!modalHasMore || modalLoading}
                  onClick={() => loadModalPage(modalPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Floating Shared Records Button (Layer-111) --- */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[40]">
        <button
          onClick={() => setShowSharedDocsModal(true)}
          className="flex flex-col items-center gap-2 px-3 py-6 bg-[#0067A1] text-white rounded-l-3xl shadow-2xl hover:translate-x-[-4px] transition-all group border-y border-l border-[#0067A1]/20"
        >
          <div className="relative">
            <FaShareAlt className="w-5 h-5 animate-bounce-slow" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0067A1] animate-pulse" />
          </div>
          <span className="[writing-mode:vertical-lr] rotate-180 font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">
            Shared Records
          </span>
        </button>
      </div>

      {/* --- Shared Records Modal --- */}
      {showSharedDocsModal && (
        <div className="fixed inset-0 z-[100] flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            onClick={() => setShowSharedDocsModal(false)} 
          />
          <div className="relative w-full h-full sm:h-auto sm:max-w-4xl bg-[#F8FAFC] rounded-none sm:rounded-xl shadow-2xl border-0 sm:border border-white overflow-hidden sm:max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#0067A1] rounded-lg flex items-center justify-center shadow-md shadow-[#0067A1]/20">
                  <FaFolderOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">Shared Documents</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Records shared with you by patients for review</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSharedDocsModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all border border-slate-100"
              >
                <span className="text-lg">✕</span>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
              {sharedDocsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin" />
                  <p className="text-slate-400 font-bold text-sm">Accessing clinical vault...</p>
                </div>
              ) : sharedDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-xl border border-slate-100 mb-6">
                    <FaShareAlt className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">No records found</h3>
                  <p className="text-slate-500 mt-2 max-w-xs mx-auto">Patient records shared during active appointments will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sharedDocs.map((share) => (
                    <div 
                      key={share.id}
                      className="bg-white rounded-3xl p-6 border border-white shadow-sm hover:shadow-xl hover:translate-y-[-2px] transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          share.status === 'ACTIVE' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {share.status}
                        </span>
                      </div>

                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-[#0067A1] group-hover:text-white transition-all">
                          <FaFileAlt className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 pr-16">
                          <p className="text-[10px] font-bold text-[#0067A1] uppercase tracking-widest mb-1">
                            {share.digital_locker?.document_type}
                          </p>
                          <h4 className="text-sm font-black text-slate-900 truncate">
                            {share.digital_locker?.document_name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                            <FaUser className="w-3 h-3" />
                            Patient: {share.patient_details?.full_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="space-y-1">
                          <p className="text-[9px] text-slate-400 uppercase font-black">Valid Until</p>
                          <p className="text-[11px] font-bold text-slate-700">{formatDate(share.expires_at)}</p>
                        </div>
                        
                        <div className="flex gap-2">
                          {share.status === 'ACTIVE' ? (
                            <>
                              <a 
                                href={share.digital_locker?.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-black/10 text-xs font-bold"
                                title="View Record"
                              >
                                <FaExternalLinkAlt className="w-3.5 h-3.5" />
                                View Record
                              </a>
                            </>
                          ) : (
                            <div className="text-[10px] text-red-500 font-black uppercase bg-red-50 px-3 py-2 rounded-xl">
                              Access Expired
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-900 text-center">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                Secure Clinical Data Gateway • Powered by Layer-111
              </p>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
