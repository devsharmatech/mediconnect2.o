"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaUser,
  FaSignOutAlt,
  FaChevronDown,
  FaBell,
  FaBars,
  FaSearch,
  FaCog,
  FaCalendarAlt,
  FaCalendarCheck,
  FaFileMedical,
  FaExclamationCircle,
  FaCheckCircle,
  FaTrash,
  FaPills,
  FaVideo,
  FaFlask,
  FaCreditCard,
  FaCheckDouble,
  FaClock,
  FaChevronRight,
  FaTimes,
} from "react-icons/fa";
import api from "@/utils/websiteApi";
import toast from "react-hot-toast";

const formatMessageText = (message) => {
  if (!message) return "";
  try {
    // 1. Match YYYY-MM-DD
    const dateRegex = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
    let formattedMessage = message.replace(dateRegex, (match, y, m, d) => {
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

// RFC-4122 UUID validation — prevents stale dev localStorage values reaching Postgres
const isValidUUID = (val) =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const PatientHeader = ({ user, onMenuClick, isSidebarCollapsed }) => {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [modalNotifications, setModalNotifications] = useState([]);
  const [modalPage, setModalPage] = useState(1);
  const [modalHasMore, setModalHasMore] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeCallAppointmentId, setActiveCallAppointmentId] = useState(null);
  const [showActiveCallBanner, setShowActiveCallBanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "unread"
  const [modalFilterType, setModalFilterType] = useState("all");
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  const displayedNotifications = notifications.filter((n) => {
    if (filterType === "unread") return !n.read;
    return true;
  });

  const displayedModalNotifications = modalNotifications.filter((n) => {
    if (modalFilterType === "unread") return !n.read;
    return true;
  });

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/website/doctors?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    if (typeof window === "undefined") return;

    const id = localStorage.getItem("userId");
    const role = localStorage.getItem("userRole");

    // Auto-clear stale / non-UUID values (e.g. "test-patient-id" from dev sessions)
    if (id && !isValidUUID(id)) {
      console.warn("[PatientHeader] Clearing invalid userId from localStorage:", id);
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userData");
      return;
    }

    if (id && role === "patient") {
      setUserId(id);
      fetchNotifications(id);
    }
  }, []);


  // Poll notifications so "Join Call" alert appears quickly
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      fetchNotifications(userId);
    }, 60000); // Increased interval from 15s to 60s to reduce load

    // Also refresh instantly when a foreground push arrives
    const handleRefresh = () => fetchNotifications(userId);
    window.addEventListener("refresh-notifications", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh-notifications", handleRefresh);
    };
  }, [userId]);

  const getVideoCallNotification = () => {
    return notifications.find((n) => {
      if (!n || n.read) return false;
      if (n.type !== "video_call_started") return false;
      const metadata =
        typeof n.metadata === "string"
          ? (() => {
            try {
              return JSON.parse(n.metadata);
            } catch {
              return null;
            }
          })()
          : n.metadata;
      return !!metadata?.appointment_id;
    });
  };

  const activeVideoCall = getVideoCallNotification();

  const parseNotificationMeta = (notification) => {
    if (!notification) return null;
    if (typeof notification.metadata === "string") {
      try {
        return JSON.parse(notification.metadata);
      } catch {
        return null;
      }
    }
    return notification.metadata || null;
  };

  const isAppointmentLiveNow = (appointment) => {
    if (!appointment?.appointment_date || !appointment?.appointment_time) return false;
    const status = String(appointment.status || "").toLowerCase();
    const okStatuses = ["confirmed", "pending", "booked", "approved"];
    if (!okStatuses.includes(status)) return false;
    const dateStr = String(appointment.appointment_date);
    const timeStr = String(appointment.appointment_time).slice(0, 5);
    const start = new Date(`${dateStr}T${timeStr}:00`);
    if (Number.isNaN(start.getTime())) return false;
    const now = new Date();
    const early = new Date(start.getTime() - 15 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now >= early && now <= end;
  };

  useEffect(() => {
    const meta = parseNotificationMeta(activeVideoCall);
    const appointmentId = meta?.appointment_id || null;
    setActiveCallAppointmentId(appointmentId);

    if (!appointmentId) {
      setShowActiveCallBanner(false);
      return;
    }

    let canceled = false;
    const validateActiveCall = async () => {
      try {
        const res = await fetch(`/api/appointment/web/${appointmentId}`);
        const data = await res.json().catch(() => null);
        const appointment = data?.data?.appointment || null;
        if (canceled) return;
        if (appointment) {
          setShowActiveCallBanner(isAppointmentLiveNow(appointment));
        } else {
          // If we can't validate the appointment, still show it
          // (better to show a banner the user can click than hide it)
          setShowActiveCallBanner(true);
        }
      } catch {
        if (!canceled) setShowActiveCallBanner(true);
      }
    };

    validateActiveCall();
    const interval = setInterval(validateActiveCall, 60000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [activeVideoCall]);

  const handleJoinActiveCall = async () => {
    if (!activeVideoCall || !userId || !showActiveCallBanner || !activeCallAppointmentId) return;

    try {
      await handleMarkNotificationRead(activeVideoCall.id);
    } catch { }

    router.push(`/appointments/${activeCallAppointmentId}/video?userId=${userId}&role=patient`);
  };

  const fetchNotifications = async (id) => {
    if (!id) return;
    try {
      setNotificationsLoading(true);
      const res = await api.post("/notifications/get", {
        user_id: id,
        unread: false,
        page: 1,
      });
      if (res?.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (error) {
      console.error("Failed to load patient notifications", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!userId || unreadCount === 0) return;
    try {
      await api.post("/notifications/read", {
        user_id: userId,
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  const loadModalPage = async (page) => {
    if (!userId) return;
    try {
      setModalLoading(true);
      const res = await api.post("/notifications/get", {
        user_id: userId,
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
  };

  const handleMarkNotificationRead = async (notificationId) => {
    if (!userId || !notificationId) return;
    try {
      await api.post("/notifications/read", {
        user_id: userId,
        notification_ids: [notificationId],
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setModalNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!userId || !notificationId) return;
    try {
      await api.post("/notifications/delete", {
        user_id: userId,
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

  const handleClearAllNotifications = async () => {
    if (!userId || notifications.length === 0) return;
    const confirmed = window.confirm("Are you sure you want to clear all notifications?");
    if (!confirmed) return;

    try {
      const allIds = notifications.map((n) => n.id);
      await api.post("/notifications/delete", {
        user_id: userId,
        notification_ids: allIds,
        all: true,
      });
      setNotifications([]);
      setModalNotifications([]);
      toast.success("All notifications cleared");
    } catch (error) {
      console.error("Failed to clear all notifications", error);
      toast.error("Failed to clear notifications");
    }
  };

  const openNotificationsModal = () => {
    if (!userId) return;
    setShowNotificationsModal(true);
    setModalNotifications(notifications);
    setModalPage(1);
    setModalHasMore(notifications.length === 15);
  };

  // Handle notification click — mark read + route to relevant page
  const handleNotificationClick = (notification, closeDropdown = false) => {
    if (!notification.read) {
      handleMarkNotificationRead(notification.id);
    }

    if (closeDropdown) {
      setIsNotificationOpen(false);
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

    const type = (notification.type || "").toLowerCase();
    if (
      type === "appointment" ||
      type === "appointment_status" ||
      type === "appointment_reminder" ||
      type === "appointment_reschedule" ||
      type === "appointment_booked"
    ) {
      router.push("/website/appointments");
    } else if (type === "prescription" || type === "document_shared") {
      router.push("/website/digital-locker");
    } else if (
      type === "payment" ||
      type === "payment_success" ||
      type === "payment_failure"
    ) {
      router.push("/website/billing");
    } else if (
      type === "video_call_started" ||
      type === "consultation" ||
      type === "teleconsultation"
    ) {
      // If there's an appointment id in metadata, go directly to video call
      try {
        const meta = typeof notification.metadata === "string"
          ? JSON.parse(notification.metadata)
          : notification.metadata;
        const aptId = meta?.appointment_id;
        if (aptId && userId) {
          router.push(`/appointments/${aptId}/video?userId=${userId}&role=patient`);
          return;
        }
      } catch { }
      router.push("/website/appointments");
    } else {
      router.push("/website/appointments");
    }
  };

  const formatNotificationTitle = (rawTitle) => {
    if (!rawTitle) return "Notification";
    const letters = rawTitle.replace(/[^a-zA-Z]/g, "");
    if (letters.length > 3 && letters === letters.toUpperCase()) {
      return rawTitle
        .toLowerCase()
        .split(" ")
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
        .join(" ");
    }
    return rawTitle;
  };

  const getNotificationVisual = (notification) => {
    const type = (notification?.type || "").toLowerCase();
    const title = (notification?.title || "").toLowerCase();
    const message = (notification?.message || "").toLowerCase();

    if (
      type.includes("medicine") ||
      type.includes("prescription") ||
      title.includes("medicine") ||
      title.includes("pharmacy") ||
      message.includes("medicine")
    ) {
      return {
        icon: <FaPills className="w-4 h-4 text-emerald-600" />,
        bg: "bg-emerald-50 border-emerald-100",
        badge: "Pharmacy",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      };
    }
    if (
      type.includes("video") ||
      type.includes("call") ||
      title.includes("video call") ||
      message.includes("video call")
    ) {
      return {
        icon: <FaVideo className="w-4 h-4 text-sky-600" />,
        bg: "bg-sky-50 border-sky-100",
        badge: "Live Call",
        badgeColor: "bg-sky-50 text-sky-700 border-sky-200/80",
      };
    }
    if (
      type.includes("appointment") ||
      title.includes("appointment") ||
      message.includes("appointment")
    ) {
      return {
        icon: <FaCalendarCheck className="w-4 h-4 text-[#0067A1]" />,
        bg: "bg-blue-50 border-blue-100",
        badge: "Appointment",
        badgeColor: "bg-blue-50 text-[#0067A1] border-blue-200/80",
      };
    }
    if (
      type.includes("lab") ||
      title.includes("lab") ||
      message.includes("lab test")
    ) {
      return {
        icon: <FaFlask className="w-4 h-4 text-purple-600" />,
        bg: "bg-purple-50 border-purple-100",
        badge: "Lab Test",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200/80",
      };
    }
    if (
      type.includes("payment") ||
      title.includes("payment") ||
      message.includes("payment")
    ) {
      return {
        icon: <FaCreditCard className="w-4 h-4 text-amber-600" />,
        bg: "bg-amber-50 border-amber-100",
        badge: "Payment",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200/80",
      };
    }
    return {
      icon: <FaBell className="w-4 h-4 text-indigo-600" />,
      bg: "bg-indigo-50 border-indigo-100",
      badge: "Alert",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    };
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "consultation":
        return <FaBell className="w-3.5 h-3.5 text-[#0067A1]" />;
      case "appointment":
      case "appointment_status":
        return <FaCalendarCheck className="w-3.5 h-3.5 text-green-500" />;
      case "prescription":
        return <FaFileMedical className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <FaExclamationCircle className="w-3.5 h-3.5 text-amber-500" />;
    }
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

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    router.push("/website");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return (
      user?.details?.full_name ||
      user?.profile?.full_name ||
      user?.user?.details?.full_name ||
      user?.user?.full_name ||
      user?.full_name ||
      user?.name ||
      "User"
    );
  };

  const getDisplayEmail = () => {
    return (
      user?.details?.email ||
      user?.profile?.email ||
      user?.user?.details?.email ||
      user?.user?.email ||
      user?.email ||
      "user@example.com"
    );
  };

  const getAvatarUrl = () => {
    return (
      user?.profile_picture ||
      user?.avatar ||
      user?.image ||
      user?.details?.profile_picture ||
      user?.details?.avatar ||
      user?.user?.profile_picture ||
      user?.user?.avatar ||
      user?.profile?.profile_picture ||
      user?.profile?.avatar ||
      null
    );
  };

  const avatarUrl = getAvatarUrl();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Active call strip hidden per user request */}
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle Button (Desktop & Mobile) */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-[5px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none cursor-pointer"
            title={isSidebarCollapsed ? "Open Sidebar" : "Close Sidebar"}
            aria-label={isSidebarCollapsed ? "Open Sidebar" : "Close Sidebar"}
          >
            <FaBars className="w-5 h-5" />
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            {/* Mobile backdrop */}
            {isNotificationOpen && (
              <div
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 sm:hidden"
                onClick={() => setIsNotificationOpen(false)}
              />
            )}

            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className={`relative p-2.5 rounded-xl transition-all cursor-pointer ${
                isNotificationOpen
                  ? "bg-[#0067A1]/10 text-[#0067A1]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title="Notifications"
              aria-label="Notifications"
            >
              <FaBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-rose-500/30 animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationOpen && (
              <div className="fixed sm:absolute inset-x-3 sm:inset-auto sm:right-0 top-16 sm:top-full mt-2 w-auto sm:w-[420px] max-w-[calc(100vw-1.5rem)] sm:max-w-[420px] max-h-[78vh] sm:max-h-[600px] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,40,80,0.22)] border border-slate-200/90 overflow-hidden flex flex-col z-50 transition-all duration-200 ease-out">
                {/* Header */}
                <div className="px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-sky-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center">
                      <FaBell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[11px] font-semibold rounded-full border border-rose-100">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}` : "Stay updated on your health activities"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-semibold text-[#0067A1] hover:text-[#004F7C] hover:bg-sky-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Mark all as read"
                      >
                        <FaCheckDouble className="w-3 h-3" />
                        <span className="hidden sm:inline">Mark read</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllNotifications}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Clear all notifications"
                      >
                        <FaTrash className="w-2.5 h-2.5" />
                        <span>Clear all</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Tabs */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFilterType("all")}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                          filterType === "all"
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                            : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                        }`}
                      >
                        All ({notifications.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterType("unread")}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                          filterType === "unread"
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                            : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                        }`}
                      >
                        Unread ({unreadCount})
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {displayedNotifications.length} shown
                    </span>
                  </div>
                )}

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {notificationsLoading ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 rounded-full border-2 border-[#0067A1] border-t-transparent animate-spin" />
                      <p className="text-xs text-slate-500">Loading notifications...</p>
                    </div>
                  ) : displayedNotifications.length > 0 ? (
                    displayedNotifications.map((notification) => {
                      const visual = getNotificationVisual(notification);
                      return (
                        <div
                          key={notification.id}
                          className={`p-3.5 sm:p-4 hover:bg-slate-50/80 transition-all cursor-pointer relative group flex items-start gap-3.5 border-l-[3px] ${
                            !notification.read
                              ? "bg-sky-50/30 border-l-[#0067A1]"
                              : "bg-white border-l-transparent"
                          }`}
                          onClick={() => handleNotificationClick(notification, true)}
                        >
                          {/* Visual Badge Icon */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-xs mt-0.5 ${visual.bg}`}>
                            {visual.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase ${visual.badgeColor}`}>
                                {visual.badge}
                              </span>
                              {!notification.read && (
                                <span className="w-2 h-2 rounded-full bg-[#0067A1] shrink-0" title="Unread" />
                              )}
                            </div>

                            <h4 className={`text-sm text-slate-800 leading-snug break-words mb-1 ${!notification.read ? "font-bold text-slate-900" : "font-semibold"}`}>
                              {formatNotificationTitle(notification.title || "Health Alert")}
                            </h4>

                            {notification.message && (
                              <p className="text-xs text-slate-600 leading-relaxed break-words line-clamp-3 mb-2">
                                {formatMessageText(notification.message)}
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <FaClock className="w-2.5 h-2.5 text-slate-400/80" />
                              <span>{formatNotificationTime(notification.created_at)}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-center gap-1.5 shrink-0 sm:opacity-70 group-hover:opacity-100 transition-opacity">
                            {!notification.read && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkNotificationRead(notification.id);
                                }}
                                className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100/80 flex items-center justify-center transition-colors cursor-pointer"
                                title="Mark as read"
                                aria-label="Mark as read"
                              >
                                <FaCheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notification.id);
                              }}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete notification"
                              aria-label="Delete notification"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0067A1] flex items-center justify-center mb-2.5 shadow-inner">
                        <FaBell className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">
                        {filterType === "unread" ? "No unread alerts" : "All Caught Up!"}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">
                        {filterType === "unread"
                          ? "You have reviewed all your notifications."
                          : "No notifications right now. We'll alert you about upcoming appointments and health updates."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">
                      {notifications.length} notification{notifications.length === 1 ? "" : "s"}
                    </span>
                    {notifications.length > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={handleClearAllNotifications}
                          className="text-xs font-medium text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                        >
                          Clear all
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationOpen(false);
                      openNotificationsModal();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0067A1] text-white font-semibold hover:bg-[#004F7C] shadow-sm hover:shadow transition-all cursor-pointer"
                  >
                    <span>View All</span>
                    <FaChevronRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-[5px] hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#0067A1] flex items-center justify-center text-white font-semibold shadow-sm overflow-hidden">
                {avatarUrl && !imageError ? (
                  <img
                    src={avatarUrl}
                    alt={getDisplayName()}
                    className="w-full h-full rounded-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span className="text-sm">
                    {getInitials(getDisplayName())}
                  </span>
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-700 truncate max-w-[150px]">
                  {getDisplayName()}
                </p>
              </div>
              <FaChevronDown
                className={`hidden md:block w-3 h-3 text-gray-400 transition-transform ${isProfileOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {/* Profile Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                {/* User Info */}
                <div className="p-4 bg-[#0067A1]/5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#0067A1] flex items-center justify-center text-white font-semibold shadow-sm overflow-hidden">
                      {avatarUrl && !imageError ? (
                        <img
                          src={avatarUrl}
                          alt={getDisplayName()}
                          className="w-full h-full rounded-full object-cover"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <span>{getInitials(getDisplayName())}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {getDisplayEmail()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <Link
                    href="/website/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FaUser className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">My Profile</span>
                  </Link>
                  <Link
                    href="/website/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FaCog className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Settings</span>
                  </Link>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                  >
                    <FaSignOutAlt className="w-4 h-4 text-red-400" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-sky-50/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0067A1] text-white flex items-center justify-center shadow-md shadow-[#0067A1]/20">
                  <FaBell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">All Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 text-xs font-semibold rounded-full border border-rose-100">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View, manage, and review your complete alert history
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0067A1] bg-[#0067A1]/10 hover:bg-[#0067A1]/20 transition-colors cursor-pointer"
                  >
                    <FaCheckDouble className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                {modalNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllNotifications}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-colors cursor-pointer"
                  >
                    <FaTrash className="w-3 h-3" />
                    <span>Clear all</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNotificationsModal(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                  title="Close"
                  aria-label="Close"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="px-5 sm:px-6 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    modalFilterType === "all"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All ({modalNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilterType("unread")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    modalFilterType === "unread"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Unread ({modalNotifications.filter((n) => !n.read).length})
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="sm:hidden text-xs font-semibold text-[#0067A1] flex items-center gap-1 cursor-pointer"
                >
                  <FaCheckDouble className="w-3 h-3" />
                  Mark all
                </button>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {modalLoading ? (
                <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#0067A1] border-t-transparent animate-spin" />
                  <p className="text-xs text-slate-500">Loading notifications...</p>
                </div>
              ) : displayedModalNotifications.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {displayedModalNotifications.map((n) => {
                    const visual = getNotificationVisual(n);
                    return (
                      <div
                        key={n.id}
                        className={`px-5 sm:px-6 py-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50/80 transition-all border-l-[3px] ${
                          !n.read ? "bg-sky-50/30 border-l-[#0067A1]" : "bg-white border-l-transparent"
                        }`}
                        onClick={() => handleNotificationClick(n, false)}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs mt-0.5 ${visual.bg}`}>
                          {visual.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase ${visual.badgeColor}`}>
                              {visual.badge}
                            </span>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-[#0067A1]" title="Unread" />
                            )}
                          </div>
                          <h4 className={`text-sm text-slate-800 break-words mb-1 ${!n.read ? "font-bold text-slate-900" : "font-semibold"}`}>
                            {formatNotificationTitle(n.title || "Health Alert")}
                          </h4>
                          {n.message && (
                            <p className="text-xs text-slate-600 leading-relaxed break-words mb-2">
                              {formatMessageText(n.message)}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <FaClock className="w-2.5 h-2.5 text-slate-400/80" />
                            <span>{formatNotificationTime(n.created_at)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          {!n.read && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkNotificationRead(n.id);
                              }}
                              className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
                              title="Mark as read"
                            >
                              <FaCheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(n.id);
                            }}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete notification"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 text-[#0067A1] flex items-center justify-center shadow-inner">
                    <FaBell className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No notifications found</h4>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    {modalFilterType === "unread" ? "You have no unread notifications." : "Appointment updates and other activity will appear here."}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-medium">Page {modalPage}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={modalPage === 1 || modalLoading}
                  onClick={() => loadModalPage(Math.max(1, modalPage - 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!modalHasMore || modalLoading}
                  onClick={() => loadModalPage(modalPage + 1)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default PatientHeader;
